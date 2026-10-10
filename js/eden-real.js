/* Eden Yours — moteur 3D « réaliste » partagé (scene-3d.html, eden-jardin.html).
   three.js 0.180.0 + addons (Sky, Water, EffectComposer/UnrealBloomPass, GLTFLoader, SkeletonUtils),
   chargés via l'import map de la page. Matériaux physiques (MeshStandard/Physical), ombres douces,
   brume atmosphérique, ciel procédural, eau réfléchissante, herbe instanciée animée par le vent,
   êtres de lumière éthérés (particules + halo + bloom). Qualité adaptative (bloom/ombres coupés
   sur les appareils faibles ou si l'image ralentit). Renard : modèle glTF CC0/CC-BY (voir CREDITS.md). */
import * as THREE from "three";
import { loadBody, createFigure, BODY_HEIGHT } from "./light-body.js?v=20261010n";

const ADDON = "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/";
const FOX_URL = "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@edc7c9e67c639d230715049ee31f9a96a6babbbe/Models/Fox/glTF-Binary/Fox.glb";

/* ———————— bruit procédural ———————— */
function hash(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z, o = 5) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, z * f); f *= 2.03; a *= 0.5; } return s; }
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const rand = (a, b) => a + rnd() * (b - a);

/* ———————— qualité ———————— */
function pickQuality() {
  const q = new URLSearchParams(location.search).get("quality");
  if (q === "low") return 0; if (q === "medium") return 1; if (q === "high") return 2;
  const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  const cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4;
  if (cores <= 4 || mem <= 3) return 0;
  return coarse ? 1 : 2;
}

export async function createRealScene(canvas, stage, opts) {
  const isReduced = opts.isReduced || (() => false);
  const garden = !!opts.garden;
  const level = Math.max(1, opts.gardenLevel || 1);
  let quality = pickQuality();

  const [{ Sky }, { Water }, { EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }, { GLTFLoader }, SkU, BGU] = await Promise.all([
    import(ADDON + "objects/Sky.js"), import(ADDON + "objects/Water.js"),
    import(ADDON + "postprocessing/EffectComposer.js"), import(ADDON + "postprocessing/RenderPass.js"),
    import(ADDON + "postprocessing/UnrealBloomPass.js"), import(ADDON + "postprocessing/OutputPass.js"),
    import(ADDON + "loaders/GLTFLoader.js"), import(ADDON + "utils/SkeletonUtils.js"), import(ADDON + "utils/BufferGeometryUtils.js")
  ]);

  const maxDpr = () => [1, 1.5, 2][quality];
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality > 0, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr()));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.6;
  renderer.shadowMap.enabled = quality > 0;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const sc = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
  sc.fog = new THREE.FogExp2(0x9aa7b0, 0.013);
  const C = (h) => new THREE.Color(h);
  const U = { time: { value: 0 }, sat: { value: 1 }, wind: { value: 1 } };

  /* — textures procédurales — */
  function canvasTex(size, draw, srgb = true) {
    const c = document.createElement("canvas"); c.width = c.height = size;
    draw(c.getContext("2d"), size);
    const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const glowTex = canvasTex(128, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.18, "rgba(255,255,255,0.55)");
    r.addColorStop(0.5, "rgba(255,255,255,0.12)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, s, s);
  });
  const cloudTex = canvasTex(256, (g, s) => {
    for (let i = 0; i < 46; i++) {
      const x = s * (0.2 + Math.random() * 0.6), y = s * (0.3 + Math.random() * 0.45), rr = s * (0.08 + Math.random() * 0.16);
      const r = g.createRadialGradient(x, y, 0, x, y, rr);
      r.addColorStop(0, "rgba(255,255,255,0.22)"); r.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = r; g.fillRect(0, 0, s, s);
    }
  });
  const waterNormals = canvasTex(256, (g, s) => {
    const img = g.createImageData(s, s), H = (x, y) => {
      let h = 0; for (let k = 1; k <= 4; k++) h += Math.sin((x * k * 3 + y * (5 - k) * 2) * Math.PI * 2 / s + k) / k + Math.cos((y * k * 4 - x * k) * Math.PI * 2 / s * 0.5 + k * 2) / k;
      return h;
    };
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const dx = H(x + 1, y) - H(x - 1, y), dy = H(x, y + 1) - H(x, y - 1);
      const n = new THREE.Vector3(-dx * 0.6, -dy * 0.6, 1).normalize(), i = (y * s + x) * 4;
      img.data[i] = (n.x * 0.5 + 0.5) * 255; img.data[i + 1] = (n.y * 0.5 + 0.5) * 255; img.data[i + 2] = (n.z * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, false);
  waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;
  const wingTex = canvasTex(128, (g, s) => {
    g.clearRect(0, 0, s, s);
    const grd = g.createRadialGradient(s * 0.15, s * 0.5, 4, s * 0.3, s * 0.5, s * 0.75);
    grd.addColorStop(0, "#fff6d8"); grd.addColorStop(0.45, "#ffd27a"); grd.addColorStop(0.8, "#e58a3a"); grd.addColorStop(1, "#3a2414");
    g.fillStyle = grd;
    g.beginPath(); g.moveTo(s * 0.05, s * 0.5);
    g.bezierCurveTo(s * 0.3, s * 0.02, s * 0.95, s * 0.0, s * 0.92, s * 0.32);
    g.bezierCurveTo(s * 0.9, s * 0.48, s * 0.6, s * 0.5, s * 0.6, s * 0.52);
    g.bezierCurveTo(s * 0.85, s * 0.62, s * 0.8, s * 0.95, s * 0.5, s * 0.9);
    g.bezierCurveTo(s * 0.3, s * 0.88, s * 0.12, s * 0.7, s * 0.05, s * 0.5); g.fill();
    g.strokeStyle = "rgba(60,30,10,0.55)"; g.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(s * 0.06, s * 0.5); g.quadraticCurveTo(s * 0.5, s * (0.2 + i * 0.12), s * (0.85 - Math.abs(i - 2.5) * 0.08), s * (0.12 + i * 0.15)); g.stroke(); }
  });
  const glow = (color, size, opacity = 0.8) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: C(color), transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    s.scale.setScalar(size); return s;
  };
  function satPatch(mat) {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uSat = U.sat;
      sh.fragmentShader = "uniform float uSat;\n" + sh.fragmentShader.replace("#include <dithering_fragment>",
        "#include <dithering_fragment>\n gl_FragColor.rgb = mix(vec3(dot(gl_FragColor.rgb, vec3(0.299,0.587,0.114))), gl_FragColor.rgb, uSat);");
    };
    return mat;
  }

  /* ———————— relief ———————— */
  const LAKE = { x: -7.5, z: -9.5, r: 5.2, y: -0.38 };
  const riverOn = garden && level >= 4;
  const riverZ = (x) => 7.5 + Math.sin(x * 0.12) * 2.6;
  function heightAt(x, z) {
    const d = Math.hypot(x, z);
    let h = (fbm(x * 0.035 + 3, z * 0.035 + 1) - 0.45) * 5 * smooth(8, 26, d);
    h += Math.max(0, d - 42) * 0.32 * (0.6 + fbm(x * 0.02, z * 0.02));
    h += (fbm(x * 0.4, z * 0.4, 3) - 0.5) * 0.12;
    if (!garden) h -= 1.6 * (1 - smooth(LAKE.r - 2, LAKE.r + 2.5, Math.hypot(x - LAKE.x, z - LAKE.z)));
    if (riverOn) h -= 1.3 * (1 - smooth(1.4, 3.6, Math.abs(z - riverZ(x))));
    return h;
  }
  const envGroup = new THREE.Group(); sc.add(envGroup);
  const ground = new THREE.Group(); envGroup.add(ground);
  {
    const seg = [90, 140, 180][quality];
    const geo = new THREE.PlaneGeometry(260, 260, seg, seg); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
    const grassC = C("#4d6b2c"), dryC = C("#8a7d4a"), soilC = C("#4a3a2a"), rockC = C("#6d6a64"), tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = heightAt(x, z); pos.setY(i, h);
      const n = fbm(x * 0.08, z * 0.08, 3);
      tmp.copy(grassC).lerp(dryC, smooth(0.45, 0.75, n) * 0.6);
      if (h < -0.2) tmp.lerp(soilC, smooth(-0.2, -0.9, h));
      if (h > 4) tmp.lerp(rockC, smooth(4, 9, h));
      col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const terr = new THREE.Mesh(geo, satPatch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 })));
    terr.receiveShadow = true; ground.add(terr);
  }
  /* herbe instanciée, ondulant au vent */
  {
    const N = [3500, 9000, 16000][quality] * (garden ? 1.2 : 1) | 0;
    const W = 0.045, Hh = 0.4, S = 4, vs = [], cs = [], idx = [];
    for (let i = 0; i <= S; i++) {
      const t = i / S, w = W * (1 - t * 0.92);
      vs.push(-w, t * Hh, 0, w, t * Hh, 0);
      const c = C("#2f4a1c").lerp(C("#a8b860"), t * t); cs.push(c.r, c.g, c.b, c.r, c.g, c.b);
      if (i < S) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(cs, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(vs.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    g.setIndex(idx);
    const m = satPatch(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.85 }));
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh) => {
      prev(sh); sh.uniforms.uTime = U.time; sh.uniforms.uWind = U.wind;
      sh.vertexShader = "uniform float uTime; uniform float uWind;\n" + sh.vertexShader.replace("#include <begin_vertex>",
        `#include <begin_vertex>
         vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
         float hh = position.y / ${Hh.toFixed(2)};
         float w = sin(uTime * 1.2 + wp.x * 0.35 + wp.z * 0.22) * 0.6 + sin(uTime * 2.3 + wp.x * 0.9 - wp.z * 0.5) * 0.25;
         transformed.x += w * hh * hh * 0.16 * uWind; transformed.z += (w * 0.5 + 0.2) * hh * hh * 0.1 * uWind;`);
    };
    const mesh = new THREE.InstancedMesh(g, m, N), d = new THREE.Object3D(), cc = new THREE.Color();
    let k = 0;
    for (let tries = 0; k < N && tries < N * 3; tries++) {
      const a = rand(0, Math.PI * 2), r = Math.sqrt(rnd()) * 30;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, h = heightAt(x, z);
      if (h < -0.3) continue;
      d.position.set(x, h - 0.02, z); d.rotation.set(rand(-0.15, 0.15), rand(0, Math.PI), rand(-0.2, 0.2));
      d.scale.set(rand(0.8, 1.3), rand(0.6, 1.5) * (r < 4 ? 0.7 : 1), 1); d.updateMatrix(); mesh.setMatrixAt(k, d.matrix);
      cc.setHSL(0.2 + rand(-0.03, 0.04), 0.35 + rand(0, 0.2), 0.42 + rand(-0.08, 0.1)); mesh.setColorAt(k, cc.multiplyScalar(2.1));
      k++;
    }
    mesh.count = k; mesh.receiveShadow = true; mesh.frustumCulled = false; ground.add(mesh);
  }

  /* ———————— arbres, rochers ———————— */
  function displace(geo, amp, freq) {
    const p = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); const n = fbm(v.x * freq + 5, v.z * freq + v.y * 0.7, 3) - 0.5;
      v.addScaledVector(v.clone().normalize(), n * amp); p.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals(); return geo;
  }
  function shade(geo, base, top, y0, y1) {
    const p = geo.attributes.position, c = new Float32Array(p.count * 3), t = new THREE.Color();
    for (let i = 0; i < p.count; i++) { t.copy(base).lerp(top, smooth(y0, y1, p.getY(i))); c[i * 3] = t.r; c[i * 3 + 1] = t.g; c[i * 3 + 2] = t.b; }
    geo.setAttribute("color", new THREE.BufferAttribute(c, 3)); return geo;
  }
  const barkMat = new THREE.MeshStandardMaterial({ color: "#5a4634", roughness: 1 });
  const leafMat = satPatch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
  const leafCardTex = canvasTex(128, (g, S) => {
    g.clearRect(0, 0, S, S);
    for (let i = 0; i < 26; i++) {
      const x = S * (0.15 + Math.random() * 0.7), y = S * (0.15 + Math.random() * 0.7), a = Math.random() * 6.28, l = S * (0.1 + Math.random() * 0.08);
      g.save(); g.translate(x, y); g.rotate(a);
      const v = 150 + Math.random() * 90 | 0; g.fillStyle = `rgb(${v * 0.55 | 0},${v},${v * 0.4 | 0})`;
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(l * 0.5, -l * 0.35, l, 0); g.quadraticCurveTo(l * 0.5, l * 0.35, 0, 0); g.fill(); g.restore();
    }
  });
  const leafCardMat = satPatch(new THREE.MeshStandardMaterial({ map: leafCardTex, alphaTest: 0.45, side: THREE.DoubleSide, vertexColors: true, roughness: 0.85 }));
  const needleMat = satPatch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  function makeBroadleaf(s = 1, hue = 0) {
    const g = new THREE.Group(), H = 2.6 * s, det = quality ? 3 : 2;
    const trunk = new THREE.CylinderGeometry(0.12 * s, 0.3 * s, H, 9, 6); trunk.translate(0, H / 2, 0);
    const tp = trunk.attributes.position;
    for (let i = 0; i < tp.count; i++) { const y = tp.getY(i); tp.setX(i, tp.getX(i) + Math.sin(y * 0.9) * 0.12 * s); }
    trunk.computeVertexNormals();
    const parts = [trunk];
    for (let b = 0; b < 3; b++) {
      const br = new THREE.CylinderGeometry(0.04 * s, 0.09 * s, 1.3 * s, 6); br.translate(0, 0.65 * s, 0);
      br.rotateZ(0.7 + b * 0.15); br.rotateY(b * 2.1); br.translate(0, H * (0.6 + b * 0.1), 0); parts.push(br);
    }
    const tm = new THREE.Mesh(BGU.mergeGeometries(parts), barkMat); tm.castShadow = true; g.add(tm);
    const blobs = [], n = 6 + (rnd() * 3 | 0);
    for (let i = 0; i < n; i++) {
      const r = rand(0.8, 1.35) * s, geo = new THREE.IcosahedronGeometry(r, det);
      displace(geo, 0.55 * r, 1.4 / s);
      const a = (i / n) * Math.PI * 2 + rand(-0.3, 0.3);
      geo.translate(Math.cos(a) * rand(0.5, 1.1) * s, H + rand(-0.2, 1.1) * s, Math.sin(a) * rand(0.5, 1.1) * s);
      blobs.push(geo);
    }
    const crown = BGU.mergeGeometries(blobs);
    shade(crown, C("#26391a").offsetHSL(hue, 0, 0), C("#8aa64a").offsetHSL(hue, 0, 0), H - 0.6 * s, H + 1.8 * s);
    const cm = new THREE.Mesh(crown, leafMat); cm.castShadow = true; cm.receiveShadow = true;
    const sway = new THREE.Group(); sway.add(cm); g.add(sway); g.userData.sway = sway;
    // cartes de feuillage sur la surface de la couronne : silhouette douce et naturelle
    const nc = [90, 220, 380][quality], cp = crown.attributes.position, cards = [], v = new THREE.Vector3(), nrm = new THREE.Vector3(), cn = crown.attributes.normal;
    for (let i = 0; i < nc; i++) {
      const j = (rnd() * cp.count) | 0; v.fromBufferAttribute(cp, j); nrm.fromBufferAttribute(cn, j);
      const q = new THREE.PlaneGeometry(0.75 * s, 0.75 * s); q.lookAt(nrm); q.rotateZ(rand(0, 6.28));
      q.translate(v.x + nrm.x * 0.12 * s, v.y + nrm.y * 0.12 * s, v.z + nrm.z * 0.12 * s);
      const sh = smooth(H - 0.5 * s, H + 1.8 * s, v.y), c = C("#3a5522").lerp(C("#b4c86a"), sh * 0.8 + rand(-0.1, 0.1)).offsetHSL(hue, 0, 0), arr = [];
      for (let k = 0; k < 4; k++) arr.push(c.r, c.g, c.b);
      q.setAttribute("color", new THREE.Float32BufferAttribute(arr, 3)); cards.push(q);
    }
    const cardMesh = new THREE.Mesh(BGU.mergeGeometries(cards), leafCardMat); cardMesh.castShadow = true; sway.add(cardMesh);
    return g;
  }
  function makeConifer(s = 1) {
    const g = new THREE.Group(), H = 4 * s, parts = [];
    const tr = new THREE.CylinderGeometry(0.08 * s, 0.18 * s, H * 0.4, 7); tr.translate(0, H * 0.2, 0);
    const tm = new THREE.Mesh(tr, barkMat); tm.castShadow = true; g.add(tm);
    for (let i = 0; i < 5; i++) {
      const r = (1.3 - i * 0.22) * s, cone = new THREE.ConeGeometry(r, 1.4 * s, 10, 3, true);
      displace(cone, 0.25 * s, 2); cone.translate(0, H * 0.28 + i * 0.62 * s, 0); parts.push(cone);
    }
    const geo = shade(BGU.mergeGeometries(parts), C("#132416"), C("#3f5a34"), H * 0.2, H * 1.1);
    const m = new THREE.Mesh(geo, needleMat); m.castShadow = true; g.add(m); return g;
  }
  const rockMat = new THREE.MeshStandardMaterial({ color: "#77736c", roughness: 0.92 });
  function makeRock(s) { const geo = displace(new THREE.IcosahedronGeometry(s, 2), s * 0.5, 1.6 / s); geo.scale(1, 0.6, 1); const m = new THREE.Mesh(geo, rockMat); m.castShadow = m.receiveShadow = true; return m; }
  const trees = [];
  function plant(obj, x, z, sink = 0.1) { obj.position.set(x, heightAt(x, z) - sink, z); obj.rotation.y = rand(0, 6.28); envGroup.add(obj); return obj; }
  {
    const nFar = [10, 18, 26][quality];
    for (let i = 0; i < nFar; i++) {
      const a = rand(0, 6.28), r = rand(24, 46), x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (!garden && Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 2) continue;
      plant(makeConifer(rand(0.9, 1.6)), x, z);
    }
    if (!garden) {
      for (let i = 0; i < [6, 9, 12][quality]; i++) {
        const a = rand(0, 6.28), r = rand(13, 22), x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 2.5) continue;
        trees.push(plant(makeBroadleaf(rand(0.9, 1.3), rand(-0.03, 0.03)), x, z));
      }
    }
    for (let i = 0; i < 9; i++) { const a = rand(0, 6.28), r = rand(7, 20); plant(makeRock(rand(0.25, 0.8)), Math.cos(a) * r, Math.sin(a) * r, 0.15); }
  }

  /* ———————— eau ———————— */
  const waters = [];
  function addWater(geo) {
    const simple = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: "#1d3a44", roughness: 0.06, metalness: 0, transmission: 0, envMapIntensity: 1.2, normalMap: waterNormals, normalScale: new THREE.Vector2(0.25, 0.25) }));
    const fancy = new Water(geo, { textureWidth: 512, textureHeight: 512, waterNormals, sunDirection: new THREE.Vector3(0, 1, 0), sunColor: 0xffffff, waterColor: 0x0e2a33, distortionScale: 1.6, fog: true });
    fancy.material.uniforms.size.value = 3;
    [simple, fancy].forEach((m) => { m.rotation.x = -Math.PI / 2; envGroup.add(m); });
    simple.receiveShadow = true;
    const w = { simple, fancy }; waters.push(w); return w;
  }
  if (!garden) { const w = addWater(new THREE.CircleGeometry(LAKE.r + 2.6, 48)); [w.simple, w.fancy].forEach((m) => m.position.set(LAKE.x, LAKE.y, LAKE.z)); }
  if (riverOn) {
    const pts = [], segs = 120, x0 = -70, x1 = 70, wdt = 3.4, pos = [], idx = [];
    for (let i = 0; i <= segs; i++) { const x = x0 + (x1 - x0) * i / segs, z = riverZ(x); pos.push(x, z - wdt, 0, x, z + wdt, 0); if (i < segs) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos.map((v, i) => (i % 3 === 1 ? -v : v)), 3)); g.setIndex(idx);
    g.computeVertexNormals(); g.setAttribute("uv", new THREE.Float32BufferAttribute(new Array(pos.length / 3 * 2).fill(0).map((_, i) => (i % 2 ? (i % 4 === 1 ? 0 : 1) : pos[(i >> 1) * 3] / 10)), 2));
    const w = addWater(g); [w.simple, w.fancy].forEach((m) => { m.position.y = -0.4; m.rotation.x = -Math.PI / 2; });
    pts.length = 0;
  }
  function waterQuality() { waters.forEach((w) => { w.fancy.visible = quality >= 1; w.simple.visible = quality < 1; }); }
  waterQuality();

  /* ———————— ciel ———————— */
  const sky = new Sky(); sky.scale.setScalar(4000); sc.add(sky);
  const envSky = new Sky(); envSky.scale.setScalar(4000);
  const nightU = { top: { value: C("#050b26") }, horizon: { value: C("#22306a") }, bottom: { value: C("#0b1236") }, moonDir: { value: new THREE.Vector3(0.3, 0.5, -0.8).normalize() } };
  const nightMat = new THREE.ShaderMaterial({
    uniforms: nightU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; uniform vec3 moonDir; varying vec3 vD;
      void main(){ float h = vD.y; vec3 c = h > 0. ? mix(horizon, top, pow(smoothstep(0.,0.6,h),0.7)) : mix(horizon, bottom, smoothstep(0.,0.25,-h));
        float m = max(dot(normalize(vD), moonDir), 0.); c += vec3(0.75,0.8,1.0) * (pow(m, 900.) * 6. + pow(m, 12.) * 0.08);
        gl_FragColor = vec4(c, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const nightDome = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), nightMat); sc.add(nightDome);
  const envNight = new THREE.Mesh(nightDome.geometry, nightMat);
  const stars = (() => {
    const n = 2200, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const u = rnd(), v = rnd() * 0.95, th = u * 6.283, ph = Math.acos(v); p[i * 3] = Math.sin(ph) * Math.cos(th) * 1200; p[i * 3 + 1] = Math.cos(ph) * 1200; p[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * 1200; }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    const m = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
    const s = new THREE.Points(g, m); sc.add(s); return s;
  })();
  const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x4a3a20, 0.6); sc.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd2a0, 2.5);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 140 });
  sc.add(sun, sun.target);
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = null;
  const sunDir = new THREE.Vector3();

  function applyPalette(P) {
    const night = P.night || 0, isNight = night >= 0.75;
    const elev = THREE.MathUtils.degToRad(9 - night * 9), az = THREE.MathUtils.degToRad(205);
    sunDir.setFromSphericalCoords(1, Math.PI / 2 - elev, az);
    [sky, envSky].forEach((s) => {
      const u = s.material.uniforms;
      u.turbidity.value = 4 + night * 6; u.rayleigh.value = 1.4 + night * 2.2; u.mieCoefficient.value = 0.006; u.mieDirectionalG.value = 0.86;
      u.sunPosition.value.copy(sunDir);
    });
    sky.visible = !isNight; nightDome.visible = isNight;
    nightU.top.value.set(P.sky[0]); nightU.horizon.value.set(P.sky[1]); nightU.bottom.value.set(P.sky[2]);
    stars.material.opacity = isNight ? 0.95 : Math.max(0, night - 0.25) * 0.6;
    renderer.toneMappingExposure = isNight ? 1.0 : 0.5 + night * 0.25;
    sc.fog.color.set(isNight ? P.sky[1] : P.sun).lerp(C(P.sky[2]), isNight ? 0.4 : 0.45).multiplyScalar(isNight ? 0.7 : 0.62);
    sc.fog.density = isNight ? 0.016 : 0.011;
    hemi.color.set(P.cool).lerp(C("#ffffff"), 0.4); hemi.groundColor.set(P.ground).multiplyScalar(0.5);
    hemi.intensity = isNight ? 0.35 : 0.55 + (1 - night) * 0.3;
    if (isNight) { sun.color.set("#9fb4ff"); sun.intensity = 0.45; sun.position.copy(nightU.moonDir.value).multiplyScalar(60); }
    else { sun.color.set(P.sun); sun.intensity = 1.6 + (1 - night) * 1.6; sun.position.copy(sunDir).multiplyScalar(60); sun.position.y = Math.max(sun.position.y, 8); }
    waters.forEach((w) => { const u = w.fancy.material.uniforms; u.sunDirection.value.copy(sun.position).normalize(); u.sunColor.value.set(isNight ? "#8aa0ff" : P.sun); u.waterColor.value.set(isNight ? "#050c1e" : "#0e2a33"); });
    // environnement d'éclairage (réflexions de l'eau et des matériaux)
    const es = new THREE.Scene(); es.add(isNight ? envNight : envSky);
    if (envRT) envRT.dispose();
    envRT = pmrem.fromScene(es, 0.04); sc.environment = envRT.texture; sc.environmentIntensity = isNight ? 0.5 : 0.8;
    es.remove(isNight ? envNight : envSky);
  }

  /* ———————— lucioles (montent doucement, ne tombent jamais) ———————— */
  function makeMotes(n, color, area = 14, hMax = 3) {
    const g = new THREE.BufferGeometry(), p = new Float32Array(n * 3), s = new Float32Array(n);
    for (let i = 0; i < n; i++) { const a = rand(0, 6.28), r = Math.sqrt(rnd()) * area; p[i * 3] = Math.cos(a) * r; p[i * 3 + 1] = rand(0.2, hMax); p[i * 3 + 2] = Math.sin(a) * r; s[i] = rnd(); }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3)); g.setAttribute("aS", new THREE.BufferAttribute(s, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: U.time, uC: { value: C(color).multiplyScalar(3) }, uPx: { value: renderer.getPixelRatio() }, uLevel: { value: 0.3 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float aS; uniform float uTime; uniform float uPx; varying float vA;
        void main(){ vec3 p = position; float t = uTime * (0.15 + aS * 0.2) + aS * 40.;
          p.x += sin(t * 1.3) * 0.6; p.z += cos(t * 1.1) * 0.6; p.y += sin(t * 0.9) * 0.35;
          vA = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * (1.5 + aS * 2.) + aS * 30.), 3.);
          vec4 mv = modelViewMatrix * vec4(p, 1.); gl_PointSize = (6. + aS * 6.) * uPx / -mv.z * 6.; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uC; uniform float uLevel; varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d); a = a * a; gl_FragColor = vec4(uC * a * vA * (0.6 + uLevel), 1.); }`
    });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; return pts;
  }

  /* ———————— êtres de lumière : corps humains sans sexe ————————
     Corps humain lisse et neutre (ni homme, ni femme : pas de visage, de cheveux ni de vêtements), rendu comme une
     silhouette de lumière translucide — cœur chaud, liseré en contre-jour, aura (bloom). Maillage CC0 modifié,
     poses calculées par code (voir js/light-body.js et CREDITS.md). Repli : rien n'est affiché tant que le maillage charge. */
  const liveVideos = new Set();
  const shadowTex = canvasTex(64, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, "rgba(0,0,0,0.5)"); r.addColorStop(0.6, "rgba(0,0,0,0.16)"); r.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = r; g.fillRect(0, 0, s, s);
  }, false);
  const mistTex = canvasTex(128, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, "rgba(255,255,255,0.75)"); r.addColorStop(0.45, "rgba(255,255,255,0.35)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, s, s);
  });
  // h : hauteur debout (m) ; figs : figures du groupe (pose, décalage dx/dz, orientation yaw, phase ph)
  const FIGS = {
    "lumiere-flower": { h: 1.7, figs: [{ pose: "dance" }] },
    "lumiere-dancer2": { h: 1.55, figs: [{ pose: "dance", ph: 0.4 }] },
    "coeur-couple": { h: 1.7, spin: 0.12, figs: [{ pose: "waltz", dx: -0.31, yaw: Math.PI / 2 }, { pose: "waltz", dx: 0.31, yaw: -Math.PI / 2 }] },
    "souffle-man2": { h: 1.75, breath: true, figs: [{ pose: "stand" }] },
    "souffle-man": { h: 1.6, breath: true, figs: [{ pose: "stand", ph: 0.3 }] },
    "oui-hug": { h: 1.7, figs: [{ pose: "embrace", dz: -0.15 }, { pose: "embrace", dz: 0.15, yaw: Math.PI }] },
    "oui-arms": { h: 1.55, figs: [{ pose: "open" }] },
    "reveur-meditate": { h: 1.7, figs: [{ pose: "lotus" }] },
    "creation-dancer": { h: 1.8, figs: [{ pose: "create" }] },
    "jeu-boy": { h: 1.25, figs: [{ pose: "play" }] },
    "jeu-girl": { h: 1.15, figs: [{ pose: "play", ph: 0.4 }] },
    "regen-stretch": { h: 1.75, figs: [{ pose: "tree" }] },
    "particule-reach": { h: 1.9, figs: [{ pose: "reach" }] }
  };
  let bodyTpl = null;
  function makePerson(id, o = {}) {
    const spec = FIGS[id] || FIGS["souffle-man2"];
    const H = o.height || spec.h, sc = H / BODY_HEIGHT, W = 0.6 * sc;
    const g = new THREE.Group(), rot = new THREE.Group(); g.add(rot);
    const core = C("#ffffff").lerp(C(o.rim || "#ffd79a"), 0.22), rim = C(o.rim || "#ffd79a").multiplyScalar(1.5), aura = C(o.aura || o.rim || "#ffd79a");
    const figs = []; let disposed = false, opac = 0;
    const heartSp = glow(o.aura || o.rim || "#ffd79a", H * 0.9, 0.16); g.add(heartSp);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(W * 2.2, W * 2.2), new THREE.MeshBasicMaterial({ map: mistTex, color: aura, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    pool.rotation.x = -Math.PI / 2; pool.position.y = 0.03; g.add(pool);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.6, W * 0.8), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0 }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; g.add(sh);
    if (!bodyTpl) bodyTpl = loadBody(GLTFLoader);
    bodyTpl.then((tpl) => {
      if (disposed) return;
      spec.figs.forEach((f) => {
        const fig = createFigure(SkU, tpl, { pose: f.pose, ph: (f.ph || 0) + (o.offset || 0), core, rim, aura, quality, speed: f.pose === "play" ? 1.6 : 1.5 });
        const holder = new THREE.Group(); holder.add(fig.root); holder.rotation.y = f.yaw || 0; holder.position.set(f.dx || 0, 0, f.dz || 0);
        rot.add(holder); figs.push({ fig, holder });
      });
      rot.scale.setScalar(sc);
    });
    const wp = new THREE.Vector3();
    return {
      group: g, H, W,
      update(T, dt, A) {
        opac = Math.min(1, opac + dt * 0.9);
        const reduced = isReduced(), tt = reduced ? 0 : T;
        const b = spec.breath ? 0.5 + 0.5 * Math.sin(tt * 0.63) : 0.5 + 0.5 * Math.sin(tt * 0.5);
        if (spec.spin && !reduced) rot.rotation.y = tt * spec.spin;
        const gain = (o.gain || 1) * 0.82 / Math.max(0.35, renderer.toneMappingExposure);
        figs.forEach(({ fig }) => {
          const u = fig.uniforms;
          u.uOpacity.value = opac; u.uGain.value = gain; u.uSat.value = U.sat.value;
          u.uRimI.value = (o.rimI != null ? o.rimI : 1.0) * (0.85 + A.level * 0.5 + A.pulse * 0.5); u.uAuraI.value = 0.5 + A.level * 0.5 + A.pulse * 0.3; u.uHeart.value = A.level;
          fig.update(tt, b, A.level, reduced);
        });
        if (figs.length) { const h0 = figs[0].fig.heart; heartSp.position.set(h0.x * sc, h0.y * sc, h0.z * sc + 0.1); }
        heartSp.material.opacity = (0.07 + A.level * 0.1 + A.pulse * 0.08) * opac;
        pool.material.opacity = 0.32 * opac * (0.8 + A.level * 0.4); sh.material.opacity = 0.7 * opac;
        const lot = spec.figs[0].pose === "lotus"; pool.visible = !lot; sh.visible = !lot;
      },
      dispose() { disposed = true; figs.forEach(({ fig }) => fig.dispose()); }
    };
  }
  function people(list) {
    const arr = list.filter((x) => x && (quality > 0 || !x.secondary)).map((x) => { const p = makePerson(x.id, x); p.group.position.set(x.x || 0, x.y != null ? x.y : heightAt(x.x || 0, x.z || 0) + (x.id === "reveur-meditate" ? 0.02 : 0), x.z || 0); return p; });
    return { list: arr, update(T, dt, A) { arr.forEach((p) => p.update(T, dt, A)); }, dispose() { arr.forEach((p) => p.dispose()); } };
  }

  /* ———————— fleurs naturelles (pétales physiques, éclosion) ———————— */
  const petalGeo = (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(0.09, 0.05, 0.1, 0.2, 0, 0.3); s.bezierCurveTo(-0.1, 0.2, -0.09, 0.05, 0, 0); const g = new THREE.ShapeGeometry(s, 6); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, -y * y * 0.6); } g.computeVertexNormals(); return g; })();
  const stemMat = satPatch(new THREE.MeshStandardMaterial({ color: "#3d5a24", roughness: 0.8 }));
  function makeFlower(color, s = 1, glowAmt = 0.25) {
    const g = new THREE.Group(), H = 0.45 * s;
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(rand(-0.06, 0.06), H * 0.5, rand(-0.06, 0.06)), new THREE.Vector3(rand(-0.05, 0.05), H, 0));
    const stem = new THREE.Mesh(new THREE.TubeGeometry(curve, 6, 0.012 * s, 5), stemMat); stem.castShadow = true; g.add(stem);
    const head = new THREE.Group(); head.position.copy(curve.getPoint(1)); g.add(head);
    const mat = satPatch(new THREE.MeshPhysicalMaterial({ color: C(color), roughness: 0.55, sheen: 1, sheenColor: C(color), side: THREE.DoubleSide, emissive: C(color), emissiveIntensity: glowAmt }));
    const petals = [], np = 6 + (rnd() * 3 | 0);
    for (let i = 0; i < np; i++) { const pv = new THREE.Group(); pv.rotation.y = (i / np) * Math.PI * 2; const m = new THREE.Mesh(petalGeo, mat); m.scale.setScalar(s); pv.add(m); head.add(pv); petals.push(m); }
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.035 * s, 10, 8), new THREE.MeshStandardMaterial({ color: "#e8b440", emissive: "#a86a10", emissiveIntensity: 0.6, roughness: 0.6 })); head.add(core);
    let open = 0;
    const setOpen = (o) => { open = o; petals.forEach((m) => { m.rotation.x = -(0.15 + (1 - o) * 1.3); }); head.scale.setScalar(0.3 + o * 0.7); };
    setOpen(1);
    return { group: g, setOpen, get open() { return open; } };
  }
  const FLOWER_COLS = ["#f4f1ea", "#f6d36b", "#e9a3b8", "#b7a6e8", "#f2a25c", "#ffffff"];

  /* ———————— composition, bloom ———————— */
  let composer = null, bloom = null;
  function setupComposer() {
    if (quality < 1) { composer = null; return; }
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(sc, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.55, 0.85);
    composer.addPass(bloom); composer.addPass(new OutputPass());
  }
  setupComposer();
  function applyQuality() {
    renderer.shadowMap.enabled = quality > 0;
    sun.castShadow = quality > 0; sun.shadow.mapSize.set(quality > 1 ? 2048 : 1024, quality > 1 ? 2048 : 1024);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr()));
    sc.traverse((o) => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.needsUpdate = true; if (m.uniforms && m.uniforms.uPx) m.uniforms.uPx.value = renderer.getPixelRatio(); }); });
    if (quality < 1 && composer) { composer.dispose && composer.dispose(); composer = null; }
    waterQuality(); resize();
  }

  /* ———————— le jardin : couches par visite (rien ne fane, rien ne tombe) ———————— */
  const gardenUpd = [];
  const mixers = [];
  if (garden) buildGarden();
  function buildGarden() {
    const G = new THREE.Group(); envGroup.add(G);
    // 1 — prairie : fleurs sauvages discrètes dans l'herbe
    {
      const n = [140, 260, 380][quality], cols = ["#f4f1ea", "#f6d36b", "#c9b6ff"];
      const head = new THREE.SphereGeometry(0.04, 8, 6), mats = cols.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, emissive: c, emissiveIntensity: 0.15 }));
      cols.forEach((c, ci) => {
        const im = new THREE.InstancedMesh(head, mats[ci], n / 3 | 0), d = new THREE.Object3D(); let k = 0;
        for (let t = 0; t < n && k < im.count; t++) { const a = rand(0, 6.28), r = rand(2, 24), x = Math.cos(a) * r, z = Math.sin(a) * r, h = heightAt(x, z); if (h < -0.3) continue; d.position.set(x, h + rand(0.2, 0.4), z); d.scale.setScalar(rand(0.6, 1.2)); d.updateMatrix(); im.setMatrixAt(k++, d.matrix); }
        im.count = k; G.add(im);
      });
    }
    // 2 — animaux paisibles : deux renards (glTF CC0/CC-BY) et des oiseaux qui planent
    if (level >= 2) {
      new GLTFLoader().load(FOX_URL, (gl) => {
        const base = gl.scene; const box = new THREE.Box3().setFromObject(base), size = box.getSize(new THREE.Vector3());
        const sc0 = 0.9 / Math.max(size.x, size.z);
        [{ r: 6.5, sp: 0.07, ph: 0, walk: true }, { r: 9.5, sp: 0, ph: 2.4, walk: false }].forEach((f) => {
          const fox = SkU.clone(base); fox.scale.setScalar(sc0);
          fox.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material) o.material.roughness = 0.9; } });
          G.add(fox);
          const mx = new THREE.AnimationMixer(fox); mixers.push(mx);
          const clip = gl.animations.find((a) => a.name === (f.walk ? "Walk" : "Survey")) || gl.animations[0];
          if (clip) mx.clipAction(clip).play();
          gardenUpd.push((T) => {
            const a = f.ph + T * f.sp, x = Math.cos(a) * f.r, z = Math.sin(a) * f.r;
            fox.position.set(x, heightAt(x, z), z);
            fox.rotation.y = f.walk ? -a + Math.PI : f.ph + Math.PI * 0.8;
          });
        });
      }, undefined, () => {});
      const bm = new THREE.MeshStandardMaterial({ color: "#2a2622", roughness: 0.9, side: THREE.DoubleSide });
      const wingG = new THREE.BufferGeometry(); wingG.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0.12, 0, 0, -0.12, 0.7, 0.02, -0.22], 3)); wingG.computeVertexNormals();
      for (let i = 0; i < 7; i++) {
        const b = new THREE.Group(), body = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.3, 2, 6), bm); body.rotation.x = Math.PI / 2; b.add(body);
        const wl = new THREE.Mesh(wingG, bm), wr = new THREE.Mesh(wingG, bm); wr.scale.x = -1; b.add(wl, wr); G.add(b);
        const r = rand(14, 24), hgt = rand(11, 17), ph = rand(0, 6.28), sp = rand(0.04, 0.07);
        gardenUpd.push((T) => { const a = ph + T * sp; b.position.set(Math.cos(a) * r, hgt + Math.sin(T * 0.3 + ph) * 0.6, Math.sin(a) * r); b.rotation.y = -a; b.rotation.z = 0.25; const f = Math.sin(T * 1.2 + ph) > 0.6 ? Math.sin(T * 9 + ph) * 0.5 : 0.08; wl.rotation.z = f; wr.rotation.z = -f; });
      }
    }
    // 3 — arbres majestueux
    if (level >= 3) {
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * 6.28 + rand(-0.2, 0.2), r = rand(12, 18), x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (riverOn && Math.abs(z - riverZ(x)) < 4.5) continue;
        trees.push(plant(makeBroadleaf(rand(1.5, 2.1), rand(-0.03, 0.04)), x, z));
      }
    }
    // 5 — fleurs éternelles (toujours ouvertes)
    if (level >= 5) {
      const n = [40, 80, 120][quality];
      for (let i = 0; i < n; i++) {
        const a = rand(0, 6.28), r = rand(2.5, 13), x = Math.cos(a) * r, z = Math.sin(a) * r, h = heightAt(x, z);
        if (h < -0.25) continue;
        const f = makeFlower(FLOWER_COLS[i % FLOWER_COLS.length], rand(0.8, 1.3), 0.3); f.group.position.set(x, h, z); f.group.rotation.y = rand(0, 6.28); G.add(f.group);
      }
    }
    // 6 — papillons de lumière
    if (level >= 6) {
      const wm = new THREE.MeshStandardMaterial({ map: wingTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.7, emissive: "#ffcf7a", emissiveMap: wingTex, emissiveIntensity: 0.55 });
      const wg = new THREE.PlaneGeometry(0.28, 0.28); wg.translate(0.14, 0, 0);
      for (let i = 0; i < 12; i++) {
        const b = new THREE.Group(), l = new THREE.Mesh(wg, wm), r = new THREE.Mesh(wg, wm); r.scale.x = -1; b.add(l, r); G.add(b);
        const ph = rand(0, 100), cx = rand(-8, 8), cz = rand(-8, 8);
        gardenUpd.push((T) => {
          const t = T * 0.25 + ph, x = cx + Math.sin(t * 0.7) * 3 + Math.sin(t * 1.9) * 0.6, z = cz + Math.cos(t * 0.5) * 3;
          b.position.set(x, heightAt(x, z) + 0.8 + Math.sin(t * 2.3) * 0.25, z);
          b.rotation.y = Math.atan2(Math.cos(t * 0.7) * 2.1, -Math.sin(t * 0.5) * 1.5);
          const f = Math.sin(T * 11 + ph) * 0.9; l.rotation.y = f + 0.3; r.rotation.y = -f - 0.3; l.rotation.x = r.rotation.x = -Math.PI / 2.4;
        });
      }
    }
    // 7 — arc-en-ciel (dispersion spectrale douce, toujours présent)
    if (level >= 7) {
      const m = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide,
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
        fragmentShader: `varying vec2 vUv; vec3 spec(float x){ return clamp(vec3(abs(x*6.-3.)-1., 2.-abs(x*6.-2.), 2.-abs(x*6.-4.)), 0., 1.); }
          void main(){ float r = vUv.y; vec3 c = spec(1. - r) ; float a = smoothstep(0.,0.15,r) * smoothstep(1.,0.85,r) * 0.32 * smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x);
          gl_FragColor = vec4(c * a, 1.); }`
      });
      const R0 = 60, R1 = 66, segs = 96, pos = [], uv = [], idx = [];
      for (let i = 0; i <= segs; i++) { const a = Math.PI * i / segs; for (let j = 0; j < 2; j++) { const rr = j ? R1 : R0; pos.push(Math.cos(a) * rr, Math.sin(a) * rr, 0); uv.push(i / segs, j); } if (i < segs) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
      const bow = new THREE.Mesh(g, m); bow.position.set(10, -8, -95); bow.rotation.y = 0.15; G.add(bow);
    }
  }

  /* ———————— thèmes (interprétations réalistes) ———————— */
  const BUILD = {};
  const ctxEnv = (o) => { if (garden) return; ground.visible = o.ground !== false; envGroup.visible = o.ground !== false; };
  BUILD.lumiere = (P) => {
    ctxEnv({}); const g = new THREE.Group();
    const ppl = people([
      { id: "lumiere-flower", x: 0.5, z: 0.4, rim: P.warm, aura: P.accent },
      { id: "lumiere-dancer2", x: -1.3, z: -0.9, rim: P.warm, aura: P.accent, offset: 0.4, secondary: true }
    ]); ppl.list.forEach((p) => g.add(p.group));
    const motes = makeMotes([60, 120, 180][quality], P.warm, 12); g.add(motes);
    return { group: g, people: ppl, camera: { r: 4.0, y: 0.9, target: [-0.2, 0.95, 0] }, update(T, dt, A, R) {
      ppl.update(T, dt, A); motes.material.uniforms.uLevel.value = A.level;
    } };
  };
  BUILD.reveur = (P) => {
    ctxEnv({ ground: false }); const g = new THREE.Group();
    const cloudMat = (c, o) => new THREE.SpriteMaterial({ map: cloudTex, color: C(c), transparent: true, opacity: o, depthWrite: false });
    const n = garden ? 26 : [70, 120, 170][quality], spread = garden ? 3.5 : 26, clouds = [];
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(cloudMat(i % 3 ? "#c9d2ee" : "#9aa6d6", 0.6 + rnd() * 0.3)), a = rand(0, 6.28), r = Math.sqrt(rnd()) * spread;
      s.position.set(Math.cos(a) * r, (garden ? 0.6 : -0.4) + rand(-0.3, 0.4), Math.sin(a) * r); s.scale.setScalar(rand(3, 7) * (garden ? 0.5 : 1)); g.add(s); clouds.push(s);
    }
    const ppl = people([{ id: "reveur-meditate", x: 0, y: garden ? 0.9 : 0.35, z: 0, rim: P.cool, aura: P.accent, tint: "#dfe6ff", gain: 1.15 }]); ppl.list.forEach((p) => g.add(p.group));
    const moon = glow("#dfe6ff", 30, 0.5); moon.position.copy(nightU.moonDir.value).multiplyScalar(300); g.add(moon);
    const dreams = []; for (let i = 0; i < 14; i++) { const d = glow(P.accent, 0.5, 0.9); g.add(d); dreams.push({ s: d, ph: i / 14 }); }
    return { group: g, people: ppl, camera: { r: 3.8, y: 1.4, target: [0, 0.8, 0] }, update(T, dt, A, R) {
      ppl.update(T, dt, { level: A.level * 0.6, pulse: A.pulse * 0.4 });
      ppl.list[0].group.position.y = (garden ? 0.9 : 0.35) + Math.sin(T * 0.4) * 0.05 * R;
      clouds.forEach((c, i) => { c.position.x += Math.sin(T * 0.05 + i) * 0.0015 * R; });
      dreams.forEach((d) => { const k = (d.ph + T * 0.03 * R) % 1; d.s.position.set(Math.sin(d.ph * 40) * (0.4 + k * 3), 1.2 + k * 7, Math.cos(d.ph * 40) * (0.4 + k * 3)); d.s.scale.setScalar(0.25 + A.level * 0.5 + Math.sin(T + d.ph * 9) * 0.05); d.s.material.opacity = garden ? 0.8 : 0.9 * Math.sin(k * Math.PI); });
    } };
  };
  BUILD.oui = (P) => {
    ctxEnv({}); const g = new THREE.Group();
    const plantG = new THREE.Group(); g.add(plantG);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.05, 0.5, 0), new THREE.Vector3(-0.04, 1.0, 0.02), new THREE.Vector3(0.02, 1.4, 0.05)]);
    plantG.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.025, 7), stemMat));
    const leafS = new THREE.Shape(); leafS.moveTo(0, 0); leafS.quadraticCurveTo(0.12, 0.2, 0, 0.5); leafS.quadraticCurveTo(-0.12, 0.2, 0, 0);
    const leafM = satPatch(new THREE.MeshStandardMaterial({ color: "#4f7a2e", roughness: 0.7, side: THREE.DoubleSide }));
    [[0.35, 0.9], [0.6, -1.1], [0.85, 2.4]].forEach(([h, a]) => { const l = new THREE.Mesh(new THREE.ShapeGeometry(leafS, 8), leafM); l.position.copy(curve.getPoint(h * 0.7)); l.rotation.set(-0.9, a, 0); plantG.add(l); });
    const bud = new THREE.Group(); bud.position.copy(curve.getPoint(1)); plantG.add(bud);
    const star = makeFlower(P.accent, 2.2, 1.6); star.group.children[0].visible = false; star.group.position.y = -0.98; bud.add(star.group);
    const gl = glow(P.warm, 1.6, 0.7); bud.add(gl);
    const pl = new THREE.PointLight(C(P.warm), 2, 6, 2); bud.add(pl);
    const motes = makeMotes([50, 90, 130][quality], P.accent, 8); g.add(motes);
    plantG.position.set(1.25, 0, 0.5); plantG.scale.setScalar(0.85);
    const ppl = people([
      { id: "oui-hug", x: -0.35, z: 0, rim: P.warm, aura: P.accent },
      { id: "oui-arms", x: -1.7, z: -1.1, rim: P.warm, aura: P.accent, secondary: true, offset: 0.3 }
    ]); ppl.list.forEach((p) => g.add(p.group));
    let nod = 0;
    return { group: g, people: ppl, camera: { r: 3.9, y: 0.9, target: [-0.4, 0.75, 0] }, update(T, dt, A, R) {
      ppl.update(T, dt, A);
      if (A.beat) nod = 1; nod *= 0.93;
      plantG.rotation.x = (Math.sin(T * 0.6) * 0.04 + nod * 0.22) * R; plantG.rotation.z = Math.sin(T * 0.45) * 0.05 * R;
      gl.material.opacity = 0.4 + A.level * 0.5; pl.intensity = 1.5 + A.level * 4;
      if (!garden) U.sat.value = 0.25 + 0.75 * Math.max(A.progress || 0, Math.min(1, T / 120));
    } };
  };
  BUILD.particule = (P) => {
    ctxEnv({ ground: false }); const g = new THREE.Group();
    const n = [5000, 11000, 18000][quality], pos = new Float32Array(n * 3), sd = new Float32Array(n), col = new Float32Array(n * 3);
    const cw = C(P.warm), cc = C(P.cool), cA = C(P.accent), t = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const arm = i % 3, r = Math.pow(rnd(), 1.6) * 9 + 0.2, a = arm * 2.094 + r * 0.55 + rand(-0.35, 0.35) / (0.4 + r * 0.1);
      pos[i * 3] = Math.cos(a) * r + rand(-0.3, 0.3); pos[i * 3 + 1] = rand(-0.25, 0.25) * (1.2 - r / 10); pos[i * 3 + 2] = Math.sin(a) * r + rand(-0.3, 0.3);
      sd[i] = rnd(); t.copy(cA).lerp(r < 2 ? cw : cc, Math.min(1, r / 6)); col[i * 3] = t.r; col[i * 3 + 1] = t.g; col[i * 3 + 2] = t.b;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("aS", new THREE.BufferAttribute(sd, 1)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const u = { uTime: U.time, uAwake: { value: 0.05 }, uPx: { value: renderer.getPixelRatio() }, uLevel: { value: 0.3 } };
    const gal = new THREE.Points(geo, new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      vertexShader: `attribute float aS; uniform float uTime; uniform float uAwake; uniform float uPx; varying vec3 vC; varying float vA;
        void main(){ vC = color; vA = aS < uAwake ? 1.0 : 0.07; vA *= 0.7 + 0.3 * sin(uTime * 2. + aS * 60.);
          vec4 mv = modelViewMatrix * vec4(position, 1.); gl_PointSize = (aS < uAwake ? 22. : 12.) * (0.5 + aS) * uPx / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uLevel; varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord-.5); float a = smoothstep(.5,0.,d); gl_FragColor = vec4(vC * a * a * vA * (1.4 + uLevel * 1.5), 1.); }` }));
    gal.frustumCulled = false; g.add(gal);
    const core = glow(P.accent, 3, 0.6); g.add(core);
    const spark = glow("#ffffff", 0.9, 1); g.add(spark);
    const sl = new THREE.PointLight(C(P.accent), 3, 12, 2); spark.add(sl);
    if (garden) { g.scale.setScalar(0.35); g.position.y = 5.5; g.rotation.x = 0.35; }
    const watcher = makePerson("particule-reach", { rim: P.accent, aura: P.cool, height: garden ? 1.25 : 2.1, tint: "#e8eeff" });
    (garden ? sc : g).add(watcher.group); if (garden) watcher.dispose2 = () => sc.remove(watcher.group);
    return { group: g, camera: { r: garden ? 9 : 14, y: garden ? 3 : 6, target: [0, garden ? 2.5 : 0, 0] }, update(T, dt, A, R) {
      gal.rotation.y += dt * 0.03 * R; u.uLevel.value = A.level;
      u.uAwake.value = garden ? 1 : Math.min(1, 0.04 + 0.96 * Math.max(A.progress || 0, Math.min(1, T / 150)));
      const a = T * 0.25 * R; spark.position.set(Math.cos(a) * 3.5, Math.sin(T * 0.4) * 0.5, Math.sin(a) * 3.5); spark.scale.setScalar(0.7 + A.pulse * 0.8);
      core.material.opacity = 0.4 + A.level * 0.4;
      // la personne regarde la galaxie : toujours entre la caméra et le centre
      const dx = camera.position.x - cam.target.x, dz = camera.position.z - cam.target.z, dl = Math.hypot(dx, dz) || 1, k = garden ? 0.45 : 0.62;
      watcher.group.position.set(cam.target.x + dx / dl * dl * k, garden ? heightAt(cam.target.x + dx / dl * dl * k, cam.target.z + dz / dl * dl * k) - 0.1 : -0.75, cam.target.z + dz / dl * dl * k);
      watcher.update(T, dt, A);
    }, dispose() { watcher.dispose(); if (watcher.dispose2) watcher.dispose2(); } };
  };
  BUILD.coeur = (P) => {
    ctxEnv({}); const g = new THREE.Group();
    const ppl = people([{ id: "coeur-couple", x: 0, z: 0, rim: P.warm, aura: P.accent }]); ppl.list.forEach((p) => g.add(p.group));
    const trailN = 160, trail = new Float32Array(trailN * 3), tg = new THREE.BufferGeometry(); tg.setAttribute("position", new THREE.BufferAttribute(trail, 3));
    const tm = new THREE.PointsMaterial({ map: glowTex, color: C(P.warm).multiplyScalar(1.5), size: 0.12, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const tp = new THREE.Points(tg, tm); tp.frustumCulled = false; g.add(tp);
    const heart = (t) => new THREE.Vector3(16 * Math.pow(Math.sin(t), 3) / 16 * 1.6, 0, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16 * 1.6);
    let k = 0;
    return { group: g, people: ppl, camera: { r: 4.0, y: 1.0, target: [0, 0.95, 0] }, update(T, dt, A, R) {
      ppl.update(T, dt, A);
      const t = T * 0.18 * R; const pa = heart(t);
      const i = k++ % trailN; trail[i * 3] = pa.x * 1.25; trail[i * 3 + 1] = 0.25 + (i % 7) * 0.02; trail[i * 3 + 2] = pa.z * 1.25; tg.attributes.position.needsUpdate = true;
    } };
  };
  BUILD.souffle = (P) => {
    ctxEnv({}); const g = new THREE.Group();
    const ppl = people([
      { id: "souffle-man2", x: 0, z: 0, rim: P.warm, aura: P.accent },
      { id: "souffle-man", x: -1.6, z: -1.3, rim: P.warm, aura: P.accent, secondary: true, offset: 0.5 }
    ]); ppl.list.forEach((p) => g.add(p.group)); const breather = ppl.list[0];
    const flowers = [];
    const handP = new THREE.Vector3(), hand = glow(P.warm, 0.8, 0.9); g.add(hand);
    const n = [120, 240, 360][quality], bp = new Float32Array(n * 3), bs = new Float32Array(n); for (let i = 0; i < n; i++) bs[i] = rnd();
    const bg = new THREE.BufferGeometry(); bg.setAttribute("position", new THREE.BufferAttribute(bp, 3));
    const breath = new THREE.Points(bg, new THREE.PointsMaterial({ map: glowTex, color: C(P.warm).multiplyScalar(1.2), size: 0.06, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    breath.frustumCulled = false; g.add(breath);
    let spot = new THREE.Vector3(1.2, 0, 0.4), next = 0;
    return { group: g, people: ppl, camera: { r: 4.0, y: 0.9, target: [-0.3, 0.9, 0] }, update(T, dt, A, R) {
      ppl.update(T, dt, A);
      if (T > next) {
        next = T + (isReduced() ? 9 : 6); const a = rand(-1.2, 1.2), r = rand(0.9, 1.9);
        spot = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
        if (flowers.length < 26) { const f = makeFlower(FLOWER_COLS[flowers.length % FLOWER_COLS.length], rand(0.9, 1.3), 0.35); f.group.position.set(spot.x, heightAt(spot.x, spot.z), spot.z); f.setOpen(0); g.add(f.group); flowers.push({ f, t0: T }); }
      }
      handP.lerp(new THREE.Vector3(spot.x, 0.55, spot.z), Math.min(1, dt * 0.8)); hand.position.copy(handP); hand.material.opacity = 0.6 + A.level * 0.4;
      flowers.forEach((o) => o.f.setOpen(Math.min(1, (T - o.t0) / 5)));
      const mouth = new THREE.Vector3(0, breather.H * 0.9, 0.1).add(breather.group.position);
      for (let i = 0; i < n; i++) { const k = (bs[i] + T * 0.12 * R) % 1, w = Math.sin(k * Math.PI) * 0.35; bp[i * 3] = mouth.x + (handP.x - mouth.x) * k + Math.sin(bs[i] * 40 + T) * w * 0.3; bp[i * 3 + 1] = mouth.y + (handP.y - mouth.y) * k + w; bp[i * 3 + 2] = mouth.z + (handP.z - mouth.z) * k + Math.cos(bs[i] * 30 + T) * w * 0.3; }
      bg.attributes.position.needsUpdate = true;
    } };
  };
  BUILD.creation = (P) => {
    ctxEnv({}); const g = new THREE.Group();
    const ppl = people([{ id: "creation-dancer", x: -1.5, z: 0.7, rim: P.warm, aura: P.accent }]); ppl.list.forEach((p) => g.add(p.group));
    const N = 26, stones = [], geo = new THREE.BoxGeometry(0.42, 0.26, 0.3, 2, 2, 2);
    displace(geo, 0.025, 6);
    for (let i = 0; i < N; i++) {
      const m = new THREE.MeshPhysicalMaterial({ color: C(P.warm).lerp(C("#d8cbb4"), 0.5), roughness: 0.35, clearcoat: 0.4, emissive: C(i % 4 ? P.warm : P.cool), emissiveIntensity: 0 });
      const s = new THREE.Mesh(geo, m); const a = i * 0.9, r = 0.32; s.position.set(0.6 + Math.cos(a) * r, 0.14 + i * 0.25, Math.sin(a) * r); s.rotation.y = a; s.scale.setScalar(0.001); s.castShadow = true; g.add(s); stones.push(s);
    }
    let built = 0;
    return { group: g, people: ppl, camera: { r: 5.6, y: 1.8, target: [-0.5, 1.4, 0.2] }, update(T, dt, A, R) {
      ppl.update(T, dt, A);
      const want = Math.min(N, 2 + Math.floor(Math.max(A.progress || 0, Math.min(1, T / 120)) * N));
      if (A.beat && built < want) built++; if (built < want && Math.random() < dt * 0.4) built++;
      stones.forEach((s, i) => { const on = i < built; const tgt = on ? 1 : 0.001; s.scale.setScalar(s.scale.x + (tgt - s.scale.x) * Math.min(1, dt * 1.5)); s.material.emissiveIntensity = on ? 0.5 + A.level * 0.8 + (i === built - 1 ? A.pulse : 0) : 0; });
    } };
  };
  BUILD.regeneration = (P) => {
    ctxEnv({}); const g = new THREE.Group();
    const tree = makeBroadleaf(1.1, 0.02); g.add(tree);
    const seedL = glow(P.accent, 1.2, 0.9); seedL.position.y = 0.15; g.add(seedL);
    const pl = new THREE.PointLight(C(P.accent), 3, 6, 2); pl.position.y = 0.3; g.add(pl);
    const sprouts = []; for (let i = 0; i < 40; i++) { const f = makeFlower(i % 3 ? "#cfe3a0" : FLOWER_COLS[i % 6], rand(0.5, 0.9), 0.2); const a = rand(0, 6.28), r = 0.8 + Math.sqrt(i / 40) * 3.5; f.group.position.set(Math.cos(a) * r, heightAt(Math.cos(a) * r, Math.sin(a) * r), Math.sin(a) * r); f.group.scale.setScalar(0.001); g.add(f.group); sprouts.push({ f, k: i / 40 }); }
    const motes = makeMotes([40, 80, 120][quality], P.accent, 6, 4); g.add(motes);
    const ppl = people([{ id: "regen-stretch", x: 1.9, z: 1.2, rim: P.warm, aura: P.accent }]); ppl.list.forEach((p) => g.add(p.group));
    return { group: g, people: ppl, camera: { r: 5.4, y: 1.7, target: [0.9, 1.3, 0.4] }, update(T, dt, A, R) {
      ppl.update(T, dt, A);
      const grow = Math.max(A.progress || 0, Math.min(1, T / 90)) * 0.85 + 0.15;
      tree.scale.setScalar(grow); if (tree.userData.sway) tree.userData.sway.rotation.z = Math.sin(T * 0.6) * 0.015 * R;
      sprouts.forEach((s) => { const v = Math.max(0.001, Math.min(1, (grow - s.k * 0.85) * 4)); s.f.group.scale.setScalar(v); });
      seedL.material.opacity = 0.5 + A.level * 0.5; pl.intensity = 2 + A.level * 4 + A.pulse * 2;
    } };
  };
  BUILD.jeu = (P) => {
    ctxEnv({}); const g = new THREE.Group();
    const orb = new THREE.Group(); g.add(orb);
    orb.add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 16), new THREE.MeshBasicMaterial({ color: C(P.accent).multiplyScalar(5), fog: false })));
    orb.add(glow(P.warm, 1.6, 0.8)); const ol = new THREE.PointLight(C(P.warm), 4, 8, 2); orb.add(ol);
    const ripples = []; if (!garden) for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({ color: C(P.accent), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); r.rotation.x = -Math.PI / 2; g.add(r); ripples.push({ m: r, t: -9 }); }
    const motes = makeMotes([50, 90, 130][quality], P.warm, 8); g.add(motes);
    const cx = garden ? 0 : LAKE.x, cz = garden ? riverZ(0) : LAKE.z, wy = garden ? -0.4 : LAKE.y;
    const kidsAt = garden ? [[-1.2, 3.2], [1.4, 3.6]] : [[LAKE.x * 0.35 + 0.6, LAKE.z * 0.35 + 1.2], [LAKE.x * 0.35 - 1.4, LAKE.z * 0.35 + 0.2]];
    const ppl = people([
      { id: "jeu-boy", x: kidsAt[0][0], z: kidsAt[0][1], rim: P.warm, aura: P.accent, height: garden ? 1.6 : undefined },
      { id: "jeu-girl", x: kidsAt[1][0], z: kidsAt[1][1], rim: P.warm, aura: P.accent, secondary: true, height: garden ? 1.5 : undefined }
    ]); ppl.list.forEach((p) => g.add(p.group));
    let lastHop = -1, ri = 0;
    return { group: g, people: ppl, camera: garden ? { r: 6, y: 1.6, target: [0.1, 0.7, 3.3] } : { r: 5.6, y: 1.1, target: [LAKE.x * 0.4, 0.7, LAKE.z * 0.4] }, update(T, dt, A, R) {
      ppl.update(T, dt, A);
      if (garden) { const a = T * 0.3 * R; orb.position.set(Math.sin(a) * 5, 0.5 + Math.sin(T * 0.9) * 0.15, riverZ(Math.sin(a) * 5) + Math.sin(a * 2) * 0.6); }
      else {
        const per = 1.6, k = (T / per), hop = Math.floor(k), f = k - hop, a = hop * 0.9 + f * 0.9;
        const r = 3.2 + Math.sin(hop * 1.7) * 1.2;
        orb.position.set(cx + Math.cos(a) * r, wy + 0.12 + Math.sin(f * Math.PI) * (0.7 + A.level * 0.6) * R, cz + Math.sin(a) * r);
        if (hop !== lastHop) { lastHop = hop; const rp = ripples[ri++ % ripples.length]; rp.t = T; rp.m.position.set(orb.position.x, wy + 0.02, orb.position.z); }
        ripples.forEach((rp) => { const e = T - rp.t; rp.m.scale.setScalar(0.1 + e * 0.9); rp.m.material.opacity = Math.max(0, 0.5 - e * 0.25); });
      }
      ol.intensity = 3 + A.level * 4 + A.pulse * 3;
    } };
  };

  /* ———————— gestion thèmes / caméra / rendu ———————— */
  const FALLBACK = { sky: ["#0d2a4a", "#e9a15a", "#3a2a3a"], sun: "#ffc27a", cool: "#7EB6D9", warm: "#F6C66A", accent: "#FDE68A", ground: "#2d5b6b", night: 0.35 };
  let active = null, activeId = null, T0 = performance.now();
  const cam = { az: 0.6, el: 0.14, r: 7, target: new THREE.Vector3(0, 1, 0), userAz: 0, userEl: 0, vel: 0, dragging: false };
  function disposeGroup(obj) { obj.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); }); }
  let aspect = 1;
  function build(id, def) {
    const P = Object.assign({}, FALLBACK, def || {});
    if (active) { if (active.people) active.people.dispose(); if (active.dispose) active.dispose(); sc.remove(active.group); disposeGroup(active.group); }
    U.sat.value = 1;
    applyPalette(P);
    active = (BUILD[id] || BUILD.lumiere)(P); activeId = id;
    if (garden && id !== "particule" && id !== "reveur") active.group.position.y = 0;
    sc.add(active.group);
    const c = active.camera;
    cam.r = c.r * (garden ? 1.35 : 1) * (aspect < 0.8 ? 1.3 : 1); cam.target.set(c.target[0], c.target[1], c.target[2]);
    T0 = performance.now();
  }
  const fadeEl = document.createElement("div"); fadeEl.className = "s3d-fade"; stage.appendChild(fadeEl);
  let fadeTimer = 0;
  function setTheme(id, def) {
    if (id === activeId && active) return;
    if (garden) { build(id, def); return; } // le jardin ne fond jamais au noir
    clearTimeout(fadeTimer);
    const ms = isReduced() ? 250 : 1100;
    fadeEl.style.transitionDuration = ms + "ms"; fadeEl.classList.add("is-on");
    fadeTimer = setTimeout(() => { build(id, def); requestAnimationFrame(() => fadeEl.classList.remove("is-on")); }, ms);
  }

  let lastX = 0, lastY = 0, pid = null;
  canvas.addEventListener("pointerdown", (e) => { pid = e.pointerId; lastX = e.clientX; lastY = e.clientY; cam.dragging = true; cam.vel = 0; try { canvas.setPointerCapture(pid); } catch (er) {} if (opts.dragHint) opts.dragHint.classList.add("is-gone"); });
  canvas.addEventListener("pointermove", (e) => {
    if (!cam.dragging || e.pointerId !== pid) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
    cam.userAz -= dx * 0.007; cam.vel = -dx * 0.007;
    if (e.pointerType === "mouse") cam.userEl = Math.max(-0.12, Math.min(0.5, cam.userEl + dy * 0.004));
  });
  const endDrag = () => { cam.dragging = false; pid = null; };
  canvas.addEventListener("pointerup", endDrag); canvas.addEventListener("pointercancel", endDrag);

  function resize() {
    const w = stage.clientWidth || 320, h = stage.clientHeight || 240; aspect = w / h;
    renderer.setSize(w, h, false); camera.aspect = aspect; camera.updateProjectionMatrix();
    if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); if (bloom) bloom.resolution.set(w / 2, h / 2); }
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage); else window.addEventListener("resize", resize);
  resize();

  let raf = 0, last = 0, visible = true, onScreen = true, fpsAcc = 0, fpsN = 0, fpsT = 0;
  const clockStart = performance.now();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    const R = isReduced() ? 0.35 : 1, A = opts.sampleLevel(now), T = (now - T0) / 1000, TG = (now - clockStart) / 1000;
    U.time.value = TG * R; U.wind.value = 0.6 + A.level * 0.6;
    if (!cam.dragging) { cam.userAz += cam.vel; cam.vel *= 0.92; }
    cam.az += dt * (isReduced() ? 0.008 : 0.025);
    const az = cam.az + cam.userAz + Math.sin(TG * 0.04) * 0.25 * R;
    const elv = Math.max(0.04, cam.el + cam.userEl + Math.sin(TG * 0.06) * 0.04 * R);
    const r = cam.r * (1 + Math.sin(TG * 0.05) * 0.04 * R);
    camera.position.set(cam.target.x + Math.sin(az) * Math.cos(elv) * r, cam.target.y + Math.sin(elv) * r + 0.4, cam.target.z + Math.cos(az) * Math.cos(elv) * r);
    const gh = heightAt(camera.position.x, camera.position.z) + 0.5; if (camera.position.y < gh) camera.position.y = gh;
    camera.lookAt(cam.target);
    if (active) active.update(T, dt, A, R);
    gardenUpd.forEach((fn) => fn(TG * R, dt * R));
    mixers.forEach((m) => m.update(dt * R));
    trees.forEach((t, i) => { if (t.userData.sway) t.userData.sway.rotation.z = Math.sin(TG * 0.5 + i) * 0.012 * R * U.wind.value; });
    waters.forEach((w) => { if (w.fancy.visible) w.fancy.material.uniforms.time.value += dt * 0.35 * R; });
    stars.rotation.y += dt * 0.003;
    if (composer) composer.render(); else renderer.render(sc, camera);
    // qualité adaptative : si l'image ralentit, on coupe bloom puis ombres
    if (fpsT === 0) fpsT = now;
    fpsAcc += dt; fpsN++;
    if (now - fpsT > 4000) { const fps = fpsN / Math.max(0.001, fpsAcc); fpsT = now; fpsAcc = 0; fpsN = 0; if (fps < 30 && quality > 0 && !opts.lockQuality && !new URLSearchParams(location.search).get("quality")) { quality--; applyQuality(); } }
  }
  function start() { if (!raf && visible && onScreen) { last = 0; raf = requestAnimationFrame(frame); liveVideos.forEach((v) => { const p = v.play(); if (p && p.catch) p.catch(() => {}); }); } }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; liveVideos.forEach((v) => { try { v.pause(); } catch (e) {} }); }
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; visible ? start() : stop(); });
  if (window.IntersectionObserver) new IntersectionObserver((ents) => { onScreen = ents[0].isIntersecting; onScreen ? start() : stop(); }).observe(stage);

  return { setTheme, build, start, stop, renderer, get quality() { return quality; }, get activeId() { return activeId; }, get active() { return active; }, sc, camera };
}
