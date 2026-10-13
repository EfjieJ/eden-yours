/* Eden Yours — Bâtis la Nouvelle Terre / Build the New Earth.
   Vue depuis la colline : une mini-Terre flotte au-dessus du lac. Le joueur envoie des robots bâtisseurs (humanoïdes) sur des points lumineux :
   6 étapes × 3 actions (échafaudages, panneaux de lumière livrés par vaisseau, soudure, forêts, cascades, anneaux). Chaque action change la planète
   (la roche grise se colore autour du point, lumières, holos, étincelles, eau, anneaux). Planète finie : tout s'anime (vidéo finale + effets)
   et une chanson de la langue de la page joue EN ENTIER (EdenFullSong / embed). Toucher/glisser, souris, clavier (Entrée sur un robot = action suivante). */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $("nt-canvas"), stage = $("nt-stage"), video = $("nt-video"), ghost = $("nt-ghost"), overlay = $("nt-overlay"), startBtn = $("nt-start"), againBtn = $("nt-again"),
    statusEl = $("nt-status"), scoreEl = $("nt-score"), hintEl = $("nt-hint"), liveEl = $("nt-live"), instrEl = $("nt-instr"), trayEl = $("nt-tray"), stepsEl = $("nt-steps"),
    progEl = $("nt-progress"), progFill = $("nt-progress-fill"), winEl = $("nt-win"), playerBox = $("nt-player"), nowEl = $("nt-now-playing"), embedBox = $("nt-embed"),
    audio = $("nt-audio"), listenBtn = $("nt-listen"), emptyBox = $("nt-empty"), card = $("nt-card");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var IW = 1280, IH = 720, CX = 835, CY = 290, R = 206;
  var STEPS = [
    { id: "scaffold", r: 92, pts: [[905, 140], [985, 250], [905, 335]] },
    { id: "panels", r: 60, pts: [[650, 137], [1062, 225], [594, 306]] },
    { id: "weld", r: 70, pts: [[880, 92], [948, 168], [985, 290]] },
    { id: "forest", r: 120, pts: [[700, 200], [800, 250], [700, 330]] },
    { id: "water", r: 80, pts: [[724, 340], [806, 300], [724, 465]] },
    { id: "rings", r: 0, pts: [[600, 300], [1080, 300], [835, 470]] }
  ];
  var TOTAL = STEPS.length * 3;
  var BOTS = ["Lumen", "Orbi", "Sève"];
  var imgStart = new Image(), imgFinal = new Image(), loaded = 0;
  var maskC = document.createElement("canvas"), compC = document.createElement("canvas"); maskC.width = compC.width = IW / 2; maskC.height = compC.height = IH / 2;
  var mctx = maskC.getContext("2d"), cctx = compC.getContext("2d");
  var tracks = [], state = "idle", stepI = 0, done = {}, nDone = 0, bots = [], selected = -1, jobs = [], blobs = [], parts = [], ringsOn = 0, ringFade = [0, 0, 0],
    song = null, ownStarted = false, compDirty = true, fullReveal = 0, finaleT = 0, t0 = performance.now(), view = { x: 0, y: 0, w: IW, h: IH }, scale = 1, dpr = 1, startedAt = 0, AC = null;
  var stars = [], scaffLights = [];
  (function () { var s = 7; function r() { s = (s * 9301 + 49297) % 233280; return s / 233280; }
    for (var i = 0; i < 140; i++) { var x = r() * IW, y = r() * 380; if (Math.hypot(x - CX, y - CY) > R + 60) stars.push([x, y, 0.6 + r() * 1.4, r() * 6.3, 1 + r() * 2.5]); }
    for (var k = 0; k < 3; k++) for (var j = 0; j < 7; j++) scaffLights.push([k, STEPS[0].pts[k][0] + (r() - 0.5) * 130, STEPS[0].pts[k][1] + (r() - 0.5) * 110, r() * 6.3, 1.5 + r() * 3]); })();

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

  /* robots (SVG humanoïde générique) */
  function botSVG() { return '<svg viewBox="0 0 40 50" aria-hidden="true"><defs><linearGradient id="ntm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f7fb"/><stop offset="1" stop-color="#9aa6b8"/></linearGradient></defs>' +
    '<ellipse cx="20" cy="8" rx="6.5" ry="7" fill="url(#ntm)"/><rect x="14.5" y="6" width="11" height="3.2" rx="1.6" fill="#1b2433"/><rect x="15.5" y="6.8" width="9" height="1.6" rx="0.8" fill="#67e8f9"/>' +
    '<rect x="17.5" y="14.5" width="5" height="3" fill="#6b7689"/><path d="M11 18 Q20 15.5 29 18 L27.5 32 Q20 34 12.5 32 Z" fill="url(#ntm)"/><circle cx="20" cy="23" r="1.8" fill="#67e8f9"/>' +
    '<path d="M11 19 L7 30 L8.5 31 L13 21" fill="#c9d1dd"/><path d="M29 19 L33 30 L31.5 31 L27 21" fill="#c9d1dd"/>' +
    '<path d="M14 33 L13 48 L17 48 L19 34 Z" fill="#c9d1dd"/><path d="M26 33 L27 48 L23 48 L21 34 Z" fill="#c9d1dd"/></svg>'; }
  function drawBot(x, y, s, glow) {                    // robot dessiné dans le canvas (coordonnées image)
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (glow) { ctx.shadowColor = "rgba(103,232,249,0.9)"; ctx.shadowBlur = 12; }
    var g = ctx.createLinearGradient(-10, -25, 10, 25); g.addColorStop(0, "#f4f7fb"); g.addColorStop(1, "#8f9bb0"); ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, -17, 6.5, 7, 0, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = "#1b2433"; ctx.fillRect(-5.5, -19, 11, 3.2); ctx.fillStyle = "#67e8f9"; ctx.fillRect(-4.5, -18.2, 9, 1.6);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-9, -7); ctx.quadraticCurveTo(0, -9.5, 9, -7); ctx.lineTo(7.5, 7); ctx.quadraticCurveTo(0, 9, -7.5, 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#67e8f9"; ctx.beginPath(); ctx.arc(0, -2, 1.8, 0, 6.283); ctx.fill();
    ctx.strokeStyle = "#c9d1dd"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-9, -6); ctx.lineTo(-13, 4); ctx.moveTo(9, -6); ctx.lineTo(14, 2); ctx.moveTo(-4, 8); ctx.lineTo(-5, 22); ctx.moveTo(4, 8); ctx.lineTo(5, 22); ctx.stroke();
    ctx.restore();
  }
  function renderTray() {
    trayEl.innerHTML = "";
    bots.forEach(function (b, i) {
      var el = document.createElement("button"); el.type = "button"; el.className = "nt-bot" + (b.busy ? " is-busy" : "") + (selected === i ? " is-selected" : "");
      el.style.setProperty("--d", (-i * 0.7) + "s"); el.setAttribute("data-bot", i); el.setAttribute("aria-pressed", selected === i ? "true" : "false");
      el.setAttribute("aria-label", t("nt.botAria", { name: b.name })); el.innerHTML = botSVG() + "<span>" + b.name + "</span>"; if (b.busy) el.disabled = true;
      bindBot(el, i); trayEl.appendChild(el); b.el = el;
    });
  }
  function setBotState(i) { var b = bots[i], el = b.el; if (!el) return; el.classList.toggle("is-busy", b.busy); el.classList.toggle("is-selected", selected === i); el.disabled = b.busy; el.setAttribute("aria-pressed", selected === i ? "true" : "false"); }

  /* géométrie / vue */
  function layout() {
    var w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    dpr = Math.min(2, window.devicePixelRatio || 1); canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    var ar = w / h;
    if (ar > 1.6) view = { x: 0, y: 0, w: IW, h: IH };
    else { var vh = 640, vw = Math.min(IW, vh * ar); view = { x: Math.max(0, Math.min(IW - vw, CX - vw / 2 - 20)), y: 20, w: vw, h: vh }; }
    scale = w / view.w;
  }
  function toImg(clientX, clientY) { var r = canvas.getBoundingClientRect(); return { x: view.x + (clientX - r.left) / scale, y: view.y + (clientY - r.top) / scale }; }
  function toClient(x, y) { var r = canvas.getBoundingClientRect(); return { x: r.left + (x - view.x) * scale, y: r.top + (y - view.y) * scale }; }
  function pending() { if (state !== "playing") return []; var s = STEPS[stepI]; return s.pts.map(function (p, k) { return { k: k, x: p[0], y: p[1] }; }).filter(function (p) { return !done[stepI + ":" + p.k] && !jobs.some(function (j) { return j.step === stepI && j.k === p.k; }); }); }
  function hitTarget(ix, iy) { var best = null, bd = Math.max(44, 30 / scale); pending().forEach(function (p) { var d = Math.hypot(p.x - ix, p.y - iy); if (d < bd) { bd = d; best = p; } }); return best; }

  /* interactions */
  var drag = null;
  function bindBot(el, i) {
    el.addEventListener("pointerdown", function (e) { if (bots[i].busy || state !== "playing") return; drag = { i: i, x0: e.clientX, y0: e.clientY, moved: false, id: e.pointerId }; try { el.setPointerCapture(e.pointerId); } catch (er) {} ctxAudio(); });
    el.addEventListener("pointermove", function (e) { if (!drag || drag.i !== i) return; if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 8) { drag.moved = true; ghost.innerHTML = botSVG(); ghost.hidden = false; }
      if (drag.moved) { var r = stage.getBoundingClientRect(); ghost.style.left = (e.clientX - r.left) + "px"; ghost.style.top = (e.clientY - r.top) + "px"; var p = toImg(e.clientX, e.clientY); drag.hover = hitTarget(p.x, p.y); } });
    el.addEventListener("pointerup", function (e) { if (!drag || drag.i !== i) return; var d = drag; drag = null; ghost.hidden = true;
      if (d.moved) { var p = toImg(e.clientX, e.clientY), tg = hitTarget(p.x, p.y); if (tg) dispatch(i, tg); else hintEl.textContent = t("nt.hintMiss"); }
      else { selected = selected === i ? -1 : i; bots.forEach(function (_, k) { setBotState(k); }); hintEl.textContent = selected >= 0 ? t("nt.hintSelected", { name: bots[i].name }) : t("nt.hintPlay"); } });
    el.addEventListener("pointercancel", function () { drag = null; ghost.hidden = true; });
    el.addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && !bots[i].busy) { e.preventDefault(); var p = pending()[0]; if (p) dispatch(i, p); } });
  }
  canvas.addEventListener("pointerdown", function (e) {
    if (state !== "playing") return; ctxAudio(); var p = toImg(e.clientX, e.clientY), tg = hitTarget(p.x, p.y); if (!tg) return;
    var i = selected >= 0 && !bots[selected].busy ? selected : bots.findIndex(function (b) { return !b.busy; });
    if (i < 0) { hintEl.textContent = t("nt.hintBusy"); return; } dispatch(i, tg);
  });
  function dispatch(i, tg) {
    var b = bots[i]; if (b.busy) return; b.busy = true; if (selected === i) selected = -1; bots.forEach(function (_, k) { setBotState(k); });
    var now = performance.now(), from = { x: view.x + view.w * (0.3 + 0.2 * i), y: view.y + view.h + 40 };
    jobs.push({ bot: i, step: stepI, k: tg.k, x: tg.x, y: tg.y, t: now, from: from, ship: STEPS[stepI].id === "panels" ? { x: tg.x < CX ? -60 : IW + 60, y: tg.y - 120 } : null });
    tone([392, 523.25], 0.05, 0.06, 0.25, "triangle");
    hintEl.textContent = t("nt.hintGo", { name: b.name, what: t("nt.step." + STEPS[stepI].id) });
  }
  var FLY = 1000, WORK = 1700;
  function finishJob(j) {
    var s = STEPS[j.step]; done[j.step + ":" + j.k] = 1; nDone++;
    if (s.r) blobs.push({ x: j.x, y: j.y, r: s.r, t: performance.now() });
    if (s.id === "rings") { ringsOn++; }
    burst(j.x, j.y, s.id === "forest" ? "#9ae6b4" : s.id === "water" ? "#9fe7ff" : "#fde68a", 26);
    tone([523.25, 659.25, 783.99, 1046.5].slice(0, 2 + (nDone % 3)), 0.07, 0.07, 0.5);
    var b = bots[j.bot]; b.busy = false; b.back = { t: performance.now(), x: j.x, y: j.y }; setBotState(j.bot);
    updateUI();
    if (STEPS[stepI].pts.every(function (_, k) { return done[stepI + ":" + k]; })) {
      if (stepI < STEPS.length - 1) { stepI++; say(t("nt.stepDone", { n: stepI, next: t("nt.step." + STEPS[stepI].id) })); tone([659.25, 783.99, 987.77, 1318.5], 0.08, 0.09, 0.7); updateUI(); }
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
    if (state === "won" && video.classList.contains("is-on") && !video.paused && !reduced()) { /* la vidéo finale couvre : on garde juste les particules */ }
    for (var i = 0; i < 3; i++) ringFade[i] += ((i < ringsOn ? 1 : 0) - ringFade[i]) * Math.min(1, dt * 2.5);
    if (compDirty || blobs.some(function (b) { return now - b.t < 950; }) || (fullReveal && now - fullReveal < 1900)) rebuildComp(now);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, -view.x * dpr * scale, -view.y * dpr * scale);
    var zoom = state === "won" ? 1 + 0.025 * (1 - Math.cos(T * 0.6)) : 1;
    if (zoom !== 1) { ctx.translate(CX, CY); ctx.scale(zoom, zoom); ctx.translate(-CX, -CY); }
    ctx.drawImage(imgStart, 0, 0, IW, IH); ctx.drawImage(compC, 0, 0, IW, IH);
    // étoiles
    stars.forEach(function (s) { var a = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(T * s[4] + s[3])); ctx.fillStyle = "rgba(255,250,235," + a + ")"; ctx.beginPath(); ctx.arc(s[0], s[1], s[2], 0, 6.283); ctx.fill(); });
    drawRings(T, true);
    // lumières d'échafaudage
    scaffLights.forEach(function (l) { if (!done["0:" + l[0]]) return; var a = 0.5 + 0.5 * Math.sin(T * l[4] + l[3]); if (a < 0.3) return; ctx.fillStyle = "rgba(255,214,140," + a + ")"; ctx.beginPath(); ctx.arc(l[1], l[2], 2.4, 0, 6.283); ctx.fill(); });
    // holos
    STEPS[1].pts.forEach(function (p, k) { if (!done["1:" + k]) return; var f = (0.55 + 0.45 * Math.sin(T * (6 + k) + k)) * (Math.sin(T * 21 + k * 5) > 0.88 ? 0.3 : 1);
      ctx.fillStyle = "rgba(120,210,255," + 0.22 * f + ")"; ctx.strokeStyle = "rgba(170,235,255," + 0.8 * f + ")"; ctx.lineWidth = 1.2; ctx.fillRect(p[0] - 11, p[1] - 10, 22, 20); ctx.strokeRect(p[0] - 11, p[1] - 10, 22, 20);
      var sy = p[1] - 9 + ((T * 18 + k * 7) % 18); ctx.beginPath(); ctx.moveTo(p[0] - 10, sy); ctx.lineTo(p[0] + 10, sy); ctx.stroke(); });
    // soudure persistante
    STEPS[2].pts.forEach(function (p, k) { if (!done["2:" + k] || Math.sin(T * 4.3 + k * 1.9) < 0.55 || Math.random() < 0.4) return; ctx.fillStyle = "rgba(255,250,215,0.95)"; ctx.beginPath(); ctx.arc(p[0], p[1], rnd(2, 4.5), 0, 6.283); ctx.fill();
      if (Math.random() < 0.5) parts.push({ x: p[0], y: p[1], vx: rnd(-60, 60), vy: rnd(-50, 10), life: 0.45, age: 0, col: "#ffc86e", s: 1.3 }); });
    // cascades
    var nW = [0, 1, 2].filter(function (k) { return done["4:" + k]; }).length;
    if (nW) { ctx.save(); for (var y = 325; y < 500; y += 3) { var a2 = 0.12 + 0.14 * Math.sin(y / 7 - T * 9); ctx.fillStyle = "rgba(200,240,255," + Math.max(0, a2) * Math.min(1, nW / 1.5) + ")"; ctx.fillRect(717 + Math.sin(y * 0.3 + T * 5) * 1.5, y, 10, 2); }
      if (nW > 1) for (var y2 = 300; y2 < 345; y2 += 3) { ctx.fillStyle = "rgba(200,240,255," + Math.max(0, 0.1 + 0.12 * Math.sin(y2 / 6 - T * 9)) + ")"; ctx.fillRect(803, y2, 6, 2); }
      ctx.restore(); }
    // cibles de l'étape
    pending().forEach(function (p, idx) { var pulse = 0.5 + 0.5 * Math.sin(T * 4 + idx), rr = 15 + pulse * 6, hov = drag && drag.hover && drag.hover.k === p.k;
      ctx.save(); ctx.shadowColor = "rgba(253,230,138,0.95)"; ctx.shadowBlur = 16; ctx.strokeStyle = hov ? "rgba(154,230,180,1)" : "rgba(253,230,138," + (0.6 + 0.4 * pulse) + ")"; ctx.lineWidth = hov ? 4 : 2.6;
      ctx.beginPath(); ctx.arc(p.x, p.y, hov ? rr + 6 : rr, 0, 6.283); ctx.stroke(); ctx.fillStyle = "rgba(255,248,220," + (0.35 + 0.3 * pulse) + ")"; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, 6.283); ctx.fill(); ctx.restore(); });
    // missions en cours
    for (var q = jobs.length - 1; q >= 0; q--) { var j = jobs[q], u = now - j.t, sid = STEPS[j.step].id;
      if (u < FLY) { var e = ease(u / FLY), bx = j.from.x + (j.x - j.from.x) * e, by = j.from.y + (j.y + 18 - j.from.y) * e - Math.sin(e * 3.1416) * 60; drawBot(bx, by, 1.05, true); }
      else { var w = (u - FLY) / WORK, bob = Math.sin(u / 160) * 1.5; drawBot(j.x - 16, j.y + 12 + bob, 0.95, true);
        if (sid === "scaffold") { ctx.strokeStyle = "rgba(220,230,245,0.85)"; ctx.lineWidth = 1.6; var n = Math.floor(w * 8); for (var b = 0; b < n; b++) { var yy = j.y + 30 - b * 8; ctx.beginPath(); ctx.moveTo(j.x - 4, yy); ctx.lineTo(j.x + 30, yy); ctx.moveTo(j.x + 4 * (b % 2), yy); ctx.lineTo(j.x + 4 * (b % 2), yy - 8); ctx.moveTo(j.x + 26, yy); ctx.lineTo(j.x + 26, yy - 8); ctx.stroke(); } }
        if (sid === "panels" && j.ship) { var sp = Math.min(1, w * 1.6), sx = j.ship.x + (j.x + 6 - j.ship.x) * ease(sp), sy2 = j.ship.y + (j.y - 30 - j.ship.y) * ease(sp);
          ctx.fillStyle = "#d4dae6"; ctx.beginPath(); ctx.ellipse(sx, sy2, 16, 5, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = "#67e8f9"; ctx.beginPath(); ctx.ellipse(sx, sy2 - 3, 6, 3, 0, 0, 6.283); ctx.fill();
          var py = sp < 1 ? sy2 + 10 : sy2 + 10 + (j.y - sy2 - 10) * ease((w - 0.62) / 0.3); ctx.save(); ctx.shadowColor = "#fde68a"; ctx.shadowBlur = 14; ctx.fillStyle = "rgba(253,230,138,0.95)"; ctx.fillRect(sx - 7, py - 5, 14, 10); ctx.restore(); }
        if (sid === "weld" || (sid === "scaffold" && w > 0.6)) { if (Math.random() < 0.7) { ctx.fillStyle = "rgba(255,252,225,0.95)"; ctx.beginPath(); ctx.arc(j.x, j.y, rnd(2, 6), 0, 6.283); ctx.fill(); for (var z = 0; z < 3; z++) parts.push({ x: j.x, y: j.y, vx: rnd(-90, 90), vy: rnd(-80, 20), life: 0.5, age: 0, col: "#ffc86e", s: 1.4 }); } }
        if (sid === "forest" && Math.random() < 0.6) parts.push({ x: j.x + rnd(-40, 40), y: j.y + rnd(-20, 30), vx: rnd(-10, 10), vy: rnd(-40, -15), life: 1, age: 0, col: Math.random() < 0.5 ? "#9ae6b4" : "#d9f99d", s: rnd(1.5, 3) });
        if (sid === "water" && Math.random() < 0.7) parts.push({ x: j.x + rnd(-6, 6), y: j.y - 10, vx: rnd(-8, 8), vy: rnd(40, 120), life: 0.9, age: 0, col: "#bdefff", s: rnd(1.2, 2.4) });
        if (sid === "rings") { var g = ringGeom(Math.min(2, ringsOn)); ctx.save(); ctx.strokeStyle = "rgba(" + g[3] + ",0.9)"; ctx.lineWidth = 2.5; ctx.shadowColor = "rgba(" + g[3] + ",1)"; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.ellipse(CX, CY, g[0], g[1], g[2], 0, 6.283 * w); ctx.stroke(); ctx.restore(); }
        if (u > FLY + WORK) { jobs.splice(q, 1); finishJob(j); } } }
    // robots qui repartent
    bots.forEach(function (b) { if (!b.back) return; var u2 = (now - b.back.t) / 700; if (u2 >= 1) { b.back = null; return; } var e2 = ease(u2); drawBot(b.back.x + (view.x + view.w * 0.5 - b.back.x) * e2, b.back.y - 20 + (view.y + view.h + 60 - b.back.y) * e2, 1, true); });
    drawRings(T, false);
    // particules
    for (var pi = parts.length - 1; pi >= 0; pi--) { var P = parts[pi]; P.age += dt; if (P.age > P.life) { parts.splice(pi, 1); continue; } P.x += P.vx * dt; P.y += P.vy * dt; P.vy += 60 * dt;
      ctx.globalAlpha = 1 - P.age / P.life; ctx.fillStyle = P.col; ctx.beginPath(); ctx.arc(P.x, P.y, P.s, 0, 6.283); ctx.fill(); } ctx.globalAlpha = 1;
    if (state === "won" && Math.random() < 0.3) parts.push({ x: CX + rnd(-R, R), y: CY + rnd(-R, R), vx: rnd(-15, 15), vy: rnd(-30, -10), life: 1.2, age: 0, col: Math.random() < 0.5 ? "#fde68a" : "#9ae6b4", s: rnd(1, 2.5) });
    if (parts.length > 500) parts.splice(0, parts.length - 500);
  }

  /* interface */
  function renderSteps() { stepsEl.innerHTML = ""; STEPS.forEach(function (s, i) { var li = document.createElement("li"); li.className = state === "won" || i < stepI ? "is-done" : i === stepI && state === "playing" ? "is-now" : "";
      li.textContent = (i < stepI || state === "won" ? "✓ " : (i + 1) + ". ") + t("nt.step." + s.id); stepsEl.appendChild(li); }); }
  function updateUI() {
    var pct = Math.round(nDone / TOTAL * 100); progFill.style.width = pct + "%"; progEl.setAttribute("aria-valuenow", pct); scoreEl.textContent = state === "idle" ? "" : t("nt.progress", { p: pct });
    renderSteps();
    if (state === "playing") { var s = STEPS[stepI], left = pending().length + jobs.filter(function (j) { return j.step === stepI; }).length;
      statusEl.textContent = t("nt.stepOf", { n: stepI + 1, m: STEPS.length, name: t("nt.step." + s.id) }); instrEl.textContent = t("nt.instr." + s.id, { n: s.pts.filter(function (_, k) { return !done[stepI + ":" + k]; }).length }); }
    else if (state === "won") { statusEl.textContent = t("nt.solved"); instrEl.textContent = ""; }
    else { statusEl.textContent = t("nt.ready"); instrEl.textContent = ""; }
  }
  function reset() {
    stepI = 0; done = {}; nDone = 0; jobs = []; blobs = []; parts = []; ringsOn = 0; ringFade = [0, 0, 0]; fullReveal = 0; selected = -1; compDirty = true;
    bots = BOTS.map(function (n) { return { name: n, busy: false }; }); winEl.hidden = true; video.classList.remove("is-on"); try { video.pause(); } catch (e) {} video.hidden = true; againBtn.hidden = true;
  }
  function startGame() {
    if (!playable().length) { card.hidden = true; emptyBox.hidden = false; return; }
    ctxAudio(); stopSong(); reset(); song = pickSong(); state = "playing"; startedAt = performance.now();
    overlay.classList.add("is-hidden"); trayEl.hidden = false; renderTray(); updateUI(); hintEl.textContent = t("nt.hintPlay"); say(t("nt.stepOf", { n: 1, m: STEPS.length, name: t("nt.step.scaffold") }));
  }
  function win() {
    state = "won"; fullReveal = performance.now(); compDirty = true; ringsOn = 3; trayEl.hidden = true; updateUI();
    tone([523.25, 659.25, 783.99, 1046.5, 1318.5], 0.09, 0.12, 1.2); burst(CX, CY, "#fde68a", 80); burst(CX, CY, "#9ae6b4", 60);
    setTimeout(function () { if (state !== "won") return; winEl.hidden = false; if (!reduced()) { video.hidden = false; if (!video.getAttribute("src")) video.src = "assets/nouvelle-terre/nt-finale.mp4";
      var p = video.play(); if (p && p.then) p.then(function () { video.classList.add("is-on"); }).catch(function () { video.hidden = true; }); else video.classList.add("is-on"); } }, 2000);
    var secs = Math.round((performance.now() - startedAt) / 1000);
    hintEl.textContent = t("nt.hintWin", { s: secs }); againBtn.hidden = false;
    if (song) { say(t("nt.wonText", { title: song.title })); playSong(song); }
    try { stage.scrollIntoView({ block: "nearest", behavior: reduced() ? "auto" : "smooth" }); } catch (e) {}
  }
  function init() { reset(); state = "idle"; overlay.classList.remove("is-hidden"); trayEl.hidden = true; hintEl.textContent = t("nt.hintIdle"); card.hidden = false; emptyBox.hidden = true; updateUI(); layout(); }

  function bind() {
    startBtn.addEventListener("click", startGame);
    againBtn.addEventListener("click", function () { startGame(); try { stage.scrollIntoView({ block: "nearest" }); } catch (e) {} });
    window.addEventListener("resize", layout);
    if (window.EdenI18n && window.EdenI18n.onChange) window.EdenI18n.onChange(function () { stopSong(); init(); });
    var toggle = $("nav-toggle"), links = $("nav-links"); if (toggle && links) toggle.addEventListener("click", function () { var o = links.classList.toggle("is-open"); toggle.setAttribute("aria-expanded", o ? "true" : "false"); });
    init(); requestAnimationFrame(frame);
  }
  imgStart.onload = imgFinal.onload = function () { loaded++; compDirty = true; };
  imgStart.src = "assets/nouvelle-terre/nt-start.webp"; imgFinal.src = "assets/nouvelle-terre/nt-final.webp";
  window.EdenNewEarth = {
    state: function () { return { state: state, step: stepI, done: nDone, total: TOTAL, rings: ringsOn, busy: bots.filter(function (b) { return b.busy; }).length, song: song ? { id: song.id, title: song.title, lang: song.lang } : null }; },
    targets: function () { return pending().map(function (p) { var c = toClient(p.x, p.y); return { k: p.k, x: c.x, y: c.y }; }); }
  };
  getJSON("tracks.json").then(function (r) { tracks = r.tracks || r || []; }).catch(function () {})
    .then(function () { if (window.EdenSongPick && window.EdenSongPick.ready && window.EdenSongPick.ready.then) return window.EdenSongPick.ready; }).then(bind, bind);
})();
