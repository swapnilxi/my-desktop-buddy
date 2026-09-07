/**
 * Gita Verse Context — pure state-transition helpers.
 *
 * Attaching a verse is always an explicit user action (Add to Chat Context);
 * nothing here ever silently pulls a verse into a conversation. Capped at
 * MAX_GITA_CONTEXT so a user browsing many verses can't accidentally flood
 * every future turn with unrelated scripture.
 */
export interface GitaContextRef {
  chapter: number;
  verse: number;
  /** Precomputed "chapter.verse" for display, e.g. "2.47". */
  reference: string;
}

export const MAX_GITA_CONTEXT = 5;

export function addGitaContext(
  current: GitaContextRef[],
  chapter: number,
  verse: number,
): GitaContextRef[] {
  if (current.some((r) => r.chapter === chapter && r.verse === verse)) return current;
  if (current.length >= MAX_GITA_CONTEXT) return current;
  return [...current, { chapter, verse, reference: `${chapter}.${verse}` }];
}

export function removeGitaContext(
  current: GitaContextRef[],
  chapter: number,
  verse: number,
): GitaContextRef[] {
  return current.filter((r) => !(r.chapter === chapter && r.verse === verse));
}
