"""
Language analysis with spaCy (en_core_web_sm only) — runs on the transcript in BOTH modes.

Fillers, hedging (+ "say this instead"), passive voice, run-on sentences,
words-per-minute, and a lightweight lexicon sentiment used in Local mode
(spaCy's small model has no sentiment component).
"""
import re
from functools import lru_cache
from typing import Dict, List, Optional

from speech.util import clean


@lru_cache(maxsize=1)
def _nlp():
    import spacy

    return spacy.load("en_core_web_sm", disable=["ner", "lemmatizer"])


FILLER_SINGLE = {"um", "uh", "er", "erm", "uhm", "umm", "uhh", "basically"}
HEDGE_PATTERNS = [
    r"i think", r"i guess", r"i feel like", r"maybe", r"kind of", r"sort of",
    r"probably", r"possibly", r"perhaps",
]
HEDGE_RE = re.compile(r"\b(" + "|".join(HEDGE_PATTERNS) + r")\b", re.I)

# Ordered "say this instead" rewrites applied to an excerpt that starts at the hedge.
REWRITES = [
    (r"\b(i think|i guess) maybe we (should|could)\b", "I recommend we"),
    (r"\b(i think|i guess) we (should|could|need to)\b", "I recommend we"),
    (r"\b(we|i) (could|might|can) (possibly|maybe|perhaps)\b", r"\1 will"),
    (r"\bmaybe we (could|should)\b", "we will"),
    (r"\b(sort|kind) of like an? (\w+)", r"The \2 is"),
    (r"\b(i think|i guess|i feel like)( that)?\s*", ""),
    (r"\b(sort|kind) of\s*", ""),
    (r"\b(maybe|probably|possibly|perhaps),?\s*", ""),
]


def _rewrite(excerpt: str) -> str:
    out = excerpt
    for pat, rep in REWRITES:
        out = re.sub(pat, rep, out, flags=re.I)
    out = re.sub(r"\s{2,}", " ", out).strip(" ,")
    if out:
        out = out[0].upper() + out[1:]
    return out


POS_WORDS = set("""good great excellent strong confident clear win success succeed improve improved growth grow
opportunity happy excited love proud ready better best progress achieve achieved effective valuable committed
solid positive thank thanks glad delighted pleased rewarding thrive""".split())
NEG_WORDS = set("""bad poor weak fail failed failure problem issue risk worry worried concern difficult hard delay delayed
late behind unfortunately sorry mistake wrong loss lose lost blocked blocker struggle struggling unable can't
cannot won't never worse worst frustrated afraid fear""".split())
NEGATORS = {"not", "no", "never", "n't", "hardly"}


def _sentence_sentiment(tokens: List[str]) -> float:
    score = pos = neg = 0
    for i, w in enumerate(tokens):
        flipped = any(t in NEGATORS or t.endswith("n't") for t in tokens[max(0, i - 2):i])
        if w in POS_WORDS:
            pos, neg = (pos, neg + 1) if flipped else (pos + 1, neg)
        elif w in NEG_WORDS:
            pos, neg = (pos + 1, neg) if flipped else (pos, neg + 1)
    return (pos - neg) / (pos + neg + 3.0) * 1.8 if (pos or neg) else 0.0


def analyze(transcript: str, speech_span_sec: Optional[float]) -> Dict:
    doc = _nlp()(transcript)
    sents = [s for s in doc.sents if any(t.is_alpha for t in s)]
    words = [t for t in doc if t.is_alpha or t.like_num or "'" in t.text]
    word_count = len(words)

    # ── Fillers ──────────────────────────────────────────────
    fillers: List[Dict] = []
    toks = list(doc)
    for i, t in enumerate(toks):
        low = t.lower_
        prev = toks[i - 1] if i > 0 else None
        nxt = toks[i + 1] if i + 1 < len(toks) else None
        if low in FILLER_SINGLE:
            fillers.append({"word": low, "sentence": t.sent.text.strip()})
        elif low == "like" and (
            (prev is not None and prev.text == ",") or (nxt is not None and nxt.text == ",")
            or ((t.pos_ == "INTJ" or t.dep_ in ("intj", "discourse"))
                and not (nxt is not None and nxt.pos_ in ("DET", "NUM", "NOUN", "PROPN", "PRON")))
        ):
            fillers.append({"word": "like", "sentence": t.sent.text.strip()})
        elif low == "right" and (
            t.dep_ in ("intj", "discourse")
            or (prev is not None and prev.text == "," and (nxt is None or nxt.text in ("?", ",", ".")))
        ):
            fillers.append({"word": "right", "sentence": t.sent.text.strip()})
        elif low == "you" and nxt is not None and nxt.lower_ == "know" and (
            (prev is not None and prev.text == ",") or (i + 2 < len(toks) and toks[i + 2].text == ",")
            or (prev is None)
        ):
            fillers.append({"word": "you know", "sentence": t.sent.text.strip()})
        elif low == "sort" and nxt is not None and nxt.lower_ == "of":
            fillers.append({"word": "sort of", "sentence": t.sent.text.strip()})
    filler_counts: Dict[str, int] = {}
    for f in fillers:
        filler_counts[f["word"]] = filler_counts.get(f["word"], 0) + 1

    # ── Hedging ──────────────────────────────────────────────
    hedges: List[Dict] = []
    hedged_sentences = 0
    for s in sents:
        text = s.text.strip()
        m = HEDGE_RE.search(text)
        if not m:
            continue
        hedged_sentences += 1
        tail = text[m.start():]
        excerpt_words = tail.split()
        excerpt = " ".join(excerpt_words[:6])
        truncated = len(excerpt_words) > 6
        said = excerpt.rstrip(".,;:?!") + ("…" if truncated else "")
        better = _rewrite(excerpt.rstrip(".,;:?!"))
        if not better or better.lower() == excerpt.lower():
            better = f"State it directly — drop “{m.group(0)}”"
        else:
            better += "…" if truncated else ""
        hedges.append({"hedge": m.group(0).lower(), "said": said, "try": better, "sentence": text})

    # ── Passive voice ────────────────────────────────────────
    passive_sentences = sum(1 for s in sents if any(t.dep_ in ("nsubjpass", "auxpass") for t in s))

    # ── Run-ons ──────────────────────────────────────────────
    run_ons: List[Dict] = []
    for s in sents:
        n = sum(1 for t in s if t.is_alpha)
        if n > 35:
            run_ons.append({"words": n, "sentence": s.text.strip()})

    n_sents = max(1, len(sents))
    avg_sentence_words = word_count / n_sents

    wpm = None
    if speech_span_sec and speech_span_sec > 3:
        wpm = word_count / (speech_span_sec / 60.0)

    # ── Lexicon sentiment (Local mode) ───────────────────────
    per_sentence = []
    for s in sents:
        w = [t.lower_ for t in s if t.is_alpha or "'" in t.text]
        per_sentence.append({"text": s.text.strip(), "score": round(_sentence_sentiment(w), 3)})

    return {
        "word_count": word_count,
        "sentence_count": len(sents),
        "avg_sentence_words": clean(avg_sentence_words),
        "wpm": clean(wpm),
        "fillers": {
            "count": len(fillers),
            "pct": clean(100.0 * len(fillers) / max(1, word_count)),
            "by_word": filler_counts,
            "items": fillers[:30],
        },
        "hedges": hedges,
        "hedge_pct": clean(100.0 * hedged_sentences / n_sents),
        "passive_pct": clean(100.0 * passive_sentences / n_sents),
        "run_ons": run_ons,
        "sentence_sentiment": per_sentence,
    }
