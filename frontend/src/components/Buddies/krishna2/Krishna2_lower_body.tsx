import React from 'react';
import styles from '../Krishna/krishna.module.css';

interface Krishna2LowerBodyProps {
  pose?: string;
}

export const KrishnaLowerBody: React.FC<Krishna2LowerBodyProps> = () => {
  return (
    <g id="k2_lower_body_group">
      <defs>
        {/* 3D Cylindrical Leg Skin Shader */}
        <linearGradient id="k2_SkinLeg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4A84DF" />
          <stop offset="22%" stopColor="#84B5FA" />
          <stop offset="48%" stopColor="#A9CCFF" />
          <stop offset="75%" stopColor="#5E9AF8" />
          <stop offset="100%" stopColor="#2E55A6" />
        </linearGradient>

        {/* Bright Glowing Saffron Waistband Shader (Matching Bright Saffron Drape) */}
        <linearGradient id="k2_BrightSaffronBelt" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFAA47" />
          <stop offset="22%" stopColor="#FF8500" />
          <stop offset="52%" stopColor="#FF6A00" />
          <stop offset="82%" stopColor="#E65300" />
          <stop offset="100%" stopColor="#B93D00" />
        </linearGradient>

        {/* Saffron Belt Top Rolled Edge Highlight */}
        <linearGradient id="k2_SaffronTopRim" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF9E3B" />
          <stop offset="30%" stopColor="#FFC27A" />
          <stop offset="50%" stopColor="#FFE0B2" />
          <stop offset="70%" stopColor="#FFC27A" />
          <stop offset="100%" stopColor="#FF9E3B" />
        </linearGradient>

        {/* Volumetric Left Dhoti Thigh Mass Gradient */}
        <radialGradient id="k2_DhotiLeftMass" cx="30%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#FFE066" />
          <stop offset="28%" stopColor="#FFC838" />
          <stop offset="58%" stopColor="#F8A916" />
          <stop offset="85%" stopColor="#D87900" />
          <stop offset="100%" stopColor="#A85000" />
        </radialGradient>

        {/* Volumetric Right Dhoti Thigh Mass Gradient */}
        <radialGradient id="k2_DhotiRightMass" cx="42%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFE066" />
          <stop offset="30%" stopColor="#FFC838" />
          <stop offset="62%" stopColor="#F8A916" />
          <stop offset="88%" stopColor="#D87900" />
          <stop offset="100%" stopColor="#A85000" />
        </radialGradient>
      </defs>

      {/* ── 1. GROUND CONTACT AMBIENT OCCLUSION SHADOW ── */}
      <g id="k2_ground_shadow">
        <ellipse cx="190" cy="584" rx="108" ry="16" fill="url(#kGroundShadowRadial)" filter="url(#kGroundBlurFilter)" opacity="0.85" />
        <ellipse cx="190" cy="582" rx="72" ry="8.5" fill="url(#kGroundShadowRadial)" filter="url(#kSoftShadow)" opacity="0.65" />
      </g>

      {/* ── 2. ADORABLE CHUBBY BABY LEGS (PROPORTIONAL TO TORSO) ── */}
      <g id="k2_legs" filter="url(#kSoftShadow)">
        {/* Left Leg Pillar (Centered at X=142) */}
        <path d="M 142 495 C 138 524, 138 548, 142 566" fill="none" stroke="url(#k2_SkinLeg)" strokeWidth="30" strokeLinecap="round" />
        <path d="M 142 497 C 139 524, 139 548, 142 564" fill="none" stroke="#DCEBFF" strokeWidth="5.0" strokeLinecap="round" opacity="0.5" />

        {/* Right Leg Pillar (Centered at X=238) */}
        <path d="M 238 495 C 242 524, 242 548, 238 566" fill="none" stroke="url(#k2_SkinLeg)" strokeWidth="30" strokeLinecap="round" />
        <path d="M 238 497 C 241 524, 241 548, 238 564" fill="none" stroke="#DCEBFF" strokeWidth="5.0" strokeLinecap="round" opacity="0.5" />

        {/* Ambient Inseam Shadow between legs */}
        <ellipse cx="190" cy="510" rx="18" ry="24" fill="#1E3A8A" opacity="0.22" />
      </g>

      {/* ── 3. ADORABLE CHUBBY LOTUS FEET (CHARAN KAMAL) ── */}
      <g id="k2_feet" filter="url(#kSoftShadow)">
        {/* LEFT FOOT (Centered at X=142, Y=562) */}
        <g id="k2_leftFoot" transform="translate(142, 562)">
          <ellipse cx="0" cy="22" rx="16" ry="4.0" fill="url(#kGroundShadowRadial)" opacity="0.4" filter="url(#kSoftShadow)" />
          {/* Foot Base Silhouette */}
          <path
            d="M -7 0
               C -14 2, -17 10, -16 18
               C -16 22, -12 24.2, -10 23.0
               C -9.5 26.0, -6.0 26.8, -4.2 25.2
               C -3.2 27.8, 0.4 28.2, 2.6 26.4
               C 3.8 28.4, 8.0 28.6, 10.2 26.4
               C 11.4 28.0, 16.5 27.2, 16.5 21.6
               C 16.5 15.5, 12.5 6.5, -7 0 Z"
            fill="url(#kSkinLimb)"
          />
          {/* Instep Dome Volume Highlight */}
          <ellipse cx="-0.5" cy="11" rx="10.5" ry="7" fill="url(#kSkinHand)" opacity="0.75" />
          <ellipse cx="0" cy="9" rx="6" ry="3.5" fill="#FFFFFF" opacity="0.35" />

          {/* 5 Plump Rounded Baby Toes with Rosy Lotus Blush */}
          <circle cx="13.2" cy="20.5" r="4.6" fill="url(#kLotusToeBlush)" />
          <ellipse cx="12.8" cy="19.0" rx="2.2" ry="1.4" fill="#FFFFFF" opacity="0.65" />
          <circle cx="6.5" cy="22.8" r="4.1" fill="url(#kLotusToeBlush)" />
          <ellipse cx="6.2" cy="21.3" rx="1.9" ry="1.2" fill="#FFFFFF" opacity="0.55" />
          <circle cx="-0.8" cy="23.4" r="3.7" fill="url(#kLotusToeBlush)" />
          <ellipse cx="-1.0" cy="22.0" rx="1.7" ry="1.1" fill="#FFFFFF" opacity="0.5" />
          <circle cx="-7.2" cy="22.2" r="3.2" fill="url(#kLotusToeBlush)" />
          <ellipse cx="-7.4" cy="21.1" rx="1.5" ry="1.0" fill="#FFFFFF" opacity="0.45" />
          <circle cx="-12.6" cy="20.2" r="2.8" fill="url(#kLotusToeBlush)" />
          <ellipse cx="-12.7" cy="19.3" rx="1.1" ry="0.8" fill="#FFFFFF" opacity="0.4" />

          {/* Separation Creases */}
          <path d="M 9.8 23 C 9.5 19.2, 9.0 16.0, 8.8 13.8" fill="none" stroke="#1E3A8A" strokeWidth="1.2" strokeLinecap="round" opacity="0.35" />
          <path d="M 2.8 23.8 C 2.5 20.0, 2.2 16.8, 2.0 14.8" fill="none" stroke="#1E3A8A" strokeWidth="1.1" strokeLinecap="round" opacity="0.3" />
          <path d="M -4.0 23.2 C -4.1 19.8, -4.2 17.2, -4.3 15.5" fill="none" stroke="#1E3A8A" strokeWidth="1.0" strokeLinecap="round" opacity="0.28" />
          <path d="M -9.8 21.6 C -10.0 18.8, -10.2 16.6, -10.3 15.2" fill="none" stroke="#1E3A8A" strokeWidth="0.9" strokeLinecap="round" opacity="0.25" />

          {/* White Sandalwood Charan Chinha (Sacred Chakra) */}
          <g id="k2_chakraLeft" opacity="0.92">
            <circle cx="0" cy="12" r="1.4" fill="#FFFFFF" />
            <circle cx="0" cy="12" r="0.7" fill="#FDE047" opacity="0.9" />
            <circle cx="0" cy="12" r="3.2" fill="none" stroke="#FFFFFF" strokeWidth="0.7" opacity="0.9" />
            <circle cx="0" cy="12" r="5.4" fill="none" stroke="#FFFFFF" strokeWidth="0.9" strokeDasharray="1.5 1.0" opacity="0.95" />
            <line x1="0" y1="9.0" x2="0" y2="6.6" stroke="#FFFFFF" strokeWidth="0.7" strokeLinecap="round" />
            <line x1="0" y1="15.0" x2="0" y2="17.4" stroke="#FFFFFF" strokeWidth="0.7" strokeLinecap="round" />
            <line x1="-3.2" y1="12" x2="-5.4" y2="12" stroke="#FFFFFF" strokeWidth="0.7" strokeLinecap="round" />
            <line x1="3.2" y1="12" x2="5.4" y2="12" stroke="#FFFFFF" strokeWidth="0.7" strokeLinecap="round" />
          </g>
        </g>

        {/* RIGHT FOOT (Centered at X=238, Y=562) */}
        <g id="k2_rightFoot" transform="translate(238, 562)">
          <ellipse cx="0" cy="22" rx="16" ry="4.0" fill="url(#kGroundShadowRadial)" opacity="0.4" filter="url(#kSoftShadow)" />
          {/* Foot Base Silhouette */}
          <path
            d="M 7 0
               C 14 2, 17 10, 16 18
               C 16 22, 12 24.2, 10 23.0
               C 9.5 26.0, 6.0 26.8, 4.2 25.2
               C 3.2 27.8, -0.4 28.2, -2.6 26.4
               C -3.8 28.4, -8.0 28.6, -10.2 26.4
               C -11.4 28.0, -16.5 27.2, -16.5 21.6
               C -16.5 15.5, -12.5 6.5, 7 0 Z"
            fill="url(#kSkinLimb)"
          />
          {/* Instep Dome Volume Highlight */}
          <ellipse cx="0.5" cy="11" rx="10.5" ry="7" fill="url(#kSkinHand)" opacity="0.75" />
          <ellipse cx="0" cy="9" rx="6" ry="3.5" fill="#FFFFFF" opacity="0.35" />

          {/* 5 Plump Rounded Baby Toes with Rosy Lotus Blush */}
          <circle cx="-13.2" cy="20.5" r="4.6" fill="url(#kLotusToeBlush)" />
          <ellipse cx="-12.8" cy="19.0" rx="2.2" ry="1.4" fill="#FFFFFF" opacity="0.65" />
          <circle cx="-6.5" cy="22.8" r="4.1" fill="url(#kLotusToeBlush)" />
          <ellipse cx="-6.2" cy="21.3" rx="1.9" ry="1.2" fill="#FFFFFF" opacity="0.55" />
          <circle cx="0.8" cy="23.4" r="3.7" fill="url(#kLotusToeBlush)" />
          <ellipse cx="1.0" cy="22.0" rx="1.7" ry="1.1" fill="#FFFFFF" opacity="0.5" />
          <circle cx="7.2" cy="22.2" r="3.2" fill="url(#kLotusToeBlush)" />
          <ellipse cx="7.4" cy="21.1" rx="1.5" ry="1.0" fill="#FFFFFF" opacity="0.45" />
          <circle cx="12.6" cy="20.2" r="2.8" fill="url(#kLotusToeBlush)" />
          <ellipse cx="12.7" cy="19.3" rx="1.1" ry="0.8" fill="#FFFFFF" opacity="0.4" />

          {/* Separation Creases */}
          <path d="M -9.8 23 C -9.5 19.2, -9.0 16.0, -8.8 13.8" fill="none" stroke="#1E3A8A" strokeWidth="1.2" strokeLinecap="round" opacity="0.35" />
          <path d="M -2.8 23.8 C -2.5 20.0, -2.2 16.8, -2.0 14.8" fill="none" stroke="#1E3A8A" strokeWidth="1.1" strokeLinecap="round" opacity="0.3" />
          <path d="M 4.0 23.2 C 4.1 19.8, 4.2 17.2, 4.3 15.5" fill="none" stroke="#1E3A8A" strokeWidth="1.0" strokeLinecap="round" opacity="0.28" />
          <path d="M 9.8 21.6 C 10.0 18.8, 10.2 16.6, 10.3 15.2" fill="none" stroke="#1E3A8A" strokeWidth="0.9" strokeLinecap="round" opacity="0.25" />

          {/* White Sandalwood Charan Chinha (Sacred Chakra) */}
          <g id="k2_chakraRight" opacity="0.92">
            <circle cx="0" cy="12" r="1.4" fill="#FFFFFF" />
            <circle cx="0" cy="12" r="0.7" fill="#FDE047" opacity="0.9" />
            <circle cx="0" cy="12" r="3.2" fill="none" stroke="#FFFFFF" strokeWidth="0.7" opacity="0.9" />
            <circle cx="0" cy="12" r="5.4" fill="none" stroke="#FFFFFF" strokeWidth="0.9" strokeDasharray="1.5 1.0" opacity="0.95" />
            <line x1="0" y1="9.0" x2="0" y2="6.6" stroke="#FFFFFF" strokeWidth="0.7" strokeLinecap="round" />
            <line x1="0" y1="15.0" x2="0" y2="17.4" stroke="#FFFFFF" strokeWidth="0.7" strokeLinecap="round" />
            <line x1="-3.2" y1="12" x2="-5.4" y2="12" stroke="#FFFFFF" strokeWidth="0.7" strokeLinecap="round" />
            <line x1="3.2" y1="12" x2="5.4" y2="12" stroke="#FFFFFF" strokeWidth="0.7" strokeLinecap="round" />
          </g>
        </g>
      </g>

      {/* ── 4. ROYAL GHUNGROO PAYAL ANKLETS ── */}
      <g id="k2_royalAnklets" className={styles.ankletLayer}>
        {/* Left Anklet */}
        <g id="k2_leftAnklet">
          <ellipse cx="142" cy="558" rx="18" ry="6.5" fill="#0C1A38" opacity="0.45" />
          <path
            d="M 125 554 C 130 558, 154 558, 159 554 C 159 561, 154 565, 142 565 C 130 565, 125 561, 125 554 Z"
            fill="url(#kPayalGold)"
            stroke="#78350F"
            strokeWidth="0.8"
          />
          <path d="M 127 556 C 132 560, 152 560, 157 556" fill="none" stroke="#FFFDF0" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
          {/* Upper Pearls */}
          {[126, 131, 136.5, 142, 147.5, 153, 158].map((bx, i) => (
            <circle key={`la-ub-${i}`} cx={bx} cy={555 + (i === 3 ? 3.5 : i === 2 || i === 4 ? 3.0 : i === 1 || i === 5 ? 1.8 : 0)} r="1.4" fill="url(#kGoldBead)" stroke="#78350F" strokeWidth="0.35" />
          ))}
          {/* Center Ruby */}
          <circle cx="142" cy="561" r="3.0" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.5" />
          <circle cx="142" cy="561" r="2.2" fill="url(#kPayalRuby)" stroke="#7F1D1D" strokeWidth="0.4" />
          <circle cx="141.3" cy="560.4" r="0.8" fill="#FFFFFF" opacity="0.95" />
          {/* Ghungroo Bells */}
          {[128, 132.5, 137.2, 142, 146.8, 151.5, 156].map((bx, i) => {
            const isCenter = i === 3;
            const r = isCenter ? 3.0 : 2.5;
            const by = 564 + (isCenter ? 3.2 : i === 2 || i === 4 ? 2.4 : i === 1 || i === 5 ? 1.1 : 0);
            return (
              <g key={`la-bell-${i}`}>
                <circle cx={bx} cy={by} r={r} fill="url(#kPayalBellDome)" stroke="#78350F" strokeWidth="0.5" />
                <circle cx={bx} cy={by + r + 0.8} r={isCenter ? 1.3 : 1.0} fill="url(#kPayalPearl)" stroke="#B45309" strokeWidth="0.3" />
                <circle cx={bx - r * 0.35} cy={by - r * 0.35} r={r * 0.35} fill="#FFFFFF" opacity="0.95" />
              </g>
            );
          })}
        </g>

        {/* Right Anklet */}
        <g id="k2_rightAnklet">
          <ellipse cx="238" cy="558" rx="18" ry="6.5" fill="#0C1A38" opacity="0.45" />
          <path
            d="M 221 554 C 226 558, 250 558, 255 554 C 255 561, 250 565, 238 565 C 226 565, 221 561, 221 554 Z"
            fill="url(#kPayalGold)"
            stroke="#78350F"
            strokeWidth="0.8"
          />
          <path d="M 223 556 C 228 560, 248 560, 253 556" fill="none" stroke="#FFFDF0" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
          {/* Upper Pearls */}
          {[222, 227, 232.5, 238, 243.5, 249, 254].map((bx, i) => (
            <circle key={`ra-ub-${i}`} cx={bx} cy={555 + (i === 3 ? 3.5 : i === 2 || i === 4 ? 3.0 : i === 1 || i === 5 ? 1.8 : 0)} r="1.4" fill="url(#kGoldBead)" stroke="#78350F" strokeWidth="0.35" />
          ))}
          {/* Center Ruby */}
          <circle cx="238" cy="561" r="3.0" fill="url(#kGoldGrad)" stroke="#78350F" strokeWidth="0.5" />
          <circle cx="238" cy="561" r="2.2" fill="url(#kPayalRuby)" stroke="#7F1D1D" strokeWidth="0.4" />
          <circle cx="237.3" cy="560.4" r="0.8" fill="#FFFFFF" opacity="0.95" />
          {/* Ghungroo Bells */}
          {[224, 228.5, 233.2, 238, 242.8, 247.5, 252].map((bx, i) => {
            const isCenter = i === 3;
            const r = isCenter ? 3.0 : 2.5;
            const by = 564 + (isCenter ? 3.2 : i === 2 || i === 4 ? 2.4 : i === 1 || i === 5 ? 1.1 : 0);
            return (
              <g key={`ra-bell-${i}`}>
                <circle cx={bx} cy={by} r={r} fill="url(#kPayalBellDome)" stroke="#78350F" strokeWidth="0.5" />
                <circle cx={bx} cy={by + r + 0.8} r={isCenter ? 1.3 : 1.0} fill="url(#kPayalPearl)" stroke="#B45309" strokeWidth="0.3" />
                <circle cx={bx - r * 0.35} cy={by - r * 0.35} r={r * 0.35} fill="#FFFFFF" opacity="0.95" />
              </g>
            );
          })}
        </g>
      </g>

      {/* ── 5. VOLUMETRIC FULL-BODIED SILKEN DHOTI (MATCHING REFERENCE IMAGE SCALE) ── */}
      <g id="k2_dhoti" filter="url(#kSoftShadow)">
        {/* ── Left & Right Leg Fabric Wraps (Flaring outwards to hips X=96..284) ── */}
        <g id="k2_dhotiLegWraps">
          {/* LEFT LEG FABRIC DRAPE (Puffy toddler pantaloons draping centered at X=142) */}
          <path
            d="M 116 394
               C 96 430, 94 476, 108 522
               C 114 534, 128 538, 146 538
               C 166 538, 178 530, 182 516
               C 184 486, 184 448, 188 406
               C 166 394, 138 386, 116 394 Z"
            fill="url(#k2_DhotiLeftMass)"
            stroke="#D87900"
            strokeWidth="0.9"
          />
          {/* Left Mass Highlight */}
          <path
            d="M 120 404
               C 104 438, 104 478, 118 512
               C 126 528, 138 532, 150 532
               C 142 516, 134 494, 130 470
               C 126 442, 124 420, 120 404 Z"
            fill="#FFD95A"
            opacity="0.55"
          />

          {/* RIGHT LEG FABRIC DRAPE (Puffy toddler pantaloons draping centered at X=238) */}
          <path
            d="M 264 394
               C 284 430, 286 476, 272 522
               C 266 534, 252 538, 234 538
               C 214 538, 202 530, 198 516
               C 196 486, 196 448, 192 406
               C 214 394, 242 386, 264 394 Z"
            fill="url(#k2_DhotiRightMass)"
            stroke="#D87900"
            strokeWidth="0.9"
          />
          {/* Right Mass Shading */}
          <path
            d="M 260 406
               C 274 440, 276 480, 266 512
               C 258 528, 248 532, 238 532
               C 248 518, 256 498, 260 478
               C 264 450, 264 426, 260 406 Z"
            fill="#B85C00"
            opacity="0.3"
          />

          {/* Central Inseam Separation Shadow */}
          <path
            d="M 182 516
               C 186 490, 188 456, 189 416
               C 191 416, 194 456, 198 516
               C 194 506, 191 500, 190 500
               C 189 500, 186 506, 182 516 Z"
            fill="#A85000"
            opacity="0.32"
          />
        </g>

        {/* ── Side Folds & Deep Silk Creases ── */}
        <g id="k2_dhotiSideFolds">
          {/* Left Thigh Wrap Fold 1 */}
          <path
            d="M 112 416
               C 134 444, 160 470, 182 484
               C 184 490, 180 496, 172 494
               C 150 480, 124 450, 108 422 Z"
            fill="url(#kDhotiFoldL1Grad)"
            stroke="#D87900"
            strokeWidth="0.8"
          />
          <path d="M 114 418 C 136 444, 160 468, 178 482" fill="none" stroke="#FFD95A" strokeWidth="2.6" strokeLinecap="round" opacity="0.8" />

          {/* Left Thigh Wrap Fold 2 */}
          <path
            d="M 108 460
               C 126 492, 150 518, 174 530
               C 176 534, 172 538, 164 536
               C 142 522, 120 492, 104 464 Z"
            fill="url(#kDhotiFoldL2Grad)"
            stroke="#D87900"
            strokeWidth="0.8"
          />
          <path d="M 110 462 C 128 492, 150 516, 168 526" fill="none" stroke="#FFD95A" strokeWidth="2.4" strokeLinecap="round" opacity="0.75" />

          {/* Right Thigh Wrap Fold 1 */}
          <path
            d="M 268 416
               C 246 444, 220 470, 198 484
               C 196 490, 200 496, 208 494
               C 230 480, 256 450, 272 422 Z"
            fill="url(#kDhotiFoldR1Grad)"
            stroke="#D87900"
            strokeWidth="0.8"
          />
          <path d="M 266 418 C 244 444, 220 468, 202 482" fill="none" stroke="#FFD95A" strokeWidth="2.6" strokeLinecap="round" opacity="0.8" />

          {/* Right Thigh Wrap Fold 2 */}
          <path
            d="M 272 466
               C 254 498, 228 522, 208 532
               C 206 536, 212 540, 222 538
               C 244 528, 266 500, 276 474 Z"
            fill="url(#kDhotiFoldR2Grad)"
            stroke="#D87900"
            strokeWidth="0.8"
          />
          <path d="M 270 468 C 252 498, 228 520, 212 530" fill="none" stroke="#FFD95A" strokeWidth="2.2" strokeLinecap="round" opacity="0.65" />
        </g>

        {/* ── Central Cascading Pleats with Gold Highlights ── */}
        <g id="k2_dhotiCentralPleats">
          {/* Center-Left Pleat */}
          <path
            d="M 182 396
               C 178 430, 175 466, 173 502
               C 176 510, 181 510, 183 502
               C 185 466, 187 430, 186 396 Z"
            fill="url(#kDhotiPleatMidGrad)"
            stroke="#D87900"
            strokeWidth="0.8"
          />
          <path d="M 183 398 C 179 430, 176 466, 174 498" fill="none" stroke="#FFD95A" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />

          {/* Center-Right Pleat */}
          <path
            d="M 198 396
               C 202 430, 205 466, 207 502
               C 204 510, 199 510, 197 502
               C 195 466, 193 430, 194 396 Z"
            fill="url(#kDhotiPleatMidGrad)"
            stroke="#D87900"
            strokeWidth="0.8"
          />
          <path d="M 197 398 C 201 430, 204 466, 206 498" fill="none" stroke="#FFD95A" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />

          {/* Main Central Foreground Pleat */}
          <path
            d="M 186 394
               C 185 426, 185 458, 187 490
               C 189 496, 195 496, 197 490
               C 199 458, 199 426, 198 394 Z"
            fill="url(#kDhotiPleatTopGrad)"
            stroke="#D87900"
            strokeWidth="0.9"
          />
          <path d="M 188 396 C 187 426, 187 458, 189 486" fill="none" stroke="#FFFFFF" strokeWidth="2.0" strokeLinecap="round" opacity="0.9" />
        </g>

        {/* ── Lower Ankle Cuff Gold Piping ── */}
        <g id="k2_dhotiHemAccents">
          <path d="M 114 526 C 124 536, 140 536, 154 536 C 166 536, 174 530, 178 518" fill="none" stroke="#FFD95A" strokeWidth="2.4" strokeLinecap="round" opacity="0.9" />
          <path d="M 202 518 C 206 530, 214 536, 226 536 C 240 536, 256 536, 266 526" fill="none" stroke="#FFD95A" strokeWidth="2.4" strokeLinecap="round" opacity="0.9" />
        </g>

        {/* ── Flowing Saffron Silk Side Drape (Patka/Sash on Right Hip) ── */}
        <g id="k2_orangeSash">
          <path
            d="M 238 386
               C 238 440, 240 492, 242 536
               C 248 546, 276 546, 278 536
               C 276 490, 272 440, 270 386 Z"
            fill="#B93D00"
            opacity="0.38"
          />
          {/* Outer Main Drape */}
          <path
            d="M 256 384
               C 256 440, 259 492, 262 536
               C 266 544, 277 542, 278 534
               C 276 486, 272 440, 270 384 Z"
            fill="url(#kDhotiOrangeSash1)"
            stroke="#B93D00"
            strokeWidth="0.8"
          />
          <path d="M 264 388 C 264 442, 267 494, 269 534" fill="none" stroke="#FF9A2E" strokeWidth="2.4" strokeLinecap="round" opacity="0.85" />
          {/* Inner Drape */}
          <path
            d="M 242 386
               C 241 442, 243 496, 245 538
               C 249 546, 260 544, 260 536
               C 258 488, 255 444, 254 386 Z"
            fill="url(#kDhotiOrangeSash2)"
            stroke="#B93D00"
            strokeWidth="0.8"
          />
          <path d="M 252 390 C 251 444, 252 498, 254 536" fill="none" stroke="#FF7A00" strokeWidth="2.2" strokeLinecap="round" opacity="0.9" />
        </g>

        {/* ── 6. BRIGHT SAFFRON WAISTBAND BELT (MATCHING BRIGHT SAFFRON DRAPE) ── */}
        <g id="k2_brightSaffronBeltGroup">
          {/* 3D Bright Saffron Waistband Sash Band */}
          <path
            d="M 114 386
               C 152 374, 228 374, 266 386
               C 268 400, 228 412, 190 412
               C 152 412, 112 400, 114 386 Z"
            fill="url(#k2_BrightSaffronBelt)"
            stroke="#A33200"
            strokeWidth="0.9"
          />

          {/* Saffron Belt Top Rolled Edge Highlight */}
          <path
            d="M 114 386 C 152 374, 228 374, 266 386"
            fill="none"
            stroke="url(#k2_SaffronTopRim)"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          {/* Specular Glint along Top Edge */}
          <path
            d="M 148 380 C 174 376, 206 376, 232 380"
            fill="none"
            stroke="#FFF4E0"
            strokeWidth="1.3"
            strokeLinecap="round"
            opacity="0.92"
          />

          {/* Saffron Belt Bottom Edge Deep Piping */}
          <path
            d="M 114 400 C 152 412, 228 412, 266 400"
            fill="none"
            stroke="#8F2400"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Hanging Teardrop Saffron-Gold Pendant Accent */}
          <g id="k2_beltPendant" transform="translate(190, 408)">
            <path d="M -3.5 0 L 0 10.5 L 3.5 0 Z" fill="url(#k2_BrightSaffronBelt)" stroke="#A33200" strokeWidth="0.6" />
            <circle cx="0" cy="11.4" r="1.6" fill="#FFF4E0" stroke="#FF7A00" strokeWidth="0.4" />
          </g>
        </g>
      </g>
    </g>
  );
};
