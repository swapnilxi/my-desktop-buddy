import React from 'react';

// ════════════════ MASTER SCALE SYSTEM ════════════════
// Maps the 1000-unit master specification to the existing SVG 140-unit shoulder coordinate space.
export const MASTER_SCALE = 140 / 285; // ~0.4912
export const u = (val: number) => val * MASTER_SCALE;

export const ARM_SPEC = {
  shoulderPivotOffset: u(142.5),
  upper: {
    len: u(112), topW: u(46), maxW: u(40), botW: u(32), ov: u(7), depth: u(34)
  },
  elbow: {
    blendW: u(36)
  },
  forearm: {
    len: u(100), topW: u(32), maxW: u(34), botW: u(25), ov: u(7), depth: u(29)
  },
  wrist: {
    width: u(24)
  },
  hand: {
    palm: { w: u(48), h: u(54), wristW: u(24), heelW: u(34), transitionL: u(10), d: u(24) },
    knuckle: { w: u(46), h: u(18), d: u(23) },
    thumb: { l: u(27), base: u(14), tip: u(9) },
    index: { l: u(31), base: u(12), tip: u(8) },
    middle: { l: u(34), base: u(12), tip: u(8) },
    ring: { l: u(30), base: u(11), tip: u(8) },
    little: { l: u(25), base: u(10), tip: u(7) }
  }
};

export const ParametricUpperArm = ({ isFlipped = false }: { isFlipped?: boolean }) => {
  const { len, topW, maxW, botW, ov } = ARM_SPEC.upper;
  const { blendW } = ARM_SPEC.elbow;
  const t = topW / 2, m = maxW / 2, b = botW / 2, e = blendW / 2;
  
  // Shoulder cap extends u(26) above the pivot for a 52-unit total height.
  // Axilla sweeps inward by u(10) (8-12 units overlap spec) into the chest.
  const capH = u(26);
  const axillaOverlap = u(10);
  
  const path = `
    M ${-t} 0 
    C ${-m} ${len*0.4}, ${-b} ${len*0.8}, ${-b} ${len} 
    C ${-e} ${len + ov}, ${e} ${len + ov}, ${b} ${len} 
    C ${b} ${len*0.8}, ${m} ${len*0.4}, ${t} 0 
    C ${t} ${-capH*0.8}, ${t*0.5} ${-capH}, 0 ${-capH}
    C ${-t*0.8} ${-capH}, ${-t - axillaOverlap} ${-capH*0.5}, ${-t} 0 
    Z`;
    
  const hl = `M 0 5 C 2 ${len*0.3}, 2 ${len*0.7}, 0 ${len - 5}`;
  const shL = `M ${-m*0.85} 15 C ${-m*0.85} ${len*0.4}, ${-b*0.85} ${len*0.8}, ${-b*0.85} ${len - 5}`;
  const shR = `M ${m*0.85} 15 C ${m*0.85} ${len*0.4}, ${b*0.85} ${len*0.8}, ${b*0.85} ${len - 5}`;
  
  const transform = isFlipped ? 'scale(-1, 1)' : '';

  return (
    <g className="parametric-upper-arm">
      <path d={path} fill="url(#kSkinBody)" transform={transform} />
      <path d={path} fill="url(#kArmSkinGrad)" transform={transform} />
      <path d={hl} fill="none" stroke="#A9CCFF" strokeWidth={u(5)} strokeLinecap="round" opacity="0.28" transform={transform} />
      <path d={shL} fill="none" stroke="#4E82D1" strokeWidth={u(3)} strokeLinecap="round" opacity="0.2" transform={transform} />
      <path d={shR} fill="none" stroke="#4E82D1" strokeWidth={u(3)} strokeLinecap="round" opacity="0.2" transform={transform} />
    </g>
  );
};

export const ParametricForearm = () => {
  const { len, topW, maxW, botW, ov } = ARM_SPEC.forearm;
  const { blendW } = ARM_SPEC.elbow;
  const t = topW / 2, m = maxW / 2, b = botW / 2, e = blendW / 2;
  
  const path = `M ${-t} 0 C ${-e} ${-ov}, ${e} ${-ov}, ${t} 0 C ${m} ${len*0.3}, ${b} ${len*0.7}, ${b} ${len} L ${-b} ${len} C ${-b} ${len*0.7}, ${-m} ${len*0.3}, ${-t} 0 Z`;
  const hl = `M 0 5 C 2 ${len*0.3}, 2 ${len*0.7}, 0 ${len - 3}`;
  const shL = `M ${-m*0.85} 10 C ${-m*0.85} ${len*0.4}, ${-b*0.85} ${len*0.8}, ${-b*0.85} ${len - 5}`;
  const shR = `M ${m*0.85} 10 C ${m*0.85} ${len*0.4}, ${b*0.85} ${len*0.8}, ${b*0.85} ${len - 5}`;

  return (
    <g className="parametric-forearm">
      <path d={path} fill="url(#kSkinBody)" />
      <path d={path} fill="url(#kArmSkinGrad)" />
      <path d={hl} fill="none" stroke="#A9CCFF" strokeWidth={u(4.5)} strokeLinecap="round" opacity="0.3" />
      <path d={shL} fill="none" stroke="#4E82D1" strokeWidth={u(2.8)} strokeLinecap="round" opacity="0.2" />
      <path d={shR} fill="none" stroke="#4E82D1" strokeWidth={u(2.8)} strokeLinecap="round" opacity="0.2" />
      {/* Seamless Forearm-to-Wrist Highlight Transition */}
      <ellipse cx={0} cy={len - u(1)} rx={b * 0.75} ry={u(2.5)} fill="#A9CCFF" opacity="0.18" />
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
      <path d={path} fill="url(#kSkinBody)" />
      {/* Longitudinal Finger Volume Shading (A9CCFF -> 84B5FA -> 6BA7FF -> 4E82D1) */}
      <path d={path} fill="url(#kFingerLongitudinal)" />

      {/* Longitudinal Volume Highlight */}
      <path
        d={`M 0 0 C 0.8 ${len*0.4}, 0.8 ${len*0.8}, 0 ${len - u(3)}`}
        fill="none"
        stroke="#A9CCFF"
        strokeWidth={u(2.4)}
        strokeLinecap="round"
        opacity="0.32"
      />
      {/* Soft Shadow Side */}
      <path
        d={`M ${b*0.6} ${len*0.2} C ${b*0.6} ${len*0.5}, ${t*0.7} ${len*0.8}, ${t*0.6} ${len - u(2)}`}
        fill="none"
        stroke="#4E82D1"
        strokeWidth={u(1.8)}
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

      {/* Soft Rounded Fingertip Highlight */}
      <ellipse cx={0} cy={len - u(0.5)} rx={t * 0.7} ry={t * 0.85} fill="url(#kFingertipSoftGlow)" />
      {/* Fingertip Underside Shadow */}
      <ellipse cx={0} cy={len + t * 0.8} rx={t * 0.5} ry={t * 0.4} fill="#4E82D1" opacity="0.2" />

      {/* Subtle Local Contact Shadow for Chakra or Grip Interaction */}
      {isChakraInteraction && (
        <circle cx={0} cy={len} r={t * 0.65} fill="#315EA8" opacity="0.2" />
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
  const litX = -u(16);
  const rngX = -u(6);
  const midX = u(4);
  const idxX = u(15);

  // Thumb positioned on +X Thenar base (pointing gracefully inward towards hair/index)
  const thumbTransform = `translate(${pW * 1.05}, ${h * 0.55}) rotate(${-42 - f.thumb})`;

  const showThumb = handLayer === 'all' || handLayer === 'thumbOnly';
  const showMainHand = handLayer === 'all' || handLayer === 'withoutThumb';
  const showChakraTip = handLayer === 'chakraIndexTip';

  // If rendering ONLY the chakra fingertip in front of the chakra disc:
  if (showChakraTip) {
    return (
      <g
        className="parametric-hand-chakra-tip"
        transform={shouldMirror ? 'scale(-1, 1)' : undefined}
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
      transform={shouldMirror ? 'scale(-1, 1)' : undefined}
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
            {/* Seamless Wrist Transition Highlight (narrow soft A9CCFF, fading into 6BA7FF) */}
            <ellipse cx={0} cy={-u(3)} rx={w * 0.7} ry={u(2.5)} fill="#A9CCFF" opacity="0.2" />

            {/* Continuous Base Skin */}
            <path d={palmPath} fill="url(#kSkinBody)" />
            <path d={knucklePath} fill="url(#kSkinBody)" />
            <path d={thenarPath} fill="url(#kSkinBody)" />
            <path d={hypothenarPath} fill="url(#kSkinBody)" />

            {/* 3D Palm Shading: Central Palm 84B5FA Highlight */}
            <path d={palmPath} fill="url(#kPalmCentralGlow)" />
            {/* Thenar 3D Highlight & Soft Transition */}
            <path d={thenarPath} fill="url(#kThenarSoftGlow)" />
            <path d={thenarPath} fill="none" stroke="#4E82D1" strokeWidth={u(2.5)} opacity="0.18" />

            {/* Hypothenar Soft Highlight & Heel Shadow */}
            <path d={hypothenarPath} fill="none" stroke="#4E82D1" strokeWidth={u(2.2)} opacity="0.18" />
            <path
              d={`M ${-w} ${-u(4)} C ${-heel} ${u(8)}, ${-pW * 0.7} ${h * 0.35}, 0 ${h * 0.25}`}
              fill="none"
              stroke="#4E82D1"
              strokeWidth={u(3)}
              strokeLinecap="round"
              opacity="0.2"
            />

            {/* Knuckle Continuous Highlight Arc (No individual circles) */}
            <path d={knucklePath} fill="none" stroke="#A9CCFF" strokeWidth={u(2.2)} opacity="0.28" />

            {/* Subtle Contact Shadow in Interdigital Clefts */}
            <circle cx={(litX + rngX) / 2} cy={h - u(4)} r={u(1.5)} fill="#315EA8" opacity="0.15" />
            <circle cx={(rngX + midX) / 2} cy={h - u(2)} r={u(1.5)} fill="#315EA8" opacity="0.15" />
            <circle cx={(midX + idxX) / 2} cy={h - u(2)} r={u(1.5)} fill="#315EA8" opacity="0.15" />
          </g>

          {/* ANATOMICAL DIGITS: Permanent semantic IDs and dimensions */}
          <ParametricDigit len={little.l} baseW={little.base} tipW={little.tip} transform={`translate(${litX}, ${h - u(6)}) rotate(${9 + f.little})`} />
          <ParametricDigit len={ring.l} baseW={ring.base} tipW={ring.tip} transform={`translate(${rngX}, ${h - u(2)}) rotate(${4 + f.ring})`} />
          <ParametricDigit len={middle.l} baseW={middle.base} tipW={middle.tip} transform={`translate(${midX}, ${h}) rotate(${0 + f.middle})`} />
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
  chakra: {
    // Natural raised arm: shoulder=138° lifts arm up from left pivot, elbow=42° keeps forearm vertical.
    // Index finger aligns through chakra axis. Thumb rotated toward chakra for opposing grip/control.
    // Curled middle/ring/little fingers wrap naturally.
    right: { shoulder: 138, elbow: 42, wrist: 0, fingers: { thumb: 24, index: -4, middle: 68, ring: 76, little: 84 } },
    // Opposite hand resting naturally around waist: thumb passes BEHIND waist, 4 fingers wrap around front/side.
    left: { shoulder: -35, elbow: 95, wrist: 20, fingers: { thumb: 18, index: 22, middle: 30, ring: 36, little: 42 } },
  },
  standing: {
    right: { shoulder: 15, elbow: -10, wrist: 0, fingers: { thumb: 0, index: 15, middle: 20, ring: 25, little: 30 } },
    left: { shoulder: -15, elbow: 10, wrist: 0, fingers: { thumb: 0, index: 15, middle: 20, ring: 25, little: 30 } },
  },
  crossHands: {
    right: { shoulder: -40, elbow: -85, wrist: -10, fingers: { thumb: 10, index: 15, middle: 20, ring: 25, little: 30 } },
    left: { shoulder: 45, elbow: 85, wrist: 10, fingers: { thumb: 10, index: 15, middle: 20, ring: 25, little: 30 } },
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
  pose?: KrishnaPose;
  renderSide?: KrishnaArmsRenderSide;
  renderLayer?: KrishnaArmsRenderLayer;
  renderHandPart?: KrishnaArmsRenderPart;
}) => {
  const config = POSE_CONFIGS[pose] || POSE_CONFIGS.chakra;
  const rightTotalAngle = config.right.shoulder + config.right.elbow + config.right.wrist;
  const leftTotalAngle = config.left.shoulder + config.left.elbow + config.left.wrist;

  // When rendering thumbOnly or chakraIndexTip, skip upper arm and forearm paths
  const isSpecialHandPart = renderHandPart === 'thumbOnly' || renderHandPart === 'chakraIndexTip';
  const showUpperArm = !isSpecialHandPart && (renderLayer === 'all' || renderLayer === 'upperArm');
  const showForearm = !isSpecialHandPart && (renderLayer === 'all' || renderLayer === 'forearmAndHand');
  const showHand = renderLayer === 'all' || renderLayer === 'forearmAndHand' || isSpecialHandPart;

  return (
    <g id={`armRoots-${renderLayer}-${renderHandPart}`} filter="url(#kSoftShadow)">
      {/* Embedded Master Skin Shaders ensuring continuous material across arm, wrist, and hand */}
      <defs>
        <linearGradient id="kArmSkinGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#A9CCFF" stopOpacity="0.32" />
          <stop offset="25%" stopColor="#84B5FA" stopOpacity="0.15" />
          <stop offset="60%" stopColor="#6BA7FF" stopOpacity="0" />
          <stop offset="88%" stopColor="#4E82D1" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#315EA8" stopOpacity="0.3" />
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
      </defs>

      {/* KRISHNA'S ANATOMICAL RIGHT ARM (Viewer's Left side) — chakra hand */}
      {(renderSide === 'all' || renderSide === 'characterRight') && (
      <g id={`leftChestArmRoot-${renderLayer}-${renderHandPart}`} className="arm-character-right">
        <g
          id={`leftShoulderPivot-${renderLayer}-${renderHandPart}`}
          transform={`translate(${190 - ARM_SPEC.shoulderPivotOffset}, 205) rotate(${config.right.shoulder})`}
        >
          <g id={`leftUpperArm-${renderLayer}-${renderHandPart}`}>
            {showUpperArm && <ParametricUpperArm isFlipped={true} />}

            {/* Elbow Pivot Joint */}
            <g id={`leftElbowPivot-${renderLayer}-${renderHandPart}`} transform={`translate(0, ${ARM_SPEC.upper.len}) rotate(${config.right.elbow})`}>
              <g id={`leftForearm-${renderLayer}-${renderHandPart}`}>
                {showForearm && <ParametricForearm />}

                {/* Wrist Pivot Joint & Hand */}
                {showHand && (
                <g id={`leftWristPivot-${renderLayer}-${renderHandPart}`} transform={`translate(0, ${ARM_SPEC.forearm.len}) rotate(${config.right.wrist})`}>
                  {/* Character's Right Hand (Chakra Hand) */}
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
        <g
          id={`rightShoulderPivot-${renderLayer}-${renderHandPart}`}
          transform={`translate(${190 + ARM_SPEC.shoulderPivotOffset}, 205) rotate(${config.left.shoulder})`}
        >
          <g id={`rightUpperArm-${renderLayer}-${renderHandPart}`}>
            {showUpperArm && <ParametricUpperArm isFlipped={false} />}

            {/* Elbow Pivot Joint */}
            <g id={`rightElbowPivot-${renderLayer}-${renderHandPart}`} transform={`translate(0, ${ARM_SPEC.upper.len}) rotate(${config.left.elbow})`}>
              <g id={`rightForearm-${renderLayer}-${renderHandPart}`}>
                {showForearm && <ParametricForearm />}

                {/* Wrist Pivot Joint & Hand */}
                {showHand && (
                <g id={`rightWristPivot-${renderLayer}-${renderHandPart}`} transform={`translate(0, ${ARM_SPEC.forearm.len}) rotate(${config.left.wrist})`}>
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
