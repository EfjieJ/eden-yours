/* Eden Yours — Paires de lumière (jeu de mémoire).
   Chaque chanson apparaît DEUX fois : en pochette et sous un second « visage » (bulle de lumière ou reflet d'or) — jeux d'images dans data/pairs-sets.json.
   À CHAQUE partie : N chansons tirées au hasard DANS LA LANGUE DE LA PAGE (EdenSongPick.forLang), en évitant les pochettes vues récemment
   (localStorage « eden-pairs-recent ») et sans retomber sur le même ensemble que la manche précédente ; « Nouvelle partie » retire toujours de nouvelles pochettes.
   Compteurs doux (coups, temps — jamais d'échec), indice, retournement 3D. À la dernière paire : son de victoire + étoiles (EdenStars),
   bulles dorées, puis la chanson de la DERNIÈRE paire jouée EN ENTIER (EdenFullSong / embed Suno). */
(function () {
  "use strict";

  var GAME_ID = "pairs";
  var $ = function (id) { return document.getElementById(id); };
  var gridEl = $("pl-grid"), overlay = $("pl-overlay"), overlayKicker = $("pl-overlay-kicker"), overlayTitle = $("pl-overlay-title"),
    overlayText = $("pl-overlay-text"), startBtn = $("pl-start"), againBtn = $("pl-again"), statusEl = $("pl-status"), scoreEl = $("pl-score"),
    hintEl = $("pl-hint"), liveEl = $("pl-live"), starsBox = $("pl-stars"), playerBox = $("pl-player"), nowEl = $("pl-now-playing"),
    embedBox = $("pl-embed"), audio = $("pl-audio"), listenBtn = $("pl-listen"), actions = $("pl-actions"), helpBtn = $("pl-help"),
    newBtn = $("pl-new"), emptyBox = $("pl-empty"), card = $("pl-card"), stage = $("pl-stage"), celebrate = $("pl-celebrate"),
    levelsEl = $("pl-levels"), setLine = $("pl-setline");

  var cfg = null, tracks = [], loadFailed = false;
  var state = "idle";                       // idle | playing | won
  var levelId = null, round = null, flippedCells = [], locked = false, moves = 0, hints = 0, found = 0, startedAt = 0, timer = 0, lastFound = null;
  var AC = null;

  function t(key, vars) { return window.EdenI18n && window.EdenI18n.t ? window.EdenI18n.t(key, vars) : key; }
  function siteLang() { return window.EdenSongPick ? window.EdenSongPick.lang() : (document.documentElement.lang === "en" ? "en" : "fr"); }
  function reduced() { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } }
  function phone() { return window.innerWidth < 560; }
  function say(msg) { if (liveEl) { liveEl.textContent = ""; setTimeout(function () { liveEl.textContent = msg; }, 30); } }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function fmt(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60); }
  function cssUrl(u) { var abs = u; try { abs = new URL(u, document.baseURI).href; } catch (e) {} return 'url("' + String(abs).replace(/"/g, "%22") + '")'; }   // absolu : une variable CSS se résout par rapport à la feuille de style, pas à la page
  function store(kind) { try { return window[kind]; } catch (e) { return null; } }

  /* ——— sons doux (Web Audio) : même famille que les autres jeux ——— */
  function ctxAudio() {
    try { if (!AC) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AC = new C(); } if (AC.state === "suspended" && AC.resume) AC.resume(); return AC; } catch (e) { return null; }
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
  function flipTick() { tone([880], "sine", 0.035, 0, 0.12); }
  function matchChime() { tone([523.25, 659.25, 783.99], "sine", 0.1, 0.07, 0.45); }
  function missChime() { tone([392, 330], "sine", 0.05, 0.12, 0.3); }

  /* ——— données ——— */
  function getJSON(url) { return fetch(url, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); }); }
  function load() {
    return Promise.all([getJSON("data/pairs-sets.json"), getJSON("tracks.json")]).then(function (r) {
      cfg = r[0]; tracks = r[1].tracks || r[1] || [];
    }).catch(function () { loadFailed = true; });
  }
  function pool() {            // chansons de la langue de la page, avec pochette (langue stricte)
    var lang = siteLang();
    var list = window.EdenSongPick ? window.EdenSongPick.forLang(tracks, lang) : tracks.filter(function (x) { return x.lang === lang; });
    return list.filter(function (x) { return x && x.cover_url; });
  }
  function levels() { return (cfg && cfg.levels) || []; }
  function level() { var L = levels(); for (var i = 0; i < L.length; i++) if (L[i].id === levelId) return L[i]; return L[0]; }
  function pairsFor(lv, p) { return Math.max(2, Math.min(lv.pairs, p.length - 1 >= 2 ? p.length - 1 : p.length)); }   // il reste toujours au moins une chanson hors de la manche

  /* ——— tirage : nouvelles pochettes à chaque partie ——— */
  function readRecent(lang) { try { var o = JSON.parse(store("localStorage").getItem(cfg.recentStorageKey) || "{}"); return Array.isArray(o[lang]) ? o[lang] : []; } catch (e) { return []; } }
  function writeRecent(lang, ids) {
    try { var ls = store("localStorage"), o = JSON.parse(ls.getItem(cfg.recentStorageKey) || "{}"); o[lang] = ids.slice(-(cfg.recentMax || 36)); ls.setItem(cfg.recentStorageKey, JSON.stringify(o)); } catch (e) {}
  }
  function lastSig(lang) { try { return store("sessionStorage").getItem("eden-pairs-last-" + lang) || ""; } catch (e) { return ""; } }
  function setLastSig(lang, sig) { try { store("sessionStorage").setItem("eden-pairs-last-" + lang, sig); } catch (e) {} }
  function draw(p, n, lang) {
    var rec = readRecent(lang), prev = lastSig(lang), chosen = [], sig = "";
    var fresh = shuffle(p.filter(function (x) { return rec.indexOf(x.id) < 0; }));
    chosen = fresh.slice(0, n);
    if (chosen.length < n) {                                           // pas assez de pochettes jamais vues : les moins récemment vues d'abord
      var stale = p.filter(function (x) { return rec.indexOf(x.id) >= 0; }).sort(function (a, b) { return rec.indexOf(a.id) - rec.indexOf(b.id); });
      chosen = chosen.concat(stale.slice(0, n - chosen.length));
    }
    sig = chosen.map(function (x) { return x.id; }).sort().join(",");
    if (sig === prev && p.length > n) {                               // jamais deux manches identiques de suite : on remplace une chanson
      var rest = p.filter(function (x) { return chosen.indexOf(x) < 0; });
      chosen[Math.floor(Math.random() * chosen.length)] = rest[Math.floor(Math.random() * rest.length)];
      sig = chosen.map(function (x) { return x.id; }).sort().join(",");
    }
    setLastSig(lang, sig);
    writeRecent(lang, rec.filter(function (id) { return !chosen.some(function (x) { return x.id === id; }); }).concat(chosen.map(function (x) { return x.id; })));
    return shuffle(chosen);
  }
  var lastSetId = {};
  function pickSet(lang) {
    var sets = (cfg.sets || []), cand = sets.filter(function (s) { return s.id !== lastSetId[lang]; });
    var s = (cand.length ? cand : sets)[Math.floor(Math.random() * (cand.length ? cand.length : sets.length))];
    lastSetId[lang] = s.id; return s;
  }

  /* ——— rendu ——— */
  function faceLabel(kind) { return t("pairs.face." + kind); }
  function makeCell(c, i) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "pl-cell"; b.setAttribute("data-i", String(i)); b.style.setProperty("--i", String(i));
    b.setAttribute("tabindex", i === 0 ? "0" : "-1");
    var front = c.kind === "bubble" ? '<span class="pl-front pl-front--bubble"><span class="pl-orb"></span></span>' : '<span class="pl-front pl-front--' + c.kind + '"></span>';
    b.innerHTML = '<span class="pl-inner"><span class="pl-back" aria-hidden="true"><i>✦</i></span>' + front + "</span>";
    var img = cssUrl(c.song.cover_url);
    b.querySelectorAll(".pl-front--cover, .pl-front--gold, .pl-orb").forEach(function (el) { el.style.setProperty("--img", img); });
    b.addEventListener("click", function () { onFlip(i); });
    b.addEventListener("keydown", function (e) { onKey(e, i); });
    c.el = b; refreshCell(c, i);
    return b;
  }
  function refreshCell(c, i) {
    var total = round.cards.length, el = c.el;
    var lab = c.matched ? t("pairs.cardMatched", { n: i + 1, title: c.song.title, face: faceLabel(c.kind) })
      : c.up ? t("pairs.cardShown", { n: i + 1, title: c.song.title, face: faceLabel(c.kind) })
      : t("pairs.cardHidden", { n: i + 1, total: total });
    el.setAttribute("aria-label", lab);
    el.classList.toggle("is-up", !!(c.up || c.matched)); el.classList.toggle("is-matched", !!c.matched);
    el.setAttribute("aria-disabled", c.matched ? "true" : "false");
  }
  function layout(lv) {
    var cols = phone() ? lv.cols.phone : lv.cols.desktop;
    gridEl.style.setProperty("--cols", String(cols)); round.cols = cols;
  }
  function onKey(e, i) {
    var cols = round.cols || 4, n = round.cards.length, to = -1;
    if (e.key === "ArrowRight") to = i + 1; else if (e.key === "ArrowLeft") to = i - 1;
    else if (e.key === "ArrowDown") to = i + cols; else if (e.key === "ArrowUp") to = i - cols;
    else if (e.key === "Home") to = 0; else if (e.key === "End") to = n - 1;
    if (to < 0 || to >= n) return;
    e.preventDefault(); focusCell(to);
  }
  function focusCell(i) {
    round.cards.forEach(function (c, k) { c.el.setAttribute("tabindex", k === i ? "0" : "-1"); });
    round.cards[i].el.focus();
  }

  function updateHud() {
    if (!round) { statusEl.textContent = t("pairs.ready"); scoreEl.textContent = ""; return; }
    statusEl.textContent = t("pairs.pairsFound", { a: found, b: round.n });
    var el = startedAt ? (Date.now() - startedAt) / 1000 : 0;
    scoreEl.textContent = t("pairs.moves", { n: moves }) + " · " + t("pairs.time", { t: fmt(el) });
    helpBtn.disabled = state !== "playing" || hints >= 3;
    helpBtn.textContent = t("pairs.help") + (state === "playing" ? " (" + (3 - hints) + ")" : "");
  }
  function startTimer() { stopTimer(); startedAt = Date.now(); timer = setInterval(updateHud, 1000); }
  function stopTimer() { if (timer) { clearInterval(timer); timer = 0; } }

  /* ——— jeu ——— */
  function onFlip(i) {
    if (state !== "playing" || locked || !round) return;
    var c = round.cards[i];
    if (c.up || c.matched) return;
    if (window.EdenStars && window.EdenStars.unlock) window.EdenStars.unlock();
    if (!startedAt) startTimer();
    c.up = true; refreshCell(c, i); flipTick();
    flippedCells.push(i);
    say(t("pairs.cardShown", { n: i + 1, title: c.song.title, face: faceLabel(c.kind) }));
    if (flippedCells.length < 2) return;
    moves++; locked = true;
    var a = round.cards[flippedCells[0]], b = round.cards[flippedCells[1]];
    if (a.song.id === b.song.id) {
      setTimeout(function () {
        a.matched = b.matched = true; a.up = b.up = false; found++; lastFound = a.song;
        flippedCells.forEach(function (k) { refreshCell(round.cards[k], k); });
        flippedCells = []; locked = false; matchChime(); hintEl.textContent = t("pairs.hintMatch", { title: a.song.title }); say(t("pairs.hintMatch", { title: a.song.title }));
        updateHud();
        if (found >= round.n) win();
      }, reduced() ? 120 : 520);
    } else {
      var k1 = flippedCells[0], k2 = flippedCells[1];
      setTimeout(function () { a.el.classList.add("is-miss"); b.el.classList.add("is-miss"); missChime(); hintEl.textContent = t("pairs.hintMiss"); }, 380);
      setTimeout(function () {
        a.up = b.up = false; a.el.classList.remove("is-miss"); b.el.classList.remove("is-miss");
        refreshCell(a, k1); refreshCell(b, k2); flippedCells = []; locked = false; updateHud();
      }, reduced() ? 600 : 1050);
    }
    updateHud();
  }
  function onHelp() {
    if (state !== "playing" || !round || hints >= 3 || locked) return;
    var open = {}; round.cards.forEach(function (c) { if (!c.matched) (open[c.song.id] = open[c.song.id] || []).push(c); });
    var ids = Object.keys(open).filter(function (id) { return open[id].length === 2 && !open[id][0].up && !open[id][1].up; });
    if (!ids.length) return;
    var pair = open[ids[Math.floor(Math.random() * ids.length)]];
    hints++; pair.forEach(function (c) { c.el.classList.add("is-hint"); });
    hintEl.textContent = t("pairs.hintHelp"); say(t("pairs.hintHelp"));
    setTimeout(function () { pair.forEach(function (c) { c.el.classList.remove("is-hint"); }); }, 2200);
    updateHud();
  }

  /* ——— victoire ——— */
  function starsForWin() {
    var n = round.n, base = moves <= Math.ceil(n * 1.7) ? 3 : moves <= Math.ceil(n * 2.6) ? 2 : 1;
    return Math.max(1, base - (hints >= 3 ? 1 : 0));
  }
  function bubbles() {
    if (!celebrate) return;
    celebrate.innerHTML = ""; stage.classList.add("is-glow");
    if (reduced()) return;
    var N = window.innerWidth < 520 ? 22 : 34, h = stage.clientHeight || 360;
    for (var i = 0; i < N; i++) {
      var b = document.createElement("i");
      b.className = "pl-bubble" + (i % 4 === 0 ? " is-spark" : "");
      b.style.setProperty("--x", (4 + Math.random() * 92).toFixed(1) + "%");
      b.style.setProperty("--s", (i % 4 === 0 ? 6 + Math.random() * 6 : 12 + Math.random() * 26).toFixed(1) + "px");
      b.style.setProperty("--d", (Math.random() * 1.1).toFixed(2) + "s");
      b.style.setProperty("--t", (2.8 + Math.random() * 2.2).toFixed(2) + "s");
      b.style.setProperty("--dx", (Math.random() * 70 - 35).toFixed(0) + "px");
      b.style.setProperty("--h", Math.round(h * (0.55 + Math.random() * 0.6)) + "px");
      celebrate.appendChild(b);
    }
    setTimeout(function () { if (celebrate) celebrate.innerHTML = ""; }, 6200);
  }
  function win() {
    if (state !== "playing") return;
    state = "won"; stopTimer(); updateHud(); gridEl.classList.add("is-won");
    if (actions) actions.hidden = true;
    var stars = starsForWin(), rec = window.EdenStars ? window.EdenStars.record(GAME_ID, stars) : { session: stars, best: stars };
    if (window.EdenStars) {
      window.EdenStars.play(stars);                       // même motif de victoire que casse-tête / blind test / mémoire
      window.EdenStars.render(starsBox, stars, { line: t("pairs.star" + stars), detail: t("pairs.starDetail", { moves: moves, hints: hints }), session: rec });
    }
    bubbles();
    var song = lastFound || round.songs[0];
    hintEl.textContent = t("pairs.hintWin"); say(t("pairs.wonText", { title: song.title }));
    if (againBtn) { againBtn.hidden = false; againBtn.textContent = t("pairs.again"); }
    playSong(song);
    try { stage.scrollIntoView({ block: "nearest", behavior: reduced() ? "auto" : "smooth" }); } catch (e) {}
  }

  /* chanson de la dernière paire, EN ENTIER (aucun minuteur d'arrêt ; une chanson déjà en cours n'est pas coupée) */
  function clearEmbed() { if (embedBox) { embedBox.innerHTML = ""; embedBox.hidden = true; } }
  function stopSong() {
    if (window.EdenFullSong) window.EdenFullSong.stop(audio); else try { audio.pause(); } catch (e) {}
    clearEmbed(); if (listenBtn) listenBtn.hidden = true; if (playerBox) playerBox.hidden = true;
  }
  function playSong(song) {
    if (!song || !playerBox) return;
    playerBox.hidden = false;
    if (nowEl) nowEl.textContent = t("pairs.playing", { title: song.title });
    var F = window.EdenFullSong, same = audio && audio.getAttribute("data-id") === song.id;
    if (F && F.busy(audio) && !same) {
      if (listenBtn) { listenBtn.hidden = false; listenBtn.textContent = t("pairs.listen", { title: song.title }); listenBtn.onclick = function () { listenBtn.hidden = true; F.stop(audio); startSong(song); }; }
      return;
    }
    if (F && F.busy(audio) && same) return;
    startSong(song);
  }
  function startSong(song) {
    var F = window.EdenFullSong;
    if (nowEl) nowEl.textContent = t("pairs.playing", { title: song.title });
    playerBox.hidden = false;
    if (window.EdenSongPick && song.id) window.EdenSongPick.record(song.id);
    if (song.audio_url || song.audio_url_aac) {
      clearEmbed(); audio.hidden = false;
      if (F) F.play(audio, { id: song.id, audio: song.audio_url, aac: song.audio_url_aac });
      else { audio.src = song.audio_url; try { audio.currentTime = 0; } catch (e) {} var p = audio.play(); if (p && p.catch) p.catch(function () {}); }
    } else if (song.embed_url) {
      audio.hidden = true;
      if (F) F.embed(embedBox, { id: song.id, embed: song.embed_url, title: song.title });
    }
  }

  /* ——— cycle ——— */
  function showOverlay(show) { if (overlay) overlay.classList.toggle("is-hidden", !show); }
  function renderLevels() {
    levelsEl.innerHTML = "";
    var p = pool();
    levels().forEach(function (lv) {
      var n = pairsFor(lv, p), b = document.createElement("button");
      b.type = "button"; b.className = "pl-level"; b.setAttribute("data-level", lv.id);
      b.setAttribute("aria-pressed", lv.id === levelId ? "true" : "false");
      b.textContent = t("pairs.level." + lv.id, { n: n });
      b.addEventListener("click", function () { setLevel(lv.id); });
      levelsEl.appendChild(b);
    });
  }
  function setLevel(id) {
    levelId = id; try { store("localStorage").setItem("eden-pairs-level", id); } catch (e) {}
    renderLevels();
    if (state === "playing" && !found && !moves) startGame();          // pas encore joué : on redistribue au nouveau niveau
    else if (state === "won" || state === "playing") { /* le niveau s'applique à la prochaine partie */ hintEl.textContent = t("pairs.levelNext"); }
  }
  function startGame() {
    if (window.EdenStars && window.EdenStars.unlock) window.EdenStars.unlock();
    if (window.EdenStars) window.EdenStars.clear(starsBox);
    var p = pool();
    if (p.length < 3) { card.hidden = true; emptyBox.hidden = false; return; }
    card.hidden = false; emptyBox.hidden = true;
    var lv = level(), lang = siteLang(), n = pairsFor(lv, p), set = pickSet(lang), songs = draw(p, n, lang);
    var cards = [];
    songs.forEach(function (s) { set.faces.forEach(function (k) { cards.push({ song: s, kind: k, up: false, matched: false, el: null }); }); });
    shuffle(cards);
    round = { n: n, songs: songs, cards: cards, set: set, cols: 4 };
    moves = 0; hints = 0; found = 0; lastFound = null; flippedCells = []; locked = false; startedAt = 0; stopTimer(); state = "playing";
    stage.classList.remove("is-glow"); if (celebrate) celebrate.innerHTML = ""; gridEl.classList.remove("is-won");
    gridEl.innerHTML = ""; layout(lv);
    cards.forEach(function (c, i) { gridEl.appendChild(makeCell(c, i)); });
    gridEl.hidden = false; showOverlay(false);
    if (startBtn) startBtn.hidden = true; if (againBtn) againBtn.hidden = true; if (actions) actions.hidden = false;
    var nm = set.name && (set.name[lang] || set.name.fr) || "";
    if (setLine) { setLine.hidden = false; setLine.textContent = t("pairs.setLine", { n: n, set: nm }); }
    hintEl.textContent = t("pairs.hintPlay"); say(t("pairs.setLine", { n: n, set: nm }));
    updateHud();
  }
  function showWelcome() {
    state = "idle"; round = null; stopTimer(); startedAt = 0; flippedCells = [];
    showOverlay(true);
    overlayKicker.textContent = t("pairs.welcomeKicker"); overlayTitle.textContent = t("pairs.welcomeTitle"); overlayText.textContent = t("pairs.welcomeText");
    startBtn.hidden = false; startBtn.textContent = t("pairs.start"); againBtn.hidden = true; if (actions) actions.hidden = true;
    gridEl.hidden = true; gridEl.innerHTML = ""; gridEl.classList.remove("is-won"); if (setLine) setLine.hidden = true;
    stage.classList.remove("is-glow"); if (celebrate) celebrate.innerHTML = "";
    if (window.EdenStars) window.EdenStars.clear(starsBox);
    hintEl.textContent = t("pairs.hintIdle"); renderLevels(); updateHud();
  }
  function bind() {
    try { var sv = store("localStorage").getItem("eden-pairs-level"); if (sv) levelId = sv; } catch (e) {}
    if (!levelId && cfg) levelId = cfg.defaultLevel || (cfg.levels[0] && cfg.levels[0].id);
    startBtn.addEventListener("click", startGame);
    againBtn.addEventListener("click", startGame);
    newBtn.addEventListener("click", startGame);
    helpBtn.addEventListener("click", onHelp);
    window.addEventListener("resize", function () { if (round && state !== "idle") { layout(level()); } });
    if (window.EdenI18n && window.EdenI18n.onChange) window.EdenI18n.onChange(function () { stopSong(); init(); });   // langue changée : on arrête la chanson, nouveau corpus
    var toggle = $("nav-toggle"), links = $("nav-links");
    if (toggle && links) toggle.addEventListener("click", function () { var open = links.classList.toggle("is-open"); toggle.setAttribute("aria-expanded", open ? "true" : "false"); });
    init();
  }
  function init() {
    if (loadFailed || !cfg) { showWelcome(); hintEl.textContent = t("pairs.loadError"); startBtn.hidden = true; return; }
    if (levels().length && !levels().some(function (l) { return l.id === levelId; })) levelId = cfg.defaultLevel || levels()[0].id;
    if (pool().length < 3) { card.hidden = true; emptyBox.hidden = false; return; }
    card.hidden = false; emptyBox.hidden = true;
    showWelcome();
  }

  window.EdenPairs = {
    state: function () { return { state: state, level: levelId, moves: moves, hints: hints, found: found, set: round && round.set.id, songs: round ? round.songs.map(function (s) { return { id: s.id, title: s.title, lang: s.lang }; }) : [], kinds: round ? round.cards.map(function (c) { return c.song.id + ":" + c.kind; }) : [] }; },
    pool: function () { return pool().map(function (s) { return { id: s.id, lang: s.lang }; }); }
  };
  load().then(function () {
    if (window.EdenSongPick && window.EdenSongPick.ready && window.EdenSongPick.ready.then) return window.EdenSongPick.ready;
  }).then(bind, bind);
})();
