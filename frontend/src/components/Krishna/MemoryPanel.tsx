'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  deleteMemory,
  exportMemories,
  fetchMemories,
  forgetEverything,
  setMemoryPaused,
  updateMemory,
} from '@/lib/api';
import type { MemoryCategory, MemoryItem, MemoryListResponse } from '@/lib/api';
import s from './krishna.panels.module.css';

type ViewState = 'loading' | 'ready' | 'error';

/**
 * Memory controls (Part 28) — view, edit, delete, pause, forget everything,
 * and export.
 *
 * The user owns their memory, so every one of those controls is here rather
 * than buried, and destructive actions require a second confirming click.
 */
export default function MemoryPanel() {
  const [state, setState] = useState<ViewState>('loading');
  const [data, setData] = useState<MemoryListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<MemoryCategory | 'ALL'>('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [confirmForget, setConfirmForget] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setState('loading');
    setError(null);
    try {
      setData(await fetchMemories());
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your memories.');
      setState('error');
    }
  }, []);

  // Mount fetch kept separate from load() so every setState happens after
  // the await rather than synchronously inside the effect body.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fetched = await fetchMemories();
        if (cancelled) return;
        setData(fetched);
        setState('ready');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load your memories.');
        setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const togglePause = async () => {
    if (!data) return;
    setBusy(true);
    try {
      await setMemoryPaused(!data.memory_paused);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the pause setting.');
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (id: string) => {
    if (!draft.trim()) return;
    setBusy(true);
    try {
      await updateMemory(id, { value: draft.trim() });
      setEditingId(null);
      setDraft('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that edit.');
    } finally {
      setBusy(false);
    }
  };

  const removeOne = async (id: string) => {
    setBusy(true);
    try {
      await deleteMemory(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete that memory.');
    } finally {
      setBusy(false);
    }
  };

  const forgetAll = async () => {
    setBusy(true);
    try {
      await forgetEverything();
      setConfirmForget(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not clear your memories.');
    } finally {
      setBusy(false);
    }
  };

  /** Export via a blob download so the data never leaves the machine. */
  const doExport = async () => {
    setBusy(true);
    try {
      const payload = await exportMemories();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `krishna-memories-${payload.exported_at.slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export your memories.');
    } finally {
      setBusy(false);
    }
  };

  if (state === 'loading') {
    return (
      <div className={s.panel}>
        <div className={s.state}>
          <span className={s.spinner} />
          <span>Loading what I remember…</span>
        </div>
      </div>
    );
  }

  if (state === 'error' || !data) {
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

  const visible =
    filter === 'ALL' ? data.memories : data.memories.filter((m) => m.category === filter);
  const used = Array.from(new Set(data.memories.map((m) => m.category)));

  return (
    <div className={s.panel}>
      <header className={s.header}>
        <div>
          <h2 className={s.title}>🧠 What I remember</h2>
          <p className={s.subtitle}>
            {data.count} item{data.count === 1 ? '' : 's'} · you own all of it
          </p>
        </div>
        <button className={s.buttonGhost} onClick={load} disabled={busy}>↻ Refresh</button>
      </header>

      {error && (
        <div className={s.offlineBanner}>
          <span>⚠</span><span>{error}</span>
        </div>
      )}

      {/* ── Pause (Part 28) ──────────────────────────────────────── */}
      <div className={s.card}>
        <div className={s.rowBetween}>
          <label className={s.toggleLabel} htmlFor="memory-pause">
            <input
              id="memory-pause"
              type="checkbox"
              checked={data.memory_paused}
              onChange={togglePause}
              disabled={busy}
            />
            <span>
              <strong>Pause memory</strong>
              <br />
              <span className={s.memoryMeta}>
                While paused I store nothing new and use nothing stored.
              </span>
            </span>
          </label>
        </div>
      </div>

      {data.memory_paused && (
        <div className={s.offlineBanner}>
          <span>⏸</span>
          <span>Memory is paused. Existing items are kept but not used.</span>
        </div>
      )}

      {data.memories.length === 0 ? (
        <div className={s.state}>
          <span className={s.stateEmoji}>🌱</span>
          <span>
            Nothing stored yet.
            <br />
            I’ll ask before remembering anything.
          </span>
        </div>
      ) : (
        <>
          <div className={s.chipRow}>
            <button
              className={filter === 'ALL' ? s.chipActive : s.chip}
              onClick={() => setFilter('ALL')}
            >
              All ({data.memories.length})
            </button>
            {used.map((c) => (
              <button
                key={c}
                className={filter === c ? s.chipActive : s.chip}
                onClick={() => setFilter(c)}
              >
                {c.toLowerCase().replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <div className={s.resultList}>
            {visible.map((m: MemoryItem) => (
              <div key={m.id} className={s.memoryRow}>
                <div className={s.memoryTop}>
                  <span className={`${s.badge} ${s.badgeCategory}`}>
                    {m.category.toLowerCase().replace(/_/g, ' ')}
                  </span>
                  {m.sensitive && (
                    <span className={`${s.badge} ${s.badgeSensitive}`}>sensitive</span>
                  )}
                  <span className={s.memoryKey}>{m.key}</span>
                  <div className={s.memoryActions}>
                    {editingId === m.id ? (
                      <>
                        <button
                          className={s.buttonGhost}
                          onClick={() => saveEdit(m.id)}
                          disabled={busy || !draft.trim()}
                        >
                          Save
                        </button>
                        <button
                          className={s.buttonGhost}
                          onClick={() => { setEditingId(null); setDraft(''); }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className={s.buttonGhost}
                          onClick={() => { setEditingId(m.id); setDraft(m.value); }}
                          disabled={busy}
                        >
                          Edit
                        </button>
                        <button
                          className={s.buttonDanger}
                          onClick={() => removeOne(m.id)}
                          disabled={busy}
                        >
                          Forget
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {editingId === m.id ? (
                  <textarea
                    className={s.editArea}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    aria-label={`Edit memory ${m.key}`}
                  />
                ) : (
                  <p className={s.memoryValue}>{m.value}</p>
                )}

                <span className={s.memoryMeta}>
                  {m.source} · updated {m.updated_at.slice(0, 10)}
                  {m.user_confirmed ? ' · you approved this' : ''}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Ownership controls (Parts 28, 68) ────────────────────── */}
      <div className={s.dangerZone}>
        <p className={s.sectionLabel}>Your data</p>
        <div className={s.chipRow}>
          <button className={s.buttonGhost} onClick={doExport} disabled={busy}>
            ⬇ Export as JSON
          </button>
          {confirmForget ? (
            <>
              <button className={s.buttonDanger} onClick={forgetAll} disabled={busy}>
                Yes, forget everything
              </button>
              <button className={s.buttonGhost} onClick={() => setConfirmForget(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button
              className={s.buttonDanger}
              onClick={() => setConfirmForget(true)}
              disabled={busy || data.memories.length === 0}
            >
              🗑 Forget everything
            </button>
          )}
        </div>
        {confirmForget && (
          <p className={s.memoryMeta}>
            This permanently deletes all {data.memories.length} stored item
            {data.memories.length === 1 ? '' : 's'}. It cannot be undone.
          </p>
        )}
      </div>
    </div>
  );
}
