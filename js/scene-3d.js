/* Eden Yours — Danse des Êtres de Lumière : corps de lumière sans sexe dansant dans un paysage 3D (three.js, sans build).
   - Une chanson au hasard dans la langue du site (tracks.json), sans répéter la dernière (sessionStorage).
   - Un décor par chanson (data/scene-3d-themes.json) : un personnage principal, une paire chaud/froid,
     lumière dorée de lever/coucher de soleil, mouvements lents, petits gestes, fondus doux.
   - MP3 : intensité pilotée par un AnalyserNode Web Audio (règle freemium 30 s si la bibliothèque est verrouillée).
     Embed Suno : rythme doux minuté.
   - Mobile : low poly, pixel ratio ≤ 2, rendu en pause si l'onglet est caché ou la scène hors écran.
   - prefers-reduced-motion : mouvements plus doux ; repli si WebGL indisponible. */

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
  const n = Number(cfg.FREE_PREVIEW_SECONDS != null ? cfg.FREE_PREVIEW_SECONDS : cfg.previewSeconds);
  return Number.isFinite(n) && n > 0 ? n : Infinity;
}
function isUnlocked() {
  if (previewLimit() === Infinity) return true;
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
    if (el.previewNote && previewLimit() === Infinity) el.previewNote.hidden = false; // mention douce, non bloquante
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
    const [{ createRealScene }] = await Promise.all([import("./eden-real.js?v=20261011a"), dataP]);
    scene = await createRealScene(el.canvas, el.stage, { isReduced, sampleLevel, dragHint: el.dragHint });
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
