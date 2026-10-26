/* Eden Yours — langue des chansons + choix de la chanson de départ (module partagé).
   • lang() / forLang(list) : UNE seule source de vérité pour la langue (EdenI18n → ?lang → eden-lang → <html lang> → navigateur) ;
     forLang ne garde que les chansons de cette langue (sauf drapeau explicite lang_neutral: true). Toute sélection de chanson du site passe par là.
   • pickOpening(list, lang) : au hasard dans la liste « d'ouverture » (data/opening-songs.json), sans répétition.
   Choix de la chanson de départ.
   Une chanson au hasard à chaque chargement, dans la langue du site (jamais l'autre langue : l'appelant filtre la liste),
   en évitant (1) les dernières chansons de la visite (sessionStorage) et (2) la ou les dernières chansons
   « démarrées » lors des visites précédentes (localStorage), pour que deux visites de suite ne commencent jamais pareil. */
(function () {
  "use strict";
  if (window.EdenSongPick) return;
  var SESSION_KEY = "eden-recent-songs";   // sessionStorage : [id, …] (12 derniers)
  var LOCAL_KEY = "eden-last-started";     // localStorage : [id, …] (5 derniers démarrés, toutes visites)

  function read(store, key) {
    try { var a = JSON.parse(window[store].getItem(key) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function write(store, key, arr) {
    try { window[store].setItem(key, JSON.stringify(arr)); } catch (e) { /* stockage indisponible */ }
  }
  function record(id) {
    if (!id) return;
    var s = read("sessionStorage", SESSION_KEY).filter(function (x) { return x !== id; }); s.push(id);
    write("sessionStorage", SESSION_KEY, s.slice(-12));
    var l = read("localStorage", LOCAL_KEY).filter(function (x) { return x !== id; }); l.push(id);
    write("localStorage", LOCAL_KEY, l.slice(-5));
  }
  /* list : éléments { id } déjà filtrés par langue (et jouables). Renvoie un élément, ou null. */
  function pick(list, opts) {
    opts = opts || {};
    if (!list || !list.length) return null;
    var n = list.length, chosen;
    if (n === 1) chosen = list[0];
    else {
      var last = read("localStorage", LOCAL_KEY), recent = read("sessionStorage", SESSION_KEY);
      var avoidLast = last.slice(-Math.min(3, n - 1));                      // visites précédentes (au moins la dernière)
      var avoidRecent = recent.slice(-Math.min(6, Math.floor(n / 2)));      // dernières écoutes de la visite
      var steps = [avoidLast.concat(avoidRecent), avoidLast.slice(-1).concat(avoidRecent), avoidLast.slice(-1)];
      var pool = null;
      for (var i = 0; i < steps.length && !pool; i++) {
        var bad = steps[i];
        var p = list.filter(function (t) { return bad.indexOf(t.id) === -1; });
        if (p.length) pool = p;
      }
      chosen = (pool || list)[Math.floor(Math.random() * (pool || list).length)];
    }
    if (opts.record !== false) record(chosen.id);
    return chosen;
  }
  /* ——— langue (même règle que js/i18n.js) ——— */
  function lang() {
    try { var I = window.EdenI18n; if (I && I.getLang) { var g = I.getLang(); if (g === "fr" || g === "en") return g; } } catch (e) {}
    try { var q = new URLSearchParams(location.search).get("lang"); if (q === "fr" || q === "en") return q; } catch (e) {}
    try { var s = localStorage.getItem("eden-lang"); if (s === "fr" || s === "en") return s; } catch (e) {}
    var h = (document.documentElement.getAttribute("lang") || "").toLowerCase();
    if (h.indexOf("fr") === 0) return "fr"; if (h.indexOf("en") === 0) return "en";
    try {
      var prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
      for (var i = 0; i < prefs.length; i++) { var c = String(prefs[i] || "").toLowerCase(); if (c.indexOf("fr") === 0) return "fr"; if (c.indexOf("en") === 0) return "en"; }
    } catch (e) {}
    return "en";
  }
  function neutral(t) { return !!(t && (t.lang_neutral === true || t.langNeutral === true)); }
  function forLang(list, l) {
    l = l || lang();
    return (list || []).filter(function (t) { return t && (t.lang === l || neutral(t)); });
  }
  function sameLang(t, l) { return !!t && (t.lang === (l || lang()) || neutral(t)); }

  /* ——— liste d'ouverture ——— */
  var opening = null;
  var ready = Promise.resolve();
  try {
    ready = fetch("data/opening-songs.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (d) {
      opening = { fr: [], en: [] };
      (d && d.songs || []).forEach(function (x) { if (opening[x.lang]) opening[x.lang].push(x.id); });
    }).catch(function () {});
  } catch (e) { /* fetch indisponible */ }
  function openingIds(l) { return opening ? (opening[l || lang()] || []).slice() : []; }
  function pickOpening(list, l) {
    list = list || [];
    var ids = openingIds(l), sub = ids.length ? list.filter(function (t) { return ids.indexOf(t.id) !== -1; }) : [];
    return pick(sub.length ? sub : list);
  }

  /* ——— chansons jumelles FR ↔ EN (même chanson dans l'autre langue) ——— */
  var PAIRS = [
    ["8d8ef5eb-0929-43f6-8cdb-71a873f97369", "81afce14"], // Le Grand Oui et la Roue ↔ The Big Yes and the Wheel
    ["cc8219fb", "eff423d4"], // Le regard est une création ↔ The Gaze Is Creation
    ["2e5898a7", "33a4c7d5"], // Rythme éternel ↔ Eternal Rhythm
    ["04441f4e", "d2d61703"], // Le postulat ↔ The Postulate
    ["f5bf8830", "b495fcd7"], // La Sensibilité est la Fonction ↔ Sensitivity is Pure Function
    ["a0b2b33d", "b0eb0f76"], // Le Léger Futur ↔ The slight future
    ["e4a2c1d5", "4d1bff83"]  // La vie, c'est un geste ↔ Life is a gesture
  ];
  /* counterpart(id, list) → la chanson jumelle trouvée dans list (déjà filtrée sur la nouvelle langue), sinon null */
  function counterpart(id, list) {
    id = String(id || "").toLowerCase(); if (!id) return null;
    for (var i = 0; i < PAIRS.length; i++) {
      var a = PAIRS[i][0].slice(0, 8), b = PAIRS[i][1].slice(0, 8), other = id.indexOf(a) === 0 ? b : id.indexOf(b) === 0 ? a : "";
      if (!other) continue;
      for (var j = 0; j < (list || []).length; j++) if (list[j] && String(list[j].id).indexOf(other) === 0) return list[j];
    }
    return null;
  }
  window.EdenSongPick = { counterpart: counterpart, lang: lang, forLang: forLang, sameLang: sameLang, ready: ready, openingIds: openingIds, pickOpening: pickOpening, pick: pick, record: record, lastStarted: function () { return read("localStorage", LOCAL_KEY); }, recent: function () { return read("sessionStorage", SESSION_KEY); } };
})();
