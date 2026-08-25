'use client';

import { useState, useEffect } from 'react';
import type { HamsterMood } from '@/lib/api';
import './hamster.css';

interface HamsterSpriteProps {
  mood: HamsterMood;
  pose?: 'idle' | 'hold-seed' | 'wave' | 'reach' | 'tap' | 'eat' | 'shy';
  heldItem?: 'seed' | 'berry' | 'heart' | 'none';
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
  pose = 'hold-seed',
  heldItem = 'seed',
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

        {/* ══════════ 1. BODY & TORSO LAYER (PEAR-SHAPED TORSO, Z-INDEX: 2) ══════════ */}
        <div className="hamster-body-layer">
          {/* Fleshy Lower Haunches (Rear/Hip Sitting Volume) */}
          <div className="hamster-haunches">
            <span className="haunch-lobe haunch-left" />
            <span className="haunch-lobe haunch-right" />
          </div>

          {/* Pear-Shaped Torso Mass with Shoulders and Cream Belly */}
          <div className="hamster-torso">
            <div className="torso-neck-blend" />
            {/* Soft Cream Belly (Occupies 55% Torso Width with Wide Side Orange Fur) */}
            <div className="hamster-belly">
              <div className="belly-glow" />
            </div>
          </div>

          {/* Anatomical Hind Feet Emerging Underneath Lower Body (Independent Transform Origins) */}
          <div className="hamster-foot hamster-foot--left">
            <div className="foot-sole">
              <span className="foot-main-pad" />
              <div className="foot-toes-row">
                <span className="foot-toe t-left" />
                <span className="foot-toe t-mid" />
                <span className="foot-toe t-right" />
              </div>
            </div>
          </div>
          <div className="hamster-foot hamster-foot--right">
            <div className="foot-sole">
              <span className="foot-main-pad" />
              <div className="foot-toes-row">
                <span className="foot-toe t-left" />
                <span className="foot-toe t-mid" />
                <span className="foot-toe t-right" />
              </div>
            </div>
          </div>
        </div>

        {/* ══════════ 2. HEAD, CHEEKS & CURVED CROWN LAYER (Z-INDEX: 4) ══════════ */}
        <div className="hamster-head-layer">
          {/* Soft Flowing 3D Plush Forelock Fur Crest */}
          <div className="hamster-crown">
            <span className="crown-base-fluff" />
            <span className="crown-lock crown-lock-side" />
            <span className="crown-lock crown-lock-main">
              <span className="lock-highlight" />
            </span>
            <span className="crown-lock crown-lock-sub" />
            <span className="crown-lock crown-lock-front" />
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

          {/* Head Base Mass (Broad Temples, Fluffy Rounded Skull) */}
          <div className="head-base-mass">
            <div className="head-top-glow" />
            <div className="head-fur-gradient-blend" />
          </div>

          {/* Plump Volumetric Cheek Pouches (Widest Lateral Facial Volume) */}
          <div className="hamster-cheeks-assembly">
            <div className="cheek-flank-fur flank-left" />
            <div className="cheek-flank-fur flank-right" />
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

        {/* ══════════ 3. REUSABLE POSEABLE ARMS & HELD OBJECT LAYER (Z-INDEX: 8) ══════════ */}
        <div className={`hamster-limbs-layer pose-${pose}`}>
          {/* Independent Held Object Container */}
          {heldItem !== 'none' && (
            <div className="hamster-held-object-container">
              {heldItem === 'seed' && (
                <div className="hamster-seed" onClick={onFeed} title="Yummy sunflower seed!">
                  <span className="seed-sheen" />
                  <span className="seed-stripe stripe-center" />
                </div>
              )}
              {heldItem === 'berry' && (
                <div className="hamster-held-berry">
                  <span className="berry-body" />
                  <span className="berry-leaf" />
                </div>
              )}
              {heldItem === 'heart' && (
                <div className="hamster-held-heart">💖</div>
              )}
            </div>
          )}

          {/* Left Arm Assembly: Shoulder Pivot -> Upper Arm -> Forearm/Wrist -> Paw */}
          <div className="hamster-arm hamster-arm--left">
            <div className="arm-shoulder-joint">
              <div className="arm-volume">
                <div className="arm-fur-shading" />
              </div>
              <div className="hamster-paw hamster-paw--left">
                <div className="paw-fur-rim">
                  <div className="paw-pad-cluster">
                    <span className="paw-finger f-left" />
                    <span className="paw-finger f-mid" />
                    <span className="paw-finger f-right" />
                    <span className="paw-palm-pad" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Arm Assembly: Shoulder Pivot -> Upper Arm -> Forearm/Wrist -> Paw */}
          <div className="hamster-arm hamster-arm--right">
            <div className="arm-shoulder-joint">
              <div className="arm-volume">
                <div className="arm-fur-shading" />
              </div>
              <div className="hamster-paw hamster-paw--right">
                <div className="paw-fur-rim">
                  <div className="paw-pad-cluster">
                    <span className="paw-finger f-left" />
                    <span className="paw-finger f-mid" />
                    <span className="paw-finger f-right" />
                    <span className="paw-palm-pad" />
                  </div>
                </div>
              </div>
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
