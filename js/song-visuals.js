/* Eden Yours — « Images des paroles » : quand une chanson joue (n'importe où sur le site), un doux diaporama d'images
   liées à SES paroles apparaît (data/song-visuals.json : image + mot des paroles qui la justifie ; sans paroles → images
   de sa catégorie). Fondu enchaîné ~10 s avec zoom lent, calé sur la durée de la chanson (MP3) ; réductible, fermable,
   agrandissable ; ne recouvre jamais le lecteur (le ▶ de Suno reste libre) ; seules les images de la chanson en cours sont chargées.
   Chargé à la demande par js/play-full-song.js (EdenSongVisuals.song({ id, el, kind })). */
(function () {
  "use strict";
  if (window.EdenSongVisuals) return;
  var me = document.currentScript, base = (me && me.getAttribute("data-base")) || "";
  var ver = ((me && me.src) || "").match(/\?v=[^&#]*/); ver = ver ? ver[0] : "";
  var data = null, tracks = null, cur = null, root = null, layers = [], li = 0, timer = 0, poll = 0, shownAt = 0, slide = -1, gen = 0;
  var MODE_KEY = "eden-visuals-mode";
  function lang() { return (document.documentElement.lang || "fr").slice(0, 2) === "en" ? "en" : "fr"; }
  var TXT = {
    fr: { label: "Images de la chanson", min: "Réduire les images", max: "Agrandir les images", back: "Revenir à la fenêtre", close: "Fermer les images", open: "Afficher les images de la chanson" },
    en: { label: "Pictures of the song", min: "Minimize the pictures", max: "Enlarge the pictures", back: "Back to the window", close: "Close the pictures", open: "Show the song's pictures" }
  };
  function tx(k) { return (TXT[lang()] || TXT.fr)[k]; }
  function reduced() { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } }
  function small() { return Math.min(window.innerWidth, window.innerHeight) < 700 || (navigator.connection && navigator.connection.saveData); }
  function getMode() { try { return localStorage.getItem(MODE_KEY) === "min" ? "min" : "win"; } catch (e) { return "win"; } }
  function setMode(m) { try { localStorage.setItem(MODE_KEY, m === "min" ? "min" : "win"); } catch (e) {} }
  var dataP = null;
  function load() {
    if (!dataP) dataP = Promise.all([
      fetch(base + "data/song-visuals.json" + ver).then(function (r) { return r.json(); }).catch(function () { return null; }),
      fetch(base + "tracks.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).catch(function () { return null; })
    ]).then(function (a) { data = a[0]; var t = a[1]; tracks = t ? (t.tracks || t) : []; });
    return dataP;
  }
  function trackOf(id) { for (var i = 0; tracks && i < tracks.length; i++) if (tracks[i].id === id) return tracks[i]; return null; }
  function btn(cls, label, glyph, fn) { var b = document.createElement("button"); b.type = "button"; b.className = "sv-btn " + cls; b.setAttribute("aria-label", label); b.title = label; b.textContent = glyph; b.addEventListener("click", function (e) { e.stopPropagation(); fn(); }); return b; }
  function build() {
    if (root) return;
    root = document.createElement("div"); root.id = "eden-visuals"; root.className = "sv"; root.setAttribute("role", "region"); root.setAttribute("aria-label", tx("label")); root.hidden = true;
    var stage = document.createElement("div"); stage.className = "sv-stage";
    for (var i = 0; i < 2; i++) { var im = document.createElement("img"); im.className = "sv-img"; im.alt = ""; im.decoding = "async"; im.setAttribute("aria-hidden", "true"); stage.appendChild(im); layers.push(im); }
    var glow = document.createElement("div"); glow.className = "sv-glow"; stage.appendChild(glow);
    var bar = document.createElement("div"); bar.className = "sv-bar";
    var title = document.createElement("p"); title.className = "sv-title";
    var dots = document.createElement("div"); dots.className = "sv-dots"; dots.setAttribute("aria-hidden", "true");
    var tools = document.createElement("div"); tools.className = "sv-tools";
    tools.appendChild(btn("sv-max", tx("max"), "⤢", function () { root.classList.toggle("is-full"); paintLabels(); place(); }));
    tools.appendChild(btn("sv-min", tx("min"), "–", function () { setMode("min"); apply("min"); }));
    tools.appendChild(btn("sv-close", tx("close"), "×", function () { if (cur) cur.closed = true; hide(); }));
    bar.appendChild(title); bar.appendChild(dots); bar.appendChild(tools);
    var pill = btn("sv-pill", tx("open"), "", function () { setMode("win"); apply("win"); });
    var pimg = document.createElement("img"); pimg.alt = ""; pimg.className = "sv-pill-img"; pill.appendChild(pimg);
    var note = document.createElement("span"); note.className = "sv-pill-note"; note.textContent = "♪"; pill.appendChild(note);
    root.appendChild(stage); root.appendChild(bar); root.appendChild(pill);
    stage.addEventListener("click", function () { if (root.classList.contains("is-full")) { root.classList.remove("is-full"); paintLabels(); place(); } });
    document.body.appendChild(root);
    window.addEventListener("resize", place); window.addEventListener("scroll", throttlePlace, { passive: true });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && root && root.classList.contains("is-full")) { root.classList.remove("is-full"); paintLabels(); place(); } });
    if (window.EdenI18n && window.EdenI18n.onChange) window.EdenI18n.onChange(function () { paintLabels(); });
  }
  function paintLabels() {
    if (!root) return; root.setAttribute("aria-label", tx("label"));
    var full = root.classList.contains("is-full");
    [["sv-max", full ? "back" : "max"], ["sv-min", "min"], ["sv-close", "close"], ["sv-pill", "open"]].forEach(function (p) { var b = root.querySelector("." + p[0]); if (b) { b.setAttribute("aria-label", tx(p[1])); b.title = tx(p[1]); } });
    var mx = root.querySelector(".sv-max"); if (mx) mx.textContent = full ? "⤡" : "⤢";
  }
  function apply(mode) { if (!root) return; root.classList.toggle("is-min", mode === "min"); if (mode === "min") root.classList.remove("is-full"); paintLabels(); place(); }
  var pt = 0; function throttlePlace() { if (pt) return; pt = setTimeout(function () { pt = 0; place(); }, 120); }
  /* jamais par-dessus le lecteur : on se met en haut ou en bas de l'écran, du côté libre */
  /* téléphone : la fenêtre se glisse dans la page juste au-dessus du lecteur (elle ne recouvre plus rien : ni ▶ Suno,
     ni « Chanson suivante ») ; ordinateur : fenêtre flottante en haut ou en bas, du côté libre */
  function playerBox() {
    var el = cur && cur.el; if (!el || !el.isConnected) return null;
    var box = (el.closest && el.closest(".win-embed, .ca-player, [class*='player'], [class*='embed']")) || el;
    var r = box.getBoundingClientRect(); return r.width > 0 && r.height > 0 && box.parentNode ? box : null;
  }
  function inlineOut() { if (root && root.classList.contains("is-inline")) { root.classList.remove("is-inline"); document.body.appendChild(root); } }
  function place() {
    if (!root || root.hidden || root.classList.contains("is-full")) { if (root) root.classList.remove("at-top"); return; }
    var box = playerBox(), top = false;
    if (window.innerWidth <= 700) {
      if (box) {
        if (root.nextSibling !== box || !root.classList.contains("is-inline")) { box.parentNode.insertBefore(root, box); root.classList.add("is-inline"); }
        root.classList.remove("at-top"); return;
      }
      inlineOut(); root.classList.add("at-top"); return;   // pas de lecteur visible : petite bande en haut
    }
    inlineOut();
    if (box) {
      var r = box.getBoundingClientRect(), vh = window.innerHeight, h = root.getBoundingClientRect().height || 200;
      var ovB = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, vh - h - 20));
      var ovT = Math.max(0, Math.min(r.bottom, h + 90) - Math.max(r.top, 0));
      top = ovB > ovT;
    }
    root.classList.toggle("at-top", top);
  }
  function hide() {
    clearInterval(timer); clearInterval(poll); timer = poll = 0;
    if (!root) return; root.classList.remove("is-on", "is-full");
    var g = ++gen;   // une chanson qui démarre entre-temps (ex. enchaînement auto, onglet en arrière-plan) annule ce masquage
    setTimeout(function () { if (root && g === gen && !root.classList.contains("is-on")) { root.hidden = true; inlineOut(); layers.forEach(function (im) { im.removeAttribute("src"); im.classList.remove("is-on"); }); } }, 900);
  }
  function srcOf(imgId) { var m = data && data.images && data.images[imgId]; if (!m) return ""; return base + (small() ? m.sm : m.src); }
  function imagesFor(id) {
    var s = data && data.songs && data.songs[id];
    if (s && s.images && s.images.length) return s.images.map(function (x) { return x.img; });
    var cats = data && data.categories, keys = cats ? Object.keys(cats) : [];   // chanson inconnue : une catégorie au hasard (images de nature)
    return keys.length ? cats[keys[Math.floor(Math.random() * keys.length)]] : [];
  }
  function show(i) {
    if (!cur || !cur.imgs.length) return;
    i = ((i % cur.imgs.length) + cur.imgs.length) % cur.imgs.length; if (i === slide && layers[li].getAttribute("src")) return; slide = i;
    var next = layers[1 - li], src = srcOf(cur.imgs[i]);
    next.onload = function () {
      next.classList.remove("zoom-a", "zoom-b"); void next.offsetWidth; next.classList.add(i % 2 ? "zoom-b" : "zoom-a");
      next.classList.add("is-on"); layers[li].classList.remove("is-on"); li = 1 - li;
      var pimg = root.querySelector(".sv-pill-img"); if (pimg) pimg.src = src;
      var pre = new Image(); pre.src = srcOf(cur.imgs[(i + 1) % cur.imgs.length]);   // seule l'image suivante est préchargée
    };
    next.src = src;
    var d = root.querySelectorAll(".sv-dots i"); for (var k = 0; k < d.length; k++) d[k].classList.toggle("is-on", k === i);
  }
  /* ~10 s par image ; pour un MP3, le cycle est calé sur la durée pour finir avec la chanson */
  function interval() {
    var n = cur.imgs.length || 1, dur = cur.dur || 0, a = cur.el;
    if (cur.kind === "audio" && a && isFinite(a.duration) && a.duration > 20) dur = a.duration;
    if (cur.kind === "external" && cur.d && cur.d.duration > 20) dur = cur.d.duration;
    if (!dur) return 10;
    var rounds = Math.max(1, Math.round(dur / (n * 10))); return Math.max(7, Math.min(14, dur / (n * rounds)));
  }
  function tick() {
    if (!cur) return;
    if (root && !root.hidden && !root.classList.contains("is-on")) root.classList.add("is-on");   // onglet en arrière-plan : pas de requestAnimationFrame
    if (root && window.innerWidth <= 700 && !root.classList.contains("is-full")) { var pb = playerBox(); if (pb ? root.nextSibling !== pb : root.classList.contains("is-inline")) place(); }
    var a = cur.el;
    if (cur.kind === "external") { var x = cur.d; if (!x || x.done || (window.__edenSongNow || {}) !== x) { hide(); cur = null; return; } show(Math.floor((x.start + (Date.now() - x.t0) / 1000) / interval())); return; }
    if (cur.over) { hide(); cur = null; return; }
    if (cur.kind === "embed") { if (!a || !a.isConnected) { hide(); cur = null; return; } show(Math.floor((Date.now() - shownAt) / 1000 / interval())); return; }
    if (!a || a.ended || !(a.getAttribute("src") || a.currentSrc)) { hide(); cur = null; return; }
    if (a.paused) { root.classList.add("is-paused"); return; }
    root.classList.remove("is-paused");
    show(Math.floor((a.currentTime || 0) / interval()));
  }
  function start(d) {
    var t = trackOf(d.id), imgs = imagesFor(d.id);
    if (!imgs.length) return;
    /* même chanson, même lecteur, toujours en cours (reprise après pause, nouvel extrait) : on garde la fenêtre et son état
       (fermée = fermée pour CETTE chanson) ; toute autre chanson, ou la même relancée après sa fin, repart de zéro */
    if (cur && cur.id === d.id && (cur.el === d.el || d.kind === "external") && cur.kind === d.kind && !cur.over) { cur.d = d; cur.el = d.el; if (cur.closed) return; if (root.hidden || !root.classList.contains("is-on")) reveal(); return; }
    cur = { id: d.id, el: d.el, kind: d.kind, d: d, imgs: imgs, dur: t && t.duration ? +t.duration : 0, closed: false, over: false };
    build(); slide = -1; shownAt = Date.now();
    root.classList.remove("is-paused");
    layers.forEach(function (im) { im.onload = null; });   // une image encore en route de l'ancienne chanson ne s'affichera pas
    var pimg = root.querySelector(".sv-pill-img"); if (pimg) pimg.src = srcOf(imgs[0]);   // la bulle réduite montre tout de suite la nouvelle chanson
    root.querySelector(".sv-title").textContent = "♪ " + ((t && t.title) || (data.songs[d.id] && data.songs[d.id].title) || "");
    var dots = root.querySelector(".sv-dots"); dots.innerHTML = ""; imgs.forEach(function () { dots.appendChild(document.createElement("i")); });
    root.classList.toggle("is-still", reduced());
    reveal();
  }
  function reveal() {
    gen++; root.hidden = false; apply(getMode()); show(slide < 0 ? 0 : slide);
    requestAnimationFrame(function () { root.classList.add("is-on"); place(); });
    clearInterval(timer); timer = setInterval(tick, 1000);
  }
  /* un <audio> annoncé : on attend qu'il joue vraiment (pas le « déblocage » muet de certains jeux) */
  function song(d) {
    if (!d || !d.id) return;
    load().then(function () {
      if (!data) return;
      var a = d.el;
      if (d.kind === "audio" && a) {
        var go = function () { if (!a.paused && !a.muted && (window.__edenSongNow || {}).el === a) start(d); };
        if (!a.__svBound) { a.__svBound = true; a.addEventListener("playing", function () { var n = window.__edenSongNow; if (n && n.el === a) song(n); }); a.addEventListener("volumechange", function () { var n = window.__edenSongNow; if (n && n.el === a && !a.muted && !a.paused) song(n); });
          a.addEventListener("ended", function () { if (cur && cur.el === a && a.ended) cur.over = true; }); }   // finie : la rejouer = la rouvrir
        if (!a.paused && !a.muted) go();
        return;
      }
      start(d);
    });
  }
  window.EdenSongVisuals = { song: song, hide: hide, state: function () { return { on: !!(root && !root.hidden && root.classList.contains("is-on")), id: cur && cur.id, kind: cur && cur.kind, slide: slide, images: cur ? cur.imgs.slice() : [], mode: root ? (root.classList.contains("is-full") ? "full" : root.classList.contains("is-min") ? "min" : "win") : null, top: !!(root && root.classList.contains("at-top")), inline: !!(root && root.classList.contains("is-inline")), interval: cur ? interval() : 0 }; } };
  if (window.__edenSongNow) song(window.__edenSongNow);
})();
