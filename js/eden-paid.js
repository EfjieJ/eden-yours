/* Eden Yours — contenus payants (paiement unique par PayPal, déblocage mémorisé sur l'appareil).
   Même principe que le déblocage existant (config.js : unlockPaypalUrl + « J'ai déjà payé » → localStorage) :
   • le bouton PayPal ouvre paypal.me/Francjul/<montant> dans un nouvel onglet (aucune clé, aucun secret dans le dépôt) ;
   • après le paiement, « J'ai payé — débloquer » enregistre localStorage["eden-yours-unlocked-<clé>"] = "1" (système d'honneur :
     paypal.me ne renvoie aucune confirmation au site) ;
   • honnêtement : tout verrou côté navigateur se contourne (localStorage, fichier JSON public, chanson publique sur Suno).
   Conte payant : <body data-paid="<clé>" data-paid-suite="data/contes/<clé>-suite.json"> — les scènes payantes ne sont PAS
   dans la page : elles sont chargées depuis le JSON seulement une fois débloqué.
   Chanson payante : toute iframe Suno de cette chanson (conte, lecteur, bibliothèque, jeux) joue un extrait de 30 s
   (compté à partir du moment où on touche le lecteur Suno), puis la carte de déblocage la remplace. */
(function () {
  "use strict";
  if (window.EdenPaid) return;
  var PAYPAL = "https://paypal.me/Francjul";
  var ITEMS = {
    "chaperon-rouge": {
      key: "chaperon-rouge",
      trackId: "ec618190-1ef7-478b-9d11-0ecec58147c6",
      title: "Le Petit Chaperon Rouge et la Lumière Éternelle",
      amount: "10.00", currency: "CAD", label: "10 $",
      payUrl: PAYPAL + "/10CAD",
      page: "conte-chaperon-rouge.html",
      previewSeconds: 30,
      what: "les 12 scènes suivantes du conte (34 images) et la chanson en entier (6:10)"
    }
  };
  var PREFIX = "eden-yours-unlocked-", PREV = "eden-paid-preview-";
  function songIdOf(u) { var m = String(u || "").match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i); return m ? m[0].toLowerCase() : ""; }
  function get(k) { return ITEMS[k] || null; }
  function byTrack(id) { id = songIdOf(id) || String(id || "").toLowerCase(); for (var k in ITEMS) if (ITEMS[k].trackId === id) return ITEMS[k]; return null; }
  function isUnlocked(k) { try { return localStorage.getItem(PREFIX + k) === "1"; } catch (e) { return false; } }
  function lockedTrack(id) { var it = byTrack(id); return !!(it && !isUnlocked(it.key)); }
  function unlock(k) {
    try { localStorage.setItem(PREFIX + k, "1"); } catch (e) {}
    try { sessionStorage.removeItem(PREV + k); } catch (e) {}
    try { document.dispatchEvent(new CustomEvent("eden:paid-unlock", { detail: { key: k } })); } catch (e) {}
  }
  function used(k) { try { return +sessionStorage.getItem(PREV + k) || 0; } catch (e) { return 0; } }
  function setUsed(k, s) { try { sessionStorage.setItem(PREV + k, String(Math.round(s))); } catch (e) {} }
  function base() { var s = document.querySelector('script[src*="js/eden-paid.js"]'); return s ? s.src.replace(/js\/eden-paid\.js.*$/, "") : ""; }

  /* ——— Carte de déblocage ——— */
  function card(it, opts) {
    opts = opts || {};
    var el = document.createElement("div");
    el.className = "paid-lock" + (opts.compact ? " paid-lock--compact" : "");
    el.setAttribute("role", "group");
    el.setAttribute("lang", "fr");
    el.setAttribute("data-paid-card", it.key);
    var onPage = location.pathname.indexOf(it.page) !== -1;
    el.innerHTML =
      '<p class="paid-lock-eyebrow">' + (opts.ended ? "Fin de l’extrait de " + it.previewSeconds + " s" : "Conte illustré · paiement unique") + '</p>' +
      '<h3 class="paid-lock-title">Débloque la suite du conte et sa chanson : ' + it.label + '</h3>' +
      (opts.compact ? '<p class="paid-lock-body">« ' + it.title + ' » — la chanson en entier et la suite du conte illustré.</p>'
        : '<p class="paid-lock-body">« ' + it.title + ' » : ' + it.what + '. Paiement unique de ' + it.amount.replace(".", ",") + ' $ CAD par PayPal ; le déblocage reste sur cet appareil.</p>') +
      '<div class="paid-lock-actions">' +
        '<a class="btn paid-lock-paypal" href="' + it.payUrl + '" target="_blank" rel="noopener">Payer ' + it.amount.replace(".", ",") + ' $ CAD avec PayPal</a>' +
        '<button type="button" class="btn btn-ghost paid-lock-done">J’ai payé — débloquer</button>' +
      '</div>' +
      '<p class="paid-lock-fine">PayPal s’ouvre dans un nouvel onglet. Une fois le paiement envoyé, reviens ici et touche « J’ai payé — débloquer ».' +
        (opts.compact && !onPage ? ' <a href="' + it.page + '">Voir le conte</a>' : '') + '</p>';
    el.querySelector(".paid-lock-done").addEventListener("click", function () { unlock(it.key); });
    function onUnlock(e) {
      if (!e.detail || e.detail.key !== it.key) return;
      document.removeEventListener("eden:paid-unlock", onUnlock);
      if (opts.onUnlock) opts.onUnlock(el); else if (el.parentNode) el.parentNode.removeChild(el);
    }
    document.addEventListener("eden:paid-unlock", onUnlock);
    return el;
  }

  /* ——— Extrait de 30 s pour une iframe Suno d'une chanson payante (appelé par js/play-full-song.js) ——— */
  function gate(f) {
    if (!f || f.__edenPaid) return;
    var it = byTrack(f.src); if (!it || isUnlocked(it.key)) return;
    f.__edenPaid = 1;
    var keep = f.cloneNode(false), box = f.parentNode;
    function lockNow() {
      if (!f.isConnected || isUnlocked(it.key)) return;
      setUsed(it.key, it.previewSeconds);
      try { f.src = "about:blank"; } catch (e) {}
      var c = card(it, { ended: true, compact: true, onUnlock: function (el) { if (el.parentNode) el.parentNode.replaceChild(keep, el); } });
      if (f.parentNode) f.parentNode.replaceChild(c, f);
      if (box) box.hidden = false;
    }
    var left = it.previewSeconds - used(it.key);
    if (left <= 0) { lockNow(); return; }
    var note = document.createElement("p");
    note.className = "paid-preview-note"; note.setAttribute("lang", "fr");
    note.innerHTML = '<span class="paid-badge">' + it.label + '</span> Extrait de ' + it.previewSeconds + ' s — la chanson entière se débloque avec la suite du conte.';
    if (box) box.insertBefore(note, f);
    var t0 = 0, timer = 0, cap = 0, poll = 0;
    function start() { if (t0) return; t0 = Date.now(); clearTimeout(cap); timer = setTimeout(end, left * 1000); }
    function onBlur() { setTimeout(function () { if (document.activeElement === f) start(); }, 0); }
    function cleanup() {
      clearTimeout(timer); clearTimeout(cap); clearInterval(poll);
      window.removeEventListener("blur", onBlur); document.removeEventListener("eden:paid-unlock", cleanup);
      if (note.parentNode) note.parentNode.removeChild(note);
    }
    function end() { cleanup(); lockNow(); }
    window.addEventListener("blur", onBlur);
    document.addEventListener("eden:paid-unlock", cleanup);
    poll = setInterval(function () {
      if (!f.isConnected) { if (t0) setUsed(it.key, used(it.key) + (Date.now() - t0) / 1000); cleanup(); return; }
      if (document.activeElement === f) start();
    }, 400);
    cap = setTimeout(start, 45000); // si le toucher dans le lecteur Suno n'a pas été détecté
  }

  /* ——— Page d'un conte payant ——— */
  function contePage() {
    var k = document.body && document.body.getAttribute("data-paid"); if (!k) return;
    var it = get(k), slot = document.querySelector("[data-paid-slot]"); if (!it || !slot) return;
    var after = [].slice.call(document.querySelectorAll("[data-paid-after]")), note = document.querySelector("[data-paid-note]");
    var url = document.body.getAttribute("data-paid-suite");
    function showAfter(on) { after.forEach(function (e) { e.hidden = !on; }); }
    function locked() {
      document.body.classList.add("is-paid-locked");
      showAfter(false); slot.innerHTML = "";
      slot.appendChild(card(it, { onUnlock: function () { load(true); } }));
    }
    function load(fresh) {
      document.body.classList.remove("is-paid-locked");
      if (note) note.innerHTML = '<span class="paid-badge paid-badge--ok">✓</span> Conte et chanson débloqués sur cet appareil. Merci !';
      slot.innerHTML = '<p class="paid-loading">Chargement de la suite du conte…</p>';
      fetch(base() + url, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
        slot.innerHTML = (d.scenes || []).join("\n");
        var list = [].slice.call(slot.querySelectorAll(".conte-scene"));
        showAfter(true);
        if (window.EdenConte) window.EdenConte.add(list);
        if (fresh && list[0]) setTimeout(function () { list[0].scrollIntoView({ behavior: "smooth", block: "start" }); }, 120);
        try { document.dispatchEvent(new CustomEvent("eden:conte-suite", { detail: { scenes: list.length } })); } catch (e) {}
      }).catch(function () {
        slot.innerHTML = '<p class="paid-loading">La suite n’a pas pu être chargée. <button type="button" class="btn btn-ghost">Réessayer</button></p>';
        slot.querySelector("button").addEventListener("click", function () { load(false); });
      });
    }
    if (isUnlocked(k)) load(false); else locked();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", contePage); else contePage();

  window.EdenPaid = { items: ITEMS, get: get, byTrack: byTrack, isUnlocked: isUnlocked, lockedTrack: lockedTrack, unlock: unlock, card: card, gate: gate };
})();
