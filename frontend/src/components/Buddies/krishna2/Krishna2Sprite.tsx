'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { BuddySpriteProps, BuddyMood } from '../types';
import styles from '../Krishna/krishna.module.css';
import { KrishnaDefs } from '../Krishna/KrishnaDefs';
import { KrishnaLowerBody } from './Krishna2_lower_body';
import { Krishna2Eyes } from './Krishna2Eyes';
import { KrishnaArms } from './krishna2_arms';
import krishna2BaseImg from './krishna2_base.png';

export type Krishna2Pose = 'crossHands' | 'chakra' | 'standing';

export type Krishna2State =
  | 'idle'
  | 'protector'
  | 'thinking'
  | 'happy'
  | 'motivation'
  | 'relax'
  | 'greeting'
  | 'clicked'
  | 'speaking';

export interface Krishna2Props {
  size?: 'sm' | 'md' | 'lg';
  state?: Krishna2State;
  mood?: 'idle' | 'happy' | 'wave' | 'chakra' | 'speaking' | BuddyMood;
  isSpeaking?: boolean;
  pose?: Krishna2Pose;
  className?: string;
  name?: string;
  greeting?: string;
  isDragging?: boolean;
  petStreak?: number;
  showDebugControls?: boolean;
  onStateChange?: (newState: Krishna2State) => void;
  onInteraction?: (type: 'click' | 'doubleClick' | 'rightClick') => void;
  onClick?: () => void;
  onRefreshGreeting?: () => void;
  onFeed?: () => void;
}

export function LittleKrishna2({
  size = 'md',
  state: stateProp,
  mood = 'idle',
  isSpeaking = false,
  pose = 'chakra',
  className = '',
  name = 'Krishna 2',
  greeting = 'Radhe Radhe! Welcome to Krishna 2! 🪶✨',
  isDragging = false,
  petStreak = 0,
  showDebugControls = false,
  onStateChange,
  onInteraction,
  onClick,
  onRefreshGreeting,
  onFeed,
}: Krishna2Props) {
  const deriveDefaultState = (): Krishna2State => {
    if (stateProp) return stateProp;
    if (mood === 'speaking' || isSpeaking) return 'speaking';
    if (mood === 'happy' || mood === 'excited') return 'happy';
    if (mood === 'thinking') return 'thinking';
    if (mood === 'waving' || mood === 'wave') return 'greeting';
    if (pose === 'crossHands' || (pose as string) === 'crossed') return 'idle';
    return 'protector';
  };

  const [activeState, setActiveState] = useState<Krishna2State>(deriveDefaultState());
  const [isBlinking, setIsBlinking] = useState(false);
  const autoReturnTimer = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    if (stateProp) {
      setActiveState(stateProp);
    } else {
      setActiveState(deriveDefaultState());
    }
  }, [stateProp, mood, pose]);

  const changeState = (newState: Krishna2State) => {
    setActiveState(newState);
    onStateChange?.(newState);
  };

  const triggerTemporaryState = (tempState: Krishna2State, durationMs: number) => {
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

  const allStates: Krishna2State[] = [
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
      data-pose={pose}
      data-state={activeState}
      data-mood={mood}
      onClick={handleSingleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleRightClick}
      title="Little Krishna 2 — Left-click to interact, Double-click to feed, Right-click to think 🧈"
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
          title="Click for a joyful thought from Little Krishna 2!"
        >
          <span className={styles.greetingText}>{getBubbleMessage()}</span>
        </div>
      )}

      {/* Ground Shadow */}
      <div className={styles.groundShadow} id="groundingShadow" />

      {/* Divine Golden Aura */}
      <div className={styles.divineAura} id="divineAuraGlow" />

      {/* ════════════════ LITTLE KRISHNA 2 — BASE PNG + VECTOR LOWER BODY ════════════════ */}
      <div className={`${styles.krishna} ${getStateClass()}`}>
        <svg
          viewBox="0 -95 380 710"
          className={styles.krishnaSvg}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          {/* SHARED SVG DEFINITIONS */}
          <KrishnaDefs />

          {/* BASE ARTWORK IMAGE (Upper Body Bust) */}
          <image
            href={krishna2BaseImg.src}
            x="0"
            y="-80"
            width="380"
            height="480.87"
            preserveAspectRatio="xMidYMid meet"
          />

          {/* VECTOR SVG ARMS & HANDS */}
          <KrishnaArms pose={pose} />

          {/* ANIMATABLE 3D EXPRESSIVE EYES, EYEBROWS & MOUTH */}
          <Krishna2Eyes isBlinking={isBlinking} state={activeState} />

          {/* VECTOR SVG LOWER BODY */}
          <KrishnaLowerBody pose={pose} />
        </svg>
      </div>
    </div>
  );
}

// Default export compatible with Desktop Buddy Sprite Renderer
export default function Krishna2Sprite(
  props: BuddySpriteProps & { state?: Krishna2State; size?: 'sm' | 'md' | 'lg'; pose?: Krishna2Pose | string; showDebugControls?: boolean }
) {
  return (
    <LittleKrishna2
      size={props.size || 'md'}
      state={props.state}
      mood={props.mood}
      pose={(props.pose as Krishna2Pose) || 'chakra'}
      name={props.name}
      greeting={props.greeting}
      isDragging={props.isDragging}
      petStreak={props.petStreak}
      showDebugControls={props.showDebugControls}
      onClick={props.onClick}
      onRefreshGreeting={props.onRefreshGreeting}
      onFeed={props.onFeed}
    />
  );
}
