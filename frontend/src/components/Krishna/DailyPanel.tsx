'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchDaily } from '@/lib/api';
import type { DailyBundle } from '@/lib/api';
import { ProvenanceFooter } from './VerseCard';
import s from './krishna.panels.module.css';

type ViewState = 'loading' | 'ready' | 'empty' | 'error';

/**
 * Daily Gita + Word of the Day + Today's Teaching (Parts 9, 10, 11).
 *
 * Labelling is the point here. The verse and its translation are scripture
 * with a source; "Krishna's thought", the practical lesson and the teaching
 * are marked as interpretation or inspired-by, so nothing modern gets read as
 * a quotation.
 */
export default function DailyPanel() {
  const [state, setState] = useState<ViewState>('loading');
  const [bundle, setBundle] = useState<DailyBundle | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    setError(null);
    try {
      const data = await fetchDaily();
      setBundle(data);
      setState(data.verse.available ? 'ready' : 'empty');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load today’s Gita.');
      setState('error');
    }
  }, []);

  // Mount fetch is its own effect so the state updates land after the await.
  // Calling load() straight from the effect body sets state synchronously,
  // which triggers a cascading render.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchDaily();
        if (cancelled) return;
        setBundle(data);
        setState(data.verse.available ? 'ready' : 'empty');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load today\u2019s Gita.');
        setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (state === 'loading') {
    return (
      <div className={s.panel}>
        <div className={s.state}>
          <span className={s.spinner} />
          <span>Bringing today’s verse…</span>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className={s.panel}>
        <div className={s.stateError}>
          <span className={s.stateEmoji}>😕</span>
          <span>{error}</span>
          <button className={s.buttonGhost} onClick={load}>Try again</button>
        </div>
      </div>
    );
  }

  if (state === 'empty' || !bundle) {
    return (
      <div className={s.panel}>
        <div className={s.state}>
          <span className={s.stateEmoji}>📭</span>
          <span>
            {bundle?.verse.message ||
              'The Gita knowledge base is empty, so there is no verse to show yet.'}
          </span>
          <button className={s.buttonGhost} onClick={load}>Reload</button>
        </div>
      </div>
    );
  }

  const { verse, word, teaching } = bundle;

  return (
    <div className={s.panel}>
      <header className={s.header}>
        <div>
          <h2 className={s.title}>🌅 Today</h2>
          <p className={s.subtitle}>{bundle.day}</p>
        </div>
        <button className={s.buttonGhost} onClick={load}>↻ Refresh</button>
      </header>

      {/* ── Daily Gita (Part 9) ──────────────────────────────────── */}
      <article className={`${s.card} ${s.cardAccent}`}>
        <span className={s.reference}>
          📖 {verse.reference}
          {verse.chapter_name ? ` · ${verse.chapter_name}` : ''}
        </span>

        {verse.sanskrit && <p className={s.sanskrit}>{verse.sanskrit}</p>}
        {verse.transliteration && <p className={s.transliteration}>{verse.transliteration}</p>}
        {verse.translation && <p className={s.translation}>{verse.translation}</p>}

        {verse.theme && (
          <div className={s.chipRow}>
            <span className={s.chip}>{verse.theme}</span>
          </div>
        )}

        {verse.krishna_thought && (
          <>
            <hr className={s.divider} />
            <div className={s.memoryTop}>
              <p className={s.sectionLabel}>Today’s Krishna thought</p>
              <span className={`${s.badge} ${s.badgeInterpretation}`}>
                {verse.krishna_thought.label}
              </span>
            </div>
            <p className={s.translation}>{verse.krishna_thought.text}</p>
            <p className={s.memoryMeta}>{verse.krishna_thought.note}</p>
          </>
        )}

        {verse.practical_lesson &&
          verse.practical_lesson.text !== verse.krishna_thought?.text && (
            <>
              <hr className={s.divider} />
              <div className={s.memoryTop}>
                <p className={s.sectionLabel}>Practical lesson</p>
                <span className={`${s.badge} ${s.badgeInterpretation}`}>
                  {verse.practical_lesson.label}
                </span>
              </div>
              <p className={s.translation}>{verse.practical_lesson.text}</p>
            </>
          )}

        <ProvenanceFooter
          verified={Boolean(verse.verified)}
          sourceName={verse.translation_source}
          note={verse.provenance_note}
        />
      </article>

      {/* ── Word of the Day (Part 10) ────────────────────────────── */}
      <article className={s.card}>
        <p className={s.sectionLabel}>Krishna’s word of the day</p>
        <div className={s.wordHead}>
          <h3 className={s.wordName}>{word.word}</h3>
          <p className={s.devanagari}>{word.devanagari}</p>
          <span className={s.pronunciation}>/{word.pronunciation}/</span>
        </div>

        <p className={s.sectionLabel}>Meaning</p>
        <p className={s.translation}>{word.meaning}</p>

        <p className={s.sectionLabel}>In plain terms</p>
        <p className={s.translation}>{word.explanation}</p>

        {/* Only shown when the referenced verse is actually in the store. */}
        {word.gita_connection && (
          <>
            <p className={s.sectionLabel}>Gita connection</p>
            <span className={s.reference}>📖 {word.gita_connection.reference}</span>
            {word.gita_connection.translation && (
              <p className={s.translation}>{word.gita_connection.translation}</p>
            )}
          </>
        )}

        <hr className={s.divider} />
        <div className={s.memoryTop}>
          <p className={s.sectionLabel}>Today’s reminder</p>
          <span className={`${s.badge} ${s.badgeInterpretation}`}>
            {word.application.label}
          </span>
        </div>
        <p className={s.translation}>{word.application.text}</p>
      </article>

      {/* ── Today's Teaching (Part 11) ───────────────────────────── */}
      <article className={s.card}>
        <div className={s.memoryTop}>
          <p className={s.sectionLabel}>Today’s teaching</p>
          <span className={`${s.badge} ${s.badgeInterpretation}`}>{teaching.label}</span>
        </div>
        <p className={s.translation} style={{ fontSize: 'var(--text-lg)', lineHeight: 1.5 }}>
          {teaching.text}
        </p>
        <div className={s.chipRow}>
          <span className={s.chip}>{teaching.theme}</span>
        </div>
        {teaching.inspired_by && (
          <span className={s.reference}>📖 Inspired by {teaching.inspired_by.reference}</span>
        )}
        <p className={s.memoryMeta}>{teaching.note}</p>
      </article>
    </div>
  );
}
