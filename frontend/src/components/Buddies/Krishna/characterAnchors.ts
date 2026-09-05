/**
 * ════════════════════════════════════════════════════════════════════════════
 * KRISHNA CHARACTER ANCHOR SYSTEM — Single Source of Truth
 * ════════════════════════════════════════════════════════════════════════════
 *
 * All character measurements, anchor points, and transform origins live here.
 * Coordinates are in SVG viewBox space: viewBox="0 -140 380 620"
 *
 * The head group has its own local coordinate space due to scale transforms:
 *   Outer: translate(CENTER_X, HEAD_SCALE_PIVOT_Y) scale(HEAD_SCALE) translate(-CENTER_X, -HEAD_SCALE_PIVOT_Y)
 *   Inner: translate(0, HEAD_Y_OFFSET)
 *
 * To convert head-local coords → world coords:
 *   worldY = (localY + HEAD_Y_OFFSET - HEAD_SCALE_PIVOT_Y) * HEAD_SCALE + HEAD_SCALE_PIVOT_Y
 *   worldX = (localX - CENTER_X) * HEAD_SCALE + CENTER_X
 *
 * ════════════════════════════════════════════════════════════════════════════
 */

// ── Global Character Constants ──────────────────────────────────────────────

/** SVG viewBox definition */
export const VIEWBOX = '0 -140 380 620';

/** Character horizontal center in SVG space */
export const CENTER_X = 190;

/** Scale factor applied to the head group to reduce chibi proportions */
export const HEAD_SCALE = 0.78; // reduced from 0.85

/** Y coordinate around which head scaling pivots */
export const HEAD_SCALE_PIVOT_Y = 217;

/** Vertical offset applied to the head group (shifts up) */
export const HEAD_Y_OFFSET = -24; // moved down from -32

/** Jaw narrowing factor applied inside head group */
export const JAW_SCALE_X = 0.97;

/** Leg/lower-body vertical stretch factor */
export const LOWER_BODY_SCALE_Y = 1.06;

// ── Head Anchors (in HEAD-LOCAL coordinate space) ───────────────────────────

export const HEAD = {
  /** Center of the face ellipse in local coords */
  center: { x: 190, y: 132 },

  /** Face silhouette bounding dimensions (approximate) */
  faceWidth: 152,    // x: ~118 to ~264 in head path
  faceHeight: 168,   // y: ~48 to ~216 in head path

  /** Transform origin for head rotation (base of head / neck attachment) */
  transformOrigin: { x: 190, y: 180 },
};

// ── Face Feature Anchors (in HEAD-LOCAL coordinate space) ───────────────────

export const FACE = {
  /** Left eye group anchor (top-left of eye bounding box) */
  leftEye: { x: 135, y: 120 },

  /** Right eye group anchor (top-left of eye bounding box) */
  rightEye: { x: 198, y: 120 },

  /** Left eye center (for transform-origin of gaze/blink) */
  leftEyeCenter: { x: 157.5, y: 137.5 },

  /** Right eye center (for transform-origin of gaze/blink) */
  rightEyeCenter: { x: 220.5, y: 137.5 },

  /** Left eyebrow group center */
  leftEyebrowCenter: { x: 160, y: 113 },

  /** Right eyebrow group center */
  rightEyebrowCenter: { x: 220, y: 113 },

  /** Nose position (center of nose group) */
  nose: { x: 190, y: 164 },

  /** Mouth/lips position (center of mouth group) */
  mouth: { x: 190, y: 183 },

  /** Tilak vertical center */
  tilakCenter: { x: 190, y: 110 },

  /** Left cheek blush center */
  leftCheek: { x: 149, y: 163 },

  /** Right cheek blush center */
  rightCheek: { x: 231, y: 163 },
};

// ── Ear Anchors (in HEAD-LOCAL coordinate space) ────────────────────────────

export const EARS = {
  /** Left ear position (translate origin) */
  left: { x: 118, y: 165, scale: 1.45 },

  /** Right ear position (translate origin) */
  right: { x: 262, y: 165, scale: 1.45 },
};

// ── Hair Anchors (in HEAD-LOCAL coordinate space) ───────────────────────────

export const HAIR = {
  /** PNG hair overlay position */
  overlay: { x: 39, y: -69, width: 296, height: 355 },

  /** Background neck hair mass extends from */
  backgroundTop: 70,
  backgroundBottom: 242,
};

// ── Neck Anchors (in WORLD coordinate space) ────────────────────────────────

export const NECK = {
  /** Top of neck (connects to chin) */
  top: { x: CENTER_X, y: 158 },

  /** Bottom of neck (connects to torso) */
  bottom: { x: CENTER_X, y: 200 },

  /** Width at jaw */
  widthAtJaw: 50,

  /** Width at base (shoulder connection) */
  widthAtBase: 60,

  /** Transform origin for neck */
  transformOrigin: { x: CENTER_X, y: 200 },
};

// ── Torso Anchors (in WORLD coordinate space) ───────────────────────────────

export const TORSO = {
  /** Torso center */
  center: { x: CENTER_X, y: 240 },

  /** Torso path top (neck connection) */
  top: 158,

  /** Torso path bottom (waist) */
  bottom: 280,

  /** Shoulder width (left to right) */
  shoulderWidth: 124,  // ~128 to ~252

  /** Waist width */
  waistWidth: 100,

  /** Left shoulder position */
  leftShoulder: { x: 128, y: 222 },

  /** Right shoulder position */
  rightShoulder: { x: 252, y: 222 },

  /** Transform origin for torso/breathing */
  transformOrigin: { x: CENTER_X, y: 280 },

  /** Chest details */
  leftNipple: { x: 165, y: 228 },
  rightNipple: { x: 215, y: 228 },
  navel: { x: CENTER_X, y: 268 },
};

// ── Arm Anchors (in WORLD coordinate space) ─────────────────────────────────

export const ARMS = {
  /** Shoulder pivot Y position (shared) */
  shoulderPivotY: 205,

  /** Left shoulder pivot (character's left = viewer's right) */
  leftShoulderPivot: { x: CENTER_X + 70, y: 205 },

  /** Right shoulder pivot (character's right = viewer's left) */
  rightShoulderPivot: { x: CENTER_X - 70, y: 205 },

  /** Transform origin for arm rotation = shoulder pivot */
};

// ── Lower Body Anchors (in WORLD coordinate space) ──────────────────────────

export const LOWER_BODY = {
  /** Dhoti waist top */
  waistTop: 270,

  /** Dhoti waist center */
  waistCenter: { x: CENTER_X, y: 285 },

  /** Belt/waistband center */
  beltCenter: { x: CENTER_X, y: 282 },

  /** Left leg center line */
  leftLeg: { x: 150, y: 375 },

  /** Right leg center line */
  rightLeg: { x: 230, y: 375 },

  /** Left foot position */
  leftFoot: { x: 148, y: 426 },

  /** Right foot position */
  rightFoot: { x: 226, y: 426 },

  /** Transform origin for lower body scale */
  transformOrigin: { x: CENTER_X, y: 290 },
};

// ── Necklace Anchors (in WORLD coordinate space) ────────────────────────────

export const NECKLACE = {
  /** Necklace layer 1 (collar) endpoints */
  collar: { leftX: 158, rightX: 222, y: 184 },

  /** Layer 2 (upper chest chain) */
  upperChest: { leftX: 152, rightX: 228, y: 190 },

  /** Layer 3 (deep chest chain) */
  deepChest: { leftX: 148, rightX: 232, y: 192 },

  /** Central pendant position */
  pendant: { x: CENTER_X, y: 240 },
};

// ── Chakra Anchors (in WORLD coordinate space) ──────────────────────────────

export const CHAKRA = {
  /** Sudarshan chakra center */
  center: { x: 91, y: 56 },

  /** Chakra disc radius */
  radius: 40,

  /** Transform origin for spinning */
  transformOrigin: { x: 91, y: 56 },
};

// ── CSS Transform Origins (for animation declarations) ──────────────────────

export const TRANSFORM_ORIGINS = {
  headGroup: `${HEAD.transformOrigin.x}px ${HEAD.transformOrigin.y}px`,
  leftEye: `${FACE.leftEyeCenter.x}px ${FACE.leftEyeCenter.y}px`,
  rightEye: `${FACE.rightEyeCenter.x}px ${FACE.rightEyeCenter.y}px`,
  leftEyebrow: `${FACE.leftEyebrowCenter.x}px ${FACE.leftEyebrowCenter.y}px`,
  rightEyebrow: `${FACE.rightEyebrowCenter.x}px ${FACE.rightEyebrowCenter.y}px`,
  nose: `${FACE.nose.x}px ${FACE.nose.y}px`,
  mouth: `${FACE.mouth.x}px ${FACE.mouth.y}px`,
  chakra: `${CHAKRA.center.x}px ${CHAKRA.center.y}px`,
  torso: `${TORSO.transformOrigin.x}px ${TORSO.transformOrigin.y}px`,
  lowerBody: `${LOWER_BODY.transformOrigin.x}px ${LOWER_BODY.transformOrigin.y}px`,
};

// ── Rendering Layer Order ───────────────────────────────────────────────────

/**
 * Defines the deliberate front-to-back rendering order.
 * Lower numbers render first (further back).
 */
export const LAYER_ORDER = {
  GROUND_SHADOW: 0,
  BACKGROUND_HAIR: 1,
  FEET: 2,
  LEGS: 3,
  BEHIND_WAIST_THUMB: 3.5,
  DHOTI: 4,
  ANKLETS: 4.5,
  TORSO: 5,
  ARMS_UPPER: 6,
  HEAD_BASE: 7,
  EARS: 7.5,
  NOSE: 8,
  EYES: 9,
  EYEBROWS: 10,
  MOUTH: 11,
  HAIR_OVERLAY: 12,
  HAIR_GAP_FILL: 12.5,
  NECKLACE: 13,
  ARMS_FOREARM_HAND: 14,
  CHAKRA: 15,
} as const;
