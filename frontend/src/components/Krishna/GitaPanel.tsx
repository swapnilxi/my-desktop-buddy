'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchGitaChapters,
  fetchGitaSources,
  fetchGitaThemes,
  fetchGitaVerse,
  KrishnaApiError,
  searchGita,
} from '@/lib/api';
import type { GitaSearchResponse, GitaSources, GitaVerse } from '@/lib/api';
import { FullVerseCard, SearchResultCard } from './VerseCard';
import s from './krishna.panels.module.css';

type ViewState = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

const QUICK_THEMES = [
  'detachment from results', 'fear', 'anger', 'discipline', 'duty',
  'equanimity', 'grief', 'devotion', 'meditation', 'desire',
];

/**
 * Ask Gita — search the knowledge base and read a verse with its sources.
 *
 * Deliberate behaviour: an invalid reference ("Gita 20.10") is shown as an
 * explanation, and a valid-but-absent verse says so. Neither is dressed up as
 * a result, because the whole point of the engine is that it does not invent
 * scripture (Parts 6, 57).
 */
export default function GitaPanel() {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<ViewState>('idle');
  const [response, setResponse] = useState<GitaSearchResponse | null>(null);
  const [verse, setVerse] = useState<GitaVerse | null>(null);
  const [verseError, setVerseError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [themes, setThemes] = useState<string[]>([]);
  const [sources, setSources] = useState<GitaSources | null>(null);
  const [corpus, setCorpus] = useState<{ available: number; total: number } | null>(null);
  const [activeTheme, setActiveTheme] = useState<string | null>(null);

  // Load corpus metadata once so the panel can be honest about coverage.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [chapters, themeList, src] = await Promise.all([
          fetchGitaChapters(),
          fetchGitaThemes(),
          fetchGitaSources(),
        ]);
        if (cancelled) return;
        setCorpus({ available: chapters.verses_available, total: chapters.total_verses });
        setThemes(themeList.themes.slice(0, 12).map((t) => t.theme));
        setSources(src);
      } catch {
        /* metadata is a nicety — the panel still works without it */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const runSearch = useCallback(async (text: string, theme?: string) => {
    const trimmed = text.trim();
    if (!trimmed && !theme) return;

    setState('loading');
    setError(null);
    setVerse(null);
    setVerseError(null);
    setActiveTheme(theme ?? null);

    try {
      const res = await searchGita(trimmed, theme ? { theme, limit: 5 } : { limit: 5 });
      setResponse(res);
      setState(res.results.length > 0 ? 'ready' : 'empty');
    } catch (err) {
      setResponse(null);
      setError(
        err instanceof KrishnaApiError || err instanceof Error
          ? err.message
          : 'Could not reach the Gita knowledge base.',
      );
      setState('error');
    }
  }, []);

  const openVerse = useCallback(async (chapter: number, verseNum: number) => {
    setVerse(null);
    setVerseError(null);
    try {
      setVerse(await fetchGitaVerse(chapter, verseNum));
    } catch (err) {
      setVerseError(
        err instanceof Error ? err.message : `Could not load ${chapter}.${verseNum}.`,
      );
    }
  }, []);

  return (
    <div className={s.panel}>
      <header className={s.header}>
        <div>
          <h2 className={s.title}>📖 Ask the Gita</h2>
          <p className={s.subtitle}>
            {corpus
              ? `${corpus.available} of ${corpus.total} verses in the knowledge base`
              : 'Search by topic, feeling, or chapter.verse'}
          </p>
        </div>
      </header>

      {sources && sources.unverified_verses > 0 && (
        <div className={s.offlineBanner}>
          <span>⚠</span>
          <span>
            {sources.unverified_verses} verse{sources.unverified_verses === 1 ? '' : 's'} come from
            curated seed data and still need checking against a primary edition.
          </span>
        </div>
      )}

      <div className={s.searchRow}>
        <input
          className={s.input}
          placeholder="e.g. fear, karma yoga, or 2.47"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') runSearch(query);
          }}
          aria-label="Search the Bhagavad Gita"
        />
        <button
          className={s.button}
          onClick={() => runSearch(query)}
          disabled={state === 'loading' || !query.trim()}
        >
          {state === 'loading' ? '…' : 'Search'}
        </button>
      </div>

      <div className={s.chipRow}>
        {(themes.length > 0 ? themes : QUICK_THEMES).map((t) => (
          <button
            key={t}
            className={activeTheme === t ? s.chipActive : s.chip}
            onClick={() => { setQuery(''); runSearch('', t); }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── States (Part 61) ─────────────────────────────────────── */}
      {state === 'idle' && (
        <div className={s.state}>
          <span className={s.stateEmoji}>🪶</span>
          <span>
            Ask about a feeling, a situation, or a reference.
            <br />
            Every answer comes with its source.
          </span>
        </div>
      )}

      {state === 'loading' && (
        <div className={s.state}>
          <span className={s.spinner} />
          <span>Looking through the verses…</span>
        </div>
      )}

      {state === 'error' && (
        <div className={s.stateError}>
          <span className={s.stateEmoji}>😕</span>
          <span>{error}</span>
          <button className={s.buttonGhost} onClick={() => runSearch(query, activeTheme ?? undefined)}>
            Try again
          </button>
        </div>
      )}

      {/* An invalid reference is an explanation, never an empty result. */}
      {state === 'empty' && response?.invalid_reference && (
        <div className={s.card}>
          <span className={s.reference}>⚠ Not a valid reference</span>
          <p className={s.translation}>{response.message}</p>
          <p className={s.memoryMeta}>
            I won’t make up a verse for a reference that doesn’t exist.
          </p>
        </div>
      )}

      {state === 'empty' && !response?.invalid_reference && (
        <div className={s.state}>
          <span className={s.stateEmoji}>🤔</span>
          <span>{response?.message || 'Nothing in the knowledge base clearly matches that.'}</span>
        </div>
      )}

      {state === 'ready' && response && (
        <div className={s.resultList}>
          <p className={s.sectionLabel}>
            {response.total} match{response.total === 1 ? '' : 'es'}
            {response.total > response.results.length ? ` · showing ${response.results.length}` : ''}
          </p>
          {response.results.map((r) => (
            <SearchResultCard key={`${r.chapter}.${r.verse}`} result={r} onOpen={openVerse} />
          ))}
        </div>
      )}

      {verseError && (
        <div className={s.card}>
          <span className={s.reference}>⚠ Could not open that verse</span>
          <p className={s.translation}>{verseError}</p>
        </div>
      )}

      {verse && (
        <>
          <hr className={s.divider} />
          <p className={s.sectionLabel}>Full verse</p>
          <FullVerseCard verse={verse} />
        </>
      )}
    </div>
  );
}
