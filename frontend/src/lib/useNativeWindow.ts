'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

type Mode = 'pet' | 'compact' | 'fullscreen';

const noopSubscribe = () => () => {};

/** True inside the Electron shell when the resize / fill-screen bridge is available. */
export function useHasNativeWindow(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => !!window.hamsterDesk?.window?.setBounds,
    () => false
  );
}

/**
 * Keeps the Electron window in sync with the UI mode.
 *
 * On load it first asks the main process which mode the window is already in, so a
 * renderer reload (e.g. Next.js dev refresh) doesn't snap an expanded window back to
 * Buddy mode. After that, every UI mode change resizes the native window.
 */
export function useNativeWindowSync(mode: Mode, adoptMode: (mode: Mode) => void) {
  const [maximized, setMaximized] = useState(false);
  const synced = useRef(false);
  const modeRef = useRef(mode);

  useEffect(() => {
    modeRef.current = mode;
  });

  useEffect(() => {
    const api = window.hamsterDesk?.window;
    if (!api) return;
    const off = api.onState?.((s) => setMaximized(!!s.maximized));

    const pushCurrent = () => {
      synced.current = true;
      api.setMode(modeRef.current);
    };
    if (!api.getState) {
      pushCurrent(); // older preload: UI is the source of truth
      return off;
    }
    api
      .getState()
      .then((s) => {
        setMaximized(!!s?.maximized);
        if (s && s.mode !== 'pet' && modeRef.current === 'pet') {
          synced.current = true;
          adoptMode(s.mode); // renderer reloaded while the window was expanded
        } else {
          pushCurrent();
        }
      })
      .catch(pushCurrent);
    return off;
  }, [adoptMode]);

  useEffect(() => {
    const api = window.hamsterDesk?.window;
    if (api && synced.current) api.setMode(mode);
  }, [mode]);

  const toggleMaximize = useCallback(() => {
    window.hamsterDesk?.window?.toggleMaximize?.();
  }, []);

  return { maximized, toggleMaximize };
}
