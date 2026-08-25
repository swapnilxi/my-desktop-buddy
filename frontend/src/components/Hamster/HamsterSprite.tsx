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
  onClick?: () => void;
  onRefreshGreeting?: () => void;
}

export default function HamsterSprite({
  mood,
  color = '#D4893A',
  name = 'Hammy',
  greeting = "Squeak! Let's build together! 🚀",
  isDragging = false,
  onClick,
  onRefreshGreeting,
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
      {/* Ambient shadow beneath Hammy */}
      <div className={`hamster-ground-shadow ${isDragging ? 'shadow-lifted' : ''}`} />

      {/* Glassmorphic Drag Grip Button (Icon Only) */}
      <div className="hamster-drag-handle-badge" title="Drag Hammy anywhere on screen!">
        <span className="drag-grip-icon">⠿</span>
      </div>

      <div
        className={`hamster hamster-${displayMood} ${transitioning ? 'transitioning' : ''}`}
        style={{
          '--hamster-color': color,
          '--hamster-color-dark': darkenColor(color, 28),
          '--hamster-color-light': lightenColor(color, 24),
          '--hamster-color-shadow': darkenColor(color, 45),
        } as React.CSSProperties}
      >
        {/* Fluffy Body & Back Markings */}
        <div className="hamster-body">
          {/* Fluffy rounded tail */}
          <div className="hamster-tail" />

          {/* Volumetric Torso with rich fur shading */}
          <div className="hamster-torso">
            {/* Subtle dorsal stripe / back fur contour */}
            <div className="hamster-fur-spine" />
            {/* Large Soft cream belly */}
            <div className="hamster-belly">
              <div className="hamster-chest-bib" />
            </div>
          </div>

          {/* Small Cute Peachy Back Feet tucked under body */}
          <div className="hamster-back-foot hamster-foot-left">
            <div className="foot-pad-main" />
            <div className="toes-group">
              <span className="toe toe-1" />
              <span className="toe toe-2" />
              <span className="toe toe-3" />
            </div>
          </div>
          <div className="hamster-back-foot hamster-foot-right">
            <div className="foot-pad-main" />
            <div className="toes-group">
              <span className="toe toe-1" />
              <span className="toe toe-2" />
              <span className="toe toe-3" />
            </div>
          </div>

          {/* Small Chubby Arms holding the sunflower seed in center */}
          <div className="seed-holding-assembly">
            {/* Glossy Striped Sunflower Seed */}
            <div className="hamster-seed">
              <span className="seed-stripe stripe-left" />
              <span className="seed-stripe stripe-center" />
              <span className="seed-stripe stripe-right" />
            </div>

            {/* Left Little Arm & Paw */}
            <div className="hamster-arm hamster-arm-left">
              <div className="arm-fur" />
              <div className="hamster-hand">
                <span className="finger finger-1" />
                <span className="finger finger-2" />
                <span className="finger finger-3" />
              </div>
            </div>

            {/* Right Little Arm & Paw */}
            <div className="hamster-arm hamster-arm-right">
              <div className="arm-fur" />
              <div className="hamster-hand">
                <span className="finger finger-1" />
                <span className="finger finger-2" />
                <span className="finger finger-3" />
              </div>
            </div>
          </div>

          {/* Volumetric Realistic Head */}
          <div className="hamster-head">
            {/* Soft Crown Fur Tuft / Hair Cowlick */}
            <div className="head-fur-tuft">
              <span className="tuft-strand strand-1" />
              <span className="tuft-strand strand-2" />
              <span className="tuft-strand strand-3" />
            </div>

            {/* Ears with translucent inner pink & outer fur contour */}
            <div className="hamster-ear hamster-ear-left">
              <div className="ear-inner" />
              <div className="ear-fuzz" />
            </div>
            <div className="hamster-ear hamster-ear-right">
              <div className="ear-inner" />
              <div className="ear-fuzz" />
            </div>

            {/* Persistent Floating Heart near left ear */}
            <div className="hamster-floating-heart">❤</div>

            {/* Forehead Fur Highlight */}
            <div className="head-fur-highlight" />

            {/* Cream Face Mask / Chubby Lower Cheeks */}
            <div className="hamster-cream-mask" />

            {/* Face Structure */}
            <div className="hamster-face">
              {/* Cute curved anime eyebrows */}
              <div className="hamster-eyebrow eyebrow-left" />
              <div className="hamster-eyebrow eyebrow-right" />

              {/* Glassy 3D Eyes with Specular Highlights */}
              <div className="hamster-eye-socket eye-socket-left">
                <div className="hamster-eye eye-left">
                  <div className="eye-iris" />
                  <div className="eye-pupil" />
                  <div className="eye-highlight-primary" />
                  <div className="eye-highlight-secondary" />
                  <div className="eye-rim-glow" />
                </div>
                <div className="eyelid eyelid-upper" />
              </div>

              <div className="hamster-eye-socket eye-socket-right">
                <div className="hamster-eye eye-right">
                  <div className="eye-iris" />
                  <div className="eye-pupil" />
                  <div className="eye-highlight-primary" />
                  <div className="eye-highlight-secondary" />
                  <div className="eye-rim-glow" />
                </div>
                <div className="eyelid eyelid-upper" />
              </div>

              {/* Chubby Blush Cheeks */}
              <div className="hamster-cheek cheek-left" />
              <div className="hamster-cheek cheek-right" />

              {/* Fluffy Muzzle & Nose */}
              <div className="hamster-muzzle">
                <div className="muzzle-pad pad-left" />
                <div className="muzzle-pad pad-right" />
                <div className="hamster-nose">
                  <div className="nostril nostril-left" />
                  <div className="nostril nostril-right" />
                  <div className="nose-highlight" />
                </div>
                <div className="hamster-philtrum" />
                <div className="hamster-mouth">
                  <div className="hamster-teeth-pair">
                    <span className="hamster-tooth tooth-left" />
                    <span className="hamster-tooth tooth-right" />
                  </div>
                  <span className="hamster-tongue" />
                </div>
              </div>

              {/* Anime Hair Whiskers */}
              <div className="hamster-whiskers whiskers-left">
                <span className="whisker whisker-top" />
                <span className="whisker whisker-bottom" />
              </div>
              <div className="hamster-whiskers whiskers-right">
                <span className="whisker whisker-top" />
                <span className="whisker whisker-bottom" />
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Mood Effects */}
        {mood === 'thinking' && (
          <div className="thought-bubbles">
            <span className="thought-bubble bubble-1">·</span>
            <span className="thought-bubble bubble-2">·</span>
            <span className="thought-bubble bubble-3">💡</span>
          </div>
        )}

        {mood === 'happy' && (
          <div className="happy-hearts">
            <span className="heart heart-1">💖</span>
            <span className="heart heart-2">✨</span>
            <span className="heart heart-3">💖</span>
          </div>
        )}

        {mood === 'listening' && (
          <div className="listening-waves">
            <span className="wave wave-1" />
            <span className="wave wave-2" />
            <span className="wave wave-3" />
          </div>
        )}

        {isDragging && (
          <div className="drag-indicator-halo">
            <span className="drag-sparkle">✦</span>
          </div>
        )}
      </div>

      {/* AI Greeting / Thought Speech Badge (2-6 words) */}
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
