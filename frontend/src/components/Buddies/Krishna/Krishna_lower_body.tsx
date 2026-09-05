import React from 'react';
import styles from './krishna.module.css';
import { KrishnaArms } from './krishna_arms';
import type { KrishnaPose } from './KrishnaSprite';

interface KrishnaLowerBodyProps {
  pose?: KrishnaPose;
}

export const KrishnaLowerBody: React.FC<KrishnaLowerBodyProps> = ({ pose = 'chakra' }) => {
  return (
    <>
      {/* ════════════════ LAYER 2: FEET (CHARAN KAMAL) ════════════════ */}
      <g id="globalGroundShadow">
        {/* Outer Soft Ambient Spread (Feathered 18-unit blur radius) */}
        <ellipse cx="187" cy="454" rx="76" ry="12" fill="url(#kGroundShadowRadial)" filter="url(#kGroundBlurFilter)" opacity="0.85" />
        {/* Core Contact Occlusion Shadow */}
        <ellipse cx="187" cy="452" rx="48" ry="6" fill="url(#kGroundShadowRadial)" filter="url(#kSoftShadow)" opacity="0.60" />
      </g>

      <g id="feet" filter="url(#kSoftShadow)" transform="translate(190,290) scale(1,1.06) translate(-190,-290)">
        {/* Left Foot (Adorably Cute Chubby Toddler Foot with Lotus-Pink Blush) */}
        <g id="leftFoot" transform="translate(148, 426)">
          {/* Soft Ground Contact Ambient Shadow */}
          <ellipse cx="0" cy="24.5" rx="14" ry="3.5" fill="url(#kGroundShadowRadial)" opacity="0.4" filter="url(#kSoftShadow)" />

          {/* Plump, Chubby Baby Foot Silhouette */}
          <path
            d="M -6 0
               C -12 2, -15 9, -14 16
               C -14 20, -11 21.8, -9 20.8
               C -8.5 23.5, -5.5 24.2, -3.8 22.8
               C -3.0 25.0, 0.2 25.5, 2.2 23.8
               C 3.2 25.6, 7.0 25.8, 9.0 23.8
               C 10.0 25.2, 14.5 24.5, 14.5 19.5
               C 14.5 14, 11 6, -6 0 Z"
            fill="url(#kSkinLimb)"
          />

          {/* Chubby Toddler Instep Dome Highlight */}
          <ellipse cx="-0.5" cy="10" rx="9" ry="6" fill="url(#kSkinHand)" opacity="0.7" />
          <ellipse cx="0" cy="8" rx="5" ry="3" fill="#FFFFFF" opacity="0.3" />

          {/* ── 5 Cute Plump Rounded Baby Toe Cushions with Warm Rosy Lotus Blush ── */}
          {/* Big Toe (Plump & Sweet, Medial/Right) */}
          <circle cx="11.8" cy="18.5" r="4.2" fill="url(#kLotusToeBlush)" />
          <ellipse cx="11.5" cy="17.2" rx="2.0" ry="1.3" fill="#FFFFFF" opacity="0.65" />

          {/* Second Toe */}
          <circle cx="5.8" cy="20.5" r="3.7" fill="url(#kLotusToeBlush)" />
          <ellipse cx="5.5" cy="19.2" rx="1.7" ry="1.1" fill="#FFFFFF" opacity="0.55" />

          {/* Third Toe */}
          <circle cx="-0.8" cy="21.0" r="3.3" fill="url(#kLotusToeBlush)" />
          <ellipse cx="-1.0" cy="19.8" rx="1.5" ry="1.0" fill="#FFFFFF" opacity="0.5" />

          {/* Fourth Toe */}
          <circle cx="-6.4" cy="20.0" r="2.9" fill="url(#kLotusToeBlush)" />
          <ellipse cx="-6.6" cy="19.0" rx="1.3" ry="0.9" fill="#FFFFFF" opacity="0.45" />

          {/* Little Pinky Toe Button */}
          <circle cx="-11.2" cy="18.2" r="2.5" fill="url(#kLotusToeBlush)" />
          <ellipse cx="-11.3" cy="17.4" rx="1.0" ry="0.7" fill="#FFFFFF" opacity="0.4" />

          {/* Soft, Cute Interdigital Separation Creases */}
          <path d="M 8.8 21 C 8.5 17.5, 8.0 14.5, 7.8 12.5" fill="none" stroke="#1E3A8A" strokeWidth="1.1" strokeLinecap="round" opacity="0.35" />
          <path d="M 2.5 21.5 C 2.2 18.0, 2.0 15.2, 1.8 13.5" fill="none" stroke="#1E3A8A" strokeWidth="1.0" strokeLinecap="round" opacity="0.3" />
          <path d="M -3.6 21 C -3.7 17.8, -3.8 15.5, -3.9 14.0" fill="none" stroke="#1E3A8A" strokeWidth="0.9" strokeLinecap="round" opacity="0.28" />
          <path d="M -8.8 19.5 C -9.0 17.0, -9.2 15.0, -9.3 13.8" fill="none" stroke="#1E3A8A" strokeWidth="0.8" strokeLinecap="round" opacity="0.25" />

          {/* ── Sacred Vaishnav Lotus Foot Decoration: White Chakra (Charan Chinha) ── */}
          <g id="vaishnavChakraLeft" opacity="0.92">
            {/* Central Sacred Sandalwood Core */}
            <circle cx="0" cy="11" r="1.3" fill="#FFFFFF" />
            <circle cx="0" cy="11" r="0.6" fill="#FDE047" opacity="0.9" />

            {/* Inner Sandalwood Ring */}
            <circle cx="0" cy="11" r="2.8" fill="none" stroke="#FFFFFF" strokeWidth="0.65" opacity="0.9" />

            {/* Outer Wheel Rim */}
            <circle cx="0" cy="11" r="4.8" fill="none" stroke="#FFFFFF" strokeWidth="0.8" strokeDasharray="1.4 0.9" opacity="0.95" />

            {/* 8 Radiant Sacred Spokes */}
            <line x1="0" y1="8.2" x2="0" y2="6.2" stroke="#FFFFFF" strokeWidth="0.65" strokeLinecap="round" />
            <line x1="0" y1="13.8" x2="0" y2="15.8" stroke="#FFFFFF" strokeWidth="0.65" strokeLinecap="round" />
            <line x1="-2.8" y1="11" x2="-4.8" y2="11" stroke="#FFFFFF" strokeWidth="0.65" strokeLinecap="round" />
            <line x1="2.8" y1="11" x2="4.8" y2="11" stroke="#FFFFFF" strokeWidth="0.65" strokeLinecap="round" />
            <line x1="-2.0" y1="9.0" x2="-3.4" y2="7.6" stroke="#FFFFFF" strokeWidth="0.6" strokeLinecap="round" />
            <line x1="2.0" y1="9.0" x2="3.4" y2="7.6" stroke="#FFFFFF" strokeWidth="0.6" strokeLinecap="round" />
            <line x1="-2.0" y1="13.0" x2="-3.4" y2="14.4" stroke="#FFFFFF" strokeWidth="0.6" strokeLinecap="round" />
            <line x1="2.0" y1="13.0" x2="3.4" y2="14.4" stroke="#FFFFFF" strokeWidth="0.6" strokeLinecap="round" />

            {/* 8 Sandalwood Paste Bindu Dots (Chandan Tilak Dots) */}
            <circle cx="0" cy="5.2" r="0.55" fill="#FFFFFF" opacity="0.9" />
            <circle cx="4.1" cy="6.9" r="0.55" fill="#FFFFFF" opacity="0.9" />
            <circle cx="5.8" cy="11.0" r="0.55" fill="#FFFFFF" opacity="0.9" />
            <circle cx="4.1" cy="15.1" r="0.55" fill="#FFFFFF" opacity="0.9" />
            <circle cx="0" cy="16.8" r="0.55" fill="#FFFFFF" opacity="0.9" />
            <circle cx="-4.1" cy="15.1" r="0.55" fill="#FFFFFF" opacity="0.9" />
            <circle cx="-5.8" cy="11.0" r="0.55" fill="#FFFFFF" opacity="0.9" />
            <circle cx="-4.1" cy="6.9" r="0.55" fill="#FFFFFF" opacity="0.9" />
          </g>
        </g>

        {/* Right Foot (Adorably Cute Chubby Toddler Foot with Lotus-Pink Blush) */}
        <g id="rightFoot" transform="translate(226, 426)">
          {/* Soft Ground Contact Ambient Shadow */}
          <ellipse cx="0" cy="24.5" rx="14" ry="3.5" fill="url(#kGroundShadowRadial)" opacity="0.4" filter="url(#kSoftShadow)" />

          {/* Plump, Chubby Baby Foot Silhouette */}
          <path
            d="M 6 0
               C 12 2, 15 9, 14 16
               C 14 20, 11 21.8, 9 20.8
               C 8.5 23.5, 5.5 24.2, 3.8 22.8
               C 3.0 25.0, -0.2 25.5, -2.2 23.8
               C -3.2 25.6, -7.0 25.8, -9.0 23.8
               C -10.0 25.2, -14.5 24.5, -14.5 19.5
               C -14.5 14, -11 6, -6 0 Z"
            fill="url(#kSkinLimb)"
          />

          {/* Chubby Toddler Instep Dome Highlight */}
          <ellipse cx="0.5" cy="10" rx="9" ry="6" fill="url(#kSkinHand)" opacity="0.7" />
          <ellipse cx="0" cy="8" rx="5" ry="3" fill="#FFFFFF" opacity="0.3" />

          {/* ── 5 Cute Plump Rounded Baby Toe Cushions with Warm Rosy Lotus Blush ── */}
          {/* Big Toe (Plump & Sweet, Medial/Left) */}
          <circle cx="-11.8" cy="18.5" r="4.2" fill="url(#kLotusToeBlush)" />
          <ellipse cx="-11.5" cy="17.2" rx="2.0" ry="1.3" fill="#FFFFFF" opacity="0.65" />

          {/* Second Toe */}
          <circle cx="-5.8" cy="20.5" r="3.7" fill="url(#kLotusToeBlush)" />
          <ellipse cx="-5.5" cy="19.2" rx="1.7" ry="1.1" fill="#FFFFFF" opacity="0.55" />

          {/* Third Toe */}
          <circle cx="0.8" cy="21.0" r="3.3" fill="url(#kLotusToeBlush)" />
          <ellipse cx="1.0" cy="19.8" rx="1.5" ry="1.0" fill="#FFFFFF" opacity="0.5" />

          {/* Fourth Toe */}
          <circle cx="6.4" cy="20.0" r="2.9" fill="url(#kLotusToeBlush)" />
          <ellipse cx="6.6" cy="19.0" rx="1.3" ry="0.9" fill="#FFFFFF" opacity="0.45" />

          {/* Little Pinky Toe Button */}
          <circle cx="11.2" cy="18.2" r="2.5" fill="url(#kLotusToeBlush)" />
          <ellipse cx="11.3" cy="17.4" rx="1.0" ry="0.7" fill="#FFFFFF" opacity="0.4" />

          {/* Soft, Cute Interdigital Separation Creases */}
          <path d="M -8.8 21 C -8.5 17.5, -8.0 14.5, -7.8 12.5" fill="none" stroke="#1E3A8A" strokeWidth="1.1" strokeLinecap="round" opacity="0.35" />
          <path d="M -2.5 21.5 C -2.2 18.0, -2.0 15.2, -1.8 13.5" fill="none" stroke="#1E3A8A" strokeWidth="1.0" strokeLinecap="round" opacity="0.3" />
          <path d="M 3.6 21 C 3.7 17.8, 3.8 15.5, 3.9 14.0" fill="none" stroke="#1E3A8A" strokeWidth="0.9" strokeLinecap="round" opacity="0.28" />
          <path d="M 8.8 19.5 C 9.0 17.0, 9.2 15.0, 9.3 13.8" fill="none" stroke="#1E3A8A" strokeWidth="0.8" strokeLinecap="round" opacity="0.25" />

          {/* ── Sacred Vaishnav Lotus Foot Decoration: White Chakra (Charan Chinha) ── */}
          <g id="vaishnavChakraRight" opacity="0.92">
            {/* Central Sacred Sandalwood Core */}
            <circle cx="0" cy="11" r="1.3" fill="#FFFFFF" />
            <circle cx="0" cy="11" r="0.6" fill="#FDE047" opacity="0.9" />

            {/* Inner Sandalwood Ring */}
            <circle cx="0" cy="11" r="2.8" fill="none" stroke="#FFFFFF" strokeWidth="0.65" opacity="0.9" />

            {/* Outer Wheel Rim */}
            <circle cx="0" cy="11" r="4.8" fill="none" stroke="#FFFFFF" strokeWidth="0.8" strokeDasharray="1.4 0.9" opacity="0.95" />

            {/* 8 Radiant Sacred Spokes */}
            <line x1="0" y1="8.2" x2="0" y2="6.2" stroke="#FFFFFF" strokeWidth="0.65" strokeLinecap="round" />
            <line x1="0" y1="13.8" x2="0" y2="15.8" stroke="#FFFFFF" strokeWidth="0.65" strokeLinecap="round" />
            <line x1="-2.8" y1="11" x2="-4.8" y2="11" stroke="#FFFFFF" strokeWidth="0.65" strokeLinecap="round" />
            <line x1="2.8" y1="11" x2="4.8" y2="11" stroke="#FFFFFF" strokeWidth="0.65" strokeLinecap="round" />
            <line x1="-2.0" y1="9.0" x2="-3.4" y2="7.6" stroke="#FFFFFF" strokeWidth="0.6" strokeLinecap="round" />
            <line x1="2.0" y1="9.0" x2="3.4" y2="7.6" stroke="#FFFFFF" strokeWidth="0.6" strokeLinecap="round" />
            <line x1="-2.0" y1="13.0" x2="-3.4" y2="14.4" stroke="#FFFFFF" strokeWidth="0.6" strokeLinecap="round" />
            <line x1="2.0" y1="13.0" x2="3.4" y2="14.4" stroke="#FFFFFF" strokeWidth="0.6" strokeLinecap="round" />

            {/* 8 Sandalwood Paste Bindu Dots (Chandan Tilak Dots) */}
            <circle cx="0" cy="5.2" r="0.55" fill="#FFFFFF" opacity="0.9" />
            <circle cx="4.1" cy="6.9" r="0.55" fill="#FFFFFF" opacity="0.9" />
            <circle cx="5.8" cy="11.0" r="0.55" fill="#FFFFFF" opacity="0.9" />
            <circle cx="4.1" cy="15.1" r="0.55" fill="#FFFFFF" opacity="0.9" />
            <circle cx="0" cy="16.8" r="0.55" fill="#FFFFFF" opacity="0.9" />
            <circle cx="-4.1" cy="15.1" r="0.55" fill="#FFFFFF" opacity="0.9" />
            <circle cx="-5.8" cy="11.0" r="0.55" fill="#FFFFFF" opacity="0.9" />
            <circle cx="-4.1" cy="6.9" r="0.55" fill="#FFFFFF" opacity="0.9" />
          </g>
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
          d="M 230 322 C 234 360, 234 394, 226 424"
          fill="none"
          stroke="url(#kSkinLimb)"
          strokeWidth="28"
          strokeLinecap="round"
        />
        <path
          d="M 230 322 C 234 360, 234 394, 226 424"
          fill="none"
          stroke="#D9ECFF"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.45"
        />

        {/* Soft Ambient Crotch / Inseam Shadow between legs */}
        <ellipse cx="190" cy="360" rx="16" ry="24" fill="#1E3A8A" opacity="0.2" />
      </g>

      {/* ════════════════ LAYER 3B: LEFT THUMB (BEHIND WAIST IN CHAKRA POSE) ════════════════ */}
      {/* Anatomical Left Thumb passes BEHIND the waist/body flank, while the 4 fingers wrap around the front */}
      {pose === 'chakra' && (
        <KrishnaArms pose={pose} renderSide="characterLeft" renderHandPart="thumbOnly" />
      )}

      {/* ════════════════ LAYER 4: 3D WRAPPED LAYERED DHOTI, SCULPTED WAISTBAND & SILK SASH ════════════════ */}
      <g id="dhoti" filter="url(#kSoftShadow)" transform="translate(190,290) scale(1,1.06) translate(-190,-290)">
        {/* ── 1. BASE FABRIC UNDER-LAYER (Soft ambient occlusion shadow under waistband) ── */}
        <g id="dhotiBaseStructure">
          <ellipse cx="190" cy="288" rx="64" ry="10" fill="#B85C00" opacity="0.35" />
        </g>

        {/* ── 2. INDIVIDUAL LEFT & RIGHT LEG FABRIC WRAPS (WITH CLEAR 14-22 UNIT CENTRAL GAP) ── */}
        <g id="dhotiLegWraps">
          {/* LEFT LEG FABRIC DRAPE (Wraps Left Leg centered at X=148) */}
          <path
            d="M 124 294
               C 114 330, 115 365, 122 396
               C 126 405, 136 408, 150 408
               C 164 408, 174 403, 178 394
               C 180 370, 180 340, 184 308
               C 166 294, 142 286, 124 294 Z"
            fill="url(#kDhotiLeftMassGrad)"
            stroke="#D87900"
            strokeWidth="0.8"
          />

          {/* Left Fabric Mass Soft Crest Highlight (Key-lit from upper-left) */}
          <path
            d="M 128 302
               C 122 330, 124 362, 132 386
               C 136 400, 144 404, 154 404
               C 148 392, 142 376, 140 358
               C 138 334, 134 316, 128 302 Z"
            fill="#FFD95A"
            opacity="0.5"
          />

          {/* RIGHT LEG FABRIC DRAPE (Wraps Right Leg centered at X=228) */}
          <path
            d="M 256 294
               C 266 330, 265 365, 258 396
               C 254 405, 244 408, 230 408
               C 216 408, 206 403, 202 394
               C 200 370, 200 340, 196 308
               C 214 294, 238 286, 256 294 Z"
            fill="url(#kDhotiRightMassGrad)"
            stroke="#D87900"
            strokeWidth="0.8"
          />

          {/* Right Fabric Mass Soft Ambient Shading */}
          <path
            d="M 252 304
               C 258 332, 258 364, 252 386
               C 248 400, 240 404, 232 404
               C 238 394, 244 380, 248 368
               C 252 344, 252 322, 252 304 Z"
            fill="#B85C00"
            opacity="0.25"
          />

          {/* Subtle Natural Leg Separation Inseam Shadow (Soft & Organic, NOT a black cutout) */}
          <path
            d="M 178 394
               C 182 374, 185 348, 186 316
               C 194 316, 197 348, 202 394
               C 198 386, 194 380, 190 380
               C 186 380, 182 386, 178 394 Z"
            fill="#B85C00"
            opacity="0.22"
          />
        </g>

        {/* ── 3. GATHERED FABRIC PUCKER TRANSITION (Underneath Waistband) ── */}
        <g id="dhotiWaistGathers">
          {/* Soft contact shadow beneath belt */}
          <path
            d="M 128 290
               C 158 306, 222 306, 252 290
               C 250 300, 222 314, 190 314
               C 158 314, 130 300, 128 290 Z"
            fill="#B85C00"
            opacity="0.45"
          />

          {/* Fabric gather puckers with staggered origins emerging under the waistband */}
          {[
            { x1: 140, y1: 286, x2: 142, y2: 306 },
            { x1: 156, y1: 292, x2: 160, y2: 312 },
            { x1: 174, y1: 296, x2: 176, y2: 316 },
            { x1: 206, y1: 296, x2: 204, y2: 316 },
            { x1: 224, y1: 292, x2: 220, y2: 312 },
            { x1: 240, y1: 286, x2: 238, y2: 306 },
          ].map((g, idx) => (
            <g key={`gather-${idx}`}>
              <path d={`M ${g.x1} ${g.y1} Q ${g.x2} ${g.y2 - 4}, ${g.x2} ${g.y2}`} fill="none" stroke="#D87900" strokeWidth="1.6" opacity="0.4" strokeLinecap="round" />
              <path d={`M ${g.x1 + 1.2} ${g.y1} Q ${g.x2 + 1.2} ${g.y2 - 4}, ${g.x2 + 1.2} ${g.y2}`} fill="none" stroke="#FFD95A" strokeWidth="1.2" opacity="0.8" strokeLinecap="round" />
            </g>
          ))}
        </g>

        {/* ── 4. SIDE FABRIC FOLDS (2-3 MAJOR FOLDS PER SIDE FOLLOWING GRAVITY & BODY TENSION) ── */}
        <g id="dhotiSideFolds">
          {/* ── LEFT FOLD 1: Upper Left-to-Center Diagonal Gather Fold ── */}
          <path
            d="M 122 308
               C 142 332, 164 352, 184 364
               C 186 370, 182 374, 176 372
               C 156 360, 134 336, 118 314 Z"
            fill="#B85C00"
            opacity="0.3"
          />
          <path
            d="M 122 300
               C 142 325, 164 347, 184 360
               C 186 364, 182 368, 176 366
               C 156 352, 132 328, 118 304
               C 119 300, 120 300, 122 300 Z"
            fill="url(#kDhotiFoldL1Grad)"
            stroke="#D87900"
            strokeWidth="0.8"
          />
          <path
            d="M 124 302
               C 144 325, 164 345, 180 358"
            fill="none"
            stroke="#FFD95A"
            strokeWidth="2.6"
            strokeLinecap="round"
            opacity="0.75"
          />

          {/* ── LEFT FOLD 2: Mid Sweeping J-Fold (Reference curvature wrapping thigh) ── */}
          <path
            d="M 118 342
               C 134 370, 154 390, 176 400
               C 178 406, 172 410, 166 406
               C 146 394, 128 368, 114 344 Z"
            fill="#B85C00"
            opacity="0.28"
          />
          <path
            d="M 118 334
               C 134 362, 156 384, 176 394
               C 178 398, 174 402, 168 400
               C 148 388, 128 364, 114 336
               C 115 334, 116 334, 118 334 Z"
            fill="url(#kDhotiFoldL2Grad)"
            stroke="#D87900"
            strokeWidth="0.8"
          />
          <path
            d="M 120 336
               C 136 362, 156 382, 170 390"
            fill="none"
            stroke="#FFD95A"
            strokeWidth="2.4"
            strokeLinecap="round"
            opacity="0.7"
          />

          {/* ── LEFT FOLD 3: Lower Calf Wrap Fold ── */}
          <path
            d="M 120 370
               C 136 394, 152 408, 166 412
               C 168 416, 164 418, 156 416
               C 140 410, 126 396, 116 374 Z"
            fill="url(#kDhotiFoldL3Grad)"
            stroke="#D87900"
            strokeWidth="0.8"
          />
          <path
            d="M 122 372
               C 138 394, 152 406, 164 410"
            fill="none"
            stroke="#FFD95A"
            strokeWidth="2.0"
            strokeLinecap="round"
            opacity="0.6"
          />

          {/* ── RIGHT FOLD 1: Upper Right-to-Center Diagonal Wrap Fold ── */}
          <path
            d="M 258 308
               C 238 332, 216 352, 196 364
               C 194 370, 198 374, 204 372
               C 224 360, 246 336, 262 314 Z"
            fill="#B85C00"
            opacity="0.3"
          />
          <path
            d="M 258 300
               C 238 325, 216 347, 196 360
               C 194 364, 198 368, 204 366
               C 224 352, 248 328, 262 304
               C 261 300, 260 300, 258 300 Z"
            fill="url(#kDhotiFoldR1Grad)"
            stroke="#D87900"
            strokeWidth="0.8"
          />
          <path
            d="M 256 302
               C 236 325, 216 345, 200 358"
            fill="none"
            stroke="#FFD95A"
            strokeWidth="2.4"
            strokeLinecap="round"
            opacity="0.7"
          />

          {/* ── RIGHT FOLD 2: Lower Right Wrapping Calf Fold ── */}
          <path
            d="M 262 350
               C 246 378, 224 398, 208 406
               C 206 410, 212 414, 220 412
               C 238 404, 256 380, 266 358 Z"
            fill="url(#kDhotiFoldR2Grad)"
            stroke="#D87900"
            strokeWidth="0.8"
          />
          <path
            d="M 260 352
               C 244 378, 224 396, 210 404"
            fill="none"
            stroke="#FFD95A"
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.6"
          />
        </g>

        {/* ── 5. CENTRAL V-CONVERGING PLEAT STRUCTURE (5 FOLDS WITH SOFT DISTINCTION) ── */}
        <g id="dhotiCentralPleats">
          {/* Pleat 1 (Center-Left Diverging Pleat) */}
          <path
            d="M 184 288
               C 181 316, 178 344, 176 376
               C 179 382, 183 382, 185 376
               C 187 344, 189 316, 188 288 Z"
            fill="url(#kDhotiPleatMidGrad)"
            stroke="#D87900"
            strokeWidth="0.7"
          />
          <path
            d="M 185 290 C 182 316, 179 344, 177 372"
            fill="none"
            stroke="#FFD95A"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.8"
          />

          {/* Pleat 2 (Center-Right Diverging Pleat) */}
          <path
            d="M 196 288
               C 199 316, 202 344, 204 376
               C 201 382, 197 382, 195 376
               C 193 344, 191 316, 192 288 Z"
            fill="url(#kDhotiPleatMidGrad)"
            stroke="#D87900"
            strokeWidth="0.7"
          />
          <path
            d="M 195 290 C 198 316, 201 344, 203 372"
            fill="none"
            stroke="#FFD95A"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.8"
          />

          {/* Pleat 3 (Main Foreground Central Pleat) */}
          <path
            d="M 187 286
               C 186 312, 186 338, 188 364
               C 190 369, 194 369, 196 364
               C 198 338, 198 312, 197 286 Z"
            fill="url(#kDhotiPleatTopGrad)"
            stroke="#D87900"
            strokeWidth="0.8"
          />
          <path
            d="M 189 288 C 188 312, 188 338, 190 360"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.0"
            strokeLinecap="round"
            opacity="0.85"
          />
          <path
            d="M 194 290 C 193 312, 193 338, 194 358"
            fill="none"
            stroke="#D87900"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.45"
          />
        </g>

        {/* ── 6. LOWER HEM PIPING & ACCENTS (Full-Length Ankle Cuffs) ── */}
        <g id="dhotiHemAccents">
          {/* Left Hem Gold Accent Rim at Ankle */}
          <path
            d="M 126 398
               C 134 406, 146 406, 156 406
               C 164 406, 170 402, 174 392"
            fill="none"
            stroke="#FFD95A"
            strokeWidth="2.0"
            strokeLinecap="round"
            opacity="0.85"
          />
          <path
            d="M 126 400
               C 134 408, 146 408, 156 408
               C 164 408, 170 404, 174 394"
            fill="none"
            stroke="#B85C00"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.6"
          />

          {/* Right Hem Gold Accent Rim at Ankle */}
          <path
            d="M 206 392
               C 210 402, 216 406, 224 406
               C 234 406, 246 406, 254 398"
            fill="none"
            stroke="#FFD95A"
            strokeWidth="2.0"
            strokeLinecap="round"
            opacity="0.85"
          />
          <path
            d="M 206 394
               C 210 404, 216 408, 224 408
               C 234 408, 246 408, 254 400"
            fill="none"
            stroke="#B85C00"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.6"
          />
        </g>

        {/* ── 7. SEPARATE ORANGE SILK SIDE DRAPE (NATURAL FABRIC BEHAVIOR & CONTINUOUS COLOR) ── */}
        <g id="orangeSashVertical">
          {/* Soft contact shadow cast by orange drape onto yellow dhoti fabric */}
          <path
            d="M 230 278
               C 230 324, 232 368, 234 408
               C 240 418, 264 418, 266 408
               C 264 366, 260 324, 258 278 Z"
            fill="#B93D00"
            opacity="0.38"
          />

          {/* ── Outer Main Fold (Curved drape following gravity & hips, seamless top overlap) ── */}
          <path
            d="M 246 276
               C 246 324, 249 368, 252 408
               C 256 416, 265 414, 266 406
               C 264 364, 260 324, 258 276 Z"
            fill="url(#kDhotiOrangeSash1)"
            stroke="#B93D00"
            strokeWidth="0.8"
          />
          {/* Light Ridge Highlight along Outer Fold */}
          <path
            d="M 254 280 C 254 326, 257 370, 259 406"
            fill="none"
            stroke="#FF9A2E"
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.85"
          />

          {/* ── Inner Rounded Overlapping Fold ── */}
          <path
            d="M 234 278
               C 233 326, 235 372, 237 410
               C 241 418, 250 416, 250 408
               C 248 366, 245 328, 244 278 Z"
            fill="url(#kDhotiOrangeSash2)"
            stroke="#B93D00"
            strokeWidth="0.8"
          />
          {/* Warm Light Highlight along Inner Fold */}
          <path
            d="M 242 282 C 241 328, 242 374, 244 408"
            fill="none"
            stroke="#FF7A00"
            strokeWidth="2.0"
            strokeLinecap="round"
            opacity="0.9"
          />
          {/* Shadow Recess inside Inner Fold Valley */}
          <path
            d="M 237 282 C 236 328, 237 374, 238 408"
            fill="none"
            stroke="#E65300"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.5"
          />

          {/* Organic Soft Curved Lower Edge Hem (Not flat horizontal rectangle) */}
          <path
            d="M 237 410 C 242 417, 249 416, 252 408 C 256 415, 264 413, 266 406"
            fill="none"
            stroke="#B93D00"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </g>

        {/* ── 8. ORANGE WAIST CLOTH WRAP & 3D GOLD KAMARBANDH SYSTEM ── */}
        <g id="studdedBeltGroup">
          {/* Soft Ambient Contact Shadow beneath entire waist ornament onto dhoti fabric */}
          <path
            d="M 125 272 C 158 260, 222 260, 255 272 C 260 296, 224 310, 190 310 C 156 310, 120 296, 125 272 Z"
            fill="#B86A00"
            opacity="0.28"
          />

          {/* Orange Waist Cloth Wrap (Visible above & below the gold Kamarbandh) */}
          <path
            d="M 126 270
               C 158 258, 222 258, 254 270
               C 260 294, 224 306, 190 306
               C 156 306, 120 294, 126 270 Z"
            fill="url(#kDhotiWaistGrad)"
            stroke="#B93D00"
            strokeWidth="0.8"
          />

          {/* Compressed Fabric Gather Folds immediately beneath waist wrap */}
          <g className="waist-fabric-compression">
            <path d="M 148 296 C 152 305, 160 306, 166 298" fill="none" stroke="#E65300" strokeWidth="1.2" opacity="0.6" />
            <path d="M 172 299 C 178 308, 186 308, 190 300" fill="none" stroke="#E65300" strokeWidth="1.2" opacity="0.6" />
            <path d="M 190 300 C 194 308, 202 308, 208 299" fill="none" stroke="#E65300" strokeWidth="1.2" opacity="0.6" />
            <path d="M 214 298 C 220 306, 228 305, 232 296" fill="none" stroke="#E65300" strokeWidth="1.2" opacity="0.6" />
          </g>

          {/* ── Main Gold Kamarbandh Band (Sitting physically ON TOP of the orange fabric) ── */}
          <path
            d="M 129 275
               C 158 264, 222 264, 251 275
               C 255 287, 223 299, 190 299
               C 157 299, 125 287, 129 275 Z"
            fill="url(#kGoldGrad)"
            stroke="#662200"
            strokeWidth="0.9"
          />

          {/* Contact Shadow cast by Gold Belt onto Orange Fabric */}
          <path
            d="M 129 288 C 158 299, 222 299, 251 288 C 255 292, 223 301, 190 301 C 157 301, 125 292, 129 288 Z"
            fill="#B86A00"
            opacity="0.35"
          />

          {/* Belt Top Edge Rolled Gold Piping Rim with Tapering Arc */}
          <path
            d="M 130 275 C 158 264, 222 264, 250 275"
            fill="none"
            stroke="url(#kGoldBeltRim)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          {/* Top rim specular highlight glint */}
          <path
            d="M 154 269 C 176 266, 204 266, 226 269"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.9"
          />

          {/* Belt Bottom Edge Rolled Gold Piping Rim */}
          <path
            d="M 130 289 C 158 299, 222 299, 250 289"
            fill="none"
            stroke="url(#kGoldBeltRim)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* Belt Bottom Edge Deep Shadow Crease */}
          <path
            d="M 130 291 C 158 301, 222 301, 250 291"
            fill="none"
            stroke="#3D1200"
            strokeWidth="1.4"
            opacity="0.75"
          />

          {/* ── NATURAL CURVED / FOLDED BELT END TERMINATION ── */}
          <g id="beltEndClothFold">
            {/* Belt Termination Shadow Crease beneath folded end */}
            <path
              d="M 242 274 C 252 278, 260 284, 264 292 C 260 300, 248 302, 240 296 Z"
              fill="#B93D00"
              opacity="0.4"
            />

            {/* Curved Overlapping Belt-End Fabric Extension */}
            <path
              d="M 238 272
                 C 248 274, 258 280, 264 290
                 C 266 296, 256 302, 246 300
                 C 238 296, 234 288, 238 272 Z"
              fill="url(#kDhotiOrangeSash1)"
              stroke="#B93D00"
              strokeWidth="0.9"
            />

            {/* Belt-End Curved Fold Highlight Ridge */}
            <path
              d="M 240 274 C 250 278, 258 284, 262 290"
              fill="none"
              stroke="#FF9A2E"
              strokeWidth="2.0"
              strokeLinecap="round"
              opacity="0.85"
            />

            {/* Belt-End Soft Rounded Hem Edge */}
            <path
              d="M 264 290 C 266 296, 256 302, 246 300"
              fill="none"
              stroke="#E65300"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </g>

          {/* ── 3D GOLD BEADED KAMARBANDH STRING (Beads following waist curvature) ── */}
          <g id="waistBeltDomeRivets">
            {[
              { cx: 142, cy: 281, r: 4.2 },
              { cx: 158, cy: 285, r: 4.6 },
              { cx: 174, cy: 288, r: 4.8 },
              { cx: 190, cy: 289, r: 4.8 },
              { cx: 206, cy: 288, r: 4.8 },
              { cx: 222, cy: 285, r: 4.6 },
              { cx: 238, cy: 281, r: 4.2 },
            ].map((stud, idx) => (
              <g key={`stud-${idx}`}>
                {/* Dark gold contact shadow */}
                <circle cx={stud.cx} cy={stud.cy + 1.2} r={stud.r + 0.5} fill="#2E0C00" opacity="0.6" />
                {/* 3D Gold Bead Body */}
                <circle
                  cx={stud.cx}
                  cy={stud.cy}
                  r={stud.r}
                  fill="url(#kGoldDomeStud)"
                  stroke="#662200"
                  strokeWidth="0.6"
                />
                {/* Inner 3D Sphere Glow Ridge */}
                <circle cx={stud.cx} cy={stud.cy} r={stud.r * 0.72} fill="none" stroke="#FFF3B0" strokeWidth="0.6" opacity="0.85" />
                {/* Tiny Specular Highlight */}
                <circle cx={stud.cx - stud.r * 0.32} cy={stud.cy - stud.r * 0.32} r={stud.r * 0.3} fill="#FFFFFF" opacity="0.95" />
              </g>
            ))}
          </g>

          {/* ── SIDE ORNAMENTS (Left & Right Waist Decorative Accent Clusters) ── */}
          <g id="kamarbandhSideOrnaments">
            {/* Left Side Ornament Cluster */}
            <g id="sideOrnamentLeft" transform="translate(154, 287)">
              <circle cx="0" cy="5" r="5" fill="#2E0C00" opacity="0.4" />
              <circle cx="0" cy="4" r="4.5" fill="url(#kGoldGrad)" stroke="#B86A00" strokeWidth="0.6" />
              <circle cx="0" cy="4" r="2.4" fill="url(#kRubyBead)" stroke="#662200" strokeWidth="0.4" />
              <circle cx="-0.8" cy="3.2" r="0.7" fill="#FFFFFF" opacity="0.9" />
              <path d="M -1.8 7.5 L 0 12 L 1.8 7.5 Z" fill="url(#kGoldGrad)" stroke="#B86A00" strokeWidth="0.5" />
              <circle cx="0" cy="12.2" r="1.1" fill="url(#kGoldDomeStud)" />
            </g>

            {/* Right Side Ornament Cluster */}
            <g id="sideOrnamentRight" transform="translate(226, 287)">
              <circle cx="0" cy="5" r="5" fill="#2E0C00" opacity="0.4" />
              <circle cx="0" cy="4" r="4.5" fill="url(#kGoldGrad)" stroke="#B86A00" strokeWidth="0.6" />
              <circle cx="0" cy="4" r="2.4" fill="url(#kRubyBead)" stroke="#662200" strokeWidth="0.4" />
              <circle cx="-0.8" cy="3.2" r="0.7" fill="#FFFFFF" opacity="0.9" />
              <path d="M -1.8 7.5 L 0 12 L 1.8 7.5 Z" fill="url(#kGoldGrad)" stroke="#B86A00" strokeWidth="0.5" />
              <circle cx="0" cy="12.2" r="1.1" fill="url(#kGoldDomeStud)" />
            </g>
          </g>

          {/* ── ELEGANT CENTRAL WAIST ORNAMENT / PENDANT (Hanging naturally from belt center) ── */}
          <g id="kamarbandhCentralPendant" transform="translate(190, 292)">
            {/* Contact Shadow cast on Dhoti Fabric */}
            <circle cx="0" cy="8" r="9.5" fill="#2E0C00" opacity="0.45" />

            {/* Outer Gold Scalloped / Filigree Base Ring */}
            <circle cx="0" cy="7" r="9.0" fill="url(#kGoldGrad)" stroke="#B86A00" strokeWidth="0.8" />
            <circle cx="0" cy="7" r="7.2" fill="none" stroke="#FFF0A3" strokeWidth="0.6" strokeDasharray="1.5 1.0" />

            {/* Central Warm Ruby Gemstone */}
            <circle cx="0" cy="7" r="5.2" fill="url(#kRubyBead)" stroke="#581C87" strokeWidth="0.5" />
            {/* Ruby Specular Reflection */}
            <circle cx="-1.6" cy="5.2" r="1.4" fill="#FFFFFF" opacity="0.92" />

            {/* Outer Micro Gold Surrounding Beads */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((ang) => {
              const rad = (ang * Math.PI) / 180;
              const bx = Math.sin(rad) * 8.8;
              const by = 7 - Math.cos(rad) * 8.8;
              return <circle key={`pendant-bead-${ang}`} cx={bx} cy={by} r="1.2" fill="url(#kGoldDomeStud)" stroke="#662200" strokeWidth="0.3" />;
            })}

            {/* Hanging Central Gold Teardrop Pendant Drop */}
            <g className="pendant-drop" transform="translate(0, 15)">
              <path d="M -3 0 L 0 9 L 3 0 Z" fill="#2E0C00" opacity="0.4" />
              <path d="M -3.2 0 L 0 9.5 L 3.2 0 Z" fill="url(#kGoldGrad)" stroke="#B86A00" strokeWidth="0.6" />
              <path d="M -1.2 1 L 0 7" fill="none" stroke="#FFF0A3" strokeWidth="0.8" strokeLinecap="round" />
              <circle cx="0" cy="10.2" r="1.5" fill="#F8F9FF" stroke="#FFD45A" strokeWidth="0.4" />
            </g>
          </g>
        </g>
      </g>

      {/* ════════════════ LAYER 4B: 3D ROYAL GHUNGROO PAYAL ANKLETS ════════════════ */}
      <g id="royalAnklets" className={styles.ankletLayer} transform="translate(190,290) scale(1,1.06) translate(-190,-290)">
        {/* ════════ LEFT ROYAL ANKLET (CHARAN NUPUR) ════════ */}
        <g id="leftAnkletGroup">
          {/* Soft Ambient Contact Shadow on Blue Toddler Ankle Skin */}
          <ellipse cx="148" cy="421.5" rx="16.5" ry="6.0" fill="#0C1A38" opacity="0.45" />

          {/* Sculpted 3D Golden Payal Ankle Band (Curved Cylinder Wrap) */}
          <path
            d="M 132.5 417.5
               C 137.5 421.5, 158.5 421.5, 163.5 417.5
               C 163.5 423.5, 158.5 427.5, 148 427.5
               C 137.5 427.5, 132.5 423.5, 132.5 417.5 Z"
            fill="url(#kPayalGold)"
            stroke="#78350F"
            strokeWidth="0.8"
          />

          {/* Inner High-Sheen Crest Specular Highlight */}
          <path
            d="M 134.5 419.5 C 139.5 423, 156.5 423, 161.5 419.5"
            fill="none"
            stroke="#FFFDF0"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.9"
          />

          {/* ── Upper Beaded Gold Border (Micro Pearl / Kantha Cord) ── */}
          {[
            { x: 133.5, y: 417.8 },
            { x: 138.0, y: 419.6 },
            { x: 143.0, y: 421.0 },
            { x: 148.0, y: 421.4 },
            { x: 153.0, y: 421.0 },
            { x: 158.0, y: 419.6 },
            { x: 162.5, y: 417.8 },
          ].map((b, i) => (
            <g key={`la-ub-${i}`}>
              <circle cx={b.x} cy={b.y} r="1.3" fill="url(#kGoldBead)" stroke="#78350F" strokeWidth="0.35" />
              <circle cx={b.x - 0.4} cy={b.y - 0.4} r="0.5" fill="#FFFFFF" opacity="0.9" />
            </g>
          ))}

          {/* ── Lower Beaded Gold Border ── */}
          {[
            { x: 134.0, y: 423.2 },
            { x: 138.5, y: 425.2 },
            { x: 143.2, y: 426.6 },
            { x: 148.0, y: 427.1 },
            { x: 152.8, y: 426.6 },
            { x: 157.5, y: 425.2 },
            { x: 162.0, y: 423.2 },
          ].map((b, i) => (
            <g key={`la-lb-${i}`}>
              <circle cx={b.x} cy={b.y} r="1.3" fill="url(#kGoldBead)" stroke="#78350F" strokeWidth="0.35" />
              <circle cx={b.x - 0.4} cy={b.y - 0.4} r="0.5" fill="#FFFFFF" opacity="0.9" />
            </g>
          ))}

          {/* ── Inlaid Royal Gemstones (Navratna Meenakari Accents) ── */}
          {/* Flanking Rubies */}
          <circle cx="136" cy="421.2" r="1.4" fill="url(#kPayalRuby)" stroke="#78350F" strokeWidth="0.4" />
          <circle cx="160" cy="421.2" r="1.4" fill="url(#kPayalRuby)" stroke="#78350F" strokeWidth="0.4" />

          {/* Sacred Emerald Cabochons */}
          <g id="la-emerald-left">
            <circle cx="141" cy="423.2" r="2.3" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.4" />
            <circle cx="141" cy="423.2" r="1.7" fill="url(#kPayalEmerald)" stroke="#064E3B" strokeWidth="0.3" />
            <circle cx="140.5" cy="422.7" r="0.6" fill="#FFFFFF" opacity="0.95" />
          </g>
          <g id="la-emerald-right">
            <circle cx="155" cy="423.2" r="2.3" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.4" />
            <circle cx="155" cy="423.2" r="1.7" fill="url(#kPayalEmerald)" stroke="#064E3B" strokeWidth="0.3" />
            <circle cx="154.5" cy="422.7" r="0.6" fill="#FFFFFF" opacity="0.95" />
          </g>

          {/* Central Royal Lotus Rosette with Scarlet Ruby Core */}
          <g id="la-center-ruby">
            {/* 4 Golden Petal Accents */}
            <circle cx="148" cy="421.8" r="1.2" fill="url(#kGoldBead)" />
            <circle cx="148" cy="426.6" r="1.2" fill="url(#kGoldBead)" />
            <circle cx="145.6" cy="424.2" r="1.2" fill="url(#kGoldBead)" />
            <circle cx="150.4" cy="424.2" r="1.2" fill="url(#kGoldBead)" />

            {/* Gold Bezel Setting */}
            <circle cx="148" cy="424.2" r="3.0" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.5" />
            {/* Radiant Ruby Gemstone */}
            <circle cx="148" cy="424.2" r="2.2" fill="url(#kPayalRuby)" stroke="#7F1D1D" strokeWidth="0.4" />
            {/* Specular White Glint */}
            <circle cx="147.3" cy="423.5" r="0.75" fill="#FFFFFF" opacity="0.95" />
          </g>

          {/* ── 7 Hanging 3D Golden Ghungroo Bells (घुंघरू) with Jingling Clappers ── */}
          {[
            { x: 135.0, y: 423.8, isCenter: false },
            { x: 139.2, y: 425.8, isCenter: false },
            { x: 143.6, y: 427.4, isCenter: false },
            { x: 148.0, y: 428.2, isCenter: true },
            { x: 152.4, y: 427.4, isCenter: false },
            { x: 156.8, y: 425.8, isCenter: false },
            { x: 161.0, y: 423.8, isCenter: false },
          ].map((bell, i) => {
            const bellRadius = bell.isCenter ? 3.0 : 2.5;
            const dropY = bell.y + bellRadius + 1.2;
            return (
              <g key={`la-bell-${i}`}>
                {/* Golden Suspension Jump Ring */}
                <ellipse cx={bell.x} cy={bell.y + 0.5} rx="1.0" ry="1.4" fill="none" stroke="#D97706" strokeWidth="0.7" />

                {/* Ambient Contact Shadow beneath bell onto foot skin */}
                <ellipse cx={bell.x} cy={dropY + bellRadius + 0.8} rx={bellRadius * 0.9} ry="1.2" fill="#0C1A38" opacity="0.32" />

                {/* 3D Polished Ghungroo Bell Sphere Body */}
                <circle cx={bell.x} cy={dropY} r={bellRadius} fill="url(#kPayalBellDome)" stroke="#78350F" strokeWidth="0.5" />

                {/* Ghungroo Resonance Smile / Sound Slit */}
                <path
                  d={`M ${bell.x - bellRadius * 0.55} ${dropY + bellRadius * 0.25} Q ${bell.x} ${dropY + bellRadius * 0.65} ${bell.x + bellRadius * 0.55} ${dropY + bellRadius * 0.25}`}
                  fill="none"
                  stroke="#451A03"
                  strokeWidth="0.7"
                  strokeLinecap="round"
                />

                {/* Dangling Pearl Clapper Droplet (Moti) */}
                <circle cx={bell.x} cy={dropY + bellRadius + 1.2} r={bell.isCenter ? 1.4 : 1.1} fill="url(#kPayalPearl)" stroke="#B45309" strokeWidth="0.35" />
                <circle cx={bell.x - 0.3} cy={dropY + bellRadius + 0.9} r="0.4" fill="#FFFFFF" opacity="0.9" />

                {/* High Specular Glint on Upper Dome */}
                <circle cx={bell.x - bellRadius * 0.38} cy={dropY - bellRadius * 0.35} r={bellRadius * 0.36} fill="#FFFFFF" opacity="0.95" />
              </g>
            );
          })}
        </g>

        {/* ════════ RIGHT ROYAL ANKLET (CHARAN NUPUR) ════════ */}
        <g id="rightAnkletGroup">
          {/* Soft Ambient Contact Shadow on Blue Toddler Ankle Skin */}
          <ellipse cx="226" cy="421.5" rx="16.5" ry="6.0" fill="#0C1A38" opacity="0.45" />

          {/* Sculpted 3D Golden Payal Ankle Band (Curved Cylinder Wrap) */}
          <path
            d="M 210.5 417.5
               C 215.5 421.5, 236.5 421.5, 241.5 417.5
               C 241.5 423.5, 236.5 427.5, 226 427.5
               C 215.5 427.5, 210.5 423.5, 210.5 417.5 Z"
            fill="url(#kPayalGold)"
            stroke="#78350F"
            strokeWidth="0.8"
          />

          {/* Inner High-Sheen Crest Specular Highlight */}
          <path
            d="M 212.5 419.5 C 217.5 423, 234.5 423, 239.5 419.5"
            fill="none"
            stroke="#FFFDF0"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.9"
          />

          {/* ── Upper Beaded Gold Border (Micro Pearl / Kantha Cord) ── */}
          {[
            { x: 211.5, y: 417.8 },
            { x: 216.0, y: 419.6 },
            { x: 221.0, y: 421.0 },
            { x: 226.0, y: 421.4 },
            { x: 231.0, y: 421.0 },
            { x: 236.0, y: 419.6 },
            { x: 240.5, y: 417.8 },
          ].map((b, i) => (
            <g key={`ra-ub-${i}`}>
              <circle cx={b.x} cy={b.y} r="1.3" fill="url(#kGoldBead)" stroke="#78350F" strokeWidth="0.35" />
              <circle cx={b.x - 0.4} cy={b.y - 0.4} r="0.5" fill="#FFFFFF" opacity="0.9" />
            </g>
          ))}

          {/* ── Lower Beaded Gold Border ── */}
          {[
            { x: 212.0, y: 423.2 },
            { x: 216.5, y: 425.2 },
            { x: 221.2, y: 426.6 },
            { x: 226.0, y: 427.1 },
            { x: 230.8, y: 426.6 },
            { x: 235.5, y: 425.2 },
            { x: 240.0, y: 423.2 },
          ].map((b, i) => (
            <g key={`ra-lb-${i}`}>
              <circle cx={b.x} cy={b.y} r="1.3" fill="url(#kGoldBead)" stroke="#78350F" strokeWidth="0.35" />
              <circle cx={b.x - 0.4} cy={b.y - 0.4} r="0.5" fill="#FFFFFF" opacity="0.9" />
            </g>
          ))}

          {/* ── Inlaid Royal Gemstones (Navratna Meenakari Accents) ── */}
          {/* Flanking Rubies */}
          <circle cx="214" cy="421.2" r="1.4" fill="url(#kPayalRuby)" stroke="#78350F" strokeWidth="0.4" />
          <circle cx="238" cy="421.2" r="1.4" fill="url(#kPayalRuby)" stroke="#78350F" strokeWidth="0.4" />

          {/* Sacred Emerald Cabochons */}
          <g id="ra-emerald-left">
            <circle cx="219" cy="423.2" r="2.3" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.4" />
            <circle cx="219" cy="423.2" r="1.7" fill="url(#kPayalEmerald)" stroke="#064E3B" strokeWidth="0.3" />
            <circle cx="218.5" cy="422.7" r="0.6" fill="#FFFFFF" opacity="0.95" />
          </g>
          <g id="ra-emerald-right">
            <circle cx="233" cy="423.2" r="2.3" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.4" />
            <circle cx="233" cy="423.2" r="1.7" fill="url(#kPayalEmerald)" stroke="#064E3B" strokeWidth="0.3" />
            <circle cx="232.5" cy="422.7" r="0.6" fill="#FFFFFF" opacity="0.95" />
          </g>

          {/* Central Royal Lotus Rosette with Scarlet Ruby Core */}
          <g id="ra-center-ruby">
            {/* 4 Golden Petal Accents */}
            <circle cx="226" cy="421.8" r="1.2" fill="url(#kGoldBead)" />
            <circle cx="226" cy="426.6" r="1.2" fill="url(#kGoldBead)" />
            <circle cx="223.6" cy="424.2" r="1.2" fill="url(#kGoldBead)" />
            <circle cx="228.4" cy="424.2" r="1.2" fill="url(#kGoldBead)" />

            {/* Gold Bezel Setting */}
            <circle cx="226" cy="424.2" r="3.0" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.5" />
            {/* Radiant Ruby Gemstone */}
            <circle cx="226" cy="424.2" r="2.2" fill="url(#kPayalRuby)" stroke="#7F1D1D" strokeWidth="0.4" />
            {/* Specular White Glint */}
            <circle cx="225.3" cy="423.5" r="0.75" fill="#FFFFFF" opacity="0.95" />
          </g>

          {/* ── 7 Hanging 3D Golden Ghungroo Bells (घुंघरू) with Jingling Clappers ── */}
          {[
            { x: 213.0, y: 423.8, isCenter: false },
            { x: 217.2, y: 425.8, isCenter: false },
            { x: 221.6, y: 427.4, isCenter: false },
            { x: 226.0, y: 428.2, isCenter: true },
            { x: 230.4, y: 427.4, isCenter: false },
            { x: 234.8, y: 425.8, isCenter: false },
            { x: 239.0, y: 423.8, isCenter: false },
          ].map((bell, i) => {
            const bellRadius = bell.isCenter ? 3.0 : 2.5;
            const dropY = bell.y + bellRadius + 1.2;
            return (
              <g key={`ra-bell-${i}`}>
                {/* Golden Suspension Jump Ring */}
                <ellipse cx={bell.x} cy={bell.y + 0.5} rx="1.0" ry="1.4" fill="none" stroke="#D97706" strokeWidth="0.7" />

                {/* Ambient Contact Shadow beneath bell onto foot skin */}
                <ellipse cx={bell.x} cy={dropY + bellRadius + 0.8} rx={bellRadius * 0.9} ry="1.2" fill="#0C1A38" opacity="0.32" />

                {/* 3D Polished Ghungroo Bell Sphere Body */}
                <circle cx={bell.x} cy={dropY} r={bellRadius} fill="url(#kPayalBellDome)" stroke="#78350F" strokeWidth="0.5" />

                {/* Ghungroo Resonance Smile / Sound Slit */}
                <path
                  d={`M ${bell.x - bellRadius * 0.55} ${dropY + bellRadius * 0.25} Q ${bell.x} ${dropY + bellRadius * 0.65} ${bell.x + bellRadius * 0.55} ${dropY + bellRadius * 0.25}`}
                  fill="none"
                  stroke="#451A03"
                  strokeWidth="0.7"
                  strokeLinecap="round"
                />

                {/* Dangling Pearl Clapper Droplet (Moti) */}
                <circle cx={bell.x} cy={dropY + bellRadius + 1.2} r={bell.isCenter ? 1.4 : 1.1} fill="url(#kPayalPearl)" stroke="#B45309" strokeWidth="0.35" />
                <circle cx={bell.x - 0.3} cy={dropY + bellRadius + 0.9} r="0.4" fill="#FFFFFF" opacity="0.9" />

                {/* High Specular Glint on Upper Dome */}
                <circle cx={bell.x - bellRadius * 0.38} cy={dropY - bellRadius * 0.35} r={bellRadius * 0.36} fill="#FFFFFF" opacity="0.95" />
              </g>
            );
          })}
        </g>
      </g>
    </>
  );
};
