/* Eden Yours — Marcheurs (ambiance accueil uniquement)
   De vraies personnes qui marchent pieds nus dans la lumière : cycles de marche filmés (vidéo Pexels,
   détourée, voir CREDITS.md) en planches WebP, liseré doré en contre-jour et ombre portée douce.
   Repli : silhouettes dessinées tant que les planches ne sont pas chargées.
   Pause si onglet caché ; figé si prefers-reduced-motion ; moins de personnes sur mobile. */
(function () {
  "use strict";
  if (window.EdenRunners) return;

  var FPS = 30;
  var FRAME_MS = 1000 / FPS;
  var MIN_W = 360; // en dessous : désactivé (petits écrans / perf)

  /* Bleu doux — teintes que la plupart aiment (ciel / périwinkle), pas fluo */
  var BLUES = [
    { body: "#7EB6D9", shade: "#5A9BC4", light: "#B8DCF0", limb: "#6AA8CE" },
    { body: "#8BB8E8", shade: "#6A9AD0", light: "#C5E0F5", limb: "#7AA8D8" },
    { body: "#9AC4E8", shade: "#72A4D0", light: "#D0E8F8", limb: "#82B0D8" },
    { body: "#86B5D9", shade: "#5E96C0", light: "#BCDCF0", limb: "#6EA2CC" },
    { body: "#A0C6E6", shade: "#78A8CE", light: "#D6ECF8", limb: "#88B4D6" }
  ];
  var CREAM = "rgba(255, 244, 220, 0.35)";
  /* planches : une rangée d'images (fw × fh), fps d'origine, vitesse = déplacement / hauteur par image */
  var SHEETS = [
    { src: "assets/people/walk-girl.webp", frames: 16, fw: 133, fh: 300, fps: 15, speed: 0.01347, kid: true },
    { src: "assets/people/walk-mother.webp", frames: 22, fw: 187, fh: 300, fps: 15, speed: 0.01194, kid: false }
  ];
  var PACE = 1.35; // un peu plus vif que la prise de vue (ralentie)
  SHEETS.forEach(function (sh) {
    var im = new Image();
    im.decoding = "async";
    im.onload = function () { sh.ready = true; if (!running) drawStill(); };
    im.src = sh.src + "?v=20261010n";
    sh.img = im;
  });
  var GOLD_LINE = "rgba(246, 201, 106, 0.22)";
  var VIOLET_SOFT = "rgba(192, 132, 252, 0.12)";

  function mq(q) {
    try { return window.matchMedia ? window.matchMedia(q) : null; } catch (e) { return null; }
  }

  var reducedMQ = mq("(prefers-reduced-motion: reduce)");
  function reduced() { return !!(reducedMQ && reducedMQ.matches); }

  var coarseMQ = mq("(pointer: coarse)");
  function isMobile() {
    return !!((coarseMQ && coarseMQ.matches) || window.innerWidth < 760);
  }

  var wrap = document.createElement("div");
  wrap.className = "eden-runners";
  wrap.setAttribute("aria-hidden", "true");

  var canvas = document.createElement("canvas");
  canvas.className = "eden-runners-canvas";
  wrap.appendChild(canvas);

  var ground = document.createElement("div");
  ground.className = "eden-runners-ground";
  wrap.appendChild(ground);

  document.body.insertBefore(wrap, document.body.firstChild);
  document.documentElement.classList.add("eden-runners-on");

  var ctx = canvas.getContext("2d");
  if (!ctx) {
    wrap.style.display = "none";
    window.EdenRunners = { active: false };
    return;
  }

  var W = 0, H = 0, DPR = 1;
  var runners = [];
  var raf = 0;
  var last = 0;
  var running = false;
  var frozen = false;

  function now() {
    return (typeof performance !== "undefined" ? performance : Date).now();
  }

  function resize() {
    var w = window.innerWidth || 1;
    var h = window.innerHeight || 1;
    if (w < MIN_W) {
      wrap.classList.add("is-off");
      stop();
      return;
    }
    wrap.classList.remove("is-off");
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    W = w;
    H = h;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    spawn();
    if (!reduced() && !document.hidden) start();
    else drawStill();
  }

  function countWanted() {
    if (W < MIN_W) return 0;
    if (isMobile() || W < 520) return 3;
    if (W < 900) return 5;
    return 7;
  }

  function spawn() {
    var n = countWanted();
    runners = [];
    for (var i = 0; i < n; i++) {
      var pal = BLUES[i % BLUES.length];
      var scale = 0.55 + Math.random() * 0.45;
      var lane = 0.62 + (i % 3) * 0.08 + Math.random() * 0.04;
      runners.push({
        sheet: SHEETS[i % SHEETS.length],
        x: (i / Math.max(1, n)) * W + Math.random() * 80 - 40,
        yFrac: lane,
        scale: scale,
        speed: 38 + Math.random() * 42 + (1 - scale) * 20,
        phase: Math.random() * Math.PI * 2,
        bob: 0.6 + Math.random() * 0.5,
        pal: pal,
        dir: 1,
        bounce: Math.random() * Math.PI * 2
      });
    }
  }

  /* Dessin procédural : silhouette humaine aux proportions naturelles (≈ 7,5 têtes),
     foulée réaliste (cuisse / tibia, bras / avant-bras), contre-jour avec liseré doré, sans visage. */
  function seg(x0, y0, len, ang, w0, w1) {
    var x1 = x0 + Math.sin(ang) * len, y1 = y0 + Math.cos(ang) * len;
    var nx = Math.cos(ang), ny = -Math.sin(ang);
    ctx.beginPath();
    ctx.moveTo(x0 + nx * w0 / 2, y0 + ny * w0 / 2);
    ctx.lineTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2);
    ctx.arc(x1, y1, w1 / 2, Math.atan2(ny, nx), Math.atan2(ny, nx) + Math.PI);
    ctx.lineTo(x0 - nx * w0 / 2, y0 - ny * w0 / 2);
    ctx.arc(x0, y0, w0 / 2, Math.atan2(-ny, -nx), Math.atan2(-ny, -nx) + Math.PI);
    ctx.fill();
    return [x1, y1];
  }
  function limb(x, y, l1, l2, a1, a2, w) {
    var k = seg(x, y, l1, a1, w, w * 0.72);
    var e = seg(k[0], k[1], l2, a1 + a2, w * 0.7, w * 0.45);
    return e;
  }
  function drawFigure(r, cycle, s, back) {
    var thigh = s * 0.25, shin = s * 0.25, upA = s * 0.17, foA = s * 0.16;
    var hipY = -(thigh + shin) * 0.94;
    var sh = cycle + (back ? Math.PI : 0);
    var hipA = Math.sin(sh) * 0.62;
    var knee = -(0.25 + 0.95 * Math.max(0, Math.sin(sh - 1.2)));
    var armA = -Math.sin(sh) * 0.55;
    var elbow = 1.25 + Math.sin(sh) * 0.2;
    ctx.fillStyle = back ? r.colBack : r.col;
    limb(0, hipY, thigh, shin, -hipA, knee, s * 0.075);
    var shY = hipY - s * 0.3;
    if (back) { limb(s * 0.01, shY + s * 0.02, upA, foA, armA, elbow, s * 0.05); return; }
    // torse (léger penché vers l'avant) et tête
    var lean = 0.14;
    ctx.beginPath();
    ctx.moveTo(-s * 0.06, hipY + s * 0.02);
    ctx.quadraticCurveTo(-s * 0.08 + lean * s * 0.1, hipY - s * 0.16, -s * 0.05 + lean * s * 0.3, shY);
    ctx.lineTo(s * 0.07 + lean * s * 0.3, shY + s * 0.01);
    ctx.quadraticCurveTo(s * 0.08 + lean * s * 0.1, hipY - s * 0.14, s * 0.06, hipY + s * 0.02);
    ctx.closePath(); ctx.fill();
    var nx = lean * s * 0.3 + s * 0.01;
    seg(nx, shY + s * 0.01, s * 0.05, Math.PI - lean, s * 0.04, s * 0.035);
    ctx.beginPath();
    ctx.ellipse(nx + s * 0.02, shY - s * 0.085, s * 0.055, s * 0.068, lean, 0, Math.PI * 2);
    ctx.fill();
    limb(nx, shY + s * 0.02, upA, foA, armA, elbow, s * 0.05);
  }
  function drawWalker(r, t, sh) {
    var y = H * r.yFrac;
    var hh = (sh.kid ? 92 : 128) * r.scale;           // hauteur à l'écran (px)
    var fwp = hh * sh.fw / sh.fh;
    var f = Math.floor((t / 1000) * sh.fps * PACE + r.phase * 10) % sh.frames;
    ctx.save();
    /* ombre portée douce */
    var sg = ctx.createRadialGradient(r.x, y + 2, 0, r.x, y + 2, hh * 0.35);
    sg.addColorStop(0, "rgba(8, 6, 24, 0.35)"); sg.addColorStop(1, "rgba(8, 6, 24, 0)");
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.ellipse(r.x, y + 2, hh * 0.35, hh * 0.04, 0, 0, Math.PI * 2); ctx.fill();
    /* contre-jour : liseré doré diffus */
    ctx.shadowColor = "rgba(255, 196, 120, 0.6)";
    ctx.shadowBlur = Math.max(6, hh * 0.08);
    ctx.globalAlpha = 0.95;
    ctx.drawImage(sh.img, f * sh.fw, 0, sh.fw, sh.fh, r.x - fwp / 2, y - hh, fwp, hh);
    ctx.restore();
  }
  function drawRunner(r, t) {
    if (r.sheet && r.sheet.ready) return drawWalker(r, t, r.sheet);
    var y = H * r.yFrac;
    var s = 62 * r.scale;
    var cycle = t * 0.0055 * (0.6 + r.speed / 80) + r.phase;
    var bobY = Math.abs(Math.cos(cycle)) * s * 0.025;
    if (!r.col) {
      var depth = (r.yFrac - 0.6) / 0.25;
      r.col = "rgba(" + (24 + depth * 10 | 0) + "," + (20 + depth * 8 | 0) + "," + (44 + depth * 10 | 0) + ",0.9)";
      r.colBack = "rgba(18,15,34,0.85)";
    }
    ctx.save();
    ctx.translate(r.x, y - bobY);
    ctx.scale(r.dir, 1);
    /* ombre portée longue et douce (soleil bas) */
    var sg = ctx.createRadialGradient(-s * 0.25, 2, 0, -s * 0.25, 2, s * 0.6);
    sg.addColorStop(0, "rgba(8, 6, 24, 0.32)"); sg.addColorStop(1, "rgba(8, 6, 24, 0)");
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.ellipse(-s * 0.25, 2 + bobY, s * 0.6, s * 0.05, 0, 0, Math.PI * 2); ctx.fill();
    /* contre-jour : liseré doré diffus */
    ctx.shadowColor = "rgba(255, 196, 120, 0.55)";
    ctx.shadowBlur = Math.max(4, s * 0.12);
    drawFigure(r, cycle, s, true);
    drawFigure(r, cycle, s, false);
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawGround() {
    var gy = H * 0.78;
    var g = ctx.createLinearGradient(0, gy - 40, 0, H);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.35, VIOLET_SOFT);
    g.addColorStop(0.7, "rgba(126, 182, 217, 0.06)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, gy - 40, W, H - gy + 40);

    ctx.beginPath();
    ctx.moveTo(0, gy);
    for (var x = 0; x <= W; x += 24) {
      var wave = Math.sin(x * 0.012 + last * 0.0003) * 3;
      ctx.lineTo(x, gy + wave);
    }
    ctx.strokeStyle = GOLD_LINE;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    /* Reflet crème très léger */
    ctx.beginPath();
    ctx.moveTo(0, gy + 8);
    ctx.lineTo(W, gy + 6);
    ctx.strokeStyle = CREAM;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function frame(t) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (t - last < FRAME_MS) return;
    var dt = Math.min(0.05, (t - last) / 1000);
    last = t;

    ctx.clearRect(0, 0, W, H);
    drawGround();

    /* Trier par profondeur (y) pour un léger faux-3D */
    runners.sort(function (a, b) { return a.yFrac - b.yFrac; });

    for (var i = 0; i < runners.length; i++) {
      var r = runners[i];
      if (r.sheet && r.sheet.ready) {
        var hh = (r.sheet.kid ? 92 : 128) * r.scale;
        r.dir = -1;
        r.x -= r.sheet.speed * hh * r.sheet.fps * PACE * dt;
        if (r.x < -80) { r.x = W + 60 + Math.random() * 120; r.phase = Math.random() * Math.PI * 2; }
        drawRunner(r, t);
        continue;
      }
      r.x += r.speed * dt * r.dir;
      if (r.x > W + 60) {
        r.x = -50 - Math.random() * 40;
        r.phase = Math.random() * Math.PI * 2;
      } else if (r.x < -60) {
        r.x = W + 50;
      }
      drawRunner(r, t);
    }
  }

  function drawStill() {
    if (!W) return;
    ctx.clearRect(0, 0, W, H);
    drawGround();
    runners.sort(function (a, b) { return a.yFrac - b.yFrac; });
    var t = last || now();
    for (var i = 0; i < runners.length; i++) drawRunner(runners[i], t);
  }

  function start() {
    if (running || reduced() || document.hidden || W < MIN_W) return;
    running = true;
    frozen = false;
    wrap.classList.remove("is-frozen");
    last = now() - FRAME_MS;
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  function freeze() {
    stop();
    frozen = true;
    wrap.classList.add("is-frozen");
    drawStill();
  }

  function onVisibility() {
    if (document.hidden) stop();
    else if (!reduced() && W >= MIN_W) start();
  }

  function onReducedChange() {
    if (reduced()) freeze();
    else {
      wrap.classList.remove("is-frozen");
      if (!document.hidden) start();
    }
  }

  if (reducedMQ && reducedMQ.addEventListener) {
    reducedMQ.addEventListener("change", onReducedChange);
  } else if (reducedMQ && reducedMQ.addListener) {
    reducedMQ.addListener(onReducedChange);
  }

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("resize", function () {
    clearTimeout(resize._t);
    resize._t = setTimeout(resize, 120);
  });

  resize();
  if (reduced()) freeze();

  window.EdenRunners = {
    active: true,
    pause: stop,
    resume: start,
    count: function () { return runners.length; }
  };
})();
