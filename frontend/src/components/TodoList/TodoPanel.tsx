'use client';

import { useState, useEffect, useCallback } from 'react';
import type { TodoItem, HamsterMood } from '@/lib/api';
import { fetchTodos, createTodo, toggleTodo, deleteTodo } from '@/lib/api';
import type { BuddyDefinition, BuddyType } from '../Buddies/types';
import { getBuddyDefinition } from '../Buddies/registry';

interface TodoPanelProps {
  onMoodChange: (mood: HamsterMood) => void;
  buddyType?: BuddyType | string;
  buddyName?: string;
  buddyDef?: BuddyDefinition;
}

export default function TodoPanel({
  onMoodChange,
  buddyType = 'hamster',
  buddyName,
  buddyDef,
}: TodoPanelProps) {
  const effectiveDef = buddyDef || getBuddyDefinition(buddyType);
  const effectiveName = buddyName || effectiveDef.defaultName;
  const effectiveEmoji = effectiveDef.emoji;

  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      {/* Input */}
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

      {/* Task List */}
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
          sortedTodos.map((todo) => (
            <div key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
              <button
                className="todo-checkbox"
                onClick={() => handleToggle(todo.id)}
                title={todo.completed ? 'Mark incomplete' : 'Mark complete'}
              >
                {todo.completed ? '✓' : ''}
              </button>
              <span className="todo-text">{todo.text}</span>
              <button
                className="todo-delete"
                onClick={() => handleDelete(todo.id)}
                title="Delete task"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* Stats */}
      {todos.length > 0 && (
        <div className="todo-stats">
          <span>{pending.length} pending</span>
          <span>{completed.length} completed</span>
        </div>
      )}
    </div>
  );
}
