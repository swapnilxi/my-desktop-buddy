# Little Krishna — Reference-Faithful Character Redesign

Perfect. With those choices locked, the character direction is now clear:

**Krishna Sport = a polished Pixar/DreamWorks-like 3D-looking child character, visually believable as a 4–5-year-old, but implemented entirely with HTML + CSS + TSX.** The current costume, peacock feather, chakra, blue skin, jewelry, dhoti, orange drape, and overall identity stay intact. The character should not read as chibi or babyish.

One important implementation note: HTML/CSS can create a convincing **2.5D / faux-3D character**, but it cannot behave like a true 3D mesh. So Antigravity should use layered DOM shapes, gradients, highlights, shadows, pseudo-elements, transforms, and controlled perspective rather than pretending it is building a physically rotatable 3D model.

Use the following as the **master character sheet / source-of-truth prompt** for Gemini or Antigravity.

```text
PROJECT: KRISHNA SPORT — MASTER CHARACTER SPECIFICATION

You are redesigning an existing Krishna character built entirely with:

- React / TSX
- HTML
- CSS

Do NOT use:
- canvas-generated character artwork
- external character images
- SVG character illustrations as a replacement
- Three.js
- Blender
- WebGL
- pre-rendered 3D models

The character itself must remain constructed from HTML/TSX elements and CSS styling.

==================================================
1. CORE CHARACTER DIRECTION
==================================================

Create Krishna as a believable, polished 4–5-year-old child.

The visual target is:

- premium animated-film-quality 3D character appearance
- soft physically believable volume
- polished stylized rendering
- expressive but anatomically coherent child proportions
- devotional and charming
- NOT chibi
- NOT baby proportions
- NOT flat vector art
- NOT anime
- NOT toy-like
- NOT photorealistic
- NOT an adult body with a child's head

The character should feel like a high-quality 3D animated movie character translated carefully into HTML/CSS.

Use realistic child anatomy as the underlying structure, then apply mild stylization.

==================================================
2. AGE / BODY PROPORTION — CRITICAL
==================================================

Krishna must visually read as approximately 4–5 years old.

This is an immutable rule.

Do NOT exaggerate the head into a chibi proportion.

Target approximately:

Head-to-body ratio:
around 1 : 4.5 to 1 : 5

The head can be slightly larger than strict anatomical realism for charm, but it must remain believable.

BODY CHARACTERISTICS:

- relatively large head compared with adult anatomy
- narrow child shoulders
- small ribcage
- gently rounded abdomen
- short child torso
- slim but softly rounded arms
- naturally short forearms
- small hands
- short fingers
- relatively short legs
- soft knees
- small feet
- no muscular definition
- no adult waist
- no broad chest
- no exaggerated belly

The body must feel internally proportionate.

Avoid:
huge head + tiny body
long torso + tiny legs
adult shoulders
oversized hands
extremely short limbs
bobble-head proportions

==================================================
3. HEAD SIZE
==================================================

The head must NOT dominate the whole body.

The current implementation tends to make the head too large and tall.

Correct this.

Desired head:

- moderately large because Krishna is a young child
- broad enough for soft child cheeks
- vertically compact
- naturally connected to the neck
- proportionate to shoulders and torso

The face should NOT consume almost the entire character width.

Hair volume must NOT be counted as facial/head anatomy.

Separate:

FACIAL SKULL / FACE
from
HAIR VOLUME

Do not enlarge the face just because the hair is large.

==================================================
4. FACE SHAPE
==================================================

Face shape is extremely important.

Target:

- soft childlike oval-round structure
- slightly broader around upper cheeks
- compact vertically
- forehead moderate, not extremely tall
- cheeks softly full
- lower face gently tapers
- jaw extremely soft
- chin small and rounded

The face should NOT be:

- perfect circle
- long oval
- upside-down triangle
- huge forehead with tiny chin
- overly wide at jaw
- pointed chin

Desired facial silhouette:

         soft forehead
       /             \
      /               \
     |   upper cheeks  |
     |                 |
      \               /
       \             /
         \_________/
        small soft chin

The cheek area is the broadest part of the lower face.

The lower face should be compact.

==================================================
5. FACE PROPORTIONAL LANDMARKS
==================================================

Maintain coherent child facial spacing.

The eyes should sit approximately around the vertical midpoint of the facial area, slightly below midpoint if needed for youthful appeal.

Do NOT push eyes dramatically downward just to create a large cartoon forehead.

Maintain:

forehead
↓
brows
↓
eyes
↓
small nose
↓
short philtrum
↓
small mouth
↓
short chin area

The vertical distance from nose to chin must remain short.

==================================================
6. EYES
==================================================

Eyes should be expressive, but must NOT become cartoon circles.

Target:

- large relative to an adult
- slightly enlarged for animation appeal
- organically shaped
- soft almond / rounded shape
- fuller vertically at the center
- taper gently toward corners
- visible white sclera
- warm brown/golden iris
- dark pupil
- polished highlights
- subtle eyelid depth

The outer eye MUST NOT be a simple perfect ellipse.

Do not use:

border-radius: 50%

as the only eye-shape solution.

Instead construct an organic silhouette using:

- asymmetric border-radius
- pseudo-elements
- clipping
- layered shapes
- subtle transforms

Eye expression:
gentle
intelligent
playful
innocent
divine

NOT:
shocked
bug-eyed
doll-like

==================================================
7. IRIS + PUPIL
==================================================

Maintain the hierarchy:

white sclera
→ warm golden-brown iris
→ dark pupil
→ glossy highlight

The pupil should NOT consume the whole iris.

The iris needs visible color around the pupil.

Use layered radial gradients to create:

- darker outer iris ring
- warm amber middle
- darker pupil center
- controlled highlights

Avoid a flat black circle.

==================================================
8. EYEBROWS
==================================================

Brows should:

- be slim
- softly arched
- follow the eye curvature
- contribute to a gentle expression
- remain symmetrical but not mechanically identical

Avoid very thick cartoon eyebrows.

==================================================
9. NOSE
==================================================

The nose should resemble a stylized 4–5-year-old child's nose.

It must have actual dimensional form, even though implemented with CSS.

Target:

- tiny bridge
- softly rounded tip
- very subtle nostril definition
- short vertical height
- broad enough to feel natural

Do NOT represent the nose as only one dot or triangle.

Build form using:

- subtle radial gradients
- highlights
- soft shadow
- tiny nostril shading

No hard outline.

==================================================
10. MOUTH + LIPS
==================================================

The mouth should remain small and youthful.

Target:

- small gentle smile
- subtle cupid-like upper curve
- softly fuller lower lip
- warm pink/coral color
- extremely subtle center highlight

Do not make:
large Disney princess lips
adult lips
flat red line
large visible teeth

Expression:
calm + sweet + playful.

==================================================
11. EARS
==================================================

Ears must be proportionate to the child head.

Do not make them extremely tiny because of the hairstyle.

Allow enough visible ear structure for earrings.

==================================================
12. NECK
==================================================

Very important.

The current CSS character must not look as though the head is directly attached to the torso.

Create a short child neck.

Target:

- small
- soft
- narrow
- mostly obscured by jewelry
- anatomically connects head and shoulders

==================================================
13. SHOULDERS
==================================================

Shoulders must be CHILDLIKE.

Target:
narrow
rounded
slightly sloping

Never broad or adult-like.

The shoulder width should visually support the head without making the body look miniature.

==================================================
14. TORSO
==================================================

Torso:

- short
- softly cylindrical
- modest child belly
- very subtle chest definition
- no adult pectoral shape
- no muscular abs

The abdomen can project gently because this is a young child.

Do not make the torso extremely tiny merely to make the head cute.

==================================================
15. ARMS
==================================================

Arms should have believable 4–5-year-old proportions.

Target:

- upper arms softly rounded
- elbows visible through silhouette
- forearms gently taper
- wrists small
- arm length proportional to torso

Raised chakra arm should NOT look like an extremely short stub.

The elbow bend should be clearly readable.

==================================================
16. HANDS + FINGERS
==================================================

Hands currently need special attention.

Target:

- small child hands
- visible palm
- individually readable fingers
- soft cylindrical finger volume
- proper thumb placement

For the chakra hand:

index finger should point upward naturally.

Other fingers should bend gently toward palm.

Avoid:
mitten hand
single blob
four identical cylinders
adult-long fingers

==================================================
17. HIPS + WAIST
==================================================

Waist should not be extremely narrow.

A 4–5-year-old has limited adult waist definition.

Use:

- compact pelvis
- gentle waist transition
- dhoti waistband as primary visual divider

==================================================
18. LEGS
==================================================

Child legs must be proportionate.

Target:

- relatively short
- slightly thicker near upper leg
- knees subtly indicated
- calves gently taper
- no muscular definition

The lower body must be large enough to visually balance the head.

Do NOT create tiny chibi legs.

==================================================
19. FEET
==================================================

Feet should:

- be small
- slightly broad
- have visible toe separation
- carry the body's visual weight

Avoid feet that look like tiny dots under the dhoti.

==================================================
20. BLUE SKIN MATERIAL
==================================================

Retain Krishna's current blue skin identity.

Do not radically change hue.

Upgrade the rendering using multiple layers.

Use approximately:

base blue
+
cooler shadow blue
+
lighter cyan-blue highlight
+
subtle warm reflected light

Create faux subsurface softness around:

- cheeks
- nose
- fingers
- elbows
- knees
- ears

Use:

radial-gradient()
linear-gradient()
inset box-shadow
soft drop shadows
pseudo-elements

Avoid flat single-color fills.

==================================================
21. 3D CSS RENDERING LANGUAGE
==================================================

Every major body part should visually contain:

BASE COLOR
+ LIGHT-SIDE GRADIENT
+ SHADOW-SIDE GRADIENT
+ SMALL SPECULAR HIGHLIGHT
+ CONTACT SHADOW

Do not depend on one giant global box-shadow.

Light direction should remain consistent across the character.

Preferred key light:
upper-left / front-left

Secondary fill:
soft cool front-right

Rim:
very subtle warm edge where appropriate.

==================================================
22. HAIR
==================================================

KEEP THE CURRENT CHARACTER'S HAIR IDENTITY.

Do not redesign it completely.

Refine it into premium dark blue-black hair.

Hair should feel composed of large sculpted locks rather than black circles.

Each lock can use:

- rounded DOM element
- curved border-radius
- dark navy base
- narrow blue highlight
- deep contact shadow
- subtle transform rotation

Avoid:
simple circular balls
flat black blobs
excessive individual strands

Hair volume should frame the head, not enlarge facial anatomy.

==================================================
23. PEACOCK FEATHER
==================================================

Preserve current peacock feather placement and identity.

Upgrade depth.

Build with layered HTML/CSS shapes:

- green feather body
- teal highlights
- golden / turquoise / deep-blue eye
- thin central shaft
- directional gradients

Maintain elegant scale.

Do not make feather so large that it overwhelms the head.

==================================================
24. TILAK
==================================================

Preserve the current tilak identity.

Keep:
centered
symmetrical
clear
small relative to forehead

Do not enlarge merely to fill forehead space.

==================================================
25. JEWELRY
==================================================

Keep all current jewelry categories:

- earrings
- necklaces
- pendant
- bracelets
- armlets
- waistband

Gold must have dimensional rendering:

dark ochre shadow
→ rich gold
→ yellow-gold highlight
→ tiny near-white specular point

Gemstones:
small and controlled.

Avoid enormous ornaments that make the character look like a toy.

==================================================
26. DHOTI + ORANGE DRAPE
==================================================

Preserve current yellow/golden dhoti and orange drape.

Improve form using CSS folds.

Use:

- base gradient
- dark fold bands
- narrow highlights
- curved pseudo-elements
- clipping / border-radius
- overlapping panels

The dhoti should visibly wrap around the pelvis and legs.

Do NOT make it look like one flat rectangular skirt.

Keep enough leg separation to show that the child has two legs.

==================================================
27. CHAKRA
==================================================

Preserve current Sudarshan Chakra.

It should appear balanced above Krishna's raised index finger.

Build using concentric HTML/CSS rings.

Include:

- golden rim
- radial spokes
- bright center
- subtle warm glow
- restrained rotating animation

Glow should NOT obscure the chakra structure.

==================================================
28. POSE
==================================================

Preserve the current pose concept:

one hand raised supporting / presenting chakra
other hand near waist / hip
standing posture
feet grounded

But correct anatomy.

Pose should feel:

balanced
confident
playful
stable

Avoid exaggerated hip tilt.

==================================================
29. CHARACTER SILHOUETTE
==================================================

At thumbnail scale, the character must still read clearly.

Silhouette should approximately balance:

hair/head
shoulders
raised arm + chakra
torso
dhoti
legs

The head must NOT consume most of the silhouette.

==================================================
30. HTML / TSX STRUCTURE
==================================================

Do NOT create the character as one giant div.

Break the character into meaningful components.

Suggested architecture:

<KrishnaCharacter>
  <PeacockFeather />
  <Hair />
  <Head>
    <Face />
    <Eyes />
    <Brows />
    <Tilak />
    <Nose />
    <Mouth />
    <Ears />
  </Head>

  <Neck />

  <Torso>
    <Necklaces />
    <LeftArm />
    <RightArm>
      <Hand />
      <Chakra />
    </RightArm>
  </Torso>

  <Waist />
  <Dhoti />
  <OrangeDrape />

  <LeftLeg />
  <RightLeg />
  <Feet />
</KrishnaCharacter>

Each anatomical region must have its own positioning context.

Avoid fixing global-proportion problems by randomly moving children with margin-left / margin-top.

==================================================
31. CSS DESIGN SYSTEM
==================================================

Create centralized CSS custom properties.

Example:

--character-scale
--head-width
--head-height
--face-width
--face-height
--shoulder-width
--torso-height
--arm-width
--leg-width
--skin-base
--skin-light
--skin-shadow
--gold-base
--gold-highlight
--hair-base
--hair-highlight

This allows proportion changes without breaking the entire character.

==================================================
32. PROPORTION-FIRST DEVELOPMENT RULE
==================================================

Do NOT polish details before silhouette.

Implementation order MUST be:

1. overall body silhouette
2. head-to-body scale
3. torso and limb proportion
4. face width/height
5. facial feature placement
6. hands/feet
7. clothing geometry
8. hair
9. jewelry
10. gradients
11. highlights
12. shadows
13. animation

Do not start by polishing eyes while body anatomy is still incorrect.

==================================================
33. NEGATIVE CONSTRAINTS
==================================================

STRICTLY AVOID:

chibi proportions
baby proportions
huge head
tiny torso
tiny legs
giant circular eyes
perfect circular face
huge forehead
pointed chin
adult male anatomy
muscular torso
adult shoulders
oversized jewelry
flat vector shapes
neon-blue skin
plastic toy appearance
excessive glow
random gradient directions
flat hair circles
mitten hands
stick arms
tiny feet
oversized chakra
hyperrealistic skin pores

==================================================
34. IMMUTABLE EXISTING DESIGN
==================================================

Preserve the current:

Krishna identity
blue skin
dark hair
peacock feather
tilak
gold jewelry
yellow/golden dhoti
orange drape
chakra
raised-arm pose
overall devotional visual language

This task is a QUALITY + PROPORTION upgrade.

It is NOT a complete redesign.

==================================================
35. FINAL QUALITY TEST
==================================================

Before considering the character complete, visually test:

A.
If hair, clothes and jewelry are temporarily hidden,
does the underlying body still look like a believable 4–5-year-old?

B.
If facial details are hidden,
does the head silhouette still look proportionate?

C.
Does the head feel connected to a real neck and shoulders?

D.
Are the hands and feet appropriately sized?

E.
Does the body support the visual weight of the head?

F.
Does every highlight come from approximately the same light direction?

G.
Does the character look premium and dimensional even without animations?

If any answer is NO, correct the structural problem before adding decorative detail.

==================================================
FINAL GOAL
==================================================

Create a polished HTML/CSS/TSX Krishna character that feels like a premium 3D animated-film character while remaining fully constructed using web elements.

Krishna should unmistakably resemble a proportionate, charming, idealized 4–5-year-old child — NOT a chibi mascot.

Prioritize:
ANATOMY
→ PROPORTION
→ SILHOUETTE
→ VOLUME
→ MATERIAL
→ DETAIL
→ ANIMATION

Do not sacrifice correct child proportions for cuteness.
```

For Antigravity, I would **not immediately tell it to implement this entire sheet**. First give it the character sheet as context/source of truth, then give it this first execution instruction:

```text
Study the attached Krishna reference images and the KRISHNA SPORT MASTER CHARACTER SPECIFICATION.

Do not redesign the complete character yet.

FIRST TASK ONLY:

Correct the underlying full-body proportions so the character reads as an idealized but anatomically coherent 4–5-year-old child.

Temporarily ignore fine facial details, jewelry polish, gradients and animations.

Focus exclusively on:

- head-to-body size
- shoulder width
- torso length
- arm length
- hand size
- pelvis position
- leg length
- foot size

Keep the current costume, colors, pose, hair, peacock feather and chakra concept intact.

The current implementation must stop looking like a huge-headed cartoon mascot.

Target approximately a 1:4.5 to 1:5 head-to-body relationship.

Do not polish individual features until this silhouette is correct.

Modify the existing TSX/CSS rather than rebuilding the application.

After implementation, stop.

Do not proceed to facial redesign.
```

This is the point where I would **restart the correction process**. Don't touch nose, lips, pupils, chin, etc. yet. First make the naked structural silhouette believable; otherwise we'll keep fixing details on top of incorrect proportions.
