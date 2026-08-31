'use client';

import React from 'react';
import type { BuddySpriteProps, BuddyMood } from '../types';
import styles from './krishna.module.css';

export type KrishnaPose = 'crossed' | 'chakra' | 'standing';

export interface KrishnaProps {
  size?: 'sm' | 'md' | 'lg';
  mood?: 'idle' | 'happy' | 'wave' | 'chakra' | BuddyMood;
  pose?: KrishnaPose;
  className?: string;
  name?: string;
  greeting?: string;
  isDragging?: boolean;
  petStreak?: number;
  onClick?: () => void;
  onRefreshGreeting?: () => void;
  onFeed?: () => void;
}

export function LittleKrishna({
  size = 'md',
  mood = 'idle',
  pose = 'chakra',
  className = '',
  name = 'Little Krishna',
  greeting = 'Radhe Radhe! Let us create something wonderful! 🪶✨',
  isDragging = false,
  petStreak = 0,
  onClick,
  onRefreshGreeting,
  onFeed,
}: KrishnaProps) {
  const isChakraMode = mood === 'chakra' || pose === 'chakra';

  const getMoodClass = () => {
    if (isChakraMode) return styles.moodChakra;
    switch (mood) {
      case 'happy':
      case 'eating':
      case 'excited':
        return styles.moodHappy;
      case 'waving':
      case 'wave':
        return styles.moodWave;
      case 'idle':
      default:
        return styles.moodIdle;
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

  return (
    <div
      className={`${styles.krishnaContainer} ${getSizeClass()} ${className}`}
      onClick={onClick}
      title={`Little Krishna — Click to interact, double-click for sweet butter 🧈`}
    >
      {/* Speech Bubble */}
      {greeting && (
        <div
          className={styles.greetingBubble}
          onClick={(e) => {
            e.stopPropagation();
            onRefreshGreeting?.();
          }}
          title="Click for a joyful thought from Little Krishna!"
        >
          <span className={styles.greetingText}>{greeting}</span>
        </div>
      )}

      {/* Ground Shadow */}
      <div className={styles.groundShadow} />

      {/* Divine Golden Aura */}
      <div className={styles.divineAura} />

      {/* ════════════════════ PIXAR 3D HYBRID VECTOR MODEL ════════════════════ */}
      <div className={`${styles.krishna} ${getMoodClass()}`}>
        <svg
          viewBox="0 0 360 440"
          className={styles.krishnaSvg}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          <defs>
            <radialGradient id="kSkinHead" cx="40%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#9BC7FF" />
              <stop offset="70%" stopColor="#6BA7FF" />
              <stop offset="100%" stopColor="#3B82F6" />
            </radialGradient>

            <radialGradient id="kSkinBody" cx="40%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#8ABFFF" />
              <stop offset="70%" stopColor="#6BA7FF" />
              <stop offset="100%" stopColor="#3B82F6" />
            </radialGradient>

            {/* Hair Curls (Rich Black-Brown) */}
            <radialGradient id="kHairGrad" cx="35%" cy="25%" r="75%">
              <stop offset="0%" stopColor="#2A1C14" />
              <stop offset="60%" stopColor="#1E140E" />
              <stop offset="100%" stopColor="#110A07" />
            </radialGradient>

            {/* Nose 3D Lighting */}
            <radialGradient id="kNoseHighlight" cx="35%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#E2EFFF" />
              <stop offset="50%" stopColor="#96C2FF" />
              <stop offset="100%" stopColor="#548CD9" />
            </radialGradient>

            {/* Dhoti Gold (#FFC83D) */}
            <linearGradient id="kDhotiGrad" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#FFF2A3" />
              <stop offset="30%" stopColor="#FFC83D" />
              <stop offset="75%" stopColor="#E59E0B" />
              <stop offset="100%" stopColor="#B37300" />
            </linearGradient>

            {/* Orange Sash (#FF8A00) */}
            <linearGradient id="kSashGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFB347" />
              <stop offset="40%" stopColor="#FF8A00" />
              <stop offset="85%" stopColor="#D96800" />
              <stop offset="100%" stopColor="#9C4400" />
            </linearGradient>

            {/* Gold Jewelry (#F2C14E) */}
            <linearGradient id="kGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF1B8" />
              <stop offset="35%" stopColor="#F2C14E" />
              <stop offset="80%" stopColor="#D99F24" />
              <stop offset="100%" stopColor="#A67008" />
            </linearGradient>

            {/* Eye Iris (#4A2800) */}
            <radialGradient id="kIrisGrad" cx="38%" cy="32%" r="62%">
              <stop offset="0%" stopColor="#87510C" />
              <stop offset="55%" stopColor="#4A2800" />
              <stop offset="90%" stopColor="#241200" />
              <stop offset="100%" stopColor="#0D0500" />
            </radialGradient>

            {/* Cheek Rosy-Coral Blush */}
            <radialGradient id="kCheekBlush" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255, 107, 139, 0.65)" />
              <stop offset="60%" stopColor="rgba(255, 140, 165, 0.3)" />
              <stop offset="100%" stopColor="rgba(255, 140, 165, 0)" />
            </radialGradient>

            {/* Lip Interior & Shading Gradients */}
            <linearGradient id="kLipGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#E85A67" />
              <stop offset="60%" stopColor="#C43B48" />
              <stop offset="100%" stopColor="#8A232E" />
            </linearGradient>

            {/* Peacock Feather Gradients */}
            <linearGradient id="kFeatherStem" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4ADE80" />
              <stop offset="100%" stopColor="#16A34A" />
            </linearGradient>

            <radialGradient id="kFeatherOuter" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4ADE80" />
              <stop offset="55%" stopColor="#16A34A" />
              <stop offset="90%" stopColor="#14532D" />
            </radialGradient>

            <radialGradient id="kFeatherTeal" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="50%" stopColor="#0EA5E9" />
              <stop offset="100%" stopColor="#0369A1" />
            </radialGradient>

            <radialGradient id="kFeatherCyan" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="45%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0284C7" />
            </radialGradient>

            {/* Soft Drop Shadow for Layers */}
            <filter id="kSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#0F1B3D" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* ════════════════ 1. FEET & ANKLETS ════════════════ */}
          <g id="feet">
            {/* Left Foot */}
            <g transform="translate(122, 370)">
              <path
                d="M 10 0 C 0 -2, -6 10, -4 20 C -2 28, 12 30, 24 26 C 32 23, 34 12, 26 4 C 20 0, 14 0, 10 0 Z"
                fill="url(#kSkinBody)"
              />
              {/* 5 Rounded Toes */}
              <circle cx="-3" cy="18" r="3.5" fill="#6BA7FF" />
              <circle cx="2" cy="22" r="3.2" fill="#6BA7FF" />
              <circle cx="8" cy="24" r="3.0" fill="#6BA7FF" />
              <circle cx="14" cy="25" r="2.7" fill="#6BA7FF" />
              <circle cx="20" cy="24" r="2.4" fill="#6BA7FF" />

              {/* Gold Anklet String & Bells */}
              <ellipse cx="12" cy="4" rx="15" ry="4" fill="none" stroke="url(#kGoldGrad)" strokeWidth="3.5" />
              <circle cx="4" cy="7" r="2.5" fill="url(#kGoldGrad)" />
              <circle cx="12" cy="9" r="2.8" fill="url(#kGoldGrad)" />
              <circle cx="20" cy="7" r="2.5" fill="url(#kGoldGrad)" />
            </g>

            {/* Right Foot (Standing 3/4 Pose) */}
            <g transform="translate(202, 372)">
              <path
                d="M 12 0 C 2 -2, -4 10, -2 20 C 0 28, 14 30, 26 26 C 34 23, 36 12, 28 4 C 22 0, 16 0, 12 0 Z"
                fill="url(#kSkinBody)"
              />
              {/* 5 Rounded Toes */}
              <circle cx="-1" cy="18" r="3.5" fill="#6BA7FF" />
              <circle cx="4" cy="22" r="3.2" fill="#6BA7FF" />
              <circle cx="10" cy="24" r="3.0" fill="#6BA7FF" />
              <circle cx="16" cy="25" r="2.7" fill="#6BA7FF" />
              <circle cx="22" cy="24" r="2.4" fill="#6BA7FF" />

              {/* Gold Anklet String & Bells */}
              <ellipse cx="14" cy="4" rx="15" ry="4" fill="none" stroke="url(#kGoldGrad)" strokeWidth="3.5" />
              <circle cx="6" cy="7" r="2.5" fill="url(#kGoldGrad)" />
              <circle cx="14" cy="9" r="2.8" fill="url(#kGoldGrad)" />
              <circle cx="22" cy="7" r="2.5" fill="url(#kGoldGrad)" />
            </g>
          </g>

          {/* ════════════════ 2. DHOTI & ORANGE SASH ════════════════ */}
          <g id="dhoti" filter="url(#kSoftShadow)">
            {/* Main Dhoti Wrapped Pants (#FFC83D) */}
            <path
              d="M 112 258 C 102 295, 108 385, 144 385 C 160 385, 168 335, 174 290 C 182 335, 192 385, 214 385 C 242 385, 252 295, 242 258 Z"
              fill="url(#kDhotiGrad)"
              stroke="#B37300"
              strokeWidth="1.2"
            />
            {/* 3D Fabric Fold Lines */}
            <path d="M 132 262 C 126 295, 130 365, 142 378" fill="none" stroke="#D99600" strokeWidth="3" opacity="0.65" />
            <path d="M 152 264 C 148 295, 150 350, 158 375" fill="none" stroke="#D99600" strokeWidth="2" opacity="0.5" />
            <path d="M 198 264 C 204 295, 202 360, 208 378" fill="none" stroke="#D99600" strokeWidth="3" opacity="0.65" />
            <path d="M 218 262 C 224 295, 222 350, 228 375" fill="none" stroke="#D99600" strokeWidth="2" opacity="0.5" />

            {/* Orange Waist Sash (#FF8A00) */}
            <path
              d="M 110 256 C 140 248, 214 248, 244 256 C 248 276, 216 284, 176 284 C 136 284, 108 274, 110 256 Z"
              fill="url(#kSashGrad)"
              stroke="#9C4400"
              strokeWidth="1.2"
            />

            {/* Prominent Tied Sash Knot on Right Waist */}
            <g transform="translate(216, 274)">
              <ellipse cx="0" cy="0" rx="14" ry="13" fill="url(#kSashGrad)" stroke="#9C4400" strokeWidth="1.2" />
              <ellipse cx="0" cy="0" rx="5" ry="4" fill="#FFF2A3" opacity="0.75" />
            </g>

            {/* Draped Sash Tail Hanging Down Right */}
            <path
              d="M 210 282 C 204 310, 220 375, 244 375 C 254 375, 242 315, 226 282 Z"
              fill="url(#kSashGrad)"
              stroke="#9C4400"
              strokeWidth="1"
            />
            {/* Detailed Sash Trim Pattern */}
            <path d="M 210 366 L 242 366" stroke="#FFF2A3" strokeWidth="2" strokeDasharray="3 2" />
          </g>

          {/* ════════════════ 3. TORSO & CHEST ════════════════ */}
          <g id="torso">
            <path
              d="M 126 166 C 120 200, 120 248, 130 260 C 158 265, 196 265, 224 260 C 234 248, 234 200, 228 166 Z"
              fill="url(#kSkinBody)"
            />
          </g>

          {/* ════════════════ 4. 3-STRAND GOLD NECKLACE ════════════════ */}
          <g id="necklace">
            {/* Strand 1 (Outer) */}
            <path d="M 140 188 C 152 220, 202 220, 214 188" fill="none" stroke="url(#kGoldGrad)" strokeWidth="3.5" />
            {/* Strand 2 (Middle) */}
            <path d="M 148 188 C 158 212, 196 212, 206 188" fill="none" stroke="url(#kGoldGrad)" strokeWidth="2.8" />
            {/* Strand 3 (Inner) */}
            <path d="M 154 188 C 162 202, 192 202, 200 188" fill="none" stroke="url(#kGoldGrad)" strokeWidth="2.2" />

            {/* Center Sun Medallion Pendant */}
            <g transform="translate(177, 217)">
              <circle cx="0" cy="0" r="7" fill="url(#kGoldGrad)" stroke="#A84E00" strokeWidth="1" />
              <circle cx="0" cy="0" r="3" fill="#FFFFFF" />
              <circle cx="0" cy="9" r="2.5" fill="url(#kGoldGrad)" />
            </g>
          </g>

          {/* ════════════════ 5A. CROSS-HANDED POSE (ARMS CROSSED OVER CHEST) ════════════════ */}
          {!isChakraMode && (
            <g id="crossedArms" filter="url(#kSoftShadow)">
              {/* Left Arm (Folded Underneath) */}
              <path
                d="M 124 192 C 110 208, 118 234, 148 234 C 178 234, 202 228, 218 222"
                fill="none"
                stroke="url(#kSkinBody)"
                strokeWidth="22"
                strokeLinecap="round"
              />
              {/* Right Arm (Crossed over Left Forearm) */}
              <path
                d="M 228 192 C 242 208, 234 236, 202 238 C 168 240, 142 234, 128 224"
                fill="none"
                stroke="url(#kSkinBody)"
                strokeWidth="23"
                strokeLinecap="round"
              />
              {/* 3D Highlight Shader on Forearms */}
              <path
                d="M 228 192 C 242 208, 234 236, 202 238"
                fill="none"
                stroke="#B2D4FF"
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.55"
              />

              {/* 3 Gold Bangles Left Wrist */}
              <g transform="translate(136, 215) rotate(-16)">
                <rect x="0" y="0" width="5.5" height="20" rx="2.5" fill="url(#kGoldGrad)" stroke="#A84E00" strokeWidth="0.5" />
                <rect x="7" y="0" width="5.5" height="20" rx="2.5" fill="url(#kGoldGrad)" stroke="#A84E00" strokeWidth="0.5" />
                <rect x="14" y="0" width="5.5" height="20" rx="2.5" fill="url(#kGoldGrad)" stroke="#A84E00" strokeWidth="0.5" />
              </g>

              {/* 3 Gold Bangles Right Wrist */}
              <g transform="translate(196, 217) rotate(16)">
                <rect x="0" y="0" width="5.5" height="20" rx="2.5" fill="url(#kGoldGrad)" stroke="#A84E00" strokeWidth="0.5" />
                <rect x="7" y="0" width="5.5" height="20" rx="2.5" fill="url(#kGoldGrad)" stroke="#A84E00" strokeWidth="0.5" />
                <rect x="14" y="0" width="5.5" height="20" rx="2.5" fill="url(#kGoldGrad)" stroke="#A84E00" strokeWidth="0.5" />
              </g>

              {/* Baju Band (Upper Armlets) */}
              <ellipse cx="126" cy="198" rx="8" ry="3.5" fill="url(#kGoldGrad)" />
              <ellipse cx="226" cy="198" rx="8" ry="3.5" fill="url(#kGoldGrad)" />
            </g>
          )}

          {/* ════════════════ 5B. CHAKRA POSE (LEFT HAND ON HIP, HEROIC STANCE) ════════════════ */}
          {isChakraMode && (
            <g id="chakraArms" filter="url(#kSoftShadow)">
              {/* Left Arm Resting Heroically on Hip */}
              <path
                d="M 126 192 C 98 206, 96 228, 126 238"
                fill="none"
                stroke="url(#kSkinBody)"
                strokeWidth="22"
                strokeLinecap="round"
              />
              {/* 3D Highlight on Left Arm */}
              <path
                d="M 126 192 C 98 206, 96 228, 126 238"
                fill="none"
                stroke="#B2D4FF"
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.55"
              />
              {/* Left Hand on Waistband */}
              <ellipse cx="128" cy="238" rx="8" ry="6" fill="url(#kSkinHead)" />
              {/* Left Wrist Bangles */}
              <g transform="translate(112, 226) rotate(22)">
                <rect x="0" y="0" width="5.5" height="18" rx="2.5" fill="url(#kGoldGrad)" stroke="#A84E00" strokeWidth="0.5" />
                <rect x="7" y="0" width="5.5" height="18" rx="2.5" fill="url(#kGoldGrad)" stroke="#A84E00" strokeWidth="0.5" />
                <rect x="14" y="0" width="5.5" height="18" rx="2.5" fill="url(#kGoldGrad)" stroke="#A84E00" strokeWidth="0.5" />
              </g>
              {/* Left Baju Band (Armlet) */}
              <ellipse cx="114" cy="204" rx="8" ry="3.5" fill="url(#kGoldGrad)" />
            </g>
          )}

          {/* ════════════════ 6. VOLUMINOUS CURLY HAIR (BACK) ════════════════ */}
          <g id="headGroup" transform="translate(0, -18)">
            <g id="hairBack">
              {/* Outer Fluffy Curls Layer */}
              <circle cx="112" cy="126" r="32" fill="url(#kHairGrad)" />
              <circle cx="100" cy="154" r="30" fill="url(#kHairGrad)" />
              <circle cx="102" cy="182" r="28" fill="url(#kHairGrad)" />

              <circle cx="242" cy="126" r="32" fill="url(#kHairGrad)" />
              <circle cx="254" cy="154" r="30" fill="url(#kHairGrad)" />
              <circle cx="252" cy="182" r="28" fill="url(#kHairGrad)" />

              <circle cx="132" cy="96" r="36" fill="url(#kHairGrad)" />
              <circle cx="177" cy="84" r="40" fill="url(#kHairGrad)" />
              <circle cx="222" cy="96" r="36" fill="url(#kHairGrad)" />
            </g>

            {/* ════════════════ 7. HEAD & EARS ════════════════ */}
            <g id="headBase">
              {/* Left Ear */}
              <g transform="translate(110, 160)">
                <ellipse cx="0" cy="0" rx="12" ry="16" fill="url(#kSkinHead)" />
                {/* Gold Hoop Earring */}
                <ellipse cx="-4" cy="10" rx="9" ry="9" fill="none" stroke="url(#kGoldGrad)" strokeWidth="3.5" />
              </g>

              {/* Right Ear */}
              <g transform="translate(244, 160)">
                <ellipse cx="0" cy="0" rx="12" ry="16" fill="url(#kSkinHead)" />
                {/* Gold Hoop Earring */}
                <ellipse cx="4" cy="10" rx="9" ry="9" fill="none" stroke="url(#kGoldGrad)" strokeWidth="3.5" />
              </g>

              {/* Chubby Pixar Head Sphere */}
              <ellipse cx="177" cy="150" rx="63" ry="56" fill="url(#kSkinHead)" />

              {/* Soft Rosy-Coral Chubby Cheeks */}
              <ellipse cx="132" cy="168" rx="20" ry="13" fill="url(#kCheekBlush)" transform="rotate(-6 132 168)" />
              <ellipse cx="222" cy="168" rx="20" ry="13" fill="url(#kCheekBlush)" transform="rotate(6 222 168)" />
            </g>

            {/* ════════════════ 8. EXPRESSIVE FACE DETAILS ════════════════ */}
            <g id="faceDetails">
              {/* Forehead White U-Tilak & Red Bindi */}
              <path
                d="M 168 108 L 168 132 C 168 140, 186 140, 186 132 L 186 108 Z"
                fill="none"
                stroke="#F8F9FF"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="177" cy="140" r="3" fill="#FF3B30" />

              {/* Eyebrows */}
              <path d="M 132 134 C 144 126, 157 129, 162 134" fill="none" stroke="#25130A" strokeWidth="4.5" strokeLinecap="round" />
              <path d="M 222 134 C 210 126, 197 129, 192 134" fill="none" stroke="#25130A" strokeWidth="4.5" strokeLinecap="round" />

              {/* Left Eye */}
              <g transform="translate(132, 138)">
                {/* White Sclera */}
                <ellipse cx="17" cy="15" rx="17" ry="16" fill="#FFFFFF" />
                <path d="M 0 13 C 7 4, 27 4, 34 13" fill="none" stroke="#25130A" strokeWidth="4" strokeLinecap="round" />
                {/* Deep Brown Iris */}
                <circle cx="17" cy="15" r="12" fill="url(#kIrisGrad)" />
                {/* Pupil */}
                <circle cx="17" cy="15" r="6.5" fill="#0B1530" />
                {/* Glossy Sparkle Highlights */}
                <circle cx="21" cy="11" r="4" fill="#FFFFFF" />
                <circle cx="13" cy="19" r="1.8" fill="#FFFFFF" opacity="0.85" />
              </g>

              {/* Right Eye */}
              <g transform="translate(188, 138)">
                {/* White Sclera */}
                <ellipse cx="17" cy="15" rx="17" ry="16" fill="#FFFFFF" />
                <path d="M 0 13 C 7 4, 27 4, 34 13" fill="none" stroke="#25130A" strokeWidth="4" strokeLinecap="round" />
                {/* Deep Brown Iris */}
                <circle cx="17" cy="15" r="12" fill="url(#kIrisGrad)" />
                {/* Pupil */}
                <circle cx="17" cy="15" r="6.5" fill="#0B1530" />
                {/* Glossy Sparkle Highlights */}
                <circle cx="21" cy="11" r="4" fill="#FFFFFF" />
                <circle cx="13" cy="19" r="1.8" fill="#FFFFFF" opacity="0.85" />
              </g>

              {/* 3D Pixar Cute Button Nose (Matched to Face Close-up) */}
              <g id="noseGroup" transform="translate(177, 163)">
                {/* Subtle Nose Bridge Contour */}
                <path d="M 0 -7 L 0 -1" stroke="#548CD9" strokeWidth="1.8" strokeLinecap="round" opacity="0.3" />
                {/* Base Nose Bulb Shadow */}
                <ellipse cx="0" cy="2" rx="6.5" ry="4" fill="#3B67B5" opacity="0.45" />
                {/* Main Skin Nose Tip Bulb */}
                <ellipse cx="0" cy="0" rx="5.5" ry="3.6" fill="url(#kSkinHead)" />
                {/* Underside Nostril Shadow Spots */}
                <ellipse cx="-3.2" cy="2.5" rx="1.8" ry="1" fill="#204280" opacity="0.4" />
                <ellipse cx="3.2" cy="2.5" rx="1.8" ry="1" fill="#204280" opacity="0.4" />
                {/* Glossy Tip Highlight Spot */}
                <ellipse cx="-1" cy="-0.8" rx="2.5" ry="1.4" fill="#E2EFFF" opacity="0.95" />
                <circle cx="1.2" cy="-0.5" r="0.8" fill="#FFFFFF" opacity="0.9" />
              </g>

              {/* 3D Pixar Lips & Confident Smile (Matched to Model Sheet) */}
              <g id="lipsGroup" transform="translate(177, 178)">
                {/* Dimple Corner Curves */}
                <path d="M -19 -2 C -18 1, -17 3, -18 5" fill="none" stroke="#7A241C" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
                <path d="M 19 -2 C 18 1, 17 3, 18 5" fill="none" stroke="#7A241C" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />

                {/* Upper Lip Cupid's Bow Curve */}
                <path
                  d="M -17 -2 C -9 -7, -4 -3, 0 -5 C 4 -3, 9 -7, 17 -2 C 11 2, -11 2, -17 -2 Z"
                  fill="#942E39"
                  opacity="0.95"
                />

                {/* Smile Mouth Interior */}
                <path
                  d="M -17 -2 C -9 11, 9 11, 17 -2 C 9 5, -9 5, -17 -2 Z"
                  fill="url(#kLipGrad)"
                  stroke="#7A241C"
                  strokeWidth="1.5"
                />

                {/* Chubby 3D Lower Lip */}
                <path
                  d="M -12 2 C -7 9.5, 7 9.5, 12 2 C 7 6.5, -7 6.5, -12 2 Z"
                  fill="#F07D88"
                  opacity="0.9"
                />

                {/* Glossy Lower Lip Shine Highlight */}
                <path
                  d="M -6.5 5 C -2.5 7, 2.5 7, 6.5 5"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  opacity="0.85"
                />
              </g>
            </g>

            {/* ════════════════ 9. CROWN & TOPKNOT BUN ════════════════ */}
            <g id="crownTopknot">
              {/* Topknot Bun */}
              <ellipse cx="177" cy="78" rx="26" ry="22" fill="url(#kHairGrad)" />
              {/* Bun Gold Band */}
              <ellipse cx="177" cy="90" rx="20" ry="6" fill="url(#kGoldGrad)" stroke="#A84E00" strokeWidth="1" />

              {/* Forehead Gold Crown / Headband */}
              <path d="M 124 118 C 150 106, 204 106, 230 118" fill="none" stroke="url(#kGoldGrad)" strokeWidth="4.5" />
              {/* Crown Center Peak */}
              <path d="M 170 112 L 177 100 L 184 112 Z" fill="url(#kGoldGrad)" stroke="#A84E00" strokeWidth="1" />
              <circle cx="177" cy="107" r="2.5" fill="#FF3B30" />
            </g>

            {/* ════════════════ 10. PEACOCK FEATHER (MOR PANKH) ════════════════ */}
            <g id="peacockFeather" transform="translate(145, -45) rotate(-18) scale(1.4)">
              {/* Slender Curved Green Stem */}
              <path d="M 34 78 C 30 50, 24 22, 12 0" fill="none" stroke="url(#kFeatherStem)" strokeWidth="2.5" strokeLinecap="round" />

              {/* Lush Background Shadow Frond */}
              <path
                d="M 12 0 C -40 -15, -50 -65, 12 -85 C 75 -65, 60 -15, 12 0 Z"
                fill="#0B2B16"
                opacity="0.5"
                filter="blur(2px)"
              />

              {/* Main Green Feather Fronds */}
              <path
                d="M 12 0 C -32 -12, -40 -60, 12 -75 C 65 -60, 55 -12, 12 0 Z"
                fill="url(#kFeatherOuter)"
                stroke="#14532D"
                strokeWidth="0.8"
              />

              {/* Voluminous Feather Fibres (Detailed V-Shape lines) */}
              <g stroke="#4ADE80" strokeWidth="0.7" opacity="0.8" strokeLinecap="round">
                {/* Primary dense hairs */}
                <path d="M 12 -68 L -20 -48 M 12 -58 L -24 -38 M 12 -48 L -26 -28 M 12 -38 L -24 -18 M 12 -28 L -20 -8 M 12 -18 L -14 2" />
                <path d="M 12 -68 L 44 -48 M 12 -58 L 48 -38 M 12 -48 L 50 -28 M 12 -38 L 48 -18 M 12 -28 L 44 -8 M 12 -18 L 38 2" />
                {/* Secondary fine hairs */}
                <path d="M 12 -63 L -14 -53 M 12 -53 L -18 -43 M 12 -43 L -20 -33 M 12 -33 L -18 -23" strokeWidth="0.4" opacity="0.9" />
                <path d="M 12 -63 L 38 -53 M 12 -53 L 42 -43 M 12 -43 L 44 -33 M 12 -33 L 42 -23" strokeWidth="0.4" opacity="0.9" />
              </g>

              {/* Peacock Ocellus Ring 1 (Vibrant Teal/Cyan glow base) */}
              <ellipse cx="12" cy="-35" rx="24" ry="28" fill="url(#kFeatherTeal)" stroke="#0EA5E9" strokeWidth="0.5" />

              {/* Peacock Ocellus Ring 2 (Deep Royal Blue/Indigo) */}
              <ellipse cx="12" cy="-34" rx="17" ry="21" fill="#1E3A8A" stroke="#312E81" strokeWidth="1" />

              {/* Peacock Ocellus Ring 3 (Bright Turquoise/Green transition) */}
              <ellipse cx="12" cy="-33" rx="13" ry="17" fill="#0D9488" />

              {/* Peacock Ocellus Ring 4 (Golden Amber Heart) */}
              <ellipse cx="12" cy="-32" rx="10" ry="13" fill="url(#kGoldGrad)" />

              {/* Peacock Ocellus Ring 5 (Deep Ruby/Brown core for contrast) */}
              <ellipse cx="12" cy="-32" rx="5.5" ry="8.5" fill="#78350F" />

              {/* Peacock Ocellus Center Spot (Glowing Cyan/White Specular) */}
              <ellipse cx="11.5" cy="-34" rx="3.5" ry="6" fill="url(#kFeatherCyan)" />
              <circle cx="11" cy="-36" r="1.5" fill="#FFFFFF" />

              {/* Extra Magical Sparkles & Orbs around the feather */}
              <circle cx="-12" cy="-65" r="1.5" fill="#FFEAA7" opacity="0.8" />
              <circle cx="38" cy="-55" r="1.2" fill="#FFEAA7" opacity="0.7" />
              <circle cx="22" cy="-80" r="1.5" fill="#FFEAA7" opacity="0.9" />
              <circle cx="5" cy="-82" r="0.8" fill="#FFEAA7" opacity="0.6" />
              <circle cx="-18" cy="-45" r="1" fill="#FFEAA7" opacity="0.7" />
              <circle cx="45" cy="-35" r="1.5" fill="#FFEAA7" opacity="0.5" />
            </g>
          </g>

          {/* ════════════════ 11. SUDARSHANA CHAKRA HEROIC POSE ════════════════ */}
          {isChakraMode && (
            <g id="sudarshanaChakraGroup" filter="url(#kSoftShadow)">
              {/* Raised Right Arm Sweeping Gracefully Upward */}
              <g id="raisedArm">
                <path
                  d="M 224 190 C 246 182, 252 154, 244 126 L 244 104"
                  fill="none"
                  stroke="url(#kSkinBody)"
                  strokeWidth="20"
                  strokeLinecap="round"
                />
                {/* 3D Highlight on Forearm */}
                <path
                  d="M 224 190 C 246 182, 252 154, 244 126"
                  fill="none"
                  stroke="#B2D4FF"
                  strokeWidth="4"
                  strokeLinecap="round"
                  opacity="0.55"
                />
                {/* Right Fist & Pointing Index Finger */}
                <ellipse cx="244" cy="108" rx="6.5" ry="5.5" fill="url(#kSkinHead)" />
                <path d="M 244 108 L 244 94" fill="none" stroke="url(#kSkinHead)" strokeWidth="5.5" strokeLinecap="round" />
                <circle cx="244" cy="94" r="2.8" fill="#B2D4FF" />

                {/* Right Wrist Bangles */}
                <g transform="translate(235, 120)">
                  <rect x="0" y="0" width="18" height="4.5" rx="2" fill="url(#kGoldGrad)" stroke="#A84E00" strokeWidth="0.5" />
                  <rect x="0" y="6" width="18" height="4.5" rx="2" fill="url(#kGoldGrad)" stroke="#A84E00" strokeWidth="0.5" />
                  <rect x="0" y="12" width="18" height="4.5" rx="2" fill="url(#kGoldGrad)" stroke="#A84E00" strokeWidth="0.5" />
                </g>
                {/* Right Armlet (Baju Band) */}
                <ellipse cx="236" cy="178" rx="8" ry="3.5" fill="url(#kGoldGrad)" />
              </g>

              {/* Glowing Divine Aura Behind Chakra (Elliptical for 3D perspective) */}
              <ellipse cx="244" cy="82" rx="44" ry="18" fill="url(#kCheekBlush)" opacity="0.85" />
              <ellipse cx="244" cy="82" rx="30" ry="12" fill="url(#kGoldGrad)" opacity="0.6" />

              {/* 3D Perspective Group for the Chakra */}
              <g transform="translate(244, 82) scale(1, 0.35) translate(-244, -82)">
                {/* Spinning Sudarshana Chakra Disc Directly on Finger Tip */}
                <g className={styles.chakraDisc}>
                  {/* Thick Outer Ring */}
                  <circle cx="244" cy="82" r="32" fill="none" stroke="url(#kGoldGrad)" strokeWidth="6" />
                  <circle cx="244" cy="82" r="28" fill="none" stroke="#FF8A00" strokeWidth="2" strokeDasharray="6 3" />
                  
                  {/* Inner Rings */}
                  <circle cx="244" cy="82" r="12" fill="none" stroke="url(#kGoldGrad)" strokeWidth="3" />
                  <circle cx="244" cy="82" r="6" fill="#FFC83D" stroke="#B85900" strokeWidth="1.5" />
                  <circle cx="244" cy="82" r="2.5" fill="#FFFFFF" />

                  {/* 8 Radiating Sudarshana Diamond Spokes */}
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                    <g key={angle} transform={`rotate(${angle} 244 82)`}>
                      <line x1="250" y1="82" x2="274" y2="82" stroke="url(#kGoldGrad)" strokeWidth="3" />
                      <path
                        d="M 272 82 L 278 77 L 284 82 L 278 87 Z"
                        fill="url(#kGoldGrad)"
                        stroke="#FF3B30"
                        strokeWidth="1"
                      />
                    </g>
                  ))}
                </g>
              </g>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

// Default export compatible with Desktop Buddy Sprite Renderer
export default function KrishnaSprite(props: BuddySpriteProps) {
  return (
    <LittleKrishna
      mood={props.mood}
      pose={(props.pose as KrishnaPose) || 'chakra'}
      name={props.name || 'Little Krishna'}
      greeting={props.greeting}
      isDragging={props.isDragging}
      petStreak={props.petStreak}
      onClick={props.onClick}
      onRefreshGreeting={props.onRefreshGreeting}
      onFeed={props.onFeed}
      size="md"
    />
  );
}
