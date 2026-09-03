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
    palm: { w: u(46), h: u(52), wristW: u(24), transitionL: u(10), d: u(24) },
    knuckle: { w: u(44), d: u(23) },
    thumb: { l: u(25), base: u(13), tip: u(9) },
    index: { l: u(31), base: u(12), tip: u(8) },
    middle: { l: u(34), base: u(12), tip: u(8) },
    ring: { l: u(30), base: u(11), tip: u(8) },
    little: { l: u(25), base: u(10), tip: u(7) }
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

export const ParametricDigit = ({ len, baseW, tipW, transform }: { len: number, baseW: number, tipW: number, transform?: string }) => {
  const b = baseW / 2;
  const t = tipW / 2;
  // Digits start slightly inside the knuckle (Y = -u(4)) to guarantee seamless structural overlap
  const path = `M ${-b} ${-u(4)} C ${-b} ${len*0.3}, ${-t} ${len*0.7}, ${-t} ${len} C ${-t} ${len+t*1.5}, ${t} ${len+t*1.5}, ${t} ${len} C ${t} ${len*0.7}, ${b} ${len*0.3}, ${b} ${-u(4)} Z`;
  return (
    <g className="parametric-digit" transform={transform}>
      <path d={path} fill="url(#kSkinBody)" />
      <path d={`M 0 0 C 1 ${len*0.4}, 1 ${len*0.8}, 0 ${len - u(3)}`} fill="none" stroke="#FFFFFF" strokeWidth={u(3)} strokeLinecap="round" opacity="0.2" />
    </g>
  );
};

export const ParametricHand = ({ isFlipped = false }: { isFlipped?: boolean }) => {
  const { palm, thumb, index, middle, ring, little } = ARM_SPEC.hand;
  
  // Palm transition: perfectly overlapping the u(24) wrist and elegantly flaring out
  const w = palm.wristW / 2;
  const pW = palm.w / 2;
  const h = palm.h;
  
  // Beautiful rounded biological palm pad
  const palmPath = `M ${-w} ${-u(7)} C ${-pW} ${u(10)}, ${-pW*1.1} ${h*0.4}, ${-pW*0.95} ${h} C ${-pW*0.5} ${h+u(5)}, ${pW*0.5} ${h+u(5)}, ${pW*0.95} ${h} C ${pW*1.1} ${h*0.4}, ${pW} ${u(10)}, ${w} ${-u(7)} Z`;
  
  // Thenar eminence (thumb base) for seamless blending
  const thenarPath = `M ${-w} ${-u(3)} C ${-pW*1.5} ${h*0.2}, ${-pW*1.4} ${h*0.6}, ${-pW*0.7} ${h*0.85} C ${-pW*0.2} ${h*0.6}, 0 ${h*0.3}, ${-w} ${-u(3)} Z`;
  
  // Thumb points naturally outward from the thenar base
  const thumbTransform = `translate(${-pW*0.95}, ${h*0.55}) rotate(40)`;
  
  // Digits arranged anatomically along the knuckle curve
  const idxX = -u(16);
  const midX = -u(5);
  const rngX = u(6);
  const litX = u(16);
  
  return (
    <g className="parametric-hand" transform={isFlipped ? 'scale(-1, 1)' : ''}>
      <g className="palm-volume">
        <path d={palmPath} fill="url(#kSkinBody)" />
        <path d={thenarPath} fill="url(#kSkinBody)" />
      </g>
      
      <ParametricDigit len={thumb.l} baseW={thumb.base} tipW={thumb.tip} transform={thumbTransform} />
      <ParametricDigit len={index.l} baseW={index.base} tipW={index.tip} transform={`translate(${idxX}, ${h - u(3)}) rotate(4)`} />
      <ParametricDigit len={middle.l} baseW={middle.base} tipW={middle.tip} transform={`translate(${midX}, ${h}) rotate(0)`} />
      <ParametricDigit len={ring.l} baseW={ring.base} tipW={ring.tip} transform={`translate(${rngX}, ${h - u(2)}) rotate(-4)`} />
      <ParametricDigit len={little.l} baseW={little.base} tipW={little.tip} transform={`translate(${litX}, ${h - u(6)}) rotate(-9)`} />
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
                
                {/* Wrist Pivot Marker & Hand */}
                <g id="leftWristPivot" transform={`translate(0, ${ARM_SPEC.forearm.len})`}>
                  {/* Left Hand is flipped so the thumb points inward */}
                  <ParametricHand isFlipped={true} />
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
                
                {/* Wrist Pivot Marker & Hand */}
                <g id="rightWristPivot" transform={`translate(0, ${ARM_SPEC.forearm.len})`}>
                  <ParametricHand isFlipped={false} />
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>
    </g>
  );
};
