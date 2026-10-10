/* Eden Yours — corps de lumière : figures humaines sans sexe (ni homme, ni femme).
   Maillage : « Human base mesh with editable 53-bone rig » (Innerscene, CC0 — base MakeHuman/MPFB CC0),
   modifié par nos soins hors-ligne : détails du torse et du bassin lissés, tête réduite à une forme ovoïde
   lisse (ni visage, ni cheveux, ni oreilles), proportions légèrement androgynes, maillage allégé.
   Aucune texture, aucun vêtement : le corps est rendu comme une silhouette de lumière translucide
   (Fresnel, cœur chaud, aura). Poses et mouvements : calculés par code (visée des os), pas de capture.
   Voir CREDITS.md. Module partagé : eden-real.js (scene-3d, eden-jardin) et tools de rendu des poses. */
import * as THREE from "three";

export const BODY_URL = new URL("../assets/lightbody/body.glb", import.meta.url).href;
export const BODY_V = "20261010n";

const V3 = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
const mir = (s, x, y, z) => V3(s * x, y, z);
const sn = Math.sin, cs = Math.cos;

/* ———— matériaux : corps de lumière ———— */
const SKIN_PARS = `#include <common>
#include <skinning_pars_vertex>
varying vec3 vN; varying vec3 vV; varying vec3 vObj;`;
const bodyVS = `${SKIN_PARS}
void main(){
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  vec4 mv = modelViewMatrix * vec4(transformed, 1.0);
  vN = normalize(transformedNormal); vV = -mv.xyz; vObj = position;
  gl_Position = projectionMatrix * mv;
}`;
const bodyFS = `uniform vec3 uCore; uniform vec3 uRim; uniform float uRimI; uniform float uGain; uniform float uOpacity; uniform float uSat;
uniform float uTime; uniform float uHeart; uniform float uBreath;
varying vec3 vN; varying vec3 vV; varying vec3 vObj;
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(vV);
  float ndv = clamp(dot(N, V), 0., 1.);
  float fres = pow(1. - ndv, 2.2);
  vec3 L = normalize(vec3(-0.45, 0.65, 0.62));
  float wrap = clamp(dot(N, L) * 0.5 + 0.5, 0., 1.);
  float hy = exp(-pow((vObj.y - 1.27) / 0.3, 2.));
  float flow = 0.5 + 0.5 * sin(vObj.y * 8. - uTime * 1.3 + vObj.x * 3. + sin(vObj.z * 5. + uTime * 0.4) * 1.2);
  vec3 base = mix(uCore * 0.5, uCore * 1.0, wrap);
  vec3 col = base * (0.6 + 0.4 * pow(ndv, 0.9));
  col += uCore * hy * (0.28 + 0.5 * uHeart + 0.18 * uBreath);
  col += uRim * fres * uRimI;
  col += uRim * 0.07 * flow * (1. - fres);
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722)); col = mix(vec3(l), col, uSat);
  col *= uGain;
  float a = clamp(0.58 + 0.42 * fres + 0.12 * hy, 0., 1.) * uOpacity;
  gl_FragColor = vec4(col * a, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const auraVS = `${SKIN_PARS}
uniform float uInflate;
void main(){
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  vec3 transformed = vec3(position) + normalize(objectNormal) * uInflate;
  #include <skinning_vertex>
  vec4 mv = modelViewMatrix * vec4(transformed, 1.0);
  vN = normalize(transformedNormal); vV = -mv.xyz; vObj = position;
  gl_Position = projectionMatrix * mv;
}`;
const auraFS = `uniform vec3 uAura; uniform float uAuraI; uniform float uOpacity; uniform float uSat;
varying vec3 vN; varying vec3 vV; varying vec3 vObj;
void main(){
  float d = abs(dot(normalize(vN), normalize(vV)));
  float g = pow(d, 1.6) * (0.55 + 0.45 * smoothstep(0.2, 1.6, vObj.y));
  vec3 c = uAura; float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, uSat);
  float a = g * uAuraI * uOpacity;
  gl_FragColor = vec4(c * a, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

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

/* ———— chargement du maillage (une fois) ———— */
let tplPromise = null;
export function loadBody(GLTFLoader) {
  if (!tplPromise) tplPromise = new GLTFLoader().loadAsync(BODY_URL + "?v=" + BODY_V).catch((e) => { tplPromise = null; throw e; });
  return tplPromise;
}

const CHAIN = { // os visés → os enfant servant à mesurer la direction
  spine_01: "spine_02", spine_02: "spine_03", spine_03: "neck_01", neck_01: "head",
  upperarm_l: "lowerarm_l", lowerarm_l: "hand_l", upperarm_r: "lowerarm_r", lowerarm_r: "hand_r",
  thigh_l: "calf_l", calf_l: "foot_l", foot_l: "ball_l", thigh_r: "calf_r", calf_r: "foot_r", foot_r: "ball_r"
};
export const BODY_HEIGHT = 1.68;

/* Crée une figure. o : { pose, ph, core, rim, aura, quality } — couleurs en THREE.Color. */
export function createFigure(SkU, tpl, o = {}) {
  const root = SkU.clone(tpl.scene);
  const bones = {}, meshes = [];
  root.traverse((n) => { if (n.isBone) bones[n.name] = n; if (n.isSkinnedMesh) meshes.push(n); });
  const Rb = bones.Root, rig = Rb.parent;
  const restQ = {}; Object.keys(bones).forEach((k) => { restQ[k] = bones[k].quaternion.clone(); });
  const restRoot = Rb.position.clone();
  const rigQ = rig ? rig.quaternion.clone() : new THREE.Quaternion();
  const u = {
    uCore: { value: (o.core || new THREE.Color("#fff3df")).clone() }, uRim: { value: (o.rim || new THREE.Color("#ffd79a")).clone() },
    uAura: { value: (o.aura || o.rim || new THREE.Color("#ffd79a")).clone() }, uRimI: { value: 1.1 }, uGain: { value: 1 }, uOpacity: { value: 0 },
    uSat: { value: 1 }, uTime: { value: 0 }, uHeart: { value: 0 }, uBreath: { value: 0 }, uAuraI: { value: 0.55 }, uInflate: { value: 0.03 }
  };
  const bodyMat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: bodyVS, fragmentShader: bodyFS, transparent: true, depthWrite: true,
    premultipliedAlpha: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, side: THREE.FrontSide });
  const auraMat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: auraVS, fragmentShader: auraFS, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.BackSide });
  meshes.forEach((m) => {
    m.material = bodyMat; m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; m.renderOrder = 2;
    if ((o.quality == null ? 2 : o.quality) > 0) { const a = m.clone(); a.material = auraMat; a.renderOrder = 1; a.frustumCulled = false; m.parent.add(a); }
  });
  const poseFn = POSE[o.pose] || POSE.stand, ph = o.ph || 0;
  const Rw = {}, Pw = {};
  const tq = new THREE.Quaternion(), tq2 = new THREE.Quaternion(), tv = new THREE.Vector3(), eul = new THREE.Euler();
  const dirs = {};
  function walk(b, Rp, Pp, P) {
    let q = restQ[b.name];
    const target = dirs[b.name];
    if (b.name === "pelvis") {
      eul.set(P.pel[0], P.pel[1], P.pel[2], "YXZ"); tq.setFromEuler(eul);
      tq2.copy(Rp).multiply(q); tq.multiply(tq2); // R_new = pelQ * Rp * q
      b.quaternion.copy(tq2.copy(Rp).invert().multiply(tq));
    } else if (target && CHAIN[b.name] && bones[CHAIN[b.name]]) {
      const Rb0 = tq2.copy(Rp).multiply(q).clone();
      const cur = tv.copy(bones[CHAIN[b.name]].position).applyQuaternion(Rb0).normalize();
      const qd = tq.setFromUnitVectors(cur, target);
      const Rn = qd.multiply(Rb0);
      b.quaternion.copy(tq2.copy(Rp).invert().multiply(Rn));
    } else b.quaternion.copy(q);
    const R = Rp.clone().multiply(b.quaternion);
    const pos = (b === Rb) ? b.position.clone().applyQuaternion(Rp) : b.position.clone().applyQuaternion(Rp);
    const Pn = Pp.clone().add(pos);
    Rw[b.name] = R; Pw[b.name] = Pn;
    for (const c of b.children) if (c.isBone) walk(c, R, Pn, P);
  }
  const heart = new THREE.Vector3();
  const api = {
    root, bones, uniforms: u, bodyMat, auraMat, heart,
    pose(name, ph2) { /* change de pose */ o.pose = name; },
    /* T : temps (s) ; b : souffle 0..1 ; v : niveau audio 0..1 ; frozen : pas de mouvement */
    update(T, b = 0.5, v = 0, frozen = false) {
      const t = frozen ? (o.still != null ? o.still : 1.2) : T * (o.speed || 1.6) + ph * 6.283;
      const fn = POSE[o.pose] || poseFn; const P = fn(t, b, v, ph * 6.283);
      P.sp = P.sp || [0, 0]; P.neck = P.neck || [0, 0, 0]; P.pel = P.pel || [0, 0, 0];
      const sx = P.sp[0], sz = P.sp[1];
      dirs.spine_01 = V3(sx * 0.4, 1, sz * 0.4); dirs.spine_02 = V3(sx * 0.8, 1, sz * 0.8); dirs.spine_03 = V3(sx * 1.2, 1, sz * 1.2);
      dirs.neck_01 = V3(P.neck[0], 1, P.neck[1]);
      [["l", 1], ["r", -1]].forEach(([n, s]) => {
        dirs["upperarm_" + n] = P.ua(s); dirs["lowerarm_" + n] = P.la(s);
        dirs["thigh_" + n] = P.th(s); dirs["calf_" + n] = P.ca(s);
        dirs["foot_" + n] = P.ft ? P.ft(s) : V3(s * 0.05, -0.4, 0.9);
      });
      Rb.position.set(restRoot.x + P.root[0], restRoot.y + P.root[1], restRoot.z + P.root[2]);
      // le rig est parent de Root : position locale de Root dans le repère du rig
      walk(Rb, rigQ.clone(), new THREE.Vector3(), P);
      const s3 = Pw.spine_03, nk = Pw.neck_01;
      if (s3 && nk) heart.set(s3.x * 0.4 + nk.x * 0.6, s3.y * 0.4 + nk.y * 0.6 - 0.02, s3.z * 0.4 + nk.z * 0.6 + 0.06);
      u.uTime.value = T; u.uBreath.value = b;
    },
    dispose() { meshes.forEach((m) => { if (m.skeleton) m.skeleton.dispose(); }); bodyMat.dispose(); auraMat.dispose(); }
  };
  return api;
}
