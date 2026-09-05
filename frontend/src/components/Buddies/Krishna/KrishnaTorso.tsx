'use client';

import React from 'react';
import { CENTER_X, TORSO, NECK } from './characterAnchors';

/**
 * ════════════════════════════════════════════════════════════════════════════
 * KRISHNA TORSO — Layered Animation-Ready Torso/Neck Component
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Renders the unified neck → trapezius → torso → belly skin surface.
 * This is a STATIC body part (no independent animation), but is separated
 * for clean layering and to serve as the anchor for arm attachment.
 *
 * Uses gradients: kSkinNeck, kNeckOcclusionShadow, kSkinBody
 *
 * ════════════════════════════════════════════════════════════════════════════
 */

export const KrishnaTorso: React.FC = () => {
  const cx = CENTER_X;

  return (
    <g id="torso">
      {/* ── Unified Neck → Trapezius → Torso → Belly ── */}
      <path
        id="torsoMainPath"
        d={`
          M ${cx - 29} 158
          C ${cx - 35} 160, ${cx - 45} 172, ${cx - 60} 184
          C ${cx - 66} 188, ${cx - 70} 192, ${cx - 70} 198
          C ${cx - 70} 204, ${cx - 68} 210, ${cx - 63} 222
          C ${cx - 58} 236, ${cx - 52} 252, ${cx - 46} 268
          C ${cx - 40} 280, ${cx - 22} 286, ${cx} 286
          C ${cx + 22} 286, ${cx + 40} 280, ${cx + 46} 268
          C ${cx + 52} 252, ${cx + 58} 236, ${cx + 63} 222
          C ${cx + 68} 210, ${cx + 70} 204, ${cx + 70} 198
          C ${cx + 70} 192, ${cx + 66} 188, ${cx + 60} 184
          C ${cx + 45} 172, ${cx + 35} 160, ${cx + 29} 158
          Z`}
        fill="url(#kSkinBody)"
      />

      {/* ── Neck Cylinder Skin ── */}
      <path
        d={`
          M ${cx - 29} 158
          C ${cx - 32} 162, ${cx - 34} 175, ${cx - 32} 185
          L ${cx + 32} 185
          C ${cx + 34} 175, ${cx + 32} 162, ${cx + 29} 158
          Z`}
        fill="url(#kSkinNeck)"
      />

      {/* ── Neck Highlights & Shadows ── */}
      {/* Central neck highlight */}
      <path
        d={`M ${cx - 5} 160 C ${cx - 4} 170, ${cx + 4} 175, ${cx + 5} 183`}
        fill="none" stroke="#A9CCFF" strokeWidth="4.5" strokeLinecap="round" opacity="0.35"
      />
      {/* Left side shadow */}
      <path
        d={`M ${cx - 26} 160 C ${cx - 29} 168, ${cx - 30} 176, ${cx - 28} 184`}
        fill="none" stroke="#315EA8" strokeWidth="2.5" strokeLinecap="round" opacity="0.22"
      />
      {/* Right side shadow */}
      <path
        d={`M ${cx + 26} 160 C ${cx + 29} 168, ${cx + 30} 176, ${cx + 28} 184`}
        fill="none" stroke="#315EA8" strokeWidth="2.5" strokeLinecap="round" opacity="0.22"
      />

      {/* ── Clavicle Transition (below neck into shoulders) ── */}
      <path
        d={`M ${cx - 55} 192 C ${cx - 38} 187, ${cx + 38} 187, ${cx + 55} 192`}
        fill="none" stroke="#315EA8" strokeWidth="1.5" strokeLinecap="round" opacity="0.18"
      />
      {/* Clavicle notch */}
      <ellipse
        cx={cx} cy={189} rx={4} ry={2.5}
        fill="#315EA8" opacity="0.18"
      />

      {/* ── Chest Center Highlight ── */}
      <ellipse
        cx={cx} cy={222} rx={18} ry={16}
        fill="url(#kSkinBody)" opacity="0.3"
      />
      {/* Key light reflection on chest */}
      <ellipse
        cx={cx - 8} cy={216} rx={12} ry={8}
        fill="#A9CCFF" opacity="0.2"
      />

      {/* ── Nipples (tiny details for anatomy completeness) ── */}
      <circle cx={TORSO.leftNipple.x} cy={TORSO.leftNipple.y} r="2.0" fill="#5B9AFA" opacity="0.18" />
      <circle cx={TORSO.rightNipple.x} cy={TORSO.rightNipple.y} r="2.0" fill="#5B9AFA" opacity="0.18" />

      {/* ── Toddler Belly Volume ── */}
      {/* Soft rounded belly form */}
      <ellipse
        cx={cx} cy={256} rx={32} ry={24}
        fill="url(#kSkinBody)" opacity="0.18"
      />
      {/* Belly highlight */}
      <ellipse
        cx={cx - 4} cy={250} rx={16} ry={12}
        fill="#A9CCFF" opacity="0.15"
      />
      {/* Belly button */}
      <circle cx={TORSO.navel.x} cy={TORSO.navel.y} r="2.2" fill="#315EA8" opacity="0.2" />
      <circle cx={TORSO.navel.x - 0.5} cy={TORSO.navel.y - 0.5} r="1.0" fill="#A9CCFF" opacity="0.3" />

      {/* ── Underside Torso Shadow (depth from waist to chest) ── */}
      <path
        d={`M ${cx - 40} 272 C ${cx - 20} 280, ${cx + 20} 280, ${cx + 40} 272`}
        fill="none" stroke="#315EA8" strokeWidth="2.0" strokeLinecap="round" opacity="0.15"
      />
    </g>
  );
};

export default KrishnaTorso;
