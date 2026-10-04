"""
Krishna's Word of the Day dictionary (Part 10).

Each entry is a Sanskrit philosophical term with its own meaning, an ordinary
explanation, an optional Gita reference, and a today's-application line.

`gita_ref` is a pointer, not a quotation. The daily builder resolves it
against the verse store and drops the connection if the verse isn't present,
so the UI can never show a reference it cannot back up.
"""
from __future__ import annotations

from typing import Any

WORDS: list[dict[str, Any]] = [
    {
        "id": "dharma", "word": "Dharma", "devanagari": "धर्म",
        "transliteration": "dharma", "pronunciation": "DHUR-muh",
        "meaning": "Duty, right action, the way of living that fits you",
        "explanation": (
            "Not 'religion' in the modern sense. Closer to: the work and conduct that "
            "genuinely belong to your role and nature right now."
        ),
        "gita_ref": [3, 35],
        "application": "Aaj ka ek kaam chuno jo sach mein tumhara hai — kisi aur ka nahi.",
    },
    {
        "id": "karma", "word": "Karma", "devanagari": "कर्म",
        "transliteration": "karma", "pronunciation": "KUR-muh",
        "meaning": "Action, and what action sets in motion",
        "explanation": (
            "Karma means action first, consequence second. The Gita's interest is in how "
            "you act, not in keeping a ledger against you."
        ),
        "gita_ref": [2, 47],
        "application": "Result ka hisaab chhodo — aaj ka action theek se karo.",
    },
    {
        "id": "samatva", "word": "Samatva", "devanagari": "समत्व",
        "transliteration": "samatva", "pronunciation": "suh-MUT-vuh",
        "meaning": "Equanimity, evenness of mind",
        "explanation": (
            "Steadiness that does not depend on the news being good. Not numbness — you "
            "still feel things, you just are not thrown by them."
        ),
        "gita_ref": [2, 48],
        "application": "Good news aaye ya bad news — apna balance mat khona.",
    },
    {
        "id": "shraddha", "word": "Shraddha", "devanagari": "श्रद्धा",
        "transliteration": "śraddhā", "pronunciation": "SHRUD-dhaa",
        "meaning": "Trusting faith; conviction you act on",
        "explanation": (
            "Faith that shows up as steady practice rather than as certainty. You keep "
            "going before you have proof."
        ),
        "gita_ref": None,
        "application": "Proof aane se pehle bhi practice jaari rakho.",
    },
    {
        "id": "bhakti", "word": "Bhakti", "devanagari": "भक्ति",
        "transliteration": "bhakti", "pronunciation": "BHUK-tee",
        "meaning": "Loving devotion",
        "explanation": (
            "Relationship rather than ritual. The Gita repeatedly says the offering's "
            "size matters far less than the sincerity behind it."
        ),
        "gita_ref": [9, 26],
        "application": "Chhota kaam, poore dil se. Wahi kaafi hai.",
    },
    {
        "id": "vairagya", "word": "Vairagya", "devanagari": "वैराग्य",
        "transliteration": "vairāgya", "pronunciation": "vai-RAAG-yuh",
        "meaning": "Non-attachment, dispassion",
        "explanation": (
            "Not not-caring. It is caring about the work without being owned by the "
            "outcome — which is what lets you keep going after a bad result."
        ),
        "gita_ref": [6, 35],
        "application": "Kaam se pyaar, result se thodi doori.",
    },
    {
        "id": "sankalpa", "word": "Sankalpa", "devanagari": "सङ्कल्प",
        "transliteration": "saṅkalpa", "pronunciation": "sun-KUL-puh",
        "meaning": "Resolve, a deliberate intention",
        "explanation": (
            "A decision you make once, clearly, so you do not have to re-argue it with "
            "yourself every morning."
        ),
        "gita_ref": [12, 14],
        "application": "Ek cheez decide karo aaj — phir usse roz debate mat karo.",
    },
    {
        "id": "dhyana", "word": "Dhyana", "devanagari": "ध्यान",
        "transliteration": "dhyāna", "pronunciation": "DHYAA-nuh",
        "meaning": "Meditation, sustained attention",
        "explanation": (
            "Attention resting on one thing long enough to settle. The Gita's image is a "
            "lamp flame in a windless place."
        ),
        "gita_ref": [6, 19],
        "application": "Pehle hawa band karo — phone silent, tabs band. Phir baitho.",
    },
    {
        "id": "kshama", "word": "Kshama", "devanagari": "क्षमा",
        "transliteration": "kṣamā", "pronunciation": "KSHUH-maa",
        "meaning": "Forgiveness, patient endurance",
        "explanation": (
            "Listed as a quality of the devotee dear to Krishna. It includes forgiving "
            "yourself for the day that did not go as planned."
        ),
        "gita_ref": [12, 13],
        "application": "Kal miss ho gaya? Maaf karo, aur aaj phir shuru karo.",
    },
    {
        "id": "karuna", "word": "Karuna", "devanagari": "करुणा",
        "transliteration": "karuṇā", "pronunciation": "kuh-ROO-naa",
        "meaning": "Compassion",
        "explanation": (
            "Feeling with someone rather than about them — and being moved enough to act "
            "gently, including toward yourself."
        ),
        "gita_ref": [12, 13],
        "application": "Aaj khud se waise baat karo jaise ek dost se karte ho.",
    },
    {
        "id": "abhyasa", "word": "Abhyasa", "devanagari": "अभ्यास",
        "transliteration": "abhyāsa", "pronunciation": "ub-HYAA-suh",
        "meaning": "Steady, repeated practice",
        "explanation": (
            "The Gita's answer to a restless mind is not force but repetition — abhyasa "
            "paired with vairagya."
        ),
        "gita_ref": [6, 35],
        "application": "Roz thoda. Perfect se behtar hai regular.",
    },
    {
        "id": "buddhi", "word": "Buddhi", "devanagari": "बुद्धि",
        "transliteration": "buddhi", "pronunciation": "BOOD-dhee",
        "meaning": "Discernment, the deciding intelligence",
        "explanation": (
            "Placed above the restless mind: the faculty that can weigh things. Anger is "
            "described as the thing that ruins it first."
        ),
        "gita_ref": [3, 42],
        "application": "Gusse mein koi bada decision nahi. Buddhi pehle shaant ho.",
    },
    {
        "id": "sthitaprajna", "word": "Sthitaprajna", "devanagari": "स्थितप्रज्ञ",
        "transliteration": "sthita-prajña", "pronunciation": "sthi-tuh-PRUG-nyuh",
        "meaning": "One settled in wisdom",
        "explanation": (
            "Described as unshaken in sorrow, not grasping in pleasure, free of clinging, "
            "fear and anger."
        ),
        "gita_ref": [2, 56],
        "application": "Aaj ek situation mein react karne se pehle ek saans lo.",
    },
    {
        "id": "svadharma", "word": "Svadharma", "devanagari": "स्वधर्म",
        "transliteration": "svadharma", "pronunciation": "swuh-DHUR-muh",
        "meaning": "One's own duty or path",
        "explanation": (
            "The Gita is blunt here: your own work done imperfectly beats someone else's "
            "done well. Fit beats prestige."
        ),
        "gita_ref": [18, 47],
        "application": "Tumhara path tumhara hai. Comparison band, kaam shuru.",
    },
    {
        "id": "titiksha", "word": "Titiksha", "devanagari": "तितिक्षा",
        "transliteration": "titikṣā", "pronunciation": "ti-TIK-shaa",
        "meaning": "Patient endurance of what passes",
        "explanation": (
            "The instruction attached to it is that heat and cold, pleasure and pain, "
            "come and go. Endurance is the response to something temporary."
        ),
        "gita_ref": [2, 14],
        "application": "Yeh mood permanent nahi hai. Aaj sirf zaroori kaam.",
    },
    {
        "id": "kama", "word": "Kama", "devanagari": "काम",
        "transliteration": "kāma", "pronunciation": "KAA-muh",
        "meaning": "Desire, craving",
        "explanation": (
            "Traced as a chain: dwelling on something breeds attachment, attachment "
            "breeds desire, and thwarted desire becomes anger."
        ),
        "gita_ref": [2, 62],
        "application": "Chain ko shuruaat mein todo — replay karna band karo.",
    },
    {
        "id": "krodha", "word": "Krodha", "devanagari": "क्रोध",
        "transliteration": "krodha", "pronunciation": "KRO-dhuh",
        "meaning": "Anger",
        "explanation": (
            "Treated less as a sin than as a hazard: anger clouds judgement, and clouded "
            "judgement is what actually does the damage."
        ),
        "gita_ref": [2, 63],
        "application": "Gussa aaye to pehle 10 minute kuch decide na karo.",
    },
    {
        "id": "shanti", "word": "Shanti", "devanagari": "शान्ति",
        "transliteration": "śānti", "pronunciation": "SHAAN-tee",
        "meaning": "Peace, settledness",
        "explanation": (
            "Pictured as the ocean: rivers pour in and it stays level. Peace as capacity, "
            "not as an empty life."
        ),
        "gita_ref": [2, 70],
        "application": "Sab kuch shaant hone ka wait mat karo — apna centre pakdo.",
    },
    {
        "id": "yoga", "word": "Yoga", "devanagari": "योग",
        "transliteration": "yoga", "pronunciation": "YO-guh",
        "meaning": "Union; a disciplined way of being joined to something",
        "explanation": (
            "In the Gita it is far wider than posture. One of its own definitions is "
            "simply evenness of mind in success and failure."
        ),
        "gita_ref": [2, 48],
        "application": "Aaj ka yoga: kaam karo, result ko chipko mat.",
    },
    {
        "id": "atman", "word": "Atman", "devanagari": "आत्मन्",
        "transliteration": "ātman", "pronunciation": "AAT-mun",
        "meaning": "The self",
        "explanation": (
            "Described as unborn and unending — and, notably, as both your best friend "
            "and your worst enemy depending on how you treat it."
        ),
        "gita_ref": [6, 5],
        "application": "Khud ko neeche mat girao. Khud ko uthao.",
    },
    {
        "id": "santosha", "word": "Santosha", "devanagari": "सन्तोष",
        "transliteration": "santoṣa", "pronunciation": "sun-TOH-shuh",
        "meaning": "Contentment",
        "explanation": (
            "Being at ease with what is present. It sits alongside firm resolve in the "
            "same verse — contentment is not the same as giving up."
        ),
        "gita_ref": [12, 14],
        "application": "Jo hai uske liye shukriya, jo karna hai woh bhi karo.",
    },
    {
        "id": "seva", "word": "Seva", "devanagari": "सेवा",
        "transliteration": "sevā", "pronunciation": "SAY-vaa",
        "meaning": "Service offered without a price tag",
        "explanation": (
            "Named as one of the three ways knowledge actually arrives: humility, "
            "sincere questioning, and service."
        ),
        "gita_ref": [4, 34],
        "application": "Aaj kisi ki ek chhoti madad karo, bina kuch expect kiye.",
    },
    {
        "id": "viveka", "word": "Viveka", "devanagari": "विवेक",
        "transliteration": "viveka", "pronunciation": "vi-VAY-kuh",
        "meaning": "Discrimination between the lasting and the passing",
        "explanation": (
            "The habit of asking which part of this actually matters — and which part is "
            "just loud right now."
        ),
        "gita_ref": [2, 13],
        "application": "Poocho: yeh 6 mahine baad bhi matter karega?",
    },
    {
        "id": "ahimsa", "word": "Ahimsa", "devanagari": "अहिंसा",
        "transliteration": "ahiṁsā", "pronunciation": "uh-HIM-saa",
        "meaning": "Non-harming",
        "explanation": (
            "Listed among the qualities of the devotee: no hostility toward any being. "
            "That includes the running commentary in your own head."
        ),
        "gita_ref": [12, 13],
        "application": "Aaj apne aap ko taane mat maaro. Wo bhi himsa hai.",
    },
    {
        "id": "smriti", "word": "Smriti", "devanagari": "स्मृति",
        "transliteration": "smṛti", "pronunciation": "SMRI-tee",
        "meaning": "Memory, recollection of what you know",
        "explanation": (
            "In the anger chain, losing smriti is the middle link: you still know better, "
            "you just cannot reach it in the moment."
        ),
        "gita_ref": [2, 63],
        "application": "Jo tumhe already pata hai, usse likh ke rakho. Gusse mein kaam aayega.",
    },
]

WORDS_BY_ID = {w["id"]: w for w in WORDS}
