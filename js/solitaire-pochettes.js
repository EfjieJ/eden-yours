/* Eden Yours — Solitaire des pochettes (« Cercles de lumière »).
   Règles : chaque carte est une pochette de chanson ; chaque cercle (fondation) est un THÈME (data/categories.json). Touche (ou glisse) la carte du dessus d'une colonne
   vers le cercle de son thème (n'importe quel ordre), ou vers une colonne vide ; la pioche montre une carte à la fois. But : toutes les pochettes dans leur cercle.
   Toujours gagnable : une carte dont le thème est connu peut toujours aller dans son cercle dès qu'elle est découverte, et la pioche tourne sans fin ; chaque donne est
   quand même vérifiée par un solveur (solve) avant d'être proposée. Pas d'écran d'échec : annuler (illimité) et « redistribuer » (mélange doux de la pioche).
   À la victoire : son + étoiles (EdenStars), bulles dorées, puis une chanson joue EN ENTIER (celle de la dernière pochette posée — EdenFullSong / embed Suno). */
(function () {
  "use strict";

  var GAME_ID = "cover-solitaire";
  var $ = function (id) { return document.getElementById(id); };
  var boardEl = $("sp-board"), foundEl = $("sp-found"), stockBtn = $("sp-stock"), wasteEl = $("sp-waste"), tabEl = $("sp-tableau"), capEl = $("sp-caption"),
    overlay = $("sp-overlay"), startBtn = $("sp-start"), againBtn = $("sp-again"), statusEl = $("sp-status"), scoreEl = $("sp-score"), hintEl = $("sp-hint"),
    liveEl = $("sp-live"), starsBox = $("sp-stars"), playerBox = $("sp-player"), nowEl = $("sp-now-playing"), embedBox = $("sp-embed"), audio = $("sp-audio"),
    listenBtn = $("sp-listen"), actions = $("sp-actions"), undoBtn = $("sp-undo"), redealBtn = $("sp-redeal"), helpBtn = $("sp-help"), newBtn = $("sp-new"),
    emptyBox = $("sp-empty"), card = $("sp-card"), stage = $("sp-stage"), celebrate = $("sp-celebrate"), levelsEl = $("sp-levels"), frame = $("sp-frame");

  var cfg = null, cats = null, tracks = [], loadFailed = false;
  var mode = "idle";                     // idle | playing | won
  var levelId = null, G = null, undoStack = [], sel = null, dragging = null, AC = null, ownStarted = false, hintTimer = 0, startedAt = 0;

  function t(key, vars) { return window.EdenI18n && window.EdenI18n.t ? window.EdenI18n.t(key, vars) : key; }
  function siteLang() { return window.EdenSongPick ? window.EdenSongPick.lang() : (document.documentElement.lang === "en" ? "en" : "fr"); }
  function reduced() { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } }
  function say(msg) { if (liveEl) { liveEl.textContent = ""; setTimeout(function () { liveEl.textContent = msg; }, 30); } }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function rint(n) { return Math.floor(Math.random() * n); }
  function loc(o) { return (o && (o[siteLang()] || o.fr)) || ""; }
  function hue(i) { return String((330 + i * 47) % 360); }

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
  function chimeOk() { tone([523.25, 659.25, 783.99], "sine", 0.09, 0.07, 0.45); }
  function tick() { tone([392], "triangle", 0.03, 0, 0.1); }
  function soft() { tone([330, 294], "sine", 0.03, 0.08, 0.2); }

  /* ——— données ——— */
  function getJSON(url) { return fetch(url, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); }); }
  function load() {
    return Promise.all([getJSON("data/solitaire-pochettes.json"), getJSON("data/categories.json"), getJSON("tracks.json")]).then(function (r) {
      cfg = r[0]; cats = r[1]; tracks = r[2].tracks || r[2] || [];
    }).catch(function () { loadFailed = true; });
  }
  function levels() { return (cfg && cfg.levels) || []; }
  function level() { var L = levels(); for (var i = 0; i < L.length; i++) if (L[i].id === levelId) return L[i]; return L[0]; }

  /* chansons de la langue de la page, avec pochette, par thème */
  function pool() {
    var lang = siteLang(), list = window.EdenSongPick ? window.EdenSongPick.forLang(tracks, lang) : tracks.filter(function (x) { return x.lang === lang; });
    var by = {};
    list.forEach(function (tr) {
      var m = cats.tracks[tr.id]; if (!m || !tr.cover_url) return;
      (by[m.primary] = by[m.primary] || []).push(tr);
    });
    var themes = cats.categories.filter(function (c) { return by[c.id] && by[c.id].length; }).map(function (c) { return { def: c, songs: by[c.id] }; });
    return themes;
  }
  function playable() { var th = pool(); return th.length >= 2 && th.reduce(function (n, x) { return n + x.songs.length; }, 0) >= 6; }

  function readRecent(lang) { try { var o = JSON.parse(localStorage.getItem(cfg.recentStorageKey) || "{}"); var r = o[lang] || {}; return { sets: r.sets || [], cards: r.cards || [] }; } catch (e) { return { sets: [], cards: [] }; } }
  function writeRecent(lang, sig, ids) {
    try { var o = JSON.parse(localStorage.getItem(cfg.recentStorageKey) || "{}"), r = o[lang] || { sets: [], cards: [] };
      r.sets = (r.sets || []).concat([sig]).slice(-3); r.cards = (r.cards || []).concat(ids).slice(-40); o[lang] = r; localStorage.setItem(cfg.recentStorageKey, JSON.stringify(o)); } catch (e) {}
  }

  /* ——— donne ——— */
  function chooseSet(lv, lang) {
    var all = pool(), rec = readRecent(lang), need = lv.themes;
    var multi = all.filter(function (x) { return x.songs.length >= (cfg.minThemeSongs || 2); }), single = all.filter(function (x) { return x.songs.length < (cfg.minThemeSongs || 2); });
    var best = null;
    for (var tries = 0; tries < 14; tries++) {
      var picked = shuffle(multi.slice()).slice(0, need);
      if (picked.length < need) picked = picked.concat(shuffle(single.slice()).slice(0, need - picked.length));
      var sig = picked.map(function (x) { return x.def.id; }).sort().join("+");
      best = picked; if (rec.sets.indexOf(sig) < 0) break;               // ensemble de thèmes différent des dernières manches
    }
    // nombre de cartes par thème : réparti, borné par les chansons disponibles
    var total = lv.cards, caps = best.map(function (x) { return x.songs.length; }), alloc = best.map(function () { return 0; }), left = total, guard = 0;
    while (left > 0 && guard++ < 500) { var moved = false; for (var i = 0; i < best.length && left > 0; i++) if (alloc[i] < caps[i]) { alloc[i]++; left--; moved = true; } if (!moved) break; }
    var cards = [], used = rec.cards;
    best.forEach(function (th, i) {
      var songs = th.songs.slice(); shuffle(songs);
      songs.sort(function (a, b) { return (used.indexOf(a.id) >= 0 ? 1 : 0) - (used.indexOf(b.id) >= 0 ? 1 : 0); });   // pochettes pas vues récemment d'abord
      var take = songs.slice(0, alloc[i]);
      // si l'ensemble complet de chansons est identique à la manche précédente, le tri aléatoire a déjà varié l'ordre ; on mélange le choix parmi les non-récentes
      take.forEach(function (s) { cards.push({ id: s.id, theme: th.def.id, track: s }); });
    });
    return { themes: best.map(function (x, i) { return { id: x.def.id, def: x.def, total: alloc[i] }; }), cards: shuffle(cards) };
  }
  function deal(lv, lang) {
    for (var attempt = 0; attempt < 30; attempt++) {
      var set = chooseSet(lv, lang), cards = set.cards.slice(), n = cards.length;
      var stockN = Math.max(2, Math.round(n * (cfg.stockShare || 0.25))), stock = cards.splice(0, stockN), cols = [];
      var C = lv.cols; for (var c = 0; c < C; c++) cols.push([]);
      cards.forEach(function (cd, i) { cols[i % C].push(cd); });
      var found = {}; set.themes.forEach(function (th) { found[th.id] = []; });
      var g = { themes: set.themes, cols: cols, stock: stock, waste: [], found: found, total: n, moves: 0, wrong: 0, hints: 0, level: lv.id, last: null };
      if (solve(snap(g))) return g;                                       // donne vérifiée par le solveur
    }
    return null;
  }
  function snap(g) {
    var f = {}; Object.keys(g.found).forEach(function (k) { f[k] = g.found[k].slice(); });
    return { cols: g.cols.map(function (c) { return c.slice(); }), stock: g.stock.slice(), waste: g.waste.slice(), found: f, total: g.total, moves: g.moves, last: g.last };
  }
  /* solveur : se joue seul avec les seules règles du jeu (colonne → son cercle, pioche → son cercle, pioche qui tourne) ; vrai si tout peut être rangé */
  function solve(s) {
    var placed = 0, sinceRecycle = 0, steps = 0;
    s = { cols: s.cols.map(function (c) { return c.slice(); }), stock: s.stock.slice(), waste: s.waste.slice() };
    var total = s.stock.length + s.waste.length + s.cols.reduce(function (n, c) { return n + c.length; }, 0);
    while (placed < total && steps++ < 5000) {
      var moved = false;
      for (var i = 0; i < s.cols.length; i++) if (s.cols[i].length) { s.cols[i].pop(); placed++; sinceRecycle++; moved = true; }
      if (s.waste.length) { s.waste.pop(); placed++; sinceRecycle++; moved = true; }
      if (moved) continue;
      if (s.stock.length) { s.waste.push(s.stock.pop()); continue; }
      if (s.waste.length && sinceRecycle) { s.stock = s.waste.reverse(); s.waste = []; sinceRecycle = 0; continue; }
      return false;
    }
    return placed >= total;
  }

  /* ——— rendu ——— */
  function themeIndex(id) { for (var i = 0; i < G.themes.length; i++) if (G.themes[i].id === id) return i; return -1; }
  function mini(box, cd) { box.innerHTML = ""; box.classList.remove("ct-failed"); if (window.EdenThumb) window.EdenThumb.fill(box, cd.track.cover_url, cd.track.title); else { var im = document.createElement("img"); im.alt = ""; im.src = cd.track.cover_url; box.appendChild(im); } }
  function cardEl(cd, opts) {
    var el = document.createElement(opts.top ? "button" : "div");
    el.className = "sp-card" + (opts.top ? " is-top" : " is-covered");
    el.setAttribute("data-id", cd.id); el.style.setProperty("--i", String(opts.i || 0));
    if (opts.top) { el.type = "button"; el.setAttribute("data-src", opts.src); if (opts.ci != null) el.setAttribute("data-ci", String(opts.ci)); el.setAttribute("aria-label", t("sp.cardAria", { title: cd.track.title })); }
    else el.setAttribute("aria-hidden", "true");
    var face = document.createElement("span"); face.className = "sp-face"; el.appendChild(face); mini(face, cd);
    return el;
  }
  function render() {
    if (!G) return;
    // cercles
    foundEl.innerHTML = ""; foundEl.style.setProperty("--k", String(G.themes.length));
    G.themes.forEach(function (th, i) {
      var arr = G.found[th.id], w = document.createElement("div"); w.className = "sp-fwrap"; w.style.setProperty("--h", hue(i));
      var b = document.createElement("button"); b.type = "button"; b.className = "sp-slot" + (arr.length >= th.total ? " is-full" : "") + (sel ? " is-target" : ""); b.setAttribute("data-theme", th.id); b.setAttribute("data-drop", "found");
      b.setAttribute("aria-label", t("sp.foundAria", { name: loc(th.def.name), a: arr.length, b: th.total }));
      var face = document.createElement("span"); face.className = "sp-slot-face"; b.appendChild(face);
      if (arr.length) mini(face, arr[arr.length - 1]);
      var ic = document.createElement("span"); ic.className = "sp-slot-icon"; ic.setAttribute("aria-hidden", "true"); ic.textContent = th.def.icon || "✦"; b.appendChild(ic);
      var ct = document.createElement("span"); ct.className = "sp-slot-count"; ct.textContent = arr.length + "/" + th.total; b.appendChild(ct);
      b.addEventListener("click", function () { onFound(th.id); });
      var nm = document.createElement("span"); nm.className = "sp-slot-name"; nm.textContent = loc(th.def.name);
      w.appendChild(b); w.appendChild(nm); foundEl.appendChild(w);
    });
    // pioche + défausse
    stockBtn.setAttribute("data-count", String(G.stock.length)); stockBtn.classList.toggle("is-empty", !G.stock.length);
    stockBtn.setAttribute("aria-label", G.stock.length ? t("sp.stock", { n: G.stock.length }) : t("sp.stockEmpty"));
    stockBtn.querySelector(".sp-stock-n").textContent = String(G.stock.length);
    wasteEl.innerHTML = "";
    if (G.waste.length) {
      var wc = G.waste[G.waste.length - 1], el = cardEl(wc, { top: true, src: "waste", i: 0 }); wasteEl.appendChild(el); bindCard(el);
      if (sel && sel.src === "waste") el.classList.add("is-selected");
    } else { var ph = document.createElement("span"); ph.className = "sp-ph"; ph.setAttribute("aria-hidden", "true"); wasteEl.appendChild(ph); }
    // colonnes
    tabEl.innerHTML = ""; tabEl.style.setProperty("--c", String(G.cols.length));
    G.cols.forEach(function (col, ci) {
      var c = document.createElement("div"); c.className = "sp-col"; c.setAttribute("data-ci", String(ci)); c.style.setProperty("--n", String(Math.max(1, col.length)));
      if (!col.length) {
        var e = document.createElement("button"); e.type = "button"; e.className = "sp-empty-col" + (sel ? " is-target" : ""); e.setAttribute("data-drop", "col"); e.setAttribute("data-ci", String(ci));
        e.setAttribute("aria-label", t("sp.emptyCol", { n: ci + 1 })); e.addEventListener("click", function () { onEmptyCol(ci); }); c.appendChild(e);
      } else col.forEach(function (cd, i) {
        var top = i === col.length - 1, el = cardEl(cd, { top: top, src: "col", ci: ci, i: i }); c.appendChild(el);
        if (top) { bindCard(el); if (sel && sel.src === "col" && sel.ci === ci) el.classList.add("is-selected"); }
      });
      tabEl.appendChild(c);
    });
    sizeBoard();
    updateHud();
  }
  function sizeBoard() {
    var w = tabEl.clientWidth || boardEl.clientWidth || 300, C = G ? G.cols.length : 4, gap = parseFloat(getComputedStyle(tabEl).columnGap) || 8;
    var cw = Math.max(48, (w - gap * (C - 1)) / C);
    boardEl.style.setProperty("--cw", cw.toFixed(1) + "px"); boardEl.style.setProperty("--peek", Math.max(20, Math.round(cw * 0.3)) + "px");
  }
  function placedCount() { return G ? Object.keys(G.found).reduce(function (n, k) { return n + G.found[k].length; }, 0) : 0; }
  function updateHud() {
    if (!G) { statusEl.textContent = t("sp.ready"); scoreEl.textContent = ""; return; }
    statusEl.textContent = t("sp.progress", { a: placedCount(), b: G.total });
    scoreEl.textContent = t("sp.moves", { n: G.moves });
    undoBtn.disabled = mode !== "playing" || !undoStack.length;
    redealBtn.disabled = mode !== "playing" || (G.stock.length + G.waste.length) < 2;
    helpBtn.disabled = mode !== "playing";
  }
  function caption(msg) { capEl.textContent = msg || ""; }
  function topOf(src, ci) { return src === "waste" ? G.waste[G.waste.length - 1] : (G.cols[ci] || [])[G.cols[ci].length - 1]; }

  /* ——— coups ——— */
  function pushUndo() { undoStack.push(snap(G)); if (undoStack.length > 400) undoStack.shift(); }
  function removeFrom(src, ci) { return src === "waste" ? G.waste.pop() : G.cols[ci].pop(); }
  function clearHint() { if (hintTimer) { clearTimeout(hintTimer); hintTimer = 0; } boardEl.querySelectorAll(".is-hint").forEach(function (e) { e.classList.remove("is-hint"); }); }
  var wrongBy = {};
  function select(src, ci) { sel = { src: src, ci: ci }; var cd = topOf(src, ci); caption(t("sp.hintSelected", { title: cd.track.title })); say(t("sp.hintSelected", { title: cd.track.title })); hintEl.textContent = t("sp.hintSelected", { title: cd.track.title }); tick(); render(); }
  function deselect() { sel = null; caption(""); render(); }
  function tapCard(src, ci) {
    if (mode !== "playing") return;
    if (window.EdenStars && window.EdenStars.unlock) window.EdenStars.unlock();
    if (!startedAt) startedAt = Date.now();
    clearHint();
    if (sel && sel.src === src && sel.ci === ci) { deselect(); return; }
    select(src, ci);
  }
  function tryFound(src, ci, themeId, viaDrag) {
    var cd = topOf(src, ci); if (!cd) return false;
    var th = G.themes[themeIndex(themeId)];
    if (cd.theme === themeId) {
      pushUndo(); removeFrom(src, ci); G.found[themeId].push(cd); G.moves++; G.last = cd; sel = null; clearHint();
      hintEl.textContent = t("sp.hintRight", { title: cd.track.title, theme: loc(th.def.name) }); caption(t("sp.hintRight", { title: cd.track.title, theme: loc(th.def.name) })); say(hintEl.textContent);
      chimeOk(); render(); flashSlot(themeId, "is-ok"); sparkleSlot(themeId);
      if (placedCount() >= G.total) setTimeout(win, reduced() ? 100 : 500);
      return true;
    }
    G.wrong++; wrongBy[cd.id] = (wrongBy[cd.id] || 0) + 1; soft();
    hintEl.textContent = t("sp.hintWrong", { title: cd.track.title, theme: loc(th.def.name) }); caption(hintEl.textContent); say(hintEl.textContent);
    flashSlot(themeId, "is-nope");
    if (wrongBy[cd.id] >= 2) showRight(cd);                                // après deux essais, le bon cercle s'éclaire doucement
    if (viaDrag) { sel = null; render(); }
    return false;
  }
  function showRight(cd) {
    var s = boardEl.querySelector('.sp-slot[data-theme="' + cd.theme + '"]'); if (s) { s.classList.add("is-hint"); clearTimeout(hintTimer); hintTimer = setTimeout(clearHint, 3500); }
  }
  function flashSlot(themeId, cls) { var s = foundEl.querySelector('.sp-slot[data-theme="' + themeId + '"]'); if (!s) return; s.classList.remove("is-ok", "is-nope"); void s.offsetWidth; s.classList.add(cls); setTimeout(function () { s.classList.remove(cls); }, 700); }
  function sparkleSlot(themeId) {
    if (reduced() || !frame) return;
    var s = foundEl.querySelector('.sp-slot[data-theme="' + themeId + '"]'); if (!s) return;
    var fr = frame.getBoundingClientRect(), r = s.getBoundingClientRect();
    for (var i = 0; i < 6; i++) {
      var p = document.createElement("i"); p.className = "sp-spark";
      p.style.left = (r.left - fr.left + r.width * (0.2 + Math.random() * 0.6)) + "px"; p.style.top = (r.top - fr.top + r.height * (0.2 + Math.random() * 0.6)) + "px";
      p.style.setProperty("--dx", (Math.random() * 40 - 20).toFixed(0) + "px"); p.style.setProperty("--dy", (-14 - Math.random() * 26).toFixed(0) + "px"); p.style.animationDelay = (i * 40) + "ms";
      frame.appendChild(p); (function (q) { setTimeout(function () { if (q.parentNode) q.parentNode.removeChild(q); }, 1400); })(p);
    }
  }
  function onFound(themeId) {
    if (mode !== "playing") return;
    if (window.EdenStars && window.EdenStars.unlock) window.EdenStars.unlock();
    if (!sel) {                                                             // sans carte choisie : la fiche du thème
      var th = G.themes[themeIndex(themeId)]; caption("« " + loc(th.def.name) + " » — " + loc(th.def.description)); hintEl.textContent = t("sp.hintTheme"); return;
    }
    tryFound(sel.src, sel.ci, themeId, false);
  }
  function moveToCol(src, ci, to) {
    if (G.cols[to].length) return false;
    if (src === "col" && ci === to) return false;
    var cd = topOf(src, ci); if (!cd) return false;
    pushUndo(); removeFrom(src, ci); G.cols[to].push(cd); G.moves++; sel = null; clearHint();
    hintEl.textContent = t("sp.hintMove"); caption(""); say(t("sp.hintMove")); tick(); render(); return true;
  }
  function onEmptyCol(to) { if (mode !== "playing" || !sel) { if (mode === "playing") hintEl.textContent = t("sp.hintEmpty"); return; } moveToCol(sel.src, sel.ci, to); }
  function onStock() {
    if (mode !== "playing") return;
    if (window.EdenStars && window.EdenStars.unlock) window.EdenStars.unlock();
    clearHint(); sel = null;
    if (G.stock.length) { pushUndo(); G.waste.push(G.stock.pop()); G.moves++; tick(); caption(""); hintEl.textContent = t("sp.hintDraw"); }
    else if (G.waste.length) { pushUndo(); G.stock = G.waste.slice().reverse(); G.waste = []; G.moves++; tick(); hintEl.textContent = t("sp.hintRecycle"); }
    render();
  }
  function onUndo() {
    if (mode !== "playing" || !undoStack.length) return;
    var s = undoStack.pop(); G.cols = s.cols; G.stock = s.stock; G.waste = s.waste; G.found = s.found; G.moves = s.moves; G.last = s.last; sel = null; clearHint();
    hintEl.textContent = t("sp.hintUndo"); caption(""); say(t("sp.hintUndo")); render();
  }
  function onRedeal() {
    if (mode !== "playing") return;
    var all = G.stock.concat(G.waste); if (all.length < 2) return;
    pushUndo(); G.stock = shuffle(all); G.waste = []; sel = null; clearHint(); hintEl.textContent = t("sp.hintRedeal"); caption(""); say(t("sp.hintRedeal")); soft(); render();
  }
  function onHelp() {
    if (mode !== "playing") return;
    var cd = sel ? topOf(sel.src, sel.ci) : null;
    if (!cd) { var tops = []; G.cols.forEach(function (c) { if (c.length) tops.push(c[c.length - 1]); }); if (G.waste.length) tops.push(G.waste[G.waste.length - 1]); if (!tops.length) { hintEl.textContent = t("sp.hintDrawFirst"); return; } cd = tops[rint(tops.length)]; }
    G.hints++; clearHint();
    var th = G.themes[themeIndex(cd.theme)];
    var el = boardEl.querySelector('.sp-card.is-top[data-id="' + cd.id + '"]'); if (el) el.classList.add("is-hint");
    showRight(cd);
    hintEl.textContent = t("sp.hintHelp", { title: cd.track.title, theme: loc(th.def.name) }); caption(hintEl.textContent); say(hintEl.textContent);
    clearTimeout(hintTimer); hintTimer = setTimeout(clearHint, 3500);
  }

  /* ——— glisser-déposer (pointer events : souris ET tactile) + toucher ——— */
  function bindCard(el) {
    el.addEventListener("pointerdown", onCardDown);
    el.addEventListener("click", function (e) { if (e.detail === 0) tapCard(el.getAttribute("data-src"), +el.getAttribute("data-ci") || 0); });   // clavier
  }
  function onCardDown(e) {
    if (mode !== "playing" || dragging || (e.button !== undefined && e.button > 0)) return;
    var el = e.currentTarget;
    dragging = { el: el, src: el.getAttribute("data-src"), ci: +el.getAttribute("data-ci") || 0, x0: e.clientX, y0: e.clientY, pid: e.pointerId, ghost: null, over: null };
    window.addEventListener("pointermove", onMove, { passive: false }); window.addEventListener("pointerup", onUp); window.addEventListener("pointercancel", onCancel);
  }
  function zones() {
    var out = [];
    boardEl.querySelectorAll('[data-drop="found"], [data-drop="col"]').forEach(function (z) { var r = z.getBoundingClientRect(); out.push({ el: z, r: r, kind: z.getAttribute("data-drop"), theme: z.getAttribute("data-theme"), ci: +z.getAttribute("data-ci") }); });
    return out;
  }
  function zoneAt(x, y) {                                                   // zone sous le doigt, sinon la plus proche (aimantation, 56 px)
    var zs = zones(), best = null, bd = 1e9;
    for (var i = 0; i < zs.length; i++) {
      var r = zs[i].r, dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0, dy = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0, d = Math.sqrt(dx * dx + dy * dy);
      if (d < bd) { bd = d; best = zs[i]; }
    }
    return bd <= 56 ? best : null;
  }
  function onMove(e) {
    var d = dragging; if (!d || e.pointerId !== d.pid) return;
    var dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.ghost) {
      if (dx * dx + dy * dy < 49) return;
      var r = d.el.getBoundingClientRect(), g = d.el.cloneNode(true); g.removeAttribute("id"); g.classList.add("sp-ghost"); g.style.width = r.width + "px"; g.style.height = r.height + "px";
      g.style.left = r.left + "px"; g.style.top = r.top + "px"; g.setAttribute("aria-hidden", "true"); g.tabIndex = -1; document.body.appendChild(g);
      d.ghost = g; d.ox = r.left; d.oy = r.top; d.el.classList.add("is-drag"); sel = null; clearHint();
      boardEl.querySelectorAll(".sp-slot, .sp-empty-col").forEach(function (z) { z.classList.add("is-target"); });
    }
    e.preventDefault();
    d.ghost.style.transform = "translate(" + dx + "px," + dy + "px) scale(1.06)";
    var z = zoneAt(e.clientX, e.clientY); if (z !== d.over) { if (d.over) d.over.el.classList.remove("is-over"); d.over = z; if (z) z.el.classList.add("is-over"); }
  }
  function endDrag() {
    var d = dragging; if (!d) return; dragging = null;
    window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onCancel);
    if (d.ghost && d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost);
    if (d.over) d.over.el.classList.remove("is-over"); if (d.el) d.el.classList.remove("is-drag");
    boardEl.querySelectorAll(".is-target").forEach(function (z) { z.classList.remove("is-target"); });
    return d;
  }
  function onUp(e) {
    if (!dragging || e.pointerId !== dragging.pid) return;
    var d = dragging, z = d.ghost ? zoneAt(e.clientX, e.clientY) : null; endDrag();
    if (!d.ghost) { tapCard(d.src, d.ci); return; }                         // pas de glissement : simple toucher
    if (!z) { render(); hintEl.textContent = t("sp.hintBack"); return; }
    var ok = z.kind === "found" ? tryFound(d.src, d.ci, z.theme, true) : moveToCol(d.src, d.ci, z.ci);
    if (!ok) render();
  }
  function onCancel(e) { if (dragging && e.pointerId === dragging.pid) { endDrag(); render(); } }

  /* ——— victoire ——— */
  function bubbles() {
    if (!celebrate) return;
    celebrate.innerHTML = ""; stage.classList.add("is-glow");
    if (reduced()) return;
    var N = window.innerWidth < 520 ? 22 : 34, h = stage.clientHeight || 420;
    for (var i = 0; i < N; i++) {
      var b = document.createElement("i"); b.className = "sp-bubble" + (i % 4 === 0 ? " is-spark" : "");
      b.style.setProperty("--x", (4 + Math.random() * 92).toFixed(1) + "%"); b.style.setProperty("--s", (i % 4 === 0 ? 6 + Math.random() * 6 : 12 + Math.random() * 26).toFixed(1) + "px");
      b.style.setProperty("--d", (Math.random() * 1.1).toFixed(2) + "s"); b.style.setProperty("--t", (2.8 + Math.random() * 2.2).toFixed(2) + "s");
      b.style.setProperty("--dx", (Math.random() * 70 - 35).toFixed(0) + "px"); b.style.setProperty("--h", Math.round(h * (0.55 + Math.random() * 0.6)) + "px");
      celebrate.appendChild(b);
    }
    setTimeout(function () { if (celebrate) celebrate.innerHTML = ""; }, 6200);
  }
  function win() {
    if (mode !== "playing") return;
    mode = "won"; sel = null; clearHint(); stage.classList.add("is-won"); if (actions) actions.hidden = true; render();
    var score = G.wrong + G.hints * 1.5, stars = score <= G.total * 0.25 ? 3 : score <= G.total * 0.7 ? 2 : 1;
    var rec = window.EdenStars ? window.EdenStars.record(GAME_ID, stars) : { session: stars, best: stars };
    if (window.EdenStars) {
      window.EdenStars.play(stars);
      window.EdenStars.render(starsBox, stars, { line: t("sp.star" + stars), detail: t("sp.starDetail", { wrong: G.wrong, hints: G.hints, moves: G.moves }), session: rec });
    }
    bubbles(); hintEl.textContent = t("sp.hintWin"); caption(""); var song = (G.last || G.found[G.themes[0].id][0]).track; say(t("sp.wonText", { title: song.title }));
    againBtn.hidden = false; againBtn.textContent = t("sp.again");
    playSong(song);
    try { stage.scrollIntoView({ block: "nearest", behavior: reduced() ? "auto" : "smooth" }); } catch (e) {}
  }
  function clearEmbed() { if (embedBox) { embedBox.innerHTML = ""; embedBox.hidden = true; } }
  function stopSong() {
    if (window.EdenFullSong) window.EdenFullSong.stop(audio); else try { audio.pause(); } catch (e) {}
    clearEmbed(); if (listenBtn) listenBtn.hidden = true; if (playerBox) playerBox.hidden = true; ownStarted = false;
  }
  function playSong(song) {
    if (!song || !playerBox) return;
    playerBox.hidden = false; if (nowEl) nowEl.textContent = t("sp.playing", { title: song.title });
    var F = window.EdenFullSong, same = audio && audio.getAttribute("data-id") === song.id;
    if (F && F.busy(audio) && !same && ownStarted) { F.stop(audio); clearEmbed(); }                 // chanson d'une manche précédente de ce jeu : remplacée
    else if (F && F.busy(audio) && !same) {                                                          // une chanson d'une autre page/lecteur : on ne la coupe pas
      if (listenBtn) { listenBtn.hidden = false; listenBtn.textContent = t("sp.listen", { title: song.title }); listenBtn.onclick = function () { listenBtn.hidden = true; F.stop(audio); startSong(song); ownStarted = true; }; }
      return;
    }
    if (F && F.busy(audio) && same) return;
    startSong(song); ownStarted = true;
  }
  function startSong(song) {
    var F = window.EdenFullSong; if (nowEl) nowEl.textContent = t("sp.playing", { title: song.title }); playerBox.hidden = false;
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
      var b = document.createElement("button"); b.type = "button"; b.className = "sp-level"; b.setAttribute("data-level", lv.id);
      b.setAttribute("aria-pressed", lv.id === levelId ? "true" : "false"); b.textContent = t("sp.level." + lv.id, { n: lv.themes });
      b.addEventListener("click", function () { setLevel(lv.id); }); levelsEl.appendChild(b);
    });
  }
  function setLevel(id) {
    levelId = id; try { localStorage.setItem("eden-sp-level", id); } catch (e) {}
    renderLevels();
    if (mode === "playing" && G && !G.moves) startGame(); else if (mode !== "idle") hintEl.textContent = t("sp.levelNext");
  }
  function startGame() {
    if (window.EdenStars && window.EdenStars.unlock) window.EdenStars.unlock();
    if (window.EdenStars) window.EdenStars.clear(starsBox);
    if (!playable()) { card.hidden = true; emptyBox.hidden = false; return; }
    card.hidden = false; emptyBox.hidden = true;
    var lang = siteLang(), g = deal(level(), lang);
    if (!g) { hintEl.textContent = t("sp.loadError"); return; }
    G = g; undoStack = []; sel = null; wrongBy = {}; startedAt = 0; mode = "playing"; clearHint();
    writeRecent(lang, G.themes.map(function (x) { return x.id; }).sort().join("+"), [].concat(G.stock, G.cols.reduce(function (a, c) { return a.concat(c); }, [])).map(function (c) { return c.id; }));
    stage.classList.remove("is-glow", "is-won"); if (celebrate) celebrate.innerHTML = "";
    boardEl.hidden = false; showOverlay(false); startBtn.hidden = true; againBtn.hidden = true; actions.hidden = false; caption("");
    render(); hintEl.textContent = t("sp.hintPlay"); say(t("sp.setLine", { n: G.total, k: G.themes.length }));
    try { var r = boardEl.getBoundingClientRect(); if (r.top < 40 || r.bottom > window.innerHeight + 200) foundEl.scrollIntoView({ block: "start", behavior: reduced() ? "auto" : "smooth" }); } catch (e) {}
  }
  function showWelcome() {
    mode = "idle"; G = null; sel = null; undoStack = []; clearHint(); showOverlay(true);
    $("sp-overlay-kicker").textContent = t("sp.welcomeKicker"); $("sp-overlay-title").textContent = t("sp.welcomeTitle"); $("sp-overlay-text").textContent = t("sp.welcomeText");
    startBtn.hidden = false; startBtn.textContent = t("sp.start"); againBtn.hidden = true; actions.hidden = true; boardEl.hidden = true;
    stage.classList.remove("is-glow", "is-won"); if (celebrate) celebrate.innerHTML = ""; if (window.EdenStars) window.EdenStars.clear(starsBox);
    hintEl.textContent = t("sp.hintIdle"); caption(""); renderLevels(); updateHud();
  }
  function init() {
    if (loadFailed || !cfg) { showWelcome(); hintEl.textContent = t("sp.loadError"); startBtn.hidden = true; return; }
    if (!playable()) { card.hidden = true; emptyBox.hidden = false; return; }
    card.hidden = false; emptyBox.hidden = true; showWelcome();
  }
  function bind() {
    try { var sv = localStorage.getItem("eden-sp-level"); if (sv) levelId = sv; } catch (e) {}
    if (cfg && (!levelId || !levels().some(function (l) { return l.id === levelId; }))) levelId = cfg.defaultLevel || cfg.levels[0].id;
    startBtn.addEventListener("click", startGame); againBtn.addEventListener("click", startGame); newBtn.addEventListener("click", startGame);
    stockBtn.addEventListener("click", onStock); undoBtn.addEventListener("click", onUndo); redealBtn.addEventListener("click", onRedeal); helpBtn.addEventListener("click", onHelp);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && sel) deselect(); });
    window.addEventListener("resize", function () { if (G) sizeBoard(); });
    if (window.EdenI18n && window.EdenI18n.onChange) window.EdenI18n.onChange(function () { stopSong(); init(); });
    var toggle = $("nav-toggle"), links = $("nav-links");
    if (toggle && links) toggle.addEventListener("click", function () { var open = links.classList.toggle("is-open"); toggle.setAttribute("aria-expanded", open ? "true" : "false"); });
    init();
  }

  window.EdenSolitaire = {
    solve: function () { return G ? solve(snap(G)) : null; },
    state: function () {
      if (!G) return { mode: mode };
      var tops = G.cols.map(function (c) { return c.length ? { id: c[c.length - 1].id, theme: c[c.length - 1].theme } : null; });
      var w = G.waste.length ? { id: G.waste[G.waste.length - 1].id, theme: G.waste[G.waste.length - 1].theme } : null;
      return { mode: mode, level: G.level, total: G.total, placed: placedCount(), moves: G.moves, wrong: G.wrong, hints: G.hints, cols: G.cols.map(function (c) { return c.length; }), tops: tops, waste: w,
        stock: G.stock.length, wasteN: G.waste.length, undo: undoStack.length, themes: G.themes.map(function (x) { return { id: x.id, name: loc(x.def.name), total: x.total, n: G.found[x.id].length }; }),
        songs: [].concat(G.stock, G.waste, G.cols.reduce(function (a, c) { return a.concat(c); }, [])).map(function (c) { return { id: c.id, lang: c.track.lang, theme: c.theme }; }), last: G.last ? G.last.track.title : null };
    }
  };
  load().then(function () { if (window.EdenSongPick && window.EdenSongPick.ready && window.EdenSongPick.ready.then) return window.EdenSongPick.ready; }).then(bind, bind);
})();
