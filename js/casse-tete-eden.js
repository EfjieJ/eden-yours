/* Eden Yours — Construis ton Éden (puzzle jigsaw).
   On assemble un tableau d'Éden (4 tableaux générés par code, voir tools/gen-eden-scenes.py) : pièces à tenons découpées par clip-path (2D, aucune 3D), glisser (pointer events, souris ET tactile,
   aimantation), toucher une pièce puis sa place, ou clavier. À la fin, l'image DEVIENT ANIMÉE : le tableau est composé de couches séparées (ciel, nuages, lointain, milieu, être de lumière, avant-plan)
   qui dérivent à des vitesses différentes (parallaxe au pointeur), plus un calque canvas (étoiles qui scintillent, lucioles dorées, éclat de l'eau, halo des êtres de lumière). prefers-reduced-motion : lueur douce fixe.
   Puis son de victoire + étoiles + bulles dorées et une chanson joue EN ENTIER (celle du thème du tableau si la langue de la page en a, sinon une chanson de la langue de la page). */
(function () {
  "use strict";
  var GAME_ID = "eden-puzzle";
  var $ = function (id) { return document.getElementById(id); };
  var wrap = $("ep-stagewrap"), stage = $("ep-stage"), frame = $("ep-frame"), ghost = $("ep-ghost"), slotsEl = $("ep-slots"), tableEl = $("ep-table"), piecesEl = $("ep-pieces"), sceneEl = $("ep-scene"),
    overlay = $("ep-overlay"), startBtn = $("ep-start"), againBtn = $("ep-again"), statusEl = $("ep-status"), scoreEl = $("ep-score"), hintEl = $("ep-hint"), liveEl = $("ep-live"), starsBox = $("ep-stars"),
    playerBox = $("ep-player"), nowEl = $("ep-now-playing"), embedBox = $("ep-embed"), audio = $("ep-audio"), listenBtn = $("ep-listen"), actions = $("ep-actions"), helpBtn = $("ep-help"),
    peekBtn = $("ep-peek"), newBtn = $("ep-new"), emptyBox = $("ep-empty"), card = $("ep-card"), celebrate = $("ep-celebrate"), levelsEl = $("ep-levels"), capEl = $("ep-caption");

  var cfg = null, cats = null, tracks = [], loadFailed = false;
  var mode = "idle", levelId = null, R = null, AC = null, ownStarted = false, zTop = 10, dragging = null, selected = null, fx = null, hintT = 0, peekT = 0, startedAt = 0;

  function t(key, vars) { return window.EdenI18n && window.EdenI18n.t ? window.EdenI18n.t(key, vars) : key; }
  function siteLang() { return window.EdenSongPick ? window.EdenSongPick.lang() : (document.documentElement.lang === "en" ? "en" : "fr"); }
  function reduced() { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } }
  function say(m) { if (liveEl) { liveEl.textContent = ""; setTimeout(function () { liveEl.textContent = m; }, 30); } }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function loc(o) { return (o && (o[siteLang()] || o.fr)) || ""; }

  /* ——— sons ——— */
  function ctxAudio() {
    try { if (!AC) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AC = new C(); }
      if (AC.state === "suspended" && AC.resume) (function (r) { if (r && r.catch) r.catch(function () {}); })(AC.resume()); return AC; } catch (e) { return null; }
  }
  function tone(freqs, type, gain, step, dur) {
    try {
      var c = ctxAudio(); if (!c) return; var now = c.currentTime + 0.01;
      freqs.forEach(function (f, i) {
        var o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f; var t0 = now + i * step;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.05);
      });
    } catch (e) {}
  }
  function snapChime() { tone([659.25, 880], "sine", 0.07, 0.06, 0.4); }
  function tick() { tone([392], "triangle", 0.03, 0, 0.1); }

  /* ——— données ——— */
  function getJSON(url) { return fetch(url, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); }); }
  function load() {
    return Promise.all([getJSON("data/eden-puzzles.json"), getJSON("data/categories.json"), getJSON("tracks.json")]).then(function (r) { cfg = r[0]; cats = r[1]; tracks = r[2].tracks || r[2] || []; })
      .catch(function () { loadFailed = true; });
  }
  function levels() { return (cfg && cfg.levels) || []; }
  function level() { var L = levels(); for (var i = 0; i < L.length; i++) if (L[i].id === levelId) return L[i]; return L[0]; }
  function readRecent(l) { try { var o = JSON.parse(localStorage.getItem(cfg.recentStorageKey) || "{}"); return Array.isArray(o[l]) ? o[l] : []; } catch (e) { return []; } }
  function writeRecent(l, id) { try { var o = JSON.parse(localStorage.getItem(cfg.recentStorageKey) || "{}"); var a = (o[l] || []).filter(function (x) { return x !== id; }); a.push(id); o[l] = a.slice(-3); localStorage.setItem(cfg.recentStorageKey, JSON.stringify(o)); } catch (e) {} }
  function pickScene() {
    var l = siteLang(), rec = readRecent(l), all = cfg.scenes, last = rec.slice(-Math.min(2, all.length - 1));
    var pool = all.filter(function (s) { return last.indexOf(s.id) < 0; }); if (!pool.length) pool = all;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function abs(u) { try { return new URL(u, document.baseURI).href; } catch (e) { return u; } }
  function loadImg(url) { return new Promise(function (res) { var im = new Image(); im.decoding = "async"; im.onload = function () { res(im); }; im.onerror = function () { res(null); }; im.src = abs(url); }); }

  /* ——— pièces à tenons ——— */
  function edge(x0, y0, x1, y1, s) {
    if (!s) return "L" + x1.toFixed(1) + " " + y1.toFixed(1);
    var dx = x1 - x0, dy = y1 - y0, L = Math.sqrt(dx * dx + dy * dy), nx = dy / L, ny = -dx / L;
    function P(u, v) { return (x0 + dx * u + nx * L * v * s).toFixed(1) + " " + (y0 + dy * u + ny * L * v * s).toFixed(1); }
    return "L" + P(0.36, 0) + "C" + P(0.42, 0) + " " + P(0.43, 0.05) + " " + P(0.41, 0.09) + "C" + P(0.36, 0.16) + " " + P(0.40, 0.25) + " " + P(0.50, 0.25) +
      "C" + P(0.60, 0.25) + " " + P(0.64, 0.16) + " " + P(0.59, 0.09) + "C" + P(0.57, 0.05) + " " + P(0.58, 0) + " " + P(0.64, 0) + "L" + x1.toFixed(1) + " " + y1.toFixed(1);
  }
  function piecePath(p, g) {
    var x0 = g.pad, y0 = g.pad, x1 = g.pad + g.cw, y1 = g.pad + g.ch, r = p.r, c = p.c, T = R.tabs;
    var sT = r > 0 ? -T.h[r - 1][c] : 0, sB = r < R.rows - 1 ? T.h[r][c] : 0, sL = c > 0 ? -T.v[r][c - 1] : 0, sR = c < R.cols - 1 ? T.v[r][c] : 0;
    return "M" + x0 + " " + y0 + edge(x0, y0, x1, y0, sT) + edge(x1, y0, x1, y1, sR) + edge(x1, y1, x0, y1, sB) + edge(x0, y1, x0, y0, sL) + "Z";
  }
  var CLIP = false; try { CLIP = !!(window.CSS && CSS.supports && CSS.supports("clip-path", 'path("M0 0L1 0L1 1Z")')); } catch (e) {}
  function geom() {
    var W = stage.clientWidth || 300, H = Math.round(W * 0.75), cw = W / R.cols, ch = H / R.rows, pad = Math.round(Math.max(cw, ch) * 0.27);
    var tc = Math.max(1, Math.floor(W / (cw * 0.9))), trows = Math.ceil(R.pieces.length / tc), gap = 14, tableH = Math.round(trows * ch * 0.98 + pad + 14);
    return { W: W, H: H, cw: cw, ch: ch, pad: pad, tc: tc, trows: trows, gap: gap, tableH: tableH, tableTop: H + gap };
  }
  function styleFor(p, g) {
    var el = p.el, face = p.face;
    el.style.width = (g.cw + 2 * g.pad) + "px"; el.style.height = (g.ch + 2 * g.pad) + "px";
    var x = p.locked ? p.c * g.cw : p.fx * g.W, y = p.locked ? p.r * g.ch : p.fy * g.W;
    el.style.left = (x - g.pad).toFixed(1) + "px"; el.style.top = (y - g.pad).toFixed(1) + "px";
    face.style.backgroundSize = g.W + "px " + g.H + "px"; face.style.backgroundPosition = (-(p.c * g.cw - g.pad)).toFixed(1) + "px " + (-(p.r * g.ch - g.pad)).toFixed(1) + "px";
    if (CLIP) face.style.clipPath = 'path("' + piecePath(p, g) + '")';
  }
  function layout(initial) {
    if (!R) return;
    var g = R.g = geom();
    stage.style.height = ((mode === "won" ? g.H : g.H + g.gap + g.tableH)) + "px";
    frame.style.width = g.W + "px"; frame.style.height = g.H + "px";
    tableEl.style.top = g.tableTop + "px"; tableEl.style.height = g.tableH + "px";
    sceneEl.style.width = g.W + "px"; sceneEl.style.height = g.H + "px";
    slotsEl.style.gridTemplateColumns = "repeat(" + R.cols + ", 1fr)"; slotsEl.style.gridTemplateRows = "repeat(" + R.rows + ", 1fr)";
    if (initial) {                                                           // pièces dispersées dans la table (grille décalée au hasard)
      var order = shuffle(R.pieces.slice());
      order.forEach(function (p, k) {
        var col = k % g.tc, row = Math.floor(k / g.tc), slotW = g.W / g.tc;
        var x = col * slotW + (slotW - g.cw) / 2 + rnd(-g.cw * 0.06, g.cw * 0.06), y = g.tableTop + 8 + row * g.ch * 0.98 + rnd(-g.ch * 0.03, g.ch * 0.03);
        p.fx = x / g.W; p.fy = y / g.W;
      });
    }
    R.pieces.forEach(function (p) { styleFor(p, g); });
  }
  function build(scene, lv, img) {
    var cols = lv.cols, rows = lv.rows, h = [], v = [];
    for (var r = 0; r < rows; r++) { h.push([]); v.push([]); for (var c = 0; c < cols; c++) { h[r].push(Math.random() < 0.5 ? 1 : -1); v[r].push(Math.random() < 0.5 ? 1 : -1); } }
    R = { scene: scene, level: lv.id, cols: cols, rows: rows, tabs: { h: h, v: v }, pieces: [], placed: 0, misses: 0, hints: 0, moves: 0, img: img, layers: null, g: null };
    piecesEl.innerHTML = ""; slotsEl.innerHTML = "";
    var url = img ? img.src : null;
    for (var rr = 0; rr < rows; rr++) for (var cc = 0; cc < cols; cc++) {
      var p = { r: rr, c: cc, i: rr * cols + cc, locked: false, fx: 0, fy: 0 };
      var el = document.createElement("button"); el.type = "button"; el.className = "ep-piece"; el.setAttribute("data-i", String(p.i));
      el.setAttribute("aria-label", t("ep.pieceAria", { n: p.i + 1, total: rows * cols }));
      var face = document.createElement("span"); face.className = "ep-face"; if (url) face.style.backgroundImage = 'url("' + url + '")'; else face.classList.add("ep-nofile");
      el.appendChild(face); p.el = el; p.face = face; piecesEl.appendChild(el); R.pieces.push(p);
      el.addEventListener("pointerdown", onDown); el.addEventListener("click", function (e) { if (e.detail === 0) toggleSelect(R.pieces[+this.getAttribute("data-i")]); });
      var s = document.createElement("button"); s.type = "button"; s.className = "ep-slot"; s.setAttribute("data-r", String(rr)); s.setAttribute("data-c", String(cc)); s.setAttribute("tabindex", p.i === 0 ? "0" : "-1");
      s.setAttribute("aria-label", t("ep.slotAria", { r: rr + 1, c: cc + 1 })); s.addEventListener("click", onSlot); s.addEventListener("keydown", onSlotKey); slotsEl.appendChild(s);
    }
    ghost.style.backgroundImage = url ? 'url("' + url + '")' : "none";
    if (!url) frame.classList.add("ep-nofile"); else frame.classList.remove("ep-nofile");
  }

  /* ——— jeu ——— */
  function slotEl(r, c) { return slotsEl.children[r * R.cols + c]; }
  function lock(p, silent) {
    p.locked = true; p.el.classList.add("is-locked"); p.el.classList.remove("is-selected", "is-hint"); p.el.setAttribute("tabindex", "-1"); p.el.style.zIndex = "2"; styleFor(p, R.g);
    slotEl(p.r, p.c).classList.add("is-filled"); slotEl(p.r, p.c).setAttribute("tabindex", "-1");
    R.placed++; R.moves++; if (selected === p) selected = null;
    if (!silent) { snapChime(); p.el.classList.add("is-snap"); setTimeout(function () { p.el.classList.remove("is-snap"); }, 520); }
    updateHud(); clearHint();
    hintEl.textContent = t("ep.hintSnap"); say(t("ep.progress", { a: R.placed, b: R.pieces.length }));
    if (R.placed >= R.pieces.length) setTimeout(finish, reduced() ? 100 : 450);
  }
  function toggleSelect(p) {
    if (mode !== "playing" || p.locked) return;
    if (window.EdenStars && window.EdenStars.unlock) window.EdenStars.unlock();
    if (!startedAt) startedAt = Date.now();
    var g0 = R.g, lim0 = Math.min(g0.cw, g0.ch) * 0.6;                       // pièce déjà posée tout près de sa place : on la range
    if (Math.abs(p.fx * g0.W - p.c * g0.cw) < lim0 && Math.abs(p.fy * g0.W - p.r * g0.ch) < lim0) { lock(p); return; }
    var was = selected === p; if (selected) selected.el.classList.remove("is-selected"); selected = was ? null : p;
    if (selected) { selected.el.classList.add("is-selected"); selected.el.style.zIndex = String(++zTop); hintEl.textContent = t("ep.hintSelected"); tick(); } else hintEl.textContent = t("ep.hintPlay");
    slotsEl.classList.toggle("has-sel", !!selected);
  }
  function onSlot(e) {
    if (mode !== "playing" || !selected) { if (mode === "playing") hintEl.textContent = t("ep.hintPickFirst"); return; }
    var s = e.currentTarget, r = +s.getAttribute("data-r"), c = +s.getAttribute("data-c"), p = selected;
    if (s.classList.contains("is-filled")) return;
    if (p.r === r && p.c === c) { slotsEl.classList.remove("has-sel"); lock(p); }
    else { R.misses++; s.classList.add("is-nope"); setTimeout(function () { s.classList.remove("is-nope"); }, 500); hintEl.textContent = t("ep.hintWrong"); say(t("ep.hintWrong")); }
  }
  function onSlotKey(e) {
    var s = e.currentTarget, r = +s.getAttribute("data-r"), c = +s.getAttribute("data-c"), nr = r, nc = c;
    if (e.key === "ArrowRight") nc++; else if (e.key === "ArrowLeft") nc--; else if (e.key === "ArrowDown") nr++; else if (e.key === "ArrowUp") nr--; else return;
    if (nr < 0 || nc < 0 || nr >= R.rows || nc >= R.cols) { e.preventDefault(); return; }
    e.preventDefault(); Array.prototype.forEach.call(slotsEl.children, function (x) { x.setAttribute("tabindex", "-1"); }); var n = slotEl(nr, nc); n.setAttribute("tabindex", "0"); n.focus();
  }

  /* glisser-déposer */
  function onDown(e) {
    if (mode !== "playing" || dragging || (e.button !== undefined && e.button > 0)) return;
    var p = R.pieces[+e.currentTarget.getAttribute("data-i")]; if (p.locked) return;
    if (window.EdenStars && window.EdenStars.unlock) window.EdenStars.unlock();
    if (!startedAt) startedAt = Date.now();
    var sr = stage.getBoundingClientRect();
    dragging = { p: p, pid: e.pointerId, x0: e.clientX, y0: e.clientY, ox: p.fx * R.g.W, oy: p.fy * R.g.W, moved: false, sx: sr.left, sy: sr.top };
    p.el.style.zIndex = String(++zTop);
    window.addEventListener("pointermove", onMove, { passive: false }); window.addEventListener("pointerup", onUp); window.addEventListener("pointercancel", onCancel);
    e.preventDefault();
  }
  function onMove(e) {
    var d = dragging; if (!d || e.pointerId !== d.pid) return;
    var dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.moved) { if (dx * dx + dy * dy < 36) return; d.moved = true; d.p.el.classList.add("is-drag"); if (selected) { selected.el.classList.remove("is-selected"); selected = null; slotsEl.classList.remove("has-sel"); } clearHint(); }
    e.preventDefault();
    var g = R.g, x = Math.max(-g.pad * 0.5, Math.min(g.W - g.cw + g.pad * 0.5, d.ox + dx)), y = Math.max(-g.pad * 0.5, Math.min(g.H + g.gap + g.tableH - g.ch + g.pad * 0.5, d.oy + dy));
    d.p.fx = x / g.W; d.p.fy = y / g.W; d.p.el.style.left = (x - g.pad) + "px"; d.p.el.style.top = (y - g.pad) + "px";
    var near = nearSlot(d.p, x, y); Array.prototype.forEach.call(slotsEl.children, function (s) { s.classList.remove("is-over"); }); if (near) slotEl(near.r, near.c).classList.add("is-over");
  }
  function nearSlot(p, x, y) {                                               // la bonne place, si la pièce en est assez proche
    var g = R.g, dx = x - p.c * g.cw, dy = y - p.r * g.ch, lim = Math.min(g.cw, g.ch) * 0.45;
    return (Math.sqrt(dx * dx + dy * dy) <= lim) ? { r: p.r, c: p.c } : null;
  }
  function endDrag() {
    var d = dragging; if (!d) return null; dragging = null;
    window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onCancel);
    d.p.el.classList.remove("is-drag"); Array.prototype.forEach.call(slotsEl.children, function (s) { s.classList.remove("is-over"); }); return d;
  }
  function onUp(e) {
    if (!dragging || e.pointerId !== dragging.pid) return;
    var d = endDrag(), p = d.p;
    if (!d.moved) {
      if (selected && selected !== p && tapThroughTo(e)) return;               // une pièce choisie + toucher une autre pièce posée sur le cadre = toucher la place dessous
      toggleSelect(p); return;
    }
    var g = R.g; if (nearSlot(p, p.fx * g.W, p.fy * g.W)) lock(p);
    else { R.moves++; hintEl.textContent = t("ep.hintDrop"); }
  }
  function tapThroughTo(e) {
    var fr = frame.getBoundingClientRect(); if (e.clientX < fr.left || e.clientX > fr.right || e.clientY < fr.top || e.clientY > fr.bottom) return false;
    var c = Math.min(R.cols - 1, Math.floor((e.clientX - fr.left) / (fr.width / R.cols))), r = Math.min(R.rows - 1, Math.floor((e.clientY - fr.top) / (fr.height / R.rows)));
    var s = slotEl(r, c); if (!s || s.classList.contains("is-filled")) return false; onSlot({ currentTarget: s }); return true;
  }
  function onCancel(e) { if (dragging && e.pointerId === dragging.pid) endDrag(); }

  /* aides */
  function clearHint() { clearTimeout(hintT); piecesEl.querySelectorAll(".is-hint").forEach(function (e) { e.classList.remove("is-hint"); }); slotsEl.querySelectorAll(".is-hint").forEach(function (e) { e.classList.remove("is-hint"); }); }
  function onHelp() {
    if (mode !== "playing") return; var open = R.pieces.filter(function (p) { return !p.locked; }); if (!open.length) return;
    var p = open[Math.floor(Math.random() * open.length)]; R.hints++; clearHint();
    p.el.classList.add("is-hint"); slotEl(p.r, p.c).classList.add("is-hint"); hintEl.textContent = t("ep.hintHelp"); say(t("ep.hintHelp"));
    hintT = setTimeout(clearHint, 3600); updateHud();
  }
  function onPeek() {
    if (mode !== "playing") return; R.hints += 0.5; ghost.classList.add("is-peek"); hintEl.textContent = t("ep.hintPeek"); clearTimeout(peekT);
    peekT = setTimeout(function () { ghost.classList.remove("is-peek"); }, 2600); updateHud();
  }
  function updateHud() {
    if (!R) { statusEl.textContent = t("ep.ready"); scoreEl.textContent = ""; return; }
    statusEl.textContent = t("ep.progress", { a: R.placed, b: R.pieces.length }); scoreEl.textContent = t("ep.moves", { n: R.moves });
    helpBtn.disabled = mode !== "playing"; peekBtn.disabled = mode !== "playing";
  }

  /* ——— le tableau s'anime ——— */
  function buildScene() {
    sceneEl.innerHTML = ""; sceneEl.className = "ep-scene"; var s = R.scene, L = R.layers;
    if (!L) {                                                                // repli : image à plat, animée (zoom lent + lueur) si les couches n'ont pas pu se charger
      var f = document.createElement("div"); f.className = "ep-lay ep-lay-flat"; var im = document.createElement("img"); im.alt = ""; im.src = R.img ? R.img.src : ""; f.appendChild(im); sceneEl.appendChild(f); sceneEl.classList.add("is-flat");
    } else {
      cfg.layers.forEach(function (name) {
        var w = document.createElement("div"); w.className = "ep-lay ep-lay-" + name; var im = document.createElement("img"); im.alt = ""; im.draggable = false; im.src = L[name].src; w.appendChild(im); sceneEl.appendChild(w);
      });
    }
    var cv = document.createElement("canvas"); cv.className = "ep-fx"; cv.setAttribute("aria-hidden", "true"); sceneEl.appendChild(cv);
    var glowEl = document.createElement("div"); glowEl.className = "ep-bloom"; sceneEl.appendChild(glowEl);
    sceneEl.setAttribute("role", "img"); sceneEl.setAttribute("aria-label", loc(s.name) + " — " + loc(s.desc));
  }
  function startFx() {
    stopFx(); var cv = sceneEl.querySelector(".ep-fx"); if (!cv) return;
    var s = R.scene, W = R.g.W, H = R.g.H, dpr = Math.min(2, window.devicePixelRatio || 1), small = window.innerWidth < 560;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + "px"; cv.style.height = H + "px";
    var ctx = cv.getContext("2d"); if (!ctx) return; ctx.scale(dpr, dpr);
    var skyH = H * (s.id === "riviere" ? 0.58 : s.id === "nuit" ? 0.62 : s.id === "foret" ? 0.3 : 0.55);
    var stars = [], nStars = s.id === "foret" ? 14 : (small ? 46 : 80);
    for (var i = 0; i < nStars; i++) stars.push({ x: Math.random() * W, y: Math.random() * skyH, r: rnd(0.6, 1.9), ph: Math.random() * 6.28, sp: rnd(0.8, 2.6) });
    var motes = [], nM = small ? 22 : 40;
    for (i = 0; i < nM; i++) motes.push({ x: Math.random() * W, y: Math.random() * H, r: rnd(1, 2.8), vy: rnd(10, 30), ph: Math.random() * 6.28, a: rnd(0.4, 0.95) });
    var streaks = [], water = s.water;
    if (water) { var minY = 1, maxY = 0; water.forEach(function (p) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }); for (i = 0; i < (small ? 22 : 40); i++) streaks.push({ x: Math.random() * W, y: (minY + Math.random() * (maxY - minY)) * H, w: rnd(10, 36), ph: Math.random() * 6.28, sp: rnd(0.6, 1.6) }); }
    var shoot = null, nextShoot = performance.now() + 2500, t0 = performance.now(), run = true, still = reduced();
    function draw(now) {
      var tt = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = "lighter";
      var sg = ctx.createRadialGradient(s.sun[0] * W, s.sun[1] * H, 0, s.sun[0] * W, s.sun[1] * H, W * 0.38); var k = still ? 0.15 : 0.14 + 0.06 * Math.sin(tt * 0.9);
      sg.addColorStop(0, "rgba(255,226,160," + k + ")"); sg.addColorStop(1, "rgba(255,226,160,0)"); ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
      stars.forEach(function (st) { var a = still ? 0.7 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(tt * st.sp + st.ph)); ctx.fillStyle = "rgba(255,250,235," + a.toFixed(2) + ")"; ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, 6.283); ctx.fill(); });
      s.halo.forEach(function (h, hi) {                                      // halo des êtres de lumière : respire (et s'illumine au début)
        var cx = h[0] * W, cy = h[1] * H, rr = h[2] * W * (still ? 1.05 : 1.05 + 0.1 * Math.sin(tt * 1.6 + hi)), boost = still ? 0 : Math.max(0, 1 - tt / 3) * 0.35;
        var g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr); g2.addColorStop(0, "rgba(255,244,214," + (0.32 + boost + (still ? 0 : 0.1 * Math.sin(tt * 1.6 + hi))).toFixed(2) + ")"); g2.addColorStop(1, "rgba(255,230,190,0)"); ctx.fillStyle = g2; ctx.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
      });
      if (water) {                                                           // éclat de l'eau : traits de lumière qui miroitent dans le polygone de l'eau
        ctx.save(); ctx.beginPath(); water.forEach(function (p, i) { if (i) ctx.lineTo(p[0] * W, p[1] * H); else ctx.moveTo(p[0] * W, p[1] * H); }); ctx.closePath(); ctx.clip();
        streaks.forEach(function (sk) { var a = still ? 0.28 : 0.5 * Math.max(0, Math.sin(tt * sk.sp + sk.ph)); if (a < 0.02) return; var x = sk.x + (still ? 0 : Math.sin(tt * 0.3 + sk.ph) * 8); ctx.strokeStyle = "rgba(255,246,222," + a.toFixed(2) + ")"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - sk.w / 2, sk.y); ctx.lineTo(x + sk.w / 2, sk.y); ctx.stroke(); });
        ctx.restore();
      }
      motes.forEach(function (m) {
        if (!still) { m.y -= m.vy * 0.016; m.x += Math.sin(tt * 0.8 + m.ph) * 0.15; if (m.y < -6) { m.y = H + 6; m.x = Math.random() * W; } }
        var a = m.a * (still ? 0.6 : 0.6 + 0.4 * Math.sin(tt * 2 + m.ph)); var g3 = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 3); g3.addColorStop(0, "rgba(255,230,150," + a.toFixed(2) + ")"); g3.addColorStop(1, "rgba(255,230,150,0)"); ctx.fillStyle = g3; ctx.fillRect(m.x - m.r * 3, m.y - m.r * 3, m.r * 6, m.r * 6);
      });
      if (!still) {
        if (!shoot && now > nextShoot && skyH > 40) { shoot = { x: rnd(W * 0.2, W * 0.9), y: rnd(0, skyH * 0.4), l: 0 }; nextShoot = now + rnd(5000, 9000); }
        if (shoot) { shoot.l += 0.03; var a2 = 1 - shoot.l; ctx.strokeStyle = "rgba(255,246,230," + Math.max(0, a2).toFixed(2) + ")"; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(shoot.x - shoot.l * 160, shoot.y + shoot.l * 70); ctx.lineTo(shoot.x - shoot.l * 160 + 34, shoot.y + shoot.l * 70 - 15); ctx.stroke(); if (shoot.l >= 1) shoot = null; }
      }
      ctx.globalCompositeOperation = "source-over";
    }
    function loop(now) { if (!run) return; if (!document.hidden) draw(now); fx.raf = requestAnimationFrame(loop); }
    fx = { stop: function () { run = false; if (fx && fx.raf) cancelAnimationFrame(fx.raf); }, raf: 0 };
    if (still) draw(performance.now()); else fx.raf = requestAnimationFrame(loop);
  }
  function stopFx() { if (fx) { fx.stop(); fx = null; } }
  var onParallax = function (e) {
    var r = sceneEl.getBoundingClientRect(); if (!r.width) return;
    var px = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2)), py = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
    sceneEl.style.setProperty("--px", px.toFixed(3)); sceneEl.style.setProperty("--py", py.toFixed(3));
  };
  function showScene() {
    buildScene(); sceneEl.hidden = false; void sceneEl.offsetWidth; sceneEl.classList.add("is-on");
    if (!reduced()) { setTimeout(function () { sceneEl.classList.add("is-alive"); }, 350); window.addEventListener("pointermove", onParallax, { passive: true }); }
    else sceneEl.classList.add("is-still");
    startFx();
    // le tableau remplace les pièces (même image au repos) : elles s'effacent sous lui
    piecesEl.classList.add("is-done"); tableEl.classList.add("is-done"); ghost.classList.remove("is-peek");
    setTimeout(function () { if (mode === "won" && R) { stage.style.transition = reduced() ? "none" : "height 0.7s ease"; stage.style.height = R.g.H + "px"; } }, reduced() ? 0 : 1100);   // la table (vide) se replie : il ne reste que le tableau
  }

  /* ——— victoire ——— */
  function bubbles() {
    if (!celebrate) return; celebrate.innerHTML = ""; wrap.classList.add("is-glow");
    if (reduced()) return;
    var N = window.innerWidth < 520 ? 22 : 34, h = wrap.clientHeight || 420;
    for (var i = 0; i < N; i++) {
      var b = document.createElement("i"); b.className = "ep-bubble" + (i % 4 === 0 ? " is-spark" : "");
      b.style.setProperty("--x", (4 + Math.random() * 92).toFixed(1) + "%"); b.style.setProperty("--s", (i % 4 === 0 ? 6 + Math.random() * 6 : 12 + Math.random() * 26).toFixed(1) + "px");
      b.style.setProperty("--d", (Math.random() * 1.1).toFixed(2) + "s"); b.style.setProperty("--t", (2.8 + Math.random() * 2.2).toFixed(2) + "s");
      b.style.setProperty("--dx", (Math.random() * 70 - 35).toFixed(0) + "px"); b.style.setProperty("--h", Math.round(h * (0.55 + Math.random() * 0.6)) + "px"); celebrate.appendChild(b);
    }
    setTimeout(function () { if (celebrate) celebrate.innerHTML = ""; }, 6200);
  }
  function songFor(scene) {
    var l = siteLang(), list = window.EdenSongPick ? window.EdenSongPick.forLang(tracks, l) : tracks.filter(function (x) { return x.lang === l; });
    var themed = list.filter(function (tr) { var m = cats && cats.tracks && cats.tracks[tr.id]; return m && m.primary === scene.category; });
    var pool = themed.length ? themed : list;
    return window.EdenSongPick ? window.EdenSongPick.pick(pool, { record: false }) : pool[Math.floor(Math.random() * pool.length)];
  }
  function finish() {
    if (mode !== "playing") return;
    mode = "won"; selected = null; clearHint(); actions.hidden = true; wrap.classList.add("is-won"); updateHud();
    showScene();
    var score = R.misses + R.hints * 1.5, stars = score <= 0 ? 3 : score <= 3 ? 2 : 1;
    var rec = window.EdenStars ? window.EdenStars.record(GAME_ID, stars) : { session: stars, best: stars };
    if (window.EdenStars) { window.EdenStars.play(stars); window.EdenStars.render(starsBox, stars, { line: t("ep.star" + stars), detail: t("ep.starDetail", { hints: Math.ceil(R.hints), misses: R.misses }), session: rec }); }
    bubbles(); capEl.hidden = false; capEl.innerHTML = ""; var n = document.createElement("strong"); n.textContent = loc(R.scene.name); capEl.appendChild(n); capEl.appendChild(document.createTextNode(" — " + loc(R.scene.desc)));
    var song = songFor(R.scene); hintEl.textContent = t("ep.hintWin"); say(t("ep.wonText", { title: song ? song.title : "" }));
    againBtn.hidden = false; againBtn.textContent = t("ep.again");
    if (song) playSong(song);
    try { wrap.scrollIntoView({ block: "nearest", behavior: reduced() ? "auto" : "smooth" }); } catch (e) {}
  }
  function clearEmbed() { if (embedBox) { embedBox.innerHTML = ""; embedBox.hidden = true; } }
  function stopSong() { if (window.EdenFullSong) window.EdenFullSong.stop(audio); else try { audio.pause(); } catch (e) {} clearEmbed(); if (listenBtn) listenBtn.hidden = true; if (playerBox) playerBox.hidden = true; ownStarted = false; }
  function playSong(song) {
    playerBox.hidden = false; if (nowEl) nowEl.textContent = t("ep.playing", { title: song.title });
    var F = window.EdenFullSong, same = audio && audio.getAttribute("data-id") === song.id;
    if (F && F.busy(audio) && !same && ownStarted) { F.stop(audio); clearEmbed(); }
    else if (F && F.busy(audio) && !same) {
      if (listenBtn) { listenBtn.hidden = false; listenBtn.textContent = t("ep.listen", { title: song.title }); listenBtn.onclick = function () { listenBtn.hidden = true; F.stop(audio); startSong(song); ownStarted = true; }; }
      return;
    }
    if (F && F.busy(audio) && same) return;
    startSong(song); ownStarted = true;
  }
  function startSong(song) {
    var F = window.EdenFullSong; if (nowEl) nowEl.textContent = t("ep.playing", { title: song.title }); playerBox.hidden = false;
    if (window.EdenSongPick && song.id) window.EdenSongPick.record(song.id);
    if (song.audio_url || song.audio_url_aac) {
      clearEmbed(); audio.hidden = false;
      if (F) F.play(audio, { id: song.id, audio: song.audio_url, aac: song.audio_url_aac });
      else { audio.src = song.audio_url; try { audio.currentTime = 0; } catch (e) {} var p = audio.play(); if (p && p.catch) p.catch(function () {}); }
    } else if (song.embed_url) { audio.hidden = true; if (F) F.embed(embedBox, { id: song.id, embed: song.embed_url, title: song.title }); }
  }

  /* ——— cycle ——— */
  function showOverlay(show) { if (overlay) overlay.classList.toggle("is-hidden", !show); }
  function renderLevels() {
    levelsEl.innerHTML = "";
    levels().forEach(function (lv) {
      var b = document.createElement("button"); b.type = "button"; b.className = "ep-level"; b.setAttribute("data-level", lv.id); b.setAttribute("aria-pressed", lv.id === levelId ? "true" : "false");
      b.textContent = t("ep.level." + lv.id, { n: lv.cols * lv.rows }); b.addEventListener("click", function () { setLevel(lv.id); }); levelsEl.appendChild(b);
    });
  }
  function setLevel(id) { levelId = id; try { localStorage.setItem("eden-ep-level", id); } catch (e) {} renderLevels(); if (mode === "playing" && R && !R.moves && !R.placed) startGame(); else if (mode !== "idle") hintEl.textContent = t("ep.levelNext"); }
  function resetScene() { stopFx(); window.removeEventListener("pointermove", onParallax); sceneEl.hidden = true; sceneEl.className = "ep-scene"; sceneEl.innerHTML = ""; piecesEl.classList.remove("is-done"); tableEl.classList.remove("is-done"); capEl.hidden = true; }
  function startGame() {
    if (window.EdenStars && window.EdenStars.unlock) window.EdenStars.unlock();
    if (window.EdenStars) window.EdenStars.clear(starsBox);
    resetScene(); stage.style.transition = "none"; card.hidden = false; emptyBox.hidden = true; mode = "playing"; selected = null; startedAt = 0; clearHint(); wrap.classList.remove("is-glow", "is-won"); if (celebrate) celebrate.innerHTML = "";
    var scene = pickScene(), lv = level(); writeRecent(siteLang(), scene.id);
    stage.hidden = false; showOverlay(false); startBtn.hidden = true; againBtn.hidden = true; actions.hidden = false;
    var base = scene.base;
    // image à plat (obligatoire) puis couches (préchargées pour que l'animation parte aussitôt à la victoire)
    loadImg(base + ".webp").then(function (img) {
      if (mode !== "playing") return;
      build(scene, lv, img); layout(true); updateHud(); hintEl.textContent = img ? t("ep.hintPlay") : t("ep.hintNoImage"); say(t("ep.setLine", { n: R.pieces.length }));
      var cur = R;
      Promise.all(cfg.layers.map(function (n) { return loadImg(base + "-" + n + ".webp"); })).then(function (arr) {
        if (R !== cur) return; if (arr.every(Boolean)) { var L = {}; cfg.layers.forEach(function (n, i) { L[n] = arr[i]; }); cur.layers = L; }
      });
      try { var r = stage.getBoundingClientRect(); if (r.top < 50 || r.bottom > window.innerHeight + 300) stage.scrollIntoView({ block: "start", behavior: reduced() ? "auto" : "smooth" }); } catch (e) {}
    });
  }
  function showWelcome() {
    mode = "idle"; R = null; selected = null; resetScene(); clearHint(); showOverlay(true); stage.hidden = true; stage.style.height = "";
    $("ep-overlay-kicker").textContent = t("ep.welcomeKicker"); $("ep-overlay-title").textContent = t("ep.welcomeTitle"); $("ep-overlay-text").textContent = t("ep.welcomeText");
    startBtn.hidden = false; startBtn.textContent = t("ep.start"); againBtn.hidden = true; actions.hidden = true; wrap.classList.remove("is-glow", "is-won"); if (celebrate) celebrate.innerHTML = "";
    if (window.EdenStars) window.EdenStars.clear(starsBox); hintEl.textContent = t("ep.hintIdle"); renderLevels(); updateHud();
  }
  function init() { if (loadFailed || !cfg) { showWelcome(); hintEl.textContent = t("ep.loadError"); startBtn.hidden = true; return; } card.hidden = false; emptyBox.hidden = true; showWelcome(); }
  function bind() {
    try { var sv = localStorage.getItem("eden-ep-level"); if (sv) levelId = sv; } catch (e) {}
    if (cfg && (!levelId || !levels().some(function (l) { return l.id === levelId; }))) levelId = cfg.defaultLevel || cfg.levels[0].id;
    startBtn.addEventListener("click", startGame); againBtn.addEventListener("click", startGame); newBtn.addEventListener("click", startGame); helpBtn.addEventListener("click", onHelp); peekBtn.addEventListener("click", onPeek);
    var rt = 0; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { if (R && mode !== "idle") { layout(false); if (mode === "won") startFx(); } }, 120); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && selected) toggleSelect(selected); });
    if (window.EdenI18n && window.EdenI18n.onChange) window.EdenI18n.onChange(function () { stopSong(); init(); });
    var toggle = $("nav-toggle"), links = $("nav-links");
    if (toggle && links) toggle.addEventListener("click", function () { var open = links.classList.toggle("is-open"); toggle.setAttribute("aria-expanded", open ? "true" : "false"); });
    init();
  }
  window.EdenPuzzle = {
    state: function () {
      if (!R) return { mode: mode };
      var g = R.g; return { mode: mode, scene: R.scene.id, level: R.level, cols: R.cols, rows: R.rows, total: R.pieces.length, placed: R.placed, misses: R.misses, hints: R.hints, layersLoaded: !!R.layers, W: g.W, H: g.H, cw: g.cw, ch: g.ch, clip: CLIP,
        category: R.scene.category, pieces: R.pieces.map(function (p) { return { i: p.i, r: p.r, c: p.c, locked: p.locked }; }) };
    }
  };
  load().then(function () { if (window.EdenSongPick && window.EdenSongPick.ready && window.EdenSongPick.ready.then) return window.EdenSongPick.ready; }).then(bind, bind);
})();
