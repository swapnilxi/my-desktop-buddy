import React from 'react';

// ════════════════ MASTER SCALE SYSTEM ════════════════
// Maps the 1000-unit master specification to the existing SVG 140-unit shoulder coordinate space.
export const MASTER_SCALE = 1.0;
export const u = (val: number) => val;

export const ARM_SPEC = {
  // Shared arm anchor positions relative to character center (X=190)
  // Calibrated to exact krishna2_base.png hollow shoulder sockets: (88.5, 302) & (291.5, 302), width ~49px
  shoulderPivotOffset: 101.5,
  shoulderPivotY: 302,

  // Balanced toddler Upper Arm & Forearm dimensions for continuous organic arm tube
  upper: {
    len: 56, topW: 49, maxW: 49, botW: 31, ov: 6, depth: 28
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

type Vec2 = { x: number; y: number };

const rotVec = (x: number, y: number, deg: number): Vec2 => {
  const rad = (deg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: x * c - y * s, y: x * s + y * c };
};

const normVec = (vx: number, vy: number): Vec2 => {
  const d = Math.hypot(vx, vy);
  return d > 1e-6 ? { x: vx / d, y: vy / d } : { x: 0, y: 1 };
};

/**
 * Builds a single C1-continuous organic arm tube (shoulder -> curved elbow -> tapered wrist)
 * with zero separate ball-joint circles or overlapping segment seams.
 */
function buildContinuousArmGeometry(
  sx: number,
  sy: number,
  shoulderDeg: number,
  elbowDeg: number,
  wristDeg: number,
  upperLen: number,
  forearmLen: number
) {
  const d1 = rotVec(0, upperLen, shoulderDeg);
  const ex = sx + d1.x;
  const ey = sy + d1.y;

  const d2 = rotVec(0, forearmLen, shoulderDeg + elbowDeg);
  const wx = ex + d2.x;
  const wy = ey + d2.y;

  const u1 = normVec(d1.x, d1.y);
  const u2 = normVec(d2.x, d2.y);

  // Lateral normal (+n points to viewer-left of a downward vector)
  const n1: Vec2 = { x: -u1.y, y: u1.x };
  const n2: Vec2 = { x: -u2.y, y: u2.x };

  const rS = ARM_SPEC.upper.topW / 2;   // 22
  const rE = ARM_SPEC.elbow.blendW / 2; // 15.5
  const rW = ARM_SPEC.wrist.width / 2;  // 11

  // Bisector normal & miter clamp at elbow
  const bn = normVec(n1.x + n2.x, n1.y + n2.y);
  const dot = n1.x * bn.x + n1.y * bn.y;
  const miter = Math.min(1.28, 1.0 / Math.max(0.58, dot));

  // Cross product determines which side is the outer elbow curve vs inner crease fold
  const cross = u1.x * u2.y - u1.y * u2.x;
  const bendRad = Math.abs((elbowDeg * Math.PI) / 180);
  const innerSetback = Math.min(upperLen * 0.44, forearmLen * 0.44, Math.max(12, rE * Math.tan(Math.min(bendRad / 2, 1.12)) + 3.5));
  const outerSetback = Math.min(upperLen * 0.38, forearmLen * 0.38, 18);

  const posIsOuter = cross > 0;
  const setbackPos = posIsOuter ? outerSetback : innerSetback;
  const setbackNeg = posIsOuter ? innerSetback : outerSetback;

  // Interpolate arm radius at the setback points before/after elbow
  const rAt = (t: number, a: number, b: number) => a + (b - a) * t;
  const rE1Pos = rAt(1 - setbackPos / upperLen, rS, rE);
  const rE2Pos = rAt(setbackPos / forearmLen, rE, rW);
  const rE1Neg = rAt(1 - setbackNeg / upperLen, rS, rE);
  const rE2Neg = rAt(setbackNeg / forearmLen, rE, rW);

  // Shoulder boundary points (tapered smoothly from full 49px PNG socket width)
  const capDepth = 16;
  const sPos: Vec2 = { x: sx + n1.x * rS, y: sy + n1.y * rS };
  const sNeg: Vec2 = { x: sx - n1.x * rS, y: sy - n1.y * rS };
  const sCap: Vec2 = { x: sx - u1.x * capDepth, y: sy - u1.y * capDepth };

  // Elbow transition anchors on +n side
  const e1Pos: Vec2 = { x: ex - u1.x * setbackPos + n1.x * rE1Pos, y: ey - u1.y * setbackPos + n1.y * rE1Pos };
  const e2Pos: Vec2 = { x: ex + u2.x * setbackPos + n2.x * rE2Pos, y: ey + u2.y * setbackPos + n2.y * rE2Pos };
  const eApexPos: Vec2 = posIsOuter
    ? { x: ex + bn.x * rE * miter * 1.12, y: ey + bn.y * rE * miter * 1.12 }
    : { x: ex + bn.x * rE * 0.88, y: ey + bn.y * rE * 0.88 };

  // Elbow transition anchors on -n side
  const e1Neg: Vec2 = { x: ex - u1.x * setbackNeg - n1.x * rE1Neg, y: ey - u1.y * setbackNeg - n1.y * rE1Neg };
  const e2Neg: Vec2 = { x: ex + u2.x * setbackNeg - n2.x * rE2Neg, y: ey + u2.y * setbackNeg - n2.y * rE2Neg };
  const eApexNeg: Vec2 = !posIsOuter
    ? { x: ex - bn.x * rE * miter * 1.12, y: ey - bn.y * rE * miter * 1.12 }
    : { x: ex - bn.x * rE * 0.88, y: ey - bn.y * rE * 0.88 };

  // Wrist points (extending 5px into hand base so seam is hidden seamlessly inside wrist bangles)
  const wExt = 5;
  const wPos: Vec2 = { x: wx + u2.x * wExt + n2.x * rW, y: wy + u2.y * wExt + n2.y * rW };
  const wNeg: Vec2 = { x: wx + u2.x * wExt - n2.x * rW, y: wy + u2.y * wExt - n2.y * rW };
  const wTip: Vec2 = { x: wx + u2.x * (wExt + 4), y: wy + u2.y * (wExt + 4) };

  const armPath = [
    `M ${sPos.x.toFixed(1)} ${sPos.y.toFixed(1)}`,
    `L ${e1Pos.x.toFixed(1)} ${e1Pos.y.toFixed(1)}`,
    `Q ${eApexPos.x.toFixed(1)} ${eApexPos.y.toFixed(1)}, ${e2Pos.x.toFixed(1)} ${e2Pos.y.toFixed(1)}`,
    `L ${wPos.x.toFixed(1)} ${wPos.y.toFixed(1)}`,
    `Q ${wTip.x.toFixed(1)} ${wTip.y.toFixed(1)}, ${wNeg.x.toFixed(1)} ${wNeg.y.toFixed(1)}`,
    `L ${e2Neg.x.toFixed(1)} ${e2Neg.y.toFixed(1)}`,
    `Q ${eApexNeg.x.toFixed(1)} ${eApexNeg.y.toFixed(1)}, ${e1Neg.x.toFixed(1)} ${e1Neg.y.toFixed(1)}`,
    `L ${sNeg.x.toFixed(1)} ${sNeg.y.toFixed(1)}`,
    `Q ${sCap.x.toFixed(1)} ${sCap.y.toFixed(1)}, ${sPos.x.toFixed(1)} ${sPos.y.toFixed(1)}`,
    'Z',
  ].join(' ');

  // Continuous volumetric highlight running smoothly from shoulder -> elbow -> wrist
  const hlBias = posIsOuter ? 0.34 : -0.34;
  const hStart: Vec2 = { x: sx + u1.x * 6 + n1.x * rS * hlBias, y: sy + u1.y * 6 + n1.y * rS * hlBias };
  const hElbow: Vec2 = { x: ex + bn.x * rE * hlBias, y: ey + bn.y * rE * hlBias };
  const hEnd: Vec2 = { x: wx - u2.x * 4 + n2.x * rW * hlBias, y: wy - u2.y * 4 + n2.y * rW * hlBias };
  const highlightPath = `M ${hStart.x.toFixed(1)} ${hStart.y.toFixed(1)} Q ${hElbow.x.toFixed(1)} ${hElbow.y.toFixed(1)}, ${hEnd.x.toFixed(1)} ${hEnd.y.toFixed(1)}`;

  // Soft underside / medial shadow curve
  const shBias = -hlBias * 1.65;
  const shStart: Vec2 = { x: sx + u1.x * 10 + n1.x * rS * shBias, y: sy + u1.y * 10 + n1.y * rS * shBias };
  const shElbow: Vec2 = { x: ex + bn.x * rE * shBias, y: ey + bn.y * rE * shBias };
  const shEnd: Vec2 = { x: wx - u2.x * 6 + n2.x * rW * shBias, y: wy - u2.y * 6 + n2.y * rW * shBias };
  const shadowPath = `M ${shStart.x.toFixed(1)} ${shStart.y.toFixed(1)} Q ${shElbow.x.toFixed(1)} ${shElbow.y.toFixed(1)}, ${shEnd.x.toFixed(1)} ${shEnd.y.toFixed(1)}`;

  // Soft inner elbow crease accent when arm bends noticeably
  let creasePath: string | null = null;
  if (Math.abs(elbowDeg) > 25) {
    const innerApex = posIsOuter ? eApexNeg : eApexPos;
    const innerDir = posIsOuter ? -1 : 1;
    const c1: Vec2 = { x: innerApex.x - bn.x * innerDir * 1.5 - u1.x * 4, y: innerApex.y - bn.y * innerDir * 1.5 - u1.y * 4 };
    const c2: Vec2 = { x: innerApex.x - bn.x * innerDir * 6.5, y: innerApex.y - bn.y * innerDir * 6.5 };
    creasePath = `M ${c1.x.toFixed(1)} ${c1.y.toFixed(1)} Q ${innerApex.x.toFixed(1)} ${innerApex.y.toFixed(1)}, ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}`;
  }

  // Gold upper armlet (Keyur) anchored at 42% along upper arm
  const armletT = 0.42;
  const armletCenter: Vec2 = { x: sx + d1.x * armletT, y: sy + d1.y * armletT };
  const armletHalfW = rAt(armletT, rS, rE) * 0.94;

  return {
    armPath,
    highlightPath,
    shadowPath,
    creasePath,
    armletCenter,
    armletHalfW,
    shoulderDeg,
    wristPos: { x: wx, y: wy },
    totalAngle: shoulderDeg + elbowDeg + wristDeg,
  };
}

const ContinuousArmMesh = ({
  sx,
  sy,
  shoulder,
  elbow,
  wrist,
  isLeftViewer,
}: {
  sx: number;
  sy: number;
  shoulder: number;
  elbow: number;
  wrist: number;
  isLeftViewer: boolean;
}) => {
  const geom = buildContinuousArmGeometry(
    sx,
    sy,
    shoulder,
    elbow,
    wrist,
    ARM_SPEC.upper.len,
    ARM_SPEC.forearm.len
  );
  const hw = geom.armletHalfW;

  // Seamless PNG deltoid socket cap shaped to exact krishna2_base.png hollow cutout (63.8..113.5)
  const socketCapPath = isLeftViewer
    ? 'M 63.5 291 C 63.0 315, 78 330, 111 328 C 115 316, 115 296, 112 284 C 95 279, 74 282, 63.5 291 Z'
    : 'M 316.5 291 C 317.0 315, 302 330, 269 328 C 265 316, 265 296, 268 284 C 285 279, 306 282, 316.5 291 Z';

  return (
    <g className="continuous-arm-mesh">
      {/* 1. Feathered Deltoid Socket Seal matching krishna2_base.png seamlessly */}
      <path
        d={socketCapPath}
        fill={isLeftViewer ? 'url(#k2_SocketSkinL)' : 'url(#k2_SocketSkinR)'}
        mask="url(#k2_ShoulderFeatherMask)"
      />

      {/* 2. Single Continuous Arm Silhouette + Volumetric Lighting (feathered at shoulder top) */}
      <g mask="url(#k2_ArmTopFeatherMask)">
        <path d={geom.armPath} fill="url(#k2_ArmSkinBase)" />
        <path d={geom.armPath} fill="url(#k2_ArmSurfaceLight)" />
        <path d={geom.highlightPath} fill="none" stroke="#C4E2FF" strokeWidth={5.2} strokeLinecap="round" opacity="0.26" />
        <path d={geom.shadowPath} fill="none" stroke="#3672D8" strokeWidth={4.0} strokeLinecap="round" opacity="0.18" />
      </g>

      {/* 3. Subtle Soft Inner Elbow Fold when Bent */}
      {geom.creasePath && (
        <path d={geom.creasePath} fill="none" stroke="#2D60C2" strokeWidth={1.6} strokeLinecap="round" opacity="0.22" />
      )}

      {/* 5. Gold Upper Armlet (Keyur) wrapping Upper Arm */}
      <g transform={`translate(${geom.armletCenter.x.toFixed(1)}, ${geom.armletCenter.y.toFixed(1)}) rotate(${geom.shoulderDeg})`}>
        <path
          d={`M ${-hw} 1.2 C ${-hw * 0.45} 5.2, ${hw * 0.45} 5.2, ${hw} 1.2`}
          fill="none"
          stroke="#2554B0"
          strokeWidth={2.6}
          opacity="0.22"
        />
        <path
          d={`M ${-hw} 0 C ${-hw * 0.45} 4.0, ${hw * 0.45} 4.0, ${hw} 0`}
          fill="none"
          stroke="url(#kJewelGoldGrad)"
          strokeWidth={4.0}
          strokeLinecap="round"
        />
        <path
          d={`M ${-hw * 0.78} -0.4 C ${-hw * 0.35} 3.2, ${hw * 0.35} 3.2, ${hw * 0.78} -0.4`}
          fill="none"
          stroke="url(#kJewelGoldLight)"
          strokeWidth={1.2}
          strokeLinecap="round"
          opacity="0.95"
        />
        <circle cx={0} cy={2.8} r={2.6} fill="url(#kJewelGoldGrad)" stroke="#92400E" strokeWidth={0.4} />
        <circle cx={0} cy={2.8} r={1.7} fill="url(#kJewelRuby)" stroke="url(#kJewelGoldGrad)" strokeWidth={0.45} />
        <circle cx={-0.5} cy={2.2} r={0.5} fill="#FFFFFF" opacity="0.9" />
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
    // Natural relaxed hang following krishna2_base.png's 15° outward shoulder slope
    right: { shoulder: 15, elbow: -8, wrist: -4, fingers: { thumb: 0, index: 6, middle: 8, ring: 10, little: 12 } },
    left:  { shoulder: -15, elbow: 8, wrist: 4, fingers: { thumb: 0, index: 6, middle: 8, ring: 10, little: 12 } },
  },
  chakra: {
    // Character's right arm (viewer's left): flows smoothly outward along deltoid then curves cleanly up to spin Chakra
    right: { shoulder: 96, elbow: 76, wrist: 8, fingers: { thumb: 22, index: -4, middle: 68, ring: 76, little: 84 } },
    // Character's left arm (viewer's right): rests gently at hip/dhoti waist
    left:  { shoulder: -16, elbow: 42, wrist: 12, fingers: { thumb: 16, index: 16, middle: 24, ring: 30, little: 36 } },
  },
  crossHands: {
    // Both arms follow natural shoulder slope down to elbow, then curve smoothly across tummy
    right: { shoulder: 15, elbow: -90, wrist: -12, fingers: { thumb: 10, index: 14, middle: 18, ring: 22, little: 26 } },
    left:  { shoulder: -15, elbow: 90, wrist: 12, fingers: { thumb: 10, index: 14, middle: 18, ring: 22, little: 26 } },
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

  const leftViewerShoulderX = 190 - ARM_SPEC.shoulderPivotOffset;
  const rightViewerShoulderX = 190 + ARM_SPEC.shoulderPivotOffset;
  const shoulderY = ARM_SPEC.shoulderPivotY;

  const rightGeom = buildContinuousArmGeometry(
    leftViewerShoulderX,
    shoulderY,
    config.right.shoulder,
    config.right.elbow,
    config.right.wrist,
    ARM_SPEC.upper.len,
    ARM_SPEC.forearm.len
  );
  const leftGeom = buildContinuousArmGeometry(
    rightViewerShoulderX,
    shoulderY,
    config.left.shoulder,
    config.left.elbow,
    config.left.wrist,
    ARM_SPEC.upper.len,
    ARM_SPEC.forearm.len
  );

  // When rendering thumbOnly or chakraIndexTip, skip arm mesh
  const isSpecialHandPart = renderHandPart === 'thumbOnly' || renderHandPart === 'chakraIndexTip';
  const showArmMesh = !isSpecialHandPart && (renderLayer === 'all' || renderLayer === 'upperArm' || renderLayer === 'forearmAndHand');
  const showHand = renderLayer === 'all' || renderLayer === 'forearmAndHand' || isSpecialHandPart;

  return (
    <g id={`armRoots-${renderLayer}-${renderHandPart}`}>
      {/* Embedded Master Skin Shaders matched to krishna2_base.png (no dark joint borders) */}
      <defs>
        <linearGradient id="k2_ArmSkinBase" x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stopColor="#7EB9FB" />
          <stop offset="45%" stopColor="#6BAEFB" />
          <stop offset="82%" stopColor="#5499F9" />
          <stop offset="100%" stopColor="#4687EE" />
        </linearGradient>

        <linearGradient id="k2_ArmSurfaceLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#B8DAFF" stopOpacity="0.18" />
          <stop offset="45%" stopColor="#6FB2FB" stopOpacity="0" />
          <stop offset="100%" stopColor="#356ED1" stopOpacity="0.15" />
        </linearGradient>

        {/* Exact PNG-sampled shoulder socket gradients matched to krishna2_base.png (y=283..323) */}
        <linearGradient id="k2_SocketSkinL" gradientUnits="userSpaceOnUse" x1="65" y1="286" x2="112" y2="324">
          <stop offset="0%" stopColor="#77B4FC" />
          <stop offset="48%" stopColor="#6BAEFB" />
          <stop offset="85%" stopColor="#5296F9" />
          <stop offset="100%" stopColor="#3F7EE8" />
        </linearGradient>

        <linearGradient id="k2_SocketSkinR" gradientUnits="userSpaceOnUse" x1="315" y1="286" x2="268" y2="324">
          <stop offset="0%" stopColor="#77B4FC" />
          <stop offset="48%" stopColor="#6BAEFB" />
          <stop offset="85%" stopColor="#5296F9" />
          <stop offset="100%" stopColor="#3F7EE8" />
        </linearGradient>

        {/* Vertical feather masks to melt shoulder top & socket cap invisibly into krishna2_base.png */}
        <linearGradient id="k2_FeatherAlpha" gradientUnits="userSpaceOnUse" x1="0" y1="280" x2="0" y2="298">
          <stop offset="0%" stopColor="#000000" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>
        <mask id="k2_ShoulderFeatherMask" maskUnits="userSpaceOnUse" x="0" y="260" width="380" height="120">
          <rect x="0" y="260" width="380" height="38" fill="url(#k2_FeatherAlpha)" />
          <rect x="0" y="298" width="380" height="82" fill="#FFFFFF" />
        </mask>

        <linearGradient id="k2_ArmFeatherAlpha" gradientUnits="userSpaceOnUse" x1="0" y1="284" x2="0" y2="297">
          <stop offset="0%" stopColor="#000000" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>
        <mask id="k2_ArmTopFeatherMask" maskUnits="userSpaceOnUse" x="-60" y="120" width="500" height="420">
          <rect x="-60" y="120" width="500" height="420" fill="#FFFFFF" />
          {/* Feather only inside solid PNG deltoid overlap (x=74..114 and x=266..306) */}
          <rect x="74" y="270" width="40" height="14" fill="#000000" />
          <rect x="74" y="284" width="40" height="13" fill="url(#k2_ArmFeatherAlpha)" />
          <rect x="266" y="270" width="40" height="14" fill="#000000" />
          <rect x="266" y="284" width="40" height="13" fill="url(#k2_ArmFeatherAlpha)" />
        </mask>

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
          {showArmMesh && (
            <ContinuousArmMesh
              sx={leftViewerShoulderX}
              sy={shoulderY}
              shoulder={config.right.shoulder}
              elbow={config.right.elbow}
              wrist={config.right.wrist}
              isLeftViewer={true}
            />
          )}
          {showHand && (
            <g
              id={`leftWristPivot-${renderLayer}-${renderHandPart}`}
              transform={`translate(${rightGeom.wristPos.x.toFixed(1)}, ${rightGeom.wristPos.y.toFixed(1)}) rotate(${rightGeom.totalAngle})`}
            >
              <ParametricHand
                side="characterRight"
                fingers={config.right.fingers}
                totalArmAngle={rightGeom.totalAngle}
                handLayer={renderHandPart}
              />
            </g>
          )}
        </g>
      )}

      {/* KRISHNA'S ANATOMICAL LEFT ARM (Viewer's Right side) */}
      {(renderSide === 'all' || renderSide === 'characterLeft') && (
        <g id={`rightChestArmRoot-${renderLayer}-${renderHandPart}`} className="arm-character-left">
          {showArmMesh && (
            <ContinuousArmMesh
              sx={rightViewerShoulderX}
              sy={shoulderY}
              shoulder={config.left.shoulder}
              elbow={config.left.elbow}
              wrist={config.left.wrist}
              isLeftViewer={false}
            />
          )}
          {showHand && (
            <g
              id={`rightWristPivot-${renderLayer}-${renderHandPart}`}
              transform={`translate(${leftGeom.wristPos.x.toFixed(1)}, ${leftGeom.wristPos.y.toFixed(1)}) rotate(${leftGeom.totalAngle})`}
            >
              <ParametricHand
                side="characterLeft"
                fingers={config.left.fingers}
                totalArmAngle={leftGeom.totalAngle}
                handLayer={renderHandPart}
              />
            </g>
          )}
        </g>
      )}
    </g>
  );
};
