import React from 'react';

// ════════════════ MASTER SCALE SYSTEM ════════════════
// Maps the 1000-unit master specification to the existing SVG 140-unit shoulder coordinate space.
export const MASTER_SCALE = 1.0;
export const u = (val: number) => val;

export const ARM_SPEC = {
  // Shared arm anchor positions relative to character center (X=190)
  // Calibrated to exact krishna2_base.png hollow shoulder sockets: (89, 310) & (291, 310)
  shoulderPivotOffset: 101,
  shoulderPivotY: 310,

  // Upper Arm (Humerus extension emerging seamlessly from PNG shoulder socket)
  upper: {
    len: 56, topW: 44, maxW: 44, botW: 31, ov: 6, depth: 28
  },
  elbow: {
    blendW: 31
  },
  forearm: {
    len: 58, topW: 31, maxW: 31, botW: 22, ov: 6, depth: 24
  },
  wrist: {
    width: 22
  },
  hand: {
    palm: { w: 28, h: 28, wristW: 22, heelW: 24, transitionL: 8, d: 20 },
    knuckle: { w: 26, h: 11, d: 18 },
    thumb: { l: 17, base: 8.5, tip: 5.5 },
    index: { l: 19, base: 7.5, tip: 4.8 },
    middle: { l: 21, base: 7.5, tip: 4.8 },
    ring: { l: 18, base: 7, tip: 4.6 },
    little: { l: 15, base: 6.5, tip: 4.3 }
  }
};

export const ParametricUpperArm = ({ isFlipped = false }: { isFlipped?: boolean }) => {
  const { len, maxW, botW, ov } = ARM_SPEC.upper;
  const topW = maxW;
  const t = topW / 2;
  const m = maxW / 2;
  const b = botW / 2;

  // Shoulder cap extends smoothly into the PNG shoulder deltoid socket
  const capH = 22;
  const axillaOverlap = 6;

  // Upper arm path ending with continuous anatomical elbow taper
  const path = `
    M ${-t} 0 
    C ${-m} ${len * 0.35}, ${-b} ${len * 0.75}, ${-b} ${len} 
    C ${-b} ${len + ov * 0.6}, ${-b * 0.5} ${len + ov}, 0 ${len + ov}
    C ${b * 0.5} ${len + ov}, ${b} ${len + ov * 0.6}, ${b} ${len} 
    C ${b} ${len * 0.75}, ${m} ${len * 0.35}, ${t} 0 
    C ${t} ${-capH * 0.8}, ${t * 0.5} ${-capH}, 0 ${-capH}
    C ${-t * 0.8} ${-capH}, ${-t - axillaOverlap} ${-capH * 0.5}, ${-t} 0 
    Z`;

  // Directional 3D volumetric lighting matching krishna2_base.png
  const hl = `M ${-m * 0.28} 4 C ${-m * 0.22} ${len * 0.35}, ${-b * 0.18} ${len * 0.75}, ${-b * 0.12} ${len + ov * 0.4}`;
  const softShadow = `M ${m * 0.68} 10 C ${m * 0.68} ${len * 0.4}, ${b * 0.68} ${len * 0.8}, ${b * 0.58} ${len + ov * 0.4}`;

  const transform = isFlipped ? 'scale(-1, 1)' : '';

  return (
    <g className="parametric-upper-arm">
      {/* Continuous Toddler Skin Fill blending into PNG shoulder stub */}
      <path d={path} fill="url(#k2_ArmSkinBase)" transform={transform} />
      <path d={path} fill="url(#k2_ArmSkinGrad)" transform={transform} />

      {/* Shoulder Cap Smooth Overlap Blend into Torso Socket */}
      <circle cx={0} cy={0} r={t} fill="url(#k2_ArmSkinBase)" transform={transform} />
      <circle cx={0} cy={0} r={t} fill="url(#k2_ArmSkinGrad)" transform={transform} />

      {/* Soft Volumetric Longitudinal Highlight */}
      <path d={hl} fill="none" stroke="#B6D8FF" strokeWidth={u(5.0)} strokeLinecap="round" opacity="0.28" transform={transform} />
      {/* Soft Medial Underside Shading */}
      <path d={softShadow} fill="none" stroke="#2554B0" strokeWidth={u(3.2)} strokeLinecap="round" opacity="0.22" transform={transform} />

      {/* ── Refined Gold Upper Armlet (Keyur / Bajuband) matching Necklace ── */}
      <g className="upper-armlet" transform={transform}>
        <path
          d={`M ${-m * 0.88} ${len * 0.36} C ${-m * 0.45} ${len * 0.44}, ${m * 0.45} ${len * 0.44}, ${m * 0.88} ${len * 0.36}`}
          fill="none"
          stroke="#1D4494"
          strokeWidth={u(3.0)}
          opacity="0.24"
        />
        <path
          d={`M ${-m * 0.86} ${len * 0.34} C ${-m * 0.45} ${len * 0.42}, ${m * 0.45} ${len * 0.42}, ${m * 0.86} ${len * 0.34}`}
          fill="none"
          stroke="url(#kJewelGoldGrad)"
          strokeWidth={u(4.4)}
          strokeLinecap="round"
        />
        <path
          d={`M ${-m * 0.68} ${len * 0.335} C ${-m * 0.35} ${len * 0.41}, ${m * 0.35} ${len * 0.41}, ${m * 0.68} ${len * 0.335}`}
          fill="none"
          stroke="url(#kJewelGoldLight)"
          strokeWidth={u(1.3)}
          strokeLinecap="round"
          opacity="0.95"
        />
        <circle cx={0} cy={len * 0.38} r={u(2.8)} fill="url(#kJewelGoldGrad)" stroke="#92400E" strokeWidth={u(0.4)} />
        <circle cx={0} cy={len * 0.38} r={u(1.8)} fill="url(#kJewelRuby)" stroke="url(#kJewelGoldGrad)" strokeWidth={u(0.5)} />
        <circle cx={-u(0.5)} cy={len * 0.37} r={u(0.55)} fill="#FFFFFF" opacity="0.9" />
      </g>
    </g>
  );
};

export const ParametricForearm = () => {
  const { len, topW, maxW, botW, ov } = ARM_SPEC.forearm;
  const t = topW / 2;
  const m = maxW / 2;
  const b = botW / 2;

  // Forearm path starting at -ov with continuous anatomical taper through elbow pivot
  const path = `
    M 0 ${-ov}
    C ${-t * 0.5} ${-ov}, ${-t} ${-ov * 0.6}, ${-t} 0 
    C ${-m} ${len * 0.35}, ${-b} ${len * 0.75}, ${-b} ${len} 
    L ${b} ${len} 
    C ${b} ${len * 0.75}, ${m} ${len * 0.35}, ${t} 0 
    C ${t} ${-ov * 0.6}, ${t * 0.5} ${-ov}, 0 ${-ov} 
    Z`;

  // Highlight flowing from top overlap through forearm
  const hl = `M ${-t * 0.15} ${-ov * 0.4} C 0 ${len * 0.3}, 0 ${len * 0.7}, 0 ${len - 3}`;
  const softShadow = `M ${m * 0.68} ${-ov * 0.4} C ${m * 0.68} ${len * 0.4}, ${b * 0.68} ${len * 0.8}, ${b * 0.58} ${len - 4}`;

  return (
    <g className="parametric-forearm">
      {/* Continuous Toddler Skin Fill */}
      <path d={path} fill="url(#k2_ArmSkinBase)" />
      <path d={path} fill="url(#k2_ArmSkinGrad)" />

      {/* Forearm Top Circular Overlap into Elbow Joint with smooth radial skin gradient blending */}
      <circle cx={0} cy={0} r={t} fill="url(#k2_ElbowJointSkinGrad)" />
      <circle cx={0} cy={0} r={t} fill="url(#k2_ArmSkinGrad)" />

      {/* Seamless Highlight flowing along arm vector */}
      <path d={hl} fill="none" stroke="#B6D8FF" strokeWidth={u(4.2)} strokeLinecap="round" opacity="0.28" />
      {/* Soft Underside Shadow */}
      <path d={softShadow} fill="none" stroke="#2554B0" strokeWidth={u(2.6)} strokeLinecap="round" opacity="0.22" />

      {/* Seamless Forearm-to-Wrist Highlight Transition */}
      <ellipse cx={0} cy={len - u(1)} rx={b * 0.75} ry={u(2.2)} fill="#B6D8FF" opacity="0.2" />

      {/* ── Subtle Forearm Vertical Vaishnav Motif ── */}
      <g className="forearm-vaishnav-mark" transform={`translate(0, ${len - u(15)})`}>
        <path
          d={`M ${-u(1.0)} ${-u(5)} L ${-u(1.0)} ${u(3.5)} C ${-u(1.0)} ${u(5.8)}, ${u(1.0)} ${u(5.8)}, ${u(1.0)} ${u(3.5)} L ${u(1.0)} ${-u(5)} Z`}
          fill="url(#kVaishnavIvory)"
          opacity="0.82"
        />
        <circle cx={0} cy={u(1.2)} r={u(0.8)} fill="#FFD45A" />
      </g>
    </g>
  );
};

export const ParametricDigit = ({
  len,
  baseW,
  tipW,
  transform,
  isChakraInteraction = false,
}: {
  len: number;
  baseW: number;
  tipW: number;
  transform?: string;
  isChakraInteraction?: boolean;
}) => {
  const b = baseW / 2;
  const t = tipW / 2;
  // Digits start slightly inside the knuckle (Y = -u(5)) to guarantee seamless structural overlap (4-6 units overlap spec)
  const path = `M ${-b} ${-u(5)} C ${-b} ${len*0.3}, ${-t} ${len*0.7}, ${-t} ${len} C ${-t} ${len+t*1.5}, ${t} ${len+t*1.5}, ${t} ${len} C ${t} ${len*0.7}, ${b} ${len*0.3}, ${b} ${-u(5)} Z`;

  return (
    <g className="parametric-digit" transform={transform}>
      {/* Continuous Base Skin */}
      <path d={path} fill="url(#k2_ArmSkinBase)" />
      {/* Longitudinal Finger Volume Shading */}
      <path d={path} fill="url(#kFingerLongitudinal)" />
      {/* Subtle Inner/Palm-Side Finger Pad Warmth */}
      <path d={path} fill="url(#kFingerPadPinkWarmth)" />

      {/* Longitudinal Volume Highlight */}
      <path
        d={`M 0 0 C 0.8 ${len*0.4}, 0.8 ${len*0.8}, 0 ${len - u(3)}`}
        fill="none"
        stroke="#B6D8FF"
        strokeWidth={u(2.2)}
        strokeLinecap="round"
        opacity="0.3"
      />
      {/* Soft Shadow Side */}
      <path
        d={`M ${b*0.6} ${len*0.2} C ${b*0.6} ${len*0.5}, ${t*0.7} ${len*0.8}, ${t*0.6} ${len - u(2)}`}
        fill="none"
        stroke="#2554B0"
        strokeWidth={u(1.7)}
        strokeLinecap="round"
        opacity="0.22"
      />

      {/* Finger Root Blending (first 4-6 units subtle shadow into knuckle) */}
      <path
        d={`M ${-b*0.8} ${-u(3)} Q 0 ${-u(1)}, ${b*0.8} ${-u(3)}`}
        fill="none"
        stroke="#4E82D1"
        strokeWidth={u(1.5)}
        strokeLinecap="round"
        opacity="0.22"
      />

      {/* Soft Rounded Fingertip Highlight with Subtle Warmth */}
      <ellipse cx={0} cy={len - u(0.5)} rx={t * 0.7} ry={t * 0.85} fill="url(#kFingertipSubtleWarmth)" />
      {/* Fingertip Underside Shadow */}
      <ellipse cx={0} cy={len + t * 0.8} rx={t * 0.5} ry={t * 0.4} fill="#4E82D1" opacity="0.2" />

      {/* Subtle Local Reflected Warm Gold Light from Luminous Sudarshan Chakra */}
      {isChakraInteraction && (
        <g className="chakra-contact-reflection">
          <ellipse cx={0} cy={len - u(0.5)} rx={t * 0.9} ry={t * 1.15} fill="#FFD45A" opacity="0.32" />
          <circle cx={0} cy={len} r={t * 0.75} fill="#F5A900" opacity="0.25" />
          <circle cx={0} cy={len} r={t * 0.45} fill="#315EA8" opacity="0.12" />
        </g>
      )}
    </g>
  );
};

export type ArmFingersConfig = { thumb: number; index: number; middle: number; ring: number; little: number };

export type HandSide = 'characterLeft' | 'characterRight' | 'left' | 'right';

export type HandLayerPart = 'all' | 'thumbOnly' | 'withoutThumb' | 'chakraIndexTip';

export interface ParametricHandProps {
  side?: HandSide;
  isFlipped?: boolean;
  fingers?: ArmFingersConfig;
  totalArmAngle?: number;
  handLayer?: HandLayerPart;
  dx?: number;
}

/**
 * ════════════════ MASTER HAND ANATOMICAL SYSTEM ════════════════
 * Single anatomical source of truth for both hands.
 * Semantic Finger Identities: THUMB, INDEX, MIDDLE, RING, LITTLE.
 * Invariant master dimensions & finger order.
 * Continuous skin blending from arm → wrist → palm → fingers.
 */
export const ParametricHand = ({
  side,
  isFlipped = false,
  fingers,
  totalArmAngle = 0,
  handLayer = 'all',
  dx = 0,
}: ParametricHandProps) => {
  const { palm, knuckle, thumb, index, middle, ring, little } = ARM_SPEC.hand;
  const f = fingers || { thumb: 0, index: 0, middle: 0, ring: 0, little: 0 };

  // Character's Right Hand vs Left Hand base handedness
  const isLeftHand = side === 'characterLeft' || side === 'left';
  const isRightHand = !isLeftHand;

  // Determine if the forearm vector points upwards in SVG space (-Y direction)
  const normalizedAngle = ((totalArmAngle % 360) + 540) % 360 - 180;
  const isArmPointingUp = Math.cos((normalizedAngle * Math.PI) / 180) < 0;

  // Preserve medial thumb orientation (pointing towards hair/centerline):
  const shouldMirror = isRightHand ? (isArmPointingUp || isFlipped) : !isArmPointingUp;

  const transformParts = [];
  if (dx) transformParts.push(`translate(${dx}, 0)`);
  if (shouldMirror) transformParts.push(`scale(-1, 1)`);
  const finalTransform = transformParts.length > 0 ? transformParts.join(' ') : undefined;

  // Master Hand Measurements (scaled by u)
  const w = palm.wristW / 2;       // Wrist half width: u(12)
  const pW = palm.w / 2;           // Palm half width: u(24)
  const heel = palm.heelW / 2;     // Palm heel half width: u(17)
  const h = palm.h;                // Palm height: u(54)
  const kW = knuckle.w / 2;        // Knuckle half width: u(23)
  const kH = knuckle.h / 2;        // Knuckle half height: u(9)

  // ════════════════ CANONICAL MASTER HAND LOCAL COORDINATE SYSTEM ════════════════
  // Hand extends down +Y axis.
  // Radial / Thumb side is at +X (medial / hair side).
  // Ulnar / Little-finger side is at -X (lateral / outer side).

  // 1. Biological Palm Base Contour
  const palmPath = `M ${-w} ${-u(7)} 
    C ${-heel} ${u(10)}, ${-pW} ${h * 0.4}, ${-pW * 0.95} ${h} 
    C ${-pW * 0.5} ${h + u(2)}, ${pW * 0.5} ${h + u(2)}, ${pW * 0.95} ${h} 
    C ${pW} ${h * 0.4}, ${heel} ${u(10)}, ${w} ${-u(7)} Z`;

  // 2. Knuckle Mass (blending palm to digit roots)
  const knucklePath = `M ${-kW} ${h - u(4)} 
    C ${-kW * 1.1} ${h + kH}, ${kW * 1.1} ${h + kH}, ${kW} ${h - u(4)} Z`;

  // 3. Thenar Eminence (Thumb base mass) on +X (Thumb/Radial) side
  const thenarPath = `M ${w} ${-u(3)} 
    C ${pW * 1.6} ${h * 0.3}, ${pW * 1.5} ${h * 0.65}, ${pW * 0.7} ${h * 0.85} 
    C ${pW * 0.2} ${h * 0.6}, 0 ${h * 0.3}, ${w} ${-u(3)} Z`;

  // 4. Hypothenar Mass (Little-finger base mass) on -X (Little/Ulnar) side
  const hypothenarPath = `M ${-w} ${-u(3)} 
    C ${-pW * 1.3} ${h * 0.3}, ${-pW * 1.1} ${h * 0.75}, ${-pW * 0.5} ${h * 0.85} 
    C ${-pW * 0.1} ${h * 0.6}, 0 ${h * 0.3}, ${-w} ${-u(3)} Z`;

  // 5. Thumb & Digits placement in invariant anatomical order:
  // LITTLE (-X) -> RING -> MIDDLE -> INDEX -> THUMB (+X / hair side)
  const litX = -u(10.5);
  const rngX = -u(3.5);
  const midX = u(3.5);
  const idxX = u(10.5);

  // Thumb positioned on +X Thenar base (pointing gracefully inward towards hair/index)
  const thumbTransform = `translate(${pW * 0.92}, ${h * 0.52}) rotate(${-40 - f.thumb})`;

  const showThumb = handLayer === 'all' || handLayer === 'thumbOnly';
  const showMainHand = handLayer === 'all' || handLayer === 'withoutThumb';
  const showChakraTip = handLayer === 'chakraIndexTip';

  // If rendering ONLY the chakra fingertip in front of the chakra disc:
  if (showChakraTip) {
    return (
      <g
        className="parametric-hand-chakra-tip"
        transform={finalTransform}
      >
        <g transform={`translate(${idxX}, ${h - u(3)}) rotate(${-4 + f.index})`}>
          {/* Index fingertip spinning pad in front of chakra hub */}
          <ellipse cx={0} cy={index.l - u(0.5)} rx={(index.tip / 2) * 0.75} ry={(index.tip / 2) * 0.9} fill="url(#kFingertipSoftGlow)" />
          <circle cx={0} cy={index.l} r={(index.tip / 2) * 0.6} fill="#315EA8" opacity="0.18" />
        </g>
      </g>
    );
  }

  return (
    <g
      className={`parametric-hand ${isLeftHand ? 'hand-character-left' : 'hand-character-right'}`}
      transform={finalTransform}
    >
      {/* ── THUMB (when thumbOnly or all) ── */}
      {showThumb && (
        <ParametricDigit
          len={thumb.l}
          baseW={thumb.base}
          tipW={thumb.tip}
          transform={thumbTransform}
          isChakraInteraction={!isLeftHand && isArmPointingUp}
        />
      )}

      {/* ── PALM, KNUCKLES & 4 FINGERS (when withoutThumb or all) ── */}
      {showMainHand && (
        <>
          <g className="palm-volume">
            {/* Seamless Wrist Transition Highlight */}
            <ellipse cx={0} cy={-u(3)} rx={w * 0.7} ry={u(2.5)} fill="#B6D8FF" opacity="0.2" />

            {/* Continuous Base Skin */}
            <path d={palmPath} fill="url(#k2_ArmSkinBase)" />
            <path d={knucklePath} fill="url(#k2_ArmSkinBase)" />
            <path d={thenarPath} fill="url(#k2_ArmSkinBase)" />
            <path d={hypothenarPath} fill="url(#k2_ArmSkinBase)" />

            {/* 3D Volumetric Soft Shading (No harsh crease strokes on back of hand) */}
            <path d={palmPath} fill="url(#kPalmCentralGlow)" />
            <path d={thenarPath} fill="url(#kThenarSoftGlow)" />

            {/* ── Natural Palm Warm Pink Undertone (Localized Soft Radial Gradients) ── */}
            <path d={palmPath} fill="url(#kPalmCentralPinkGlow)" />
            <path d={thenarPath} fill="url(#kThenarPinkWarmth)" />
            {/* Subtle Contact Shadow in Interdigital Clefts */}
            <circle cx={(litX + rngX) / 2} cy={h - u(4)} r={u(1.4)} fill="#2554B0" opacity="0.16" />
            <circle cx={(rngX + midX) / 2} cy={h - u(2)} r={u(1.4)} fill="#2554B0" opacity="0.16" />
            <circle cx={(midX + idxX) / 2} cy={h - u(2)} r={u(1.4)} fill="#2554B0" opacity="0.16" />
          </g>

          {/* ── WHITE VAISHNAV-INSPIRED CHAKRA DECORATION ON BACK OF HAND (CRISP & PROPORTIONATE) ── */}
          <g className="back-hand-vaishnav-chakra" transform={`translate(0, ${h * 0.48}) scale(0.66)`}>
            {/* Soft Skin Contact Shadow for 3D Relief */}
            <circle cx={0} cy={u(0.6)} r={u(13.0)} fill="#2554B0" opacity="0.20" />

            {/* Soft Base Glow Disc */}
            <circle cx={0} cy={0} r={u(13.0)} fill="#F8F9FF" opacity="0.12" />

            {/* Outer Primary Pure White Chakra Ring */}
            <circle cx={0} cy={0} r={u(12.6)} fill="none" stroke="#FFFFFF" strokeWidth={u(2.0)} opacity="0.96" />
            <circle cx={0} cy={0} r={u(10.2)} fill="none" stroke="#F8F9FF" strokeWidth={u(1.2)} strokeDasharray={`${u(2.2)}, ${u(1.6)}`} opacity="0.92" />

            {/* 8-Point Radial Chakra Rays / Starburst Petals */}
            <g fill="none" stroke="#FFFFFF" strokeWidth={u(1.4)} strokeLinecap="round" opacity="0.96">
              <line x1={0} y1={-u(12.6)} x2={0} y2={-u(5.8)} />
              <line x1={0} y1={u(5.8)} x2={0} y2={u(12.6)} />
              <line x1={-u(12.6)} y1={0} x2={-u(5.8)} y2={0} />
              <line x1={u(5.8)} y1={0} x2={u(12.6)} y2={0} />
              <line x1={-u(8.9)} y1={-u(8.9)} x2={-u(4.1)} y2={-u(4.1)} />
              <line x1={u(4.1)} y1={u(4.1)} x2={u(8.9)} y2={u(8.9)} />
              <line x1={-u(8.9)} y1={u(8.9)} x2={-u(4.1)} y2={u(4.1)} />
              <line x1={u(4.1)} y1={-u(4.1)} x2={u(8.9)} y2={-u(8.9)} />
            </g>

            {/* Inner Petaled Hub Ring */}
            <circle cx={0} cy={0} r={u(5.0)} fill="#F8F9FF" stroke="#FFFFFF" strokeWidth={u(0.8)} opacity="0.96" />
            <circle cx={0} cy={0} r={u(2.8)} fill="#FFFFFF" />

            {/* Central Vertical Vaishnav U-Bindu Teardrop Motif */}
            <path
              d={`M ${-u(1.3)} ${-u(4.3)} L ${-u(1.3)} ${u(0.9)} C ${-u(1.3)} ${u(3.0)}, ${u(1.3)} ${u(3.0)}, ${u(1.3)} ${u(0.9)} L ${u(1.3)} ${-u(4.3)} Z`}
              fill="#FFFFFF"
              opacity="1.0"
            />
            {/* Sacred Warm Gold Central Bindu Teardrop Accent */}
            <circle cx={0} cy={u(0.2)} r={u(1.0)} fill="#FFD45A" stroke="#B86A00" strokeWidth={u(0.3)} />
          </g>

          {/* ── REFINED WRIST BANGLES, HAND CHAIN & FINGER JEWELLERY ── */}
          <g className="hand-jewellery">
            {/* 1. Prominent Form-Fitting Dual Wrist Bangles wrapping 24-unit wrist contour */}
            <g className="wrist-bangles">
              {/* Ambient skin contact shadow under bangle */}
              <path
                d={`M ${-w * 0.95} ${-u(4.5)} C ${-w * 0.45} ${-u(1.5)}, ${w * 0.45} ${-u(1.5)}, ${w * 0.95} ${-u(4.5)}`}
                fill="none"
                stroke="#1D4494"
                strokeWidth={u(2.8)}
                opacity="0.22"
              />
              {/* Primary Prominent 3D Gold Bangle Band */}
              <path
                d={`M ${-w * 0.92} ${-u(5.0)} C ${-w * 0.45} ${-u(2.0)}, ${w * 0.45} ${-u(2.0)}, ${w * 0.92} ${-u(5.0)}`}
                fill="none"
                stroke="url(#kJewelGoldGrad)"
                strokeWidth={u(3.8)}
                strokeLinecap="round"
              />
              {/* Primary Bangle Light Specular Sheen */}
              <path
                d={`M ${-w * 0.7} ${-u(5.3)} C ${-w * 0.3} ${-u(2.3)}, ${w * 0.3} ${-u(2.3)}, ${w * 0.7} ${-u(5.3)}`}
                fill="none"
                stroke="#FFF0A3"
                strokeWidth={u(1.1)}
                opacity="0.95"
              />
              {/* Secondary Beaded Gold Bangle */}
              <path
                d={`M ${-w * 0.88} ${-u(1.2)} C ${-w * 0.4} ${u(1.3)}, ${w * 0.4} ${u(1.3)}, ${w * 0.88} ${-u(1.2)}`}
                fill="none"
                stroke="url(#kJewelGoldGrad)"
                strokeWidth={u(2.2)}
                strokeDasharray={`${u(1.4)}, ${u(1.4)}`}
                strokeLinecap="round"
              />
            </g>

            {/* 2. Traditional Hand Chain (Hathphool) anchored to Wrist & Middle Finger */}
            <g className="hand-chain">
              {/* Central Wrist Anchor Bead */}
              <circle cx={0} cy={-u(2.2)} r={u(1.4)} fill="url(#kJewelGoldGrad)" stroke="#B86A00" strokeWidth={u(0.4)} />

              {/* Delicate Beaded Chain running down back of hand to chakra medallion */}
              <path
                d={`M 0 ${-u(2.2)} L 0 ${h * 0.48 - u(8.2)}`}
                fill="none"
                stroke="url(#kJewelGoldGrad)"
                strokeWidth={u(1.2)}
                strokeDasharray={`${u(1.1)}, ${u(1.1)}`}
                strokeLinecap="round"
              />

              {/* Chain Continuation from chakra medallion to Middle Finger Root */}
              <path
                d={`M 0 ${h * 0.48 + u(8.2)} L ${midX} ${h - u(2)}`}
                fill="none"
                stroke="url(#kJewelGoldGrad)"
                strokeWidth={u(1.1)}
                strokeDasharray={`${u(1.0)}, ${u(1.0)}`}
                strokeLinecap="round"
              />
            </g>
          </g>

          {/* ANATOMICAL DIGITS: Permanent semantic IDs and dimensions */}
          <ParametricDigit len={little.l} baseW={little.base} tipW={little.tip} transform={`translate(${litX}, ${h - u(6)}) rotate(${9 + f.little})`} />
          <ParametricDigit len={ring.l} baseW={ring.base} tipW={ring.tip} transform={`translate(${rngX}, ${h - u(2)}) rotate(${4 + f.ring})`} />
          <g transform={`translate(${midX}, ${h}) rotate(${0 + f.middle})`}>
            <ParametricDigit len={middle.l} baseW={middle.base} tipW={middle.tip} />
            {/* Delicate Gold Ring around middle finger root */}
            <ellipse cx={0} cy={u(2)} rx={middle.base / 2 + u(0.6)} ry={u(1.8)} fill="none" stroke="url(#kJewelGoldGrad)" strokeWidth={u(1.6)} />
            <ellipse cx={0} cy={u(1.6)} rx={middle.base / 2 + u(0.2)} ry={u(1.0)} fill="none" stroke="#FFF0A3" strokeWidth={u(0.6)} opacity="0.85" />
          </g>
          <ParametricDigit
            len={index.l}
            baseW={index.base}
            tipW={index.tip}
            transform={`translate(${idxX}, ${h - u(3)}) rotate(${-4 + f.index})`}
            isChakraInteraction={!isLeftHand && isArmPointingUp}
          />
        </>
      )}
    </g>
  );
};

export type KrishnaPose = 'crossHands' | 'chakra' | 'standing';

export type ArmPoseConfig = {
  left: { shoulder: number; elbow: number; wrist: number; fingers?: ArmFingersConfig };
  right: { shoulder: number; elbow: number; wrist: number; fingers?: ArmFingersConfig };
};

export const POSE_CONFIGS: Record<KrishnaPose, ArmPoseConfig> = {
  standing: {
    // Natural relaxed hang beside puffy golden dhoti (viewer's left & right)
    right: { shoulder: 12, elbow: -8, wrist: -2, fingers: { thumb: 0, index: 6, middle: 8, ring: 10, little: 12 } },
    left:  { shoulder: -12, elbow: 8, wrist: 2, fingers: { thumb: 0, index: 6, middle: 8, ring: 10, little: 12 } },
  },
  chakra: {
    // Character's right arm (viewer's left): raised outward-up to spin Sudarshana Chakra at cheek/temple height
    // shoulder=+112° swings upper arm cleanly out to viewer's left; elbow=+62° raises forearm straight up
    right: { shoulder: 112, elbow: 62, wrist: 6, fingers: { thumb: 22, index: -4, middle: 68, ring: 76, little: 84 } },
    // Character's left arm (viewer's right): rests gently at hip/dhoti waist
    left:  { shoulder: -22, elbow: 46, wrist: 12, fingers: { thumb: 16, index: 16, middle: 24, ring: 30, little: 36 } },
  },
  crossHands: {
    // Both arms fold gently inward across tummy / upper saffron belt
    right: { shoulder: 14, elbow: -88, wrist: -12, fingers: { thumb: 10, index: 14, middle: 18, ring: 22, little: 26 } },
    left:  { shoulder: -14, elbow: 88, wrist: 12, fingers: { thumb: 10, index: 14, middle: 18, ring: 22, little: 26 } },
  },
};

export type KrishnaArmsRenderSide = 'all' | 'characterLeft' | 'characterRight';
export type KrishnaArmsRenderLayer = 'all' | 'upperArm' | 'forearmAndHand';
export type KrishnaArmsRenderPart = 'all' | 'thumbOnly' | 'withoutThumb' | 'chakraIndexTip';

export const KrishnaArms = ({
  pose = 'chakra',
  renderSide = 'all',
  renderLayer = 'all',
  renderHandPart = 'all',
}: {
  pose?: KrishnaPose | string;
  renderSide?: KrishnaArmsRenderSide;
  renderLayer?: KrishnaArmsRenderLayer;
  renderHandPart?: KrishnaArmsRenderPart;
}) => {
  const normalizedPose: KrishnaPose = pose === 'crossed' ? 'crossHands' : ((pose as KrishnaPose) || 'chakra');
  const config = POSE_CONFIGS[normalizedPose] || POSE_CONFIGS.chakra;
  const rightTotalAngle = config.right.shoulder + config.right.elbow + config.right.wrist;
  const leftTotalAngle = config.left.shoulder + config.left.elbow + config.left.wrist;

  // When rendering thumbOnly or chakraIndexTip, skip upper arm and forearm paths
  const isSpecialHandPart = renderHandPart === 'thumbOnly' || renderHandPart === 'chakraIndexTip';
  const showUpperArm = !isSpecialHandPart && (renderLayer === 'all' || renderLayer === 'upperArm');
  const showForearm = !isSpecialHandPart && (renderLayer === 'all' || renderLayer === 'forearmAndHand');
  const showHand = renderLayer === 'all' || renderLayer === 'forearmAndHand' || isSpecialHandPart;

  return (
    <g id={`armRoots-${renderLayer}-${renderHandPart}`}>
      {/* Embedded Master Skin Shaders ensuring continuous material matching krishna2_base.png */}
      <defs>
        <radialGradient id="k2_ArmSkinBase" cx="38%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#97C6FF" />
          <stop offset="30%" stopColor="#6EA9FF" />
          <stop offset="68%" stopColor="#4887EA" />
          <stop offset="100%" stopColor="#2654B0" />
        </radialGradient>

        <radialGradient id="k2_ShoulderSocketFill" cx="42%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#85BAFD" />
          <stop offset="45%" stopColor="#5C9BF9" />
          <stop offset="82%" stopColor="#3B77DC" />
          <stop offset="100%" stopColor="#2756B5" />
        </radialGradient>

        <linearGradient id="k2_ArmSkinGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#B6D8FF" stopOpacity="0.28" />
          <stop offset="28%" stopColor="#86B8FD" stopOpacity="0.14" />
          <stop offset="62%" stopColor="#5C9BF9" stopOpacity="0" />
          <stop offset="88%" stopColor="#3873D6" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#214DA6" stopOpacity="0.34" />
        </linearGradient>

        <radialGradient id="k2_ElbowJointSkinGrad" cx="40%" cy="38%" r="62%">
          <stop offset="0%" stopColor="#86B8FD" />
          <stop offset="55%" stopColor="#5C9BF9" />
          <stop offset="85%" stopColor="#437EE0" />
          <stop offset="100%" stopColor="#2D60C2" stopOpacity="0.9" />
        </radialGradient>

        <radialGradient id="kElbowOuterHighlight" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#A9CCFF" stopOpacity="0.55" />
          <stop offset="40%" stopColor="#84B5FA" stopOpacity="0.28" />
          <stop offset="78%" stopColor="#6BA7FF" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#6BA7FF" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="kElbowInnerShadow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4E82D1" stopOpacity="0.38" />
          <stop offset="55%" stopColor="#315EA8" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#6BA7FF" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="kFingerLongitudinal" x1="30%" y1="0%" x2="70%" y2="100%">
          <stop offset="0%" stopColor="#A9CCFF" stopOpacity="0.38" />
          <stop offset="35%" stopColor="#84B5FA" stopOpacity="0.18" />
          <stop offset="70%" stopColor="#6BA7FF" stopOpacity="0" />
          <stop offset="100%" stopColor="#4E82D1" stopOpacity="0.3" />
        </linearGradient>

        <radialGradient id="kPalmCentralGlow" cx="45%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#84B5FA" stopOpacity="0.45" />
          <stop offset="50%" stopColor="#84B5FA" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#6BA7FF" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="kThenarSoftGlow" cx="45%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#84B5FA" stopOpacity="0.5" />
          <stop offset="60%" stopColor="#6BA7FF" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#4E82D1" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="kFingertipSoftGlow" cx="42%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#A9CCFF" stopOpacity="0.55" />
          <stop offset="50%" stopColor="#84B5FA" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#6BA7FF" stopOpacity="0" />
        </radialGradient>

        {/* ── Natural Palm Warm Pink Undertone Gradients ── */}
        <radialGradient id="kPalmCentralPinkGlow" cx="45%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#F2B5BA" stopOpacity="0.28" />
          <stop offset="45%" stopColor="#E89AA5" stopOpacity="0.18" />
          <stop offset="80%" stopColor="#84B5FA" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#6BA7FF" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="kThenarPinkWarmth" cx="45%" cy="42%" r="55%">
          <stop offset="0%" stopColor="#F8D1D1" stopOpacity="0.32" />
          <stop offset="45%" stopColor="#E89AA5" stopOpacity="0.22" />
          <stop offset="80%" stopColor="#84B5FA" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#6BA7FF" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="kHypothenarPinkWarmth" cx="45%" cy="45%" r="50%">
          <stop offset="0%" stopColor="#F2B5BA" stopOpacity="0.24" />
          <stop offset="50%" stopColor="#E89AA5" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#6BA7FF" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="kFingerPadPinkWarmth" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#A9CCFF" stopOpacity="0" />
          <stop offset="55%" stopColor="#84B5FA" stopOpacity="0.10" />
          <stop offset="82%" stopColor="#F2B5BA" stopOpacity="0.20" />
          <stop offset="100%" stopColor="#E89AA5" stopOpacity="0.16" />
        </linearGradient>

        <radialGradient id="kFingertipSubtleWarmth" cx="42%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#A9CCFF" stopOpacity="0.45" />
          <stop offset="45%" stopColor="#F8D1D1" stopOpacity="0.16" />
          <stop offset="80%" stopColor="#84B5FA" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#6BA7FF" stopOpacity="0" />
        </radialGradient>

        {/* ── Master Jewellery & Vaishnav Decoration Gradients ── */}
        <linearGradient id="kJewelGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#B86A00" />
          <stop offset="25%" stopColor="#F5A900" />
          <stop offset="50%" stopColor="#FFD45A" />
          <stop offset="75%" stopColor="#FFF0A3" />
          <stop offset="90%" stopColor="#F5A900" />
          <stop offset="100%" stopColor="#B86A00" />
        </linearGradient>

        <linearGradient id="kJewelGoldLight" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFD45A" />
          <stop offset="50%" stopColor="#FFF0A3" />
          <stop offset="100%" stopColor="#FFD45A" />
        </linearGradient>

        <radialGradient id="kJewelRuby" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#F87171" />
          <stop offset="50%" stopColor="#DC2626" />
          <stop offset="100%" stopColor="#7F1D1D" />
        </radialGradient>

        <linearGradient id="kVaishnavIvory" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#F8F9FF" stopOpacity="0.90" />
          <stop offset="100%" stopColor="#E2E8F0" stopOpacity="0.75" />
        </linearGradient>
      </defs>

      {/* KRISHNA'S ANATOMICAL RIGHT ARM (Viewer's Left side) */}
      {(renderSide === 'all' || renderSide === 'characterRight') && (
      <g id={`leftChestArmRoot-${renderLayer}-${renderHandPart}`} className="arm-character-right">
        {/* Seamless Deltoid Socket Plug sealing krishna2_base.png hollow cutout */}
        {showUpperArm && (
          <ellipse
            cx={190 - ARM_SPEC.shoulderPivotOffset}
            cy={ARM_SPEC.shoulderPivotY + 1}
            rx={26}
            ry={18}
            transform={`rotate(26 ${190 - ARM_SPEC.shoulderPivotOffset} ${ARM_SPEC.shoulderPivotY + 1})`}
            fill="url(#k2_ShoulderSocketFill)"
          />
        )}
        <g
          id={`leftShoulderPivot-${renderLayer}-${renderHandPart}`}
          transform={`translate(${190 - ARM_SPEC.shoulderPivotOffset}, ${ARM_SPEC.shoulderPivotY}) rotate(${config.right.shoulder})`}
        >
          <g id={`leftUpperArm-${renderLayer}-${renderHandPart}`}>
            {showUpperArm && <ParametricUpperArm isFlipped={true} />}

            {/* Elbow Pivot Joint */}
            <g id={`leftElbowPivot-${renderLayer}-${renderHandPart}`} transform={`translate(0, ${ARM_SPEC.upper.len}) rotate(${config.right.elbow})`}>
              {/* Visible 3D Gradient-Blended Circular Elbow Joint Capsule */}
              {showUpperArm && showForearm && (
                <g className="elbow-joint-blend">
                  {/* Radial Skin Gradient Joint Base */}
                  <circle cx={0} cy={0} r={ARM_SPEC.elbow.blendW / 2} fill="url(#k2_ElbowJointSkinGrad)" />
                  {/* Directional Specular Arm Gradient Overlay */}
                  <circle cx={0} cy={0} r={ARM_SPEC.elbow.blendW / 2} fill="url(#k2_ArmSkinGrad)" />
                  {/* Elongated Convex Outer Bend Highlight following joint curve */}
                  <ellipse cx={-u(4)} cy={0} rx={(ARM_SPEC.elbow.blendW / 2) * 0.75} ry={u(4.5)} fill="url(#kElbowOuterHighlight)" />
                  {/* Soft Inner Concave Shadow following bend curve */}
                  <ellipse cx={u(5)} cy={0} rx={(ARM_SPEC.elbow.blendW / 2) * 0.6} ry={u(3.8)} fill="url(#kElbowInnerShadow)" />
                  {/* Continuous Skin Sheen Overlay along elbow vector */}
                  <path d={`M ${-u(12)} ${-u(6)} C ${-u(15)} 0, ${-u(12)} ${u(6)}, ${-u(6)} ${u(6)}`} fill="none" stroke="#B6D8FF" strokeWidth={u(3.2)} strokeLinecap="round" opacity="0.28" />
                </g>
              )}

              <g id={`leftForearm-${renderLayer}-${renderHandPart}`}>
                {showForearm && <ParametricForearm />}

                {/* Wrist Pivot Joint & Hand */}
                {showHand && (
                <g id={`leftWristPivot-${renderLayer}-${renderHandPart}`} transform={`translate(0, ${ARM_SPEC.forearm.len}) rotate(${config.right.wrist})`}>
                  {/* Seamless Anatomical Wrist Capsule Blend */}
                  {showForearm && (
                    <g className="wrist-joint-blend">
                      <ellipse cx={0} cy={0} rx={ARM_SPEC.wrist.width / 2} ry={u(3.5)} fill="url(#k2_ArmSkinBase)" />
                      <ellipse cx={0} cy={0} rx={(ARM_SPEC.wrist.width / 2) * 0.75} ry={u(2.2)} fill="#B6D8FF" opacity="0.18" />
                    </g>
                  )}

                  {/* Character's Right Hand */}
                  <ParametricHand
                    side="characterRight"
                    fingers={config.right.fingers}
                    totalArmAngle={rightTotalAngle}
                    handLayer={renderHandPart}
                  />
                </g>
                )}
              </g>
            </g>
          </g>
        </g>
      </g>
      )}

      {/* KRISHNA'S ANATOMICAL LEFT ARM (Viewer's Right side) */}
      {(renderSide === 'all' || renderSide === 'characterLeft') && (
      <g id={`rightChestArmRoot-${renderLayer}-${renderHandPart}`} className="arm-character-left">
        {/* Seamless Deltoid Socket Plug sealing krishna2_base.png hollow cutout */}
        {showUpperArm && (
          <ellipse
            cx={190 + ARM_SPEC.shoulderPivotOffset}
            cy={ARM_SPEC.shoulderPivotY + 1}
            rx={26}
            ry={18}
            transform={`rotate(-26 ${190 + ARM_SPEC.shoulderPivotOffset} ${ARM_SPEC.shoulderPivotY + 1})`}
            fill="url(#k2_ShoulderSocketFill)"
          />
        )}
        <g
          id={`rightShoulderPivot-${renderLayer}-${renderHandPart}`}
          transform={`translate(${190 + ARM_SPEC.shoulderPivotOffset}, ${ARM_SPEC.shoulderPivotY}) rotate(${config.left.shoulder})`}
        >
          <g id={`rightUpperArm-${renderLayer}-${renderHandPart}`}>
            {showUpperArm && <ParametricUpperArm isFlipped={false} />}

            {/* Elbow Pivot Joint */}
            <g id={`rightElbowPivot-${renderLayer}-${renderHandPart}`} transform={`translate(0, ${ARM_SPEC.upper.len}) rotate(${config.left.elbow})`}>
              {/* Visible 3D Gradient-Blended Circular Elbow Joint Capsule */}
              {showUpperArm && showForearm && (
                <g className="elbow-joint-blend">
                  {/* Radial Skin Gradient Joint Base */}
                  <circle cx={0} cy={0} r={ARM_SPEC.elbow.blendW / 2} fill="url(#k2_ElbowJointSkinGrad)" />
                  {/* Directional Specular Arm Gradient Overlay */}
                  <circle cx={0} cy={0} r={ARM_SPEC.elbow.blendW / 2} fill="url(#k2_ArmSkinGrad)" />
                  {/* Elongated Convex Outer Bend Highlight following joint curve */}
                  <ellipse cx={u(4)} cy={0} rx={(ARM_SPEC.elbow.blendW / 2) * 0.75} ry={u(4.5)} fill="url(#kElbowOuterHighlight)" />
                  {/* Soft Inner Concave Shadow following bend curve */}
                  <ellipse cx={-u(5)} cy={0} rx={(ARM_SPEC.elbow.blendW / 2) * 0.6} ry={u(3.8)} fill="url(#kElbowInnerShadow)" />
                  {/* Continuous Skin Sheen Overlay along elbow vector */}
                  <path d={`M ${u(12)} ${-u(6)} C ${u(15)} 0, ${u(12)} ${u(6)}, ${u(6)} ${u(6)}`} fill="none" stroke="#B6D8FF" strokeWidth={u(3.2)} strokeLinecap="round" opacity="0.28" />
                </g>
              )}

              <g id={`rightForearm-${renderLayer}-${renderHandPart}`}>
                {showForearm && <ParametricForearm />}

                {/* Wrist Pivot Joint & Hand */}
                {showHand && (
                <g id={`rightWristPivot-${renderLayer}-${renderHandPart}`} transform={`translate(0, ${ARM_SPEC.forearm.len}) rotate(${config.left.wrist})`}>
                  {/* Seamless Anatomical Wrist Capsule Blend */}
                  {showForearm && (
                    <g className="wrist-joint-blend">
                      <ellipse cx={0} cy={0} rx={ARM_SPEC.wrist.width / 2} ry={u(3.5)} fill="url(#k2_ArmSkinBase)" />
                      <ellipse cx={0} cy={0} rx={(ARM_SPEC.wrist.width / 2) * 0.75} ry={u(2.2)} fill="#B6D8FF" opacity="0.18" />
                    </g>
                  )}

                  {/* Character's Left Hand */}
                  <ParametricHand
                    side="characterLeft"
                    fingers={config.left.fingers}
                    totalArmAngle={leftTotalAngle}
                    handLayer={renderHandPart}
                  />
                </g>
                )}
              </g>
            </g>
          </g>
        </g>
      </g>
      )}
    </g>
  );
};
