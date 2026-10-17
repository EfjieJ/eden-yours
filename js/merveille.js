/* Eden Yours — « Merveilles » : images d'émerveillement partagées par les jeux d'assemblage + scène qui se construit et s'éveille.
   EdenMerveille.ready            → Promise (data/merveilles.json chargé)
   EdenMerveille.pick({night})    → une image jamais vue récemment (localStorage, commun aux 3 jeux), ou null
   EdenMerveille.url(item, "sq")  → assets/merveilles/(sq/)id.webp
   EdenMerveille.life(item, crop) → { canvas, size(w,h), wake(x0,y0,x1,y1), wakeAll(), bloom(), stop() }
     Un calque canvas (sans pointeur) : chaque pièce posée fait éclore une gerbe de lumière ET éveille les éléments
     qu'elle couvre (l'arbre s'illumine, la cascade se met à couler, l'eau miroite, l'être de lumière respire, les étoiles
     s'allument…). bloom() = révélation finale : flash doux, tout s'éveille, reflet qui passe, pluie d'étincelles. */
(function () {
  "use strict";
  if (window.EdenMerveille) return;
  var data = null, KEY = "eden-merveille-recent";
  var ready = fetch("data/merveilles.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (d) { data = d; if (d.recentKey) KEY = d.recentKey; return d; }).catch(function () { return null; });
  function reduced() { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } }
  function recent() { try { var a = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function record(id) { var a = recent().filter(function (x) { return x !== id; }); a.push(id); try { localStorage.setItem(KEY, JSON.stringify(a.slice(-12))); } catch (e) {} }
  function pick(opts) {
    opts = opts || {}; if (!data || !data.items || !data.items.length) return null;
    var list = data.items.filter(function (it) { return !opts.night || it.night; }); if (!list.length) return null;
    var rec = recent(), keep = Math.min(rec.length, Math.max(0, list.length - 2)), avoid = rec.slice(-keep);
    var pool = list.filter(function (it) { return avoid.indexOf(it.id) === -1; });
    if (!pool.length) pool = list;
    var it = pool[Math.floor(Math.random() * pool.length)]; record(it.id); return it;
  }
  function url(it, crop) { return "assets/merveilles/" + (crop === "sq" ? "sq/" : crop === "sm" ? "sm/" : "") + it.id + ".webp"; }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function life(item, crop) {
    var cv = document.createElement("canvas"); cv.className = "mv-life"; cv.setAttribute("aria-hidden", "true");
    var ctx = cv.getContext("2d"), W = 300, H = 225, dpr = Math.min(2, window.devicePixelRatio || 1), still = reduced();
    function sx(x) { return crop === "sq" ? (x - 0.125) / 0.75 : x; }
    var spots = ((item && item.spots) || []).map(function (s) { return { t: s.t, x: sx(s.x), y: s.y, r: s.r, on: 0, ph: Math.random() * 6.28, parts: [] }; });
    var fx = (item && item.fx) || [], ambient = [], bursts = [], awake = 0, total = 1, finale = 0, run = true, raf = 0, t0 = performance.now();
    function size(w, h) { W = w; H = h; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + "px"; cv.style.height = h + "px"; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); if (still) draw(performance.now()); }
    function burst(x, y, big) {
      var n = still ? 0 : big ? 40 : 16;
      for (var i = 0; i < n; i++) { var a = Math.random() * 6.283, v = rnd(30, big ? 160 : 90); bursts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0, max: rnd(0.9, 1.6), r: rnd(1.2, 3), hue: Math.random() < 0.3 ? "255,200,240" : "255,236,170" }); }
      bursts.push({ ring: true, x: x, y: y, life: 0, max: 1.1, r: 4 });
    }
    function wake(x0, y0, x1, y1) {
      var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; awake++;
      burst(cx * W, cy * H, false);
      spots.forEach(function (s) { if (!s.on && s.x >= x0 && s.x <= x1 && s.y >= y0 && s.y <= y1) { s.on = performance.now(); burst(s.x * W, s.y * H, false); } });
      ensure();
    }
    function wakeAll() { var now = performance.now(); spots.forEach(function (s) { if (!s.on) s.on = now; }); awake = total = 1; ensure(); }
    function bloom() { wakeAll(); finale = performance.now(); burst(W / 2, H / 2, true); for (var i = 0; i < 4; i++) burst(rnd(0.15, 0.85) * W, rnd(0.15, 0.85) * H, false); ensure(); if (still) draw(performance.now()); }
    function setTotal(n) { total = Math.max(1, n); }
    function glow(x, y, r, col, a) { if (r <= 0 || a <= 0) return; var g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, "rgba(" + col + "," + a.toFixed(3) + ")"); g.addColorStop(1, "rgba(" + col + ",0)"); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
    function drawSpot(s, tt, now) {
      var k = Math.min(1, (now - s.on) / 1400), e = 1 - Math.pow(1 - k, 3), x = s.x * W, y = s.y * H, R = s.r * W, p = still ? 0.5 : 0.5 + 0.5 * Math.sin(tt * 1.4 + s.ph), i;
      if (k < 1) glow(x, y, R * (0.6 + 1.4 * e), "255,240,200", 0.5 * (1 - k));            // éclosion
      switch (s.t) {
        case "tree":
          glow(x, y, R * 1.1 * e, "255,226,150", 0.18 + 0.1 * p);
          if (!still && Math.random() < 0.25) s.parts.push({ x: x + rnd(-R, R) * 0.8, y: y + rnd(-R, R) * 0.6, vy: rnd(-18, -8), life: 0, max: rnd(1.5, 3) });
          break;
        case "sun": glow(x, y, R * 2.2 * e, "255,230,170", 0.22 + 0.12 * p); break;
        case "glow": glow(x, y, R * 1.3 * e, "255,240,210", 0.14 + 0.1 * p); break;
        case "being":
          glow(x, y, R * (1.3 + 0.25 * p) * e, "255,244,214", 0.22 + 0.16 * p);
          if (!still) { var oa = tt * 1.2 + s.ph; glow(x + Math.cos(oa) * R * 0.9, y + Math.sin(oa) * R * 0.6, 5, "255,255,240", 0.8); }
          break;
        case "bloom": glow(x, y, R * (1 + 0.15 * p) * e, "255,190,230", 0.16 + 0.1 * p);
          if (!still && Math.random() < 0.12) s.parts.push({ x: x + rnd(-R, R) * 0.7, y: y + rnd(-R, R) * 0.4, vy: rnd(-14, -6), life: 0, max: rnd(1.2, 2.4), pink: true });
          break;
        case "falls":                                                          // la cascade coule
          ctx.save(); ctx.beginPath(); ctx.rect(x - R * 0.6, y - R * 2.2, R * 1.2, R * 4.4); ctx.clip();
          for (i = 0; i < 9; i++) { var lx = x - R * 0.5 + (i / 8) * R, off = ((tt * (60 + i * 7) + i * 37) % (R * 4.4 + 40)) - 20, ly = y - R * 2.2 + (still ? i * R * 0.4 : off);
            var lg = ctx.createLinearGradient(0, ly - 30, 0, ly + 30); lg.addColorStop(0, "rgba(255,255,255,0)"); lg.addColorStop(0.5, "rgba(240,250,255," + (0.5 * e).toFixed(2) + ")"); lg.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = lg; ctx.fillRect(lx - 1.2, ly - 30, 2.4, 60); }
          ctx.restore(); glow(x, y + R * 2, R * 1.2 * e, "220,240,255", 0.2 + 0.1 * p); break;
        case "water":                                                          // l'eau miroite
          if (!s.lines) { s.lines = []; for (i = 0; i < 26; i++) s.lines.push({ dx: rnd(-1, 1), dy: rnd(-0.35, 0.35), w: rnd(8, 30), ph: Math.random() * 6.28, sp: rnd(0.7, 1.8) }); }
          s.lines.forEach(function (l) { var a = (still ? 0.35 : 0.55 * Math.max(0, Math.sin(tt * l.sp + l.ph))) * e; if (a < 0.03) return; var lx = x + l.dx * R + (still ? 0 : Math.sin(tt * 0.4 + l.ph) * 6), ly = y + l.dy * R; ctx.strokeStyle = "rgba(255,248,230," + a.toFixed(2) + ")"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(lx - l.w / 2, ly); ctx.lineTo(lx + l.w / 2, ly); ctx.stroke(); });
          break;
        case "rays":                                                           // rayons qui respirent
          ctx.save(); ctx.translate(x, y);
          for (i = 0; i < 6; i++) { var ang = Math.PI / 2 + (i - 2.5) * 0.18 + (still ? 0 : Math.sin(tt * 0.3 + i) * 0.04), len = R * 3; ctx.rotate(0); var gx = Math.cos(ang) * len, gy = Math.sin(ang) * len;
            var rg = ctx.createLinearGradient(0, 0, gx, gy); rg.addColorStop(0, "rgba(255,245,215," + ((0.12 + 0.06 * Math.sin(tt + i)) * e).toFixed(3) + ")"); rg.addColorStop(1, "rgba(255,245,215,0)");
            ctx.strokeStyle = rg; ctx.lineWidth = R * 0.18; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(gx, gy); ctx.stroke(); }
          ctx.restore(); break;
        case "stars": case "aurora":
          if (!s.st) { s.st = []; for (i = 0; i < 22; i++) s.st.push({ dx: rnd(-1, 1), dy: rnd(-0.5, 0.5), ph: Math.random() * 6.28, sp: rnd(1, 3), r: rnd(0.8, 2) }); }
          s.st.forEach(function (q) { var a = (still ? 0.7 : 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(tt * q.sp + q.ph))) * e; glow(x + q.dx * R, y + q.dy * R, q.r * 4, "255,252,240", a * 0.7); });
          if (s.t === "aurora") glow(x, y, R * e, "150,255,210", 0.08 + 0.06 * p);
          break;
      }
      for (i = s.parts.length - 1; i >= 0; i--) { var q = s.parts[i]; q.life += 0.016; q.y += q.vy * 0.016; if (q.life > q.max) { s.parts.splice(i, 1); continue; } glow(q.x, q.y, 4, q.pink ? "255,200,235" : "255,232,160", 0.8 * Math.sin(Math.PI * q.life / q.max)); }
    }
    function draw(now) {
      var tt = (now - t0) / 1000; ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = "lighter";
      spots.forEach(function (s) { if (s.on) drawSpot(s, tt, now); });
      // ambiance : s'installe à mesure que la scène se construit
      var amb = Math.min(1, awake / total);
      fx.forEach(function (f) {
        var want = Math.round((f === "snow" ? 50 : 26) * amb * (window.innerWidth < 560 ? 0.6 : 1));
        while (ambient.length < want) ambient.push({ f: f, x: Math.random() * W, y: f === "snow" ? -5 : Math.random() * H, v: rnd(8, 26), ph: Math.random() * 6.28, r: rnd(1, 2.6) });
      });
      ambient.forEach(function (m) {
        if (!still) { if (m.f === "snow") { m.y += m.v * 0.016; m.x += Math.sin(tt + m.ph) * 0.3; if (m.y > H + 5) { m.y = -5; m.x = Math.random() * W; } } else { m.y -= m.v * 0.016 * (m.f === "bubbles" ? 1.6 : 0.6); m.x += Math.sin(tt * 0.8 + m.ph) * 0.25; if (m.y < -6) { m.y = H + 6; m.x = Math.random() * W; } } }
        var a = m.f === "snow" ? 0.75 : 0.55 + 0.4 * Math.sin(tt * 2 + m.ph);
        glow(m.x, m.y, m.r * 3, m.f === "snow" ? "255,255,255" : m.f === "bubbles" ? "200,240,255" : "255,226,140", a);
      });
      for (var i = bursts.length - 1; i >= 0; i--) {
        var b = bursts[i]; b.life += 0.016; if (b.life > b.max) { bursts.splice(i, 1); continue; } var f = 1 - b.life / b.max;
        if (b.ring) { ctx.strokeStyle = "rgba(255,240,200," + (0.7 * f).toFixed(2) + ")"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, 6 + (1 - f) * 70, 0, 6.283); ctx.stroke(); continue; }
        b.x += b.vx * 0.016; b.y += b.vy * 0.016; b.vy += 20 * 0.016; b.vx *= 0.985; glow(b.x, b.y, b.r * 3, b.hue, f);
      }
      if (finale) {                                                            // révélation : flash doux puis reflet qui passe
        var ft = (now - finale) / 1000;
        if (ft < 2.2) { var fa = ft < 0.5 ? ft / 0.5 : Math.max(0, 1 - (ft - 0.5) / 1.7); glow(W / 2, H / 2, Math.max(W, H) * 0.9, "255,246,225", 0.75 * fa); }
        if (!still) { var cyc = (ft % 7) / 7, sxp = -W * 0.4 + cyc * W * 1.8; ctx.save(); ctx.translate(sxp, 0); ctx.rotate(0.35); var sg = ctx.createLinearGradient(-60, 0, 60, 0); sg.addColorStop(0, "rgba(255,255,255,0)"); sg.addColorStop(0.5, "rgba(255,250,235,0.16)"); sg.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = sg; ctx.fillRect(-60, -H, 120, H * 3); ctx.restore();
          if (Math.random() < 0.5) bursts.push({ x: Math.random() * W, y: Math.random() * H * 0.9, vx: rnd(-6, 6), vy: rnd(-20, -6), life: 0, max: rnd(0.8, 1.8), r: rnd(1, 2.2), hue: "255,248,225" }); }
      }
      ctx.globalCompositeOperation = "source-over";
    }
    function loop(now) { raf = 0; if (!run) return; if (!document.hidden) draw(now); raf = requestAnimationFrame(loop); }
    function ensure() { if (!still && run && !raf) raf = requestAnimationFrame(loop); }
    function stop() { run = false; if (raf) cancelAnimationFrame(raf); raf = 0; if (cv.parentNode) cv.parentNode.removeChild(cv); }
    return { canvas: cv, size: size, wake: wake, wakeAll: wakeAll, bloom: bloom, stop: stop, setTotal: setTotal, state: function () { return { awake: awake, spotsOn: spots.filter(function (s) { return s.on; }).length, spots: spots.length, finale: !!finale }; } };
  }
  window.EdenMerveille = { ready: ready, pick: pick, url: url, life: life, recent: recent, items: function () { return data ? data.items : []; } };
})();
