'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { BuddySpriteProps, BuddyMood } from '../types';
import styles from './krishna.module.css';

export type KrishnaPose = 'crossed' | 'chakra' | 'standing';

export type KrishnaState =
  | 'idle'
  | 'protector'
  | 'thinking'
  | 'happy'
  | 'motivation'
  | 'relax'
  | 'greeting'
  | 'clicked';

export interface KrishnaProps {
  size?: 'sm' | 'md' | 'lg';
  state?: KrishnaState;
  mood?: 'idle' | 'happy' | 'wave' | 'chakra' | BuddyMood;
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
    if (mood === 'happy' || mood === 'excited') return 'happy';
    if (mood === 'thinking') return 'thinking';
    if (mood === 'waving' || mood === 'wave') return 'greeting';
    if (pose === 'crossed') return 'idle';
    return 'protector';
  };

  const [activeState, setActiveState] = useState<KrishnaState>(deriveDefaultState());
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
          viewBox="0 -90 380 570"
          className={styles.krishnaSvg}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          <defs>
            {/* ── 3D Soft Skin Shaders (Periwinkle Blue #6BA7FF) ── */}
            <radialGradient id="kSkinFace" cx="44%" cy="34%" r="66%">
              <stop offset="0%" stopColor="#E2F0FF" />
              <stop offset="25%" stopColor="#A8D0FF" />
              <stop offset="60%" stopColor="#6BA7FF" />
              <stop offset="85%" stopColor="#417FD8" />
              <stop offset="100%" stopColor="#255BB5" />
            </radialGradient>

            <radialGradient id="kCheekVolumeLeft" cx="38%" cy="36%" r="60%">
              <stop offset="0%" stopColor="#EBF5FF" />
              <stop offset="45%" stopColor="#8CC0FF" />
              <stop offset="85%" stopColor="#5391F0" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3573D6" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="kCheekVolumeRight" cx="62%" cy="36%" r="60%">
              <stop offset="0%" stopColor="#EBF5FF" />
              <stop offset="45%" stopColor="#8CC0FF" />
              <stop offset="85%" stopColor="#5391F0" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3573D6" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="kForeheadGlow" cx="50%" cy="35%" r="55%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#D9ECFF" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#6BA7FF" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="kChinVolume" cx="50%" cy="40%" r="50%">
              <stop offset="0%" stopColor="#D9ECFF" stopOpacity="0.6" />
              <stop offset="70%" stopColor="#87BDFF" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#5B9AFA" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="kSkinBody" cx="40%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#CCE3FF" />
              <stop offset="32%" stopColor="#87BDFF" />
              <stop offset="68%" stopColor="#5B9AFA" />
              <stop offset="90%" stopColor="#3573D6" />
              <stop offset="100%" stopColor="#1E52B0" />
            </radialGradient>

            <radialGradient id="kSkinLimb" cx="38%" cy="28%" r="68%">
              <stop offset="0%" stopColor="#C4E0FF" />
              <stop offset="35%" stopColor="#82B7FF" />
              <stop offset="72%" stopColor="#5391F0" />
              <stop offset="100%" stopColor="#2A64C2" />
            </radialGradient>

            <radialGradient id="kSkinHand" cx="40%" cy="32%" r="65%">
              <stop offset="0%" stopColor="#E0F0FF" />
              <stop offset="38%" stopColor="#94C6FF" />
              <stop offset="76%" stopColor="#5897F4" />
              <stop offset="100%" stopColor="#2A66C6" />
            </radialGradient>

            {/* ── 3D Voluminous Curly Hair Shaders (#1E3A8A / Dark Blue-Black) ── */}
            <radialGradient id="kHairBase" cx="35%" cy="25%" r="75%">
              <stop offset="0%" stopColor="#283B5E" />
              <stop offset="38%" stopColor="#152138" />
              <stop offset="75%" stopColor="#0A111F" />
              <stop offset="100%" stopColor="#03060D" />
            </radialGradient>

            <radialGradient id="kHairCurl" cx="35%" cy="28%" r="68%">
              <stop offset="0%" stopColor="#3E557F" />
              <stop offset="35%" stopColor="#20304C" />
              <stop offset="72%" stopColor="#0E1728" />
              <stop offset="100%" stopColor="#050812" />
            </radialGradient>

            <radialGradient id="kHairHl" cx="32%" cy="26%" r="55%">
              <stop offset="0%" stopColor="#6CA0E8" stopOpacity="0.65" />
              <stop offset="50%" stopColor="#8EA9D4" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#1E2A3E" stopOpacity="0" />
            </radialGradient>

            {/* ── 3D Eyes (Warm Brown / Chocolate / Honey Amber) ── */}
            <radialGradient id="kIrisGrad" cx="36%" cy="30%" r="68%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="18%" stopColor="#F59E0B" />
              <stop offset="42%" stopColor="#B45309" />
              <stop offset="72%" stopColor="#78350F" />
              <stop offset="90%" stopColor="#451A03" />
              <stop offset="100%" stopColor="#1C0901" />
            </radialGradient>

            {/* ── Cheeks Rosy Blush (Soft & Delicate) ── */}
            <radialGradient id="kCheekBlush" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255, 110, 150, 0.45)" />
              <stop offset="55%" stopColor="rgba(255, 135, 170, 0.18)" />
              <stop offset="100%" stopColor="rgba(255, 135, 170, 0)" />
            </radialGradient>

            {/* ── Soft Toddler Lips ── */}
            <linearGradient id="kLipGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FB7185" />
              <stop offset="45%" stopColor="#E11D48" />
              <stop offset="100%" stopColor="#9F1239" />
            </linearGradient>

            {/* ── Metallic Gold Shaders (#F2C14E) ── */}
            <linearGradient id="kGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF9D6" />
              <stop offset="28%" stopColor="#FCD34D" />
              <stop offset="68%" stopColor="#F59E0B" />
              <stop offset="92%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#92400E" />
            </linearGradient>

            <radialGradient id="kGoldBead" cx="32%" cy="28%" r="65%">
              <stop offset="0%" stopColor="#FFFFEA" />
              <stop offset="32%" stopColor="#FCD34D" />
              <stop offset="70%" stopColor="#E08805" />
              <stop offset="100%" stopColor="#8A4A00" />
            </radialGradient>

            {/* ── Dhoti Fabric (#FFC83D) & Orange Sash (#FF8A00) ── */}
            <linearGradient id="kDhotiGrad" x1="15%" y1="0%" x2="85%" y2="100%">
              <stop offset="0%" stopColor="#FFF4AD" />
              <stop offset="25%" stopColor="#FFC83D" />
              <stop offset="65%" stopColor="#E59700" />
              <stop offset="90%" stopColor="#BA7100" />
              <stop offset="100%" stopColor="#8A5000" />
            </linearGradient>

            <linearGradient id="kSashGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFBA59" />
              <stop offset="35%" stopColor="#FF8A00" />
              <stop offset="75%" stopColor="#D96800" />
              <stop offset="100%" stopColor="#963C00" />
            </linearGradient>

            {/* ── Sudarshan Chakra Glow & Core ── */}
            <radialGradient id="kChakraCore" cx="35%" cy="28%" r="72%">
              <stop offset="0%" stopColor="#FFFFEE" />
              <stop offset="24%" stopColor="#FDE68A" />
              <stop offset="55%" stopColor="#F59E0B" />
              <stop offset="85%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#78350F" />
            </radialGradient>

            <radialGradient id="kChakraAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255, 230, 110, 0.65)" />
              <stop offset="50%" stopColor="rgba(255, 175, 20, 0.28)" />
              <stop offset="80%" stopColor="rgba(255, 140, 0, 0.1)" />
              <stop offset="100%" stopColor="rgba(255, 140, 0, 0)" />
            </radialGradient>

            {/* ── Peacock Feather Shaders ── */}
            <radialGradient id="kFeatherPlume" cx="44%" cy="38%" r="66%">
              <stop offset="0%" stopColor="#BEF264" />
              <stop offset="25%" stopColor="#4ADE80" />
              <stop offset="58%" stopColor="#16A34A" />
              <stop offset="88%" stopColor="#065F46" />
              <stop offset="100%" stopColor="#022C22" />
            </radialGradient>

            <radialGradient id="kFeatherEyeGold" cx="48%" cy="46%" r="62%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="26%" stopColor="#FBBF24" />
              <stop offset="60%" stopColor="#F59E0B" />
              <stop offset="88%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#7C2D12" />
            </radialGradient>

            <radialGradient id="kFeatherEyeCyan" cx="48%" cy="46%" r="60%">
              <stop offset="0%" stopColor="#E0F2FE" />
              <stop offset="30%" stopColor="#38BDF8" />
              <stop offset="70%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#0369A1" />
            </radialGradient>

            <radialGradient id="kFeatherEyeNavy" cx="46%" cy="38%" r="65%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="26%" stopColor="#1D4ED8" />
              <stop offset="65%" stopColor="#1E1B4B" />
              <stop offset="92%" stopColor="#0F172A" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>

            <radialGradient id="kFeatherEyeViolet" cx="44%" cy="38%" r="60%">
              <stop offset="0%" stopColor="#F472B6" />
              <stop offset="30%" stopColor="#C084FC" />
              <stop offset="65%" stopColor="#7E22CE" />
              <stop offset="90%" stopColor="#3B0764" />
              <stop offset="100%" stopColor="#180228" />
            </radialGradient>

            <linearGradient id="kFeatherStem" x1="0%" y1="100%" x2="30%" y2="0%">
              <stop offset="0%" stopColor="#854D0E" />
              <stop offset="40%" stopColor="#B45309" />
              <stop offset="80%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#FDE047" />
            </linearGradient>

            {/* ── Filters ── */}
            <filter id="kFeatherGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="1" stdDeviation="2.2" floodColor="#0F766E" floodOpacity="0.4" />
            </filter>

            <filter id="kSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#0F1B3D" floodOpacity="0.38" />
            </filter>

            <filter id="kChakraGlowFilter" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#F59E0B" floodOpacity="0.7" />
            </filter>
          </defs>

          {/* ════════════════ LAYER 1: BACK HAIR (BEHIND BODY) ════════════════ */}
          <g id="hairBackBehind" transform="translate(0, -20)">
            <circle cx="120" cy="116" r="38" fill="url(#kHairCurl)" />
            <ellipse cx="112" cy="110" rx="28" ry="22" fill="url(#kHairHl)" />
            <circle cx="102" cy="148" r="32" fill="url(#kHairCurl)" />
            <ellipse cx="95" cy="142" rx="24" ry="18" fill="url(#kHairHl)" />
            <circle cx="106" cy="178" r="28" fill="url(#kHairCurl)" />
            <ellipse cx="100" cy="172" rx="20" ry="16" fill="url(#kHairHl)" />

            <circle cx="260" cy="116" r="38" fill="url(#kHairCurl)" />
            <ellipse cx="268" cy="110" rx="28" ry="22" fill="url(#kHairHl)" />
            <circle cx="278" cy="148" r="32" fill="url(#kHairCurl)" />
            <ellipse cx="285" cy="142" rx="24" ry="18" fill="url(#kHairHl)" />
            <circle cx="274" cy="178" r="28" fill="url(#kHairCurl)" />
            <ellipse cx="280" cy="172" rx="20" ry="16" fill="url(#kHairHl)" />

            <circle cx="142" cy="84" r="40" fill="url(#kHairCurl)" />
            <ellipse cx="135" cy="78" rx="28" ry="22" fill="url(#kHairHl)" />
            <circle cx="190" cy="68" r="48" fill="url(#kHairCurl)" />
            <ellipse cx="190" cy="58" rx="36" ry="26" fill="url(#kHairHl)" />
            <circle cx="238" cy="84" r="40" fill="url(#kHairCurl)" />
            <ellipse cx="245" cy="78" rx="28" ry="22" fill="url(#kHairHl)" />
          </g>

          {/* ════════════════ LAYER 2: FEET & ANKLETS ════════════════ */}
          <g id="feet" filter="url(#kSoftShadow)">
            {/* Left Foot */}
            <g transform="translate(132, 388)">
              <path
                d="M 10 0 C 0 -2, -8 10, -6 22 C -4 30, 10 34, 28 28 C 38 24, 40 12, 30 4 C 22 0, 16 0, 10 0 Z"
                fill="url(#kSkinLimb)"
              />
              <circle cx="-3" cy="20" r="4.2" fill="url(#kSkinFace)" />
              <ellipse cx="-4" cy="19" rx="1.8" ry="1.2" fill="#FFFFFF" opacity="0.6" />
              <circle cx="4" cy="25" r="3.8" fill="url(#kSkinFace)" />
              <ellipse cx="3" cy="24" rx="1.6" ry="1.0" fill="#FFFFFF" opacity="0.55" />
              <circle cx="12" cy="27" r="3.4" fill="url(#kSkinFace)" />
              <circle cx="20" cy="27" r="3.1" fill="url(#kSkinFace)" />
              <circle cx="27" cy="25" r="2.7" fill="url(#kSkinFace)" />
              <ellipse cx="14" cy="4" rx="16" ry="4.5" fill="none" stroke="url(#kGoldGrad)" strokeWidth="4.5" />
              <circle cx="4" cy="8" r="3.2" fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />
              <circle cx="12" cy="10" r="3.6" fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />
              <circle cx="20" cy="8" r="3.2" fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />
            </g>

            {/* Right Foot */}
            <g transform="translate(216, 388)">
              <path
                d="M 12 0 C 2 -2, -4 10, -2 22 C 0 30, 14 34, 30 28 C 40 24, 40 12, 32 4 C 24 0, 18 0, 12 0 Z"
                fill="url(#kSkinLimb)"
              />
              <circle cx="-1" cy="20" r="4.2" fill="url(#kSkinFace)" />
              <ellipse cx="-2" cy="19" rx="1.8" ry="1.2" fill="#FFFFFF" opacity="0.6" />
              <circle cx="6" cy="25" r="3.8" fill="url(#kSkinFace)" />
              <ellipse cx="5" cy="24" rx="1.6" ry="1.0" fill="#FFFFFF" opacity="0.55" />
              <circle cx="14" cy="27" r="3.4" fill="url(#kSkinFace)" />
              <circle cx="22" cy="27" r="3.1" fill="url(#kSkinFace)" />
              <circle cx="29" cy="25" r="2.7" fill="url(#kSkinFace)" />
              <ellipse cx="16" cy="4" rx="16" ry="4.5" fill="none" stroke="url(#kGoldGrad)" strokeWidth="4.5" />
              <circle cx="6" cy="8" r="3.2" fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />
              <circle cx="14" cy="10" r="3.6" fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />
              <circle cx="22" cy="8" r="3.2" fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />
            </g>
          </g>

          {/* ════════════════ LAYER 3: LEGS ════════════════ */}
          <g id="legs">
            <path
              d="M 148 300 C 136 332, 134 366, 146 394"
              fill="none"
              stroke="url(#kSkinLimb)"
              strokeWidth="28"
              strokeLinecap="round"
            />
            <path
              d="M 148 300 C 136 332, 134 366, 146 394"
              fill="none"
              stroke="#D9ECFF"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.4"
            />
            <path
              d="M 232 300 C 244 332, 246 366, 234 394"
              fill="none"
              stroke="url(#kSkinLimb)"
              strokeWidth="28"
              strokeLinecap="round"
            />
            <path
              d="M 232 300 C 244 332, 246 366, 234 394"
              fill="none"
              stroke="#D9ECFF"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.4"
            />
          </g>

          {/* ════════════════ LAYER 4: DHOTI & SASH ════════════════ */}
          <g id="dhoti" filter="url(#kSoftShadow)">
            <path
              d="M 120 262 C 104 300, 108 400, 150 400 C 172 400, 180 344, 190 292
                 C 200 344, 208 400, 230 400 C 272 400, 276 300, 260 262 Z"
              fill="url(#kDhotiGrad)"
              stroke="#B37300"
              strokeWidth="1.4"
            />
            <path d="M 138 270 C 130 308, 134 378, 148 394" fill="none" stroke="#9E6100" strokeWidth="3.6" opacity="0.75" />
            <path d="M 158 272 C 152 312, 154 368, 162 388" fill="none" stroke="#D99700" strokeWidth="2.6" opacity="0.6" />
            <path d="M 242 270 C 250 308, 246 378, 232 394" fill="none" stroke="#9E6100" strokeWidth="3.6" opacity="0.75" />
            <path d="M 222 272 C 228 312, 226 368, 218 388" fill="none" stroke="#D99700" strokeWidth="2.6" opacity="0.6" />
            <path d="M 116 398 C 150 406, 230 406, 264 398" fill="none" stroke="url(#kGoldGrad)" strokeWidth="3.0" opacity="0.8" />

            {/* Orange Sash */}
            <path
              d="M 118 258 C 154 246, 226 246, 262 258 C 268 280, 230 292, 190 292 C 150 292, 112 280, 118 258 Z"
              fill="url(#kSashGrad)"
              stroke="#963C00"
              strokeWidth="1.4"
            />
            <path d="M 136 268 C 168 276, 212 276, 244 268" fill="none" stroke="#FFD285" strokeWidth="2.2" opacity="0.6" />

            <g id="waistGoldBells">
              <circle cx="152" cy="278" r="3.6" fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />
              <circle cx="170" cy="282" r="4.0" fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />
              <circle cx="190" cy="284" r="4.2" fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />
              <circle cx="210" cy="282" r="4.0" fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />
              <circle cx="228" cy="278" r="3.6" fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />
            </g>

            <g transform="translate(230, 280)" id="waistSashKnot">
              <ellipse cx="0" cy="0" rx="16" ry="14" fill="url(#kSashGrad)" stroke="#963C00" strokeWidth="1.4" />
              <ellipse cx="-2" cy="-2" rx="7" ry="5.5" fill="#FFE2A0" opacity="0.8" />
              <ellipse cx="0" cy="0" rx="3.5" ry="2.8" fill="#FFFBEB" opacity="0.95" />
            </g>

            <path
              id="waistSashTail"
              d="M 224 288 C 214 322, 230 390, 258 390 C 270 390, 258 322, 242 288 Z"
              fill="url(#kSashGrad)"
              stroke="#963C00"
              strokeWidth="1.4"
            />
            <path d="M 226 382 L 258 382" stroke="#FDE68A" strokeWidth="2.5" strokeDasharray="3 2" opacity="0.85" />
          </g>

          {/* ════════════════ LAYER 5: TORSO ════════════════ */}
          <g id="torso">
            <path
              d="M 136 172 C 126 210, 126 256, 140 268 C 170 274, 210 274, 240 268
                 C 254 256, 254 210, 244 172 Z"
              fill="url(#kSkinBody)"
            />
            <ellipse cx="190" cy="198" rx="38" ry="26" fill="#D9ECFF" opacity="0.22" />
            <ellipse cx="190" cy="242" rx="28" ry="18" fill="#CCE3FF" opacity="0.18" />
          </g>

          {/* ════════════════ LAYER 6: HEAD & FACE ════════════════ */}
          <g id="headGroup" transform="translate(0, -20)">
            {/* Front Side Wisps */}
            <g id="hairSides">
              <path d="M 116 148 C 104 164, 110 186, 126 190 C 134 192, 138 182, 130 174 C 124 168, 128 158, 134 156"
                fill="url(#kHairCurl)" stroke="#20304C" strokeWidth="0.8" />
              <path d="M 116 148 C 104 164, 110 186, 126 190"
                fill="none" stroke="#6CA0E8" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />

              <path d="M 264 148 C 276 164, 270 186, 254 190 C 246 192, 242 182, 250 174 C 256 168, 252 158, 246 156"
                fill="url(#kHairCurl)" stroke="#20304C" strokeWidth="0.8" />
              <path d="M 264 148 C 276 164, 270 186, 254 190"
                fill="none" stroke="#6CA0E8" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
            </g>

            {/* Ears + Hoop Earrings */}
            <g id="headBase">
              <g transform="translate(118, 162)">
                <ellipse cx="0" cy="0" rx="14" ry="18" fill="url(#kSkinFace)" />
                <ellipse cx="-4" cy="12" rx="12" ry="12" fill="url(#kGoldGrad)" stroke="#92400E" strokeWidth="1.4" />
                <ellipse cx="-4" cy="12" rx="6.5" ry="6.5" fill="#0A111F" />
                <circle cx="-4" cy="20" r="4.0" fill="#DC2626" stroke="#991B1B" strokeWidth="0.7" />
                <circle cx="-5.5" cy="18.8" r="1.5" fill="#FFFFFF" opacity="0.9" />
              </g>

              <g transform="translate(262, 162)">
                <ellipse cx="0" cy="0" rx="14" ry="18" fill="url(#kSkinFace)" />
                <ellipse cx="4" cy="12" rx="12" ry="12" fill="url(#kGoldGrad)" stroke="#92400E" strokeWidth="1.4" />
                <ellipse cx="4" cy="12" rx="6.5" ry="6.5" fill="#0A111F" />
                <circle cx="4" cy="20" r="4.0" fill="#DC2626" stroke="#991B1B" strokeWidth="0.7" />
                <circle cx="2.5" cy="18.8" r="1.5" fill="#FFFFFF" opacity="0.9" />
              </g>

              {/* 3D Volumetric Head Base with Rounded Toddler Proportions */}
              <ellipse cx="190" cy="154" rx="74" ry="66" fill="url(#kSkinFace)" />

              {/* Volumetric Chubby Cheeks */}
              <ellipse cx="136" cy="168" rx="38" ry="30" fill="url(#kCheekVolumeLeft)" opacity="0.95" />
              <ellipse cx="244" cy="168" rx="38" ry="30" fill="url(#kCheekVolumeRight)" opacity="0.95" />

              {/* 3D Forehead Spherical Highlight */}
              <ellipse cx="190" cy="124" rx="46" ry="24" fill="url(#kForeheadGlow)" />

              {/* Soft Chin Volume & Lower Jaw Shadow */}
              <ellipse cx="190" cy="200" rx="22" ry="13" fill="url(#kChinVolume)" />
              <ellipse cx="190" cy="214" rx="38" ry="10" fill="#1E3A8A" opacity="0.18" />

              {/* Subtle Rosy Toddler Blush */}
              <ellipse cx="136" cy="172" rx="24" ry="15" fill="url(#kCheekBlush)" transform="rotate(-5 136 172)" />
              <ellipse cx="244" cy="172" rx="24" ry="15" fill="url(#kCheekBlush)" transform="rotate(5 244 172)" />
            </g>

            {/* Master Face Details — Stylized, Expressive & High Fidelity */}
            <g id="faceDetails">
              {/* Vaishnava U-Tilak */}
              <path
                d="M 183 104 L 183 134 C 183 143, 197 143, 197 134 L 197 104"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
              <path
                d="M 185.5 106 L 185.5 133 C 185.5 138.5, 194.5 138.5, 194.5 133 L 194.5 106"
                fill="none"
                stroke="#FEF08A"
                strokeWidth="1.5"
                opacity="0.85"
              />
              <circle cx="190" cy="146" r="4.0" fill="#EA580C" stroke="#9A3412" strokeWidth="0.5" />
              <circle cx="190" cy="146" r="2.2" fill="#DC2626" />
              <circle cx="188.8" cy="144.8" r="1.3" fill="#FFFFFF" opacity="0.95" />

              {/* Very Small, Delicate Devotional White Dots Following Eyebrow Arch */}
              <g id="eyebrowDots" fill="#FFFFFF" opacity="0.95">
                {/* Left eyebrow white dots */}
                <circle cx="136" cy="127" r="1.3" />
                <circle cx="144" cy="123" r="1.4" />
                <circle cx="152" cy="121" r="1.5" />
                <circle cx="160" cy="122" r="1.4" />
                <circle cx="168" cy="126" r="1.3" />

                {/* Right eyebrow white dots */}
                <circle cx="212" cy="126" r="1.3" />
                <circle cx="220" cy="122" r="1.4" />
                <circle cx="228" cy="121" r="1.5" />
                <circle cx="236" cy="123" r="1.4" />
                <circle cx="244" cy="127" r="1.3" />
              </g>

              {/* Gentle Arched Eyebrows */}
              <path
                d="M 134 135 C 148 122, 168 124, 174 134"
                fill="none"
                stroke="#0F172A"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              <path
                d="M 246 135 C 232 122, 212 124, 206 134"
                fill="none"
                stroke="#0F172A"
                strokeWidth="2.8"
                strokeLinecap="round"
              />

              {/* ── Left Eye (Large, Warm, Expressive 3D Focal Point) ── */}
              <g transform="translate(133, 137)">
                {/* Sclera / Eye Base with Soft Shadow */}
                <path d="M 0 18 C 4 3, 40 2, 46 16 C 40 31, 4 32, 0 18 Z" fill="#FFFFFF" />
                <path d="M 4 10 C 14 6, 34 6, 42 12 C 34 8, 14 8, 4 10 Z" fill="#1E3A8A" opacity="0.1" />

                {/* Soft Eyelid Crease */}
                <path d="M 6 4 C 18 -1, 32 -1, 40 5" fill="none" stroke="#255BB5" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />

                {/* Warm Chocolate / Honey Amber Iris */}
                <circle cx="23" cy="17" r="16.5" fill="url(#kIrisGrad)" className={styles.iris} />
                <circle cx="23" cy="17" r="16.5" fill="none" stroke="#2D0F02" strokeWidth="1.2" opacity="0.75" />

                {/* Pupil */}
                <circle cx="23" cy="17" r="8.5" fill="#0C0502" />

                {/* Warm Amber Iris Reflection Arc */}
                <ellipse cx="23" cy="26" rx="9" ry="3" fill="#FDE047" opacity="0.5" />

                {/* Glossy 3D Catchlights */}
                <ellipse cx="29" cy="10.5" rx="6.2" ry="5.4" fill="#FFFFFF" />
                <circle cx="16" cy="24" r="3.0" fill="#FFFFFF" opacity="0.88" />
                <circle cx="31" cy="20" r="1.6" fill="#FFF9C4" opacity="0.7" />

                {/* Delicate Upper Lash Line */}
                <path
                  d="M 0 18 C 4 3, 40 2, 46 16"
                  fill="none"
                  stroke="#0F172A"
                  strokeWidth="3.0"
                  strokeLinecap="round"
                />
                {/* Soft Lower Lash Line */}
                <path
                  d="M 2 20 C 8 32, 38 31, 44 18"
                  fill="none"
                  stroke="#1E293B"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity="0.5"
                />

                {/* Animated Upper Eyelid for Blinking */}
                <path
                  d="M 0 18 C 4 3, 40 2, 46 16 C 38 9, 6 10, 0 18 Z"
                  fill="#5B9AFA"
                  className={`${styles.eyelidUpper} ${isBlinking ? styles.blinkActive : ''}`}
                />
              </g>

              {/* ── Right Eye (Large, Warm, Expressive 3D Focal Point) ── */}
              <g transform="translate(201, 137)">
                {/* Sclera / Eye Base with Soft Shadow */}
                <path d="M 0 16 C 6 2, 42 3, 46 18 C 42 32, 6 31, 0 16 Z" fill="#FFFFFF" />
                <path d="M 4 12 C 12 6, 32 6, 42 10 C 32 8, 12 8, 4 12 Z" fill="#1E3A8A" opacity="0.1" />

                {/* Soft Eyelid Crease */}
                <path d="M 6 5 C 14 -1, 28 -1, 40 4" fill="none" stroke="#255BB5" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />

                {/* Warm Chocolate / Honey Amber Iris */}
                <circle cx="23" cy="17" r="16.5" fill="url(#kIrisGrad)" className={styles.iris} />
                <circle cx="23" cy="17" r="16.5" fill="none" stroke="#2D0F02" strokeWidth="1.2" opacity="0.75" />

                {/* Pupil */}
                <circle cx="23" cy="17" r="8.5" fill="#0C0502" />

                {/* Warm Amber Iris Reflection Arc */}
                <ellipse cx="23" cy="26" rx="9" ry="3" fill="#FDE047" opacity="0.5" />

                {/* Glossy 3D Catchlights */}
                <ellipse cx="29" cy="10.5" rx="6.2" ry="5.4" fill="#FFFFFF" />
                <circle cx="16" cy="24" r="3.0" fill="#FFFFFF" opacity="0.88" />
                <circle cx="31" cy="20" r="1.6" fill="#FFF9C4" opacity="0.7" />

                {/* Delicate Upper Lash Line */}
                <path
                  d="M 0 16 C 6 2, 42 3, 46 18"
                  fill="none"
                  stroke="#0F172A"
                  strokeWidth="3.0"
                  strokeLinecap="round"
                />
                {/* Soft Lower Lash Line */}
                <path
                  d="M 2 18 C 8 31, 38 32, 44 20"
                  fill="none"
                  stroke="#1E293B"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity="0.5"
                />

                {/* Animated Upper Eyelid for Blinking */}
                <path
                  d="M 0 16 C 6 2, 42 3, 46 18 C 40 10, 8 9, 0 16 Z"
                  fill="#5B9AFA"
                  className={`${styles.eyelidUpper} ${isBlinking ? styles.blinkActive : ''}`}
                />
              </g>

              {/* ── Cute Small Rounded Button Nose ── */}
              <g transform="translate(190, 172)">
                <path d="M 0 -7 L 0 -1" stroke="#E0F2FE" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
                <ellipse cx="0" cy="3.5" rx="6.2" ry="3.0" fill="#1E40AF" opacity="0.22" />
                <ellipse cx="0" cy="1.5" rx="5.8" ry="3.8" fill="url(#kSkinFace)" />
                <circle cx="-3.2" cy="2.2" r="1.1" fill="#1E3A8A" opacity="0.32" />
                <circle cx="3.2" cy="2.2" r="1.1" fill="#1E3A8A" opacity="0.32" />
                <ellipse cx="-1.0" cy="0.6" rx="2.2" ry="1.3" fill="#FFFFFF" opacity="0.85" />
              </g>

              {/* ── Gentle Natural Smile (Toddler Rosy Lips) ── */}
              <g id="lipsGroup" transform="translate(190, 186)">
                {/* Corner Dimples */}
                <circle cx="-16.5" cy="-1" r="1.4" fill="#881337" opacity="0.35" />
                <circle cx="16.5" cy="-1" r="1.4" fill="#881337" opacity="0.35" />

                {/* Upper Lip Cupid's Bow */}
                <path
                  d="M -15 -1 C -8 -4.2, -3 -2.2, 0 -3.6 C 3 -2.2, 8 -4.2, 15 -1 Z"
                  fill="url(#kLipGrad)"
                  opacity="0.92"
                />
                {/* Smile Line */}
                <path
                  d="M -16 -1 C -8 5.5, 8 5.5, 16 -1"
                  fill="none"
                  stroke="#881337"
                  strokeWidth="2.0"
                  strokeLinecap="round"
                  className={styles.mouth}
                />
                {/* Lower Lip Fullness */}
                <path
                  d="M -12 0 C -6 6, 6 6, 12 0 C 6 4.5, -6 4.5, -12 0 Z"
                  fill="#FDA4AF"
                  opacity="0.95"
                />
                {/* Lip Gloss Shine Highlight */}
                <path
                  d="M -5 2.8 C -1.5 4.2, 1.5 4.2, 5 2.8"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  opacity="0.85"
                />
              </g>
            </g>

            {/* Topknot Bun */}
            <g id="crownTopknot">
              <ellipse cx="190" cy="74" rx="30" ry="26" fill="url(#kHairBase)" />
              <ellipse cx="176" cy="68" rx="13" ry="12" fill="url(#kHairCurl)" />
              <ellipse cx="204" cy="68" rx="13" ry="12" fill="url(#kHairCurl)" />
              <ellipse cx="190" cy="56" rx="14" ry="11" fill="url(#kHairCurl)" />
              <ellipse cx="184" cy="62" rx="18" ry="12" fill="url(#kHairHl)" />
              <rect x="166" y="86" width="48" height="8" rx="4" fill="url(#kGoldGrad)" stroke="#92400E" strokeWidth="0.8" />
              <rect x="174" y="87" width="32" height="3" rx="1.5" fill="#FEF08A" opacity="0.6" />
            </g>

            {/* Peacock Feather */}
            <g id="peacockFeather" className={styles.featherSvgAnim} filter="url(#kFeatherGlow)">
              <g transform="translate(160, 68) rotate(-22)">
                <path
                  d="M 16 30 C -34 10, -56 -40, -36 -84 C -18 -124, 24 -132, 50 -98
                     C 76 -62, 60 -6, 16 30 Z"
                  fill="url(#kFeatherPlume)"
                  stroke="#065F46"
                  strokeWidth="2.4"
                />
                <path
                  d="M 14 22 C -20 4, -34 -34, -18 -70 C -4 -98, 22 -104, 40 -78
                     C 56 -52, 46 -10, 14 22 Z"
                  fill="#16A34A"
                  opacity="0.65"
                />
                <path d="M 17 26 C 2 -20, 2 -60, 24 -106" fill="none" stroke="#BEF264" strokeWidth="2.4" strokeLinecap="round" opacity="0.85" />
                <path d="M 17 26 C -16 0, -28 -36, -26 -70" fill="none" stroke="#4ADE80" strokeWidth="2.0" strokeLinecap="round" opacity="0.8" />
                <path d="M 17 26 C 44 0, 58 -38, 48 -76" fill="none" stroke="#047857" strokeWidth="2.2" strokeLinecap="round" opacity="0.82" />
                <path d="M 17 26 C -38 -8, -52 -52, -38 -88" fill="none" stroke="#22C55E" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
                <path d="M 17 26 C 60 -6, 70 -46, 56 -82" fill="none" stroke="#065F46" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />

                <g transform="translate(14, -56) rotate(10)">
                  <ellipse cx="0" cy="0" rx="25" ry="34" fill="url(#kFeatherEyeGold)" stroke="#D97706" strokeWidth="1.8" />
                  <ellipse cx="0" cy="0" rx="18" ry="25" fill="url(#kFeatherEyeCyan)" stroke="#0284C7" strokeWidth="1.4" />
                  <ellipse cx="0" cy="0" rx="11" ry="16" fill="url(#kFeatherEyeNavy)" />
                  <ellipse cx="-2" cy="-3" rx="5.5" ry="9" fill="url(#kFeatherEyeViolet)" />
                  <path d="M -6 -11 C -2 -16, 4 -16, 8 -11" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" opacity="0.92" />
                  <circle cx="-4" cy="-7" r="2.2" fill="#FFFFFF" opacity="0.8" />
                </g>

                <path d="M 20 38 C 15 10, 12 -22, 14 -60" fill="none" stroke="url(#kFeatherStem)" strokeWidth="5.5" strokeLinecap="round" />
                <path d="M 20 38 C 15 10, 12 -22, 14 -60" fill="none" stroke="#FEF08A" strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
              </g>
            </g>
          </g>

          {/* ════════════════ LAYER 7: MULTI-STRAND GOLD NECKLACES ════════════════ */}
          <g id="necklace" filter="url(#kSoftShadow)">
            <path d="M 150 190 C 166 230, 214 230, 230 190" fill="none" stroke="url(#kGoldGrad)" strokeWidth="4.5" />
            <circle cx="160" cy="202" r="3.8" fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />
            <circle cx="160" cy="202" r="1.2" fill="#FFFFFF" opacity="0.9" />
            <circle cx="174" cy="212" r="4.0" fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />
            <circle cx="174" cy="212" r="1.3" fill="#FFFFFF" opacity="0.9" />
            <circle cx="190" cy="216" r="4.4" fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />
            <circle cx="190" cy="216" r="1.4" fill="#FFFFFF" opacity="0.9" />
            <circle cx="206" cy="212" r="4.0" fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />
            <circle cx="206" cy="212" r="1.3" fill="#FFFFFF" opacity="0.9" />
            <circle cx="220" cy="202" r="3.8" fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />
            <circle cx="220" cy="202" r="1.2" fill="#FFFFFF" opacity="0.9" />

            <path d="M 158 190 C 172 220, 208 220, 222 190" fill="none" stroke="url(#kGoldGrad)" strokeWidth="3.2" />
            <circle cx="172" cy="206" r="3.2" fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />
            <circle cx="190" cy="210" r="3.6" fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />
            <circle cx="208" cy="206" r="3.2" fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />

            <path d="M 166 190 C 176 210, 204 210, 214 190" fill="none" stroke="url(#kGoldGrad)" strokeWidth="2.4" />

            <g transform="translate(190, 224)">
              <circle cx="0" cy="0" r="10" fill="url(#kGoldGrad)" stroke="#92400E" strokeWidth="1.2" />
              <circle cx="0" cy="0" r="6" fill="#DC2626" stroke="#991B1B" strokeWidth="0.7" />
              <circle cx="-2" cy="-2" r="2" fill="#FFFFFF" opacity="0.9" />
              <circle cx="0" cy="12" r="4.2" fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.6" />
              <circle cx="0" cy="12" r="1.4" fill="#FFFFFF" opacity="0.85" />
            </g>
          </g>

          {/* ════════════════ LAYER 8: ARMS & SCULPTED HANDS (IN FRONT OF HEAD & BODY) ════════════════ */}
          <g id="canonicalChakraArms" filter="url(#kSoftShadow)">
            {/* ── A. RAISED RIGHT ARM (Viewer's Left - Character's Right) ── */}
            {/* Upper Arm coming down and out to elbow */}
            <path
              d="M 144 190 C 118 184, 94 192, 94 218 L 94 150"
              fill="none"
              stroke="url(#kSkinBody)"
              strokeWidth="26"
              strokeLinecap="round"
            />
            <path
              d="M 144 190 C 118 184, 94 192, 94 218"
              fill="none"
              stroke="#D9ECFF"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.5"
            />

            {/* Forearm rising vertically from elbow to wrist */}
            <path
              d="M 94 218 L 94 148"
              fill="none"
              stroke="url(#kSkinLimb)"
              strokeWidth="24"
              strokeLinecap="round"
            />
            <path
              d="M 92 210 L 92 150"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3.2"
              strokeLinecap="round"
              opacity="0.45"
            />

            {/* Gold Armlet on Bicep */}
            <g transform="translate(108, 196) rotate(14)">
              <ellipse cx="0" cy="0" rx="10" ry="4.5" fill="url(#kGoldGrad)" stroke="#92400E" strokeWidth="0.8" />
              <ellipse cx="0" cy="-1" rx="6" ry="2" fill="#FFFFFF" opacity="0.5" />
            </g>

            {/* 3 Gold Bangles on Raised Wrist */}
            <g transform="translate(81, 138)">
              <ellipse cx="13" cy="2" rx="13" ry="3.5" fill="url(#kGoldGrad)" stroke="#92400E" strokeWidth="0.6" />
              <ellipse cx="10" cy="1" rx="7" ry="1.2" fill="#FFFFFF" opacity="0.65" />
              <ellipse cx="13" cy="7" rx="13" ry="3.5" fill="url(#kGoldGrad)" stroke="#92400E" strokeWidth="0.6" />
              <ellipse cx="10" cy="6" rx="7" ry="1.2" fill="#FFFFFF" opacity="0.65" />
              <ellipse cx="13" cy="12" rx="13" ry="3.5" fill="url(#kGoldGrad)" stroke="#92400E" strokeWidth="0.6" />
              <ellipse cx="10" cy="11" rx="7" ry="1.2" fill="#FFFFFF" opacity="0.65" />
            </g>

            {/* ── 3D SCULPTED TODDLER FIST WITH ERECT INDEX FINGER (Cheek / Ear Level) ── */}
            <g id="sculptedChakraHand" transform="translate(94, 126)">
              {/* Palm Body */}
              <path
                d="M -12 10 C -14 0, -12 -10, -4 -16 C 4 -16, 14 -12, 14 0 C 14 10, 8 18, -4 18 C -10 18, -12 14, -12 10 Z"
                fill="url(#kSkinHand)"
              />
              <path d="M -8 8 C -2 12, 6 12, 10 6" fill="none" stroke="#255BB5" strokeWidth="1.2" opacity="0.3" />

              {/* Pinky */}
              <path
                d="M 2 8 C 8 7, 13 9, 13 13 C 13 16, 7 17, 1 16"
                fill="url(#kSkinFace)"
                stroke="#255BB5"
                strokeWidth="0.8"
              />
              <circle cx="9" cy="12" r="1.5" fill="#FFFFFF" opacity="0.5" />

              {/* Ring Finger */}
              <path
                d="M 1 1 C 8 0, 15 2, 15 7 C 15 11, 7 12, 0 10"
                fill="url(#kSkinFace)"
                stroke="#255BB5"
                strokeWidth="0.8"
              />
              <circle cx="10" cy="6" r="1.6" fill="#FFFFFF" opacity="0.5" />

              {/* Middle Finger */}
              <path
                d="M 0 -7 C 8 -8, 16 -6, 16 -1 C 16 4, 8 5, 0 3"
                fill="url(#kSkinFace)"
                stroke="#255BB5"
                strokeWidth="0.8"
              />
              <circle cx="11" cy="-1" r="1.8" fill="#FFFFFF" opacity="0.55" />

              {/* Thumb */}
              <path
                d="M -13 4 C -14 -4, -8 -8, 0 -6 C 5 -4, 6 0, 4 4 C 1 8, -6 10, -13 4 Z"
                fill="url(#kSkinFace)"
                stroke="#255BB5"
                strokeWidth="0.8"
              />
              <ellipse cx="-4" cy="-2" rx="3.5" ry="2.2" fill="#FFFFFF" opacity="0.5" />
              <path d="M -10 2 C -6 4, -2 4, 2 0" fill="none" stroke="#255BB5" strokeWidth="0.8" opacity="0.4" />

              {/* Extended Index Finger (Fingertip at y=88) */}
              <path
                d="M -7 -14 L -7 -38 C -7 -44, 1 -44, 1 -38 L 1 -14 Z"
                fill="url(#kSkinFace)"
                stroke="#255BB5"
                strokeWidth="0.8"
              />
              <ellipse cx="-3" cy="-38" rx="4.2" ry="5.0" fill="url(#kSkinFace)" />
              <ellipse cx="-3" cy="-40" rx="2.5" ry="3.2" fill="#E8F4FF" opacity="0.9" />
              <path
                d="M -4 -16 L -4 -38"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2.0"
                strokeLinecap="round"
                opacity="0.65"
              />
              <path d="M -6 -26 C -4 -25, -2 -25, 0 -26" fill="none" stroke="#255BB5" strokeWidth="0.8" opacity="0.35" />
            </g>

            {/* ── B. LEFT ARM ON HIP (Viewer's Right) ── */}
            <path
              d="M 234 190 C 262 208, 276 230, 268 254"
              fill="none"
              stroke="url(#kSkinBody)"
              strokeWidth="26"
              strokeLinecap="round"
            />
            <path
              d="M 234 190 C 262 208, 276 230, 268 254"
              fill="none"
              stroke="#D9ECFF"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.45"
            />

            <path
              d="M 268 254 C 262 268, 252 276, 238 276"
              fill="none"
              stroke="url(#kSkinLimb)"
              strokeWidth="24"
              strokeLinecap="round"
            />
            <path
              d="M 266 256 C 260 268, 250 274, 238 274"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3.0"
              strokeLinecap="round"
              opacity="0.4"
            />

            <g transform="translate(254, 218) rotate(-18)">
              <ellipse cx="0" cy="0" rx="10" ry="4.5" fill="url(#kGoldGrad)" stroke="#92400E" strokeWidth="0.8" />
              <ellipse cx="0" cy="-1" rx="6" ry="2" fill="#FFFFFF" opacity="0.5" />
            </g>

            <g transform="translate(242, 272) rotate(-28)">
              <ellipse cx="12" cy="0" rx="13" ry="3.5" fill="url(#kGoldGrad)" stroke="#92400E" strokeWidth="0.6" />
              <ellipse cx="10" cy="-1" rx="7" ry="1.2" fill="#FFFFFF" opacity="0.6" />
              <ellipse cx="12" cy="5" rx="13" ry="3.5" fill="url(#kGoldGrad)" stroke="#92400E" strokeWidth="0.6" />
              <ellipse cx="10" cy="4" rx="7" ry="1.2" fill="#FFFFFF" opacity="0.6" />
              <ellipse cx="12" cy="10" rx="13" ry="3.5" fill="url(#kGoldGrad)" stroke="#92400E" strokeWidth="0.6" />
              <ellipse cx="10" cy="9" rx="7" ry="1.2" fill="#FFFFFF" opacity="0.6" />
            </g>

            {/* 3D Toddler Hand on Hip */}
            <g id="sculptedHipHand" transform="translate(228, 276)">
              <path
                d="M 6 -6 C 14 -4, 16 6, 12 14 C 6 18, -4 16, -6 10 C -8 4, -2 -6, 6 -6 Z"
                fill="url(#kSkinHand)"
              />
              <ellipse cx="4" cy="4" rx="6" ry="4.5" fill="#FFFFFF" opacity="0.3" />

              <path
                d="M 8 -4 C 14 -8, 18 -6, 16 -2 C 14 2, 10 2, 6 0"
                fill="url(#kSkinFace)"
                stroke="#255BB5"
                strokeWidth="0.8"
              />
              <circle cx="15" cy="-4" r="1.4" fill="#FFFFFF" opacity="0.5" />

              {/* 4 Downward Draping Fingers */}
              <path
                d="M -2 2 C -8 4, -14 10, -12 18 C -10 22, -4 20, -1 14 C 2 8, 3 4, -2 2 Z"
                fill="url(#kSkinFace)"
                stroke="#255BB5"
                strokeWidth="0.8"
              />
              <circle cx="-10" cy="17" r="1.8" fill="#E8F4FF" opacity="0.85" />
              <ellipse cx="-4" cy="8" rx="2.5" ry="1.5" fill="#FFFFFF" opacity="0.45" />

              <path
                d="M 1 4 C -3 8, -8 16, -6 24 C -4 28, 2 26, 4 20 C 6 14, 5 8, 1 4 Z"
                fill="url(#kSkinFace)"
                stroke="#255BB5"
                strokeWidth="0.8"
              />
              <circle cx="-3" cy="24" r="1.9" fill="#E8F4FF" opacity="0.85" />
              <ellipse cx="0" cy="12" rx="2.5" ry="1.5" fill="#FFFFFF" opacity="0.45" />

              <path
                d="M 5 6 C 2 12, -2 18, 0 24 C 2 27, 7 25, 8 20 C 9 14, 9 10, 5 6 Z"
                fill="url(#kSkinFace)"
                stroke="#255BB5"
                strokeWidth="0.8"
              />
              <circle cx="3" cy="22" r="1.7" fill="#E8F4FF" opacity="0.85" />
              <ellipse cx="5" cy="14" rx="2.2" ry="1.4" fill="#FFFFFF" opacity="0.45" />

              <path
                d="M 9 8 C 7 14, 5 18, 7 22 C 9 24, 13 22, 13 18 C 13 14, 12 10, 9 8 Z"
                fill="url(#kSkinFace)"
                stroke="#255BB5"
                strokeWidth="0.8"
              />
              <circle cx="9" cy="19" r="1.5" fill="#E8F4FF" opacity="0.85" />

              <path d="M -3 14 L 0 20" stroke="#255BB5" strokeWidth="0.6" opacity="0.3" />
              <path d="M 2 16 L 4 20" stroke="#255BB5" strokeWidth="0.6" opacity="0.3" />
            </g>
          </g>

          {/* ════════════════ LAYER 9: SUDARSHAN CHAKRA (LOWERED TO EAR/TEMPLE LEVEL) ════════════════ */}
          {/* Centered directly above the lowered index finger tip at (91, 56) */}
          <g id="sudarshanChakraMaster" filter="url(#kChakraGlowFilter)">
            {/* Divine Golden Radial Glow Aura */}
            <ellipse cx="91" cy="56" rx="50" ry="24" fill="url(#kChakraAura)" />

            {/* 3D Horizontally Oriented Chakra Disc */}
            <g transform="translate(91, 56) scale(1, 0.48) translate(-91, -56)">
              <g className={styles.chakraDisc}>
                {/* Outer Radiant Rim Glow */}
                <circle cx="91" cy="56" r="42" fill="url(#kChakraCore)" opacity="0.25" />
                {/* Heavy Solid Metallic Gold Outer Rim */}
                <circle cx="91" cy="56" r="40" fill="none" stroke="url(#kGoldGrad)" strokeWidth="7.5" />
                {/* Inner Polished Gold Beaded Track */}
                <circle cx="91" cy="56" r="32" fill="none" stroke="#FFFBEB" strokeWidth="2.2" opacity="0.9" />
                <circle cx="91" cy="56" r="24" fill="none" stroke="url(#kGoldGrad)" strokeWidth="3.0" opacity="0.75" />

                {/* Central Sacred Golden Hub */}
                <circle cx="91" cy="56" r="13" fill="url(#kChakraCore)" stroke="#92400E" strokeWidth="2.0" />
                <circle cx="91" cy="56" r="4.5" fill="#FFFFF0" />
                <circle cx="89" cy="54" r="2.0" fill="#FFFFFF" opacity="0.95" />

                {/* 16 Golden Radiating Spokes with Razor Diamond Tips */}
                {[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5].map(
                  (angle) => (
                    <g key={angle} transform={`rotate(${angle} 91 56)`}>
                      <line x1="105" y1="56" x2="124" y2="56" stroke="url(#kGoldGrad)" strokeWidth="3.5" />
                      <path
                        d="M 123 56 L 130 51 L 137 56 L 130 61 Z"
                        fill="url(#kGoldGrad)"
                        stroke="#B45309"
                        strokeWidth="1.2"
                      />
                    </g>
                  )
                )}
              </g>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}

// Default export compatible with Desktop Buddy Sprite Renderer
export default function KrishnaSprite(
  props: BuddySpriteProps & { state?: KrishnaState; size?: 'sm' | 'md' | 'lg' }
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
      onClick={props.onClick}
      onRefreshGreeting={props.onRefreshGreeting}
      onFeed={props.onFeed}
      size={props.size || 'md'}
    />
  );
}
