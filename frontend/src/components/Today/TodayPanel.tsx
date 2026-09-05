'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  createTask,
  endFocusSession,
  fetchPlan,
  fetchToday,
  logHabit,
  savePlan,
  startFocusSession,
  updateTask,
} from '@/lib/api';
import type { DailyPlan, Habit, Task, TodayResponse } from '@/lib/api';
import DailyPanel from '@/components/Krishna/DailyPanel';
import s from './today.module.css';

type ViewState = 'loading' | 'ready' | 'error';

interface TodayPanelProps {
  buddyName?: string;
  /** Ask Madhav something from the dashboard — used by the plan hand-off. */
  onAsk?: (message: string) => void;
}

const PRIORITY_LABEL: Record<string, string> = {
  CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low',
};

function greeting(timeContext: string): string {
  switch (timeContext) {
    case 'morning': return 'Good morning, dost';
    case 'evening': return 'Good evening';
    case 'night': return "It's late";
    default: return 'Hey, dost';
  }
}

function subtitle(data: TodayResponse, name: string): string {
  const { counts } = data.tasks;
  const done = data.tasks.completed_today.length;
  if (data.focus.active_session) return `${name} is with you — a session is running.`;
  if (counts.open === 0 && done > 0) return `Everything on the list is done. ${done} today.`;
  if (counts.open === 0) return `Nothing on the list yet. Add the one thing that matters.`;
  if (done > 0) return `${done} done, ${counts.open} left.`;
  return `${counts.open} open. Start with one.`;
}

/**
 * The Today dashboard.
 *
 * Deliberately not a wall of cards. The order is the order the spec asks for
 * and the order a person actually needs it in — greeting, the one thing that
 * matters, a way to start, then the list, then the slower stuff:
 *
 *   greeting → today's priority → Start Focus → tasks → habits/goals
 *   → daily Gita → progress
 *
 * Everything comes from one `/productivity/today` request, so the screen
 * cannot render half-loaded with the tasks in and the habits missing.
 */
export default function TodayPanel({ buddyName = 'Madhav', onAsk }: TodayPanelProps) {
  const [state, setState] = useState<ViewState>('loading');
  const [data, setData] = useState<TodayResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [planning, setPlanning] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [reflection, setReflection] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await fetchToday();
      setData(result);
      setState('ready');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load today.');
      setState('error');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await fetchToday();
        if (cancelled) return;
        setData(result);
        setState('ready');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load today.');
        setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────
  const handlePlanDay = async () => {
    setPlanning(true);
    try {
      const result = await fetchPlan();
      setPlan(result.proposed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build a plan.');
    } finally {
      setPlanning(false);
    }
  };

  const handleAcceptPlan = async () => {
    if (!plan) return;
    setBusy('plan');
    try {
      await savePlan({ blocks: plan.blocks });
      await load();
      setPlan(null);
    } finally {
      setBusy(null);
    }
  };

  const handleStartFocus = async (task?: Task, minutes = 25) => {
    setBusy('focus');
    try {
      await startFocusSession({
        minutes,
        activity: task?.title,
        task_id: task?.id,
        intended: task?.title,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start a session.');
    } finally {
      setBusy(null);
    }
  };

  const handleEndFocus = async () => {
    setBusy('focus');
    try {
      const result = await endFocusSession({});
      // The timer finishing records time spent, not that the work is done —
      // so this asks rather than congratulating.
      setReflection(result.reflection_prompt.question);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not end the session.');
    } finally {
      setBusy(null);
    }
  };

  const handleCompleteTask = async (task: Task) => {
    setBusy(task.id);
    try {
      await updateTask(task.id, { status: 'COMPLETED' });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const handleAddTask = async () => {
    const title = newTask.trim();
    if (!title) return;
    setBusy('add');
    try {
      await createTask({ title });
      setNewTask('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that task.');
    } finally {
      setBusy(null);
    }
  };

  const handleToggleHabit = async (habit: Habit) => {
    setBusy(habit.id);
    try {
      await logHabit(habit.id, !habit.done_today);
      await load();
    } finally {
      setBusy(null);
    }
  };

  // ── States ─────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className={s.panel}>
        <div className={s.state}><span className={s.spinner} /><span>Getting your day…</span></div>
      </div>
    );
  }

  if (state === 'error' || !data) {
    return (
      <div className={s.panel}>
        <div className={s.stateError}>
          <span className={s.stateEmoji}>😕</span>
          <span>{error}</span>
          <button className={s.ghost} onClick={load}>Try again</button>
        </div>
      </div>
    );
  }

  const priority = data.tasks.priority;
  const topTask = priority[0];
  const active = data.focus.active_session;
  const habits = data.habits.items;
  const goals = data.goals;

  return (
    <div className={s.panel}>
      {/* ── 1. Madhav's greeting ─────────────────────────────────── */}
      <header className={s.greeting}>
        <div>
          <h2 className={s.greetingTitle}>
            {greeting(data.time_context.id)}
          </h2>
          <p className={s.greetingSub}>{subtitle(data, buddyName)}</p>
        </div>
        <button className={s.ghost} onClick={load} title="Refresh">↻</button>
      </header>

      {/* ── 2. Today's priority + 3. Start focus ─────────────────── */}
      {active ? (
        <section className={`${s.card} ${s.cardFocus}`}>
          <p className={s.label}>In a session</p>
          <h3 className={s.priorityTitle}>{active.activity || 'Focus'}</h3>
          <p className={s.meta}>
            {active.planned_minutes} min planned · started{' '}
            {new Date(active.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          <button className={s.primary} onClick={handleEndFocus} disabled={busy === 'focus'}>
            End session
          </button>
        </section>
      ) : topTask ? (
        <section className={`${s.card} ${s.cardPriority}`}>
          <p className={s.label}>Today&apos;s priority</p>
          <h3 className={s.priorityTitle}>{topTask.title}</h3>
          <div className={s.chipRow}>
            <span className={`${s.chip} ${s[`p${topTask.priority}`] ?? ''}`}>
              {PRIORITY_LABEL[topTask.priority]}
            </span>
            {topTask.due_date && (
              <span className={s.chip}>due {topTask.due_date.slice(0, 10)}</span>
            )}
            {topTask.estimated_minutes && (
              <span className={s.chip}>~{topTask.estimated_minutes} min</span>
            )}
          </div>
          <div className={s.actionRow}>
            <button
              className={s.primary}
              onClick={() => handleStartFocus(topTask, 25)}
              disabled={busy === 'focus'}
            >
              ▶ Start 25 min
            </button>
            <button
              className={s.ghost}
              onClick={() => handleStartFocus(topTask, 45)}
              disabled={busy === 'focus'}
            >
              45 min
            </button>
            <button className={s.ghost} onClick={handlePlanDay} disabled={planning}>
              {planning ? 'Planning…' : 'Plan my day'}
            </button>
          </div>
        </section>
      ) : (
        <section className={`${s.card} ${s.cardPriority}`}>
          <p className={s.label}>Nothing planned yet</p>
          <h3 className={s.priorityTitle}>What&apos;s the one thing today?</h3>
          <div className={s.actionRow}>
            <button className={s.ghost} onClick={handlePlanDay} disabled={planning}>
              {planning ? 'Planning…' : 'Plan my day'}
            </button>
          </div>
        </section>
      )}

      {reflection && (
        <div className={s.reflection}>
          <span>{reflection}</span>
          <button className={s.dismiss} onClick={() => setReflection(null)} aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* ── The proposed plan ────────────────────────────────────── */}
      {plan && (
        <section className={`${s.card} ${s.cardPlan}`}>
          <div className={s.rowBetween}>
            <p className={s.label}>Proposed plan</p>
            <span className={s.meta}>
              {plan.planned_minutes} of {plan.available_minutes} min · {plan.buffer_minutes} min buffer
            </span>
          </div>

          {plan.empty ? (
            <p className={s.meta}>No open tasks to plan around today.</p>
          ) : (
            <ol className={s.planList}>
              {plan.blocks.filter((b) => b.type !== 'break').map((block, i) => (
                <li key={`${block.title}-${i}`} className={s.planItem}>
                  <span className={s.planTitle}>{block.title}</span>
                  <span className={s.planMinutes}>{block.minutes} min</span>
                  {block.goal_title && <span className={s.planGoal}>{block.goal_title}</span>}
                </li>
              ))}
            </ol>
          )}

          {/* The notes carry the assumptions — how much time was assumed, what
              did not fit. Hiding them would make the plan look more certain
              than it is. */}
          {plan.notes.map((note) => (
            <p key={note} className={s.note}>{note}</p>
          ))}

          <div className={s.actionRow}>
            {!plan.empty && (
              <button className={s.primary} onClick={handleAcceptPlan} disabled={busy === 'plan'}>
                Use this plan
              </button>
            )}
            {plan.suggestion && onAsk && (
              <button
                className={s.ghost}
                onClick={() => onAsk(`Plan my day. I have about ${plan.available_minutes} minutes.`)}
              >
                Talk it through
              </button>
            )}
            <button className={s.ghost} onClick={() => setPlan(null)}>Dismiss</button>
          </div>
        </section>
      )}

      {/* ── 4. Tasks ─────────────────────────────────────────────── */}
      <section className={s.card}>
        <div className={s.rowBetween}>
          <p className={s.label}>Tasks</p>
          <span className={s.meta}>
            {data.tasks.counts.open} open · {data.tasks.completed_today.length} done today
          </span>
        </div>

        <div className={s.addRow}>
          <input
            className={s.input}
            placeholder="Add a task…"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTask(); } }}
          />
          <button className={s.ghost} onClick={handleAddTask} disabled={!newTask.trim() || busy === 'add'}>
            +
          </button>
        </div>

        {priority.length === 0 ? (
          <p className={s.meta}>Nothing open. Enjoy it.</p>
        ) : (
          <ul className={s.taskList}>
            {priority.map((task) => (
              <li key={task.id} className={s.taskRow}>
                <button
                  className={s.checkbox}
                  onClick={() => handleCompleteTask(task)}
                  disabled={busy === task.id}
                  aria-label={`Complete ${task.title}`}
                />
                <span className={s.taskTitle}>{task.title}</span>
                <span className={`${s.dot} ${s[`p${task.priority}`] ?? ''}`} aria-hidden="true" />
                <button
                  className={s.taskFocus}
                  onClick={() => handleStartFocus(task, 25)}
                  disabled={busy === 'focus' || Boolean(active)}
                  title={active ? 'A session is already running' : 'Focus on this'}
                >
                  ⏱
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── 5. Habits and goals ──────────────────────────────────── */}
      {habits.length > 0 && (
        <section className={s.card}>
          <div className={s.rowBetween}>
            <p className={s.label}>Habits</p>
            <span className={s.meta}>{data.habits.done_today}/{data.habits.total} today</span>
          </div>
          <ul className={s.habitList}>
            {habits.map((habit) => (
              <li key={habit.id} className={s.habitRow}>
                <button
                  className={`${s.habitCheck} ${habit.done_today ? s.habitDone : ''}`}
                  onClick={() => handleToggleHabit(habit)}
                  disabled={busy === habit.id}
                  aria-pressed={habit.done_today}
                  aria-label={`${habit.done_today ? 'Un-log' : 'Log'} ${habit.name}`}
                >
                  {habit.emoji || (habit.done_today ? '✓' : '')}
                </button>
                <span className={s.habitName}>{habit.name}</span>
                {habit.streak > 0 && (
                  <span className={s.streak}>{habit.streak}-day streak</span>
                )}
                {/* Neutral by construction — the backend never writes a
                    shaming line, and neither does this. */}
                {habit.restart_note && (
                  <span className={s.restart}>{habit.restart_note}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {goals.length > 0 && (
        <section className={s.card}>
          <p className={s.label}>Goals</p>
          <ul className={s.goalList}>
            {goals.map((goal) => (
              <li key={goal.id} className={s.goalRow}>
                <div className={s.rowBetween}>
                  <span className={s.goalTitle}>{goal.title}</span>
                  <span className={s.meta}>{goal.progress}%</span>
                </div>
                <div className={s.progressTrack}>
                  <span className={s.progressFill} style={{ width: `${goal.progress}%` }} />
                </div>
                <span className={s.meta}>
                  {goal.task_counts.open} open task{goal.task_counts.open === 1 ? '' : 's'}
                  {goal.milestones_total > 0 &&
                    ` · ${goal.milestones_done}/${goal.milestones_total} milestones`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── 6. Daily Gita ────────────────────────────────────────── */}
      {/* Reuses DailyPanel rather than duplicating the verse/word/teaching
          rendering — including its provenance badges, which must not be
          dropped just because the content moved screens. */}
      <section className={s.gitaSlot}>
        <DailyPanel embedded />
      </section>

      {/* ── 7. Progress ──────────────────────────────────────────── */}
      <section className={s.card}>
        <p className={s.label}>Today so far</p>
        <div className={s.statRow}>
          <div className={s.stat}>
            <span className={s.statValue}>{data.tasks.completed_today.length}</span>
            <span className={s.statLabel}>done</span>
          </div>
          <div className={s.stat}>
            <span className={s.statValue}>{Math.round(data.focus.minutes_today)}</span>
            <span className={s.statLabel}>focus min</span>
          </div>
          <div className={s.stat}>
            <span className={s.statValue}>{data.focus.sessions_today}</span>
            <span className={s.statLabel}>sessions</span>
          </div>
          <div className={s.stat}>
            <span className={s.statValue}>{data.habits.done_today}</span>
            <span className={s.statLabel}>habits</span>
          </div>
        </div>
        {data.time.by_category.length > 0 && (
          <div className={s.chipRow}>
            {data.time.by_category.slice(0, 4).map((entry) => (
              <span key={entry.key} className={s.chip}>
                {entry.key.replace('_', ' ').toLowerCase()} · {Math.round(entry.minutes)}m
              </span>
            ))}
          </div>
        )}
      </section>

      {error && <p className={s.errorLine}>{error}</p>}
    </div>
  );
}
