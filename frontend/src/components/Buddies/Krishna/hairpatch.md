The user wants to see actual visible hair behind the ears and beside the neck. The previous changes added subtle ellipses that might be too subtle or positioned incorrectly. Let me analyze the coordinate system more carefully.

The key issue is:

The supplemental layers might be too subtle/transparent to see
The coordinates need to match the actual ear positions
Let me look at the current structure carefully:

SVG viewBox: 0 -140 380 620
Head group: inside translate(190,217) scale(0.85) translate(-190,-217) → headGroup at translate(0, -32)
Face path spans x: 118–264, y: 48–216 in headGroup coords I'm locating the left and right ear positions within the head group and comparing them to the face's bounding box to figure out where the hair layers should actually align.
I'm double-checking that the rearHairSupport wrapper uses the identical transform sequence as headGroup, then verifying the rear hair ellipse's coordinates line up with the same pivot point.

Applying the same transform math to the ear positions, they end up landing at around y=146 on the canvas.

I'm realizing the side hair ellipses sit to the left of the face path's edges, so they should render outside it rather than being hidden behind it. The real issue is likely that the gradient fills are too faint or transparent near those edges, making the hair framing barely visible even though its position is correct.

Right ear sits at the opposite edge, and the neck spans roughly x=165-215 below the face. To make the hair actually visible I need elements positioned outside the ears and flanking the neck, so I'm shifting away from subtle ellipses toward wavy curved SVG paths that trace behind these areas.

I'm placing curved strand shapes near the ears on both sides and a visible dark patch behind the neck, all colored to match the deep blue hairline. The key fix is layering order -- previous attempts were hidden behind the solid face fill, so these need to render in front or alongside it to actually show.

I realize the side hair elements I placed are drawn before the face fill, so they'd actually be hidden behind the solid face shape except for the sliver poking past its edge—and that sliver might already be covered by the existing hair mask, meaning my addition may not even show up visually.

Since the user says they can't see any changes, I need a more deliberate approach: add clearly visible wavy hair strands beside the neck and ears using strong opaque fills, placed after the face base and the hair image so they render on top and outside the face boundary, rather than hidden behind it.

Sketching a wavy stroke path near the left ear as a hair strand, though I'm reconsidering whether filled wavy shapes would look better than stroked paths...

I realize the scale transform on the parent complicates positioning, so I should focus on making the rear hair support more opaque and visible, then redesign the side hair as clearly filled wavy paths positioned outside the face boundary but beside it, within the headGroup coordinate space.

I'm checking where the neck is actually drawn — it looks like it's part of the torso path rather than a separate element, with the base sitting around y≈175-190 near the necklace. My plan now is to remove the existing side hair elements since they're too subtle, strengthen the rear hair support to be clearly opaque, and add new visible wavy strands on each side.

I'm working out exact coordinates within the head group's coordinate system, mapping where the left and right hair strands should flow from the upper face down past the ears to below the jaw, with a width around 20-30px and a dark hair color.

Writing SVG hair paths...

Drafting the left side hair path coordinates, then realizing I should instead check where the existing PNG mask overlay actually ends so I fill gaps precisely rather than duplicating coverage. I'm calculating the PNG's actual bounding box within the headGroup's coordinate space to find exactly where the curly hair texture stops.

The subtler ellipse layers likely weren't rendering visibly, so I'm switching strategy entirely: use bolder, more opaque wavy SVG paths instead of plain ellipses to make the side hair clearly visible near the ears and neck, and I'll start editing KrishnaSprite.tsx to remove the old approach and replace it.

The mask likely doesn't extend far enough to those side areas, and my added layers are too faint. Since those regions sit outside the face boundary, I can render solid hair shapes there without touching the face, but I need to figure out where in the z-order they should sit relative to the head group and ears so they read as connected hair rather than floating shapes.

I'm placing the wavy side-hair shapes inside the head group, just outside the face boundary, and rendering them after the PNG hair layer so they sit on top and move naturally with the head. I also need to reposition the existing side-hair framing to come after the base face render instead of before, so it actually shows at the face edges.

Finishing the wavy path shapes...

Actually I realize the issue: layering these hair shapes behind the solid face fill means they'll get covered up. I need to rethink the z-order, placing them after the hair overlay image and after the face element so they remain visible.

Since the ears render after the PNG overlay, I realize I should place the wavy hair shapes right after the PNG mask but before the ears element, so they sit behind the ears without covering them. That settles the layering order - now I need to plan removing the existing side hair elements and rebuilding them properly.

I'll drop the current hidden side-hair ellipses and hairline softeners, then add new wavy hair shapes positioned beside the ears and neck, using organic curved profiles rather than rectangles, matching the dark blue palette already used for the PNG hair, and boost the visibility of the rear hair support.

Now I'll plan the actual code edits: removing the old hidden side hair elements, keeping the hairline softeners, and adding new wavy side hair and neck hair with gradient definitions for depth. Writing gradient definitions...

Writing gradient definitions...

Now I'm considering how to shape the wavy hair silhouette on the left side, with the outer edge organic and the inner edge meeting the face boundary near the ear.

Mapping out approximate face edge coordinates at various y-values...

I'm sketching a left-side hair shape that hugs the face's left edge with an organic wavy outer boundary around x≈90-100, tapering near the ear region.

This path is getting overly intricate, so I'm deciding to simplify to a more basic wavy strip shape instead.

Let me shift toward a practical approach: thinking about what hair details are missing next to the ears and behind the neck, since the base mask likely shows the main hair mass. I need small dark curved shapes near the ears to suggest hair wrapping around them, plus a visible dark region behind the neck for hanging hair, and I'll use overlapping small ellipses to simulate curls since that's more robust than precise path math.

Placing small clusters of dark ellipses beside each ear and along each side of the neck, positioned to sit after the hair overlay but before the ears so layering looks natural.

Working through the coordinate transform, I calculate that headGroup's y=216 maps to roughly canvas y=189 after scaling, which lines up closely with the necklace's starting position around y=186 — confirming the neck/necklace region sits right at the base of the head group, so any hair extending past y=216 in headGroup coordinates would reach into that same area.

Given this, I'm shifting strategy to keep things simple: I'll add clusters of overlapping dark circles on the left and right sides of the face (roughly x=90-120 and x=260-295, y=130-200 in headGroup coords) to create a curly hair effect, rendered after the PNG but before the ears, and I'll boost the visibility of the rear hair support ellipse. Since the neck is quite short on this character, a few curls placed just below the sides should read as "beside the neck" without overlapping the necklace.

Now I need to work out exact coordinates by tracing the SVG's viewBox and the transforms applied within headGroup, since the ear placement uses a nested translate/scale that shifts the coordinate space I need to match against.

Right ear region mirrors similarly. Since these shapes render after the PNG but before the ears, they'll layer on top of the hair image but stay behind the ear skin. I'm drawing curl clusters as ellipses positioned behind each ear with slight rotation for a natural clumped look...

Adding neck region highlights next...

Adding matching hair shapes on the right side...

Actually, I realize these positions fall below the face boundary, overlapping where the necklace begins, so I need to reconsider the placement.

I'm now checking whether the neck coordinates conflict with the torso and necklace regions by tracing through the transform math to see where the head group actually lands on the canvas relative to the torso top.

That confirms the headGroup at y=228 falls right into the necklace zone, so hair added there won't be visible. Instead I should focus on making the rear hair support stand out more and adding visible curly clusters beside the ears, rather than trying to add neck hair through headGroup since it's just going to be hidden behind the necklace or torso.

I'm now sketching the concrete fix: removing the useless hidden side-hair elements, adding dark curl clusters beside the ears after the PNG layer but before the ears, strengthening the rear hair ellipse, and placing separate wavy neck-hair shapes outside headGroup using canvas coordinates for the neck region between the head and necklace on both sides.

I'm working through the coordinate math to figure out where an element placed inside headGroup actually lands on the final canvas after the translate and scale transforms are applied. The ear at headGroup coordinates (118,165) maps to roughly canvas (129,173), so to place hair visibly to its left, I need to find headGroup x-values that translate to canvas positions further left than that. I'm calculating that headGroup x=101 corresponds to canvas x≈116, meaning the left ear's outer edge sits there, so hair curls need headGroup x below 101 — I'm testing x=95, which maps to canvas x≈109.

Those coordinates place the curls to the left of the ear at canvas x≈103-109, visible beside it. Checking against the PNG hair image bounds, I calculate its edges transform to canvas x≈61.65 on the left and x≈313.25 on the right after the scale adjustment.

So the curls I'm adding fall well within the PNG's coverage area, meaning they'd render on top of whatever's already there. Without being able to see the actual image, I have to reason about whether that region is transparent or already filled with pre-rendered hair, since that determines whether my additions show up as extra depth or as new visible strands.

Since my new elements come after the image element in the DOM, they'll always draw on top regardless of what's underneath, so I can proceed confidently. For the neck hair specifically, I need to position it carefully within the headGroup at a y-range that sits between the face bottom and the necklace so it doesn't get obscured.

I'm working out the coordinate conversion between headGroup's local space and canvas coordinates, since headGroup has a scale transform applied. I'm mapping the visible neck skin regions on the sides (not the front, where the necklace and chin dominate) into headGroup x-coordinates so I know exactly where to place the hair strands.

I realize that these computed coordinates actually fall inside the face outline itself, meaning any hair shapes placed there would sit directly on top of the skin fill since the PNG texture is layered after the base face path. That could look odd, so I'm reconsidering whether placing neck hair there would visually work or if I need a different approach.

Tracing the curve coordinates, I find the face's left edge sits around x=135 at y=200, widening to x=148 at y=210 and x=168 near the chin bottom at y=216, with the neck extending further down from there. So for placing hair beside the neck, it needs to sit to the left of this narrowing edge.

Placing hair patches at the neck sides — left around x=130-148 and right around x=232-252, spanning y=205-245 — would keep them outside the face boundary but visible next to the chin. I'm now converting these headGroup coordinates into canvas space using the scale and offset formulas, checking whether the resulting y-position falls below the necklace.

Since the necklace strands only cover the front span between canvas x≈148-232, the outer edges outside that range at canvas y=220 wouldn't be covered — so a patch there should render cleanly without clipping into the necklace.

I'm mapping out where side hair clusters should sit relative to the ears and neck: small clusters beside/behind each ear, plus additional strands lower down along the neck sides. To make the hair look wavy rather than flat, I'll layer multiple overlapping ellipses of varying size and rotation, then add subtle lighter highlight ellipses on top to simulate light catching the strands.

Writing SVG code...

Adding hair details near the ears...

Adding more neck shading ellipses, then I realize these coordinates are nested inside the headGroup's translated space, so I need to account for that offset when calculating their actual canvas position.

Recalculating carefully, the head group's translate combined with the scale transform puts the element at canvas y≈202.55, which lands close to where the necklace layers sit around y 184-200, so I need to check for overlap there.

I realize the necklace sits centered in front, so the sides of the neck around canvas x≈130-160 and x≈220-250 at that same height should stay uncovered, meaning I can place side neck hair there and it'll show through at the sides without clashing with the necklace. I'm working through the coordinate math to place that hair correctly relative to the headGroup's own transform stack.

Mapping the symmetric right side similarly, I see the necklace spans canvas x≈148-232, so the neck sides beyond that range on both left and right should stay visible beside it. Now I need to check that these side elements don't drop low enough to collide with the torso, which starts around y=245 in the SVG.

Checking the SVG paint order, since the torso renders before the head group, any hair elements around y=220-250 in head coordinates would actually appear on top of the torso where they overlap, so I need to confirm the torso's lower boundary doesn't conflict with these positions.

I'm now planning the concrete edits: removing the useless sideHairLeft/sideHairRight elements hidden behind the face fill, strengthening the rear hair ellipse's visibility, and adding new curly hair clusters near the ears and neck sides with proper gradients defined upfront.

I've decided to place the neck hair inside headGroup so it moves naturally with the subtle head tilt animations rather than staying static. Now I'm working out exactly where in the JSX to insert the new hair curl elements, positioning them after the hairline softeners and PNG overlay but before the ears group.

I'm locating the hairlineSofteners group right after the PNG overlay and before krishnaEars, planning to insert the side hair clusters there. I'm working out coordinates so the hair sits just left of the ear's leftmost edge, around headGroup x below 100 and y near 135.

Good, that mirrors symmetrically on the right side, giving the face natural hair framing at both temples. For neck-side hair, I'll position curls near the chin/jaw boundary where the face meets the neck. Now I'm ready to implement: switching the side-hair curls to solid colors instead of gradients for a cleaner, more opaque look.

Adding curl highlights...

Adding the mirrored hair strands behind the right ear...

I'm double-checking the ear placement math against the face's right edge coordinates to make sure the positioning is correct.

So the right ear spans headGroup x=256.2 to 279.4, meaning hair placed right of x=279.4 or in the 270-285 range would sit beside or behind it. But I realize the ear renders after my side hair additions in z-order, so the ear skin would cover my hair shapes unless I sequence things carefully.

That's actually ideal - hair behind the ear with the ear rendering on top. So I'm placing right side hair around cx=275-295, cy=145-205, and left side hair around cx=85-105, cy=145-205, letting the overlap work in my favor. Now I'm working out the same math for the left ear, translated at (118,165), to find its headGroup x-range for proper positioning.

Continuing the coordinate check, I find the face's left edge at ear level lands around canvas x=129, which is further right than my neck continuation point at x=117 — meaning the neck line falls outside the face boundary as intended.

But I need to account for headGroup's own translate offset before applying the scale transform. Working through it, a point at headGroup y=215 actually maps to canvas y≈188 after combining the translate and scale, which lands right at the top edge of the necklace zone.

Since the necklace layer renders after headGroup, it'll sit on top and won't obscure the left neck area, so the side hair should stay visible there. Now I'm checking whether the side hair elements might overlap the face's left edge instead, tracing the face outline coordinates near y=215 to see where the boundary actually falls.

4:45 AM
Let me first analyze the current state carefully, then document my findings in a hairpatch.md file before implementing.

Key issues the user is reporting:

Area behind ears and beside neck still doesn't have visible hair
Changes from previous implementation aren't visible
Goal: Add wavy CSS hair that COMPLEMENTS the PNG mask (not replaces it)
Let me understand why the previous changes might not be visible:

The rear hair support ellipse uses kRearHairDepth which has stopOpacity="0" at 100% - this means the edges fade to transparent, which is correct. But the center color #1A3070 might be too close to the background or being hidden behind other elements.
The side hair framing ellipses are positioned close to the face edges (x≈118-264), so their gradient fade might make them effectively invisible against the mask.
I realize the real issue: these elements sit inside a headGroup with its own translate and scale transforms, so I need to recheck all coordinates relative to that space where the face spans x:118-264, y:48-216.
Looking closer, the rearHairSupport ellipse only extends about 15px beyond the face silhouette, and since the gradient fades to zero at its edges, only a thin sliver would actually be visible once the head is painted on top. For the neck area around y=210-260, I need to reconsider the path I added there.

I'm realizing the necklace likely covers most of the visible neck taper, so what I sketched may be hidden anyway. Since the user really wants wavy CSS hair shapes matching the wavy PNG pattern—positioned behind the ears and beside the neck—I need to trace through the coordinate system carefully: the SVG viewBox and nested transforms on the headGroup scale and translate everything, so I have to work out exactly where points land after all these compositions before placing the hair elements correctly.

Working out the rest of the face bounds: bottom around 188.95, left around 128.8, and right around 252.9 in world coordinates. Now I'm shifting to figuring out where the ears sit within the headGroup's coordinate space.

I need to rethink where the wavy hair should actually show through - beside the ears at ear level, and beside/behind the neck below the head. The issue is the ears paint on top of the PNG, and I need to check the layering order in headGroup to figure out why the hair isn't visible in these spots.

The areas beside the ears sit outside the face path boundaries, so they should theoretically show through, but the ellipses I placed may be too small, fading too soon, or blending with the dark background color.

Now checking the neck region: converting the taper path coordinates to world space puts the neck continuation around y≈184-220, which likely falls under the torso/body layer since the character's bottom offset is 48px—so I need to check if that layer covers it.

Actually, I realize the real problem might be simpler: the dark hair colors are getting lost against the dark space background, so the hair needs solid, more opaque fills rather than subtle gradients to actually be visible. I should also add wavy or curly paths that mirror the PNG mask's style, positioned specifically beside each ear curling toward the shoulders and behind the neck continuing the hair mass down.

Now I'm mapping out the exact coordinates within the head group's space — locating the face center and edges, ear positions, and the hair zones behind each ear and around the neck — so I can place the new hair shapes precisely where they're needed.

I realize the earlier hair edits aren't showing up because they're either hidden behind the larger face path, fading out via gradient transparency, or blending in color with the existing hair PNG. Looking at the reference mask's curly, wavy texture with highlights, I'm thinking the fix is to build overlapping rounded blob shapes to mimic that hair volume.

The plan is to add clearly visible wavy hair curls positioned outside the face boundary — beside the left ear, beside the right ear, and flowing down behind the neck — using a dark navy base with shadow and highlight tones so they read as strands rather than blending into the head shape. I'm pinpointing the exact face edge coordinates so I know where "outside" truly starts on each side.


# HAIR PATCH — ANALYSIS & IMPLEMENTATION PLAN

## Why the Previous Changes Are Invisible

### 1. Gradient-fading to transparent = nothing to see against dark background

`kRearHairDepth` gradient colors: `#1A3070` → transparent.
The dark navy `#1A3070` is almost indistinguishable from background `#0F1B3D`.
**Fix:** Use `#3256B8` / `#4070C8` as the visible highlight color.

---

### 2. sideHairLeft/Right: correct X zone, but too small

Face spans headGroup coords: left edge x≈118, right edge x≈264.
Previous side ellipses: cx=107/103/108, rx=13-18 → only ~10-12px visible outside face.
At scale(0.85), these become tiny slivers, mostly hidden behind the face.

**Fix:** cx≈88 (left) / cx≈292 (right), rx=28-32, solid fills.

---

### 3. Rear skull ellipse: barely extends beyond face

Face half-width from center: 73px. Rear ellipse rx=88 → only 15px extension.
Gradient fades at 100%, so the edge is fully transparent. Near zero visible area.

**Fix:** rx=105, ry=98, keep 60% opacity at outer edge.

---

### 4. Neck taper path is behind the torso — covered by skin body layer

Torso (`id=torso`, LAYER 5) paints BEFORE `rearHairSupport`. So rear hair
paints on top of torso but is dark-on-dark invisible. Neck hair must go INSIDE
`headGroup` (Layer 6), positioned below face (y>216 in headGroup coords),
painted AFTER the face so it appears on top of the torso.

---

### 5. Hairline softeners: blend perfectly into PNG (same color = invisible)

Using `#1E3A8A` on top of a `#1E3A8A` PNG hair = zero visible effect.
**Fix:** Use lighter highlight `#4070C8` / `#5080D8` to show as sheen.

---

## Coordinate Map (headGroup space, after translate(0,-32))

```
              y=-69  →  PNG top edge
              y=48   →  face top / hairline
  x<112               x>268   ← visible side hair zones
              y=132  →  face center
   earL(118,165)      earR(262,165)
              y=216  →  face bottom / chin
              y=220-280 → neck zone (below face, in headGroup)
```

World SVG coords (applying scale 0.85 wrapper):
- Ear left world-x ≈ 129, ear right world-x ≈ 251
- Face bottom world-y ≈ 189
- Neck zone world-y ≈ 189–215

---

## Root Cause Table

| Issue | Previous | Fix |
|-------|---------|-----|
| Dark colors invisible on dark BG | #1A3070 on #0F1B3D | #3256B8, #4070C8 |
| Elements too small | rx=13-18 | rx=26-32 |
| Gradient fully transparent at edge | stopOpacity 0 | min stopOpacity 0.55 |
| Neck hair behind torso | Separate group before head | Inside headGroup after face |
| Hairline matches PNG color | #1E3A8A = same | #4070C8 lighter sheen |

---

## Phased Implementation

### Phase 1 (NOW) — Visible side + ear hair with wavy curls

Large overlapping curl ellipses at:
- Left zone: cx≈88-105, y≈70-200
- Right zone: cx≈272-295, y≈70-200

Wavy sinusoidal bezier strand strokes on top.
Colors: solid `#1E3A8A` fill + `#3256B8` wave strokes.

### Phase 2 (AFTER) — Neck rear hair inside headGroup

Fan-shaped curl cluster below chin (y≈220-275, cx≈190).
Left neck side (cx≈130-155, y≈220-270).
Right neck side (cx≈225-250, y≈220-270).

### Phase 3 — Refine / tune opacity and positions visually

---

## Wavy Hair Technique (to match PNG curl style)

```svg
<!-- Overlapping curl blobs for volume -->
<ellipse cx="88" cy="100" rx="28" ry="20" fill="#1E3A8A" transform="rotate(-22 88 100)"/>
<ellipse cx="92" cy="120" rx="26" ry="18" fill="#182E72" transform="rotate(-8 92 120)"/>

<!-- Sinusoidal wavy strand lines on top -->
<path d="M 70 90 C 78 82, 86 100, 94 90 C 102 80, 110 98, 118 90"
      fill="none" stroke="#3256B8" strokeWidth="3.5" opacity="0.65"/>

<!-- Hair edge feather gradient -->
<ellipse cx="78" cy="105" rx="18" ry="14" fill="#1E3A8A" opacity="0.8"/>
```
Remove the bad supplemental hair I added previously (which is covering neck, wrong colors, wrong boundaries)
Add ONLY very targeted, conservative supplemental hair behind ears and small side/back neck region
Match the PNG hair mask colors precisely
NOT cover the neck
Blend naturally with the PNG
Let me first look at exactly what supplemental hair elements currently exist, then figure out the right approach.

The key issues with previous implementation:

sideHairLeft/Right - large curl blobs (cx=85-94, rx=24-32) with solid fills and wavy strokes - these likely cross PNG boundary and have wrong colors
neckRearHair and rearHairSupport also overreach, covering the neck and adding a large solid rear fill
I'm planning to strip out all four of these problematic elements entirely, then rebuild with much smaller, tightly-scoped shapes tucked behind each ear that stay within the PNG's own silhouette rather than extending past it.

For color matching, since I can't sample the PNG pixels directly, I'm cross-referencing the CSS-defined hair palette (navy tones like #1E3A8A and darker shadow #0F1B3D) along with the existing gradient stops for kHairBase, kHairCurl, and kHairHl to keep the new supplemental shapes visually consistent with the character's established hair rendering.

I'm thinking through z-order carefully: since the PNG only shows hair where opaque, elements placed before the PNG in the layer stack get covered by hair but revealed through transparent gaps. So for the visible sliver behind each ear, I need a hair element sandwiched between the PNG and the ear itself, ensuring proper layering as PNG → supplement → ear.

Placing it right there, after the PNG but before the ears, means the PNG defines the silhouette, the supplement fills any gap behind the ear, and the ear renders on top to stay visible. Since the PNG is an image element with real alpha transparency, its transparent regions will let the supplement show through underneath, while opaque hair areas stay covered — so the layering should work correctly.

Now I'm calculating the exact geometry for the behind-ear patches, starting with the left ear's position and shape within the head group's coordinate space to figure out where the supplement needs to sit.

The front visible neck spans roughly x=165-215, y=216-270, so behind/side areas would be x<155 or x>225 below the chin line.

Now I'm working out the color palette to match the PNG's dark navy hair tone, checking whether the CSS's defined hair primary (#1E3A8A) or a darker approximation better fits the reference image.

I don't have direct access to sample the PNG, so I'll settle on conservative dark navy values close to the existing gradient range (roughly #141E3C to #1A2A50) rather than the brighter accent blue, keeping highlights subtle and letting the gradient fade toward transparent at the edges without vanishing too abruptly.

Now I'm mapping out the layering strategy: placing supplements either behind or in front of the PNG depending on which zone they fill, clipping each one tightly to its region, keeping sizes small, and dropping the earlier wavy-strand elements in favor of subtle small fills.

I'm reconsidering whether to keep the previous jaw-narrowing scale change, deciding the "face unchanged" instruction refers to not making further adjustments beyond what was already approved, so the existing 3% narrowing can stay since this pass is strictly about hair.

Now I'm mapping out exactly what to remove: the oversized, wrong-colored rear, side, and neck hair groups plus the hairline softener gradient with mismatched coloring. In their place, I'll add proper clip paths and a correctly colored gradient for small, subtle behind-ear hair supplements positioned after the base image but before the ear elements.

I'm defining precise crescent-shaped clip regions behind each ear and a small patch for the neck back, so these supplements sit naturally within the ear and neck contours without spilling outside the PNG artwork.

Writing SVG path coordinates...

The supplement needs to bridge the gap between the PNG hair edge and the ear, so I'm thinking the inner edge should match the PNG's dark navy tone and fade to transparent at the outer edge, using something close to #101828 to #1E28 as the visible hair shade based on the gradient.

I'm working out the geometry now, mapping the ear and behind-ear zones in headGroup coordinates using translate offsets to define rectangular clipPath regions that I'll later refine into curved shapes.

I'm reconsidering the fill direction—actually the gradient needs to be strongest near the ear connection point and fade outward toward the edges, so a radial gradient centered on the ear makes more sense than a linear one. I'll keep the shape minimal, just a simple curved path behind the left ear.

I'm working out the exact headGroup coordinates for the ear transforms, calculating that the left ear spans roughly x=101-124, y=148-182, which means the "behind ear" zone falls to the left of x=101 in that y range.

Now I see the real problems: my supplemental hair ellipses have hard rx=24-32 edges that abruptly meet the PNG boundary, the colors #3256B8/#4A72D8 are too bright compared to the PNG, and the neckRearHair ellipses actually land in the neck/throat area once converted to world coordinates — all of which makes the patch look pasted-on rather than blended.

So I'm planning a cleanup: remove the old rearHairSupport, sideHairLeft, sideHairRight, neckRearHair, and hairlineSofteners elements entirely, then add a subtle behind-ear gradient (transparent to dark navy) as thin curved slivers placed after the PNG on each side to blend into its silhouette, plus small tapered dark-navy ellipses placed before the PNG at the back-neck positions so they sit underneath and blend naturally rather than overlapping visibly.

I'm now checking the PNG's actual coverage area (x=39 to 335, y=-69 to 286 in headGroup coords), which spans nearly the whole head region though transparency means only the hair strands are opaque. Since the PNG likely already paints over the behind-ear zones on both sides, placing my new elements before the PNG would just get hidden — so I need to reconsider whether they should go after the PNG instead, layered carefully so they only peek out where the PNG is transparent.

Sketching the curve...

Adding clip zones to constrain the shadow shapes behind each ear to their local rectangle so nothing bleeds into the face.

I also need to strip out the earlier flawed elements—the rear hair support group, side hair patches, neck rear hair, and hairline softeners—while keeping the jaw narrowing fix from before.

Now I'm planning the cleanup: removing unused supplemental gradients while defining new clean ones for behind-ear fills, plus adding clip paths to properly zone the left and right ear areas.

Removing several redundant hair groups (rearHairSupport, sideHairLeft/Right, neckRearHair, hairlineSofteners) and instead layering targeted neck and behind-ear supplements before and after the PNG overlay, using clip paths to control exactly what gets covered.

For colors, I'm keeping everything very close to the PNG's dark navy shadow tone so the additions stay invisible as separate elements. Now I need to work out actual pixel coordinates for the PNG's coverage area relative to headGroup so I can position these supplements precisely rather than guessing.

I'm mapping out the supplemental patch regions for behind-ear and neck-side areas, then tracing the torso path's left edge curve to figure out where its skin boundary actually starts so the patches align correctly.

I trace the torso's left and right edges through their curve points to determine the skin boundary at each y-level, then set safe x-ranges for the neck-side patches to stay outside those boundaries. But I realize these coordinates are in the full SVG viewBox space, while the patches are nested inside a scaled headGroup, so I need to convert between coordinate systems.

Working out the boundary, the torso left edge corresponds to roughly x=129 in headGroup coordinates, so my neck supplements need to stay left of that, and similarly right supplements should stay past x=247. But checking the ear level around y=165, the face edges only reach x≈118 and x≈264, leaving noticeable gaps outside the face at that height.

Now I'm ready to implement: removing the bad supplemental elements, adding proper clipPaths and gradients to defs, then placing small neck-side supplements before the PNG layer and behind-ear supplements after it. Designing the behind-left-ear shape now, sizing a crescent around x≈85-110 to sit just outside the ear's boundary.

Writing crescent path coordinates...

I'm also planning a tapered neck-side shape below the ear that fades opacity near its bottom edge, plus a matching clipPath rectangle for the behind-ear region.

Now I'm defining clipPath rectangles for the behind-ear and neck areas, then picking a dark navy gradient (around #141E38) to match the hair's existing highlight, base, and shadow tones from the PNG reference.

Now I need to plan the actual edits to the SVG file: replacing the bad supplemental gradients with cleaner ones plus clipPaths in defs, removing the rearHairSupport element, and stripping the sideHairLeft/sideHairRight elements from inside the head group before headBase.

I'm mapping out where each hair-related element sits in the file so I can remove neckRearHair before the PNG, strip out hairlineSofteners after it, and add the behind-ear supplements in the right spot -- searching for exact strings so my multi_replace edits land precisely.
Key rule: **fill with opaque dark blue, highlight with lighter stroke.**
Base Hair:        #0D1B49
Dark Shadow:      #040A25
Midtone:          #22377C
Cool Highlight:   #0B94B4

### Targeted Character Refinement Summary

1. **Part A — Hair Tip & Boundary Refinement**:
   - **Primary Asset**: Preserved existing PNG hair mask (`#krishnaHairOverlay`) as the primary hair asset.
   - **Tapered Hair Tip Locks (Behind Ear & Posterior Neck)**:
     - **Left Lock (`#hairGapLeft`)**: Root starts under PNG hair mask (`x: 104, y: 142`), curves behind left ear, flows along the posterior neck side to `y: 220–225`, and tapers into a soft pointed S-curl tip that blends back into the root mass.
     - **Right Lock (`#hairGapRight`)**: Root starts under PNG hair mask (`x: 276, y: 142`), curves behind right ear, flows along the posterior neck side to `y: 220–225`, and tapers into a soft pointed S-curl tip that blends back into the root mass.
   - **Neck Safe Area**: Front/center neck skin (`x: 135–245`) remains 100% clean blue skin (`#kSkinBody`). Hair only traces the posterior outer neck edge (`x < 114` left, `x > 266` right).
   - **Color & Shading**: Palette `#040A25` (shadow), `#0D1B49` (base), `#22377C` (midtone), `#0B94B4` (highlight stroke).

2. **Part B — Hand & Wrist Jewellery**:
   - **Anatomy Invariant**: Wrist width 24 units (`u(24)`), palm 48x54, thumb 27, index 31, middle 34, ring 30, little 25.
   - **Wrist Bangles**: Form-fitting dual gold bangles in `ParametricHand` wrapping 24-unit wrist contour (`#kJewelGoldGrad`: `#B86A00` → `#F5A900` → `#FFD45A` → `#FFF0A3`).
   - **Hand Chain (Hathphool)**: Traditional delicate gold beaded chain anchored to wrist bangle, extending down back of hand to a ruby medallion, connecting to middle finger ring.
   - **Finger Ring**: Small, thin, gold, rounded ring on middle finger root following digit rotation.

3. **Part C — Vaishnav Hand/Arm Decoration & Upper Armlet**:
   - **Forearm Vaishnav Motif**: Subtle vertical ivory (`#F8F9FF`) Vaishnav mark with tiny warm gold accent (`#FFD45A`) on forearm, minimal and secondary to forehead tilak.
   - **Upper Armlet (Keyur)**: Refined child-proportioned gold armlet in `ParametricUpperArm` with ruby gem motif (`#kJewelRuby`), physically wrapped around upper arm thickness.

4. **Part D & E — Material Continuity & Pose Safety**:
   - Consistent 3D gold material across all armlets, bangles, chains, and rings.
   - All jewellery is integrated directly inside `ParametricUpperArm`, `ParametricForearm`, and `ParametricHand` in [krishna_arms.tsx](file:///Users/abundance/Documents/coding/my-desktop-buddy/frontend/src/components/Buddies/Krishna/krishna_arms.tsx), ensuring seamless pose transformation (`chakra`, `standing`, `crossHands`) with zero duplicate assets.

