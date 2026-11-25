import React from 'react';
import styles from '../Krishna/krishna.module.css';
import { Krishna2Lips, Krishna2LipsDefs } from './Krishna2_face';

export interface Krishna2EyesProps {
  isBlinking?: boolean;
  isSpeaking?: boolean;
  state?: string;
}

export const Krishna2Eyes: React.FC<Krishna2EyesProps> = ({
  isBlinking = false,
  isSpeaking = false,
  state = 'idle',
}) => {
  const isHappy = state === 'happy' || state === 'clicked' || state === 'motivation';
  const isThinking = state === 'thinking';
  const isRelaxed = state === 'relax';

  return (
    <g id="krishna2_facial_features">
      <defs>
        {/* Left Eye Sclera Clip */}
        <clipPath id="k2_LeftEyeClip">
          <path d="M 119 146 C 126 124, 162 124, 169 146 C 162 167, 126 167, 119 146 Z" />
        </clipPath>

        {/* Right Eye Sclera Clip */}
        <clipPath id="k2_RightEyeClip">
          <path d="M 211 146 C 218 124, 254 124, 261 146 C 254 167, 218 167, 211 146 Z" />
        </clipPath>

        {/* Eyelid Skin Gradient Matched to krishna2_base.png Eye-Socket Tone */}
        <linearGradient id="k2_EyelidSkin" x1="25%" y1="0%" x2="75%" y2="100%">
          <stop offset="0%" stopColor="#8EC1FF" />
          <stop offset="55%" stopColor="#6FAFFB" />
          <stop offset="100%" stopColor="#5291F2" />
        </linearGradient>

        {/* Deep Dark Brown Iris Gradient */}
        <radialGradient id="k2_IrisGrad" cx="44%" cy="36%" r="62%">
          <stop offset="0%" stopColor="#94744B" />
          <stop offset="18%" stopColor="#6F5336" />
          <stop offset="40%" stopColor="#523A24" />
          <stop offset="66%" stopColor="#3B2514" />
          <stop offset="85%" stopColor="#26150C" />
          <stop offset="100%" stopColor="#0E0704" />
        </radialGradient>

        {/* Deep Obsidian Black Pupil Gradient */}
        <radialGradient id="k2_PupilGrad" cx="48%" cy="46%" r="56%">
          <stop offset="0%" stopColor="#000000" />
          <stop offset="70%" stopColor="#0B0301" />
          <stop offset="90%" stopColor="#160602" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#240A03" stopOpacity="0" />
        </radialGradient>

        {/* Soft Natural Rosy Toddler Lip Shader Defs */}
        <Krishna2LipsDefs />
      </defs>

      {/* ════════════════ 1. EYEBROWS ════════════════ */}
      <g id="k2_eyebrows">
        {/* Left Eyebrow (Tapered expressive toddler arch) */}
        <path
          d={
            isThinking
              ? "M 123 114 C 135 103, 155 105, 167 113 C 155 109, 136 107, 123 115 Z"
              : isHappy
              ? "M 123 113 C 135 101, 155 101, 166 111 C 155 105, 136 105, 123 114 Z"
              : "M 123 116 C 135 104, 155 104, 166 113 C 155 108, 136 108, 123 117 Z"
          }
          fill="#0B1942"
          stroke="#0B1942"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />

        {/* Right Eyebrow */}
        <path
          d={
            isThinking
              ? "M 213 113 C 225 105, 245 103, 257 114 C 244 107, 225 109, 213 113 Z"
              : isHappy
              ? "M 214 111 C 225 101, 245 101, 257 113 C 244 105, 225 105, 214 111 Z"
              : "M 214 113 C 225 104, 245 104, 257 116 C 244 108, 225 108, 214 113 Z"
          }
          fill="#0B1942"
          stroke="#0B1942"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </g>

      {/* ════════════════ 2. LEFT EYE (Viewer's Left, X Center ~144) ════════════════ */}
      <g id="k2_leftEyeGroup">
        {/* Eye Socket Ambient Shadow */}
        <path
          d="M 117 146 C 125 122, 163 122, 171 146 C 163 169, 125 169, 117 146 Z"
          fill="#1E3A8A"
          opacity="0.16"
        />

        {/* Sclera (Eyewhite) */}
        <path
          d="M 119 146 C 126 124, 162 124, 169 146 C 162 167, 126 167, 119 146 Z"
          fill="#F8FAFC"
        />

        {/* Clipped Eyeball Contents */}
        <g clipPath="url(#k2_LeftEyeClip)">
          {/* Upper Eyelid Sclera Shadow */}
          <path
            d="M 118 146 C 126 124, 162 124, 170 146 C 160 140, 128 140, 118 146 Z"
            fill="#1E3A8A"
            opacity="0.24"
          />

          {/* IRIS & PUPIL */}
          <g
            id="k2_leftIrisGroup"
            transform={
              isThinking
                ? "translate(-1.5, -2)"
                : "translate(0, 0)"
            }
          >
            {/* Main Dark Brown Iris Sphere */}
            <circle cx="144" cy="146" r="16.5" fill="url(#k2_IrisGrad)" />
            {/* Deep Outer Ring */}
            <circle cx="144" cy="146" r="16.5" fill="none" stroke="#0D0805" strokeWidth="1.2" opacity="0.88" />

            {/* Deep Obsidian Black Pupil */}
            <circle cx="144" cy="146" r="9.5" fill="url(#k2_PupilGrad)" />
            <circle cx="144" cy="146" r="8.2" fill="#000000" />

            {/* Lower Soft Brown Reflection Arc */}
            <ellipse cx="144" cy="153.8" rx="9.0" ry="3.2" fill="#8B6F47" opacity="0.45" />

            {/* ── CATCHLIGHTS / SPECULAR HIGHLIGHTS ── */}
            {/* Primary Catchlight (Large, ~10 o'clock) */}
            <circle cx="139.8" cy="141.2" r="4.6" fill="#FFFFFF" opacity="0.98" />
            <circle cx="139.8" cy="141.2" r="2.4" fill="#FFFFFF" />

            {/* Secondary Catchlight (Medium-soft, ~4 o'clock) */}
            <circle cx="149.2" cy="151.2" r="2.2" fill="#FFFFFF" opacity="0.88" />

            {/* Micro Sparkle (~2 o'clock) */}
            <circle cx="150.2" cy="143.5" r="1.2" fill="#FFFFFF" opacity="0.7" />
          </g>

          {/* Inner Tear Duct */}
          <circle cx="121" cy="146" r="2.2" fill="#FDA4AF" opacity="0.45" />

          {/* Animatable Upper Eyelid for Blinking / Relax */}
          <path
            d="M 112 120 H 176 V 172 H 112 Z"
            fill="url(#k2_EyelidSkin)"
            className={`${styles.eyelidUpper} ${isBlinking ? styles.blinkActive : ''}`}
            style={{
              transform: isBlinking
                ? 'translateY(0)'
                : isRelaxed
                ? 'translateY(-62%)'
                : 'translateY(-100%)',
              transition: 'transform 0.12s ease-out',
            }}
          />
          {isBlinking && (
            <path
              d="M 119 147 C 128 156, 160 156, 169 147"
              fill="none"
              stroke="#0B132B"
              strokeWidth="3.0"
              strokeLinecap="round"
            />
          )}
        </g>

        {/* ── EYELIDS & CONTOURS ── */}
        {/* Double-Eyelid Crease (Fold above eye) */}
        <path
          d="M 124 128 C 135 119, 155 119, 166 128"
          fill="none"
          stroke="#2B62BE"
          strokeWidth="1.15"
          strokeLinecap="round"
          opacity="0.32"
        />

        {/* Upper Eyelash Line (Thick velvety dark stroke with delicate outer flick) */}
        <path
          d="M 116 144 C 125 121, 162 122, 170 146"
          fill="none"
          stroke="#0B132B"
          strokeWidth="4.0"
          strokeLinecap="round"
        />
        <path
          d="M 118 143 C 115 141, 113 139, 112 137"
          fill="none"
          stroke="#0B132B"
          strokeWidth="2.0"
          strokeLinecap="round"
        />

        {/* Lower Lash Contour */}
        <path
          d="M 169 146 C 162 167, 126 167, 119 146"
          fill="none"
          stroke="#1E293B"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.32"
        />
      </g>

      {/* ════════════════ 3. RIGHT EYE (Viewer's Right, X Center ~236) ════════════════ */}
      <g id="k2_rightEyeGroup">
        {/* Eye Socket Ambient Shadow */}
        <path
          d="M 209 146 C 217 122, 255 122, 263 146 C 255 169, 217 169, 209 146 Z"
          fill="#1E3A8A"
          opacity="0.16"
        />

        {/* Sclera (Eyewhite) */}
        <path
          d="M 211 146 C 218 124, 254 124, 261 146 C 254 167, 218 167, 211 146 Z"
          fill="#F8FAFC"
        />

        {/* Clipped Eyeball Contents */}
        <g clipPath="url(#k2_RightEyeClip)">
          {/* Upper Eyelid Sclera Shadow */}
          <path
            d="M 210 146 C 218 124, 254 124, 262 146 C 252 140, 220 140, 210 146 Z"
            fill="#1E3A8A"
            opacity="0.24"
          />

          {/* IRIS & PUPIL */}
          <g
            id="k2_rightIrisGroup"
            transform={
              isThinking
                ? "translate(-1.5, -2)"
                : "translate(0, 0)"
            }
          >
            {/* Main Dark Brown Iris Sphere */}
            <circle cx="236" cy="146" r="16.5" fill="url(#k2_IrisGrad)" />
            {/* Deep Outer Ring */}
            <circle cx="236" cy="146" r="16.5" fill="none" stroke="#0D0805" strokeWidth="1.2" opacity="0.88" />

            {/* Deep Obsidian Black Pupil */}
            <circle cx="236" cy="146" r="9.5" fill="url(#k2_PupilGrad)" />
            <circle cx="236" cy="146" r="8.2" fill="#000000" />

            {/* Lower Soft Brown Reflection Arc */}
            <ellipse cx="236" cy="153.8" rx="9.0" ry="3.2" fill="#8B6F47" opacity="0.45" />

            {/* ── CATCHLIGHTS / SPECULAR HIGHLIGHTS ── */}
            {/* Primary Catchlight (Large, ~10 o'clock) */}
            <circle cx="231.8" cy="141.2" r="4.6" fill="#FFFFFF" opacity="0.98" />
            <circle cx="231.8" cy="141.2" r="2.4" fill="#FFFFFF" />

            {/* Secondary Catchlight (Medium-soft, ~4 o'clock) */}
            <circle cx="241.2" cy="151.2" r="2.2" fill="#FFFFFF" opacity="0.88" />

            {/* Micro Sparkle (~2 o'clock) */}
            <circle cx="242.2" cy="143.5" r="1.2" fill="#FFFFFF" opacity="0.7" />
          </g>

          {/* Inner Tear Duct */}
          <circle cx="259" cy="146" r="2.2" fill="#FDA4AF" opacity="0.45" />

          {/* Animatable Upper Eyelid for Blinking / Relax */}
          <path
            d="M 204 120 H 268 V 172 H 204 Z"
            fill="url(#k2_EyelidSkin)"
            className={`${styles.eyelidUpper} ${isBlinking ? styles.blinkActive : ''}`}
            style={{
              transform: isBlinking
                ? 'translateY(0)'
                : isRelaxed
                ? 'translateY(-62%)'
                : 'translateY(-100%)',
              transition: 'transform 0.12s ease-out',
            }}
          />
          {isBlinking && (
            <path
              d="M 211 147 C 220 156, 252 156, 261 147"
              fill="none"
              stroke="#0B132B"
              strokeWidth="3.0"
              strokeLinecap="round"
            />
          )}
        </g>

        {/* ── EYELIDS & CONTOURS ── */}
        {/* Double-Eyelid Crease */}
        <path
          d="M 214 128 C 225 119, 245 119, 256 128"
          fill="none"
          stroke="#2B62BE"
          strokeWidth="1.15"
          strokeLinecap="round"
          opacity="0.32"
        />

        {/* Upper Eyelash Line */}
        <path
          d="M 210 146 C 218 122, 255 121, 264 144"
          fill="none"
          stroke="#0B132B"
          strokeWidth="4.0"
          strokeLinecap="round"
        />
        <path
          d="M 262 143 C 265 141, 267 139, 268 137"
          fill="none"
          stroke="#0B132B"
          strokeWidth="2.0"
          strokeLinecap="round"
        />

        {/* Lower Lash Contour */}
        <path
          d="M 211 146 C 218 167, 254 167, 261 146"
          fill="none"
          stroke="#1E293B"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.32"
        />
      </g>

      {/* ════════════════ 4. SWEET SMILING MOUTH & PLUMP LIPS (Moved to Krishna2_face.tsx) ════════════════ */}
      <Krishna2Lips state={state} isHappy={isHappy} isThinking={isThinking} isSpeaking={isSpeaking} />
    </g>
  );
};
