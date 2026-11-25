import React from 'react';

export interface Krishna2FaceProps {
  state?: string;
  isHappy?: boolean;
  isThinking?: boolean;
  isSpeaking?: boolean;
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
  isSpeaking = false,
}) => {
  const happyState = isHappy ?? (state === 'happy' || state === 'clicked' || state === 'motivation');
  const thinkingState = isThinking ?? (state === 'thinking');
  const speakingState = isSpeaking || state === 'speaking';

  return (
    <g id="k2_smilingMouth" transform="translate(190, 203)">
      {/* 1. Soft Rosy Lip Ambient Glow on Skin */}
      <ellipse cx="0" cy="1.5" rx="14" ry="7" fill="url(#k2_LipGlow)" opacity="0.85" />

      {/* 2. Chin Indentation Soft Shadow below Lower Lip */}
      <ellipse cx="0" cy="8.5" rx="8" ry="2.2" fill="#2552A8" opacity="0.22" />

      {/* 3. Upper Lip Cupid's Bow Sculpt */}
      <path
        d="M -11.5 -0.8
           C -8.0 -2.4, -3.5 -2.8, 0 -1.5
           C 3.5 -2.8, 8.0 -2.4, 11.5 -0.8
           C 8.0 0.4, 3.5 0.8, 0 0.8
           C -3.5 0.8, -8.0 0.4, -11.5 -0.8 Z"
        fill="url(#k2_LipPlump)"
        opacity="0.92"
      />
      {/* Upper Lip Soft Specular Highlight */}
      <path
        d="M -10 -1.0 C -6.5 -2.3, -2.5 -2.5, 0 -1.5 C 2.5 -2.5, 6.5 -2.3, 10 -1.0"
        fill="none"
        stroke="#FFE4E8"
        strokeWidth="0.75"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* 4. Lower Lip Plump Cushion (Curved & Rounded) */}
      <path
        d="M -11.0 0.0
           C -7.2 1.0, -4.0 1.4, 0 1.4
           C 4.0 1.4, 7.2 1.0, 11.0 0.0
           C 9.0 5.4, 4.8 6.2, 0 6.2
           C -4.8 6.2, -9.0 5.4, -11.0 0.0 Z"
        fill="url(#k2_LipPlump)"
      />
      {/* Lower Lip Center Specular Highlight Arc */}
      <ellipse cx="0" cy="3.1" rx="4.6" ry="1.8" fill="#FFFFFF" opacity="0.45" />
      <ellipse cx="0" cy="2.7" rx="2.4" ry="0.9" fill="#FFFFFF" opacity="0.72" />

      {/* 5. Smile Parting Line / Expression */}
      {speakingState ? (
        /* Animated Speaking Mouth */
        <g id="k2_speakingSmile">
          <path
            d="M -10.5 -0.4 C -5.5 6.8, 5.5 6.8, 10.5 -0.4 C 6.5 1.4, -6.5 1.4, -10.5 -0.4 Z"
            fill="#4C0519"
          >
            <animate
              attributeName="d"
              values="M -10.5 -0.4 C -5.5 3.2, 5.5 3.2, 10.5 -0.4 C 6.5 1.2, -6.5 1.2, -10.5 -0.4 Z;
                      M -10.5 -0.4 C -5.5 7.4, 5.5 7.4, 10.5 -0.4 C 6.5 1.4, -6.5 1.4, -10.5 -0.4 Z;
                      M -10.5 -0.4 C -5.5 4.4, 5.5 4.4, 10.5 -0.4 C 6.5 1.2, -6.5 1.2, -10.5 -0.4 Z;
                      M -10.5 -0.4 C -5.5 7.0, 5.5 7.0, 10.5 -0.4 C 6.5 1.4, -6.5 1.4, -10.5 -0.4 Z"
              dur="0.48s"
              repeatCount="indefinite"
            />
          </path>
          <path
            d="M -6.0 0.3 C -2.0 1.4, 2.0 1.4, 6.0 0.3"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.3"
            strokeLinecap="round"
            opacity="0.9"
          />
          <ellipse cx="0" cy="3.6" rx="3.8" ry="1.6" fill="#FB7185" opacity="0.85" />
        </g>
      ) : happyState ? (
        /* Joyful Open/Beaming Smile */
        <g id="k2_happySmileOpen">
          <path
            d="M -11.5 -0.6 C -6 7.0, 6 7.0, 11.5 -0.6 C 7 1.8, -7 1.8, -11.5 -0.6 Z"
            fill="#4C0519"
          />
          <path
            d="M -6.5 0.3 C -2.5 1.6, 2.5 1.6, 6.5 0.3"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.95"
          />
          <ellipse cx="0" cy="4.0" rx="4.0" ry="1.9" fill="#FB7185" />
        </g>
      ) : thinkingState ? (
        /* Pensive / Curious Puckered Smile */
        <path
          d="M -8.5 0.4 C -3.5 1.6, 2.5 -0.4, 8.5 -1.0"
          fill="none"
          stroke="url(#k2_SmileLine)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ) : (
        /* Sweet Gentle Upturned Toddler Smile */
        <path
          d="M -11.5 -0.8 C -6 2.5, 6 2.5, 11.5 -0.8"
          fill="none"
          stroke="url(#k2_SmileLine)"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      )}

      {/* 6. Soft Corner Dimples */}
      <circle cx="-11.5" cy="-0.8" r="0.85" fill="#881337" opacity="0.55" />
      <circle cx="11.5" cy="-0.8" r="0.85" fill="#881337" opacity="0.55" />
    </g>
  );
};

export default Krishna2Lips;
