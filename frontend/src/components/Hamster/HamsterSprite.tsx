'use client';

import { useState, useEffect } from 'react';
import type { HamsterMood } from '@/lib/api';
import './hamster.css';

interface HamsterSpriteProps {
  mood: HamsterMood;
  color?: string;
  name?: string;
  greeting?: string;
  isDragging?: boolean;
  petStreak?: number;
  onClick?: () => void;
  onRefreshGreeting?: () => void;
  onFeed?: () => void;
}

export default function HamsterSprite({
  mood,
  color = '#DF8B34',
  name = 'Hammy',
  greeting = "Squeak! Let's build together! 🚀",
  isDragging = false,
  petStreak = 0,
  onClick,
  onRefreshGreeting,
  onFeed,
}: HamsterSpriteProps) {
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
      className={`hamster-container ${isDragging ? 'being-dragged' : ''} ${onClick ? 'interactive' : ''}`}
      onClick={onClick}
    >
      {/* Soft Ambient Ground Shadow */}
      <div className={`hamster-ground-shadow ${isDragging ? 'shadow-lifted' : ''}`} />

      {/* Drag Grip Handle */}
      <div className="hamster-drag-handle-badge" title="Drag Hammy anywhere on screen!">
        <span className="drag-grip-icon">⠿</span>
      </div>

      <div
        className={`hamster hamster-${displayMood} ${transitioning ? 'transitioning' : ''}`}
        style={{
          '--hamster-color': color,
          '--hamster-color-light': '#E89C46',
          '--hamster-color-dark': '#DF8B34',
          '--hamster-color-shadow': '#C77324',
        } as React.CSSProperties}
      >
        {/* Floating Heart */}
        <div className="hamster-floating-heart">❤</div>

        {/* ══════════ 1. BODY & TORSO LAYER (COMPACT BALL, Z-INDEX: 2) ══════════ */}
        <div className="hamster-body-layer">
          {/* Volumetric Torso Mass */}
          <div className="hamster-torso">
            {/* Soft Cream Belly */}
            <div className="hamster-belly">
              <div className="belly-glow" />
            </div>
          </div>

          {/* Anatomical Hind Feet with Main Pad & Distinct Toe Pads */}
          <div className="hamster-foot hamster-foot--left">
            <span className="paw-pad paw-pad--main" />
            <div className="paw-toes-cluster">
              <span className="paw-pad paw-pad--toe1" />
              <span className="paw-pad paw-pad--toe2" />
              <span className="paw-pad paw-pad--toe3" />
            </div>
          </div>
          <div className="hamster-foot hamster-foot--right">
            <span className="paw-pad paw-pad--main" />
            <div className="paw-toes-cluster">
              <span className="paw-pad paw-pad--toe1" />
              <span className="paw-pad paw-pad--toe2" />
              <span className="paw-pad paw-pad--toe3" />
            </div>
          </div>
        </div>

        {/* ══════════ 2. HEAD, CHEEKS & CROWN LAYER (Z-INDEX: 4) ══════════ */}
        <div className="hamster-head-layer">
          {/* Natural Messy Upward-Swept Crown Fur (7 Organic Tapered Tufts) */}
          <div className="hamster-crown">
            <span className="crown-tuft crown-tuft--left-outer" />
            <span className="crown-tuft crown-tuft--left" />
            <span className="crown-tuft crown-tuft--center-left" />
            <span className="crown-tuft crown-tuft--center" />
            <span className="crown-tuft crown-tuft--center-right" />
            <span className="crown-tuft crown-tuft--right" />
            <span className="crown-tuft crown-tuft--right-outer" />
          </div>

          {/* Tiny Rounded Hamster Ears */}
          <div className="hamster-ear ear-left">
            <div className="ear-outer">
              <div className="ear-inner" />
            </div>
          </div>
          <div className="hamster-ear ear-right">
            <div className="ear-outer">
              <div className="ear-inner" />
            </div>
          </div>

          {/* Head Base Mass (Wide Temples, Asymmetric Upper Forehead) */}
          <div className="head-base-mass">
            <div className="head-top-glow" />
          </div>

          {/* Plump Volumetric Cheek Pouches (Protruding Lateral Masses) */}
          <div className="hamster-cheeks-assembly">
            <div className="cheek-pouch left-cheek" />
            <div className="cheek-pouch right-cheek" />
            <div className="cheek-bridge-cream" />
          </div>

          {/* Facial Features */}
          <div className="hamster-face">
            {/* Subtle Eyebrows */}
            <div className="hamster-eyebrow eyebrow-left" />
            <div className="hamster-eyebrow eyebrow-right" />

            {/* Glossy Chocolate 3D Eyes */}
            <div className="hamster-eye-socket eye-socket-left">
              <div className="hamster-eye eye-left">
                <div className="eye-iris-glow" />
                <div className="eye-highlight-primary" />
                <div className="eye-highlight-secondary" />
              </div>
              <div className="eyelid-upper" />
            </div>

            <div className="hamster-eye-socket eye-socket-right">
              <div className="hamster-eye eye-right">
                <div className="eye-iris-glow" />
                <div className="eye-highlight-primary" />
                <div className="eye-highlight-secondary" />
              </div>
              <div className="eyelid-upper" />
            </div>

            {/* Diffuse Airbrushed Pink Cheek Blush */}
            <div className="hamster-blush blush-left" />
            <div className="hamster-blush blush-right" />

            {/* Natural Fine Hair Whiskers */}
            <div className="hamster-whiskers whiskers-left">
              <span className="whisker w-top" />
              <span className="whisker w-mid" />
              <span className="whisker w-bot" />
              <div className="whisker-dots">
                <span className="w-dot dot-1" />
                <span className="w-dot dot-2" />
                <span className="w-dot dot-3" />
              </div>
            </div>
            <div className="hamster-whiskers whiskers-right">
              <span className="whisker w-top" />
              <span className="whisker w-mid" />
              <span className="whisker w-bot" />
              <div className="whisker-dots">
                <span className="w-dot dot-1" />
                <span className="w-dot dot-2" />
                <span className="w-dot dot-3" />
              </div>
            </div>

            {/* Short Blunt Muzzle, Tiny Pink Nose & Cute Smile */}
            <div className="hamster-muzzle">
              <div className="muzzle-pad" />

              <div className="hamster-nose">
                <div className="nose-highlight" />
              </div>

              <div className="hamster-mouth">
                <span className="hamster-tongue" />
              </div>
            </div>
          </div>
        </div>

        {/* ══════════ 3. FOREGROUND SHORT ARMS & SEED LAYER (Z-INDEX: 8) ══════════ */}
        <div className="seed-holding-assembly">
          {/* Sunflower Seed */}
          <div className="hamster-seed">
            <span className="seed-sheen" />
            <span className="seed-stripe stripe-center" />
          </div>

          {/* Short Left Arm & Little Paws with Pink Pads */}
          <div className="hamster-arm arm-left">
            <div className="arm-volume" />
            <div className="hamster-paw">
              <span className="hand-pad hand-pad--main" />
              <span className="hand-pad hand-pad--toe" />
            </div>
          </div>

          {/* Short Right Arm & Little Paws with Pink Pads */}
          <div className="hamster-arm arm-right">
            <div className="arm-volume" />
            <div className="hamster-paw">
              <span className="hand-pad hand-pad--main" />
              <span className="hand-pad hand-pad--toe" />
            </div>
          </div>
        </div>

        {/* ══════════ 4. MOOD EFFECTS ══════════ */}
        {mood === 'thinking' && (
          <div className="thought-bubbles">
            <span className="thought-bubble bubble-1">·</span>
            <span className="thought-bubble bubble-2">·</span>
            <span className="thought-bubble bubble-3">💡</span>
          </div>
        )}

        {mood === 'happy' && (
          <div className="happy-hearts">
            <span className="heart-particle hp-1">💖</span>
            <span className="heart-particle hp-2">✨</span>
            <span className="heart-particle hp-3">💖</span>
          </div>
        )}

        {mood === 'listening' && (
          <div className="listening-waves">
            <span className="sound-wave w-1" />
            <span className="sound-wave w-2" />
            <span className="sound-wave w-3" />
          </div>
        )}

        {isDragging && (
          <div className="drag-halo">
            <span className="drag-sparkle">✦</span>
          </div>
        )}
      </div>

      {/* AI Greeting / Thought Speech Badge */}
      <div
        className="hamster-greeting-bubble"
        onClick={(e) => {
          e.stopPropagation();
          onRefreshGreeting?.();
        }}
        title="Click for a new thought from Hammy!"
      >
        <span className="greeting-text">{greeting}</span>
      </div>
    </div>
  );
}
