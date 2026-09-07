'use client';

/**
 * User-controllable "how much visual flourish" setting for Krishna's
 * character-state system, persisted the same way other client preferences
 * in this app are (see app/page.tsx's window-mode restore): a guarded
 * localStorage read that must only ever run post-mount, never during SSR.
 */

import { CHAKRA_SPEED_MAP } from './krishnaCharacterState';

export type Intensity = 'full' | 'reduced' | 'minimal';

const INTENSITY_STORAGE_KEY = 'krishna-intensity';

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Reads the saved intensity, falling back to the OS-level reduced-motion
 * preference, then `'full'`. Safe to call during SSR (returns `'full'`
 * without touching `window`/`localStorage`), but the real, user-saved value
 * only becomes available client-side — callers that need it reactively
 * should read this inside a `useEffect`, the same one-frame-correction
 * pattern the rest of the app uses for localStorage-backed state.
 */
export function getIntensity(): Intensity {
  if (typeof window === 'undefined') return 'full';
  try {
    const saved = localStorage.getItem(INTENSITY_STORAGE_KEY);
    if (saved === 'full' || saved === 'reduced' || saved === 'minimal') return saved;
  } catch {
    /* private mode / storage disabled */
  }
  return prefersReducedMotion() ? 'reduced' : 'full';
}

export function setIntensity(intensity: Intensity): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(INTENSITY_STORAGE_KEY, intensity);
  } catch {
    /* ignore */
  }
}

const FAST_CHAKRA_VALUES = new Set(['FAST', 'ACCELERATE', 'CELEBRATE']);

/**
 * The chakra spin duration actually applied, after intensity has had its
 * say. Both `reduced` and `minimal` clamp the "fast" tier down to the calm
 * duration — `minimal` is meant to be at least as still as `reduced`, never
 * busier, so it gets the same clamp rather than a separate, stricter one.
 */
export function effectiveChakraSpeed(chakra: string | undefined, intensity: Intensity): string {
  const key = (chakra || 'CALM').toUpperCase();
  if (intensity !== 'full' && FAST_CHAKRA_VALUES.has(key)) {
    return CHAKRA_SPEED_MAP.CALM;
  }
  return CHAKRA_SPEED_MAP[key] ?? CHAKRA_SPEED_MAP.CALM;
}

/**
 * Particles are the one flourish that is fully skipped (not just toned
 * down) outside `'full'` intensity — `minimal` per spec, and `reduced` too
 * since a floating-particle layer is exactly the kind of motion that
 * setting exists to suppress.
 */
export function shouldShowParticles(particles: boolean | undefined, intensity: Intensity): boolean {
  return Boolean(particles) && intensity === 'full';
}
