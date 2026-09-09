import React from 'react';

export interface Krishna2FaceProps {
  state?: string;
  isHappy?: boolean;
  isThinking?: boolean;
}

export const Krishna2LipsDefs: React.FC = () => {
  return (
    <>
      {/* Soft Natural Rosy Toddler Lip Shader (Matching Reference Image) */}
      <radialGradient id="k2_LipPlump" cx="50%" cy="30%" r="65%">
        <stop offset="0%" stopColor="#FFA6B6" />
        <stop offset="35%" stopColor="#F47285" />
        <stop offset="70%" stopColor="#D9465F" />
        <stop offset="100%" stopColor="#9F1239" />
      </radialGradient>

      <radialGradient id="k2_LipGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FB7185" stopOpacity="0.5" />
        <stop offset="60%" stopColor="#F43F5E" stopOpacity="0.18" />
        <stop offset="100%" stopColor="#BE123C" stopOpacity="0" />
      </radialGradient>

      <linearGradient id="k2_SmileLine" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#BE123C" stopOpacity="0.5" />
        <stop offset="25%" stopColor="#9F1239" stopOpacity="0.9" />
        <stop offset="50%" stopColor="#881337" />
        <stop offset="75%" stopColor="#9F1239" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#BE123C" stopOpacity="0.5" />
      </linearGradient>
    </>
  );
};

export const Krishna2Lips: React.FC<Krishna2FaceProps> = ({
  state = 'idle',
  isHappy,
  isThinking,
}) => {
  const happyState = isHappy ?? (state === 'happy' || state === 'clicked');
  const thinkingState = isThinking ?? (state === 'thinking');

  return (
    <g id="k2_smilingMouth" transform="translate(190, 197)">
      {/* 1. Soft Rosy Lip Ambient Glow on Skin */}
      <ellipse cx="0" cy="1.5" rx="13" ry="6.5" fill="url(#k2_LipGlow)" />

      {/* 2. Chin Indentation Soft Shadow below Lower Lip */}
      <ellipse cx="0" cy="7.5" rx="7" ry="2" fill="#254B8C" opacity="0.22" />

      {/* 3. Upper Lip Cupid's Bow Sculpt */}
      <path
        d="M -11 -1.0
           C -7.5 -2.4, -3.5 -2.8, 0 -1.6
           C 3.5 -2.8, 7.5 -2.4, 11 -1.0
           C 7.5 0.2, 3.5 0.6, 0 0.6
           C -3.5 0.6, -7.5 0.2, -11 -1.0 Z"
        fill="url(#k2_LipPlump)"
        opacity="0.9"
      />
      {/* Upper Lip Soft Specular Highlight */}
      <path
        d="M -10 -1.1 C -6.5 -2.3, -2.5 -2.5, 0 -1.6 C 2.5 -2.5, 6.5 -2.3, 10 -1.1"
        fill="none"
        stroke="#FFE4E8"
        strokeWidth="0.75"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* 4. Lower Lip Plump Cushion (Curved & Rounded) */}
      <path
        d="M -10.5 -0.2
           C -7 0.8, -4 1.2, 0 1.2
           C 4 1.2, 7 0.8, 10.5 -0.2
           C 8.5 5.0, 4.5 5.8, 0 5.8
           C -4.5 5.8, -8.5 5.0, -10.5 -0.2 Z"
        fill="url(#k2_LipPlump)"
      />
      {/* Lower Lip Center Specular Highlight Arc */}
      <ellipse cx="0" cy="2.8" rx="4.5" ry="1.8" fill="#FFFFFF" opacity="0.45" />
      <ellipse cx="0" cy="2.4" rx="2.4" ry="0.9" fill="#FFFFFF" opacity="0.7" />

      {/* 5. Smile Parting Line */}
      {happyState ? (
        /* Joyful Open/Beaming Smile */
        <g id="k2_happySmileOpen">
          <path
            d="M -11 -0.8 C -6 6.8, 6 6.8, 11 -0.8 C 7 1.8, -7 1.8, -11 -0.8 Z"
            fill="#4C0519"
          />
          <path
            d="M -6.5 0.2 C -2.5 1.6, 2.5 1.6, 6.5 0.2"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.95"
          />
          <ellipse cx="0" cy="3.8" rx="4.0" ry="2.0" fill="#FB7185" />
        </g>
      ) : thinkingState ? (
        /* Pensive / Curious Puckered Smile */
        <path
          d="M -8 0.2 C -3.5 1.4, 2.5 -0.4, 8 -1.0"
          fill="none"
          stroke="url(#k2_SmileLine)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ) : (
        /* Sweet Gentle Upturned Toddler Smile (Matching Reference) */
        <path
          d="M -11 -0.8 C -6 2.0, 6 2.0, 11 -0.8"
          fill="none"
          stroke="url(#k2_SmileLine)"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      )}

      {/* 6. Soft Corner Dimples */}
      <circle cx="-11" cy="-0.8" r="0.8" fill="#881337" opacity="0.65" />
      <circle cx="11" cy="-0.8" r="0.8" fill="#881337" opacity="0.65" />
    </g>
  );
};

export default Krishna2Lips;
