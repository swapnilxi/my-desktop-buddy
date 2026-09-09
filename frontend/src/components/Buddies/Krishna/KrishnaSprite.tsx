'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { BuddySpriteProps, BuddyMood } from '../types';
import styles from './krishna.module.css';
import { KrishnaArms } from './krishna_arms';
import { KrishnaDefs } from './KrishnaDefs';
import { KrishnaHead } from './KrishnaHead';
import { KrishnaTorso } from './KrishnaTorso';
import { KrishnaLowerBody } from './Krishna_lower_body';
import { KrishnaChakra } from './krishna_chakra';
import krishnaBaseImg from './krishna_base.png';
import { VIEWBOX } from './characterAnchors';

export type KrishnaPose = 'crossHands' | 'chakra' | 'standing';

export type KrishnaState =
  | 'idle'
  | 'protector'
  | 'thinking'
  | 'happy'
  | 'motivation'
  | 'relax'
  | 'greeting'
  | 'clicked'
  | 'speaking';

export interface KrishnaProps {
  size?: 'sm' | 'md' | 'lg';
  state?: KrishnaState;
  mood?: 'idle' | 'happy' | 'wave' | 'chakra' | 'speaking' | BuddyMood;
  isSpeaking?: boolean;
  pose?: KrishnaPose;
  className?: string;
  name?: string;
  greeting?: string;
  isDragging?: boolean;
  petStreak?: number;
  showDebugControls?: boolean;
  onStateChange?: (newState: KrishnaState) => void;
  onInteraction?: (type: 'click' | 'doubleClick' | 'rightClick') => void;
  onClick?: () => void;
  onRefreshGreeting?: () => void;
  onFeed?: () => void;
}

export function LittleKrishna({
  size = 'md',
  state: stateProp,
  mood = 'idle',
  isSpeaking = false,
  pose = 'chakra',
  className = '',
  name = 'Little Krishna',
  greeting = 'Radhe Radhe! Let us create something wonderful! 🪶✨',
  isDragging = false,
  petStreak = 0,
  showDebugControls = false,
  onStateChange,
  onInteraction,
  onClick,
  onRefreshGreeting,
  onFeed,
}: KrishnaProps) {
  const deriveDefaultState = (): KrishnaState => {
    if (stateProp) return stateProp;
    if (mood === 'speaking' || isSpeaking) return 'speaking';
    if (mood === 'happy' || mood === 'excited') return 'happy';
    if (mood === 'thinking') return 'thinking';
    if (mood === 'waving' || mood === 'wave') return 'greeting';
    if (pose === 'crossHands' || (pose as string) === 'crossed') return 'idle';
    return 'protector';
  };

  const [activeState, setActiveState] = useState<KrishnaState>(deriveDefaultState());
  const isSpeakingActive = activeState === 'speaking' || mood === 'speaking' || isSpeaking || (!!greeting && activeState === 'greeting');
  const [isBlinking, setIsBlinking] = useState(false);
  const autoReturnTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (stateProp) {
      setActiveState(stateProp);
    } else {
      setActiveState(deriveDefaultState());
    }
  }, [stateProp, mood, pose]);

  const changeState = (newState: KrishnaState) => {
    setActiveState(newState);
    onStateChange?.(newState);
  };

  // Randomized natural blink timer
  useEffect(() => {
    let blinkTimer: NodeJS.Timeout;
    let holdTimer: NodeJS.Timeout;
    const triggerBlinkCycle = () => {
      const nextDelay = Math.random() * 3500 + 2500;
      blinkTimer = setTimeout(() => {
        setIsBlinking(true);
        holdTimer = setTimeout(() => {
          setIsBlinking(false);
          triggerBlinkCycle();
        }, 140);
      }, nextDelay);
    };
    triggerBlinkCycle();
    return () => {
      clearTimeout(blinkTimer);
      clearTimeout(holdTimer);
    };
  }, []);

  // Periodic micro-action timer for life-like idle behaviors
  useEffect(() => {
    let microTimer: NodeJS.Timeout;
    const scheduleMicroAction = () => {
      const delay = Math.random() * 240000 + 60000;
      microTimer = setTimeout(() => {
        if (!stateProp && (activeState === 'idle' || activeState === 'protector')) {
          const microActions: KrishnaState[] = ['happy', 'motivation', 'greeting'];
          const randomAction = microActions[Math.floor(Math.random() * microActions.length)];
          triggerTemporaryState(randomAction, 3000);
        }
        scheduleMicroAction();
      }, delay);
    };
    scheduleMicroAction();
    return () => clearTimeout(microTimer);
  }, [stateProp, activeState, pose]);

  const triggerTemporaryState = (tempState: KrishnaState, durationMs: number) => {
    if (autoReturnTimer.current) clearTimeout(autoReturnTimer.current);
    const baseState = stateProp || 'protector';
    changeState(tempState);
    autoReturnTimer.current = setTimeout(() => {
      changeState(baseState);
    }, durationMs);
  };

  const handleSingleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onInteraction?.('click');
    onClick?.();
    triggerTemporaryState('clicked', 1500);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onInteraction?.('doubleClick');
    onFeed?.();
    triggerTemporaryState('happy', 2500);
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onInteraction?.('rightClick');
    triggerTemporaryState('thinking', 4000);
  };

  const getStateClass = () => {
    switch (activeState) {
      case 'protector':
        return styles.krishnaProtector;
      case 'thinking':
        return styles.krishnaThinking;
      case 'happy':
        return styles.krishnaHappy;
      case 'motivation':
        return styles.krishnaMotivation;
      case 'relax':
        return styles.krishnaRelax;
      case 'greeting':
        return styles.krishnaGreeting;
      case 'clicked':
        return styles.krishnaClicked;
      case 'idle':
      default:
        return styles.krishnaIdle;
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return styles.sizeSm;
      case 'lg':
        return styles.sizeLg;
      case 'md':
      default:
        return styles.sizeMd;
    }
  };

  const getBubbleMessage = () => {
    if (activeState === 'motivation') return "You've got this! Believe in yourself! ✨";
    if (activeState === 'happy') return 'Sweet butter brings endless joy! 🧈💖';
    if (activeState === 'greeting') return 'Radhe Radhe! Welcome back! 🌸';
    if (activeState === 'protector') return 'Divine light protects your journey ✨🪶';
    return greeting;
  };

  const allStates: KrishnaState[] = [
    'idle',
    'protector',
    'thinking',
    'happy',
    'motivation',
    'relax',
    'greeting',
    'clicked',
  ];

  return (
    <div
      className={`${styles.krishnaContainer} ${getSizeClass()} ${className}`}
      data-pose="chakra"
      data-state={activeState}
      data-mood={mood}
      onClick={handleSingleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleRightClick}
      title="Little Krishna — Left-click to interact, Double-click to feed, Right-click to think 🧈"
    >
      {/* Dev / Debug Control Toolbar */}
      {showDebugControls && (
        <div className={styles.debugToolbar} onClick={(e) => e.stopPropagation()}>
          {allStates.map((st) => (
            <button
              key={st}
              className={`${styles.debugBtn} ${activeState === st ? styles.debugBtnActive : ''}`}
              onClick={() => changeState(st)}
            >
              {st}
            </button>
          ))}
        </div>
      )}

      {/* Thought Bubble */}
      {activeState === 'thinking' && (
        <div className={styles.thoughtBubble}>
          <span>Hmm... 🤔</span>
        </div>
      )}

      {/* Speech Bubble */}
      {activeState !== 'thinking' && greeting && (
        <div
          className={styles.greetingBubble}
          onClick={(e) => {
            e.stopPropagation();
            onRefreshGreeting?.();
          }}
          title="Click for a joyful thought from Little Krishna!"
        >
          <span className={styles.greetingText}>{getBubbleMessage()}</span>
        </div>
      )}

      {/* Ground Shadow */}
      <div className={styles.groundShadow} id="groundingShadow" />

      {/* Divine Golden Aura */}
      <div className={styles.divineAura} id="divineAuraGlow" />

      {/* ════════════════ LITTLE KRISHNA — MASTER 3D CHARACTER MODEL ════════════════ */}
      <div className={`${styles.krishna} ${getStateClass()}`}>
        <svg
          viewBox={VIEWBOX}
          className={styles.krishnaSvg}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          {/* ════════════════ SHARED SVG DEFINITIONS ════════════════ */}
          <KrishnaDefs />\n\n


          {/* ════════════════ LAYER 2-4B: LOWER BODY (FEET, LEGS, DHOTI, ANKLETS) ════════════════ */}
          <KrishnaLowerBody pose={pose} />



          <KrishnaTorso />
          {/* ════════════════ LAYER 7: ARMS ════════════════ */}
          {/* Chakra pose: upper arms + left forearm & 4 fingers (without thumb) here. */}
          {/* Left thumb passed behind waist in Layer 3B. Four fingers wrap around front/side of waist. */}
          {/* Right forearm+hand rendered in Layer 8 (above hair). */}
          {/* All other poses: full arms rendered here, no Layer 8 split needed. */}
          {pose === 'chakra' ? (
            <>
              <KrishnaArms pose={pose} renderSide="all" renderLayer="upperArm" />
              {/* Subtle Waist Contact Shadow where fingers wrap around waist contour */}
              <ellipse cx="226" cy="286" rx="12" ry="6" fill="#315EA8" opacity="0.18" />
              <KrishnaArms pose={pose} renderSide="characterLeft" renderLayer="forearmAndHand" renderHandPart="withoutThumb" />
            </>
          ) : (
            <KrishnaArms pose={pose} renderSide="all" renderLayer="all" />
          )}


          <KrishnaHead isBlinking={isBlinking} isSpeaking={isSpeakingActive} activeState={activeState} />
          {/* ════════════════ LAYER 7: VOLUMETRIC 4-LAYER GOLD NECKLACE SYSTEM ════════════════ */}
          {/* Form-fitting jewellery system that physically wraps around the neck base and cascades over upper chest */}
          <g id="necklace" filter="url(#kSoftShadow)">

            {/* ── LAYER 1: NECK COLLAR / UPPER NECK CHAIN (WRAPS LOWER NECK BASE) ── */}
            {/* Soft Ambient Contact Shadow under collar against neck skin */}
            <path
              d="M 158 186 C 166 200, 214 200, 222 186"
              fill="none"
              stroke="#315EA8"
              strokeWidth="2.4"
              strokeLinecap="round"
              opacity="0.22"
            />
            {/* Gold Band hugging lower neck base contour */}
            <path
              d="M 158 184 C 166 198, 214 198, 222 184"
              fill="none"
              stroke="url(#kGoldGrad)"
              strokeWidth="3.6"
              strokeLinecap="round"
            />
            {/* Inner Gold Highlight Stroke */}
            <path
              d="M 160 183.5 C 168 197, 212 197, 220 183.5"
              fill="none"
              stroke="#FFF0A3"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.8"
            />

            {/* Layer 1 3D Gold Collar Beads (hugging neck curve) */}
            {[
              { cx: 161, cy: 187.5, r: 3.6 },
              { cx: 170, cy: 193.5, r: 3.8 },
              { cx: 179, cy: 196.5, r: 4.0 },
              { cx: 190, cy: 197.5, r: 4.4 }, // Center Throat Bead
              { cx: 201, cy: 196.5, r: 4.0 },
              { cx: 210, cy: 193.5, r: 3.8 },
              { cx: 219, cy: 187.5, r: 3.6 },
            ].map((b, i) => (
              <g key={`l1bead-${i}`}>
                <circle cx={b.cx} cy={b.cy} r={b.r} fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />
                <circle cx={b.cx - b.r * 0.3} cy={b.cy - b.r * 0.3} r={b.r * 0.35} fill="#FFF0A3" opacity="0.9" />
              </g>
            ))}
            {/* Center Collar Teardrop Gold Droplet */}
            <path
              d="M 188.5 204 C 188.5 201.5, 190 200, 190 200 C 190 200, 191.5 201.5, 191.5 204 C 191.5 206.5, 188.5 206.5, 188.5 204 Z"
              fill="url(#kGoldGrad)"
              stroke="#92400E"
              strokeWidth="0.5"
            />

            {/* ── LAYER 2: SHORT UPPER CHEST CHAIN (TRANSITION TO CHEST) ── */}
            {/* Soft Contact Shadow on upper chest skin */}
            <path
              d="M 152 192 C 166 216, 214 216, 228 192"
              fill="none"
              stroke="#315EA8"
              strokeWidth="2.2"
              strokeLinecap="round"
              opacity="0.18"
            />
            {/* Gold Chain draped across upper chest */}
            <path
              d="M 152 190 C 166 214, 214 214, 228 190"
              fill="none"
              stroke="url(#kGoldGrad)"
              strokeWidth="4.0"
              strokeLinecap="round"
            />
            <path
              d="M 154 189.5 C 167 213, 213 213, 226 189.5"
              fill="none"
              stroke="#FFF0A3"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.75"
            />

            {/* Layer 2 3D Gold Beads & Center Ruby Gem Inset */}
            {[
              { cx: 157, cy: 197, r: 3.6 },
              { cx: 167, cy: 205, r: 4.0 },
              { cx: 178, cy: 210, r: 4.3 },
              { cx: 190, cy: 212, r: 4.6, isRuby: true }, // Center Ruby Bead
              { cx: 202, cy: 210, r: 4.3 },
              { cx: 213, cy: 205, r: 4.0 },
              { cx: 223, cy: 197, r: 3.6 },
            ].map((b, i) => (
              <g key={`l2bead-${i}`}>
                <circle cx={b.cx} cy={b.cy} r={b.r} fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />
                {b.isRuby ? (
                  <>
                    <circle cx={b.cx} cy={b.cy} r={b.r * 0.55} fill="url(#kRubyBead)" stroke="#991B1B" strokeWidth="0.4" />
                    <circle cx={b.cx - b.r * 0.2} cy={b.cy - b.r * 0.2} r={b.r * 0.25} fill="#FFFFFF" opacity="0.9" />
                  </>
                ) : (
                  <circle cx={b.cx - b.r * 0.3} cy={b.cy - b.r * 0.3} r={b.r * 0.35} fill="#FFF0A3" opacity="0.9" />
                )}
              </g>
            ))}

            {/* ── LAYER 3: LONGER CENTRAL NECKLACE (DEEP SWEEPING CHEST CURVE) ── */}
            {/* Soft Contact Shadow on chest volume */}
            <path
              d="M 148 194 C 162 240, 218 240, 232 194"
              fill="none"
              stroke="#315EA8"
              strokeWidth="2.2"
              strokeLinecap="round"
              opacity="0.14"
            />
            {/* Main Volumetric Gold Chain */}
            <path
              d="M 148 192 C 162 238, 218 238, 232 192"
              fill="none"
              stroke="url(#kGoldGrad)"
              strokeWidth="4.2"
              strokeLinecap="round"
            />
            <path
              d="M 150 191.5 C 163 237, 217 237, 230 191.5"
              fill="none"
              stroke="#FFF0A3"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.7"
            />

            {/* Layer 3 3D Gold Accent Beads */}
            {[
              { cx: 153, cy: 202, r: 3.8 },
              { cx: 162, cy: 215, r: 4.2 },
              { cx: 174, cy: 227, r: 4.5 },
              { cx: 206, cy: 227, r: 4.5 },
              { cx: 218, cy: 215, r: 4.2 },
              { cx: 227, cy: 202, r: 3.8 },
            ].map((b, i) => (
              <g key={`l3bead-${i}`}>
                <circle cx={b.cx} cy={b.cy} r={b.r} fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />
                <circle cx={b.cx - b.r * 0.3} cy={b.cy - b.r * 0.3} r={b.r * 0.35} fill="#FFF0A3" opacity="0.9" />
              </g>
            ))}

            {/* ── LAYER 4: CENTRAL ORNATE MEDALLION PENDANT ── */}
            {/* Connecting Bail Ring at bottom vertex of Layer 3 (190, 237) */}
            <circle cx="190" cy="231" r="3.2" fill="none" stroke="url(#kGoldGrad)" strokeWidth="1.6" />
            <circle cx="190" cy="231" r="3.2" fill="none" stroke="#92400E" strokeWidth="0.4" />

            <g id="centralPendant" transform="translate(190, 240)">
              {/* Petal Accents */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((ang) => (
                <circle
                  key={ang}
                  cx={Math.cos((ang * Math.PI) / 180) * 9}
                  cy={Math.sin((ang * Math.PI) / 180) * 9}
                  r="2.8"
                  fill="url(#kGoldBead)"
                  stroke="#92400E"
                  strokeWidth="0.5"
                />
              ))}
              {/* Medallion Core */}
              <circle cx="0" cy="0" r="8.5" fill="url(#kGoldGrad)" stroke="#92400E" strokeWidth="1.2" />
              <circle cx="0" cy="0" r="5.5" fill="url(#kRubyBead)" stroke="#991B1B" strokeWidth="0.8" />
              <circle cx="-1.6" cy="-1.6" r="1.8" fill="#FFFFFF" opacity="0.9" />

              {/* Teardrop Droplet Hanging Below Medallion */}
              <path
                d="M -3 10 C -3 7, 0 5, 0 5 C 0 5, 3 7, 3 10 C 3 13, -3 13, -3 10 Z"
                fill="url(#kGoldGrad)"
                stroke="#92400E"
                strokeWidth="0.6"
              />
              <circle cx="0" cy="11.5" r="1.2" fill="#FFFFFF" opacity="0.85" />
            </g>

          </g>

          {/* ════════════════ LAYER 8: RIGHT FOREARM + HAND (CHAKRA POSE ONLY, IN FRONT OF HEAD) ════════════════ */}
          {/* Only splits for chakra pose. Other poses render arms fully in Layer 7 to avoid */}
          {/* the forearm appearing in front of necklaces/jewelry at chest level. */}
          {pose === 'chakra' && (
            <KrishnaArms pose={pose} renderSide="characterRight" renderLayer="forearmAndHand" />
          )}

          {/* ════════════════ LAYER 9: SUDARSHAN CHAKRA ════════════════ */}
          {/* Centered directly above the lowered index finger tip at (91, 56) */}
          <KrishnaChakra />

          {/* ── Chakra Index Finger Spin Contact (Active Divine Control in front of hub) ── */}
          {pose === 'chakra' && (
            <KrishnaArms pose={pose} renderSide="characterRight" renderLayer="forearmAndHand" renderHandPart="chakraIndexTip" />
          )}
          {/* REFERENCE BASE IMAGE */}
          {showDebugControls && (
            <image
              href={krishnaBaseImg.src}
              x="0"
              y="-140"
              width="380"
              height="620"
              opacity="0.5"
              preserveAspectRatio="xMidYMid meet"
              style={{ pointerEvents: 'none' }}
            />
          )}
        </svg>
      </div>
    </div>
  );
}

// Default export compatible with Desktop Buddy Sprite Renderer
export default function KrishnaSprite(
  props: BuddySpriteProps & { state?: KrishnaState; size?: 'sm' | 'md' | 'lg'; pose?: KrishnaPose | string; showDebugControls?: boolean }
) {
  return (
    <LittleKrishna
      state={props.state}
      mood={props.mood}
      pose={(props.pose as KrishnaPose) || 'chakra'}
      name={props.name || 'Little Krishna'}
      greeting={props.greeting}
      isDragging={props.isDragging}
      petStreak={props.petStreak}
      showDebugControls={props.showDebugControls}
      onClick={props.onClick}
      onRefreshGreeting={props.onRefreshGreeting}
      onFeed={props.onFeed}
      size={props.size || 'md'}
    />
  );
}
