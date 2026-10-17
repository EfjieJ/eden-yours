/* Eden Yours — Le Ciel assemblé : jeu d'assemblage d'image, purement visuel.
   1) Un ciel de nuit (peint par code à chaque partie : lac, aurore, prairie, mer, ou photo de la Voie lactée) est découpé
      en pièces de casse-tête (9 faciles, ou 25 aux tenons irréguliers). On glisse les pièces (souris ou doigt) : près de
      leur place, elles s'aimantent.
   2) Le ciel entier, des étoiles s'allument en forme de nature (cœur, arbre, oiseau, fleur, lune) : on touche l'étoile
      qui brille, elles se relient une à une.
   3) À la dernière étoile, une chanson de la langue du site (tracks.json) joue en entier via EdenFullSong
      (une seule chanson à la fois ; jamais la même que les dernières). Aucun mot à lire, aucune énigme. */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  function t(k, v) { return window.EdenI18n && window.EdenI18n.t ? window.EdenI18n.t(k, v) : k; }
  function lang() { return window.EdenSongPick ? window.EdenSongPick.lang() : (document.documentElement.lang === "en" ? "en" : "fr"); }
  function reduced() { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } }
  var stage = $("ca-stage"), board = $("ca-board"), ghost = $("ca-ghost"), finalC = $("ca-final"), starsC = $("ca-stars"),
      tray = $("ca-tray"), piecesEl = $("ca-pieces"), tapEl = $("ca-tap"), sparkEl = $("ca-sparkles"), fill = $("ca-progress-fill"),
      player = $("ca-player"), nowEl = $("ca-now"), cover = $("ca-cover"), embedBox = $("ca-embed"), audio = $("ca-audio"),
      againBtn = $("ca-again"), live = $("ca-live"), card = $("ca-card");
  if (!stage) return;

  var IW = 1200, IH = 900;            // taille de l'image peinte (4:3)
  var LEVELS = { easy: { n: 3, irr: 0 }, hard: { n: 5, irr: 1 } };
  var levelId = "easy";
  try { var sv = localStorage.getItem("eden-ca-level"); if (LEVELS[sv]) levelId = sv; } catch (e) {}
  var tracks = [];
  var G = null;                       // partie en cours
  var mode = "idle";                  // idle | playing | stars | won

  /* ——— hasard reproductible ——— */
  function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }
  function readArr(k) { try { var a = JSON.parse(localStorage.getItem(k) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function pushArr(k, v, max) { var a = readArr(k).filter(function (x) { return x !== v; }); a.push(v); try { localStorage.setItem(k, JSON.stringify(a.slice(-max))); } catch (e) {} }
  function pickAvoid(list, key, keep) { var rec = readArr(key).slice(-keep); var p = list.filter(function (x) { return rec.indexOf(x) === -1; }); p = p.length ? p : list; return p[Math.floor(Math.random() * p.length)]; }

  /* ——— peinture du ciel ——— */
  var PALETTES = [
    { top: "#05061a", mid: "#1b1442", low: "#4a2b6b", hz: "#c8789a", neb: ["#b49cff", "#ff9ed2", "#7fd8ff"] },
    { top: "#020814", mid: "#0b2340", low: "#14476a", hz: "#5fc1c9", neb: ["#8fd3ff", "#b7a8ff", "#9ff5e0"] },
    { top: "#0a0618", mid: "#2a1240", low: "#6b2f5c", hz: "#f2a76b", neb: ["#ffc6a0", "#e8a8ff", "#ffe3a3"] },
    { top: "#030612", mid: "#151a3e", low: "#2d3c74", hz: "#9fa9ff", neb: ["#c9c3ff", "#9ad7ff", "#ffd1ec"] }
  ];
  function ridge(r, y0, amp, rough, W) {
    var n = 65, pts = [], i, k, step;
    for (i = 0; i < n; i++) pts.push(0);
    pts[0] = (r() - 0.5) * amp; pts[n - 1] = (r() - 0.5) * amp;
    for (step = 32, k = amp; step >= 1; step = step >> 1, k *= rough) for (i = step; i < n - 1; i += step * 2) pts[i] = (pts[i - step] + pts[i + step]) / 2 + (r() - 0.5) * k;
    for (i = 1; i < n - 1; i++) pts[i] = (pts[i - 1] + pts[i] * 2 + pts[i + 1]) / 4;
    return pts.map(function (v, j) { return [j / (n - 1) * W, y0 + v]; });
  }
  function fillRidge(c, pts, H, col) { c.beginPath(); c.moveTo(0, H); pts.forEach(function (p) { c.lineTo(p[0], p[1]); }); c.lineTo(pts[pts.length - 1][0], H); c.closePath(); c.fillStyle = col; c.fill(); }
  function glow(c, x, y, r, col, a) { var g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, hexA(col, a)); g.addColorStop(1, hexA(col, 0)); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill(); }
  function hexA(h, a) { var n = parseInt(h.slice(1), 16); return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")"; }
  function pine(c, x, base, h, col) { c.fillStyle = col; c.fillRect(x - h * 0.03, base - h * 0.15, h * 0.06, h * 0.16); for (var i = 0; i < 4; i++) { var y = base - h * 0.12 - i * h * 0.22, w = h * (0.34 - i * 0.07); c.beginPath(); c.moveTo(x - w, y); c.lineTo(x, y - h * 0.36); c.lineTo(x + w, y); c.closePath(); c.fill(); } }

  function paintSky(kind, seed) {
    var r = rng(seed), cv = document.createElement("canvas"); cv.width = IW; cv.height = IH;
    var c = cv.getContext("2d"), W = IW, H = IH, P = PALETTES[Math.floor(r() * PALETTES.length)];
    var hz = kind === "lac" || kind === "mer" ? 0.64 * H : 0.7 * H;
    var g = c.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, P.top); g.addColorStop(0.55, P.mid); g.addColorStop(0.85, P.low); g.addColorStop(1, P.hz);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // Voie lactée : bande de nébuleuses
    var ang = -0.35 - r() * 0.5, cx = W * (0.35 + r() * 0.3), cy = H * 0.35, bx = Math.cos(ang), by = Math.sin(ang);
    c.globalCompositeOperation = "lighter";
    for (var i = 0; i < 70; i++) { var s = (r() - 0.5) * 1.6 * W, off = (r() - 0.5) * 0.14 * H; glow(c, cx + bx * s - by * off, cy + by * s + bx * off, W * (0.04 + r() * 0.12), P.neb[i % 3], 0.035 + r() * 0.05); }
    c.globalCompositeOperation = "source-over";
    for (i = 0; i < 26; i++) { s = (r() - 0.5) * 1.4 * W; off = (r() - 0.5) * 0.05 * H; glow(c, cx + bx * s - by * off, cy + by * s + bx * off, W * (0.02 + r() * 0.05), P.top, 0.18); }
    // aurore
    if (kind === "aurore" || r() < 0.18) {
      c.globalCompositeOperation = "lighter";
      var ph = r() * 6, f1 = 0.004 + r() * 0.003, base = H * (0.22 + r() * 0.12), cols = kind === "aurore" ? ["#4dffb0", "#9b7bff"] : ["#7af0c8", "#c79bff"];
      for (var x = 0; x < W; x += 3) {
        var y = base + Math.sin(x * f1 + ph) * H * 0.07 + Math.sin(x * f1 * 2.7 + ph * 2) * H * 0.03, len = H * (0.16 + 0.12 * Math.abs(Math.sin(x * 0.011 + ph)));
        var ag = c.createLinearGradient(0, y - len, 0, y); ag.addColorStop(0, hexA(cols[1], 0)); ag.addColorStop(0.6, hexA(cols[1], 0.05)); ag.addColorStop(0.92, hexA(cols[0], 0.16)); ag.addColorStop(1, hexA(cols[0], 0));
        c.fillStyle = ag; c.fillRect(x, y - len, 3, len);
      }
      c.globalCompositeOperation = "source-over";
    }
    // étoiles
    for (i = 0; i < 1700; i++) {
      var sx, sy;
      if (r() < 0.55) { s = (r() - 0.5) * 1.6 * W; off = (r() + r() + r() - 1.5) * 0.1 * H; sx = cx + bx * s - by * off; sy = cy + by * s + bx * off; } else { sx = r() * W; sy = r() * hz; }
      if (sy > hz) continue;
      var a = (0.25 + r() * 0.75) * Math.min(1, (hz - sy) / (H * 0.12)), rad = 0.5 + Math.pow(r(), 4) * 1.6;
      c.fillStyle = r() < 0.15 ? "rgba(255,226,190," + a + ")" : r() < 0.3 ? "rgba(190,215,255," + a + ")" : "rgba(255,255,255," + a + ")";
      c.beginPath(); c.arc(sx, sy, rad, 0, 6.2832); c.fill();
    }
    for (i = 0; i < 22; i++) { sx = r() * W; sy = r() * hz * 0.85; glow(c, sx, sy, 6 + r() * 10, "#ffffff", 0.5); c.fillStyle = "rgba(255,255,255,0.95)"; c.beginPath(); c.arc(sx, sy, 1.6, 0, 6.2832); c.fill(); }
    // lueur d'horizon
    glow(c, W * (0.3 + r() * 0.4), hz, W * 0.55, P.hz, 0.32);
    // lune
    var moon = null, avoid = [];
    if (kind === "prairie" || kind === "mer" || r() < 0.3) {
      var mx = W * (0.12 + r() * 0.76), my = H * (0.12 + r() * 0.16), mr = W * 0.032; moon = [mx, my];
      avoid.push(mx / W); glow(c, mx, my, mr * 7, "#fff1d0", 0.22);
      c.save(); c.beginPath(); c.arc(mx, my, mr, 0, 6.2832); c.clip(); c.fillStyle = "#fff6e2"; c.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
      c.fillStyle = hexA(P.mid, 0.92); c.beginPath(); c.arc(mx + mr * 0.45, my - mr * 0.2, mr * 0.92, 0, 6.2832); c.fill(); c.restore();
    }
    // paysage
    if (kind === "aurore") {
      fillRidge(c, ridge(r, hz - H * 0.06, H * 0.22, 0.55, W), H, hexA(P.low, 1));
      var near = ridge(r, hz + H * 0.04, H * 0.16, 0.5, W); fillRidge(c, near, H, "#070a16");
      for (i = 0; i < 26; i++) { x = r() * W; pine(c, x, H - r() * H * 0.08, H * (0.08 + r() * 0.08), "#03050c"); }
    } else if (kind === "prairie") {
      fillRidge(c, ridge(r, hz, H * 0.08, 0.5, W), H, hexA(P.low, 0.95));
      var hill = []; for (x = 0; x <= W; x += 20) hill.push([x, hz + H * 0.1 + Math.sin(x / W * 3.1 + r()) * H * 0.04]); fillRidge(c, hill, H, "#0a0b18");
      var tx = W * (r() < 0.5 ? 0.2 + r() * 0.1 : 0.7 + r() * 0.1); avoid.push(tx / W); var tb = hz + H * 0.11, th = H * 0.36;
      c.fillStyle = "#06070f"; c.beginPath(); c.moveTo(tx - th * 0.05, tb + 10); c.quadraticCurveTo(tx - th * 0.02, tb - th * 0.3, tx - th * 0.12, tb - th * 0.55); c.lineTo(tx + th * 0.1, tb - th * 0.55); c.quadraticCurveTo(tx + th * 0.02, tb - th * 0.3, tx + th * 0.05, tb + 10); c.fill();
      for (i = 0; i < 60; i++) { var ca = r() * 6.2832, cd = Math.sqrt(r()); c.beginPath(); c.arc(tx + Math.cos(ca) * cd * th * 0.42, tb - th * 0.66 + Math.sin(ca) * cd * th * 0.26, th * (0.06 + r() * 0.08), 0, 6.2832); c.fill(); }
      c.globalCompositeOperation = "lighter";
      for (i = 0; i < 40; i++) glow(c, r() * W, hz + H * 0.08 + r() * H * 0.2, 4 + r() * 6, "#ffd88a", 0.5 + r() * 0.4);
      c.globalCompositeOperation = "source-over";
    } else if (kind === "lac" || kind === "mer") {
      // reflet du ciel dans l'eau
      c.save(); c.translate(0, hz * 2); c.scale(1, -1); c.globalAlpha = kind === "lac" ? 0.55 : 0.4; c.drawImage(cv, 0, 0, W, hz, 0, 0, W, hz); c.restore(); c.globalAlpha = 1;
      var wg = c.createLinearGradient(0, hz, 0, H); wg.addColorStop(0, "rgba(4,6,18,0.25)"); wg.addColorStop(1, "rgba(2,3,10,0.85)"); c.fillStyle = wg; c.fillRect(0, hz, W, H - hz);
      c.globalCompositeOperation = "lighter";
      for (i = 0; i < 180; i++) { y = hz + Math.pow(r(), 1.6) * (H - hz); var lw = (10 + r() * 50) * (0.4 + (y - hz) / (H - hz)), lx = moon && kind === "mer" && r() < 0.6 ? moon[0] + (r() - 0.5) * W * 0.12 * (0.3 + (y - hz) / (H - hz)) : r() * W; c.fillStyle = "rgba(255,240,220," + (0.04 + r() * 0.12) + ")"; c.fillRect(lx - lw / 2, y, lw, 1.5); }
      c.globalCompositeOperation = "source-over";
      if (kind === "lac") {
        var shore = ridge(r, hz - H * 0.02, H * 0.05, 0.5, W); c.fillStyle = "#04060e"; c.beginPath(); c.moveTo(0, hz + 4); shore.forEach(function (p) { c.lineTo(p[0], Math.min(p[1], hz)); }); c.lineTo(W, hz + 4); c.fill();
        for (i = 0; i < 40; i++) { x = r() * W; pine(c, x, hz + 3, H * (0.05 + r() * 0.06), "#03040b"); }
      } else {
        c.fillStyle = "#03040a"; c.beginPath(); var rx = r() < 0.5 ? 0 : W, sgn = rx ? -1 : 1; c.moveTo(rx, H); c.lineTo(rx, H * 0.78); c.quadraticCurveTo(rx + sgn * W * 0.12, H * 0.74, rx + sgn * W * 0.2, H * 0.86); c.lineTo(rx + sgn * W * 0.32, H); c.fill();
      }
    }
    // vignette
    var vg = c.createRadialGradient(W / 2, H * 0.45, H * 0.35, W / 2, H * 0.45, W * 0.75); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.45)"); c.fillStyle = vg; c.fillRect(0, 0, W, H);
    cv._avoid = avoid; return cv;
  }
  function loadPhoto(src) {
    return new Promise(function (res) {
      var im = new Image(); im.onload = function () {
        var cv = document.createElement("canvas"); cv.width = IW; cv.height = IH; var c = cv.getContext("2d");
        var s = Math.max(IW / im.width, IH / im.height), w = im.width * s, h = im.height * s; c.drawImage(im, (IW - w) / 2, (IH - h) / 2, w, h); res(cv);
      }; im.onerror = function () { res(null); }; im.src = src;
    });
  }

  /* ——— formes d'étoiles (nature / spirituel), points dans une boîte 0..1, dans l'ordre à toucher ——— */
  function heart(n) { var p = []; for (var i = 0; i < n; i++) { var a = Math.PI + i / n * 6.2832, x = 16 * Math.pow(Math.sin(a), 3), y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a); p.push([0.5 + x / 36, 0.47 - y / 36]); } return p; }
  function flower(n) { var p = []; for (var i = 0; i < n; i++) { var a = -Math.PI / 2 + i / n * 6.2832, r = 0.22 + 0.26 * Math.abs(Math.cos(a * 2.5 + Math.PI * 1.25)); p.push([0.5 + Math.cos(a) * r, 0.5 + Math.sin(a) * r]); } return p; }
  var SHAPES = {
    heart: { closed: true, pts: function (e) { return e ? [[0.5, 0.3], [0.64, 0.12], [0.84, 0.1], [0.97, 0.3], [0.88, 0.56], [0.5, 0.92], [0.12, 0.56], [0.03, 0.3], [0.16, 0.1], [0.36, 0.12]] : heart(14); } },
    tree: { closed: true, pts: function (e) { return e ? [[0.45, 1], [0.45, 0.82], [0.12, 0.82], [0.34, 0.56], [0.2, 0.56], [0.5, 0.04], [0.8, 0.56], [0.66, 0.56], [0.88, 0.82], [0.55, 0.82], [0.55, 1]] : [[0.45, 1], [0.45, 0.72], [0.15, 0.72], [0.05, 0.5], [0.2, 0.3], [0.35, 0.12], [0.5, 0.04], [0.65, 0.12], [0.8, 0.3], [0.95, 0.5], [0.85, 0.72], [0.55, 0.72], [0.55, 1]]; } },
    bird: { closed: false, pts: function (e) { return e ? [[0, 0.62], [0.2, 0.45], [0.36, 0.18], [0.5, 0.5], [0.64, 0.18], [0.8, 0.45], [1, 0.62]] : [[0, 0.62], [0.13, 0.52], [0.26, 0.32], [0.38, 0.15], [0.46, 0.38], [0.5, 0.52], [0.54, 0.38], [0.62, 0.15], [0.74, 0.32], [0.87, 0.52], [1, 0.62]]; } },
    flower: { closed: true, pts: function (e) { return flower(e ? 10 : 15); } },
    moon: { closed: true, pts: function (e) { var p = [], n = e ? 5 : 7, i, a; for (i = 0; i <= n; i++) { a = -Math.PI / 2 - i / n * Math.PI; p.push([0.55 + Math.cos(a) * 0.45, 0.5 + Math.sin(a) * 0.45]); } for (i = n - 1; i >= 1; i--) { a = -Math.PI / 2 - i / n * Math.PI; p.push([0.68 + Math.cos(a) * 0.3, 0.5 + Math.sin(a) * 0.36]); } return p; } }
  };

  /* ——— découpe des pièces (tenons) : chemin SVG commun au canvas et au clip-path (zone touchable = la pièce) ——— */
  function buildEdges(n, irr, r) {
    var h = [], v = [], i, j;
    function e() { return { k: r() < 0.5 ? 1 : -1, off: irr ? (r() - 0.5) * 0.22 : 0, sz: irr ? 0.16 + r() * 0.07 : 0.2 }; }
    for (i = 0; i < n - 1; i++) { h.push([]); for (j = 0; j < n; j++) h[i].push(e()); }   // h[r][c] : entre la rangée r et r+1
    for (i = 0; i < n; i++) { v.push([]); for (j = 0; j < n - 1; j++) v[i].push(e()); }   // v[r][c] : entre la colonne c et c+1
    return { h: h, v: v };
  }
  function edgePath(d, ax, ay, bx, by, s, off, sz) {
    if (!s) { d.push("L" + bx.toFixed(1) + " " + by.toFixed(1)); return; }
    var dx = bx - ax, dy = by - ay, L = Math.sqrt(dx * dx + dy * dy), nx = dy / L, ny = -dx / L;
    function P(u, w) { return (ax + dx * u + nx * w * L * s).toFixed(1) + " " + (ay + dy * u + ny * w * L * s).toFixed(1); }
    var c0 = 0.5 + off, w = sz, h = sz * 1.25;
    d.push("L" + P(c0 - w * 0.6, 0));
    d.push("C" + P(c0 - w * 0.25, 0) + " " + P(c0 - w * 1.05, h) + " " + P(c0, h));
    d.push("C" + P(c0 + w * 1.05, h) + " " + P(c0 + w * 0.25, 0) + " " + P(c0 + w * 0.6, 0));
    d.push("L" + bx.toFixed(1) + " " + by.toFixed(1));
  }
  function piecePath(p, E, n, cw, ch, pad) {
    var r = p.r, c = p.c, x0 = pad, y0 = pad, x1 = pad + cw, y1 = pad + ch, d = ["M" + x0 + " " + y0], e;
    e = r > 0 ? E.h[r - 1][c] : null; edgePath(d, x0, y0, x1, y0, e ? -e.k : 0, e ? e.off : 0, e ? e.sz : 0);
    e = c < n - 1 ? E.v[r][c] : null; edgePath(d, x1, y0, x1, y1, e ? e.k : 0, e ? e.off : 0, e ? e.sz : 0);
    e = r < n - 1 ? E.h[r][c] : null; edgePath(d, x1, y1, x0, y1, e ? e.k : 0, e ? -e.off : 0, e ? e.sz : 0);
    e = c > 0 ? E.v[r][c - 1] : null; edgePath(d, x0, y1, x0, y0, e ? -e.k : 0, e ? -e.off : 0, e ? e.sz : 0);
    return d.join(" ") + " Z";
  }

  /* ——— mise en page ——— */
  function geom() {
    var sw = stage.clientWidth || 340, n = G.n, phone = sw < 600;
    var W = Math.min(sw, phone ? sw : 600), H = Math.round(W * 0.75), bx = Math.round((sw - W) / 2), by = 0;
    var cw = W / n, ch = H / n, pad = Math.ceil(Math.max(cw, ch) * 0.3), scale = n === 3 ? (phone ? 0.62 : 0.58) : (phone ? 0.72 : 0.66);
    var slotW = Math.max((cw + pad * 1.15) * scale, 44), slotH = Math.max((ch + pad * 1.15) * scale, 40), cols = Math.max(1, Math.floor((sw - 8) / slotW)), rows = Math.ceil(n * n / cols);
    var trayTop = H + 14, trayH = rows * slotH + 16;
    return { sw: sw, W: W, H: H, bx: bx, by: by, cw: cw, ch: ch, pad: pad, scale: scale, slotW: slotW, slotH: slotH, cols: cols, trayTop: trayTop, trayH: trayH };
  }
  function sizeCanvas(cv, w, h) { var d = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(w * d); cv.height = Math.round(h * d); cv.style.width = w + "px"; cv.style.height = h + "px"; var c = cv.getContext("2d"); c.setTransform(d, 0, 0, d, 0, 0); return c; }
  function layout(reset) {
    var g = G.g = geom();
    board.style.left = g.bx + "px"; board.style.top = g.by + "px"; board.style.width = g.W + "px"; board.style.height = g.H + "px";
    tray.style.top = g.trayTop + "px"; tray.style.height = g.trayH + "px"; tray.hidden = mode !== "playing";
    stage.style.height = (mode === "playing" ? g.trayTop + g.trayH : g.H) + "px";
    var gc = sizeCanvas(ghost, g.W, g.H); gc.globalAlpha = G.level === "easy" ? 0.24 : 0.14; gc.drawImage(G.sky, 0, 0, g.W, g.H);
    gc.globalAlpha = 1; gc.strokeStyle = "rgba(255,230,180,0.18)"; gc.lineWidth = 1; gc.setLineDash([4, 5]);
    for (var i = 1; i < G.n; i++) { gc.beginPath(); gc.moveTo(i * g.cw, 0); gc.lineTo(i * g.cw, g.H); gc.moveTo(0, i * g.ch); gc.lineTo(g.W, i * g.ch); gc.stroke(); }
    var fc = sizeCanvas(finalC, g.W, g.H); fc.drawImage(G.sky, 0, 0, g.W, g.H);
    sizeCanvas(starsC, g.W, g.H);
    G.pieces.forEach(function (p, k) {
      var w = g.cw + g.pad * 2, h = g.ch + g.pad * 2, d = piecePath(p, G.E, G.n, g.cw, g.ch, g.pad), c = sizeCanvas(p.el, w, h);
      c.save(); c.clip(new Path2D(d)); var sx = IW / g.W, sy = IH / g.H;
      c.drawImage(G.sky, (p.c * g.cw - g.pad) * sx, (p.r * g.ch - g.pad) * sy, w * sx, h * sy, 0, 0, w, h); c.restore();
      c.strokeStyle = "rgba(255,236,200,0.55)"; c.lineWidth = 1.2; c.stroke(new Path2D(d));
      p.el.style.clipPath = "path('" + d + "')"; p.el.style.webkitClipPath = "path('" + d + "')";
      p.w = w; p.h = h;
      p.tx = g.bx + p.c * g.cw + g.cw / 2; p.ty = g.by + p.r * g.ch + g.ch / 2;
      if (p.locked) place(p, p.tx, p.ty, 1);
      else if (reset || p.fx == null) { var slot = G.order.indexOf(k), col = slot % g.cols, row = Math.floor(slot / g.cols), offX = (g.sw - g.cols * g.slotW) / 2;
        p.fx = (offX + (col + 0.5) * g.slotW + (Math.random() - 0.5) * g.slotW * 0.08) / g.sw; p.fy = ((row + 0.5) * g.slotH + (Math.random() - 0.5) * g.slotH * 0.08) / (g.trayH - 16); p.inTray = true; place(p, p.fx * g.sw, g.trayTop + 8 + p.fy * (g.trayH - 16), g.scale); }
      else if (p.inTray) place(p, p.fx * g.sw, g.trayTop + 8 + p.fy * (g.trayH - 16), g.scale);
      else place(p, Math.min(g.sw, p.fx * g.sw), p.fy * (g.trayTop + g.trayH), 1);
    });
    if (mode === "stars" || mode === "won") drawStars(performance.now());
  }
  function place(p, cx, cy, s) { p.cx = cx; p.cy = cy; p.s = s; p.el.style.left = (cx - p.w / 2) + "px"; p.el.style.top = (cy - p.h / 2) + "px"; p.el.style.transform = s === 1 ? "none" : "scale(" + s + ")"; }

  /* ——— glisser-déposer ——— */
  var drag = null, zTop = 10;
  function onDown(e) {
    if (mode !== "playing") return; var p = this._piece; if (!p || p.locked) return;
    e.preventDefault(); try { this.setPointerCapture(e.pointerId); } catch (x) {}
    var sr = stage.getBoundingClientRect(), px = e.clientX - sr.left, py = e.clientY - sr.top;
    drag = { p: p, id: e.pointerId, dx: p.cx - px, dy: p.cy - py }; p.el.style.zIndex = ++zTop; p.el.classList.add("is-drag");
    if (p.s !== 1) { drag.dx = (p.cx - px) / p.s; drag.dy = (p.cy - py) / p.s; } place(p, px + drag.dx, py + drag.dy, 1);
    if (window.EdenAutoplay && window.EdenAutoplay.unlock) try { window.EdenAutoplay.unlock(); } catch (x) {}
  }
  function onMove(e) { if (!drag || e.pointerId !== drag.id) return; e.preventDefault(); var sr = stage.getBoundingClientRect(), g = G.g; place(drag.p, Math.max(10, Math.min(g.sw - 10, e.clientX - sr.left + drag.dx)), Math.max(10, Math.min(g.trayTop + g.trayH - 10, e.clientY - sr.top + drag.dy)), 1); }
  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return; var p = drag.p, g = G.g; drag = null; p.el.classList.remove("is-drag");
    var tol = Math.max(18, Math.min(g.cw, g.ch) * 0.34);
    if (Math.abs(p.cx - p.tx) < tol && Math.abs(p.cy - p.ty) < tol) { lock(p); return; }
    if (p.cy > g.trayTop + 6) { p.inTray = true; p.fx = p.cx / g.sw; p.fy = (p.cy - g.trayTop - 8) / (g.trayH - 16); place(p, p.cx, p.cy, g.scale); }
    else { p.inTray = false; p.fx = p.cx / g.sw; p.fy = p.cy / (g.trayTop + g.trayH); }
  }
  function lock(p) {
    p.locked = true; p.inTray = false; p.el.classList.add("is-locked", "is-snap"); p.el.style.zIndex = 2; place(p, p.tx, p.ty, 1);
    setTimeout(function () { p.el.classList.remove("is-snap"); }, 600);
    chime(G.placed / (G.pieces.length - 1)); G.placed++; progress();
    if (G.placed === G.pieces.length) setTimeout(assembled, 450);
  }
  function progress() { if (fill) fill.style.width = (G ? Math.round(100 * G.placed / G.pieces.length) : 0) + "%"; }

  /* ——— petits sons (doux, sans chanson) ——— */
  var actx = null;
  function chime(f) {
    try { if (!actx) { var A = window.AudioContext || window.webkitAudioContext; if (!A) return; actx = new A(); } if (actx.state === "suspended") actx.resume();
      var notes = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66], fr = notes[Math.min(notes.length - 1, Math.floor((f || 0) * notes.length))];
      var o = actx.createOscillator(), gn = actx.createGain(), now = actx.currentTime; o.type = "sine"; o.frequency.value = fr; gn.gain.setValueAtTime(0.0001, now); gn.gain.exponentialRampToValueAtTime(0.09, now + 0.02); gn.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
      o.connect(gn); gn.connect(actx.destination); o.start(now); o.stop(now + 1);
    } catch (e) {}
  }

  /* ——— phase étoiles ——— */
  function assembled() {
    mode = "stars"; board.classList.add("is-whole"); piecesEl.classList.add("is-done"); tray.hidden = true;
    stage.style.height = G.g.H + "px"; G.lit = 0;
    var shapeId = pickAvoid(Object.keys(SHAPES), "eden-ca-shapes", 2); pushArr("eden-ca-shapes", shapeId, 4);
    var S = SHAPES[shapeId], pts = S.pts(G.level === "easy"), sz = 0.46, cy = 0.31, av = G.sky._avoid || [], cands = [0.27, 0.4, 0.5, 0.6, 0.73].sort(function () { return Math.random() - 0.5; }), cx = cands[0], best = -1;
    cands.forEach(function (x) { var d = av.reduce(function (m, a) { return Math.min(m, Math.abs(a - x)); }, 9); if (d > best + 0.04) { best = d; cx = x; } });
    G.shape = { id: shapeId, closed: S.closed, pts: pts.map(function (q) { return [cx + (q[0] - 0.5) * sz * 0.75, cy + (q[1] - 0.5) * sz]; }) };
    tapEl.hidden = false; say(t("ca.tapStar")); sparkle(16);
    if (!G.raf) G.raf = requestAnimationFrame(tick);
    try { var r = board.getBoundingClientRect(); if (r.top < 60 || r.bottom > window.innerHeight) board.scrollIntoView({ block: "center", behavior: reduced() ? "auto" : "smooth" }); } catch (e) {}
  }
  function tick(now) { if (!G || (mode !== "stars" && mode !== "won")) { if (G) G.raf = 0; return; } drawStars(now); G.raf = requestAnimationFrame(tick); }
  function drawStars(now) {
    var g = G.g, c = starsC.getContext("2d"), d = Math.min(2, window.devicePixelRatio || 1); c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, g.W, g.H);
    var P = G.shape.pts.map(function (q) { return [q[0] * g.W, q[1] * g.H]; }), lit = G.lit, n = P.length, i;
    var done = mode === "won", glowA = done ? 0.55 + 0.25 * Math.sin(now / 500) : 0.9;
    c.lineCap = "round"; c.lineJoin = "round";
    if (lit > 1 || done) {
      c.beginPath(); c.moveTo(P[0][0], P[0][1]); for (i = 1; i < (done ? n : lit); i++) c.lineTo(P[i][0], P[i][1]); if (done && G.shape.closed) c.closePath();
      c.strokeStyle = "rgba(255,214,140," + (glowA * 0.35) + ")"; c.lineWidth = 9; c.stroke();
      c.strokeStyle = "rgba(255,244,214," + glowA + ")"; c.lineWidth = 2.2; c.stroke();
      if (done && G.shape.closed) { c.fillStyle = "rgba(255,220,160," + (0.06 + 0.04 * Math.sin(now / 600)) + ")"; c.fill(); }
    }
    for (i = 0; i < n; i++) {
      var x = P[i][0], y = P[i][1], isNext = !done && i === lit, on = done || i < lit, pulse = isNext ? 1 + 0.35 * Math.sin(now / 220) : 1, rr = (on ? 4.2 : isNext ? 5.5 : 3) * pulse;
      var gr = c.createRadialGradient(x, y, 0, x, y, rr * (isNext ? 6 : 4)); gr.addColorStop(0, on ? "rgba(255,232,170,0.9)" : isNext ? "rgba(190,230,255,0.95)" : "rgba(220,225,255,0.45)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = gr; c.beginPath(); c.arc(x, y, rr * (isNext ? 6 : 4), 0, 6.2832); c.fill();
      c.fillStyle = on ? "#fff3d1" : "#ffffff"; c.beginPath(); c.arc(x, y, rr * 0.55, 0, 6.2832); c.fill();
      if (isNext) { c.strokeStyle = "rgba(200,235,255," + (0.5 + 0.4 * Math.sin(now / 220)) + ")"; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, 16 + 4 * Math.sin(now / 220), 0, 6.2832); c.stroke(); }
    }
  }
  function onStarTap(e) {
    if (mode !== "stars") return; var g = G.g, r = starsC.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    var q = G.shape.pts[G.lit], sx = q[0] * g.W, sy = q[1] * g.H, tol = Math.max(30, g.W * 0.07);
    if (Math.hypot(x - sx, y - sy) > tol) return;
    e.preventDefault(); G.lit++; chime(G.lit / G.shape.pts.length);
    if (G.lit >= G.shape.pts.length) win();
  }

  /* ——— victoire : la chanson ——— */
  function playable(tr) { return tr && tr.title && (tr.audio_url || tr.audio_url_aac || tr.embed_url); }
  function pickSong() {
    var l = lang(), list = (window.EdenSongPick ? window.EdenSongPick.forLang(tracks, l) : tracks.filter(function (x) { return x.lang === l; })).filter(playable);
    if (!list.length) return null;
    var recent = readArr("eden-ca-songs").slice(-Math.min(8, list.length - 1)), pool = list.filter(function (x) { return recent.indexOf(x.id) === -1; });
    pool = pool.length ? pool : list;
    var s = window.EdenSongPick ? window.EdenSongPick.pick(pool, { record: false }) : pool[Math.floor(Math.random() * pool.length)];
    if (s) pushArr("eden-ca-songs", s.id, 12);
    return s;
  }
  function win() {
    mode = "won"; tapEl.hidden = true; board.classList.add("is-won"); sparkle(40);
    var song = pickSong(); G.song = song;
    if (song) startSong(song);
    againBtn.hidden = false;
    say(song ? t("ca.playing", { title: song.title }) : "");
  }
  function stopSong() { if (window.EdenFullSong) window.EdenFullSong.stop(audio); else try { audio.pause(); } catch (e) {} if (embedBox) { embedBox.innerHTML = ""; embedBox.hidden = true; } player.hidden = true; }
  function startSong(song) {
    var F = window.EdenFullSong; player.hidden = false; nowEl.textContent = t("ca.playing", { title: song.title });
    if (song.cover_url && !(song.embed_url && !song.audio_url && !song.audio_url_aac)) { cover.src = song.cover_url; cover.hidden = false; } else cover.hidden = true;
    if (song.audio_url || song.audio_url_aac) {
      if (embedBox) { embedBox.innerHTML = ""; embedBox.hidden = true; } audio.hidden = false;
      if (F) F.play(audio, { id: song.id, audio: song.audio_url, aac: song.audio_url_aac });
      else { audio.src = song.audio_url; var p = audio.play(); if (p && p.catch) p.catch(function () {}); if (window.EdenSongPick) window.EdenSongPick.record(song.id); }
    } else if (song.embed_url) { audio.hidden = true; if (F) F.embed(embedBox, { id: song.id, embed: song.embed_url, title: song.title }); }
    try { setTimeout(function () { player.scrollIntoView({ block: "nearest", behavior: reduced() ? "auto" : "smooth" }); }, 300); } catch (e) {}
  }
  function sparkle(n) {
    if (!sparkEl || reduced()) return; sparkEl.innerHTML = ""; var h = G.g.H;
    for (var i = 0; i < n; i++) { var s = document.createElement("i"); s.style.setProperty("--x", (Math.random() * 100).toFixed(1) + "%"); s.style.setProperty("--y", (Math.random() * h).toFixed(0) + "px"); s.style.setProperty("--d", (Math.random() * 1.2).toFixed(2) + "s"); s.style.setProperty("--s", (3 + Math.random() * 5).toFixed(1) + "px"); sparkEl.appendChild(s); }
    setTimeout(function () { if (sparkEl) sparkEl.innerHTML = ""; }, 3600);
  }
  function say(s) { if (live) { live.textContent = ""; setTimeout(function () { live.textContent = s; }, 30); } }

  /* ——— partie ——— */
  var KINDS = ["lac", "aurore", "prairie", "mer"];
  function newGame() {
    var kind = pickAvoid(KINDS, "eden-ca-skies", 2); pushArr("eden-ca-skies", kind, 4);
    var seed = (Math.random() * 1e9) | 0, lv = LEVELS[levelId];
    var skyP = kind === "photo" ? loadPhoto("assets/home/hero-milkyway-airglow.webp") : Promise.resolve(null);
    return skyP.then(function (photo) {
      var sky = photo || paintSky(kind === "photo" ? "lac" : kind, seed);
      if (G && G.raf) cancelAnimationFrame(G.raf);
      stopSong(); againBtn.hidden = true; tapEl.hidden = true; board.classList.remove("is-whole", "is-won"); piecesEl.classList.remove("is-done");
      var c0 = starsC.getContext("2d"); c0.clearRect(0, 0, starsC.width, starsC.height);
      piecesEl.innerHTML = ""; mode = "playing";
      G = { kind: kind, level: levelId, n: lv.n, sky: sky, E: buildEdges(lv.n, lv.irr, rng(seed + 7)), pieces: [], placed: 0, order: [] };
      for (var r = 0; r < lv.n; r++) for (var c = 0; c < lv.n; c++) {
        var el = document.createElement("canvas"); el.className = "ca-piece"; el.setAttribute("aria-hidden", "true"); el.style.setProperty("--i", r * lv.n + c);
        var p = { r: r, c: c, el: el, locked: false, fx: null, fy: null }; el._piece = p;
        el.addEventListener("pointerdown", onDown); el.addEventListener("pointermove", onMove); el.addEventListener("pointerup", onUp); el.addEventListener("pointercancel", onUp);
        piecesEl.appendChild(el); G.pieces.push(p);
      }
      G.order = G.pieces.map(function (_, i) { return i; }); for (var i = G.order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), tmp = G.order[i]; G.order[i] = G.order[j]; G.order[j] = tmp; }
      layout(true); progress();
    });
  }
  function help() {
    if (mode !== "playing") return; var left = G.pieces.filter(function (p) { return !p.locked; }); if (!left.length) return;
    var p = left[0]; p.el.style.zIndex = ++zTop; p.el.style.transition = "left 0.5s ease, top 0.5s ease, transform 0.5s ease"; lock(p);
    setTimeout(function () { p.el.style.transition = ""; }, 600);
  }
  var peekT = 0;
  function peek() { if (mode !== "playing") return; board.classList.add("is-peek"); clearTimeout(peekT); peekT = setTimeout(function () { board.classList.remove("is-peek"); }, 1600); }
  function setLevel(id) {
    if (!LEVELS[id]) return; levelId = id; try { localStorage.setItem("eden-ca-level", id); } catch (e) {}
    [].forEach.call(document.querySelectorAll(".ca-level"), function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-level") === id ? "true" : "false"); });
    newGame();
  }

  function bind() {
    [].forEach.call(document.querySelectorAll(".ca-level"), function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-level") === levelId ? "true" : "false"); b.addEventListener("click", function () { setLevel(b.getAttribute("data-level")); }); });
    $("ca-help").addEventListener("click", help); $("ca-peek").addEventListener("click", peek); $("ca-new").addEventListener("click", newGame); againBtn.addEventListener("click", newGame);
    starsC.addEventListener("pointerdown", onStarTap);
    var rt = 0; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { if (G && G.g && Math.abs((stage.clientWidth || 0) - G.g.sw) > 2) layout(false); }, 150); });
    if (window.EdenI18n && window.EdenI18n.onChange) window.EdenI18n.onChange(function () { if (mode === "won") { stopSong(); againBtn.hidden = false; } });
    var toggle = $("nav-toggle"), links = $("nav-links");
    if (toggle && links) toggle.addEventListener("click", function () { var open = links.classList.toggle("is-open"); toggle.setAttribute("aria-expanded", open ? "true" : "false"); });
    newGame();
  }
  window.EdenCiel = {
    state: function () { return G ? { mode: mode, kind: G.kind, level: G.level, total: G.pieces.length, placed: G.placed, shape: G.shape && G.shape.id, lit: G.lit || 0, stars: G.shape ? G.shape.pts.length : 0, song: G.song ? { id: G.song.id, title: G.song.title, lang: G.song.lang } : null,
      pieces: G.pieces.map(function (p) { return { cx: p.cx, cy: p.cy, tx: p.tx, ty: p.ty, s: p.s, locked: p.locked }; }), starPts: G.shape ? G.shape.pts.map(function (q) { return [q[0] * G.g.W, q[1] * G.g.H]; }) : [] } : { mode: mode }; }
  };
  fetch("tracks.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (d) { tracks = d.tracks || d || []; }).catch(function () {})
    .then(function () { if (window.EdenSongPick && window.EdenSongPick.ready) return window.EdenSongPick.ready; }).then(bind, bind);
})();
