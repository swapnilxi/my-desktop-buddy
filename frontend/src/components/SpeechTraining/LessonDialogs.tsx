'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  LESSON_FIELDS,
  contentOf,
  generateLesson,
  reviseLesson,
  saveLesson,
  updateLesson,
} from '@/lib/speechTraining';
import type { Lesson, LessonContent, LessonField, Placement, Program } from '@/lib/speechTraining';

// ── Lesson rendering ────────────────────────────────────────────

export function FieldValue({ field, value }: { field: LessonField; value: LessonContent[LessonField] }) {
  if (field === 'durationMins') return <span>~{value as number} min</span>;
  if (field === 'focus') {
    const items = value as string[];
    return items.length ? <span className="st-chips">{items.map((f) => <span key={f} className="st-chip">{f}</span>)}</span> : <span className="st-muted">none</span>;
  }
  if (field === 'steps') {
    const steps = value as LessonContent['steps'];
    if (!steps.length) return <span className="st-muted">none</span>;
    return (
      <ol className="st-steps">
        {steps.map((s, i) => (
          <li key={i}>
            {s.title && <strong>{s.title}: </strong>}
            {s.instruction}
            {s.durationSec ? <span className="st-muted"> · {s.durationSec}s</span> : null}
          </li>
        ))}
      </ol>
    );
  }
  if (field === 'tips' || field === 'challengeQuestions') {
    const items = value as string[];
    return items.length ? <ul className="st-bullets">{items.map((t, i) => <li key={i}>{t}</li>)}</ul> : <span className="st-muted">none</span>;
  }
  if (field === 'sayInstead') {
    const pairs = value as LessonContent['sayInstead'];
    if (!pairs.length) return <span className="st-muted">none</span>;
    return (
      <div className="st-swaps">
        {pairs.map((p, i) => (
          <div key={i} className="st-swap">
            <div className="st-swap-said"><span>You say</span>“{p.said}”</div>
            <div className="st-swap-arrow">→</div>
            <div className="st-swap-try"><span>Say instead</span>“{p.instead}”</div>
          </div>
        ))}
      </div>
    );
  }
  if (field === 'vocabulary') {
    const pairs = value as LessonContent['vocabulary'];
    if (!pairs.length) return <span className="st-muted">none</span>;
    return (
      <table className="st-table st-vocab">
        <thead><tr><th>Plain English</th><th>Executive</th></tr></thead>
        <tbody>{pairs.map((p, i) => <tr key={i}><td className="st-muted">{p.plain}</td><td>{p.executive}</td></tr>)}</tbody>
      </table>
    );
  }
  if (field === 'notes') {
    const notes = value as LessonContent['notes'];
    if (!notes.length) return <span className="st-muted">none</span>;
    return (
      <div className="st-notes">
        {notes.map((n, i) => (
          <div key={i} className="st-note"><span className="st-label">{n.label}</span><p>{n.text}</p></div>
        ))}
      </div>
    );
  }
  if (field === 'exampleScript') {
    return value ? <blockquote className="st-script">{value as string}</blockquote> : <span className="st-muted">—</span>;
  }
  return <span>{(value as string) || <span className="st-muted">—</span>}</span>;
}

function Section({ label, show, children }: { label: string; show: boolean; children: ReactNode }) {
  if (!show) return null;
  return (
    <>
      <div className="st-label">{label}</div>
      {children}
    </>
  );
}

/** The body of a lesson card, in the order a learner uses it: warm up, exercise, model, cues, criteria. */
export function LessonBody({ lesson }: { lesson: LessonContent }) {
  return (
    <>
      {lesson.objective && <p className="st-objective">{lesson.objective}</p>}
      {lesson.focusLabel && <div className="st-focus">🎯 {lesson.focusLabel}</div>}
      {lesson.benchmark && <div className="st-benchmark">📌 {lesson.benchmark}</div>}
      <Section label="Warm-up" show={!!lesson.warmUp}><p className="st-warmup">🔥 {lesson.warmUp}</p></Section>
      <div className="st-label">Exercise</div>
      <p className="st-prompt">{lesson.prompt}</p>
      <Section label="Example script" show={!!lesson.exampleScript}><FieldValue field="exampleScript" value={lesson.exampleScript} /></Section>
      <Section label="Steps" show={lesson.steps.length > 0}><FieldValue field="steps" value={lesson.steps} /></Section>
      <Section label="Pressure questions" show={lesson.challengeQuestions.length > 0}>
        <FieldValue field="challengeQuestions" value={lesson.challengeQuestions} />
      </Section>
      <Section label="Say this instead" show={lesson.sayInstead.length > 0}><FieldValue field="sayInstead" value={lesson.sayInstead} /></Section>
      <Section label="Vocabulary guide" show={lesson.vocabulary.length > 0}><FieldValue field="vocabulary" value={lesson.vocabulary} /></Section>
      <Section label="Coaching cues" show={lesson.tips.length > 0}><FieldValue field="tips" value={lesson.tips} /></Section>
      {lesson.notes.length > 0 && <FieldValue field="notes" value={lesson.notes} />}
      {lesson.successCriteria && <p className="st-criteria">✅ {lesson.successCriteria}</p>}
    </>
  );
}

// ── Modal shell ─────────────────────────────────────────────────

function Modal({ title, onClose, children, busy }: { title: string; onClose: () => void; children: ReactNode; busy?: boolean }) {
  const titleId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKey);
    boxRef.current?.querySelector<HTMLElement>('textarea, input, button')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, busy]);
  return (
    <div className="st-modal-backdrop" onPointerDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="st-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={boxRef}>
        <div className="st-modal-head">
          <h3 id={titleId}>{title}</h3>
          <button type="button" className="st-icon-btn" onClick={onClose} disabled={busy} aria-label="Close">✕</button>
        </div>
        <div className="st-modal-body">{children}</div>
      </div>
    </div>
  );
}

// ── Generate ────────────────────────────────────────────────────

const DURATIONS = [0, 2, 3, 5, 10, 20, 45];

function placementLabel(program: Program, p: Placement): string {
  if (p.type === 'standalone') return 'a standalone lesson';
  if (p.type === 'sublesson') {
    const d = program.days.find((x) => x.id === p.dayId);
    return d ? `a sub-lesson of Day ${d.day}` : 'a sub-lesson';
  }
  if (!p.afterDayId) return 'a new Day 1';
  const d = program.days.find((x) => x.id === p.afterDayId);
  return d ? `a new Day ${d.day + 1}` : 'a new day';
}

interface GenerateDialogProps {
  program: Program;
  initial: Placement | null;
  onClose: () => void;
  onSaved: (lesson: Lesson, program: Program) => void;
}

export function GenerateDialog({ program, initial, onClose, onSaved }: GenerateDialogProps) {
  const firstDay = program.days[0]?.id ?? '';
  const lastDay = program.days[program.days.length - 1]?.id ?? '';
  const [request, setRequest] = useState('');
  const [type, setType] = useState<Placement['type']>(initial?.type ?? 'sublesson');
  const [dayId, setDayId] = useState(initial?.type === 'sublesson' ? initial.dayId : firstDay);
  const [afterDayId, setAfterDayId] = useState<string>(initial?.type === 'day' ? initial.afterDayId ?? '' : lastDay);
  const [duration, setDuration] = useState(0);
  const [phase, setPhase] = useState<'edit' | 'generating' | 'preview' | 'saving'>('edit');
  const [draft, setDraft] = useState<LessonContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const placement: Placement =
    type === 'sublesson' ? { type, dayId } : type === 'day' ? { type, afterDayId: afterDayId || null } : { type: 'standalone' };
  const busy = phase === 'generating' || phase === 'saving';

  const generate = async () => {
    if (!request.trim()) {
      setError('Describe the lesson you want first.');
      return;
    }
    setError(null);
    setPhase('generating');
    try {
      const res = await generateLesson(request.trim(), placement, duration || undefined);
      setDraft(res.draft);
      setPhase('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed.');
      setPhase(draft ? 'preview' : 'edit');
    }
  };

  const save = async () => {
    if (!draft) return;
    setPhase('saving');
    setError(null);
    try {
      const res = await saveLesson(draft, placement);
      onSaved(res.lesson, res.program);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Saving failed.');
      setPhase('preview');
    }
  };

  const dayOptions = program.days.map((d) => (
    <option key={d.id} value={d.id}>Day {d.day} · {d.title}</option>
  ));

  return (
    <Modal title="✨ Generate a lesson" onClose={onClose} busy={busy}>
      {phase === 'preview' || phase === 'saving' ? (
        <>
          <div className="st-eyebrow">Preview · will be saved as {placementLabel(program, placement)} · ~{draft?.durationMins} min</div>
          {draft && (
            <div className="st-card st-preview">
              <h3>{draft.title}</h3>
              <LessonBody lesson={draft} />
            </div>
          )}
          {error && <div className="st-alert-inline">{error}</div>}
          <div className="st-modal-actions">
            <button type="button" className="st-btn primary" onClick={save} disabled={busy}>
              {phase === 'saving' ? 'Saving…' : `Save as ${placementLabel(program, placement)}`}
            </button>
            <button type="button" className="st-btn" onClick={generate} disabled={busy}>↻ Regenerate</button>
            <button type="button" className="st-btn ghost" onClick={() => setPhase('edit')} disabled={busy}>Edit request</button>
          </div>
        </>
      ) : (
        <>
          <label className="st-field">
            <span>What do you want to practice?</span>
            <textarea
              rows={4}
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder="e.g. A 4-minute anchor-drop drill for presenting ARR and NRR to my board, with two hard investor questions at the end."
              disabled={busy}
            />
          </label>

          <fieldset className="st-fieldset" disabled={busy}>
            <legend>Where should it go?</legend>
            <label className="st-radio">
              <input type="radio" name="placement" checked={type === 'sublesson'} onChange={() => setType('sublesson')} />
              <span>Sub-lesson of</span>
              <select value={dayId} onChange={(e) => { setDayId(e.target.value); setType('sublesson'); }} aria-label="Day for the sub-lesson">
                {dayOptions}
              </select>
            </label>
            <label className="st-radio">
              <input type="radio" name="placement" checked={type === 'day'} onChange={() => setType('day')} />
              <span>New day after</span>
              <select value={afterDayId} onChange={(e) => { setAfterDayId(e.target.value); setType('day'); }} aria-label="Insert the new day after">
                <option value="">— at the very start</option>
                {dayOptions}
              </select>
            </label>
            <label className="st-radio">
              <input type="radio" name="placement" checked={type === 'standalone'} onChange={() => setType('standalone')} />
              <span>Standalone lesson (practice any time)</span>
            </label>
          </fieldset>

          <label className="st-field inline">
            <span>Length</span>
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} disabled={busy}>
              {DURATIONS.map((m) => <option key={m} value={m}>{m ? `${m} min` : 'Let the coach decide'}</option>)}
            </select>
          </label>

          {error && <div className="st-alert-inline">{error}</div>}
          <div className="st-modal-actions">
            <button type="button" className="st-btn primary" onClick={generate} disabled={busy}>
              {phase === 'generating' ? 'Generating…' : '✨ Generate'}
            </button>
            {draft && <button type="button" className="st-btn ghost" onClick={() => setPhase('preview')} disabled={busy}>Back to preview</button>}
          </div>
        </>
      )}
    </Modal>
  );
}

// ── Modify ──────────────────────────────────────────────────────

interface ModifyDialogProps {
  lesson: Lesson;
  onClose: () => void;
  onApplied: (lesson: Lesson, program: Program) => void;
}

export function ModifyDialog({ lesson, onClose, onApplied }: ModifyDialogProps) {
  const [instruction, setInstruction] = useState('');
  const [scope, setScope] = useState<'whole' | 'parts'>('whole');
  const [parts, setParts] = useState<Set<LessonField>>(new Set(['prompt']));
  const [phase, setPhase] = useState<'edit' | 'generating' | 'preview' | 'saving'>('edit');
  const [draft, setDraft] = useState<LessonContent | null>(null);
  const [changed, setChanged] = useState<LessonField[]>([]);
  const [error, setError] = useState<string | null>(null);
  const busy = phase === 'generating' || phase === 'saving';
  const current = contentOf(lesson);

  const togglePart = (f: LessonField) =>
    setParts((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });

  const generate = async () => {
    if (!instruction.trim()) {
      setError('Describe what you want to change.');
      return;
    }
    if (scope === 'parts' && parts.size === 0) {
      setError('Pick at least one part to change.');
      return;
    }
    setError(null);
    setPhase('generating');
    try {
      const res = await reviseLesson(lesson.id, instruction.trim(), scope === 'whole' ? null : [...parts]);
      setDraft(res.draft);
      setChanged(res.changed);
      setPhase('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The change failed.');
      setPhase(draft ? 'preview' : 'edit');
    }
  };

  const apply = async () => {
    if (!draft) return;
    setPhase('saving');
    setError(null);
    try {
      const res = await updateLesson(lesson.id, draft);
      onApplied(res.lesson, res.program);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Saving failed.');
      setPhase('preview');
    }
  };

  return (
    <Modal title={`✨ Modify “${lesson.title}”`} onClose={onClose} busy={busy}>
      {phase === 'preview' || phase === 'saving' ? (
        <>
          <div className="st-eyebrow">{changed.length} part{changed.length === 1 ? '' : 's'} changed — review before applying</div>
          {draft && changed.map((f) => (
            <div key={f} className="st-diff">
              <div className="st-label">{LESSON_FIELDS.find((x) => x.key === f)?.label ?? f}</div>
              <div className="st-diff-row">
                <div className="st-diff-before"><span className="st-diff-label">Before</span><FieldValue field={f} value={current[f]} /></div>
                <div className="st-diff-after"><span className="st-diff-label">After</span><FieldValue field={f} value={draft[f]} /></div>
              </div>
            </div>
          ))}
          {error && <div className="st-alert-inline">{error}</div>}
          <div className="st-modal-actions">
            <button type="button" className="st-btn primary" onClick={apply} disabled={busy}>
              {phase === 'saving' ? 'Applying…' : 'Apply changes'}
            </button>
            <button type="button" className="st-btn" onClick={generate} disabled={busy}>↻ Try again</button>
            <button type="button" className="st-btn ghost" onClick={() => setPhase('edit')} disabled={busy}>Edit request</button>
          </div>
        </>
      ) : (
        <>
          <label className="st-field">
            <span>What should change?</span>
            <textarea
              rows={4}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g. Make the exercise about defending our burn multiple to a skeptical investor, and add a firm-landing check to the success criteria."
              disabled={busy}
            />
          </label>
          <fieldset className="st-fieldset" disabled={busy}>
            <legend>Scope</legend>
            <label className="st-radio">
              <input type="radio" name="scope" checked={scope === 'whole'} onChange={() => setScope('whole')} />
              <span>Whole lesson — the coach may rewrite anything</span>
            </label>
            <label className="st-radio">
              <input type="radio" name="scope" checked={scope === 'parts'} onChange={() => setScope('parts')} />
              <span>Only these parts:</span>
            </label>
            {scope === 'parts' && (
              <div className="st-parts">
                {LESSON_FIELDS.map((f) => (
                  <label key={f.key} className="st-check">
                    <input type="checkbox" checked={parts.has(f.key)} onChange={() => togglePart(f.key)} />
                    {f.label}
                  </label>
                ))}
              </div>
            )}
          </fieldset>
          {error && <div className="st-alert-inline">{error}</div>}
          <div className="st-modal-actions">
            <button type="button" className="st-btn primary" onClick={generate} disabled={busy}>
              {phase === 'generating' ? 'Generating…' : '✨ Generate changes'}
            </button>
            {draft && <button type="button" className="st-btn ghost" onClick={() => setPhase('preview')} disabled={busy}>Back to preview</button>}
          </div>
        </>
      )}
    </Modal>
  );
}
