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
  color = '#F2A653',
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
      {/* Soft Ground Shadow */}
      <div className={`hamster-ground-shadow ${isDragging ? 'shadow-lifted' : ''}`} />

      {/* Drag Grip Handle */}
      <div className="hamster-drag-handle-badge" title="Drag Hammy anywhere on screen!">
        <span className="drag-grip-icon">⠿</span>
      </div>

      <div
        className={`hamster hamster-${displayMood} ${transitioning ? 'transitioning' : ''}`}
        style={{
          '--hamster-color': color,
          '--hamster-color-light': '#FFC979',
          '--hamster-color-dark': '#EE9947',
          '--hamster-color-shadow': '#D77F35',
        } as React.CSSProperties}
      >
        {/* Floating Heart */}
        <div className="hamster-floating-heart">❤</div>

        {/* ══════════ 1. BODY & TORSO LAYER (Z-INDEX: 2) ══════════ */}
        <div className="hamster-body-layer">
          {/* Fluffy rounded tail */}
          <div className="hamster-tail" />

          {/* Body Flank Plush Fur Masses (3-4 Broad Soft Folds) */}
          <div className="body-fur-layer">
            <span className="fur-mass body-mass-l1" />
            <span className="fur-mass body-mass-l2" />
            <span className="fur-mass body-mass-r1" />
            <span className="fur-mass body-mass-r2" />
          </div>

          {/* Volumetric Torso Mass */}
          <div className="hamster-torso">
            {/* Soft Cream Belly */}
            <div className="hamster-belly">
              <div className="belly-glow" />
              {/* Lower Belly Soft Fur Folds */}
              <div className="belly-fur-layer">
                <span className="fur-mass belly-mass-1" />
                <span className="fur-mass belly-mass-2" />
                <span className="fur-mass belly-mass-3" />
              </div>
            </div>
          </div>

          {/* Soft Pink Hind Feet */}
          <div className="hamster-foot foot-left">
            <div className="foot-pad">
              <div className="toes-group">
                <span className="toe toe-1" />
                <span className="toe toe-2" />
                <span className="toe toe-3" />
              </div>
            </div>
          </div>
          <div className="hamster-foot foot-right">
            <div className="foot-pad">
              <div className="toes-group">
                <span className="toe toe-1" />
                <span className="toe toe-2" />
                <span className="toe toe-3" />
              </div>
            </div>
          </div>
        </div>

        {/* ══════════ 2. HEAD & FACE LAYER (Z-INDEX: 4) ══════════ */}
        <div className="hamster-head-layer">
          {/* Forehead Soft Fur Crest (3-4 Broad Rounded Locks) */}
          <div className="head-fur-layer">
            <span className="fur-mass head-mass-top1" />
            <span className="fur-mass head-mass-top2" />
            <span className="fur-mass head-mass-top3" />
            <span className="fur-mass head-mass-l1" />
            <span className="fur-mass head-mass-r1" />
          </div>

          {/* Large Plush Ears */}
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

          {/* Main Orange Head Mass */}
          <div className="head-main-mass">
            <div className="head-top-glow" />
          </div>

          {/* Soft Cream Cheek Masses & Color Transition */}
          <div className="hamster-cream-cheeks">
            {/* Broad Soft Cream Edge Folds */}
            <span className="fur-mass cheek-mass-l1" />
            <span className="fur-mass cheek-mass-l2" />
            <span className="fur-mass cheek-mass-r1" />
            <span className="fur-mass cheek-mass-r2" />

            <div className="cream-face-main" />
          </div>

          {/* Facial Features */}
          <div className="hamster-face">
            {/* Curved Eyebrows */}
            <div className="hamster-eyebrow eyebrow-left" />
            <div className="hamster-eyebrow eyebrow-right" />

            {/* Oversized Glossy 3D Dark-Brown Eyes */}
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

            {/* Translucent Whiskers */}
            <div className="hamster-whiskers whiskers-left">
              <span className="whisker w-top" />
              <span className="whisker w-mid" />
              <span className="whisker w-bot" />
            </div>
            <div className="hamster-whiskers whiskers-right">
              <span className="whisker w-top" />
              <span className="whisker w-mid" />
              <span className="whisker w-bot" />
            </div>

            {/* Cream Muzzle, Pink Button Nose & Open Mouth */}
            <div className="hamster-muzzle">
              <div className="muzzle-pad pad-left" />
              <div className="muzzle-pad pad-right" />

              <div className="hamster-nose">
                <div className="nose-highlight" />
              </div>

              <div className="hamster-philtrum" />

              <div className="hamster-mouth">
                <span className="hamster-tongue" />
              </div>
            </div>
          </div>
        </div>

        {/* ══════════ 3. FOREGROUND ARMS & SEED LAYER (Z-INDEX: 8) ══════════ */}
        <div className="seed-holding-assembly">
          {/* Sunflower Seed */}
          <div className="hamster-seed">
            <span className="seed-sheen" />
            <span className="seed-stripe stripe-center" />
            <span className="seed-stripe stripe-left" />
            <span className="seed-stripe stripe-right" />
          </div>

          {/* Left Plush Arm & Paw */}
          <div className="hamster-arm arm-left">
            <div className="arm-volume" />
            <div className="hamster-paw">
              <span className="paw-toe ptoe-1" />
              <span className="paw-toe ptoe-2" />
              <span className="paw-toe ptoe-3" />
            </div>
          </div>

          {/* Right Plush Arm & Paw */}
          <div className="hamster-arm arm-right">
            <div className="arm-volume" />
            <div className="hamster-paw">
              <span className="paw-toe ptoe-1" />
              <span className="paw-toe ptoe-2" />
              <span className="paw-toe ptoe-3" />
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

// Color utility functions for realistic fur gradient calculation
function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - percent);
  const g = Math.max(0, ((num >> 8) & 0x00ff) - percent);
  const b = Math.max(0, (num & 0x0000ff) - percent);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + percent);
  const g = Math.min(255, ((num >> 8) & 0x00ff) + percent);
  const b = Math.min(255, (num & 0x0000ff) + percent);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
