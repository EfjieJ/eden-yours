/* Eden Yours — Coureurs cartoon (ambiance accueil uniquement)
   Canvas 2D léger : personnages procéduraux (tête ronde, corps capsule, membres simples),
   faux-3D par volumes + ombres douces. Palette bleu doux (ciel / périwinkle).
   Pause si onglet caché ; masqué / figé si prefers-reduced-motion ; moins de figures sur mobile. */
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

  /* Dessin procédural : silhouette cartoon faux-3D (volumes + ombre douce) */
  function drawRunner(r, t) {
    var y = H * r.yFrac;
    var s = 28 * r.scale;
    var cycle = t * 0.009 * r.speed + r.phase;
    var legSwing = Math.sin(cycle) * 0.55;
    var armSwing = Math.sin(cycle + Math.PI) * 0.5;
    var bobY = Math.abs(Math.sin(cycle)) * 2.2 * r.bob;
    var lean = 0.12;

    ctx.save();
    ctx.translate(r.x, y - bobY);
    ctx.scale(r.dir, 1);
    ctx.rotate(lean * 0.15);

    var pal = r.pal;

    /* Ombre au sol */
    ctx.beginPath();
    ctx.ellipse(0, 6, s * 0.55, s * 0.12, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(10, 8, 30, 0.28)";
    ctx.fill();

    /* Jambes */
    drawLimb(-s * 0.18, s * 0.15, s * 0.55, legSwing, pal.limb, pal.shade, s * 0.14);
    drawLimb(s * 0.18, s * 0.15, s * 0.55, -legSwing, pal.limb, pal.shade, s * 0.14);

    /* Corps capsule */
    var bodyGrad = ctx.createLinearGradient(-s * 0.35, -s * 0.55, s * 0.4, s * 0.35);
    bodyGrad.addColorStop(0, pal.light);
    bodyGrad.addColorStop(0.45, pal.body);
    bodyGrad.addColorStop(1, pal.shade);
    roundRect(-s * 0.32, -s * 0.55, s * 0.64, s * 0.85, s * 0.32);
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    /* Reflet doux sur le torse */
    ctx.beginPath();
    ctx.ellipse(-s * 0.1, -s * 0.25, s * 0.14, s * 0.22, -0.2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    ctx.fill();

    /* Bras */
    drawLimb(-s * 0.34, -s * 0.25, s * 0.42, armSwing, pal.limb, pal.shade, s * 0.11);
    drawLimb(s * 0.34, -s * 0.25, s * 0.42, -armSwing, pal.limb, pal.shade, s * 0.11);

    /* Tête */
    var hx = 0;
    var hy = -s * 0.78;
    var hr = s * 0.34;
    var headGrad = ctx.createRadialGradient(hx - hr * 0.3, hy - hr * 0.35, hr * 0.1, hx, hy, hr);
    headGrad.addColorStop(0, pal.light);
    headGrad.addColorStop(0.55, pal.body);
    headGrad.addColorStop(1, pal.shade);
    ctx.beginPath();
    ctx.arc(hx, hy, hr, 0, Math.PI * 2);
    ctx.fillStyle = headGrad;
    ctx.fill();

    /* Joues / yeux simples (mignons) */
    ctx.beginPath();
    ctx.arc(hx - hr * 0.28, hy + hr * 0.08, hr * 0.12, 0, Math.PI * 2);
    ctx.arc(hx + hr * 0.28, hy + hr * 0.08, hr * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 180, 200, 0.35)";
    ctx.fill();

    ctx.fillStyle = "rgba(40, 50, 80, 0.55)";
    ctx.beginPath();
    ctx.arc(hx - hr * 0.18, hy - hr * 0.05, hr * 0.07, 0, Math.PI * 2);
    ctx.arc(hx + hr * 0.18, hy - hr * 0.05, hr * 0.07, 0, Math.PI * 2);
    ctx.fill();

    /* Petit sourire */
    ctx.beginPath();
    ctx.arc(hx, hy + hr * 0.12, hr * 0.18, 0.15, Math.PI - 0.15);
    ctx.strokeStyle = "rgba(40, 50, 80, 0.4)";
    ctx.lineWidth = Math.max(1, s * 0.04);
    ctx.lineCap = "round";
    ctx.stroke();

    ctx.restore();
  }

  function drawLimb(ox, oy, len, angle, color, shade, thick) {
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(angle);
    var g = ctx.createLinearGradient(0, 0, 0, len);
    g.addColorStop(0, color);
    g.addColorStop(1, shade);
    ctx.strokeStyle = g;
    ctx.lineWidth = thick;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, len);
    ctx.stroke();
    /* « chaussure » / main */
    ctx.beginPath();
    ctx.arc(0, len, thick * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = shade;
    ctx.fill();
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
