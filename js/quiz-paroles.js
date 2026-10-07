/* Eden Yours — Quiz paroles : extrait vérifié → 4 choix → à la bonne réponse, écoute 20–30 s. */
(function () {
  "use strict";

  var PLAY_DEFAULT = 25;
  var audioCtx = null;
  var stopTimer = null;
  var queue = [];
  var idx = 0;
  var found = 0;
  var played = 0;
  var locked = false;
  var playSeconds = PLAY_DEFAULT;
  var lang = "fr";

  var $ = function (id) { return document.getElementById(id); };
  var card = $("qp-card");
  var emptyBox = $("qp-empty");
  var roundEl = $("qp-round");
  var scoreEl = $("qp-score");
  var typeEl = $("qp-type");
  var questionEl = $("qp-question");
  var excerptEl = $("qp-excerpt");
  var choicesEl = $("qp-choices");
  var hintEl = $("qp-hint");
  var starsBox = $("qp-stars");
  var nextBtn = $("qp-next");
  var playerBox = $("qp-player");
  var nowPlaying = $("qp-now-playing");
  var audio = $("qp-audio");
  var embedBox = $("qp-embed");

  function t(key, vars) {
    return window.EdenI18n && window.EdenI18n.t ? window.EdenI18n.t(key, vars) : key;
  }

  function siteLang() {
    try {
      if (window.EdenI18n && window.EdenI18n.getLang) return window.EdenI18n.getLang();
      var stored = localStorage.getItem("eden-lang");
      if (stored === "en" || stored === "fr") return stored;
    } catch (e) {}
    var q = new URLSearchParams(location.search).get("lang");
    return q === "en" ? "en" : "fr";
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

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

  function softChime() {
    try {
      var c = ctx();
      if (!c) return;
      var now = c.currentTime + 0.01;
      [659.25, 830.61, 987.77].forEach(function (f, i) {
        var o = c.createOscillator();
        var g = c.createGain();
        o.type = "sine";
        o.frequency.value = f;
        var t0 = now + i * 0.09;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
        o.connect(g); g.connect(c.destination);
        o.start(t0); o.stop(t0 + 0.6);
      });
    } catch (e) {}
  }

  function softBuzz() {
    try {
      var c = ctx();
      if (!c) return;
      var now = c.currentTime + 0.01;
      var filter = c.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 480;
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.14, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
      filter.connect(g); g.connect(c.destination);
      [[130, "sawtooth"], [136, "square"]].forEach(function (p) {
        var o = c.createOscillator();
        o.type = p[1]; o.frequency.value = p[0];
        o.connect(filter); o.start(now); o.stop(now + 0.34);
      });
    } catch (e) {}
  }

  function stopAudio() {
    if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
    if (audio) {
      try { audio.pause(); } catch (e) {}
      try { audio.removeAttribute("src"); audio.load(); } catch (e) {}
    }
    if (embedBox) { embedBox.innerHTML = ""; embedBox.hidden = true; }
    if (playerBox) playerBox.hidden = true;
  }

  function playReward(q) {
    stopAudio();
    if (!playerBox) return;
    playerBox.hidden = false;
    if (nowPlaying) nowPlaying.textContent = t("quiz.playing", { title: q.title });
    var start = typeof q.startSec === "number" ? q.startSec : 15;
    var secs = playSeconds || PLAY_DEFAULT;

    if (q.audio_url && audio) {
      audio.hidden = false;
      audio.src = q.audio_url;
      var onMeta = function () {
        audio.removeEventListener("loadedmetadata", onMeta);
        try { audio.currentTime = Math.min(start, Math.max(0, (audio.duration || start + 1) - 1)); } catch (e) {}
        /* on part du vers choisi puis la chanson continue jusqu'au bout */
      };
      audio.addEventListener("loadedmetadata", onMeta);
      /* play() tout de suite, dans le geste gagnant : démarrage instantané */
      var p = audio.play();
      if (p && p.catch) p.catch(function () {});
      return;
    }

    if (audio) audio.hidden = true;
    if (q.embed_url && embedBox) {
      embedBox.hidden = false;
      var iframe = document.createElement("iframe");
      iframe.src = q.embed_url;
      iframe.title = q.title;
      iframe.allow = "autoplay";
      iframe.loading = "lazy";
      embedBox.appendChild(iframe);
    }
  }

  function qText(q) {
    var site = siteLang();
    if (q.question && typeof q.question === "object") {
      return q.question[site] || q.question.fr || q.question.en || "";
    }
    return q.question || "";
  }

  function updateScore() {
    if (roundEl) roundEl.textContent = t("quiz.round", { n: Math.min(idx + 1, queue.length || 1) });
    if (scoreEl) scoreEl.textContent = t("quiz.score", { found: found, played: played });
  }

  function showEmpty(on) {
    if (card) card.hidden = !!on;
    if (emptyBox) emptyBox.hidden = !on;
  }

  function renderQuestion() {
    locked = false;
    stopAudio();
    if (starsBox && window.EdenStars) window.EdenStars.clear(starsBox);
    if (nextBtn) nextBtn.hidden = true;
    if (hintEl) hintEl.textContent = t("quiz.hint");
    if (!queue.length) { showEmpty(true); return; }
    if (idx >= queue.length) {
      if (hintEl) hintEl.textContent = t("quiz.done", { found: found, played: played });
      if (questionEl) questionEl.textContent = t("quiz.finished");
      if (excerptEl) excerptEl.textContent = "";
      if (choicesEl) choicesEl.innerHTML = "";
      if (typeEl) typeEl.hidden = true;
      if (nextBtn) {
        nextBtn.hidden = false;
        nextBtn.textContent = t("quiz.again");
        nextBtn.onclick = function () { startSession(); };
      }
      updateScore();
      return;
    }
    showEmpty(false);
    var q = queue[idx];
    updateScore();
    if (typeEl) {
      typeEl.hidden = false;
      typeEl.textContent = q.type === "complete_line" ? t("quiz.typeComplete") : t("quiz.typeWhich");
    }
    if (questionEl) questionEl.textContent = qText(q);
    if (excerptEl) excerptEl.textContent = q.excerpt || "";
    if (choicesEl) {
      choicesEl.innerHTML = "";
      (q.choices || []).forEach(function (label, i) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "qp-choice";
        btn.textContent = label;
        btn.addEventListener("click", function () { onPick(i); });
        choicesEl.appendChild(btn);
      });
    }
    if (nextBtn) nextBtn.onclick = goNext;
  }

  function onPick(choiceIndex) {
    if (locked) return;
    locked = true;
    var q = queue[idx];
    played += 1;
    var buttons = choicesEl ? choicesEl.querySelectorAll(".qp-choice") : [];
    var correct = q.correctIndex | 0;
    var ok = choiceIndex === correct;
    buttons.forEach(function (btn, i) {
      btn.disabled = true;
      if (i === correct) btn.classList.add("is-correct");
      else if (i === choiceIndex) btn.classList.add("is-wrong");
    });
    if (ok) {
      found += 1;
      softChime();
      if (hintEl) hintEl.textContent = t("quiz.right");
      if (starsBox && window.EdenStars) {
        var stars = window.EdenStars.blindStars ? window.EdenStars.blindStars(1, false) : 3;
        window.EdenStars.render(starsBox, stars, { play: true, game: "quiz-paroles" });
        var wait = window.EdenStars.motifMs ? window.EdenStars.motifMs(stars) : 700;
        setTimeout(function () { playReward(q); }, wait);
      } else {
        playReward(q);
      }
    } else {
      softBuzz();
      if (hintEl) hintEl.textContent = t("quiz.wrong", { answer: (q.choices || [])[correct] || q.title });
    }
    updateScore();
    if (nextBtn) {
      nextBtn.hidden = false;
      nextBtn.textContent = t("quiz.next");
    }
  }

  function goNext() {
    idx += 1;
    renderQuestion();
  }

  function filterQuestions(all) {
    var site = siteLang();
    var primary = all.filter(function (q) { return q.lang === site; });
    if (primary.length >= 4) return primary;
    var fallback = all.filter(function (q) { return q.lang !== site; });
    return primary.concat(fallback);
  }

  function startSession() {
    found = 0; played = 0; idx = 0;
    fetch("data/quiz-paroles.json", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        playSeconds = data.playSeconds || PLAY_DEFAULT;
        var list = filterQuestions(data.questions || []);
        queue = shuffle(list.slice());
        renderQuestion();
      })
      .catch(function () { showEmpty(true); });
  }

  function onLang() {
    lang = siteLang();
    startSession();
  }

  document.querySelectorAll("[data-set-lang]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setTimeout(onLang, 0);
    });
  });

  if (window.EdenI18n && window.EdenI18n.onChange) {
    try { window.EdenI18n.onChange(onLang); } catch (e) {}
  }

  var toggle = $("nav-toggle");
  var links = $("nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      links.classList.toggle("open");
      toggle.classList.toggle("open");
    });
  }

  startSession();
})();
