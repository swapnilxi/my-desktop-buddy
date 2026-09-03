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
  }
};

export const ParametricUpperArm = () => {
  const { len, topW, maxW, botW, ov } = ARM_SPEC.upper;
  const { blendW } = ARM_SPEC.elbow;
  const t = topW / 2, m = maxW / 2, b = botW / 2, e = blendW / 2;
  
  const path = `M ${-t} 0 C ${-m} ${len*0.4}, ${-b} ${len*0.8}, ${-b} ${len} C ${-e} ${len + ov}, ${e} ${len + ov}, ${b} ${len} C ${b} ${len*0.8}, ${m} ${len*0.4}, ${t} 0 Z`;
  const hl = `M 0 5 C 2 ${len*0.3}, 2 ${len*0.7}, 0 ${len - 5}`;
  const shL = `M ${-m*0.85} 15 C ${-m*0.85} ${len*0.4}, ${-b*0.85} ${len*0.8}, ${-b*0.85} ${len - 5}`;
  const shR = `M ${m*0.85} 15 C ${m*0.85} ${len*0.4}, ${b*0.85} ${len*0.8}, ${b*0.85} ${len - 5}`;

  return (
    <g className="parametric-upper-arm">
      <path d={path} fill="url(#kSkinBody)" />
      <path d={hl} fill="none" stroke="#FFFFFF" strokeWidth={u(6)} strokeLinecap="round" opacity="0.2" />
      <path d={shL} fill="none" stroke="#1E3A8A" strokeWidth={u(4)} strokeLinecap="round" opacity="0.15" />
      <path d={shR} fill="none" stroke="#1E3A8A" strokeWidth={u(4)} strokeLinecap="round" opacity="0.15" />
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

export const KrishnaArms = () => {
  return (
    <g id="armRoots" filter="url(#kSoftShadow)">
      {/* LEFT SHOULDER PIVOT ROOT (Viewer's Left, Character's Right) */}
      <g id="leftChestArmRoot">
        {/* Scaled mathematically from master 1000-unit coordinate system */}
        <g id="leftShoulderPivot" transform={`translate(${190 - ARM_SPEC.shoulderPivotOffset}, 205) rotate(135)`}>
          <g id="leftUpperArm">
            <ParametricUpperArm />
            
            {/* Elbow Pivot Joint (Rotational Origin for Forearm) */}
            <g id="leftElbowPivot" transform={`translate(0, ${ARM_SPEC.upper.len}) rotate(-110)`}>
              <g id="leftForearm">
                <ParametricForearm />
                
                {/* Wrist Pivot Marker */}
                <g id="leftWristPivot" transform={`translate(0, ${ARM_SPEC.forearm.len})`}>
                  <circle cx="0" cy="0" r="3.5" fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.5" />
                  <circle cx="0" cy="0" r="1" fill="#FFFFFF" opacity="0.8" />
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>

      {/* RIGHT SHOULDER PIVOT ROOT (Viewer's Right, Character's Left) */}
      <g id="rightChestArmRoot">
        {/* Scaled mathematically from master 1000-unit coordinate system */}
        <g id="rightShoulderPivot" transform={`translate(${190 + ARM_SPEC.shoulderPivotOffset}, 205) rotate(-25)`}>
          <g id="rightUpperArm">
            <ParametricUpperArm />
            
            {/* Elbow Pivot Joint (Rotational Origin for Forearm) */}
            <g id="rightElbowPivot" transform={`translate(0, ${ARM_SPEC.upper.len}) rotate(65)`}>
              <g id="rightForearm">
                <ParametricForearm />
                
                {/* Wrist Pivot Marker */}
                <g id="rightWristPivot" transform={`translate(0, ${ARM_SPEC.forearm.len})`}>
                  <circle cx="0" cy="0" r="3.5" fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.5" />
                  <circle cx="0" cy="0" r="1" fill="#FFFFFF" opacity="0.8" />
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>
    </g>
  );
};
