'use client';

import React, { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Small focus-trapped confirmation used for the one irreversible action in the
 * app. Quitting used to be a 17px unlabelled ✕ that was invisible until hover
 * and sat five pixels from Minimize, so a mis-click killed the app and its
 * backend with no warning.
 */
export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Land focus on the safe-to-press default rather than nowhere.
    confirmRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key !== 'Tab') return;
      // Keep Tab inside the dialog so focus cannot wander to the hidden UI.
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>('button');
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="confirm-overlay" onPointerDown={(e) => e.stopPropagation()}>
      <div
        className="confirm-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={body ? 'confirm-body' : undefined}
        ref={panelRef}
      >
        <h2 className="confirm-title" id="confirm-title">{title}</h2>
        {body && <p className="confirm-body" id="confirm-body">{body}</p>}
        <div className="confirm-actions">
          <button type="button" className="confirm-btn confirm-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-btn ${destructive ? 'confirm-destructive' : 'confirm-primary'}`}
            onClick={onConfirm}
            ref={confirmRef}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
