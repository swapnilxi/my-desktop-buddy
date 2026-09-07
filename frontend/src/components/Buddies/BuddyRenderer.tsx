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
  /**
   * Krishna-only visual overrides from the character-state system
   * (useKrishnaCharacterState). Ignored by Hamster/Panda — `mood`/`pose`
   * remain the only channel those sprites read.
   */
  state?: string;
  chakra?: string;
  particles?: boolean;
  extraClass?: string;
}

export default function BuddyRenderer({
  type = 'hamster',
  mood,
  pose,
  size,
  color,
  name,
  greeting,
  isDragging,
  petStreak,
  onClick,
  onRefreshGreeting,
  onFeed,
  state,
  chakra,
  particles,
  extraClass,
}: BuddyRendererProps) {
  const buddyDef = getBuddyDefinition(type);
  const effectiveColor = color || buddyDef.defaultColor;
  const effectiveName = name || buddyDef.defaultName;

  if (type === 'krishna') {
    return (
      <KrishnaSprite
        mood={mood}
        pose={pose as any}
        state={state as KrishnaState | undefined}
        size={size}
        color={effectiveColor}
        name={effectiveName}
        greeting={greeting}
        isDragging={isDragging}
        petStreak={petStreak}
        onClick={onClick}
        onRefreshGreeting={onRefreshGreeting}
        onFeed={onFeed}
        chakra={chakra}
        particles={particles}
        extraClass={extraClass}
      />
    );
  }

  // HamsterSprite and PandaSprite are fixed-size SVG layouts, so scale the
  // rendered box rather than plumbing a size through every internal rule.
  const scaleWrap = (child: React.ReactNode) =>
    size && size !== 'md'
      ? <div className={`buddy-scale buddy-scale-${size}`}>{child}</div>
      : <>{child}</>;

  if (type === 'panda') {
    return scaleWrap(
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
  return scaleWrap(
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
