'use client';

import React from 'react';
import styles from './krishna.module.css';
import krishnaHairImg from './krishna_hair.png';
import {
  HEAD_SCALE,
  HEAD_SCALE_PIVOT_Y,
  HEAD_Y_OFFSET,
  CENTER_X,
  JAW_SCALE_X,
  HEAD,
  FACE,
  EARS,
  HAIR,
} from './characterAnchors';
import { KrishnaEyes } from './krishna_eyes';
import type { KrishnaState } from './KrishnaSprite';

/**
 * ════════════════════════════════════════════════════════════════════════════
 * KRISHNA HEAD — Layered Animation-Ready Head/Face Component
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Renders the complete head composition as a layered puppet:
 *
 *   BACKGROUND NECK HAIR  (static with head)
 *   HEAD BASE              (static: face silhouette, cheeks, chin, forehead)
 *   NOSE                   (static, separate <g> for future animation)
 *   LEFT EYE               (animatable: blink, gaze)
 *   RIGHT EYE              (animatable: blink, gaze)
 *   LEFT EYEBROW           (animatable: raise, furrow)
 *   RIGHT EYEBROW          (animatable: raise, furrow)
 *   TILAK                  (static)
 *   MOUTH/LIPS             (animatable: speak, smile)
 *   HAIR OVERLAY           (animatable: sway)
 *   HAIR GAP FILL          (static with head)
 *   EARS + EARRINGS        (static with head)
 *
 * Transform hierarchy:
 *   Outer scale group: translate(CENTER_X, PIVOT_Y) scale(HEAD_SCALE) translate(-CENTER_X, -PIVOT_Y)
 *   Inner offset group (#headGroup): translate(0, HEAD_Y_OFFSET)
 *   All coordinates below are in HEAD-LOCAL space.
 *
 * ════════════════════════════════════════════════════════════════════════════
 */

interface KrishnaHeadProps {
  isBlinking: boolean;
  isSpeaking: boolean;
  activeState: KrishnaState;
}

export const KrishnaHead: React.FC<KrishnaHeadProps> = ({
  isBlinking,
  isSpeaking,
  activeState,
}) => {
  const isSpeakingActive =
    isSpeaking || activeState === 'speaking' || activeState === 'greeting';

  return (
    <g
      id="krishna-head-scale-wrapper"
      transform={`translate(${CENTER_X},${HEAD_SCALE_PIVOT_Y}) scale(${HEAD_SCALE}) translate(${-CENTER_X},${-HEAD_SCALE_PIVOT_Y})`}
    >
      <g
        id="headGroup"
        transform={`translate(0, ${HEAD_Y_OFFSET})`}
        style={{ transformOrigin: `${HEAD.transformOrigin.x}px ${HEAD.transformOrigin.y}px` }}
      >
        {/* ════════════════ BACKGROUND NECK HAIR (BEHIND HEAD) ════════════════ */}
        <g id="backgroundNeckHair" style={{ pointerEvents: 'none' }}>
          {/* Full Volumetric Background Hair Backing Mass */}
          <path
            d="M 120 70
               C 80 85, 58 115, 62 145
               C 66 175, 82 205, 96 228
               C 106 242, 125 240, 142 225
               C 160 210, 175 205, 190 205
               C 205 205, 220 210, 238 225
               C 255 240, 274 242, 284 228
               C 298 205, 314 175, 318 145
               C 322 115, 300 85, 260 70
               Z"
            fill="url(#kBackgroundNeckHairGrad)"
          />

          {/* Soft Wavy Strand Overlays for Natural Hair Texture */}
          <g fill="none" stroke="#22377C" strokeWidth="2.4" strokeLinecap="round" opacity="0.6">
            <path d="M 105 110 C 82 135, 75 165, 85 195 C 92 215, 105 228, 120 232" />
            <path d="M 125 130 C 102 155, 98 185, 108 210 C 115 224, 130 230, 145 222" />
            <path d="M 275 110 C 298 135, 305 165, 295 195 C 288 215, 275 228, 260 232" />
            <path d="M 255 130 C 278 155, 282 185, 272 210 C 265 224, 250 230, 235 222" />
          </g>

          {/* Subtle Sheen Specular Lines */}
          <path
            d="M 72 138 C 76 168, 90 198, 102 220"
            fill="none" stroke="#0B94B4" strokeWidth="1.8" strokeLinecap="round" opacity="0.45"
          />
          <path
            d="M 308 138 C 304 168, 290 198, 278 220"
            fill="none" stroke="#0B94B4" strokeWidth="1.8" strokeLinecap="round" opacity="0.45"
          />
        </g>

        {/* ════════════════ HEAD BASE (STATIC FACE FOUNDATION) ════════════════ */}
        <g id="headBase">
          {/* Jaw narrowing transform */}
          <g transform={`translate(${CENTER_X}, 155) scale(${JAW_SCALE_X}, 1) translate(${-CENTER_X}, -155)`}>
            {/* 3D Sculpted Head Base Silhouette */}
            <path
              d="M 190 48
               C 230 48, 258 70, 264 105
               C 268 126, 268 152, 262 170
               C 254 188, 235 204, 210 212
               C 200 215, 195 216, 190 216
               C 185 216, 180 215, 170 212
               C 145 204, 126 188, 118 170
               C 112 152, 112 126, 116 105
               C 122 70, 150 48, 190 48 Z"
              fill="url(#kSkinFace)"
            />

            {/* Soft Lower Face & Jawline Depth Shading */}
            <path
              d="M 190 48
               C 230 48, 258 70, 264 105
               C 268 126, 268 152, 262 170
               C 254 188, 235 204, 210 212
               C 200 215, 195 216, 190 216
               C 185 216, 180 215, 170 212
               C 145 204, 126 188, 118 170
               C 112 152, 112 126, 116 105
               C 122 70, 150 48, 190 48 Z"
              fill="url(#kJawlineShadow)"
            />

            {/* Volumetric Chubby Cheeks */}
            <ellipse cx="149" cy="162" rx="17" ry="15" fill="url(#kCheekVolumeLeft)" opacity="0.62" />
            <ellipse cx="231" cy="162" rx="17" ry="15" fill="url(#kCheekVolumeRight)" opacity="0.52" />

            {/* 3D Forehead Dome Volume Highlight */}
            <ellipse cx="190" cy="110" rx="30" ry="15" fill="url(#kForeheadGlow)" />

            {/* Soft Rounded Toddler Chin Volume */}
            <ellipse cx="190" cy="201" rx="11" ry="5.0" fill="url(#kChinVolume)" />
            {/* Soft Labiomental Indentation */}
            <path d="M 185 192 Q 190 193.5 195 192" fill="none" stroke="#255BB5" strokeWidth="0.8" opacity="0.22" strokeLinecap="round" />

            {/* Subtle Rosy Toddler Blush on Cheek Apples */}
            <ellipse cx={FACE.leftCheek.x} cy={FACE.leftCheek.y} rx="15" ry="10" fill="url(#kCheekBlush)" transform={`rotate(-4 ${FACE.leftCheek.x} ${FACE.leftCheek.y})`} />
            <ellipse cx={FACE.rightCheek.x} cy={FACE.rightCheek.y} rx="15" ry="10" fill="url(#kCheekBlush)" transform={`rotate(4 ${FACE.rightCheek.x} ${FACE.rightCheek.y})`} />
          </g>
        </g>

        {/* ════════════════ FACE DETAILS — Independent Animatable Layers ════════════════ */}
        <g id="faceDetails">

          {/* ── TILAK (Static) ── */}
          <g id="tilak">
            <path
              d="M 184 90 L 184 123 C 184 131, 196 131, 196 123 L 196 90"
              fill="none" stroke="#FFFFFF" strokeWidth="3.8" strokeLinecap="round"
            />
            <path
              d="M 186 92 L 186 122 C 186 127, 194 127, 194 122 L 194 92"
              fill="none" stroke="#FEF9C3" strokeWidth="1.2" opacity="0.8"
            />
            {/* Central Red Kumkum Teardrop Bindu */}
            <path
              d="M 190 112 C 187 117, 186 121, 186 124 C 186 128, 194 128, 194 124 C 194 121, 193 117, 190 112 Z"
              fill="#DC2626" stroke="#991B1B" strokeWidth="0.5"
            />
            <circle cx="189.2" cy="123" r="1.0" fill="#FFA8A8" opacity="0.85" />
            {/* Bridge of Nose Dot */}
            <circle cx="190" cy="131" r="1.4" fill="#DC2626" />
          </g>

          {/* ── LEFT EYEBROW (Animatable) ── */}
          <g id="eyebrowLeft" className={styles.eyebrowLeft}>
            {/* White Decoration Dots Above Eyebrow */}
            <g id="eyebrowDotsLeft" fill="#FFFFFF" opacity="0.95">
              <circle cx="140" cy="111" r="1.1" />
              <circle cx="148" cy="107.5" r="1.2" />
              <circle cx="157" cy="105.5" r="1.3" />
              <circle cx="166" cy="105.5" r="1.3" />
              <circle cx="174" cy="107.5" r="1.2" />
              <circle cx="180" cy="111" r="1.1" />
            </g>

            {/* Left Eyebrow Arch */}
            <path d="M 138 116 C 148 110, 168 110, 181 115" fill="none" stroke="#0F172A" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M 170 111 C 175 112.5, 179 114, 181 115" fill="none" stroke="#0F172A" strokeWidth="3.0" strokeLinecap="round" opacity="0.5" />
          </g>

          {/* ── RIGHT EYEBROW (Animatable) ── */}
          <g id="eyebrowRight" className={styles.eyebrowRight}>
            <g id="eyebrowDotsRight" fill="#FFFFFF" opacity="0.95">
              <circle cx="200" cy="111" r="1.1" />
              <circle cx="206" cy="107.5" r="1.2" />
              <circle cx="214" cy="105.5" r="1.3" />
              <circle cx="223" cy="105.5" r="1.3" />
              <circle cx="232" cy="107.5" r="1.2" />
              <circle cx="240" cy="111" r="1.1" />
            </g>

            <path d="M 199 115 C 212 110, 232 110, 242 116" fill="none" stroke="#0F172A" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M 199 115 C 201 114, 205 111.5, 210 110.5" fill="none" stroke="#0F172A" strokeWidth="3.0" strokeLinecap="round" opacity="0.5" />
          </g>

          {/* ── EYES (Animatable: blink, gaze) ── */}
          <KrishnaEyes isBlinking={isBlinking} />


          {/* ── NOSE (Static, separate group for future animation) ── */}
          <g id="noseGroup" transform={`translate(${FACE.nose.x}, ${FACE.nose.y})`}>
            {/* Soft Nose Bridge */}
            <path d="M -0.5 -10 C -1.4 -5, -1.4 -1, 0 1" fill="none" stroke="#E2F0FF" strokeWidth="1.6" strokeLinecap="round" opacity="0.45" />
            {/* Underside Shadow */}
            <ellipse cx="0" cy="3.8" rx="4.4" ry="1.3" fill="#1E3A8A" opacity="0.15" />
            {/* 3D Nose Bulb */}
            <ellipse cx="0" cy="1.0" rx="5.4" ry="4.2" fill="url(#kNoseVolume)" />
            {/* Nose Tip Highlight */}
            <ellipse cx="0" cy="0.6" rx="3.2" ry="2.4" fill="url(#kForeheadGlow)" opacity="0.6" />
            {/* Nostril Shading */}
            <circle cx="-2.6" cy="2.8" r="1.0" fill="#152B68" opacity="0.2" />
            <circle cx="2.6" cy="2.8" r="1.0" fill="#152B68" opacity="0.2" />
            {/* Specular Tip */}
            <ellipse cx="-0.8" cy="0.2" rx="1.7" ry="1.2" fill="#FFFFFF" opacity="0.8" />
          </g>

          {/* ── MOUTH/LIPS (Animatable: speak, smile) ── */}
          <g transform={`translate(${FACE.mouth.x}, ${FACE.mouth.y})`}>
            <g
              id="lipsGroup"
              className={`${styles.pixarMouth} ${isSpeakingActive ? styles.mouthSpeaking : ''}`}
            >
              <foreignObject x="-22" y="-12" width="44" height="24">
                <div className={`${styles.mouthContainer} ${isSpeakingActive ? styles.mouthSpeaking : ''}`}>
                  <div className={styles.mouthSkinHighlight} />
                  <div className={styles.mouthGroup}>
                    <div className={styles.mouthSeam} />
                    <div className={styles.speakingCavity}>
                      <div className={styles.teethBar} />
                      <div className={styles.tongue} />
                    </div>
                  </div>
                  <div className={styles.mouthShadow} />
                </div>
              </foreignObject>
            </g>
          </g>
        </g>

        {/* ════════════════ HAIR OVERLAY (PNG — Animatable: sway) ════════════════ */}
        <image
          id="krishnaHairOverlay"
          href={krishnaHairImg.src || '/characters/krishna_hair.png'}
          x={HAIR.overlay.x}
          y={HAIR.overlay.y}
          width={HAIR.overlay.width}
          height={HAIR.overlay.height}
          preserveAspectRatio="xMidYMid meet"
          style={{ pointerEvents: 'none' }}
        />

        {/* ════════════════ HAIR GAP FILL (SVG behind ears/neck) ════════════════ */}
        <g id="krishnaHairGapFill" style={{ pointerEvents: 'none' }}>
          {/* Left Side Behind Ear */}
          <g id="hairGapLeft">
            <path
              d="M 104 142
                 C 84 150, 78 162, 82 176
                 C 86 192, 98 204, 92 220
                 C 89 228, 98 226, 102 218
                 C 106 206, 114 190, 110 170
                 C 107 156, 106 148, 108 144
                 Z"
              fill="url(#kBehindEarL)"
            />
            <path
              d="M 102 144
                 C 85 152, 80 166, 85 180
                 C 89 194, 96 208, 93 220"
              fill="none" stroke="url(#kHairHighlightSheen)" strokeWidth="2.2" strokeLinecap="round" opacity="0.85"
            />
          </g>

          {/* Right Side Behind Ear */}
          <g id="hairGapRight">
            <path
              d="M 276 142
                 C 296 150, 302 162, 298 176
                 C 294 192, 282 204, 288 220
                 C 291 228, 282 226, 278 218
                 C 274 206, 266 190, 270 170
                 C 273 156, 274 148, 272 144
                 Z"
              fill="url(#kBehindEarR)"
            />
            <path
              d="M 278 144
                 C 295 152, 300 166, 295 180
                 C 291 194, 284 208, 287 220"
              fill="none" stroke="url(#kHairHighlightSheen)" strokeWidth="2.2" strokeLinecap="round" opacity="0.85"
            />
          </g>
        </g>

        {/* ════════════════ EARS & GOLD BALI ORNAMENTS ════════════════ */}
        <g id="krishnaEars">
          {/* Left Ear */}
          <g id="earLeft" transform={`translate(${EARS.left.x}, ${EARS.left.y}) scale(${EARS.left.scale})`}>
            <ellipse cx="-1" cy="0" rx="8" ry="11" fill="#091024" opacity="0.25" />
            <path d="M 4 -6 C 2 -11, -2 -12, -6 -11 C -11 -10, -12 -3, -11 3 C -10 8, -5 12, -1 12 C 3 12, 4 9, 4 6 Z" fill="url(#kEarBaseLeft)" />
            <ellipse cx="3.5" cy="1" rx="2" ry="6" fill="#1E3A8A" opacity="0.2" />
            <path d="M 0 -9.5 C -4 -10, -9 -6, -9 -1" fill="none" stroke="#EBF5FF" strokeWidth="1.6" strokeLinecap="round" opacity="0.35" />
            <path d="M 1.5 -4 C -3 -5, -6 -1, -5 3 C -4 6, -1 6, 1 4 C -0.5 2, -0.5 -1, 1.5 -4 Z" fill="url(#kEarInnerShadow)" opacity="0.8" />
            <ellipse cx="-2" cy="8.5" rx="3.5" ry="3.5" fill="url(#kChinVolume)" opacity="0.4" />
            <ellipse cx="-2.5" cy="9" rx="3" ry="3" fill="url(#kLotusToeBlush)" opacity="0.25" />

            {/* Golden Bali Earring */}
            <g transform="translate(-2, 11)">
              <circle cx="0" cy="0" r="2.2" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.5" />
              <circle cx="0" cy="0" r="1.1" fill="#DC2626" />
              <circle cx="-0.4" cy="-0.4" r="0.4" fill="#FFFFFF" opacity="0.9" />
              <circle cx="-1.5" cy="8.5" r="7.5" fill="none" stroke="url(#kGoldGrad)" strokeWidth="3.2" strokeLinecap="round" />
              <circle cx="-2.5" cy="7.5" r="5.8" fill="none" stroke="#FFFFFF" strokeWidth="1.0" opacity="0.85" strokeLinecap="round" />
              <circle cx="-0.5" cy="9.5" r="6.8" fill="none" stroke="#78350F" strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
              <circle cx="-1.5" cy="17.5" r="2.2" fill="url(#kRubyBead)" stroke="#991B1B" strokeWidth="0.4" />
              <circle cx="-2.0" cy="17.0" r="0.6" fill="#FFFFFF" opacity="0.9" />
            </g>
          </g>

          {/* Right Ear */}
          <g id="earRight" transform={`translate(${EARS.right.x}, ${EARS.right.y}) scale(${EARS.right.scale})`}>
            <ellipse cx="1" cy="0" rx="8" ry="11" fill="#091024" opacity="0.25" />
            <path d="M -4 -6 C -2 -11, 2 -12, 6 -11 C 11 -10, 12 -3, 11 3 C 10 8, 5 12, 1 12 C -3 12, -4 9, -4 6 Z" fill="url(#kEarBaseRight)" />
            <ellipse cx="-3.5" cy="1" rx="2" ry="6" fill="#1E3A8A" opacity="0.2" />
            <path d="M 0 -9.5 C 4 -10, 9 -6, 9 -1" fill="none" stroke="#EBF5FF" strokeWidth="1.6" strokeLinecap="round" opacity="0.35" />
            <path d="M -1.5 -4 C 3 -5, 6 -1, 5 3 C 4 6, 1 6, -1 4 C 0.5 2, 0.5 -1, -1.5 -4 Z" fill="url(#kEarInnerShadow)" opacity="0.8" />
            <ellipse cx="2" cy="8.5" rx="3.5" ry="3.5" fill="url(#kChinVolume)" opacity="0.4" />
            <ellipse cx="2.5" cy="9" rx="3" ry="3" fill="url(#kLotusToeBlush)" opacity="0.25" />

            {/* Golden Bali Earring */}
            <g transform="translate(2, 11)">
              <circle cx="0" cy="0" r="2.2" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.5" />
              <circle cx="0" cy="0" r="1.1" fill="#DC2626" />
              <circle cx="-0.4" cy="-0.4" r="0.4" fill="#FFFFFF" opacity="0.9" />
              <circle cx="1.5" cy="8.5" r="7.5" fill="none" stroke="url(#kGoldGrad)" strokeWidth="3.2" strokeLinecap="round" />
              <circle cx="2.5" cy="7.5" r="5.8" fill="none" stroke="#FFFFFF" strokeWidth="1.0" opacity="0.85" strokeLinecap="round" />
              <circle cx="0.5" cy="9.5" r="6.8" fill="none" stroke="#78350F" strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
              <circle cx="1.5" cy="17.5" r="2.2" fill="url(#kRubyBead)" stroke="#991B1B" strokeWidth="0.4" />
              <circle cx="1.0" cy="17.0" r="0.6" fill="#FFFFFF" opacity="0.9" />
            </g>
          </g>
        </g>
      </g>
    </g>
  );
};

export default KrishnaHead;
