"""
Composite scoring + coaching flags.

One unified pipeline for both voice modes: acoustic + language signals are always
present; sentiment/intent come from Deepgram (cloud) or the local lexicon, and any
missing component is dropped with its weight renormalized.

Every target comes from `extras["thresholds"]` (built-in defaults < the learner's
persona targets < the lesson's own success criteria), so a program that wants
100-130 WPM is scored against 100-130 WPM rather than a generic range.
"""
from typing import Dict, List, Optional

from speech.program import DEFAULT_TARGETS
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
    "landing": "Firm landings",
    "pauses": "Deliberate pauses",
    "anchor": "Anchor drops",
    "stamina": "Voice stamina",
    "pitch_drop": "Pitch floor vs Day 1",
    "pressure": "Pressure response",
}


def targets_of(extras: Optional[Dict]) -> Dict:
    return {**DEFAULT_TARGETS, **((extras or {}).get("thresholds") or {})}


def _rng(r) -> str:
    return f"{r[0]:g}–{r[1]:g}"


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


def _speaking_pitch(ac: Dict) -> Optional[float]:
    return ac.get("f0_median_hz") or ac.get("f0_mean_hz")


def param_scores(ac: Dict, lang: Dict, sentiment: Dict, extras: Optional[Dict] = None) -> Dict[str, Optional[float]]:
    T = targets_of(extras)
    f1, f2, f0m = ac.get("f1_hz"), ac.get("f2_hz"), ac.get("f0_median_hz") or 0
    k = 1.0 if f0m < 165 else 1.15
    resonance = None
    if f1 and f2:
        resonance = weighted([(lower_better(f1 / k, 500, 700), 1), (lower_better(f2 / k, 1500, 1900), 1)])

    lo, hi = T["f0_range"]
    f0 = _speaking_pitch(ac)
    pitch = band(f0, lo, hi, lo - 25, hi + 80)
    if f0 and f0 > hi:  # lower is more authoritative; gentle slope above the range
        pitch = lower_better(f0, hi, hi + 80)
    ups = len(ac.get("upspeak", []))
    drops = len(ac.get("sentence_end_drops", []))
    utt = max(1, ac.get("utterance_count", 1))
    steady = weighted([
        (lower_better(ac.get("jitter_pct"), T["jitter_max_pct"], T["jitter_max_pct"] + 1.5), 1),
        (lower_better(ac.get("shimmer_db"), T["shimmer_max_db"], T["shimmer_max_db"] + 3.0), 1),
        (lower_better(ac.get("vocal_fry_pct"), 5.0, 25.0), 0.6),
    ])
    wlo, whi = T["wpm_range"]
    amax = T["avg_sentence_words_max"]
    return {
        "pitch": pitch,
        "pitch_variation": band(ac.get("pitch_variation_st"), 2.0, 5.0, 0.8, 8.0),
        "resonance": resonance,
        "hnr": higher_better(ac.get("hnr_db"), T["hnr_min_db"], T["hnr_min_db"] - 12.0),
        "steadiness": steady,
        "upspeak": lower_better(ups / utt * 100.0, 0.0, 40.0),
        "end_drop": lower_better(drops / utt * 100.0, 0.0, 50.0),
        "energy": lower_better(ac.get("energy_consistency_db"), 2.5, 8.0),
        "pace": band(lang.get("wpm"), wlo, whi, wlo - 40, whi + 40),
        "fillers": lower_better(lang["fillers"]["pct"], T["filler_pct_max"], T["filler_pct_max"] + 6.0),
        "hedging": lower_better(lang.get("hedge_pct"), T["hedge_pct_max"], T["hedge_pct_max"] + 35.0),
        "passive": (lower_better(lang.get("passive_pct"), T["passive_pct_max"], T["passive_pct_max"] + 40.0)
                    if lang.get("sentence_count", 0) else None),
        "run_ons": weighted([
            (lower_better(lang.get("avg_sentence_words"), amax, amax + 15), 1),
            (lower_better(len(lang.get("run_ons", [])), 0, 3), 1),
        ]),
        "sentiment": lower_better(sentiment.get("std"), 0.15, 0.6),
        **tonal_scores(ac, extras or {}),
    }


def _pressure_pace_ok(pressure: Dict, T: Dict) -> Optional[bool]:
    if T.get("pressure_wpm_range") and pressure.get("wpm"):
        return pressure["wpm"] <= T["pressure_wpm_range"][1]
    change = pressure.get("pace_change_pct")
    return None if change is None else change <= -0.75 * T["pressure_pace_drop_pct"]


def tonal_scores(ac: Dict, extras: Dict) -> Dict[str, Optional[float]]:
    """The executive tonal signature: landings, pauses, anchor drops, stamina, Day-1 drop, pressure."""
    T = targets_of(extras)
    tonal = ac.get("tonal") or {}
    pauses = tonal.get("pauses") or {}
    stamina = ac.get("stamina")
    change = extras.get("pitch_change_pct")
    pressure = extras.get("pressure")
    plo, phi = T["pauses_per_min"]
    dlo, dhi = T["pitch_drop_pct"]
    pressure_score = None
    if pressure:
        llo, lhi = T["pressure_latency_sec"]
        if T.get("pressure_wpm_range") and pressure.get("wpm"):
            a, b = T["pressure_wpm_range"]
            pace = band(pressure["wpm"], a, b, a - 25, b + 35)
        else:
            pace = lower_better(pressure.get("pace_change_pct"), -T["pressure_pace_drop_pct"], 10.0)
        pressure_score = weighted([
            (band(pressure.get("latency_sec"), llo, lhi, max(0.1, llo - 0.8), lhi + 2.5), 0.4),
            (pace, 0.3),
            (lower_better(pressure.get("pitch_change_pct"), -T["pressure_pitch_drop_pct"][0], 8.0), 0.3),
        ])
    return {
        "landing": (higher_better(tonal.get("landing_pct"), T["landing_pct_min"], T["landing_pct_min"] - 45.0)
                    if tonal.get("utterances", 0) >= 3 else None),
        "pauses": band(pauses.get("deliberate_per_min"), plo, phi, 0.0, phi * 2 + 2) if pauses.get("count") else None,
        "anchor": higher_better(tonal.get("anchor_pct"), 50.0, 0.0) if (tonal.get("anchor_candidates") or 0) >= 2 else None,
        "stamina": (lower_better(stamina.get("fatigue_index"), 0.15, 0.7)
                    if stamina and stamina.get("fatigue_index") is not None else None),
        # Lower than Day 1 by the target %, but much lower than that is strain.
        "pitch_drop": band(-change, dlo, dhi, -2.0, dhi + 10.0) if change is not None else None,
        "pressure": pressure_score,
    }


def composites(p: Dict[str, Optional[float]], asr_confidence: Optional[float]) -> Dict[str, int]:
    articulation = None if asr_confidence is None else higher_better(asr_confidence, 0.95, 0.6)
    conf = weighted([(p["pitch"], 0.15), (p["hnr"], 0.15), (p["upspeak"], 0.15),
                     (p["hedging"], 0.2), (p["sentiment"], 0.1),
                     (p.get("pitch_drop"), 0.1), (p.get("pressure"), 0.15)])
    clar = weighted([(articulation, 0.2), (p["run_ons"], 0.2), (p["fillers"], 0.25), (p["pace"], 0.2),
                     (p.get("pauses"), 0.15)])
    auth = weighted([(p["resonance"], 0.25), (p["energy"], 0.15), (p["end_drop"], 0.2), (p["passive"], 0.15),
                     (p.get("landing"), 0.15), (p.get("anchor"), 0.1), (p.get("stamina"), 0.1)])
    pres = weighted([(conf, 1), (clar, 1), (auth, 1)])
    return {k: int(round(clamp(v if v is not None else 0))) for k, v in
            {"confidence": conf, "clarity": clar, "authority": auth, "presence": pres}.items()}


def build_flags(ac: Dict, lang: Dict, sentiment: Dict, intent: Optional[Dict], extras: Optional[Dict] = None) -> List[Dict]:
    flags: List[Dict] = []
    extras = extras or {}
    T = targets_of(extras)

    def add(kind, severity, title, detail, **extra):
        flags.append({"kind": kind, "severity": severity, "title": title, "detail": detail, **extra})

    lo, hi = T["f0_range"]
    f0 = _speaking_pitch(ac)
    if f0 and f0 > hi:
        add("pitch", "warn", f"Speaking pitch {f0:.0f} Hz",
            f"Above your {_rng(T['f0_range'])} Hz target. Speak from the chest and let your pitch settle lower.")
    pv = ac.get("pitch_variation_st")
    if pv is not None and pv < 2.0:
        add("pitch_variation", "warn", "Monotone delivery", "Your pitch barely moves. Lift gently on transitions and drop on conclusions.")
    elif pv is not None and pv > 5.0:
        add("pitch_variation", "warn", "Erratic pitch", "Pitch swings widely. Keep variety, but anchor sentences on a steady baseline.")
    for u in ac.get("upspeak", []):
        add("upspeak", "warn", f"Upspeak at {u['t']}s", "Pitch rose at the end of a statement, which signals uncertainty. Land it downward (ignore if this was a question).", t=u["t"])
    for d in ac.get("sentence_end_drops", []):
        add("end_drop", "warn", f"Trailed off at {d['t']}s", f"Volume fell {d['drop_db']} dB at the end of a sentence. Finish at full volume.", t=d["t"])
    for v in ac.get("vocal_fry", [])[:5]:
        add("vocal_fry", "info", f"Vocal fry at {v['t']}s", "A creaky, low rattle crept in. Support with more breath.", t=v["t"])
    hnr = ac.get("hnr_db")
    if hnr is not None and hnr < T["hnr_min_db"]:
        add("hnr", "warn", f"HNR {hnr:.1f} dB", f"Below {T['hnr_min_db']:g} dB reads as breathy or weak. Breathe low and support each phrase.")
    if (ac.get("jitter_pct") or 0) > T["jitter_max_pct"] or (ac.get("shimmer_db") or 0) > T["shimmer_max_db"]:
        add("steadiness", "info", "Shaky voice quality", f"Jitter {ac.get('jitter_pct') or 0:.2f}% / shimmer {ac.get('shimmer_db') or 0:.2f} dB. Slow down and steady your breath.")
    wpm = lang.get("wpm")
    wlo, whi = T["wpm_range"]
    if wpm is not None and wpm < wlo - 15:
        add("pace", "warn", f"Too slow ({wpm:.0f} WPM)", f"Aim for {_rng(T['wpm_range'])} WPM.")
    elif wpm is not None and wpm > whi + 10:
        add("pace", "warn", f"Too fast ({wpm:.0f} WPM)", f"Aim for {_rng(T['wpm_range'])} WPM. Add pauses between thoughts.")
    fl = lang["fillers"]
    if fl["count"] and (fl["pct"] or 0) >= T["filler_pct_max"]:
        top = ", ".join(f"“{w}” ×{c}" for w, c in sorted(fl["by_word"].items(), key=lambda x: -x[1])[:5])
        add("fillers", "warn", f"{fl['count']} filler words ({fl['pct']:.1f}%)",
            f"{top}. Target under {T['filler_pct_max']:g}%. Replace each with a silent pause.")
    for h in lang["hedges"][:8]:
        add("hedging", "warn", f"Hedge: “{h['hedge']}”", "Say it directly.", said=h["said"], **{"try": h["try"]})
    if lang.get("passive_pct") and lang["passive_pct"] > T["passive_pct_max"]:
        add("passive", "warn", f"Passive voice {lang['passive_pct']:.0f}%", "Name who does what: “We delivered the report”, not “The report was delivered”.")
    avg = lang.get("avg_sentence_words")
    if avg and lang.get("sentence_count", 0) >= 3 and avg > T["avg_sentence_words_max"]:
        add("run_on", "info", f"Average sentence {avg:.0f} words",
            f"Target under {T['avg_sentence_words_max']:g}. Say it once, say it well, stop.")
    for r in lang["run_ons"][:3]:
        add("run_on", "warn", f"Run-on sentence ({r['words']} words)", "Split it into two or three short sentences.", said=r["sentence"][:140])

    # ── Tonal signature ──────────────────────────────────────────
    tonal = ac.get("tonal") or {}
    landing = tonal.get("landing_pct")
    if landing is not None and tonal.get("utterances", 0) >= 3 and landing < T["landing_pct_min"] - 15:
        add("landing", "warn", f"Firm landings: {landing:.0f}% of sentences",
            "Finish every sentence at the pitch you started on, or lower — a full stop, not a comma.")
    pauses = tonal.get("pauses") or {}
    plo, phi = T["pauses_per_min"]
    if pauses.get("count") and (pauses.get("deliberate_per_min") or 0) < plo:
        add("pauses", "info", f"{pauses.get('deliberate_per_min') or 0:.1f} deliberate pauses per minute",
            f"Target {_rng(T['pauses_per_min'])} per minute: pause 1–2 seconds before your most important word.")
    if (pauses.get("long") or 0) >= 2:
        add("pauses", "info", f"{pauses['long']} long hesitations",
            "Pauses over 3 seconds read as lost thread. Keep deliberate pauses to 1–2 seconds.")
    if (tonal.get("anchor_candidates") or 0) >= 2 and (tonal.get("anchor_pct") or 0) < 30:
        add("anchor", "info", "Anchor drop missing",
            "After a pause, start your key point slightly below your normal pitch — lower and slower, not louder.")
    stamina = ac.get("stamina")
    if stamina and stamina.get("fatigue_detected"):
        bits = []
        if (stamina.get("hnr_drop_db") or 0) >= 1.5:
            bits.append(f"HNR fell {stamina['hnr_drop_db']:.1f} dB")
        if (stamina.get("f0_rise_st") or 0) >= 1.0:
            bits.append(f"pitch rose {stamina['f0_rise_st']:.1f} semitones")
        if (stamina.get("jitter_rise_pct") or 0) >= 0.25:
            bits.append(f"jitter rose {stamina['jitter_rise_pct']:.2f} pts")
        if (stamina.get("energy_drop_db") or 0) >= 3:
            bits.append(f"volume fell {stamina['energy_drop_db']:.1f} dB")
        onset = stamina.get("fatigue_onset_min")
        add("stamina", "warn", f"Voice fatigue{f' from ~{onset:.0f} min' if onset else ''}",
            (", ".join(bits) + ". " if bits else "") + "Breathe low from the diaphragm and let the chest carry the sound, not the throat.")
    change = extras.get("pitch_change_pct")
    dlo, dhi = T["pitch_drop_pct"]
    if change is not None and change > -dlo / 2:
        add("pitch_drop", "info", f"Speaking pitch {change:+.0f}% vs Day 1",
            f"Target {dlo:g}–{dhi:g}% lower than your Day 1 baseline — hum low, then speak from the hum.")
    pressure = extras.get("pressure")
    if pressure:
        latency = pressure.get("latency_sec")
        llo, lhi = T["pressure_latency_sec"]
        if latency is not None and latency < llo:
            add("pressure", "warn", f"Answered in {latency:.1f}s",
                f"When challenged, pause {llo:g}–{lhi:g} seconds and breathe first. It says you're not threatened by the question.")
        if T.get("pressure_wpm_range") and pressure.get("wpm") and pressure["wpm"] > T["pressure_wpm_range"][1]:
            add("pressure", "warn", f"{pressure['wpm']:.0f} WPM under challenge",
                f"Target {_rng(T['pressure_wpm_range'])} WPM — slow down when pressed.")
        elif not T.get("pressure_wpm_range") and pressure.get("pace_change_pct") is not None:
            pc, drop = pressure["pace_change_pct"], T["pressure_pace_drop_pct"]
            if pc > 3:
                add("pressure", "warn", f"Sped up {pc:.0f}% under challenge", f"Slow down {drop:g}% when pressed — the opposite of the fight-or-flight rush.")
            elif pc > -0.75 * drop:
                add("pressure", "info", f"Slowed only {abs(pc):.0f}% under challenge", f"Target: {drop:g}% slower than your normal pace.")
        if (pressure.get("pitch_change_pct") or 0) > 2:
            add("pressure", "warn", f"Pitch rose {pressure['pitch_change_pct']:.0f}% under challenge",
                f"Drop {_rng(T['pressure_pitch_drop_pct'])}% lower when challenged; a higher, tighter voice reads as defensive.")
    add("sentiment", "info", sentiment["label"], sentiment["coaching"])
    return flags


def tonal_moves(ac: Dict, extras: Dict) -> List[Dict]:
    """The five executive tonal moves, as measured in this session."""
    T = targets_of(extras)
    tonal = ac.get("tonal") or {}
    pauses = tonal.get("pauses") or {}
    pressure = extras.get("pressure")
    ups = len(ac.get("upspeak", []))
    plo, phi = T["pauses_per_min"]

    def move(key, name, value, target, ok):
        return {"key": key, "move": name, "value": value, "target": target, "ok": None if ok is None else bool(ok)}

    cand = tonal.get("anchor_candidates") or 0
    moves = [
        move("anchor", "Anchor drop",
             f"{tonal.get('anchor_drops', 0)} of {cand} points after a pause started low" if cand else "No pauses before points yet",
             "Lower and slower before every key point", (tonal.get("anchor_pct") or 0) >= 50 if cand >= 2 else None),
        move("pause", "Deliberate pause",
             f"{pauses.get('deliberate', 0)} deliberate pauses ({(pauses.get('deliberate_per_min') or 0):.1f}/min)",
             f"1–2 s before the key word, {_rng(T['pauses_per_min'])} per minute",
             (pauses.get("deliberate_per_min") or 0) >= plo if pauses.get("count") is not None else None),
        move("rise", "Measured rise",
             f"{tonal.get('resolved_rises', 0)} resolved rises, {ups} upspeak",
             "Rise on transitions only, always resolve down",
             ups == 0 and tonal.get("resolved_rises", 0) >= 1 if tonal.get("utterances") else None),
        move("landing", "Firm landing",
             f"{tonal['landing_pct']:.0f}% of sentences landed" if tonal.get("landing_pct") is not None else "Not enough sentences",
             f"Same pitch or lower at every full stop ({T['landing_pct_min']:g}%+)",
             (tonal.get("landing_pct") or 0) >= T["landing_pct_min"] if tonal.get("utterances", 0) >= 3 else None),
    ]
    llo, lhi = T["pressure_latency_sec"]
    pace_target = (f"{_rng(T['pressure_wpm_range'])} WPM" if T.get("pressure_wpm_range")
                   else f"slow {T['pressure_pace_drop_pct']:g}%")
    target = f"Pause {llo:g}–{lhi:g} s, {pace_target}, drop pitch {_rng(T['pressure_pitch_drop_pct'])}%"
    if pressure:
        latency = pressure.get("latency_sec")
        pace_ok = _pressure_pace_ok(pressure, T)
        pace_txt = (f"{pressure['wpm']:.0f} WPM" if T.get("pressure_wpm_range") and pressure.get("wpm")
                    else f"pace {pressure.get('pace_change_pct') or 0:+.0f}%")
        moves.append(move("pressure", "Pressure slowdown",
                          f"paused {latency:.1f}s · {pace_txt} · pitch {pressure.get('pitch_change_pct') or 0:+.0f}%"
                          if latency is not None else "Measured on pressure drills",
                          target,
                          (latency or 0) >= llo and bool(pace_ok) and (pressure.get("pitch_change_pct") or 0) <= 0))
    else:
        moves.append(move("pressure", "Pressure slowdown", "Run a pressure drill to measure this", target, None))
    return moves


def build_targets(ac: Dict, extras: Dict) -> List[Dict]:
    """Current vs target for each pitch-training parameter of the program."""
    T = targets_of(extras)
    tonal = ac.get("tonal") or {}
    stamina = ac.get("stamina")
    pressure = extras.get("pressure")
    consistency = extras.get("consistency")
    change = extras.get("pitch_change_pct")
    f0 = _speaking_pitch(ac)
    pv = ac.get("pitch_variation_st")
    dlo, dhi = T["pitch_drop_pct"]
    rows = []

    def row(param, current, target, ok):
        rows.append({"param": param, "current": current, "target": target, "ok": None if ok is None else bool(ok)})

    if change is None:
        row("Baseline pitch", f"{f0:.0f} Hz — this session sets your Day 1 baseline" if f0 else "—",
            f"{dlo:g}–{dhi:g}% lower floor through chest resonance ({_rng(T['f0_range'])} Hz)", None)
    else:
        row("Baseline pitch", f"{f0:.0f} Hz ({change:+.0f}% vs Day 1)", f"{dlo:g}–{dhi:g}% lower than Day 1",
            -dhi - 0.5 <= change <= -dlo + 0.5)
    if pv is not None:
        shape = "monotone" if pv < 2.0 else "erratic" if pv > 5.0 else "dynamic"
        row("Pitch variation", f"{pv:.1f} semitones — {shape}", "Intentional anchor → rise → land pattern", 2.0 <= pv <= 5.0)
    llo, lhi = T["pressure_latency_sec"]
    if pressure:
        pace_ok = _pressure_pace_ok(pressure, T)
        row("Under pressure",
            f"paused {pressure.get('latency_sec') or 0:.1f}s, pace {pressure.get('pace_change_pct') or 0:+.0f}%, pitch {pressure.get('pitch_change_pct') or 0:+.0f}%",
            f"Pause {llo:g}–{lhi:g} s, slow down, pitch at or below baseline",
            (pressure.get("latency_sec") or 0) >= llo and bool(pace_ok) and (pressure.get("pitch_change_pct") or 0) <= 0)
    else:
        row("Under pressure", "Not measured — run a pressure drill", f"Pause {llo:g}–{lhi:g} s, slow down, pitch at or below baseline", None)
    row("Key word emphasis",
        f"{tonal.get('anchor_drops', 0)} anchor drops, {ac.get('emphasis_spikes', 0)} emphasis peaks",
        "Deliberate anchor drop on every key point",
        (tonal.get("anchor_pct") or 0) >= 50 if (tonal.get("anchor_candidates") or 0) >= 2 else None)
    drops = len(ac.get("sentence_end_drops", []))
    row("Sentence endings",
        f"{tonal['landing_pct']:.0f}% firm landings, {drops} trail-off{'s' if drops != 1 else ''}" if tonal.get("landing_pct") is not None else f"{drops} trail-offs",
        "Firm landing — same pitch or lower, every time",
        (tonal.get("landing_pct") or 0) >= T["landing_pct_min"] and drops == 0 if tonal.get("utterances", 0) >= 3 else None)
    goal = T["fatigue_minutes"]
    if stamina:
        fatigued = stamina.get("fatigue_detected")
        row("Voice fatigue",
            (f"fatigue from ~{stamina['fatigue_onset_min']:.0f} min" if stamina.get("fatigue_onset_min") else "fatigue detected")
            if fatigued else f"steady for {stamina['duration_min']:.0f} min",
            f"{goal:g}+ minutes without fatigue",
            # Steady but shorter than the goal isn't a pass yet, just not a fail.
            False if fatigued else True if stamina.get("duration_min", 0) >= goal else None)
    else:
        mins = (ac.get("duration_sec") or 0) / 60.0
        row("Voice fatigue", f"{mins:.1f} min session — record 4+ min to measure", f"{goal:g}+ minutes without fatigue", None)
    if consistency:
        row("Tonal identity",
            f"pitch spread {consistency['f0_std_st']:.1f} st over your last {consistency['sessions']} sessions",
            "Calm, deep, certain — the same voice every session", consistency["f0_std_st"] <= 1.0)
    else:
        row("Tonal identity", "Needs 3+ sessions", "Calm, deep, certain — the same voice every session", None)
    return rows


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
