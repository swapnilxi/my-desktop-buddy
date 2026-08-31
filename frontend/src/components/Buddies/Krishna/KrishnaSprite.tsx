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
          viewBox="0 -110 360 550"
          className={styles.krishnaSvg}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          <defs>
            {/* 3D Pixar Divine Skin Tone Gradient */}
            <radialGradient id="kSkinHead" cx="42%" cy="32%" r="68%">
              <stop offset="0%" stopColor="#C4E0FF" />
              <stop offset="35%" stopColor="#82B8FF" />
              <stop offset="70%" stopColor="#4F8EF0" />
              <stop offset="92%" stopColor="#326ECB" />
              <stop offset="100%" stopColor="#224FA6" />
            </radialGradient>

            <radialGradient id="kSkinBody" cx="42%" cy="32%" r="68%">
              <stop offset="0%" stopColor="#B8DAFF" />
              <stop offset="40%" stopColor="#82B8FF" />
              <stop offset="75%" stopColor="#4F8EF0" />
              <stop offset="100%" stopColor="#2C64BF" />
            </radialGradient>

            {/* 3D Stylized Dark Blue-Black Hair Gradients */}
            <radialGradient id="kHairBaseGrad" cx="35%" cy="25%" r="75%">
              <stop offset="0%" stopColor="#253452" />
              <stop offset="45%" stopColor="#141C2E" />
              <stop offset="80%" stopColor="#0A0F1A" />
              <stop offset="100%" stopColor="#04060C" />
            </radialGradient>

            <radialGradient id="kHairCurl3D" cx="38%" cy="28%" r="68%">
              <stop offset="0%" stopColor="#3B4D73" />
              <stop offset="35%" stopColor="#1D2A44" />
              <stop offset="75%" stopColor="#0D1322" />
              <stop offset="100%" stopColor="#050810" />
            </radialGradient>

            <radialGradient id="kHairCurlHighlight" cx="35%" cy="30%" r="50%">
              <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.55" />
              <stop offset="60%" stopColor="#94A3B8" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#1E293B" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="kTopknotGrad" cx="38%" cy="25%" r="70%">
              <stop offset="0%" stopColor="#41557A" />
              <stop offset="40%" stopColor="#1E2B45" />
              <stop offset="80%" stopColor="#0D1424" />
              <stop offset="100%" stopColor="#04070D" />
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

            {/* Warm Brown 3D Iris Gradient */}
            <radialGradient id="kIrisGrad" cx="38%" cy="32%" r="65%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="25%" stopColor="#B45309" />
              <stop offset="65%" stopColor="#78350F" />
              <stop offset="90%" stopColor="#451A03" />
              <stop offset="100%" stopColor="#1E0B02" />
            </radialGradient>

            {/* Soft Rosy-Coral Cheek Blush */}
            <radialGradient id="kCheekBlush" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255, 101, 132, 0.55)" />
              <stop offset="55%" stopColor="rgba(255, 130, 155, 0.25)" />
              <stop offset="100%" stopColor="rgba(255, 130, 155, 0)" />
            </radialGradient>

            {/* Closed Soft Playful Lip Shading */}
            <linearGradient id="kLipGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FB7185" />
              <stop offset="60%" stopColor="#E11D48" />
              <stop offset="100%" stopColor="#9F1239" />
            </linearGradient>

            {/* ════ Peacock Feather (Mor Pankh) — Matched to Reference Image ════ */}
            {/* Brown-Gold Quill Stem */}
            <linearGradient id="kFeatherStemGrad" x1="0%" y1="100%" x2="40%" y2="0%">
              <stop offset="0%" stopColor="#854D0E" />
              <stop offset="35%" stopColor="#B45309" />
              <stop offset="75%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>

            <linearGradient id="kFeatherStemHl" x1="0%" y1="100%" x2="40%" y2="0%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>

            {/* Lush Background Plume (Emerald to Parrot Green Fan) */}
            <radialGradient id="kFeatherPlumeGrad" cx="45%" cy="40%" r="65%">
              <stop offset="0%" stopColor="#A3E635" />
              <stop offset="30%" stopColor="#4ADE80" />
              <stop offset="65%" stopColor="#16A34A" />
              <stop offset="90%" stopColor="#065F46" />
              <stop offset="100%" stopColor="#022C22" />
            </radialGradient>

            {/* Reference Image Golden-Orange Eye Halo */}
            <radialGradient id="kFeatherEyeGold" cx="48%" cy="46%" r="62%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="25%" stopColor="#FBBF24" />
              <stop offset="60%" stopColor="#F59E0B" />
              <stop offset="85%" stopColor="#EA580C" />
              <stop offset="100%" stopColor="#9A3412" />
            </radialGradient>

            {/* Reference Image Bright Cyan Ring */}
            <radialGradient id="kFeatherEyeCyan" cx="48%" cy="46%" r="60%">
              <stop offset="0%" stopColor="#E0F2FE" />
              <stop offset="30%" stopColor="#38BDF8" />
              <stop offset="70%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#0369A1" />
            </radialGradient>

            {/* Reference Image Deep Cobalt Navy Heart Core */}
            <radialGradient id="kFeatherEyeNavy" cx="48%" cy="40%" r="65%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="25%" stopColor="#1D4ED8" />
              <stop offset="65%" stopColor="#1E1B4B" />
              <stop offset="92%" stopColor="#0F172A" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>

            {/* Luminous Peacock Teal / Turquoise Ring */}
            <radialGradient id="kFeatherTealHalo" cx="45%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#67E8F9" />
              <stop offset="35%" stopColor="#06B6D4" />
              <stop offset="70%" stopColor="#0891B2" />
              <stop offset="95%" stopColor="#0E7490" />
              <stop offset="100%" stopColor="#164E63" />
            </radialGradient>

            {/* Deep Royal Sapphire Field */}
            <radialGradient id="kFeatherSapphire" cx="45%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="25%" stopColor="#2563EB" />
              <stop offset="65%" stopColor="#1D4ED8" />
              <stop offset="90%" stopColor="#1E3A8A" />
              <stop offset="100%" stopColor="#0F172A" />
            </radialGradient>

            {/* Iconic Inner Heart/Kidney Violet Core */}
            <radialGradient id="kFeatherVioletHeart" cx="45%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#E879F9" />
              <stop offset="30%" stopColor="#A855F7" />
              <stop offset="65%" stopColor="#6B21A8" />
              <stop offset="90%" stopColor="#3B0764" />
              <stop offset="100%" stopColor="#180228" />
            </radialGradient>

            {/* Electric Cyan Specular Core */}
            <radialGradient id="kFeatherCyanCore" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="40%" stopColor="#67E8F9" />
              <stop offset="75%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#0284C7" />
            </radialGradient>

            {/* Feather Divine Soft Glow Filter */}
            <filter id="kFeatherGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#06B6D4" floodOpacity="0.6" />
              <feDropShadow dx="0" dy="2" stdDeviation="6" floodColor="#10B981" floodOpacity="0.4" />
            </filter>

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

            {/* ════════════════ 6. VOLUMINOUS CURLY HAIR (BACK & SIDES) ════════════════ */}
            <g id="headGroup" transform="translate(0, -18)">
              <g id="hairBack">
                {/* Outer 3D Sculpted Dark Blue-Black Curls Layer */}
                {/* Left Back Curls */}
                <circle cx="112" cy="120" r="32" fill="url(#kHairCurl3D)" />
                <ellipse cx="106" cy="116" rx="24" ry="20" fill="url(#kHairCurlHighlight)" />
                <circle cx="96" cy="148" r="28" fill="url(#kHairCurl3D)" />
                <ellipse cx="90" cy="144" rx="20" ry="16" fill="url(#kHairCurlHighlight)" />
                <circle cx="98" cy="176" r="26" fill="url(#kHairCurl3D)" />
                <ellipse cx="92" cy="172" rx="18" ry="14" fill="url(#kHairCurlHighlight)" />

                {/* Right Back Curls */}
                <circle cx="242" cy="120" r="32" fill="url(#kHairCurl3D)" />
                <ellipse cx="248" cy="116" rx="24" ry="20" fill="url(#kHairCurlHighlight)" />
                <circle cx="258" cy="148" r="28" fill="url(#kHairCurl3D)" />
                <ellipse cx="264" cy="144" rx="20" ry="16" fill="url(#kHairCurlHighlight)" />
                <circle cx="256" cy="176" r="26" fill="url(#kHairCurl3D)" />
                <ellipse cx="262" cy="172" rx="18" ry="14" fill="url(#kHairCurlHighlight)" />

                {/* Upper Crown Back Curls */}
                <circle cx="132" cy="92" r="34" fill="url(#kHairCurl3D)" />
                <ellipse cx="126" cy="88" rx="24" ry="18" fill="url(#kHairCurlHighlight)" />
                <circle cx="177" cy="76" r="42" fill="url(#kHairCurl3D)" />
                <ellipse cx="177" cy="68" rx="30" ry="22" fill="url(#kHairCurlHighlight)" />
                <circle cx="222" cy="92" r="34" fill="url(#kHairCurl3D)" />
                <ellipse cx="228" cy="88" rx="24" ry="18" fill="url(#kHairCurlHighlight)" />
              </g>

              {/* 3D Side Curls Cascading around cheeks */}
              <g id="hairSides">
                {/* Left Cheek Ringlet Locks */}
                <path
                  d="M 104 150 C 94 162, 100 182, 114 186 C 122 188, 126 178, 118 170 C 112 164, 116 156, 122 154"
                  fill="url(#kHairCurl3D)"
                  stroke="#3B4D73"
                  strokeWidth="0.8"
                />
                <path
                  d="M 104 150 C 94 162, 100 182, 114 186"
                  fill="none"
                  stroke="#60A5FA"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity="0.45"
                />

                {/* Right Cheek Ringlet Locks */}
                <path
                  d="M 250 150 C 260 162, 254 182, 240 186 C 232 188, 228 178, 236 170 C 242 164, 238 156, 232 154"
                  fill="url(#kHairCurl3D)"
                  stroke="#3B4D73"
                  strokeWidth="0.8"
                />
                <path
                  d="M 250 150 C 260 162, 254 182, 240 186"
                  fill="none"
                  stroke="#60A5FA"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity="0.45"
                />
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

              {/* Chubby Pixar Head Sphere (Softer, fuller cheeks) */}
              <ellipse cx="177" cy="151" rx="64" ry="58" fill="url(#kSkinHead)" />

              {/* Chin / Jaw Soft Shadow */}
              <ellipse cx="177" cy="192" rx="38" ry="16" fill="#2451A3" opacity="0.3" filter="blur(3px)" />

              {/* Soft Rosy-Coral Chubby Cheeks */}
              <ellipse cx="130" cy="169" rx="22" ry="14" fill="url(#kCheekBlush)" transform="rotate(-6 130 169)" />
              <ellipse cx="224" cy="169" rx="22" ry="14" fill="url(#kCheekBlush)" transform="rotate(6 224 169)" />
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
              <path d="M 172 108 L 172 128 C 172 134, 182 134, 182 128 L 182 108" fill="none" stroke="#FEF08A" strokeWidth="1.5" opacity="0.8" />
              <circle cx="177" cy="140" r="3.2" fill="#EF4444" stroke="#991B1B" strokeWidth="0.5" />

              {/* Expressive Curved Eyebrows */}
              <path d="M 128 133 C 142 123, 158 126, 164 133" fill="none" stroke="#1E100A" strokeWidth="4.2" strokeLinecap="round" />
              <path d="M 226 133 C 212 123, 196 126, 190 133" fill="none" stroke="#1E100A" strokeWidth="4.2" strokeLinecap="round" />

              {/* Left Eye (Larger, Dimensional Warm Brown Eye) */}
              <g transform="translate(130, 137)">
                {/* White Sclera */}
                <ellipse cx="18" cy="16" rx="18.5" ry="17.5" fill="#FFFFFF" />
                {/* Eyelid Contour Shadow */}
                <path d="M 0 14 C 7 3, 29 3, 36 14" fill="none" stroke="#1E100A" strokeWidth="4.2" strokeLinecap="round" />
                <path d="M 2 13 C 8 5, 28 5, 34 13" fill="none" stroke="#78350F" strokeWidth="1.2" opacity="0.6" />
                {/* Warm Brown 3D Iris */}
                <circle cx="18" cy="16" r="13" fill="url(#kIrisGrad)" />
                {/* Limbal Ring Accent */}
                <circle cx="18" cy="16" r="13" fill="none" stroke="#2D0F02" strokeWidth="1" opacity="0.7" />
                {/* Pupil */}
                <circle cx="18" cy="16" r="6.8" fill="#0C0502" />
                {/* Specular Catchlights (Glossy Realistic Reflections) */}
                <circle cx="22.5" cy="11.5" r="4.3" fill="#FFFFFF" />
                <circle cx="13.5" cy="20.5" r="2.2" fill="#FFFFFF" opacity="0.88" />
                <circle cx="24" cy="18" r="1.2" fill="#FDE047" opacity="0.6" />
              </g>

              {/* Right Eye (Larger, Dimensional Warm Brown Eye) */}
              <g transform="translate(188, 137)">
                {/* White Sclera */}
                <ellipse cx="18" cy="16" rx="18.5" ry="17.5" fill="#FFFFFF" />
                {/* Eyelid Contour Shadow */}
                <path d="M 0 14 C 7 3, 29 3, 36 14" fill="none" stroke="#1E100A" strokeWidth="4.2" strokeLinecap="round" />
                <path d="M 2 13 C 8 5, 28 5, 34 13" fill="none" stroke="#78350F" strokeWidth="1.2" opacity="0.6" />
                {/* Warm Brown 3D Iris */}
                <circle cx="18" cy="16" r="13" fill="url(#kIrisGrad)" />
                {/* Limbal Ring Accent */}
                <circle cx="18" cy="16" r="13" fill="none" stroke="#2D0F02" strokeWidth="1" opacity="0.7" />
                {/* Pupil */}
                <circle cx="18" cy="16" r="6.8" fill="#0C0502" />
                {/* Specular Catchlights (Glossy Realistic Reflections) */}
                <circle cx="22.5" cy="11.5" r="4.3" fill="#FFFFFF" />
                <circle cx="13.5" cy="20.5" r="2.2" fill="#FFFFFF" opacity="0.88" />
                <circle cx="24" cy="18" r="1.2" fill="#FDE047" opacity="0.6" />
              </g>

              {/* Small Rounded Childlike 3D Nose */}
              <g id="noseGroup" transform="translate(177, 164)">
                {/* Soft Nose Bridge Glow */}
                <path d="M 0 -7 L 0 -1" stroke="#C4E0FF" strokeWidth="1.6" strokeLinecap="round" opacity="0.4" />
                {/* Base Nose Underside Shadow */}
                <ellipse cx="0" cy="2" rx="6" ry="3.5" fill="#2451A3" opacity="0.4" />
                {/* Main Skin Nose Tip Bulb */}
                <ellipse cx="0" cy="0" rx="5.2" ry="3.4" fill="url(#kSkinHead)" />
                {/* Soft Nostril Dots */}
                <circle cx="-3" cy="2" r="1.2" fill="#1C3D7D" opacity="0.4" />
                <circle cx="3" cy="2" r="1.2" fill="#1C3D7D" opacity="0.4" />
                {/* Glossy Nose Tip Highlight */}
                <ellipse cx="-1" cy="-0.8" rx="2.2" ry="1.2" fill="#FFFFFF" opacity="0.95" />
              </g>

              {/* Gentle Closed-Mouth Playful Smile (Innocent, Divine, Sweet) */}
              <g id="lipsGroup" transform="translate(177, 179)">
                {/* Corner Dimple Accents */}
                <circle cx="-16" cy="-1" r="1.5" fill="#881337" opacity="0.5" />
                <circle cx="16" cy="-1" r="1.5" fill="#881337" opacity="0.5" />

                {/* Soft Upper Lip Cushion Curve */}
                <path
                  d="M -15 -1 C -8 -4, -3 -2, 0 -3.5 C 3 -2, 8 -4, 15 -1 Z"
                  fill="url(#kLipGrad)"
                  opacity="0.9"
                />

                {/* Gentle Sweet Closed Smile Seam Line */}
                <path
                  d="M -16 -1 C -8 5, 8 5, 16 -1"
                  fill="none"
                  stroke="#881337"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                {/* Soft Chubby Lower Lip Cushion */}
                <path
                  d="M -11 0 C -6 6, 6 6, 11 0 C 6 4.5, -6 4.5, -11 0 Z"
                  fill="#FDA4AF"
                  opacity="0.95"
                />

                {/* Lip Gloss Specular Highlight Drop */}
                <path
                  d="M -5.5 3 C -1.5 4.5, 1.5 4.5, 5.5 3"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  opacity="0.9"
                />
              </g>
            </g>

            {/* ════════════════ 9. TOPKNOT BUN IN HAIR ════════════════ */}
            <g id="crownTopknot">
              {/* Sculpted 3D Topknot Bun Base */}
              <ellipse cx="177" cy="74" rx="28" ry="24" fill="url(#kTopknotGrad)" />
              {/* Surface 3D Ringlet Clusters on Bun */}
              <ellipse cx="164" cy="68" rx="11" ry="10" fill="url(#kHairCurl3D)" />
              <ellipse cx="190" cy="68" rx="11" ry="10" fill="url(#kHairCurl3D)" />
              <ellipse cx="177" cy="58" rx="12" ry="10" fill="url(#kHairCurl3D)" />
              <ellipse cx="172" cy="62" rx="16" ry="11" fill="url(#kHairCurlHighlight)" />

              {/* Forehead Soft Bouncy Curls */}
              <g id="foreheadCurls">
                <path d="M 134 114 C 128 104, 142 98, 148 108 C 152 115, 140 120, 134 114 Z" fill="url(#kHairCurl3D)" />
                <path d="M 220 114 C 226 104, 212 98, 206 108 C 202 115, 214 120, 220 114 Z" fill="url(#kHairCurl3D)" />
                <ellipse cx="158" cy="106" rx="9" ry="7" fill="url(#kHairCurl3D)" />
                <ellipse cx="196" cy="106" rx="9" ry="7" fill="url(#kHairCurl3D)" />
              </g>
            </g>

            {/* ════════════════ 10. PEACOCK FEATHER (MOR PANKH — LUSH & DENSE) ════════════════ */}
            <g id="peacockFeather" className={styles.featherSvgAnim} filter="url(#kFeatherGlow)">
              <g id="featherScaleContainer" transform="translate(174, 80) scale(0.48) translate(-174, -80)">
                {/* A. Rich Dense Plume Background Base (Prevents see-through gaps) */}
                <g id="featherPlumeBase">
                  <path
                    d="M 142 -35 C 95 -65, 75 -110, 115 -110 C 148 -110, 188 -75, 175 -25 Z"
                    fill="url(#kFeatherPlumeGrad)"
                    opacity="0.7"
                  />
                  <path
                    d="M 142 -35 C 105 -60, 88 -98, 118 -98 C 142 -98, 175 -70, 168 -28 Z"
                    fill="#047857"
                    opacity="0.5"
                  />
                  <path
                    d="M 142 -30 C 112 -50, 98 -85, 120 -85 C 138 -85, 162 -58, 158 -25 Z"
                    fill="#15803D"
                    opacity="0.6"
                  />
                </g>

                {/* B. Dense Top Crown Filaments (Vanes fanning upwards from the eye) */}
                <g id="featherCrownFilaments" strokeLinecap="round">
                  {/* Under-layer Dark Green Vanes */}
                  <path d="M 133 -42 C 110 -60, 84 -80, 68 -88" fill="none" stroke="#064E3B" strokeWidth="2.5" />
                  <path d="M 135 -45 C 114 -64, 88 -86, 74 -96" fill="none" stroke="#047857" strokeWidth="2.4" />
                  <path d="M 137 -48 C 117 -69, 93 -91, 80 -102" fill="none" stroke="#15803D" strokeWidth="2.2" />
                  <path d="M 139 -51 C 120 -74, 98 -97, 86 -108" fill="none" stroke="#16A34A" strokeWidth="2.0" />
                  <path d="M 140 -54 C 123 -77, 104 -101, 93 -113" fill="none" stroke="#047857" strokeWidth="2.2" />
                  <path d="M 141 -56 C 127 -80, 110 -104, 100 -117" fill="none" stroke="#15803D" strokeWidth="2.0" />

                  {/* Center High Dense Filaments */}
                  <path d="M 141 -57 C 130 -82, 114 -106, 104 -120" fill="none" stroke="#22C55E" strokeWidth="2.0" />
                  <path d="M 142 -58 C 134 -84, 120 -108, 111 -122" fill="none" stroke="#4ADE80" strokeWidth="1.8" />
                  <path d="M 142 -58 C 137 -85, 125 -109, 117 -123" fill="none" stroke="#A3E635" strokeWidth="1.6" />
                  <path d="M 143 -58 C 140 -86, 130 -110, 123 -124" fill="none" stroke="#84CC16" strokeWidth="1.8" />
                  <path d="M 143 -58 C 142 -86, 135 -110, 129 -123" fill="none" stroke="#16A34A" strokeWidth="2.2" />
                  <path d="M 144 -57 C 145 -85, 140 -109, 135 -121" fill="none" stroke="#4ADE80" strokeWidth="1.8" />
                  <path d="M 145 -56 C 148 -83, 145 -107, 140 -118" fill="none" stroke="#22C55E" strokeWidth="2.0" />

                  {/* Outer Right Dense Sweep */}
                  <path d="M 146 -54 C 152 -79, 151 -103, 147 -115" fill="none" stroke="#15803D" strokeWidth="2.2" />
                  <path d="M 147 -51 C 157 -75, 158 -98, 154 -110" fill="none" stroke="#16A34A" strokeWidth="2.0" />
                  <path d="M 148 -48 C 162 -70, 165 -92, 161 -103" fill="none" stroke="#4ADE80" strokeWidth="1.8" />
                  <path d="M 149 -45 C 166 -64, 172 -84, 168 -95" fill="none" stroke="#84CC16" strokeWidth="1.6" />
                  <path d="M 150 -42 C 170 -58, 178 -76, 174 -86" fill="none" stroke="#047857" strokeWidth="2.4" />
                </g>

                {/* C. Lush Dense Side Barbs Radiating Along Quill (Left & Right) */}
                <g id="featherSideBarbs" strokeLinecap="round">
                  {/* Left Side Dense Barbs Layer (Dark Base + Vivid Overlays) */}
                  <path d="M 130 -35 C 105 -40, 82 -50, 68 -62" fill="none" stroke="#064E3B" strokeWidth="2.5" />
                  <path d="M 132 -30 C 108 -34, 86 -44, 73 -55" fill="none" stroke="#15803D" strokeWidth="2.2" />
                  <path d="M 133 -25 C 109 -28, 88 -37, 75 -48" fill="none" stroke="#16A34A" strokeWidth="2.0" />
                  <path d="M 135 -20 C 111 -22, 90 -30, 78 -41" fill="none" stroke="#22C55E" strokeWidth="1.8" />
                  <path d="M 137 -15 C 113 -16, 92 -23, 80 -34" fill="none" stroke="#4ADE80" strokeWidth="1.8" />
                  <path d="M 139 -10 C 115 -10, 94 -16, 82 -27" fill="none" stroke="#15803D" strokeWidth="2.2" />
                  <path d="M 141 -4 C 117 -4, 96 -9, 84 -19" fill="none" stroke="#84CC16" strokeWidth="1.6" />
                  <path d="M 143 2 C 119 2, 98 -2, 86 -11" fill="none" stroke="#16A34A" strokeWidth="2.0" />
                  <path d="M 145 8 C 121 8, 100 4, 88 -4" fill="none" stroke="#22C55E" strokeWidth="1.8" />
                  <path d="M 147 14 C 123 14, 102 10, 90 2" fill="none" stroke="#047857" strokeWidth="2.4" />
                  <path d="M 149 20 C 126 21, 105 17, 92 8" fill="none" stroke="#15803D" strokeWidth="2.2" />
                  <path d="M 152 26 C 129 27, 108 24, 95 14" fill="none" stroke="#4ADE80" strokeWidth="1.8" />
                  <path d="M 154 32 C 132 34, 111 31, 98 20" fill="none" stroke="#16A34A" strokeWidth="2.0" />
                  <path d="M 157 38 C 135 41, 114 38, 101 26" fill="none" stroke="#22C55E" strokeWidth="1.8" />
                  <path d="M 159 44 C 138 48, 117 45, 104 33" fill="none" stroke="#047857" strokeWidth="2.2" />
                  <path d="M 162 50 C 141 55, 120 52, 108 39" fill="none" stroke="#15803D" strokeWidth="2.2" />
                  <path d="M 165 56 C 144 62, 124 59, 112 46" fill="none" stroke="#84CC16" strokeWidth="1.6" />
                  <path d="M 168 62 C 148 69, 128 66, 116 53" fill="none" stroke="#16A34A" strokeWidth="2.0" />
                  <path d="M 170 68 C 151 76, 132 73, 120 60" fill="none" stroke="#064E3B" strokeWidth="2.4" />
                  <path d="M 172 74 C 154 82, 136 79, 124 67" fill="none" stroke="#022C22" strokeWidth="2.2" />

                  {/* Right Side Dense Barbs Layer (Dark Base + Vivid Overlays) */}
                  <path d="M 154 -35 C 178 -41, 200 -51, 214 -63" fill="none" stroke="#064E3B" strokeWidth="2.5" />
                  <path d="M 153 -30 C 176 -35, 198 -45, 211 -56" fill="none" stroke="#15803D" strokeWidth="2.2" />
                  <path d="M 152 -25 C 175 -29, 196 -38, 209 -49" fill="none" stroke="#16A34A" strokeWidth="2.0" />
                  <path d="M 151 -20 C 173 -23, 194 -31, 207 -41" fill="none" stroke="#22C55E" strokeWidth="1.8" />
                  <path d="M 150 -15 C 172 -17, 193 -24, 206 -34" fill="none" stroke="#4ADE80" strokeWidth="1.8" />
                  <path d="M 149 -10 C 170 -11, 191 -17, 204 -26" fill="none" stroke="#15803D" strokeWidth="2.2" />
                  <path d="M 148 -4 C 169 -5, 189 -10, 202 -18" fill="none" stroke="#84CC16" strokeWidth="1.6" />
                  <path d="M 147 2 C 168 1, 188 -3, 201 -10" fill="none" stroke="#16A34A" strokeWidth="2.0" />
                  <path d="M 148 8 C 169 7, 189 3, 202 -3" fill="none" stroke="#22C55E" strokeWidth="1.8" />
                  <path d="M 149 14 C 170 13, 190 10, 203 4" fill="none" stroke="#047857" strokeWidth="2.4" />
                  <path d="M 151 20 C 172 20, 192 17, 205 11" fill="none" stroke="#15803D" strokeWidth="2.2" />
                  <path d="M 153 26 C 174 26, 194 24, 206 18" fill="none" stroke="#4ADE80" strokeWidth="1.8" />
                  <path d="M 155 32 C 176 32, 196 30, 208 24" fill="none" stroke="#16A34A" strokeWidth="2.0" />
                  <path d="M 158 38 C 178 39, 198 37, 209 31" fill="none" stroke="#22C55E" strokeWidth="1.8" />
                  <path d="M 160 44 C 180 46, 200 44, 210 38" fill="none" stroke="#047857" strokeWidth="2.2" />
                  <path d="M 163 50 C 182 53, 201 50, 211 44" fill="none" stroke="#15803D" strokeWidth="2.2" />
                  <path d="M 166 56 C 184 60, 202 57, 211 51" fill="none" stroke="#84CC16" strokeWidth="1.6" />
                  <path d="M 168 62 C 185 67, 203 64, 211 57" fill="none" stroke="#16A34A" strokeWidth="2.0" />
                  <path d="M 171 68 C 187 74, 203 71, 210 64" fill="none" stroke="#064E3B" strokeWidth="2.4" />
                  <path d="M 173 74 C 188 80, 203 77, 209 70" fill="none" stroke="#022C22" strokeWidth="2.2" />
                </g>

                {/* D. Main Feather Eye (Ocellus) — 3-Layered Gradient Eye */}
                <g id="featherEyeGroup" transform="translate(142, -35) rotate(-18)">
                  {/* 1. Golden-Orange Outer Teardrop Halo */}
                  <path
                    d="M 0 -34 C 22 -34, 28 -8, 24 14 C 20 32, 0 42, -20 32 C -28 18, -22 -18, 0 -34 Z"
                    fill="url(#kFeatherEyeGold)"
                    stroke="#D97706"
                    strokeWidth="1.8"
                  />
                  
                  {/* Golden Halo Outer Glow Ring */}
                  <path
                    d="M 0 -32 C 20 -32, 25 -8, 22 12 C 18 28, 0 38, -18 28 C -25 16, -20 -16, 0 -32 Z"
                    fill="none"
                    stroke="#FEF08A"
                    strokeWidth="1.5"
                    opacity="0.85"
                  />

                  {/* 2. Bright Turquoise / Cyan Blue Ring */}
                  <path
                    d="M 0 -24 C 15 -24, 19 -5, 16 10 C 13 22, 0 28, -14 22 C -19 11, -15 -13, 0 -24 Z"
                    fill="url(#kFeatherEyeCyan)"
                    stroke="#0284C7"
                    strokeWidth="1.2"
                  />

                  {/* 3. Deep Sapphire / Navy Heart-Shaped Core */}
                  <path
                    d="M 0 -15 C 11 -15, 14 -1, 10 10 C 6 17, -3 18, -8 13 C -13 7, -9 -7, 0 -15 Z"
                    fill="url(#kFeatherEyeNavy)"
                  />

                  {/* 4. Electric Violet / Sapphire Heart Accent */}
                  <path
                    d="M 0 -10 C 7 -10, 9 0, 6 7 C 4 12, -2 13, -5 9 C -8 5, -6 -5, 0 -10 Z"
                    fill="url(#kFeatherVioletHeart)"
                    opacity="0.9"
                  />

                  {/* 5. Specular Glossy Catchlight Curve */}
                  <path
                    d="M -5 -6 C -1 -12, 5 -12, 8 -6"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    opacity="0.95"
                  />
                  <circle cx="5" cy="5" r="1.8" fill="#67E8F9" opacity="0.85" />
                </g>

                {/* E. Central Quill (Golden-Brown Stem) — Drawn ON TOP for realistic depth */}
                <g id="featherQuill">
                  {/* Base Quill Shaft */}
                  <path
                    d="M 174 80 C 168 50, 156 12, 142 -35 C 132 -62, 120 -82, 112 -98"
                    fill="none"
                    stroke="url(#kFeatherStemGrad)"
                    strokeWidth="4.2"
                    strokeLinecap="round"
                  />
                  {/* Quill Highlight Line */}
                  <path
                    d="M 174 80 C 168 50, 156 12, 142 -35 C 132 -62, 120 -82, 112 -98"
                    fill="none"
                    stroke="url(#kFeatherStemHl)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    opacity="0.9"
                  />
                </g>
              </g>
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
export default function KrishnaSprite(props: BuddySpriteProps & { size?: 'sm' | 'md' | 'lg' }) {
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
      size={props.size || 'md'}
    />
  );
}
