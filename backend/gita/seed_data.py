"""
Seed corpus for the Gita knowledge base.

PROVENANCE — read this before trusting anything here (Parts 6, 56):

  * Every verse below is stored with `verified = False` and source
    `curated_seed`. That flag travels all the way out through the API so no
    UI or model response can present it as authoritative scripture.
  * The `translation` fields are plain-English renderings written for this
    app. They are NOT attributed to any published translator, because an
    unverifiable attribution would be worse than none.
  * `commentaries` are deliberately absent. Commentary is never synthesised;
    it only enters the DB through `gita.importer` from a real source.
  * `applications` are explicitly labelled `interpretation` — they are
    practical advice inspired by the verse, not part of the verse.

To upgrade to authoritative data, run the importer against the IIT Kanpur
Gita Supersite (or another primary edition). It overwrites Sanskrit,
transliteration and translations, attaches real commentaries, and flips
`verified` to True.
"""
from __future__ import annotations

from typing import Any

# ── Sources ──────────────────────────────────────────────────────────────
SEED_SOURCES: list[dict[str, Any]] = [
    {
        "id": "curated_seed_sanskrit",
        "name": "Madhav curated seed (Devanagari)",
        "source_type": "curated_seed",
        "source_url": None,
        "edition": "700-verse recension",
        "language": "sa",
        "notes": (
            "Widely circulated verses transcribed for offline bootstrap. "
            "UNVERIFIED against a primary edition — verify via gita.importer "
            "before presenting as authoritative."
        ),
    },
    {
        "id": "curated_seed_translation_en",
        "name": "Madhav plain-English rendering",
        "source_type": "translation",
        "source_url": None,
        "edition": "app-internal",
        "language": "en",
        "notes": (
            "Plain-sense rendering written for this app. Not attributed to any "
            "published translator. Not a substitute for a scholarly translation."
        ),
    },
]

SANSKRIT_SOURCE_ID = "curated_seed_sanskrit"
TRANSLATION_SOURCE_ID = "curated_seed_translation_en"


# ── Verses ───────────────────────────────────────────────────────────────
SEED_VERSES: list[dict[str, Any]] = [
    {
        "chapter": 2, "verse": 11,
        "sanskrit": "अशोच्यानन्वशोचस्त्वं प्रज्ञावादांश्च भाषसे।\nगतासूनगतासूंश्च नानुशोचन्ति पण्डिताः॥",
        "transliteration": "aśocyān anvaśocas tvaṁ prajñā-vādāṁś ca bhāṣase |\ngatāsūn agatāsūṁś ca nānuśocanti paṇḍitāḥ ||",
        "translation": "You grieve for those who should not be grieved for, and yet you speak words of wisdom. The wise do not mourn for the living or for the dead.",
        "themes": ["grief", "wisdom", "perspective"],
        "keywords": ["grief", "mourning", "sorrow", "loss", "death", "wisdom"],
        "applications": [
            "When grief and clear thinking pull in opposite directions, name that split out loud before deciding anything.",
        ],
    },
    {
        "chapter": 2, "verse": 13,
        "sanskrit": "देहिनोऽस्मिन्यथा देहे कौमारं यौवनं जरा।\nतथा देहान्तरप्राप्तिर्धीरस्तत्र न मुह्यति॥",
        "transliteration": "dehino 'smin yathā dehe kaumāraṁ yauvanaṁ jarā |\ntathā dehāntara-prāptir dhīras tatra na muhyati ||",
        "translation": "Just as the embodied self passes through childhood, youth and old age in this body, so it passes on to another body. A steady person is not bewildered by this.",
        "themes": ["impermanence", "change", "grief", "equanimity"],
        "keywords": ["change", "impermanence", "transition", "aging", "steadiness"],
        "applications": [
            "Big life transitions feel like endings. Treat them as one more stage rather than a verdict on you.",
        ],
    },
    {
        "chapter": 2, "verse": 14,
        "sanskrit": "मात्रास्पर्शास्तु कौन्तेय शीतोष्णसुखदुःखदाः।\nआगमापायिनोऽनित्यास्तांस्तितिक्षस्व भारत॥",
        "transliteration": "mātrā-sparśās tu kaunteya śītoṣṇa-sukha-duḥkha-dāḥ |\nāgamāpāyino 'nityās tāṁs titikṣasva bhārata ||",
        "translation": "Contact with the senses gives rise to cold and heat, pleasure and pain. These come and go and do not last. Bear them patiently.",
        "themes": ["equanimity", "impermanence", "endurance", "emotions"],
        "keywords": ["patience", "pain", "pleasure", "endurance", "mood", "temporary", "stress"],
        "applications": [
            "A hard mood is weather, not climate. Ask what is genuinely required in the next hour and do only that.",
        ],
    },
    {
        "chapter": 2, "verse": 20,
        "sanskrit": "न जायते म्रियते वा कदाचिन्नायं भूत्वा भविता वा न भूयः।\nअजो नित्यः शाश्वतोऽयं पुराणो न हन्यते हन्यमानेऽस्मिन्शरीरे॥",
        "transliteration": "na jāyate mriyate vā kadācin nāyaṁ bhūtvā bhavitā vā na bhūyaḥ |\najo nityaḥ śāśvato 'yaṁ purāṇo na hanyate hanyamāne 'smin śarīre ||",
        "translation": "The self is never born and never dies. It did not come into being and will not cease to be. Unborn, eternal, everlasting and ancient, it is not slain when the body is slain.",
        "themes": ["self knowledge", "death", "eternity", "grief"],
        "keywords": ["self", "soul", "atman", "death", "eternal", "identity"],
        "applications": [
            "Your sense of who you are does not have to rise and fall with today's outcome.",
        ],
    },
    {
        "chapter": 2, "verse": 22,
        "sanskrit": "वासांसि जीर्णानि यथा विहाय नवानि गृह्णाति नरोऽपराणि।\nतथा शरीराणि विहाय जीर्णान्यन्यानि संयाति नवानि देही॥",
        "transliteration": "vāsāṁsi jīrṇāni yathā vihāya navāni gṛhṇāti naro 'parāṇi |\ntathā śarīrāṇi vihāya jīrṇāny anyāni saṁyāti navāni dehī ||",
        "translation": "As a person casts off worn-out clothes and puts on new ones, so the embodied self leaves a worn-out body and takes on a new one.",
        "themes": ["self knowledge", "impermanence", "death", "grief"],
        "keywords": ["renewal", "change", "body", "death", "letting go"],
        "applications": [
            "Some identities are worn out and safe to set down — an old role, an old story about your limits.",
        ],
    },
    {
        "chapter": 2, "verse": 47,
        "sanskrit": "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥",
        "transliteration": "karmaṇy evādhikāras te mā phaleṣu kadācana |\nmā karma-phala-hetur bhūr mā te saṅgo 'stv akarmaṇi ||",
        "translation": "You have a right to your action, never to its fruits. Do not act driven only by the result, and do not become attached to inaction either.",
        "themes": ["detachment from results", "karma yoga", "duty", "effort"],
        "keywords": [
            "detachment", "results", "fruits", "outcome", "expectations", "effort",
            "action", "control", "anxiety about results", "attachment",
        ],
        "applications": [
            "Separate the part you control (today's effort) from the part you do not (the verdict). Plan only the first.",
            "When outcome anxiety stalls you, shrink the task until the next action is obviously doable.",
        ],
    },
    {
        "chapter": 2, "verse": 48,
        "sanskrit": "योगस्थः कुरु कर्माणि सङ्गं त्यक्त्वा धनञ्जय।\nसिद्ध्यसिद्ध्योः समो भूत्वा समत्वं योग उच्यते॥",
        "transliteration": "yoga-sthaḥ kuru karmāṇi saṅgaṁ tyaktvā dhanañjaya |\nsiddhy-asiddhyoḥ samo bhūtvā samatvaṁ yoga ucyate ||",
        "translation": "Steady in yoga, do your work, letting go of attachment. Be even-minded in success and in failure — that evenness is called yoga.",
        "themes": ["equanimity", "success and failure", "samatva", "detachment from results"],
        "keywords": ["equanimity", "samatva", "balance", "success", "failure", "steady", "even-minded"],
        "applications": [
            "Judge the week by whether you showed up as planned, not by whether the news was good.",
        ],
    },
    {
        "chapter": 2, "verse": 56,
        "sanskrit": "दुःखेष्वनुद्विग्नमनाः सुखेषु विगतस्पृहः।\nवीतरागभयक्रोधः स्थितधीर्मुनिरुच्यते॥",
        "transliteration": "duḥkheṣv anudvigna-manāḥ sukheṣu vigata-spṛhaḥ |\nvīta-rāga-bhaya-krodhaḥ sthita-dhīr munir ucyate ||",
        "translation": "One whose mind is unshaken in sorrow and who does not crave in pleasure, who is free from clinging, fear and anger — such a one is called steady in wisdom.",
        "themes": ["equanimity", "fear", "anger", "steadiness"],
        "keywords": ["fear", "anger", "craving", "steady", "unshaken", "calm", "anxiety"],
        "applications": [
            "Fear shrinks when you name the specific thing you are afraid of and the smallest step you can still take.",
        ],
    },
    {
        "chapter": 2, "verse": 62,
        "sanskrit": "ध्यायतो विषयान्पुंसः सङ्गस्तेषूपजायते।\nसङ्गात्सञ्जायते कामः कामात्क्रोधोऽभिजायते॥",
        "transliteration": "dhyāyato viṣayān puṁsaḥ saṅgas teṣūpajāyate |\nsaṅgāt sañjāyate kāmaḥ kāmāt krodho 'bhijāyate ||",
        "translation": "Dwelling on objects of the senses breeds attachment to them. From attachment desire is born, and from desire, anger.",
        "themes": ["desire", "anger", "attachment", "mind control"],
        "keywords": ["desire", "craving", "anger", "attachment", "rumination", "distraction"],
        "applications": [
            "Notice the chain: replaying something → wanting it → anger when it is withheld. Interrupt it at the replay.",
        ],
    },
    {
        "chapter": 2, "verse": 63,
        "sanskrit": "क्रोधाद्भवति सम्मोहः सम्मोहात्स्मृतिविभ्रमः।\nस्मृतिभ्रंशाद्बुद्धिनाशो बुद्धिनाशात्प्रणश्यति॥",
        "transliteration": "krodhād bhavati sammohaḥ sammohāt smṛti-vibhramaḥ |\nsmṛti-bhraṁśād buddhi-nāśo buddhi-nāśāt praṇaśyati ||",
        "translation": "From anger comes confusion; from confusion, loss of memory; from lost memory, the ruin of discernment; and with discernment ruined, one is lost.",
        "themes": ["anger", "mind control", "discernment"],
        "keywords": ["anger", "rage", "confusion", "judgement", "discernment", "reacting"],
        "applications": [
            "Do not decide anything important while angry. Discernment is the first thing anger takes.",
        ],
    },
    {
        "chapter": 2, "verse": 70,
        "sanskrit": "आपूर्यमाणमचलप्रतिष्ठं समुद्रमापः प्रविशन्ति यद्वत्।\nतद्वत्कामा यं प्रविशन्ति सर्वे स शान्तिमाप्नोति न कामकामी॥",
        "transliteration": "āpūryamāṇam acala-pratiṣṭhaṁ samudram āpaḥ praviśanti yadvat |\ntadvat kāmā yaṁ praviśanti sarve sa śāntim āpnoti na kāma-kāmī ||",
        "translation": "As rivers flow into the ocean, which stays full and unmoved, so desires enter the one who is settled. Such a person finds peace — not the one who chases desire.",
        "themes": ["desire", "peace", "equanimity"],
        "keywords": ["peace", "desire", "contentment", "calm", "settled"],
        "applications": [
            "Wanting things is not the problem. Being moved by every want is.",
        ],
    },
    {
        "chapter": 2, "verse": 71,
        "sanskrit": "विहाय कामान्यः सर्वान्पुमांश्चरति निःस्पृहः।\nनिर्ममो निरहङ्कारः स शान्तिमधिगच्छति॥",
        "transliteration": "vihāya kāmān yaḥ sarvān pumāṁś carati niḥspṛhaḥ |\nnirmamo nirahaṅkāraḥ sa śāntim adhigacchati ||",
        "translation": "The one who moves through life having let go of craving, free of possessiveness and of ego, attains peace.",
        "themes": ["peace", "desire", "ego", "detachment from results"],
        "keywords": ["peace", "ego", "letting go", "possessiveness", "craving"],
        "applications": [
            "Ask what part of this you are defending because it is yours rather than because it is right.",
        ],
    },
    {
        "chapter": 3, "verse": 8,
        "sanskrit": "नियतं कुरु कर्म त्वं कर्म ज्यायो ह्यकर्मणः।\nशरीरयात्रापि च ते न प्रसिध्येदकर्मणः॥",
        "transliteration": "niyataṁ kuru karma tvaṁ karma jyāyo hy akarmaṇaḥ |\nśarīra-yātrāpi ca te na prasidhyed akarmaṇaḥ ||",
        "translation": "Do the work that is yours to do. Action is better than inaction — even the body's journey cannot be carried on by doing nothing.",
        "themes": ["duty", "karma yoga", "procrastination", "action"],
        "keywords": ["procrastination", "action", "start", "inaction", "duty", "work", "stuck"],
        "applications": [
            "The way out of a stalled day is one small action, not a better plan.",
        ],
    },
    {
        "chapter": 3, "verse": 35,
        "sanskrit": "श्रेयान्स्वधर्मो विगुणः परधर्मात्स्वनुष्ठितात्।\nस्वधर्मे निधनं श्रेयः परधर्मो भयावहः॥",
        "transliteration": "śreyān sva-dharmo viguṇaḥ para-dharmāt sv-anuṣṭhitāt |\nsva-dharme nidhanaṁ śreyaḥ para-dharmo bhayāvahaḥ ||",
        "translation": "Better your own duty, even performed imperfectly, than another's duty performed well. It is better to fall doing your own work; another's path brings fear.",
        "themes": ["duty", "dharma", "comparison", "authenticity"],
        "keywords": ["comparison", "duty", "dharma", "own path", "envy", "jealousy", "someone else"],
        "applications": [
            "Comparison usually measures your worst day against someone's highlight. Return to your own next step.",
        ],
    },
    {
        "chapter": 3, "verse": 42,
        "sanskrit": "इन्द्रियाणि पराण्याहुरिन्द्रियेभ्यः परं मनः।\nमनसस्तु परा बुद्धिर्यो बुद्धेः परतस्तु सः॥",
        "transliteration": "indriyāṇi parāṇy āhur indriyebhyaḥ paraṁ manaḥ |\nmanasas tu parā buddhir yo buddheḥ paratas tu saḥ ||",
        "translation": "The senses are said to be higher than the body, the mind higher than the senses, discernment higher than the mind — and higher than discernment is the self.",
        "themes": ["mind control", "self knowledge"],
        "keywords": ["mind", "senses", "discernment", "buddhi", "hierarchy", "self"],
        "applications": [
            "An urge is not an instruction. There is a layer in you that gets to decide.",
        ],
    },
    {
        "chapter": 3, "verse": 43,
        "sanskrit": "एवं बुद्धेः परं बुद्ध्वा संस्तभ्यात्मानमात्मना।\nजहि शत्रुं महाबाहो कामरूपं दुरासदम्॥",
        "transliteration": "evaṁ buddheḥ paraṁ buddhvā saṁstabhyātmānam ātmanā |\njahi śatruṁ mahā-bāho kāma-rūpaṁ durāsadam ||",
        "translation": "Knowing the self to be higher than discernment, steady yourself by your own self, and conquer this hard-to-conquer enemy that takes the form of craving.",
        "themes": ["mind control", "desire", "discipline", "courage"],
        "keywords": ["discipline", "craving", "self-control", "courage", "willpower"],
        "applications": [
            "Steadiness is built by keeping small promises to yourself, not by winning one big fight.",
        ],
    },
    {
        "chapter": 4, "verse": 7,
        "sanskrit": "यदा यदा हि धर्मस्य ग्लानिर्भवति भारत।\nअभ्युत्थानमधर्मस्य तदात्मानं सृजाम्यहम्॥",
        "transliteration": "yadā yadā hi dharmasya glānir bhavati bhārata |\nabhyutthānam adharmasya tadātmānaṁ sṛjāmy aham ||",
        "translation": "Whenever righteousness declines and unrighteousness rises, I bring myself forth.",
        "themes": ["dharma", "renewal"],
        "keywords": ["dharma", "righteousness", "renewal", "avatar"],
        "applications": [
            "When standards slip, something has to be deliberately re-established. That usually starts with one person.",
        ],
    },
    {
        "chapter": 4, "verse": 8,
        "sanskrit": "परित्राणाय साधूनां विनाशाय च दुष्कृताम्।\nधर्मसंस्थापनार्थाय सम्भवामि युगे युगे॥",
        "transliteration": "paritrāṇāya sādhūnāṁ vināśāya ca duṣkṛtām |\ndharma-saṁsthāpanārthāya sambhavāmi yuge yuge ||",
        "translation": "To protect the good, to end wrongdoing, and to firmly re-establish righteousness, I come into being age after age.",
        "themes": ["dharma", "protection"],
        "keywords": ["dharma", "protection", "justice", "yuga"],
        "applications": [],
    },
    {
        "chapter": 4, "verse": 34,
        "sanskrit": "तद्विद्धि प्रणिपातेन परिप्रश्नेन सेवया।\nउपदेक्ष्यन्ति ते ज्ञानं ज्ञानिनस्तत्त्वदर्शिनः॥",
        "transliteration": "tad viddhi praṇipātena paripraśnena sevayā |\nupadekṣyanti te jñānaṁ jñāninas tattva-darśinaḥ ||",
        "translation": "Come to know this through humility, through sincere questioning, and through service. Those who see the truth will teach you.",
        "themes": ["learning", "humility", "self knowledge"],
        "keywords": ["learning", "study", "questions", "humility", "teacher", "mentor"],
        "applications": [
            "Asking a precise question is faster than pretending to already know. Write the question down first.",
        ],
    },
    {
        "chapter": 6, "verse": 5,
        "sanskrit": "उद्धरेदात्मनात्मानं नात्मानमवसादयेत्।\nआत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः॥",
        "transliteration": "uddhared ātmanātmānaṁ nātmānam avasādayet |\nātmaiva hy ātmano bandhur ātmaiva ripur ātmanaḥ ||",
        "translation": "Lift yourself up by your own self; do not drag yourself down. For the self alone is your friend, and the self alone your enemy.",
        "themes": ["self discipline", "motivation", "mind control"],
        "keywords": ["motivation", "self-talk", "discipline", "self-worth", "friend", "enemy", "failure"],
        "applications": [
            "The voice that calls you lazy is not helping you work. Speak to yourself the way you would to a friend who is behind schedule.",
        ],
    },
    {
        "chapter": 6, "verse": 6,
        "sanskrit": "बन्धुरात्मात्मनस्तस्य येनात्मैवात्मना जितः।\nअनात्मनस्तु शत्रुत्वे वर्तेतात्मैव शत्रुवत्॥",
        "transliteration": "bandhur ātmātmanas tasya yenātmaivātmanā jitaḥ |\nanātmanas tu śatrutve vartetātmaiva śatru-vat ||",
        "translation": "For the one who has mastered the self, the self is a friend. For the one who has not, the self behaves like an enemy.",
        "themes": ["self discipline", "mind control"],
        "keywords": ["self-mastery", "discipline", "habits", "self-sabotage"],
        "applications": [],
    },
    {
        "chapter": 6, "verse": 17,
        "sanskrit": "युक्ताहारविहारस्य युक्तचेष्टस्य कर्मसु।\nयुक्तस्वप्नावबोधस्य योगो भवति दुःखहा॥",
        "transliteration": "yuktāhāra-vihārasya yukta-ceṣṭasya karmasu |\nyukta-svapnāvabodhasya yogo bhavati duḥkha-hā ||",
        "translation": "For one who is measured in eating and recreation, measured in activity, and regulated in sleep and waking, yoga becomes the remover of sorrow.",
        "themes": ["discipline", "balance", "habits", "meditation"],
        "keywords": ["routine", "sleep", "balance", "habits", "burnout", "rest", "moderation"],
        "applications": [
            "Before adding discipline, check sleep, food and rest. Most 'motivation problems' are recovery problems.",
        ],
    },
    {
        "chapter": 6, "verse": 19,
        "sanskrit": "यथा दीपो निवातस्थो नेङ्गते सोपमा स्मृता।\nयोगिनो यतचित्तस्य युञ्जतो योगमात्मनः॥",
        "transliteration": "yathā dīpo nivāta-stho neṅgate sopamā smṛtā |\nyogino yata-cittasya yuñjato yogam ātmanaḥ ||",
        "translation": "As a lamp in a windless place does not flicker — that is the image given for the one whose mind is gathered and who is absorbed in the yoga of the self.",
        "themes": ["meditation", "focus", "mind control"],
        "keywords": ["focus", "concentration", "meditation", "distraction", "steady", "lamp"],
        "applications": [
            "Remove the wind before blaming the flame: close the tabs, silence the phone, then start the timer.",
        ],
    },
    {
        "chapter": 6, "verse": 35,
        "sanskrit": "असंशयं महाबाहो मनो दुर्निग्रहं चलम्।\nअभ्यासेन तु कौन्तेय वैराग्येण च गृह्यते॥",
        "transliteration": "asaṁśayaṁ mahā-bāho mano durnigrahaṁ calam |\nabhyāsena tu kaunteya vairāgyeṇa ca gṛhyate ||",
        "translation": "Without doubt the mind is restless and hard to hold. But it can be held through steady practice and through non-attachment.",
        "themes": ["mind control", "discipline", "meditation", "habits"],
        "keywords": ["restless", "distraction", "practice", "abhyasa", "vairagya", "habits", "consistency"],
        "applications": [
            "A restless mind is normal, not a personal defect. It answers to repetition, not to scolding.",
        ],
    },
    {
        "chapter": 7, "verse": 14,
        "sanskrit": "दैवी ह्येषा गुणमयी मम माया दुरत्यया।\nमामेव ये प्रपद्यन्ते मायामेतां तरन्ति ते॥",
        "transliteration": "daivī hy eṣā guṇa-mayī mama māyā duratyayā |\nmām eva ye prapadyante māyām etāṁ taranti te ||",
        "translation": "This divine appearance of mine, woven of the guṇas, is hard to cross over. Those who take refuge in me alone cross beyond it.",
        "themes": ["devotion", "surrender"],
        "keywords": ["surrender", "refuge", "maya", "illusion", "devotion"],
        "applications": [],
    },
    {
        "chapter": 9, "verse": 22,
        "sanskrit": "अनन्याश्चिन्तयन्तो मां ये जनाः पर्युपासते।\nतेषां नित्याभियुक्तानां योगक्षेमं वहाम्यहम्॥",
        "transliteration": "ananyāś cintayanto māṁ ye janāḥ paryupāsate |\nteṣāṁ nityābhiyuktānāṁ yoga-kṣemaṁ vahāmy aham ||",
        "translation": "For those who think of me with undivided heart and stay constantly devoted, I carry the weight of their well-being.",
        "themes": ["devotion", "trust", "surrender"],
        "keywords": ["devotion", "trust", "bhakti", "support", "care", "faith"],
        "applications": [],
    },
    {
        "chapter": 9, "verse": 26,
        "sanskrit": "पत्रं पुष्पं फलं तोयं यो मे भक्त्या प्रयच्छति।\nतदहं भक्त्युपहृतमश्नामि प्रयतात्मनः॥",
        "transliteration": "patraṁ puṣpaṁ phalaṁ toyaṁ yo me bhaktyā prayacchati |\ntad ahaṁ bhakty-upahṛtam aśnāmi prayatātmanaḥ ||",
        "translation": "Whoever offers me a leaf, a flower, a fruit or water with devotion — that offering, given with a sincere heart, I accept.",
        "themes": ["devotion", "simplicity"],
        "keywords": ["devotion", "bhakti", "offering", "simple", "sincerity"],
        "applications": [
            "A small sincere effort counts. You do not need an impressive version of today to begin.",
        ],
    },
    {
        "chapter": 12, "verse": 13,
        "sanskrit": "अद्वेष्टा सर्वभूतानां मैत्रः करुण एव च।\nनिर्ममो निरहङ्कारः समदुःखसुखः क्षमी॥",
        "transliteration": "adveṣṭā sarva-bhūtānāṁ maitraḥ karuṇa eva ca |\nnirmamo nirahaṅkāraḥ sama-duḥkha-sukhaḥ kṣamī ||",
        "translation": "Free of hatred toward any being, friendly and compassionate, without possessiveness or ego, the same in sorrow and joy, forgiving —",
        "themes": ["compassion", "forgiveness", "equanimity"],
        "keywords": ["compassion", "karuna", "forgiveness", "kshama", "kindness", "equanimity"],
        "applications": [
            "Forgiveness here includes yourself. A missed day is a data point, not a character verdict.",
        ],
    },
    {
        "chapter": 12, "verse": 14,
        "sanskrit": "सन्तुष्टः सततं योगी यतात्मा दृढनिश्चयः।\nमय्यर्पितमनोबुद्धिर्यो मद्भक्तः स मे प्रियः॥",
        "transliteration": "santuṣṭaḥ satataṁ yogī yatātmā dṛḍha-niścayaḥ |\nmayy arpita-mano-buddhir yo mad-bhaktaḥ sa me priyaḥ ||",
        "translation": "— ever content, self-restrained, firm in resolve, with mind and discernment offered to me: such a devotee is dear to me.",
        "themes": ["devotion", "contentment", "discipline"],
        "keywords": ["contentment", "resolve", "sankalpa", "devotion", "discipline", "steady"],
        "applications": [],
    },
    {
        "chapter": 12, "verse": 15,
        "sanskrit": "यस्मान्नोद्विजते लोको लोकान्नोद्विजते च यः।\nहर्षामर्षभयोद्वेगैर्मुक्तो यः स च मे प्रियः॥",
        "transliteration": "yasmān nodvijate loko lokān nodvijate ca yaḥ |\nharṣāmarṣa-bhayodvegair mukto yaḥ sa ca me priyaḥ ||",
        "translation": "The one by whom the world is not disturbed, and who is not disturbed by the world, free from elation, resentment, fear and agitation — such a one is dear to me.",
        "themes": ["fear", "equanimity", "peace"],
        "keywords": ["fear", "anxiety", "agitation", "resentment", "calm", "unbothered"],
        "applications": [
            "You are allowed to feel the fear and still take the step. Waiting for calm is not a plan.",
        ],
    },
    {
        "chapter": 18, "verse": 47,
        "sanskrit": "श्रेयान्स्वधर्मो विगुणः परधर्मात्स्वनुष्ठितात्।\nस्वभावनियतं कर्म कुर्वन्नाप्नोति किल्बिषम्॥",
        "transliteration": "śreyān sva-dharmo viguṇaḥ para-dharmāt sv-anuṣṭhitāt |\nsvabhāva-niyataṁ karma kurvan nāpnoti kilbiṣam ||",
        "translation": "Better your own duty imperfectly done than another's duty done well. Doing the work that suits your own nature, you take on no fault.",
        "themes": ["duty", "comparison", "dharma", "authenticity"],
        "keywords": ["comparison", "own path", "duty", "nature", "svadharma", "career"],
        "applications": [
            "Fit matters more than prestige. Ask which work you can sustain, not which looks best.",
        ],
    },
    {
        "chapter": 18, "verse": 66,
        "sanskrit": "सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज।\nअहं त्वां सर्वपापेभ्यो मोक्षयिष्यामि मा शुचः॥",
        "transliteration": "sarva-dharmān parityajya mām ekaṁ śaraṇaṁ vraja |\nahaṁ tvāṁ sarva-pāpebhyo mokṣayiṣyāmi mā śucaḥ ||",
        "translation": "Setting aside all other obligations, come to me alone for refuge. I will free you from all wrongs — do not grieve.",
        "themes": ["surrender", "devotion", "grief"],
        "keywords": ["surrender", "refuge", "grief", "guilt", "forgiveness", "let go"],
        "applications": [
            "When guilt has become its own project, put it down. Carrying it is not the same as repairing it.",
        ],
    },
    {
        "chapter": 18, "verse": 78,
        "sanskrit": "यत्र योगेश्वरः कृष्णो यत्र पार्थो धनुर्धरः।\nतत्र श्रीर्विजयो भूतिर्ध्रुवा नीतिर्मतिर्मम॥",
        "transliteration": "yatra yogeśvaraḥ kṛṣṇo yatra pārtho dhanur-dharaḥ |\ntatra śrīr vijayo bhūtir dhruvā nītir matir mama ||",
        "translation": "Wherever Krishna, the master of yoga, is present, and wherever Arjuna the archer stands — there will be fortune, victory, well-being and steady right conduct. This is my conviction.",
        "themes": ["victory", "faith", "partnership"],
        "keywords": ["victory", "faith", "together", "conviction", "partnership"],
        "applications": [
            "Wisdom plus someone willing to actually pick up the bow. Both halves are needed.",
        ],
    },
]
