"""
Composite scoring + coaching flags.

One unified pipeline for both voice modes: acoustic + language signals are always
present; sentiment/intent come from Deepgram (cloud) or the local lexicon, and any
missing component is dropped with its weight renormalized.
"""
from typing import Dict, List, Optional

from speech.util import band, clamp, higher_better, lower_better, weighted

SENTIMENT_COACHING = {
    "guarded": ("Guarded delivery", "Open your stance — lead with what you can do."),
    "erratic": ("Inconsistent tone", "Anchor each point before moving to the next."),
    "flat": ("Monotone delivery", "Add vocal variety — vary pitch and energy."),
    "warm": ("Warm and engaging", "Good energy — ensure it reads as confident, not casual."),
}

PARAM_LABELS = {
    "pitch": "Pitch (F0)",
    "pitch_variation": "Pitch variation",
    "resonance": "Chest resonance",
    "hnr": "Voice clarity (HNR)",
    "steadiness": "Steadiness (jitter/shimmer)",
    "upspeak": "Upspeak",
    "end_drop": "Strong sentence endings",
    "energy": "Energy consistency",
    "pace": "Pace",
    "fillers": "Filler words",
    "hedging": "Hedging language",
    "passive": "Active voice",
    "run_ons": "Sentence length",
    "sentiment": "Tone consistency",
}


def classify_sentiment(scores: List[float], pitch_var_st: Optional[float] = None) -> Dict:
    """Map sentence-level sentiment (-1..1) to the executive coaching table."""
    if not scores:
        scores = [0.0]
    avg = sum(scores) / len(scores)
    n = len(scores)
    neg_share = sum(1 for s in scores if s < -0.1) / n
    shifts = sum(1 for a, b in zip(scores, scores[1:]) if (a > 0.15 and b < -0.15) or (a < -0.15 and b > 0.15))
    mean = avg
    std = (sum((s - mean) ** 2 for s in scores) / n) ** 0.5
    if shifts >= 2 or (n >= 4 and std > 0.45):
        key = "erratic"
    elif avg < -0.15 and neg_share >= 0.5:
        key = "guarded"
    elif avg > 0.3:
        key = "warm"
    else:
        key = "flat"
    label, tip = SENTIMENT_COACHING[key]
    return {"key": key, "label": label, "coaching": tip, "average": round(avg, 3),
            "shifts": shifts, "std": round(std, 3)}


def param_scores(ac: Dict, lang: Dict, sentiment: Dict) -> Dict[str, Optional[float]]:
    f1, f2, f0m = ac.get("f1_hz"), ac.get("f2_hz"), ac.get("f0_median_hz") or 0
    k = 1.0 if f0m < 165 else 1.15
    resonance = None
    if f1 and f2:
        resonance = weighted([(lower_better(f1 / k, 500, 700), 1), (lower_better(f2 / k, 1500, 1900), 1)])

    f0 = ac.get("f0_mean_hz")
    pitch = band(f0, 85, 180, 60, 260)
    if f0 and f0 > 180:  # lower is more authoritative; gentle slope above 180 Hz
        pitch = lower_better(f0, 180, 260)
    ups = len(ac.get("upspeak", []))
    drops = len(ac.get("sentence_end_drops", []))
    utt = max(1, ac.get("utterance_count", 1))
    steady = weighted([
        (lower_better(ac.get("jitter_pct"), 1.0, 2.5), 1),
        (lower_better(ac.get("shimmer_db"), 3.0, 6.0), 1),
        (lower_better(ac.get("vocal_fry_pct"), 5.0, 25.0), 0.6),
    ])
    return {
        "pitch": pitch,
        "pitch_variation": band(ac.get("pitch_variation_st"), 2.0, 5.0, 0.8, 8.0),
        "resonance": resonance,
        "hnr": higher_better(ac.get("hnr_db"), 20.0, 8.0),
        "steadiness": steady,
        "upspeak": lower_better(ups / utt * 100.0, 0.0, 40.0),
        "end_drop": lower_better(drops / utt * 100.0, 0.0, 50.0),
        "energy": lower_better(ac.get("energy_consistency_db"), 2.5, 8.0),
        "pace": band(lang.get("wpm"), 130, 160, 90, 200),
        "fillers": lower_better(lang["fillers"]["pct"], 2.0, 8.0),
        "hedging": lower_better(lang.get("hedge_pct"), 5.0, 40.0),
        "passive": lower_better(lang.get("passive_pct"), 30.0, 70.0) if lang.get("sentence_count", 0) else None,
        "run_ons": weighted([
            (lower_better(lang.get("avg_sentence_words"), 18, 35), 1),
            (lower_better(len(lang.get("run_ons", [])), 0, 3), 1),
        ]),
        "sentiment": lower_better(sentiment.get("std"), 0.15, 0.6),
    }


def composites(p: Dict[str, Optional[float]], asr_confidence: Optional[float]) -> Dict[str, int]:
    articulation = None if asr_confidence is None else higher_better(asr_confidence, 0.95, 0.6)
    conf = weighted([(p["pitch"], 0.2), (p["hnr"], 0.2), (p["upspeak"], 0.2),
                     (p["hedging"], 0.25), (p["sentiment"], 0.15)])
    clar = weighted([(articulation, 0.25), (p["run_ons"], 0.2), (p["fillers"], 0.3), (p["pace"], 0.25)])
    auth = weighted([(p["resonance"], 0.3), (p["energy"], 0.2), (p["end_drop"], 0.25), (p["passive"], 0.25)])
    pres = weighted([(conf, 1), (clar, 1), (auth, 1)])
    return {k: int(round(clamp(v if v is not None else 0))) for k, v in
            {"confidence": conf, "clarity": clar, "authority": auth, "presence": pres}.items()}


def build_flags(ac: Dict, lang: Dict, sentiment: Dict, intent: Optional[Dict]) -> List[Dict]:
    flags: List[Dict] = []

    def add(kind, severity, title, detail, **extra):
        flags.append({"kind": kind, "severity": severity, "title": title, "detail": detail, **extra})

    f0 = ac.get("f0_mean_hz")
    if f0 and f0 > 180:
        add("pitch", "warn", f"Average pitch {f0:.0f} Hz", "Above the 85–180 Hz authoritative range. Speak from the chest and let your pitch settle lower.")
    pv = ac.get("pitch_variation_st")
    if pv is not None and pv < 2.0:
        add("pitch_variation", "warn", "Monotone delivery", "Your pitch barely moves. Lift gently on key points and drop on conclusions.")
    elif pv is not None and pv > 5.0:
        add("pitch_variation", "warn", "Erratic pitch", "Pitch swings widely. Keep variety, but anchor sentences on a steady baseline.")
    for u in ac.get("upspeak", []):
        add("upspeak", "warn", f"Upspeak at {u['t']}s", "Pitch rose at the end of a statement, which signals uncertainty. Land it downward (ignore if this was a question).", t=u["t"])
    for d in ac.get("sentence_end_drops", []):
        add("end_drop", "warn", f"Trailed off at {d['t']}s", f"Volume fell {d['drop_db']} dB at the end of a sentence. Finish at full volume.", t=d["t"])
    for v in ac.get("vocal_fry", [])[:5]:
        add("vocal_fry", "info", f"Vocal fry at {v['t']}s", "A creaky, low rattle crept in. Support with more breath.", t=v["t"])
    hnr = ac.get("hnr_db")
    if hnr is not None and hnr < 20:
        add("hnr", "warn", f"HNR {hnr:.1f} dB", "Below 20 dB reads as breathy or weak. Breathe low and support each phrase.")
    if (ac.get("jitter_pct") or 0) > 1.0 or (ac.get("shimmer_db") or 0) > 3.0:
        add("steadiness", "info", "Shaky voice quality", f"Jitter {ac.get('jitter_pct', 0):.2f}% / shimmer {ac.get('shimmer_db', 0):.2f} dB. Slow down and steady your breath.")
    wpm = lang.get("wpm")
    if wpm is not None and wpm < 110:
        add("pace", "warn", f"Too slow ({wpm:.0f} WPM)", "Aim for 130–160 WPM.")
    elif wpm is not None and wpm > 170:
        add("pace", "warn", f"Too fast ({wpm:.0f} WPM)", "Aim for 130–160 WPM. Add pauses between thoughts.")
    fl = lang["fillers"]
    if fl["pct"] and fl["pct"] >= 2.0:
        top = ", ".join(f"“{w}” ×{c}" for w, c in sorted(fl["by_word"].items(), key=lambda x: -x[1])[:4])
        add("fillers", "warn", f"{fl['count']} filler words ({fl['pct']:.1f}%)", f"{top}. Replace each with a silent pause.")
    for h in lang["hedges"][:8]:
        add("hedging", "warn", f"Hedge: “{h['hedge']}”", "Say it directly.", said=h["said"], **{"try": h["try"]})
    if lang.get("passive_pct") and lang["passive_pct"] > 30:
        add("passive", "warn", f"Passive voice {lang['passive_pct']:.0f}%", "Name who does what: “We delivered the report”, not “The report was delivered”.")
    for r in lang["run_ons"][:3]:
        add("run_on", "warn", f"Run-on sentence ({r['words']} words)", "Split it into two or three short sentences.", said=r["sentence"][:140])
    add("sentiment", "info", sentiment["label"], sentiment["coaching"])
    return flags


def chest_label(ac: Dict) -> Optional[Dict]:
    f1, f2 = ac.get("f1_hz"), ac.get("f2_hz")
    if not (f1 and f2):
        return None
    k = 1.0 if (ac.get("f0_median_hz") or 0) < 165 else 1.15
    a, b = f1 / k, f2 / k
    if a <= 520 and b <= 1550:
        lab, txt = "high", "Resonant chest voice — your voice sounds full and grounded."
    elif a >= 620 or b >= 1800:
        lab, txt = "low", "More head/nasal resonance. Hum low, then speak from the hum to feel it in your chest."
    else:
        lab, txt = "medium", "Some chest resonance. Relax your jaw and speak slightly lower to deepen it."
    return {"label": lab, "explanation": txt}
