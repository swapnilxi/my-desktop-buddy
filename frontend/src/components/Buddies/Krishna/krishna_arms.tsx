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
      <path d={hl} fill="none" stroke="#FFFFFF" strokeWidth={u(6)} strokeLinecap="round" opacity="0.2" transform={transform} />
      <path d={shL} fill="none" stroke="#1E3A8A" strokeWidth={u(4)} strokeLinecap="round" opacity="0.15" transform={transform} />
      <path d={shR} fill="none" stroke="#1E3A8A" strokeWidth={u(4)} strokeLinecap="round" opacity="0.15" transform={transform} />
    </g>
  );
};

export const ParametricForearm = () => {
  const { len, topW, maxW, botW, ov } = ARM_SPEC.forearm;
  const { blendW } = ARM_SPEC.elbow;
  const t = topW / 2, m = maxW / 2, b = botW / 2, e = blendW / 2;
  
  const path = `M ${-t} 0 C ${-e} ${-ov}, ${e} ${-ov}, ${t} 0 C ${m} ${len*0.3}, ${b} ${len*0.7}, ${b} ${len} L ${-b} ${len} C ${-b} ${len*0.7}, ${-m} ${len*0.3}, ${-t} 0 Z`;
  const hl = `M 0 5 C 2 ${len*0.3}, 2 ${len*0.7}, 0 ${len - 5}`;
  const shL = `M ${-m*0.85} 10 C ${-m*0.85} ${len*0.4}, ${-b*0.85} ${len*0.8}, ${-b*0.85} ${len - 5}`;
  const shR = `M ${m*0.85} 10 C ${m*0.85} ${len*0.4}, ${b*0.85} ${len*0.8}, ${b*0.85} ${len - 5}`;

  return (
    <g className="parametric-forearm">
      <path d={path} fill="url(#kSkinBody)" />
      <path d={hl} fill="none" stroke="#FFFFFF" strokeWidth={u(5)} strokeLinecap="round" opacity="0.25" />
      <path d={shL} fill="none" stroke="#1E3A8A" strokeWidth={u(3)} strokeLinecap="round" opacity="0.15" />
      <path d={shR} fill="none" stroke="#1E3A8A" strokeWidth={u(3)} strokeLinecap="round" opacity="0.15" />
    </g>
  );
};

export const ParametricDigit = ({ len, baseW, tipW, transform }: { len: number, baseW: number, tipW: number, transform?: string }) => {
  const b = baseW / 2;
  const t = tipW / 2;
  // Digits start slightly inside the knuckle (Y = -u(5)) to guarantee seamless structural overlap (4-6 units overlap spec)
  const path = `M ${-b} ${-u(5)} C ${-b} ${len*0.3}, ${-t} ${len*0.7}, ${-t} ${len} C ${-t} ${len+t*1.5}, ${t} ${len+t*1.5}, ${t} ${len} C ${t} ${len*0.7}, ${b} ${len*0.3}, ${b} ${-u(5)} Z`;
  return (
    <g className="parametric-digit" transform={transform}>
      <path d={path} fill="url(#kSkinBody)" />
      <path d={`M 0 0 C 1 ${len*0.4}, 1 ${len*0.8}, 0 ${len - u(3)}`} fill="none" stroke="#FFFFFF" strokeWidth={u(3)} strokeLinecap="round" opacity="0.2" />
    </g>
  );
};

export type ArmFingersConfig = { thumb: number, index: number, middle: number, ring: number, little: number };

export type HandSide = 'characterLeft' | 'characterRight' | 'left' | 'right';

export interface ParametricHandProps {
  side?: HandSide;
  isFlipped?: boolean;
  fingers?: ArmFingersConfig;
  totalArmAngle?: number;
}

/**
 * ════════════════ MASTER HAND ANATOMICAL SYSTEM ════════════════
 * Single anatomical source of truth for both hands.
 * Semantic Finger Identities: THUMB, INDEX, MIDDLE, RING, LITTLE.
 * Invariant master dimensions & finger order.
 * Medial thumb orientation (pointing towards hair/body center) is maintained across all arm rotations.
 */
export const ParametricHand = ({ side, isFlipped = false, fingers, totalArmAngle = 0 }: ParametricHandProps) => {
  const { palm, knuckle, thumb, index, middle, ring, little } = ARM_SPEC.hand;
  const f = fingers || { thumb: 0, index: 0, middle: 0, ring: 0, little: 0 };

  // Character's Right Hand vs Left Hand base handedness
  const isLeftHand = side === 'characterLeft' || side === 'left';
  const isRightHand = !isLeftHand;

  // Determine if the forearm vector points upwards in SVG space (-Y direction)
  const normalizedAngle = ((totalArmAngle % 360) + 540) % 360 - 180;
  const isArmPointingUp = Math.cos((normalizedAngle * Math.PI) / 180) < 0;

  // Preserve medial thumb orientation (pointing towards hair/centerline):
  // Right Hand (Viewer Left): Thumb must be on screen +X (hair/head side).
  // When pointing down, unmirrored master hand has +X Thumb on hair side.
  // When pointing up, 2D 180-deg rotation flips +X to -X; applying scale(-1, 1) keeps Thumb on +X (hair side).
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

  // Soft internal volume shading
  const centralHighlight = `M ${-pW * 0.4} ${h * 0.4} 
    C ${-pW * 0.3} ${h * 0.7}, ${pW * 0.3} ${h * 0.7}, ${pW * 0.4} ${h * 0.4} 
    C ${pW * 0.2} ${u(15)}, ${-pW * 0.2} ${u(15)}, ${-pW * 0.4} ${h * 0.4} Z`;

  // 5. Thumb & Digits placement in invariant anatomical order:
  // LITTLE (-X) -> RING -> MIDDLE -> INDEX -> THUMB (+X / hair side)
  const litX = -u(16);
  const rngX = -u(6);
  const midX = u(4);
  const idxX = u(15);

  // Thumb positioned on +X Thenar base (pointing gracefully inward towards hair/index)
  const thumbTransform = `translate(${pW * 1.05}, ${h * 0.55}) rotate(${-42 - f.thumb})`;

  return (
    <g
      className={`parametric-hand ${isLeftHand ? 'hand-character-left' : 'hand-character-right'}`}
      transform={shouldMirror ? 'scale(-1, 1)' : undefined}
    >
      <g className="palm-volume">
        {/* Palm & Mass Volumes */}
        <path d={palmPath} fill="url(#kSkinBody)" />
        <path d={knucklePath} fill="url(#kSkinBody)" />
        <path d={thenarPath} fill="url(#kSkinBody)" />
        <path d={hypothenarPath} fill="url(#kSkinBody)" />

        {/* Soft Volume Highlights */}
        <path d={centralHighlight} fill="#FFFFFF" opacity="0.1" />
        <path d={thenarPath} fill="none" stroke="#1E3A8A" strokeWidth={u(4)} opacity="0.1" />
        <path d={hypothenarPath} fill="none" stroke="#1E3A8A" strokeWidth={u(3)} opacity="0.1" />
        <path d={knucklePath} fill="none" stroke="#FFFFFF" strokeWidth={u(3)} opacity="0.15" />
      </g>

      {/* ANATOMICAL DIGITS: Permanent semantic IDs and dimensions */}
      <ParametricDigit len={little.l} baseW={little.base} tipW={little.tip} transform={`translate(${litX}, ${h - u(6)}) rotate(${9 + f.little})`} />
      <ParametricDigit len={ring.l} baseW={ring.base} tipW={ring.tip} transform={`translate(${rngX}, ${h - u(2)}) rotate(${4 + f.ring})`} />
      <ParametricDigit len={middle.l} baseW={middle.base} tipW={middle.tip} transform={`translate(${midX}, ${h}) rotate(${0 + f.middle})`} />
      <ParametricDigit len={index.l} baseW={index.base} tipW={index.tip} transform={`translate(${idxX}, ${h - u(3)}) rotate(${-4 + f.index})`} />
      <ParametricDigit len={thumb.l} baseW={thumb.base} tipW={thumb.tip} transform={thumbTransform} />
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
    // Right arm: shoulder=138° raises arm to upper-left from left shoulder pivot.
    // elbow=42° redirects forearm more upward. Total=180° → arm points straight up.
    // shouldMirror=true (arm pointing up) → thumb on inner/hair side. ✓
    right: { shoulder: 138, elbow: 42, wrist: 0, fingers: { thumb: 20, index: -4, middle: 75, ring: 80, little: 85 } },
    left: { shoulder: -35, elbow: 95, wrist: 20, fingers: { thumb: 15, index: 25, middle: 35, ring: 40, little: 45 } },
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

export const KrishnaArms = ({ pose = 'chakra', renderSide = 'all' }: { pose?: KrishnaPose; renderSide?: KrishnaArmsRenderSide }) => {
  const config = POSE_CONFIGS[pose] || POSE_CONFIGS.chakra;
  const rightTotalAngle = config.right.shoulder + config.right.elbow + config.right.wrist;
  const leftTotalAngle = config.left.shoulder + config.left.elbow + config.left.wrist;

  return (
    <g id="armRoots" filter="url(#kSoftShadow)">
      {/* KRISHNA'S ANATOMICAL RIGHT ARM (Viewer's Left side) — chakra hand */}
      {(renderSide === 'all' || renderSide === 'characterRight') && (
      <g id="leftChestArmRoot" className="arm-character-right">
        <g
          id="leftShoulderPivot"
          transform={`translate(${190 - ARM_SPEC.shoulderPivotOffset}, 205) rotate(${config.right.shoulder})`}
        >
          <g id="leftUpperArm">
            <ParametricUpperArm isFlipped={true} />

            {/* Elbow Pivot Joint */}
            <g id="leftElbowPivot" transform={`translate(0, ${ARM_SPEC.upper.len}) rotate(${config.right.elbow})`}>
              <g id="leftForearm">
                <ParametricForearm />

                {/* Wrist Pivot Joint & Hand */}
                <g id="leftWristPivot" transform={`translate(0, ${ARM_SPEC.forearm.len}) rotate(${config.right.wrist})`}>
                  {/* Character's Right Hand (Chakra Hand) */}
                  <ParametricHand side="characterRight" fingers={config.right.fingers} totalArmAngle={rightTotalAngle} />
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>
      )}

      {/* KRISHNA'S ANATOMICAL LEFT ARM (Viewer's Right side) */}
      {(renderSide === 'all' || renderSide === 'characterLeft') && (
      <g id="rightChestArmRoot" className="arm-character-left">
        <g
          id="rightShoulderPivot"
          transform={`translate(${190 + ARM_SPEC.shoulderPivotOffset}, 205) rotate(${config.left.shoulder})`}
        >
          <g id="rightUpperArm">
            <ParametricUpperArm isFlipped={false} />

            {/* Elbow Pivot Joint */}
            <g id="rightElbowPivot" transform={`translate(0, ${ARM_SPEC.upper.len}) rotate(${config.left.elbow})`}>
              <g id="rightForearm">
                <ParametricForearm />

                {/* Wrist Pivot Joint & Hand */}
                <g id="rightWristPivot" transform={`translate(0, ${ARM_SPEC.forearm.len}) rotate(${config.left.wrist})`}>
                  {/* Character's Left Hand */}
                  <ParametricHand side="characterLeft" fingers={config.left.fingers} totalArmAngle={leftTotalAngle} />
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>
      )}
    </g>
  );
};
