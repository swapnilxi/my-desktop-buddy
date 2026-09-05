'use client';

import React from 'react';

/**
 * ════════════════════════════════════════════════════════════════════════════
 * KRISHNA DEFS — Shared SVG Gradient, Filter & ClipPath Definitions
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Single source of truth for all SVG <defs> used across the Krishna character.
 * This component should be rendered once inside the main <svg> element.
 *
 * Organization:
 *   1. Skin Shaders (face, body, limbs, hands)
 *   2. Hair Shaders
 *   3. Eye & Facial Feature Shaders
 *   4. Gold / Jewelry Shaders
 *   5. Dhoti / Fabric Shaders
 *   6. Chakra & Feather Shaders
 *   7. Filters
 *   8. ClipPaths
 *   9. Arm-Specific Shaders (previously in krishna_arms.tsx)
 * ════════════════════════════════════════════════════════════════════════════
 */
export const KrishnaDefs: React.FC = () => (
  <defs>
    {/* ══════════════════════════════════════════════════════════════════
        1. SKIN SHADERS
        ══════════════════════════════════════════════════════════════════ */}

    {/* 3D Soft Skin Shader — Face (Periwinkle Blue #6BA7FF + Upper-Left Key Light) */}
    <radialGradient id="kSkinFace" cx="38%" cy="28%" r="68%">
      <stop offset="0%" stopColor="#A9CCFF" />
      <stop offset="22%" stopColor="#84B5FA" />
      <stop offset="55%" stopColor="#6BA7FF" />
      <stop offset="82%" stopColor="#4E82D1" />
      <stop offset="100%" stopColor="#315EA8" />
    </radialGradient>

    {/* Jaw / Lower Face Shadow Depth for Sculpted Chin */}
    <linearGradient id="kJawlineShadow" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stopColor="#315EA8" stopOpacity="0" />
      <stop offset="70%" stopColor="#315EA8" stopOpacity="0.12" />
      <stop offset="100%" stopColor="#315EA8" stopOpacity="0.22" />
    </linearGradient>

    {/* Asymmetric Left Cheek Highlight (Key Light from Upper-Left) */}
    <radialGradient id="kCheekVolumeLeft" cx="34%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#A9CCFF" stopOpacity="0.65" />
      <stop offset="35%" stopColor="#84B5FA" stopOpacity="0.32" />
      <stop offset="75%" stopColor="#6BA7FF" stopOpacity="0.10" />
      <stop offset="100%" stopColor="#4E82D1" stopOpacity="0" />
    </radialGradient>

    {/* Soft Right Cheek Fill/Ambient Volume */}
    <radialGradient id="kCheekVolumeRight" cx="66%" cy="38%" r="65%">
      <stop offset="0%" stopColor="#84B5FA" stopOpacity="0.38" />
      <stop offset="40%" stopColor="#6BA7FF" stopOpacity="0.20" />
      <stop offset="80%" stopColor="#4E82D1" stopOpacity="0.08" />
      <stop offset="100%" stopColor="#315EA8" stopOpacity="0" />
    </radialGradient>

    <radialGradient id="kForeheadGlow" cx="42%" cy="30%" r="55%">
      <stop offset="0%" stopColor="#A9CCFF" stopOpacity="0.5" />
      <stop offset="60%" stopColor="#84B5FA" stopOpacity="0.18" />
      <stop offset="100%" stopColor="#6BA7FF" stopOpacity="0" />
    </radialGradient>

    <radialGradient id="kChinVolume" cx="46%" cy="36%" r="55%">
      <stop offset="0%" stopColor="#A9CCFF" stopOpacity="0.38" />
      <stop offset="55%" stopColor="#84B5FA" stopOpacity="0.18" />
      <stop offset="100%" stopColor="#6BA7FF" stopOpacity="0" />
    </radialGradient>

    {/* 3D Sculpted Child Ear Gradients */}
    <radialGradient id="kEarBaseLeft" cx="38%" cy="32%" r="68%">
      <stop offset="0%" stopColor="#A9CCFF" />
      <stop offset="28%" stopColor="#84B5FA" />
      <stop offset="65%" stopColor="#6BA7FF" />
      <stop offset="88%" stopColor="#4E82D1" />
      <stop offset="100%" stopColor="#315EA8" />
    </radialGradient>

    <radialGradient id="kEarBaseRight" cx="62%" cy="32%" r="68%">
      <stop offset="0%" stopColor="#A9CCFF" />
      <stop offset="28%" stopColor="#84B5FA" />
      <stop offset="65%" stopColor="#6BA7FF" />
      <stop offset="88%" stopColor="#4E82D1" />
      <stop offset="100%" stopColor="#315EA8" />
    </radialGradient>

    <radialGradient id="kEarInnerShadow" cx="45%" cy="40%" r="60%">
      <stop offset="0%" stopColor="#315EA8" />
      <stop offset="60%" stopColor="#4E82D1" />
      <stop offset="88%" stopColor="#6BA7FF" />
      <stop offset="100%" stopColor="#84B5FA" stopOpacity="0" />
    </radialGradient>

    {/* 3D Cylindrical Neck & Occlusion Shaders */}
    <linearGradient id="kSkinNeck" x1="10%" y1="0%" x2="90%" y2="100%">
      <stop offset="0%" stopColor="#A9CCFF" />
      <stop offset="22%" stopColor="#84B5FA" />
      <stop offset="55%" stopColor="#6BA7FF" />
      <stop offset="85%" stopColor="#4E82D1" />
      <stop offset="100%" stopColor="#315EA8" />
    </linearGradient>

    <linearGradient id="kNeckOcclusionShadow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#315EA8" stopOpacity="0.35" />
      <stop offset="60%" stopColor="#4E82D1" stopOpacity="0.16" />
      <stop offset="100%" stopColor="#6BA7FF" stopOpacity="0" />
    </linearGradient>

    {/* Unified 3D Seamless Skin Shaders */}
    <radialGradient id="kSkinBody" cx="36%" cy="26%" r="70%">
      <stop offset="0%" stopColor="#A9CCFF" />
      <stop offset="28%" stopColor="#84B5FA" />
      <stop offset="62%" stopColor="#6BA7FF" />
      <stop offset="88%" stopColor="#4E82D1" />
      <stop offset="100%" stopColor="#315EA8" />
    </radialGradient>

    <radialGradient id="kSkinLimb" cx="36%" cy="26%" r="68%">
      <stop offset="0%" stopColor="#A9CCFF" />
      <stop offset="30%" stopColor="#84B5FA" />
      <stop offset="68%" stopColor="#6BA7FF" />
      <stop offset="90%" stopColor="#4E82D1" />
      <stop offset="100%" stopColor="#315EA8" />
    </radialGradient>

    <radialGradient id="kSkinHand" cx="38%" cy="28%" r="65%">
      <stop offset="0%" stopColor="#A9CCFF" />
      <stop offset="35%" stopColor="#84B5FA" />
      <stop offset="72%" stopColor="#6BA7FF" />
      <stop offset="100%" stopColor="#4E82D1" />
    </radialGradient>

    {/* 3D Toddler Hand & Joint Sculpting Shaders */}
    <radialGradient id="kHandVolume" cx="38%" cy="28%" r="65%">
      <stop offset="0%" stopColor="#A9CCFF" stopOpacity="0.45" />
      <stop offset="38%" stopColor="#84B5FA" stopOpacity="0.18" />
      <stop offset="100%" stopColor="#6BA7FF" stopOpacity="0" />
    </radialGradient>

    <radialGradient id="kJointSoftBlend" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#84B5FA" stopOpacity="0.38" />
      <stop offset="60%" stopColor="#6BA7FF" stopOpacity="0.12" />
      <stop offset="100%" stopColor="#4E82D1" stopOpacity="0" />
    </radialGradient>

    {/* Cute Rosy Lotus Blush for Little Krishna's Baby Toes */}
    <radialGradient id="kLotusToeBlush" cx="50%" cy="38%" r="62%">
      <stop offset="0%" stopColor="#FFA6BA" stopOpacity="0.9" />
      <stop offset="50%" stopColor="#FB7185" stopOpacity="0.5" />
      <stop offset="100%" stopColor="#5B9AFA" stopOpacity="0" />
    </radialGradient>

    <linearGradient id="kJewelryContactShadow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#315EA8" stopOpacity="0.30" />
      <stop offset="60%" stopColor="#4E82D1" stopOpacity="0.14" />
      <stop offset="100%" stopColor="#6BA7FF" stopOpacity="0" />
    </linearGradient>

    <linearGradient id="kFingerCylinder" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#255BB5" />
      <stop offset="25%" stopColor="#5B9AFA" />
      <stop offset="60%" stopColor="#87BDFF" />
      <stop offset="90%" stopColor="#4A8DF8" />
      <stop offset="100%" stopColor="#1E4E9E" />
    </linearGradient>

    {/* Specialized 3D Volumetric Limb & Finger Gradients */}
    <radialGradient id="kArmVolumeShader" cx="38%" cy="28%" r="68%">
      <stop offset="0%" stopColor="#E2F0FF" />
      <stop offset="28%" stopColor="#96C6FF" />
      <stop offset="65%" stopColor="#5B9AFA" />
      <stop offset="90%" stopColor="#306FD8" />
      <stop offset="100%" stopColor="#1E4E9E" />
    </radialGradient>

    <linearGradient id="kToddlerFingerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#CCE3FF" />
      <stop offset="28%" stopColor="#7EBAFF" />
      <stop offset="72%" stopColor="#488DF8" />
      <stop offset="100%" stopColor="#2157B5" />
    </linearGradient>

    {/* ══════════════════════════════════════════════════════════════════
        2. HAIR SHADERS
        ══════════════════════════════════════════════════════════════════ */}

    <radialGradient id="kHairBase" cx="35%" cy="25%" r="75%">
      <stop offset="0%" stopColor="#283B5E" />
      <stop offset="38%" stopColor="#152138" />
      <stop offset="75%" stopColor="#0A111F" />
      <stop offset="100%" stopColor="#03060D" />
    </radialGradient>

    <radialGradient id="kHairCurl" cx="35%" cy="28%" r="68%">
      <stop offset="0%" stopColor="#3E557F" />
      <stop offset="35%" stopColor="#20304C" />
      <stop offset="72%" stopColor="#0E1728" />
      <stop offset="100%" stopColor="#050812" />
    </radialGradient>

    <radialGradient id="kHairHl" cx="32%" cy="26%" r="55%">
      <stop offset="0%" stopColor="#6CA0E8" stopOpacity="0.65" />
      <stop offset="50%" stopColor="#8EA9D4" stopOpacity="0.22" />
      <stop offset="100%" stopColor="#1E2A3E" stopOpacity="0" />
    </radialGradient>

    {/* Background Neck Hair Gradients */}
    <linearGradient id="kBackgroundNeckHairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#0D1B49" stopOpacity="0.98" />
      <stop offset="45%" stopColor="#040A25" stopOpacity="0.98" />
      <stop offset="80%" stopColor="#0D1B49" stopOpacity="0.95" />
      <stop offset="100%" stopColor="#040A25" stopOpacity="0.90" />
    </linearGradient>

    <linearGradient id="kBehindEarL" x1="100%" y1="20%" x2="0%" y2="80%">
      <stop offset="0%" stopColor="#040A25" stopOpacity="0.95" />
      <stop offset="30%" stopColor="#0D1B49" stopOpacity="0.95" />
      <stop offset="65%" stopColor="#22377C" stopOpacity="0.90" />
      <stop offset="88%" stopColor="#0B94B4" stopOpacity="0.80" />
      <stop offset="100%" stopColor="#040A25" stopOpacity="0.60" />
    </linearGradient>

    <linearGradient id="kBehindEarR" x1="0%" y1="20%" x2="100%" y2="80%">
      <stop offset="0%" stopColor="#040A25" stopOpacity="0.95" />
      <stop offset="30%" stopColor="#0D1B49" stopOpacity="0.95" />
      <stop offset="65%" stopColor="#22377C" stopOpacity="0.90" />
      <stop offset="88%" stopColor="#0B94B4" stopOpacity="0.80" />
      <stop offset="100%" stopColor="#040A25" stopOpacity="0.60" />
    </linearGradient>

    <linearGradient id="kNeckSideHairL" x1="80%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#0D1B49" stopOpacity="0.95" />
      <stop offset="35%" stopColor="#22377C" stopOpacity="0.90" />
      <stop offset="75%" stopColor="#0B94B4" stopOpacity="0.80" />
      <stop offset="100%" stopColor="#040A25" stopOpacity="0.75" />
    </linearGradient>

    <linearGradient id="kNeckSideHairR" x1="20%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#0D1B49" stopOpacity="0.95" />
      <stop offset="35%" stopColor="#22377C" stopOpacity="0.90" />
      <stop offset="75%" stopColor="#0B94B4" stopOpacity="0.80" />
      <stop offset="100%" stopColor="#040A25" stopOpacity="0.75" />
    </linearGradient>

    <linearGradient id="kHairHighlightSheen" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#22377C" stopOpacity="0.85" />
      <stop offset="50%" stopColor="#0B94B4" stopOpacity="0.95" />
      <stop offset="100%" stopColor="#22377C" stopOpacity="0.30" />
    </linearGradient>

    {/* ══════════════════════════════════════════════════════════════════
        3. EYE & FACIAL FEATURE SHADERS
        ══════════════════════════════════════════════════════════════════ */}

    {/* 3D Eyes (Warm Brown / Chocolate / Honey Amber) */}
    <radialGradient id="kIrisGrad" cx="42%" cy="36%" r="62%">
      <stop offset="0%" stopColor="#FDE68A" />
      <stop offset="22%" stopColor="#F59E0B" />
      <stop offset="50%" stopColor="#B45309" />
      <stop offset="78%" stopColor="#5B1D04" />
      <stop offset="92%" stopColor="#2A0B02" />
      <stop offset="100%" stopColor="#100300" />
    </radialGradient>

    {/* Soft Feathered Dark Pupil Gradient */}
    <radialGradient id="kPupilGrad" cx="48%" cy="46%" r="56%">
      <stop offset="0%" stopColor="#070302" />
      <stop offset="65%" stopColor="#140602" />
      <stop offset="85%" stopColor="#240A03" stopOpacity="0.85" />
      <stop offset="100%" stopColor="#350E04" stopOpacity="0" />
    </radialGradient>

    {/* 3D Soft Blended Nose Shading */}
    <radialGradient id="kNoseVolume" cx="45%" cy="35%" r="65%">
      <stop offset="0%" stopColor="#EFF6FF" />
      <stop offset="35%" stopColor="#A4CDFF" />
      <stop offset="70%" stopColor="#6BA7FF" stopOpacity="0.85" />
      <stop offset="100%" stopColor="#417FD8" stopOpacity="0" />
    </radialGradient>

    {/* Pixar Stylized Natural Lip Warmth Gradients */}
    <linearGradient id="kPixarLipWarmth" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#D47B8C" stopOpacity="0.55" />
      <stop offset="60%" stopColor="#B8586C" stopOpacity="0.38" />
      <stop offset="100%" stopColor="#8C3549" stopOpacity="0.12" />
    </linearGradient>

    <radialGradient id="kPixarLowerLip" cx="50%" cy="28%" r="62%">
      <stop offset="0%" stopColor="#E290A0" stopOpacity="0.7" />
      <stop offset="55%" stopColor="#C46679" stopOpacity="0.45" />
      <stop offset="100%" stopColor="#8C3549" stopOpacity="0.05" />
    </radialGradient>

    {/* Cheeks Rosy Blush (Soft & Delicate Airbrush Glow) */}
    <radialGradient id="kCheekBlush" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="rgba(255, 120, 160, 0.55)" />
      <stop offset="50%" stopColor="rgba(255, 140, 175, 0.26)" />
      <stop offset="80%" stopColor="rgba(255, 160, 190, 0.08)" />
      <stop offset="100%" stopColor="rgba(255, 180, 205, 0)" />
    </radialGradient>

    {/* ══════════════════════════════════════════════════════════════════
        4. GOLD / JEWELRY SHADERS
        ══════════════════════════════════════════════════════════════════ */}

    <linearGradient id="kGoldGrad" x1="10%" y1="0%" x2="90%" y2="100%">
      <stop offset="0%" stopColor="#FFF0A3" />
      <stop offset="28%" stopColor="#FFD45A" />
      <stop offset="68%" stopColor="#F5A900" />
      <stop offset="92%" stopColor="#B86A00" />
      <stop offset="100%" stopColor="#8A4A00" />
    </linearGradient>

    <radialGradient id="kGoldBead" cx="32%" cy="28%" r="65%">
      <stop offset="0%" stopColor="#FFF0A3" />
      <stop offset="32%" stopColor="#FFD45A" />
      <stop offset="70%" stopColor="#F5A900" />
      <stop offset="100%" stopColor="#B86A00" />
    </radialGradient>

    <radialGradient id="kRubyBead" cx="32%" cy="28%" r="65%">
      <stop offset="0%" stopColor="#FFA6A6" />
      <stop offset="35%" stopColor="#EF4444" />
      <stop offset="75%" stopColor="#B91C1C" />
      <stop offset="100%" stopColor="#7F1D1D" />
    </radialGradient>

    <radialGradient id="kGoldDomeRivet" cx="32%" cy="28%" r="68%">
      <stop offset="0%" stopColor="#FFF0A3" />
      <stop offset="25%" stopColor="#FFD45A" />
      <stop offset="60%" stopColor="#F5A900" />
      <stop offset="85%" stopColor="#B86A00" />
      <stop offset="100%" stopColor="#8A4A00" />
    </radialGradient>

    <linearGradient id="kGoldBeltRim" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#B45309" />
      <stop offset="20%" stopColor="#FBBF24" />
      <stop offset="48%" stopColor="#FFFFFF" />
      <stop offset="78%" stopColor="#FDE68A" />
      <stop offset="100%" stopColor="#92400E" />
    </linearGradient>

    <radialGradient id="kGoldDomeStud" cx="32%" cy="28%" r="68%">
      <stop offset="0%" stopColor="#FFFFFF" />
      <stop offset="22%" stopColor="#FEF08A" />
      <stop offset="55%" stopColor="#F59E0B" />
      <stop offset="85%" stopColor="#B45309" />
      <stop offset="100%" stopColor="#662200" />
    </radialGradient>

    {/* 3D Royal Ghungroo Payal (Anklet) Shaders */}
    <linearGradient id="kPayalGold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#D97706" />
      <stop offset="14%" stopColor="#FBBF24" />
      <stop offset="32%" stopColor="#FFFDEB" />
      <stop offset="55%" stopColor="#F59E0B" />
      <stop offset="80%" stopColor="#D97706" />
      <stop offset="100%" stopColor="#78350F" />
    </linearGradient>

    <radialGradient id="kPayalRuby" cx="35%" cy="30%" r="68%">
      <stop offset="0%" stopColor="#FFA4A4" />
      <stop offset="25%" stopColor="#EF4444" />
      <stop offset="65%" stopColor="#B91C1C" />
      <stop offset="100%" stopColor="#7F1D1D" />
    </radialGradient>

    <radialGradient id="kPayalEmerald" cx="35%" cy="30%" r="68%">
      <stop offset="0%" stopColor="#A7F3D0" />
      <stop offset="30%" stopColor="#10B981" />
      <stop offset="70%" stopColor="#047857" />
      <stop offset="100%" stopColor="#064E3B" />
    </radialGradient>

    <radialGradient id="kPayalBellDome" cx="35%" cy="26%" r="72%">
      <stop offset="0%" stopColor="#FFFFFF" />
      <stop offset="22%" stopColor="#FFF2A3" />
      <stop offset="50%" stopColor="#FBBF24" />
      <stop offset="76%" stopColor="#D97706" />
      <stop offset="92%" stopColor="#92400E" />
      <stop offset="100%" stopColor="#78350F" />
    </radialGradient>

    <radialGradient id="kPayalPearl" cx="35%" cy="28%" r="65%">
      <stop offset="0%" stopColor="#FFFFFF" />
      <stop offset="42%" stopColor="#FFFBEB" />
      <stop offset="75%" stopColor="#FDE68A" />
      <stop offset="100%" stopColor="#D97706" />
    </radialGradient>

    {/* ══════════════════════════════════════════════════════════════════
        5. DHOTI / FABRIC SHADERS
        ══════════════════════════════════════════════════════════════════ */}

    <linearGradient id="kDhotiWaistGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#FF9A2E" />
      <stop offset="25%" stopColor="#FF7A00" />
      <stop offset="58%" stopColor="#FF6A00" />
      <stop offset="85%" stopColor="#E65300" />
      <stop offset="100%" stopColor="#B93D00" />
    </linearGradient>

    {/* Base Under-wrap gradient */}
    <linearGradient id="kDhotiBaseGrad" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stopColor="#FFD95A" />
      <stop offset="25%" stopColor="#FFC238" />
      <stop offset="55%" stopColor="#F8A916" />
      <stop offset="85%" stopColor="#D87900" />
      <stop offset="100%" stopColor="#B85C00" />
    </linearGradient>

    <radialGradient id="kDhotiLeftMassGrad" cx="32%" cy="26%" r="72%">
      <stop offset="0%" stopColor="#FFD95A" />
      <stop offset="30%" stopColor="#FFC238" />
      <stop offset="60%" stopColor="#F8A916" />
      <stop offset="88%" stopColor="#D87900" />
      <stop offset="100%" stopColor="#B85C00" />
    </radialGradient>

    <radialGradient id="kDhotiRightMassGrad" cx="44%" cy="30%" r="70%">
      <stop offset="0%" stopColor="#FFD95A" />
      <stop offset="32%" stopColor="#FFC238" />
      <stop offset="65%" stopColor="#F8A916" />
      <stop offset="90%" stopColor="#D87900" />
      <stop offset="100%" stopColor="#B85C00" />
    </radialGradient>

    {/* Sculptural Yellow Fabric Fold Gradients */}
    <linearGradient id="kDhotiFoldL1Grad" x1="15%" y1="10%" x2="85%" y2="90%">
      <stop offset="0%" stopColor="#FFD95A" />
      <stop offset="25%" stopColor="#FFC238" />
      <stop offset="60%" stopColor="#F8A916" />
      <stop offset="85%" stopColor="#D87900" />
      <stop offset="100%" stopColor="#B85C00" />
    </linearGradient>

    <linearGradient id="kDhotiFoldL2Grad" x1="12%" y1="18%" x2="88%" y2="82%">
      <stop offset="0%" stopColor="#FFD95A" />
      <stop offset="28%" stopColor="#FFC238" />
      <stop offset="62%" stopColor="#F8A916" />
      <stop offset="88%" stopColor="#D87900" />
      <stop offset="100%" stopColor="#B85C00" />
    </linearGradient>

    <linearGradient id="kDhotiFoldL3Grad" x1="10%" y1="20%" x2="90%" y2="80%">
      <stop offset="0%" stopColor="#FFD95A" />
      <stop offset="30%" stopColor="#FFC238" />
      <stop offset="65%" stopColor="#F8A916" />
      <stop offset="90%" stopColor="#D87900" />
      <stop offset="100%" stopColor="#B85C00" />
    </linearGradient>

    <linearGradient id="kDhotiFoldR1Grad" x1="85%" y1="10%" x2="15%" y2="90%">
      <stop offset="0%" stopColor="#FFD95A" />
      <stop offset="28%" stopColor="#FFC238" />
      <stop offset="65%" stopColor="#F8A916" />
      <stop offset="88%" stopColor="#D87900" />
      <stop offset="100%" stopColor="#B85C00" />
    </linearGradient>

    <linearGradient id="kDhotiFoldR2Grad" x1="80%" y1="20%" x2="20%" y2="80%">
      <stop offset="0%" stopColor="#FFD95A" />
      <stop offset="28%" stopColor="#FFC238" />
      <stop offset="65%" stopColor="#F8A916" />
      <stop offset="92%" stopColor="#D87900" />
      <stop offset="100%" stopColor="#B85C00" />
    </linearGradient>

    {/* Central Cascading Pleat Gradients */}
    <linearGradient id="kDhotiPleatTopGrad" x1="30%" y1="0%" x2="70%" y2="100%">
      <stop offset="0%" stopColor="#FFFFFF" />
      <stop offset="20%" stopColor="#FFD95A" />
      <stop offset="55%" stopColor="#FFC238" />
      <stop offset="85%" stopColor="#F8A916" />
      <stop offset="100%" stopColor="#D87900" />
    </linearGradient>

    <linearGradient id="kDhotiPleatMidGrad" x1="40%" y1="0%" x2="60%" y2="100%">
      <stop offset="0%" stopColor="#FFD95A" />
      <stop offset="28%" stopColor="#FFC238" />
      <stop offset="68%" stopColor="#F8A916" />
      <stop offset="100%" stopColor="#D87900" />
    </linearGradient>

    <linearGradient id="kDhotiPleatDeepGrad" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stopColor="#F8A916" />
      <stop offset="50%" stopColor="#D87900" />
      <stop offset="100%" stopColor="#B85C00" />
    </linearGradient>

    {/* Orange Hanging Silk Side Cloth */}
    <linearGradient id="kDhotiOrangeSash1" x1="15%" y1="0%" x2="85%" y2="100%">
      <stop offset="0%" stopColor="#FF9A2E" />
      <stop offset="25%" stopColor="#FF7A00" />
      <stop offset="58%" stopColor="#FF6A00" />
      <stop offset="85%" stopColor="#E65300" />
      <stop offset="100%" stopColor="#B93D00" />
    </linearGradient>

    <linearGradient id="kDhotiOrangeSash2" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stopColor="#FF9A2E" />
      <stop offset="28%" stopColor="#FF7A00" />
      <stop offset="62%" stopColor="#FF6A00" />
      <stop offset="88%" stopColor="#E65300" />
      <stop offset="100%" stopColor="#B93D00" />
    </linearGradient>

    {/* ══════════════════════════════════════════════════════════════════
        6. CHAKRA & FEATHER SHADERS
        ══════════════════════════════════════════════════════════════════ */}

    <radialGradient id="kChakraCore" cx="35%" cy="28%" r="72%">
      <stop offset="0%" stopColor="#FFFFEE" />
      <stop offset="24%" stopColor="#FDE68A" />
      <stop offset="55%" stopColor="#F59E0B" />
      <stop offset="85%" stopColor="#D97706" />
      <stop offset="100%" stopColor="#78350F" />
    </radialGradient>

    <radialGradient id="kChakraAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="rgba(255, 230, 110, 0.65)" />
      <stop offset="50%" stopColor="rgba(255, 175, 20, 0.28)" />
      <stop offset="80%" stopColor="rgba(255, 140, 0, 0.1)" />
      <stop offset="100%" stopColor="rgba(255, 140, 0, 0)" />
    </radialGradient>

    {/* Peacock Feather Shaders */}
    <radialGradient id="kFeatherPlume" cx="44%" cy="38%" r="66%">
      <stop offset="0%" stopColor="#BEF264" />
      <stop offset="25%" stopColor="#4ADE80" />
      <stop offset="58%" stopColor="#16A34A" />
      <stop offset="88%" stopColor="#065F46" />
      <stop offset="100%" stopColor="#022C22" />
    </radialGradient>

    <radialGradient id="kFeatherEyeGold" cx="48%" cy="46%" r="62%">
      <stop offset="0%" stopColor="#FEF08A" />
      <stop offset="26%" stopColor="#FBBF24" />
      <stop offset="60%" stopColor="#F59E0B" />
      <stop offset="88%" stopColor="#D97706" />
      <stop offset="100%" stopColor="#7C2D12" />
    </radialGradient>

    <radialGradient id="kFeatherEyeCyan" cx="48%" cy="46%" r="60%">
      <stop offset="0%" stopColor="#E0F2FE" />
      <stop offset="30%" stopColor="#38BDF8" />
      <stop offset="70%" stopColor="#0284C7" />
      <stop offset="100%" stopColor="#0369A1" />
    </radialGradient>

    <radialGradient id="kFeatherEyeNavy" cx="46%" cy="38%" r="65%">
      <stop offset="0%" stopColor="#60A5FA" />
      <stop offset="26%" stopColor="#1D4ED8" />
      <stop offset="65%" stopColor="#1E1B4B" />
      <stop offset="92%" stopColor="#0F172A" />
      <stop offset="100%" stopColor="#020617" />
    </radialGradient>

    <radialGradient id="kFeatherEyeViolet" cx="44%" cy="38%" r="60%">
      <stop offset="0%" stopColor="#F472B6" />
      <stop offset="30%" stopColor="#C084FC" />
      <stop offset="65%" stopColor="#7E22CE" />
      <stop offset="90%" stopColor="#3B0764" />
      <stop offset="100%" stopColor="#180228" />
    </radialGradient>

    <linearGradient id="kFeatherStem" x1="0%" y1="100%" x2="30%" y2="0%">
      <stop offset="0%" stopColor="#854D0E" />
      <stop offset="40%" stopColor="#B45309" />
      <stop offset="80%" stopColor="#D97706" />
      <stop offset="100%" stopColor="#FDE047" />
    </linearGradient>

    {/* ══════════════════════════════════════════════════════════════════
        7. FILTERS
        ══════════════════════════════════════════════════════════════════ */}

    <filter id="kFeatherGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="1" stdDeviation="2.2" floodColor="#0F766E" floodOpacity="0.4" />
    </filter>

    <filter id="kSoftShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#0F1B3D" floodOpacity="0.38" />
    </filter>

    <filter id="kChakraGlowFilter" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#F59E0B" floodOpacity="0.7" />
    </filter>

    {/* Ground Shadow Radial Shader & Soft Gaussian Blur Filter */}
    <radialGradient id="kGroundShadowRadial" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#0B132B" stopOpacity="0.45" />
      <stop offset="35%" stopColor="#1C2D5A" stopOpacity="0.28" />
      <stop offset="70%" stopColor="#314B88" stopOpacity="0.10" />
      <stop offset="100%" stopColor="#314B88" stopOpacity="0" />
    </radialGradient>

    <filter id="kGroundBlurFilter" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="9" />
    </filter>

    {/* ══════════════════════════════════════════════════════════════════
        8. CLIP PATHS
        ══════════════════════════════════════════════════════════════════ */}

    <clipPath id="kClipBehindEarL">
      <rect x="40" y="115" width="85" height="90" />
    </clipPath>

    <clipPath id="kClipBehindEarR">
      <rect x="255" y="115" width="85" height="90" />
    </clipPath>

    <clipPath id="kClipNeckSideL">
      <rect x="50" y="165" width="100" height="105" />
    </clipPath>

    <clipPath id="kClipNeckSideR">
      <rect x="230" y="165" width="100" height="105" />
    </clipPath>

    {/* ══════════════════════════════════════════════════════════════════
        9. ARM-SPECIFIC SHADERS (moved from krishna_arms.tsx)
        ══════════════════════════════════════════════════════════════════ */}

    <linearGradient id="kArmSkinGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#A9CCFF" stopOpacity="0.32" />
      <stop offset="25%" stopColor="#84B5FA" stopOpacity="0.15" />
      <stop offset="60%" stopColor="#6BA7FF" stopOpacity="0" />
      <stop offset="88%" stopColor="#4E82D1" stopOpacity="0.25" />
      <stop offset="100%" stopColor="#315EA8" stopOpacity="0.3" />
    </linearGradient>

    {/* Specialized Curved 3D Elbow Gradient Shaders */}
    <radialGradient id="kElbowJointSkinGrad" cx="40%" cy="38%" r="62%">
      <stop offset="0%" stopColor="#84B5FA" />
      <stop offset="55%" stopColor="#6BA7FF" />
      <stop offset="85%" stopColor="#5593F0" />
      <stop offset="100%" stopColor="#4E82D1" stopOpacity="0.85" />
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

    {/* Natural Palm Warm Pink Undertone Gradients */}
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

    {/* Master Jewellery & Vaishnav Decoration Gradients */}
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
);

export default KrishnaDefs;
