'use client';

import { useState, useEffect } from 'react';
import type { BuddySpriteProps } from '../types';
import './panda.css';

export interface PandaSpriteProps extends BuddySpriteProps {
  pose?: 'idle' | 'hold-bamboo' | 'wave' | 'eat' | 'sleep';
}

export default function PandaSprite({
  mood,
  pose = 'hold-bamboo',
  color = '#2D3748',
  name = 'Bambu',
  greeting = "Peaceful focus mode on! 🎋",
  isDragging = false,
  petStreak = 0,
  onClick,
  onRefreshGreeting,
  onFeed,
}: PandaSpriteProps) {
  const [prevMood, setPrevMood] = useState(mood);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (mood !== prevMood) {
      setTransitioning(true);
      const timer = setTimeout(() => {
        setPrevMood(mood);
        setTransitioning(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [mood, prevMood]);

  const displayMood = isDragging ? 'dragged' : (transitioning ? prevMood : mood);

  return (
    <div
      className={`panda-container ${isDragging ? 'being-dragged' : ''} ${onClick ? 'interactive' : ''}`}
      onClick={onClick}
    >
      {/* Ambient Ground Shadow */}
      <div className={`panda-ground-shadow ${isDragging ? 'shadow-lifted' : ''}`} />

      {/* AI Greeting / Thought Speech Badge ABOVE Panda */}
      <div
        className="panda-greeting-bubble"
        onClick={(e) => {
          e.stopPropagation();
          onRefreshGreeting?.();
        }}
        title="Click for a peaceful thought from Bambu!"
      >
        <span className="greeting-text">{greeting}</span>
      </div>

      <div
        className={`panda panda-${displayMood} ${transitioning ? 'transitioning' : ''}`}
        style={{
          '--panda-dark': color,
          '--panda-white': '#FFFFFF',
          '--panda-cream': '#F7FAFC',
          '--panda-bamboo-main': '#48BB78',
          '--panda-bamboo-dark': '#2F855A',
          '--panda-bamboo-light': '#9AE6B4',
        } as React.CSSProperties}
      >
        {/* Floating Heart when pet */}
        <div className="panda-floating-heart">💚</div>

        {/* ══════════ 1. BODY & TORSO LAYER ══════════ */}
        <div className="panda-body-layer">
          {/* Rear Feet with Soft Dark Pads */}
          <div className="panda-foot panda-foot--left">
            <div className="panda-foot-pad-main" />
            <div className="panda-toe-pads">
              <span className="panda-toe t1" />
              <span className="panda-toe t2" />
              <span className="panda-toe t3" />
            </div>
          </div>
          <div className="panda-foot panda-foot--right">
            <div className="panda-foot-pad-main" />
            <div className="panda-toe-pads">
              <span className="panda-toe t1" />
              <span className="panda-toe t2" />
              <span className="panda-toe t3" />
            </div>
          </div>

          {/* Chubby White Torso & Dark Upper Shoulder Vest */}
          <div className="panda-torso">
            {/* Dark shoulder band */}
            <div className="panda-shoulder-band" />
            {/* Soft White Chubby Belly */}
            <div className="panda-belly">
              <div className="panda-belly-highlight" />
            </div>
          </div>
        </div>

        {/* ══════════ 2. HEAD & FACIAL FEATURES ══════════ */}
        <div className="panda-head-layer">
          {/* Rounded Fluffy Black Ears */}
          <div className="panda-ear panda-ear--left">
            <div className="panda-ear-inner" />
          </div>
          <div className="panda-ear panda-ear--right">
            <div className="panda-ear-inner" />
          </div>

          {/* Chubby White Head Dome */}
          <div className="panda-head-mass">
            <div className="panda-head-shape">
              <div className="panda-cheeks-fluff-left" />
              <div className="panda-cheeks-fluff-right" />
            </div>

            {/* Signature Angled Black Eye Patches */}
            <div className="panda-eye-patch patch-left">
              <div className="panda-eye eye-left">
                <div className="eye-pupil" />
                <div className="eye-sparkle-main" />
                <div className="eye-sparkle-sub" />
              </div>
              <div className="panda-eyelid" />
            </div>

            <div className="panda-eye-patch patch-right">
              <div className="panda-eye eye-right">
                <div className="eye-pupil" />
                <div className="eye-sparkle-main" />
                <div className="eye-sparkle-sub" />
              </div>
              <div className="panda-eyelid" />
            </div>

            {/* Rosy Cheeks */}
            <div className="panda-blush blush-left" />
            <div className="panda-blush blush-right" />

            {/* Cute Rounded Snout & Mouth */}
            <div className="panda-muzzle">
              <div className="panda-nose">
                <span className="nose-shine" />
              </div>
              <div className="panda-mouth">
                <span className="mouth-left" />
                <span className="mouth-right" />
                <span className="panda-tongue" />
              </div>
            </div>
          </div>
        </div>

        {/* ══════════ 3. HELD BAMBOO STALK & ARMS ══════════ */}
        <div className={`panda-limbs-layer pose-${pose}`}>
          {/* Bamboo Stalk */}
          <div
            className="panda-bamboo-container"
            onClick={(e) => { e.stopPropagation(); onFeed?.(); }}
            title="Click to feed Bambu fresh bamboo! 🎋"
          >
            <div className="bamboo-stalk">
              <div className="bamboo-segment seg-1" />
              <div className="bamboo-ring r-1" />
              <div className="bamboo-segment seg-2" />
              <div className="bamboo-ring r-2" />
              <div className="bamboo-segment seg-3" />
              {/* Fresh Bamboo Leaves */}
              <div className="bamboo-leaf leaf-1" />
              <div className="bamboo-leaf leaf-2" />
              <div className="bamboo-leaf leaf-3" />
              <div className="bamboo-leaf leaf-4" />
            </div>
          </div>

          {/* Left Arm & Paw */}
          <div className="panda-arm panda-arm--left">
            <div className="panda-paw">
              <span className="paw-pad" />
            </div>
          </div>

          {/* Right Arm & Paw */}
          <div className="panda-arm panda-arm--right">
            <div className="panda-paw">
              <span className="paw-pad" />
            </div>
          </div>
        </div>

        {/* ══════════ 4. MOOD EFFECTS & PARTICLES ══════════ */}
        {mood === 'thinking' && (
          <div className="panda-thought-bubbles">
            <span className="thought-bubble pb-1">·</span>
            <span className="thought-bubble pb-2">·</span>
            <span className="thought-bubble pb-3">🎋💡</span>
          </div>
        )}

        {mood === 'happy' && (
          <div className="panda-happy-particles">
            <span className="happy-particle hp-1">💚</span>
            <span className="happy-particle hp-2">✨</span>
            <span className="happy-particle hp-3">🍃</span>
          </div>
        )}

        {mood === 'eating' && (
          <div className="panda-eat-crumbs">
            <span className="crumb c-1">🍃</span>
            <span className="crumb c-2">✨</span>
            <span className="crumb c-3">🎋</span>
          </div>
        )}

        {mood === 'listening' && (
          <div className="panda-listening-waves">
            <span className="sound-wave sw-1" />
            <span className="sound-wave sw-2" />
            <span className="sound-wave sw-3" />
          </div>
        )}

        {mood === 'sleeping' && (
          <div className="panda-sleep-particles">
            <span className="zzz z-1">Z</span>
            <span className="zzz z-2">z</span>
            <span className="zzz z-3">z</span>
          </div>
        )}

        {isDragging && (
          <div className="panda-drag-halo">
            <span className="drag-sparkle">✦</span>
          </div>
        )}
      </div>
    </div>
  );
}
