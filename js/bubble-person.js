/* Eden Yours — êtres de lumière : un petit personnage dessiné (sans visage, sans sexe) dans une bulle lumineuse.
   Silhouette lisse faite de formes simples (tête ovoïde, torse, membres arrondis), éclairée de l'intérieur,
   posée dans une bulle translucide (paroi lumineuse, reflet, halo) qui flotte et respire — comme les premiers êtres de lumière.
   Les poses (souffle, étreinte, rêveur, danse, cœur, création, jeu…) sont calculées par code, sans capture ni modèle importé.
   Module partagé : eden-real.js (scene-3d, eden-jardin). */
import * as THREE from "three";

const V3 = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
const mir = (s, x, y, z) => V3(s * x, y, z);
const sn = Math.sin, cs = Math.cos;

/* ———— poses ———— */
/* Chaque pose renvoie des directions-cibles (espace de la figure : +y haut, +z devant, +x = gauche de la personne),
   un décalage du bassin (root) et des rotations du bassin. t : temps (rythme), b : souffle 0..1, v : niveau audio. */
const POSE = {
  stand(t, b, v) {
    const a = b;
    return { root: [0, 0.004 * b, 0], pel: [0, 0, 0], sp: [0.0, -0.04 * b + 0.02], neck: [0, 0.05 - 0.05 * b, 0],
      ua: (s) => mir(s, 0.5 + 0.38 * a, -0.85 + 1.12 * a, 0.12), la: (s) => mir(s, 0.42 + 0.45 * a, -0.7 + 1.05 * a, 0.32),
      th: (s) => mir(s, 0.05, -1, 0), ca: (s) => mir(s, 0.03, -1, -0.02) };
  },
  welcome(t, b, v) { // paumes ouvertes, accueillir
    const br = 0.5 + 0.5 * sn(t * 0.5);
    return { root: [0, 0.004 * br, 0], pel: [0, 0, 0], sp: [0, -0.03 * br], neck: [0, 0.04, 0],
      ua: (s) => mir(s, 0.55, -0.78, 0.25), la: (s) => mir(s, 0.52, -0.5, 0.62),
      th: (s) => mir(s, 0.06, -1, 0), ca: (s) => mir(s, 0.03, -1, -0.02) };
  },
  heart(t, b, v) { // mains sur le cœur
    const br = 0.5 + 0.5 * sn(t * 0.5);
    return { root: [0, 0.004 * br, 0], pel: [0, 0, 0], sp: [0, 0.02 - 0.03 * br], neck: [0, 0.1, 0],
      ua: (s) => mir(s, 0.12, -0.95, 0.28), la: (s) => mir(s, -0.7, 0.55, 0.5),
      th: (s) => mir(s, 0.04, -1, 0), ca: (s) => mir(s, 0.02, -1, -0.02) };
  },
  reach(t, b, v) {
    const p = 0.5 + 0.5 * sn(t * 0.6);
    return { root: [0, 0.01 * p, 0], pel: [0, 0.05 * sn(t * 0.3), 0], sp: [0.0, -0.1 - 0.05 * p], neck: [0, -0.35 - 0.1 * p, 0],
      ua: (s) => mir(s, 0.28 + 0.1 * p, 0.95, 0.15), la: (s) => mir(s, 0.1 + 0.06 * p, 1, 0.1 + 0.1 * p),
      th: (s) => mir(s, 0.05, -1, 0), ca: (s) => mir(s, 0.03, -1, -0.02) };
  },
  dance(t, b, v, ph = 0) {
    t += ph; const w = sn(t), lift = Math.max(0, sn(t)), lift2 = Math.max(0, -sn(t));
    return { root: [0.05 * w, -0.025 * Math.abs(cs(t)) - 0.01, 0], pel: [0.03, 0.28 * sn(t * 0.5), 0.07 * w], sp: [0.06 * w, 0.0], neck: [0.1 * w, 0.02, 0],
      ua: (s) => s > 0 ? V3(0.68, 0.55 + 0.3 * sn(t * 0.5 + 1), 0.15 * cs(t)) : V3(-0.55, -0.1 + 0.3 * sn(t + 1), 0.55),
      la: (s) => s > 0 ? V3(0.25 + 0.2 * sn(t), 1, 0.25 * sn(t)) : V3(-0.15, 0.35, 1),
      th: (s) => s > 0 ? V3(0.12, -1, 0.3 * lift) : V3(-0.12, -1, 0.3 * lift2), ca: (s) => s > 0 ? V3(0.03, -1, -0.55 * lift) : V3(-0.03, -1, -0.55 * lift2),
      ft: (s) => s > 0 ? V3(0.05, -0.4 - 0.5 * lift, 0.9) : V3(-0.05, -0.4 - 0.5 * lift2, 0.9) };
  },
  open(t, b, v) {
    const n = sn(t * 1.1), br = 0.5 + 0.5 * sn(t * 0.5);
    return { root: [0, 0.004 * br, 0], pel: [0, 0.05 * sn(t * 0.4), 0], sp: [0, -0.06 * br], neck: [0, 0.1 - 0.2 * Math.max(0, n) * 0 - 0.18 * (0.5 + 0.5 * n), 0],
      ua: (s) => mir(s, 1, 0.28 + 0.12 * br, 0.12), la: (s) => mir(s, 1, 0.32 + 0.12 * br, 0.2),
      th: (s) => mir(s, 0.07, -1, 0), ca: (s) => mir(s, 0.04, -1, -0.02) };
  },
  embrace(t, b, v) {
    const r = sn(t * 0.45);
    return { root: [0, 0.003, 0], pel: [0.02, 0.04 * r, 0.02 * r], sp: [0.18 * r, 0.04 + 0.02 * b], neck: [0.32 + 0.04 * r, 0, 0.12],
      ua: (s) => mir(s, -0.1, -0.25, 0.95), la: (s) => mir(s, -0.92, 0.12, 0.42),
      th: (s) => mir(s, 0.05, -1, 0.05), ca: (s) => mir(s, 0.03, -1, -0.03) };
  },
  waltz(t, b, v) {
    const w = sn(t * 0.8), k = Math.max(0, sn(t * 0.8)), k2 = Math.max(0, -sn(t * 0.8));
    return { root: [0.03 * w, -0.012 - 0.012 * Math.abs(cs(t * 0.8)), 0], pel: [0.03, 0.12 * sn(t * 0.4), 0.05 * w], sp: [0.05 * w, 0.04], neck: [0.08 * w, 0.06, 0],
      ua: (s) => mir(s, 0.38, -0.42, 0.82), la: (s) => mir(s, -0.28, 0.2, 0.95),
      th: (s) => s > 0 ? V3(0.08, -1, 0.14 * k) : V3(-0.08, -1, 0.14 * k2), ca: (s) => s > 0 ? V3(0.03, -1, -0.2 * k) : V3(-0.03, -1, -0.2 * k2) };
  },
  lotus(t, b, v) {
    const br = 0.5 + 0.5 * sn(t * 0.5);
    return { root: [0, -0.8 + 0.004 * br, 0.0], pel: [0.04, 0.03 * sn(t * 0.2), 0], sp: [0, 0.02 - 0.03 * br], neck: [0, 0.04, 0],
      ua: (s) => mir(s, 0.3, -0.75, 0.3), la: (s) => mir(s, 0.28, -0.8, 0.42),
      th: (s) => mir(s, 0.82, -0.12, 0.56), ca: (s) => mir(s, -0.96, -0.1, 0.02), ft: (s) => mir(s, -0.9, -0.1, 0.4) };
  },
  create(t, b, v) {
    const a = sn(t * 0.9), c = sn(t * 0.9 + 3.14), lunge = 0.5 + 0.5 * sn(t * 0.45);
    return { root: [0, -0.07 * lunge, 0], pel: [0.04, 0.4 * sn(t * 0.45), 0.05 * a], sp: [0.06 * a, -0.04 * lunge], neck: [0.05 * a, -0.2 * Math.max(0, a), 0],
      ua: (s) => s > 0 ? V3(0.4 + 0.2 * a, 0.5 + 0.5 * a, 0.2) : V3(-0.4 - 0.2 * c, 0.5 + 0.5 * c, 0.2),
      la: (s) => s > 0 ? V3(0.15, 1, 0.15 + 0.1 * a) : V3(-0.15, 1, 0.15 + 0.1 * c),
      th: (s) => s > 0 ? V3(0.2, -0.85, 0.32 * lunge) : V3(-0.2, -1, -0.1), ca: (s) => s > 0 ? V3(0.05, -1, -0.28 * lunge) : V3(-0.03, -1, -0.1) };
  },
  tree(t, b, v) {
    const br = 0.5 + 0.5 * sn(t * 0.5), sway = sn(t * 0.35) * 0.015;
    return { root: [0.075 + sway, 0.004 * br, 0], pel: [0, 0, -0.03], sp: [-0.03, 0], neck: [0, 0.04 - 0.1 * br, 0],
      ua: (s) => mir(s, 0.22, 0.97, 0.08), la: (s) => mir(s, -0.85 + 0.05 * br, 0.8, 0.0),
      th: (s) => s > 0 ? V3(0.04, -1, 0) : V3(-0.75, -0.55, 0.35), ca: (s) => s > 0 ? V3(0.02, -1, -0.02) : V3(0.97, -0.12, -0.22), ft: (s) => s > 0 ? V3(0.05, -0.4, 0.9) : V3(0.5, -0.5, 0.5) };
  },
  play(t, b, v, ph = 0) {
    t += ph; const h = Math.abs(sn(t * 1.6)), a = sn(t * 1.6), k = Math.max(0, a), k2 = Math.max(0, -a);
    return { root: [0, 0.07 * h, 0], pel: [0.03, 0.55 * sn(t * 0.8), 0.07 * a], sp: [0.05 * a, 0.0], neck: [0.12 * a, 0.0, 0],
      ua: (s) => s > 0 ? V3(0.85, 0.15 + 0.7 * a, 0.15) : V3(-0.85, 0.15 - 0.7 * a, 0.15),
      la: (s) => s > 0 ? V3(0.8, 0.5 + 0.5 * a, 0.3) : V3(-0.8, 0.5 - 0.5 * a, 0.3),
      th: (s) => s > 0 ? V3(0.1, -1, 0.65 * k) : V3(-0.1, -1, 0.65 * k2), ca: (s) => s > 0 ? V3(0.03, -1, -0.8 * k) : V3(-0.03, -1, -0.8 * k2),
      ft: (s) => V3(s * 0.05, -0.7, 0.7) };
  }
};

export const POSE_NAMES = Object.keys(POSE);

/* ———— matériaux ———— */
const figVS = `varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; vP = position; gl_Position = projectionMatrix * mv; }`;
const figFS = `uniform vec3 uCore; uniform vec3 uRim; uniform float uGain; uniform float uOpacity; uniform float uSat; uniform float uHeart; uniform vec3 uShift;
varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(vV);
  float ndv = clamp(dot(N, V), 0., 1.);
  float fres = pow(1. - ndv, 2.0);
  float wrap = clamp(dot(N, normalize(vec3(-0.4, 0.7, 0.6))) * 0.5 + 0.5, 0., 1.);
  vec3 col = mix(uCore * 0.74, uCore * 1.1, wrap) * (0.8 + 0.2 * pow(ndv, 0.8));
  col += uRim * fres * 0.7;
  col += uCore * uHeart * 0.35 * exp(-pow((vP.y - 1.2) / 0.3, 2.));
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722)); col = mix(vec3(l), col, uSat);
  col *= uGain;
  float a = uOpacity;
  gl_FragColor = vec4(col * a, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const bubbleFS = `uniform vec3 uTint; uniform vec3 uRim; uniform float uOpacity; uniform float uSat; uniform float uPulse; uniform float uGain; uniform float uTime;
varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(vV);
  float ndv = abs(dot(N, V));
  float fres = pow(1. - ndv, 2.6);
  // fine pellicule irisée (très légère) : teinte qui glisse avec l'angle
  vec3 irid = 0.5 + 0.5 * cos(6.2832 * (vec3(0.0, 0.33, 0.67) + ndv * 1.2 + uTime * 0.03));
  vec3 col = uTint * (0.09 + 0.18 * (1. - ndv)) + uRim * fres * (0.95 + uPulse * 0.5) + irid * fres * 0.18;
  vec3 L = normalize(vec3(-0.5, 0.7, 0.55));
  float spec = pow(max(dot(reflect(-L, N), V), 0.), 48.) * 0.85;
  col += vec3(1.0, 0.98, 0.94) * spec;
  col += uTint * 0.07 * pow(ndv, 3.);
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722)); col = mix(vec3(l), col, uSat);
  col *= uGain;
  float a = clamp(0.14 + fres * 0.75 + spec * 0.6, 0., 1.) * uOpacity;
  gl_FragColor = vec4(col * a, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/* Torse : profil lisse de révolution (section ronde : aucun trait sexué) */
function torsoGeo() {
  const pts = [[0.001, -0.02], [0.11, 0.0], [0.15, 0.07], [0.142, 0.17], [0.13, 0.26], [0.144, 0.36], [0.158, 0.44], [0.13, 0.5], [0.07, 0.545], [0.001, 0.56]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(pts, 20); g.computeVertexNormals(); return g;
}
const UP = new THREE.Vector3(0, 1, 0);
const tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3();

/* Crée un être de lumière dans sa bulle. o : { pose, ph, core, rim, aura, quality, speed, bubble:{cy,r} } */
export function createBubblePerson(o = {}) {
  const root = new THREE.Group();
  const u = {
    uCore: { value: (o.core || new THREE.Color("#fff3df")).clone() }, uRim: { value: (o.rim || new THREE.Color("#ffd79a")).clone() },
    uGain: { value: 1 }, uOpacity: { value: 0 }, uSat: { value: 1 }, uHeart: { value: 0 }, uShift: { value: new THREE.Vector3() },
    uTint: { value: (o.aura || o.rim || new THREE.Color("#ffd79a")).clone() }, uPulse: { value: 0 }, uTime: { value: 0 }
  };
  const figMat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: figVS, fragmentShader: figFS, transparent: true, depthWrite: true,
    premultipliedAlpha: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor });
  const bubMat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: figVS, fragmentShader: bubbleFS, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const geos = [];
  const mk = (g) => { geos.push(g); const m = new THREE.Mesh(g, figMat); m.frustumCulled = false; m.renderOrder = 2; root.add(m); return m; };
  const cap = (r, l) => mk(new THREE.CapsuleGeometry(r, l, 6, 14)); // l = longueur de la partie droite
  const ball = (r, sx = 1, sy = 1, sz = 1) => { const m = mk(new THREE.SphereGeometry(r, 18, 14)); m.scale.set(sx, sy, sz); return m; };
  const head = ball(0.118, 0.84, 1.12, 0.98), neck = cap(0.055, 0.06), torso = mk(torsoGeo());
  const L = { ua: 0.243, la: 0.25, th: 0.41, ca: 0.42 };
  const seg = {}; // [mesh, rayon, longueur]
  const lmb = (k, r0, len) => { seg[k] = { m: cap(r0, Math.max(0.01, len - 2 * r0)), len }; };
  ["l", "r"].forEach((n) => {
    lmb("ua_" + n, 0.056, L.ua); lmb("la_" + n, 0.046, L.la); lmb("th_" + n, 0.088, L.th); lmb("ca_" + n, 0.064, L.ca);
    seg["sh_" + n] = { m: ball(0.068) }; seg["hand_" + n] = { m: ball(0.052, 0.9, 1.25, 0.7) }; seg["foot_" + n] = { m: ball(0.06, 0.9, 0.6, 1.8) };
  });
  const pelvis = ball(0.14, 1.08, 0.78, 0.9);
  // bulle
  const bub = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), bubMat); bub.renderOrder = 3; bub.visible = !o.noBubble; bub.frustumCulled = false; root.add(bub);
  const bcfg = o.bubble || {};
  const bubC = new THREE.Vector3(bcfg.x || 0, bcfg.cy != null ? bcfg.cy : 0.9, bcfg.z || 0), bubR = bcfg.r || 1.08;
  const dirs = {}, heart = new THREE.Vector3();
  const poseFn0 = POSE[o.pose] || POSE.stand, ph = o.ph || 0;
  const aim = (m, a, b) => { // place m (capsule le long de Y) de a vers b
    tmpV.copy(b).sub(a); const len = tmpV.length() || 1e-4;
    m.position.copy(a).addScaledVector(tmpV, 0.5); m.quaternion.setFromUnitVectors(UP, tmpV.multiplyScalar(1 / len)); return len;
  };
  const eul = new THREE.Euler(), Rpel = new THREE.Quaternion(), Rsh = new THREE.Quaternion();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const api = {
    root, uniforms: u, heart, bubble: bub,
    update(T, b = 0.5, v = 0, frozen = false) {
      const t = frozen ? (o.still != null ? o.still : 1.2) : T * (o.speed || 1.5) + ph * 6.283;
      const P = (POSE[o.pose] || poseFn0)(t, b, v, ph * 6.283);
      P.sp = P.sp || [0, 0]; P.neck = P.neck || [0, 0, 0]; P.pel = P.pel || [0, 0, 0];
      eul.set(P.pel[0], P.pel[1], P.pel[2], "YXZ"); Rpel.setFromEuler(eul);
      const sx = P.sp[0], sz = P.sp[1];
      const pel = V(P.root[0], 0.899 + P.root[1], P.root[2]);
      const s1 = V(sx * 0.4, 1, sz * 0.4).normalize(), s2 = V(sx * 0.8, 1, sz * 0.8).normalize(), s3 = V(sx * 1.2, 1, sz * 1.2).normalize();
      const p1 = pel.clone().add(V(0, 0.084, 0).applyQuaternion(Rpel)), p2 = p1.clone().addScaledVector(s1, 0.067), p3 = p2.clone().addScaledVector(s2, 0.059);
      const nk = p3.clone().addScaledVector(s3, 0.332), nd = V(P.neck[0], 1, P.neck[1]).normalize(), hd = nk.clone().addScaledVector(nd, 0.093);
      // torse : de p1 (légèrement sous) jusqu'à la base du cou
      const tb = pel.clone().add(V(0, 0.03, 0).applyQuaternion(Rpel)); const tl = aim(torso, tb, nk); torso.position.copy(tb); torso.scale.set(1, tl / 0.545, 1);
      torso.quaternion.setFromUnitVectors(UP, tmpV.copy(nk).sub(tb).normalize());
      aim(neck, nk.clone().addScaledVector(nd, -0.02), nk.clone().addScaledVector(nd, 0.08));
      head.position.copy(nk).addScaledVector(nd, 0.14); head.quaternion.setFromUnitVectors(UP, nd);
      pelvis.position.copy(pel).add(V(0, -0.02, 0)); pelvis.quaternion.copy(Rpel);
      Rsh.setFromUnitVectors(UP, s3); tmpQ.setFromEuler(eul.set(0, P.pel[1] * 0.7, 0, "YXZ")); Rsh.premultiply(tmpQ);
      [["l", 1], ["r", -1]].forEach(([n, s]) => {
        const sh = p3.clone().add(V(s * 0.185, 0.23, 0.04).applyQuaternion(Rsh));
        const el = sh.clone().addScaledVector(P.ua(s), L.ua), wr = el.clone().addScaledVector(P.la(s), L.la);
        seg["sh_" + n].m.position.copy(sh);
        aim(seg["ua_" + n].m, sh, el); aim(seg["la_" + n].m, el, wr); seg["hand_" + n].m.position.copy(wr).addScaledVector(P.la(s), 0.05);
        seg["hand_" + n].m.quaternion.setFromUnitVectors(UP, P.la(s));
        const hp = pel.clone().add(V(s * 0.106, -0.005, -0.01).applyQuaternion(Rpel));
        const kn = hp.clone().addScaledVector(P.th(s), L.th), an = kn.clone().addScaledVector(P.ca(s), L.ca);
        aim(seg["th_" + n].m, hp, kn); aim(seg["ca_" + n].m, kn, an);
        const fd = P.ft ? P.ft(s) : V(s * 0.05, -0.4, 0.9).normalize();
        seg["foot_" + n].m.position.copy(an).addScaledVector(fd, 0.06).add(V(0, -0.025, 0));
        seg["foot_" + n].m.quaternion.setFromUnitVectors(V(0, 0, 1), V(fd.x, Math.min(0, fd.y) * 0.4, Math.max(0.2, fd.z)).normalize());
      });
      // bulle : centre suivant légèrement le corps, respire avec le souffle
      const k = 1 + 0.025 * Math.sin(T * 0.9 + ph * 6) + 0.02 * (b - 0.5) + 0.03 * v;
      bub.position.set(bubC.x + P.root[0] * 0.5, bubC.y + Math.sin(T * 0.7 + ph * 5) * 0.025 + P.root[1] * 0.5, bubC.z + P.root[2] * 0.5);
      bub.scale.setScalar(bubR * k);
      heart.set(0, p3.y + 0.2, 0.06);
      u.uTime.value = T;
    },
    dispose() { geos.forEach((g) => g.dispose()); figMat.dispose(); bubMat.dispose(); bub.geometry.dispose(); }
  };
  return api;
}
