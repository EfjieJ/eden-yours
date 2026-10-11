/* Eden Yours — « Ciel d'Éden » (voir css/ciel.css). Calque ambiant : étoiles pastel qui scintillent (certaines avec reflet en croix),
   lucioles dorées, étoile filante occasionnelle ; le ciel plein écran se révèle au défilement (opacité seulement).
   Plafonné (≈110 étoiles ordinateur, ≈50 téléphone, 30 i/s ordinateur, 24 i/s téléphone), en pause onglet caché,
   image fixe si prefers-reduced-motion. Sur l'accueil, la zone de l'ouverture (photo + cartes) est effacée tant qu'on n'a pas défilé. */
(function () {
  "use strict";
  if (window.EdenCiel || !document.body) return;
  var doc = document, root = doc.documentElement;
  var reduced = false, coarse = false;
  try { reduced = matchMedia("(prefers-reduced-motion: reduce)").matches; coarse = matchMedia("(pointer: coarse)").matches; } catch (e) {}
  var mobile = coarse || innerWidth < 760;

  var box = doc.createElement("div"); box.className = "ciel"; box.setAttribute("aria-hidden", "true");
  box.innerHTML = '<div class="ciel-edge"></div><div class="ciel-full"><div class="ciel-rose"></div><div class="ciel-ribbon ciel-ribbon--1"></div><div class="ciel-ribbon ciel-ribbon--2"></div><div class="ciel-ribbon ciel-ribbon--3"></div><div class="ciel-bow"></div><div class="ciel-bow ciel-bow--2"></div></div><canvas class="ciel-stars"></canvas>';
  var sky = doc.querySelector(".eden-sky");
  if (sky && sky.parentNode) sky.parentNode.insertBefore(box, sky.nextSibling); else doc.body.insertBefore(box, doc.body.firstChild);
  root.classList.add("ciel-on");
  window.EdenCiel = { on: true };

  var full = box.querySelector(".ciel-full"), cv = box.querySelector("canvas"), ctx = cv.getContext("2d");
  var W = 0, H = 0, DPR = 1, stars = [], motes = [], shoot = null, nextShoot = 0, raf = 0, last = 0, running = false;
  var hole = null, prog = 1;
  var COLORS = ["255,255,255", "255,214,236", "255,224,178", "214,200,255", "190,236,255"];

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function measureHole() {
    var c = doc.querySelector(".games-hero .container");
    if (!c) { hole = null; return; }
    var r = c.getBoundingClientRect(), y = r.top + (window.scrollY || 0), p = 6;
    hole = { x: r.left - p, y: y - p, w: r.width + 2 * p, h: r.height + 2 * p + 48 };
  }
  function seed() {
    var n = mobile ? 50 : 110, m = mobile ? 10 : 18;
    stars = []; motes = [];
    for (var i = 0; i < n; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: rnd(0.5, 1.5), ph: rnd(0, 6.28), sp: rnd(0.5, 1.8), a: rnd(0.35, 0.95), c: COLORS[(Math.random() * COLORS.length) | 0], glint: i % 9 === 0 });
    for (i = 0; i < m; i++) motes.push({ x: Math.random() * W, y: Math.random() * H, r: rnd(1.6, 3.2), vx: rnd(-5, 5), vy: -rnd(4, 11), ph: rnd(0, 6.28), sp: rnd(0.3, 0.7) });
  }
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.5);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    measureHole(); seed(); onScroll(); draw(performance.now(), 0);
  }
  function onScroll() {
    var sy = window.scrollY || 0;
    prog = hole ? Math.min(1, Math.max(0, sy / (H * 0.5))) : 1;
    full.style.opacity = String(prog * 0.8);   // plafond : le texte reste lisible
  }

  function glint(x, y, r, rgb, a) {
    var L = r * 5.5;
    ctx.strokeStyle = "rgba(" + rgb + "," + (a * 0.55) + ")"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(x - L, y); ctx.lineTo(x + L, y); ctx.moveTo(x, y - L); ctx.lineTo(x, y + L); ctx.stroke();
  }
  function draw(tms, dt) {
    var t = tms / 1000, i, s;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    for (i = 0; i < stars.length; i++) {
      s = stars[i];
      var tw = reduced ? 0.8 : 0.55 + 0.45 * Math.sin(t * s.sp + s.ph), a = s.a * tw;
      ctx.fillStyle = "rgba(" + s.c + "," + a + ")";
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832); ctx.fill();
      if (s.glint && a > 0.4) { glint(s.x, s.y, s.r, s.c, a); ctx.fillStyle = "rgba(" + s.c + "," + (a * 0.18) + ")"; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 4, 0, 6.2832); ctx.fill(); }
    }
    for (i = 0; i < motes.length; i++) {
      var m = motes[i];
      if (!reduced) { m.x += m.vx * dt; m.y += m.vy * dt; if (m.y < -10) { m.y = H + 10; m.x = Math.random() * W; } if (m.x < -10) m.x = W + 10; if (m.x > W + 10) m.x = -10; }
      var al = 0.5 + 0.4 * Math.sin(t * m.sp + m.ph), g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 3.2);
      g.addColorStop(0, "rgba(255,236,170," + al + ")"); g.addColorStop(0.35, "rgba(255,206,120," + (al * 0.4) + ")"); g.addColorStop(1, "rgba(255,200,120,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 3.2, 0, 6.2832); ctx.fill();
    }
    if (!reduced) {
      if (!shoot && t > nextShoot) {
        var fromLeft = Math.random() < 0.5, ang = rnd(0.35, 0.6);
        shoot = { x: fromLeft ? rnd(0, W * 0.5) : rnd(W * 0.5, W), y: rnd(0, H * 0.4), vx: (fromLeft ? 1 : -1) * Math.cos(ang) * 620, vy: Math.sin(ang) * 620, life: 0 };
      }
      if (shoot) {
        shoot.x += shoot.vx * dt; shoot.y += shoot.vy * dt; shoot.life += dt;
        var fade = Math.max(0, 1 - shoot.life / 1.1), tx = shoot.x - shoot.vx * 0.16, ty = shoot.y - shoot.vy * 0.16;
        var gl = ctx.createLinearGradient(shoot.x, shoot.y, tx, ty);
        gl.addColorStop(0, "rgba(255,240,250," + (0.95 * fade) + ")"); gl.addColorStop(0.4, "rgba(255,180,220," + (0.5 * fade) + ")"); gl.addColorStop(1, "rgba(255,180,220,0)");
        ctx.strokeStyle = gl; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(shoot.x, shoot.y); ctx.lineTo(tx, ty); ctx.stroke();
        if (shoot.life > 1.1 || shoot.x < -50 || shoot.x > W + 50 || shoot.y > H + 50) { shoot = null; nextShoot = t + rnd(7, 14); }
      }
    }
    // l'ouverture de l'accueil reste intacte : on efface le calque dans la zone photo + cartes tant qu'on n'a pas défilé
    if (hole && prog < 1) {
      ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = "rgba(0,0,0," + (1 - prog) + ")";
      ctx.fillRect(hole.x, hole.y - (window.scrollY || 0), hole.w, hole.h);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  var interval = 1000 / (mobile ? 24 : 30);
  function loop(ts) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    if (ts - last < interval) return;
    var dt = Math.min(0.1, (ts - last) / 1000); last = ts;
    draw(ts, dt);
  }
  function start() { if (reduced || running || doc.hidden) return; running = true; last = performance.now(); nextShoot = nextShoot || performance.now() / 1000 + 5; raf = requestAnimationFrame(loop); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  doc.addEventListener("visibilitychange", function () { if (doc.hidden) stop(); else start(); });
  var tk = 0;
  window.addEventListener("scroll", function () { if (tk) return; tk = requestAnimationFrame(function () { tk = 0; onScroll(); if (reduced) draw(performance.now(), 0); }); }, { passive: true });
  var rt = 0;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { if (Math.abs(innerWidth - W) > 40 || Math.abs(innerHeight - H) > 120) resize(); else { measureHole(); onScroll(); } }, 200); });
  function init() { resize(); start(); }
  if (doc.readyState === "complete") init(); else window.addEventListener("load", init);
  // la zone de l'ouverture dépend de la mise en page finale (polices, images) : on la remesure après chargement
  window.addEventListener("load", function () { setTimeout(function () { measureHole(); onScroll(); }, 400); });
})();
