/* Eden Yours — Danse des Êtres de Lumière : scène 3D cartoon (three.js, sans build).
   - Une chanson au hasard dans la langue du site (tracks.json), sans répéter la dernière (sessionStorage).
   - Un décor par chanson (data/scene-3d-themes.json) : un personnage principal, une paire chaud/froid,
     lumière dorée de lever/coucher de soleil, mouvements lents, petits gestes, fondus doux.
   - MP3 : intensité pilotée par un AnalyserNode Web Audio (règle freemium 30 s si la bibliothèque est verrouillée).
     Embed Suno : rythme doux minuté.
   - Mobile : low poly, pixel ratio ≤ 2, rendu en pause si l'onglet est caché ou la scène hors écran.
   - prefers-reduced-motion : mouvements plus doux ; repli si WebGL indisponible. */

const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.min.js";
const TRACKS_URL = "tracks.json";
const THEMES_URL = "data/scene-3d-themes.json";
const LAST_KEY = "eden-scene3d-last";
const EMBED_BPM = 84;

const cfg = window.EDEN_CONFIG || {};
const $ = (id) => document.getElementById(id);
const el = {
  stage: $("s3d-stage"), canvas: $("s3d-canvas"), loading: $("s3d-loading"), fallback: $("s3d-fallback"),
  dragHint: $("s3d-drag-hint"), chip: $("s3d-theme-chip"), launch: $("s3d-launch"), next: $("s3d-next"),
  player: $("s3d-player"), cover: $("s3d-cover"), title: $("s3d-now-title"), songLink: $("s3d-song-link"),
  excerpt: $("s3d-excerpt"), excerptText: $("s3d-excerpt-text"), audio: $("s3d-audio"), embed: $("s3d-embed"),
  previewNote: $("s3d-preview-note"), hint: $("s3d-hint"), empty: $("s3d-empty")
};

function t(key, vars) {
  return window.EdenI18n && window.EdenI18n.t ? window.EdenI18n.t(key, vars) : key;
}
function siteLang() {
  try {
    if (window.EdenI18n && window.EdenI18n.getLang) return window.EdenI18n.getLang();
    const s = localStorage.getItem("eden-lang");
    if (s === "en" || s === "fr") return s;
  } catch (e) {}
  return new URLSearchParams(location.search).get("lang") === "en" ? "en" : "fr";
}
const reducedMQ = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
const isReduced = () => !!(reducedMQ && reducedMQ.matches);

/* ———————————————————— Données ———————————————————— */
let tracks = [];
let themesData = null;
let current = null;
let lastId = null;
try { lastId = sessionStorage.getItem(LAST_KEY); } catch (e) {}

function themeFor(track) {
  const d = themesData;
  const fallbackId = (d && d.default) || "lumiere";
  const entry = track && d && d.tracks ? d.tracks[track.id] : null;
  const id = entry && d.themes[entry.theme] ? entry.theme : fallbackId;
  return { id, def: (d && d.themes[id]) || null, excerpt: entry && entry.excerpt ? entry.excerpt : null };
}

function poolForLang() {
  const lang = siteLang();
  return tracks.filter((tr) => tr.lang === lang && (tr.audio_url || tr.embed_url));
}

const RECENT_KEY = "eden-scene3d-recent";
function readRecent() {
  try { const a = JSON.parse(sessionStorage.getItem(RECENT_KEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}
function pickTrack() {
  const all = poolForLang();
  if (!all.length) return null;
  let pool = all;
  // jamais la dernière ; et, tant que possible, pas une des dernières écoutées de la visite
  if (pool.length > 1 && lastId) {
    const others = pool.filter((tr) => tr.id !== lastId);
    if (others.length) pool = others;
  }
  const recent = readRecent();
  const keep = Math.min(6, Math.floor(all.length / 2));
  const fresh = pool.filter((tr) => recent.slice(-keep).indexOf(tr.id) === -1);
  if (fresh.length) pool = fresh;
  const tr = pool[Math.floor(Math.random() * pool.length)];
  lastId = tr.id;
  try {
    sessionStorage.setItem(LAST_KEY, tr.id);
    recent.push(tr.id);
    sessionStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(-12)));
  } catch (e) {}
  return tr;
}

/* ———————————————————— Audio (freemium + analyseur) ———————————————————— */
let audioCtx = null, analyser = null, srcNode = null, freq = null;
let mode = "idle"; // idle | audio | embed
let modeStart = 0;
let triedAac = false;
const lvl = { level: 0.15, pulse: 0, beat: false, progress: 0, bassAvg: 0.1, lastBeat: 0, smooth: 0.15 };

function previewLimit() {
  const n = Number(cfg.previewSeconds);
  return Number.isFinite(n) && n > 0 ? n : 30;
}
function isUnlocked() {
  try { return localStorage.getItem(cfg.unlockStorageKey || "eden-yours-unlocked") === "1"; } catch (e) { return false; }
}

function ensureAnalyser() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended" && audioCtx.resume) audioCtx.resume();
    if (!srcNode && el.audio) {
      srcNode = audioCtx.createMediaElementSource(el.audio);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.78;
      freq = new Uint8Array(analyser.frequencyBinCount);
      srcNode.connect(analyser);
      analyser.connect(audioCtx.destination);
    }
  } catch (e) { analyser = null; }
}

function sampleLevel(now) {
  lvl.beat = false;
  const tsec = now / 1000;
  let target = 0.15;
  if (mode === "audio" && el.audio && !el.audio.paused && analyser && freq) {
    analyser.getByteFrequencyData(freq);
    let bass = 0, mid = 0;
    for (let i = 1; i < 7; i++) bass += freq[i];
    for (let i = 7; i < 60; i++) mid += freq[i];
    bass = bass / (6 * 255);
    mid = mid / (53 * 255);
    target = Math.min(1, 0.25 + bass * 0.55 + mid * 0.6);
    lvl.bassAvg += (bass - lvl.bassAvg) * 0.04;
    if (bass > lvl.bassAvg * 1.18 + 0.03 && bass > 0.2 && now - lvl.lastBeat > 330) {
      lvl.lastBeat = now; lvl.beat = true; lvl.pulse = 1;
    }
    const dur = el.audio.duration;
    const cap = isUnlocked() ? dur : Math.min(dur || previewLimit(), previewLimit());
    lvl.progress = cap ? Math.min(1, el.audio.currentTime / cap) : 0;
  } else if (mode === "audio" && el.audio && !el.audio.paused) {
    target = 0.55; // lecture sans analyseur : rythme minuté
    timedBeat(now, tsec);
  } else if (mode === "embed") {
    target = 0.5 + 0.12 * Math.sin(tsec * 0.35);
    timedBeat(now, tsec);
    lvl.progress = Math.min(1, (now - modeStart) / 150000);
  } else {
    if (now - lvl.lastBeat > 2600) { lvl.lastBeat = now; lvl.beat = true; lvl.pulse = 0.45; }
  }
  lvl.smooth += (target - lvl.smooth) * 0.08;
  lvl.level = lvl.smooth;
  lvl.pulse *= 0.9;
  return lvl;
}
function timedBeat(now) {
  const period = 60000 / EMBED_BPM;
  if (now - lvl.lastBeat >= period) { lvl.lastBeat = now; lvl.beat = true; lvl.pulse = 0.8; }
}

function stopPlayback() {
  mode = "idle";
  lvl.progress = 0;
  if (el.audio) {
    try { el.audio.pause(); } catch (e) {}
    try { el.audio.removeAttribute("src"); el.audio.load(); } catch (e) {}
    el.audio.hidden = true;
  }
  if (el.embed) { el.embed.innerHTML = ""; el.embed.hidden = true; }
  if (el.previewNote) el.previewNote.hidden = true;
}

function showEmbed(tr) {
  if (!el.embed || !tr.embed_url) return false;
  el.embed.innerHTML = "";
  const f = document.createElement("iframe");
  f.src = tr.embed_url;
  f.title = (tr.title || "Suno") + " — Suno";
  f.width = "100%";
  f.height = "180";
  f.setAttribute("frameborder", "0");
  f.setAttribute("allow", "autoplay; clipboard-write; encrypted-media");
  f.className = "s3d-suno-embed";
  el.embed.appendChild(f);
  el.embed.hidden = false;
  if (el.audio) el.audio.hidden = true;
  mode = "embed";
  modeStart = performance.now();
  setHint("scene.hintEmbed");
  return true;
}

function cleanExcerpt(s) {
  return String(s || "").replace(/[,;:\s]+$/, "");
}

function renderNowPlaying(tr, th) {
  if (el.player) el.player.hidden = false;
  if (el.title) el.title.textContent = tr.title || "";
  if (el.cover) {
    if (tr.cover_url) { el.cover.src = tr.cover_url; el.cover.alt = tr.title || ""; el.cover.hidden = false; }
    else { el.cover.hidden = true; el.cover.removeAttribute("src"); }
  }
  if (el.songLink) {
    if (tr.suno_share) {
      el.songLink.href = tr.suno_share;
      el.songLink.textContent = t("scene.sunoLink", { title: tr.title || "" });
      el.songLink.hidden = false;
    } else el.songLink.hidden = true;
  }
  if (el.excerpt && el.excerptText) {
    if (th.excerpt) {
      el.excerptText.textContent = "« " + cleanExcerpt(th.excerpt).replace(/\s*\n\s*/g, " / ") + " »";
      if (siteLang() === "en") el.excerptText.textContent = "“" + cleanExcerpt(th.excerpt).replace(/\s*\n\s*/g, " / ") + "”";
      el.excerpt.hidden = false;
    } else el.excerpt.hidden = true;
  }
}

function setHint(key, vars) { if (el.hint) el.hint.textContent = t(key, vars); }

function updateChip(th) {
  if (!el.chip) return;
  if (!th || !th.def) { el.chip.hidden = true; return; }
  const lang = siteLang();
  el.chip.textContent = t("scene.themeChip", { name: (th.def.label && th.def.label[lang]) || th.id });
  el.chip.title = (th.def.character && th.def.character[lang]) || "";
  el.chip.hidden = false;
}

function playTrack(tr) {
  stopPlayback();
  current = tr;
  triedAac = false;
  const th = themeFor(tr);
  renderNowPlaying(tr, th);
  updateChip(th);
  if (scene) scene.setTheme(th.id, th.def);
  if (el.launch) el.launch.hidden = true;
  if (el.next) el.next.hidden = false;

  const src = tr.audio_url || tr.audio_url_aac;
  if (src && el.audio) {
    ensureAnalyser();
    el.audio.hidden = false;
    el.audio.src = src;
    try { el.audio.currentTime = 0; } catch (e) {}
    mode = "audio";
    modeStart = performance.now();
    setHint(isUnlocked() ? "scene.hintAudio" : "scene.hintAudioPreview");
    const p = el.audio.play();
    if (p && p.catch) p.catch(() => setHint("scene.hintBlocked"));
    return;
  }
  if (!showEmbed(tr)) setHint("scene.empty");
}

function launch() {
  const tr = pickTrack();
  if (!tr) {
    if (el.empty) el.empty.hidden = false;
    setHint("scene.empty");
    return;
  }
  if (el.empty) el.empty.hidden = true;
  playTrack(tr);
}

function bindAudio() {
  const a = el.audio;
  if (!a) return;
  a.addEventListener("timeupdate", () => {
    if (mode !== "audio" || isUnlocked()) return;
    const lim = previewLimit();
    if (a.currentTime >= lim) {
      try { a.pause(); a.currentTime = lim; } catch (e) {}
      if (el.previewNote) el.previewNote.hidden = false;
      setHint("scene.hintPreview");
    }
  });
  a.addEventListener("play", () => {
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    if (mode === "audio" && !isUnlocked() && a.currentTime >= previewLimit() - 0.05) {
      try { a.pause(); } catch (e) {}
    }
  });
  a.addEventListener("ended", () => {
    if (mode !== "audio") return;
    setHint("scene.hintEnded");
    setTimeout(() => { if (mode === "audio" && a.ended) launch(); }, 2200);
  });
  a.addEventListener("error", () => {
    if (mode !== "audio" || !current) return;
    if (!triedAac && current.audio_url_aac && a.getAttribute("src") !== current.audio_url_aac) {
      triedAac = true;
      a.src = current.audio_url_aac;
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
      return;
    }
    if (current.embed_url) showEmbed(current);
    else setHint("scene.hintError");
  });
}

/* ———————————————————— Scène 3D ———————————————————— */
let scene = null;

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch (e) { return false; }
}

function showFallback() {
  if (el.loading) el.loading.hidden = true;
  if (el.fallback) el.fallback.hidden = false;
  if (el.dragHint) el.dragHint.hidden = true;
  if (el.canvas) el.canvas.hidden = true;
}

function createScene(THREE, canvas, stage) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: dpr < 2, powerPreference: "low-power" });
  renderer.setPixelRatio(dpr);
  const sc = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 140);

  /* — utilitaires — */
  const grad = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
  grad.minFilter = grad.magFilter = THREE.NearestFilter;
  grad.needsUpdate = true;
  const glowTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,255,255,1)");
    r.addColorStop(0.35, "rgba(255,255,255,0.45)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    const tx = new THREE.CanvasTexture(c);
    tx.colorSpace = THREE.SRGBColorSpace;
    return tx;
  })();
  const C = (hex) => new THREE.Color(hex);
  const toon = (color, emissive = 0.15) => new THREE.MeshToonMaterial({ color: C(color), gradientMap: grad, emissive: C(color), emissiveIntensity: emissive });
  const basic = (color, o = {}) => new THREE.MeshBasicMaterial(Object.assign({ color: C(color) }, o));
  const glow = (color, size, opacity = 0.6) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: C(color), transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.setScalar(size);
    return s;
  };
  const rand = (a, b) => a + Math.random() * (b - a);
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (x) => x * x * (3 - 2 * x);

  /* Visage cartoon : yeux (clignent), joues, sourire */
  function makeFace(parent, o = {}) {
    const y = o.y || 0, z = o.z || 0.5, sp = o.spread || 0.17, s = o.size || 1;
    const g = new THREE.Group();
    g.position.set(0, y, z);
    const dark = basic("#1d1838");
    const eyes = [];
    [-1, 1].forEach((side) => {
      let eye;
      if (o.sleeping) {
        eye = new THREE.Mesh(new THREE.TorusGeometry(0.06 * s, 0.014 * s, 5, 10, Math.PI), dark);
        eye.rotation.z = Math.PI;
      } else {
        eye = new THREE.Mesh(new THREE.SphereGeometry(0.068 * s, 10, 8), dark);
        eye.scale.z = 0.55;
        const hl = new THREE.Mesh(new THREE.SphereGeometry(0.022 * s, 6, 4), basic("#ffffff"));
        hl.position.set(0.022 * s, 0.025 * s, 0.04 * s);
        eye.add(hl);
      }
      eye.position.set(side * sp * s, 0.06 * s, 0);
      g.add(eye);
      eyes.push(eye);
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.07 * s, 8, 6), basic("#ff9fb4", { transparent: true, opacity: 0.6 }));
      cheek.scale.set(1, 0.55, 0.3);
      cheek.position.set(side * (sp + 0.11) * s, -0.06 * s, -0.02);
      g.add(cheek);
    });
    let mouth;
    if (o.mouth === "o") {
      mouth = new THREE.Mesh(new THREE.TorusGeometry(0.045 * s, 0.018 * s, 6, 12), dark);
    } else {
      mouth = new THREE.Mesh(new THREE.TorusGeometry(0.075 * s, 0.017 * s, 5, 12, Math.PI), dark);
      mouth.rotation.z = Math.PI;
    }
    mouth.position.set(0, -0.07 * s, 0.01);
    g.add(mouth);
    parent.add(g);
    let nextBlink = performance.now() + rand(1500, 4000);
    return {
      group: g, mouth,
      update(now) {
        if (o.sleeping) return;
        const dt = now - nextBlink;
        const k = dt > 0 && dt < 140 ? 0.12 : 1;
        eyes.forEach((e) => { e.scale.y = k; });
        if (dt >= 140) nextBlink = now + rand(2200, 5200);
      }
    };
  }

  /* Être de lumière : corps rond, auréole, petits bras, pieds */
  function makeBeing(body, halo, scale = 1) {
    const root = new THREE.Group();
    const bob = new THREE.Group();
    root.add(bob);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.55, 22, 16), toon(body, 0.22));
    bob.add(b);
    const face = makeFace(bob, { y: 0.06, z: 0.5 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.045, 8, 28), basic(halo));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.86;
    bob.add(ring);
    const ringGlow = glow(halo, 1.2, 0.55);
    ringGlow.position.y = 0.86;
    bob.add(ringGlow);
    bob.add(glow(body, 2.6, 0.32));
    const arms = [-1, 1].map((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.47, -0.04, 0.02);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.28, 4, 8), toon(body, 0.22));
      arm.rotation.z = Math.PI / 2;
      arm.position.x = side * 0.17;
      pivot.add(arm);
      bob.add(pivot);
      return pivot;
    });
    [-1, 1].forEach((side) => {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), toon(body, 0.1));
      f.scale.set(1, 0.55, 1.3);
      f.position.set(side * 0.2, -0.53, 0.06);
      bob.add(f);
    });
    root.scale.setScalar(scale);
    return {
      root, bob, face, ring,
      arms(a, b2 = a) { arms[1].rotation.z = a; arms[0].rotation.z = -b2; }
    };
  }

  function shadowBlob(r = 0.6) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24), basic("#000000", { transparent: true, opacity: 0.22, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.012;
    return m;
  }

  function island(color, r = 4.2) {
    const g = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, 0.5, 40), toon(color, 0.05));
    top.position.y = -0.25;
    g.add(top);
    const under = new THREE.Mesh(new THREE.ConeGeometry(r * 0.9, 2.4, 24), toon(color, 0.02));
    under.rotation.x = Math.PI;
    under.position.y = -1.7;
    under.material.color.multiplyScalar(0.6);
    g.add(under);
    return { group: g, top };
  }

  function makeFlower(petal, center, s = 1) {
    const g = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.5, 5), toon("#5aa86a", 0.05));
    stem.position.y = 0.25;
    g.add(stem);
    const head = new THREE.Group();
    head.position.y = 0.52;
    const pm = toon(petal, 0.25);
    for (let i = 0; i < 5; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), pm);
      const a = (i / 5) * Math.PI * 2;
      p.position.set(Math.cos(a) * 0.09, 0, Math.sin(a) * 0.09);
      p.scale.set(1, 0.45, 1);
      head.add(p);
    }
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), toon(center, 0.4));
    c.position.y = 0.02;
    head.add(c);
    g.add(head);
    g.scale.setScalar(s);
    return { group: g, head };
  }

  function starShape(outer, inner) {
    const sh = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? inner : outer;
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      if (i === 0) sh.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else sh.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    sh.closePath();
    return sh;
  }
  function heartGeo(size) {
    const s = new THREE.Shape();
    s.moveTo(5, 5);
    s.bezierCurveTo(5, 5, 4, 0, 0, 0);
    s.bezierCurveTo(-6, 0, -6, 7, -6, 7);
    s.bezierCurveTo(-6, 11, -3, 15.4, 5, 19);
    s.bezierCurveTo(12, 15.4, 16, 11, 16, 7);
    s.bezierCurveTo(16, 7, 16, 0, 10, 0);
    s.bezierCurveTo(7, 0, 5, 5, 5, 5);
    const g = new THREE.ExtrudeGeometry(s, { depth: 6, bevelEnabled: true, bevelSegments: 3, bevelSize: 2.2, bevelThickness: 2.4, curveSegments: 8 });
    g.center();
    g.rotateZ(Math.PI);
    g.scale(size / 20, size / 20, size / 20);
    g.computeBoundingBox();
    return g;
  }

  /* — ciel dégradé + soleil bas (lever/coucher) — */
  const skyU = {
    top: { value: C("#0d2a4a") }, horizon: { value: C("#e9a15a") }, bottom: { value: C("#3a2a3a") },
    sunDir: { value: new THREE.Vector3(0.75, 0.12, -0.65).normalize() }, sunColor: { value: C("#ffc27a") }, sunAmt: { value: 0.7 }
  };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(70, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: skyU,
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: [
      "uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 sunColor; uniform float sunAmt; varying vec3 vP;",
      "void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(horizon, top, pow(smoothstep(0.0, 0.75, h), 0.7)) : mix(horizon, bottom, smoothstep(0.0, -0.35, h));",
      "float s = max(dot(normalize(vP), sunDir), 0.0); c += sunColor * (pow(s, 6.0) * 0.45 + pow(s, 80.0) * 0.9) * sunAmt;",
      "gl_FragColor = vec4(c, 1.0);",
      "#include <colorspace_fragment>",
      "}"
    ].join("\n")
  }));
  sc.add(sky);

  /* étoiles */
  const starGeo = new THREE.BufferGeometry();
  const SN = 420, sp = new Float32Array(SN * 3);
  for (let i = 0; i < SN; i++) {
    const th = Math.random() * Math.PI * 2, ph = Math.acos(rand(0.05, 1)), r = rand(40, 60);
    sp[i * 3] = Math.sin(ph) * Math.cos(th) * r;
    sp[i * 3 + 1] = Math.cos(ph) * r;
    sp[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  const starMat = new THREE.PointsMaterial({ map: glowTex, size: 0.9, transparent: true, depthWrite: false, opacity: 0.4, color: C("#fff6e0"), blending: THREE.AdditiveBlending, fog: false });
  const stars = new THREE.Points(starGeo, starMat);
  sc.add(stars);

  const hemi = new THREE.HemisphereLight(C("#7EB6D9"), C("#F6C66A"), 1.1);
  sc.add(hemi);
  const sun = new THREE.DirectionalLight(C("#ffc27a"), 2.1);
  sun.position.set(6, 3, -4);
  sc.add(sun);
  const rim = new THREE.DirectionalLight(C("#7EB6D9"), 0.8);
  rim.position.set(-5, 4, 6);
  sc.add(rim);
  sc.fog = new THREE.Fog(C("#e9a15a"), 18, 60);

  /* ———————— Décors / personnages ———————— */
  const BUILD = {};

  BUILD.lumiere = (P) => {
    const g = new THREE.Group();
    const isl = island(P.ground);
    g.add(isl.group);
    const being = makeBeing(P.cool, P.warm, 1.15);
    being.root.position.y = 0.7;
    g.add(being.root);
    g.add(shadowBlob(0.7));
    const N = 46, pos = new Float32Array(N * 3), seeds = [];
    for (let i = 0; i < N; i++) seeds.push({ a: rand(0, 6.28), r: rand(0.8, 3.6), y: rand(0, 4), v: rand(0.15, 0.4) });
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(pg, new THREE.PointsMaterial({ map: glowTex, size: 0.22, color: C(P.accent), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    g.add(pts);
    let hop = 0;
    return {
      group: g, camera: { r: 7.2, y: 2.1, target: [0, 1.0, 0] },
      update(T, dt, A, now, R) {
        if (A.beat) hop = 1;
        hop = Math.max(0, hop - dt * 2.4);
        const j = Math.sin((1 - hop) * Math.PI) * 0.28 * A.level * R;
        being.bob.position.y = j + Math.sin(T * 1.2) * 0.05;
        const sq = 1 - hop * 0.08 * R;
        being.bob.scale.set(1 + (1 - sq), sq, 1 + (1 - sq));
        being.bob.rotation.z = Math.sin(T * 0.9) * 0.12 * R;
        const wave = Math.sin(T * 2.2) * 0.5 * (0.4 + A.level) * R;
        being.arms(-0.5 + wave + hop * 0.8 * R, -0.5 - wave + hop * 0.8 * R);
        being.ring.rotation.z += dt * 0.6;
        being.face.update(now);
        for (let i = 0; i < N; i++) {
          const s = seeds[i];
          s.y += s.v * dt * (0.5 + A.level);
          if (s.y > 4.5) s.y = 0;
          pos[i * 3] = Math.cos(s.a + T * 0.1) * s.r;
          pos[i * 3 + 1] = s.y;
          pos[i * 3 + 2] = Math.sin(s.a + T * 0.1) * s.r;
        }
        pg.attributes.position.needsUpdate = true;
      },
      face: being.root
    };
  };

  BUILD.reveur = (P) => {
    const g = new THREE.Group();
    const cloud = new THREE.Group();
    const cm = toon(P.cool, 0.25);
    [[0, 0, 0, 0.75], [-0.75, -0.12, 0, 0.55], [0.75, -0.12, 0, 0.55], [-0.38, 0.38, -0.1, 0.5], [0.4, 0.36, -0.1, 0.48], [0, -0.2, 0.22, 0.6]].forEach(([x, y, z, r]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), cm);
      m.position.set(x, y, z);
      cloud.add(m);
    });
    const face = makeFace(cloud, { y: -0.02, z: 0.78, sleeping: true, size: 1.4 });
    cloud.add(glow(P.cool, 4.2, 0.18));
    cloud.position.y = 1.4;
    g.add(cloud);
    // petits nuages lointains
    for (let i = 0; i < 5; i++) {
      const c = new THREE.Group();
      for (let k = 0; k < 3; k++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(rand(0.3, 0.5), 10, 8), toon("#3b4a8a", 0.15));
        m.position.set(k * 0.45 - 0.45, rand(-0.1, 0.1), 0);
        c.add(m);
      }
      const a = (i / 5) * Math.PI * 2;
      c.position.set(Math.cos(a) * 6, rand(-1.2, 0.2), Math.sin(a) * 6);
      g.add(c);
    }
    // rêves : lumières dorées
    const dreams = [];
    const dm = toon(P.warm, 0.9);
    for (let i = 0; i < 22; i++) {
      const d = new THREE.Group();
      d.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), dm));
      d.add(glow(P.warm, 0.9, 0.7));
      d.visible = false;
      g.add(d);
      dreams.push({ obj: d, life: 0, vx: 0, vy: 0, vz: 0, home: null });
    }
    let di = 0, lastSpawn = 0;
    function spawn(now) {
      if (now - lastSpawn < 900) return;
      lastSpawn = now;
      const d = dreams[di++ % dreams.length];
      d.life = 0.001;
      d.obj.visible = true;
      d.obj.position.set(cloud.position.x + rand(-0.2, 0.2), cloud.position.y + 0.7, cloud.position.z);
      const a = rand(0, Math.PI * 2);
      d.home = new THREE.Vector3(Math.cos(a) * rand(1.8, 4), rand(2.4, 4.6), Math.sin(a) * rand(1.8, 4));
    }
    return {
      group: g, camera: { r: 7.4, y: 1.6, target: [0, 1.6, 0] },
      update(T, dt, A, now, R) {
        cloud.position.y = 1.4 + Math.sin(T * 0.55) * 0.18 * (0.5 + R * 0.5);
        const br = 1 + Math.sin(T * 0.8) * 0.035 + A.pulse * 0.03 * R;
        cloud.scale.set(br, 1 / br, br);
        cloud.rotation.z = Math.sin(T * 0.3) * 0.06;
        if (A.beat) spawn(now);
        dreams.forEach((d) => {
          if (!d.life) return;
          d.life += dt / 14;
          d.obj.position.lerp(d.home, dt * 0.35);
          const tw = 0.75 + Math.sin(T * 3 + d.home.x * 5) * 0.25;
          const fade = d.life < 0.1 ? d.life / 0.1 : d.life > 0.8 ? Math.max(0, (1 - d.life) / 0.2) : 1;
          d.obj.scale.setScalar(Math.max(0.001, fade * tw * 1.2));
          if (d.life >= 1) { d.life = 0; d.obj.visible = false; }
        });
        face.update(now);
      },
      face: cloud
    };
  };

  BUILD.oui = (P) => {
    const g = new THREE.Group();
    const isl = island("#5b6270");
    g.add(isl.group);
    const from = C("#5b6270"), to = C(P.ground);
    const plant = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.9, 4, 8), toon("#58b07a", 0.12));
    stem.position.y = 0.5;
    plant.add(stem);
    [-1, 1].forEach((s) => {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), toon(P.cool, 0.15));
      leaf.scale.set(1.3, 0.3, 0.65);
      leaf.position.set(s * 0.22, 0.42 + (s > 0 ? 0.12 : 0), 0);
      leaf.rotation.z = s * 0.45;
      plant.add(leaf);
    });
    const headPivot = new THREE.Group();
    headPivot.position.y = 1.0;
    const head = new THREE.Mesh(new THREE.ExtrudeGeometry(starShape(0.5, 0.26), { depth: 0.16, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.06, bevelSegments: 2, curveSegments: 4 }), toon(P.warm, 0.35));
    head.geometry.center();
    head.position.y = 0.42;
    headPivot.add(head);
    const face = makeFace(head, { y: 0.0, z: 0.17, size: 0.9, spread: 0.13 });
    const headGlow = glow(P.warm, 2.2, 0.35);
    headGlow.position.y = 0.42;
    headPivot.add(headGlow);
    plant.add(headPivot);
    g.add(plant);
    g.add(shadowBlob(0.45));
    const flowers = [];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + rand(-0.15, 0.15), r = rand(1.3, 3.6);
      const f = makeFlower(i % 2 ? P.warm : "#ff9fb4", i % 2 ? "#ffffff" : P.accent, rand(0.8, 1.2));
      f.group.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      f.group.scale.setScalar(0.001);
      f.at = i / 18;
      g.add(f.group);
      flowers.push(f);
    }
    let nod = 0;
    const tmp = new THREE.Color();
    return {
      group: g, camera: { r: 6.6, y: 1.9, target: [0, 1.1, 0] },
      update(T, dt, A, now, R) {
        if (A.beat) nod = 1;
        nod = Math.max(0, nod - dt * 2.2);
        headPivot.rotation.x = Math.sin((1 - nod) * Math.PI) * 0.38 * (0.5 + 0.5 * R);
        plant.rotation.z = Math.sin(T * 0.7) * 0.05;
        head.rotation.z = Math.sin(T * 0.5) * 0.08;
        const prog = Math.max(0.05, A.progress);
        tmp.copy(from).lerp(to, ease(Math.min(1, prog * 1.15)));
        isl.top.material.color.copy(tmp);
        isl.top.material.emissive.copy(tmp);
        flowers.forEach((f, i) => {
          const k = Math.max(0, Math.min(1, (prog - f.at * 0.9) * 6));
          f.group.scale.setScalar(Math.max(0.001, ease(k)));
          f.head.rotation.z = Math.sin(T * 1.1 + i) * 0.15;
        });
        face.update(now);
      },
      face: plant
    };
  };

  BUILD.particule = (P) => {
    const g = new THREE.Group();
    const N = 180;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), wake = new Float32Array(N);
    const cool = C(P.cool), warm = C(P.warm), dim = C("#1b2a44");
    for (let i = 0; i < N; i++) {
      const arm = i % 2, tpos = Math.pow(Math.random(), 0.7);
      const r = 0.5 + tpos * 5.2, a = arm * Math.PI + tpos * 4.2 + rand(-0.35, 0.35);
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = rand(-0.25, 0.25) * (1.2 - tpos) + 1.2;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const galaxy = new THREE.Points(geo, new THREE.PointsMaterial({ map: glowTex, size: 0.42, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    g.add(galaxy);
    const core = glow(P.warm, 3.5, 0);
    core.position.y = 1.2;
    g.add(core);
    const hero = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 12), toon("#fff6dc", 0.9));
    hero.add(ball);
    const face = makeFace(hero, { y: 0, z: 0.26, size: 0.6, spread: 0.12 });
    hero.add(glow(P.warm, 2.2, 0.85));
    hero.add(glow(P.cool, 3.6, 0.25));
    g.add(hero);
    const trail = [];
    for (let i = 0; i < 8; i++) { const s = glow(P.warm, 0.5 - i * 0.04, 0.5 - i * 0.05); g.add(s); trail.push(s); }
    const hist = [];
    const tmp = new THREE.Color();
    const hp = new THREE.Vector3();
    let phase = "wake", resetT = 0;
    return {
      group: g, camera: { r: 9.2, y: 5.2, target: [0, 1.0, 0] },
      update(T, dt, A, now, R) {
        const sp = 0.16 * (0.6 + A.level * 0.8);
        const u = T * sp;
        hp.set(Math.sin(u * 1.0) * 4.2 * (0.6 + 0.4 * Math.sin(u * 0.37)), 1.2 + Math.sin(u * 2.1) * 0.35, Math.cos(u * 1.3) * 4.0 * (0.6 + 0.4 * Math.cos(u * 0.29)));
        hero.position.lerp(hp, Math.min(1, dt * 2));
        const pul = 1 + A.pulse * 0.25 * R;
        ball.scale.setScalar(pul);
        hist.unshift(hero.position.clone());
        if (hist.length > 40) hist.pop();
        trail.forEach((s, i) => { const h = hist[Math.min(hist.length - 1, (i + 1) * 4)]; if (h) s.position.copy(h); });
        let awake = 0;
        for (let i = 0; i < N; i++) {
          const dx = pos[i * 3] - hero.position.x, dz = pos[i * 3 + 2] - hero.position.z, dy = pos[i * 3 + 1] - hero.position.y;
          if (phase === "wake" && dx * dx + dy * dy + dz * dz < 2.0) wake[i] = Math.min(1, wake[i] + dt * 2.5);
          if (phase === "rest") wake[i] = Math.max(0, wake[i] - dt * 0.12);
          awake += wake[i] > 0.5 ? 1 : 0;
          tmp.copy(dim).lerp(i % 3 ? cool : warm, wake[i]);
          const tw = wake[i] > 0.5 ? 0.85 + 0.15 * Math.sin(T * 2 + i) : 0.5;
          col[i * 3] = tmp.r * tw; col[i * 3 + 1] = tmp.g * tw; col[i * 3 + 2] = tmp.b * tw;
        }
        geo.attributes.color.needsUpdate = true;
        const ratio = awake / N;
        core.material.opacity = ratio * 0.7;
        galaxy.rotation.y += dt * (0.02 + ratio * 0.08) * (0.4 + 0.6 * R);
        if (phase === "wake" && ratio > 0.86) { phase = "galaxy"; resetT = T; }
        if (phase === "galaxy" && T - resetT > 22) phase = "rest";
        if (phase === "rest" && ratio < 0.05) phase = "wake";
        face.update(now);
      },
      face: hero
    };
  };

  BUILD.coeur = (P) => {
    const g = new THREE.Group();
    const isl = island(P.ground, 3.6);
    g.add(isl.group);
    const hg = heartGeo(1.5);
    const halfZ = (hg.boundingBox.max.z - hg.boundingBox.min.z) / 2;
    const heart = new THREE.Group();
    const hm = new THREE.Mesh(hg, toon(P.warm, 0.3));
    heart.add(hm);
    const face = makeFace(heart, { y: 0.12, z: halfZ + 0.005, size: 1.15 });
    heart.add(glow(P.warm, 3.2, 0.3));
    heart.position.y = 1.5;
    g.add(heart);
    g.add(shadowBlob(0.6));
    const twin = new THREE.Group();
    const tg = heartGeo(0.7);
    twin.add(new THREE.Mesh(tg, toon(P.accent, 0.45)));
    const tface = makeFace(twin, { y: 0.05, z: (tg.boundingBox.max.z - tg.boundingBox.min.z) / 2 + 0.005, size: 0.55, spread: 0.15 });
    twin.add(glow(P.accent, 1.6, 0.45));
    g.add(twin);
    const mini = [];
    const mg = heartGeo(0.25);
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(mg, toon(i % 2 ? P.warm : P.cool, 0.5));
      m.userData = { a: rand(0, 6.28), r: rand(1.4, 3.2), y: rand(0, 4), v: rand(0.12, 0.3) };
      g.add(m);
      mini.push(m);
    }
    let beat = 0;
    return {
      group: g, camera: { r: 6.8, y: 2.0, target: [0, 1.4, 0] },
      update(T, dt, A, now, R) {
        if (A.beat) beat = 1;
        beat = Math.max(0, beat - dt * 1.8);
        // lub-dub
        const k = beat > 0.75 ? (beat - 0.75) * 4 : beat > 0.45 && beat < 0.6 ? (0.6 - Math.abs(beat - 0.52) * 6) * 0.6 : 0;
        const s = 1 + Math.max(0, k) * 0.08 * R;
        heart.scale.set(s, s, s);
        heart.position.y = 1.5 + Math.sin(T * 0.7) * 0.12;
        heart.rotation.z = Math.sin(T * 0.5) * 0.06;
        const a = T * 0.45 * (0.6 + 0.4 * R);
        twin.position.set(Math.cos(a) * 1.7, 1.75 + Math.sin(a * 2) * 0.2, Math.sin(a) * 1.7);
        twin.rotation.z = Math.sin(T * 0.9) * 0.15;
        mini.forEach((m) => {
          const u = m.userData;
          u.y += u.v * dt;
          if (u.y > 4.5) u.y = 0;
          m.position.set(Math.cos(u.a + T * 0.1) * u.r, u.y, Math.sin(u.a + T * 0.1) * u.r);
          m.scale.setScalar(Math.sin(Math.min(1, u.y / 4.5) * Math.PI) + 0.001);
        });
        face.update(now); tface.update(now);
      },
      face: heart, face2: twin
    };
  };

  BUILD.souffle = (P) => {
    const g = new THREE.Group();
    const isl = island(P.ground, 4.4);
    g.add(isl.group);
    // la main (paume posée, doigts arrondis)
    const hand = new THREE.Group();
    const skin = toon("#ffd6a8", 0.25);
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), skin);
    palm.scale.set(1, 0.32, 1.1);
    hand.add(palm);
    [-0.27, -0.09, 0.09, 0.27].forEach((x, i) => {
      const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.32 - Math.abs(i - 1.5) * 0.05, 4, 8), skin);
      f.rotation.x = Math.PI / 2;
      f.position.set(x, 0, 0.6 - Math.abs(i - 1.5) * 0.03);
      hand.add(f);
    });
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.26, 4, 8), skin);
    thumb.rotation.set(Math.PI / 2, 0, -0.9);
    thumb.position.set(0.5, 0, 0.15);
    hand.add(thumb);
    hand.add(glow(P.warm, 2.0, 0.3));
    hand.position.set(1.2, 0.12, 0.6);
    g.add(hand);
    const handShadow = shadowBlob(0.55);
    g.add(handShadow);
    // le souffle : petit esprit-nuage aux joues gonflées
    const spirit = new THREE.Group();
    const sm = toon(P.cool, 0.3);
    const sb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 18, 12), sm);
    spirit.add(sb);
    [[-0.4, 0.1, -0.1, 0.32], [0.38, 0.14, -0.1, 0.3], [0, 0.42, -0.12, 0.3]].forEach(([x, y, z, r]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), sm);
      m.position.set(x, y, z);
      spirit.add(m);
    });
    const face = makeFace(spirit, { y: 0.02, z: 0.46, mouth: "o" });
    spirit.add(glow(P.cool, 2.6, 0.3));
    spirit.position.set(-2.4, 2.2, -0.6);
    g.add(spirit);
    // vent doré
    const WN = 110, wpos = new Float32Array(WN * 3), wt = [];
    for (let i = 0; i < WN; i++) wt.push({ u: Math.random(), off: rand(-0.3, 0.3), sp: rand(0.12, 0.25) });
    const wg = new THREE.BufferGeometry();
    wg.setAttribute("position", new THREE.BufferAttribute(wpos, 3));
    g.add(new THREE.Points(wg, new THREE.PointsMaterial({ map: glowTex, size: 0.2, color: C(P.warm), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    // fleurs qui s'ouvrent autour de la main
    const flowers = [];
    for (let i = 0; i < 20; i++) {
      const f = makeFlower(i % 3 === 0 ? "#ff9fb4" : i % 3 === 1 ? P.warm : "#ffffff", P.accent, rand(0.8, 1.15));
      f.group.scale.setScalar(0.001);
      f.k = 0; f.on = false;
      g.add(f.group);
      flowers.push(f);
    }
    let fi = 0, rest = new THREE.Vector3(1.2, 0, 0.6), target = rest.clone(), moveT = 0, phaseT = 0, lastBloom = 0;
    const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), tmp = new THREE.Vector3();
    function bloom(now) {
      if (now - lastBloom < 700) return;
      lastBloom = now;
      const f = flowers[fi++ % flowers.length];
      const a = rand(0, Math.PI * 2), r = rand(0.75, 1.35);
      f.group.position.set(rest.x + Math.cos(a) * r, 0, rest.z + Math.sin(a) * r);
      f.k = 0; f.on = true;
    }
    return {
      group: g, camera: { r: 7.6, y: 2.6, target: [0, 0.9, 0] },
      update(T, dt, A, now, R) {
        phaseT += dt;
        if (phaseT > 10) {
          phaseT = 0;
          const a = rand(0, Math.PI * 2), r = rand(0.6, 2.4);
          target = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
          moveT = 0.0001;
        }
        if (moveT > 0) {
          moveT += dt / 2.6;
          const k = ease(Math.min(1, moveT));
          const cur = tmp.copy(rest).lerp(target, k);
          hand.position.set(cur.x, 0.12 + Math.sin(k * Math.PI) * 0.7, cur.z + 0);
          if (moveT >= 1) { rest.copy(target); moveT = 0; }
        } else {
          hand.position.set(rest.x, 0.12 + Math.sin(T * 1.3) * 0.015, rest.z);
        }
        hand.rotation.y = Math.atan2(hand.position.x - spirit.position.x, hand.position.z - spirit.position.z) + Math.PI;
        handShadow.position.set(hand.position.x, 0.012, hand.position.z);
        handShadow.scale.setScalar(1 - (hand.position.y - 0.12) * 0.5);
        spirit.position.y = 2.2 + Math.sin(T * 0.6) * 0.15;
        const puff = 1 + A.pulse * 0.12 * R + Math.sin(T * 1.6) * 0.03;
        spirit.scale.set(puff, puff, puff);
        // courbe du vent : bouche de l'esprit → main
        p0.copy(spirit.position).add(tmp.set(0, 0, 0.5));
        p2.set(hand.position.x, hand.position.y + 0.2, hand.position.z);
        p1.copy(p0).lerp(p2, 0.5).add(tmp.set(0, 1.1, 0));
        for (let i = 0; i < WN; i++) {
          const w = wt[i];
          w.u += w.sp * dt * (0.6 + A.level * 0.9);
          if (w.u > 1) w.u -= 1;
          const u = w.u, iu = 1 - u;
          const sw = Math.sin(u * 9 + T * 2 + i) * 0.25 * (1 - u * 0.5);
          wpos[i * 3] = iu * iu * p0.x + 2 * iu * u * p1.x + u * u * p2.x + sw + w.off * u;
          wpos[i * 3 + 1] = iu * iu * p0.y + 2 * iu * u * p1.y + u * u * p2.y + Math.cos(u * 7 + i) * 0.15;
          wpos[i * 3 + 2] = iu * iu * p0.z + 2 * iu * u * p1.z + u * u * p2.z + w.off;
        }
        wg.attributes.position.needsUpdate = true;
        if (moveT === 0 && (A.beat || Math.random() < dt * 0.6)) bloom(now);
        flowers.forEach((f, i) => {
          if (!f.on) return;
          f.k = Math.min(1, f.k + dt * 0.7);
          f.group.scale.setScalar(Math.max(0.001, ease(f.k)));
          f.head.rotation.z = Math.sin(T * 1.2 + i) * 0.12;
        });
        face.update(now);
      },
      face: spirit
    };
  };

  BUILD.creation = (P) => {
    const g = new THREE.Group();
    const isl = island(P.ground);
    g.add(isl.group);
    const being = makeBeing(P.cool, P.warm, 1);
    being.root.position.set(-0.9, 0.62, 0.2);
    g.add(being.root);
    const bs = shadowBlob(0.6);
    bs.position.set(-0.9, 0.012, 0.2);
    g.add(bs);
    const blocks = [];
    const MAXB = 7;
    const colors = [P.warm, P.cool, P.accent, "#ff9fb4"];
    for (let i = 0; i < MAXB; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.62 - i * 0.04, 0.38, 0.62 - i * 0.04), toon(colors[i % colors.length], 0.4));
      m.position.set(0.8, 0.19 + i * 0.4, 0);
      m.rotation.y = i * 0.25;
      m.scale.setScalar(0.001);
      g.add(m);
      blocks.push({ m, k: 0, on: false });
    }
    const towerGlow = glow(P.warm, 3, 0);
    towerGlow.position.set(0.8, 1.6, 0);
    g.add(towerGlow);
    let count = 2, lastAdd = 0, place = 0, done = 0;
    blocks[0].on = blocks[1].on = true;
    return {
      group: g, camera: { r: 6.8, y: 2.2, target: [0, 1.2, 0] },
      update(T, dt, A, now, R) {
        if (!lastAdd) lastAdd = now;
        if (((A.beat && now - lastAdd > 2000) || now - lastAdd > 4200) && count < MAXB && !done) {
          lastAdd = now; blocks[count].on = true; count++; place = 1;
        }
        place = Math.max(0, place - dt * 1.6);
        being.arms(-0.4 + place * 1.6 * (0.5 + 0.5 * R), -0.4 + Math.sin(T * 1.4) * 0.2 * R);
        being.bob.position.y = Math.sin(T * 1.6) * 0.04 + place * 0.1 * R;
        being.bob.rotation.z = -place * 0.15 * R + Math.sin(T * 0.8) * 0.04;
        being.ring.rotation.z += dt * 0.5;
        blocks.forEach((b) => {
          if (b.on) b.k = Math.min(1, b.k + dt * 2.2);
          else b.k = Math.max(0, b.k - dt * 0.8);
          const s = b.k < 1 ? ease(b.k) * (1 + Math.sin(b.k * Math.PI) * 0.25) : 1;
          b.m.scale.setScalar(Math.max(0.001, s));
        });
        if (count >= MAXB && !done) done = now;
        towerGlow.material.opacity = done ? 0.6 + Math.sin(T * 2) * 0.15 : count / MAXB * 0.25;
        if (done && now - done > 7000) {
          blocks.forEach((b) => { b.on = false; });
          if (blocks.every((b) => b.k === 0)) { count = 0; done = 0; }
        }
        being.face.update(now);
      },
      face: being.root
    };
  };

  BUILD.regeneration = (P) => {
    const g = new THREE.Group();
    const isl = island(P.ground);
    g.add(isl.group);
    const seed = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), toon(P.cool, 0.25));
    body.scale.set(1, 1.12, 1);
    seed.add(body);
    const sprout = new THREE.Group();
    sprout.position.y = 0.46;
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.22, 5), toon("#58b07a", 0.1));
    st.position.y = 0.1;
    sprout.add(st);
    [-1, 1].forEach((s) => {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), toon("#7ad38a", 0.2));
      l.scale.set(1.4, 0.35, 0.7);
      l.position.set(s * 0.12, 0.22, 0);
      l.rotation.z = s * 0.5;
      sprout.add(l);
    });
    seed.add(sprout);
    const face = makeFace(seed, { y: 0.02, z: 0.4, size: 0.9 });
    seed.add(glow(P.cool, 2, 0.25));
    seed.position.set(0, 0.47, 0.9);
    g.add(seed);
    const ss = shadowBlob(0.45);
    ss.position.set(0, 0.012, 0.9);
    g.add(ss);
    // arbre qui grandit
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 1.4, 7), toon("#a8754f", 0.1));
    trunk.position.y = 0.7;
    tree.add(trunk);
    const canopy = [];
    [[0, 1.65, 0, 0.62], [-0.45, 1.4, 0.1, 0.42], [0.45, 1.45, -0.05, 0.45], [0.05, 1.3, 0.4, 0.4]].forEach(([x, y, z, r], i) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), toon(i % 2 ? "#7ad38a" : P.cool, 0.15));
      m.position.set(x, y, z);
      tree.add(m);
      canopy.push(m);
    });
    const blossoms = [];
    for (let i = 0; i < 9; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), toon(i % 2 ? P.warm : "#ffb3c7", 0.6));
      const a = rand(0, Math.PI * 2), r = rand(0.35, 0.7);
      b.position.set(Math.cos(a) * r, rand(1.25, 2.1), Math.sin(a) * r);
      tree.add(b);
      blossoms.push(b);
    }
    tree.position.set(0, 0, -0.5);
    g.add(tree);
    const tufts = [];
    for (let i = 0; i < 14; i++) {
      const f = makeFlower(i % 2 ? P.warm : "#ffffff", P.accent, rand(0.6, 1));
      const a = rand(0, Math.PI * 2), r = rand(1.5, 3.6);
      f.group.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      f.at = rand(0.1, 0.85);
      g.add(f.group);
      tufts.push(f);
    }
    let hop = 0;
    return {
      group: g, camera: { r: 6.3, y: 2.0, target: [0, 1.0, 0] },
      update(T, dt, A, now, R) {
        const prog = Math.max(0.08, A.progress);
        const tk = ease(Math.min(1, prog * 1.6));
        tree.scale.set(0.25 + tk * 0.75, 0.15 + tk * 0.85, 0.25 + tk * 0.75);
        canopy.forEach((c, i) => c.scale.setScalar(1 + Math.sin(T * 0.8 + i) * 0.03));
        blossoms.forEach((b, i) => b.scale.setScalar(Math.max(0.001, ease(Math.max(0, Math.min(1, (prog - 0.5 - i * 0.03) * 5))))));
        tree.rotation.z = Math.sin(T * 0.5) * 0.02;
        tufts.forEach((f, i) => {
          f.group.scale.setScalar(Math.max(0.001, ease(Math.max(0, Math.min(1, (prog - f.at) * 5)))));
          f.head.rotation.z = Math.sin(T + i) * 0.12;
        });
        if (A.beat) hop = 1;
        hop = Math.max(0, hop - dt * 2);
        seed.position.y = 0.47 + Math.sin((1 - hop) * Math.PI) * 0.16 * A.level * R;
        sprout.rotation.z = Math.sin(T * 1.3) * 0.25 * R;
        face.update(now);
      },
      face: seed
    };
  };

  BUILD.jeu = (P) => {
    const g = new THREE.Group();
    const isl = island(P.ground);
    g.add(isl.group);
    const ball = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), toon(P.cool, 0.25));
    ball.add(body);
    const face = makeFace(ball, { y: 0.04, z: 0.47 });
    ball.add(glow(P.cool, 2.2, 0.28));
    g.add(ball);
    const sh = shadowBlob(0.55);
    g.add(sh);
    const toys = [];
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), toon(i === 1 ? P.accent : P.warm, 0.35));
      m.userData.a = (i / 3) * Math.PI * 2;
      g.add(m);
      toys.push(m);
    }
    const CN = 40;
    const conf = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.09, 0.14), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), CN);
    const cd = [];
    const pal = [P.warm, P.cool, P.accent, "#ff9fb4"].map(C);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < CN; i++) {
      conf.setColorAt(i, pal[i % pal.length]);
      cd.push({ p: new THREE.Vector3(0, -5, 0), v: new THREE.Vector3(), r: rand(0, 6), life: 0 });
    }
    conf.instanceColor.needsUpdate = true;
    g.add(conf);
    let hopT = 0, hopH = 0.35, ci = 0;
    const hidden = new THREE.Vector3(0, -9, 0), up = new THREE.Vector3(0, 0.5, 0);
    return {
      group: g, camera: { r: 7.0, y: 2.0, target: [0, 0.9, 0] },
      update(T, dt, A, now, R) {
        hopT += dt * (1.1 + A.level * 0.6);
        if (hopT >= 1) { hopT -= 1; hopH = (A.pulse > 0.4 ? 0.75 : 0.35) * (0.4 + 0.6 * R); }
        const y = Math.sin(hopT * Math.PI) * hopH;
        const land = hopT < 0.12 ? 1 - hopT / 0.12 : hopT > 0.9 ? (hopT - 0.9) / 0.1 : 0;
        const sq = 1 - land * 0.18 * R, st = 1 + Math.sin(hopT * Math.PI) * 0.06 * R;
        const a = T * 0.25;
        ball.position.set(Math.cos(a) * 0.8, 0.5 + y, Math.sin(a) * 0.8);
        ball.scale.set(1 / Math.sqrt(sq * st), sq * st, 1 / Math.sqrt(sq * st));
        ball.rotation.z = Math.sin(T * 1.5) * 0.1 * R;
        sh.position.set(ball.position.x, 0.012, ball.position.z);
        sh.scale.setScalar(1 - y * 0.4);
        toys.forEach((m, i) => {
          const u = (T * 0.9 + i * 0.33) % 1;
          const aa = m.userData.a + T * 0.2;
          m.position.set(Math.cos(aa) * 2.4, 0.16 + Math.abs(Math.sin(u * Math.PI)) * 0.5, Math.sin(aa) * 2.4);
        });
        if (A.beat && A.pulse > 0.5) {
          for (let k = 0; k < 6; k++) {
            const c = cd[ci++ % CN];
            c.p.copy(ball.position).add(up);
            c.v.set(rand(-1.2, 1.2), rand(1.6, 2.6), rand(-1.2, 1.2)).multiplyScalar(0.5 + 0.5 * R);
            c.life = 1;
          }
        }
        cd.forEach((c, i) => {
          if (c.life > 0) {
            c.life -= dt * 0.5;
            c.v.y -= dt * 2.2;
            c.v.multiplyScalar(0.985);
            c.p.addScaledVector(c.v, dt);
            if (c.p.y < 0.03) { c.p.y = 0.03; c.v.set(0, 0, 0); }
            c.r += dt * 4;
          }
          dummy.position.copy(c.life > 0 ? c.p : hidden);
          dummy.rotation.set(c.r, c.r * 0.7, 0);
          dummy.scale.setScalar(c.life > 0 ? Math.min(1, c.life * 3) : 0.001);
          dummy.updateMatrix();
          conf.setMatrixAt(i, dummy.matrix);
        });
        conf.instanceMatrix.needsUpdate = true;
        face.update(now);
      },
      face: ball
    };
  };

  /* ———————— gestion des thèmes, caméra, rendu ———————— */
  const FALLBACK = { sky: ["#0d2a4a", "#e9a15a", "#3a2a3a"], sun: "#ffc27a", cool: "#7EB6D9", warm: "#F6C66A", accent: "#FDE68A", ground: "#2d5b6b", night: 0.35 };
  let active = null, activeId = null;
  const cam = { az: 0.3, el: 0.26, r: 7.2, target: new THREE.Vector3(0, 1, 0), userAz: 0, userEl: 0, vel: 0, dragging: false, lastUser: 0 };

  function disposeGroup(obj) {
    obj.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    });
  }

  function applyPalette(P) {
    skyU.top.value.set(P.sky[0]);
    skyU.horizon.value.set(P.sky[1]);
    skyU.bottom.value.set(P.sky[2]);
    skyU.sunColor.value.set(P.sun);
    skyU.sunAmt.value = 0.85 - (P.night || 0) * 0.55;
    sc.fog.color.set(P.sky[2]).lerp(C(P.sky[1]), 0.5);
    starMat.opacity = 0.15 + (P.night || 0) * 0.85;
    hemi.color.set(P.cool);
    hemi.groundColor.set(P.warm);
    hemi.intensity = 0.9 + (1 - (P.night || 0)) * 0.4;
    sun.color.set(P.sun);
    sun.intensity = 2.3 - (P.night || 0) * 1.2;
    rim.color.set(P.cool);
  }

  function build(id, def) {
    const P = Object.assign({}, FALLBACK, def || {});
    const maker = BUILD[id] || BUILD.lumiere;
    if (active) { sc.remove(active.group); disposeGroup(active.group); }
    applyPalette(P);
    active = maker(P);
    activeId = id;
    sc.add(active.group);
    const c = active.camera;
    cam.r = c.r * (aspect < 0.8 ? 1.3 : 1);
    cam.baseY = c.y;
    cam.target.set(c.target[0], c.target[1], c.target[2]);
    T0 = performance.now();
  }

  let fadeTimer = 0;
  const fadeEl = document.createElement("div");
  fadeEl.className = "s3d-fade";
  stage.appendChild(fadeEl);
  function setTheme(id, def) {
    if (id === activeId && active) return;
    clearTimeout(fadeTimer);
    const ms = isReduced() ? 250 : 900;
    fadeEl.style.transitionDuration = ms + "ms";
    fadeEl.classList.add("is-on");
    fadeTimer = setTimeout(() => {
      build(id, def);
      requestAnimationFrame(() => fadeEl.classList.remove("is-on"));
    }, ms);
  }

  /* glisser pour tourner */
  let lastX = 0, lastY = 0, pid = null;
  canvas.addEventListener("pointerdown", (e) => {
    pid = e.pointerId; lastX = e.clientX; lastY = e.clientY; cam.dragging = true; cam.vel = 0;
    try { canvas.setPointerCapture(pid); } catch (er) {}
    if (el.dragHint) el.dragHint.classList.add("is-gone");
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!cam.dragging || e.pointerId !== pid) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    cam.userAz -= dx * 0.008;
    cam.vel = -dx * 0.008;
    if (e.pointerType === "mouse") cam.userEl = Math.max(-0.2, Math.min(0.5, cam.userEl + dy * 0.004));
    cam.lastUser = performance.now();
  });
  const endDrag = () => { cam.dragging = false; pid = null; cam.lastUser = performance.now(); };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  let aspect = 1;
  function resize() {
    const w = stage.clientWidth || 320, h = stage.clientHeight || 240;
    aspect = w / h;
    renderer.setSize(w, h, false);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  resize();

  let raf = 0, last = 0, T0 = performance.now(), visible = true, onScreen = true;
  const faceTmp = new THREE.Vector3();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    const R = isReduced() ? 0.4 : 1;
    const A = sampleLevel(now);
    const T = (now - T0) / 1000;
    // caméra : lente dérive + glisser (inertie)
    if (!cam.dragging) {
      cam.userAz += cam.vel;
      cam.vel *= 0.92;
    }
    cam.az += dt * (isReduced() ? 0.012 : 0.035);
    const az = cam.az + cam.userAz + Math.sin(T * 0.05) * 0.3 * R;
    const elv = Math.max(0.05, cam.el + cam.userEl + Math.sin(T * 0.07) * 0.05 * R);
    const r = cam.r * (1 + Math.sin(T * 0.06) * 0.04 * R);
    const ty = cam.target.y + ((cam.baseY || 2) - 2) * 0.6;
    camera.position.set(cam.target.x + Math.sin(az) * Math.cos(elv) * r, ty + Math.sin(elv) * r + 0.6, cam.target.z + Math.cos(az) * Math.cos(elv) * r);
    camera.lookAt(cam.target);
    if (active) {
      active.update(T, dt, A, now, R);
      // le personnage se tourne doucement vers la caméra (geste expressif)
      [active.face, active.face2].forEach((f) => {
        if (!f) return;
        f.getWorldPosition(faceTmp);
        const want = Math.atan2(camera.position.x - faceTmp.x, camera.position.z - faceTmp.z);
        let d = want - f.rotation.y;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        f.rotation.y += d * Math.min(1, dt * 1.2);
      });
    }
    stars.rotation.y += dt * 0.004;
    renderer.render(sc, camera);
  }
  function start() { if (!raf && visible && onScreen) { last = 0; raf = requestAnimationFrame(frame); } }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; visible ? start() : stop(); });
  if (window.IntersectionObserver) {
    new IntersectionObserver((ents) => { onScreen = ents[0].isIntersecting; onScreen ? start() : stop(); }).observe(stage);
  }

  return { setTheme, build, start, stop, renderer };
}

/* ———————————————————— Démarrage ———————————————————— */
function refreshTexts() {
  if (current) {
    const th = themeFor(current);
    renderNowPlaying(current, th);
    updateChip(th);
  } else {
    updateChip(themeFor(null));
  }
}

function bindUi() {
  if (el.launch) el.launch.addEventListener("click", launch);
  if (el.next) el.next.addEventListener("click", launch);
  bindAudio();
  if (window.EdenI18n && window.EdenI18n.onChange) {
    let prevLang = siteLang();
    window.EdenI18n.onChange((lang) => {
      if (lang !== prevLang) {
        prevLang = lang;
        // chansons de la langue du site seulement : on repart au calme
        stopPlayback();
        current = null;
        if (el.player) el.player.hidden = true;
        if (el.launch) el.launch.hidden = false;
        if (el.next) el.next.hidden = true;
        if (el.empty) el.empty.hidden = true;
        setHint("scene.hintIdle");
        const th = themeFor(null);
        if (scene) scene.setTheme(th.id, th.def);
      }
      refreshTexts();
    });
  }
}

async function loadJson(url) {
  const r = await fetch(url, { cache: "no-cache" });
  if (!r.ok) throw new Error(url);
  return r.json();
}

async function boot() {
  bindUi();
  const dataP = Promise.all([
    loadJson(TRACKS_URL).then((j) => { tracks = (j && j.tracks) || []; }).catch(() => { tracks = []; }),
    loadJson(THEMES_URL).then((j) => { themesData = j; }).catch(() => { themesData = null; })
  ]);

  if (!webglAvailable() || !el.canvas || !el.stage) {
    showFallback();
    await dataP;
    refreshTexts();
    return;
  }
  try {
    const [THREE] = await Promise.all([import(THREE_URL), dataP]);
    scene = createScene(THREE, el.canvas, el.stage);
    const th = current ? themeFor(current) : themeFor(null);
    scene.build(th.id, th.def);
    scene.start();
    if (el.loading) el.loading.hidden = true;
    refreshTexts();
    window.EdenScene3D = {
      scene, themeFor,
      get current() { return current; },
      playById(id) { const tr = poolForLang().find((x) => x.id === id); if (tr) playTrack(tr); return !!tr; }
    };
  } catch (e) {
    console.warn("[scene-3d] 3D indisponible :", e && e.message);
    scene = null;
    showFallback();
    await dataP;
    refreshTexts();
  }
}

boot();
