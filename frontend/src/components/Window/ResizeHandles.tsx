'use client';

import { useRef } from 'react';
import type { WindowBounds } from '@/types/electron';
import { useHasNativeWindow } from '@/lib/useNativeWindow';

type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
const EDGES: Edge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

interface Drag {
  edge: Edge;
  startX: number;
  startY: number;
  start: WindowBounds | null;
  frame: number | null;
  next: (WindowBounds & { edge: Edge }) | null;
}

/**
 * Invisible edge and corner grips that resize the frameless Electron window.
 * Transparent frameless windows can't be resized natively, so the main process
 * applies the bounds (and enforces per-mode minimum sizes).
 */
export default function ResizeHandles() {
  const enabled = useHasNativeWindow();
  const drag = useRef<Drag | null>(null);
  if (!enabled) return null;

  const onDown = (edge: Edge) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const d: Drag = { edge, startX: e.screenX, startY: e.screenY, start: null, frame: null, next: null };
    drag.current = d;
    window.hamsterDesk?.window.getBounds?.().then((b) => {
      if (drag.current === d) d.start = b;
    });
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d?.start) return;
    const dx = e.screenX - d.startX;
    const dy = e.screenY - d.startY;
    let { x, y, width, height } = d.start;
    if (d.edge.includes('e')) width += dx;
    if (d.edge.includes('s')) height += dy;
    if (d.edge.includes('w')) {
      x += dx;
      width -= dx;
    }
    if (d.edge.includes('n')) {
      y += dy;
      height -= dy;
    }
    d.next = { x, y, width, height, edge: d.edge };
    if (d.frame == null) {
      d.frame = requestAnimationFrame(() => {
        d.frame = null;
        if (d.next) window.hamsterDesk?.window.setBounds?.(d.next);
      });
    }
  };

  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    drag.current = null;
  };

  return (
    <>
      {EDGES.map((edge) => (
        <div
          key={edge}
          className={`resize-handle resize-${edge}`}
          onPointerDown={onDown(edge)}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          aria-hidden="true"
        />
      ))}
    </>
  );
}
