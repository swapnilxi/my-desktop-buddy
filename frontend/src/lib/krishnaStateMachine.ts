/**
 * Priority/cooldown state machine that arbitrates which `CharacterState`
 * Krishna is actually showing at any moment.
 *
 * Several sources can ask for a state change at once — a chat reply, the
 * live-voice status, the focus timer, the idle-timeout, a debug click. This
 * class is the single referee: it is pure and synchronous (no React, no
 * timers, no DOM), fed entirely through explicit `request(next, now)` calls,
 * which is what makes it directly unit-testable without fake timers.
 */

import type { CharacterState } from './krishnaCharacterState';
import type { Intensity } from './krishnaIntensity';

export type Priority =
  | 'critical'
  | 'listening'
  | 'thinking'
  | 'talking'
  | 'celebration'
  | 'wisdom'
  | 'encouraging'
  | 'focus'
  | 'idle';

/** Lower index = higher priority. */
export const PRIORITY_ORDER: Priority[] = [
  'critical',
  'listening',
  'thinking',
  'talking',
  'celebration',
  'wisdom',
  'encouraging',
  'focus',
  'idle',
];

export interface StateRequest {
  state: CharacterState;
  priority: Priority;
  minHoldMs: number;
  source: string;
  requestedAt: number;
}

/** How long `celebrating` stays on cooldown after being shown once, so a
 *  chatty run of CELEBRATING replies doesn't turn into a strobe light. */
const CELEBRATION_COOLDOWN_MS = 15000;

export class CharacterStateMachine {
  private current: StateRequest | null = null;
  private lastAppliedAt = 0;
  private cooldowns = new Map<CharacterState, number>();

  /**
   * Ask to switch to `next`. Returns whether the switch actually happened.
   *
   * A request is refused when: (a) its state is still on cooldown, or
   * (b) the current state hasn't held for its `minHoldMs` yet and the new
   * request isn't strictly higher priority. `critical` always wins
   * immediately, cooldown included — it's reserved for the debug panel,
   * where a click that gets silently swallowed is worse than one that
   * briefly fights the cooldown.
   */
  request(next: Omit<StateRequest, 'requestedAt'>, now: number = Date.now()): boolean {
    const readyAt = this.cooldowns.get(next.state) ?? 0;
    if (readyAt > now && next.priority !== 'critical') return false;

    if (this.current) {
      const holdRemaining = (this.lastAppliedAt + this.current.minHoldMs) - now;
      const nextRank = PRIORITY_ORDER.indexOf(next.priority);
      const curRank = PRIORITY_ORDER.indexOf(this.current.priority);
      // Lower rank number = higher priority, so `nextRank >= curRank` means
      // "next is the same tier or lower" — that's the case a live hold blocks.
      if (holdRemaining > 0 && nextRank >= curRank && next.priority !== 'critical') return false;
    }

    this.current = { ...next, requestedAt: now };
    this.lastAppliedAt = now;
    if (next.state === 'celebrating') {
      this.cooldowns.set('celebrating', now + CELEBRATION_COOLDOWN_MS);
    }
    return true;
  }

  get(): StateRequest | null {
    return this.current;
  }
}

/**
 * Default priority tier for a derived state, used whenever a caller doesn't
 * pass an explicit priority. Grouped by "what kind of signal is this":
 * listening/thinking track the live conversation loop, talking-family states
 * cover a reply's tone, focus-family states are the productivity timer, and
 * celebration is the one state with its own cooldown-backed tier.
 */
export function priorityForState(state: CharacterState): Priority {
  switch (state) {
    case 'idle':
    case 'sleeping':
      return 'idle';
    case 'listening':
      return 'listening';
    case 'thinking':
    case 'curious':
      return 'thinking';
    case 'focusing':
    case 'meditating':
      return 'focus';
    case 'celebrating':
      return 'celebration';
    case 'wisdom':
      return 'wisdom';
    case 'encouraging':
      return 'encouraging';
    case 'talking':
    case 'happy':
    case 'blessing':
    case 'concerned':
    case 'playful':
    case 'motivated':
    case 'surprised':
      return 'talking';
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

/**
 * How long (ms) a state should hold the stage before a same/lower-priority
 * request can bump it. Not pinned by spec — these are reasonable defaults:
 * idle-family states hold nothing (anything can interrupt idle), a reply's
 * talking-family states hold long enough to read as a deliberate expression
 * rather than a flicker, and celebrating holds the longest since it's meant
 * to register as a distinct moment.
 *
 * `intensity` scales holds up for 'minimal' (×1.5) so reduced-motion users
 * see fewer, longer-held transitions rather than the same flicker rate.
 */
export function minHoldForState(state: CharacterState, intensity: Intensity = 'full'): number {
  const base = (() => {
    switch (state) {
      case 'idle':
      case 'sleeping':
        return 0;
      case 'listening':
        return 300;
      case 'thinking':
      case 'curious':
        return 400;
      case 'focusing':
      case 'meditating':
        return 500;
      case 'surprised':
        return 500;
      case 'talking':
      case 'concerned':
      case 'encouraging':
        return 600;
      case 'wisdom':
      case 'happy':
      case 'blessing':
      case 'playful':
      case 'motivated':
        return 700;
      case 'celebrating':
        return 2000;
      default: {
        const _exhaustive: never = state;
        return _exhaustive;
      }
    }
  })();
  return intensity === 'minimal' ? Math.round(base * 1.5) : base;
}
