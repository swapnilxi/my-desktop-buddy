'use client';

import type { BuddyDefinition, BuddyType } from '../Buddies/types';
import { getBuddyDefinition } from '../Buddies/registry';

interface SpeechTrainingPanelProps {
  buddyType?: BuddyType | string;
  buddyName?: string;
  buddyDef?: BuddyDefinition;
}

export default function SpeechTrainingPanel({
  buddyType = 'hamster',
  buddyName,
  buddyDef,
}: SpeechTrainingPanelProps) {
  const effectiveDef = buddyDef || getBuddyDefinition(buddyType);
  const effectiveName = buddyName || effectiveDef.defaultName;
  const effectiveEmoji = effectiveDef.emoji;

  return (
    <div className="speech-panel">
      <span style={{ fontSize: '4rem' }}>🎙️</span>
      <h2 className="speech-coming-soon">Speech Training</h2>
      <p className="speech-subtitle">
        Train {effectiveName} to understand your voice patterns, custom commands, and preferred communication style.
        This feature is coming soon!
      </p>

      <div className="speech-scaffold">
        <div className="speech-scaffold-label">Custom Training Prompts</div>
        <textarea
          placeholder="Training prompt templates will appear here..."
          disabled
        />
      </div>

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
        {effectiveEmoji} {effectiveName} is excited to learn your voice!
      </p>
    </div>
  );
}
