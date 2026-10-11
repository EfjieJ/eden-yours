/* Eden Yours — « alive » (amélioration seulement ; l'entrée visible est en CSS pur, voir css/alive.css).
   • révélation au défilement des éléments SOUS la ligne de flottaison (IntersectionObserver ; jamais pour le visible) ;
   • petit saut (WAAPI, propriétés individuelles translate/scale) au survol souris, « pop » à l'appui (boutons, puces, cartes, pastille FR|EN) ;
   • étincelles dorées au toucher (plafonnées) ; étoiles de victoire qui sautent ; saut à l'ajout d'une file (eden:queue) ;
   • classe html.alive-playing quand un audio joue (la pochette respire) ; pause de la vie au repos onglet caché.
   Ne touche ni l'audio, ni la logique des jeux/du lecteur ; inactif si prefers-reduced-motion: reduce. */
(function () {
  "use strict";
  if (window.EdenAlive) return;
  var ok = false;
  try {
    ok = !window.matchMedia("(prefers-reduced-motion: reduce)").matches && !!(window.CSS && CSS.supports && CSS.supports("translate", "0 0")) && !!Element.prototype.animate && "IntersectionObserver" in window;
  } catch (e) {}
  window.EdenAlive = { ok: ok };
  if (!ok) return;

  var ENTER = ".games-head > *, .games-grid > *, .hero-grid > *, .manifesto-hero .container > *, .page-hero .container > *, .puzzle-hero .container > *, .section-header, .pillar-card, .why-grid > *, .music-teaser, .cat-card, .cat-lib, .player-card, .games-banner, .puzzle-shell:not(.s3d-shell) > *, .track-list > .track-row, .other-game";
  var HOP = ".game-card, .cat-card, .pillar-card, .other-game, .portal-mini, .track-row, .btn, .cat-chip, .player-card";
  var POP = ".btn, .cat-chip, .game-card, .cat-card, .ctrl-btn, .track-row, .eden-lang-pill button, .lang-btn, .other-game";
  var NO = "canvas, input, textarea, select, .rb-list, .progress, .etres, .s3d-stage, [data-no-alive]";
  var de = document.documentElement;

  /* ——— révélation sous la ligne de flottaison ——— */
  var io = new IntersectionObserver(function (entries) {
    var vis = entries.filter(function (e) { return e.isIntersecting; })
      .sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left; });
    vis.forEach(function (e, i) {
      var el = e.target; io.unobserve(el);
      el.style.animationDelay = Math.min(i, 6) * 70 + "ms";
      el.classList.remove("alive-wait");
    });
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0.01 });

  function collect(root, out) {
    if (!root || root.nodeType !== 1) return;
    if (root.matches(ENTER)) out.push(root);
    var l = root.querySelectorAll(ENTER); for (var i = 0; i < l.length; i++) out.push(l[i]);
  }
  function classify(list) {
    var vh = window.innerHeight, wait = [];
    list.forEach(function (el) {                       // lectures d'abord, écritures ensuite (pas de thrash)
      if (el.__al) return; el.__al = 1;
      var r = el.getBoundingClientRect();
      if (r.height > 0 && r.top > vh * 0.97) wait.push(el);
    });
    wait.forEach(function (el) { el.classList.add("alive-wait"); io.observe(el); });
  }
  var first = []; collect(document.body, first); classify(first);

  /* ——— étoiles de victoire : petit saut ——— */
  function starsJump(root) {
    var s = root.querySelectorAll ? root.querySelectorAll(".stars-row .star.is-on") : [];
    for (var i = 0; i < s.length; i++) s[i].animate([{ translate: "0 0", scale: "1" }, { translate: "0 -9px", scale: "1.25", offset: 0.4 }, { translate: "0 0", scale: "1" }], { duration: 520, delay: 200 + i * 260, easing: "cubic-bezier(.3,.7,.4,1)" });
  }
  new MutationObserver(function (muts) {
    var add = [];
    muts.forEach(function (m) {
      for (var i = 0; i < m.addedNodes.length; i++) {
        var n = m.addedNodes[i]; if (n.nodeType !== 1) continue;
        collect(n, add);
        if ((n.className && String(n.className).indexOf("stars-row") >= 0) || (n.querySelector && n.querySelector(".stars-row"))) starsJump(n.parentNode || n);
      }
    });
    if (add.length) classify(add);
  }).observe(document.body, { childList: true, subtree: true });

  /* ——— saut / pop ——— */
  function hop(el, amp) {
    var n = performance.now(); if (el.__ah && n - el.__ah < 700) return; el.__ah = n;
    el.animate([{ translate: "0 0", scale: "1" }, { translate: "0 " + (-amp) + "px", scale: "1.025", offset: 0.4 }, { translate: "0 1px", scale: "0.996", offset: 0.7 }, { translate: "0 0", scale: "1" }], { duration: 520, easing: "cubic-bezier(.3,.7,.4,1)" });
  }
  function pop(el) {
    var n = performance.now(); if (el.__ap && n - el.__ap < 450) return; el.__ap = n;
    el.animate([{ scale: "1" }, { scale: "0.93", offset: 0.25 }, { scale: "1.07", offset: 0.6 }, { scale: "1" }], { duration: 420, easing: "cubic-bezier(.3,.7,.4,1)" });
  }
  function small(el) { return el.matches(".btn, .cat-chip, .track-row, .eden-lang-pill button"); }
  document.addEventListener("pointerover", function (e) {
    if (e.pointerType !== "mouse") return;
    var t = e.target.closest && e.target.closest(HOP);
    if (!t || t.closest(NO) || (e.relatedTarget && t.contains(e.relatedTarget))) return;
    hop(t, small(t) ? 3 : 6);
  }, { passive: true });

  /* ——— étincelles (plafonnées) ——— */
  var box = null, live = 0, lastSpark = 0;
  function sparks(x, y) {
    var now = performance.now(); if (now - lastSpark < 120 || live > 14) return; lastSpark = now;
    if (!box) { box = document.createElement("div"); box.className = "alive-sparks"; box.setAttribute("aria-hidden", "true"); document.body.appendChild(box); }
    for (var i = 0; i < 6; i++) {
      var s = document.createElement("i"); box.appendChild(s); live++;
      var a = Math.random() * Math.PI * 2, d = 22 + Math.random() * 30, sc = 0.5 + Math.random() * 0.7;
      var an = s.animate([{ transform: "translate(" + x + "px," + y + "px) scale(" + sc + ")", opacity: 1 }, { transform: "translate(" + (x + Math.cos(a) * d) + "px," + (y + Math.sin(a) * d - 14) + "px) scale(0)", opacity: 0 }], { duration: 560 + Math.random() * 240, easing: "cubic-bezier(.2,.7,.3,1)" });
      an.onfinish = (function (el) { return function () { live--; if (el.parentNode) el.parentNode.removeChild(el); }; })(s);
    }
  }
  document.addEventListener("pointerdown", function (e) {
    var tg = e.target; if (!tg || !tg.closest) return;
    if (tg.closest(NO)) return;
    var p = tg.closest(POP); if (p) pop(p);
    if (p || e.pointerType === "touch") sparks(e.clientX, e.clientY);
  }, { passive: true });

  /* ——— moments : file d'attente ajoutée ——— */
  document.addEventListener("eden:queue", function (e) {
    if (!e.detail || !e.detail.active) return;
    var c = document.querySelector(".player-bar .player-cover"); if (c) pop(c);
    var k = document.querySelector(".cat-card.is-playing"); if (k) hop(k, 6);
  });

  /* ——— la chanson qui joue respire ; onglet caché ——— */
  var playing = [];
  function lib() { try { return !!(window.EdenLibrary && window.EdenLibrary.isPlaying && window.EdenLibrary.isPlaying()); } catch (e) { return false; } }
  function setPlaying() { de.classList.toggle("alive-playing", playing.length > 0 || lib()); }
  setInterval(function () { if (!document.hidden) setPlaying(); }, 1000);   /* le lecteur principal crée son <audio> hors du DOM : on l'interroge (lecture seule) */
  document.addEventListener("play", function (e) { if (playing.indexOf(e.target) < 0) playing.push(e.target); setPlaying(); }, true);
  function off(e) { var i = playing.indexOf(e.target); if (i >= 0) playing.splice(i, 1); setPlaying(); }
  document.addEventListener("pause", off, true); document.addEventListener("ended", off, true);
  document.addEventListener("visibilitychange", function () { de.classList.toggle("alive-paused", document.hidden); });
})();
