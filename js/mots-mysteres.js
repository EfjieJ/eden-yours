/* Eden Yours — Mots mystères (classique : grille où TOUTES les cases servent aux mots, sauf quelques-unes).
   Les mots listés viennent des VRAIES paroles d'une chanson de la langue de la page (data/lyrics-sources.json, mots-outils exclus via data/wordsearch.json).
   La grille est remplie par les mots (chevauchements permis) jusqu'à ce qu'il reste EXACTEMENT autant de cases libres que de lettres du mot mystère ;
   ces cases, lues dans l'ordre (de gauche à droite, ligne par ligne), épellent le mot mystère : un mot du titre présent dans les paroles (sinon un mot curé des paroles).
   Quand tous les mots sont trouvés, les lettres restantes s'allument ; on tape le mot (ou on le révèle). Succès : la grille s'illumine, étoiles, bulles,
   et la chanson d'où viennent les mots joue EN ENTIER (EdenFullSong / embed Suno). Base commune avec js/mots-caches.js (sélection glisser / toucher / clavier). */
(function () {
  "use strict";

  var GAME_ID = "mystery-word";
  var DIRS = { E: [1, 0], S: [0, 1], SE: [1, 1], NE: [1, -1], W: [-1, 0], N: [0, -1], NW: [-1, -1], SW: [-1, 1] };
  var $ = function (id) { return document.getElementById(id); };
  var gridEl = $("ws-grid"), frame = $("ws-frame"), overlay = $("ws-overlay"), overlayKicker = $("ws-overlay-kicker"), overlayTitle = $("ws-overlay-title"),
    overlayText = $("ws-overlay-text"), startBtn = $("ws-start"), againBtn = $("ws-again"), statusEl = $("ws-status"), scoreEl = $("ws-score"), hintEl = $("ws-hint"),
    liveEl = $("ws-live"), starsBox = $("ws-stars"), playerBox = $("ws-player"), nowEl = $("ws-now-playing"), embedBox = $("ws-embed"), audio = $("ws-audio"),
    listenBtn = $("ws-listen"), actions = $("ws-actions"), helpBtn = $("ws-help"), newBtn = $("ws-new"), timerBtn = $("ws-timer"), emptyBox = $("ws-empty"),
    card = $("ws-card"), stage = $("ws-stage"), celebrate = $("ws-celebrate"), levelsEl = $("ws-levels"), wordsEl = $("ws-words"), board = $("ws-board"),
    mystery = $("ws-mystery"), coverBox = $("ws-cover"), songTitleEl = $("ws-songtitle"),
    mmBox = $("mm-box"), mmSlots = $("mm-slots"), mmForm = $("mm-form"), mmInput = $("mm-input"), mmReveal = $("mm-reveal"), mmMsg = $("mm-msg");

  var cfg = null, tracks = [], lyrics = {}, loadFailed = false;
  var state = "idle";                    // idle | playing | won
  var levelId = null, round = null, hints = 0, startedAt = 0, timer = 0, showTime = false;
  var drag = null, tapStart = null, AC = null, ownStarted = false;   // ownStarted : la chanson en cours a été lancée par une manche précédente de ce jeu

  function t(key, vars) {                                   // clés « mm.* » propres à ce jeu, sinon on reprend celles de Mots cachés (« ws.* »)
    if (!(window.EdenI18n && window.EdenI18n.t)) return key;
    if (key.indexOf("ws.") === 0) { var k2 = "mm." + key.slice(3), v = window.EdenI18n.t(k2, vars); if (v && v !== k2) return v; }
    return window.EdenI18n.t(key, vars);
  }
  function siteLang() { return window.EdenSongPick ? window.EdenSongPick.lang() : (document.documentElement.lang === "en" ? "en" : "fr"); }
  function reduced() { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } }
  function say(msg) { if (liveEl) { liveEl.textContent = ""; setTimeout(function () { liveEl.textContent = msg; }, 30); } }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function rint(n) { return Math.floor(Math.random() * n); }
  function fmt(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60); }
  function store(k) { try { return window[k]; } catch (e) { return null; } }

  /* normalisation : minuscules, œ→oe, accents retirés, A–Z seulement */
  function norm(w) {
    return String(w).toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
  }

  /* ——— sons (Web Audio) ——— */
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
  function foundChime() { tone([523.25, 659.25, 783.99], "sine", 0.1, 0.07, 0.45); }
  function softTick() { tone([440], "sine", 0.03, 0, 0.12); }

  /* ——— données ——— */
  function getJSON(url) { return fetch(url, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); }); }
  function load() {
    return Promise.all([getJSON("data/mots-mysteres.json"), getJSON("data/wordsearch.json"), getJSON("tracks.json"), getJSON("data/lyrics-sources.json")]).then(function (r) {
      cfg = r[0]; cfg.ws = r[1]; tracks = r[2].tracks || r[2] || []; lyrics = r[3] || {};
    }).catch(function () { loadFailed = true; });
  }
  function levels() { return (cfg && cfg.levels) || []; }
  function level() { var L = levels(); for (var i = 0; i < L.length; i++) if (L[i].id === levelId) return L[i]; return L[0]; }

  /* mots d'une chanson : verifiés dans les paroles (premier texte avant « --- », sans [Couplet]) */
  function lyricText(id) {
    var l = lyrics[id]; if (!l || !l.lyrics) return "";
    return String(l.lyrics).split(/\n\s*---/)[0].replace(/\[[^\]]*\]/g, " ");
  }
  var songCache = {};
  function songWords(tr) {                                   // tous les mots des paroles (4–9 lettres, hors mots-outils) + candidats « mot mystère »
    if (songCache[tr.id]) return songCache[tr.id];
    var text = lyricText(tr.id), lang = tr.lang, minL = cfg.minLen || 4, maxL = cfg.maxLen || 9;
    var stop = {}; ((cfg.ws.stop && cfg.ws.stop[lang]) || []).forEach(function (w) { stop[norm(w)] = 1; });
    var toks = (text.match(/[A-Za-zÀ-ÿŒœ']+/g) || []).join("'").split("'"), forms = {}, out = [];
    toks.forEach(function (w) { var n = norm(w); if (n.length < minL || n.length > maxL || stop[n] || forms[n]) return; forms[n] = w.toLowerCase(); out.push({ display: forms[n], n: n }); });
    var myst = [];
    (String(tr.title || "").match(/[A-Za-zÀ-ÿŒœ]+/g) || []).forEach(function (w) { var n = norm(w); if (n.length >= cfg.mysteryMin && n.length <= cfg.mysteryMax && forms[n] && !stop[n] && myst.indexOf(n) < 0) myst.push(n); });
    if (!myst.length) ((cfg.ws.songs && cfg.ws.songs[tr.id]) || []).forEach(function (w) { var n = norm(w); if (n.length >= cfg.mysteryMin && n.length <= cfg.mysteryMax && forms[n] && myst.indexOf(n) < 0) myst.push(n); });
    if (!myst.length) out.forEach(function (w) { if (myst.length < 3 && w.n.length >= cfg.mysteryMin && w.n.length <= cfg.mysteryMax) myst.push(w.n); });
    return (songCache[tr.id] = { words: out, mystery: myst, forms: forms });
  }
  function playable() {
    if (!cfg) return [];
    var lang = siteLang(), list = window.EdenSongPick ? window.EdenSongPick.forLang(tracks, lang) : tracks.filter(function (x) { return x.lang === lang; });
    return list.filter(function (tr) { return tr.lang === lang && tr.cover_url && lyricText(tr.id) && songWords(tr).words.length >= (cfg.minPool || 30) && songWords(tr).mystery.length; });
  }
  function readRecent(lang) { try { var o = JSON.parse(store("localStorage").getItem(cfg.recentStorageKey) || "{}"); return Array.isArray(o[lang]) ? o[lang] : []; } catch (e) { return []; } }
  function writeRecent(lang, id) {
    try { var ls = store("localStorage"), o = JSON.parse(ls.getItem(cfg.recentStorageKey) || "{}"); var a = (o[lang] || []).filter(function (x) { return x !== id; }); a.push(id); o[lang] = a.slice(-4); ls.setItem(cfg.recentStorageKey, JSON.stringify(o)); } catch (e) {}
  }
  function pickSong(list, lang) {
    var rec = readRecent(lang), avoid = rec.slice(-Math.min(3, list.length - 1));
    var pool = list.filter(function (s) { return avoid.indexOf(s.id) < 0; }); if (!pool.length) pool = list;
    return window.EdenSongPick ? window.EdenSongPick.pick(pool, { record: false }) : pool[rint(pool.length)];
  }

  /* ——— génération de la grille ——— */
  function inGrid(N, x, y) { return x >= 0 && y >= 0 && x < N && y < N; }
  /* remplit la grille de mots jusqu'à ce qu'il reste EXACTEMENT m cases libres, puis y écrit le mot mystère dans l'ordre de lecture */
  function buildMystery(pool, mys, N, dirNames, minWords) {
    var m = mys.length;
    for (var at = 0; at < 400; at++) {
      var g = [], free = N * N, pls = [], k; for (k = 0; k < N * N; k++) g.push("");
      var cand = shuffle(pool.filter(function (w) { return w.n !== mys && mys.indexOf(w.n) < 0 && w.n.indexOf(mys) < 0; }));
      for (var pass = 0; pass < 3 && free > m; pass++) for (var wi = 0; wi < cand.length && free > m; wi++) {
        var w = cand[wi], L = w.n.length, best = null;
        if (pls.some(function (p) { return p.n.indexOf(w.n) >= 0 || w.n.indexOf(p.n) >= 0; })) continue;   // aucun mot contenu dans un autre
        for (var tr = 0; tr < 70; tr++) {
          var d = DIRS[dirNames[rint(dirNames.length)]], x = rint(N), y = rint(N), ex = x + d[0] * (L - 1), ey = y + d[1] * (L - 1);
          if (!inGrid(N, ex, ey)) continue;
          var ok = true, ov = 0;
          for (var i = 0; i < L; i++) { var c = g[(y + d[1] * i) * N + x + d[0] * i]; if (c && c !== w.n[i]) { ok = false; break; } if (c) ov++; }
          var nw = L - ov; if (!ok || nw === 0 || free - nw < m) continue;
          var sc = ov * 2 + Math.random() + (free - nw === m ? 50 : 0); if (!best || sc > best.sc) best = { x: x, y: y, d: d, sc: sc, nw: nw };
        }
        if (best) { for (i = 0; i < L; i++) g[(best.y + best.d[1] * i) * N + best.x + best.d[0] * i] = w.n[i]; free -= best.nw; pls.push({ n: w.n, display: w.display, x: best.x, y: best.y, dx: best.d[0], dy: best.d[1] }); }
      }
      if (free === m && pls.length >= minWords) { var left = []; for (k = 0, i = 0; i < g.length; i++) if (!g[i]) { g[i] = mys[k++]; left.push(i); } return { g: g, placements: pls, left: left }; }
    }
    return null;
  }
  function availableWidth() { return (stage && stage.clientWidth) || (board && board.clientWidth) || window.innerWidth; }
  function gridSize(lv) {
    return lv.N;
  }

  /* ——— rendu ——— */
  function cellLabel(c) { return t("ws.cellAria", { l: c.ch.toUpperCase(), r: c.y + 1, c: c.x + 1 }); }
  function renderGrid() {
    var N = round.N; gridEl.innerHTML = ""; gridEl.style.setProperty("--n", String(N));
    round.cells = [];
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var b = document.createElement("button"), ch = round.g[y * N + x];
      b.type = "button"; b.className = "ws-cell"; b.textContent = ch.toUpperCase();
      b.setAttribute("data-x", String(x)); b.setAttribute("data-y", String(y)); b.setAttribute("tabindex", x === 0 && y === 0 ? "0" : "-1");
      var c = { x: x, y: y, ch: ch, el: b, found: -1 }; b.setAttribute("aria-label", cellLabel(c));
      b.addEventListener("click", function (e) { if (e.detail === 0) tapSelect(+this.getAttribute("data-x"), +this.getAttribute("data-y")); });   // clavier ; souris/tactile passent par pointer events
      b.addEventListener("keydown", onKey);
      gridEl.appendChild(b); round.cells.push(c);
    }
    sizeCells();
  }
  function sizeCells() {
    if (!round) return;
    var w = gridEl.clientWidth || 300; gridEl.style.setProperty("--cell", (w / round.N).toFixed(1) + "px");
  }
  function renderWords() {
    wordsEl.innerHTML = "";
    round.words.forEach(function (w, i) {
      var li = document.createElement("li"); li.className = "ws-word"; li.setAttribute("data-w", String(i)); li.style.setProperty("--h", hue(i));
      li.innerHTML = '<span class="ws-check" aria-hidden="true">✓</span><span class="ws-wtext"></span>';
      li.querySelector(".ws-wtext").textContent = w.display;
      wordsEl.appendChild(li);
    });
  }
  function hue(i) { return String((330 + i * 47) % 360); }
  function cell(x, y) { return round.cells[y * round.N + x]; }

  function updateHud() {
    if (!round) { statusEl.textContent = t("ws.ready"); scoreEl.textContent = ""; return; }
    statusEl.textContent = t("ws.found", { a: round.foundCount, b: round.words.length });
    var parts = []; if (showTime) parts.push(t("ws.time", { t: fmt(startedAt ? (Date.now() - startedAt) / 1000 : 0) }));
    scoreEl.textContent = parts.join(" · ");
    helpBtn.disabled = state !== "playing" || hints >= 3;
    helpBtn.textContent = t("ws.help") + (state === "playing" ? " (" + (3 - hints) + ")" : "");
    if (timerBtn) { timerBtn.setAttribute("aria-pressed", showTime ? "true" : "false"); timerBtn.textContent = showTime ? t("ws.timerOn") : t("ws.timerOff"); }
  }
  function startTimer() { stopTimer(); startedAt = Date.now(); timer = setInterval(function () { if (showTime) updateHud(); }, 1000); }
  function stopTimer() { if (timer) { clearInterval(timer); timer = 0; } }

  /* ——— sélection ——— */
  function cellAtPoint(cx, cy) {
    var r = gridEl.getBoundingClientRect(); if (!r.width) return null;
    var N = round.N, x = Math.floor((cx - r.left) / r.width * N), y = Math.floor((cy - r.top) / r.height * N);
    x = Math.max(0, Math.min(N - 1, x)); y = Math.max(0, Math.min(N - 1, y)); return { x: x, y: y };
  }
  function lineTo(sx, sy, px, py) {                         // pointeur en pixels → ligne aimantée (8 directions)
    var r = gridEl.getBoundingClientRect(), N = round.N, cs = r.width / N;
    var cx = r.left + (sx + 0.5) * cs, cy = r.top + (sy + 0.5) * cs, vx = px - cx, vy = py - cy;
    if (Math.sqrt(vx * vx + vy * vy) < cs * 0.62) return [{ x: sx, y: sy }];
    var k = Math.round(Math.atan2(vy, vx) / (Math.PI / 4)), dx = Math.round(Math.cos(k * Math.PI / 4)), dy = Math.round(Math.sin(k * Math.PI / 4));
    var d2 = dx * dx + dy * dy, steps = Math.max(0, Math.round((vx * dx + vy * dy) / (cs * d2)));
    var out = [];
    for (var i = 0; i <= steps; i++) { var x = sx + dx * i, y = sy + dy * i; if (!inGrid(N, x, y)) break; out.push({ x: x, y: y }); }
    return out;
  }
  function lineBetween(a, b) {                              // deux cases alignées ? sinon null
    var dx = b.x - a.x, dy = b.y - a.y, n = Math.max(Math.abs(dx), Math.abs(dy));
    if (n === 0) return [a]; if (!(dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy))) return null;
    var sx = Math.sign(dx), sy = Math.sign(dy), out = [];
    for (var i = 0; i <= n; i++) out.push({ x: a.x + sx * i, y: a.y + sy * i }); return out;
  }
  function clearMarks(cls) { if (!round) return; round.cells.forEach(function (c) { c.el.classList.remove(cls); }); }
  function showLine(line, cls) { clearMarks(cls); line.forEach(function (p) { cell(p.x, p.y).el.classList.add(cls); }); }

  function onPointerDown(e) {
    if (state !== "playing" || !round || (e.button !== undefined && e.button > 0)) return;
    var c = cellAtPoint(e.clientX, e.clientY); if (!c) return;
    if (window.EdenStars && window.EdenStars.unlock) window.EdenStars.unlock();
    if (!startedAt) startTimer();
    drag = { sx: c.x, sy: c.y, line: [c], pid: e.pointerId, moved: false };
    try { gridEl.setPointerCapture(e.pointerId); } catch (err) {}
    showLine(drag.line, "is-sel"); e.preventDefault();
  }
  function onPointerMove(e) {
    if (!drag || e.pointerId !== drag.pid) return;
    drag.line = lineTo(drag.sx, drag.sy, e.clientX, e.clientY);
    if (drag.line.length > 1) drag.moved = true;
    showLine(drag.line, "is-sel");
  }
  function onPointerUp(e) {
    if (!drag || e.pointerId !== drag.pid) return;
    var d = drag; drag = null; try { gridEl.releasePointerCapture(e.pointerId); } catch (err) {}
    if (d.moved && d.line.length > 1) { tapStart = null; clearMarks("is-start"); evaluate(d.line); }
    else { clearMarks("is-sel"); tapSelect(d.sx, d.sy); }
  }
  function onPointerCancel(e) { if (drag && e.pointerId === drag.pid) { drag = null; clearMarks("is-sel"); } }

  function tapSelect(x, y) {                                 // toucher le début, puis la fin
    if (state !== "playing" || !round) return;
    if (!startedAt) startTimer();
    if (!tapStart) { tapStart = { x: x, y: y }; showLine([tapStart], "is-start"); hintEl.textContent = t("ws.hintTap"); softTick(); return; }
    if (tapStart.x === x && tapStart.y === y) { tapStart = null; clearMarks("is-start"); hintEl.textContent = t("ws.hintPlay"); return; }
    var line = lineBetween(tapStart, { x: x, y: y });
    if (!line) { tapStart = { x: x, y: y }; showLine([tapStart], "is-start"); hintEl.textContent = t("ws.hintTap"); return; }
    tapStart = null; clearMarks("is-start"); showLine(line, "is-sel"); evaluate(line);
  }
  function evaluate(line) {
    var s = line.map(function (p) { return cell(p.x, p.y).ch; }).join(""), r = s.split("").reverse().join(""), idx = -1, already = false;
    round.words.forEach(function (w, i) { if (w.n === s || w.n === r) { if (round.done[i]) already = true; else if (idx < 0) idx = i; } });
    if (idx >= 0) { wordFound(idx, line); return; }
    setTimeout(function () { clearMarks("is-sel"); }, 380);
    hintEl.textContent = already ? t("ws.hintAlready") : t("ws.hintMiss"); if (already) say(t("ws.hintAlready"));
  }
  function wordFound(idx, line) {
    round.done[idx] = true; round.foundCount++;
    line.forEach(function (p) { var c = cell(p.x, p.y); c.found = idx; c.el.style.setProperty("--h", hue(idx)); c.el.classList.remove("is-sel", "is-hint"); c.el.classList.add("is-found"); });
    var li = wordsEl.querySelector('[data-w="' + idx + '"]'); if (li) li.classList.add("is-done");
    foundChime(); sparkle(line); hintEl.textContent = t("ws.hintFound", { word: round.words[idx].display }); say(t("ws.hintFound", { word: round.words[idx].display }));
    updateHud();
    if (round.foundCount >= round.words.length) setTimeout(allFound, reduced() ? 100 : 400);
  }
  function sparkle(line) {
    if (reduced() || !frame) return;
    var fr = frame.getBoundingClientRect(), gr = gridEl.getBoundingClientRect(), cs = gr.width / round.N;
    line.forEach(function (p, i) {
      if (i % 2 && line.length > 4) return;
      var s = document.createElement("i"); s.className = "ws-spark";
      s.style.left = (gr.left - fr.left + (p.x + 0.5) * cs) + "px"; s.style.top = (gr.top - fr.top + (p.y + 0.5) * cs) + "px";
      s.style.setProperty("--dx", (Math.random() * 30 - 15).toFixed(0) + "px"); s.style.setProperty("--dy", (-14 - Math.random() * 22).toFixed(0) + "px"); s.style.animationDelay = (i * 35) + "ms";
      frame.appendChild(s); setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 1300 + i * 35);
    });
  }
  function onKey(e) {
    if (!round) return;
    var x = +this.getAttribute("data-x"), y = +this.getAttribute("data-y"), N = round.N, tx = x, ty = y;
    if (e.key === "ArrowRight") tx++; else if (e.key === "ArrowLeft") tx--; else if (e.key === "ArrowDown") ty++; else if (e.key === "ArrowUp") ty--;
    else if (e.key === "Home") tx = 0; else if (e.key === "End") tx = N - 1;
    else if (e.key === "Escape") { tapStart = null; clearMarks("is-start"); clearMarks("is-sel"); hintEl.textContent = t("ws.hintPlay"); return; }
    else return;
    if (!inGrid(N, tx, ty)) { e.preventDefault(); return; }
    e.preventDefault(); round.cells.forEach(function (c) { c.el.setAttribute("tabindex", "-1"); });
    var n = cell(tx, ty).el; n.setAttribute("tabindex", "0"); n.focus();
    if (tapStart) { var line = lineBetween(tapStart, { x: tx, y: ty }); clearMarks("is-sel"); if (line && line.length > 1) showLine(line, "is-sel"); }
  }

  function onHelp() {
    if (state !== "playing" || !round || hints >= 3) return;
    var open = []; round.words.forEach(function (w, i) { if (!round.done[i]) open.push(i); }); if (!open.length) return;
    var i = open[rint(open.length)], pl = round.placements.filter(function (p) { return p.n === round.words[i].n; })[0];
    hints++; clearMarks("is-hint");
    if (pl) cell(pl.x, pl.y).el.classList.add("is-hint");
    var li = wordsEl.querySelector('[data-w="' + i + '"]'); if (li) { li.classList.add("is-hint"); setTimeout(function () { li.classList.remove("is-hint"); }, 3200); }
    var first = round.words[i].display.charAt(0).toUpperCase();
    hintEl.textContent = t("ws.hintHelp", { l: first }); say(t("ws.hintHelp", { l: first }));
    setTimeout(function () { clearMarks("is-hint"); }, 3200); updateHud();
  }

  /* ——— le mot mystère ——— */
  function renderSlots(show) {
    mmSlots.innerHTML = "";
    round.mystery.split("").forEach(function (ch, i) { var s = document.createElement("span"); s.className = "mm-slot"; s.textContent = show ? ch.toUpperCase() : ""; s.style.setProperty("--i", String(i)); mmSlots.appendChild(s); });
    mmSlots.setAttribute("aria-label", show ? round.mysteryDisplay : t("mm.slotsAria", { n: round.mystery.length }));
  }
  function allFound() {
    if (state !== "playing") return;
    round.left.forEach(function (i, k) { var c = round.cells[i]; c.el.classList.add("is-left"); c.el.style.setProperty("--k", String(k)); });
    mmBox.classList.add("is-ready"); mmMsg.textContent = t("mm.allFound", { n: round.mystery.length }); hintEl.textContent = t("mm.allFound", { n: round.mystery.length }); say(t("mm.allFound", { n: round.mystery.length }));
    try { mmInput.focus({ preventScroll: true }); mmBox.scrollIntoView({ block: "nearest", behavior: reduced() ? "auto" : "smooth" }); } catch (e) {}
  }
  function onGuess(e) {
    if (e) e.preventDefault(); if (state !== "playing" || !round) return;
    var v = norm(mmInput.value || "");
    if (!v) { mmMsg.textContent = t("mm.typeFirst"); return; }
    if (v === round.mystery) { win(); return; }
    round.tries++; mmBox.classList.remove("is-nope"); void mmBox.offsetWidth; mmBox.classList.add("is-nope");
    mmMsg.textContent = round.foundCount >= round.words.length ? t("mm.wrongRead") : t("mm.wrongEarly"); say(mmMsg.textContent);
  }
  function onReveal() {
    if (state !== "playing" || !round) return;
    hints += 2; round.revealed = true; mmInput.value = round.mysteryDisplay; win();
  }

  /* ——— victoire ——— */
  function bubbles() {
    if (!celebrate) return;
    celebrate.innerHTML = ""; stage.classList.add("is-glow");
    if (reduced()) return;
    var N = window.innerWidth < 520 ? 22 : 34, h = stage.clientHeight || 360;
    for (var i = 0; i < N; i++) {
      var b = document.createElement("i"); b.className = "ws-bubble" + (i % 4 === 0 ? " is-spark" : "");
      b.style.setProperty("--x", (4 + Math.random() * 92).toFixed(1) + "%"); b.style.setProperty("--s", (i % 4 === 0 ? 6 + Math.random() * 6 : 12 + Math.random() * 26).toFixed(1) + "px");
      b.style.setProperty("--d", (Math.random() * 1.1).toFixed(2) + "s"); b.style.setProperty("--t", (2.8 + Math.random() * 2.2).toFixed(2) + "s");
      b.style.setProperty("--dx", (Math.random() * 70 - 35).toFixed(0) + "px"); b.style.setProperty("--h", Math.round(h * (0.55 + Math.random() * 0.6)) + "px");
      celebrate.appendChild(b);
    }
    setTimeout(function () { if (celebrate) celebrate.innerHTML = ""; }, 6200);
  }
  function win() {
    if (state !== "playing") return;
    state = "won"; stopTimer(); updateHud(); stage.classList.add("is-won");
    if (actions) actions.hidden = true;
    mystery.classList.add("is-revealed"); songTitleEl.textContent = round.song.title;
    renderSlots(true); mmBox.classList.add("is-solved"); mmBox.classList.remove("is-ready"); mmInput.disabled = true; mmReveal.disabled = true;
    mmMsg.textContent = t(round.revealed ? "mm.revealedMsg" : "mm.solvedMsg", { word: round.mysteryDisplay });
    round.cells.forEach(function (c) { c.el.style.setProperty("--d", ((c.x + c.y) * 45) + "ms"); });
    gridEl.classList.add("is-luminous");
    var stars = hints === 0 && !round.tries ? 3 : hints <= 1 ? 2 : 1, rec = window.EdenStars ? window.EdenStars.record(GAME_ID, stars) : { session: stars, best: stars };
    if (window.EdenStars) {
      window.EdenStars.play(stars);                                    // même motif de victoire que les autres jeux
      window.EdenStars.render(starsBox, stars, { line: t("ws.star" + stars), detail: t("ws.starDetail", { hints: hints, time: fmt((Date.now() - startedAt) / 1000) }), session: rec });
    }
    bubbles(); hintEl.textContent = t("ws.hintWin"); say(t("mm.wonText", { word: round.mysteryDisplay, title: round.song.title }));
    if (againBtn) { againBtn.hidden = false; againBtn.textContent = t("ws.again"); }
    playSong(round.song);
    try { stage.scrollIntoView({ block: "nearest", behavior: reduced() ? "auto" : "smooth" }); } catch (e) {}
  }
  function clearEmbed() { if (embedBox) { embedBox.innerHTML = ""; embedBox.hidden = true; } }
  function stopSong() {
    if (window.EdenFullSong) window.EdenFullSong.stop(audio); else try { audio.pause(); } catch (e) {}
    clearEmbed(); if (listenBtn) listenBtn.hidden = true; if (playerBox) playerBox.hidden = true;
  }
  function playSong(song) {
    if (!song || !playerBox) return;
    playerBox.hidden = false; if (nowEl) nowEl.textContent = t("ws.playing", { title: song.title });
    var F = window.EdenFullSong, same = audio && audio.getAttribute("data-id") === song.id;
    if (F && F.busy(audio) && !same && ownStarted) { F.stop(audio); clearEmbed(); }   // chanson d'une manche précédente de ce jeu : la nouvelle victoire la remplace
    else if (F && F.busy(audio) && !same) {                           // une autre chanson (autre page/lecteur) joue déjà : on ne la coupe pas, on propose
      if (listenBtn) { listenBtn.hidden = false; listenBtn.textContent = t("ws.listen", { title: song.title }); listenBtn.onclick = function () { listenBtn.hidden = true; F.stop(audio); startSong(song); ownStarted = true; }; }
      return;
    }
    if (F && F.busy(audio) && same) return;
    startSong(song); ownStarted = true;
  }
  function startSong(song) {
    var F = window.EdenFullSong;
    if (nowEl) nowEl.textContent = t("ws.playing", { title: song.title });
    playerBox.hidden = false;
    if (window.EdenSongPick && song.id) window.EdenSongPick.record(song.id);
    if (song.audio_url || song.audio_url_aac) {
      clearEmbed(); audio.hidden = false;
      if (F) F.play(audio, { id: song.id, audio: song.audio_url, aac: song.audio_url_aac });
      else { audio.src = song.audio_url; try { audio.currentTime = 0; } catch (e) {} var p = audio.play(); if (p && p.catch) p.catch(function () {}); }
    } else if (song.embed_url) {
      audio.hidden = true; if (F) F.embed(embedBox, { id: song.id, embed: song.embed_url, title: song.title });
    }
  }

  /* ——— cycle ——— */
  function showOverlay(show) { if (overlay) overlay.classList.toggle("is-hidden", !show); }
  function renderLevels() {
    levelsEl.innerHTML = "";
    levels().forEach(function (lv) {
      var b = document.createElement("button"); b.type = "button"; b.className = "ws-level"; b.setAttribute("data-level", lv.id);
      b.setAttribute("aria-pressed", lv.id === levelId ? "true" : "false"); b.textContent = t("mm.level." + lv.id, { n: lv.N });
      b.addEventListener("click", function () { setLevel(lv.id); }); levelsEl.appendChild(b);
    });
  }
  function setLevel(id) {
    levelId = id; try { store("localStorage").setItem("eden-mm-level", id); } catch (e) {}
    renderLevels();
    if (state === "playing" && round && !round.foundCount && !startedAt) startGame(); else if (state !== "idle") hintEl.textContent = t("ws.levelNext");
  }
  function startGame() {
    if (window.EdenStars && window.EdenStars.unlock) window.EdenStars.unlock();
    if (window.EdenStars) window.EdenStars.clear(starsBox);
    var list = playable();
    if (!list.length) { card.hidden = true; emptyBox.hidden = false; return; }
    card.hidden = false; emptyBox.hidden = true;
    var lv = level(), lang = siteLang(), N = gridSize(lv), song = null, sw = null, built = null, mys = "", tried = {};
    for (var tries = 0; tries < 6 && !built; tries++) {                // une chanson, un mot mystère, une grille exacte (sinon on change de chanson)
      song = pickSong(list.filter(function (x) { return !tried[x.id]; }).length ? list.filter(function (x) { return !tried[x.id]; }) : list, lang); tried[song.id] = 1;
      sw = songWords(song); mys = sw.mystery[rint(sw.mystery.length)];
      built = buildMystery(sw.words, mys, N, lv.dirs, lv.minWords || 6);
    }
    if (!built) { hintEl.textContent = t("ws.loadError"); return; }
    var words = built.placements.map(function (p) { return { n: p.n, display: p.display }; }).sort(function (a, b) { return a.n < b.n ? -1 : 1; });
    round = { song: song, words: words, N: N, g: built.g, placements: built.placements, left: built.left, mystery: mys, mysteryDisplay: sw.forms[mys] || mys, tries: 0, revealed: false,
      done: [], foundCount: 0, cells: [], level: lv.id };
    words.forEach(function () { round.done.push(false); });
    hints = 0; startedAt = 0; stopTimer(); drag = null; tapStart = null; state = "playing";
    writeRecent(lang, song.id);
    stage.classList.remove("is-glow", "is-won"); if (celebrate) celebrate.innerHTML = "";
    mystery.classList.remove("is-revealed"); songTitleEl.textContent = t("ws.mysteryTitle"); coverBox.innerHTML = ""; coverBox.classList.remove("ct-failed");
    if (window.EdenThumb) window.EdenThumb.fill(coverBox, song.cover_url, "?"); else { var im = document.createElement("img"); im.alt = ""; im.src = song.cover_url; coverBox.appendChild(im); }
    mystery.hidden = false; board.hidden = false; gridEl.classList.remove("is-luminous");
    renderGrid(); renderWords(); sizeCells();
    mmBox.hidden = false; mmBox.classList.remove("is-ready", "is-solved", "is-nope"); mmInput.value = ""; mmInput.disabled = false; mmReveal.disabled = false; renderSlots(false);
    mmMsg.textContent = t("mm.boxIntro", { n: mys.length });
    showOverlay(false); if (startBtn) startBtn.hidden = true; if (againBtn) againBtn.hidden = true; if (actions) actions.hidden = false;
    hintEl.textContent = t("ws.hintPlay"); say(t("ws.setLine", { n: words.length }));
    updateHud();
    try {                                                              // toute la grille doit être visible sans défiler pendant le jeu
      var gr = gridEl.getBoundingClientRect();
      if (gr.top < 60 || gr.bottom > window.innerHeight - 10) gridEl.scrollIntoView({ block: "center", behavior: reduced() ? "auto" : "smooth" });
    } catch (e) {}
  }
  function showWelcome() {
    state = "idle"; round = null; stopTimer(); startedAt = 0; drag = null; tapStart = null;
    showOverlay(true);
    overlayKicker.textContent = t("ws.welcomeKicker"); overlayTitle.textContent = t("ws.welcomeTitle"); overlayText.textContent = t("ws.welcomeText");
    startBtn.hidden = false; startBtn.textContent = t("ws.start"); againBtn.hidden = true; if (actions) actions.hidden = true;
    board.hidden = true; mystery.hidden = true; gridEl.innerHTML = ""; wordsEl.innerHTML = ""; if (mmBox) mmBox.hidden = true;
    stage.classList.remove("is-glow", "is-won"); if (celebrate) celebrate.innerHTML = "";
    if (window.EdenStars) window.EdenStars.clear(starsBox);
    hintEl.textContent = t("ws.hintIdle"); renderLevels(); updateHud();
  }
  function bind() {
    try { var sv = store("localStorage").getItem("eden-mm-level"); if (sv) levelId = sv; showTime = store("localStorage").getItem("eden-mm-timer") === "1"; } catch (e) {}
    if (cfg && (!levelId || !levels().some(function (l) { return l.id === levelId; }))) levelId = cfg.defaultLevel || (cfg.levels[0] && cfg.levels[0].id);
    mmForm.addEventListener("submit", onGuess); mmReveal.addEventListener("click", onReveal);
    startBtn.addEventListener("click", startGame); againBtn.addEventListener("click", startGame); newBtn.addEventListener("click", startGame); helpBtn.addEventListener("click", onHelp);
    if (timerBtn) timerBtn.addEventListener("click", function () { showTime = !showTime; try { store("localStorage").setItem("eden-mm-timer", showTime ? "1" : "0"); } catch (e) {} updateHud(); });
    gridEl.addEventListener("pointerdown", onPointerDown); gridEl.addEventListener("pointermove", onPointerMove);
    gridEl.addEventListener("pointerup", onPointerUp); gridEl.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("resize", function () { sizeCells(); });
    if (window.EdenI18n && window.EdenI18n.onChange) window.EdenI18n.onChange(function () { stopSong(); songCache = {}; init(); });   // langue changée : on arrête la chanson, nouveau corpus
    var toggle = $("nav-toggle"), links = $("nav-links");
    if (toggle && links) toggle.addEventListener("click", function () { var open = links.classList.toggle("is-open"); toggle.setAttribute("aria-expanded", open ? "true" : "false"); });
    init();
  }
  function init() {
    if (loadFailed || !cfg) { showWelcome(); hintEl.textContent = t("ws.loadError"); startBtn.hidden = true; return; }
    if (!playable().length) { card.hidden = true; emptyBox.hidden = false; return; }
    card.hidden = false; emptyBox.hidden = true; showWelcome();
  }

  /* vérification (tests) : chaque mot listé est bien posé tel quel dans la grille, et se retrouve en la lisant */
  function verify() {                                        // tests : chaque mot posé tel quel, toutes les cases couvertes sauf celles du mot mystère, lues dans l'ordre
    if (!round) return null;
    var N = round.N, cov = {}, res = { N: N, mystery: round.mystery, placed: [] };
    round.placements.forEach(function (p) { var s = ""; for (var i = 0; i < p.n.length; i++) { var k = (p.y + p.dy * i) * N + p.x + p.dx * i; s += round.g[k]; cov[k] = 1; } res.placed.push(s === p.n); });
    var left = ""; for (var k = 0; k < N * N; k++) if (!cov[k]) left += round.g[k];
    var toks = (lyricText(round.song.id).match(/[A-Za-zÀ-ÿŒœ']+/g) || []).join("'").split("'").map(norm);
    res.leftover = left; res.inLyrics = round.words.every(function (w) { return toks.indexOf(w.n) >= 0; }) && toks.indexOf(round.mystery) >= 0;
    res.ok = res.placed.every(Boolean) && left === round.mystery && res.inLyrics; return res;
  }
  window.EdenMystery = {
    verify: verify,
    state: function () { return round ? { state: state, level: round.level, N: round.N, song: { id: round.song.id, title: round.song.title, lang: round.song.lang }, words: round.words.map(function (w) { return { n: w.n, display: w.display }; }),
      placements: round.placements, found: round.foundCount, hints: hints, mystery: round.mystery } : { state: state }; },
    songs: function () { return playable().map(function (s) { return { id: s.id, lang: s.lang, title: s.title }; }); }
  };
  load().then(function () { if (window.EdenSongPick && window.EdenSongPick.ready && window.EdenSongPick.ready.then) return window.EdenSongPick.ready; }).then(bind, bind);
})();
