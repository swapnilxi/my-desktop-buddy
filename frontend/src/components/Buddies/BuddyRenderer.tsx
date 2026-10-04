'use client';

import React from 'react';
import type { BuddyMood, BuddyType, BuddySpriteProps } from './types';
import HamsterSprite from './Hamster/HamsterSprite';
import PandaSprite from './Panda/PandaSprite';
import KrishnaSprite from './Krishna/KrishnaSprite';
import type { KrishnaState } from './Krishna/KrishnaSprite';
import { getBuddyDefinition } from './registry';

export interface BuddyRendererProps extends BuddySpriteProps {
  type?: BuddyType | string;
  /** Krishna only: render size, and a pinned state (undefined = react to mood). */
  size?: 'sm' | 'md' | 'lg';
  krishnaState?: KrishnaState;
}

export default function BuddyRenderer({
  type = 'hamster',
  size,
  krishnaState,
  mood,
  pose,
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

  if (type === 'krishna') {
    return (
      <KrishnaSprite
        size={size}
        state={krishnaState}
        mood={mood}
        pose={pose as any}
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
