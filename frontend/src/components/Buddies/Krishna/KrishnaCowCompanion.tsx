'use client';

import React, { useState, useEffect } from 'react';
import styles from './krishnaCowCompanion.module.css';

export type CowPhase = 'hidden' | 'entering' | 'standing' | 'sitting' | 'leaving';

export default function KrishnaCowCompanion() {
  const [cowPhase, setCowPhase] = useState<CowPhase>('hidden');
  const [showSpeech, setShowSpeech] = useState(false);

  useEffect(() => {
    let phaseTimer: NodeJS.Timeout;
    let cycleTimer: NodeJS.Timeout;

    const startCowCycle = () => {
      // 1. Walk in from background
      setCowPhase('entering');

      // 2. Stand beside Krishna (3s after walk-in)
      phaseTimer = setTimeout(() => {
        setCowPhase('standing');

        // 3. Sit down beside Krishna (10s after standing)
        phaseTimer = setTimeout(() => {
          setCowPhase('sitting');

          // 4. Stay sitting for 2.5 minutes (150 seconds)
          phaseTimer = setTimeout(() => {
            setCowPhase('leaving');

            // 5. Walk back into background & disappear (3s walk-out)
            phaseTimer = setTimeout(() => {
              setCowPhase('hidden');

              // 6. Next cycle in 5 minutes (300,000 ms)
              cycleTimer = setTimeout(startCowCycle, 300000);
            }, 3000);
          }, 150000);
        }, 10000);
      }, 3000);
    };

    // Initial spawn delay: 4 seconds after mount
    cycleTimer = setTimeout(startCowCycle, 4000);

    return () => {
      clearTimeout(phaseTimer);
      clearTimeout(cycleTimer);
    };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSpeech(true);
    setTimeout(() => setShowSpeech(false), 3000);
  };

  if (cowPhase === 'hidden') return null;

  return (
    <div
      className={`${styles.cowContainer} ${styles['cow_' + cowPhase]}`}
      onClick={handleClick}
      title="Cute Surabhi Cow 🐮 — Loves sitting by Little Krishna!"
    >
      {showSpeech && (
        <div className={styles.cowBubble}>
          <span>Moo~ 🐮✨</span>
        </div>
      )}

      <svg viewBox="0 0 160 140" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <radialGradient id="cowBodyGrad" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor="#F3F4F6" />
            <stop offset="100%" stopColor="#D1D5DB" />
          </radialGradient>
          <radialGradient id="cowSpotGrad" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#4B5563" />
            <stop offset="80%" stopColor="#1F2937" />
            <stop offset="100%" stopColor="#111827" />
          </radialGradient>
          <linearGradient id="cowHornGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE07D" />
            <stop offset="100%" stopColor="#D49312" />
          </linearGradient>
          <radialGradient id="cowNoseGrad" cx="40%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#FECDD3" />
            <stop offset="70%" stopColor="#FB7185" />
            <stop offset="100%" stopColor="#E11D48" />
          </radialGradient>
          <linearGradient id="cowBellGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#CA8A04" />
          </linearGradient>
        </defs>

        {/* Body */}
        <ellipse cx="85" cy="78" rx="52" ry="36" fill="url(#cowBodyGrad)" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.25))" />
        {/* Cute Spots */}
        <ellipse cx="68" cy="65" rx="16" ry="12" fill="url(#cowSpotGrad)" opacity="0.85" transform="rotate(-15 68 65)" />
        <ellipse cx="112" cy="76" rx="14" ry="16" fill="url(#cowSpotGrad)" opacity="0.85" transform="rotate(20 112 76)" />
        <ellipse cx="90" cy="94" rx="10" ry="8" fill="url(#cowSpotGrad)" opacity="0.8" />

        {/* Tail — white stem with black tuft at the end */}
        <g id="cowTail" className={styles.cowTailAnim}>
          {/* soft outline for white tail against background */}
          <path
            d="M 133 68 C 146 65, 156 78, 151 96 C 148 104, 144 110, 140 116"
            fill="none"
            stroke="#D1D5DB"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          {/* main white tail stem */}
          <path
            d="M 133 68 C 146 65, 156 78, 151 96 C 148 104, 144 110, 140 116"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Fluffy black tail tuft / tip at the end */}
          <ellipse cx="140" cy="118" rx="5" ry="8" fill="#111827" transform="rotate(-15 140 118)" />
          <ellipse cx="139" cy="119" rx="2.5" ry="4.5" fill="#374151" opacity="0.7" />
        </g>

        {/* Legs (Standing vs Sitting) */}
        {cowPhase !== 'sitting' ? (
          <g id="standingLegs">
            <rect x="48" y="98" width="12" height="32" rx="6" fill="url(#cowBodyGrad)" />
            <rect x="48" y="122" width="12" height="8" rx="2" fill="#374151" />
            <rect x="68" y="100" width="12" height="30" rx="6" fill="url(#cowBodyGrad)" />
            <rect x="68" y="122" width="12" height="8" rx="2" fill="#374151" />
            <rect x="98" y="100" width="12" height="30" rx="6" fill="url(#cowBodyGrad)" />
            <rect x="98" y="122" width="12" height="8" rx="2" fill="#374151" />
            <rect x="116" y="98" width="12" height="32" rx="6" fill="url(#cowBodyGrad)" />
            <rect x="116" y="122" width="12" height="8" rx="2" fill="#374151" />
          </g>
        ) : (
          <g id="sittingLegs">
            <ellipse cx="56" cy="104" rx="18" ry="9" fill="url(#cowBodyGrad)" />
            <ellipse cx="42" cy="108" rx="7" ry="5" fill="#374151" />
            <ellipse cx="112" cy="104" rx="18" ry="9" fill="url(#cowBodyGrad)" />
            <ellipse cx="126" cy="108" rx="7" ry="5" fill="#374151" />
          </g>
        )}

        {/* Neck & Bell */}
        <path d="M 40 70 Q 28 55 35 42 Q 52 48 56 68 Z" fill="url(#cowBodyGrad)" />
        <path d="M 32 58 Q 44 65 52 56" fill="none" stroke="#CA8A04" strokeWidth="4" />
        <g transform="translate(42, 62)">
          <path d="M -5 0 L 5 0 L 7 8 L -7 8 Z" fill="url(#cowBellGrad)" />
          <circle cx="0" cy="10" r="2.5" fill="#FEF08A" />
        </g>

        {/* Head Group */}
        <g id="cowHead" transform="translate(32, 38)" className={cowPhase === 'sitting' ? styles.cowChewAnim : ''}>
          {/* Horns */}
          <path d="M -6 -12 C -12 -26, -22 -22, -18 -10" fill="url(#cowHornGrad)" stroke="#B57A09" strokeWidth="1" />
          <path d="M 12 -12 C 18 -26, 28 -22, 24 -10" fill="url(#cowHornGrad)" stroke="#B57A09" strokeWidth="1" />

          {/* Ears */}
          <ellipse cx="-18" cy="-2" rx="12" ry="6" fill="url(#cowBodyGrad)" transform="rotate(-20 -18 -2)" className={styles.cowEarAnim} />
          <ellipse cx="-18" cy="-2" rx="8" ry="3.5" fill="#FECDD3" transform="rotate(-20 -18 -2)" />
          <ellipse cx="24" cy="-2" rx="12" ry="6" fill="url(#cowBodyGrad)" transform="rotate(20 24 -2)" className={styles.cowEarAnim} />
          <ellipse cx="24" cy="-2" rx="8" ry="3.5" fill="#FECDD3" transform="rotate(20 24 -2)" />

          {/* Head Base */}
          <ellipse cx="3" cy="-4" rx="20" ry="18" fill="url(#cowBodyGrad)" />
          {/* Head Spot */}
          <ellipse cx="-4" cy="-10" rx="9" ry="8" fill="url(#cowSpotGrad)" opacity="0.8" />

          {/* Eyes */}
          <ellipse cx="-6" cy="-6" rx="3.5" ry="4.5" fill="#1F2937" />
          <circle cx="-7.5" cy="-8" r="1.5" fill="#FFFFFF" />
          <ellipse cx="12" cy="-6" rx="3.5" ry="4.5" fill="#1F2937" />
          <circle cx="10.5" cy="-8" r="1.5" fill="#FFFFFF" />

          {/* Pink Muzzle / Nose */}
          <ellipse cx="3" cy="8" rx="16" ry="11" fill="url(#cowNoseGrad)" />
          <ellipse cx="-3" cy="6" rx="2.5" ry="3" fill="#9F1239" opacity="0.6" />
          <ellipse cx="9" cy="6" rx="2.5" ry="3" fill="#9F1239" opacity="0.6" />
          {/* Gentle smile */}
          <path d="M -2 12 Q 3 16 8 12" fill="none" stroke="#881337" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}
