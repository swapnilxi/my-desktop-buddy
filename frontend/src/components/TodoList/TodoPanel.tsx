'use client';

import { useState, useEffect, useCallback } from 'react';
import type { TodoItem, HamsterMood } from '@/lib/api';
import { fetchTodos, createTodo, toggleTodo, deleteTodo } from '@/lib/api';
import type { BuddyDefinition, BuddyType } from '../Buddies/types';
import { getBuddyDefinition } from '../Buddies/registry';
import {
  useFocusTimer,
  FocusTimerHandle,
  PRESETS,
  DEFAULT_FOCUS_ACTIVITIES,
  DEFAULT_5M_BREAK_ACTIVITIES,
  DEFAULT_10M_BREAK_ACTIVITIES,
} from '@/lib/useFocusTimer';

interface TodoPanelProps {
  onMoodChange: (mood: HamsterMood) => void;
  buddyType?: BuddyType | string;
  buddyName?: string;
  buddyDef?: BuddyDefinition;
  timer?: FocusTimerHandle;
}

export default function TodoPanel({
  onMoodChange,
  buddyType = 'hamster',
  buddyName,
  buddyDef,
  timer: externalTimer,
}: TodoPanelProps) {
  const effectiveDef = buddyDef || getBuddyDefinition(buddyType);
  const effectiveName = buddyName || effectiveDef.defaultName;
  const effectiveEmoji = effectiveDef.emoji;

  const fallbackTimer = useFocusTimer({ onMoodChange });
  const timer = externalTimer || fallbackTimer;

  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditingActivity, setIsEditingActivity] = useState<boolean>(false);
  const [customInputText, setCustomInputText] = useState<string>('');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const loadTodos = useCallback(async () => {
    try {
      const data = await fetchTodos();
      setTodos(data);
      setError(null);
    } catch {
      setError('Could not load todos. Is the backend running?');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  const handleSaveCustomActivity = () => {
    const trimmed = customInputText.trim();
    if (!trimmed) return;
    timer.saveCustomActivity(trimmed, timer.sessionType);
    setIsEditingActivity(false);
    setSaveToast('Saved to presets!');
    setTimeout(() => setSaveToast(null), 2000);
  };

  const handleAddCustomAsTodo = async () => {
    const trimmed = customInputText.trim();
    if (!trimmed) return;

    try {
      const newTodo = await createTodo(trimmed);
      setTodos((prev) => [...prev, newTodo]);
      timer.handleFocusTask(newTodo.id, newTodo.text);
      setIsEditingActivity(false);
      setSaveToast('Added to To-Do & linked!');
      setTimeout(() => setSaveToast(null), 2000);
    } catch {
      setError('Failed to add task to To-Do list');
    }
  };

  const handleAdd = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    try {
      const newTodo = await createTodo(trimmed);
      setTodos((prev) => [...prev, newTodo]);
      setInput('');
      setError(null);
    } catch {
      setError('Failed to add task');
    }
  };

  const handleToggle = async (id: number) => {
    try {
      const updated = await toggleTodo(id);
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));

      if (updated.completed) {
        if (timer.activeTaskId === id) {
          timer.setActiveTaskId(null);
        }
        onMoodChange('happy');
        setTimeout(() => onMoodChange('idle'), 2500);
      }
      setError(null);
    } catch {
      setError('Failed to update task');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
      if (timer.activeTaskId === id) {
        timer.setActiveTaskId(null);
      }
      setError(null);
    } catch {
      setError('Failed to delete task');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = timer.totalSeconds > 0 ? ((timer.totalSeconds - timer.timeLeft) / timer.totalSeconds) * 100 : 0;
  const activeTask = todos.find((t) => t.id === timer.activeTaskId);

  const pending = todos.filter((t) => !t.completed);
  const completed = todos.filter((t) => t.completed);
  const sortedTodos = [...pending, ...completed];

  if (isLoading) {
    return (
      <div className="todo-panel">
        <div className="todo-empty">
          <span className="todo-empty-emoji">⏳</span>
          <p>Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="todo-panel">
      {/* ── 1. COMPACT FOCUS & POMODORO TIMER CARD ── */}
      <div className={`todo-timer-card ${timer.sessionType === 'break' ? 'mode-break' : ''} ${timer.isRunning ? 'timer-running' : ''}`}>
        <div className="todo-timer-header">
          <div className="todo-timer-title-group">
            <span className="todo-timer-icon-badge">
              {timer.sessionType === 'break' ? '☕' : timer.isRunning ? '🔥' : '⏱️'}
            </span>
            <span className="todo-timer-title">
              {timer.sessionType === 'break' ? 'Break & Recharge' : timer.isRunning ? 'Focusing...' : 'Pomodoro Focus'}
            </span>
          </div>

          <div className="todo-timer-compact-preview">
            {!timer.isExpanded && (
              <span className="todo-timer-mini-time">{formatTime(timer.timeLeft)}</span>
            )}
            <button
              className="todo-timer-toggle-btn"
              onClick={() => timer.setIsExpanded(!timer.isExpanded)}
              title={timer.isExpanded ? 'Collapse Focus Timer' : 'Expand Focus Timer'}
            >
              {timer.isExpanded ? '▲' : '▼'}
            </button>
          </div>
        </div>

        {/* Expandable Timer Body */}
        {timer.isExpanded && (
          <div className="todo-timer-body">
            {/* 4-Column Compact Preset Grid */}
            <div className="todo-timer-presets">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  className={`timer-preset-chip ${preset.type === 'break' ? 'break-chip' : ''} ${timer.activePreset === preset.id ? 'active' : ''}`}
                  onClick={() => timer.handleSelectPreset(preset)}
                >
                  <span>{preset.emoji}</span>
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>

            {/* Ultra-Compact Activity Selector Row */}
            <div className="todo-timer-activity-row">
              <span
                className="todo-activity-icon-indicator"
                title={timer.sessionType === 'focus' ? 'Focus Activity' : 'Break Goal'}
              >
                {timer.sessionType === 'focus' ? '🎯' : '☕'}
              </span>

              {!isEditingActivity ? (
                <>
                  <select
                    className="todo-activity-select"
                    value={timer.activeTaskId ? `todo:${timer.activeTaskId}` : `preset:${timer.currentActivity}`}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'custom-new') {
                        setIsEditingActivity(true);
                        setCustomInputText('');
                        return;
                      }
                      if (val.startsWith('todo:')) {
                        const tId = parseInt(val.replace('todo:', ''), 10);
                        const found = todos.find((t) => t.id === tId);
                        if (found) {
                          timer.handleFocusTask(tId, found.text);
                          setCustomInputText(found.text);
                        }
                      } else if (val.startsWith('preset:')) {
                        const name = val.replace('preset:', '');
                        timer.handleUnlinkTask();
                        timer.setCurrentActivity(name);
                        setCustomInputText(name);
                      }
                    }}
                  >
                    {timer.sessionType === 'focus' ? (
                      <>
                        {pending.length > 0 && (
                          <optgroup label="📋 To-Do Tasks">
                            {pending.map((t) => (
                              <option key={t.id} value={`todo:${t.id}`}>
                                {t.text}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="🎯 Focus Presets">
                          {DEFAULT_FOCUS_ACTIVITIES.map((act) => (
                            <option key={act} value={`preset:${act}`}>
                              {act}
                            </option>
                          ))}
                        </optgroup>
                        {timer.customFocusList.length > 0 && (
                          <optgroup label="⭐ Saved Custom Tasks">
                            {timer.customFocusList.map((act) => (
                              <option key={act} value={`preset:${act}`}>
                                {act}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <option value="custom-new">✏️ + Custom Task...</option>
                      </>
                    ) : (
                      <>
                        <optgroup label={`☕ ${timer.totalSeconds <= 300 ? '5-Min' : '10-Min'} Break Ideas`}>
                          {(timer.totalSeconds <= 300 ? DEFAULT_5M_BREAK_ACTIVITIES : DEFAULT_10M_BREAK_ACTIVITIES).map((act) => (
                            <option key={act} value={`preset:${act}`}>
                              {act}
                            </option>
                          ))}
                        </optgroup>
                        {timer.customBreakList.length > 0 && (
                          <optgroup label="⭐ Saved Custom Break Ideas">
                            {timer.customBreakList.map((act) => (
                              <option key={act} value={`preset:${act}`}>
                                {act}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <option value="custom-new">✏️ + Custom Break...</option>
                      </>
                    )}
                  </select>
                  <button
                    className="todo-activity-btn-mode"
                    onClick={() => {
                      setIsEditingActivity(true);
                      setCustomInputText(timer.currentActivity);
                    }}
                    title="Type custom activity label"
                  >
                    ✏️
                  </button>
                </>
              ) : (
                <>
                  <input
                    className="todo-activity-custom-input"
                    placeholder={timer.sessionType === 'focus' ? 'Custom task...' : 'Custom break...'}
                    value={customInputText}
                    onChange={(e) => {
                      setCustomInputText(e.target.value);
                      timer.setCurrentActivity(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveCustomActivity();
                    }}
                    autoFocus
                  />
                  <button
                    className="todo-activity-btn-save"
                    onClick={handleSaveCustomActivity}
                    disabled={!customInputText.trim()}
                    title="Save to preset list"
                  >
                    💾 Save
                  </button>
                  {timer.sessionType === 'focus' && (
                    <button
                      className="todo-activity-btn-todo"
                      onClick={handleAddCustomAsTodo}
                      disabled={!customInputText.trim()}
                      title="Add to To-Do list"
                    >
                      ➕ Todo
                    </button>
                  )}
                  <button
                    className="todo-activity-btn-mode"
                    onClick={() => setIsEditingActivity(false)}
                    title="Back to dropdown"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>

            {saveToast && (
              <div style={{ fontSize: '10px', color: 'var(--success)', marginTop: '-4px', textAlign: 'center' }}>
                ✓ {saveToast}
              </div>
            )}

            {/* Display & Control Row */}
            <div className="todo-timer-display-row">
              <div className="todo-timer-digits">
                {formatTime(timer.timeLeft)}
              </div>

              <div className="todo-timer-controls">
                <button
                  className={`timer-main-btn ${timer.isRunning ? 'pause-btn' : 'start-btn'}`}
                  onClick={timer.handleToggleTimer}
                  title={timer.isRunning ? 'Pause Timer' : 'Start Timer'}
                >
                  {timer.isRunning ? '⏸ Pause' : '▶ Start'}
                </button>
                <button
                  className="timer-sub-btn"
                  onClick={timer.handleResetTimer}
                  title="Reset Timer"
                >
                  ↺
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="todo-timer-progress-track">
              <div
                className="todo-timer-progress-fill"
                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              />
            </div>

            {/* Linked Task Tag */}
            {activeTask && (
              <div className="todo-timer-linked-task">
                <div className="todo-timer-linked-label">
                  <span>🎯 Focusing on:</span>
                  <strong>{activeTask.text}</strong>
                </div>
                <button
                  className="todo-timer-unlink-btn"
                  onClick={timer.handleUnlinkTask}
                  title="Unlink task"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Completion Banner */}
            {timer.sessionCompleted && (
              <div className="todo-timer-completion-banner">
                <span>
                  {timer.completedSessionType === 'focus'
                    ? timer.completedDurationMin >= 50
                      ? '🎉 50m Focus complete! Ready for 10m break?'
                      : '🎉 25m Focus complete! Ready for 5m break?'
                    : '☕ Break finished! Ready to focus?'}
                </span>
                <div className="completion-actions">
                  {timer.completedSessionType === 'focus' ? (
                    <>
                      <button
                        className="completion-btn"
                        onClick={() => timer.handleStartBreak(timer.completedDurationMin >= 50 ? 10 : 5)}
                      >
                        {timer.completedDurationMin >= 50 ? '🌴 10m Break' : '☕ 5m Break'}
                      </button>
                      {activeTask && !activeTask.completed && (
                        <button
                          className="completion-btn"
                          onClick={() => handleToggle(activeTask.id)}
                        >
                          ✓ Done
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      className="completion-btn"
                      onClick={() => timer.handleStartNextFocus(25)}
                    >
                      ▶ Next Focus
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 2. ADD TASK INPUT ── */}
      <div className="todo-input-area">
        <div className="todo-input-wrapper">
          <input
            className="todo-input"
            placeholder="Add a task... (press Enter)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="btn-icon btn-send" onClick={handleAdd} disabled={!input.trim()} title="Add task">
            +
          </button>
        </div>
        {error && <p style={{ color: 'var(--danger)', fontSize: 'var(--text-xs)', marginTop: '8px' }}>{error}</p>}
      </div>

      {/* ── 3. TASK LIST WITH FOCUS BUTTONS ── */}
      <div className="todo-list">
        {sortedTodos.length === 0 ? (
          <div className="todo-empty">
            <span className="todo-empty-emoji">📋</span>
            <p>No tasks yet! Add one above.</p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              {effectiveName} will help you stay on track {effectiveEmoji}
            </p>
          </div>
        ) : (
          sortedTodos.map((todo) => {
            const isTaskInFocus = timer.activeTaskId === todo.id;
            return (
              <div
                key={todo.id}
                className={`todo-item ${todo.completed ? 'completed' : ''} ${isTaskInFocus ? 'in-focus' : ''}`}
              >
                <button
                  className="todo-checkbox"
                  onClick={() => handleToggle(todo.id)}
                  title={todo.completed ? 'Mark incomplete' : 'Mark complete'}
                >
                  {todo.completed ? '✓' : ''}
                </button>
                <span className="todo-text">{todo.text}</span>

                <div className="todo-item-actions">
                  {!todo.completed && (
                    <button
                      className="todo-focus-btn"
                      onClick={() => timer.handleFocusTask(todo.id, todo.text)}
                      title={isTaskInFocus && timer.isRunning ? 'Pause Focus' : 'Focus on this task with timer'}
                    >
                      <span>{isTaskInFocus && timer.isRunning ? '⏸' : '⏱️'}</span>
                      <span>{isTaskInFocus ? 'Focusing' : 'Focus'}</span>
                    </button>
                  )}
                  <button
                    className="todo-delete"
                    onClick={() => handleDelete(todo.id)}
                    title="Delete task"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── 4. STATS FOOTER ── */}
      {todos.length > 0 && (
        <div className="todo-stats">
          <span>{pending.length} pending</span>
          <span>{completed.length} completed</span>
        </div>
      )}
    </div>
  );
}
