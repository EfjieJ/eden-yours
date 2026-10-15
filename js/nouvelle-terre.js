/* Eden Yours — Bâtis la Nouvelle Terre / Build the New Earth.
   Vue depuis la colline : une mini-Terre flotte au-dessus du lac. La planète naît de la nature et de l'esprit : le joueur envoie trois souffles
   (Lumière, Vent, Sève — des feux follets lumineux) sur des points lumineux : graines de lumière, oiseaux de lumière, racines dorées, forêts,
   cascades, halos. Chaque geste change la planète. Planète vivante : tout s'anime dans le canvas et une chanson de la langue de la page joue
   EN ENTIER (EdenFullSong / embed). Toucher/glisser, souris, clavier (Entrée sur un souffle = geste suivant). */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $("nt-canvas"), stage = $("nt-stage"), ghost = $("nt-ghost"), overlay = $("nt-overlay"), startBtn = $("nt-start"), againBtn = $("nt-again"),
    statusEl = $("nt-status"), scoreEl = $("nt-score"), hintEl = $("nt-hint"), liveEl = $("nt-live"), instrEl = $("nt-instr"), trayEl = $("nt-tray"), stepsEl = $("nt-steps"),
    progEl = $("nt-progress"), progFill = $("nt-progress-fill"), winEl = $("nt-win"), playerBox = $("nt-player"), nowEl = $("nt-now-playing"), embedBox = $("nt-embed"),
    audio = $("nt-audio"), listenBtn = $("nt-listen"), emptyBox = $("nt-empty"), card = $("nt-card");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var IW = 1280, IH = 720, CX = 848, CY = 290, R = 226, CX6 = 818, CY6 = 294;
  var LEVELS = [
    { id: 1, sim: [13, 20], steps: [
      { id: "seeds", fx: "seeds", r: 92, pts: [[918, 140], [998, 250], [918, 335]] },
      { id: "birds", fx: "birds", r: 60, pts: [[663, 137], [1075, 225], [607, 306]] },
      { id: "roots", fx: "roots", r: 70, pts: [[893, 92], [961, 168], [998, 290]] },
      { id: "forest", fx: "forest", r: 120, pts: [[713, 200], [813, 250], [713, 330]] },
      { id: "water", fx: "water", r: 80, pts: [[737, 340], [819, 300], [737, 465]] },
      { id: "halos", fx: "rings", r: 0, pts: [[613, 300], [1093, 300], [848, 470]] }] },
    { id: 2, sim: [33, 40], steps: [
      { id: "seas", fx: "water", pts: [[773, 230], [893, 335], [748, 395]] },
      { id: "clouds", fx: "cloud", pts: [[713, 175], [873, 160], [943, 280]] },
      { id: "rain", fx: "water", pts: [[703, 250], [863, 225], [928, 330]] }] },
    { id: 3, sim: [53, 60], steps: [
      { id: "oxygen", fx: "forest", pts: [[703, 300], [798, 215], [858, 380]] },
      { id: "halo", fx: "glow", pts: [[848, 72], [631, 290], [1065, 300]] },
      { id: "sky", fx: "glow", pts: [[493, 120], [573, 50], [1203, 80]] }] },
    { id: 4, sim: [73, 80], steps: [
      { id: "daynight", fx: "glow", pts: [[663, 190], [848, 95], [1033, 240]] },
      { id: "life", fx: "forest", pts: [[733, 260], [813, 335], [893, 205]] },
      { id: "moon", fx: "glow", pts: [[1183, 110], [1203, 210], [483, 110]] }] },
    { id: 5, sim: [93, 96], steps: [
      { id: "springs", fx: "glow", pts: [[773, 160], [943, 240], [793, 380]] },
      { id: "auroras", fx: "glow", pts: [[803, 100], [903, 105], [848, 482]] },
      { id: "breath", fx: "glow", pts: [[603, 200], [1093, 380], [848, 290]] }] },
    { id: 6, sim: [96, 100], steps: [
      { id: "bubble", fx: "glow", pts: [[905, 200], [1095, 200], [1000, 275]] },
      { id: "board", fx: "glow", pts: [[478, 520], [300, 600], [420, 640]] },
      { id: "rise", fx: "glow", pts: [[905, 470], [1030, 470], [1000, 330]] }] }
  ];
  var AUTO = 4, LAST = LEVELS.length - 1, LAND = [[700, 200], [690, 300], [722, 410]], boards = [], departAt = 0, landedAt = 0;
  var WALK = 6.5;
  function boardDone() { return boards.length >= 3 && performance.now() - boards[2] > (4 * 0.8 + WALK) * 1000 && performance.now() - boards[0] > (2 * 0.7 + WALK) * 1000 && performance.now() - boards[1] > (4 * 0.8 + WALK) * 1000; }
  var waitShown = false;
  var ORB = { x: 1000, y: 200 }, PATH = [[680, 600], [790, 592], [870, 572], [920, 545], [955, 515]];
  function D(l, id, k) { if (l < lvl) return true; if (l > lvl) return false; var i = -1; LEVELS[l].steps.forEach(function (s, q) { if (s.id === id) i = q; }); return !!done[i + ":" + k]; }
  var lvl = 0, STEPS = LEVELS[0].steps, TOTAL = 18, unlocked = 1, autoStart = 0, autoVal = 0;
  function S(l, id) { var L = LEVELS[l]; if (!L) return 0; if (l < lvl) return 3; if (l > lvl) return 0; var i = -1; L.steps.forEach(function (s, k) { if (s.id === id) i = k; }); if (i < 0) return 0;
    var n = 0; for (var k = 0; k < 3; k++) if (done[i + ":" + k]) n++; return n; }
  function A(l, id) { return S(l, id) / 3; }
  var SPIRITS = ["light", "wind", "sap"], SCOL = { light: "253,224,140", wind: "170,225,255", sap: "160,240,170" };
  var imgL6 = new Image(), imgP = [0, 1, 2].map(function () { return new Image(); }), imgT = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function () { return new Image(); });
  function lazyL6() { if (imgL6.src) return; imgL6.src = "assets/nouvelle-terre/nt-l6-backdrop.webp";
    imgP.forEach(function (im, i) { im.src = "assets/nouvelle-terre/nt-p" + i + ".webp"; }); imgT.forEach(function (im, i) { im.src = "assets/nouvelle-terre/nt-t" + i + ".webp"; }); }
  function ok(im) { return im.complete && im.naturalWidth > 0; }
  var imgStart = new Image(), imgFinal = new Image(), imgEarth = new Image(), loaded = 0; imgEarth.src = "assets/nouvelle-terre/nt-earth.webp";
  var maskC = document.createElement("canvas"), compC = document.createElement("canvas"); maskC.width = compC.width = IW / 2; maskC.height = compC.height = IH / 2;
  var mctx = maskC.getContext("2d"), cctx = compC.getContext("2d");
  var tracks = [], state = "idle", stepI = 0, done = {}, nDone = 0, spirits = [], selected = -1, jobs = [], blobs = [], parts = [], ringsOn = 0, ringFade = [0, 0, 0],
    song = null, ownStarted = false, compDirty = true, fullReveal = 0, finaleT = 0, t0 = performance.now(), view = { x: 0, y: 0, w: IW, h: IH }, scale = 1, dpr = 1, startedAt = 0, AC = null;
  var stars = [], seedLights = [], clouds = [], birds = [], flies = [];
  (function () { var s = 7; function r() { s = (s * 9301 + 49297) % 233280; return s / 233280; }
    for (var i = 0; i < 140; i++) { var x = r() * IW, y = r() * 380; if (Math.hypot(x - CX, y - CY) > R + 60) stars.push([x, y, 0.6 + r() * 1.4, r() * 6.3, 1 + r() * 2.5]); }
    for (var k = 0; k < 3; k++) for (var j = 0; j < 7; j++) seedLights.push([k, LEVELS[0].steps[0].pts[k][0] + (r() - 0.5) * 130, LEVELS[0].steps[0].pts[k][1] + (r() - 0.5) * 110, r() * 6.3, 1.5 + r() * 3]);
    for (var c = 0; c < 12; c++) clouds.push([r() * 6.283, (r() - 0.5) * 1.5, 18 + r() * 22, 0.05 + r() * 0.08, Math.floor(c / 4)]);
    for (var bd = 0; bd < 9; bd++) birds.push([r() * 6.283, 1.12 + r() * 0.35, (r() - 0.5) * 0.6, 0.25 + r() * 0.3, Math.floor(bd / 3)]);
    for (var ff = 0; ff < 26; ff++) flies.push([r() * IW, 330 + r() * 360, r() * 6.3, 0.4 + r() * 0.8, 1 + r() * 1.6]); })();

  function t(key, vars) { return window.EdenI18n && window.EdenI18n.t ? window.EdenI18n.t(key, vars) : key; }
  function siteLang() { return window.EdenSongPick ? window.EdenSongPick.lang() : (document.documentElement.lang === "en" ? "en" : "fr"); }
  function reduced() { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } }
  function say(m) { if (liveEl) { liveEl.textContent = ""; setTimeout(function () { liveEl.textContent = m; }, 30); } }
  function ls() { try { return window.localStorage; } catch (e) { return null; } }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function ease(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  /* sons */
  function ctxAudio() { try { if (!AC) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AC = new C(); } if (AC.state === "suspended" && AC.resume) (function (r) { if (r && r.catch) r.catch(function () {}); })(AC.resume()); return AC; } catch (e) { return null; } }
  function tone(freqs, gain, step, dur, type) {
    try { var c = ctxAudio(); if (!c) return; var now = c.currentTime + 0.01;
      freqs.forEach(function (f, i) { var o = c.createOscillator(), g = c.createGain(); o.type = type || "sine"; o.frequency.value = f; var a = now + i * step;
        g.gain.setValueAtTime(0.0001, a); g.gain.exponentialRampToValueAtTime(gain, a + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, a + dur); o.connect(g); g.connect(c.destination); o.start(a); o.stop(a + dur + 0.05); });
    } catch (e) {}
  }

  /* chanson : stricte par langue, variée (évite les dernières) */
  function getJSON(u) { return fetch(u, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }
  function playable() { var lang = siteLang(), list = window.EdenSongPick ? window.EdenSongPick.forLang(tracks, lang) : tracks;
    return list.filter(function (s) { return s.lang === lang && (s.audio_url || s.audio_url_aac || s.embed_url); }); }
  var RK = "eden-nt-recent";
  function readRecent(l) { try { var o = JSON.parse(ls().getItem(RK) || "{}"); return Array.isArray(o[l]) ? o[l] : []; } catch (e) { return []; } }
  function writeRecent(l, id) { try { var o = JSON.parse(ls().getItem(RK) || "{}"); var a = (o[l] || []).filter(function (x) { return x !== id; }); a.push(id); o[l] = a.slice(-6); ls().setItem(RK, JSON.stringify(o)); } catch (e) {} }
  function pickSong() { var list = playable(); if (!list.length) return null; var l = siteLang(), rec = readRecent(l), avoid = rec.slice(-Math.min(4, list.length - 1)),
      pool = list.filter(function (s) { return avoid.indexOf(s.id) < 0; }); if (!pool.length) pool = list;
    var s = window.EdenSongPick ? window.EdenSongPick.pick(pool, { record: false }) : pool[Math.floor(Math.random() * pool.length)]; if (!s || s.lang !== l) s = pool[Math.floor(Math.random() * pool.length)]; writeRecent(l, s.id); return s; }
  function clearEmbed() { embedBox.innerHTML = ""; embedBox.hidden = true; }
  function stopSong() { if (window.EdenFullSong) window.EdenFullSong.stop(audio); else try { audio.pause(); } catch (e) {} clearEmbed(); listenBtn.hidden = true; playerBox.hidden = true; ownStarted = false; }
  function playSong(s) {
    playerBox.hidden = false; nowEl.textContent = t("nt.playing", { title: s.title });
    var F = window.EdenFullSong, same = audio.getAttribute("data-id") === s.id;
    if (F && F.busy(audio) && !same && ownStarted) { F.stop(audio); clearEmbed(); }
    else if (F && F.busy(audio) && !same) { listenBtn.hidden = false; listenBtn.textContent = t("nt.listen", { title: s.title }); listenBtn.onclick = function () { listenBtn.hidden = true; F.stop(audio); startSong(s); ownStarted = true; }; return; }
    if (F && F.busy(audio) && same) return;
    startSong(s); ownStarted = true;
  }
  function startSong(s) {
    var F = window.EdenFullSong; playerBox.hidden = false; nowEl.textContent = t("nt.playing", { title: s.title });
    if (window.EdenSongPick && s.id) window.EdenSongPick.record(s.id);
    if (s.audio_url || s.audio_url_aac) { clearEmbed(); audio.hidden = false; if (F) F.play(audio, { id: s.id, audio: s.audio_url, aac: s.audio_url_aac }); else { audio.src = s.audio_url; var p = audio.play(); if (p && p.catch) p.catch(function () {}); } }
    else if (s.embed_url) { audio.hidden = true; if (F) F.embed(embedBox, { id: s.id, embed: s.embed_url, title: s.title }); }
  }

  /* souffles de la nature : feux follets lumineux (Lumière, Vent, Sève) */
  function wispSVG(i) { var c = SCOL[SPIRITS[i] || "light"];
    return '<svg viewBox="0 0 40 50" aria-hidden="true"><defs><radialGradient id="ntw' + i + '"><stop offset="0" stop-color="#fffdf4"/><stop offset="0.45" stop-color="rgb(' + c + ')"/><stop offset="1" stop-color="rgba(' + c + ',0)"/></radialGradient></defs>' +
      '<path d="M20 30 C 10 36, 12 46, 20 48 C 15 42, 22 38, 24 34" fill="none" stroke="rgba(' + c + ',0.7)" stroke-width="2.2" stroke-linecap="round"/>' +
      '<circle cx="20" cy="20" r="17" fill="url(#ntw' + i + ')"/><circle cx="20" cy="20" r="5.5" fill="#fffef6"/></svg>'; }
  function drawWisp(x, y, s, i, T) { var c = SCOL[SPIRITS[i] || "light"], tt = T || 0;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (var k = 1; k < 7; k++) { ctx.fillStyle = "rgba(" + c + "," + (0.3 - k * 0.04) + ")"; ctx.beginPath(); ctx.arc(x - Math.sin(tt * 3 + k) * k * 1.5 * s, y + k * 5 * s, (7 - k * 0.8) * s, 0, 6.283); ctx.fill(); }
    var g = ctx.createRadialGradient(x, y, 1, x, y, 20 * s); g.addColorStop(0, "rgba(255,253,240,0.95)"); g.addColorStop(0.35, "rgba(" + c + ",0.7)"); g.addColorStop(1, "rgba(" + c + ",0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 20 * s, 0, 6.283); ctx.fill(); ctx.restore(); }
  function drawLightBird(x, y, s, T, carry) { var fl = Math.sin(T * 14) * 6 * s; ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "rgba(255,236,180,0.95)"; ctx.lineWidth = 2.2 * s; ctx.shadowColor = "rgba(253,224,140,1)"; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(x - 14 * s, y - fl); ctx.quadraticCurveTo(x - 6 * s, y - 4 * s, x, y); ctx.quadraticCurveTo(x + 6 * s, y - 4 * s, x + 14 * s, y - fl); ctx.stroke();
    if (carry) { ctx.fillStyle = "rgba(255,240,190,0.95)"; ctx.beginPath(); ctx.arc(x, y + 7 * s, 3.4 * s, 0, 6.283); ctx.fill(); } ctx.restore(); }
  function renderTray() {
    trayEl.innerHTML = "";
    spirits.forEach(function (b, i) {
      var el = document.createElement("button"); el.type = "button"; el.className = "nt-spirit" + (b.busy ? " is-busy" : "") + (selected === i ? " is-selected" : "");
      el.style.setProperty("--d", (-i * 0.7) + "s"); el.setAttribute("data-spirit", i); el.setAttribute("aria-pressed", selected === i ? "true" : "false");
      el.setAttribute("aria-label", t("nt.spiritAria", { name: t("nt.spirit." + b.id) })); el.innerHTML = wispSVG(i) + "<span>" + t("nt.spirit." + b.id) + "</span>"; if (b.busy) el.disabled = true;
      bindSpirit(el, i); trayEl.appendChild(el); b.el = el;
    });
  }
  function setSpiritState(i) { var b = spirits[i], el = b.el; if (!el) return; el.classList.toggle("is-busy", b.busy); el.classList.toggle("is-selected", selected === i); el.disabled = b.busy; el.setAttribute("aria-pressed", selected === i ? "true" : "false"); }

  /* géométrie / vue */
  function layout() {
    var w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    dpr = Math.min(2, window.devicePixelRatio || 1); canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    var ar = w / h;
    if (ar > 1.6) view = { x: 0, y: 0, w: IW, h: IH };
    else { var vh = 640, vw = Math.min(IW, vh * ar), fx = lvl === LAST ? Math.max(250 + vw / 2, 1040 - vw / 2) : CX - 20; view = { x: Math.max(0, Math.min(IW - vw, fx - vw / 2)), y: lvl === LAST ? 80 : 20, w: vw, h: vh }; }
    scale = w / view.w;
  }
  function toImg(clientX, clientY) { var r = canvas.getBoundingClientRect(); return { x: view.x + (clientX - r.left) / scale, y: view.y + (clientY - r.top) / scale }; }
  function toClient(x, y) { var r = canvas.getBoundingClientRect(); return { x: r.left + (x - view.x) * scale, y: r.top + (y - view.y) * scale }; }
  function pending() { if (state !== "playing") return []; var s = STEPS[stepI]; if (s.id === "rise" && !boardDone()) return []; return s.pts.map(function (p, k) { return { k: k, x: p[0], y: p[1] }; }).filter(function (p) { return !done[stepI + ":" + p.k] && !jobs.some(function (j) { return j.step === stepI && j.k === p.k; }); }); }
  function hitTarget(ix, iy) { var best = null, bd = Math.max(44, 30 / scale); pending().forEach(function (p) { var d = Math.hypot(p.x - ix, p.y - iy); if (d < bd) { bd = d; best = p; } }); return best; }

  /* interactions */
  var drag = null;
  function bindSpirit(el, i) {
    el.addEventListener("pointerdown", function (e) { if (spirits[i].busy || state !== "playing") return; drag = { i: i, x0: e.clientX, y0: e.clientY, moved: false, id: e.pointerId }; try { el.setPointerCapture(e.pointerId); } catch (er) {} ctxAudio(); });
    el.addEventListener("pointermove", function (e) { if (!drag || drag.i !== i) return; if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 8) { drag.moved = true; ghost.innerHTML = wispSVG(i); ghost.hidden = false; }
      if (drag.moved) { var r = stage.getBoundingClientRect(); ghost.style.left = (e.clientX - r.left) + "px"; ghost.style.top = (e.clientY - r.top) + "px"; var p = toImg(e.clientX, e.clientY); drag.hover = hitTarget(p.x, p.y); } });
    el.addEventListener("pointerup", function (e) { if (!drag || drag.i !== i) return; var d = drag; drag = null; ghost.hidden = true;
      if (d.moved) { var p = toImg(e.clientX, e.clientY), tg = hitTarget(p.x, p.y); if (tg) dispatch(i, tg); else hintEl.textContent = t("nt.hintMiss"); }
      else { selected = selected === i ? -1 : i; spirits.forEach(function (_, k) { setSpiritState(k); }); hintEl.textContent = selected >= 0 ? t("nt.hintSelected", { name: t("nt.spirit." + spirits[i].id) }) : t("nt.hintPlay"); } });
    el.addEventListener("pointercancel", function () { drag = null; ghost.hidden = true; });
    el.addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && !spirits[i].busy) { e.preventDefault(); var p = pending()[0]; if (p) dispatch(i, p); } });
  }
  canvas.addEventListener("pointerdown", function (e) {
    if (state !== "playing") return; ctxAudio(); var p = toImg(e.clientX, e.clientY), tg = hitTarget(p.x, p.y); if (!tg) return;
    var i = selected >= 0 && !spirits[selected].busy ? selected : spirits.findIndex(function (b) { return !b.busy; });
    if (i < 0) { hintEl.textContent = t("nt.hintBusy"); return; } dispatch(i, tg);
  });
  function dispatch(i, tg) {
    var b = spirits[i]; if (b.busy) return; b.busy = true; if (selected === i) selected = -1; spirits.forEach(function (_, k) { setSpiritState(k); });
    var now = performance.now(), from = { x: view.x + view.w * (0.3 + 0.2 * i), y: view.y + view.h + 40 };
    jobs.push({ sp: i, step: stepI, k: tg.k, x: tg.x, y: tg.y, t: now, from: from, bird: STEPS[stepI].fx === "birds" ? { x: tg.x < CX ? -60 : IW + 60, y: tg.y - 140 } : null });
    tone([392, 523.25], 0.05, 0.06, 0.25, "triangle");
    hintEl.textContent = t("nt.hintGo", { name: t("nt.spirit." + b.id), what: t("nt.step." + STEPS[stepI].id) });
  }
  var FLY = 1000, WORK = 1700;
  function finishJob(j) {
    var s = STEPS[j.step]; done[j.step + ":" + j.k] = 1; nDone++;
    if (s.r && lvl === 0) blobs.push({ x: j.x, y: j.y, r: s.r, t: performance.now() });
    if (s.id === "halos") { ringsOn++; }
    if (s.id === "board") boards.push(performance.now());
    var fxc = { forest: "#9ae6b4", water: "#9fe7ff", cloud: "#ffffff", glow: "#fde68a", seeds: "#fde68a", roots: "#fcd34d", birds: "#fff1c1" }[s.fx];
    burst(j.x, j.y, fxc || "#fde68a", 26);
    tone([523.25, 659.25, 783.99, 1046.5].slice(0, 2 + (nDone % 3)), 0.07, 0.07, 0.5);
    var b = spirits[j.sp]; b.busy = false; b.back = { t: performance.now(), x: j.x, y: j.y }; setSpiritState(j.sp);
    updateUI();
    if (STEPS[stepI].pts.every(function (_, k) { return done[stepI + ":" + k]; })) {
      if (stepI < STEPS.length - 1) { stepI++; say(t("nt.stepDone", { n: stepI, next: t("nt.step." + STEPS[stepI].id) })); tone([659.25, 783.99, 987.77, 1318.5], 0.08, 0.09, 0.7); updateUI(); }
      else if (lvl === LAST) { state = "flying"; departAt = performance.now(); rumble(); trayEl.hidden = true; updateUI(); setTimeout(function () { if (state === "flying") win(); }, 8200); }
      else win();
    }
  }
  function burst(x, y, col, n) { for (var i = 0; i < n; i++) { var a = rnd(0, 6.283), v = rnd(30, 140); parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: rnd(0.5, 1.1), age: 0, col: col, s: rnd(1.2, 3) }); } }

  /* rendu */
  function rebuildComp(now) {
    mctx.clearRect(0, 0, maskC.width, maskC.height); var k = 0.5, anim = false;
    blobs.forEach(function (b) { var p = ease((now - b.t) / 900); if (p < 1) anim = true; var rr = b.r * (0.25 + 0.75 * p) * k;
      var g = mctx.createRadialGradient(b.x * k, b.y * k, rr * 0.35, b.x * k, b.y * k, rr); g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)"); mctx.fillStyle = g; mctx.beginPath(); mctx.arc(b.x * k, b.y * k, rr, 0, 6.283); mctx.fill(); });
    if (fullReveal) { var f = ease((now - fullReveal) / 1800); if (f < 1) anim = true; var rr2 = (60 + f * 900) * k, g2 = mctx.createRadialGradient(CX * k, CY * k, rr2 * 0.6, CX * k, CY * k, rr2); g2.addColorStop(0, "rgba(0,0,0,1)"); g2.addColorStop(1, "rgba(0,0,0,0)"); mctx.fillStyle = g2; mctx.fillRect(0, 0, maskC.width, maskC.height); }
    cctx.globalCompositeOperation = "source-over"; cctx.clearRect(0, 0, compC.width, compC.height); cctx.drawImage(imgFinal, 0, 0, compC.width, compC.height);
    cctx.globalCompositeOperation = "destination-in"; cctx.drawImage(maskC, 0, 0); cctx.globalCompositeOperation = "source-over";
    compDirty = anim;
  }
  function ringGeom(i) { return [[R * 1.42, R * 0.34, -0.3, "253,220,140", 1], [R * 1.66, R * 0.42, -0.2, "160,220,255", -0.6], [R * 1.24, R * 0.3, 0.42, "255,170,220", 1.5]][i]; }
  function drawRings(T, back) {
    for (var i = 0; i < 3; i++) { var a = ringFade[i]; if (a <= 0.01) continue; var g = ringGeom(i), rx = g[0], ry = g[1], rot = g[2], c = Math.cos(rot), s = Math.sin(rot);
      ctx.save(); if (back) { ctx.beginPath(); ctx.rect(0, 0, IW, IH); ctx.arc(CX, CY, R + 2, 0, 6.283, true); ctx.clip("evenodd"); }
      ctx.lineWidth = 2.6; ctx.shadowColor = "rgba(" + g[3] + ",0.9)"; ctx.shadowBlur = 10; var N = 120;
      for (var k = 0; k < N; k++) { var th = k / N * 6.283, th2 = (k + 1) / N * 6.283; if ((Math.sin(th) < 0) !== back) continue;
        var dash = Math.sin(th * 24 - T * g[4] * 3) > -0.2; ctx.strokeStyle = "rgba(" + g[3] + "," + (a * (dash ? 0.85 : 0.25)) + ")";
        var x1 = rx * Math.cos(th), y1 = ry * Math.sin(th), x2 = rx * Math.cos(th2), y2 = ry * Math.sin(th2);
        ctx.beginPath(); ctx.moveTo(CX + x1 * c - y1 * s, CY + x1 * s + y1 * c); ctx.lineTo(CX + x2 * c - y2 * s, CY + x2 * s + y2 * c); ctx.stroke(); }
      for (var j = 0; j < 4; j++) { var th0 = (j / 4 * 6.283 + T * 0.35 * g[4]) % 6.283; if (th0 < 0) th0 += 6.283; if ((Math.sin(th0) < 0) !== back) continue; var x = rx * Math.cos(th0), y = ry * Math.sin(th0);
        ctx.fillStyle = "rgba(255,255,240," + a + ")"; ctx.beginPath(); ctx.arc(CX + x * c - y * s, CY + x * s + y * c, 4, 0, 6.283); ctx.fill(); }
      ctx.restore(); }
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (loaded < 2 || !canvas.width) return;
    var T = (now - t0) / 1000, dt = Math.min(0.05, (now - (frame.last || now)) / 1000); frame.last = now;
    ringsOn = lvl > 0 ? 3 : ringsOn; for (var i = 0; i < 3; i++) ringFade[i] += ((i < ringsOn ? 1 : 0) - ringFade[i]) * Math.min(1, dt * 2.5);
    if (compDirty || blobs.some(function (b) { return now - b.t < 950; }) || (fullReveal && now - fullReveal < 1900)) rebuildComp(now);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, -view.x * dpr * scale, -view.y * dpr * scale);
    var zoom = state === "won" ? 1 + 0.025 * (1 - Math.cos(T * 0.6)) : 1;
    if (zoom !== 1) { ctx.translate(CX, CY); ctx.scale(zoom, zoom); ctx.translate(-CX, -CY); }
    if (lvl === LAST && ok(imgL6)) ctx.drawImage(imgL6, 0, 0, IW, IH); else { ctx.drawImage(imgStart, 0, 0, IW, IH); ctx.drawImage(compC, 0, 0, IW, IH); }
    // étoiles
    var L6 = lvl === LAST;
    stars.forEach(function (s) { if (L6 && s[0] > 860) return; var a = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(T * s[4] + s[3])); ctx.fillStyle = "rgba(255,250,235," + a + ")"; ctx.beginPath(); ctx.arc(s[0], s[1], s[2], 0, 6.283); ctx.fill(); });
    if (!L6) drawRings(T, true);
    // graines de lumière (persistantes)
    if (!L6) seedLights.forEach(function (l) { if (!(lvl > 0 || done["0:" + l[0]])) return; var a = 0.5 + 0.5 * Math.sin(T * l[4] + l[3]); if (a < 0.3) return; ctx.fillStyle = "rgba(255,214,140," + a + ")"; ctx.beginPath(); ctx.arc(l[1], l[2], 2.4, 0, 6.283); ctx.fill(); });
    // oiseaux de lumière qui veillent sur leurs points
    if (!L6) LEVELS[0].steps[1].pts.forEach(function (p, k) { if (!(lvl > 0 || done["1:" + k])) return; var an = T * (0.9 + k * 0.2) + k * 2; drawLightBird(p[0] + Math.cos(an) * 26, p[1] + Math.sin(an) * 10 - 8, 0.7, T + k, false); });
    // racines dorées : pulsations de sève lumineuse
    if (!L6) LEVELS[0].steps[2].pts.forEach(function (p, k) { if (!(lvl > 0 || done["2:" + k])) return; ctx.save(); ctx.globalCompositeOperation = "lighter";
      for (var v = 0; v < 3; v++) { var a0 = k * 2.1 + v * 2.09, x1 = p[0] + Math.cos(a0) * 46, y1 = p[1] + Math.sin(a0) * 34, cxp = p[0] + Math.cos(a0 + 0.9) * 30, cyp = p[1] + Math.sin(a0 + 0.9) * 26;
        ctx.strokeStyle = "rgba(253,214,120,0.35)"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.quadraticCurveTo(cxp, cyp, x1, y1); ctx.stroke();
        var u = (T * 0.5 + v * 0.33 + k * 0.2) % 1, qx = (1 - u) * (1 - u) * p[0] + 2 * (1 - u) * u * cxp + u * u * x1, qy = (1 - u) * (1 - u) * p[1] + 2 * (1 - u) * u * cyp + u * u * y1;
        ctx.fillStyle = "rgba(255,236,170," + (0.9 - u * 0.6) + ")"; ctx.beginPath(); ctx.arc(qx, qy, 2.6, 0, 6.283); ctx.fill(); } ctx.restore(); });
    // cascades
    var nW = lvl > 0 ? 3 : [0, 1, 2].filter(function (k) { return done["4:" + k]; }).length;
    if (nW && !L6) { ctx.save(); for (var y = 325; y < 500; y += 3) { var a2 = 0.12 + 0.14 * Math.sin(y / 7 - T * 9); ctx.fillStyle = "rgba(200,240,255," + Math.max(0, a2) * Math.min(1, nW / 1.5) + ")"; ctx.fillRect(717 + Math.sin(y * 0.3 + T * 5) * 1.5, y, 10, 2); }
      if (nW > 1) for (var y2 = 300; y2 < 345; y2 += 3) { ctx.fillStyle = "rgba(200,240,255," + Math.max(0, 0.1 + 0.12 * Math.sin(y2 / 6 - T * 9)) + ")"; ctx.fillRect(803, y2, 6, 2); }
      ctx.restore(); }
    drawWorld(T, now, dt);
    // cibles de l'étape
    pending().forEach(function (p, idx) { var pulse = 0.5 + 0.5 * Math.sin(T * 4 + idx), rr = 15 + pulse * 6, hov = drag && drag.hover && drag.hover.k === p.k;
      ctx.save(); ctx.shadowColor = "rgba(253,230,138,0.95)"; ctx.shadowBlur = 16; ctx.strokeStyle = hov ? "rgba(154,230,180,1)" : "rgba(253,230,138," + (0.6 + 0.4 * pulse) + ")"; ctx.lineWidth = hov ? 4 : 2.6;
      ctx.beginPath(); ctx.arc(p.x, p.y, hov ? rr + 6 : rr, 0, 6.283); ctx.stroke(); ctx.fillStyle = "rgba(255,248,220," + (0.35 + 0.3 * pulse) + ")"; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, 6.283); ctx.fill(); ctx.restore(); });
    // missions en cours
    for (var q = jobs.length - 1; q >= 0; q--) { var j = jobs[q], u = now - j.t, sid = STEPS[j.step].fx;
      if (u < FLY) { var e = ease(u / FLY), bx = j.from.x + (j.x - j.from.x) * e, by = j.from.y + (j.y + 18 - j.from.y) * e - Math.sin(e * 3.1416) * 60; drawWisp(bx, by, 1.05, j.sp, T); }
      else { var w = (u - FLY) / WORK, bob = Math.sin(u / 160) * 1.5; drawWisp(j.x - 18, j.y + 10 + bob, 0.9, j.sp, T);
        if (sid === "seeds") { ctx.save(); ctx.globalCompositeOperation = "lighter"; var gr = ctx.createRadialGradient(j.x, j.y, 1, j.x, j.y, 10 + 40 * w); gr.addColorStop(0, "rgba(255,236,170," + 0.6 * w + ")"); gr.addColorStop(1, "rgba(255,236,170,0)"); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(j.x, j.y, 10 + 40 * w, 0, 6.283); ctx.fill(); ctx.restore();
          if (Math.random() < 0.7) parts.push({ x: j.x - 18 + rnd(-6, 6), y: j.y + 4, vx: rnd(-10, 25), vy: rnd(10, 50), life: 0.7, age: 0, col: "#fde68a", s: rnd(1.4, 2.6) }); }
        if (sid === "birds" && j.bird) { var sp = Math.min(1, w * 1.6), sx = j.bird.x + (j.x - j.bird.x) * ease(sp), sy2 = j.bird.y + (j.y - 26 - j.bird.y) * ease(sp) - Math.sin(sp * 3.1416) * 30;
          drawLightBird(sx, sy2, 1.2, T, sp < 1); if (sp >= 1) { var dy = j.y - 19 + 19 * ease((w - 0.62) / 0.3); ctx.save(); ctx.shadowColor = "#fde68a"; ctx.shadowBlur = 14; ctx.fillStyle = "rgba(255,240,190,0.95)"; ctx.beginPath(); ctx.arc(j.x, dy, 4, 0, 6.283); ctx.fill(); ctx.restore(); } }
        if (sid === "roots") { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "rgba(253,214,120,0.85)"; ctx.lineWidth = 2; ctx.shadowColor = "rgba(253,214,120,1)"; ctx.shadowBlur = 10;
          for (var v2 = 0; v2 < 4; v2++) { var a1 = v2 * 1.57 + 0.4, L1 = 54 * w; ctx.beginPath(); ctx.moveTo(j.x, j.y); ctx.quadraticCurveTo(j.x + Math.cos(a1 + 0.8) * L1 * 0.6, j.y + Math.sin(a1 + 0.8) * L1 * 0.6, j.x + Math.cos(a1) * L1, j.y + Math.sin(a1) * L1 * 0.8); ctx.stroke(); } ctx.restore();
          if (Math.random() < 0.5) parts.push({ x: j.x + rnd(-30, 30), y: j.y + rnd(-20, 20), vx: rnd(-10, 10), vy: rnd(-25, -5), life: 0.9, age: 0, col: "#fcd34d", s: 1.5, up: 1 }); }
        if (sid === "forest" && Math.random() < 0.6) parts.push({ x: j.x + rnd(-40, 40), y: j.y + rnd(-20, 30), vx: rnd(-10, 10), vy: rnd(-40, -15), life: 1, age: 0, col: Math.random() < 0.5 ? "#9ae6b4" : "#d9f99d", s: rnd(1.5, 3) });
        if (sid === "water" && Math.random() < 0.7) parts.push({ x: j.x + rnd(-6, 6), y: j.y - 10, vx: rnd(-8, 8), vy: rnd(40, 120), life: 0.9, age: 0, col: "#bdefff", s: rnd(1.2, 2.4) });
        if (sid === "board") { for (var wk = 0; wk < 5; wk++) { var ph = (w * 1.6 - wk * 0.22); if (ph < 0 || ph > 1) continue; drawPerson(j.x - 120 + ph * 100 + wk * 2, j.y + 34 - ph * 24, wk % 3 === 2 ? 1 : 1.4, T, wk); } }
        if (sid === "cloud" && Math.random() < 0.6) parts.push({ x: j.x + rnd(-20, 20), y: j.y + rnd(-6, 6), vx: rnd(-15, 15), vy: rnd(-8, 4), life: 1, age: 0, col: "rgba(250,252,255,0.8)", s: rnd(3, 6), up: 1 });
        if (sid === "glow") { ctx.save(); ctx.strokeStyle = "rgba(253,230,170," + (1 - w) + ")"; ctx.lineWidth = 2; ctx.shadowColor = "#fde68a"; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(j.x, j.y, 6 + 50 * w, 0, 6.283); ctx.stroke(); ctx.restore(); if (Math.random() < 0.5) parts.push({ x: j.x, y: j.y, vx: rnd(-50, 50), vy: rnd(-50, 50), life: 0.7, age: 0, col: "#fde68a", s: 1.6, up: 1 }); }
        if (sid === "rings") { var g = ringGeom(Math.min(2, ringsOn)); ctx.save(); ctx.strokeStyle = "rgba(" + g[3] + ",0.9)"; ctx.lineWidth = 2.5; ctx.shadowColor = "rgba(" + g[3] + ",1)"; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.ellipse(CX, CY, g[0], g[1], g[2], 0, 6.283 * w); ctx.stroke(); ctx.restore(); }
        if (u > FLY + WORK) { jobs.splice(q, 1); finishJob(j); } } }
    // souffles qui reviennent (ou se fondent dans la planète)
    spirits.forEach(function (b, bi) { if (!b.back) return; var u2 = (now - b.back.t) / (b.back.home ? 1600 : 700); if (u2 < 0) return; if (u2 >= 1) { b.back = null; return; } var e2 = ease(u2), tx = b.back.home ? CX : view.x + view.w * 0.5, ty = b.back.home ? CY : view.y + view.h + 60;
      drawWisp(b.back.x + (tx - b.back.x) * e2, b.back.y - 20 + (ty - b.back.y + 20) * e2, b.back.home ? 1 - 0.7 * e2 : 1, bi, T); });
    if (!L6) drawRings(T, false);
    // lucioles
    flies.forEach(function (f) { var fx = f[0] + Math.sin(T * f[3] + f[2]) * 30, fy = f[1] + Math.cos(T * f[3] * 0.7 + f[2]) * 14, fa = 0.5 + 0.5 * Math.sin(T * f[4] * 2 + f[2]); if (fa < 0.15) return; ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(255,226,140," + 0.8 * fa + ")"; ctx.shadowColor = "rgba(255,214,120,1)"; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(fx, fy, 1.6, 0, 6.283); ctx.fill(); ctx.restore(); });
    // planète vivante : souffle doré qui pulse (remplace l'ancienne vidéo finale)
    if (state === "won" && !L6) { var pb = 0.5 + 0.5 * Math.sin(T * 1.3), gw = ctx.createRadialGradient(CX, CY, R * 0.85, CX, CY, R * 1.35); gw.addColorStop(0, "rgba(253,224,140,0)"); gw.addColorStop(0.3, "rgba(253,224,140," + 0.22 * pb + ")"); gw.addColorStop(1, "rgba(253,224,140,0)"); ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = gw; ctx.beginPath(); ctx.arc(CX, CY, R * 1.35, 0, 6.283); ctx.fill(); ctx.restore(); }
    // particules
    for (var pi = parts.length - 1; pi >= 0; pi--) { var P = parts[pi]; P.age += dt; if (P.age > P.life) { parts.splice(pi, 1); continue; } P.x += P.vx * dt; P.y += P.vy * dt; if (!P.up) P.vy += 60 * dt;
      ctx.globalAlpha = 1 - P.age / P.life; ctx.fillStyle = P.col; ctx.beginPath(); ctx.arc(P.x, P.y, P.s, 0, 6.283); ctx.fill(); } ctx.globalAlpha = 1;
    if (state === "won" && Math.random() < (lvl >= AUTO ? 0.8 : 0.3)) parts.push({ x: (L6 ? CX6 - 80 : CX) + rnd(-R, R) * (L6 ? 0.4 : 1), y: (L6 ? CY6 : CY) + rnd(-R, R) * (L6 ? 0.7 : 1), vx: rnd(-15, 15), vy: rnd(-30, -10), life: 1.2, age: 0, col: Math.random() < 0.5 ? "#fde68a" : "#9ae6b4", s: rnd(1, 2.5) });
    if (parts.length > 500) parts.splice(0, parts.length - 500);
  }

  /* niveaux 2 à 5 : océans, nuages, pluie, atmosphère, climat, vie, lune, autonomie */
  function clipDisk() { ctx.beginPath(); ctx.arc(CX, CY, R - 1, 0, 6.283); ctx.clip(); }
  function drawWorld(T, now, dt) {
    if (lvl >= LAST) { drawJourney(T, now); if (waitShown && boardDone()) updateUI(); return; }
    var seas = A(1, "seas"), cl = S(1, "clouds"), rain = A(1, "rain"), ox = A(2, "oxygen"), halo = A(2, "halo"), sky = A(2, "sky"), dn = A(3, "daynight"), life = S(3, "life"), moon = A(3, "moon"),
      reg = S(4, "springs"), aur = A(4, "auroras"), br = A(4, "breath"), auto = autoVal / 100, spd = 1 + 2 * auto;
    if (sky > 0) { var gs = ctx.createLinearGradient(0, 0, 0, 420); gs.addColorStop(0, "rgba(60,120,230," + 0.22 * sky + ")"); gs.addColorStop(1, "rgba(120,190,255,0)"); ctx.save(); ctx.beginPath(); ctx.rect(0, 0, IW, IH); ctx.arc(CX, CY, R + 4, 0, 6.283, true); ctx.clip("evenodd"); ctx.fillStyle = gs; ctx.fillRect(0, 0, IW, 430); ctx.restore(); }
    if (halo > 0 || br > 0) { var pul = br * (0.5 + 0.5 * Math.sin(T * (1.4 + auto))), hr = R + 10 + 26 * halo + 10 * pul, gh = ctx.createRadialGradient(CX, CY, R - 6, CX, CY, hr + 18);
      gh.addColorStop(0, "rgba(90,170,255,0)"); gh.addColorStop(0.25, "rgba(110,190,255," + (0.35 * halo + 0.3 * pul) + ")"); gh.addColorStop(1, "rgba(110,190,255,0)"); ctx.fillStyle = gh; ctx.beginPath(); ctx.arc(CX, CY, hr + 18, 0, 6.283); ctx.fill(); }
    if (moon > 0) { ctx.save(); ctx.strokeStyle = "rgba(220,230,255," + 0.25 * moon + ")"; ctx.lineWidth = 1; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.ellipse(CX, CY, R * 2.1, R * 0.55, -0.12, 0, 6.283); ctx.stroke(); ctx.restore();
      var ma = T * 0.25, mx = CX + R * 2.1 * Math.cos(ma) * Math.cos(-0.12) - R * 0.55 * Math.sin(ma) * Math.sin(-0.12), my = CY + R * 2.1 * Math.cos(ma) * Math.sin(-0.12) + R * 0.55 * Math.sin(ma) * Math.cos(-0.12);
      if (!(Math.sin(ma) < 0 && Math.hypot(mx - CX, my - CY) < R)) { var mr = 8 + 10 * moon, gm = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, 1, mx, my, mr); gm.addColorStop(0, "#fffdf0"); gm.addColorStop(1, "#9aa3b8"); ctx.save(); ctx.shadowColor = "rgba(255,250,230,0.8)"; ctx.shadowBlur = 16; ctx.fillStyle = gm; ctx.beginPath(); ctx.arc(mx, my, mr, 0, 6.283); ctx.fill(); ctx.restore(); } }
    ctx.save(); clipDisk();
    var earthA = lvl > 1 ? 0.88 : seas * 0.88; if (earthA > 0 && imgEarth.complete && imgEarth.naturalWidth) { ctx.globalAlpha = earthA; ctx.drawImage(imgEarth, CX - R, CY - R, 2 * R, 2 * R); ctx.globalAlpha = 1; }
    if (seas > 0) LEVELS[1].steps[0].pts.forEach(function (p, k) { var a = lvl > 1 ? 1 : done["0:" + k] ? 1 : 0; if (!a) return; var g = ctx.createRadialGradient(p[0], p[1], 6, p[0], p[1], 78); g.addColorStop(0, "rgba(30,110,200,0.42)"); g.addColorStop(1, "rgba(30,110,200,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], 78, 0, 6.283); ctx.fill();
      ctx.strokeStyle = "rgba(190,235,255," + (0.18 + 0.12 * Math.sin(T * 2 + k)) + ")"; ctx.lineWidth = 1; for (var w = 0; w < 3; w++) { ctx.beginPath(); ctx.ellipse(p[0], p[1], 20 + w * 16 + (T * 6 % 16), 8 + w * 6, 0.2, 0, 6.283); ctx.stroke(); } });
    if (dn > 0) { var ang = T * 0.12, gx = Math.cos(ang) * R, gy = Math.sin(ang) * R * 0.4, gd = ctx.createLinearGradient(CX - gx, CY - gy, CX + gx, CY + gy); gd.addColorStop(0, "rgba(8,6,30,0)"); gd.addColorStop(0.5, "rgba(8,6,30,0)"); gd.addColorStop(0.62, "rgba(8,6,30," + 0.68 * dn + ")"); gd.addColorStop(1, "rgba(8,6,30," + 0.8 * dn + ")"); ctx.fillStyle = gd; ctx.fillRect(CX - R, CY - R, 2 * R, 2 * R);
      if (dn > 0.6) for (var c2 = 0; c2 < 14; c2++) { var cx2 = CX + Math.cos(c2 * 2.4) * R * 0.7, cy2 = CY + Math.sin(c2 * 1.7) * R * 0.6; if ((cx2 - CX) * gx + (cy2 - CY) * gy > R * R * 0.1) { ctx.fillStyle = "rgba(255,220,150," + (0.5 + 0.4 * Math.sin(T * 3 + c2)) + ")"; ctx.fillRect(cx2, cy2, 2, 2); } } }
    if (cl > 0 || lvl > 1) clouds.forEach(function (c) { if (lvl <= 1 && c[4] >= cl) return; var a = c[0] + T * c[3] * spd, x = CX + Math.sin(a) * R * 0.95, y = CY + c[1] * R * 0.6 + Math.cos(a * 1.3) * 6, vis = Math.cos(a); if (vis < -0.1) return;
      ctx.fillStyle = "rgba(250,252,255," + 0.55 * Math.min(1, vis + 0.3) + ")"; for (var q = 0; q < 4; q++) { ctx.beginPath(); ctx.ellipse(x + (q - 1.5) * c[2] * 0.5, y + (q % 2) * 3, c[2] * 0.55, c[2] * 0.3, 0, 0, 6.283); ctx.fill(); }
      if (rain > 0 && c[4] < Math.round(rain * 3)) { ctx.strokeStyle = "rgba(180,220,255,0.55)"; ctx.lineWidth = 1; for (var d = 0; d < 6; d++) { var ry = (T * 90 + d * 13) % 40; ctx.beginPath(); ctx.moveTo(x - 12 + d * 5, y + 6 + ry); ctx.lineTo(x - 14 + d * 5, y + 13 + ry); ctx.stroke(); } } });
    if (reg > 0) LEVELS[4].steps[0].pts.forEach(function (p, k) { if (!(lvl > 4 || done["0:" + k])) return; var pu = 0.5 + 0.5 * Math.sin(T * 2.5 + k * 2); ctx.save(); ctx.shadowColor = "#9ae6b4"; ctx.shadowBlur = 18; ctx.fillStyle = "rgba(190,250,210," + (0.5 + 0.5 * pu) + ")"; ctx.beginPath(); ctx.arc(p[0], p[1], 4 + 3 * pu, 0, 6.283); ctx.fill(); ctx.restore();
      ctx.strokeStyle = "rgba(190,250,210," + 0.4 * (1 - pu) + ")"; ctx.beginPath(); ctx.arc(p[0], p[1], 8 + 26 * pu, 0, 6.283); ctx.stroke(); });
    ctx.restore();
    if (rain >= 1 && lvl === 1 || (lvl > 1 && lvl < 4)) { ctx.save(); ctx.globalAlpha = 0.22; ["#ff6b6b", "#fbbf24", "#fde047", "#4ade80", "#60a5fa", "#a78bfa"].forEach(function (col, i) { ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(CX - 60, CY + 210, 160 - i * 4, 3.4, 4.6); ctx.stroke(); }); ctx.restore(); }
    if (aur > 0) { ctx.save(); ctx.globalCompositeOperation = "lighter"; [[CY - R + 14, -1], [CY + R - 14, 1]].forEach(function (pole, pi) { if (pi === 1 && aur < 0.66) return;
      for (var b = 0; b < 3; b++) { ctx.beginPath(); for (var x = -150; x <= 150; x += 6) { var y = pole[0] + pole[1] * (-18 - b * 9 - 10 * Math.sin(x / 30 + T * (1.2 + b * 0.3) * spd)) + pole[1] * Math.abs(x) * 0.25; if (x === -150) ctx.moveTo(CX + x, y); else ctx.lineTo(CX + x, y); }
        ctx.strokeStyle = ["rgba(110,255,180,", "rgba(160,120,255,", "rgba(103,232,249,"][b] + 0.45 * aur + ")"; ctx.lineWidth = 6 - b; ctx.shadowColor = "rgba(110,255,200,0.9)"; ctx.shadowBlur = 14; ctx.stroke(); } }); ctx.restore(); }
    if (life > 0 || lvl > 3) birds.forEach(function (b2) { if (lvl <= 3 && b2[4] >= life) return; var a = b2[0] + T * b2[3] * (1 + auto), x = CX + Math.cos(a) * R * b2[1], y = CY + b2[2] * R + Math.sin(a) * R * 0.25; if (Math.sin(a) < 0 && Math.hypot(x - CX, y - CY) < R) return;
      var fl = Math.sin(T * 12 + b2[0] * 5) * 3; ctx.strokeStyle = "rgba(255,248,230,0.85)"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - 6, y - fl); ctx.lineTo(x, y); ctx.lineTo(x + 6, y - fl); ctx.stroke(); });
    if (ox > 0 && Math.random() < 0.25 * ox * (1 + auto)) { var op = LEVELS[2].steps[0].pts[Math.floor(Math.random() * 3)]; parts.push({ x: op[0] + rnd(-30, 30), y: op[1], vx: rnd(-6, 6), vy: rnd(-45, -25), life: 1.6, age: 0, col: Math.random() < 0.5 ? "rgba(170,255,230,0.9)" : "rgba(140,210,255,0.9)", s: rnd(1.2, 2.6), up: 1 }); }
    if (life > 0 && Math.random() < 0.15) { var lp = LEVELS[3].steps[1].pts[Math.floor(Math.random() * Math.min(3, lvl > 3 ? 3 : life))]; parts.push({ x: lp[0] + rnd(-25, 25), y: lp[1] + rnd(-20, 20), vx: 0, vy: -10, life: 0.8, age: 0, col: "#fde68a", s: 1.6, up: 1 }); }
    if (lvl >= LAST) { drawJourney(T, now); if (waitShown && boardDone()) updateUI(); }
    if (autoStart) { autoVal = Math.min(100, (now - autoStart) / 50); setGauge(autoFill, autoValEl, autoBar, autoVal); }
  }

  /* niveau 6 : le Grand Voyage */
  function drawPerson(x, y, s, T, i) { var st = Math.sin(T * 8 + i) * 1.4 * s; ctx.save(); ctx.fillStyle = "rgba(20,14,34,0.95)"; ctx.strokeStyle = "rgba(255,226,170,0.55)"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(x, y - 13 * s, 2.6 * s, 0, 6.283); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 3 * s, y - 10 * s); ctx.lineTo(x + 3 * s, y - 10 * s); ctx.lineTo(x + 2.4 * s, y - 3 * s); ctx.lineTo(x + st, y); ctx.lineTo(x - 1 * s, y - 3 * s); ctx.lineTo(x - st, y); ctx.lineTo(x - 2.4 * s, y - 3 * s); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
  function rumble() { tone([196, 261.63, 392, 523.25, 783.99], 0.06, 0.18, 1.6); }
  function pathPos(u) { var P = PATH, n = P.length - 1, x = u * n, i = Math.min(n - 1, Math.floor(x)), f = x - i; return [P[i][0] + (P[i + 1][0] - P[i][0]) * f, P[i][1] + (P[i + 1][1] - P[i][1]) * f]; }
  function pscale(y) { return Math.max(0.13, Math.min(1.4, Math.pow(Math.max(0, (y - 535) / 45), 1.3))); }
  function drawSprite(im, x, y, h, a, sway, flip) { if (!ok(im)) return; var w = h * im.naturalWidth / im.naturalHeight; ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); if (sway) ctx.rotate(sway); if (flip) ctx.scale(-1, 1);
    ctx.shadowColor = "rgba(10,6,20,0.5)"; ctx.shadowBlur = 4; ctx.drawImage(im, -w / 2, -h, w, h); ctx.restore(); }
  // une personne : départ (x0,y0) → chemin → pied de l'arbre ; renvoie faux si arrivée
  function walker(im, H, x0, y0, t, dur, T, i) {
    var u = Math.max(0, t / dur); if (u >= 1) return false;
    var x, y; if (u < 0.3) { var p0 = pathPos(0), f = u / 0.3; x = x0 + (p0[0] - x0) * f; y = y0 + (p0[1] - y0) * f; } else { var q = pathPos((u - 0.3) / 0.7); x = q[0]; y = q[1]; }
    var sc = u < 0.3 ? 1 - 0.15 * (u / 0.3) : 0.13 + 0.72 * Math.pow(1 - (u - 0.3) / 0.7, 1.5), bob = Math.abs(Math.sin(T * 6 + i)) * 2.2 * sc, a = u > 0.93 ? (1 - u) / 0.07 : 1;
    drawSprite(im, x, y - bob, H * sc, a, Math.sin(T * 6 + i) * 0.03, false); return true;
  }
  function drawJourney(T, now) {
    var built = S(LAST, "bubble"), lf = departAt ? (now - departAt) / 1000 : -1;
    // bulle de lumière dorée dans la couronne de l'arbre
    var ox = ORB.x, oy = ORB.y, rise = 0, RISE = 130, TB = [960, 505];
    if (lf >= 1.4 && lf < 4.2) { var r0 = (lf - 1.4) / 2.8; rise = r0 * r0 * RISE; } else if (lf >= 4.2) rise = RISE;
    var phase2 = lf >= 4.2 ? Math.min(1, (lf - 4.2) / 2.6) : 0;
    // au départ : l'arbre libère une gerbe chatoyante de pollen doré et de feuilles
    if (lf >= 0 && lf < 5.5) { var em = lf < 2.5 ? 6 : 2;
      for (var pe = 0; pe < em; pe++) { var leaf = Math.random() < 0.35, an0 = rnd(0, 6.283), sp0 = rnd(30, 120);
        parts.push({ x: ox + rnd(-110, 110), y: oy + rnd(-50, 70), vx: Math.cos(an0) * sp0 * 0.6, vy: -Math.abs(Math.sin(an0)) * sp0 * 0.5 + (leaf ? 25 : -10), life: rnd(1.2, 2.4), age: 0, col: leaf ? (Math.random() < 0.5 ? "#a7e08a" : "#f5d27a") : (Math.random() < 0.6 ? "#ffe6a3" : "#fff7d6"), s: leaf ? rnd(2.2, 3.4) : rnd(1, 2), up: leaf ? 0 : 1 }); }
      ctx.save(); ctx.globalCompositeOperation = "lighter"; var sh = Math.min(1, lf / 0.8) * (lf > 4 ? Math.max(0, 1 - (lf - 4) / 1.5) : 1), gt = ctx.createRadialGradient(ox, oy + 40, 10, ox, oy + 40, 190); gt.addColorStop(0, "rgba(255,230,160," + 0.4 * sh + ")"); gt.addColorStop(1, "rgba(255,210,140,0)"); ctx.fillStyle = gt; ctx.beginPath(); ctx.arc(ox, oy + 40, 190, 0, 6.283); ctx.fill(); ctx.restore(); }
    if (lf < 0 || phase2 < 1) {
      var bx = ox, by = oy - rise, rr = 10 + 9 * built + 5 * Math.min(3, boards.length);
      if (phase2 > 0) { var e = ease(phase2), sX = ox, sY = oy - RISE, L = LAND[0];
        bx = (1 - e) * (1 - e) * sX + 2 * (1 - e) * e * 860 + e * e * L[0]; by = (1 - e) * (1 - e) * sY + 2 * (1 - e) * e * -60 + e * e * L[1]; rr *= 1 - 0.7 * e;
        ctx.save(); ctx.globalCompositeOperation = "lighter"; for (var tr = 1; tr < 18; tr++) { var e2 = Math.max(0, e - tr * 0.02), tx = (1 - e2) * (1 - e2) * sX + 2 * (1 - e2) * e2 * 860 + e2 * e2 * L[0], ty = (1 - e2) * (1 - e2) * sY + 2 * (1 - e2) * e2 * -60 + e2 * e2 * L[1];
          ctx.fillStyle = "rgba(255,214,140," + (0.4 - tr * 0.02) + ")"; ctx.beginPath(); ctx.arc(tx, ty, Math.max(1, rr * 0.35 - tr * 0.3), 0, 6.283); ctx.fill(); } ctx.restore(); }
      if (built === 0 && lf < 0) { ctx.save(); ctx.strokeStyle = "rgba(253,230,138," + (0.35 + 0.2 * Math.sin(T * 3)) + ")"; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.arc(bx, by, 34, 0, 6.283); ctx.stroke(); ctx.restore(); }
      else { var pul = 1 + 0.06 * Math.sin(T * 2.4), R2 = rr * pul;
        ctx.save(); ctx.globalCompositeOperation = "lighter"; var halo = ctx.createRadialGradient(bx, by, R2 * 0.3, bx, by, R2 * 2.6); halo.addColorStop(0, "rgba(255,226,160,0.55)"); halo.addColorStop(1, "rgba(255,190,120,0)"); ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(bx, by, R2 * 2.6, 0, 6.283); ctx.fill(); ctx.restore();
        var g = ctx.createRadialGradient(bx - R2 * 0.35, by - R2 * 0.4, R2 * 0.1, bx, by, R2); g.addColorStop(0, "rgba(255,252,235,0.95)"); g.addColorStop(0.45, "rgba(255,224,150,0.55)"); g.addColorStop(0.85, "rgba(255,190,140,0.28)"); g.addColorStop(1, "rgba(255,240,210,0.75)");
        ctx.save(); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, R2, 0, 6.283); ctx.fill(); ctx.strokeStyle = "rgba(255,248,230,0.7)"; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.beginPath(); ctx.ellipse(bx - R2 * 0.38, by - R2 * 0.42, R2 * 0.22, R2 * 0.12, -0.6, 0, 6.283); ctx.fill(); ctx.restore();
        if (built < 3 && Math.random() < 0.5) parts.push({ x: bx + rnd(-R2, R2), y: by + rnd(-R2, R2), vx: rnd(-20, 20), vy: rnd(-30, -5), life: 0.8, age: 0, col: "#fde68a", s: 1.4, up: 1 }); }
      // voyageurs : arrivés au pied de l'arbre, ils montent en lumières le long du tronc jusqu'à la bulle
      if (lf < 0 && boards.length && Math.random() < 0.35) { var vy0 = -120, lfT = (TB[1] - oy) / 120; parts.push({ x: TB[0] + rnd(-8, 8), y: TB[1], vx: (ox - TB[0]) / lfT + rnd(-4, 4), vy: vy0, life: lfT, age: 0, col: "#ffe2a0", s: 2, up: 1 }); }
    }
    if (phase2 >= 1 && !landedAt) { landedAt = now; burst(LAND[0][0], LAND[0][1], "#fde68a", 50); tone([659.25, 783.99, 1046.5], 0.08, 0.1, 0.9); }
    // personnes : les trois de la colline d'abord, puis la file
    var P0 = [[300, 585, 140], [478, 580, 140], [577, 580, 104]];
    P0.forEach(function (p, i) { var im = imgP[[0, 1, 2][i]];
      if (!boards[0]) drawSprite(im, p[0], p[1], p[2] * (i === 0 ? 1 : 1), 1, Math.sin(T * 1.2 + i) * 0.012, false);
      else walker(im, p[2], p[0], p[1], (now - boards[0]) / 1000 - i * 0.7, WALK, T, i); });
    [1, 2].forEach(function (g) { if (!boards[g]) return; for (var q = 0; q < 5; q++) { var idx = (g - 1) * 5 + q, im = imgT[idx], kid = [2, 4, 6].indexOf(idx) >= 0;
      walker(im, kid ? 92 : 125, 330 - q * 34, 600 + (q % 2) * 3, (now - boards[g]) / 1000 - q * 0.8, WALK, T, idx + 3); } });
    // villages
    if (landedAt) LAND.forEach(function (land, k) { var a = Math.min(1, (now - landedAt - k * 700) / 900); if (a <= 0) return;
      ctx.save(); ctx.globalCompositeOperation = "lighter"; var gv = ctx.createRadialGradient(land[0], land[1], 1, land[0], land[1], 28); gv.addColorStop(0, "rgba(255,210,130," + 0.55 * a + ")"); gv.addColorStop(1, "rgba(255,210,130,0)"); ctx.fillStyle = gv; ctx.beginPath(); ctx.arc(land[0], land[1], 28, 0, 6.283); ctx.fill(); ctx.restore();
      for (var v = 0; v < 14; v++) { var vx = land[0] + Math.cos(v * 2.39) * (4 + v * 2.6), vy = land[1] + Math.sin(v * 2.39) * (3 + v * 1.8); ctx.fillStyle = "rgba(255,214,140," + a * (0.55 + 0.45 * Math.sin(T * 3 + v + k)) + ")"; ctx.beginPath(); ctx.arc(vx, vy, 2.2, 0, 6.283); ctx.fill(); } });
  }

  /* interface */
  var nextBtn = $("nt-next"), levelsEl = $("nt-levels"), simFill = $("nt-sim-fill"), simVal = $("nt-sim-val"), simBar = $("nt-sim"), autoRow = $("nt-auto-row"), autoFill = $("nt-auto-fill"), autoValEl = $("nt-auto-val"), autoBar = $("nt-auto"),
    ovTitle = $("nt-ov-title"), habRow = $("nt-hab-row"), habFill = $("nt-hab-fill"), habValEl = $("nt-hab-val"), habBar = $("nt-hab"), ovText = $("nt-ov-text"), winTitle = $("nt-win-title");
  var PK = "eden-nt-progress";
  function loadProgress() { try { var o = JSON.parse(ls().getItem(PK) || "{}"); unlocked = Math.max(1, Math.min(LEVELS.length, o.unlocked | 0 || 1)); lvl = Math.max(0, Math.min(unlocked - 1, (o.level | 0 || 1) - 1)); } catch (e) { unlocked = 1; lvl = 0; } }
  function saveProgress() { try { ls().setItem(PK, JSON.stringify({ unlocked: unlocked, level: lvl + 1 })); } catch (e) {} }
  function setGauge(fill, val, bar, p) { p = Math.round(p); fill.style.width = p + "%"; val.textContent = t("nt.progress", { p: p }); bar.setAttribute("aria-valuenow", p); }
  function renderLevels() {
    levelsEl.innerHTML = "";
    LEVELS.forEach(function (L, i) { var b = document.createElement("button"); b.type = "button"; b.className = "ws-level"; b.setAttribute("data-level", i + 1);
      b.setAttribute("aria-pressed", i === lvl ? "true" : "false"); b.disabled = i >= unlocked; b.textContent = (i >= unlocked ? "🔒 " : "") + t("nt.levelBtn", { n: i + 1 }); b.title = t("nt.level" + (i + 1));
      b.addEventListener("click", function () { if (i >= unlocked) return; lvl = i; saveProgress(); stopSong(); init(); }); levelsEl.appendChild(b); });
  }
  function renderSteps() { stepsEl.innerHTML = ""; STEPS.forEach(function (s, i) { var li = document.createElement("li"); li.className = state === "won" || i < stepI ? "is-done" : i === stepI && state === "playing" ? "is-now" : "";
      li.textContent = (i < stepI || state === "won" ? "✓ " : (i + 1) + ". ") + t("nt.step." + s.id); stepsEl.appendChild(li); }); }
  function simNow() { var L = LEVELS[lvl]; return L.sim[0] + (L.sim[1] - L.sim[0]) * nDone / TOTAL; }
  function updateUI() {
    var pct = Math.round(nDone / TOTAL * 100); progFill.style.width = pct + "%"; progEl.setAttribute("aria-valuenow", pct); scoreEl.textContent = t("nt.levelShort", { n: lvl + 1, m: LEVELS.length });
    setGauge(simFill, simVal, simBar, simNow()); autoRow.hidden = lvl < AUTO; habRow.hidden = lvl < LAST; setGauge(habFill, habValEl, habBar, lvl < LAST ? 0 : state === "won" ? 100 : nDone / TOTAL * 100); if (!autoStart) setGauge(autoFill, autoValEl, autoBar, autoVal);
    renderSteps();
    if (state === "playing") { var s = STEPS[stepI]; waitShown = s.id === "rise" && !boardDone();
      statusEl.textContent = t("nt.stepOf", { n: stepI + 1, m: STEPS.length, name: t("nt.step." + s.id) }); instrEl.textContent = waitShown ? t("nt.waitBoard") : t("nt.instr." + s.id, { n: s.pts.filter(function (_, k) { return !done[stepI + ":" + k]; }).length }); }
    else if (state === "flying") { statusEl.textContent = t("nt.departing"); instrEl.textContent = t("nt.departing"); }
    else if (state === "won") { statusEl.textContent = t(lvl === LAST ? "nt.welcomeHome" : lvl === AUTO ? "nt.solved" : "nt.levelDone", { n: lvl + 1 }); instrEl.textContent = lvl === AUTO ? t("nt.breathes") : lvl === LAST ? t("nt.welcomeHome") : ""; }
    else { statusEl.textContent = t("nt.level" + (lvl + 1)); instrEl.textContent = ""; }
  }
  function reset() {
    STEPS = LEVELS[lvl].steps; TOTAL = STEPS.length * 3;
    stepI = 0; done = {}; nDone = 0; jobs = []; blobs = []; parts = []; ringsOn = lvl > 0 ? 3 : 0; ringFade = lvl > 0 ? [1, 1, 1] : [0, 0, 0]; fullReveal = lvl > 0 ? performance.now() - 5000 : 0; selected = -1; compDirty = true; autoStart = 0; autoVal = lvl > AUTO ? 100 : 0; boards = []; departAt = 0; landedAt = 0; if (lvl === LAST) lazyL6(); layout();
    spirits = SPIRITS.map(function (n) { return { id: n, busy: false }; }); winEl.hidden = true; againBtn.hidden = true; nextBtn.hidden = true;
  }
  function startGame() {
    if (!playable().length) { card.hidden = true; emptyBox.hidden = false; return; }
    ctxAudio(); stopSong(); reset(); song = pickSong(); state = "playing"; startedAt = performance.now();
    overlay.classList.add("is-hidden"); trayEl.hidden = false; renderTray(); updateUI(); hintEl.textContent = t("nt.hintPlay"); say(t("nt.stepOf", { n: 1, m: STEPS.length, name: t("nt.step." + STEPS[0].id) }));
  }
  function win() {
    var last = lvl === LAST, auto = lvl === AUTO;
    state = "won"; if (!lvl) { fullReveal = performance.now(); compDirty = true; ringsOn = 3; } trayEl.hidden = true;
    if (lvl + 2 > unlocked && !last) unlocked = lvl + 2; saveProgress(); renderLevels(); updateUI();
    tone([523.25, 659.25, 783.99, 1046.5, 1318.5], 0.09, 0.12, 1.2); var bx0 = last ? LAND[1][0] : CX, by0 = last ? LAND[1][1] : CY; burst(bx0, by0, "#fde68a", 80); burst(bx0, by0, "#9ae6b4", 60); if (lvl >= 2) burst(bx0, by0, "#93c5fd", 50);
    winTitle.textContent = last ? t("nt.welcomeHome") : auto ? t("nt.breathes") : t("nt.levelWin", { n: lvl + 1, name: t("nt.level" + (lvl + 1)) }); winEl.hidden = false;
    if (auto) { autoStart = performance.now(); autoRow.hidden = false;
      spirits.forEach(function (b, i) { b.back = { t: performance.now() + i * 300, x: CX + (i - 1) * 160, y: CY + 260, home: 1 }; });
    }
    if (!lvl) { for (var fb = 0; fb < 3; fb++) setTimeout(function () { if (state === "won") { burst(CX + rnd(-R, R) * 0.6, CY + rnd(-R, R) * 0.6, "#fde68a", 40); burst(CX, CY, "#9ae6b4", 20); } }, 900 + fb * 900); }
    var secs = Math.round((performance.now() - startedAt) / 1000);
    hintEl.textContent = last ? t("nt.hintHome", { s: secs }) : auto ? t("nt.hintFinal", { s: secs }) : t("nt.hintWin", { s: secs }); againBtn.hidden = false; nextBtn.hidden = last;
    if (song) { say(t("nt.wonText", { title: song.title })); playSong(song); }
    try { stage.scrollIntoView({ block: "nearest", behavior: reduced() ? "auto" : "smooth" }); } catch (e) {}
  }
  function init() { reset(); state = "idle"; overlay.classList.remove("is-hidden"); trayEl.hidden = true; card.hidden = false; emptyBox.hidden = true;
    ovTitle.textContent = t("nt.level" + (lvl + 1)); ovText.textContent = t("nt.levelText" + (lvl + 1)); hintEl.textContent = t("nt.hintIdle");
    renderLevels(); updateUI(); layout(); }

  function bind() {
    loadProgress();
    startBtn.addEventListener("click", startGame);
    againBtn.addEventListener("click", function () { startGame(); try { stage.scrollIntoView({ block: "nearest" }); } catch (e) {} });
    nextBtn.addEventListener("click", function () { if (lvl < LEVELS.length - 1) { lvl++; saveProgress(); init(); startGame(); try { stage.scrollIntoView({ block: "nearest" }); } catch (e) {} } });
    window.addEventListener("resize", layout);
    if (window.EdenI18n && window.EdenI18n.onChange) window.EdenI18n.onChange(function () { stopSong(); init(); });
    var toggle = $("nav-toggle"), links = $("nav-links"); if (toggle && links) toggle.addEventListener("click", function () { var o = links.classList.toggle("is-open"); toggle.setAttribute("aria-expanded", o ? "true" : "false"); });
    init(); requestAnimationFrame(frame);
  }
  imgStart.onload = imgFinal.onload = function () { loaded++; compDirty = true; };
  imgStart.src = "assets/nouvelle-terre/nt-start.webp"; imgFinal.src = "assets/nouvelle-terre/nt-final.webp";
  window.EdenNewEarth = {
    state: function () { return { state: state, level: lvl + 1, unlocked: unlocked, sim: Math.round(simNow()), auto: Math.round(autoVal), step: stepI, done: nDone, total: TOTAL, rings: ringsOn, busy: spirits.filter(function (b) { return b.busy; }).length, song: song ? { id: song.id, title: song.title, lang: song.lang } : null }; },
    targets: function () { return pending().map(function (p) { var c = toClient(p.x, p.y); return { k: p.k, x: c.x, y: c.y }; }); }
  };
  getJSON("tracks.json").then(function (r) { tracks = r.tracks || r || []; }).catch(function () {})
    .then(function () { if (window.EdenSongPick && window.EdenSongPick.ready && window.EdenSongPick.ready.then) return window.EdenSongPick.ready; }).then(bind, bind);
})();
