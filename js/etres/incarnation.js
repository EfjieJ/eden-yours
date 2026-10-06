/* Les Êtres de Lumière — scène d'incarnation :
   descente dans l'atmosphère → paysage en parallaxe → corps lumineux formé de particules →
   30 s de souffle guidé (5 s inspire / 5 s expire, 3 phrases) → le corps se dissout vers le haut → remontée. */
(function () {
  "use strict";
  var EL = window.EL, U = EL.util, TAU = Math.PI * 2;

  var DUR = { descent: 3.8, forming: 3.4, breathing: 30, dissolve: 3.8, quit: 1.8, ascent: 2.6 };
  var LAND = {
    pearl:   { amp: [0.07, 0.08, 0.075, 0.06], scale: [260, 210, 170, 140], oct: 3, ridged: false, step: false },
    aurora:  { amp: [0.2, 0.15, 0.1, 0.055], scale: [190, 150, 120, 110], oct: 5, ridged: true, step: false },
    bloom:   { amp: [0.09, 0.085, 0.08, 0.06], scale: [300, 240, 200, 170], oct: 3, ridged: false, step: false },
    cells:   { amp: [0.05, 0.045, 0.035, 0.025], scale: [260, 220, 200, 180], oct: 4, ridged: false, step: false },
    radiant: { amp: [0.08, 0.07, 0.05, 0.03], scale: [220, 190, 160, 150], oct: 4, ridged: false, step: true }
  };
  var BASE = [0.6, 0.66, 0.73, 0.8];

  /* Chanson de découverte (tirée au hasard parmi les 29) : Particule Pure.
     Démarre à l'arrivée sur la surface de la planète (« forming »). */
  var DISCOVERY = {
    id: "dead13bb-42bc-492e-83a1-87609f224734",
    title: "Particule Pure",
    src: "assets/audio/dead13bb-42bc-492e-83a1-87609f224734.mp3"
  };
  var discoveryAudio = null;
  var discoveryFade = null;

  function stopDiscovery(fast) {
    if (discoveryFade) { clearInterval(discoveryFade); discoveryFade = null; }
    var a = discoveryAudio;
    if (!a) return;
    if (fast) {
      try { a.pause(); } catch (e) {}
      a.removeAttribute("src");
      try { a.load(); } catch (e2) {}
      discoveryAudio = null;
      return;
    }
    var v = a.volume;
    discoveryFade = setInterval(function () {
      v = Math.max(0, v - 0.06);
      a.volume = v;
      if (v <= 0.01) {
        clearInterval(discoveryFade); discoveryFade = null;
        try { a.pause(); } catch (e) {}
        a.removeAttribute("src");
        try { a.load(); } catch (e2) {}
        discoveryAudio = null;
      }
    }, 80);
  }

  function startDiscovery() {
    stopDiscovery(true);
    var a = discoveryAudio = new Audio(DISCOVERY.src);
    a.preload = "auto";
    a.loop = false;
    a.volume = 0;
    a.muted = !!(EL.Audio && EL.Audio.muted);
    discoveryAudio = a;
    if (EL.Audio && EL.Audio.fadeOutAll) EL.Audio.fadeOutAll(2.5);
    var tryPlay = function () {
      var pr = a.play();
      if (pr && pr.catch) pr.catch(function () {});
    };
    tryPlay();
    var v = 0;
    discoveryFade = setInterval(function () {
      if (!discoveryAudio) { clearInterval(discoveryFade); discoveryFade = null; return; }
      v = Math.min(0.72, v + 0.04);
      a.volume = v;
      if (v >= 0.72) { clearInterval(discoveryFade); discoveryFade = null; }
    }, 100);
  }


  /* ---------- silhouettes : une posture par planète (unités : hauteur du corps = 100) ---------- */
  function drawPose(g, i) {
    g.fillStyle = g.strokeStyle = "#fff";
    g.lineCap = g.lineJoin = "round";
    function limb(pts, w0, w1) {
      for (var k = 0; k < pts.length - 1; k++) {
        g.lineWidth = U.lerp(w0, w1, k / Math.max(1, pts.length - 2));
        g.beginPath(); g.moveTo(pts[k][0], pts[k][1]); g.lineTo(pts[k + 1][0], pts[k + 1][1]); g.stroke();
      }
    }
    function ell(x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); g.fill(); }
    function torso(y0) {
      g.beginPath();
      g.moveTo(-10, y0);
      g.quadraticCurveTo(-11.8, y0 + 12, -7, y0 + 25);
      g.quadraticCurveTo(-9.6, y0 + 29, -9, y0 + 33);
      g.lineTo(9, y0 + 33);
      g.quadraticCurveTo(9.6, y0 + 29, 7, y0 + 25);
      g.quadraticCurveTo(11.8, y0 + 12, 10, y0);
      g.quadraticCurveTo(0, y0 - 2.6, -10, y0);
      g.fill();
    }
    function arms(el, wr, hand, hr) {
      [-1, 1].forEach(function (s) {
        limb([[s * 9.4, 22.5], [s * el[0], el[1]], [s * wr[0], wr[1]]], 4.8, 3.4);
        ell(s * hand[0], hand[1], hr, hr * 1.2);
      });
    }
    if (i === 4) {
      /* La Cause Pure : assis en méditation, mains sur les genoux */
      ell(0, 38, 6, 7.2);
      limb([[0, 44], [0, 49]], 4.4, 4.4);
      torso(50);
      ell(0, 93, 25, 6.8);
      ell(-20.5, 90.5, 6, 5.2); ell(20.5, 90.5, 6, 5.2);
      [-1, 1].forEach(function (s) {
        limb([[s * 9.4, 52.5], [s * 15.5, 68], [s * 18.5, 83.5]], 4.8, 3.4);
        ell(s * 19, 86, 2.8, 2.2);
      });
      return { heart: [0, 60], center: [0, 66] };
    }
    var head = i === 2 ? [1.3, 7.8] : i === 1 ? [0, 7.4] : [0, 8];
    ell(head[0], head[1], 6, 7.3, i === 2 ? -0.18 : 0);
    limb([[0, 13.5], [0, 19.5]], 4.4, 4.4);
    torso(20);
    [-1, 1].forEach(function (s) {
      limb([[s * 4.7, 50.5], [s * 5.3, 75], [s * 5.5, 95.5]], 7.6, 5.1);
      ell(s * 6.6, 97.6, 3.6, 1.7);
    });
    if (i === 0) arms([14.5, 37], [19, 50], [20.4, 52.6], 2.4);           // paumes ouvertes, accueillir
    else if (i === 1) arms([16.5, 8], [21.5, -5], [22.4, -8], 2.4);       // bras levés : antenne
    else if (i === 2) { arms([12.5, 37.5], [3.6, 31], [2.2, 30.5], 2.4); ell(0, 30.5, 4, 3.4); } // mains sur le cœur
    else arms([22, 25], [33, 21.5], [36, 20.6], 2.5);                     // bras grands ouverts : le Nous
    return { heart: [0, 30], center: [0, 50] };
  }

  function buildBody(i, bh, color, glowColor, dpr, reduced) {
    var u = bh / 100, W = 90 * u, H = 116 * u, ox = 45 * u, oy = 13 * u;
    var sc = Math.min(2, dpr || 1);
    var sil = U.canvas(W * sc, H * sc), g = sil.getContext("2d");
    g.setTransform(u * sc, 0, 0, u * sc, ox * sc, oy * sc);
    var meta = drawPose(g, i);
    /* échantillonnage des particules */
    var data = g.getImageData(0, 0, sil.width, sil.height).data;
    var step = Math.max(2, Math.round((bh * sc) / (reduced ? 46 : 68)));
    var parts = [], r = U.rng(900 + i), x, y;
    for (y = 0; y < sil.height; y += step) {
      for (x = (y / step) % 2 ? step / 2 : 0; x < sil.width; x += step) {
        var xi = Math.min(sil.width - 1, Math.round(x)), yi = Math.min(sil.height - 1, Math.round(y));
        if (data[(yi * sil.width + xi) * 4 + 3] > 120) {
          parts.push({
            tx: x / sc - ox + (r() - 0.5) * step * 0.6 / sc, ty: y / sc - oy + (r() - 0.5) * step * 0.6 / sc,
            ang: r() * TAU, rad: 0.45 + r() * 0.6, fromSky: r() < 0.7, sx0: r(),
            delay: r() * 0.42, sp: 0.6 + r() * 1.4, ph: r() * TAU, size: 1 + r() * 1.4, bright: r() < 0.12
          });
        }
      }
    }
    /* teinte + halo flou (réduction / agrandissement) */
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "source-in";
    g.fillStyle = U.rgba(color, 1);
    g.fillRect(0, 0, sil.width, sil.height);
    /* halo : vrai flou si ctx.filter est disponible, sinon réduction / agrandissement en deux passes */
    var mid = U.canvas(sil.width / 3, sil.height / 3), mg = mid.getContext("2d");
    if (typeof mg.filter === "string") {
      var pad = mid.width * 0.08;
      mg.filter = "blur(" + Math.max(2, Math.round(mid.width * 0.035)) + "px)";
      mg.drawImage(sil, pad, pad, mid.width - pad * 2, mid.height - pad * 2);
      mg.filter = "none";
      mid.padFrac = 0.08;
    } else {
      var small = U.canvas(sil.width / 12, sil.height / 12), sg = small.getContext("2d");
      sg.drawImage(sil, 0, 0, small.width, small.height);
      mg.drawImage(small, 0, 0, mid.width, mid.height);
      mid.padFrac = 0;
    }
    mg.globalCompositeOperation = "source-in";
    mg.fillStyle = U.rgba(glowColor, 1);
    mg.fillRect(0, 0, mid.width, mid.height);
    return {
      sil: sil, glow: mid, parts: parts, W: W, H: H, ox: ox, oy: oy, u: u,
      heart: [meta.heart[0] * u, meta.heart[1] * u], center: [meta.center[0] * u, meta.center[1] * u]
    };
  }

  /* ---------- Incarnation ---------- */
  function Incarnation(i, opts) {
    this.i = i;
    this.p = EL.PLANETS[i];
    this.txt = EL.pt(i);
    this.ui = opts.ui;
    this.onExit = opts.onExit;
    this.audioOn = !!opts.audio;
    this.success = false;
    this.phase = "descent";
    this.pt = 0;
    this.T = 0;
    this.half = -1;
    this.cycle = -1;
    this.b = 0;
    this.noise = EL.makeNoise(this.p.seed + 17);
    var r = U.rng(this.p.seed + 3);
    this.streaks = [];
    for (var k = 0; k < 46; k++) this.streaks.push({ x: r(), ph: r(), sp: 0.5 + r() * 1.1, len: 0.06 + r() * 0.16, w: 0.5 + r() * 1.6, cloud: k < 8 });
    this.flowers = [];
    for (k = 0; k < 9; k++) this.flowers.push({ x: r(), layer: 2 + (k % 2), n: 5 + ((r() * 3) | 0), s: 0.7 + r() * 0.6, ph: r() * TAU, c: k % 3 });
    this.motes = [];
    for (k = 0; k < 40; k++) this.motes.push({ x: r(), ph: r(), sp: 0.03 + r() * 0.06, s: 0.5 + r(), sway: r() * TAU });
    this.skyLights = [];
    for (k = 0; k < 36; k++) this.skyLights.push({ a: (k / 36) * TAU, ph: r() * TAU, r: 0.8 + r() * 0.4 });
    this.stars = [];
    for (k = 0; k < 70; k++) this.stars.push({ x: r(), y: r() * 0.5, s: 0.4 + r() * 1.1, ph: r() * TAU });
    this.resize(opts.w, opts.h, opts.dpr);
    this.setText("title", this.txt.name, EL.t("descending"));
    if (this.ui.leave) this.ui.leave.hidden = false;
    if (this.audioOn) { EL.Audio.focus(i); EL.Audio.whoosh(false, 3.2); }
  }

  var P = Incarnation.prototype;

  P.dur = function (ph) {
    var d = DUR[ph];
    if (EL.reduced && (ph === "descent" || ph === "ascent" || ph === "forming")) d *= 0.45;
    return d;
  };

  P.resize = function (w, h, dpr) {
    this.w = w; this.h = h; this.dpr = Math.min(2, dpr || 1);
    this.cx = w / 2;
    this.feetY = h * 0.815;
    this.bh = Math.min(h * 0.42, w * 1.1);
    var rad = this.p.style === "radiant";
    this.body = buildBody(this.i, this.bh, rad ? U.mix(this.p.pal.accent, [255, 255, 255], 0.25) : U.mix(this.p.pal.light, [255, 255, 255], 0.4), rad ? [255, 196, 110] : this.p.pal.glow, this.dpr, EL.reduced);
    this.bx = this.cx;
    this.by = this.feetY - this.bh * 0.985;
    this.buf = null;
  };

  P.setText = function (kind, a, b) {
    var ui = this.ui;
    if (kind === "title") {
      ui.title.innerHTML = "";
      var s1 = document.createElement("span"); s1.className = "el-inc-name"; s1.textContent = a;
      var s2 = document.createElement("span"); s2.className = "el-inc-sub"; s2.textContent = b || "";
      ui.title.appendChild(s1); ui.title.appendChild(s2);
      ui.title.classList.add("is-on");
    }
  };

  P.leave = function () {
    if (this.phase === "dissolve" || this.phase === "quit" || this.phase === "ascent") return;
    this.success = false;
    this.go("quit");
  };

  P.go = function (ph) {
    this.phase = ph; this.pt = 0;
    var ui = this.ui, A = EL.Audio;
    if (ph === "forming") {
      this.setText("title", this.txt.name, EL.t("forming"));
    } else if (ph === "breathing") {
      ui.title.classList.remove("is-on");
      ui.breath.classList.add("is-on");
      this.half = -1; this.cycle = -1;
    } else if (ph === "dissolve" || ph === "quit") {
      ui.phrase.classList.remove("is-on");
      ui.breath.classList.remove("is-on");
      ui.title.classList.remove("is-on");
      if (ui.leave) ui.leave.hidden = true;
      stopDiscovery(false);
      if (this.audioOn) { A.breathEnd(); A.whoosh(true, ph === "quit" ? 1.6 : 2.8); }
      if (ph === "dissolve") {
        this.success = true;
        var self = this;
        setTimeout(function () {
          if (self.phase !== "dissolve") return;
          ui.phrase.textContent = self.txt.gift;
          ui.phrase.classList.add("is-on", "is-gift");
        }, 300);
      }
    } else if (ph === "ascent") {
      ui.phrase.classList.remove("is-on", "is-gift");
      if (this.audioOn) A.whoosh(true, 2.2);
    } else if (ph === "done") {
      ui.phrase.classList.remove("is-on", "is-gift");
      stopDiscovery(true);
      if (this.onExit) this.onExit(this.success);
    }
  };

  P.update = function (dt) {
    this.T += dt; this.pt += dt;
    var d = this.dur(this.phase), ui = this.ui;
    if (this.phase === "breathing") {
      var bt = Math.min(this.pt, 29.999), half = Math.floor(bt / 5), cyc = Math.floor(bt / 10), hp = (bt % 5) / 5, inhale = half % 2 === 0;
      this.b = inhale ? 0.5 - 0.5 * Math.cos(Math.PI * hp) : 0.5 + 0.5 * Math.cos(Math.PI * hp);
      if (half !== this.half) {
        this.half = half;
        if (this.audioOn) EL.Audio.breathe(inhale, 5);
        if (inhale) EL.vibrate(28);
      }
      if (cyc !== this.cycle) {
        this.cycle = cyc;
        ui.phrase.classList.remove("is-gift");
        ui.phrase.textContent = this.txt.phrases[cyc];
        ui.phrase.classList.add("is-on");
      }
      if (bt % 10 > 9.3) ui.phrase.classList.remove("is-on");
      var label = (inhale ? EL.t("inhale") : EL.t("exhale")) + " · " + (5 - Math.floor(hp * 5));
      if (ui.breath.textContent !== label) ui.breath.textContent = label;
    } else if (this.phase === "dissolve" || this.phase === "quit") {
      this.b = Math.max(0, this.b - dt * 0.6);
    }
    if (this.phase !== "done" && this.pt >= d) {
      var next = { descent: "forming", forming: "breathing", breathing: "dissolve", dissolve: "ascent", quit: "ascent", ascent: "done" }[this.phase];
      this.go(next);
    }
  };

  /* Ce que la boucle principale doit montrer de l'espace sous la scène (zoom vers la planète). */
  P.spaceView = function () {
    var k = Math.min(1, this.pt / this.dur(this.phase));
    if (this.phase === "descent") return { active: k < 0.75, focus: U.easeInOut(Math.min(1, k / 0.5)), zoom: 1 + 16 * U.easeIn(Math.min(1, k / 0.72)) };
    if (this.phase === "ascent") return { active: k > 0.25, focus: 1 - U.easeInOut(U.clamp((k - 0.5) / 0.5, 0, 1)), zoom: 1 + 16 * U.easeIn(1 - U.clamp((k - 0.25) / 0.75, 0, 1)) };
    return { active: false, focus: 1, zoom: 1 };
  };

  /* ---------- dessin ---------- */
  P.draw = function (ctx, w, h) {
    var ph = this.phase, k = Math.min(1, this.pt / this.dur(ph));
    var atmo = 1, land = 1, landOff = 0, streak = 0, dir = -1;
    if (ph === "descent") {
      atmo = U.smooth(0.3, 0.62, k);
      land = U.smooth(0.55, 0.9, k);
      landOff = (1 - U.easeOut(U.smooth(0.55, 1, k))) * h * 0.45;
      streak = Math.sin(Math.PI * U.smooth(0.25, 1, k));
    } else if (ph === "ascent") {
      atmo = 1 - U.smooth(0.35, 0.72, k);
      land = 1 - U.smooth(0.0, 0.4, k);
      landOff = U.easeIn(U.smooth(0, 0.45, k)) * h * 0.45;
      streak = Math.sin(Math.PI * U.smooth(0, 0.75, k));
      dir = 1;
    } else if (ph === "forming") {
      streak = 1 - U.smooth(0, 0.35, k);
    }
    if (EL.reduced) streak *= 0.25;
    if (atmo <= 0.001) return;
    var target = ctx;
    if (atmo < 0.999) {
      if (!this.buf || this.buf.width !== ctx.canvas.width || this.buf.height !== ctx.canvas.height) {
        this.buf = U.canvas(ctx.canvas.width, ctx.canvas.height);
      }
      target = this.buf.getContext("2d");
      target.setTransform(1, 0, 0, 1, 0, 0);
      target.clearRect(0, 0, this.buf.width, this.buf.height);
      target.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }
    this.drawSky(target, w, h);
    if (land > 0.001) {
      target.save();
      target.translate(0, landOff);
      target.globalAlpha = 1;
      this.drawLand(target, w, h, land);
      target.restore();
    }
    if (streak > 0.01) this.drawStreaks(target, w, h, streak, dir);
    if (target !== ctx) {
      ctx.globalAlpha = atmo;
      ctx.drawImage(this.buf, 0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  };

  P.drawSky = function (ctx, w, h) {
    var p = this.p, S = p.sky, C = p.pal, t = this.T, b = this.b, i, red = EL.reduced;
    var g = ctx.createLinearGradient(0, 0, 0, h * 0.82);
    g.addColorStop(0, U.rgba(S[0], 1));
    g.addColorStop(0.55, U.rgba(S[1], 1));
    g.addColorStop(1, U.rgba(S[2], 1));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    for (i = 0; i < this.stars.length; i++) {
      var s = this.stars[i], a = (1 - s.y * 1.8) * (red ? 0.5 : 0.35 + 0.3 * Math.sin(t * 1.3 + s.ph));
      if (a <= 0) continue;
      ctx.fillStyle = "rgba(255,255,255," + a.toFixed(3) + ")";
      ctx.fillRect(s.x * w, s.y * h, s.s, s.s);
    }
    var m = Math.min(w, h), hz = h * 0.62;
    switch (p.style) {
      case "pearl":
        var mx = w * 0.8, my = h * 0.33, mr = m * 0.09;
        EL.drawGlow(ctx, C.light, mx, my, mr * 4.5, 0.35 + 0.15 * b, true);
        var mg = ctx.createRadialGradient(mx - mr * 0.35, my - mr * 0.35, mr * 0.1, mx, my, mr);
        mg.addColorStop(0, "rgba(255,255,255,0.9)");
        mg.addColorStop(0.7, U.rgba(C.base, 0.6));
        mg.addColorStop(1, U.rgba(C.accent, 0.15));
        ctx.fillStyle = mg;
        ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
        break;
      case "aurora":
        var cols = [C.light, C.accent, C.glow];
        for (var k = 0; k < 3; k++) {
          ctx.lineWidth = Math.max(1.5, w / 120);
          for (var lv = 0; lv < 3; lv++) {
            ctx.strokeStyle = U.rgba(cols[k], [0.075, 0.05, 0.03][lv] * (0.7 + 0.5 * b));
            ctx.beginPath();
            var n = 120;
            for (i = 0; i <= n; i++) {
              var x = (i / n) * w * 1.1 - w * 0.05;
              var y0 = h * (0.1 + k * 0.07) + Math.sin(i * 0.1 + t * (red ? 0 : 0.35) + k * 1.7) * h * 0.04;
              var len = h * (0.12 + 0.1 * (0.5 + 0.5 * Math.sin(i * 0.18 - t * (red ? 0 : 0.6) + k))) * [0.35, 0.7, 1][lv];
              ctx.moveTo(x, y0); ctx.lineTo(x + Math.sin(i * 0.2 + k) * 4, y0 + len);
            }
            ctx.stroke();
          }
        }
        break;
      case "bloom":
        var fx = w * 0.72, fy = hz - h * 0.05, open = 0.45 + 0.55 * b;
        EL.drawGlow(ctx, C.accent, fx, fy, m * 0.55, 0.5, true);
        for (var rg = 0; rg < 3; rg++) {
          ctx.fillStyle = U.rgba(rg % 2 ? C.light : C.glow, 0.18);
          ctx.beginPath();
          var np = 7 + rg * 3;
          for (i = 0; i < np; i++) EL.petal(ctx, fx, fy, (i / np) * TAU + t * (red ? 0 : 0.03) * (rg % 2 ? -1 : 1) + rg * 0.3, m * (0.05 + rg * 0.035), m * (0.1 + 0.08 * open) * (1 - rg * 0.15), m * 0.035 * (0.6 + 0.4 * open));
          ctx.fill();
        }
        EL.drawGlow(ctx, [255, 245, 230], fx, fy, m * 0.12, 0.9);
        break;
      case "cells":
        var ccx = w * 0.5, ccy = h * 0.2, cr = Math.min(w * 0.36, h * 0.13);
        for (i = 0; i < this.skyLights.length; i++) {
          var L = this.skyLights[i], aa = L.a + t * (red ? 0 : 0.05);
          var lx = ccx + Math.cos(aa) * cr * L.r, ly = ccy + Math.sin(aa) * cr * 0.45 * L.r;
          EL.drawGlow(ctx, i % 4 ? C.glow : C.accent, lx, ly, m * 0.025, 0.55 + 0.3 * Math.sin(t * 1.5 + L.ph));
        }
        break;
      default: /* radiant : soleil-cœur à l'horizon, rayons lents qui pulsent avec le souffle */
        var sx = w * 0.5, sy = hz + h * 0.02, R = m * (0.13 + 0.03 * b);
        var rgd = ctx.createRadialGradient(sx, sy, R * 0.4, sx, sy, Math.max(w, h) * 0.9);
        rgd.addColorStop(0, U.rgba(C.light, 0.55));
        rgd.addColorStop(0.3, U.rgba(C.accent, 0.18));
        rgd.addColorStop(1, U.rgba(C.accent, 0));
        ctx.fillStyle = rgd;
        ctx.beginPath();
        for (i = 0; i < 22; i++) {
          var an = (i / 22) * TAU + t * (red ? 0 : 0.02), wd = 0.035 + 0.02 * Math.sin(i * 2.3), Lr = Math.max(w, h) * (0.8 + 0.2 * b);
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + Math.cos(an - wd) * Lr, sy + Math.sin(an - wd) * Lr);
          ctx.lineTo(sx + Math.cos(an + wd) * Lr, sy + Math.sin(an + wd) * Lr);
          ctx.closePath();
        }
        ctx.fill();
        EL.drawGlow(ctx, C.light, sx, sy, R * 4, 0.55 + 0.2 * b);
        EL.drawGlow(ctx, [255, 255, 255], sx, sy, R * 1.6, 0.7);
    }
    ctx.globalCompositeOperation = "source-over";
  };

  P.ridge = function (k, x, w, h) {
    var L = LAND[this.p.style], N = this.noise, drift = EL.reduced ? 0 : this.T * (4 + k * 5);
    var n = N.fbm((x + drift + k * 1000) / L.scale[k] * (w < 600 ? 0.8 : 1), k * 7.3, L.oct, 0);
    if (L.ridged) n = 1 - Math.abs(2 * n - 1);
    if (L.step) n = Math.round(n * 4) / 4 * 0.6 + n * 0.4;
    var amp = L.amp[k] * h;
    if (k === 3) amp *= 0.15 + 0.85 * U.smooth(w * 0.1, w * 0.4, Math.abs(x - this.cx));
    return h * BASE[k] - n * amp - (k === 3 ? 0 : amp * 0.25);
  };

  P.drawLand = function (ctx, w, h, alpha) {
    var p = this.p, C = p.pal, S = p.sky, t = this.T, b = this.b, red = EL.reduced, i, k, x;
    var stepX = Math.max(4, Math.round(w / 140));
    for (k = 0; k < 4; k++) {
      var col = U.mix(S[2], U.mix(C.dark, [6, 4, 18], 0.35), 0.28 + k * 0.22);
      var g = ctx.createLinearGradient(0, h * (BASE[k] - 0.2), 0, h);
      g.addColorStop(0, U.rgba(U.mix(col, C.glow, 0.12), 1));
      g.addColorStop(1, U.rgba(U.mix(col, [4, 2, 12], 0.55), 1));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-2, h + 2);
      var pts = [];
      for (x = -stepX; x <= w + stepX; x += stepX) { var y = this.ridge(k, x, w, h); pts.push(x, y); ctx.lineTo(x, y); }
      ctx.lineTo(w + 2, h + 2);
      ctx.closePath();
      ctx.fill();
      /* liseré lumineux des crêtes */
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = U.rgba(C.light, 0.1 + 0.05 * k + 0.08 * b);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (i = 0; i < pts.length; i += 2) { if (i) ctx.lineTo(pts[i], pts[i + 1]); else ctx.moveTo(pts[i], pts[i + 1]); }
      ctx.stroke();
      this.features(ctx, w, h, k);
      ctx.globalCompositeOperation = "source-over";
    }
    this.drawBody(ctx, w, h);
    ctx.globalCompositeOperation = "lighter";
    this.features(ctx, w, h, 4);
    ctx.globalCompositeOperation = "source-over";
  };

  /* éléments propres à chaque planète, insérés entre les plans (k = 0..3, 4 = premier plan) */
  P.features = function (ctx, w, h, k) {
    var p = this.p, C = p.pal, t = this.T, b = this.b, red = EL.reduced, i, m = Math.min(w, h);
    var st = p.style;
    if (st === "pearl") {
      if (k === 1 || k === 2) {
        for (i = 0; i < 3; i++) {
          var mx = ((i * 0.37 + (red ? 0 : t * 0.012 * (k === 1 ? 1 : -1))) % 1.4 + 1.4) % 1.4 - 0.2;
          ctx.globalAlpha = 0.18 + 0.1 * b;
          ctx.drawImage(EL.glow(C.light, true), mx * w - w * 0.3, h * (BASE[k] + 0.01) - h * 0.04, w * 0.6, h * 0.09);
          ctx.globalAlpha = 1;
        }
      }
      if (k === 4) {
        for (i = 0; i < this.motes.length; i++) {
          var d = this.motes[i], tw = Math.pow(Math.max(0, Math.sin(t * (1 + d.sp * 10) + d.ph * 9)), 8);
          EL.sparkle(ctx, d.x * w, h * (0.82 + d.ph * 0.16), 3 + 4 * tw * d.s, tw * 0.9, C.light);
        }
      }
    } else if (st === "aurora") {
      if (k === 1) {
        for (i = 0; i < 14; i++) {
          var fx = ((i + 0.5) / 14 + Math.sin(i * 3.1) * 0.02) * w, y1 = h * 0.05, y2 = this.ridge(2, fx, w, h);
          var gr = ctx.createLinearGradient(0, y1, 0, y2);
          gr.addColorStop(0, U.rgba(C.light, 0));
          gr.addColorStop(1, U.rgba(C.light, 0.22 + 0.2 * b));
          ctx.strokeStyle = gr; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(fx, y1); ctx.lineTo(fx, y2); ctx.stroke();
          var phs = ((t * (0.12 + (i % 4) * 0.04) + i * 0.27) % 1);
          EL.drawGlow(ctx, C.light, fx, U.lerp(y2, y1, phs), m * 0.025, 0.6 * Math.sin(phs * Math.PI));
        }
      }
      if (k === 4 && this.phase !== "descent") {
        /* fils de lumière qui descendent vers les mains levées : le corps-antenne capte */
        var B = this.body, f = this.formAlpha();
        [-1, 1].forEach(function (s) {
          var hx = this.bx + s * 22.4 * B.u, hy = this.by - 8 * B.u;
          for (var j = 0; j < 3; j++) {
            var gx = hx + s * j * 6, g2 = ctx.createLinearGradient(0, 0, 0, hy);
            g2.addColorStop(0, U.rgba(C.light, 0));
            g2.addColorStop(1, U.rgba(C.light, (0.25 + 0.4 * b) * f));
            ctx.strokeStyle = g2; ctx.lineWidth = 1.4 - j * 0.3;
            ctx.beginPath(); ctx.moveTo(gx + s * j * 10, 0); ctx.lineTo(hx, hy); ctx.stroke();
            var q = (t * 0.5 + j * 0.33) % 1;
            EL.drawGlow(ctx, C.light, U.lerp(gx + s * j * 10, hx, q), U.lerp(0, hy, q), m * 0.02, 0.8 * f * Math.sin(q * Math.PI));
          }
        }, this);
      }
    } else if (st === "bloom") {
      if (k === 2 || k === 3) {
        for (i = 0; i < this.flowers.length; i++) {
          var fl = this.flowers[i];
          if (fl.layer !== k) continue;
          var x = fl.x * w;
          if (k === 3 && Math.abs(x - this.cx) < w * 0.16) x += (x < this.cx ? -1 : 1) * w * 0.16;
          var y = this.ridge(k, x, w, h) + 2, sz = m * 0.035 * fl.s * (k === 3 ? 1.3 : 0.85);
          var open = 0.3 + 0.7 * (red ? 0.7 : b) * (0.85 + 0.15 * Math.sin(t + fl.ph));
          ctx.strokeStyle = U.rgba(C.light, 0.35); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + sz * 0.3, y - sz * 1.2, x, y - sz * 2.2); ctx.stroke();
          var col = [C.accent, C.glow, C.light][fl.c];
          ctx.fillStyle = U.rgba(col, 0.38);
          ctx.beginPath();
          for (var j = 0; j < fl.n; j++) EL.petal(ctx, x, y - sz * 2.2, (j / fl.n) * TAU + fl.ph + t * 0.05, sz * 0.15, sz * (0.5 + 0.7 * open), sz * 0.3 * (0.5 + 0.5 * open));
          ctx.fill();
          EL.drawGlow(ctx, col, x, y - sz * 2.2, sz * (1.5 + 1.5 * open), 0.5);
        }
      }
      if (k === 4) {
        for (i = 0; i < 24; i++) {
          var po = this.motes[i], q2 = (t * po.sp + po.ph) % 1;
          EL.drawGlow(ctx, i % 2 ? C.light : C.accent, po.x * w + Math.sin(t * 0.5 + po.sway) * 20, h * (0.95 - q2 * 0.7), m * 0.012 * po.s + 2, 0.7 * Math.sin(q2 * Math.PI));
        }
      }
    } else if (st === "cells") {
      if (k === 4 || k === 3) {
        /* cercle de lumières au sol autour du corps (moitié arrière avant le corps, moitié avant après) */
        var n = 26, rx = Math.min(w * 0.42, this.bh * 0.62), ry = rx * 0.16, cy = this.feetY;
        for (i = 0; i < n; i++) {
          var an = (i / n) * TAU + (red ? 0 : t * 0.08), sn = Math.sin(an);
          if ((k === 3) !== (sn < 0)) continue;
          var wave = 0.5 + 0.5 * Math.sin(an * 2 - t * 2.2);
          var lx = this.cx + Math.cos(an) * rx, ly = cy + sn * ry, sz2 = m * (0.012 + 0.006 * (sn + 1));
          EL.drawGlow(ctx, i % 4 ? C.glow : C.accent, lx, ly, sz2 * (4 + 3 * b), 0.4 + 0.35 * wave + 0.25 * b);
          ctx.fillStyle = U.rgba(C.light, 0.9);
          ctx.fillRect(lx - sz2 * 0.4, ly - sz2 * 0.4, sz2 * 0.8, sz2 * 0.8);
        }
        if (k === 3) {
          ctx.strokeStyle = U.rgba(C.light, 0.12 + 0.15 * b); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(this.cx, cy, rx, ry, 0, 0, TAU); ctx.stroke();
        }
      }
      if (k === 4) {
        for (i = 0; i < 18; i++) {
          var mo = this.motes[i], q3 = (t * mo.sp * 0.8 + mo.ph) % 1;
          var sx0 = mo.x * w, sy0 = h * 0.1;
          EL.drawGlow(ctx, C.glow, U.lerp(sx0, this.cx + Math.cos(i) * this.bh * 0.5, q3), U.lerp(sy0, this.feetY, q3), m * 0.015, 0.6 * Math.sin(q3 * Math.PI));
        }
      }
    } else {
      if (k === 4) {
        for (i = 0; i < this.motes.length; i++) {
          var mt = this.motes[i], q4 = (t * mt.sp + mt.ph) % 1;
          EL.drawGlow(ctx, i % 3 ? C.accent : C.light, mt.x * w + Math.sin(t * 0.4 + mt.sway) * 14, h * (1 - q4 * 0.85), m * 0.01 * mt.s + 2, 0.75 * Math.sin(q4 * Math.PI));
        }
        EL.drawGlow(ctx, C.accent, this.cx, this.feetY, this.bh * 0.6, 0.12 + 0.12 * b, true);
      }
    }
  };

  P.formAlpha = function () {
    var ph = this.phase, k = Math.min(1, this.pt / this.dur(ph));
    if (ph === "descent") return 0;
    if (ph === "forming") return U.smooth(0.45, 1, k);
    if (ph === "dissolve" || ph === "quit") return 1 - U.smooth(0, 0.5, k);
    if (ph === "ascent") return 0;
    return 1;
  };

  P.drawBody = function (ctx, w, h) {
    var ph = this.phase;
    if (ph === "descent" || ph === "ascent") return;
    var B = this.body, C = this.p.pal, t = this.T, b = this.b, red = EL.reduced;
    var k = Math.min(1, this.pt / this.dur(ph)), fa = this.formAlpha(), i;
    var ox = this.bx, oy = this.by, ccx = ox + B.center[0], ccy = oy + B.center[1];
    var m = Math.min(w, h);
    ctx.globalCompositeOperation = "lighter";
    /* cercle de souffle derrière le corps */
    if (ph === "breathing" || ph === "forming" || ph === "dissolve" || ph === "quit") {
      var ca = ph === "breathing" ? 1 : ph === "forming" ? U.smooth(0.6, 1, k) : 1 - U.smooth(0, 0.4, k);
      var rMin = m * (red ? 0.26 : 0.18), rMax = m * 0.33, rr = U.lerp(rMin, rMax, b);
      var gg = ctx.createRadialGradient(ccx, ccy, rr * 0.2, ccx, ccy, rr);
      gg.addColorStop(0, U.rgba(C.glow, 0.02));
      gg.addColorStop(0.75, U.rgba(C.glow, (0.06 + 0.12 * b) * ca));
      gg.addColorStop(1, U.rgba(C.light, (0.12 + 0.12 * b) * ca));
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(ccx, ccy, rr, 0, TAU); ctx.fill();
      ctx.strokeStyle = U.rgba(C.light, (0.45 + 0.35 * b) * ca);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ccx, ccy, rr, 0, TAU); ctx.stroke();
      if (ph === "breathing") {
        var prog = Math.min(1, this.pt / 30);
        ctx.strokeStyle = U.rgba(C.light, 0.18); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(ccx, ccy, rMax + 12, 0, TAU); ctx.stroke();
        ctx.strokeStyle = U.rgba(C.light, 0.7); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(ccx, ccy, rMax + 12, -Math.PI / 2, -Math.PI / 2 + prog * TAU); ctx.stroke();
        var ea = -Math.PI / 2 + prog * TAU;
        EL.drawGlow(ctx, C.light, ccx + Math.cos(ea) * (rMax + 12), ccy + Math.sin(ea) * (rMax + 12), 14, 0.9);
      }
    }
    /* halo + silhouette */
    var sw = B.W, shh = B.H, pf = B.glow.padFrac || 0, gsc = (1 + 0.04 * b) / (1 - 2 * pf) * (pf ? 1.05 : 1.15);
    if (fa > 0.01) {
      ctx.globalAlpha = Math.min(1, fa * (0.5 + 0.3 * b));
      var gcx = ox - B.ox + sw / 2, gcy = oy - B.oy + shh / 2;
      ctx.drawImage(B.glow, gcx - (sw * gsc) / 2, gcy - (shh * gsc) / 2, sw * gsc, shh * gsc);
      ctx.globalAlpha = fa * (0.2 + 0.12 * b);
      ctx.drawImage(B.sil, ox - B.ox, oy - B.oy, sw, shh);
      ctx.globalAlpha = 1;
      EL.drawGlow(ctx, [255, 255, 255], ox + B.heart[0], oy + B.heart[1], this.bh * (0.09 + 0.05 * b), fa * (0.35 + 0.35 * b));
    }
    /* particules */
    var parts = B.parts, n = parts.length, c = U.mix(C.light, [255, 255, 255], 0.5);
    ctx.fillStyle = U.rgba(c, 0.85);
    var exp = 1 + 0.03 * b;
    for (i = 0; i < n; i++) {
      var pp = parts[i], x, y, a = 1, s = pp.size;
      var tx = ox + B.center[0] + (pp.tx - B.center[0]) * exp, ty = oy + B.center[1] + (pp.ty - B.center[1]) * exp;
      if (ph === "forming") {
        var q = U.clamp((k - pp.delay) / 0.55, 0, 1), e = U.easeOut(q);
        var sx, sy;
        if (pp.fromSky) { sx = pp.sx0 * w; sy = -20 - pp.rad * h * 0.2; }
        else { sx = ccx + Math.cos(pp.ang) * m * pp.rad; sy = ccy + Math.sin(pp.ang) * m * pp.rad; }
        var sw2 = Math.sin(q * Math.PI) * 30 * (pp.ph > Math.PI ? 1 : -1);
        x = U.lerp(sx, tx, e) + sw2; y = U.lerp(sy, ty, e);
        a = q <= 0 ? 0 : 0.35 + 0.65 * q;
      } else if (ph === "dissolve" || ph === "quit") {
        var hfrac = (pp.ty / this.bh);
        var q2 = U.clamp((k - (1 - hfrac) * 0.3 - pp.delay * 0.2) / 0.6, 0, 1), e2 = U.easeIn(q2);
        x = tx + Math.sin(q2 * 4 + pp.ph) * 24 * q2;
        y = ty - e2 * h * (0.7 + pp.sp * 0.3);
        a = 1 - q2;
      } else {
        x = tx + (red ? 0 : Math.sin(t * pp.sp + pp.ph) * 0.9);
        y = ty + (red ? 0 : Math.cos(t * pp.sp * 0.8 + pp.ph) * 0.9);
        a = 0.6 + 0.4 * Math.sin(t * pp.sp * 2 + pp.ph);
      }
      if (a <= 0.02) continue;
      if (pp.bright) EL.drawGlow(ctx, C.light, x, y, s * 6, a * 0.7);
      ctx.globalAlpha = a;
      ctx.fillRect(x - s * 0.5, y - s * 0.5, s, s);
    }
    ctx.globalAlpha = 1;
    /* éclat de lumière : se forme au cœur puis s'envole vers le haut */
    if (ph === "dissolve") {
      var q3 = U.smooth(0.15, 0.55, k), q4 = U.easeIn(U.smooth(0.55, 1, k));
      var hx = ox + B.heart[0], hy = U.lerp(oy + B.heart[1], -60, q4);
      EL.drawGlow(ctx, C.light, hx, hy, this.bh * (0.1 + 0.25 * q3), q3);
      EL.drawGlow(ctx, [255, 255, 255], hx, hy, this.bh * 0.06 * (1 + q3), q3);
      if (q4 > 0) {
        ctx.strokeStyle = U.rgba(C.light, 0.5 * q3);
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx, hy + 120 * q4); ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = "source-over";
  };

  P.drawStreaks = function (ctx, w, h, a, dir) {
    var C = this.p.pal, t = this.T, i;
    ctx.globalCompositeOperation = "lighter";
    for (i = 0; i < this.streaks.length; i++) {
      var s = this.streaks[i], y = ((s.ph + dir * t * s.sp * 1.4) % 1 + 1) % 1;
      var x = s.x * w, yy = y * h * 1.3 - h * 0.15;
      if (s.cloud) {
        ctx.globalAlpha = a * 0.35;
        ctx.drawImage(EL.glow(C.light, true), x - w * 0.35, yy - h * 0.12, w * 0.7, h * 0.24);
        ctx.globalAlpha = 1;
      } else {
        var len = s.len * h;
        var g = ctx.createLinearGradient(0, yy, 0, yy + len * -dir);
        g.addColorStop(0, U.rgba(C.light, 0.55 * a));
        g.addColorStop(1, U.rgba(C.light, 0));
        ctx.strokeStyle = g; ctx.lineWidth = s.w;
        ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x, yy + len * -dir); ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = "source-over";
  };

  EL.Incarnation = Incarnation;
  EL.setDiscoveryMuted = function (m) { if (discoveryAudio) discoveryAudio.muted = !!m; };
  EL.stopDiscoverySong = stopDiscovery;
  EL.DISCOVERY_SONG = DISCOVERY;
})();
