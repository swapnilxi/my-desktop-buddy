// Fixed 30-day executive speech program. Same sequence for every user.
// Pure data — no UI or framework imports — so it can be consumed by the
// Today / Program / Progress / History views and by the backend scorer.

export type FocusParam =
  | 'pace'
  | 'fillers'
  | 'hedging'
  | 'passive'
  | 'runOn'
  | 'pitch'
  | 'pitchVariation'
  | 'upspeak'
  | 'resonance'
  | 'hnr'
  | 'jitterShimmer'
  | 'vocalFry'
  | 'energy'
  | 'sentenceEndDrop'
  | 'sentiment'
  | 'intent'; // Deepgram (cloud) mode only

export interface SpeechDay {
  day: number;
  week: 1 | 2 | 3 | 4;
  title: string;
  objective: string;
  /** What to speak about and how. Shown on the Today view. */
  prompt: string;
  /** Plain-language target, e.g. "Today: eliminate filler words + improve pace". */
  focusLabel: string;
  focus: FocusParam[];
  /** Estimated session length, 2–5 minutes. */
  durationMins: 2 | 3 | 4 | 5;
  /** A single pass/fail style goal the feedback card can check against. */
  successCriteria: string;
  /** True on days 7, 14, 21, 28 — a weekly summary is generated after the session. */
  weeklySummary?: boolean;
}

export const WEEK_THEMES: Record<1 | 2 | 3 | 4, { title: string; summary: string }> = {
  1: { title: 'Foundations', summary: 'Breath, pace, and cutting filler words.' },
  2: { title: 'Voice & Resonance', summary: 'Pitch, chest voice, steady tone, and strong endings.' },
  3: { title: 'Language & Structure', summary: 'Drop hedging, speak actively, and get to the point.' },
  4: { title: 'Persuasion & Presence', summary: 'Emphasis, stories, pressure, and a full capstone.' },
};

export const SPEECH_PROGRAM: SpeechDay[] = [
  // ───────────── Week 1 — Foundations ─────────────
  {
    day: 1,
    week: 1,
    title: 'Baseline Recording',
    objective: 'Capture an honest starting point across every parameter.',
    prompt:
      'Introduce yourself and your current role as if to a new executive peer. Cover what you do, one recent win, and what you want from your next year. Speak naturally — do not try to perform.',
    focusLabel: 'Today: establish your baseline (no goals yet)',
    focus: ['pace', 'fillers', 'pitch', 'hnr', 'energy'],
    durationMins: 3,
    successCriteria: 'Complete the full 3 minutes. Every score today becomes your "before" benchmark.',
  },
  {
    day: 2,
    week: 1,
    title: 'Breathe Before You Speak',
    objective: 'Use a deliberate pause and breath to start each answer with control.',
    prompt:
      'Answer: "What is the most important priority for your team this quarter?" Before you speak, take a silent two-count breath. Then answer in four sentences, pausing a full beat between each.',
    focusLabel: 'Today: controlled breathing + intentional pauses',
    focus: ['pace', 'jitterShimmer', 'fillers'],
    durationMins: 2,
    successCriteria: 'Pace between 120–160 WPM and no filler word in your first sentence.',
  },
  {
    day: 3,
    week: 1,
    title: 'Silence Instead of "Um"',
    objective: 'Replace filler words with silent pauses.',
    prompt:
      'Explain how your product, team, or project works to someone who has never heard of it. Any time you feel an "um", "uh", "like", or "you know" coming, stop and stay silent for one second instead.',
    focusLabel: 'Today: eliminate filler words',
    focus: ['fillers', 'pace'],
    durationMins: 3,
    successCriteria: 'Filler words below 2% of total words.',
  },
  {
    day: 4,
    week: 1,
    title: 'Find Your Pace',
    objective: 'Settle into the 130–160 WPM executive range.',
    prompt:
      'Read aloud a recent update or email you wrote, then deliver the same content from memory in your own words. Aim to sound unhurried: short sentences, clear stops.',
    focusLabel: 'Today: hold a steady 130–160 WPM',
    focus: ['pace', 'runOn'],
    durationMins: 3,
    successCriteria: 'Pace between 130–160 WPM across the whole session.',
  },
  {
    day: 5,
    week: 1,
    title: 'One Idea, One Sentence',
    objective: 'Keep sentences short and complete.',
    prompt:
      'Describe a decision your organization faced recently. Rule: no sentence longer than about 20 words. Finish each thought, stop, and begin a fresh sentence for the next.',
    focusLabel: 'Today: shorter sentences, no run-ons',
    focus: ['runOn', 'pace', 'fillers'],
    durationMins: 3,
    successCriteria: 'Zero sentences over 35 words and fillers below 2%.',
  },
  {
    day: 6,
    week: 1,
    title: 'The 60-Second Update',
    objective: 'Deliver a complete update concisely.',
    prompt:
      'Give a status update on a project in exactly this order: where we are, what is blocking us, what I need from you. Aim for about 60–90 seconds; record the full 2 minutes if you can and repeat with a tighter version.',
    focusLabel: 'Today: structure + pace',
    focus: ['pace', 'fillers', 'runOn'],
    durationMins: 2,
    successCriteria: 'Three clearly separated parts, pace 130–160 WPM, fillers below 2%.',
  },
  {
    day: 7,
    week: 1,
    title: 'Week 1 Review Session',
    objective: 'Combine breath, pace, and clean language in one performance.',
    prompt:
      'Pitch a new idea to your leadership team: the problem, your proposal, and the first step. Use pauses instead of fillers and keep every sentence short.',
    focusLabel: 'Today: pace + fillers + sentence length combined',
    focus: ['pace', 'fillers', 'runOn'],
    durationMins: 4,
    successCriteria: 'Beat your Day 1 baseline on WPM consistency and filler rate.',
    weeklySummary: true,
  },

  // ───────────── Week 2 — Voice & Resonance ─────────────
  {
    day: 8,
    week: 2,
    title: 'Lower Your Pitch',
    objective: 'Bring your baseline pitch toward the authoritative 85–180 Hz range.',
    prompt:
      'Hum gently for 20 seconds on a comfortable low note, then speak straight from that hum: "Good morning. Let me walk you through where we stand." Then give a 2-minute briefing on any topic, keeping that lower register.',
    focusLabel: 'Today: lower your baseline pitch (F0)',
    focus: ['pitch', 'resonance', 'hnr'],
    durationMins: 3,
    successCriteria: 'Average F0 inside 85–180 Hz, with no strain.',
  },
  {
    day: 9,
    week: 2,
    title: 'Chest Voice',
    objective: 'Build warmer, fuller chest resonance.',
    prompt:
      'Place a hand on your chest and feel it vibrate as you speak. Read a short paragraph of your own writing slowly, then tell the story of a time you led through a difficult moment.',
    focusLabel: 'Today: chest resonance (low F1/F2)',
    focus: ['resonance', 'pitch', 'hnr'],
    durationMins: 3,
    successCriteria: 'Chest Voice Score of medium or high.',
  },
  {
    day: 10,
    week: 2,
    title: 'End Statements Down',
    objective: 'Stop upspeak: finish statements with falling pitch.',
    prompt:
      'Make ten declarative statements about your work, e.g. "We shipped the release on Tuesday." Let your pitch fall on the final word of each. Then deliver a 1-minute summary of your role, ending each sentence firmly.',
    focusLabel: 'Today: zero upspeak',
    focus: ['upspeak', 'pitch'],
    durationMins: 3,
    successCriteria: 'Zero upspeak instances flagged.',
  },
  {
    day: 11,
    week: 2,
    title: 'Finish Strong',
    objective: 'Keep energy up through the last word of every sentence.',
    prompt:
      'Explain your top three priorities. On the final word of every sentence, hold your volume rather than letting it fade. Imagine speaking to someone at the far end of a boardroom table.',
    focusLabel: 'Today: no trailing off at sentence ends',
    focus: ['sentenceEndDrop', 'energy', 'upspeak'],
    durationMins: 3,
    successCriteria: 'Fewer than 2 sentence-end energy drops.',
  },
  {
    day: 12,
    week: 2,
    title: 'Steady Voice Under Pressure',
    objective: 'Reduce shakiness and breathiness for a cleaner, firmer tone.',
    prompt:
      'Speak on a topic you feel mildly nervous about, such as asking for budget or giving critical feedback. Breathe low into your belly, support each sentence with air, and keep your tone even.',
    focusLabel: 'Today: voice quality — HNR, jitter, shimmer',
    focus: ['hnr', 'jitterShimmer', 'vocalFry'],
    durationMins: 3,
    successCriteria: 'HNR above 20 dB, jitter below 1%, shimmer below 3 dB.',
  },
  {
    day: 13,
    week: 2,
    title: 'Vary Your Pitch',
    objective: 'Be dynamic without becoming erratic.',
    prompt:
      'Tell a short story about a project that went from risky to successful. Let your pitch rise gently on points of interest and drop on conclusions. Avoid both flat reading and sing-song delivery.',
    focusLabel: 'Today: moderate pitch variation',
    focus: ['pitchVariation', 'energy', 'sentiment'],
    durationMins: 3,
    successCriteria: 'Pitch variation in the moderate band — neither monotone nor erratic.',
  },
  {
    day: 14,
    week: 2,
    title: 'Week 2 Review Session',
    objective: 'Bring pitch, resonance, and strong endings together.',
    prompt:
      'Deliver a 3-minute briefing to your board on a recent result and what it means. Low and steady pitch, chest resonance, falling endings, and full volume to the end of every sentence.',
    focusLabel: 'Today: pitch + resonance + upspeak + endings',
    focus: ['pitch', 'resonance', 'upspeak', 'sentenceEndDrop'],
    durationMins: 4,
    successCriteria: 'Authority Score improves over your Day 7 session.',
    weeklySummary: true,
  },

  // ───────────── Week 3 — Language & Structure ─────────────
  {
    day: 15,
    week: 3,
    title: 'Cut the Hedges',
    objective: 'Remove "I think", "maybe", "kind of", "sort of", and "probably".',
    prompt:
      'Give your recommendation on a decision you are facing. State it plainly. Replace "I think we should" with "I recommend", and "maybe we could" with "we will". Every hedge you catch, restate it directly.',
    focusLabel: 'Today: eliminate hedging language',
    focus: ['hedging', 'fillers'],
    durationMins: 3,
    successCriteria: 'Hedging below 5% of sentences.',
  },
  {
    day: 16,
    week: 3,
    title: 'Commit to a Position',
    objective: 'Sound decisive when you make a call.',
    prompt:
      'Pick a side on a debatable work question (e.g. "build vs. buy"). Open with your conclusion in one sentence, then give two reasons. Do not open with "I think" and do not offer a way out.',
    focusLabel: 'Today: assertive language',
    focus: ['hedging', 'sentiment', 'intent'],
    durationMins: 3,
    successCriteria: 'Conclusion in the first sentence and zero hedges.',
  },
  {
    day: 17,
    week: 3,
    title: 'Active Voice',
    objective: 'Say who does what.',
    prompt:
      'Describe three things that happened on a recent project. Use active voice only: "We delivered the report", not "The report was delivered". Name the actor in every sentence.',
    focusLabel: 'Today: active voice above 70%',
    focus: ['passive', 'runOn'],
    durationMins: 3,
    successCriteria: 'Passive voice below 30% of sentences.',
  },
  {
    day: 18,
    week: 3,
    title: 'Answer First (Bottom Line Up Front)',
    objective: 'Lead with the answer, then support it.',
    prompt:
      'You are asked "Where does the launch stand?" Open with the bottom line in one sentence ("We are on track" or "We are two weeks behind"), then give two supporting facts and a next step.',
    focusLabel: 'Today: concise, answer-first structure',
    focus: ['runOn', 'fillers', 'pace'],
    durationMins: 2,
    successCriteria: 'Bottom line within the first 10 seconds.',
  },
  {
    day: 19,
    week: 3,
    title: 'The Rule of Three',
    objective: 'Organize any message into three clear points.',
    prompt:
      'Explain why your team deserves investment. Announce it up front: "I have three points." Deliver each in two sentences, with a clear pause between them, and close with a one-line summary.',
    focusLabel: 'Today: structured delivery',
    focus: ['pace', 'runOn', 'fillers'],
    durationMins: 3,
    successCriteria: 'Three distinct points, fillers below 2%.',
  },
  {
    day: 20,
    week: 3,
    title: 'Say It in Half the Words',
    objective: 'Practice ruthless concision.',
    prompt:
      'Record a 90-second explanation of a complex topic from your work. Then record it again in 45 seconds without losing the key message. Keep the second take.',
    focusLabel: 'Today: concision',
    focus: ['runOn', 'fillers', 'passive'],
    durationMins: 3,
    successCriteria: 'Second take is at least 30% shorter with the same key points.',
  },
  {
    day: 21,
    week: 3,
    title: 'Week 3 Review Session',
    objective: 'Deliver a clean, confident, structured message end to end.',
    prompt:
      'Present a recommendation to a skeptical executive. Lead with the answer, give three reasons, use active voice, and make no hedges. Keep sentences short and pauses deliberate.',
    focusLabel: 'Today: hedging + passive voice + structure',
    focus: ['hedging', 'passive', 'runOn', 'fillers'],
    durationMins: 4,
    successCriteria: 'Confidence and Clarity scores improve over Day 14.',
    weeklySummary: true,
  },

  // ───────────── Week 4 — Persuasion & Presence ─────────────
  {
    day: 22,
    week: 4,
    title: 'Punch the Key Words',
    objective: 'Use volume and emphasis on the words that matter.',
    prompt:
      'Deliver a short pitch with 3–5 key numbers or phrases. Emphasize each with a small volume lift and a brief pause before it: "We will grow revenue — by thirty percent."',
    focusLabel: 'Today: energy variance and emphasis',
    focus: ['energy', 'pitchVariation', 'pace'],
    durationMins: 3,
    successCriteria: 'Clear energy peaks on key words with no sentence-end drops.',
  },
  {
    day: 23,
    week: 4,
    title: 'Tell a Story That Persuades',
    objective: 'Use a short narrative to make a point memorable.',
    prompt:
      'Tell a 2-minute story with this shape: a challenge, what you did, the result, and the lesson. Make it relevant to a decision you want your audience to make.',
    focusLabel: 'Today: persuasive storytelling with warmth',
    focus: ['sentiment', 'pitchVariation', 'intent'],
    durationMins: 4,
    successCriteria: 'Warm and engaging tone that still reads as confident.',
  },
  {
    day: 24,
    week: 4,
    title: 'Handle a Hard Question',
    objective: 'Stay calm, direct, and concise when challenged.',
    prompt:
      'Imagine a board member asks: "Why should we trust these numbers?" Pause, acknowledge in one sentence, answer directly, and offer evidence. Do not get defensive and do not over-explain.',
    focusLabel: 'Today: composure under challenge',
    focus: ['jitterShimmer', 'hedging', 'sentiment', 'pace'],
    durationMins: 3,
    successCriteria: 'Even tone, no hedges, answer under 60 seconds.',
  },
  {
    day: 25,
    week: 4,
    title: 'Deliver Bad News',
    objective: 'Be honest, steady, and constructive.',
    prompt:
      'Tell your team a project will miss its deadline. State the fact plainly, explain the cause without blame, and present the new plan. Lead with what you can do, not what went wrong.',
    focusLabel: 'Today: guarded to constructive tone',
    focus: ['sentiment', 'pitch', 'sentenceEndDrop', 'hedging'],
    durationMins: 4,
    successCriteria: 'Steady pitch, no trailing off, a clear next step.',
  },
  {
    day: 26,
    week: 4,
    title: 'Ask for What You Need',
    objective: 'Make a clear, confident request.',
    prompt:
      'Ask your executive sponsor for a specific resource: headcount, budget, or time. State the ask in the first sentence, give the business case, and end by repeating the ask. No apologies or softeners.',
    focusLabel: 'Today: persuasion and a firm close',
    focus: ['intent', 'hedging', 'upspeak', 'sentenceEndDrop'],
    durationMins: 3,
    successCriteria: 'Ask stated first and last, no upspeak, no softening language.',
  },
  {
    day: 27,
    week: 4,
    title: 'Impromptu Under Pressure',
    objective: 'Speak clearly with no preparation.',
    prompt:
      'Pick a random work topic (a recent meeting, a news item, a colleague\'s project). You have 10 seconds to think, then speak for 2 minutes using answer-first structure and pauses instead of fillers.',
    focusLabel: 'Today: spontaneous clarity',
    focus: ['fillers', 'pace', 'runOn', 'hedging'],
    durationMins: 3,
    successCriteria: 'Fillers below 2% and pace 130–160 WPM without preparation.',
  },
  {
    day: 28,
    week: 4,
    title: 'Week 4 Review Session',
    objective: 'Integrate persuasion, voice, and language in one presentation.',
    prompt:
      'Make the case for a bold initiative in 4 minutes: open with the answer, tell a short story, give three reasons, emphasize your key numbers, and close with a direct ask.',
    focusLabel: 'Today: persuasion + authority + clarity',
    focus: ['intent', 'energy', 'resonance', 'hedging', 'pace'],
    durationMins: 5,
    successCriteria: 'Executive Presence Score improves over Day 21.',
    weeklySummary: true,
  },
  {
    day: 29,
    week: 4,
    title: 'Polish Your Weakest Area',
    objective: 'Target the parameter that is still holding you back.',
    prompt:
      'Review your top three parameters still to improve from the Day 28 summary. Give a 3-minute talk on any work topic while concentrating on the single weakest one. Repeat the first minute if it slips.',
    focusLabel: 'Today: your personal weak spot',
    focus: ['pace', 'fillers', 'hedging', 'upspeak', 'pitch'],
    durationMins: 4,
    successCriteria: 'Your weakest parameter moves into its target range.',
  },
  {
    day: 30,
    week: 4,
    title: 'Final Capstone',
    objective: 'Show your full executive voice and compare it to Day 1.',
    prompt:
      'Repeat the Day 1 prompt: introduce yourself, a recent win, and what you want from the next year. This time use everything — pauses, low steady pitch, strong endings, no hedges, and a clear close. Then compare against your baseline.',
    focusLabel: 'Today: complete before-vs-after comparison',
    focus: ['pace', 'fillers', 'hedging', 'pitch', 'hnr', 'upspeak', 'energy', 'resonance'],
    durationMins: 5,
    successCriteria: 'Executive Presence Score 80+ or a clear improvement over Day 1.',
  },
];

export const TOTAL_DAYS = SPEECH_PROGRAM.length;

export const WEEKLY_SUMMARY_DAYS = SPEECH_PROGRAM.filter(d => d.weeklySummary).map(d => d.day);

export function getSpeechDay(day: number): SpeechDay | undefined {
  return SPEECH_PROGRAM.find(d => d.day === day);
}

/** A day is unlocked once every earlier day has been completed (linear progression). */
export function isDayUnlocked(day: number, completedDays: ReadonlySet<number> | readonly number[]): boolean {
  const done = completedDays instanceof Set ? completedDays : new Set(completedDays);
  for (let d = 1; d < day; d++) {
    if (!done.has(d)) return false;
  }
  return true;
}
