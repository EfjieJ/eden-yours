# Crédits / Credits — Eden Yours

## Bibliothèques / Libraries
- **three.js 0.180.0** and its example add-ons (Sky, Water, EffectComposer, RenderPass, UnrealBloomPass, OutputPass, GLTFLoader, SkeletonUtils, BufferGeometryUtils): MIT License, © 2010–2025 three.js authors. Loaded from jsDelivr (`cdn.jsdelivr.net/npm/three@0.180.0`). https://github.com/mrdoob/three.js

## Modèles 3D / 3D models
- **Fox** (used in *Le Jardin d’Éden*, layer 2 « animaux paisibles »), from the Khronos glTF Sample Assets.
  Loaded from jsDelivr at the pinned commit `edc7c9e67c639d230715049ee31f9a96a6babbbe`:
  `https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@edc7c9e…/Models/Fox/glTF-Binary/Fox.glb`
  - Model: © 2014 PixelMannen, **CC0 1.0** (public domain).
  - Rigging & animation: © 2014 tomkranis, **CC BY 4.0**.
  - Conversion to glTF: © 2017 @AsoboStudio and @scurest, **CC BY 4.0**.
  - Source & license: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox

## Tout le reste / Everything else
Terrain, grass, trees, flowers, water normals, clouds, butterflies, birds, galaxy and rainbow are generated procedurally in `js/eden-real.js` (original code, no third-party textures).

## Corps de lumière / Bodies of light (CC0)
Les êtres de lumière de *Danse des Êtres de Lumière*, du *Jardin d’Éden*, des *Êtres de Lumière* et de l’hologramme de *Création-Demain* sont des
corps humains **sans sexe** (ni homme ni femme : pas de visage, de cheveux, de vêtements, de poitrine ou d’organes sexuels), rendus comme des silhouettes de lumière.
The beings of light are sexless human bodies (no face, hair, clothing or sexual features), rendered as translucent light.
- **Maillage / mesh** : « Human base mesh with editable 53-bone rig » (`human-base-rigged.glb`) by **Innerscene** — https://www.innerscene.com/tools/library/3d-parts/human-base-mesh-with-editable-53-bone-rig-8e7c8ab1 — **CC0 1.0** (public domain, no attribution required; page states: « MakeHuman/MPFB CC0 anatomical base and 53-bone game-engine skeleton … released CC0 »).
- **Nos modifications / our changes** (hors-ligne, `assets/lightbody/body.glb`) : maillage allégé (≈ 17 k sommets), détails du torse et du bassin lissés, tête remplacée par une forme ovoïde lisse, cou refait, proportions légèrement androgynes, textures retirées. Aucune texture ni capture de mouvement : poses et mouvements calculés par code (`js/light-body.js`).
- Rendu : shader Fresnel + cœur chaud + aura (`js/light-body.js`), poses fixes de *Êtres de Lumière* et hologramme : rendus de ce même modèle (`assets/lightbody/pose-*.webp`, `holo-person.webp`).

## Personnes réelles restantes / Remaining real people (Pexels License)
Seuls restent des photos et vidéos réelles dans *Éclats de rire* (portraits) et sur l’accueil (marcheurs). Pexels License: free to use, modification allowed, attribution not required — given here anyway. Background removed offline (Robust Video Matting), cropped, re-encoded. The people shown do not endorse Eden Yours. Files in `assets/people/`.
- `walk-girl, walk-mother` — « Side View of a People Walking Together » by Ron Lach — https://www.pexels.com/video/side-view-of-a-people-walking-together-9479419/ — Accueil — marcheurs (planches `walk-girl.webp`, `walk-mother.webp`)

Laughing faces in *Éclats de rire* (cropped portraits, `assets/people/faces/`):
- `laugh-18893587.webp` — Alessandra Araújo — https://www.pexels.com/photo/portrait-of-a-woman-laughing-18893587/
- `laugh-32272824.webp` — Gisele Seidel — https://www.pexels.com/photo/joyful-woman-laughing-in-black-and-white-portrait-32272824/
- `laugh-13871734.webp` — Matheus Bertelli — https://www.pexels.com/photo/beautiful-woman-laughing-13871734/
- `laugh-4584544.webp` — Ketut Subiyanto — https://www.pexels.com/photo/man-in-yellow-crew-neck-t-shirt-laughing-4584544/
- `laugh-13757556.webp` — Sam Clickx — https://www.pexels.com/photo/portrait-of-a-boy-laughing-13757556/
- `laugh-31507920.webp` — Niklas Baumann — https://www.pexels.com/photo/expressive-portrait-of-a-joyful-woman-31507920/
- `laugh-8727469.webp` — Tima Miroshnichenko — https://www.pexels.com/photo/a-woman-in-green-crew-neck-shirt-laughing-8727469/
- `laugh-19879509.webp` — Creative KG — https://www.pexels.com/photo/portrait-of-a-laughing-man-19879509/
- `laugh-2066039.webp` — Thaís Sarmento — https://www.pexels.com/photo/woman-looking-up-2066039/
- `laugh-3907442.webp` — Andrea Piacquadio — https://www.pexels.com/photo/man-in-blue-crew-neck-shirt-wearing-black-framed-eyeglasses-3907442/
- `laugh-18644578.webp` — TÁTI ALVES — https://www.pexels.com/photo/portrait-of-smiling-woman-18644578/
- `laugh-33544578.webp` — rupeshography_ .. — https://www.pexels.com/photo/elderly-man-smiling-in-traditional-hat-portrait-33544578/
- `laugh-13636925.webp` — Albin Biju — https://www.pexels.com/photo/photo-of-a-laughing-man-13636925/
- `laugh-37409945.webp` — giovana bispo — https://www.pexels.com/photo/elderly-woman-smiling-brightly-indoors-37409945/
- `laugh-16262989.webp` — Elfabrojeda — https://www.pexels.com/photo/portrait-of-an-elderly-smiling-man-16262989/
- `laugh-11425715.webp` — camila esteves — https://www.pexels.com/photo/elderly-couple-wearing-elegant-outfits-laughing-together-11425715/
- `laugh-39178657.webp` — Bernie Andrew — https://www.pexels.com/photo/joyful-senior-man-laughing-outdoors-39178657/
- `laugh-18054416.webp` — JA ATIER — https://www.pexels.com/photo/laughing-young-brunette-boy-18054416/
- `laugh-32667444.webp` — Vibes photography.ng — https://www.pexels.com/photo/joyful-child-in-pink-dress-with-henna-design-32667444/
- `laugh-19236771.webp` — Vishwa Vantepaka — https://www.pexels.com/photo/laughing-baby-in-wool-hat-tied-under-the-chin-19236771/
- `laugh-6333507.webp` — https://kaboompics.com/ — https://www.pexels.com/photo/man-with-black-framed-eyeglasses-laughing-6333507/

Tool used offline for the walkers (not shipped): Robust Video Matting (Lin et al., https://github.com/PeterL1n/RobustVideoMatting) to remove backgrounds.

## Home page photography (public domain, NASA)
NASA imagery is not copyrighted (public domain in the US); NASA does not endorse this site. Converted to WebP in `assets/home/`.
- `hero-milkyway-airglow*.webp` — ISS photo iss073e0982823 (Milky Way over Earth's airglow), NASA/JSC — https://images.nasa.gov/details/iss073e0982823
- `card-milkyway.webp` — iss073e0982261, NASA/JSC — https://images.nasa.gov/details/iss073e0982261
- `card-aurora.webp` — iss039e009160, NASA/JSC — https://images.nasa.gov/details/iss039e009160
- `card-carina.webp` — Carina Nebula, NASA/ESA Hubble, GSFC_20171208_Archive_e002076 — https://images.nasa.gov/details/GSFC_20171208_Archive_e002076
- `card-pillars.webp` — Pillars of Creation (infrared), NASA/ESA Hubble, GSFC_20171208_Archive_e000842 — https://images.nasa.gov/details/GSFC_20171208_Archive_e000842
- `card-scene3d.webp`, `card-jardin.webp` — our own renders (they include the Pexels people credited above); `cover-*.webp` — Eden Yours song covers.
