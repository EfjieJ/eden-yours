/* Eden Yours — Carte du jour : phrase vraie + extrait audio, tirage quotidien Toronto. */
(function () {
  "use strict";

  var PLAY_S = 16;
  var TZ = "America/Toronto";
  var DATA_URL = "data/carte-du-jour.json";
  var TRACKS_URL = "tracks.json";

  var pool = [];
  var current = null;
  var dailyIndex = 0;
  var sessionExtra = 0;
  var playSeconds = PLAY_S;
  var stopTimer = null;
  var audioCtx = null;
  var tracksById = {};

  var $ = function (id) { return document.getElementById(id); };
  var quoteText = $("cdj-text");
  var songEl = $("cdj-song");
  var dateEl = $("cdj-date");
  var coverWrap = $("cdj-cover-wrap");
  var coverImg = $("cdj-cover");
  var playBtn = $("cdj-play");
  var reshuffleBtn = $("cdj-reshuffle");
  var playerBox = $("cdj-player");
  var nowEl = $("cdj-now");
  var audio = $("cdj-audio");
  var embedBox = $("cdj-embed");
  var fallbackEl = $("cdj-fallback");
  var linkEl = $("cdj-link");
  var hintEl = $("cdj-hint");
  var emptyBox = $("cdj-empty");
  var frame = $("cdj-frame");
  var cardEl = $("cdj-card");

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

  function torontoDate() {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(new Date());
    } catch (e) {
      var d = new Date();
      var m = String(d.getMonth() + 1).padStart(2, "0");
      var day = String(d.getDate()).padStart(2, "0");
      return d.getFullYear() + "-" + m + "-" + day;
    }
  }

  function hashStr(s) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function reducedMotion() {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
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
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        var o = c.createOscillator();
        var g = c.createGain();
        o.type = "sine";
        o.frequency.value = f;
        var t0 = now + i * 0.08;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.1, t0 + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
        o.connect(g); g.connect(c.destination);
        o.start(t0); o.stop(t0 + 0.75);
      });
    } catch (e) {}
  }

  function stopAudio() {
    if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
    if (audio) {
      try { audio.pause(); } catch (e) {}
      try { audio.removeAttribute("src"); audio.load(); } catch (e) {}
      audio.hidden = true;
    }
    if (embedBox) { embedBox.innerHTML = ""; embedBox.hidden = true; }
    if (fallbackEl) fallbackEl.hidden = true;
    if (playerBox) playerBox.hidden = true;
  }

  function enrichCard(card) {
    var tr = tracksById[card.trackId] || {};
    return {
      id: card.id,
      lang: card.lang,
      text: card.text,
      trackId: card.trackId,
      title: card.title || tr.title || "",
      startSec: typeof card.startSec === "number" ? card.startSec : 0,
      audio_url: card.audio_url || tr.audio_url || null,
      audio_url_aac: card.audio_url_aac || tr.audio_url_aac || null,
      cover_url: card.cover_url || tr.cover_url || null,
      embed_url: card.embed_url || tr.embed_url || null,
      suno_share: card.suno_share || tr.suno_share || null
    };
  }

  function poolForLang(lang) {
    return pool.filter(function (c) { return c.lang === lang; }).map(enrichCard);
  }

  function pickDaily(list, lang) {
    if (!list.length) return null;
    var key = torontoDate() + "|" + lang;
    dailyIndex = hashStr(key) % list.length;
    return list[dailyIndex];
  }

  function pickSession(list) {
    if (!list.length) return null;
    sessionExtra += 1;
    var idx = (dailyIndex + sessionExtra) % list.length;
    if (list.length > 1 && idx === dailyIndex) {
      sessionExtra += 1;
      idx = (dailyIndex + sessionExtra) % list.length;
    }
    return list[idx];
  }

  function formatDateLabel(iso) {
    try {
      var parts = iso.split("-");
      var d = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2], 12));
      return new Intl.DateTimeFormat(siteLang() === "en" ? "en-CA" : "fr-CA", {
        timeZone: TZ,
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      }).format(d);
    } catch (e) {
      return iso;
    }
  }

  function showCard(card, opts) {
    opts = opts || {};
    stopAudio();
    current = card;
    if (!card) {
      if (frame) frame.hidden = true;
      if (emptyBox) emptyBox.hidden = false;
      return;
    }
    if (frame) frame.hidden = false;
    if (emptyBox) emptyBox.hidden = true;

    if (dateEl) {
      dateEl.textContent = t("carte.dateLabel", { date: formatDateLabel(torontoDate()) });
    }
    if (quoteText) quoteText.textContent = card.text;
    if (songEl) {
      songEl.textContent = "";
      var prefix = t("carte.fromSongPrefix");
      var suffix = t("carte.fromSongSuffix");
      if (prefix) songEl.appendChild(document.createTextNode(prefix));
      var strong = document.createElement("strong");
      strong.textContent = card.title || "";
      songEl.appendChild(strong);
      if (suffix) songEl.appendChild(document.createTextNode(suffix));
    }

    if (coverWrap && coverImg) {
      if (card.cover_url) {
        coverImg.src = card.cover_url;
        coverImg.alt = card.title || "";
        coverWrap.hidden = false;
      } else {
        coverWrap.hidden = true;
        coverImg.removeAttribute("src");
      }
    }

    if (cardEl && !reducedMotion()) {
      cardEl.classList.remove("is-reveal");
      void cardEl.offsetWidth;
      cardEl.classList.add("is-reveal");
    }

    if (hintEl && opts.reshuffled) {
      hintEl.textContent = t("carte.hintOther");
    } else if (hintEl) {
      hintEl.textContent = t("carte.hint");
    }
  }

  function playExcerpt() {
    if (!current) return;
    stopAudio();
    softChime();
    if (!playerBox) return;
    playerBox.hidden = false;
    if (nowEl) nowEl.textContent = t("carte.playing", { title: current.title });

    var start = typeof current.startSec === "number" ? current.startSec : 0;
    var secs = playSeconds || PLAY_S;
    var src = current.audio_url || current.audio_url_aac;

    if (src && audio) {
      audio.hidden = false;
      audio.src = src;
      var onMeta = function () {
        audio.removeEventListener("loadedmetadata", onMeta);
        try {
          var dur = audio.duration || start + secs + 1;
          audio.currentTime = Math.min(start, Math.max(0, dur - 1));
        } catch (e) {}
        /* on part du vers choisi puis la chanson continue jusqu'au bout */
      };
      audio.addEventListener("loadedmetadata", onMeta);
      /* play() tout de suite, dans le geste de révélation */
      var p = audio.play();
      if (p && p.catch) p.catch(function () {});
      return;
    }

    if (audio) audio.hidden = true;

    if (current.embed_url && embedBox) {
      embedBox.hidden = false;
      var iframe = document.createElement("iframe");
      iframe.src = current.embed_url;
      iframe.title = current.title || "Suno";
      iframe.allow = "autoplay";
      iframe.loading = "lazy";
      iframe.className = "cdj-suno-embed";
      embedBox.appendChild(iframe);
      return;
    }

    if (fallbackEl && linkEl && current.suno_share) {
      fallbackEl.hidden = false;
      linkEl.href = current.suno_share;
      linkEl.textContent = t("carte.listenLink", { title: current.title });
    }
  }

  function bind() {
    if (playBtn) {
      playBtn.addEventListener("click", function () {
        playExcerpt();
      });
    }
    if (reshuffleBtn) {
      reshuffleBtn.addEventListener("click", function () {
        var list = poolForLang(siteLang());
        showCard(pickSession(list), { reshuffled: true });
        softChime();
      });
    }
    if (window.EdenI18n && window.EdenI18n.onChange) {
      window.EdenI18n.onChange(function () {
        sessionExtra = 0;
        var list = poolForLang(siteLang());
        showCard(pickDaily(list, siteLang()));
      });
    }
  }

  function boot(data) {
    playSeconds = (data && data.playSeconds) || PLAY_S;
    pool = (data && data.cards) || [];
    bind();
    var list = poolForLang(siteLang());
    showCard(pickDaily(list, siteLang()));
  }

  function loadTracksThen(cb) {
    fetch(TRACKS_URL, { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : { tracks: [] }; })
      .then(function (j) {
        var arr = (j && j.tracks) || [];
        tracksById = {};
        arr.forEach(function (tr) {
          if (tr && tr.id) tracksById[tr.id] = tr;
        });
        cb();
      })
      .catch(function () { cb(); });
  }

  loadTracksThen(function () {
    fetch(DATA_URL, { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("no carte data");
        return r.json();
      })
      .then(boot)
      .catch(function () {
        boot({ cards: [], playSeconds: PLAY_S });
      });
  });
})();
