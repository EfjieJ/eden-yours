/* Eden Yours — Mémoire des pochettes : paires de covers, chimes soft, chanson entière à la victoire. */
(function () {
  "use strict";

  var MATCH_PLAY_S = 10;
  var VICTORY_PLAY_S = 15;
  var FLIP_BACK_MS = 780;
  var GAME_ID = "memoire";
  var PAIR_PREF = 6;
  var PAIR_MAX = 8;

  var audioCtx = null;
  var tracksCache = [];
  var deck = [];
  var flipped = [];
  var matchedIds = {};
  var matchedTracks = [];
  var pairsTotal = 0;
  var pairsFound = 0;
  var moves = 0;
  var locked = false;
  var state = "idle"; /* idle | playing | won */
  var reduced = false;
  var flipBackTimer = null;
  var clipStopHandler = null;

  var $ = function (id) { return document.getElementById(id); };
  var board = $("mp-board");
  var overlay = $("mp-overlay");
  var overlayKicker = $("mp-overlay-kicker");
  var overlayTitle = $("mp-overlay-title");
  var overlayText = $("mp-overlay-text");
  var startBtn = $("mp-start");
  var againBtn = $("mp-again");
  var statusEl = $("mp-status");
  var scoreEl = $("mp-score");
  var hintEl = $("mp-hint");
  var starsBox = $("mp-stars");
  var playerBox = $("mp-player");
  var nowPlaying = $("mp-now-playing");
  var audio = $("mp-audio");
  var embedBox = $("mp-embed");
  var emptyBox = $("mp-empty");
  var card = $("mp-card");

  function t(key, vars) {
    return window.EdenI18n && window.EdenI18n.t ? window.EdenI18n.t(key, vars) : key;
  }

  function siteLang() {
    if (window.EdenSongPick) return window.EdenSongPick.lang();
    try {
      if (window.EdenI18n && window.EdenI18n.getLang) return window.EdenI18n.getLang();
      var stored = localStorage.getItem("eden-lang");
      if (stored === "en" || stored === "fr") return stored;
    } catch (e) {}
    var q = new URLSearchParams(location.search).get("lang");
    return q === "en" ? "en" : "fr";
  }

  function reducedMotion() {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function pickRandom(arr) {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function ctxAudio() {
    try {
      if (!audioCtx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        audioCtx = new AC();
      }
      if (audioCtx.state === "suspended" && audioCtx.resume) audioCtx.resume();
      return audioCtx;
    } catch (e) { return null; }
  }

  function softChime() {
    try {
      var c = ctxAudio();
      if (!c) return;
      var now = c.currentTime + 0.01;
      [523.25, 659.25, 783.99].forEach(function (f, i) {
        var o = c.createOscillator();
        var g = c.createGain();
        o.type = "sine";
        o.frequency.value = f;
        var t0 = now + i * 0.07;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.1, t0 + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
        o.connect(g); g.connect(c.destination);
        o.start(t0); o.stop(t0 + 0.5);
      });
    } catch (e) {}
  }

  function missChime() {
    try {
      var c = ctxAudio();
      if (!c) return;
      var now = c.currentTime + 0.01;
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(392, now);
      o.frequency.exponentialRampToValueAtTime(294, now + 0.28);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.06, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      o.connect(g); g.connect(c.destination);
      o.start(now); o.stop(now + 0.4);
    } catch (e) {}
  }

  function winChime() {
    try {
      var c = ctxAudio();
      if (!c) return;
      var now = c.currentTime + 0.01;
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        var o = c.createOscillator();
        var g = c.createGain();
        o.type = "triangle";
        o.frequency.value = f;
        var t0 = now + i * 0.1;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.11, t0 + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
        o.connect(g); g.connect(c.destination);
        o.start(t0); o.stop(t0 + 0.75);
      });
    } catch (e) {}
  }

  function clearEmbed() {
    if (!embedBox) return;
    embedBox.innerHTML = "";
    embedBox.hidden = true;
  }

  function stopClip() {
    try {
      if (audio) {
        if (clipStopHandler) {
          audio.removeEventListener("timeupdate", clipStopHandler);
          clipStopHandler = null;
        }
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        audio.hidden = false;
      }
    } catch (e) {}
    clearEmbed();
    if (playerBox) playerBox.hidden = true;
  }

  /* Chanson entière, de 0:00 à la fin : aucun minuteur d'arrêt ; une chanson déjà en cours n'est jamais coupée
     (la paire suivante / la victoire la laissent finir). */
  function playAudioClip(song, seconds, showPlayer) {
    if (!song || !song.audio || !audio) return false;
    try {
      if (window.EdenFullSong && window.EdenFullSong.busy(audio)) {
        if (showPlayer && playerBox) playerBox.hidden = false;
        return true;
      }
      stopClip();
      if (showPlayer && playerBox) playerBox.hidden = false;
      if (nowPlaying) nowPlaying.textContent = t("memoire.playing", { title: song.title });
      if (window.EdenFullSong) return window.EdenFullSong.play(audio, { id: song.id, audio: song.audio, aac: song.aac });
      audio.hidden = false;
      audio.src = song.audio;
      audio.currentTime = 0;
      var p = audio.play();
      if (p && p.catch) p.catch(function () {});
      return true;
    } catch (e) { return false; }
  }

  function showEmbed(song) {
    if (!embedBox || !song || !song.embed) return false;
    clearEmbed();
    var frame = document.createElement("iframe");
    frame.src = song.embed;
    frame.width = "100%";
    frame.height = "180";
    frame.setAttribute("frameborder", "0");
    frame.setAttribute("allow", "autoplay; clipboard-write; encrypted-media");
    frame.setAttribute("title", (song.title || "Suno") + " — Suno");
    frame.className = "mp-suno-embed";
    embedBox.appendChild(frame);
    embedBox.hidden = false;
    if (audio) audio.hidden = true;
    if (playerBox) playerBox.hidden = false;
    if (nowPlaying) nowPlaying.textContent = t("memoire.playing", { title: song.title });
    return true;
  }

  function tracksForLang() {
    var lang = siteLang();
    return tracksCache.filter(function (tr) {
      return tr.lang === lang && tr.cover;
    });
  }

  function pairCountFor(pool) {
    if (pool.length >= PAIR_MAX) return PAIR_MAX;
    if (pool.length >= PAIR_PREF) return PAIR_PREF;
    return pool.length;
  }

  function buildDeck() {
    var pool = tracksForLang().slice();
    shuffle(pool);
    var n = pairCountFor(pool);
    if (n < 2) return null;
    var chosen = pool.slice(0, n);
    var cards = [];
    chosen.forEach(function (tr) {
      cards.push({ uid: tr.id + "-a", trackId: tr.id, track: tr });
      cards.push({ uid: tr.id + "-b", trackId: tr.id, track: tr });
    });
    shuffle(cards);
    return { cards: cards, pairs: n, tracks: chosen };
  }

  function updateHud() {
    if (scoreEl) {
      scoreEl.textContent = t("memoire.score", { found: pairsFound, total: pairsTotal || PAIR_PREF });
    }
    if (statusEl) {
      if (state === "idle") statusEl.textContent = t("memoire.ready");
      else if (state === "won") statusEl.textContent = t("memoire.wonStatus");
      else statusEl.textContent = t("memoire.moves", { n: moves });
    }
  }

  function showOverlay(show) {
    if (!overlay) return;
    overlay.classList.toggle("is-hidden", !show);
  }

  function renderBoard(cards, pairs) {
    if (!board) return;
    board.innerHTML = "";
    board.classList.toggle("is-pairs-6", pairs === 6);
    board.classList.toggle("is-pairs-8", pairs === 8);
    board.hidden = false;
    cards.forEach(function (item, index) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mp-tile";
      btn.setAttribute("role", "gridcell");
      btn.setAttribute("data-uid", item.uid);
      btn.setAttribute("data-track", item.trackId);
      btn.setAttribute("aria-label", t("memoire.cardAria", { n: index + 1 }));
      btn.innerHTML =
        '<span class="mp-tile-inner">' +
          '<span class="mp-face mp-face--back" aria-hidden="true"></span>' +
          '<span class="mp-face mp-face--front">' +
            '<img src="' + item.track.cover.replace(/"/g, "") + '" alt="" loading="lazy" draggable="false">' +
          "</span>" +
        "</span>";
      btn.addEventListener("click", function () { onFlip(btn, item); });
      board.appendChild(btn);
    });
  }

  function tileEl(uid) {
    if (!board) return null;
    return board.querySelector('[data-uid="' + uid + '"]');
  }

  function onFlip(btn, item) {
    if (state !== "playing" || locked) return;
    if (matchedIds[item.trackId]) return;
    if (btn.classList.contains("is-flipped")) return;
    if (flipped.length >= 2) return;

    btn.classList.add("is-flipped");
    btn.setAttribute("aria-label", item.track.title || t("memoire.cardOpen"));
    flipped.push({ btn: btn, item: item });

    if (flipped.length < 2) {
      if (hintEl) hintEl.textContent = t("memoire.hintPick");
      return;
    }

    moves += 1;
    updateHud();
    locked = true;
    var a = flipped[0];
    var b = flipped[1];

    if (a.item.trackId === b.item.trackId) {
      matchedIds[a.item.trackId] = true;
      pairsFound += 1;
      matchedTracks.push(a.item.track);
      a.btn.classList.add("is-matched");
      b.btn.classList.add("is-matched");
      a.btn.setAttribute("aria-disabled", "true");
      b.btn.setAttribute("aria-disabled", "true");
      softChime();
      if (a.item.track.audio) {
        playAudioClip(a.item.track, MATCH_PLAY_S, false);
      }
      if (hintEl) hintEl.textContent = t("memoire.match", { title: a.item.track.title });
      updateHud();
      flipped = [];
      locked = false;
      if (pairsFound >= pairsTotal) {
        endWin();
      }
      return;
    }

    missChime();
    if (hintEl) hintEl.textContent = t("memoire.miss");
    a.btn.classList.add("is-miss");
    b.btn.classList.add("is-miss");
    var delay = reduced ? 280 : FLIP_BACK_MS;
    if (flipBackTimer) clearTimeout(flipBackTimer);
    flipBackTimer = setTimeout(function () {
      a.btn.classList.remove("is-flipped", "is-miss");
      b.btn.classList.remove("is-flipped", "is-miss");
      a.btn.setAttribute("aria-label", t("memoire.cardAria", { n: "?" }));
      b.btn.setAttribute("aria-label", t("memoire.cardAria", { n: "?" }));
      flipped = [];
      locked = false;
      if (hintEl) hintEl.textContent = t("memoire.hintPlay");
    }, delay);
  }

  function starsForWin() {
    if (!pairsTotal) return 1;
    var ideal = pairsTotal * 1.6;
    if (moves <= Math.ceil(ideal)) return 3;
    if (moves <= Math.ceil(pairsTotal * 2.4)) return 2;
    return 1;
  }

  function endWin() {
    state = "won";
    winChime();
    var stars = starsForWin();
    var rec = window.EdenStars ? window.EdenStars.record(GAME_ID, stars) : { session: stars, best: stars, isNewBest: false };
    if (window.EdenStars) {
      window.EdenStars.play(stars);
      window.EdenStars.render(starsBox, stars, {
        line: t("memoire.star" + stars),
        detail: t("memoire.starDetail", { moves: moves, pairs: pairsTotal }),
        session: rec
      });
    }

    showOverlay(true);
    if (overlayKicker) overlayKicker.textContent = t("memoire.wonKicker");
    if (overlayTitle) overlayTitle.textContent = t("memoire.wonTitle");
    if (overlayText) overlayText.textContent = t("memoire.wonText", { moves: moves, pairs: pairsTotal });
    if (startBtn) startBtn.hidden = true;
    if (againBtn) {
      againBtn.hidden = false;
      againBtn.textContent = t("memoire.again");
    }
    if (hintEl) hintEl.textContent = t("memoire.hintWin");
    updateHud();
    playVictoryTrack();
  }

  function playVictoryTrack() {
    var withAudio = matchedTracks.filter(function (tr) { return tr.audio; });
    var song = pickRandom(withAudio.length ? withAudio : matchedTracks);
    if (!song) return;
    if (song.audio) {
      playAudioClip(song, VICTORY_PLAY_S, true);
      return;
    }
    if (song.embed) showEmbed(song);
  }

  function startGame() {
    if (!(window.EdenFullSong && window.EdenFullSong.busy(audio))) stopClip(); /* une chanson en cours continue */
    if (flipBackTimer) { clearTimeout(flipBackTimer); flipBackTimer = null; }
    if (window.EdenStars) window.EdenStars.clear(starsBox);
    ctxAudio();
    if (window.EdenStars && window.EdenStars.unlock) window.EdenStars.unlock();

    var built = buildDeck();
    if (!built) {
      if (card) card.hidden = true;
      if (emptyBox) emptyBox.hidden = false;
      return;
    }
    if (card) card.hidden = false;
    if (emptyBox) emptyBox.hidden = true;

    deck = built.cards;
    pairsTotal = built.pairs;
    pairsFound = 0;
    moves = 0;
    matchedIds = {};
    matchedTracks = [];
    flipped = [];
    locked = false;
    state = "playing";
    reduced = reducedMotion();

    renderBoard(deck, pairsTotal);
    showOverlay(false);
    if (startBtn) startBtn.hidden = true;
    if (againBtn) againBtn.hidden = true;
    if (hintEl) hintEl.textContent = t("memoire.hintPlay");
    updateHud();
  }

  function showWelcome() {
    state = "idle";
    showOverlay(true);
    if (overlayKicker) overlayKicker.textContent = t("memoire.welcomeKicker");
    if (overlayTitle) overlayTitle.textContent = t("memoire.welcomeTitle");
    if (overlayText) overlayText.textContent = t("memoire.welcomeText");
    if (startBtn) {
      startBtn.hidden = false;
      startBtn.textContent = t("memoire.start");
    }
    if (againBtn) againBtn.hidden = true;
    if (board) { board.hidden = true; board.innerHTML = ""; }
    if (hintEl) hintEl.textContent = t("memoire.hintIdle");
    updateHud();
  }

  function loadTracks() {
    return fetch("tracks.json", { cache: "no-store" })
      .then(function (res) { if (!res.ok) throw new Error("tracks"); return res.json(); })
      .then(function (data) {
        var list = (data && data.tracks) || data || [];
        tracksCache = list.map(function (tr) {
          return {
            id: tr.id,
            title: tr.title,
            lang: tr.lang,
            cover: tr.cover_url || tr.cover || null,
            audio: tr.audio_url || tr.audio || null,
            aac: tr.audio_url_aac || null,
            embed: tr.embed_url || tr.embed || null
          };
        }).filter(function (tr) { return tr.id && tr.cover; });
      })
      .catch(function () { tracksCache = []; });
  }

  function bind() {
    reduced = reducedMotion();

    if (startBtn) startBtn.addEventListener("click", startGame);
    if (againBtn) againBtn.addEventListener("click", startGame);

    if (window.EdenI18n && window.EdenI18n.onChange) {
      window.EdenI18n.onChange(function () {
        /* Langue changée : recommencer avec le corpus FR ou EN */
        stopClip();
        showWelcome();
      });
    }

    var toggle = document.getElementById("nav-toggle");
    var links = document.getElementById("nav-links");
    if (toggle && links) {
      toggle.addEventListener("click", function () {
        var open = links.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }

    var pool = tracksForLang();
    if (pairCountFor(pool) < 2) {
      if (card) card.hidden = true;
      if (emptyBox) emptyBox.hidden = false;
      return;
    }
    showWelcome();
  }

  loadTracks().finally(bind);
})();
