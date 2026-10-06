/* Eden Yours — Ambiance immersive (partagée par toutes les pages qui chargent css/styles.css)
   1. Ciel : aurores violet → or qui « respirent » (couches CSS animées en transform/opacity seulement).
   2. Particules : <canvas> léger, ~40–60 points lumineux qui dérivent + deux ondes sinusoïdales lentes.
      pointer-events:none, devicePixelRatio plafonné, 30 i/s sur mobile (40 sur ordinateur),
      en pause quand l'onglet est caché, ralenti pendant un glisser-déposer, image fixe si
      prefers-reduced-motion.
   3. Lumière d'accueil : halo doré-rosé doux, une fois par visite (sessionStorage), sans bloquer.
   4. Carillon d'accueil : bol chantant Web Audio très doux (~0,2), une fois par visite ; si le
      navigateur bloque le son, il attend la première interaction — sauf si elle lance une chanson,
      un jeu ou quitte la page. Échoue en silence.
   5. Portails : petite transition « traverser le portail » avant d'ouvrir un jeu. */
(function () {
  "use strict";
  if (window.EdenAmbiance) return;

  var doc = document;
  var root = doc.documentElement;
  var WELCOME_KEY = "eden-welcome";
  var CHIME_VOLUME = 0.2;
  var api = {
    chimeVolume: CHIME_VOLUME,
    chimePlayed: false,
    chimeState: "idle", // idle | waiting | played | skipped | unavailable
    welcome: null,      // null | "full" | "light" | "reduced"
    fps: 0,
    frames: 0,
    navigate: function (url) { window.location.assign(url); }
  };
  window.EdenAmbiance = api;

  function mq(q) {
    try { return window.matchMedia ? window.matchMedia(q) : null; } catch (e) { return null; }
  }
  var reducedMQ = mq("(prefers-reduced-motion: reduce)");
  function reduced() { return !!(reducedMQ && reducedMQ.matches); }
  var coarseMQ = mq("(pointer: coarse)");
  function isMobile() {
    return !!((coarseMQ && coarseMQ.matches) || window.innerWidth < 760);
  }
  function isHome() {
    var p = window.location.pathname || "/";
    return /\/$/.test(p) || /\/index\.html$/.test(p);
  }
  function isGamePage() {
    return !!(doc.body && doc.body.classList.contains("page-casse"));
  }

  /* ---------- 1. Ciel (aurores) ---------- */
  var sky = doc.createElement("div");
  sky.className = "eden-sky";
  sky.setAttribute("aria-hidden", "true");
  sky.style.pointerEvents = "none";
  sky.innerHTML =
    '<div class="eden-aurora eden-aurora--violet"></div>' +
    '<div class="eden-aurora eden-aurora--gold"></div>' +
    '<div class="eden-aurora eden-aurora--rose"></div>';
  doc.body.insertBefore(sky, doc.body.firstChild);
  root.classList.add("eden-sky-on");

  /* ---------- 2. Particules + ondes (moteur dans un Worker/OffscreenCanvas si possible) ---------- */
  var canvas = doc.createElement("canvas");
  canvas.className = "eden-motes";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.pointerEvents = "none";
  sky.appendChild(canvas);
  function motesEngine(canvas, post) {
    var W = 0, H = 0, DPR = 1, motes = [], sprites = [], raf = 0, last = 0, running = false;
    var fps = 30, mobile = false, frames = 0, statT = 0, statF = 0, drawAvg = 0;
    var ctx = canvas.getContext("2d");
    if (!ctx) return null;
    var now = function () { return (typeof performance !== "undefined" ? performance : Date).now(); };
    var rAF = typeof requestAnimationFrame === "function" ? function (f) { return requestAnimationFrame(f); } : function (f) { return setTimeout(function () { f(now()); }, 1000 / 60); };
    var cAF = typeof cancelAnimationFrame === "function" ? function (id) { cancelAnimationFrame(id); } : function (id) { clearTimeout(id); };
    var PALETTE = ["255,214,140", "253,230,170", "216,180,254", "244,170,220", "255,240,220"];
    function makeSprite(rgb) {
      var s = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(64, 64) : document.createElement("canvas");
      s.width = s.height = 64;
      var g = s.getContext("2d");
      var grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, "rgba(" + rgb + ",1)");
      grd.addColorStop(0.18, "rgba(" + rgb + ",0.75)");
      grd.addColorStop(0.45, "rgba(" + rgb + ",0.18)");
      grd.addColorStop(1, "rgba(" + rgb + ",0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, 64, 64);
      return s;
    }
    sprites = PALETTE.map(makeSprite);
    // aurores peintes dans le même canvas (mode Worker) : une seule couche composée à 30 i/s
    // au lieu de trois grandes couches CSS à 60 i/s. Mêmes teintes et intensités que le CSS.
    var aurora = false, blobs = [];
    var BLOBS = [ // x, y, rx, ry (fractions de l'écran), couleur, alpha, période (s), amplitude dérive, respiration
      [0.28, 0.22, 0.62, 0.46, "139,92,246", 0.34, 34, 0.06, 0.25],
      [0.78, 0.34, 0.46, 0.38, "192,132,252", 0.20, 34, 0.05, 0.25],
      [0.60, 0.94, 0.70, 0.42, "246,180,70", 0.16, 27, 0.05, 0.4],
      [0.22, 0.80, 0.42, 0.32, "251,191,36", 0.09, 27, 0.05, 0.4],
      [0.12, 0.88, 0.40, 0.34, "236,72,153", 0.09, 40, 0.06, 0.45],
      [0.86, 0.60, 0.36, 0.30, "103,232,249", 0.05, 40, 0.05, 0.45]
    ];
    function blobSprite(rgb) {
      var n = 128;
      var s = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(n, n) : document.createElement("canvas");
      s.width = s.height = n;
      var g = s.getContext("2d");
      var grd = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
      grd.addColorStop(0, "rgba(" + rgb + ",1)");
      grd.addColorStop(0.35, "rgba(" + rgb + ",0.72)");
      grd.addColorStop(0.7, "rgba(" + rgb + ",0.22)");
      grd.addColorStop(1, "rgba(" + rgb + ",0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, n, n);
      return s;
    }
    function drawAurora(t) {
      if (!blobs.length) blobs = BLOBS.map(function (b) { return blobSprite(b[4]); });
      for (var i = 0; i < BLOBS.length; i++) {
        var b = BLOBS[i], ph = (t / b[6]) * Math.PI * 2 + i * 1.7;
        var cx = (b[0] + Math.sin(ph) * b[7]) * W, cy = (b[1] + Math.cos(ph * 0.8) * b[7] * 0.6) * H;
        var sc = 1 + Math.sin(ph * 0.5) * 0.05;
        var rx = b[2] * W * sc, ry = b[3] * H * sc;
        ctx.globalAlpha = b[5] * (1 - b[8] / 2 + (b[8] / 2) * Math.sin(ph + 0.6));
        ctx.drawImage(blobs[i], cx - rx, cy - ry, rx * 2, ry * 2);
      }
      ctx.globalAlpha = 1;
    }
    function seed(n) {
      motes = [];
      for (var i = 0; i < n; i++) {
        motes.push({
          x: Math.random() * W, y: Math.random() * H,
          r: 1.2 + Math.random() * 2.6,        // rayon du cœur (px CSS)
          vx: (Math.random() - 0.5) * 7,       // px/s : très lent
          vy: -3 - Math.random() * 7,          // monte doucement
          ph: Math.random() * Math.PI * 2,
          sp: 0.25 + Math.random() * 0.5,      // scintillement lent
          a: 0.35 + Math.random() * 0.45,
          c: (Math.random() * PALETTE.length) | 0
        });
      }
    }
    var WAVES = [
      { y: 0.72, amp: 18, k: 1.6, s: 0.12, col: "rgba(251, 191, 36, 0.10)" },
      { y: 0.8, amp: 24, k: 1.1, s: -0.08, col: "rgba(192, 132, 252, 0.12)" }
    ];
    function draw(tms, dt) {
      var t = tms / 1000;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (aurora) drawAurora(t);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineWidth = 1.6;
      var seg = mobile ? 28 : 48;
      for (var wi = 0; wi < WAVES.length; wi++) {
        var wv = WAVES[wi];
        ctx.beginPath();
        for (var i = 0; i <= seg; i++) {
          var x = (i / seg) * W;
          var y = H * wv.y + Math.sin((i / seg) * Math.PI * 2 * wv.k + t * wv.s * Math.PI * 2) * wv.amp +
            Math.sin((i / seg) * Math.PI * 5 + t * 0.21) * wv.amp * 0.25;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = wv.col;
        ctx.stroke();
      }
      for (var j = 0; j < motes.length; j++) {
        var m = motes[j];
        if (dt) {
          m.x += (m.vx + Math.sin(t * 0.3 + m.ph) * 3) * dt;
          m.y += m.vy * dt;
          if (m.y < -20) { m.y = H + 20; m.x = Math.random() * W; }
          if (m.x < -20) m.x = W + 20; else if (m.x > W + 20) m.x = -20;
        }
        ctx.globalAlpha = m.a * (0.55 + 0.45 * Math.sin(t * m.sp * Math.PI * 2 + m.ph));
        var size = m.r * 7;
        ctx.drawImage(sprites[m.c], m.x - size / 2, m.y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
    function loop(tms) {
      raf = rAF(loop);
      var el = tms - last;
      if (el < 1000 / fps - 2) return;
      var dt = last ? Math.min(el, 100) / 1000 : 0;
      last = tms;
      var c0 = now();
      draw(tms, dt);
      var d = now() - c0;
      drawAvg = drawAvg ? drawAvg * 0.95 + d * 0.05 : d;
      frames++; statF++;
      if (tms - statT >= 1000) {
        post({ fps: Math.round(statF * 1000 / (tms - statT)), frames: frames, drawMs: drawAvg });
        statF = 0; statT = tms;
      }
    }
    return {
      size: function (o) {
        var reseed = !W || o.reseed;
        W = o.w; H = o.h; DPR = o.dpr; mobile = o.mobile; aurora = !!o.aurora;
        canvas.width = Math.round(W * DPR);
        canvas.height = Math.round(H * DPR);
        if (reseed) seed(o.n);
        else motes.forEach(function (m) { m.x = Math.min(m.x, W); m.y = Math.min(m.y, H); });
        if (!running) draw(now(), 0);
      },
      fps: function (f) { fps = f; },
      run: function (on) {
        if (on && !running) { running = true; last = 0; statT = now(); statF = 0; raf = rAF(loop); }
        else if (!on && running) { running = false; cAF(raf); raf = 0; }
        post({ running: running, frames: frames });
      },
      still: function () { draw(now(), 0); }
    };
  }

  var engine = null, worker = null, running = false;
  function send(msg) {
    if (worker) worker.postMessage(msg);
    else if (engine) engine[msg.cmd](msg.arg);
  }
  function onStats(s) {
    if (s.fps != null) api.fps = s.fps;
    if (s.frames != null) api.frames = s.frames;
    if (s.drawMs != null) api.drawMs = s.drawMs;
  }
  var W = 0, H = 0;
  function count() {
    var n = isMobile() ? 40 : 60;
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) n = Math.round(n * 0.7);
    return n;
  }
  function sizeMsg(force) {
    var w = window.innerWidth, h = window.innerHeight;
    // la barre d'adresse mobile change la hauteur sans cesse : on ignore les petites variations
    if (!force && w === W && Math.abs(h - H) < 140) return null;
    var reseed = !W || force;
    W = w; H = h;
    // résolution interne réduite : les halos sont flous par nature et le navigateur les agrandit
    // sans perte visible (ordinateur : 0,5 px par px CSS ; téléphone DPR 2–3 : 1 px par px CSS).
    return { w: W, h: H, dpr: Math.min(window.devicePixelRatio || 1, 2) * 0.5, mobile: isMobile(), n: count(), reseed: reseed, aurora: !!worker };
  }
  var dragging = false;
  function curFps() { return dragging ? 15 : (isMobile() ? 30 : 40); }
  function start() {
    if (!(engine || worker) || running || reduced() || doc.hidden) return;
    running = true;
    send({ cmd: "fps", arg: curFps() });
    send({ cmd: "run", arg: true });
  }
  function stop() {
    if (!running) return;
    running = false;
    send({ cmd: "run", arg: false });
  }

  try {
    var canTransfer = canvas.transferControlToOffscreen && typeof Worker !== "undefined" && typeof Blob !== "undefined" && window.URL && URL.createObjectURL;
    if (canTransfer) {
      var src = "var engine=null;var motesEngine=" + motesEngine.toString() + ";" +
        "self.onmessage=function(e){var d=e.data;try{if(d.cmd==='init'){engine=motesEngine(d.canvas,function(s){self.postMessage(s);});if(!engine)self.postMessage({fail:1});return;}" +
        "if(engine)engine[d.cmd](d.arg);}catch(err){self.postMessage({fail:1});}};";
      var url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
      var off = canvas.transferControlToOffscreen();
      worker = new Worker(url);
      worker.onmessage = function (e) {
        if (e.data && e.data.fail) { worker.terminate(); worker = null; running = false; root.classList.remove("eden-aurora-canvas"); return; }
        onStats(e.data);
      };
      worker.onerror = function () { if (worker) worker.terminate(); worker = null; running = false; root.classList.remove("eden-aurora-canvas"); };
      worker.postMessage({ cmd: "init", canvas: off }, [off]);
      api.mode = "worker";
      root.classList.add("eden-aurora-canvas"); // les couches CSS cèdent la place au canvas
    }
  } catch (e) { worker = null; }
  if (!worker) {
    try { engine = canvas.getContext && motesEngine(canvas, onStats); } catch (e) { engine = null; }
    if (engine) api.mode = "main";
  }
  if (engine || worker) {
    send({ cmd: "size", arg: sizeMsg(true) });
    if (reduced()) send({ cmd: "still" }); else start();
    var rT = 0;
    window.addEventListener("resize", function () {
      clearTimeout(rT);
      rT = setTimeout(function () { var m = sizeMsg(false); if (m) send({ cmd: "size", arg: m }); if (running) send({ cmd: "fps", arg: curFps() }); }, 200);
    }, { passive: true });
    doc.addEventListener("visibilitychange", function () {
      if (doc.hidden) stop(); else start();
    });
    if (reducedMQ && reducedMQ.addEventListener) {
      reducedMQ.addEventListener("change", function () {
        if (reduced()) { stop(); send({ cmd: "still" }); } else start();
      });
    }
    // glisser-déposer du casse-tête : on cède le processeur (15 i/s)
    doc.addEventListener("pointerdown", function (e) {
      if (e.target && e.target.closest && e.target.closest(".piece, #board, #tray")) {
        dragging = true;
        if (running) send({ cmd: "fps", arg: curFps() });
      }
    }, { capture: true, passive: true });
    var endDrag = function () {
      if (!dragging) return;
      dragging = false;
      if (running) send({ cmd: "fps", arg: curFps() });
    };
    doc.addEventListener("pointerup", endDrag, { capture: true, passive: true });
    doc.addEventListener("pointercancel", endDrag, { capture: true, passive: true });
  }
  api.stop = stop;
  api.start = start;
  api.running = function () { return running; };

  /* ---------- Suivi discret des lectures audio (pour ne jamais couvrir une chanson) ---------- */
  var playing = [];
  try {
    var MP = window.HTMLMediaElement && window.HTMLMediaElement.prototype;
    if (MP && MP.play && !MP.play.__edenWrapped) {
      var origPlay = MP.play;
      var wrapped = function () {
        var el = this;
        if (playing.indexOf(el) < 0) {
          playing.push(el);
          var off = function () {
            var i = playing.indexOf(el);
            if (i >= 0) playing.splice(i, 1);
            el.removeEventListener("pause", off);
            el.removeEventListener("ended", off);
          };
          try { el.addEventListener("pause", off); el.addEventListener("ended", off); } catch (e) { /* ignore */ }
        }
        api.lastMediaPlay = Date.now();
        return origPlay.apply(this, arguments);
      };
      wrapped.__edenWrapped = true;
      MP.play = wrapped;
    }
  } catch (e) { /* ignore */ }

  function mediaBusy() {
    var i, list = doc.querySelectorAll("audio, video");
    for (i = 0; i < list.length; i++) if (!list[i].paused && !list[i].ended) return true;
    for (i = 0; i < playing.length; i++) if (!playing[i].paused && !playing[i].ended) return true;
    if (api.lastMediaPlay && Date.now() - api.lastMediaPlay < 1500) return true;
    if (doc.body.classList.contains("has-embed-player")) return true;
    return false;
  }

  /* ---------- 4. Carillon d'accueil ---------- */
  var audioCtx = null;
  function getAudio() {
    if (audioCtx) return audioCtx;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    } catch (e) { audioCtx = null; }
    return audioCtx;
  }

  function synthChime(ac) {
    var now = ac.currentTime + 0.03;
    var master = ac.createGain();
    master.gain.setValueAtTime(CHIME_VOLUME, now);
    var lp = ac.createBiquadFilter ? ac.createBiquadFilter() : null;
    if (lp) {
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(2600, now);
      lp.connect(master);
    }
    master.connect(ac.destination);
    var out = lp || master;
    // bol chantant : partiels légèrement inharmoniques, attaque lente, longue décroissance
    var PARTIALS = [[1, 0.42, 1.9], [1.003, 0.2, 1.9], [2.0, 0.12, 1.3], [2.76, 0.09, 1.0], [4.07, 0.035, 0.7]];
    function bell(t, f, level) {
      PARTIALS.forEach(function (p) {
        var o = ac.createOscillator();
        var g = ac.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(f * p[0], t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(p[1] * level, t + 0.12);
        g.gain.exponentialRampToValueAtTime(0.0001, t + p[2]);
        o.connect(g);
        g.connect(out);
        o.start(t);
        o.stop(t + p[2] + 0.05);
      });
    }
    bell(now, 392.0, 1);          // sol4
    bell(now + 0.32, 587.33, 0.6); // ré5 (quinte) — « bienvenue »
    setTimeout(function () { try { if (ac.close) ac.close(); } catch (e) { /* ignore */ } audioCtx = null; }, 2600);
  }

  function playChime() {
    if (api.chimePlayed) return true;
    var ac = getAudio();
    if (!ac || ac.state !== "running") return false;
    try {
      synthChime(ac);
      api.chimePlayed = true;
      api.chimeState = "played";
    } catch (e) { api.chimeState = "unavailable"; }
    return true;
  }

  var GESTURES = ["pointerdown", "keydown", "touchend", "click"];
  var decided = false, armedUntil = 0, waitUntil = 0;

  function unhook() {
    GESTURES.forEach(function (ev) { doc.removeEventListener(ev, onGesture, true); });
  }
  function giveUp(state) {
    api.chimeState = state || "skipped";
    unhook();
    if (audioCtx && !api.chimePlayed) {
      try { if (audioCtx.close) audioCtx.close(); } catch (e) { /* ignore */ }
      audioCtx = null;
    }
  }

  // Interactions qui lancent un son, un jeu ou une navigation : pas de carillon.
  var BUSY_SEL = "button:not(.lang-btn):not(.nav-toggle), [role=button], audio, video, iframe, input, select, textarea, label, " +
    ".player-bar, .track-list, .track-row, .featured-card, .player-card, .piece, #board, #tray, .game-card, .other-game, .games-banner";

  function targetIsBusy(e) {
    var tg = e.target && e.target.closest ? e.target : null;
    if (!tg) return false;
    if (tg.closest(BUSY_SEL)) return true;
    var a = tg.closest("a[href]");
    if (a) {
      var href = a.getAttribute("href") || "";
      if (href.charAt(0) !== "#") return true; // quitte la page : le son serait coupé
    }
    if (e.type === "keydown" && (e.key === "Enter" || e.key === " ") && tg !== doc.body) return true;
    return false;
  }

  function onGesture(e) {
    if (api.chimePlayed) { unhook(); return; }
    if (Date.now() > waitUntil) { giveUp("skipped"); return; }
    if (!decided) {
      if (e.type === "keydown" && /^(Shift|Control|Alt|Meta)$/.test(e.key)) return;
      decided = true;
      if (isGamePage() || mediaBusy() || targetIsBusy(e)) { giveUp("skipped"); return; }
      armedUntil = Date.now() + 1500; // le même geste peut finir en touchend/click (activation mobile)
    }
    if (Date.now() > armedUntil) { giveUp("skipped"); return; }
    if (mediaBusy()) { giveUp("skipped"); return; }
    var ac = getAudio();
    if (!ac) { giveUp("unavailable"); return; }
    var go = function () { if (!api.chimePlayed && !mediaBusy() && playChime()) unhook(); };
    if (ac.state === "running") { go(); return; }
    try {
      var p = ac.resume && ac.resume();
      if (p && p.then) p.then(go, function () { /* attend la fin du geste */ });
    } catch (err) { /* silencieux */ }
  }

  function tryChimeNow() {
    if (mediaBusy()) { api.chimeState = "skipped"; return; }
    var ac = getAudio();
    if (!ac) { api.chimeState = "unavailable"; return; }
    if (ac.state === "running" && playChime()) return;
    // son bloqué avant un geste : on attend la première interaction (2 min max)
    api.chimeState = "waiting";
    waitUntil = Date.now() + 120000;
    GESTURES.forEach(function (ev) { doc.addEventListener(ev, onGesture, true); });
  }

  /* ---------- 3. Lumière d'accueil ---------- */
  function firstVisit() {
    try {
      if (window.sessionStorage.getItem(WELCOME_KEY)) return false;
      window.sessionStorage.setItem(WELCOME_KEY, String(Date.now()));
      return true;
    } catch (e) {
      return isHome(); // stockage indisponible : seulement à l'accueil
    }
  }

  function welcome() {
    var kind = reduced() ? "reduced" : (isHome() ? "full" : "light");
    api.welcome = kind;
    var el = doc.createElement("div");
    el.className = "eden-welcome is-" + kind;
    el.setAttribute("aria-hidden", "true");
    el.style.pointerEvents = "none";
    el.innerHTML = '<div class="eden-welcome-veil"></div><div class="eden-welcome-bloom"></div>';
    doc.body.appendChild(el);
    var done = function () { if (el.parentNode) el.parentNode.removeChild(el); };
    el.addEventListener("animationend", function (e) { if (e.target === el.lastChild || e.target === el) done(); });
    setTimeout(done, kind === "reduced" ? 1600 : 3200);
    api.welcomeEl = el;
    setTimeout(tryChimeNow, kind === "reduced" ? 150 : 450);
  }

  if (firstVisit()) welcome();

  /* ---------- 5. Portails : traverser avant d'entrer ---------- */
  var PORTAL_SEL = ".game-card, .other-game, .portal-mini";
  doc.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest(PORTAL_SEL) : null;
    if (!a || a.tagName !== "A" || !a.href || (a.target && a.target !== "_self")) return;
    if (reduced()) return; // navigation immédiate
    e.preventDefault();
    var url = a.href;
    var r = a.getBoundingClientRect();
    var gate = a.querySelector(".game-visual, .other-game-icon, .portal-mini-gate") || a;
    var g = gate.getBoundingClientRect();
    var cx = g.width ? g.left + g.width / 2 : (r.left + r.width / 2);
    var cy = g.height ? g.top + g.height / 2 : (r.top + r.height / 2);
    a.classList.add("is-entering");
    var veil = doc.createElement("div");
    veil.className = "eden-step";
    veil.setAttribute("aria-hidden", "true");
    veil.style.pointerEvents = "none";
    veil.style.setProperty("--x", Math.round(cx) + "px");
    veil.style.setProperty("--y", Math.round(cy) + "px");
    doc.body.appendChild(veil);
    api.lastPortal = url;
    setTimeout(function () { api.navigate(url); }, 480);
    // filet de sécurité si la navigation n'a pas lieu
    setTimeout(function () { a.classList.remove("is-entering"); if (veil.parentNode) veil.parentNode.removeChild(veil); }, 2500);
  });
  // retour arrière (bfcache) : on efface la transition restée affichée
  window.addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    var v = doc.querySelectorAll(".eden-step");
    for (var i = 0; i < v.length; i++) v[i].parentNode.removeChild(v[i]);
    var p = doc.querySelectorAll(".is-entering");
    for (var j = 0; j < p.length; j++) p[j].classList.remove("is-entering");
  });
})();
