'use client';

import React, { useEffect, useState } from 'react';

export type WindowMode = 'pet' | 'compact' | 'fullscreen';

export interface ModeMeta {
  id: WindowMode;
  glyph: string;
  label: string;
  /** Spoken/tooltip description — never rely on the glyph alone for meaning. */
  description: string;
  shortcut: string;
}

/**
 * The three view modes, in the one order every switcher uses.
 *
 * Previously each mode hand-rolled its own subset of navigation buttons, which
 * left the dashboard with no entry point at all and made the same glyph mean
 * different things in different modes.
 */
export const MODES: ModeMeta[] = [
  {
    id: 'pet',
    glyph: '🐾',
    label: 'Pet',
    description: 'Floating desktop buddy — small, always on top',
    shortcut: '1',
  },
  {
    id: 'compact',
    glyph: '💬',
    label: 'Sidebar',
    description: 'Narrow side panel with chat, tasks and settings',
    shortcut: '2',
  },
  {
    id: 'fullscreen',
    glyph: '🖥️',
    label: 'Dashboard',
    description: 'Full productivity workspace',
    shortcut: '3',
  },
];

export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.hamsterDesk?.isElectron;
}

/**
 * Electron detection that is safe to branch the markup on.
 *
 * Calling isElectron() during render returns false in the prerendered static
 * export and true on the client, so the first client render would disagree
 * with the server HTML and React would discard it. Resolving after mount keeps
 * the two passes identical.
 */
function useIsElectron(): boolean {
  const [electron, setElectron] = useState(false);
  useEffect(() => setElectron(isElectron()), []);
  return electron;
}

interface ModeSwitcherProps {
  current: WindowMode;
  onChange: (mode: WindowMode) => void;
  /** 'segmented' for headers and toolbars, 'list' for the dashboard sidebar. */
  variant?: 'segmented' | 'list';
  /** Hide the text labels where there is genuinely no room (pet mode). */
  compactLabels?: boolean;
}

/** Every mode is reachable from every mode, and the current one is announced. */
export function ModeSwitcher({
  current,
  onChange,
  variant = 'segmented',
  compactLabels = false,
}: ModeSwitcherProps) {
  return (
    <div
      className={variant === 'list' ? 'mode-switcher-list' : 'mode-switcher'}
      role="group"
      aria-label="Window mode"
    >
      {MODES.map((mode) => {
        const active = mode.id === current;
        return (
          <button
            key={mode.id}
            type="button"
            className={`mode-switch-btn ${active ? 'active' : ''}`}
            onClick={() => onChange(mode.id)}
            aria-current={active ? 'true' : undefined}
            aria-label={`${mode.label} mode — ${mode.description}`}
            title={`${mode.label} mode (${mode.description})`}
          >
            <span className="mode-switch-glyph" aria-hidden="true">
              {mode.glyph}
            </span>
            {!compactLabels && <span className="mode-switch-label">{mode.label}</span>}
            {active && <span className="sr-only">(current)</span>}
          </button>
        );
      })}
    </div>
  );
}

interface WindowControlsProps {
  onMinimize: () => void;
  onHide: () => void;
  /** Rendered as a clearly separated, labelled control — never beside Hide. */
  onQuit?: () => void;
  buddyName: string;
  isPinned?: boolean;
  onTogglePin?: () => void;
  /** Offered only by the dashboard, which is the mode meant to fill the screen. */
  showMaximize?: boolean;
  size?: 'sm' | 'md';
}

/**
 * One canonical set of window controls.
 *
 * The glyphs used to collide: the same ✕ quit the whole app in pet mode but
 * only hid the window in the other two. Here ✕ always means Hide, in every
 * mode, and quitting is a separate labelled control behind a confirmation.
 */
export function WindowControls({
  onMinimize,
  onHide,
  onQuit,
  buddyName,
  isPinned,
  onTogglePin,
  showMaximize = false,
  size = 'md',
}: WindowControlsProps) {
  const electron = useIsElectron();
  const cls = size === 'sm' ? 'chrome-btn chrome-btn-sm' : 'chrome-btn';

  return (
    <div className="window-chrome-controls">
      {onTogglePin && electron && (
        <button
          type="button"
          className={`${cls} ${isPinned ? 'is-pinned' : ''}`}
          onClick={onTogglePin}
          aria-pressed={isPinned}
          aria-label={isPinned ? 'Unpin from always on top' : 'Pin always on top'}
          title={isPinned ? 'Unpin — let other windows cover the buddy' : 'Pin above all other windows'}
        >
          <span aria-hidden="true">{isPinned ? '📌' : '📍'}</span>
        </button>
      )}

      {/* The mode named 'fullscreen' can finally fill the screen. */}
      {showMaximize && electron && (
        <button
          type="button"
          className={cls}
          onClick={() => window.hamsterDesk?.window?.toggleMaximize?.()}
          aria-label="Maximize or restore the window"
          title="Maximize / restore"
        >
          <span aria-hidden="true">⤢</span>
        </button>
      )}

      {/* Minimizing only means something in the desktop app. */}
      {electron && (
        <button
          type="button"
          className={cls}
          onClick={onMinimize}
          aria-label="Minimize to the dock"
          title="Minimize to the dock (click the menu-bar icon to bring it back)"
        >
          <span aria-hidden="true">−</span>
        </button>
      )}

      <button
        type="button"
        className={`${cls} chrome-btn-hide`}
        onClick={onHide}
        aria-label={electron ? `Hide ${buddyName} — reopen from the menu bar` : 'Collapse to the floating buddy'}
        title={electron ? `Hide ${buddyName} (reopen from the menu-bar icon)` : 'Collapse to the floating buddy'}
      >
        <span aria-hidden="true">✕</span>
      </button>

      {onQuit && electron && (
        <button
          type="button"
          className={`${cls} chrome-btn-quit`}
          onClick={onQuit}
          aria-label={`Quit ${buddyName} completely`}
          title={`Quit ${buddyName} completely (asks first)`}
        >
          <span aria-hidden="true">⏻</span>
        </button>
      )}
    </div>
  );
}
