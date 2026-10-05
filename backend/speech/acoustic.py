"""
Acoustic analysis — runs locally on the raw audio in BOTH voice modes.

Parselmouth (Praat): pitch (F0), pitch floor, formants, HNR, jitter, shimmer, vocal fry.
librosa: energy / volume, sentence-end drops, emphasis spikes, pause segmentation.

Tonal signature (the five executive moves), from the pitch contour of each
pause-delimited utterance:
  anchor drop     a key point started below baseline pitch right after a pause
  deliberate pause 0.6-2.5 s silences before a point
  measured rise   a mid-sentence rise that resolves back down
  firm landing    the utterance ends at or below the pitch it started on
Voice stamina: for long sessions, HNR / jitter / pitch / energy drift from the first to
the last quarter (a tiring, throat-driven voice gets breathier, shakier and higher).

Utterances come from pauses, not from the transcript, so all of this works the same
whichever transcriber produced the words.
"""
import math
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np

from speech.util import clean

SR = 16000
HOP = 160  # 10 ms
LONG_AUDIO_SEC = 360   # beyond this, formants + voice quality are sampled from windows
STAMINA_MIN_SEC = 240  # fatigue tracking needs a few minutes of speech


def decode_to_wav(src: Path, dst: Path) -> None:
    """Decode any browser-recorded container (webm/ogg/mp4/wav) to 16 kHz mono WAV."""
    proc = subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-ar", str(SR), "-ac", "1", str(dst)],
        capture_output=True,
        timeout=900,
    )
    if proc.returncode != 0 or not dst.exists():
        raise RuntimeError(f"Could not decode audio: {proc.stderr.decode(errors='ignore')[:200]}")


def _st(f0_hz: np.ndarray) -> np.ndarray:
    return 12.0 * np.log2(f0_hz / 100.0)


def _speech_intervals(y: np.ndarray, min_gap: float = 0.35) -> List[Tuple[float, float]]:
    """Non-silent stretches in seconds, with gaps shorter than `min_gap` merged."""
    import librosa

    merged: List[List[float]] = []
    for s, e in librosa.effects.split(y, top_db=30, frame_length=512, hop_length=HOP):
        # Plain floats: numpy scalars leak np.bool_ into comparisons, which JSON can't store.
        s, e = float(s) / SR, float(e) / SR
        if merged and s - merged[-1][1] < min_gap:
            merged[-1][1] = e
        else:
            merged.append([s, e])
    return [(s, e) for s, e in merged]


def _windows(duration: float, count: int, length: float) -> List[Tuple[float, float]]:
    """`count` evenly spaced windows of `length` seconds across the recording."""
    if duration <= count * length:
        return [(0.0, duration)]
    step = (duration - length) / (count - 1)
    return [(i * step, i * step + length) for i in range(count)]


def _voice_quality(part) -> Tuple[Optional[float], Optional[float], Optional[float]]:
    """(HNR dB, jitter %, shimmer dB) for a parselmouth Sound."""
    from parselmouth.praat import call

    hnr = jitter = shimmer = None
    try:
        harm = call(part, "To Harmonicity (cc)", 0.01, 60.0, 0.1, 1.0)
        vals = harm.values[harm.values > -200]
        hnr = float(np.mean(vals)) if vals.size else None
    except Exception:
        pass
    try:
        pitch = part.to_pitch_ac(time_step=0.01, pitch_floor=60.0, pitch_ceiling=400.0)
        pp = call([part, pitch], "To PointProcess (cc)")
        jitter = 100.0 * call(pp, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3)
        shimmer = call([part, pp], "Get shimmer (local_dB)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
    except Exception:
        pass
    return clean(hnr), clean(jitter), clean(shimmer)


def _tonal(intervals, t_f0, f0, ok_voiced, base_st: float, speech_span: float) -> Dict:
    """Landings, measured rises, anchor drops and deliberate pauses across the utterances."""
    evaluated = landed = rises = candidates = anchors = 0
    for i, (s, e) in enumerate(intervals):
        if e - s < 0.8:
            continue
        idx = np.where(ok_voiced & (t_f0 >= s) & (t_f0 <= e))[0]
        if idx.size < 15:
            continue
        st = _st(f0[idx])
        k = max(5, idx.size // 5)
        start, end = float(np.median(st[:k])), float(np.median(st[-k:]))
        middle = st[k:-k] if idx.size > 2 * k else st
        evaluated += 1
        landing = end <= start + 0.5
        landed += landing
        if landing and float(np.percentile(middle, 90)) - start >= 2.0:
            rises += 1  # rose on the transition, then resolved back down
        gap = s - intervals[i - 1][1] if i > 0 else None
        if gap is not None and gap >= 0.6:
            candidates += 1  # a point delivered after a deliberate pause
            if start <= base_st - 1.0:
                anchors += 1

    gaps = [intervals[i][0] - intervals[i - 1][1] for i in range(1, len(intervals))]
    minutes = max(speech_span, 1.0) / 60.0
    deliberate = [g for g in gaps if 0.6 <= g <= 2.5]
    return {
        "utterances": evaluated,
        "landings": landed,
        "landing_pct": clean(100.0 * landed / evaluated) if evaluated else None,
        "resolved_rises": rises,
        "anchor_candidates": candidates,
        "anchor_drops": anchors,
        "anchor_pct": clean(100.0 * anchors / candidates) if candidates else None,
        "pauses": {
            "count": len(gaps),
            "deliberate": len(deliberate),
            "deliberate_per_min": clean(len(deliberate) / minutes),
            "long": sum(1 for g in gaps if g > 3.0),
            "mean_sec": clean(float(np.mean(gaps))) if gaps else None,
        },
    }


def _stamina(snd, duration, t_f0, f0, ok_voiced, t_rms, rms_db, in_speech) -> Dict:
    """Quarter-by-quarter drift; a fatiguing voice loses HNR, gains jitter, rises in pitch, fades."""
    q = duration / 4.0
    rows = []
    for i in range(4):
        a, b = i * q, (i + 1) * q
        mid, half = (a + b) / 2.0, min(22.5, q / 2.0)
        hnr, jitter, shimmer = _voice_quality(snd.extract_part(mid - half, mid + half, preserve_times=True))
        fm = ok_voiced & (t_f0 >= a) & (t_f0 < b)
        em = in_speech & (t_rms >= a) & (t_rms < b)
        rows.append({
            "start_min": round(a / 60.0, 1),
            "f0_hz": clean(np.median(f0[fm])) if fm.sum() >= 20 else None,
            "hnr_db": hnr,
            "jitter_pct": jitter,
            "shimmer_db": shimmer,
            "rms_db": clean(np.mean(rms_db[em])) if em.sum() >= 20 else None,
        })
    first, last = rows[0], rows[-1]

    def diff(key):
        return None if first[key] is None or last[key] is None else last[key] - first[key]

    hnr_drop = -diff("hnr_db") if diff("hnr_db") is not None else None
    jitter_rise = diff("jitter_pct")
    energy_drop = -diff("rms_db") if diff("rms_db") is not None else None
    f0_rise = (12.0 * math.log2(last["f0_hz"] / first["f0_hz"])
               if first["f0_hz"] and last["f0_hz"] else None)
    parts = [min(1.0, max(0.0, v / scale)) for v, scale in
             ((hnr_drop, 4.0), (jitter_rise, 0.6), (f0_rise, 3.0), (energy_drop, 8.0)) if v is not None]
    fatigue_index = float(np.mean(parts)) if parts else None
    signals = sum(1 for v, limit in ((hnr_drop, 2.0), (jitter_rise, 0.3), (f0_rise, 1.5), (energy_drop, 4.0))
                  if v is not None and v >= limit)

    onset = None
    for row in rows[1:]:
        worse = (
            (row["hnr_db"] is not None and first["hnr_db"] is not None and row["hnr_db"] <= first["hnr_db"] - 1.5)
            or (row["jitter_pct"] is not None and first["jitter_pct"] is not None and row["jitter_pct"] >= first["jitter_pct"] + 0.25)
            or (row["f0_hz"] and first["f0_hz"] and 12.0 * math.log2(row["f0_hz"] / first["f0_hz"]) >= 1.0)
            or (row["rms_db"] is not None and first["rms_db"] is not None and row["rms_db"] <= first["rms_db"] - 3.0)
        )
        if worse:
            onset = row["start_min"]
            break

    detected = signals >= 2 or (fatigue_index or 0) >= 0.5
    return {
        "duration_min": round(duration / 60.0, 1),
        "quarters": rows,
        "hnr_drop_db": clean(hnr_drop),
        "jitter_rise_pct": clean(jitter_rise),
        "f0_rise_st": clean(f0_rise),
        "energy_drop_db": clean(energy_drop),
        "fatigue_index": clean(fatigue_index),
        "fatigue_detected": bool(detected),
        "fatigue_onset_min": onset if detected else None,
    }


def analyze(wav_path: Path) -> Dict:
    import librosa
    import parselmouth

    y, _ = librosa.load(str(wav_path), sr=SR, mono=True)
    duration = len(y) / SR
    if duration < 1.0 or float(np.max(np.abs(y))) < 1e-4:
        raise ValueError("No audible speech was captured.")

    intervals = _speech_intervals(y)
    utts = [(s, e) for s, e in intervals if e - s >= 0.8]
    speech_span = (intervals[-1][1] - intervals[0][0]) if intervals else duration
    speech_start = intervals[0][0] if intervals else 0.0  # thinking time before the first sound

    # ── librosa: energy ──────────────────────────────────────────
    rms = librosa.feature.rms(y=y, frame_length=512, hop_length=HOP)[0]
    rms_db = 20.0 * np.log10(rms + 1e-6)
    t_rms = librosa.times_like(rms, sr=SR, hop_length=HOP)
    in_speech = np.zeros_like(rms, dtype=bool)
    for s, e in utts:
        in_speech |= (t_rms >= s) & (t_rms <= e)
    speech_db = rms_db[in_speech] if in_speech.any() else rms_db
    # Only consider frames above the utterance noise floor
    floor = np.percentile(speech_db, 20)
    active_db = speech_db[speech_db > floor]
    rms_mean_db = float(np.mean(active_db)) if active_db.size else float(np.mean(speech_db))
    energy_std_db = float(np.std(active_db)) if active_db.size else 0.0

    # Emphasis spikes: local peaks well above the mean, spaced apart
    spikes = 0
    last_peak = -1.0
    thresh = rms_mean_db + 6.0
    for i in range(1, len(rms_db) - 1):
        if in_speech[i] and rms_db[i] > thresh and rms_db[i] >= rms_db[i - 1] and rms_db[i] >= rms_db[i + 1]:
            if t_rms[i] - last_peak > 0.4:
                spikes += 1
                last_peak = t_rms[i]

    # Sentence-end drops + per-utterance level
    end_drops: List[Dict] = []
    utt_means: List[float] = []
    for s, e in utts:
        m = (t_rms >= s) & (t_rms <= e)
        utt_db = rms_db[m]
        if utt_db.size < 20:
            continue
        utt_means.append(float(np.mean(utt_db[utt_db > np.percentile(utt_db, 20)])))
        tail = (t_rms >= e - 0.3) & (t_rms <= e)
        body = utt_db[utt_db > np.percentile(utt_db, 20)]
        tail_db = rms_db[tail]
        if tail_db.size and body.size:
            drop = float(np.mean(body) - np.mean(tail_db))
            if drop >= 10.0:
                end_drops.append({"t": round(e, 1), "drop_db": round(drop, 1)})
    energy_consistency_db = float(np.std(utt_means)) if len(utt_means) > 1 else 0.0

    # ── Parselmouth: pitch ───────────────────────────────────────
    snd = parselmouth.Sound(str(wav_path))
    pitch = snd.to_pitch_ac(time_step=0.01, pitch_floor=60.0, pitch_ceiling=400.0)
    f0 = pitch.selected_array["frequency"]
    t_f0 = pitch.xs()
    voiced = f0 > 0
    f0_voiced = f0[voiced]
    if f0_voiced.size < 30:
        raise ValueError("Not enough voiced speech to analyze pitch. Speak a little longer and closer to the mic.")

    f0_median = float(np.median(f0_voiced))
    f0_mean = float(np.mean(f0_voiced))
    f0_std_st = float(np.std(_st(f0_voiced)))

    # Vocal fry: voiced frames far below the speaker's normal range, in runs >= 60 ms
    fry_limit = max(65.0, 0.62 * f0_median)
    fry_mask = voiced & (f0 < fry_limit)
    fry: List[Dict] = []
    run_start = None
    for i, flag in enumerate(list(fry_mask) + [False]):
        if flag and run_start is None:
            run_start = i
        elif not flag and run_start is not None:
            if i - run_start >= 6:
                fry.append({"t": round(float(t_f0[run_start]), 1), "dur": round((i - run_start) * 0.01, 2)})
            run_start = None
    fry_pct = 100.0 * float(np.sum(fry_mask)) / max(1, int(np.sum(voiced)))

    ok_voiced = voiced & ~fry_mask
    clean_f0 = f0[ok_voiced] if ok_voiced.sum() >= 30 else f0_voiced
    f0_floor = float(np.percentile(clean_f0, 10))  # the low end of the speaking range
    base_st = float(np.median(_st(clean_f0)))

    # Upspeak: rising F0 across the final ~0.5 s of each utterance
    upspeak: List[Dict] = []
    for s, e in utts:
        m = voiced & (t_f0 >= e - 0.5) & (t_f0 <= e) & (f0 >= fry_limit)
        idx = np.where(m)[0]
        if idx.size < 10:
            continue
        st = _st(f0[idx])
        tt = t_f0[idx]
        slope = float(np.polyfit(tt, st, 1)[0])
        third = max(3, idx.size // 3)
        rise = float(np.mean(st[-third:]) - np.mean(st[:third]))
        if slope * (tt[-1] - tt[0]) >= 2.5 and rise >= 2.0:
            upspeak.append({"t": round(float(e), 1), "rise_st": round(rise, 1)})

    tonal = _tonal(intervals, t_f0, f0, ok_voiced, base_st, speech_span)

    # ── Formants + voice quality (sampled windows on long recordings) ─
    long_audio = duration > LONG_AUDIO_SEC
    windows = _windows(duration, 12, 20.0) if long_audio else [(0.0, duration)]
    max_formant = 5000.0 if f0_median < 165 else 5500.0
    loud = rms_db >= np.median(speech_db)
    f1s, f2s, f3s, hnrs, jitters, shimmers = [], [], [], [], [], []
    for w0, w1 in windows:
        part = snd.extract_part(w0, w1, preserve_times=True) if long_audio else snd
        formant = part.to_formant_burg(time_step=0.01, max_number_of_formants=5, maximum_formant=max_formant)
        sel = np.where(voiced & (t_f0 >= w0) & (t_f0 <= w1))[0]
        for j in sel[:: max(1, sel.size // 4000)]:
            t = t_f0[j]
            if not loud[min(len(rms_db) - 1, int(t / 0.01))]:
                continue
            a, b, c = (formant.get_value_at_time(n, t) for n in (1, 2, 3))
            if all(x == x for x in (a, b, c)):  # drop NaN
                f1s.append(a); f2s.append(b); f3s.append(c)
        hnr_w, jitter_w, shimmer_w = _voice_quality(part)
        for bucket, value in ((hnrs, hnr_w), (jitters, jitter_w), (shimmers, shimmer_w)):
            if value is not None:
                bucket.append(value)

    stamina = (_stamina(snd, duration, t_f0, f0, ok_voiced, t_rms, rms_db, in_speech)
               if duration >= STAMINA_MIN_SEC else None)

    return {
        "duration_sec": round(duration, 2),
        "speech_start_sec": round(speech_start, 2),
        "speech_span_sec": round(float(speech_span), 2),
        "utterance_count": len(utts),
        "f0_mean_hz": clean(f0_mean),
        "f0_median_hz": clean(f0_median),
        "f0_floor_hz": clean(f0_floor),
        "pitch_variation_st": clean(f0_std_st),
        "f1_hz": clean(np.mean(f1s)) if f1s else None,
        "f2_hz": clean(np.mean(f2s)) if f2s else None,
        "f3_hz": clean(np.mean(f3s)) if f3s else None,
        "hnr_db": clean(np.mean(hnrs)) if hnrs else None,
        "jitter_pct": clean(np.mean(jitters)) if jitters else None,
        "shimmer_db": clean(np.mean(shimmers)) if shimmers else None,
        "vocal_fry": fry[:20],
        "vocal_fry_pct": clean(fry_pct),
        "upspeak": upspeak,
        "rms_db": clean(rms_mean_db),
        "energy_std_db": clean(energy_std_db),
        "energy_consistency_db": clean(energy_consistency_db),
        "emphasis_spikes": spikes,
        "sentence_end_drops": end_drops,
        "tonal": tonal,
        "stamina": stamina,
        "sampled_windows": len(windows) if long_audio else 0,
    }
