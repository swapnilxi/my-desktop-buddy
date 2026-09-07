import { describe, expect, it } from 'vitest';
import {
  CHAKRA_SPEED_MAP,
  characterStateToBuddyMood,
  deriveCharacterState,
  resolveVisual,
  type CharacterState,
  type PresentationPayload,
} from './krishnaCharacterState';

function pres(animation: string): PresentationPayload {
  return { animation, chakra: 'CALM', voiceMode: 'NEUTRAL', particles: false };
}

const ALL_STATES: CharacterState[] = [
  'idle', 'listening', 'thinking', 'talking', 'happy', 'playful',
  'encouraging', 'wisdom', 'celebrating', 'blessing', 'concerned',
  'sleeping', 'focusing', 'curious', 'surprised', 'motivated', 'meditating',
];

describe('deriveCharacterState — base animation mapping', () => {
  const cases: [string, CharacterState][] = [
    ['IDLE', 'idle'],
    ['LISTENING', 'listening'],
    ['THINKING', 'thinking'],
    ['TALKING', 'talking'],
    ['HAPPY', 'happy'],
    ['CELEBRATING', 'celebrating'],
    ['FOCUSED', 'focusing'],
    ['MEDITATING', 'meditating'],
    ['WAVING', 'blessing'],
    ['EXCITED', 'playful'],
    ['CONCERNED', 'concerned'],
  ];

  it.each(cases)('%s -> %s', (animation, expected) => {
    expect(deriveCharacterState(pres(animation))).toBe(expected);
  });

  it('is case-insensitive-safe', () => {
    expect(deriveCharacterState(pres('talking'))).toBe('talking');
    expect(deriveCharacterState(pres('Happy'))).toBe('happy');
  });

  it('falls back to idle for an unrecognized animation, without throwing', () => {
    expect(() => deriveCharacterState(pres('NOT_A_REAL_ANIMATION'))).not.toThrow();
    expect(deriveCharacterState(pres('NOT_A_REAL_ANIMATION'))).toBe('idle');
    expect(deriveCharacterState(pres(''))).toBe('idle');
  });
});

describe('deriveCharacterState — hint-based refinement', () => {
  it('TALKING alone (no hint) stays talking', () => {
    expect(deriveCharacterState(pres('TALKING'))).toBe('talking');
  });

  it('TALKING + mode:wise upgrades to wisdom', () => {
    expect(deriveCharacterState(pres('TALKING'), { mode: 'wise' })).toBe('wisdom');
  });

  it('TALKING + mode:gita also upgrades to wisdom', () => {
    expect(deriveCharacterState(pres('TALKING'), { mode: 'gita' })).toBe('wisdom');
  });

  it('TALKING + mode:productivity upgrades to encouraging', () => {
    expect(deriveCharacterState(pres('TALKING'), { mode: 'productivity' })).toBe('encouraging');
  });

  it('TALKING + emotion:confused upgrades to curious', () => {
    expect(deriveCharacterState(pres('TALKING'), { emotion: 'confused' })).toBe('curious');
  });

  it('IDLE + emotion:confused upgrades to curious', () => {
    expect(deriveCharacterState(pres('IDLE'), { emotion: 'confused' })).toBe('curious');
  });

  it('IDLE + emotion:motivated upgrades to motivated', () => {
    expect(deriveCharacterState(pres('IDLE'), { emotion: 'motivated' })).toBe('motivated');
  });

  it('HAPPY + emotion:motivated upgrades to motivated', () => {
    expect(deriveCharacterState(pres('HAPPY'), { emotion: 'motivated' })).toBe('motivated');
  });

  it('IDLE + urgency:high upgrades to surprised', () => {
    expect(deriveCharacterState(pres('IDLE'), { urgency: 'high' })).toBe('surprised');
  });

  it('urgency:high does NOT upgrade a non-idle base (talking stays talking)', () => {
    expect(deriveCharacterState(pres('TALKING'), { urgency: 'high' })).toBe('talking');
  });

  it('a hint never fights a more specific base mapping (CELEBRATING stays celebrating)', () => {
    expect(deriveCharacterState(pres('CELEBRATING'), { emotion: 'motivated', mode: 'wise', urgency: 'high' }))
      .toBe('celebrating');
  });

  it('a hint never fights FOCUSED -> focusing either', () => {
    expect(deriveCharacterState(pres('FOCUSED'), { emotion: 'motivated' })).toBe('focusing');
  });
});

describe('resolveVisual — totality', () => {
  it.each(ALL_STATES)('%s resolves to a defined krishnaState/pose without throwing', (state) => {
    let result: ReturnType<typeof resolveVisual> | undefined;
    expect(() => { result = resolveVisual(state); }).not.toThrow();
    expect(result).toBeDefined();
    expect(result!.krishnaState).toBeTruthy();
    expect(result!.pose).toBeTruthy();
  });

  const UNCHANGED_BASE_CASES: Array<[CharacterState, string]> = [
    ['idle', 'idle'],
    ['listening', 'protector'],
    ['thinking', 'thinking'],
    ['talking', 'speaking'],
    ['happy', 'happy'],
    ['motivated', 'motivation'],
  ];

  it.each(UNCHANGED_BASE_CASES)(
    'the original core mapping is unchanged: %s -> krishnaState %s, no extraClass',
    (state, expectedKrishnaState) => {
      const result = resolveVisual(state);
      expect(result.krishnaState).toBe(expectedKrishnaState);
      expect(result.extraClass).toBeUndefined();
    },
  );

  const EXTRA_STATES: CharacterState[] = [
    'wisdom', 'celebrating', 'concerned', 'blessing', 'encouraging',
    'curious', 'surprised', 'playful', 'focusing', 'meditating', 'sleeping',
  ];

  it.each(EXTRA_STATES)(
    '%s now maps 1:1 to its own same-named krishnaState, with no extraClass',
    (state) => {
      const result = resolveVisual(state);
      expect(result.krishnaState).toBe(state);
      expect(result.pose).toBe('chakra');
      expect(result.extraClass).toBeUndefined();
    },
  );

  it('every one of the 11 extra states resolves to a krishnaState no other CharacterState also uses', () => {
    const ownerOf = new Map<string, CharacterState>();
    for (const state of ALL_STATES) {
      const { krishnaState } = resolveVisual(state);
      const existingOwner = ownerOf.get(krishnaState);
      if (existingOwner && EXTRA_STATES.includes(state)) {
        throw new Error(`krishnaState '${krishnaState}' is claimed by both '${existingOwner}' and '${state}'`);
      }
      ownerOf.set(krishnaState, state);
    }
    // Sanity check the assertion above actually ran against real distinct values.
    expect(new Set(EXTRA_STATES.map((s) => resolveVisual(s).krishnaState)).size).toBe(EXTRA_STATES.length);
  });

  it('no extraClass is ever produced any more (the field stays for shape-compatibility only)', () => {
    for (const state of ALL_STATES) {
      expect(resolveVisual(state).extraClass).toBeUndefined();
    }
  });
});

describe('characterStateToBuddyMood — totality', () => {
  it.each(ALL_STATES)('%s maps to a defined BuddyMood without throwing', (state) => {
    let mood: string | undefined;
    expect(() => { mood = characterStateToBuddyMood(state); }).not.toThrow();
    expect(mood).toBeTruthy();
  });
});

describe('CHAKRA_SPEED_MAP', () => {
  it('has an entry for every documented backend chakra value', () => {
    for (const key of ['CALM', 'FAST', 'SLOW', 'GLOW', 'BREATHE', 'ACCELERATE', 'CELEBRATE']) {
      expect(CHAKRA_SPEED_MAP[key]).toBeTruthy();
    }
  });
});
