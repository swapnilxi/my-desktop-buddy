/**
 * Turns the backend's `presentation` + `classification` payloads into a
 * richer character-state enum, and maps that back down onto Krishna's
 * existing 9-value `KrishnaState` (and its 3-value `KrishnaPose`) so the
 * sprite and its CSS never have to grow new states.
 *
 * Pure logic only — no React, no DOM — so it is directly unit-testable.
 */

import type { KrishnaState, KrishnaPose } from '@/components/Buddies/Krishna/KrishnaSprite';
import type { BuddyMood } from '@/components/Buddies/types';
import type { Priority } from './krishnaStateMachine';

export type { Priority };

export type CharacterState =
  | 'idle' | 'listening' | 'thinking' | 'talking' | 'happy' | 'playful'
  | 'encouraging' | 'wisdom' | 'celebrating' | 'blessing' | 'concerned'
  | 'sleeping' | 'focusing' | 'curious' | 'surprised' | 'motivated' | 'meditating';

export interface PresentationPayload {
  animation: string;
  chakra: string;
  voiceMode: string;
  particles: boolean;
}

/** Mirrors the backend's classification object. All optional — a turn that
 *  didn't run classification (or an older backend) should refine nothing. */
export interface ClassificationHint {
  intent?: string;
  emotion?: string;
  mode?: string;
  urgency?: string;
}

const ANIMATION_TO_STATE: Record<string, CharacterState> = {
  IDLE: 'idle',
  LISTENING: 'listening',
  THINKING: 'thinking',
  TALKING: 'talking',
  HAPPY: 'happy',
  CELEBRATING: 'celebrating',
  FOCUSED: 'focusing',
  MEDITATING: 'meditating',
  WAVING: 'blessing',
  EXCITED: 'playful',
  CONCERNED: 'concerned',
};

/**
 * Only these base states get refined by a `hint` — every other base mapping
 * (e.g. `CELEBRATING` → `celebrating`) is already specific enough that a
 * classification hint refining it further would just be second-guessing a
 * more confident signal the backend already sent.
 */
const REFINABLE_BASE_STATES = new Set<CharacterState>(['talking', 'idle', 'happy']);

/**
 * Total: every input, recognized or not, produces a `CharacterState` —
 * never throws, never returns undefined. Unrecognized `animation` values
 * fall back to `'idle'`.
 */
export function deriveCharacterState(
  presentation: PresentationPayload,
  hint?: ClassificationHint,
): CharacterState {
  const animation = (presentation?.animation || '').toUpperCase();
  const base = ANIMATION_TO_STATE[animation] ?? 'idle';

  if (!hint || !REFINABLE_BASE_STATES.has(base)) return base;

  if ((hint.mode === 'wise' || hint.mode === 'gita') && base === 'talking') return 'wisdom';
  if (hint.mode === 'productivity' && base === 'talking') return 'encouraging';
  if (hint.emotion === 'confused' && (base === 'idle' || base === 'talking')) return 'curious';
  if (hint.emotion === 'motivated') return 'motivated';
  if (hint.urgency === 'high' && base === 'idle') return 'surprised';

  return base;
}

export interface ResolvedVisual {
  krishnaState: KrishnaState;
  pose: KrishnaPose;
  /** Optional CSS modifier class layered on top of the base state class —
   *  see the matching entries in krishna.module.css. */
  extraClass?: string;
}

/**
 * Maps the 17-value `CharacterState` onto Krishna's `KrishnaState`/
 * `KrishnaPose` union. This used to be many-to-few by design (several
 * `CharacterState`s sharing one `KrishnaState` plus an `extraClass` CSS
 * modifier) specifically to avoid authoring new keyframes. That constraint
 * has since been lifted — krishna.module.css now has a dedicated class +
 * keyframes per state — so this is now a 1:1 mapping for every state except
 * the original core that predates the character-state system: `idle`,
 * `listening`→`protector`, `thinking`, `talking`→`speaking`, `happy`, and
 * `motivated`→`motivation` still reuse those 6 pre-existing `KrishnaState`
 * values (unchanged by this pass). None of the cases below need `extraClass`
 * any more — each dedicated `krishnaState` class already carries its own
 * full look, so the field stays on `ResolvedVisual`/`KrishnaVisual` for
 * shape-compatibility but is always `undefined` here now.
 *
 * `pose` is intentionally constant `'chakra'` throughout: this system only
 * drives animation/expression, never the user's own crossed/chakra
 * hand-pose preference.
 *
 * Total by construction — the exhaustive switch below fails to compile (via
 * the `never` check in `default`) if `CharacterState` ever grows a member
 * this function doesn't handle.
 */
export function resolveVisual(state: CharacterState): ResolvedVisual {
  switch (state) {
    case 'idle':
      return { krishnaState: 'idle', pose: 'chakra' };
    case 'listening':
      return { krishnaState: 'protector', pose: 'chakra' };
    case 'thinking':
      return { krishnaState: 'thinking', pose: 'chakra' };
    case 'talking':
      return { krishnaState: 'speaking', pose: 'chakra' };
    case 'happy':
      return { krishnaState: 'happy', pose: 'chakra' };
    case 'motivated':
      return { krishnaState: 'motivation', pose: 'chakra' };
    // ── The 11 extra states — each now maps 1:1 to its own same-named,
    // dedicated KrishnaState/CSS class (krishna.module.css sections 8C–8M). ──
    case 'wisdom':
      return { krishnaState: 'wisdom', pose: 'chakra' };
    case 'celebrating':
      return { krishnaState: 'celebrating', pose: 'chakra' };
    case 'concerned':
      return { krishnaState: 'concerned', pose: 'chakra' };
    case 'blessing':
      return { krishnaState: 'blessing', pose: 'chakra' };
    case 'encouraging':
      return { krishnaState: 'encouraging', pose: 'chakra' };
    case 'curious':
      return { krishnaState: 'curious', pose: 'chakra' };
    case 'surprised':
      return { krishnaState: 'surprised', pose: 'chakra' };
    case 'playful':
      return { krishnaState: 'playful', pose: 'chakra' };
    case 'focusing':
      // Chakra slowdown is driven separately by the CHAKRA_SPEED_MAP/
      // effectiveChakraSpeed CSS-var mechanism (presentation.chakra is
      // 'SLOW' for FOCUSED) — krishnaFocusing itself just adds the calm,
      // minimal-amplitude breathing.
      return { krishnaState: 'focusing', pose: 'chakra' };
    case 'meditating':
      return { krishnaState: 'meditating', pose: 'chakra' };
    case 'sleeping':
      return { krishnaState: 'sleeping', pose: 'chakra' };
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

/**
 * `krishnaVisual.mood` compatibility fallback: `BuddySpriteProps.mood` is a
 * required field, so something has to be passed even though the sprite's
 * `state` prop (driven by `resolveVisual` above) is what actually determines
 * the rendered pose once it's provided. This only matters for the sliver of
 * behavior still keyed off `mood` inside KrishnaSprite (e.g. `isSpeakingActive`).
 */
export function characterStateToBuddyMood(state: CharacterState): BuddyMood {
  switch (state) {
    case 'idle':
    case 'concerned':
    case 'meditating':
      return 'idle';
    case 'sleeping':
      return 'sleeping';
    case 'listening':
      return 'listening';
    case 'thinking':
    case 'curious':
    case 'focusing':
      return 'thinking';
    case 'talking':
    case 'wisdom':
    case 'encouraging':
      return 'speaking';
    case 'happy':
    case 'celebrating':
      return 'happy';
    case 'playful':
    case 'motivated':
    case 'surprised':
      return 'excited';
    case 'blessing':
      return 'waving';
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

/** Base chakra-spin durations per backend `chakra` value. Read through
 *  `effectiveChakraSpeed` (krishnaIntensity.ts), which clamps the fast tier
 *  down under reduced/minimal intensity. */
export const CHAKRA_SPEED_MAP: Record<string, string> = {
  CALM: '12s',
  FAST: '4s',
  SLOW: '20s',
  GLOW: '12s',
  BREATHE: '18s',
  ACCELERATE: '3s',
  CELEBRATE: '2s',
};
