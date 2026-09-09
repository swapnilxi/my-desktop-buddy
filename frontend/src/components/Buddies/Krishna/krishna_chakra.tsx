import React from 'react';
import styles from './krishna.module.css';

/**
 * Sudarshana Chakra Constants & Default Configuration
 */
export const CHAKRA_CENTER = { x: 91, y: 56 };

export const CHAKRA_SPOKE_ANGLES: readonly number[] = [
  0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5,
];

// ─────────────────────────────────────────────────────────────────────────────
// PROPS & TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ChakraAuraProps {
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
  fill?: string;
}

export interface ChakraRimsProps {
  cx?: number;
  cy?: number;
}

export interface ChakraHubProps {
  cx?: number;
  cy?: number;
}

export interface ChakraSpokesProps {
  cx?: number;
  cy?: number;
  angles?: readonly number[];
}

export interface ChakraDiscProps {
  cx?: number;
  cy?: number;
  angles?: readonly number[];
  className?: string;
}

export interface KrishnaChakraProps {
  cx?: number;
  cy?: number;
  scaleX?: number;
  scaleY?: number;
  showAura?: boolean;
  glowFilterId?: string;
  className?: string;
  discClassName?: string;
  style?: React.CSSProperties;
}

export interface HandVaishnavChakraProps {
  x?: number;
  y?: number;
  scale?: number;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULAR SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Divine Golden Radial Glow Aura surrounding the Chakra weapon.
 */
export const ChakraAura: React.FC<ChakraAuraProps> = ({
  cx = CHAKRA_CENTER.x,
  cy = CHAKRA_CENTER.y,
  rx = 50,
  ry = 24,
  fill = 'url(#kChakraAura)',
}) => <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} />;

/**
 * Concentric outer radiant rim, heavy metallic gold border, and inner beaded track.
 */
export const ChakraRims: React.FC<ChakraRimsProps> = ({
  cx = CHAKRA_CENTER.x,
  cy = CHAKRA_CENTER.y,
}) => (
  <>
    {/* Outer Radiant Rim Glow */}
    <circle cx={cx} cy={cy} r="42" fill="url(#kChakraCore)" opacity="0.25" />
    {/* Heavy Solid Metallic Gold Outer Rim */}
    <circle cx={cx} cy={cy} r="40" fill="none" stroke="url(#kGoldGrad)" strokeWidth="7.5" />
    {/* Inner Polished Gold Beaded Track */}
    <circle cx={cx} cy={cy} r="32" fill="none" stroke="#FFFBEB" strokeWidth="2.2" opacity="0.9" />
    <circle cx={cx} cy={cy} r="24" fill="none" stroke="url(#kGoldGrad)" strokeWidth="3.0" opacity="0.75" />
  </>
);

/**
 * Central Sacred Golden Hub with specular highlights.
 */
export const ChakraHub: React.FC<ChakraHubProps> = ({
  cx = CHAKRA_CENTER.x,
  cy = CHAKRA_CENTER.y,
}) => (
  <>
    <circle cx={cx} cy={cy} r="13" fill="url(#kChakraCore)" stroke="#92400E" strokeWidth="2.0" />
    <circle cx={cx} cy={cy} r="4.5" fill="#FFFFF0" />
    <circle cx={cx - 2} cy={cy - 2} r="2.0" fill="#FFFFFF" opacity="0.95" />
  </>
);

/**
 * 16 Radiating Golden Spokes with Razor Diamond Tips.
 */
export const ChakraSpokes: React.FC<ChakraSpokesProps> = ({
  cx = CHAKRA_CENTER.x,
  cy = CHAKRA_CENTER.y,
  angles = CHAKRA_SPOKE_ANGLES,
}) => (
  <>
    {angles.map((angle) => (
      <g key={angle} transform={`rotate(${angle} ${cx} ${cy})`}>
        <line x1={cx + 14} y1={cy} x2={cx + 33} y2={cy} stroke="url(#kGoldGrad)" strokeWidth="3.5" />
        <path
          d={`M ${cx + 32} ${cy} L ${cx + 39} ${cy - 5} L ${cx + 46} ${cy} L ${cx + 39} ${cy + 5} Z`}
          fill="url(#kGoldGrad)"
          stroke="#B45309"
          strokeWidth="1.2"
        />
      </g>
    ))}
  </>
);

/**
 * Horizontally flattened 2D/3D Chakra Disc combining rims, hub, and spokes.
 */
export const ChakraDisc: React.FC<ChakraDiscProps> = ({
  cx = CHAKRA_CENTER.x,
  cy = CHAKRA_CENTER.y,
  angles = CHAKRA_SPOKE_ANGLES,
  className = styles.chakraDisc,
}) => (
  <g className={className}>
    <ChakraRims cx={cx} cy={cy} />
    <ChakraHub cx={cx} cy={cy} />
    <ChakraSpokes cx={cx} cy={cy} angles={angles} />
  </g>
);

/**
 * Pure White Vaishnav-Inspired Starburst Chakra Medallion motif used on Krishna's back of hand.
 */
export const HandVaishnavChakra: React.FC<HandVaishnavChakraProps> = ({
  x = 0,
  y = 0,
  scale = 1,
  className = 'back-hand-vaishnav-chakra',
}) => (
  <g className={className} transform={`translate(${x}, ${y}) scale(${scale})`}>
    {/* Soft Skin Contact Shadow for 3D Relief */}
    <circle cx={0} cy={0.6} r={13.5} fill="#315EA8" opacity="0.22" />
    {/* Soft Base Glow Disc */}
    <circle cx={0} cy={0} r={13.5} fill="#F8F9FF" opacity="0.12" />
    {/* Outer Primary Pure White Chakra Ring */}
    <circle cx={0} cy={0} r={13.0} fill="none" stroke="#FFFFFF" strokeWidth={2.0} opacity="0.98" />
    <circle cx={0} cy={0} r={10.8} fill="none" stroke="#F8F9FF" strokeWidth={1.2} strokeDasharray="2.2, 1.6" opacity="0.95" />
    {/* 8-Point Radial Rays */}
    <g fill="none" stroke="#FFFFFF" strokeWidth={1.4} strokeLinecap="round" opacity="0.98">
      <line x1={0} y1={-13.0} x2={0} y2={-6.0} />
      <line x1={0} y1={6.0} x2={0} y2={13.0} />
      <line x1={-13.0} y1={0} x2={-6.0} y2={0} />
      <line x1={6.0} y1={0} x2={13.0} y2={0} />
      <line x1={-9.2} y1={-9.2} x2={-4.2} y2={-4.2} />
      <line x1={4.2} y1={4.2} x2={9.2} y2={9.2} />
      <line x1={-9.2} y1={9.2} x2={-4.2} y2={4.2} />
      <line x1={4.2} y1={-4.2} x2={9.2} y2={-9.2} />
    </g>
    {/* Inner Petaled Hub Ring */}
    <circle cx={0} cy={0} r={5.2} fill="#F8F9FF" stroke="#FFFFFF" strokeWidth={0.8} opacity="0.98" />
    <circle cx={0} cy={0} r={3.0} fill="#FFFFFF" />
    {/* Central Vertical Vaishnav U-Bindu Teardrop Motif */}
    <path
      d="M -1.4 -4.5 L -1.4 1.0 C -1.4 3.2, 1.4 3.2, 1.4 1.0 L 1.4 -4.5 Z"
      fill="#FFFFFF"
      opacity="1.0"
    />
  </g>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CHAKRA COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * KrishnaChakra / SudarshanChakra
 *
 * Full Sudarshana Chakra Master SVG Group including divine radial aura,
 * 3D horizontal tilt transformation, and animated spinning disc.
 */
export const KrishnaChakra: React.FC<KrishnaChakraProps> = ({
  cx = CHAKRA_CENTER.x,
  cy = CHAKRA_CENTER.y,
  scaleX = 1,
  scaleY = 0.48,
  showAura = true,
  glowFilterId = 'kChakraGlowFilter',
  className,
  discClassName = styles.chakraDisc,
  style,
}) => {
  const filterUrl = glowFilterId ? `url(#${glowFilterId})` : undefined;

  return (
    <g id="sudarshanChakraMaster" filter={filterUrl} className={className} style={style}>
      {/* Divine Golden Radial Glow Aura */}
      {showAura && <ChakraAura cx={cx} cy={cy} />}

      {/* 3D Horizontally Oriented Chakra Disc */}
      <g transform={`translate(${cx}, ${cy}) scale(${scaleX}, ${scaleY}) translate(${-cx}, ${-cy})`}>
        <ChakraDisc cx={cx} cy={cy} className={discClassName} />
      </g>
    </g>
  );
};

export const SudarshanChakra = KrishnaChakra;

export default KrishnaChakra;
