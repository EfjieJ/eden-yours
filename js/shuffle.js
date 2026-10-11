/* Eden Yours — « Mode aléatoire / Shuffle mode » : lecture continue, toute seule.
   • État dans localStorage « eden-shuffle » ("1" = actif) : il se retrouve d'une page à l'autre (pages avec le lecteur : accueil, bibliothèque…).
   • Quand une chanson se termine, la suivante est tirée AU HASARD dans la même langue (liste déjà filtrée par js/app.js / EdenSongPick),
     jamais deux fois de suite et en évitant l'historique récent (sessionStorage via EdenSongPick) ; les MP3 d'abord.
   • MP3 : l'événement « ended » du lecteur enchaîne. Embeds Suno : un embed ne signale pas sa fin ; on n'en tire que si Suno donne une
     durée VÉRIFIÉE (tracks.json « duration », relevée via l'API clip de Suno), et on enchaîne par minuteur = durée + marge. Sans durée connue :
     jamais tiré en mode aléatoire ; si l'utilisateur en lance un quand même, un message l'invite à toucher « Suivant ».
   • Session média (écran verrouillé : lecture/pause/suivant/précédent). Ne touche ni la logique de départ (js/song-pick.js) ni la pastille de langue. */
(function () {
  "use strict";
  if (window.EdenShuffle) return;
  var KEY = "eden-shuffle", GRACE_S = 3, LOAD_FALLBACK_MS = 5000;
  var timer = 0, endAt = 0, started = false, warnedFor = "", hist = [];

  function t(k, v) { return window.EdenI18n && window.EdenI18n.t ? window.EdenI18n.t(k, v) : k; }
  function on() { try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; } }
  function lib() { return window.EdenLibrary || null; }
  function fmt(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60); }

  /* ——— choix de la prochaine chanson ——— */
  function eligible(tr) { return !!(tr && (tr.audio_url || (tr.embed_url && Number(tr.duration) > 0))); }
  /* list : pistes DÉJÀ filtrées par langue (et par thème si une file est active). Renvoie une piste ou null. */
  function pick(list, currentId) {
    var P = window.EdenSongPick;
    var el = (list || []).filter(eligible), other = el.filter(function (x) { return x.id !== currentId; });
    if (other.length) el = other;                       // jamais deux fois de suite (sauf s'il n'y a qu'une chanson)
    if (!el.length) return null;
    var win = Math.min(12, Math.max(1, Math.floor((list || []).length / 2)));
    var rec = P ? P.recent().slice(-win) : [];
    var fresh = el.filter(function (x) { return rec.indexOf(x.id) < 0; });
    var mp3 = fresh.filter(function (x) { return x.audio_url; });
    var pool = mp3.length ? mp3 : (fresh.length ? fresh : el);
    return P ? P.pick(pool, { record: false }) : pool[Math.floor(Math.random() * pool.length)];
  }

  /* ——— historique (bouton « précédent » en mode aléatoire) ——— */
  function noteStart(id) { if (id && hist[hist.length - 1] !== id) { hist.push(id); if (hist.length > 30) hist.shift(); } }
  function prevId(currentId) {
    if (hist[hist.length - 1] === currentId) hist.pop();
    return hist.length ? hist[hist.length - 1] : null;
  }

  /* ——— embeds : minuteur d'enchaînement ——— */
  function statusEl() {
    var ex = document.querySelector(".player-bar .player-extra"); if (!ex) return null;
    var s = ex.querySelector(".shuffle-status");
    if (!s) { s = document.createElement("span"); s.className = "shuffle-status"; s.setAttribute("role", "status"); s.hidden = true; ex.insertBefore(s, ex.firstChild); }
    return s;
  }
  function showStatus(txt) { var s = statusEl(); if (!s) return; s.textContent = txt || ""; s.hidden = !txt; }
  function cancel() { if (timer) { clearInterval(timer); timer = 0; } endAt = 0; started = false; showStatus(""); }
  function toast(msg) {
    var el = document.querySelector(".copy-toast");
    if (!el) { el = document.createElement("div"); el.className = "copy-toast"; document.body.appendChild(el); }
    el.textContent = msg; el.classList.add("show"); clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove("show"); }, 3800);
  }
  /* appelé par app.js quand une chanson-embed démarre (ou quand le mode est activé pendant un embed) */
  function onEmbed(track, next) {
    cancel();
    noteStart(track && track.id);
    if (window.EdenSongPick && track && track.id) window.EdenSongPick.record(track.id);   // les embeds ne sont pas enregistrés ailleurs
    if (!on() || !track) return;
    var dur = Number(track.duration);
    if (!(dur > 0)) {                                        // pas de durée vérifiée : on ne devine pas
      if (warnedFor !== track.id) { warnedFor = track.id; toast(t("shuffle.embedNoDur")); }
      showStatus(t("shuffle.embedNoDurShort"));
      return;
    }
    var frame = document.querySelector('.player-bar .player-embed iframe[data-id="' + track.id + '"]');
    function begin() {
      if (started) return; started = true;
      endAt = Date.now() + (dur + GRACE_S) * 1000;
      var step = function () {
        var left = (endAt - Date.now()) / 1000;
        if (left <= 0) { cancel(); if (on() && typeof next === "function") next(); return; }
        showStatus(t("shuffle.next", { t: fmt(left) }));
      };
      step(); timer = setInterval(step, 1000);
    }
    if (frame) frame.addEventListener("load", begin, { once: true });
    setTimeout(begin, LOAD_FALLBACK_MS);
  }

  /* ——— session média ——— */
  function setMedia(track) {
    try {
      if (!track || !("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
      var art = [];
      if (track.cover_url) { var u = new URL(track.cover_url, document.baseURI).href; art = [{ src: u, sizes: "512x512" }]; }
      navigator.mediaSession.metadata = new MediaMetadata({ title: track.title || "Eden Yours", artist: track.artist || "Eden Yours", album: "Eden Yours", artwork: art });
    } catch (e) {}
  }
  (function bindMedia() {
    try {
      if (!("mediaSession" in navigator)) return;
      var h = function (name, fn) { try { navigator.mediaSession.setActionHandler(name, fn); } catch (e) {} };
      h("play", function () { var L = lib(); if (L && L.play) L.play(); });
      h("pause", function () { var L = lib(); if (L && L.pause) L.pause(); });
      h("nexttrack", function () { var L = lib(); if (L && L.next) L.next(); });
      h("previoustrack", function () { var L = lib(); if (L && L.prev) L.prev(); });
    } catch (e) {}
  })();

  /* ——— boutons ——— */
  function refresh() {
    var v = on();
    var nodes = document.querySelectorAll(".js-shuffle-toggle, .js-shuffle");
    for (var i = 0; i < nodes.length; i++) {
      var b = nodes[i];
      b.setAttribute("aria-pressed", v ? "true" : "false");
      b.setAttribute("aria-label", t("shuffle.aria") + " — " + (v ? t("shuffle.stateOn") : t("shuffle.stateOff")));
      b.setAttribute("title", t("shuffle.aria"));
      b.classList.toggle("is-on", v);
      var lab = b.querySelector(".js-shuffle-label"); if (lab) lab.textContent = v ? t("shuffle.on") : t("shuffle.label");
    }
    if (!v) showStatus("");
  }
  function set(v) {
    try { if (v) localStorage.setItem(KEY, "1"); else localStorage.removeItem(KEY); } catch (e) {}
    refresh();
    if (!v) cancel();
    try { document.dispatchEvent(new CustomEvent("eden:shuffle", { detail: { on: v } })); } catch (e) {}
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".js-shuffle-toggle, .js-shuffle");
    if (!b) return;
    e.preventDefault();
    var v = !on(); set(v);
    toast(v ? t("shuffle.started") : t("shuffle.stopped"));
    var L = lib(); if (v && L && L.shuffleKick) L.shuffleKick();
  });
  window.addEventListener("storage", function (e) { if (e.key === KEY) refresh(); });   // autre onglet
  function init() {
    refresh();
    if (window.EdenI18n && window.EdenI18n.onChange) window.EdenI18n.onChange(function () { setTimeout(refresh, 0); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  window.EdenShuffle = { on: on, set: set, pick: pick, eligible: eligible, onEmbed: onEmbed, cancel: cancel, noteStart: noteStart, prevId: prevId, setMedia: setMedia, refresh: refresh, toast: toast };
})();
