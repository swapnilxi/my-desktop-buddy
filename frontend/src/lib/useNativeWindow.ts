'use client';

import { useSyncExternalStore } from 'react';

const noopSubscribe = () => () => {};

/** True inside the Electron shell when the custom resize bridge is available. */
export function useHasNativeWindow(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => !!window.hamsterDesk?.window?.setBounds,
    () => false
  );
}
