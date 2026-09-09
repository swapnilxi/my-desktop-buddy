import React from 'react';
import styles from '../Krishna/krishna.module.css';
import { Krishna2Lips, Krishna2LipsDefs } from './Krishna2_face';

export interface Krishna2EyesProps {
  isBlinking?: boolean;
  state?: string;
}

export const Krishna2Eyes: React.FC<Krishna2EyesProps> = ({
  isBlinking = false,
  state = 'idle',
}) => {
  const isHappy = state === 'happy' || state === 'clicked';
  const isThinking = state === 'thinking';

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

        {/* Luminous Warm Honey-Amber Iris Gradient (Matching Reference) */}
        <radialGradient id="k2_IrisGrad" cx="44%" cy="36%" r="62%">
          <stop offset="0%" stopColor="#FEF3C7" />
          <stop offset="16%" stopColor="#FDE68A" />
          <stop offset="36%" stopColor="#F59E0B" />
          <stop offset="62%" stopColor="#B45309" />
          <stop offset="82%" stopColor="#5B1D04" />
          <stop offset="94%" stopColor="#2A0B02" />
          <stop offset="100%" stopColor="#100300" />
        </radialGradient>

        {/* Deep Obsidian Black Pupil Gradient */}
        <radialGradient id="k2_PupilGrad" cx="48%" cy="46%" r="56%">
          <stop offset="0%" stopColor="#040101" />
          <stop offset="70%" stopColor="#0B0301" />
          <stop offset="90%" stopColor="#160602" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#240A03" stopOpacity="0" />
        </radialGradient>

        {/* Soft Natural Rosy Toddler Lip Shader Defs */}
        <Krishna2LipsDefs />
      </defs>

      {/* ════════════════ 1. EYEBROWS ════════════════ */}
      <g id="k2_eyebrows">
        {/* Left Eyebrow (Lifted, expressive arched toddler brow) */}
        <path
          d={
            isThinking
              ? "M 124 114 C 136 106, 156 109, 166 117"
              : isHappy
              ? "M 124 115 C 136 105, 156 105, 166 115"
              : "M 124 118 C 136 107, 156 107, 166 116"
          }
          fill="none"
          stroke="#0D1B49"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        <path
          d="M 125 119 C 136 108, 155 108, 165 117"
          fill="none"
          stroke="#315EA8"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.28"
        />

        {/* Right Eyebrow */}
        <path
          d={
            isThinking
              ? "M 214 117 C 224 109, 244 106, 256 114"
              : isHappy
              ? "M 214 115 C 224 105, 244 105, 256 115"
              : "M 214 116 C 224 107, 244 107, 256 118"
          }
          fill="none"
          stroke="#0D1B49"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        <path
          d="M 215 117 C 225 108, 244 108, 255 119"
          fill="none"
          stroke="#315EA8"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.28"
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
            {/* Main Honey-Amber Iris Sphere */}
            <circle cx="144" cy="146" r="16.5" fill="url(#k2_IrisGrad)" />
            {/* Deep Outer Ring */}
            <circle cx="144" cy="146" r="16.5" fill="none" stroke="#1A0802" strokeWidth="1.2" opacity="0.88" />

            {/* Deep Obsidian Black Pupil */}
            <circle cx="144" cy="146" r="9.5" fill="url(#k2_PupilGrad)" />
            <circle cx="144" cy="146" r="8.2" fill="#040101" />

            {/* Lower Radiant Golden Reflection Arc */}
            <ellipse cx="144" cy="153.8" rx="9.0" ry="3.2" fill="#FCD34D" opacity="0.65" />

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

          {/* Animatable Upper Eyelid for Blinking */}
          <path
            d="M 112 120 H 176 V 172 H 112 Z"
            fill="#5E9AF8"
            className={`${styles.eyelidUpper} ${isBlinking ? styles.blinkActive : ''}`}
            style={{
              transform: isBlinking ? 'translateY(0)' : 'translateY(-100%)',
              transition: 'transform 0.12s ease-out',
            }}
          />
        </g>

        {/* ── EYELIDS & CONTOURS ── */}
        {/* Double-Eyelid Crease (Fold above eye) */}
        <path
          d="M 124 130 C 135 120, 155 120, 166 130"
          fill="none"
          stroke="#255BB5"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.35"
        />

        {/* Upper Eyelash Line (Thick velvety dark stroke with delicate taper) */}
        <path
          d="M 118 146 C 126 122, 162 122, 170 146"
          fill="none"
          stroke="#0B132B"
          strokeWidth="3.8"
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
            {/* Main Honey-Amber Iris Sphere */}
            <circle cx="236" cy="146" r="16.5" fill="url(#k2_IrisGrad)" />
            {/* Deep Outer Ring */}
            <circle cx="236" cy="146" r="16.5" fill="none" stroke="#1A0802" strokeWidth="1.2" opacity="0.88" />

            {/* Deep Obsidian Black Pupil */}
            <circle cx="236" cy="146" r="9.5" fill="url(#k2_PupilGrad)" />
            <circle cx="236" cy="146" r="8.2" fill="#040101" />

            {/* Lower Radiant Golden Reflection Arc */}
            <ellipse cx="236" cy="153.8" rx="9.0" ry="3.2" fill="#FCD34D" opacity="0.65" />

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

          {/* Animatable Upper Eyelid for Blinking */}
          <path
            d="M 204 120 H 268 V 172 H 204 Z"
            fill="#5E9AF8"
            className={`${styles.eyelidUpper} ${isBlinking ? styles.blinkActive : ''}`}
            style={{
              transform: isBlinking ? 'translateY(0)' : 'translateY(-100%)',
              transition: 'transform 0.12s ease-out',
            }}
          />
        </g>

        {/* ── EYELIDS & CONTOURS ── */}
        {/* Double-Eyelid Crease */}
        <path
          d="M 214 130 C 225 120, 245 120, 256 130"
          fill="none"
          stroke="#255BB5"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.35"
        />

        {/* Upper Eyelash Line */}
        <path
          d="M 210 146 C 218 122, 254 122, 262 146"
          fill="none"
          stroke="#0B132B"
          strokeWidth="3.8"
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
      <Krishna2Lips state={state} isHappy={isHappy} isThinking={isThinking} />
    </g>
  );
};
