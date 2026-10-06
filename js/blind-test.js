/* Eden Yours — Blind test : un court extrait d'une chanson cachée, quatre titres, trouve le bon.
   Chansons lues dans tracks.json (les nouvelles apparaissent toutes seules), langue = langue du site
   (localStorage eden-lang, boutons Français / English, ?lang=fr|en comme le casse-tête).
   Bonne réponse : éclat lumineux + étoiles (1 à 3) et leur motif, puis pochette + titre et chanson complète
   (comme la fin du casse-tête : pas de limite de 30 s). Titres sans MP3 (embed_url Suno) :
   lecteur Suno intégré avec caches opaques sur la pochette et le titre. */
(function () {
  "use strict";

  var EXCERPT_SECONDS = 12;
  var CHOICES = 4;
  var MAX_WRONG = 2;
  var CELEBRATE_MS = 1300;
  var CELEBRATE_GENTLE_MS = 700;
  var EMBED_W = 520; // largeur de repli si le bloc n'est pas encore mesuré
  var EMBED_H = 240;

  var allSongs = [];
  var ready = false;
  var lang = null;
  var pool = [];
  var groups = {};
  var groupKeys = [];
  var queue = [];
  var round = 0;
  var found = 0;
  var played = 0;
  var cur = null;
  var mode = null;
  var excerptStart = 0;
  var excerptEnd = 0;
  var celebrateTimer = null;
  var audioCtx = null;
  var revealTimer = null;
  var starsTimer = null;
  var lastStars = 0;
  var starPlays = 0;

  var $ = function (id) { return document.getElementById(id); };
  var card = $("bt-card");
  var emptyBox = $("bt-empty");
  var roundEl = $("bt-round");
  var scoreEl = $("bt-score");
  var disc = $("bt-disc");
  var coverEl = $("bt-cover");
  var titleEl = $("bt-title");
  var mysteryLabel = $("bt-mystery-label");
  var listenRow = $("bt-listen-row");
  var listenBtn = $("bt-listen");
  var embedBox = $("bt-embed");
  var audio = $("bt-audio");
  var hint = $("bt-hint");
  var choicesEl = $("bt-choices");
  var nextBtn = $("bt-next");
  var celebrateEl = $("bt-celebrate");
  var progressFill = $("bt-progress-fill");
  var starsBox = $("bt-stars");

  function setProgress(ratio) {
    if (!progressFill) return;
    var pct = Math.max(0, Math.min(1, ratio || 0)) * 100;
    progressFill.style.width = pct.toFixed(1) + "%";
  }

  function t(key, vars) {
    return window.EdenI18n && window.EdenI18n.t ? window.EdenI18n.t(key, vars) : key;
  }

  function reducedMotion() {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
  }

  function normTitle(s) {
    return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/\s+/g, " ").trim();
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function isEmbed(song) { return !!(song && song.embed && !song.audio); }

  // ---------- Sons d'interface (Web Audio, silencieux si indisponible) ----------
  function ctx() {
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

  /* Bonne réponse : le carillon est remplacé par le motif des étoiles (js/stars.js) :
     une note douce par étoile (arpège majeur montant) + scintillement pour 3 étoiles. */

  /* Petit bourdon doux : deux ondes graves légèrement désaccordées, filtre passe-bas, fondu rapide. */
  function buzz() {
    try {
      var c = ctx();
      if (!c) return;
      var now = c.currentTime + 0.01;
      var filter = c.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 520;
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.17, now + 0.025);
      g.gain.setValueAtTime(0.17, now + 0.16);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
      filter.connect(g);
      g.connect(c.destination);
      [[123, "sawtooth"], [129.5, "square"]].forEach(function (o) {
        var osc = c.createOscillator();
        osc.type = o[1];
        osc.frequency.value = o[0];
        osc.connect(filter);
        osc.start(now);
        osc.stop(now + 0.4);
      });
    } catch (e) { /* silencieux */ }
    // On baisse l'extrait un instant, sans le couper.
    if (!audio.paused) {
      audio.volume = 0.35;
      setTimeout(function () { audio.volume = 1; }, 450);
    }
  }

  // ---------- Données ----------
  function loadTracks() {
    return fetch("tracks.json", { cache: "no-store" })
      .then(function (res) { if (!res.ok) throw new Error("tracks.json"); return res.json(); })
      .then(function (data) {
        var list = data && Array.isArray(data.tracks) ? data.tracks : [];
        allSongs = list.filter(function (x) {
          return x && x.title && (x.lang === "fr" || x.lang === "en") && (x.audio_url || x.embed_url);
        }).map(function (x) {
          return {
            id: x.id,
            title: x.title,
            lang: x.lang,
            cover: x.cover_url || "",
            audio: x.audio_url || null,
            aac: x.audio_url_aac || null,
            embed: x.embed_url || null,
            sunoTitle: x.sunoTitle || x.title,
            duration: Number(x.duration) || 0
          };
        });
      })
      .catch(function (err) { console.error(err); allSongs = []; });
  }

  function buildPool() {
    pool = allSongs.filter(function (s) { return s.lang === lang; });
    groups = {};
    groupKeys = [];
    pool.forEach(function (s) {
      var k = normTitle(s.title);
      if (!groups[k]) { groups[k] = { title: s.title, ids: [] }; groupKeys.push(k); }
      groups[k].ids.push(s.id);
    });
  }

  /* ?force=<début d'id> : la première manche utilise cette chanson (débogage, sans effet sinon). */
  var forceId = (function () {
    try { return (new URLSearchParams(window.location.search).get("force") || "").toLowerCase(); } catch (e) { return ""; }
  })();

  function nextSong() {
    if (forceId) {
      var wanted = forceId;
      forceId = "";
      for (var i = 0; i < pool.length; i++) {
        if (pool[i].id.toLowerCase().indexOf(wanted) === 0) {
          var forced = pool[i];
          queue = shuffle(pool.filter(function (s) { return s !== forced; }));
          return forced;
        }
      }
    }
    if (!queue.length) {
      queue = shuffle(pool.slice());
      // évite de rejouer tout de suite la même chanson au changement de cycle
      if (cur && queue.length > 1 && queue[0].id === cur.song.id) queue.push(queue.shift());
    }
    return queue.shift();
  }

  // ---------- Affichage ----------
  function paintScore() {
    scoreEl.textContent = t("blind.score", { found: found, played: played });
    roundEl.textContent = t("blind.round", { n: Math.max(1, round) });
  }

  function setListenLabel() {
    if (mode === "excerpt") listenBtn.textContent = t("blind.playing");
    else if (cur && cur.heard) listenBtn.textContent = t("blind.replay");
    else listenBtn.textContent = t("blind.listen");
  }

  function paintTexts() {
    paintScore();
    setListenLabel();
    nextBtn.textContent = t("blind.next");
    mysteryLabel.textContent = t("blind.mystery");
    if (cur && !cur.resolved) titleEl.textContent = t("blind.question");
    if (cur && cur.hintKey) hint.textContent = t(cur.hintKey);
  }

  function setHint(key) {
    if (cur) cur.hintKey = key;
    hint.textContent = t(key);
  }

  function paintLangButtons() {
    [["choose-fr", "fr"], ["choose-en", "en"]].forEach(function (p) {
      var el = $(p[0]);
      if (!el) return;
      var on = lang === p[1];
      el.classList.toggle("is-active", on);
      el.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  // ---------- Lecteur Suno masqué (titres sans MP3, générique pour tout embed_url) ----------
  /* L'iframe garde sa vraie taille (240 px de haut, aucune mise à l'échelle). Mise en page
     responsive du lecteur Suno (mesurée oct. 2026 sur les 10 titres intégrés) :
       < 320 px   : pas de pochette ; titre sur 1 ligne y 79-101 ; lecture x 8, y 110-162
       320-479 px : pochette à gauche ; le titre passe sur 2 lignes selon sa longueur, ce qui
                    décale le bouton lecture (y 110-162 ou 122-174) → imprévisible, on l'évite
       >= 480 px  : pochette x 16-160 ; titre sur 1 ligne y 79-101 ; lecture x 176, y 110-162
     On choisit donc la largeur de l'iframe : 480-520 px si le bloc le permet, sinon 319 px
     (pas de pochette du tout). Le titre Suno tient alors sur une ligne (mesuré jusqu'à
     ~250 px de texte) et les caches sont fixes. Si le titre Suno est très long (risque de
     2 lignes), on prend des caches de compromis qui couvrent les deux mises en page. */
  var LONG_TITLE_CHARS = 30;

  function embedWidth(box) {
    if (box >= 480) return Math.min(box, EMBED_W);
    return Math.min(box, 319);
  }

  function maskLayout(w, title) {
    var long = String(title || "").length > (w >= 480 ? Math.floor((w - 200) / 10) : LONG_TITLE_CHARS);
    var top = long ? 116 : 106;
    var bottom = 166;
    return { top: top, bottom: bottom, left: w >= 480 ? 171 : 0 };
  }

  function fitEmbed() {
    var inner = embedBox.querySelector(".bt-embed-inner");
    if (!inner || embedBox.hidden) return;
    var w = embedWidth(Math.round(embedBox.clientWidth || EMBED_W));
    inner.style.width = w + "px";
    var m = maskLayout(w, cur && cur.song ? cur.song.sunoTitle : "");
    var top = inner.querySelector(".bt-mask-top");
    var bottom = inner.querySelector(".bt-mask-bottom");
    var left = inner.querySelector(".bt-mask-left");
    var win = inner.querySelector(".bt-window");
    if (top) top.style.height = m.top + "px";
    if (bottom) { bottom.style.top = m.bottom + "px"; bottom.style.height = (EMBED_H - m.bottom) + "px"; }
    if (left) {
      left.hidden = m.left <= 0;
      left.style.top = m.top + "px";
      left.style.height = (m.bottom - m.top) + "px";
      left.style.width = m.left + "px";
    }
    if (win) {
      win.style.top = m.top + "px";
      win.style.height = (m.bottom - m.top) + "px";
      win.style.left = m.left + "px";
    }
  }

  function showEmbed(song) {
    embedBox.innerHTML =
      '<div class="bt-embed-inner">' +
      '<iframe height="' + EMBED_H + '" frameborder="0" allow="autoplay; clipboard-write; encrypted-media"></iframe>' +
      '<div class="bt-mask bt-mask-top" aria-hidden="true"><span class="bt-mask-label"></span></div>' +
      '<div class="bt-mask bt-mask-left" aria-hidden="true"><span>?</span></div>' +
      '<div class="bt-mask bt-mask-bottom" aria-hidden="true"></div>' +
      '<div class="bt-window" aria-hidden="true"></div>' +
      "</div>";
    var frame = embedBox.querySelector("iframe");
    frame.setAttribute("title", t("blind.mystery") + " — Suno");
    frame.setAttribute("width", "100%");
    embedBox.querySelector(".bt-mask-label").textContent = t("blind.embedMask");
    embedBox.classList.remove("is-revealed");
    embedBox.hidden = false;
    fitEmbed();
    frame.src = song.embed;
  }

  function clearEmbed() {
    embedBox.innerHTML = "";
    embedBox.hidden = true;
    embedBox.classList.remove("is-revealed");
  }

  window.addEventListener("resize", fitEmbed);

  // ---------- Extrait / lecture complète ----------
  function stopAudio() {
    mode = null;
    try { audio.pause(); } catch (e) { /* ignore */ }
  }

  function resetAudio() {
    stopAudio();
    audio.controls = false;
    audio.hidden = true;
    audio.onerror = null;
    audio.removeAttribute("data-tried-aac");
    audio.removeAttribute("data-id");
    audio.removeAttribute("src");
    try { audio.load(); } catch (e) { /* ignore */ }
  }

  function pickExcerptWindow(song) {
    var dur = song.duration || audio.duration || 180;
    var start = dur * (0.2 + Math.random() * 0.4);
    if (start + EXCERPT_SECONDS > dur - 2) start = Math.max(0, dur - EXCERPT_SECONDS - 2);
    excerptStart = Math.floor(start * 10) / 10;
    excerptEnd = excerptStart + EXCERPT_SECONDS;
  }

  function bindAacFallback(song, suffix) {
    audio.onerror = function () {
      if (song.aac && !audio.getAttribute("data-tried-aac")) {
        audio.setAttribute("data-tried-aac", "1");
        audio.src = song.aac + (suffix || "");
        audio.play().catch(function () {});
      }
    };
  }

  function playExcerpt() {
    if (!cur || cur.resolved || isEmbed(cur.song)) return;
    var song = cur.song;
    if (!audio.getAttribute("data-id") || audio.getAttribute("data-id") !== song.id) {
      audio.setAttribute("data-id", song.id);
      audio.removeAttribute("data-tried-aac");
      bindAacFallback(song, "#t=" + excerptStart);
      audio.src = song.audio + "#t=" + excerptStart;
    } else {
      try { audio.currentTime = excerptStart; } catch (e) { /* ignore */ }
    }
    audio.volume = 1;
    mode = "excerpt";
    excerptPlayedFrom = null;
    setProgress(0);
    cur.heard = true;
    setListenLabel();
    var p = audio.play();
    if (p && typeof p.catch === "function") {
      p.catch(function () {
        mode = null;
        setListenLabel();
        setHint("blind.playBlocked");
      });
    }
  }

  audio.addEventListener("loadedmetadata", function () {
    if (mode === "excerpt" && Math.abs(audio.currentTime - excerptStart) > 1) {
      try { audio.currentTime = excerptStart; } catch (e) { /* ignore */ }
    }
  });
  /* Si le serveur refuse le saut (#t=), la lecture part de 0 : on compte alors le temps
     réellement joué pour arrêter l'extrait après EXCERPT_SECONDS quand même. */
  var excerptPlayedFrom = null;
  audio.addEventListener("playing", function () {
    if (mode === "excerpt" && excerptPlayedFrom === null) excerptPlayedFrom = audio.currentTime;
  });
  audio.addEventListener("timeupdate", function () {
    if (mode !== "excerpt") return;
    var seekOk = audio.currentTime >= excerptStart - 1;
    var elapsed = seekOk ? audio.currentTime - excerptStart
      : audio.currentTime - (excerptPlayedFrom === null ? 0 : excerptPlayedFrom);
    setProgress(elapsed / EXCERPT_SECONDS);
    if (elapsed >= EXCERPT_SECONDS) {
      setProgress(1);
      stopAudio();
      setListenLabel();
    }
  });
  audio.addEventListener("ended", function () {
    if (mode === "excerpt") { mode = null; setListenLabel(); }
  });

  function playFull(song) {
    stopAudio();
    audio.setAttribute("data-id", song.id + ":full");
    audio.removeAttribute("data-tried-aac");
    bindAacFallback(song, "");
    audio.src = song.audio;
    audio.controls = true;
    audio.hidden = false;
    audio.volume = 1;
    mode = "full";
    try { audio.currentTime = 0; } catch (e) { /* ignore */ }
    var p = audio.play();
    if (p && typeof p.catch === "function") {
      p.catch(function () { setHint("blind.playBlocked"); });
    }
  }

  // ---------- Éclat lumineux ----------
  function celebrate(done, holdMs) {
    var gentle = reducedMotion();
    var html = '<div class="bt-burst"></div>';
    if (!gentle) {
      for (var i = 0; i < 14; i++) {
        var x = Math.round(8 + Math.random() * 84);
        var y = Math.round(18 + Math.random() * 70);
        var size = Math.round(6 + Math.random() * 12);
        var delay = Math.round(Math.random() * 380);
        var rise = Math.round(30 + Math.random() * 70);
        html += '<span class="bt-orb" style="--x:' + x + "%;--y:" + y + "%;--s:" + size +
          "px;--d:" + delay + "ms;--rise:-" + rise + 'px"></span>';
      }
    }
    celebrateEl.innerHTML = html;
    celebrateEl.classList.toggle("is-gentle", gentle);
    celebrateEl.hidden = false;
    // force reflow pour relancer l'animation
    void celebrateEl.offsetWidth;
    celebrateEl.classList.add("is-on");
    clearTimeout(celebrateTimer);
    celebrateTimer = setTimeout(function () {
      celebrateEl.classList.remove("is-on");
      celebrateEl.hidden = true;
      celebrateEl.innerHTML = "";
      done();
    }, Math.max(gentle ? CELEBRATE_GENTLE_MS : CELEBRATE_MS, holdMs || 0));
  }

  // ---------- Manche ----------
  function renderChoices() {
    choicesEl.innerHTML = "";
    cur.choices.forEach(function (key) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "bt-choice";
      btn.dataset.key = key;
      btn.textContent = groups[key].title;
      btn.addEventListener("click", function () { pick(key, btn); });
      choicesEl.appendChild(btn);
    });
  }

  function lockChoices() {
    var btns = choicesEl.querySelectorAll(".bt-choice");
    for (var i = 0; i < btns.length; i++) {
      btns[i].disabled = true;
      if (btns[i].dataset.key === cur.answer) btns[i].classList.add("is-right");
    }
  }

  /* Étoiles : 3 = bon titre au 1er choix, 2 = au 2e, 1 = chanson révélée. Renvoie la durée du motif (ms). */
  function awardStars(stars) {
    var S = window.EdenStars;
    lastStars = stars;
    if (cur) cur.stars = stars;
    if (!S) return 0;
    var session = S.record("blind", stars);
    S.render(starsBox, stars, { line: t("stars.blind" + stars), session: session });
    S.play(stars);
    starPlays += 1;
    return S.motifMs(stars);
  }

  function startRound(autoPlay) {
    clearTimeout(revealTimer);
    clearTimeout(starsTimer);
    if (window.EdenStars) window.EdenStars.clear(starsBox);
    clearTimeout(celebrateTimer);
    celebrateEl.hidden = true;
    celebrateEl.classList.remove("is-on");
    celebrateEl.innerHTML = "";
    resetAudio();
    clearEmbed();
    var song = nextSong();
    if (!song) return;
    round += 1;
    var answer = normTitle(song.title);
    var others = shuffle(groupKeys.filter(function (k) { return k !== answer; })).slice(0, CHOICES - 1);
    cur = {
      song: song,
      answer: answer,
      choices: shuffle([answer].concat(others)),
      wrong: 0,
      resolved: false,
      celebrating: false,
      heard: false,
      hintKey: null
    };
    pickExcerptWindow(song);
    setProgress(0);

    disc.hidden = false;
    coverEl.hidden = true;
    coverEl.removeAttribute("src");
    titleEl.textContent = t("blind.question");
    card.classList.remove("is-found", "is-revealed");
    nextBtn.hidden = true;
    renderChoices();
    paintScore();

    if (isEmbed(song)) {
      listenRow.hidden = true;
      showEmbed(song);
      setHint("blind.embedHint");
    } else {
      listenRow.hidden = false;
      setListenLabel();
      setHint("blind.tapToStart");
      if (autoPlay) playExcerpt();
    }
  }

  function reveal(foundIt, fullDelay) {
    var song = cur.song;
    disc.hidden = true;
    if (song.cover) {
      coverEl.src = song.cover;
      coverEl.alt = song.title;
      coverEl.hidden = false;
    }
    titleEl.textContent = song.title;
    card.classList.add("is-revealed");
    if (foundIt) card.classList.add("is-found");
    listenRow.hidden = true;
    nextBtn.hidden = false;
    if (isEmbed(song)) {
      embedBox.classList.add("is-revealed");
      setHint(foundIt ? "blind.embedReveal" : "blind.revealGentle");
    } else {
      setHint(foundIt ? "blind.right" : "blind.revealGentle");
      clearTimeout(revealTimer);
      if (fullDelay > 0) {
        revealTimer = setTimeout(function () { if (cur && cur.song === song) playFull(song); }, fullDelay);
      } else {
        playFull(song);
      }
    }
  }

  function pick(key, btn) {
    if (!cur || cur.resolved || cur.celebrating) return;
    if (key === cur.answer) {
      cur.resolved = true;
      cur.celebrating = true;
      found += 1;
      played += 1;
      stopAudio();
      lockChoices();
      paintScore();
      var hold = awardStars(window.EdenStars ? window.EdenStars.blindStars(cur.wrong + 1, false) : 3);
      celebrate(function () {
        cur.celebrating = false;
        reveal(true);
      }, hold);
      return;
    }
    buzz();
    btn.classList.add("is-wrong");
    btn.disabled = true;
    cur.wrong += 1;
    if (cur.wrong >= MAX_WRONG) {
      cur.resolved = true;
      played += 1;
      stopAudio();
      lockChoices();
      paintScore();
      // Le petit bourdon d'abord, puis une étoile et sa note, puis la chanson.
      var BUZZ_GAP = 420;
      var oneMs = window.EdenStars ? window.EdenStars.motifMs(1) : 0;
      clearTimeout(starsTimer);
      starsTimer = setTimeout(function () { awardStars(window.EdenStars ? window.EdenStars.blindStars(cur.wrong + 1, true) : 1); }, BUZZ_GAP);
      reveal(false, BUZZ_GAP + oneMs);
    } else {
      setHint("blind.wrong");
    }
  }

  listenBtn.addEventListener("click", function () {
    if (mode === "excerpt") return;
    ctx(); // débloque le Web Audio sur ce geste
    playExcerpt();
  });
  nextBtn.addEventListener("click", function () {
    ctx();
    startRound(true);
  });

  // ---------- Langue ----------
  function showEmpty() {
    resetAudio();
    clearEmbed();
    cur = null;
    card.hidden = true;
    emptyBox.hidden = false;
  }

  function applyLang(next, force) {
    if (next !== "fr" && next !== "en") return;
    if (!force && lang === next && cur) { paintLangButtons(); paintTexts(); return; }
    lang = next;
    paintLangButtons();
    if (!ready) return;
    round = 0; found = 0; played = 0; queue = []; cur = null;
    buildPool();
    if (groupKeys.length < 2) { showEmpty(); return; }
    emptyBox.hidden = true;
    card.hidden = false;
    startRound(false);
    paintTexts(); // libellés (dont « Chanson suivante » / « Next song ») dans la langue choisie
  }

  function chooseLang(next) {
    if (window.EdenI18n && window.EdenI18n.setLang) { window.EdenI18n.setLang(next); return; }
    applyLang(next);
  }

  $("choose-fr").addEventListener("click", function () { chooseLang("fr"); });
  $("choose-en").addEventListener("click", function () { chooseLang("en"); });

  var toggle = $("nav-toggle");
  var links = $("nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () { links.classList.toggle("open"); });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { links.classList.remove("open"); });
    });
  }

  function readQuery() {
    try {
      var q = new URLSearchParams(window.location.search).get("lang");
      if (q === "fr" || q === "en") return q;
    } catch (e) { /* ignore */ }
    return null;
  }

  if (window.EdenI18n && window.EdenI18n.onChange) {
    window.EdenI18n.onChange(function (l) { applyLang(l); });
  }
  var fromQuery = readQuery();
  if (fromQuery && window.EdenI18n && window.EdenI18n.setLang) window.EdenI18n.setLang(fromQuery);
  var initial = (window.EdenI18n && window.EdenI18n.getLang && window.EdenI18n.getLang()) || fromQuery || "fr";
  lang = initial;
  paintLangButtons();

  loadTracks().then(function () {
    ready = true;
    var l = (window.EdenI18n && window.EdenI18n.getLang && window.EdenI18n.getLang()) || lang;
    applyLang(l, true);
  });

  window.EdenBlindTest = {
    state: function () { return { lang: lang, round: round, found: found, played: played, answer: cur && cur.song && cur.song.title, mode: mode, stars: lastStars, starPlays: starPlays }; }
  };
})();
