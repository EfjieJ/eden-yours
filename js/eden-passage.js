/* Eden Yours — Passage doux entre le site et les Êtres de Lumière (page non listée).
   Chargé tôt (dans <head>, sans defer) sur index.html, bibliotheque.html et la page des Êtres :
   1. Arrivée : si la page précédente a laissé le drapeau de passage (sessionStorage), l'écran
      commence blanc doré puis se dissout (classe sur <html>, donc aucun flash avant le rendu).
   2. Étoile secrète (accueil seulement, #eden-secret-star) : bouton discret dans le ciel ;
      au toucher : éclosion de lumière violet → or → blanc doré (~1,2 s), carillon montant
      (Web Audio), puis navigation en JS — l'adresse de la page cachée n'existe que dans ce script.
   3. Page des Êtres : « ← Eden Yours » et « bibliothèque » replient le ciel dans la lumière avant
      de partir ; le site est marqué « déjà accueilli » pour ne pas rejouer le carillon d'accueil.
   Mouvement réduit : simple fondu de 0,4 s. Tout échoue en silence. */
(function () {
  "use strict";
  if (window.EdenPassage) return;
  var doc = document, root = doc.documentElement;
  var PASS_KEY = "eden-passage", WELCOME_KEY = "eden-welcome";
  var HIDDEN_PAGE = "etres-de-lumiere.html";
  var MAX_AGE = 20000;

  function reduced() {
    try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; }
  }
  function ss(k, v) {
    try {
      if (v === undefined) return window.sessionStorage.getItem(k);
      if (v === null) window.sessionStorage.removeItem(k); else window.sessionStorage.setItem(k, v);
    } catch (e) { /* stockage indisponible */ }
    return null;
  }
  var isEtres = /etres-de-lumiere\.html$/.test(location.pathname || "");
  function withLang(url) {
    var lang = null;
    try { lang = new URLSearchParams(location.search).get("lang"); } catch (e) { lang = null; }
    if (lang !== "fr" && lang !== "en") return url;
    return url + (url.indexOf("?") === -1 ? "?" : "&") + "lang=" + lang;
  }

  var api = {
    AURORA: [ // mêmes nappes que js/ambiance.js : x, y, rx, ry, couleur, alpha, période (s), dérive, respiration
      [0.28, 0.22, 0.62, 0.46, "139,92,246", 0.34, 34, 0.06, 0.25],
      [0.78, 0.34, 0.46, 0.38, "192,132,252", 0.20, 34, 0.05, 0.25],
      [0.60, 0.94, 0.70, 0.42, "246,180,70", 0.16, 27, 0.05, 0.4],
      [0.22, 0.80, 0.42, 0.32, "251,191,36", 0.09, 27, 0.05, 0.4],
      [0.12, 0.88, 0.40, 0.34, "236,72,153", 0.09, 40, 0.06, 0.45],
      [0.86, 0.60, 0.36, 0.30, "103,232,249", 0.05, 40, 0.05, 0.45]
    ],
    arrived: null,
    leaving: false,
    navigate: function (url) { window.location.href = url; },
    withLang: withLang
  };
  window.EdenPassage = api;

  /* ---------- 1. Arrivée ---------- */
  (function arrive() {
    var raw = ss(PASS_KEY);
    if (!raw) return;
    ss(PASS_KEY, null);
    var parts = String(raw).split(":"), to = parts[0], t = +parts[1] || 0;
    if (Date.now() - t > MAX_AGE || (to === "etres") !== isEtres) return;
    api.arrived = to;
    root.classList.add("eden-pass-in", "eden-pass-in--" + to);
    if (reduced()) root.classList.add("eden-pass-reduced");
    var ms = reduced() ? 500 : (to === "etres" ? 1500 : 1000);
    setTimeout(function () { root.classList.remove("eden-pass-in", "eden-pass-in--" + to, "eden-pass-reduced"); }, ms);
  })();
  // Les Êtres ne jouent jamais le carillon d'accueil du site, et le retour ne le rejoue pas.
  if (isEtres && !ss(WELCOME_KEY)) ss(WELCOME_KEY, String(Date.now()));

  /* ---------- carillon montant (Web Audio) ---------- */
  function risingChime() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      var ac = new AC();
      if (ac.state === "suspended" && ac.resume) ac.resume();
      var t0 = ac.currentTime + 0.03;
      var master = ac.createGain();
      master.gain.setValueAtTime(0.18, t0);
      master.gain.setTargetAtTime(0.0001, t0 + 1.25, 0.35);
      var lp = ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(1800, t0);
      lp.frequency.linearRampToValueAtTime(4200, t0 + 1.1);
      lp.connect(master);
      master.connect(ac.destination);
      // sol4 → ré5 → sol5 → si5 : une montée lumineuse, partiels doux de bol chantant
      [[392.0, 0, 1], [587.33, 0.2, 0.8], [783.99, 0.4, 0.62], [987.77, 0.62, 0.5]].forEach(function (n) {
        [[1, 0.4, 1.6], [2.0, 0.1, 1.0], [2.76, 0.05, 0.7]].forEach(function (p) {
          var o = ac.createOscillator(), g = ac.createGain(), t = t0 + n[1];
          o.type = "sine";
          o.frequency.setValueAtTime(n[0] * p[0], t);
          o.frequency.linearRampToValueAtTime(n[0] * p[0] * 1.004, t + p[2]);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(p[1] * n[2], t + 0.08);
          g.gain.exponentialRampToValueAtTime(0.0001, t + p[2]);
          o.connect(g); g.connect(lp);
          o.start(t); o.stop(t + p[2] + 0.05);
        });
      });
      api.chimed = true;
      setTimeout(function () { try { ac.close(); } catch (e) { /* ignore */ } }, 3200);
    } catch (e) { /* silencieux */ }
  }
  api.chime = risingChime;

  /* ---------- départ : voile de lumière, puis navigation ---------- */
  function leave(url, to, x, y, kind) {
    if (api.leaving) return;
    api.leaving = true;
    ss(PASS_KEY, to + ":" + Date.now());
    var red = reduced();
    var v = doc.createElement("div");
    v.className = "eden-passage eden-passage--" + (red ? "reduced" : kind);
    v.setAttribute("aria-hidden", "true");
    v.style.setProperty("--x", Math.round(x) + "px");
    v.style.setProperty("--y", Math.round(y) + "px");
    v.innerHTML = '<div class="eden-passage-bloom"></div><div class="eden-passage-light"></div>';
    doc.body.appendChild(v);
    api.overlay = v;
    var ms = red ? 420 : (kind === "bloom" ? 1250 : 950);
    setTimeout(function () { api.navigate(url); }, ms);
    // filet de sécurité si la navigation n'a pas lieu
    setTimeout(reset, ms + 4000);
  }
  function reset() {
    api.leaving = false;
    if (api.overlay && api.overlay.parentNode) api.overlay.parentNode.removeChild(api.overlay);
    api.overlay = null;
    var s = doc.getElementById("eden-secret-star");
    if (s) s.classList.remove("is-opening");
  }
  api.leave = leave;
  // retour arrière (bfcache) : on efface le voile resté affiché
  window.addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    var wasLeaving = api.leaving;
    reset();
    ss(PASS_KEY, null);
    if (wasLeaving && isEtres && window.EL && EL.Audio && EL.Audio.fadeBackIn) {
      var fin = doc.getElementById("el-finale");
      if (!fin || fin.hidden) EL.Audio.fadeBackIn();
    }
  });

  /* ---------- 2. Étoile secrète (accueil) ---------- */
  function initStar() {
    var star = doc.getElementById("eden-secret-star");
    if (!star) return;
    star.addEventListener("click", function (e) {
      e.preventDefault();
      if (api.leaving) return;
      var r = star.getBoundingClientRect();
      star.classList.add("is-opening");
      risingChime();
      leave(withLang(HIDDEN_PAGE), "etres", r.left + r.width / 2, r.top + r.height / 2, "bloom");
    });
  }

  /* ---------- 3. Page des Êtres : repli du ciel dans la lumière ---------- */
  function initEtres() {
    doc.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target && e.target.closest ? e.target.closest("a.el-back, .el-finale-actions a[href]") : null;
      if (!a || (a.target && a.target !== "_self")) return;
      var href = a.getAttribute("href") || "";
      if (!/^(index|bibliotheque)\.html/.test(href)) return;
      e.preventDefault();
      if (api.leaving) return;
      try { if (window.EL && EL.Audio && EL.Audio.fadeOutAll) EL.Audio.fadeOutAll(0.9); } catch (err) { /* ignore */ }
      try { var au = doc.getElementById("el-song-audio"); if (au && !au.paused) au.pause(); } catch (err) { /* ignore */ }
      var x = window.innerWidth / 2, y = window.innerHeight / 2;
      if (a.classList.contains("el-back")) { var r = a.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
      leave(withLang(href.split("?")[0]), "site", x, y, "fold");
    });
  }

  function ready() { if (isEtres) initEtres(); else initStar(); }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", ready);
  else ready();
})();
