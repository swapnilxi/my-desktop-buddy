'use client';

import React from 'react';
import type { BuddyMood, BuddyType, BuddySpriteProps } from './types';
import HamsterSprite from './Hamster/HamsterSprite';
import PandaSprite from './Panda/PandaSprite';
import { getBuddyDefinition } from './registry';

export interface BuddyRendererProps extends BuddySpriteProps {
  type?: BuddyType | string;
}

export default function BuddyRenderer({
  type = 'hamster',
  mood,
  color,
  name,
  greeting,
  isDragging,
  petStreak,
  onClick,
  onRefreshGreeting,
  onFeed,
}: BuddyRendererProps) {
  const buddyDef = getBuddyDefinition(type);
  const effectiveColor = color || buddyDef.defaultColor;
  const effectiveName = name || buddyDef.defaultName;

  if (type === 'panda') {
    return (
      <PandaSprite
        mood={mood}
        color={effectiveColor}
        name={effectiveName}
        greeting={greeting}
        isDragging={isDragging}
        petStreak={petStreak}
        onClick={onClick}
        onRefreshGreeting={onRefreshGreeting}
        onFeed={onFeed}
      />
    );
  }

  // Default to Hamster
  return (
    <HamsterSprite
      mood={mood}
      color={effectiveColor}
      name={effectiveName}
      greeting={greeting}
      isDragging={isDragging}
      petStreak={petStreak}
      onClick={onClick}
      onRefreshGreeting={onRefreshGreeting}
      onFeed={onFeed}
    />
  );
}
