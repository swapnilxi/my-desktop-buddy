'use client';

import type { GitaSearchResult, GitaVerse } from '@/lib/api';
import s from './krishna.panels.module.css';

/**
 * One verse, rendered with scripture, translation, commentary and practical
 * application kept visually distinct (Parts 5, 6).
 *
 * The provenance footer is not decoration: while the corpus ships as
 * unverified seed data, the reader has to be able to see that.
 */
export function ProvenanceFooter({
  verified,
  sourceName,
  note,
}: {
  verified: boolean;
  sourceName?: string | null;
  note?: string | null;
}) {
  return (
    <div className={s.provenance}>
      <span className={verified ? `${s.badge} ${s.badgeVerified}` : `${s.badge} ${s.badgeUnverified}`}>
        {verified ? '✓ verified' : '⚠ unverified'}
      </span>
      <span>
        {sourceName ? `Source: ${sourceName}. ` : ''}
        {note ||
          (verified
            ? 'Text matches the imported edition on record.'
            : 'From the app’s curated seed data — not yet checked against a primary edition.')}
      </span>
    </div>
  );
}

export function SearchResultCard({
  result,
  onOpen,
}: {
  result: GitaSearchResult;
  onOpen?: (chapter: number, verse: number) => void;
}) {
  return (
    <article
      className={`${s.card} ${onOpen ? s.clickable : ''}`}
      onClick={onOpen ? () => onOpen(result.chapter, result.verse) : undefined}
    >
      <span className={s.reference}>📖 {result.reference}</span>
      {result.sanskrit && <p className={s.sanskrit}>{result.sanskrit}</p>}
      {result.transliteration && <p className={s.transliteration}>{result.transliteration}</p>}
      {result.translation && <p className={s.translation}>{result.translation}</p>}
      {result.themes.length > 0 && (
        <div className={s.chipRow}>
          {result.themes.slice(0, 4).map((t) => (
            <span key={t} className={s.chip}>{t}</span>
          ))}
        </div>
      )}
      <ProvenanceFooter verified={result.verified} sourceName={result.source_name} />
    </article>
  );
}

export function FullVerseCard({ verse }: { verse: GitaVerse }) {
  return (
    <article className={`${s.card} ${s.cardAccent}`}>
      <span className={s.reference}>
        📖 Bhagavad Gita {verse.chapter}.{verse.verse}
        {verse.chapter_name ? ` · ${verse.chapter_name}` : ''}
      </span>

      {verse.sanskrit && (
        <>
          <p className={s.sectionLabel}>Sanskrit</p>
          <p className={s.sanskrit}>{verse.sanskrit}</p>
        </>
      )}

      {verse.transliteration && (
        <p className={s.transliteration}>{verse.transliteration}</p>
      )}

      {/* Each translation carries its own source — never merged together. */}
      {verse.translations.length > 0 && (
        <>
          <hr className={s.divider} />
          <p className={s.sectionLabel}>
            {verse.translations.length > 1 ? 'Translations' : 'Translation'}
          </p>
          {verse.translations.map((t, i) => (
            <div key={`${t.source}-${i}`}>
              <p className={s.translation}>{t.text}</p>
              <p className={s.memoryMeta}>
                — {t.source_name || t.source}
                {t.verified ? '' : ' (unverified)'}
              </p>
            </div>
          ))}
          {verse.translations.length > 1 && (
            <p className={s.memoryMeta}>
              Different translators render this verse somewhat differently.
            </p>
          )}
        </>
      )}

      {/* Commentary is attributed or absent — it is never synthesised. */}
      {verse.commentaries.length > 0 && (
        <>
          <hr className={s.divider} />
          <p className={s.sectionLabel}>Commentary</p>
          {verse.commentaries.map((c, i) => (
            <div key={`${c.author}-${i}`}>
              <p className={s.translation}>{c.text}</p>
              <p className={s.memoryMeta}>— {c.author}</p>
            </div>
          ))}
          {verse.commentaries.length > 1 && (
            <p className={s.memoryMeta}>
              Different commentators interpret this verse somewhat differently.
            </p>
          )}
        </>
      )}

      {verse.practical_application.length > 0 && (
        <>
          <hr className={s.divider} />
          <div className={s.memoryTop}>
            <p className={s.sectionLabel}>For your day</p>
            <span className={`${s.badge} ${s.badgeInterpretation}`}>interpretation</span>
          </div>
          {verse.practical_application.map((a, i) => (
            <p key={i} className={s.translation}>{a.text}</p>
          ))}
          <p className={s.memoryMeta}>
            Written for this app — inspired by the verse, not a quotation from it.
          </p>
        </>
      )}

      {verse.themes.length > 0 && (
        <div className={s.chipRow}>
          {verse.themes.map((t) => (
            <span key={t} className={s.chip}>{t}</span>
          ))}
        </div>
      )}

      <ProvenanceFooter verified={verse.verified} sourceName={verse.source} />
    </article>
  );
}
