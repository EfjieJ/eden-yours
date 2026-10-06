/* Eden Yours — Labyrinthe sonore.
   - Labyrinthe généré (backtracker récursif), 3 niveaux : 7×7, 9×9, 11×11.
   - Sons 100 % synthétisés (Web Audio) : nappe continue dont le filtre/la hauteur suivent la position,
     sources cachées (cloche de cristal, accord chaud, souffle scintillant) dont le volume, la clarté et
     le panoramique suivent la distance et la direction du joueur. Aucun fichier audio, aucun réseau.
   - L'audio démarre seulement après « Commencer ». Bouton muet. Respecte prefers-reduced-motion. */
(function () {
  "use strict";

  var LEVELS = [{ n: 7, sources: 3 }, { n: 9, sources: 4 }, { n: 11, sources: 4 }];
  var N = 1, E = 2, S = 4, W = 8;
  var DIRS = {
    up: { dx: 0, dy: -1, wall: N, opp: S },
    right: { dx: 1, dy: 0, wall: E, opp: W },
    down: { dx: 0, dy: 1, wall: S, opp: N },
    left: { dx: -1, dy: 0, wall: W, opp: E }
  };
  var TYPES = ["bell", "pad", "wind", "crystal"];
  var COLORS = { bell: "103,232,249", pad: "240,171,252", wind: "253,230,138", crystal: "196,181,253" };

  var $ = function (id) { return document.getElementById(id); };
  var canvas = $("lab-canvas");
  if (!canvas) return;
  var g = canvas.getContext("2d");
  var els = {
    level: $("lab-level"), sources: $("lab-sources"), moves: $("lab-moves"), hint: $("lab-hint"),
    mute: $("lab-mute"), restart: $("lab-restart"), intro: $("lab-intro"), start: $("lab-start"),
    win: $("lab-win"), winTitle: $("lab-win-title"), stars: $("lab-stars"), next: $("lab-next"),
    noaudio: $("lab-noaudio")
  };

  function t(k, v) { return window.EdenI18n ? window.EdenI18n.t(k, v) : k; }
  var rmq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function reduced() { return !!(rmq && rmq.matches); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- État ---------- */
  var st = {
    level: 0, n: 7, walls: [], px: 0, py: 0, ox: 0, oy: 0, moves: 0, t0: 0, srcs: [],
    exitOpen: false, playing: false, started: false, done: false, ideal: 1, muted: false, hintKey: "lab.hint"
  };
  try { st.muted = localStorage.getItem("eden-lab-muted") === "1"; } catch (e) {}

  /* ---------- Labyrinthe ---------- */
  function generate(n) {
    var walls = [], seen = [], x, y;
    for (y = 0; y < n; y++) { walls.push([]); seen.push([]); for (x = 0; x < n; x++) { walls[y].push(15); seen[y].push(false); } }
    var stack = [[0, 0]];
    seen[0][0] = true;
    while (stack.length) {
      var cur = stack[stack.length - 1], opts = [];
      Object.keys(DIRS).forEach(function (k) {
        var d = DIRS[k], nx = cur[0] + d.dx, ny = cur[1] + d.dy;
        if (nx >= 0 && ny >= 0 && nx < n && ny < n && !seen[ny][nx]) opts.push([nx, ny, d]);
      });
      if (!opts.length) { stack.pop(); continue; }
      var o = opts[(Math.random() * opts.length) | 0];
      walls[cur[1]][cur[0]] &= ~o[2].wall;
      walls[o[1]][o[0]] &= ~o[2].opp;
      seen[o[1]][o[0]] = true;
      stack.push([o[0], o[1]]);
    }
    return walls;
  }

  function bfs(walls, n, sx, sy) {
    var dist = [], q = [[sx, sy]], i, y;
    for (y = 0; y < n; y++) { dist.push([]); for (i = 0; i < n; i++) dist[y].push(-1); }
    dist[sy][sx] = 0;
    while (q.length) {
      var c = q.shift();
      Object.keys(DIRS).forEach(function (k) {
        var d = DIRS[k];
        if (walls[c[1]][c[0]] & d.wall) return;
        var nx = c[0] + d.dx, ny = c[1] + d.dy;
        if (dist[ny][nx] < 0) { dist[ny][nx] = dist[c[1]][c[0]] + 1; q.push([nx, ny]); }
      });
    }
    return dist;
  }

  function setupLevel(i) {
    var L = LEVELS[i], n = L.n;
    st.level = i; st.n = n; st.walls = generate(n);
    st.px = st.py = st.ox = st.oy = 0; st.moves = 0; st.t0 = 0; st.exitOpen = false; st.done = false;
    var d0 = bfs(st.walls, n, 0, 0), cells = [], x, y;
    for (y = 0; y < n; y++) for (x = 0; x < n; x++) {
      if ((x === 0 && y === 0) || (x === n - 1 && y === n - 1)) continue;
      if (d0[y][x] >= 3) cells.push([x, y]);
    }
    // Sources éloignées les unes des autres
    st.srcs = [];
    for (var k = 0; k < L.sources; k++) {
      var best = null, bestScore = -1;
      for (var tries = 0; tries < 40; tries++) {
        var c = cells[(Math.random() * cells.length) | 0], score = 99;
        st.srcs.forEach(function (s) { score = Math.min(score, Math.abs(s.x - c[0]) + Math.abs(s.y - c[1])); });
        score = Math.min(score, Math.abs(n - 1 - c[0]) + Math.abs(n - 1 - c[1]) + 1);
        if (score > bestScore) { bestScore = score; best = c; }
      }
      st.srcs.push({ x: best[0], y: best[1], type: TYPES[k % TYPES.length], found: false, voice: null, lit: 0 });
    }
    // Parcours « idéal » (glouton) pour des étoiles indulgentes
    var cx = 0, cy = 0, left = st.srcs.slice(), total = 0;
    while (left.length) {
      var dd = bfs(st.walls, n, cx, cy);
      left.sort(function (a, b) { return dd[a.y][a.x] - dd[b.y][b.x]; });
      total += dd[left[0].y][left[0].x]; cx = left[0].x; cy = left[0].y; left.shift();
    }
    total += bfs(st.walls, n, cx, cy)[n - 1][n - 1];
    st.ideal = Math.max(1, total);
    els.win.hidden = true;
    if (window.EdenStars) window.EdenStars.clear(els.stars);
    st.hintKey = "lab.hint";
    if (audio.ctx) buildVoices();
    updateHud(); resize();
  }

  /* ---------- Audio (Web Audio seulement) ---------- */
  var audio = { ctx: null, master: null, bus: null, drone: null, noise: null, exitVoice: null };

  function initAudio() {
    if (audio.ctx) { if (audio.ctx.state === "suspended") audio.ctx.resume(); return true; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      var c = audio.ctx = new AC();
      audio.master = c.createGain();
      audio.master.gain.value = st.muted ? 0 : 0.9;
      var comp = c.createDynamicsCompressor();
      audio.master.connect(comp); comp.connect(c.destination);
      // bus : sec + écho doux filtré (espace méditatif)
      audio.bus = c.createGain();
      audio.bus.connect(audio.master);
      var delay = c.createDelay(1.5), fb = c.createGain(), lp = c.createBiquadFilter(), wet = c.createGain();
      delay.delayTime.value = 0.38; fb.gain.value = 0.42; lp.type = "lowpass"; lp.frequency.value = 2200; wet.gain.value = 0.32;
      audio.bus.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(wet); wet.connect(audio.master);
      // bruit blanc partagé (souffle)
      var buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), data = buf.getChannelData(0);
      for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      audio.noise = buf;
      // nappe continue
      var dg = c.createGain(), df = c.createBiquadFilter();
      df.type = "lowpass"; df.frequency.value = 380; df.Q.value = 3;
      dg.gain.value = 0;
      var oscs = [[65.41, "sawtooth", 0], [65.41, "sawtooth", 8], [98, "triangle", -4], [32.7, "sine", 0]].map(function (p) {
        var o = c.createOscillator(), og = c.createGain();
        o.type = p[1]; o.frequency.value = p[0]; o.detune.value = p[2];
        og.gain.value = p[1] === "sine" ? 0.7 : 0.35;
        o.connect(og); og.connect(df); o.start();
        return o;
      });
      var lfo = c.createOscillator(), lfoG = c.createGain();
      lfo.frequency.value = 0.06; lfoG.gain.value = 90; lfo.connect(lfoG); lfoG.connect(df.frequency); lfo.start();
      df.connect(dg); dg.connect(audio.bus);
      dg.gain.setTargetAtTime(0.11, c.currentTime + 0.1, 1.2);
      audio.drone = { gain: dg, filter: df, oscs: oscs };
      return true;
    } catch (e) { audio.ctx = null; return false; }
  }

  function bellTone(out, freq, when, peak, len) {
    var c = audio.ctx;
    [[1, 1, "sine"], [2.01, 0.22, "sine"], [3.0, 0.08, "triangle"], [4.2, 0.04, "sine"]].forEach(function (p) {
      var o = c.createOscillator(), gg = c.createGain();
      o.type = p[2]; o.frequency.value = freq * p[0];
      gg.gain.setValueAtTime(0.0001, when);
      gg.gain.exponentialRampToValueAtTime(peak * p[1], when + 0.012);
      gg.gain.exponentialRampToValueAtTime(0.0001, when + len / (p[0] > 2 ? 2 : 1));
      o.connect(gg); gg.connect(out); o.start(when); o.stop(when + len + 0.1);
    });
  }

  function makeVoice(type) {
    var c = audio.ctx;
    var v = { type: type, out: c.createGain(), lp: c.createBiquadFilter(), pan: c.createStereoPanner ? c.createStereoPanner() : null, nodes: [], timer: 0 };
    v.out.gain.value = 0;
    v.lp.type = "lowpass"; v.lp.frequency.value = 1500;
    v.out.connect(v.lp);
    if (v.pan) { v.lp.connect(v.pan); v.pan.connect(audio.bus); } else v.lp.connect(audio.bus);
    function osc(f, typ, gain, det, dest) {
      var o = c.createOscillator(), og = c.createGain();
      o.type = typ; o.frequency.value = f; o.detune.value = det || 0; og.gain.value = gain;
      o.connect(og); og.connect(dest || v.out); o.start(); v.nodes.push(o); return og;
    }
    if (type === "pad" || type === "exit") {
      var freqs = type === "pad" ? [329.63, 392, 493.88, 587.33] : [523.25, 783.99];
      var trem = c.createGain(); trem.gain.value = 0.75; trem.connect(v.out);
      freqs.forEach(function (f, i) { osc(f, "triangle", 0.09, i % 2 ? 6 : -6, trem); });
      var lfo = c.createOscillator(), lg = c.createGain();
      lfo.frequency.value = type === "pad" ? 0.22 : 0.5; lg.gain.value = 0.25;
      lfo.connect(lg); lg.connect(trem.gain); lfo.start(); v.nodes.push(lfo);
    } else if (type === "wind") {
      var src = c.createBufferSource(), bp = c.createBiquadFilter(), ng = c.createGain();
      src.buffer = audio.noise; src.loop = true;
      bp.type = "bandpass"; bp.frequency.value = 1600; bp.Q.value = 5; ng.gain.value = 0.9;
      src.connect(bp); bp.connect(ng); ng.connect(v.out); src.start(); v.nodes.push(src);
      var wl = c.createOscillator(), wg = c.createGain();
      wl.frequency.value = 0.12; wg.gain.value = 900; wl.connect(wg); wg.connect(bp.frequency); wl.start(); v.nodes.push(wl);
      osc(1760, "sine", 0.025, 0); osc(2637, "sine", 0.015, 0); // scintillement
    } else {
      var notes = type === "bell" ? [783.99, 659.25, 880, 1046.5] : [1318.51, 1567.98, 1760, 2093];
      var k = 0, period = type === "bell" ? 1900 : 1500;
      var ring = function () {
        if (!audio.ctx) return;
        bellTone(v.out, notes[k++ % notes.length], audio.ctx.currentTime + 0.02, type === "bell" ? 0.35 : 0.22, type === "bell" ? 2.2 : 1.4);
      };
      ring(); v.timer = setInterval(ring, period);
    }
    return v;
  }

  function killVoice(v, fade) {
    if (!v || !audio.ctx) return;
    var c = audio.ctx, end = c.currentTime + (fade || 0.05);
    clearInterval(v.timer);
    v.out.gain.cancelScheduledValues(c.currentTime);
    v.out.gain.setTargetAtTime(0, c.currentTime, (fade || 0.05) / 3);
    v.nodes.forEach(function (o) { try { o.stop(end + 0.2); } catch (e) {} });
    setTimeout(function () { try { v.out.disconnect(); } catch (e) {} }, (fade || 0.05) * 1000 + 400);
  }

  function buildVoices() {
    st.srcs.forEach(function (s) { if (s.voice) killVoice(s.voice, 0.3); s.voice = s.found ? null : makeVoice(s.type); });
    if (audio.exitVoice) { killVoice(audio.exitVoice, 0.3); audio.exitVoice = null; }
    updateAudio(true);
  }

  function spatial(v, sx, sy, scale, instant) {
    var c = audio.ctx, now = c.currentTime, tc = instant ? 0.01 : 0.35;
    var dx = sx - st.px, dy = sy - st.py, d = Math.sqrt(dx * dx + dy * dy);
    var vol = (0.025 + 0.75 * Math.exp(-d / 1.7)) * scale;
    v.out.gain.setTargetAtTime(vol, now, tc);
    v.lp.frequency.setTargetAtTime(700 + 7000 * Math.exp(-d / 2.2), now, tc);
    if (v.pan) v.pan.pan.setTargetAtTime(clamp(dx / 2.5, -1, 1) * 0.9, now, tc);
  }

  function updateAudio(instant) {
    if (!audio.ctx) return;
    var c = audio.ctx, n = st.n, now = c.currentTime;
    var fx = st.px / (n - 1), fy = st.py / (n - 1);
    audio.drone.filter.frequency.setTargetAtTime(260 + 1100 * fx, now, 0.6);
    audio.drone.oscs.forEach(function (o, i) { o.detune.setTargetAtTime([0, 8, -4, 0][i] + fy * 200, now, 0.8); });
    st.srcs.forEach(function (s) { if (s.voice) spatial(s.voice, s.x, s.y, s.type === "pad" ? 0.9 : 1, instant); });
    if (audio.exitVoice) spatial(audio.exitVoice, n - 1, n - 1, 0.6, instant);
  }

  function chime() {
    if (!audio.ctx) return;
    var c = audio.ctx, now = c.currentTime + 0.03;
    [783.99, 1046.5, 1318.51, 1567.98].forEach(function (f, i) { bellTone(audio.bus, f, now + i * 0.12, 0.22, 1.8); });
  }

  function bump() {
    if (!audio.ctx) return;
    var c = audio.ctx, o = c.createOscillator(), gg = c.createGain(), now = c.currentTime;
    o.type = "sine"; o.frequency.setValueAtTime(130, now); o.frequency.exponentialRampToValueAtTime(70, now + 0.15);
    gg.gain.setValueAtTime(0.0001, now); gg.gain.exponentialRampToValueAtTime(0.12, now + 0.01); gg.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    o.connect(gg); gg.connect(audio.bus); o.start(now); o.stop(now + 0.25);
  }

  function victorySound(stars) {
    if (st.muted) return;
    if (window.EdenStars && window.EdenStars.play) { window.EdenStars.play(stars); return; }
    if (!audio.ctx) return;
    var now = audio.ctx.currentTime + 0.03;
    [523.25, 659.25, 783.99].forEach(function (f, i) { bellTone(audio.bus, f, now + i * 0.26, 0.4, 1.4); });
  }

  function setMuted(m) {
    st.muted = m;
    try { localStorage.setItem("eden-lab-muted", m ? "1" : "0"); } catch (e) {}
    if (audio.ctx) audio.master.gain.setTargetAtTime(m ? 0 : 0.9, audio.ctx.currentTime, 0.15);
    els.mute.textContent = m ? "🔇" : "🔊";
    els.mute.setAttribute("aria-pressed", m ? "true" : "false");
    els.mute.setAttribute("aria-label", t(m ? "lab.unmute" : "lab.mute"));
    els.mute.title = t(m ? "lab.unmute" : "lab.mute");
  }

  /* ---------- Jeu ---------- */
  function found() { return st.srcs.filter(function (s) { return s.found; }).length; }

  function move(dir) {
    if (!st.playing || st.done) return;
    var d = DIRS[dir];
    if (st.walls[st.py][st.px] & d.wall) { bump(); return; }
    if (!st.t0) st.t0 = Date.now();
    st.ox = st.px; st.oy = st.py; st.anim = performance.now();
    st.px += d.dx; st.py += d.dy; st.moves++;
    st.srcs.forEach(function (s) {
      if (!s.found && s.x === st.px && s.y === st.py) {
        s.found = true; s.litAt = performance.now();
        if (s.voice) { killVoice(s.voice, 1.4); s.voice = null; }
        chime();
        if (found() === st.srcs.length) {
          st.exitOpen = true; st.hintKey = "lab.allFound";
          if (audio.ctx) audio.exitVoice = makeVoice("exit");
        } else st.hintKey = "lab.found";
      }
    });
    updateAudio(false);
    if (st.exitOpen && st.px === st.n - 1 && st.py === st.n - 1) win();
    updateHud();
  }

  function starsFor(moves, secs) {
    var I = st.ideal;
    if (moves <= I * 2 + 8 && secs <= 75 + I * 2) return 3;
    if (moves <= I * 3.5 + 14 && secs <= 180 + I * 3) return 2;
    return 1;
  }

  function win() {
    st.done = true;
    var secs = st.t0 ? (Date.now() - st.t0) / 1000 : 0;
    var n = starsFor(st.moves, secs);
    if (audio.exitVoice) { killVoice(audio.exitVoice, 1); audio.exitVoice = null; }
    victorySound(n);
    var last = st.level === LEVELS.length - 1;
    els.winTitle.textContent = t(last ? "lab.done" : "lab.win");
    els.next.textContent = t(last ? "lab.again" : "lab.next");
    var detail = t("lab.detail", { moves: st.moves, time: window.EdenStars ? window.EdenStars.formatTime(secs) : Math.round(secs) + " s" });
    if (window.EdenStars) {
      window.EdenStars.render(els.stars, n, { line: t("lab.stars" + n), detail: detail, session: window.EdenStars.record("labyrinthe", n) });
    }
    setTimeout(function () { els.win.hidden = false; els.next.focus({ preventScroll: true }); }, reduced() ? 0 : 500);
  }

  function updateHud() {
    els.level.textContent = t("lab.level", { n: st.level + 1, total: LEVELS.length });
    els.sources.textContent = t("lab.sources", { found: found(), total: st.srcs.length });
    els.moves.textContent = t("lab.moves", { n: st.moves });
    els.hint.textContent = t(st.hintKey);
  }

  /* ---------- Dessin ---------- */
  var view = { size: 300, dpr: 1 };
  function resize() {
    var w = Math.max(200, Math.floor(canvas.clientWidth || 320));
    view.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    view.size = w;
    canvas.width = Math.round(w * view.dpr); canvas.height = Math.round(w * view.dpr);
    draw(performance.now());
  }

  function glowDot(x, y, r, rgb, a) {
    var gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, "rgba(" + rgb + "," + a + ")");
    gr.addColorStop(1, "rgba(" + rgb + ",0)");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }

  function draw(now) {
    var W = view.size, n = st.n, pad = W * 0.04, cs = (W - pad * 2) / n, still = reduced();
    var pulse = still ? 0.5 : 0.5 + 0.5 * Math.sin(now / 900);
    g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    var bg = g.createRadialGradient(W / 2, W / 2, W * 0.1, W / 2, W / 2, W * 0.75);
    bg.addColorStop(0, "#1c0f3a"); bg.addColorStop(1, "#08051a");
    g.fillStyle = bg; g.fillRect(0, 0, W, W);
    var cx = function (x) { return pad + (x + 0.5) * cs; };
    // zones éclairées
    st.srcs.forEach(function (s) {
      if (!s.found) return;
      var k = still ? 1 : clamp((now - (s.litAt || 0)) / 1200, 0, 1);
      glowDot(cx(s.x), cx(s.y), cs * (0.6 + 1.6 * k), COLORS[s.type], 0.45 * k + 0.1 * pulse * k);
      glowDot(cx(s.x), cx(s.y), cs * 0.16, "255,255,255", 0.9 * k);
    });
    // sortie
    var ex = cx(n - 1), ey = cx(n - 1);
    if (st.exitOpen) {
      glowDot(ex, ey, cs * (1.1 + 0.35 * pulse), "251,191,36", 0.6);
      g.strokeStyle = "rgba(253,230,138,0.95)";
    } else g.strokeStyle = "rgba(192,132,252,0.35)";
    g.lineWidth = Math.max(1.5, cs * 0.06);
    g.beginPath(); g.arc(ex, ey, cs * 0.28, 0, Math.PI * 2); g.stroke();
    // murs : dégradé violet → or, halo
    var grad = g.createLinearGradient(0, 0, W, W);
    grad.addColorStop(0, "#a855f7"); grad.addColorStop(0.55, "#e879f9"); grad.addColorStop(1, "#fbbf24");
    g.strokeStyle = grad; g.lineCap = "round"; g.lineWidth = Math.max(2, cs * 0.085);
    g.shadowColor = "rgba(216,160,255,0.85)"; g.shadowBlur = cs * 0.35;
    g.beginPath();
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
      var w = st.walls[y] ? st.walls[y][x] : 15, X = pad + x * cs, Y = pad + y * cs;
      if (w & N) { g.moveTo(X, Y); g.lineTo(X + cs, Y); }
      if (w & W) { g.moveTo(X, Y); g.lineTo(X, Y + cs); }
      if (y === n - 1 && (w & S)) { g.moveTo(X, Y + cs); g.lineTo(X + cs, Y + cs); }
      if (x === n - 1 && (w & E)) { g.moveTo(X + cs, Y); g.lineTo(X + cs, Y + cs); }
    }
    g.stroke(); g.shadowBlur = 0;
    // orbe du joueur (glisse doucement, sauf mouvement réduit)
    var k2 = still || !st.anim ? 1 : clamp((now - st.anim) / 140, 0, 1);
    var e2 = 1 - Math.pow(1 - k2, 3);
    var px = cx(st.ox + (st.px - st.ox) * e2), py = cx(st.oy + (st.py - st.oy) * e2);
    glowDot(px, py, cs * (0.95 + 0.12 * pulse), "251,191,36", 0.35);
    var og = g.createRadialGradient(px - cs * 0.06, py - cs * 0.06, 0, px, py, cs * 0.3);
    og.addColorStop(0, "#fffbea"); og.addColorStop(0.45, "#fde68a"); og.addColorStop(1, "rgba(251,191,36,0)");
    g.fillStyle = og; g.beginPath(); g.arc(px, py, cs * 0.3, 0, Math.PI * 2); g.fill();
  }

  function loop(now) { draw(now); requestAnimationFrame(loop); }

  /* ---------- Contrôles ---------- */
  var KEYS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right", z: "up", q: "left" };
  document.addEventListener("keydown", function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    var dir = KEYS[e.key] || KEYS[String(e.key).toLowerCase()];
    if (!dir || !st.playing || st.done) return;
    e.preventDefault();
    move(dir);
  });

  var touch = null;
  canvas.addEventListener("touchstart", function (e) { var p = e.changedTouches[0]; touch = { x: p.clientX, y: p.clientY }; }, { passive: true });
  canvas.addEventListener("touchmove", function (e) { if (st.playing) e.preventDefault(); }, { passive: false });
  canvas.addEventListener("touchend", function (e) {
    if (!touch) return;
    var p = e.changedTouches[0], dx = p.clientX - touch.x, dy = p.clientY - touch.y;
    touch = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  });

  Array.prototype.forEach.call(document.querySelectorAll(".lab-arrow"), function (b) {
    var rep = 0, del = 0;
    var stop = function () { clearTimeout(del); clearInterval(rep); };
    b.addEventListener("pointerdown", function (e) {
      e.preventDefault(); stop();
      var dir = b.getAttribute("data-dir");
      move(dir);
      del = setTimeout(function () { rep = setInterval(function () { move(dir); }, 170); }, 380);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) { b.addEventListener(ev, stop); });
    b.addEventListener("click", function (e) { if (e.detail === 0) move(b.getAttribute("data-dir")); });
  });

  els.start.addEventListener("click", function () {
    var ok = initAudio();
    if (window.EdenStars && window.EdenStars.unlock) window.EdenStars.unlock();
    els.noaudio.hidden = ok;
    if (ok) buildVoices();
    st.playing = true; st.started = true;
    els.intro.hidden = true;
    canvas.focus && canvas.setAttribute("tabindex", "0");
  });
  els.mute.addEventListener("click", function () { setMuted(!st.muted); if (!st.muted) initAudio(); });
  els.restart.addEventListener("click", function () { setupLevel(st.level); });
  els.next.addEventListener("click", function () {
    setupLevel(st.level === LEVELS.length - 1 ? 0 : st.level + 1);
    if (audio.ctx && audio.ctx.state === "suspended") audio.ctx.resume();
  });
  document.addEventListener("visibilitychange", function () {
    if (!audio.ctx) return;
    if (document.hidden) audio.ctx.suspend(); else if (st.playing) audio.ctx.resume();
  });
  window.addEventListener("resize", resize);

  /* ---------- Langue ---------- */
  function applyLang() {
    document.title = t("lab.pageTitle");
    updateHud(); setMuted(st.muted);
    if (st.done) {
      var last = st.level === LEVELS.length - 1;
      els.winTitle.textContent = t(last ? "lab.done" : "lab.win");
      els.next.textContent = t(last ? "lab.again" : "lab.next");
    }
  }
  if (window.EdenI18n) window.EdenI18n.onChange(applyLang);
  var q = null;
  try { q = new URLSearchParams(window.location.search).get("lang"); } catch (e) {}

  setupLevel(0);
  setMuted(st.muted);
  if ((q === "fr" || q === "en") && window.EdenI18n) window.EdenI18n.setLang(q); else applyLang();
  requestAnimationFrame(loop);

  window.EdenLabyrinthe = { state: st, move: move, setupLevel: setupLevel };
})();
