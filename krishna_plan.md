# Little Krishna — Reference-Faithful Character Redesign

Comprehensive SVG character refinement to match the supplied 3D model sheet reference while preserving all existing component logic, state machine, animations, and interactivity.

## User Review Required

> [!IMPORTANT]
> This is a character-fidelity pass, NOT a rewrite. All React logic, state management, event handlers, CSS animations, and the `isChakraPose` system you built remain **untouched**. Only the SVG body geometry and material definitions inside `<defs>` and the render groups (sections 1–11) will change.

> [!WARNING]
> The current SVG viewBox `0 -110 360 550` will be preserved. All coordinate changes are within this existing canvas. No layout-breaking changes.

## Proposed Changes

### Reference Analysis (from Model Sheet)

Key differences between the **current SVG** and the **reference**:

| Feature | Current | Reference Target |
|---------|---------|-----------------|
| **Head:Body ratio** | ~1.8:1 (oversized head) | ~1.4:1 (balanced toddler) |
| **Torso** | Narrow path, underdeveloped | Rounded, chubby toddler belly |
| **Legs** | No visible legs (dhoti covers entirely) | Short but visible blue legs below dhoti |
| **Arms** | Stroke-based (thick line, no shape) | Filled rounded arm shapes |
| **Hands** | Ellipse blobs | Small rounded fingers, clear index finger |
| **Face eyes** | Good — warm brown, catchlights ✅ | Keep, minor refinement |
| **Peacock feather** | Broad leaf shape ✅ (your recent fix) | Keep, adjust curve slightly |
| **Jewelry** | 3D beads ✅ (recent fix) | Keep, add subtle arm-band definition |
| **Dhoti** | Layered folds ✅ | Keep, add visible legs below hem |
| **Hair** | Volumetric curls ✅ | Keep exactly — user locked this |
| **Skin gradients** | Blue gradient too light at center | Closer to solid #6BA7FF with subtle shading |
| **Eyebrow dots** | Small white dots ✅ | Keep |

---

### Component: SVG Definitions (`<defs>`)

#### [MODIFY] [KrishnaSprite.tsx](file:///Users/abundance/Documents/coding/my-desktop-buddy/frontend/src/components/Buddies/Krishna/KrishnaSprite.tsx)

**Gradient refinements (lines ~275–440):**
- Tighten `kSkinHead` — center highlight less washed-out, closer to reference's #6BA7FF base with #93C5FD highlight
- Tighten `kSkinBody` — match head skin more closely
- Keep all hair/feather/gold/iris gradients unchanged (they're good)

---

### Component: Body Geometry (Sections 1–11)

#### Section 1: Feet & Anklets (lines ~444–491)
- **Keep** current toddler toes and gold anklets (recently improved ✅)
- **Add** short visible blue legs (calves) between dhoti hem and feet — currently missing

#### Section 2: Dhoti & Sash (lines ~493–537)
- **Shorten** dhoti bottom edge slightly (raise from y=385 to ~370) so legs are visible below
- **Keep** all fold lines, sash knot, waist ornaments, sash tail
- **Add** subtle gold border line at dhoti hem

#### Section 3: Torso (lines ~539–545)
- **Reshape** torso path to be rounder/chubbier — the current path is narrow and angular
- **Add** subtle belly roundness and shoulder definition
- **Add** a light chest highlight ellipse for 3D volume

#### Section 4: Necklace (lines ~547–570)
- **Keep** current 3D bead necklace and pendant (recently improved ✅)

#### Section 5A: Crossed Arms (lines ~572–613)
- **Replace** stroke-based arms with filled `<path>` shapes for proper toddler arms
- **Add** visible small rounded hands with discernible fingers
- **Keep** bracelets and armlets

#### Section 5B: Chakra Arms (lines ~615–641)
- **Replace** left arm stroke with filled path shape
- **Add** visible hand with fingers at hip
- **Keep** bracelets and armlets

#### Section 6: Hair (lines ~643–697)
- **DO NOT CHANGE** — user explicitly locked the hairstyle ✅

#### Section 7: Head & Ears (lines ~699–726)
- **Keep** earring design (recently improved ✅)
- **Keep** head ellipse and cheek blush
- **Refine** forehead ellipse for slightly more rounded 3D volume

#### Section 8: Face Details (lines ~728–838)
- **Keep** tilak, eyebrow dots, eyes, nose, lips (all recently refined ✅)
- **Minor**: Slightly increase eyebrow stroke weight to 2.4px for better visibility at widget size

#### Section 9: Topknot (lines ~840–847)
- **Keep** unchanged ✅

#### Section 10: Peacock Feather (lines ~849–878)
- **Keep** your recent broad-leaf redesign ✅
- **Minor**: Increase feather outline stroke by 0.4px for better widget-size readability

#### Section 11: Chakra & Raised Arm (lines ~881–936)
- **Replace** raised-arm stroke with filled path shape
- **Add** proper modeled hand with visible index finger pointing up
- **Add** remaining 4 fingers curled below
- **Keep** chakra disc geometry and animation

---

### Component: CSS Styling

#### [MODIFY] [krishna.module.css](file:///Users/abundance/Documents/coding/my-desktop-buddy/frontend/src/components/Buddies/Krishna/krishna.module.css)

- No structural CSS changes needed
- All your recent manual edits (isolation, transform-box, data-attribute selectors) preserved

---

## Open Questions

> [!IMPORTANT]
> **Leg visibility**: The reference clearly shows short blue legs below the dhoti. The current SVG has the dhoti extend all the way to the feet, hiding any legs. Should I:
> - **(A)** Add visible legs as shown in the reference (recommended)
> - **(B)** Keep the current dhoti-covers-everything approach

> [!IMPORTANT]
> **Arm modeling**: Currently arms are drawn using thick stroke lines. The reference shows properly filled/shaped arms. Replacing strokes with filled paths will look significantly better but changes the arm geometry. This is **recommended** for reference fidelity.

## Verification Plan

### Automated Tests
```bash
cd /Users/abundance/Documents/coding/my-desktop-buddy/frontend && npm run build
```

### Manual Verification
- Hot-reload via running `startup.sh` to visually inspect all states
- Check widget-size readability at `sm` size
- Verify all 8 Krishna states still animate correctly
- Verify chakra spin, blink, feather sway animations
