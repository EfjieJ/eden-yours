/* Eden Yours — Mots croisés / Crossword.
   Une petite grille par manche, construite à partir des VRAIES paroles d'UNE chanson de la langue de la page (data/lyrics-sources.json ; mots-outils exclus via
   data/wordsearch.json). Chaque définition est honnête : le vers où le mot apparaît, avec le mot remplacé par « ___ », plus le nombre de lettres. Rien n'est inventé.
   La grille est générée à chaque manche (mots entrecroisés, aucune lettre collée par accident), puis vérifiée (croisements cohérents, chaque mot lisible tel quel).
   Saisie : clavier physique, ou clavier à l'écran (AZERTY/QWERTY) sur les écrans tactiles ; avance automatique, toucher deux fois une case = changer de sens.
   À la fin : la grille s'illumine en vague, étoiles + bulles dorées, et la chanson d'où viennent les mots joue EN ENTIER (EdenFullSong / embed Suno). */
(function () {
  "use strict";
  var GAME_ID = "crossword";
  var $ = function (id) { return document.getElementById(id); };
  var gridEl = $("cw-grid"), acrossEl = $("cw-across"), downEl = $("cw-down"), clueBar = $("cw-cluebar"), kbd = $("cw-kbd"), overlay = $("cw-overlay"), startBtn = $("cw-start"),
    againBtn = $("cw-again"), statusEl = $("cw-status"), scoreEl = $("cw-score"), hintEl = $("cw-hint"), liveEl = $("cw-live"), starsBox = $("cw-stars"), playerBox = $("cw-player"),
    nowEl = $("cw-now-playing"), embedBox = $("cw-embed"), audio = $("cw-audio"), listenBtn = $("cw-listen"), actions = $("cw-actions"), checkBtn = $("cw-check"), helpBtn = $("cw-help"),
    newBtn = $("cw-new"), emptyBox = $("cw-empty"), card = $("cw-card"), stage = $("cw-stage"), celebrate = $("cw-celebrate"), levelsEl = $("cw-levels"), board = $("cw-board"),
    mystery = $("cw-mystery"), coverBox = $("cw-cover"), songTitleEl = $("cw-songtitle");
  var cfg = null, tracks = [], lyrics = {}, loadFailed = false, state = "idle", levelId = null, round = null, AC = null, ownStarted = false, touch = false;

  function t(key, vars) { return window.EdenI18n && window.EdenI18n.t ? window.EdenI18n.t(key, vars) : key; }
  function siteLang() { return window.EdenSongPick ? window.EdenSongPick.lang() : (document.documentElement.lang === "en" ? "en" : "fr"); }
  function reduced() { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } }
  function say(m) { if (liveEl) { liveEl.textContent = ""; setTimeout(function () { liveEl.textContent = m; }, 30); } }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function rint(n) { return Math.floor(Math.random() * n); }
  function norm(w) { return String(w).toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, ""); }
  function ls() { try { return window.localStorage; } catch (e) { return null; } }

  /* sons */
  function ctxAudio() { try { if (!AC) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AC = new C(); } if (AC.state === "suspended" && AC.resume) (function (r) { if (r && r.catch) r.catch(function () {}); })(AC.resume()); return AC; } catch (e) { return null; } }
  function tone(freqs, gain, step, dur) {
    try { var c = ctxAudio(); if (!c) return; var now = c.currentTime + 0.01;
      freqs.forEach(function (f, i) { var o = c.createOscillator(), g = c.createGain(); o.type = "sine"; o.frequency.value = f; var t0 = now + i * step;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.05); });
    } catch (e) {}
  }
  function wordChime() { tone([523.25, 659.25, 783.99], 0.09, 0.07, 0.45); }

  /* données */
  function getJSON(u) { return fetch(u, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }
  function load() {
    return Promise.all([getJSON("data/mots-croises.json"), getJSON("data/wordsearch.json"), getJSON("tracks.json"), getJSON("data/lyrics-sources.json")])
      .then(function (r) { cfg = r[0]; cfg.ws = r[1]; tracks = r[2].tracks || r[2] || []; lyrics = r[3] || {}; }).catch(function () { loadFailed = true; });
  }
  function levels() { return (cfg && cfg.levels) || []; }
  function level() { var L = levels(); for (var i = 0; i < L.length; i++) if (L[i].id === levelId) return L[i]; return L[0]; }
  function lyricText(id) { var l = lyrics[id]; if (!l || !l.lyrics) return ""; return String(l.lyrics).split(/\n\s*---/)[0]; }
  function lyricLines(id) { return lyricText(id).split(/\n/).map(function (s) { return s.trim(); }).filter(function (s) { return s && !/^\[.*\]$/.test(s) && !/^\(.*\)$/.test(s); }); }
  var cache = {};
  function songWords(tr) {                                    // mots des paroles + le vers (réel) où chacun apparaît
    if (cache[tr.id]) return cache[tr.id];
    var stop = {}; ((cfg.ws.stop && cfg.ws.stop[tr.lang]) || []).forEach(function (w) { stop[norm(w)] = 1; });
    var out = [], seen = {}, lines = lyricLines(tr.id);
    lines.forEach(function (line) {
      if (line.length > (cfg.maxLine || 120)) return;
      (line.match(/[A-Za-zÀ-ÿŒœ]+/g) || []).forEach(function (tok) {
        var n = norm(tok); if (n.length < cfg.minLen || n.length > cfg.maxLen || stop[n] || seen[n]) return;
        seen[n] = 1; out.push({ n: n, display: tok.toLowerCase(), line: line });
      });
    });
    return (cache[tr.id] = out);
  }
  function clueFor(w) {                                       // le vers, avec CHAQUE occurrence du mot remplacée par « ___ »
    return w.line.replace(/[A-Za-zÀ-ÿŒœ]+/g, function (tok) { return norm(tok) === w.n ? "___" : tok; });
  }
  function playable() {
    if (!cfg) return [];
    var lang = siteLang(), list = window.EdenSongPick ? window.EdenSongPick.forLang(tracks, lang) : tracks.filter(function (x) { return x.lang === lang; });
    return list.filter(function (tr) { return tr.lang === lang && tr.cover_url && lyricText(tr.id) && songWords(tr).length >= (cfg.minPool || 20); });
  }
  function readRecent(l) { try { var o = JSON.parse(ls().getItem(cfg.recentStorageKey) || "{}"); return Array.isArray(o[l]) ? o[l] : []; } catch (e) { return []; } }
  function writeRecent(l, id) { try { var o = JSON.parse(ls().getItem(cfg.recentStorageKey) || "{}"); var a = (o[l] || []).filter(function (x) { return x !== id; }); a.push(id); o[l] = a.slice(-4); ls().setItem(cfg.recentStorageKey, JSON.stringify(o)); } catch (e) {} }
  function pickSong(list, l) {
    var rec = readRecent(l), avoid = rec.slice(-Math.min(3, list.length - 1)), pool = list.filter(function (s) { return avoid.indexOf(s.id) < 0; }); if (!pool.length) pool = list;
    return window.EdenSongPick ? window.EdenSongPick.pick(pool, { record: false }) : pool[rint(pool.length)];
  }

  /* ——— génération : mots entrecroisés ——— */
  function key(x, y) { return x + "," + y; }
  function canPlace(G, w, x, y, d) {                           // d = 0 horizontal, 1 vertical
    var dx = d ? 0 : 1, dy = d ? 1 : 0, L = w.length, cross = 0;
    if (G[key(x - dx, y - dy)] || G[key(x + dx * L, y + dy * L)]) return -1;
    for (var i = 0; i < L; i++) {
      var cx = x + dx * i, cy = y + dy * i, c = G[key(cx, cy)];
      if (c) { if (c.ch !== w[i] || c.dirs[d]) return -1; cross++; }
      else if (G[key(cx + dy, cy + dx)] || G[key(cx - dy, cy - dx)]) return -1;   // voisins perpendiculaires vides
    }
    return cross;
  }
  function put(G, w, x, y, d) { var dx = d ? 0 : 1, dy = d ? 1 : 0; for (var i = 0; i < w.length; i++) { var k = key(x + dx * i, y + dy * i); if (!G[k]) G[k] = { ch: w[i], dirs: [false, false] }; G[k].dirs[d] = true; } }
  function bounds(pls) { var b = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 }; pls.forEach(function (p) { var L = p.n.length; b.x0 = Math.min(b.x0, p.x); b.y0 = Math.min(b.y0, p.y); b.x1 = Math.max(b.x1, p.x + (p.d ? 0 : L - 1)); b.y1 = Math.max(b.y1, p.y + (p.d ? L - 1 : 0)); }); return b; }
  function generate(pool, n, maxW, maxH) {
    var best = null;
    for (var at = 0; at < 160; at++) {
      var cand = shuffle(pool.slice()).sort(function (a, b) { return (b.n.length - a.n.length) + (Math.random() - 0.5) * 3; });
      var G = {}, pls = [], first = cand[0];
      if (first.n.length > maxW) continue;
      put(G, first.n, 0, 0, 0); pls.push({ n: first.n, w: first, x: 0, y: 0, d: 0 });
      for (var ci = 1; ci < cand.length && pls.length < n; ci++) {
        var w = cand[ci], opts = [];
        if (pls.some(function (p) { return p.n.indexOf(w.n) >= 0 || w.n.indexOf(p.n) >= 0; })) continue;
        pls.forEach(function (p) {
          for (var i = 0; i < p.n.length; i++) for (var j = 0; j < w.n.length; j++) if (p.n[i] === w.n[j]) {
            var d = 1 - p.d, px = p.x + (p.d ? 0 : i), py = p.y + (p.d ? i : 0), x = px - (d ? 0 : j), y = py - (d ? j : 0), c = canPlace(G, w.n, x, y, d);
            if (c > 0) { var b = bounds(pls.concat([{ n: w.n, x: x, y: y, d: d }])); if (b.x1 - b.x0 + 1 <= maxW && b.y1 - b.y0 + 1 <= maxH) opts.push({ x: x, y: y, d: d, c: c, area: (b.x1 - b.x0 + 1) * (b.y1 - b.y0 + 1) }); }
          }
        });
        if (!opts.length) continue;
        opts.sort(function (a, b) { return (b.c - a.c) || (a.area - b.area) || (Math.random() - 0.5); });
        var o = opts[0]; put(G, w.n, o.x, o.y, o.d); pls.push({ n: w.n, w: w, x: o.x, y: o.y, d: o.d });
      }
      if (pls.length >= n) {
        var bb = bounds(pls), sc = (bb.x1 - bb.x0 + 1) * (bb.y1 - bb.y0 + 1) - Object.keys(G).filter(function (k) { return G[k].dirs[0] && G[k].dirs[1]; }).length * 6;
        if (!best || sc < best.sc) best = { pls: pls, sc: sc, b: bb };
        if (at > 40 && best) break;
      }
    }
    if (!best) return null;
    var b = best.b, W = b.x1 - b.x0 + 1, H = b.y1 - b.y0 + 1, cells = {};
    best.pls.forEach(function (p) { p.x -= b.x0; p.y -= b.y0; for (var i = 0; i < p.n.length; i++) { var x = p.x + (p.d ? 0 : i), y = p.y + (p.d ? i : 0); cells[key(x, y)] = p.n[i]; } });
    // numérotation classique : de gauche à droite, de haut en bas
    var num = 0, numAt = {};
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var starts = best.pls.filter(function (p) { return p.x === x && p.y === y; }); if (starts.length) { num++; numAt[key(x, y)] = num; starts.forEach(function (p) { p.num = num; }); }
    }
    return { W: W, H: H, cells: cells, words: best.pls, numAt: numAt };
  }

  /* ——— rendu ——— */
  function cellOf(x, y) { return round.el[key(x, y)]; }
  function wordCells(p) { var out = []; for (var i = 0; i < p.n.length; i++) out.push({ x: p.x + (p.d ? 0 : i), y: p.y + (p.d ? i : 0) }); return out; }
  function wordAt(x, y, d) { return round.words.filter(function (p) { return p.d === d && wordCells(p).some(function (c) { return c.x === x && c.y === y; }); })[0] || null; }
  function render() {
    var R = round; gridEl.innerHTML = ""; gridEl.style.setProperty("--w", String(R.W)); gridEl.style.setProperty("--h", String(R.H)); R.el = {}; R.val = {};
    for (var y = 0; y < R.H; y++) for (var x = 0; x < R.W; x++) {
      var k = key(x, y);
      if (!R.cells[k]) { var b = document.createElement("span"); b.className = "cw-block"; b.setAttribute("aria-hidden", "true"); gridEl.appendChild(b); continue; }
      var wrap = document.createElement("span"); wrap.className = "cw-cell"; wrap.style.setProperty("--d", ((x + y) * 55) + "ms");
      if (R.numAt[k]) { var n = document.createElement("span"); n.className = "cw-num"; n.textContent = R.numAt[k]; n.setAttribute("aria-hidden", "true"); wrap.appendChild(n); }
      var inp = document.createElement("input"); inp.type = "text"; inp.className = "cw-in"; inp.maxLength = 2; inp.autocomplete = "off"; inp.spellcheck = false;
      inp.setAttribute("autocapitalize", "characters"); inp.setAttribute("autocorrect", "off"); if (touch) { inp.setAttribute("inputmode", "none"); inp.readOnly = false; }
      inp.setAttribute("data-x", String(x)); inp.setAttribute("data-y", String(y)); inp.setAttribute("aria-label", t("cw.cellAria", { r: y + 1, c: x + 1 }));
      inp.addEventListener("focus", onFocus); inp.addEventListener("pointerdown", onCellDown); inp.addEventListener("input", onInput); inp.addEventListener("keydown", onKey);
      wrap.appendChild(inp); gridEl.appendChild(wrap); R.el[k] = inp; R.val[k] = "";
    }
    [[acrossEl, 0], [downEl, 1]].forEach(function (pair) {
      var ul = pair[0]; ul.innerHTML = "";
      R.words.filter(function (p) { return p.d === pair[1]; }).sort(function (a, b) { return a.num - b.num; }).forEach(function (p) {
        var li = document.createElement("li"), btn = document.createElement("button"); btn.type = "button"; btn.className = "cw-clue"; p.li = li;
        btn.innerHTML = '<span class="cw-cnum"></span> <span class="cw-ctext"></span> <span class="cw-clen"></span>';
        btn.querySelector(".cw-cnum").textContent = p.num + "."; btn.querySelector(".cw-ctext").textContent = "« " + clueFor(p.w) + " »"; btn.querySelector(".cw-clen").textContent = "(" + p.n.length + ")";
        btn.addEventListener("click", function () { setActive(p.x, p.y, p.d, true); }); li.appendChild(btn); ul.appendChild(li);
      });
    });
  }
  function sizeGrid() {
    if (!round) return; var w = Math.min(board.clientWidth || 320, 560), cs = Math.floor(Math.min(56, (w - 4) / round.W));
    gridEl.style.setProperty("--cell", cs + "px");
  }
  function setActive(x, y, d, focus) {
    var R = round; if (!R) return;
    if (!wordAt(x, y, d)) d = 1 - d;
    R.cur = { x: x, y: y, d: d }; var p = wordAt(x, y, d); R.curWord = p;
    Object.keys(R.el).forEach(function (k) { R.el[k].parentNode.classList.remove("is-word", "is-cur"); });
    if (p) wordCells(p).forEach(function (c) { cellOf(c.x, c.y).parentNode.classList.add("is-word"); });
    cellOf(x, y).parentNode.classList.add("is-cur");
    R.words.forEach(function (q) { if (q.li) q.li.classList.toggle("is-active", q === p); });
    if (p) { clueBar.innerHTML = ""; var s = document.createElement("strong"); s.textContent = p.num + (p.d ? t("cw.downShort") : t("cw.acrossShort")) + " · "; clueBar.appendChild(s); clueBar.appendChild(document.createTextNode("« " + clueFor(p.w) + " » (" + p.n.length + ")")); }
    if (focus) { R.skipFocus = true; try { cellOf(x, y).focus({ preventScroll: touch }); } catch (e) {} R.skipFocus = false; }
  }
  function onFocus(e) { if (!round || round.skipFocus) return; var x = +e.target.getAttribute("data-x"), y = +e.target.getAttribute("data-y"); var d = round.cur ? round.cur.d : 0; setActive(x, y, d, false); }
  function onCellDown(e) {
    if (!round || state !== "playing") return;
    if (window.EdenStars && window.EdenStars.unlock) window.EdenStars.unlock();
    var x = +e.target.getAttribute("data-x"), y = +e.target.getAttribute("data-y"), c = round.cur;
    if (c && c.x === x && c.y === y) { e.preventDefault(); setActive(x, y, 1 - c.d, true); return; }   // toucher deux fois = changer de sens
    if (touch) { e.preventDefault(); setActive(x, y, c ? c.d : 0, true); }
  }
  function setVal(x, y, ch) {
    var k = key(x, y), el = round.el[k]; round.val[k] = ch; el.value = ch.toUpperCase(); el.parentNode.classList.remove("is-wrong");
  }
  function step(dir) {                                        // avance (+1) ou recule (-1) dans le mot courant
    var c = round.cur, p = round.curWord; if (!p) return;
    var cells = wordCells(p), i = cells.findIndex(function (q) { return q.x === c.x && q.y === c.y; }) + dir;
    if (i >= 0 && i < cells.length) setActive(cells[i].x, cells[i].y, c.d, true);
  }
  function typeChar(ch) {
    if (state !== "playing" || !round.cur) return;
    var c = round.cur; if (round.el[key(c.x, c.y)].parentNode.classList.contains("is-given")) { step(1); return; }
    setVal(c.x, c.y, ch);
    var p = round.curWord; afterChange();
    if (state !== "playing") return;
    if (p) { var cells = wordCells(p), i = cells.findIndex(function (q) { return q.x === c.x && q.y === c.y; });
      if (i + 1 < cells.length) setActive(cells[i + 1].x, cells[i + 1].y, c.d, true);
    }
  }
  function erase() {
    if (state !== "playing" || !round.cur) return;
    var c = round.cur, k = key(c.x, c.y);
    if (round.val[k] && !round.el[k].parentNode.classList.contains("is-given")) { setVal(c.x, c.y, ""); return; }
    step(-1); var c2 = round.cur, k2 = key(c2.x, c2.y); if (!round.el[k2].parentNode.classList.contains("is-given")) setVal(c2.x, c2.y, "");
  }
  function onInput(e) {
    var v = norm(e.target.value || ""), x = +e.target.getAttribute("data-x"), y = +e.target.getAttribute("data-y");
    if (!round.cur || round.cur.x !== x || round.cur.y !== y) setActive(x, y, round.cur ? round.cur.d : 0, false);
    if (!v) { e.target.value = (round.val[key(x, y)] || "").toUpperCase(); return; }
    typeChar(v.charAt(v.length - 1));
  }
  function onKey(e) {
    if (!round) return; var c = round.cur; if (!c) return;
    if (e.key === "Backspace") { e.preventDefault(); erase(); return; }
    var mv = { ArrowRight: [1, 0, 0], ArrowLeft: [-1, 0, 0], ArrowDown: [0, 1, 1], ArrowUp: [0, -1, 1] }[e.key];
    if (mv) { e.preventDefault(); if (c.d !== mv[2] && wordAt(c.x, c.y, mv[2])) { setActive(c.x, c.y, mv[2], true); return; }
      var nx = c.x + mv[0], ny = c.y + mv[1]; while (nx >= 0 && ny >= 0 && nx < round.W && ny < round.H && !round.el[key(nx, ny)]) { nx += mv[0]; ny += mv[1]; }
      if (round.el[key(nx, ny)]) setActive(nx, ny, mv[2], true); return; }
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); setActive(c.x, c.y, 1 - c.d, true); return; }
    if (e.key === "Tab") { e.preventDefault(); nextWord(e.shiftKey ? -1 : 1); return; }
    if (e.key.length === 1 && /[a-zA-ZÀ-ÿ]/.test(e.key) && !e.ctrlKey && !e.metaKey) { e.preventDefault(); var v = norm(e.key); if (v) typeChar(v); }
  }
  function nextWord(dir) {
    var list = round.words.slice().sort(function (a, b) { return (a.d - b.d) || (a.num - b.num); }), i = list.indexOf(round.curWord), p = list[(i + dir + list.length) % list.length];
    var cells = wordCells(p), firstEmpty = cells.filter(function (q) { return !round.val[key(q.x, q.y)]; })[0] || cells[0]; setActive(firstEmpty.x, firstEmpty.y, p.d, true);
  }
  function renderKbd() {
    kbd.innerHTML = ""; if (!touch) { kbd.hidden = true; return; } kbd.hidden = false;
    var rows = siteLang() === "fr" ? ["AZERTYUIOP", "QSDFGHJKLM", "WXCVBN"] : ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
    rows.forEach(function (r, ri) {
      var row = document.createElement("div"); row.className = "cw-krow";
      if (ri === 2) { var tg = document.createElement("button"); tg.type = "button"; tg.className = "cw-key cw-key-wide"; tg.textContent = "⇅"; tg.setAttribute("aria-label", t("cw.toggleDir")); tg.addEventListener("click", function () { if (round && round.cur) setActive(round.cur.x, round.cur.y, 1 - round.cur.d, false); }); row.appendChild(tg); }
      r.split("").forEach(function (ch) { var b = document.createElement("button"); b.type = "button"; b.className = "cw-key"; b.textContent = ch; b.addEventListener("click", function () { typeChar(ch.toLowerCase()); }); row.appendChild(b); });
      if (ri === 2) { var del = document.createElement("button"); del.type = "button"; del.className = "cw-key cw-key-wide"; del.textContent = "⌫"; del.setAttribute("aria-label", t("cw.erase")); del.addEventListener("click", erase); row.appendChild(del); }
      kbd.appendChild(row);
    });
    kbd.addEventListener("pointerdown", function (e) { e.preventDefault(); });   // le clavier à l'écran ne vole pas le focus
  }

  /* vérifs */
  function wordDone(p) { return wordCells(p).every(function (c) { return round.val[key(c.x, c.y)] === round.cells[key(c.x, c.y)]; }); }
  function afterChange() {
    var R = round, filled = 0, total = 0, ok = 0;
    Object.keys(R.cells).forEach(function (k) { total++; if (R.val[k]) filled++; if (R.val[k] === R.cells[k]) ok++; });
    R.words.forEach(function (p) { var d = wordDone(p); if (d && !p.done) { p.done = true; if (p.li) p.li.classList.add("is-done"); wordChime(); say(t("cw.wordDone", { n: p.num })); } else if (!d && p.done) { p.done = false; if (p.li) p.li.classList.remove("is-done"); } });
    R.filled = filled; R.total = total; updateHud();
    if (ok === total) { setTimeout(win, reduced() ? 50 : 350); return; }
    if (filled === total) { hintEl.textContent = t("cw.allFilledWrong"); say(t("cw.allFilledWrong")); }
  }
  function onCheck() {
    if (state !== "playing") return; var bad = 0; round.checks++;
    Object.keys(round.cells).forEach(function (k) { if (round.val[k] && round.val[k] !== round.cells[k]) { bad++; round.el[k].parentNode.classList.add("is-wrong"); } });
    hintEl.textContent = bad ? t("cw.checkBad", { n: bad }) : t("cw.checkOk"); say(hintEl.textContent); updateHud();
  }
  function onHelp() {
    if (state !== "playing" || !round.cur) return;
    var p = round.curWord, cells = p ? wordCells(p) : [round.cur], target = null;
    var c0 = round.cur; if (round.val[key(c0.x, c0.y)] !== round.cells[key(c0.x, c0.y)]) target = c0;
    if (!target) target = cells.filter(function (c) { return round.val[key(c.x, c.y)] !== round.cells[key(c.x, c.y)]; })[0];
    if (!target) { var open = Object.keys(round.cells).filter(function (k) { return round.val[k] !== round.cells[k]; }); if (!open.length) return; var pp = open[0].split(","); target = { x: +pp[0], y: +pp[1] }; }
    round.hints++; var k = key(target.x, target.y); setVal(target.x, target.y, round.cells[k]); round.el[k].parentNode.classList.add("is-given");
    setActive(target.x, target.y, round.cur.d, true); hintEl.textContent = t("cw.hintGiven"); afterChange();
  }
  function updateHud() {
    if (!round) { statusEl.textContent = t("cw.ready"); scoreEl.textContent = ""; return; }
    statusEl.textContent = t("cw.progress", { a: round.words.filter(function (p) { return p.done; }).length, b: round.words.length });
    scoreEl.textContent = t("cw.helps", { n: round.hints + round.checks });
    helpBtn.disabled = checkBtn.disabled = state !== "playing";
  }

  /* victoire */
  function bubbles() {
    celebrate.innerHTML = ""; stage.classList.add("is-glow"); if (reduced()) return;
    var N = window.innerWidth < 520 ? 22 : 34, h = stage.clientHeight || 400;
    for (var i = 0; i < N; i++) { var b = document.createElement("i"); b.className = "ws-bubble" + (i % 4 === 0 ? " is-spark" : "");
      b.style.setProperty("--x", (4 + Math.random() * 92).toFixed(1) + "%"); b.style.setProperty("--s", (i % 4 === 0 ? 6 + Math.random() * 6 : 12 + Math.random() * 26).toFixed(1) + "px");
      b.style.setProperty("--d", (Math.random() * 1.1).toFixed(2) + "s"); b.style.setProperty("--t", (2.8 + Math.random() * 2.2).toFixed(2) + "s"); b.style.setProperty("--dx", (Math.random() * 70 - 35).toFixed(0) + "px"); b.style.setProperty("--h", Math.round(h * (0.55 + Math.random() * 0.6)) + "px"); celebrate.appendChild(b); }
    setTimeout(function () { celebrate.innerHTML = ""; }, 6200);
  }
  function win() {
    if (state !== "playing") return; state = "won";
    Object.keys(round.el).forEach(function (k) { round.el[k].readOnly = true; round.el[k].parentNode.classList.remove("is-cur", "is-word", "is-wrong"); });
    gridEl.classList.add("is-luminous"); actions.hidden = true; kbd.hidden = true; stage.classList.add("is-won"); updateHud();
    mystery.classList.add("is-revealed"); songTitleEl.textContent = round.song.title; clueBar.textContent = t("cw.solved");
    var u = round.hints + round.checks, stars = u === 0 ? 3 : u <= 2 ? 2 : 1, rec = window.EdenStars ? window.EdenStars.record(GAME_ID, stars) : { session: stars };
    if (window.EdenStars) { window.EdenStars.play(stars); window.EdenStars.render(starsBox, stars, { line: t("cw.star" + stars), detail: t("cw.starDetail", { n: u }), session: rec }); }
    bubbles(); hintEl.textContent = t("cw.hintWin"); say(t("cw.wonText", { title: round.song.title })); againBtn.hidden = false;
    try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) {}
    playSong(round.song);
    try { stage.scrollIntoView({ block: "nearest", behavior: reduced() ? "auto" : "smooth" }); } catch (e) {}
  }
  function clearEmbed() { embedBox.innerHTML = ""; embedBox.hidden = true; }
  function stopSong() { if (window.EdenFullSong) window.EdenFullSong.stop(audio); else try { audio.pause(); } catch (e) {} clearEmbed(); listenBtn.hidden = true; playerBox.hidden = true; ownStarted = false; }
  function playSong(song) {
    playerBox.hidden = false; nowEl.textContent = t("cw.playing", { title: song.title });
    var F = window.EdenFullSong, same = audio.getAttribute("data-id") === song.id;
    if (F && F.busy(audio) && !same && ownStarted) { F.stop(audio); clearEmbed(); }
    else if (F && F.busy(audio) && !same) { listenBtn.hidden = false; listenBtn.textContent = t("cw.listen", { title: song.title }); listenBtn.onclick = function () { listenBtn.hidden = true; F.stop(audio); startSong(song); ownStarted = true; }; return; }
    if (F && F.busy(audio) && same) return;
    startSong(song); ownStarted = true;
  }
  function startSong(song) {
    var F = window.EdenFullSong; playerBox.hidden = false; nowEl.textContent = t("cw.playing", { title: song.title });
    if (window.EdenSongPick && song.id) window.EdenSongPick.record(song.id);
    if (song.audio_url || song.audio_url_aac) { clearEmbed(); audio.hidden = false; if (F) F.play(audio, { id: song.id, audio: song.audio_url, aac: song.audio_url_aac }); else { audio.src = song.audio_url; var p = audio.play(); if (p && p.catch) p.catch(function () {}); } }
    else if (song.embed_url) { audio.hidden = true; if (F) F.embed(embedBox, { id: song.id, embed: song.embed_url, title: song.title }); }
  }

  /* cycle */
  function renderLevels() {
    levelsEl.innerHTML = "";
    levels().forEach(function (lv) { var b = document.createElement("button"); b.type = "button"; b.className = "ws-level"; b.setAttribute("data-level", lv.id); b.setAttribute("aria-pressed", lv.id === levelId ? "true" : "false");
      b.textContent = t("cw.level." + lv.id, { n: lv.words }); b.addEventListener("click", function () { levelId = lv.id; try { ls().setItem("eden-cw-level", lv.id); } catch (e) {} renderLevels(); if (state === "playing" && round && !round.filled) startGame(); else if (state !== "idle") hintEl.textContent = t("cw.levelNext"); }); levelsEl.appendChild(b); });
  }
  function startGame() {
    if (window.EdenStars && window.EdenStars.unlock) window.EdenStars.unlock(); if (window.EdenStars) window.EdenStars.clear(starsBox);
    var list = playable(); if (!list.length) { card.hidden = true; emptyBox.hidden = false; return; }
    var lv = level(), lang = siteLang(), phone = window.innerWidth < 600, maxW = phone ? lv.maxW.phone : lv.maxW.desktop, built = null, song = null, tried = {};
    for (var k = 0; k < 6 && !built; k++) {
      var rest = list.filter(function (x) { return !tried[x.id]; }); song = pickSong(rest.length ? rest : list, lang); tried[song.id] = 1;
      built = generate(songWords(song), lv.words, maxW, lv.maxH) || generate(songWords(song), lv.words - 1, maxW, lv.maxH);
    }
    if (!built) { hintEl.textContent = t("cw.loadError"); return; }
    writeRecent(lang, song.id);
    round = { song: song, W: built.W, H: built.H, cells: built.cells, words: built.words, numAt: built.numAt, hints: 0, checks: 0, filled: 0, total: 0, level: lv.id };
    state = "playing"; stage.classList.remove("is-glow", "is-won"); celebrate.innerHTML = ""; gridEl.classList.remove("is-luminous");
    mystery.classList.remove("is-revealed"); songTitleEl.textContent = t("cw.mysteryTitle"); coverBox.innerHTML = "";
    if (window.EdenThumb) window.EdenThumb.fill(coverBox, song.cover_url, "?"); else { var im = document.createElement("img"); im.alt = ""; im.src = song.cover_url; coverBox.appendChild(im); }
    mystery.hidden = false; board.hidden = false; overlay.classList.add("is-hidden"); startBtn.hidden = true; againBtn.hidden = true; actions.hidden = false;
    render(); renderKbd(); sizeGrid(); afterChange();
    var first = round.words.slice().sort(function (a, b) { return a.num - b.num; })[0]; setActive(first.x, first.y, first.d, !touch);
    hintEl.textContent = touch ? t("cw.hintPlayTouch") : t("cw.hintPlay"); say(t("cw.setLine", { n: round.words.length }));
    try { var r = board.getBoundingClientRect(); if (r.top < 60 || r.top > window.innerHeight * 0.6) board.scrollIntoView({ block: "start", behavior: reduced() ? "auto" : "smooth" }); } catch (e) {}
  }
  function showWelcome() {
    state = "idle"; round = null; overlay.classList.remove("is-hidden"); startBtn.hidden = false; againBtn.hidden = true; actions.hidden = true; board.hidden = true; mystery.hidden = true; kbd.hidden = true;
    gridEl.innerHTML = ""; stage.classList.remove("is-glow", "is-won"); celebrate.innerHTML = ""; if (window.EdenStars) window.EdenStars.clear(starsBox); hintEl.textContent = t("cw.hintIdle"); renderLevels(); updateHud();
  }
  function init() { if (loadFailed || !cfg) { showWelcome(); hintEl.textContent = t("cw.loadError"); startBtn.hidden = true; return; } if (!playable().length) { card.hidden = true; emptyBox.hidden = false; return; } card.hidden = false; emptyBox.hidden = true; showWelcome(); }
  function bind() {
    try { touch = window.matchMedia("(pointer: coarse)").matches; } catch (e) {}
    try { var sv = ls().getItem("eden-cw-level"); if (sv) levelId = sv; } catch (e) {}
    if (cfg && (!levelId || !levels().some(function (l) { return l.id === levelId; }))) levelId = cfg.defaultLevel;
    startBtn.addEventListener("click", startGame); againBtn.addEventListener("click", startGame); newBtn.addEventListener("click", startGame); checkBtn.addEventListener("click", onCheck); helpBtn.addEventListener("click", onHelp);
    window.addEventListener("resize", sizeGrid);
    if (window.EdenI18n && window.EdenI18n.onChange) window.EdenI18n.onChange(function () { stopSong(); cache = {}; init(); });
    var toggle = $("nav-toggle"), links = $("nav-links"); if (toggle && links) toggle.addEventListener("click", function () { var o = links.classList.toggle("is-open"); toggle.setAttribute("aria-expanded", o ? "true" : "false"); });
    init();
  }
  function verify() {                                          // tests : croisements cohérents, chaque mot lisible, aucun mot collé, définitions = vers réels
    if (!round) return null; var R = round, ok = true, issues = [];
    R.words.forEach(function (p) { var s = wordCells(p).map(function (c) { return R.cells[key(c.x, c.y)]; }).join(""); if (s !== p.n) { ok = false; issues.push("read " + p.n); }
      var dx = p.d ? 0 : 1, dy = p.d ? 1 : 0; if (R.cells[key(p.x - dx, p.y - dy)] || R.cells[key(p.x + dx * p.n.length, p.y + dy * p.n.length)]) { ok = false; issues.push("ends " + p.n); }
      if (lyricLines(R.song.id).indexOf(p.w.line) < 0 || !(p.w.line.match(/[A-Za-zÀ-ÿŒœ]+/g) || []).some(function (tk) { return norm(tk) === p.n; })) { ok = false; issues.push("clue " + p.n); } });
    // toute suite de 2+ lettres (horizontale ou verticale) doit être un mot de la liste
    [0, 1].forEach(function (d) { for (var a = 0; a < (d ? R.W : R.H); a++) { var run = "", sx = 0, sy = 0;
      for (var b = 0; b <= (d ? R.H : R.W); b++) { var x = d ? a : b, y = d ? b : a, c = R.cells[key(x, y)];
        if (c) { if (!run) { sx = x; sy = y; } run += c; } else { if (run.length > 1 && !R.words.some(function (p) { return p.d === d && p.x === sx && p.y === sy && p.n === run; })) { ok = false; issues.push("stray " + run); } run = ""; } } } });
    return { ok: ok, issues: issues, W: R.W, H: R.H, n: R.words.length };
  }
  window.EdenCrossword = {
    verify: verify,
    state: function () { return round ? { state: state, level: round.level, W: round.W, H: round.H, song: { id: round.song.id, title: round.song.title, lang: round.song.lang },
      words: round.words.map(function (p) { return { n: p.n, x: p.x, y: p.y, d: p.d, num: p.num, clue: clueFor(p.w) }; }), hints: round.hints, checks: round.checks, touch: touch } : { state: state }; }
  };
  load().then(function () { if (window.EdenSongPick && window.EdenSongPick.ready && window.EdenSongPick.ready.then) return window.EdenSongPick.ready; }).then(bind, bind);
})();
