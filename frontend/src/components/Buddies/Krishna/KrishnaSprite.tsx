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
    if (pose === 'crossed') return 'idle';
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

            {/* Specialized 3D Volumetric Limb & Finger Gradients */}
            <radialGradient id="kArmVolumeShader" cx="38%" cy="28%" r="68%">
              <stop offset="0%" stopColor="#E2F0FF" />
              <stop offset="28%" stopColor="#96C6FF" />
              <stop offset="65%" stopColor="#5B9AFA" />
              <stop offset="90%" stopColor="#306FD8" />
              <stop offset="100%" stopColor="#1E4E9E" />
            </radialGradient>

            <linearGradient id="kToddlerFingerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#CCE3FF" />
              <stop offset="28%" stopColor="#7EBAFF" />
              <stop offset="72%" stopColor="#488DF8" />
              <stop offset="100%" stopColor="#2157B5" />
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

            {/* ── 3D Multi-Layer Volumetric Dhoti Fabric & Waistband Gradients ── */}
            {/* Belt / Waistband Rich Golden Orange & Gold Rim Shaders */}
            <linearGradient id="kDhotiWaistGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFAE5C" />
              <stop offset="18%" stopColor="#F97316" />
              <stop offset="55%" stopColor="#EA580C" />
              <stop offset="85%" stopColor="#C2410C" />
              <stop offset="100%" stopColor="#7C2D12" />
            </linearGradient>

            <linearGradient id="kGoldBeltRim" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#B45309" />
              <stop offset="20%" stopColor="#FBBF24" />
              <stop offset="48%" stopColor="#FFFFFF" />
              <stop offset="78%" stopColor="#FDE68A" />
              <stop offset="100%" stopColor="#92400E" />
            </linearGradient>

            <radialGradient id="kGoldDomeStud" cx="32%" cy="28%" r="68%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="22%" stopColor="#FEF08A" />
              <stop offset="55%" stopColor="#F59E0B" />
              <stop offset="85%" stopColor="#B45309" />
              <stop offset="100%" stopColor="#662200" />
            </radialGradient>

            {/* Base Under-wrap gradient */}
            <linearGradient id="kDhotiBaseGrad" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#FFF4AD" />
              <stop offset="22%" stopColor="#FBBF24" />
              <stop offset="58%" stopColor="#E08B00" />
              <stop offset="88%" stopColor="#B45F00" />
              <stop offset="100%" stopColor="#7C3B00" />
            </linearGradient>

            {/* Left Fabric Mass (Key-lit from upper-left) */}
            <radialGradient id="kDhotiLeftMassGrad" cx="32%" cy="26%" r="72%">
              <stop offset="0%" stopColor="#FFFDEB" />
              <stop offset="28%" stopColor="#FCD34D" />
              <stop offset="62%" stopColor="#F59E0B" />
              <stop offset="88%" stopColor="#C97300" />
              <stop offset="100%" stopColor="#924700" />
            </radialGradient>

            {/* Right Fabric Mass (Ambient warmth) */}
            <radialGradient id="kDhotiRightMassGrad" cx="44%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="32%" stopColor="#FBBF24" />
              <stop offset="68%" stopColor="#D97706" />
              <stop offset="92%" stopColor="#A45100" />
              <stop offset="100%" stopColor="#783400" />
            </radialGradient>

            {/* 6 Large Sculptural Fabric Folds */}
            <linearGradient id="kDhotiFoldL1Grad" x1="15%" y1="10%" x2="85%" y2="90%">
              <stop offset="0%" stopColor="#FFFFF4" />
              <stop offset="20%" stopColor="#FDE68A" />
              <stop offset="55%" stopColor="#F59E0B" />
              <stop offset="85%" stopColor="#C26500" />
              <stop offset="100%" stopColor="#8A4200" />
            </linearGradient>

            <linearGradient id="kDhotiFoldL2Grad" x1="12%" y1="18%" x2="88%" y2="82%">
              <stop offset="0%" stopColor="#FFFCE6" />
              <stop offset="24%" stopColor="#FCD34D" />
              <stop offset="60%" stopColor="#E28900" />
              <stop offset="88%" stopColor="#A85700" />
              <stop offset="100%" stopColor="#753500" />
            </linearGradient>

            <linearGradient id="kDhotiFoldL3Grad" x1="10%" y1="20%" x2="90%" y2="80%">
              <stop offset="0%" stopColor="#FFF9D2" />
              <stop offset="26%" stopColor="#FBBF24" />
              <stop offset="64%" stopColor="#D97706" />
              <stop offset="90%" stopColor="#9E4E00" />
              <stop offset="100%" stopColor="#6E3000" />
            </linearGradient>

            <linearGradient id="kDhotiFoldR1Grad" x1="85%" y1="10%" x2="15%" y2="90%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="28%" stopColor="#FBBF24" />
              <stop offset="65%" stopColor="#D97706" />
              <stop offset="88%" stopColor="#A85700" />
              <stop offset="100%" stopColor="#7C3B00" />
            </linearGradient>

            <linearGradient id="kDhotiFoldR2Grad" x1="80%" y1="20%" x2="20%" y2="80%">
              <stop offset="0%" stopColor="#FFF3A8" />
              <stop offset="28%" stopColor="#F59E0B" />
              <stop offset="65%" stopColor="#C97300" />
              <stop offset="92%" stopColor="#924700" />
              <stop offset="100%" stopColor="#662C00" />
            </linearGradient>

            {/* Central Cascading Pleat Gradients */}
            <linearGradient id="kDhotiPleatTopGrad" x1="30%" y1="0%" x2="70%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="20%" stopColor="#FEF3C7" />
              <stop offset="55%" stopColor="#FBBF24" />
              <stop offset="85%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#9E4E00" />
            </linearGradient>

            <linearGradient id="kDhotiPleatMidGrad" x1="40%" y1="0%" x2="60%" y2="100%">
              <stop offset="0%" stopColor="#FEF3C7" />
              <stop offset="28%" stopColor="#F59E0B" />
              <stop offset="68%" stopColor="#C97300" />
              <stop offset="100%" stopColor="#8A3E00" />
            </linearGradient>

            <linearGradient id="kDhotiPleatDeepGrad" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#E28900" />
              <stop offset="50%" stopColor="#B45F00" />
              <stop offset="100%" stopColor="#6C2E00" />
            </linearGradient>

            {/* Orange Hanging Silk Side Cloth (2 broad volumetric rounded folds) */}
            <linearGradient id="kDhotiOrangeSash1" x1="15%" y1="0%" x2="85%" y2="100%">
              <stop offset="0%" stopColor="#FFC685" />
              <stop offset="26%" stopColor="#FF8B1F" />
              <stop offset="65%" stopColor="#D95600" />
              <stop offset="90%" stopColor="#A83900" />
              <stop offset="100%" stopColor="#752100" />
            </linearGradient>

            <linearGradient id="kDhotiOrangeSash2" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#FFE4C2" />
              <stop offset="24%" stopColor="#FFA64D" />
              <stop offset="58%" stopColor="#EA580C" />
              <stop offset="88%" stopColor="#B43800" />
              <stop offset="100%" stopColor="#7C1D00" />
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

            <filter id="kSoftShadow" x="-50%" y="-50%" width="200%" height="200%">
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

            {/* ── Little Krishna's 3D Golden Anklets (Payal / Ghungroo) ── */}
            <g id="anklets">
              {/* Left Anklet */}
              <ellipse cx="148" cy="422" rx="14" ry="4" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.8" />
              <ellipse cx="148" cy="421" rx="12" ry="2" fill="none" stroke="#FFF9D6" strokeWidth="0.8" opacity="0.8" />
              {/* Left Anklet Gold Beads */}
              {[138, 143, 148, 153, 158].map((bx, i) => (
                <circle key={`la-${i}`} cx={bx} cy="424" r="2.2" fill="url(#kGoldDomeRivet)" stroke="#78350F" strokeWidth="0.4" />
              ))}

              {/* Right Anklet */}
              <ellipse cx="224" cy="422" rx="14" ry="4" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.8" />
              <ellipse cx="224" cy="421" rx="12" ry="2" fill="none" stroke="#FFF9D6" strokeWidth="0.8" opacity="0.8" />
              {/* Right Anklet Gold Beads */}
              {[214, 219, 224, 229, 234].map((bx, i) => (
                <circle key={`ra-${i}`} cx={bx} cy="424" r="2.2" fill="url(#kGoldDomeRivet)" stroke="#78350F" strokeWidth="0.4" />
              ))}
            </g>
          </g>

          {/* ════════════════ LAYER 3: LEGS ════════════════ */}
          <g id="legs" transform="translate(190,290) scale(1,1.06) translate(-190,-290)">
            {/* Left Leg Pillar (Exposed between dhoti hem and ankle) */}
            <path
              d="M 150 322 C 144 360, 144 394, 148 424"
              fill="none"
              stroke="url(#kSkinLimb)"
              strokeWidth="28"
              strokeLinecap="round"
            />
            <path
              d="M 150 322 C 144 360, 144 394, 148 424"
              fill="none"
              stroke="#D9ECFF"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.45"
            />

            {/* Right Leg Pillar (Exposed between dhoti hem and ankle) */}
            <path
              d="M 230 322 C 236 360, 236 394, 232 424"
              fill="none"
              stroke="url(#kSkinLimb)"
              strokeWidth="28"
              strokeLinecap="round"
            />
            <path
              d="M 230 322 C 236 360, 236 394, 232 424"
              fill="none"
              stroke="#D9ECFF"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.45"
            />

            {/* Soft Ambient Crotch / Inseam Shadow between legs */}
            <ellipse cx="190" cy="360" rx="16" ry="24" fill="#1E3A8A" opacity="0.2" />
          </g>

          {/* ════════════════ LAYER 4: 3D WRAPPED LAYERED DHOTI, SCULPTED WAISTBAND & SILK SASH ════════════════ */}
          <g id="dhoti" filter="url(#kSoftShadow)" transform="translate(190,290) scale(1,1.06) translate(-190,-290)">

            {/* ── 1. BASE WRAP SILHOUETTE (Full-Length Anatomical Leg Wraps) ── */}
            <g id="dhotiBaseStructure">
              {/* Soft ambient occlusion shadow under waistband */}
              <ellipse cx="190" cy="288" rx="64" ry="10" fill="#7C2D12" opacity="0.32" />

              {/* Full-length base silhouette reaching ankles (y=416) with distinct two-leg separation */}
              <path
                d="M 124 296
                   C 114 330, 115 368, 122 402
                   C 126 414, 136 418, 150 418
                   C 162 418, 170 412, 174 400
                   C 178 376, 184 356, 190 354
                   C 196 356, 202 376, 206 400
                   C 210 412, 218 418, 230 418
                   C 244 418, 254 414, 258 402
                   C 265 368, 266 330, 256 296
                   C 246 286, 224 282, 190 282
                   C 156 282, 134 286, 124 296 Z"
                fill="url(#kDhotiBaseGrad)"
                stroke="#A85700"
                strokeWidth="1.0"
              />

              {/* Inseam Shadow Crease (Separation between the two wrapped legs) */}
              <path
                d="M 174 400
                   C 182 374, 186 356, 190 354
                   C 194 356, 198 374, 206 400
                   C 200 392, 194 384, 190 384
                   C 186 384, 180 392, 174 400 Z"
                fill="#5B2305"
                opacity="0.48"
              />
            </g>

            {/* ── 2. LEFT & RIGHT MAJOR FRONT FABRIC MASSES ── */}
            <g id="dhotiMajorFabricMasses">
              {/* Left Front Thigh & Shin Mass */}
              <path
                d="M 124 296
                   C 116 330, 116 368, 124 400
                   C 128 414, 140 418, 152 418
                   C 162 418, 170 412, 174 398
                   C 176 372, 166 342, 152 318
                   C 142 304, 132 296, 124 296 Z"
                fill="url(#kDhotiLeftMassGrad)"
                stroke="#B45F00"
                strokeWidth="0.9"
              />

              {/* Left Fabric Mass Soft Crest Highlight */}
              <path
                d="M 130 304
                   C 124 332, 126 364, 134 394
                   C 138 410, 146 414, 154 412
                   C 150 400, 144 382, 142 362
                   C 140 338, 136 320, 130 304 Z"
                fill="#FFFFF0"
                opacity="0.45"
              />

              {/* Right Front Thigh & Shin Mass */}
              <path
                d="M 256 296
                   C 264 330, 264 368, 256 400
                   C 252 414, 240 418, 228 418
                   C 218 418, 210 412, 206 398
                   C 204 372, 214 342, 228 318
                   C 238 304, 248 296, 256 296 Z"
                fill="url(#kDhotiRightMassGrad)"
                stroke="#B45F00"
                strokeWidth="0.9"
              />

              {/* Right Fabric Mass Soft Ambient Shading */}
              <path
                d="M 252 306
                   C 258 334, 258 366, 252 394
                   C 248 408, 240 414, 232 414
                   C 238 404, 244 390, 248 372
                   C 252 348, 252 326, 252 306 Z"
                fill="#783400"
                opacity="0.22"
              />
            </g>

            {/* ── 3. GATHERED FABRIC PUCKER TRANSITION (Underneath Waistband) ── */}
            <g id="dhotiWaistGathers">
              {/* Soft contact shadow beneath belt */}
              <path
                d="M 128 292
                   C 158 308, 222 308, 252 292
                   C 250 302, 222 316, 190 316
                   C 158 316, 130 302, 128 292 Z"
                fill="#451A03"
                opacity="0.55"
              />

              {/* Fabric gather puckers emerging under the waistband */}
              {[
                { x1: 140, y1: 288, x2: 142, y2: 308 },
                { x1: 158, y1: 294, x2: 162, y2: 314 },
                { x1: 176, y1: 298, x2: 178, y2: 318 },
                { x1: 204, y1: 298, x2: 202, y2: 318 },
                { x1: 222, y1: 294, x2: 218, y2: 314 },
                { x1: 240, y1: 288, x2: 238, y2: 308 },
              ].map((g, idx) => (
                <g key={`gather-${idx}`}>
                  <path d={`M ${g.x1} ${g.y1} Q ${g.x2} ${g.y2 - 5}, ${g.x2} ${g.y2}`} fill="none" stroke="#662200" strokeWidth="1.6" opacity="0.35" strokeLinecap="round" />
                  <path d={`M ${g.x1 + 1.5} ${g.y1} Q ${g.x2 + 1.5} ${g.y2 - 5}, ${g.x2 + 1.5} ${g.y2}`} fill="none" stroke="#FFFDEB" strokeWidth="1.2" opacity="0.75" strokeLinecap="round" />
                </g>
              ))}
            </g>

            {/* ── 4. BROAD OVERLAPPING SCULPTURAL FABRIC FOLDS (5 MAJOR FOLDS) ── */}
            <g id="dhotiSculpturalFolds">
              {/* ── LEFT FOLD 1: Upper Left-to-Center Diagonal Gather Fold ── */}
              <path
                d="M 122 312
                   C 142 336, 166 356, 188 368
                   C 190 374, 186 378, 180 376
                   C 158 364, 134 340, 118 318 Z"
                fill="#5B2305"
                opacity="0.35"
              />
              <path
                d="M 122 302
                   C 142 328, 166 350, 188 364
                   C 190 368, 186 372, 180 370
                   C 158 356, 132 332, 118 308
                   C 119 304, 120 302, 122 302 Z"
                fill="url(#kDhotiFoldL1Grad)"
                stroke="#B45F00"
                strokeWidth="0.8"
              />
              <path
                d="M 124 304
                   C 144 328, 166 348, 184 362"
                fill="none"
                stroke="#FFFFF0"
                strokeWidth="2.8"
                strokeLinecap="round"
                opacity="0.65"
              />

              {/* ── LEFT FOLD 2: Mid Sweeping J-Fold (Reference curvature) ── */}
              <path
                d="M 118 346
                   C 134 374, 156 394, 180 404
                   C 182 410, 176 414, 170 410
                   C 148 398, 128 372, 114 348 Z"
                fill="#5B2305"
                opacity="0.32"
              />
              <path
                d="M 118 338
                   C 134 366, 158 388, 180 398
                   C 182 402, 178 406, 172 404
                   C 150 392, 128 368, 114 340
                   C 115 338, 116 338, 118 338 Z"
                fill="url(#kDhotiFoldL2Grad)"
                stroke="#A85700"
                strokeWidth="0.8"
              />
              <path
                d="M 120 340
                   C 136 366, 158 386, 174 394"
                fill="none"
                stroke="#FFFCE8"
                strokeWidth="2.6"
                strokeLinecap="round"
                opacity="0.6"
              />

              {/* ── LEFT FOLD 3: Lower Calf Wrap Fold ── */}
              <path
                d="M 120 380
                   C 136 404, 152 414, 168 416
                   C 170 420, 164 422, 156 420
                   C 140 416, 126 402, 116 384 Z"
                fill="#5B2305"
                opacity="0.3"
              />
              <path
                d="M 120 372
                   C 136 396, 154 410, 168 414
                   C 170 418, 166 420, 158 418
                   C 142 412, 128 398, 116 376
                   Z"
                fill="url(#kDhotiFoldL3Grad)"
                stroke="#A85700"
                strokeWidth="0.8"
              />
              <path
                d="M 122 374
                   C 138 396, 154 408, 166 412"
                fill="none"
                stroke="#FFF9D2"
                strokeWidth="2.4"
                strokeLinecap="round"
                opacity="0.55"
              />

              {/* ── RIGHT FOLD 1: Upper Right-to-Center Diagonal Wrap Fold ── */}
              <path
                d="M 258 312
                   C 238 336, 214 356, 192 368
                   C 190 374, 194 378, 200 376
                   C 222 364, 246 340, 262 318 Z"
                fill="#5B2305"
                opacity="0.35"
              />
              <path
                d="M 258 302
                   C 238 328, 214 350, 192 364
                   C 190 368, 194 372, 200 370
                   C 222 356, 248 332, 262 308
                   C 261 304, 260 302, 258 302 Z"
                fill="url(#kDhotiFoldR1Grad)"
                stroke="#B45F00"
                strokeWidth="0.8"
              />
              <path
                d="M 256 304
                   C 236 328, 214 348, 196 362"
                fill="none"
                stroke="#FEF08A"
                strokeWidth="2.6"
                strokeLinecap="round"
                opacity="0.6"
              />

              {/* ── RIGHT FOLD 2: Lower Right Wrapping Calf Fold ── */}
              <path
                d="M 262 364
                   C 246 390, 226 410, 210 414
                   C 208 420, 214 422, 222 420
                   C 240 414, 258 392, 266 370 Z"
                fill="#5B2305"
                opacity="0.32"
              />
              <path
                d="M 262 354
                   C 246 382, 224 402, 208 410
                   C 206 414, 212 418, 220 416
                   C 238 408, 256 384, 266 362
                   C 265 358, 264 356, 262 354 Z"
                fill="url(#kDhotiFoldR2Grad)"
                stroke="#A85700"
                strokeWidth="0.8"
              />
              <path
                d="M 260 356
                   C 244 382, 224 400, 210 408"
                fill="none"
                stroke="#FFF9D2"
                strokeWidth="2.4"
                strokeLinecap="round"
                opacity="0.55"
              />
            </g>

            {/* ── 5. CENTRAL OVERLAPPING PLEAT CASCADE (MULTI-LAYER DEPTH) ── */}
            <g id="dhotiCentralPleatCascade">
              {/* Pleat Tier 1: Deep Underlying Central Drape */}
              <path
                d="M 182 292
                   C 180 326, 180 364, 186 394
                   C 188 400, 192 400, 194 394
                   C 200 364, 200 326, 198 292
                   Z"
                fill="url(#kDhotiPleatDeepGrad)"
                opacity="0.85"
              />
              <path
                d="M 188 296 C 187 328, 187 362, 190 392"
                fill="none"
                stroke="#451A03"
                strokeWidth="2.8"
                strokeLinecap="round"
                opacity="0.38"
              />

              {/* Pleat Tier 2: Mid Cascading Pleat */}
              <path
                d="M 178 298
                   C 176 324, 176 352, 182 378
                   C 185 384, 195 384, 198 378
                   C 204 352, 204 324, 202 298
                   Z"
                fill="#451A03"
                opacity="0.32"
              />
              <path
                d="M 178 296
                   C 176 322, 176 350, 182 376
                   C 185 382, 195 382, 198 376
                   C 204 350, 204 322, 202 296
                   Z"
                fill="url(#kDhotiPleatMidGrad)"
                stroke="#A85700"
                strokeWidth="0.8"
              />
              <path
                d="M 180 300 C 178 324, 178 350, 184 372"
                fill="none"
                stroke="#FEF3C7"
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity="0.7"
              />

              {/* Pleat Tier 3: Foreground Central Tucked Fold */}
              <path
                d="M 180 292
                   C 178 314, 178 334, 182 356
                   C 185 362, 195 362, 198 356
                   C 202 334, 202 314, 200 292
                   Z"
                fill="#451A03"
                opacity="0.38"
              />
              <path
                d="M 182 290
                   C 180 312, 180 332, 184 354
                   C 186 360, 194 360, 196 354
                   C 200 332, 200 312, 198 290
                   Z"
                fill="url(#kDhotiPleatTopGrad)"
                stroke="#C26500"
                strokeWidth="0.8"
              />
              <path
                d="M 184 294 C 182 312, 182 332, 186 350"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2.0"
                strokeLinecap="round"
                opacity="0.85"
              />
              <path
                d="M 190 292 C 189 312, 189 334, 191 352"
                fill="none"
                stroke="#B45F00"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.45"
              />
            </g>

            {/* ── 6. LOWER HEM PIPING & ACCENT (Full-Length Ankle Cuffs) ── */}
            <g id="dhotiHemAccents">
              {/* Left Hem Gold Accent Rim at Ankle */}
              <path
                d="M 126 410
                   C 134 418, 146 418, 156 418
                   C 164 418, 170 414, 174 402"
                fill="none"
                stroke="#FEF08A"
                strokeWidth="2.0"
                strokeLinecap="round"
                opacity="0.85"
              />
              <path
                d="M 126 412
                   C 134 420, 146 420, 156 420
                   C 164 420, 170 416, 174 404"
                fill="none"
                stroke="#5B2305"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.6"
              />

              {/* Right Hem Gold Accent Rim at Ankle */}
              <path
                d="M 206 402
                   C 210 414, 216 418, 224 418
                   C 234 418, 246 418, 254 410"
                fill="none"
                stroke="#FEF08A"
                strokeWidth="2.0"
                strokeLinecap="round"
                opacity="0.85"
              />
              <path
                d="M 206 404
                   C 210 416, 216 420, 224 420
                   C 234 420, 246 420, 254 412"
                fill="none"
                stroke="#5B2305"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.6"
              />
            </g>

            {/* ── 7. SEPARATE ORANGE SILK SIDE DRAPE (2 Broad Volumetric Folds) ── */}
            <g id="orangeSashVertical">
              {/* Deep contact shadow cast by orange drape onto dhoti fabric */}
              <path
                d="M 230 294
                   C 230 334, 232 376, 234 412
                   C 240 420, 264 420, 266 410
                   C 264 368, 260 326, 258 292 Z"
                fill="#451A03"
                opacity="0.45"
              />

              {/* ── Fold 1 (Outer Broad Fold) ── */}
              <path
                d="M 246 294
                   C 246 334, 248 376, 250 412
                   C 254 418, 264 416, 265 408
                   C 263 366, 260 326, 258 292 Z"
                fill="url(#kDhotiOrangeSash1)"
                stroke="#752100"
                strokeWidth="0.9"
              />
              <path
                d="M 254 296 C 254 334, 256 376, 258 408"
                fill="none"
                stroke="#FFC278"
                strokeWidth="2.0"
                strokeLinecap="round"
                opacity="0.85"
              />

              {/* ── Fold 2 (Inner Rounded Fold) ── */}
              <path
                d="M 234 296
                   C 234 336, 236 378, 238 414
                   C 242 420, 250 418, 250 410
                   C 248 368, 246 330, 244 294 Z"
                fill="url(#kDhotiOrangeSash2)"
                stroke="#7C1D00"
                strokeWidth="0.9"
              />
              <path
                d="M 242 298 C 242 338, 243 380, 244 410"
                fill="none"
                stroke="#FFFBEB"
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity="0.9"
              />
              <path
                d="M 237 298 C 237 338, 238 380, 239 410"
                fill="none"
                stroke="#7C1D00"
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity="0.45"
              />
            </g>

            {/* ── 8. SLIMMER, 3D CURVED ORNAMENTAL WAISTBAND WITH 6 DOME STUDS ── */}
            <g id="studdedBeltGroup">
              {/* Main Waistband Belt Contour (Slimmer, wrapping naturally around child waist) */}
              <path
                d="M 130 278
                   C 158 266, 222 266, 250 278
                   C 256 294, 224 306, 190 306
                   C 156 306, 124 294, 130 278 Z"
                fill="url(#kDhotiWaistGrad)"
                stroke="#662200"
                strokeWidth="1.2"
              />

              {/* Belt Top Edge Rolled Gold Piping Rim */}
              <path
                d="M 131 278 C 158 267, 222 267, 249 278"
                fill="none"
                stroke="url(#kGoldBeltRim)"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              {/* Top rim specular highlight glint */}
              <path
                d="M 154 271 C 176 268, 204 268, 226 271"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="1.0"
                strokeLinecap="round"
                opacity="0.85"
              />

              {/* Belt Bottom Edge Rolled Gold Piping Rim */}
              <path
                d="M 131 292 C 158 304, 222 304, 249 292"
                fill="none"
                stroke="url(#kGoldBeltRim)"
                strokeWidth="2.0"
                strokeLinecap="round"
              />
              {/* Belt Bottom Edge Deep Shadow Crease */}
              <path
                d="M 131 294 C 158 306, 222 306, 249 294"
                fill="none"
                stroke="#3D1200"
                strokeWidth="1.4"
                opacity="0.75"
              />

              {/* 6 Raised 3D Gold Dome Studs Following Curved Waistline */}
              <g id="waistBeltDomeRivets">
                {[
                  { cx: 144, cy: 285, r: 4.8 },
                  { cx: 162, cy: 290, r: 5.2 },
                  { cx: 181, cy: 294, r: 5.4 },
                  { cx: 199, cy: 294, r: 5.4 },
                  { cx: 218, cy: 290, r: 5.2 },
                  { cx: 236, cy: 285, r: 4.8 },
                ].map((stud, idx) => (
                  <g key={`stud-${idx}`}>
                    {/* Dark gold shadow beneath stud */}
                    <circle cx={stud.cx} cy={stud.cy + 1.2} r={stud.r + 0.5} fill="#2E0C00" opacity="0.65" />
                    {/* 3D Gold Dome Body */}
                    <circle
                      cx={stud.cx}
                      cy={stud.cy}
                      r={stud.r}
                      fill="url(#kGoldDomeStud)"
                      stroke="#662200"
                      strokeWidth="0.7"
                    />
                    {/* Inner 3D Sphere Glow Ridge */}
                    <circle cx={stud.cx} cy={stud.cy} r={stud.r * 0.72} fill="none" stroke="#FFF3B0" strokeWidth="0.7" opacity="0.85" />
                    {/* Tiny Bright Specular Highlight */}
                    <circle cx={stud.cx - stud.r * 0.32} cy={stud.cy - stud.r * 0.32} r={stud.r * 0.3} fill="#FFFFFF" opacity="0.95" />
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

                {/* ── Left Eye (Cute Soft Almond-Shaped 3D Child Eye) ── */}
                <g id="leftEyeGroup" transform="translate(135, 120)">
                  <clipPath id="kLeftEyeClip">
                    <path d="M -1 16.2 C 6 -1.5, 33 -1.5, 46 17.8 C 35 36.5, 10 36.0, -1 16.2 Z" />
                  </clipPath>

                  {/* Eye Socket Ambient Shadow */}
                  <path
                    d="M -3 15.2 C 4 -3.0, 35 -3.0, 48 16.8 C 37 38.5, 8 38.0, -3 15.2 Z"
                    fill="#1E3A8A"
                    opacity="0.12"
                  />

                  {/* Sclera (Warm Natural White) */}
                  <path
                    d="M -1 16.2 C 6 -1.5, 33 -1.5, 46 17.8 C 35 36.5, 10 36.0, -1 16.2 Z"
                    fill="#F6F9FC"
                  />

                  {/* Eyeball Core (Clipped to Eyelids so iris is naturally tucked) */}
                  <g clipPath="url(#kLeftEyeClip)">
                    {/* Upper Eyeball Drop Shadow */}
                    <path
                      d="M -1 16.2 C 6 -1.5, 33 -1.5, 46 17.8 C 33 11.0, 6 11.0, -1 16.2 Z"
                      fill="#1E3A8A"
                      opacity="0.18"
                    />

                    {/* Iris */}
                    <g className={styles.iris}>
                      {/* Warm Amber/Chocolate Pixar Iris */}
                      <circle cx="22.5" cy="17.5" r="16.0" fill="url(#kIrisGrad)" />
                      {/* Soft Limbal Ring */}
                      <circle cx="22.5" cy="17.5" r="16.0" fill="none" stroke="#1A0802" strokeWidth="1.0" opacity="0.8" />

                      {/* Deep Velvety Circular Pupil */}
                      <circle cx="22.5" cy="17.5" r="9.3" fill="url(#kPupilGrad)" />
                      <circle cx="22.5" cy="17.5" r="7.8" fill="#0A0402" />

                      {/* Warm Amber Iris Caustic Reflection Arc */}
                      <ellipse cx="22.5" cy="24.8" rx="8.5" ry="2.8" fill="#FBBF24" opacity="0.55" />

                      {/* Soulful Natural Pixar Catchlights */}
                      <circle cx="26.8" cy="12.5" r="4.2" fill="#FFFFFF" opacity="0.98" />
                      <circle cx="17.2" cy="22.2" r="1.9" fill="#FFFFFF" opacity="0.8" />
                      <circle cx="28.2" cy="19.5" r="1.1" fill="#FFFFFF" opacity="0.55" />
                    </g>

                    {/* Inner Corner Tear Duct (Caruncle) Warmth */}
                    <circle cx="44.5" cy="17.8" r="2.2" fill="#FDA4AF" opacity="0.35" />

                    {/* Animated Upper Eyelid for Blinking */}
                    <path
                      d="M -4 -6 H 50 V 38 H -4 Z"
                      fill="#5B9AFA"
                      className={`${styles.eyelidUpper} ${isBlinking ? styles.blinkActive : ''}`}
                    />
                  </g>

                  {/* Soft Double-Eyelid Crease */}
                  <path
                    d="M 3 6 C 12 -4, 30 -4, 40 5"
                    fill="none"
                    stroke="#255BB5"
                    strokeWidth="1.1"
                    strokeLinecap="round"
                    opacity="0.32"
                  />

                  {/* Gentle Lower Lid Smiling Crinkle */}
                  <path
                    d="M 6 38.5 C 16 41.5, 28 41.5, 37 38.5"
                    fill="none"
                    stroke="#255BB5"
                    strokeWidth="0.8"
                    opacity="0.22"
                    strokeLinecap="round"
                  />

                  {/* Elegant Tapered Upper Lash Line */}
                  <path
                    d="M -2 16.2 C 5 -3.0, 34 -3.0, 47 17.8"
                    fill="none"
                    stroke="#0F172A"
                    strokeWidth="3.6"
                    strokeLinecap="round"
                  />

                  {/* Delicate Soft Lower Lash Contour */}
                  <path
                    d="M 46 17.8 C 35 36.5, 10 36.0, -1 16.2"
                    fill="none"
                    stroke="#1E293B"
                    strokeWidth="1.1"
                    strokeLinecap="round"
                    opacity="0.35"
                  />
                </g>

                {/* ── Right Eye (Cute Soft Almond-Shaped 3D Child Eye) ── */}
                <g id="rightEyeGroup" transform="translate(198, 120)">
                  <clipPath id="kRightEyeClip">
                    <path d="M -1 17.8 C 12 -1.5, 39 -1.5, 46 16.2 C 35 36.0, 10 36.5, -1 17.8 Z" />
                  </clipPath>

                  {/* Eye Socket Ambient Shadow */}
                  <path
                    d="M -3 16.8 C 10 -3.0, 41 -3.0, 48 15.2 C 37 38.0, 8 38.5, -3 16.8 Z"
                    fill="#1E3A8A"
                    opacity="0.12"
                  />

                  {/* Sclera (Warm Natural White) */}
                  <path
                    d="M -1 17.8 C 12 -1.5, 39 -1.5, 46 16.2 C 35 36.0, 10 36.5, -1 17.8 Z"
                    fill="#F6F9FC"
                  />

                  {/* Eyeball Core (Clipped to Eyelids) */}
                  <g clipPath="url(#kRightEyeClip)">
                    {/* Upper Eyeball Drop Shadow */}
                    <path
                      d="M -1 17.8 C 12 -1.5, 39 -1.5, 46 16.2 C 39 11.0, 12 11.0, -1 17.8 Z"
                      fill="#1E3A8A"
                      opacity="0.18"
                    />

                    {/* Iris */}
                    <g className={styles.iris}>
                      {/* Warm Amber/Chocolate Pixar Iris */}
                      <circle cx="22.5" cy="17.5" r="16.0" fill="url(#kIrisGrad)" />
                      {/* Soft Limbal Ring */}
                      <circle cx="22.5" cy="17.5" r="16.0" fill="none" stroke="#1A0802" strokeWidth="1.0" opacity="0.8" />

                      {/* Deep Velvety Circular Pupil */}
                      <circle cx="22.5" cy="17.5" r="9.3" fill="url(#kPupilGrad)" />
                      <circle cx="22.5" cy="17.5" r="7.8" fill="#0A0402" />

                      {/* Warm Amber Iris Caustic Reflection Arc */}
                      <ellipse cx="22.5" cy="24.8" rx="8.5" ry="2.8" fill="#FBBF24" opacity="0.55" />

                      {/* Soulful Natural Pixar Catchlights */}
                      <circle cx="26.8" cy="12.5" r="4.2" fill="#FFFFFF" opacity="0.98" />
                      <circle cx="17.2" cy="22.2" r="1.9" fill="#FFFFFF" opacity="0.8" />
                      <circle cx="28.2" cy="19.5" r="1.1" fill="#FFFFFF" opacity="0.55" />
                    </g>

                    {/* Inner Corner Tear Duct (Caruncle) Warmth */}
                    <circle cx="0.5" cy="17.8" r="2.2" fill="#FDA4AF" opacity="0.35" />

                    {/* Animated Upper Eyelid for Blinking */}
                    <path
                      d="M -4 -6 H 50 V 38 H -4 Z"
                      fill="#5B9AFA"
                      className={`${styles.eyelidUpper} ${isBlinking ? styles.blinkActive : ''}`}
                    />
                  </g>

                  {/* Soft Double-Eyelid Crease */}
                  <path
                    d="M 5 5 C 15 -4, 33 -4, 42 6"
                    fill="none"
                    stroke="#255BB5"
                    strokeWidth="1.1"
                    strokeLinecap="round"
                    opacity="0.32"
                  />

                  {/* Gentle Lower Lid Smiling Crinkle */}
                  <path
                    d="M 8 38.5 C 17 41.5, 29 41.5, 39 38.5"
                    fill="none"
                    stroke="#255BB5"
                    strokeWidth="0.8"
                    opacity="0.22"
                    strokeLinecap="round"
                  />

                  {/* Elegant Tapered Upper Lash Line */}
                  <path
                    d="M -2 17.8 C 11 -3.0, 40 -3.0, 47 16.2"
                    fill="none"
                    stroke="#0F172A"
                    strokeWidth="3.6"
                    strokeLinecap="round"
                  />

                  {/* Delicate Soft Lower Lash Contour */}
                  <path
                    d="M -1 17.8 C 10 36.5, 35 36.0, 46 16.2"
                    fill="none"
                    stroke="#1E293B"
                    strokeWidth="1.1"
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
                <g transform="translate(190, 183)">
                  <g
                    id="lipsGroup"
                    className={`${styles.pixarMouth} ${isSpeakingActive ? styles.mouthSpeaking : ''}`}
                  >
                    {/* ── Pure HTML/CSS 3D Little Krishna Mouth (Requested by user) ── */}
                    <foreignObject x="-22" y="-12" width="44" height="24">
                      <div className={`${styles.mouthContainer} ${isSpeakingActive ? styles.mouthSpeaking : ''}`}>
                        {/* Subtle skin glow above upper lip */}
                        <div className={styles.mouthSkinHighlight} />

                        {/* Main mouth structure group — clean smiling outline only */}
                        <div className={styles.mouthGroup}>
                          {/* Elegant Clean Smiling Line Outline */}
                          <div className={styles.mouthSeam} />

                          {/* Speaking Oral Cavity (smoothly flexes & articulates during speech) */}
                          <div className={styles.speakingCavity}>
                            <div className={styles.teethBar} />
                            <div className={styles.tongue} />
                          </div>
                        </div>

                        {/* Soft blue-purple skin shadow under lower lip */}
                        <div className={styles.mouthShadow} />
                      </div>
                    </foreignObject>
                  </g>
                </g>
              </g>

              {/* Topknot Bun & Ornate 3D Gold Hair Band / Ring */}
              <g id="crownTopknot">
                <ellipse cx="190" cy="74" rx="30" ry="26" fill="url(#kHairBase)" />
                <ellipse cx="176" cy="68" rx="13" ry="12" fill="url(#kHairCurl)" />
                <ellipse cx="204" cy="68" rx="13" ry="12" fill="url(#kHairCurl)" />
                <ellipse cx="190" cy="56" rx="14" ry="11" fill="url(#kHairCurl)" />
                <ellipse cx="184" cy="62" rx="18" ry="12" fill="url(#kHairHl)" />

                {/* ── 3D Ornate Golden Topknot Ring / Hair Pin ── */}
                <g id="hairPinBand">
                  {/* Ambient Contact Shadow under Gold Ring */}
                  <path
                    d="M 164 85 C 175 94, 205 94, 216 85"
                    fill="none"
                    stroke="#0A1128"
                    strokeWidth="5"
                    opacity="0.5"
                    strokeLinecap="round"
                  />

                  {/* Main Curved 3D Gold Ring Base */}
                  <path
                    d="M 164 84 C 175 93, 205 93, 216 84 L 216 89 C 205 98, 175 98, 164 89 Z"
                    fill="url(#kGoldGrad)"
                    stroke="#78350F"
                    strokeWidth="0.8"
                    strokeLinejoin="round"
                  />

                  {/* Top Edge Specular Rim Light */}
                  <path
                    d="M 165 84 C 175 92.5, 205 92.5, 215 84"
                    fill="none"
                    stroke="#FEF08A"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    opacity="0.9"
                  />

                  {/* Gold Pearl Beads along the Ring */}
                  <circle cx="168" cy="87" r="2.2" fill="url(#kGoldBead)" stroke="#78350F" strokeWidth="0.4" />
                  <circle cx="178" cy="89.5" r="2.5" fill="url(#kGoldBead)" stroke="#78350F" strokeWidth="0.4" />
                  <circle cx="202" cy="89.5" r="2.5" fill="url(#kGoldBead)" stroke="#78350F" strokeWidth="0.4" />
                  <circle cx="212" cy="87" r="2.2" fill="url(#kGoldBead)" stroke="#78350F" strokeWidth="0.4" />

                  {/* Central Ornate Gold Crest & Ruby Cabochon Jewel */}
                  <g id="hairPinCenterGem" transform="translate(190, 90.5)">
                    {/* Gold Rosette Outer Casing */}
                    <ellipse cx="0" cy="0" rx="5.5" ry="4.5" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.6" />
                    <ellipse cx="0" cy="-0.5" rx="4.5" ry="3.5" fill="none" stroke="#FEF08A" strokeWidth="0.6" opacity="0.9" />
                    {/* Central Ruby Gemstone */}
                    <ellipse cx="0" cy="0" rx="3.0" ry="2.2" fill="#DC2626" stroke="#7F1D1D" strokeWidth="0.5" />
                    <circle cx="-0.8" cy="-0.6" r="0.7" fill="#FFFFFF" opacity="0.9" />
                  </g>
                </g>
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
            {/* Seamless 3D Plump Toddler Bicep & Shoulder (Deep Arched Deltoid Cap Seamlessly Connected to Torso) */}
            <path
              d="M 148 200 C 148 175, 130 170, 110 170 C 102 172, 88 170, 76 166 C 70 172, 76 180, 86 182 C 95 198, 112 212, 135 220 C 145 225, 148 215, 148 200 Z"
              fill="url(#kSkinBody)"
            />
            {/* Seamless 3D Plump Toddler Forearm (Overlapping Upper Arm → Wrist) */}
            <path
              d="M 70 168 C 68 152, 74 136, 85 128 L 101 128 C 98 140, 92 158, 94 178 C 86 182, 74 178, 70 168 Z"
              fill="url(#kSkinBody)"
            />
            {/* Under-Armpit Ambient Shadow */}
            <path
              d="M 125 212 C 112 206, 102 196, 92 186"
              fill="none"
              stroke="#1E3A8A"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.18"
            />
            {/* Continuous Volumetric Arm Highlight Sheen (Shoulder → Bicep → Elbow Bend → Forearm) */}
            <path
              d="M 135 188 C 122 176, 106 173, 90 168 C 82 165, 78 165, 78 165 C 72 166, 75 150, 88 132"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3.0"
              strokeLinecap="round"
              opacity="0.25"
            />

            {/* Polished 3D Gold Armlet (Bajuband) on Right Bicep */}
            <g id="rightBicepBajuband" transform="translate(105, 188) rotate(-35)">
              <ellipse cx="0" cy="1" rx="8" ry="2.5" fill="#1E3A8A" opacity="0.18" />
              <path d="M -8 -2 C -3 -4, 3 -4, 8 -2 L 8 2 C 3 0, -3 0, -8 2 Z" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.5" />
              <path d="M -7 -1 C -2 -3, 2 -3, 7 -1" fill="none" stroke="#FEF08A" strokeWidth="1.0" opacity="0.8" />
              <circle cx="0" cy="-1.5" r="2.2" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.5" />
              <circle cx="0" cy="-1.5" r="1.3" fill="#DC2626" />
              <circle cx="-0.4" cy="-1.8" r="0.5" fill="#FFFFFF" opacity="0.85" />
            </g>

            {/* Polished 3D Gold Bangles (Kadas) Wrapping Narrowed Wrist */}
            <g id="raisedWristBangles" transform="translate(93, 126)">
              <ellipse cx="0" cy="-5" rx="10.5" ry="3.5" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.5" />
              <ellipse cx="0" cy="-6" rx="7.5" ry="1.8" fill="none" stroke="#FFFBEB" strokeWidth="0.8" opacity="0.75" />
              <ellipse cx="0" cy="0" rx="10.5" ry="3.5" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.5" />
              <ellipse cx="0" cy="-1" rx="7.5" ry="1.8" fill="none" stroke="#FFFBEB" strokeWidth="0.8" opacity="0.75" />
              <ellipse cx="0" cy="5" rx="10.5" ry="3.5" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.5" />
              <ellipse cx="0" cy="4" rx="7.5" ry="1.8" fill="none" stroke="#FFFBEB" strokeWidth="0.8" opacity="0.75" />
            </g>

            {/* ── 3D SCULPTED TODDLER FIST WITH ERECT INDEX FINGER (Positioned Directly Beneath Chakra) ── */}
            <g id="sculptedChakraHand" transform="translate(93, 110)">
              {/* Chubby Toddler Fist Palm Base */}
              <path
                d="M -8 15 C -12 8, -12 -2, -6 -7 C -2 -10, 4 -10, 10 -5 C 15 2, 14 10, 8 16 C 2 18, -4 18, -8 15 Z"
                fill="url(#kSkinBody)"
              />
              {/* Palm 3D Volume Core Glow */}
              <ellipse cx="0" cy="4" rx="7.5" ry="8.5" fill="url(#kHandVolume)" />

              {/* Plump Toddler Thumb (On left side of palm) */}
              <g id="chakraThumb">
                <path
                  d="M -8 12 C -13 7, -12 -1, -6 -2 C -1 -2, 2 2, 0 6 C -2 10, -5 12, -8 12 Z"
                  fill="url(#kSkinBody)"
                />
                {/* Thumb Separation Shadow */}
                <path
                  d="M -5 -2 C -2 1, -1 5, -3 8"
                  fill="none"
                  stroke="#1E3A8A"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity="0.25"
                />
                {/* Thumb Specular Highlight */}
                <ellipse cx="-5.5" cy="2" rx="2.5" ry="1.8" fill="#FFFFFF" opacity="0.25" />
              </g>

              {/* Curled Folded Fingers (Forming a compact toddler fist on right side) */}
              {/* Digit 1: Folded Middle Finger (Upper folded digit) */}
              <g id="chakraMiddleFinger">
                <path
                  d="M 1 -3 C 6 -5, 13 -3, 13 2 C 13 6, 7 7, 1 5 Z"
                  fill="url(#kSkinBody)"
                />
                <circle cx="10" cy="1.5" r="2.8" fill="url(#kSkinBody)" />
                <ellipse cx="9" cy="0.5" rx="1.4" ry="1.0" fill="#FFFFFF" opacity="0.3" />
              </g>

              {/* Digit 2: Folded Ring Finger (Middle folded digit) */}
              <g id="chakraRingFinger">
                <path d="M 2 4 C 7 3, 12 4, 12 6" fill="none" stroke="#1E3A8A" strokeWidth="1.2" opacity="0.28" />
                <path
                  d="M 1 3 C 6 2, 13 4, 13 8.5 C 13 12, 6 12.5, 1 10 Z"
                  fill="url(#kSkinBody)"
                />
                <circle cx="10" cy="7.5" r="2.6" fill="url(#kSkinBody)" />
                <ellipse cx="9" cy="6.5" rx="1.3" ry="0.9" fill="#FFFFFF" opacity="0.28" />
              </g>

              {/* Digit 3: Folded Pinky Finger (Lower folded digit) */}
              <g id="chakraPinkyFinger">
                <path d="M 2 9 C 7 8, 12 9, 12 11" fill="none" stroke="#1E3A8A" strokeWidth="1.2" opacity="0.28" />
                <path
                  d="M 1 8.5 C 6 8, 12 10, 12 14 C 12 17, 6 17.5, 1 15 Z"
                  fill="url(#kSkinBody)"
                />
                <circle cx="9" cy="13" r="2.3" fill="url(#kSkinBody)" />
                <ellipse cx="8" cy="12" rx="1.2" ry="0.8" fill="#FFFFFF" opacity="0.25" />
              </g>

              {/* ── Extended Index Finger (Pointing vertically straight to center of Chakra) ── */}
              <g id="chakraIndexFinger">
                {/* Organic Tapered Column with Integrated Rounded Tip */}
                <path
                  d="M -6.2 -5 L -4.8 -31 C -4.8 -36, 0.8 -36, 0.8 -31 L 2.2 -5 Z"
                  fill="url(#kSkinBody)"
                />
                {/* Base Joint Crease Shadow */}
                <path
                  d="M -6.5 -4 C -2 -7, 2 -6, 3 -4"
                  fill="none"
                  stroke="#1E3A8A"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity="0.25"
                />
                {/* Continuous Cylindrical Specular Highlight */}
                <path
                  d="M -3.5 -6 L -2.8 -32"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  opacity="0.35"
                />
                {/* Fingertip Soft Light Reflection */}
                <ellipse cx="-2" cy="-32.5" rx="1.8" ry="2.0" fill="#FFFFFF" opacity="0.4" />
              </g>
            </g>

            {/* ── B. TARGET LEFT ARM & HAND ON HIP (Viewer's Right - Character's Left) ── */}
            {/* Continuous Organic 3D Toddler Left Arm (Shoulder → Deltoid → Elbow → Wrist) */}
            <path
              d="M 218 195 C 218 175, 240 175, 250 183 C 270 195, 280 210, 294 236 C 298 244, 293 254, 282 262 C 268 246, 245 220, 230 214 C 220 210, 218 205, 218 195 Z"
              fill="url(#kSkinBody)"
            />
            {/* Forearm gently curved towards waist (Overlapping Upper Arm Seamlessly) */}
            <path
              d="M 294 232 C 296 244, 285 260, 258 280 L 241 271 C 252 260, 266 250, 276 230 Z"
              fill="url(#kSkinBody)"
            />
            {/* Under-Armpit Ambient Occlusion Shadow */}
            <path
              d="M 230 214 C 245 220, 255 228, 265 240"
              fill="none"
              stroke="#1E3A8A"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.18"
            />
            {/* Continuous Volumetric Arm Highlight Sheen (Shoulder → Upper Arm → Elbow Bend → Forearm) */}
            <path
              d="M 232 182 C 250 188, 275 208, 291 234 C 294 242, 288 254, 255 275"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3.2"
              strokeLinecap="round"
              opacity="0.25"
            />

            {/* Polished 3D Gold Armlet (Bajuband) on Left Bicep */}
            <g id="leftBicepBajuband" transform="translate(262, 218) rotate(-45)">
              <ellipse cx="0" cy="1" rx="9" ry="3" fill="#1E3A8A" opacity="0.18" />
              <path d="M -11 -2.5 C -4 -5.5, 4 -5.5, 11 -2.5 L 11 2.5 C 4 -0.5, -4 -0.5, -11 2.5 Z" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.6" />
              <path d="M -10 -1.5 C -3 -4, 3 -4, 10 -1.5" fill="none" stroke="#FEF08A" strokeWidth="1.2" opacity="0.85" />
              <circle cx="0" cy="-2" r="3" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.6" />
              <circle cx="0" cy="-2" r="1.8" fill="#DC2626" />
              <circle cx="-0.5" cy="-2.4" r="0.6" fill="#FFFFFF" opacity="0.9" />
            </g>

            {/* Polished 3D Gold Bangles (Kadas) Wrapping Left Wrist Aligned With Waist Curve */}
            <g id="hipWristBangles" transform="translate(250, 277) rotate(-32)">
              <ellipse cx="0" cy="-4" rx="10.5" ry="3.6" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.5" />
              <ellipse cx="0" cy="-4.8" rx="7.5" ry="1.8" fill="none" stroke="#FFFBEB" strokeWidth="0.8" opacity="0.8" />
              <ellipse cx="0" cy="1" rx="10.5" ry="3.6" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.5" />
              <ellipse cx="0" cy="0.2" rx="7.5" ry="1.8" fill="none" stroke="#FFFBEB" strokeWidth="0.8" opacity="0.8" />
              <ellipse cx="0" cy="6" rx="10.5" ry="3.8" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.5" />
              <ellipse cx="0" cy="5.2" rx="7.5" ry="1.8" fill="none" stroke="#FFFBEB" strokeWidth="0.8" opacity="0.8" />
            </g>

            {/* ── TARGET 3D TODDLER HAND ON HIP STRUCTURE ── */}
            <g id="sculptedHipHandTarget">
              {/* 1. Thumb Tucking Behind Waistband (Eliminating awkward floating thumb) */}
              <path
                d="M 252 277 C 258 278, 262 282, 259 287 C 256 290, 252 289, 248 286"
                fill="url(#kSkinLimb)"
                opacity="0.85"
              />

              {/* 2. Soft Contact Shadow Cast by Resting Hand & Fingers on Belt */}
              <path
                d="M 246 288 C 236 291, 223 297, 219 303 C 222 306, 232 305, 244 299 Z"
                fill="#3D1302"
                opacity="0.3"
              />

              {/* 3. Volumetric Toddler Dorsal Hand Cushion (Resting on Side Hip) */}
              <path
                d="M 244 276
                   C 251 276, 257 280, 258 286
                   C 259 293, 254 299, 247 298
                   C 243 296, 241 286, 244 276 Z"
                fill="url(#kSkinBody)"
              />
              <ellipse cx="250" cy="286" rx="5.5" ry="6.5" fill="url(#kHandVolume)" />

              {/* 4. Four Chubby Toddler Fingers Naturally Curving Around Front of Waist */}
              {/* Digit A: Index Finger (Upper digit curving across front waistband) */}
              <g id="hipIndexFinger">
                <path
                  d="M 244 278
                     C 237 280, 228 283, 222 287
                     C 219 289, 220 293, 224 293
                     C 231 291, 238 287, 246 284 Z"
                  fill="url(#kToddlerFingerGrad)"
                />
                <ellipse cx="223" cy="290" rx="2.4" ry="2.2" fill="url(#kSkinBody)" />
                <path
                  d="M 242 280 C 235 282, 228 285, 224 288"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="1.2"
                  opacity="0.45"
                  strokeLinecap="round"
                />
              </g>

              {/* Digit B: Middle Finger (Longest toddler digit curving across waistband) */}
              <g id="hipMiddleFinger">
                <path
                  d="M 246 284
                     C 237 286, 226 289, 219 294
                     C 216 296, 218 300, 222 300
                     C 230 297, 239 293, 248 290 Z"
                  fill="url(#kToddlerFingerGrad)"
                />
                <ellipse cx="220.5" cy="297" rx="2.5" ry="2.3" fill="url(#kSkinBody)" />
                <path
                  d="M 244 286 C 236 288, 226 291, 222 295"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="1.2"
                  opacity="0.45"
                  strokeLinecap="round"
                />
              </g>

              {/* Digit C: Ring Finger (Curving along lower waistband edge) */}
              <g id="hipRingFinger">
                <path
                  d="M 248 290
                     C 241 292, 232 295, 224 300
                     C 221 302, 223 306, 227 306
                     C 234 302, 242 298, 250 296 Z"
                  fill="url(#kToddlerFingerGrad)"
                />
                <ellipse cx="225.5" cy="303" rx="2.3" ry="2.1" fill="url(#kSkinBody)" />
                <path
                  d="M 246 292 C 240 294, 231 297, 227 302"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="1.1"
                  opacity="0.4"
                  strokeLinecap="round"
                />
              </g>

              {/* Digit D: Pinky Finger (Curving softly along side waist / sash edge) */}
              <g id="hipPinkyFinger">
                <path
                  d="M 250 295
                     C 245 297, 238 301, 232 306
                     C 229 308, 231 312, 235 311
                     C 241 307, 247 304, 251 301 Z"
                  fill="url(#kToddlerFingerGrad)"
                />
                <ellipse cx="233.5" cy="309" rx="2.0" ry="1.9" fill="url(#kSkinBody)" />
                <path
                  d="M 248 297 C 243 300, 237 303, 234 307"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="1.0"
                  opacity="0.35"
                  strokeLinecap="round"
                />
              </g>
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
