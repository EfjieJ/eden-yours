/* Eden Yours — Étoiles (1 à 3) + motif de victoire, partagés par le casse-tête et le blind test.
   - Règles : puzzleStars(pièces, mauvais dépôts, secondes) et blindStars(essai, révélée).
   - Motif Web Audio (aucun fichier) : une note douce par étoile (arpège majeur montant, do-mi-sol),
     + un léger scintillement pour 3 étoiles. Volume ~0,27 ; silencieux si Web Audio indisponible.
   - render() : trois étoiles qui se remplissent l'une après l'autre (dégradé or/rose/cyan), en phase avec les notes.
   - Total de la session (sessionStorage) + record (localStorage) par jeu. */
(function () {
  "use strict";

  var STEP_MS = 260;          // écart entre deux étoiles / deux notes
  var NOTES = [523.25, 659.25, 783.99];            // do5, mi5, sol5
  var SHIMMER = [1046.5, 1318.51, 1567.98, 2093];  // do6, mi6, sol6, do7
  var VOLUME = 0.27;
  var audioCtx = null;
  var uid = 0;

  function t(key, vars) {
    return window.EdenI18n && window.EdenI18n.t ? window.EdenI18n.t(key, vars) : key;
  }

  function reducedMotion() {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
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

  /* ---------- Règles ---------- */
  /* Casse-tête, calibré sur le nombre de pièces (9 ou 16) :
     3 ★ : au plus 2 mauvais dépôts (3 en 4×4) et au plus 8 s par pièce (1 min 12 / 2 min 08) ;
     2 ★ : au plus 5 mauvais dépôts (8 en 4×4) et au plus 20 s par pièce (3 min / 5 min 20) ;
     1 ★ : image terminée. Un « mauvais dépôt » = pièce lâchée sur une autre case que la sienne
     (la reposer sur le plateau ne compte pas). Le chrono part au premier geste. */
  function puzzleRules(pieces) {
    var p = Math.max(1, Number(pieces) || 9);
    var big = p > 9;
    return {
      three: { wrong: big ? 3 : 2, seconds: p * 8 },
      two: { wrong: big ? 8 : 5, seconds: p * 20 }
    };
  }

  function puzzleStars(pieces, wrong, seconds) {
    var r = puzzleRules(pieces);
    var w = Math.max(0, Number(wrong) || 0);
    var s = Math.max(0, Number(seconds) || 0);
    if (w <= r.three.wrong && s <= r.three.seconds) return 3;
    if (w <= r.two.wrong && s <= r.two.seconds) return 2;
    return 1;
  }

  /* Blind test : bon titre au 1er choix = 3 ★, au 2e = 2 ★, révélée (ou plus tard) = 1 ★. */
  function blindStars(pickNumber, revealed) {
    if (revealed) return 1;
    var n = Number(pickNumber) || 1;
    return n <= 1 ? 3 : n === 2 ? 2 : 1;
  }

  /* Durée (ms) avant de lancer la chanson : la dernière note a sonné, le scintillement est passé. */
  function motifMs(stars) {
    var n = Math.max(1, Math.min(3, stars | 0));
    return (n - 1) * STEP_MS + (n === 3 ? 900 : 650);
  }

  /* ---------- Son ---------- */
  function bell(c, out, freq, start, peak, length) {
    [[freq, 1, "sine"], [freq * 2, 0.16, "sine"], [freq * 3, 0.05, "triangle"]].forEach(function (p) {
      var osc = c.createOscillator();
      var g = c.createGain();
      osc.type = p[2];
      osc.frequency.value = p[0];
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(peak * p[1], start + 0.018);
      g.gain.exponentialRampToValueAtTime(0.0001, start + length);
      osc.connect(g);
      g.connect(out);
      osc.start(start);
      osc.stop(start + length + 0.05);
    });
  }

  function play(stars) {
    var n = Math.max(1, Math.min(3, stars | 0));
    api.plays += 1;
    api.lastPlayed = n;
    try {
      var c = ctx();
      if (!c) return false;
      var now = c.currentTime + 0.03;
      var master = c.createGain();
      master.gain.value = VOLUME;
      master.connect(c.destination);
      for (var i = 0; i < n; i++) {
        bell(c, master, NOTES[i], now + i * STEP_MS / 1000, 0.5, 1.1);
      }
      if (n === 3) {
        var s0 = now + 3 * STEP_MS / 1000 - 0.04;
        SHIMMER.forEach(function (f, k) {
          bell(c, master, f, s0 + k * 0.055, 0.14, 0.7);
        });
      }
      return true;
    } catch (e) { return false; }
  }

  /* ---------- Session / record ---------- */
  function record(game, stars) {
    var out = { session: stars, best: stars, isNewBest: false };
    try {
      var sk = "eden-stars-session-" + game;
      var bk = "eden-stars-best-" + game;
      var baseKey = "eden-stars-base-" + game; // record au début de la session
      var best = Number(window.localStorage.getItem(bk)) || 0;
      var base = window.sessionStorage.getItem(baseKey);
      if (base === null) { base = best; window.sessionStorage.setItem(baseKey, String(base)); }
      base = Number(base) || 0;
      var before = Number(window.sessionStorage.getItem(sk)) || 0;
      var session = before + stars;
      window.sessionStorage.setItem(sk, String(session));
      out.session = session;
      // « Nouveau record » une seule fois : quand la session dépasse l'ancien record.
      out.isNewBest = base > 0 && before <= base && session > base;
      if (session > best) {
        best = session;
        window.localStorage.setItem(bk, String(best));
      }
      out.best = best;
    } catch (e) { /* stockage indisponible : on garde le total de la manche */ }
    return out;
  }

  /* ---------- Affichage ---------- */
  var STAR_PATH = "M12 2.4l2.83 5.94 6.5.82-4.78 4.5 1.22 6.44L12 16.98 6.23 20.1l1.22-6.44-4.78-4.5 6.5-.82z";

  function starSvg(id, filled) {
    if (!filled) {
      return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + STAR_PATH + '"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><defs>' +
      '<linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#fde68a"/><stop offset="0.45" stop-color="#fbbf24"/>' +
      '<stop offset="0.75" stop-color="#f0abfc"/><stop offset="1" stop-color="#67e8f9"/>' +
      '</linearGradient></defs><path fill="url(#' + id + ')" d="' + STAR_PATH + '"/></svg>';
  }

  /* opts : { line, detail, session: {session,best,isNewBest} } */
  function render(container, stars, opts) {
    if (!container) return;
    opts = opts || {};
    var n = Math.max(1, Math.min(3, stars | 0));
    var html = '<div class="stars-row" role="img" aria-label="' +
      t(n === 1 ? "stars.aria1" : "stars.ariaN", { n: n }) + '">';
    for (var i = 0; i < 3; i++) {
      var on = i < n;
      html += '<span class="star' + (on ? " is-on" : "") + '" style="--i:' + i + '">' +
        '<span class="star-empty">' + starSvg("", false) + "</span>" +
        (on ? '<span class="star-fill">' + starSvg("eden-star-g" + (++uid), true) + "</span>" : "") +
        "</span>";
    }
    html += "</div>";
    if (opts.line) html += '<p class="stars-line">' + opts.line + "</p>";
    if (opts.detail) html += '<p class="stars-detail">' + opts.detail + "</p>";
    if (opts.session) {
      html += '<p class="stars-session">' + t("stars.session", { n: opts.session.session, best: opts.session.best }) +
        (opts.session.isNewBest ? ' <span class="stars-new">' + t("stars.newBest") + "</span>" : "") + "</p>";
    }
    container.innerHTML = html;
    container.setAttribute("data-stars", String(n));
    container.classList.toggle("is-still", reducedMotion());
    container.hidden = false;
    // relance l'animation de remplissage
    container.classList.remove("is-filling");
    void container.offsetWidth;
    container.classList.add("is-filling");
  }

  function clear(container) {
    if (!container) return;
    container.innerHTML = "";
    container.hidden = true;
    container.removeAttribute("data-stars");
    container.classList.remove("is-filling");
  }

  function formatTime(seconds) {
    var s = Math.max(0, Math.round(seconds));
    if (s < 60) return s + " s";
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + " min " + (r < 10 ? "0" : "") + r;
  }

  var api = {
    STEP_MS: STEP_MS,
    puzzleRules: puzzleRules,
    puzzleStars: puzzleStars,
    blindStars: blindStars,
    motifMs: motifMs,
    play: play,
    unlock: ctx,
    record: record,
    render: render,
    clear: clear,
    formatTime: formatTime,
    plays: 0,
    lastPlayed: 0
  };
  window.EdenStars = api;
})();
