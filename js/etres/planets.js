/* Les Êtres de Lumière — les 5 planètes : palettes, textures procédurales, anneaux, lunes,
   particules d'ambiance propres à chacune. Rendu dans l'espace (canvas 2D). */
(function () {
  "use strict";
  var EL = window.EL, U = EL.util, TAU = Math.PI * 2;

  var PLANETS = (EL.PLANETS = [
    { x: 230, y: -300, r: 150, style: "pearl", seed: 101, spin: 7,
      pal: { base: [226, 214, 242], light: [255, 250, 253], dark: [150, 128, 196], accent: [255, 196, 226], glow: [230, 212, 255] },
      sky: [[46, 30, 92], [150, 110, 190], [255, 214, 232]], ring: [255, 196, 238] },
    { x: -1150, y: -650, r: 165, style: "aurora", seed: 202, spin: 5,
      pal: { base: [36, 112, 138], light: [140, 255, 220], dark: [8, 30, 64], accent: [80, 190, 255], glow: [90, 240, 200] },
      sky: [[6, 22, 52], [20, 90, 120], [90, 220, 190]], ring: [110, 255, 210] },
    { x: -950, y: 1100, r: 155, style: "bloom", seed: 303, spin: 6,
      pal: { base: [232, 100, 150], light: [255, 214, 190], dark: [110, 24, 80], accent: [255, 150, 96], glow: [255, 130, 186] },
      sky: [[70, 16, 64], [170, 60, 120], [255, 176, 150]], ring: [255, 128, 180] },
    { x: 1300, y: 950, r: 170, style: "cells", seed: 404, spin: 4,
      pal: { base: [224, 150, 66], light: [255, 232, 160], dark: [56, 40, 118], accent: [110, 140, 255], glow: [255, 186, 100] },
      sky: [[30, 24, 90], [120, 80, 150], [255, 190, 100]], ring: [255, 190, 96] },
    { x: 150, y: -1850, r: 190, style: "radiant", seed: 505, spin: 3,
      pal: { base: [255, 232, 180], light: [255, 255, 248], dark: [222, 168, 80], accent: [255, 210, 120], glow: [255, 236, 170] },
      sky: [[70, 48, 96], [200, 150, 120], [255, 244, 200]], ring: [255, 244, 190] }
  ]);

  /* ---------- textures (bande équirectangulaire périodique en x) ---------- */
  var TW = 512, TH = 256;
  function texColor(style, N, nx, ny, P) {
    var f, c, q, t;
    switch (style) {
      case "pearl":
        f = N.fbm(nx, ny, 5, 8);
        var b = 0.5 + 0.5 * Math.sin(ny * 5.5 + f * 7);
        c = U.mix(P.dark, P.base, U.smooth(0.25, 0.75, f));
        c = U.mix(c, P.light, Math.pow(b, 3) * 0.55);
        return U.mix(c, P.accent, (0.5 + 0.5 * Math.sin(f * 14 + nx * 0.8)) * 0.25);
      case "aurora":
        f = N.fbm(nx, ny, 5, 8);
        var rid = Math.pow(1 - Math.abs(2 * f - 1), 3);
        c = U.mix(P.dark, P.base, U.smooth(0.3, 0.7, f));
        c = U.mix(c, P.light, rid * 0.55);
        t = N.fbm(nx * 2, ny * 0.3 + 3, 3, 16);
        return U.mix(c, P.accent, U.smooth(0.52, 0.72, t) * 0.45);
      case "bloom":
        q = N.fbm(nx, ny, 4, 8);
        f = N.fbm(nx + 2.5 * q, ny + 2.5 * q, 5, 8);
        c = U.mix(P.dark, P.base, U.smooth(0.2, 0.7, f));
        c = U.mix(c, P.accent, U.smooth(0.4, 0.8, q) * 0.5);
        return U.mix(c, P.light, Math.pow(f, 4) * 1.4);
      case "cells":
        f = N.fbm(nx, ny, 5, 8);
        c = U.mix(P.dark, P.base, U.smooth(0.38, 0.62, f));
        c = U.mix(c, P.accent, (0.5 + 0.5 * Math.sin(ny * 9 + f * 4)) * 0.18 * (1 - f));
        var s = N.n2(nx * 6, ny * 6, 48);
        if (s > 0.78) c = U.mix(c, P.light, Math.min(1, (s - 0.78) * 6));
        return c;
      default: /* radiant */
        f = N.fbm(nx, ny, 5, 8);
        t = Math.abs(2 * f - 1);
        c = U.mix(P.light, P.base, U.smooth(0, 0.45, t));
        c = U.mix(c, P.dark, U.smooth(0.4, 0.9, t) * 0.55);
        return U.mix(c, P.accent, (0.5 + 0.5 * Math.sin(ny * 4 + f * 9)) * 0.2);
    }
  }
  function makeTexture(p) {
    var cv = U.canvas(TW, TH), g = cv.getContext("2d"), img = g.createImageData(TW, TH), d = img.data;
    var N = EL.makeNoise(p.seed);
    for (var y = 0; y < TH; y++) {
      var ny = (y / TH) * 4;
      var pole = Math.sin((y / TH) * Math.PI); // assombrit légèrement les pôles
      for (var x = 0; x < TW; x++) {
        var c = texColor(p.style, N, (x / TW) * 8, ny, p.pal), i = (y * TW + x) * 4;
        var k = 0.82 + 0.18 * pole;
        d[i] = c[0] * k; d[i + 1] = c[1] * k; d[i + 2] = c[2] * k; d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return cv;
  }

  /* ---------- particules d'ambiance (paramètres fixes, positions calculées depuis le temps) ---------- */
  function makeParts(p) {
    var r = U.rng(p.seed * 7 + 1), P = {}, i;
    function arr(n, fn) { var a = []; for (var k = 0; k < n; k++) a.push(fn(k)); return a; }
    if (p.style === "pearl") {
      P.mist = arr(14, function () { return { a: r() * TAU, rr: 1.15 + r() * 0.9, sz: 0.45 + r() * 0.5, sp: (r() < 0.5 ? -1 : 1) * (0.02 + r() * 0.03), ph: r() * TAU }; });
      P.dew = arr(48, function () { return { a: r() * TAU, rr: 1.05 + r() * 1.3, sp: 0.5 + r() * 1.2, ph: r() * TAU, s: 0.6 + r() * 0.8 }; });
    } else if (p.style === "aurora") {
      P.fil = arr(16, function () { return { u: (r() * 2 - 1) * 1.05, top: 1.9 + r() * 1.2, sp: 0.15 + r() * 0.25, ph: r() }; });
      P.moons = [{ rr: 2.1, tilt: 0.35, sp: 0.12, ph: 0.5, s: 0.13, c: [160, 255, 230] }, { rr: 2.7, tilt: 0.28, sp: -0.07, ph: 2.6, s: 0.08, c: [200, 230, 255] }];
    } else if (p.style === "bloom") {
      P.rings = [{ n: 6, rr: 1.08, len: 0.6, w: 0.24, sp: 0.05 }, { n: 9, rr: 1.32, len: 0.55, w: 0.19, sp: -0.035 }, { n: 13, rr: 1.6, len: 0.46, w: 0.14, sp: 0.024 }];
      P.pollen = arr(30, function () { return { a: r() * TAU, sp: 0.04 + r() * 0.08, ph: r() }; });
      P.moons = [{ rr: 2.5, tilt: 0.4, sp: 0.09, ph: 1.2, s: 0.11, c: [255, 190, 210] }];
    } else if (p.style === "cells") {
      P.lights = arr(72, function () { return { rr: 1.25 + r() * 1.35, tilt: 0.25 + r() * 0.4, rot: r() * TAU, sp: (r() < 0.5 ? -1 : 1) * (0.05 + r() * 0.16), ph: r() * TAU, s: 0.6 + r() * 0.8 }; });
    } else {
      P.rays = arr(18, function (k) { return { a: (k / 18) * TAU + r() * 0.12, l: 0.75 + r() * 0.5, w: 0.035 + r() * 0.035 }; });
      P.motes = arr(26, function () { return { a: r() * TAU, sp: 0.03 + r() * 0.06, ph: r() }; });
    }
    return P;
  }

  EL.sparkle = function (ctx, x, y, s, a, c) {
    if (a <= 0.01) return;
    /* étoile réaliste : point lumineux, halo doux, aigrettes de diffraction très fines */
    EL.drawGlow(ctx, c, x, y, s * 2.2, a * 0.75);
    ctx.strokeStyle = U.rgba(c, a * 0.22);
    ctx.lineWidth = Math.max(0.4, s * 0.06);
    ctx.beginPath();
    ctx.moveTo(x - s * 1.6, y); ctx.lineTo(x + s * 1.6, y);
    ctx.moveTo(x, y - s * 1.6); ctx.lineTo(x, y + s * 1.6);
    ctx.stroke();
    ctx.fillStyle = U.rgba([255, 255, 255], Math.min(1, a * 1.2));
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, s * 0.16), 0, TAU); ctx.fill();
  };

  function moon(ctx, m, sx, sy, R, t, behind) {
    var a = m.ph + t * m.sp, sn = Math.sin(a);
    if (behind !== sn < 0) return;
    var x = sx + Math.cos(a) * m.rr * R, y = sy + sn * m.rr * R * m.tilt, s = m.s * R;
    EL.drawGlow(ctx, m.c, x, y, s * 2.6, 0.28);
    var g = ctx.createRadialGradient(x - s * 0.4, y - s * 0.4, s * 0.1, x, y, s);
    g.addColorStop(0, U.rgba(U.mix(m.c, [255, 255, 255], 0.55), 1));
    g.addColorStop(0.55, U.rgba(m.c, 0.95));
    g.addColorStop(1, U.rgba(U.mix(m.c, [30, 14, 60], 0.65), 1));
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = "lighter";
  }

  function petal(ctx, cx, cy, ang, r0, L, W) {
    var ca = Math.cos(ang), sa = Math.sin(ang);
    function P(u, v) { return [cx + ca * u - sa * v, cy + sa * u + ca * v]; }
    var a = P(r0, 0), b1 = P(r0 + L * 0.3, -W), b2 = P(r0 + L * 0.85, -W * 0.6), tip = P(r0 + L, 0), c1 = P(r0 + L * 0.85, W * 0.6), c2 = P(r0 + L * 0.3, W);
    ctx.moveTo(a[0], a[1]);
    ctx.bezierCurveTo(b1[0], b1[1], b2[0], b2[1], tip[0], tip[1]);
    ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], a[0], a[1]);
  }
  EL.petal = petal;

  /* ---------- couches derrière / devant le corps de la planète ---------- */
  function drawBack(ctx, p, sx, sy, R, t, prox, q) {
    var P = p.parts, C = p.pal, i;
    ctx.globalCompositeOperation = "lighter";
    EL.drawGlow(ctx, C.glow, sx, sy, R * 2.5, 0.38 + 0.4 * prox, true);
    if (p.style === "pearl") {
      for (i = 0; i < P.mist.length; i++) {
        var m = P.mist[i], a = m.a + t * m.sp;
        if (Math.sin(a) > 0) continue;
        EL.drawGlow(ctx, C.light, sx + Math.cos(a) * m.rr * R, sy + Math.sin(a) * m.rr * R * 0.7, m.sz * R, 0.1 + 0.05 * Math.sin(t * 0.3 + m.ph) + 0.05 * prox, true);
      }
      ringHalf(ctx, p, sx, sy, R, true);
    } else if (p.style === "aurora") {
      P.moons.forEach(function (mo) { moon(ctx, mo, sx, sy, R, t, true); });
    } else if (p.style === "bloom") {
      P.moons.forEach(function (mo) { moon(ctx, mo, sx, sy, R, t, true); });
      for (var k = 0; k < P.rings.length; k++) {
        var rg = P.rings[k], open = (0.55 + 0.45 * Math.sin(t * 0.35 + k * 1.3)) * (0.7 + 0.3 * prox);
        var gr = ctx.createRadialGradient(sx, sy, R * rg.rr * 0.9, sx, sy, R * (rg.rr + rg.len * 1.1));
        gr.addColorStop(0, U.rgba(k % 2 ? C.accent : C.glow, 0.42));
        gr.addColorStop(0.6, U.rgba(C.light, 0.16));
        gr.addColorStop(1, U.rgba(C.light, 0));
        ctx.fillStyle = gr;
        ctx.beginPath();
        for (i = 0; i < rg.n; i++) petal(ctx, sx, sy, (i / rg.n) * TAU + t * rg.sp + k * 0.4, R * rg.rr * 0.92, R * rg.len * (0.45 + 0.55 * open), R * rg.w * (0.6 + 0.4 * open));
        ctx.fill();
      }
    } else if (p.style === "radiant") {
      var pulse = 0.5 + 0.5 * Math.sin(t * 0.6);
      var g = ctx.createRadialGradient(sx, sy, R * 0.6, sx, sy, R * 3.6);
      g.addColorStop(0, U.rgba(C.light, 0.5));
      g.addColorStop(0.35, U.rgba(C.accent, 0.16));
      g.addColorStop(1, U.rgba(C.accent, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      for (i = 0; i < P.rays.length; i++) {
        var ry = P.rays[i], ang = ry.a + t * 0.025 * (i % 2 ? 1 : -0.6), L = R * (1.9 + 1.4 * ry.l * (0.7 + 0.3 * pulse) + 0.4 * prox);
        ctx.moveTo(sx + Math.cos(ang - ry.w) * R * 0.9, sy + Math.sin(ang - ry.w) * R * 0.9);
        ctx.lineTo(sx + Math.cos(ang) * L, sy + Math.sin(ang) * L);
        ctx.lineTo(sx + Math.cos(ang + ry.w) * R * 0.9, sy + Math.sin(ang + ry.w) * R * 0.9);
        ctx.closePath();
      }
      ctx.fill();
    } else if (p.style === "cells") {
      drawLights(ctx, p, sx, sy, R, t, true);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function ringHalf(ctx, p, sx, sy, R, back) {
    var rot = -0.32, C = p.ring;
    ctx.lineCap = "round";
    var bands = [[1.55, 0.05, 0.22], [1.68, 0.025, 0.4], [1.8, 0.07, 0.16], [1.95, 0.02, 0.3]];
    for (var i = 0; i < bands.length; i++) {
      var b = bands[i];
      ctx.strokeStyle = U.rgba(C, b[2]);
      ctx.lineWidth = Math.max(1, R * b[1]);
      ctx.beginPath();
      ctx.ellipse(sx, sy, R * b[0], R * b[0] * 0.24, rot, back ? Math.PI : 0, back ? TAU : Math.PI);
      ctx.stroke();
    }
  }

  function drawLights(ctx, p, sx, sy, R, t, back) {
    var L = p.parts.lights, g = p.gather || 0, e = U.easeInOut(g), C = p.pal, n = L.length;
    for (var i = 0; i < n; i++) {
      var l = L[i], a = l.ph + t * l.sp;
      var lx = Math.cos(a) * l.rr, ly = Math.sin(a) * l.rr * l.tilt;
      var ox = lx * Math.cos(l.rot) - ly * Math.sin(l.rot), oy = lx * Math.sin(l.rot) + ly * Math.cos(l.rot);
      var ca = (i / n) * TAU + t * 0.12, cx = Math.cos(ca) * 1.55, cy = Math.sin(ca) * 1.55 * 0.92;
      var x = U.lerp(ox, cx, e), y = U.lerp(oy, cy, e);
      var depth = U.lerp(Math.sin(a), Math.sin(ca), e);
      if (back !== depth < 0) continue;
      if (x * x + y * y < 1.02 && depth < 0) continue;
      var tw = 0.65 + 0.35 * Math.sin(t * 2 + l.ph * 3);
      var px = sx + x * R, py = sy + y * R, s = R * 0.022 * l.s;
      EL.drawGlow(ctx, i % 5 ? C.glow : C.accent, px, py, s * 6, 0.5 * tw);
      ctx.fillStyle = U.rgba(C.light, 0.9 * tw);
      ctx.fillRect(px - s * 0.6, py - s * 0.6, s * 1.2, s * 1.2);
    }
    if (back && e > 0.3) {
      ctx.strokeStyle = U.rgba(C.light, (e - 0.3) * 0.35);
      ctx.lineWidth = Math.max(1, R * 0.008);
      ctx.beginPath(); ctx.ellipse(sx, sy, R * 1.55, R * 1.55 * 0.92, 0, 0, TAU); ctx.stroke();
    }
  }

  function drawFront(ctx, p, sx, sy, R, t, prox, q) {
    var P = p.parts, C = p.pal, i;
    ctx.globalCompositeOperation = "lighter";
    if (p.style === "pearl") {
      ringHalf(ctx, p, sx, sy, R, false);
      for (i = 0; i < P.mist.length; i++) {
        var m = P.mist[i], a = m.a + t * m.sp;
        if (Math.sin(a) <= 0) continue;
        EL.drawGlow(ctx, C.light, sx + Math.cos(a) * m.rr * R, sy + Math.sin(a) * m.rr * R * 0.7, m.sz * R, 0.08 + 0.04 * Math.sin(t * 0.3 + m.ph) + 0.05 * prox, true);
      }
      var nd = q ? 24 : P.dew.length;
      for (i = 0; i < nd; i++) {
        var d = P.dew[i], aa = d.a + t * 0.02, tw = Math.pow(Math.max(0, Math.sin(t * d.sp + d.ph)), 6);
        EL.sparkle(ctx, sx + Math.cos(aa) * d.rr * R, sy + Math.sin(aa) * d.rr * R * 0.8, R * 0.035 * d.s * (0.5 + tw), tw * (0.6 + 0.4 * prox), C.light);
      }
    } else if (p.style === "aurora") {
      P.moons.forEach(function (mo) { moon(ctx, mo, sx, sy, R, t, false); });
      var cols = [C.light, C.accent, C.glow];
      var N = q ? 40 : 90;
      for (var k = 0; k < 3; k++) {
        var a0 = -2.55 + k * 0.12, a1 = -0.6 - k * 0.1;
        ctx.lineWidth = Math.max(1, R * 0.018);
        for (var lvl = 0; lvl < 3; lvl++) {
          ctx.strokeStyle = U.rgba(cols[k], [0.2, 0.12, 0.06][lvl] * (0.65 + 0.35 * prox));
          ctx.beginPath();
          for (i = 0; i <= N; i++) {
            var an = a0 + (a1 - a0) * (i / N);
            var rb = R * (1.08 + 0.07 * k) + R * 0.05 * Math.sin(an * 6 + t * 0.6 + k);
            var len = R * (0.3 + 0.26 * (0.5 + 0.5 * Math.sin(an * 9 - t * 0.8 + k * 2))) * (0.75 + 0.25 * prox) * [0.4, 0.72, 1][lvl];
            var bx = sx + Math.cos(an) * rb, by = sy + Math.sin(an) * rb;
            ctx.moveTo(bx, by);
            ctx.lineTo(bx + Math.cos(an) * len, by + Math.sin(an) * len);
          }
          ctx.stroke();
        }
      }
      for (i = 0; i < P.fil.length; i++) {
        var f = P.fil[i], fx = sx + f.u * R, dy = Math.sqrt(Math.max(0, 1 - f.u * f.u)) * R;
        var y1 = sy - R * f.top, y2 = sy - dy * 0.96;
        var gr = ctx.createLinearGradient(0, y1, 0, y2);
        gr.addColorStop(0, U.rgba(C.light, 0));
        gr.addColorStop(1, U.rgba(C.light, 0.32 + 0.2 * prox));
        ctx.strokeStyle = gr;
        ctx.lineWidth = Math.max(0.8, R * 0.008);
        ctx.beginPath(); ctx.moveTo(fx, y1); ctx.lineTo(fx, y2); ctx.stroke();
        var ph = (t * f.sp + f.ph) % 1;
        EL.drawGlow(ctx, C.light, fx, U.lerp(y1, y2, ph), R * 0.06, 0.55 * Math.sin(ph * Math.PI));
      }
    } else if (p.style === "bloom") {
      P.moons.forEach(function (mo) { moon(ctx, mo, sx, sy, R, t, false); });
      for (i = 0; i < P.pollen.length; i++) {
        var po = P.pollen[i], ph2 = (t * po.sp + po.ph) % 1, rr = (1.1 + ph2 * 1.4) * R;
        EL.drawGlow(ctx, i % 3 ? C.light : C.accent, sx + Math.cos(po.a + ph2 * 0.6) * rr, sy + Math.sin(po.a + ph2 * 0.6) * rr, R * 0.05, 0.7 * Math.sin(ph2 * Math.PI));
      }
    } else if (p.style === "cells") {
      drawLights(ctx, p, sx, sy, R, t, false);
    } else {
      var pulse = 0.5 + 0.5 * Math.sin(t * 0.6);
      EL.drawGlow(ctx, [255, 255, 250], sx, sy, R * 1.25, 0.4 + 0.25 * pulse);
      for (i = 0; i < P.motes.length; i++) {
        var mo2 = P.motes[i], ph3 = (t * mo2.sp + mo2.ph) % 1, r3 = (1.0 + ph3 * 2.0) * R;
        EL.drawGlow(ctx, C.accent, sx + Math.cos(mo2.a) * r3, sy + Math.sin(mo2.a) * r3, R * 0.045, 0.8 * Math.sin(ph3 * Math.PI));
      }
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function drawBody(ctx, p, sx, sy, R, t) {
    var tex = p.tex, C = p.pal, w = R * 4, off = (((t * p.spin) / TW) * w) % w;
    ctx.save();
    ctx.beginPath(); ctx.arc(sx, sy, R, 0, TAU); ctx.clip();
    ctx.drawImage(tex, sx - R - off, sy - R, w, R * 2);
    ctx.drawImage(tex, sx - R - off + w, sy - R, w, R * 2);
    var emissive = p.style === "radiant";
    var shadow = U.mix(C.dark, [8, 4, 20], 0.7);
    /* éclairage physique : assombrissement du limbe + terminateur doux (lumière venant du haut à gauche) */
    var limb = ctx.createRadialGradient(sx, sy, R * 0.2, sx, sy, R);
    limb.addColorStop(0, "rgba(0,0,0,0)");
    limb.addColorStop(0.75, U.rgba(shadow, emissive ? 0.05 : 0.18));
    limb.addColorStop(1, U.rgba(shadow, emissive ? 0.2 : 0.55));
    ctx.fillStyle = limb;
    ctx.fillRect(sx - R, sy - R, R * 2, R * 2);
    if (!emissive) {
      var term = ctx.createRadialGradient(sx - R * 0.55, sy - R * 0.5, R * 0.4, sx - R * 0.55, sy - R * 0.5, R * 2.15);
      term.addColorStop(0, "rgba(0,0,0,0)");
      term.addColorStop(0.55, "rgba(0,0,0,0)");
      term.addColorStop(0.78, U.rgba(shadow, 0.6));
      term.addColorStop(1, U.rgba(shadow, 0.92));
      ctx.fillStyle = term;
      ctx.fillRect(sx - R, sy - R, R * 2, R * 2);
    }
    ctx.globalCompositeOperation = "lighter";
    /* atmosphère : fine diffusion sur le limbe éclairé seulement */
    var rim = ctx.createRadialGradient(sx + R * 0.12, sy + R * 0.1, R * 0.86, sx, sy, R);
    rim.addColorStop(0, U.rgba(C.glow, 0));
    rim.addColorStop(1, U.rgba(C.glow, emissive ? 0.5 : 0.38));
    ctx.fillStyle = rim;
    ctx.fillRect(sx - R, sy - R, R * 2, R * 2);
    ctx.restore();
  }

  EL.Planets = {
    init: function () {
      PLANETS.forEach(function (p, i) {
        p.i = i;
        p.tex = makeTexture(p);
        p.parts = makeParts(p);
        p.gather = 0;
      });
    },
    /* rendu complet d'une planète à l'écran ; q = qualité réduite */
    draw: function (ctx, p, sx, sy, R, t, prox, q) {
      drawBack(ctx, p, sx, sy, R, t, prox, q);
      drawBody(ctx, p, sx, sy, R, t);
      drawFront(ctx, p, sx, sy, R, t, prox, q);
    },
    drawBody: drawBody
  };
})();
