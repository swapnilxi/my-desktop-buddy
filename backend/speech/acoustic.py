"""
Acoustic analysis — runs locally on the raw audio in BOTH voice modes.

Parselmouth (Praat): pitch (F0), formants, HNR, jitter, shimmer, vocal fry.
librosa: energy / volume, sentence-end drops, emphasis spikes, pause segmentation.

Utterances are delimited by pauses (not by the transcript), so upspeak and
sentence-end-drop detection work identically whichever transcriber was used.
"""
import math
import subprocess
from pathlib import Path
from typing import Dict, List

import numpy as np

from speech.util import clean

SR = 16000
HOP = 160  # 10 ms


def decode_to_wav(src: Path, dst: Path) -> None:
    """Decode any browser-recorded container (webm/ogg/mp4/wav) to 16 kHz mono WAV."""
    proc = subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-ar", str(SR), "-ac", "1", str(dst)],
        capture_output=True,
        timeout=120,
    )
    if proc.returncode != 0 or not dst.exists():
        raise RuntimeError(f"Could not decode audio: {proc.stderr.decode(errors='ignore')[:200]}")


def _st(f0_hz: np.ndarray) -> np.ndarray:
    return 12.0 * np.log2(f0_hz / 100.0)


def _utterances(y: np.ndarray, min_gap: float = 0.35, min_len: float = 0.8) -> List[tuple]:
    """Pause-delimited speech intervals in seconds."""
    import librosa

    intervals = librosa.effects.split(y, top_db=30, frame_length=512, hop_length=HOP)
    merged: List[List[float]] = []
    for s, e in intervals:
        s, e = s / SR, e / SR
        if merged and s - merged[-1][1] < min_gap:
            merged[-1][1] = e
        else:
            merged.append([s, e])
    return [(s, e) for s, e in merged if e - s >= min_len]


def analyze(wav_path: Path) -> Dict:
    import librosa
    import parselmouth
    from parselmouth.praat import call

    y, _ = librosa.load(str(wav_path), sr=SR, mono=True)
    duration = len(y) / SR
    if duration < 1.0 or float(np.max(np.abs(y))) < 1e-4:
        raise ValueError("No audible speech was captured.")

    utts = _utterances(y)
    speech_span = (utts[-1][1] - utts[0][0]) if utts else duration
    speech_start = utts[0][0] if utts else 0.0

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

    # ── Parselmouth: formants (voiced, louder-than-median frames) ─
    max_formant = 5000.0 if f0_median < 165 else 5500.0
    formant = snd.to_formant_burg(time_step=0.01, max_number_of_formants=5, maximum_formant=max_formant)
    loud = rms_db >= np.median(speech_db)
    f1s, f2s, f3s = [], [], []
    for t, v in zip(t_f0, voiced):
        if not v:
            continue
        ri = min(len(rms_db) - 1, int(t / 0.01))
        if not loud[ri]:
            continue
        a, b, c = (formant.get_value_at_time(n, t) for n in (1, 2, 3))
        if all(x == x for x in (a, b, c)):  # drop NaN
            f1s.append(a); f2s.append(b); f3s.append(c)
    f1 = float(np.mean(f1s)) if f1s else None
    f2 = float(np.mean(f2s)) if f2s else None
    f3 = float(np.mean(f3s)) if f3s else None

    # ── Parselmouth: voice quality ───────────────────────────────
    hnr = jitter = shimmer = None
    try:
        harm = call(snd, "To Harmonicity (cc)", 0.01, 60.0, 0.1, 1.0)
        vals = harm.values[harm.values > -200]
        hnr = float(np.mean(vals)) if vals.size else None
    except Exception:
        pass
    try:
        pp = call([snd, pitch], "To PointProcess (cc)")
        jitter = 100.0 * call(pp, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3)
        shimmer = call([snd, pp], "Get shimmer (local_dB)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
    except Exception:
        pass

    return {
        "duration_sec": round(duration, 2),
        "speech_start_sec": round(speech_start, 2),
        "speech_span_sec": round(float(speech_span), 2),
        "utterance_count": len(utts),
        "f0_mean_hz": clean(f0_mean),
        "f0_median_hz": clean(f0_median),
        "pitch_variation_st": clean(f0_std_st),
        "f1_hz": clean(f1),
        "f2_hz": clean(f2),
        "f3_hz": clean(f3),
        "hnr_db": clean(hnr),
        "jitter_pct": clean(jitter),
        "shimmer_db": clean(shimmer),
        "vocal_fry": fry[:20],
        "vocal_fry_pct": clean(fry_pct),
        "upspeak": upspeak,
        "rms_db": clean(rms_mean_db),
        "energy_std_db": clean(energy_std_db),
        "energy_consistency_db": clean(energy_consistency_db),
        "emphasis_spikes": spikes,
        "sentence_end_drops": end_drops,
    }
