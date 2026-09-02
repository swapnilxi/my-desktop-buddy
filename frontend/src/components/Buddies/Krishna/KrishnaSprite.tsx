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
          viewBox="0 -140 380 620"
          className={styles.krishnaSvg}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          <defs>
            {/* ── 3D Soft Skin Shaders (Periwinkle Blue #6BA7FF) ── */}
            <radialGradient id="kSkinFace" cx="42%" cy="32%" r="68%">
              <stop offset="0%" stopColor="#EBF5FF" />
              <stop offset="22%" stopColor="#BAD9FF" />
              <stop offset="55%" stopColor="#72ABFF" />
              <stop offset="82%" stopColor="#4382DF" />
              <stop offset="94%" stopColor="#2963C5" />
              <stop offset="100%" stopColor="#1E4E9E" />
            </radialGradient>

            {/* Jaw / Lower Face Shadow Depth for Sculpted Chin */}
            <linearGradient id="kJawlineShadow" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#1E3A8A" stopOpacity="0" />
              <stop offset="70%" stopColor="#1E3A8A" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#13265C" stopOpacity="0.22" />
            </linearGradient>

            {/* Asymmetric Left Cheek Highlight (Key Light from Upper-Left) */}
            <radialGradient id="kCheekVolumeLeft" cx="36%" cy="34%" r="65%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
              <stop offset="35%" stopColor="#C8E2FF" stopOpacity="0.38" />
              <stop offset="75%" stopColor="#72ABFF" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#3573D6" stopOpacity="0" />
            </radialGradient>

            {/* Soft Right Cheek Fill/Ambient Volume */}
            <radialGradient id="kCheekVolumeRight" cx="64%" cy="36%" r="65%">
              <stop offset="0%" stopColor="#E0F0FF" stopOpacity="0.42" />
              <stop offset="40%" stopColor="#B4D7FF" stopOpacity="0.22" />
              <stop offset="80%" stopColor="#5391F0" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#3573D6" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="kForeheadGlow" cx="50%" cy="35%" r="55%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#D9ECFF" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#6BA7FF" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="kChinVolume" cx="50%" cy="38%" r="55%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.38" />
              <stop offset="55%" stopColor="#C4E0FF" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#5B9AFA" stopOpacity="0" />
            </radialGradient>

            {/* ── 3D Cylindrical Neck & Occlusion Shaders ── */}
            <linearGradient id="kSkinNeck" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2A64C2" />
              <stop offset="22%" stopColor="#5391F0" />
              <stop offset="55%" stopColor="#87BDFF" />
              <stop offset="85%" stopColor="#5391F0" />
              <stop offset="100%" stopColor="#1E52B0" />
            </linearGradient>

            <linearGradient id="kNeckOcclusionShadow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0B1938" stopOpacity="0.48" />
              <stop offset="60%" stopColor="#1E3A8A" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0" />
            </linearGradient>

            {/* ── Unified 3D Seamless Skin Shaders ── */}
            <radialGradient id="kSkinBody" cx="40%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#CCE3FF" />
              <stop offset="32%" stopColor="#87BDFF" />
              <stop offset="68%" stopColor="#5B9AFA" />
              <stop offset="90%" stopColor="#3573D6" />
              <stop offset="100%" stopColor="#1E52B0" />
            </radialGradient>

            <radialGradient id="kSkinLimb" cx="38%" cy="28%" r="68%">
              <stop offset="0%" stopColor="#CCE3FF" />
              <stop offset="35%" stopColor="#87BDFF" />
              <stop offset="72%" stopColor="#5B9AFA" />
              <stop offset="100%" stopColor="#2A64C2" />
            </radialGradient>

            <radialGradient id="kSkinHand" cx="40%" cy="32%" r="65%">
              <stop offset="0%" stopColor="#CCE3FF" />
              <stop offset="38%" stopColor="#87BDFF" />
              <stop offset="76%" stopColor="#5B9AFA" />
              <stop offset="100%" stopColor="#2A66C6" />
            </radialGradient>

            {/* 3D Toddler Hand & Joint Sculpting Shaders */}
            <radialGradient id="kHandVolume" cx="42%" cy="32%" r="65%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
              <stop offset="38%" stopColor="#D2E7FF" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="kJointSoftBlend" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#87BDFF" stopOpacity="0.38" />
              <stop offset="60%" stopColor="#5B9AFA" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#2A64C2" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="kJewelryContactShadow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0B132B" stopOpacity="0.38" />
              <stop offset="60%" stopColor="#1E3A8A" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="kFingerCylinder" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#255BB5" />
              <stop offset="25%" stopColor="#5B9AFA" />
              <stop offset="60%" stopColor="#87BDFF" />
              <stop offset="90%" stopColor="#4A8DF8" />
              <stop offset="100%" stopColor="#1E4E9E" />
            </linearGradient>

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
            <radialGradient id="kIrisGrad" cx="42%" cy="36%" r="62%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="22%" stopColor="#F59E0B" />
              <stop offset="50%" stopColor="#B45309" />
              <stop offset="78%" stopColor="#5B1D04" />
              <stop offset="92%" stopColor="#2A0B02" />
              <stop offset="100%" stopColor="#100300" />
            </radialGradient>

            {/* ── Soft Feathered Dark Pupil Gradient ── */}
            <radialGradient id="kPupilGrad" cx="48%" cy="46%" r="56%">
              <stop offset="0%" stopColor="#070302" />
              <stop offset="65%" stopColor="#140602" />
              <stop offset="85%" stopColor="#240A03" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#350E04" stopOpacity="0" />
            </radialGradient>

            {/* ── 3D Soft Blended Nose Shading ── */}
            <radialGradient id="kNoseVolume" cx="45%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#EFF6FF" />
              <stop offset="35%" stopColor="#A4CDFF" />
              <stop offset="70%" stopColor="#6BA7FF" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#417FD8" stopOpacity="0" />
            </radialGradient>

            {/* ── Pixar Stylized Natural Lip Warmth Gradients (Child Boy Tone, Not Lipstick) ── */}
            <linearGradient id="kPixarLipWarmth" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#D47B8C" stopOpacity="0.55" />
              <stop offset="60%" stopColor="#B8586C" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#8C3549" stopOpacity="0.12" />
            </linearGradient>

            <radialGradient id="kPixarLowerLip" cx="50%" cy="28%" r="62%">
              <stop offset="0%" stopColor="#E290A0" stopOpacity="0.7" />
              <stop offset="55%" stopColor="#C46679" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#8C3549" stopOpacity="0.05" />
            </radialGradient>

            {/* ── Cheeks Rosy Blush (Soft & Delicate Airbrush Glow) ── */}
            <radialGradient id="kCheekBlush" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255, 120, 160, 0.55)" />
              <stop offset="50%" stopColor="rgba(255, 140, 175, 0.26)" />
              <stop offset="80%" stopColor="rgba(255, 160, 190, 0.08)" />
              <stop offset="100%" stopColor="rgba(255, 180, 205, 0)" />
            </radialGradient>

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

            {/* ── 3D Golden Dome Rivet Shader for Waist Belt ── */}
            <radialGradient id="kGoldDomeRivet" cx="35%" cy="30%" r="68%">
              <stop offset="0%" stopColor="#FFFFFA" />
              <stop offset="25%" stopColor="#FDE68A" />
              <stop offset="60%" stopColor="#F59E0B" />
              <stop offset="85%" stopColor="#B45309" />
              <stop offset="100%" stopColor="#78350F" />
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
          {/* Scaled down around the chin anchor (190,217) to reduce oversized-head / chibi look */}
          <g id="hairBackBehind" transform="translate(0,-32) translate(190,217) scale(0.85) translate(-190,-217)">
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
          {/* Lower body (feet/legs/dhoti) vertically lengthened around the waist (y=290) so the
              body reads taller and better balances the reduced head — child, not chibi. */}
          <g id="feet" filter="url(#kSoftShadow)" transform="translate(190,290) scale(1,1.06) translate(-190,-290)">
            {/* Grounding Golden Bar right under the dhoti */}
            <path
              d="M 138 442 C 190 446, 242 442, 256 438"
              fill="none"
              stroke="url(#kGoldGrad)"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <path
              d="M 138 441 C 190 445, 242 441, 256 437"
              fill="none"
              stroke="#FFFBEB"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.8"
            />

            {/* Left Foot (Cute Bare Toddler Foot with Defined Toes) */}
            <g transform="translate(136, 426)">
              <path
                d="M 8 -2 C 0 -4, -6 8, -4 20 C -2 28, 10 32, 26 28 C 36 24, 38 12, 28 4 C 20 0, 14 -2, 8 -2 Z"
                fill="url(#kSkinLimb)"
              />
              {/* Soft Toes with Unified Skin Shader & Subtle Ambient Separation */}
              <circle cx="-1" cy="19" r="4.5" fill="url(#kSkinHand)" />
              <ellipse cx="-2" cy="18" rx="2.0" ry="1.4" fill="#FFFFFF" opacity="0.55" />

              <circle cx="6" cy="24" r="4.0" fill="url(#kSkinHand)" />
              <ellipse cx="5" cy="23" rx="1.8" ry="1.2" fill="#FFFFFF" opacity="0.5" />

              <circle cx="14" cy="26" r="3.6" fill="url(#kSkinHand)" />
              <circle cx="21" cy="26" r="3.2" fill="url(#kSkinHand)" />
              <circle cx="28" cy="24" r="2.8" fill="url(#kSkinHand)" />

              {/* Soft Ambient Shadows Between Toes */}
              <path d="M 2.5 21.5 L 2.5 24" fill="none" stroke="#1E3A8A" strokeWidth="0.6" opacity="0.2" />
              <path d="M 10 24.5 L 10 26.5" fill="none" stroke="#1E3A8A" strokeWidth="0.6" opacity="0.2" />
              <path d="M 17.5 25.5 L 17.5 27" fill="none" stroke="#1E3A8A" strokeWidth="0.6" opacity="0.2" />
              <path d="M 24.5 24.5 L 24.5 26" fill="none" stroke="#1E3A8A" strokeWidth="0.6" opacity="0.2" />
            </g>

            {/* Right Foot (Cute Bare Toddler Foot with Defined Toes) */}
            <g transform="translate(212, 426)">
              <path
                d="M 12 -2 C 4 -4, -2 8, 0 20 C 2 28, 14 32, 30 28 C 40 24, 40 12, 32 4 C 24 0, 18 -2, 12 -2 Z"
                fill="url(#kSkinLimb)"
              />
              {/* Soft Toes with Unified Skin Shader & Subtle Ambient Separation */}
              <circle cx="2" cy="19" r="4.5" fill="url(#kSkinHand)" />
              <ellipse cx="1" cy="18" rx="2.0" ry="1.4" fill="#FFFFFF" opacity="0.55" />

              <circle cx="9" cy="24" r="4.0" fill="url(#kSkinHand)" />
              <ellipse cx="8" cy="23" rx="1.8" ry="1.2" fill="#FFFFFF" opacity="0.5" />

              <circle cx="17" cy="26" r="3.6" fill="url(#kSkinHand)" />
              <circle cx="24" cy="26" r="3.2" fill="url(#kSkinHand)" />
              <circle cx="31" cy="24" r="2.8" fill="url(#kSkinHand)" />

              {/* Soft Ambient Shadows Between Toes */}
              <path d="M 5.5 21.5 L 5.5 24" fill="none" stroke="#1E3A8A" strokeWidth="0.6" opacity="0.2" />
              <path d="M 13 24.5 L 13 26.5" fill="none" stroke="#1E3A8A" strokeWidth="0.6" opacity="0.2" />
              <path d="M 20.5 25.5 L 20.5 27" fill="none" stroke="#1E3A8A" strokeWidth="0.6" opacity="0.2" />
              <path d="M 27.5 24.5 L 27.5 26" fill="none" stroke="#1E3A8A" strokeWidth="0.6" opacity="0.2" />
            </g>
          </g>

          {/* ════════════════ LAYER 3: LEGS ════════════════ */}
          <g id="legs" transform="translate(190,290) scale(1,1.06) translate(-190,-290)">
            <path
              d="M 152 322 C 142 360, 140 400, 148 432"
              fill="none"
              stroke="url(#kSkinLimb)"
              strokeWidth="28"
              strokeLinecap="round"
            />
            <path
              d="M 152 322 C 142 360, 140 400, 148 432"
              fill="none"
              stroke="#D9ECFF"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.4"
            />
            <path
              d="M 228 322 C 238 360, 240 400, 232 432"
              fill="none"
              stroke="url(#kSkinLimb)"
              strokeWidth="28"
              strokeLinecap="round"
            />
            <path
              d="M 228 322 C 238 360, 240 400, 232 432"
              fill="none"
              stroke="#D9ECFF"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.4"
            />
          </g>

          {/* ════════════════ LAYER 4: REFERENCE 3D WRAPPED DHOTI, STUDDED BELT & SILK SASH ════════════════ */}
          <g id="dhoti" filter="url(#kSoftShadow)" transform="translate(190,290) scale(1,1.06) translate(-190,-290)">
            {/* ── A. MAIN SAFFRON YELLOW DHOTI (TWO DRAPED WRAP LEGS) ── */}
            {/* Left Leg Wrap Base */}
            <path
              d="M 130 286
                 C 114 316, 114 372, 134 422
                 C 142 434, 158 436, 172 432
                 C 182 426, 186 400, 188 320 Z"
              fill="url(#kDhotiGrad)"
              stroke="#B37300"
              strokeWidth="1.2"
            />
            {/* Right Leg Wrap Base */}
            <path
              d="M 250 286
                 C 266 316, 266 372, 246 422
                 C 238 434, 222 436, 208 432
                 C 198 426, 194 400, 192 320 Z"
              fill="url(#kDhotiGrad)"
              stroke="#B37300"
              strokeWidth="1.2"
            />

            {/* Deep Center Inseam Shadow dividing the two legs */}
            <path
              d="M 190 304 C 189 344, 189 396, 190 432"
              fill="none"
              stroke="#78350F"
              strokeWidth="3.2"
              strokeLinecap="round"
              opacity="0.85"
            />
            <path
              d="M 190 304 C 189 344, 189 396, 190 432"
              fill="none"
              stroke="#B45309"
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity="0.7"
            />

            {/* ── B. CONCENTRIC CRESCENT DRAPE FOLDS (LEFT LEG) ── */}
            {/* Fold 1 (Top Sweep) */}
            <path
              d="M 132 308 C 148 332, 172 344, 188 346"
              fill="none"
              stroke="#854D0E"
              strokeWidth="2.8"
              strokeLinecap="round"
              opacity="0.65"
            />
            <path
              d="M 133 306 C 149 330, 172 342, 188 344"
              fill="none"
              stroke="#FEF08A"
              strokeWidth="2.0"
              strokeLinecap="round"
              opacity="0.85"
            />

            {/* Fold 2 (Mid-High Sweep) */}
            <path
              d="M 126 338 C 144 366, 170 380, 188 382"
              fill="none"
              stroke="#854D0E"
              strokeWidth="3.2"
              strokeLinecap="round"
              opacity="0.7"
            />
            <path
              d="M 127 336 C 145 364, 170 378, 188 380"
              fill="none"
              stroke="#FFF9D6"
              strokeWidth="2.4"
              strokeLinecap="round"
              opacity="0.9"
            />

            {/* Fold 3 (Mid-Low Sweep) */}
            <path
              d="M 122 374 C 138 404, 166 418, 186 418"
              fill="none"
              stroke="#78350F"
              strokeWidth="3.4"
              strokeLinecap="round"
              opacity="0.75"
            />
            <path
              d="M 123 372 C 139 402, 166 416, 186 416"
              fill="none"
              stroke="#FFF9D6"
              strokeWidth="2.4"
              strokeLinecap="round"
              opacity="0.9"
            />

            {/* Fold 4 (Lower Hem Crescent) */}
            <path
              d="M 132 408 C 144 430, 166 434, 182 432"
              fill="none"
              stroke="#78350F"
              strokeWidth="3.0"
              strokeLinecap="round"
              opacity="0.8"
            />
            <path
              d="M 133 406 C 145 428, 166 432, 182 430"
              fill="none"
              stroke="#FEF08A"
              strokeWidth="2.0"
              strokeLinecap="round"
              opacity="0.85"
            />

            {/* ── C. CONCENTRIC CRESCENT DRAPE FOLDS (RIGHT LEG) ── */}
            {/* Fold 1 (Top Sweep) */}
            <path
              d="M 248 308 C 232 332, 208 344, 192 346"
              fill="none"
              stroke="#854D0E"
              strokeWidth="2.8"
              strokeLinecap="round"
              opacity="0.65"
            />
            <path
              d="M 247 306 C 231 330, 208 342, 192 344"
              fill="none"
              stroke="#FEF08A"
              strokeWidth="2.0"
              strokeLinecap="round"
              opacity="0.85"
            />

            {/* Fold 2 (Mid-High Sweep) */}
            <path
              d="M 254 338 C 236 366, 210 380, 192 382"
              fill="none"
              stroke="#854D0E"
              strokeWidth="3.2"
              strokeLinecap="round"
              opacity="0.7"
            />
            <path
              d="M 253 336 C 235 364, 210 378, 192 380"
              fill="none"
              stroke="#FFF9D6"
              strokeWidth="2.4"
              strokeLinecap="round"
              opacity="0.9"
            />

            {/* Fold 3 (Mid-Low Sweep) */}
            <path
              d="M 258 374 C 242 404, 214 418, 194 418"
              fill="none"
              stroke="#78350F"
              strokeWidth="3.4"
              strokeLinecap="round"
              opacity="0.75"
            />
            <path
              d="M 257 372 C 241 402, 214 416, 194 416"
              fill="none"
              stroke="#FFF9D6"
              strokeWidth="2.4"
              strokeLinecap="round"
              opacity="0.9"
            />

            {/* Fold 4 (Lower Hem Crescent) */}
            <path
              d="M 248 408 C 236 430, 214 434, 198 432"
              fill="none"
              stroke="#78350F"
              strokeWidth="3.0"
              strokeLinecap="round"
              opacity="0.8"
            />
            <path
              d="M 247 406 C 235 428, 214 432, 198 430"
              fill="none"
              stroke="#FEF08A"
              strokeWidth="2.0"
              strokeLinecap="round"
              opacity="0.85"
            />

            {/* ── D. DRAPED VERTICAL ORANGE SILK SASH (VIEWER'S RIGHT) ── */}
            <g id="orangeSashVertical">
              {/* Outer Shadow of Sash */}
              <path
                d="M 230 296 L 230 422 C 230 427, 260 427, 262 420 L 260 294 Z"
                fill="#7C2D12"
                opacity="0.45"
              />

              {/* Cylindrical Fold 1 (Outer) */}
              <path
                d="M 246 296 C 246 340, 248 385, 250 420 C 255 422, 264 420, 264 414 C 262 374, 258 334, 256 294 Z"
                fill="url(#kSashGrad)"
                stroke="#7C2D12"
                strokeWidth="1.2"
              />
              <path d="M 254 300 C 254 340, 256 385, 258 416" fill="none" stroke="#FED7AA" strokeWidth="2.2" opacity="0.8" strokeLinecap="round" />

              {/* Cylindrical Fold 2 (Middle) */}
              <path
                d="M 236 298 C 236 340, 238 388, 240 424 C 245 426, 252 424, 252 418 C 250 378, 248 338, 246 296 Z"
                fill="url(#kSashGrad)"
                stroke="#7C2D12"
                strokeWidth="1.2"
              />
              <path d="M 244 302 C 244 344, 245 390, 246 420" fill="none" stroke="#FFFBEB" strokeWidth="1.8" opacity="0.85" strokeLinecap="round" />
              <path d="M 239 302 C 239 344, 240 390, 241 420" fill="none" stroke="#7C2D12" strokeWidth="2.0" opacity="0.5" strokeLinecap="round" />

              {/* Cylindrical Fold 3 (Inner) */}
              <path
                d="M 226 300 C 226 340, 228 385, 230 422 C 234 424, 240 423, 240 416 C 238 376, 236 338, 236 298 Z"
                fill="url(#kSashGrad)"
                stroke="#7C2D12"
                strokeWidth="1.0"
              />
              <path d="M 233 304 C 233 344, 234 388, 235 418" fill="none" stroke="#FED7AA" strokeWidth="1.8" opacity="0.8" strokeLinecap="round" />
            </g>

            {/* ── E. WIDE ORANGE WAISTBAND WITH 5 LARGE 3D GOLD DOME RIVETS ── */}
            <g id="studdedBeltGroup">
              {/* Main Wide Orange Belt */}
              <path
                d="M 128 276
                   C 158 262, 222 262, 252 276
                   C 258 296, 224 308, 190 308
                   C 156 308, 122 296, 128 276 Z"
                fill="url(#kSashGrad)"
                stroke="#581C08"
                strokeWidth="1.8"
              />
              {/* Belt Top Edge Golden Highlight */}
              <path
                d="M 132 277 C 160 264, 220 264, 248 277"
                fill="none"
                stroke="#FED7AA"
                strokeWidth="2.2"
                strokeLinecap="round"
                opacity="0.85"
              />
              {/* Belt Bottom Edge Shadow Crease */}
              <path
                d="M 132 292 C 160 304, 220 304, 248 292"
                fill="none"
                stroke="#451A03"
                strokeWidth="1.8"
                opacity="0.7"
              />

              {/* 5 Prominent 3D Gold Dome Rivets / Studs */}
              <g id="waistBeltDomeRivets">
                {[
                  { cx: 148, cy: 288 },
                  { cx: 169, cy: 294 },
                  { cx: 190, cy: 296 },
                  { cx: 211, cy: 294 },
                  { cx: 232, cy: 288 },
                ].map((rivet, idx) => (
                  <g key={idx}>
                    {/* Shadow underneath dome */}
                    <circle cx={rivet.cx} cy={rivet.cy + 1.0} r="6.0" fill="#451A03" opacity="0.6" />
                    {/* Outer 3D Gold Dome */}
                    <circle
                      cx={rivet.cx}
                      cy={rivet.cy}
                      r="5.6"
                      fill="url(#kGoldDomeRivet)"
                      stroke="#78350F"
                      strokeWidth="0.8"
                    />
                    {/* Inner 3D Sphere Glow */}
                    <circle cx={rivet.cx} cy={rivet.cy} r="4.2" fill="none" stroke="#FDE68A" strokeWidth="0.8" opacity="0.7" />
                    {/* Crisp Specular Catchlight */}
                    <circle cx={rivet.cx - 1.8} cy={rivet.cy - 1.8} r="1.8" fill="#FFFFFF" opacity="0.95" />
                  </g>
                ))}
              </g>
            </g>
          </g>

          {/* ════════════════ LAYER 5: SCULPTED TODDLER TORSO & NECK ════════════════ */}
          <g id="torso">
            {/* Organic Integrated Toddler Neck & Body Silhouette */}
            <path
              d="M 160 168
                 C 154 180, 146 192, 138 202
                 C 128 214, 132 238, 134 256
                 C 136 268, 140 274, 146 280
                 C 168 286, 212 286, 234 280
                 C 240 274, 244 268, 246 256
                 C 248 238, 252 214, 242 202
                 C 234 192, 226 180, 220 168
                 Z"
              fill="url(#kSkinBody)"
            />

            {/* Neck Pillar & Trapezius 3D Volume */}
            <path
              d="M 160 168
                 C 156 182, 148 194, 138 202
                 C 170 208, 210 208, 242 202
                 C 232 194, 224 182, 220 168
                 Z"
              fill="url(#kSkinNeck)"
            />

            {/* Soft Cylindrical Center Light on Neck */}
            <ellipse cx="190" cy="188" rx="14" ry="11" fill="#D9ECFF" opacity="0.32" />

            {/* Deep Soft Crescent Ambient Occlusion Shadow Under Chin */}
            <path
              d="M 164 174 C 176 190, 204 190, 216 174 C 208 196, 172 196, 164 174 Z"
              fill="url(#kNeckOcclusionShadow)"
            />

            {/* Subtle Suprasternal Notch / Jugular Fossa (Neck Base) */}
            <ellipse cx="190" cy="202" rx="3.8" ry="2.0" fill="#1E3A8A" opacity="0.25" />

            {/* Subtle Clavicle Bones (Collarbones) */}
            <path
              d="M 185 202 C 174 200, 160 198, 146 202"
              fill="none"
              stroke="#D9ECFF"
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity="0.35"
            />
            <path
              d="M 195 202 C 206 200, 220 198, 234 202"
              fill="none"
              stroke="#D9ECFF"
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity="0.35"
            />

            {/* Upper Chest / Pectoral Volume Highlights */}
            <ellipse cx="168" cy="222" rx="18" ry="14" fill="#D9ECFF" opacity="0.22" />
            <ellipse cx="212" cy="222" rx="18" ry="14" fill="#D9ECFF" opacity="0.18" />

            {/* Cute Toddler Chest Nipples (Soft Warm Accent) */}
            <circle cx="165" cy="228" r="1.8" fill="#1E40AF" opacity="0.3" />
            <circle cx="165" cy="228" r="0.9" fill="#93C5FD" opacity="0.6" />
            <circle cx="215" cy="228" r="1.8" fill="#1E40AF" opacity="0.26" />
            <circle cx="215" cy="228" r="0.9" fill="#93C5FD" opacity="0.6" />

            {/* Adorable Chubby Toddler Potbelly Glow */}
            <ellipse cx="190" cy="254" rx="34" ry="22" fill="#D9ECFF" opacity="0.28" />

            {/* Cute Toddler Navel / Belly Button */}
            <ellipse cx="190" cy="268" rx="3.2" ry="1.9" fill="#1E40AF" opacity="0.35" />
            <ellipse cx="190" cy="267.2" rx="2.2" ry="1.0" fill="#93C5FD" opacity="0.55" />
          </g>

          {/* ════════════════ LAYER 6: HEAD & FACE ════════════════ */}
          {/* Scaled down around the chin anchor (190,217) to reduce oversized-head / chibi look.
              Outer wrapper carries the persistent scale so CSS head-tilt animations on #headGroup
              (which override the transform attribute) do not wipe it out. */}
          <g transform="translate(190,217) scale(0.85) translate(-190,-217)">
            <g id="headGroup" transform="translate(0, -32)">
              {/* Front Side Wisps (Original Hair) */}
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

              {/* Ears + Thick 3D Gold Hoop Earrings (Balis) */}
              <g id="headBase">
                <g transform="translate(130, 156)">
                  <ellipse cx="0" cy="0" rx="9.5" ry="13.5" fill="url(#kSkinFace)" />
                  {/* Thick Polished 3D Gold Bali / Hoop */}
                  <circle cx="-1.5" cy="9.5" r="7.5" fill="none" stroke="url(#kGoldGrad)" strokeWidth="3.4" strokeLinecap="round" />
                  <circle cx="-2.5" cy="8.5" r="5.8" fill="none" stroke="#FFFFFF" strokeWidth="1.1" opacity="0.8" strokeLinecap="round" />
                  <circle cx="-0.5" cy="10.5" r="6.8" fill="none" stroke="#78350F" strokeWidth="0.9" opacity="0.6" strokeLinecap="round" />
                </g>

                <g transform="translate(250, 156)">
                  <ellipse cx="0" cy="0" rx="9.5" ry="13.5" fill="url(#kSkinFace)" />
                  {/* Thick Polished 3D Gold Bali / Hoop */}
                  <circle cx="1.5" cy="9.5" r="7.5" fill="none" stroke="url(#kGoldGrad)" strokeWidth="3.4" strokeLinecap="round" />
                  <circle cx="2.5" cy="8.5" r="5.8" fill="none" stroke="#FFFFFF" strokeWidth="1.1" opacity="0.8" strokeLinecap="round" />
                  <circle cx="0.5" cy="10.5" r="6.8" fill="none" stroke="#78350F" strokeWidth="0.9" opacity="0.6" strokeLinecap="round" />
                </g>

                {/* 3D Sculpted Head Base: Reference-Matched Pixar Little Krishna Silhouette */}
                <path
                  d="M 190 82
                   C 226 82, 244 98, 246 120
                   C 248 140, 246 156, 240 170
                   C 234 188, 220 202, 206 210
                   C 200 213, 196 214.5, 190 214.5
                   C 184 214.5, 180 213, 174 210
                   C 160 202, 146 188, 140 170
                   C 134 156, 132 140, 134 120
                   C 136 98, 154 82, 190 82 Z"
                  fill="url(#kSkinFace)"
                />

                {/* Soft Lower Face & Jawline Depth Shading */}
                <path
                  d="M 190 82
                   C 226 82, 244 98, 246 120
                   C 248 140, 246 156, 240 170
                   C 234 188, 220 202, 206 210
                   C 200 213, 196 214.5, 190 214.5
                   C 184 214.5, 180 213, 174 210
                   C 160 202, 146 188, 140 170
                   C 134 156, 132 140, 134 120
                   C 136 98, 154 82, 190 82 Z"
                  fill="url(#kJawlineShadow)"
                />

                {/* Volumetric Chubby Cheeks (Pixar-Proportioned Soft Fullness) */}
                <ellipse
                  cx="149"
                  cy="162"
                  rx="17"
                  ry="15"
                  fill="url(#kCheekVolumeLeft)"
                  opacity="0.62"
                />
                <ellipse
                  cx="231"
                  cy="162"
                  rx="17"
                  ry="15"
                  fill="url(#kCheekVolumeRight)"
                  opacity="0.52"
                />

                {/* 3D Forehead Dome Volume Highlight */}
                <ellipse cx="190" cy="110" rx="30" ry="15" fill="url(#kForeheadGlow)" />

                {/* Soft Rounded Toddler Chin Volume */}
                <ellipse cx="190" cy="201" rx="11" ry="5.0" fill="url(#kChinVolume)" />
                {/* Soft Labiomental Indentation */}
                <path
                  d="M 185 192 Q 190 193.5 195 192"
                  fill="none"
                  stroke="#255BB5"
                  strokeWidth="0.8"
                  opacity="0.22"
                  strokeLinecap="round"
                />

                {/* Subtle Rosy Toddler Blush on Cheek Apples */}
                <ellipse cx="149" cy="163" rx="15" ry="10" fill="url(#kCheekBlush)" transform="rotate(-4 149 163)" />
                <ellipse cx="231" cy="163" rx="15" ry="10" fill="url(#kCheekBlush)" transform="rotate(4 231 163)" />
              </g>

              {/* Master Face Details — Stylized, Expressive & High Fidelity */}
              <g id="faceDetails">
                {/* Vaishnava U-Tilak with Central Red Kumkum Teardrop */}
                <path
                  d="M 184 90 L 184 123 C 184 131, 196 131, 196 123 L 196 90"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="3.8"
                  strokeLinecap="round"
                />
                <path
                  d="M 186 92 L 186 122 C 186 127, 194 127, 194 122 L 194 92"
                  fill="none"
                  stroke="#FEF9C3"
                  strokeWidth="1.2"
                  opacity="0.8"
                />
                {/* Central Red Kumkum Teardrop Bindu inside the U */}
                <path
                  d="M 190 112 C 187 117, 186 121, 186 124 C 186 128, 194 128, 194 124 C 194 121, 193 117, 190 112 Z"
                  fill="#DC2626"
                  stroke="#991B1B"
                  strokeWidth="0.5"
                />
                <circle cx="189.2" cy="123" r="1.0" fill="#FFA8A8" opacity="0.85" />
                {/* Bridge of Nose Dot */}
                <circle cx="190" cy="131" r="1.4" fill="#DC2626" />

                {/* ── Expressive Pixar Eyebrows (Proper Vertical Hierarchy: White Dots > Eyebrows > Eyes) ── */}
                <g id="eyebrowLeft" className={styles.eyebrowLeft}>
                  {/* Eyebrow-Top White Decoration (Cleanly Above Eyebrow Arch, No Overlap) */}
                  <g id="eyebrowDotsLeft" fill="#FFFFFF" opacity="0.95">
                    <circle cx="140" cy="111" r="1.1" />
                    <circle cx="148" cy="107.5" r="1.2" />
                    <circle cx="157" cy="105.5" r="1.3" />
                    <circle cx="166" cy="105.5" r="1.3" />
                    <circle cx="174" cy="107.5" r="1.2" />
                    <circle cx="180" cy="111" r="1.1" />
                  </g>

                  {/* Left Eyebrow Arch — Cleanly Above Eyes, Below White Decoration */}
                  <path
                    d="M 138 116 C 148 110, 168 110, 181 115"
                    fill="none"
                    stroke="#0F172A"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                  />
                  {/* Subtle Tapered Inner Brow Depth */}
                  <path
                    d="M 170 111 C 175 112.5, 179 114, 181 115"
                    fill="none"
                    stroke="#0F172A"
                    strokeWidth="3.0"
                    strokeLinecap="round"
                    opacity="0.5"
                  />
                </g>

                <g id="eyebrowRight" className={styles.eyebrowRight}>
                  {/* Eyebrow-Top White Decoration (Cleanly Above Eyebrow Arch, No Overlap) */}
                  <g id="eyebrowDotsRight" fill="#FFFFFF" opacity="0.95">
                    <circle cx="200" cy="111" r="1.1" />
                    <circle cx="206" cy="107.5" r="1.2" />
                    <circle cx="214" cy="105.5" r="1.3" />
                    <circle cx="223" cy="105.5" r="1.3" />
                    <circle cx="232" cy="107.5" r="1.2" />
                    <circle cx="240" cy="111" r="1.1" />
                  </g>

                  {/* Right Eyebrow with Charming Playful Inquisitive Lift */}
                  <path
                    d="M 199 115 C 212 110, 232 110, 242 116"
                    fill="none"
                    stroke="#0F172A"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                  />
                  {/* Subtle Tapered Inner Brow Accent */}
                  <path
                    d="M 199 115 C 201 114, 205 111.5, 210 110.5"
                    fill="none"
                    stroke="#0F172A"
                    strokeWidth="3.0"
                    strokeLinecap="round"
                    opacity="0.5"
                  />
                </g>

                {/* ── Left Eye (Big Doe-Like Pixar 3D Eye) ── */}
                <g id="leftEyeGroup" transform="translate(137, 121)">
                  <clipPath id="kLeftEyeClip">
                    <path d="M 0 17 C 7 -4, 35 -4, 42 17 C 35 38, 7 38, 0 17 Z" />
                  </clipPath>

                  {/* Eye Socket Ambient Shadow */}
                  <path
                    d="M -2 16 C 6 -5, 36 -5, 44 16 C 36 40, 6 40, -2 16 Z"
                    fill="#1E3A8A"
                    opacity="0.12"
                  />

                  {/* Sclera (Warm Natural White) */}
                  <path
                    d="M 0 17 C 7 -4, 35 -4, 42 17 C 35 38, 7 38, 0 17 Z"
                    fill="#F6F9FC"
                  />

                  {/* Eyeball Core (Clipped to Eyelids so iris is naturally tucked) */}
                  <g clipPath="url(#kLeftEyeClip)">
                    {/* Upper Eyeball Drop Shadow */}
                    <path
                      d="M 0 17 C 7 -4, 35 -4, 42 17 C 35 11, 7 11, 0 17 Z"
                      fill="#1E3A8A"
                      opacity="0.18"
                    />

                    {/* Iris */}
                    <g className={styles.iris}>
                      {/* Huge Warm Amber/Chocolate Pixar Iris */}
                      <circle cx="21.5" cy="17" r="15.5" fill="url(#kIrisGrad)" />
                      {/* Soft Limbal Ring */}
                      <circle cx="21.5" cy="17" r="15.5" fill="none" stroke="#1A0802" strokeWidth="1.0" opacity="0.8" />

                      {/* Deep Velvety Circular Pupil */}
                      <circle cx="21.5" cy="17" r="9.0" fill="url(#kPupilGrad)" />
                      <circle cx="21.5" cy="17" r="7.6" fill="#0A0402" />

                      {/* Warm Amber Iris Caustic Reflection Arc */}
                      <ellipse cx="21.5" cy="24.1" rx="8.2" ry="2.7" fill="#FBBF24" opacity="0.55" />

                      {/* Soulful Natural Pixar Catchlights */}
                      <circle cx="25.8" cy="12.3" r="4.0" fill="#FFFFFF" opacity="0.98" />
                      <circle cx="16.6" cy="21.7" r="1.8" fill="#FFFFFF" opacity="0.8" />
                      <circle cx="27.2" cy="19.1" r="1.0" fill="#FFFFFF" opacity="0.55" />
                    </g>

                    {/* Inner Corner Tear Duct (Caruncle) Warmth */}
                    <circle cx="40.5" cy="17.0" r="2.0" fill="#FDA4AF" opacity="0.35" />

                    {/* Animated Upper Eyelid for Blinking */}
                    <path
                      d="M -2 -4 H 46 V 36 H -2 Z"
                      fill="#5B9AFA"
                      className={`${styles.eyelidUpper} ${isBlinking ? styles.blinkActive : ''}`}
                    />
                  </g>

                  {/* Soft Double-Eyelid Crease */}
                  <path
                    d="M 4 7 C 13 -2, 29 -2, 38 7"
                    fill="none"
                    stroke="#255BB5"
                    strokeWidth="1.1"
                    strokeLinecap="round"
                    opacity="0.32"
                  />

                  {/* Gentle Lower Lid Smiling Crinkle */}
                  <path
                    d="M 7 37 C 16 40, 26 40, 35 37"
                    fill="none"
                    stroke="#255BB5"
                    strokeWidth="0.8"
                    opacity="0.22"
                    strokeLinecap="round"
                  />

                  {/* Elegant Tapered Upper Lash Line */}
                  <path
                    d="M -1 17 C 7 -4, 35 -4, 43 17"
                    fill="none"
                    stroke="#0F172A"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />

                  {/* Delicate Soft Lower Lash Contour */}
                  <path
                    d="M 42 17 C 35 38, 7 38, 0 17"
                    fill="none"
                    stroke="#1E293B"
                    strokeWidth="1.0"
                    strokeLinecap="round"
                    opacity="0.35"
                  />
                </g>

                {/* ── Right Eye (Big Doe-Like Pixar 3D Eye) ── */}
                <g id="rightEyeGroup" transform="translate(200, 121)">
                  <clipPath id="kRightEyeClip">
                    <path d="M 0 17 C 7 -4, 35 -4, 42 17 C 35 38, 7 38, 0 17 Z" />
                  </clipPath>

                  {/* Eye Socket Ambient Shadow */}
                  <path
                    d="M -2 16 C 6 -5, 36 -5, 44 16 C 36 40, 6 40, -2 16 Z"
                    fill="#1E3A8A"
                    opacity="0.12"
                  />

                  {/* Sclera (Warm Natural White) */}
                  <path
                    d="M 0 17 C 7 -4, 35 -4, 42 17 C 35 38, 7 38, 0 17 Z"
                    fill="#F6F9FC"
                  />

                  {/* Eyeball Core (Clipped to Eyelids) */}
                  <g clipPath="url(#kRightEyeClip)">
                    {/* Upper Eyeball Drop Shadow */}
                    <path
                      d="M 0 17 C 7 -4, 35 -4, 42 17 C 35 11, 7 11, 0 17 Z"
                      fill="#1E3A8A"
                      opacity="0.18"
                    />

                    {/* Iris */}
                    <g className={styles.iris}>
                      {/* Huge Warm Amber/Chocolate Pixar Iris */}
                      <circle cx="20.5" cy="17" r="15.5" fill="url(#kIrisGrad)" />
                      {/* Soft Limbal Ring */}
                      <circle cx="20.5" cy="17" r="15.5" fill="none" stroke="#1A0802" strokeWidth="1.0" opacity="0.8" />

                      {/* Deep Velvety Circular Pupil */}
                      <circle cx="20.5" cy="17" r="9.0" fill="url(#kPupilGrad)" />
                      <circle cx="20.5" cy="17" r="7.6" fill="#0A0402" />

                      {/* Warm Amber Iris Caustic Reflection Arc */}
                      <ellipse cx="20.5" cy="24.1" rx="8.2" ry="2.7" fill="#FBBF24" opacity="0.55" />

                      {/* Soulful Natural Pixar Catchlights */}
                      <circle cx="24.8" cy="12.3" r="4.0" fill="#FFFFFF" opacity="0.98" />
                      <circle cx="15.6" cy="21.7" r="1.8" fill="#FFFFFF" opacity="0.8" />
                      <circle cx="26.2" cy="19.1" r="1.0" fill="#FFFFFF" opacity="0.55" />
                    </g>

                    {/* Inner Corner Tear Duct (Caruncle) Warmth */}
                    <circle cx="1.5" cy="17.0" r="2.0" fill="#FDA4AF" opacity="0.35" />

                    {/* Animated Upper Eyelid for Blinking */}
                    <path
                      d="M -2 -4 H 46 V 36 H -2 Z"
                      fill="#5B9AFA"
                      className={`${styles.eyelidUpper} ${isBlinking ? styles.blinkActive : ''}`}
                    />
                  </g>

                  {/* Soft Double-Eyelid Crease */}
                  <path
                    d="M 3 7 C 12 -2, 28 -2, 37 7"
                    fill="none"
                    stroke="#255BB5"
                    strokeWidth="1.1"
                    strokeLinecap="round"
                    opacity="0.32"
                  />

                  {/* Gentle Lower Lid Smiling Crinkle */}
                  <path
                    d="M 5 37 C 14 40, 24 40, 33 37"
                    fill="none"
                    stroke="#255BB5"
                    strokeWidth="0.8"
                    opacity="0.22"
                    strokeLinecap="round"
                  />

                  {/* Elegant Tapered Upper Lash Line */}
                  <path
                    d="M -1 17 C 7 -4, 35 -4, 43 17"
                    fill="none"
                    stroke="#0F172A"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />

                  {/* Delicate Soft Lower Lash Contour */}
                  <path
                    d="M 0 17 C 7 38, 35 38, 42 17"
                    fill="none"
                    stroke="#1E293B"
                    strokeWidth="1.0"
                    strokeLinecap="round"
                    opacity="0.35"
                  />
                </g>

                {/* ── Cute Soft Stylized 3D Toddler Nose ── */}
                <g transform="translate(190, 164)">
                  {/* Soft Vertically Defined Nose Bridge */}
                  <path
                    d="M -0.5 -10 C -1.4 -5, -1.4 -1, 0 1"
                    fill="none"
                    stroke="#E2F0FF"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    opacity="0.45"
                  />

                  {/* Soft Underside Shadow */}
                  <ellipse
                    cx="0"
                    cy="3.8"
                    rx="4.4"
                    ry="1.3"
                    fill="#1E3A8A"
                    opacity="0.15"
                  />

                  {/* Soft 3D Blended Nose Bulb */}
                  <ellipse
                    cx="0"
                    cy="1.0"
                    rx="5.4"
                    ry="4.2"
                    fill="url(#kNoseVolume)"
                  />

                  {/* Soft Rounded Nose Tip Highlight */}
                  <ellipse
                    cx="0"
                    cy="0.6"
                    rx="3.2"
                    ry="2.4"
                    fill="url(#kForeheadGlow)"
                    opacity="0.6"
                  />

                  {/* Extremely Subtle Nostril Shading */}
                  <circle cx="-2.6" cy="2.8" r="1.0" fill="#152B68" opacity="0.2" />
                  <circle cx="2.6" cy="2.8" r="1.0" fill="#152B68" opacity="0.2" />

                  {/* Specular Tip Highlight */}
                  <ellipse
                    cx="-0.8"
                    cy="0.2"
                    rx="1.7"
                    ry="1.2"
                    fill="#FFFFFF"
                    opacity="0.8"
                  />
                </g>

                {/* ── Pixar Stylized Little Krishna Smile & Expressive Mouth Group ── */}
                <g transform="translate(190, 181)">
                  <g
                    id="lipsGroup"
                    className={`${styles.pixarMouth} ${mood === 'speaking' ? styles.mouthSpeaking : ''}`}
                  >
                    {/* Labiomental Soft Under-Lip Crease (blends naturally into chin) */}
                    <path
                      d="M -6.5 5.2 Q 0 7.0 6.5 5.2"
                      fill="none"
                      stroke="#255BB5"
                      strokeWidth="1.0"
                      opacity="0.22"
                      strokeLinecap="round"
                    />

                    {/* Soft Natural Lower Lip Roll (Subtle warm skin flush, not lipstick) */}
                    <path
                      d="M -7.2 0.8 C -4.5 4.2, 4.5 4.2, 7.2 0.8 C 4.5 2.4, -4.5 2.4, -7.2 0.8 Z"
                      fill="url(#kPixarLowerLip)"
                    />

                    {/* Soft Natural Upper Lip Rim (Subtle warm skin blend) */}
                    <path
                      d="M -7.5 0 C -4 -0.9, 4 -0.9, 7.5 0 C 4.5 0.5, -4.5 0.5, -7.5 0 Z"
                      fill="url(#kPixarLipWarmth)"
                    />

                    {/* Speaking Mouth Cavity (smoothly opens/flexes during speech) */}
                    <g className={styles.mouthCavity}>
                      {/* Inner oral cavity */}
                      <path
                        d="M -6.0 0.8 C -4.5 4.8, 4.5 4.8, 6.0 0.8 Z"
                        fill="#3D1022"
                      />
                      {/* Subtle upper teeth accent bar */}
                      <path
                        d="M -4.5 1.0 C -2.8 1.8, 2.8 1.8, 4.5 1.0 C 3.2 1.5, -3.2 1.5, -4.5 1.0 Z"
                        fill="#FFFFFF"
                        opacity="0.9"
                      />
                      {/* Soft child tongue */}
                      <path
                        d="M -3.5 3.5 C -1.8 2.6, 1.8 2.6, 3.5 3.5 C 2.5 4.6, -2.5 4.6, -3.5 3.5 Z"
                        fill="#E27488"
                        opacity="0.85"
                      />
                    </g>

                    {/* Signature Pixar Corner Dimple Tucks */}
                    <path
                      d="M -8.8 -1.0 C -8.2 -0.2, -7.6 0.4, -6.8 0.2"
                      fill="none"
                      stroke="#3D182B"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      opacity="0.65"
                    />
                    <path
                      d="M 8.8 -1.0 C 8.2 -0.2, 7.6 0.4, 6.8 0.2"
                      fill="none"
                      stroke="#3D182B"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      opacity="0.65"
                    />

                    {/* Expressive Dynamic Pixar Smile Seam Line */}
                    <path
                      d="M -8.0 0 C -4.0 2.6, 4.0 2.6, 8.0 0"
                      fill="none"
                      stroke="#3D182B"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      className={styles.smileLine}
                    />
                  </g>
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

              {/* ════════════════ PEACOCK FEATHER HEADDRESS (REFERENCE FIDELITY) ════════════════ */}
              <g id="peacockFeather" className={styles.featherSvgAnim}>
                {/* Soft Ambient Contact Shadow Underneath Feather Base on Hair */}
                <ellipse cx="168" cy="48" rx="14" ry="6" fill="#0A1128" opacity="0.65" />

                {/* Feather Main Container (Root at 168, 44 with natural -9° upward lean) */}
                <g transform="translate(168, 44) rotate(-9)">
                  {/* ── A. Plume Background Shadow / Silhouette Definition ── */}
                  <path
                    d="M 0 -8
                     C -18 -20, -28 -44, -26 -68
                     C -24 -86, -12 -98, -4 -103
                     C 0 -105, 4 -103, 8 -98
                     C 20 -86, 28 -68, 26 -44
                     C 24 -20, 14 -8, 0 -8 Z"
                    fill="#022C22"
                    opacity="0.5"
                    transform="translate(0, 1.5)"
                  />

                  {/* ── B. Main Vibrant 3D Emerald Feather Plume ── */}
                  <path
                    d="M 0 -8
                     C -17 -20, -26 -44, -25 -68
                     C -23 -86, -11 -98, -3 -102
                     C 0 -103.5, 3 -102, 7 -98
                     C 19 -86, 27 -68, 25 -44
                     C 23 -20, 13 -8, 0 -8 Z"
                    fill="url(#kFeatherPlume)"
                    stroke="#047857"
                    strokeWidth="1.2"
                  />

                  {/* ── C. Iridescent Shimmer Overlay (Teal / Lime Transitions) ── */}
                  <path
                    d="M 0 -12
                     C -14 -22, -21 -42, -20 -64
                     C -18 -80, -9 -92, -2 -96
                     C 0 -97, 2 -96, 5 -92
                     C 15 -80, 22 -64, 20 -42
                     C 18 -22, 11 -12, 0 -12 Z"
                    fill="url(#kFeatherEyeCyan)"
                    opacity="0.32"
                  />

                  {/* ── D. Layered Feather Barbs (Left & Right Lateral Striations) ── */}
                  <g id="featherBarbs" opacity="0.85">
                    {/* Left Barbs */}
                    <path d="M -1 -18 C -10 -24, -18 -32, -22 -36" fill="none" stroke="#6EE7B7" strokeWidth="1.2" strokeLinecap="round" />
                    <path d="M -2 -28 C -12 -34, -20 -44, -25 -50" fill="none" stroke="#34D399" strokeWidth="1.3" strokeLinecap="round" />
                    <path d="M -2 -40 C -14 -48, -23 -58, -26 -66" fill="none" stroke="#22C55E" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M -2 -52 C -15 -62, -23 -72, -25 -82" fill="none" stroke="#4ADE80" strokeWidth="1.3" strokeLinecap="round" />
                    <path d="M -2 -66 C -14 -76, -18 -86, -18 -94" fill="none" stroke="#86EFAC" strokeWidth="1.2" strokeLinecap="round" />
                    <path d="M -1 -80 C -10 -90, -11 -96, -7 -100" fill="none" stroke="#BEF264" strokeWidth="1.1" strokeLinecap="round" />

                    {/* Right Barbs */}
                    <path d="M 1 -18 C 10 -24, 18 -32, 22 -36" fill="none" stroke="#6EE7B7" strokeWidth="1.2" strokeLinecap="round" />
                    <path d="M 2 -28 C 12 -34, 20 -44, 25 -50" fill="none" stroke="#34D399" strokeWidth="1.3" strokeLinecap="round" />
                    <path d="M 2 -40 C 14 -48, 23 -58, 26 -66" fill="none" stroke="#22C55E" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M 2 -52 C 15 -62, 23 -72, 25 -82" fill="none" stroke="#4ADE80" strokeWidth="1.3" strokeLinecap="round" />
                    <path d="M 2 -66 C 14 -76, 18 -86, 18 -94" fill="none" stroke="#86EFAC" strokeWidth="1.2" strokeLinecap="round" />
                    <path d="M 1 -80 C 10 -90, 11 -96, 7 -100" fill="none" stroke="#BEF264" strokeWidth="1.1" strokeLinecap="round" />

                    {/* Delicate Crown Feather Strands (Top Radiating Tips) */}
                    <path d="M -2 -98 C -5 -106, -8 -112, -12 -116" fill="none" stroke="#86EFAC" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
                    <path d="M -1 -102 C -2 -110, -3 -116, -4 -121" fill="none" stroke="#BEF264" strokeWidth="1.3" strokeLinecap="round" />
                    <path d="M 1 -102 C 2 -110, 4 -116, 5 -121" fill="none" stroke="#BEF264" strokeWidth="1.3" strokeLinecap="round" />
                    <path d="M 2 -98 C 5 -106, 9 -112, 13 -116" fill="none" stroke="#86EFAC" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
                  </g>

                  {/* ── E. The Iconic Peacock "Eye" (Ocellus) ── */}
                  <g id="featherEye" transform="translate(0, -62)">
                    {/* 1. Golden/Bronze Iridescent Halo Rim */}
                    <ellipse cx="0" cy="0" rx="19" ry="24" fill="url(#kFeatherEyeGold)" stroke="#78350F" strokeWidth="1.2" />
                    <ellipse cx="0" cy="0" rx="17.5" ry="22.5" fill="none" stroke="#FEF08A" strokeWidth="0.8" opacity="0.85" />

                    {/* 2. Vibrant Turquoise / Peacock Cyan Ring */}
                    <ellipse cx="0" cy="-0.5" rx="14" ry="18" fill="url(#kFeatherEyeCyan)" stroke="#0369A1" strokeWidth="1.0" />

                    {/* 3. Deep Royal Cobalt Blue Ring */}
                    <ellipse cx="0" cy="-1" rx="9.5" ry="12.5" fill="url(#kFeatherEyeNavy)" />

                    {/* 4. Velvety Midnight Indigo / Violet Pupil Center */}
                    <ellipse cx="-0.5" cy="-2" rx="5.5" ry="7.5" fill="url(#kFeatherEyeViolet)" />

                    {/* 5. 3D Specular Arc Catchlight */}
                    <path d="M -5 -6 C -2 -9.5, 3 -9.5, 6 -6" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.95" />
                    <circle cx="-3" cy="-4" r="1.5" fill="#FFFFFF" opacity="0.9" />
                  </g>

                  {/* ── F. 3D Golden / Bronze Central Shaft (Rachis) ── */}
                  <path
                    d="M 0 0 C -0.4 -26, -0.8 -62, -0.2 -98"
                    fill="none"
                    stroke="url(#kFeatherStem)"
                    strokeWidth="3.4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 0 0 C -0.4 -26, -0.8 -62, -0.2 -98"
                    fill="none"
                    stroke="#FEF08A"
                    strokeWidth="1.0"
                    strokeLinecap="round"
                    opacity="0.85"
                  />

                  {/* ── G. Elegant Golden Attachment / Base Clip on Hair ── */}
                  <g id="featherGoldBase" transform="translate(0, 0)">
                    {/* Base Occlusion Shadow */}
                    <ellipse cx="0" cy="2.5" rx="10" ry="4" fill="#0A1128" opacity="0.7" />
                    {/* Outer Gold Ring */}
                    <ellipse cx="0" cy="0" rx="8.5" ry="4.5" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.8" />
                    <ellipse cx="0" cy="-0.8" rx="6.5" ry="2.8" fill="none" stroke="#FEF08A" strokeWidth="0.8" opacity="0.9" />
                    {/* Central Inset Ruby Gem Cabochon */}
                    <circle cx="0" cy="0" r="3.0" fill="#DC2626" stroke="#7F1D1D" strokeWidth="0.5" />
                    <circle cx="-0.8" cy="-0.8" r="0.9" fill="#FFFFFF" opacity="0.85" />
                    {/* Small Lower Gold Beaded Droplet */}
                    <circle cx="0" cy="4.2" r="1.5" fill="url(#kGoldBead)" stroke="#78350F" strokeWidth="0.4" />
                  </g>
                </g>

                {/* ── H. Forefront Hair Curl Overlap (Anchors Clasp Physically Into Hair) ── */}
                <g id="featherHairAnchor">
                  <ellipse cx="163" cy="48" rx="7.5" ry="6" fill="url(#kHairCurl)" />
                  <ellipse cx="162" cy="46" rx="4.5" ry="3" fill="url(#kHairHl)" opacity="0.8" />
                  <ellipse cx="173" cy="48" rx="6.5" ry="5.5" fill="url(#kHairCurl)" />
                </g>
              </g>
            </g>
          </g>

          {/* ════════════════ LAYER 7: MULTI-STRAND GOLD NECKLACES ════════════════ */}
          <g id="necklace" filter="url(#kSoftShadow)">
            {/* Upper Choker-Style Gold Chain */}
            <path d="M 154 204 C 168 220, 212 220, 226 204" fill="none" stroke="url(#kGoldGrad)" strokeWidth="3.2" />
            <circle cx="166" cy="211" r="3.2" fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />
            <circle cx="178" cy="217" r="3.4" fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />
            <circle cx="190" cy="219" r="3.8" fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />
            <circle cx="202" cy="217" r="3.4" fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />
            <circle cx="214" cy="211" r="3.2" fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />

            {/* Lower Longer Curved Gold Bead Chain */}
            <path d="M 148 206 C 164 246, 216 246, 232 206" fill="none" stroke="url(#kGoldGrad)" strokeWidth="4.2" />
            <circle cx="158" cy="218" r="3.8" fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />
            <circle cx="158" cy="218" r="1.2" fill="#FFFFFF" opacity="0.9" />
            <circle cx="172" cy="228" r="4.2" fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />
            <circle cx="172" cy="228" r="1.3" fill="#FFFFFF" opacity="0.9" />
            <circle cx="208" cy="228" r="4.2" fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />
            <circle cx="208" cy="228" r="1.3" fill="#FFFFFF" opacity="0.9" />
            <circle cx="222" cy="218" r="3.8" fill="url(#kGoldBead)" stroke="#92400E" strokeWidth="0.5" />
            <circle cx="222" cy="218" r="1.2" fill="#FFFFFF" opacity="0.9" />

            {/* Ornate Gold & Ruby Medallion Pendant */}
            <g transform="translate(190, 236)">
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
              <circle cx="0" cy="0" r="5.5" fill="#DC2626" stroke="#991B1B" strokeWidth="0.8" />
              <circle cx="-1.6" cy="-1.6" r="1.8" fill="#FFFFFF" opacity="0.9" />
              {/* Teardrop Droplet */}
              <path
                d="M -3 10 C -3 7, 0 5, 0 5 C 0 5, 3 7, 3 10 C 3 13, -3 13, -3 10 Z"
                fill="url(#kGoldGrad)"
                stroke="#92400E"
                strokeWidth="0.6"
              />
              <circle cx="0" cy="11.5" r="1.2" fill="#FFFFFF" opacity="0.85" />
            </g>
          </g>

          {/* ════════════════ LAYER 8: SCULPTED ORGANIC 3D ARMS & HANDS ════════════════ */}
          <g id="canonicalChakraArms" filter="url(#kSoftShadow)">
            {/* ── A. RAISED RIGHT ARM (Viewer's Left - Character's Right) ── */}
            {/* Single Continuous Organic 3D Arm Silhouette (Shoulder → Elbow → Wrist) */}
            <path
              d="M 142 198
                 C 128 196, 110 202, 94 214
                 C 82 224, 76 230, 76 220
                 C 76 190, 85 150, 85 128
                 L 102 128
                 C 102 150, 96 204, 104 214
                 C 112 220, 128 214, 142 206 Z"
              fill="url(#kSkinBody)"
            />
            {/* Under-Armpit Ambient Shadow */}
            <path
              d="M 136 210 C 130 216, 126 226, 134 230"
              fill="none"
              stroke="#1E3A8A"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.2"
            />
            {/* Volumetric Bicep Highlight Sheen */}
            <path
              d="M 138 200 C 122 198, 108 204, 98 214"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3.5"
              strokeLinecap="round"
              opacity="0.22"
            />

            {/* Polished 3D Gold Armlet (Bajuband) on Right Bicep */}
            <g transform="translate(104, 202) rotate(14)">
              <ellipse cx="0" cy="2" rx="10" ry="4.5" fill="#0F172A" opacity="0.25" />
              <path d="M -9 -2 C -3 -4.5, 3 -4.5, 9 -2 L 9 2 C 3 -1, -3 -1, -9 2 Z" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.5" />
              <path d="M -8 -1 C -2 -3, 2 -3, 8 -1" fill="none" stroke="#FEF08A" strokeWidth="1.0" opacity="0.8" />
              <circle cx="0" cy="-1.5" r="2.5" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.5" />
              <circle cx="0" cy="-1.5" r="1.5" fill="#DC2626" />
              <circle cx="-0.4" cy="-1.8" r="0.5" fill="#FFFFFF" opacity="0.85" />
            </g>

            {/* Polished 3D Gold Bangles (Kadas) Wrapping Narrowed Wrist */}
            <g id="raisedWristBangles" transform="translate(93.5, 126)">
              <ellipse cx="0" cy="-5" rx="10.5" ry="3.5" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.5" />
              <ellipse cx="0" cy="-6" rx="7.5" ry="1.8" fill="none" stroke="#FFFBEB" strokeWidth="0.8" opacity="0.75" />
              <ellipse cx="0" cy="0" rx="10.5" ry="3.5" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.5" />
              <ellipse cx="0" cy="-1" rx="7.5" ry="1.8" fill="none" stroke="#FFFBEB" strokeWidth="0.8" opacity="0.75" />
              <ellipse cx="0" cy="5" rx="10.5" ry="3.5" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.5" />
              <ellipse cx="0" cy="4" rx="7.5" ry="1.8" fill="none" stroke="#FFFBEB" strokeWidth="0.8" opacity="0.75" />
            </g>

            {/* ── 3D SCULPTED TODDLER FIST WITH ERECT INDEX FINGER (Positioned Directly Beneath Chakra) ── */}
            <g id="sculptedChakraHand" transform="translate(93.5, 110)">
              {/* Chubby Toddler Fist Palm Base */}
              <path
                d="M -9 14
                   C -12 6, -11 -4, -5 -10
                   C 2 -11, 10 -6, 12 3
                   C 13 10, 8 16, 0 16
                   C -5 16, -8 16, -9 14 Z"
                fill="url(#kSkinBody)"
              />
              {/* Palm 3D Volume Core Glow */}
              <ellipse cx="1" cy="4" rx="7.5" ry="8.5" fill="url(#kHandVolume)" />

              {/* Folded Pinky (Outer bottom) */}
              <path
                d="M 1 9 C 7 8, 13 10, 13 14 C 13 17, 7 18, 1 16 Z"
                fill="url(#kSkinBody)"
              />
              <circle cx="9.5" cy="13.5" r="2.2" fill="url(#kSkinBody)" />
              <ellipse cx="8.5" cy="12.5" rx="1.2" ry="0.8" fill="#FFFFFF" opacity="0.25" />

              {/* Folded Ring Finger (Outer middle) */}
              <path
                d="M -1 3 C 6 2, 14 4, 14 8.5 C 14 12, 6 12.5, -1 10.5 Z"
                fill="url(#kSkinBody)"
              />
              <circle cx="10.5" cy="8" r="2.4" fill="url(#kSkinBody)" />
              <ellipse cx="9.5" cy="7" rx="1.3" ry="0.9" fill="#FFFFFF" opacity="0.28" />

              {/* Folded Middle Finger (Outer upper) */}
              <path
                d="M -2 -3 C 6 -4, 14 -2, 14 3 C 14 6.5, 6 7.5, -2 5.5 Z"
                fill="url(#kSkinBody)"
              />
              <circle cx="10.5" cy="2" r="2.5" fill="url(#kSkinBody)" />
              <ellipse cx="9.5" cy="1" rx="1.4" ry="0.9" fill="#FFFFFF" opacity="0.3" />

              {/* Plump Toddler Thumb (Naturally emerging across front of fist) */}
              <path
                d="M -9 11 C -14 5, -12 -3, -5 -4 C 1 -4, 3 0, 1 5 C -1 9, -5 12, -9 11 Z"
                fill="url(#kSkinBody)"
              />
              <ellipse cx="-5" cy="0" rx="3.0" ry="2.0" fill="#FFFFFF" opacity="0.2" />
              <circle cx="-1" cy="2.5" r="2.0" fill="url(#kSkinBody)" />

              {/* ── Extended Index Finger (Pointing straight up to balance chakra) ── */}
              {/* Base Finger Column */}
              <path
                d="M -5.8 -8 L -5.8 -30 C -5.8 -35, 0.8 -35, 0.8 -30 L 0.8 -8 Z"
                fill="url(#kSkinBody)"
              />
              {/* Soft Cylindrical Light Highlight */}
              <path
                d="M -3.8 -10 L -3.8 -28"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="1.4"
                strokeLinecap="round"
                opacity="0.3"
              />
              {/* Soft Rounded Distal Fingertip Bulb */}
              <ellipse cx="-2.5" cy="-31" rx="3.8" ry="4.2" fill="url(#kSkinBody)" />
              <ellipse cx="-2.5" cy="-33" rx="2.0" ry="2.2" fill="#FFFFFF" opacity="0.35" />
            </g>

            {/* ── B. LEFT ARM ON HIP (Viewer's Right) ── */}
            {/* Single Continuous Organic 3D Arm Silhouette (Shoulder → Elbow → Wrist) */}
            <path
              d="M 238 198
                 C 248 198, 264 206, 276 220
                 C 284 232, 282 246, 268 262
                 C 256 274, 246 278, 238 276
                 L 230 262
                 C 242 260, 252 254, 260 244
                 C 266 234, 266 226, 258 218
                 C 248 210, 240 206, 238 204 Z"
              fill="url(#kSkinBody)"
            />
            {/* Soft Under-Armpit Ambient Shadow */}
            <path
              d="M 244 210 C 250 216, 254 226, 246 230"
              fill="none"
              stroke="#1E3A8A"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.2"
            />
            {/* Volumetric Upper Arm Highlight Sheen */}
            <path
              d="M 242 200 C 252 200, 266 208, 274 220"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3.5"
              strokeLinecap="round"
              opacity="0.22"
            />

            {/* Polished 3D Gold Armlet (Bajuband) on Left Bicep */}
            <g transform="translate(254, 226) rotate(-18)">
              <ellipse cx="0" cy="2" rx="10" ry="4.5" fill="#0F172A" opacity="0.25" />
              <path d="M -9 -2 C -3 -4.5, 3 -4.5, 9 -2 L 9 2 C 3 -1, -3 -1, -9 2 Z" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.5" />
              <path d="M -8 -1 C -2 -3, 2 -3, 8 -1" fill="none" stroke="#FEF08A" strokeWidth="1.0" opacity="0.8" />
              <circle cx="0" cy="-1.5" r="2.5" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.5" />
              <circle cx="0" cy="-1.5" r="1.5" fill="#DC2626" />
              <circle cx="-0.4" cy="-1.8" r="0.5" fill="#FFFFFF" opacity="0.85" />
            </g>

            {/* Polished 3D Gold Bangles (Kadas) Wrapping Left Wrist */}
            <g id="hipWristBangles" transform="translate(240, 268) rotate(-28)">
              <ellipse cx="0" cy="-5" rx="10.5" ry="3.5" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.5" />
              <ellipse cx="0" cy="-6" rx="7.5" ry="1.8" fill="none" stroke="#FFFBEB" strokeWidth="0.8" opacity="0.75" />
              <ellipse cx="0" cy="0" rx="10.5" ry="3.5" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.5" />
              <ellipse cx="0" cy="-1" rx="7.5" ry="1.8" fill="none" stroke="#FFFBEB" strokeWidth="0.8" opacity="0.75" />
              <ellipse cx="0" cy="5" rx="10.5" ry="3.8" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.5" />
              <ellipse cx="0" cy="4" rx="7.5" ry="1.8" fill="none" stroke="#FFFBEB" strokeWidth="0.8" opacity="0.75" />
            </g>

            {/* 3D Toddler Hand Holding Waist (3D Arched Hook Fingers Wrapping Over Hip Curve) */}
            <g id="sculptedHipHand" transform="translate(236, 272) rotate(-24)">
              {/* Thumb (Wrapping UP and BACK around top of hip line) */}
              <path
                d="M 6 -4 C 12 -9, 18 -6, 20 0 C 20 5, 14 6, 8 2 Z"
                fill="url(#kSkinBody)"
              />
              <ellipse cx="14" cy="-2" rx="2.5" ry="1.5" fill="#FFFFFF" opacity="0.22" />
              <circle cx="19" cy="0" r="1.6" fill="url(#kSkinBody)" />

              {/* Smooth Dorsal Hand & Palm Volume Base */}
              <path
                d="M -6 -5 C 0 -8, 8 -6, 12 -2 C 14 4, 10 10, 4 12 C -3 12, -8 8, -9 2 C -9 -2, -7 -4, -6 -5 Z"
                fill="url(#kSkinBody)"
              />
              {/* Soft 3D Dorsal Hand Cushion Volume */}
              <ellipse cx="1" cy="2" rx="7.0" ry="6.0" fill="url(#kHandVolume)" />

              {/* Index Finger (3D Arched Hook wrapping over hip edge to front of waistband) */}
              <path
                d="M -6 2 C -12 6, -15 12, -12 18 C -10 21, -6 21, -5 18 C -7 13, -5 8, -1 3 Z"
                fill="url(#kSkinBody)"
              />
              <circle cx="-9.5" cy="18.5" r="2.0" fill="url(#kSkinBody)" />
              <ellipse cx="-9.5" cy="17.5" rx="1.0" ry="0.8" fill="#FFFFFF" opacity="0.3" />

              {/* Middle Finger (Longest Arched Hook wrapping around hip curve) */}
              <path
                d="M -1 4 C -6 9, -9 15, -6 22 C -4 25, 0 25, 1 22 C -2 15, 0 9, 3 4 Z"
                fill="url(#kSkinBody)"
              />
              <circle cx="-4" cy="22.5" r="2.1" fill="url(#kSkinBody)" />
              <ellipse cx="-4" cy="21.5" rx="1.1" ry="0.8" fill="#FFFFFF" opacity="0.32" />

              {/* Ring Finger (Following middle finger waist wrapping arc) */}
              <path
                d="M 4 4 C 0 9, -2 15, 1 20 C 3 23, 7 23, 8 20 C 5 15, 6 9, 8 4 Z"
                fill="url(#kSkinBody)"
              />
              <circle cx="3" cy="20.5" r="2.0" fill="url(#kSkinBody)" />
              <ellipse cx="3" cy="19.5" rx="1.0" ry="0.8" fill="#FFFFFF" opacity="0.3" />

              {/* Pinky Finger (Outer delicate digit wrapping side hip edge) */}
              <path
                d="M 9 3 C 6 7, 5 12, 7 16 C 9 18, 12 17, 13 15 C 11 11, 11 7, 12 3 Z"
                fill="url(#kSkinBody)"
              />
              <circle cx="9.5" cy="15.5" r="1.7" fill="url(#kSkinBody)" />
              <ellipse cx="9.5" cy="14.5" rx="0.9" ry="0.7" fill="#FFFFFF" opacity="0.25" />
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
