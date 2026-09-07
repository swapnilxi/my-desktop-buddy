import { describe, expect, it } from 'vitest';
import { CharacterStateMachine, priorityForState, minHoldForState, PRIORITY_ORDER } from './krishnaStateMachine';
import type { StateRequest } from './krishnaStateMachine';

function req(overrides: Partial<Omit<StateRequest, 'requestedAt'>> = {}): Omit<StateRequest, 'requestedAt'> {
  return {
    state: 'idle',
    priority: 'idle',
    minHoldMs: 0,
    source: 'test',
    ...overrides,
  };
}

describe('CharacterStateMachine — basic accept/replace', () => {
  it('accepts the first request unconditionally', () => {
    const m = new CharacterStateMachine();
    expect(m.request(req({ state: 'thinking', priority: 'thinking' }), 1000)).toBe(true);
    expect(m.get()?.state).toBe('thinking');
  });

  it('accepts a same-priority request once minHoldMs has elapsed', () => {
    const m = new CharacterStateMachine();
    m.request(req({ state: 'talking', priority: 'talking', minHoldMs: 600 }), 0);
    // still within hold
    expect(m.request(req({ state: 'happy', priority: 'talking', minHoldMs: 600 }), 300)).toBe(false);
    // hold has elapsed
    expect(m.request(req({ state: 'happy', priority: 'talking', minHoldMs: 600 }), 601)).toBe(true);
    expect(m.get()?.state).toBe('happy');
  });
});

describe('CharacterStateMachine — priority preemption', () => {
  it('a strictly higher-priority request preempts mid-hold', () => {
    const m = new CharacterStateMachine();
    m.request(req({ state: 'idle', priority: 'idle', minHoldMs: 10000 }), 0);
    // 'talking' outranks 'idle' (lower index in PRIORITY_ORDER), so it should
    // preempt even though 'idle' hasn't held for its 10s yet.
    expect(m.request(req({ state: 'talking', priority: 'talking', minHoldMs: 600 }), 50)).toBe(true);
    expect(m.get()?.state).toBe('talking');
  });

  it('a same-or-lower priority request is refused mid-hold', () => {
    const m = new CharacterStateMachine();
    m.request(req({ state: 'talking', priority: 'talking', minHoldMs: 5000 }), 0);
    expect(m.request(req({ state: 'idle', priority: 'idle', minHoldMs: 0 }), 100)).toBe(false);
    expect(m.get()?.state).toBe('talking');
  });

  it('critical always wins immediately, even mid-hold and on cooldown', () => {
    const m = new CharacterStateMachine();
    m.request(req({ state: 'celebrating', priority: 'celebration', minHoldMs: 2000 }), 0);
    // A same-or-lower-priority request ('idle' ranks below 'celebration') is
    // refused mid-hold — this is the case 'critical' is meant to bypass.
    expect(m.request(req({ state: 'idle', priority: 'idle', minHoldMs: 0 }), 10)).toBe(false);
    // 'critical' (the debug panel's priority) preempts regardless.
    expect(m.request(req({ state: 'idle', priority: 'critical', minHoldMs: 0 }), 10)).toBe(true);
    expect(m.get()?.state).toBe('idle');
  });

  it('PRIORITY_ORDER ranks critical highest and idle lowest', () => {
    expect(PRIORITY_ORDER[0]).toBe('critical');
    expect(PRIORITY_ORDER[PRIORITY_ORDER.length - 1]).toBe('idle');
  });
});

describe('CharacterStateMachine — celebration cooldown', () => {
  it('refuses a second celebrating request within the cooldown window', () => {
    const m = new CharacterStateMachine();
    expect(m.request(req({ state: 'celebrating', priority: 'celebration', minHoldMs: 0 }), 0)).toBe(true);
    // Even after its own (short) hold has elapsed, the cooldown blocks a
    // second celebration.
    expect(m.request(req({ state: 'celebrating', priority: 'celebration', minHoldMs: 0 }), 5000)).toBe(false);
  });

  it('accepts celebrating again once the cooldown window has passed', () => {
    const m = new CharacterStateMachine();
    m.request(req({ state: 'celebrating', priority: 'celebration', minHoldMs: 0 }), 0);
    expect(m.request(req({ state: 'celebrating', priority: 'celebration', minHoldMs: 0 }), 15001)).toBe(true);
  });
});

describe('priorityForState / minHoldForState — totality', () => {
  const ALL_STATES = [
    'idle', 'listening', 'thinking', 'talking', 'happy', 'playful',
    'encouraging', 'wisdom', 'celebrating', 'blessing', 'concerned',
    'sleeping', 'focusing', 'curious', 'surprised', 'motivated', 'meditating',
  ] as const;

  it.each(ALL_STATES)('%s has a defined priority and non-negative minHold', (state) => {
    expect(PRIORITY_ORDER).toContain(priorityForState(state));
    expect(minHoldForState(state)).toBeGreaterThanOrEqual(0);
  });

  it('minimal intensity scales minHold up (x1.5)', () => {
    const full = minHoldForState('celebrating', 'full');
    const minimal = minHoldForState('celebrating', 'minimal');
    expect(minimal).toBe(Math.round(full * 1.5));
  });
});
