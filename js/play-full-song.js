/* Eden Yours — « play-full-song » : lecteur partagé pour que chaque chanson soit écoutée en entier.
   Règles : on démarre à 0:00, aucun minuteur n'arrête ni ne met en pause la chanson, une chanson en cours n'est jamais
   coupée par un changement de manche / de page interne / une victoire : seul un geste explicite de l'utilisateur
   (jouer une autre chanson, changer de langue, quitter) la remplace. Les embeds Suno jouent en entier d'eux-mêmes.
   Usage : EdenFullSong.play(audioEl, { id, audio | audio_url, aac | audio_url_aac }, { onEnded })
           EdenFullSong.embed(boxEl, { embed | embed_url, title })
           EdenFullSong.busy(audioEl)  → vrai si une chanson est en cours (ne pas la couper automatiquement) */
(function () {
  "use strict";
  if (window.EdenFullSong) return;
  /* ——— Une seule chanson à la fois, partout sur le site ———
     Avant qu'une chanson démarre (<audio> de assets/audio, même hors DOM, ou embed Suno), on met en pause toutes les autres
     et on retire les iframes Suno existantes (impossible de les mettre en pause d'une autre origine). */
  var songs = [];
  /* ——— Images des paroles (js/song-visuals.js) : chargé seulement quand une chanson démarre ——— */
  var selfSrc = (document.currentScript && document.currentScript.src) || "";
  var verQ = (selfSrc.match(/\?v=[^&#]*/) || [""])[0], baseU = selfSrc ? selfSrc.replace(/js\/play-full-song\.js.*$/, "") : "";
  var visLoading = false;
  function songIdOf(u) { var m = String(u || "").match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i); return m ? m[0].toLowerCase() : ""; }
  function announce(el, kind, extra) {
    try {
      var id = extra && extra.id ? songIdOf(extra.id) || String(extra.id) : songIdOf(kind === "embed" ? el.src : (el.getAttribute("src") || el.currentSrc || el.src)) || (el.getAttribute && el.getAttribute("data-id")) || "";
      if (!id) return;
      var d = { id: id, el: el, kind: kind };
      if (extra) for (var k in extra) if (k !== "id") d[k] = extra[k];
      window.__edenSongNow = d;
      if (window.EdenSongVisuals) { window.EdenSongVisuals.song(d); return; }
      if (visLoading || !document.head) return; visLoading = true;
      var l = document.createElement("link"); l.rel = "stylesheet"; l.href = baseU + "css/song-visuals.css" + verQ; document.head.appendChild(l);
      var sc = document.createElement("script"); sc.src = baseU + "js/song-visuals.js" + verQ; sc.async = true; sc.setAttribute("data-base", baseU); document.head.appendChild(sc);
    } catch (e) {}
  }
  function isSong(m) { var u = (m && (m.currentSrc || m.getAttribute && m.getAttribute("src") || m.src)) || ""; return /assets\/audio\/|\.(mp3|m4a)(\?|$)/i.test(u) && u.indexOf("data:") !== 0; }
  function killEmbeds(keep) {
    var fr = document.querySelectorAll('iframe[src*="suno.com"]');
    for (var i = 0; i < fr.length; i++) { var f = fr[i]; if (f === keep) continue; try { f.src = "about:blank"; } catch (e) {} if (f.parentNode) { var box = f.parentNode; box.removeChild(f); if (box.classList && /embed/.test(box.className)) box.hidden = true; } }
  }
  /* Lecteurs hors <audio> (ex. Web Audio de Rythme-Compasse) : claim(stopFn) avant de jouer ; stopFn est appelée quand une autre chanson démarre. */
  var external = [];
  /* claim(stopFn, { id, start, duration, el }) : une chanson Web Audio démarre (id = chanson, start = position dans la chanson,
     el = repère pour placer les images) ; release(stopFn) quand elle s'arrête ou finit → les images de la chanson suivent. */
  function claim(stopFn, info) {
    stopOthers(null, null, stopFn); if (stopFn && external.indexOf(stopFn) === -1) external.push(stopFn);
    if (info && info.id) announce(info.el || null, "external", { id: info.id, start: +info.start || 0, duration: +info.duration || 0, t0: Date.now(), owner: stopFn, done: false });
  }
  function release(stopFn) { var n = window.__edenSongNow; if (n && n.kind === "external" && (!stopFn || n.owner === stopFn)) n.done = true; }
  function stopOthers(except, keepFrame, keepFn) {
    for (var j = 0; j < external.length; j++) if (external[j] !== keepFn) { try { external[j](); } catch (e) {} }
    var all = songs.concat([].slice.call(document.querySelectorAll("audio, video")));
    for (var i = 0; i < all.length; i++) { var m = all[i]; if (m === except || !isSong(m)) continue; try { if (!m.paused) m.pause(); } catch (e) {} }
    killEmbeds(keepFrame);
  }
  var nativePlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    try { if (isSong(this)) { if (songs.indexOf(this) === -1) songs.push(this); stopOthers(this); announce(this, "audio"); } } catch (e) {}
    return nativePlay.apply(this, arguments);
  };
  document.addEventListener("play", function (e) { var m = e.target; if (isSong(m)) { stopOthers(m); announce(m, "audio"); } }, true);
  try {
    new MutationObserver(function (muts) {
      muts.forEach(function (mu) {
        /* iframe Suno réutilisée : on lui change seulement src → c'est une nouvelle chanson */
        if (mu.type === "attributes") { var t = mu.target; if (t.tagName === "IFRAME" && t.isConnected && /suno\.com/.test(t.src || "") && songIdOf(t.src) !== songIdOf(mu.oldValue)) { stopOthers(null, t); announce(t, "embed"); } return; }
        [].forEach.call(mu.addedNodes, function (n) {
        if (n.nodeType !== 1) return;
        var f = n.tagName === "IFRAME" ? n : n.querySelector && n.querySelector('iframe[src*="suno.com"]');
        if (f && /suno\.com/.test(f.src || "")) { stopOthers(null, f); announce(f, "embed"); }
      }); });
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"], attributeOldValue: true });
  } catch (e) {}
  function busy(a) { return !!(a && a.getAttribute && a.getAttribute("src") && !a.paused && !a.ended); }
  function resolve(u) { try { return new URL(u, document.baseURI).href; } catch (e) { return u; } }
  function play(a, song, opts) {
    opts = opts || {};
    if (!a || !song) return false;
    var src = song.audio || song.audio_url, aac = song.aac || song.audio_url_aac;
    if (!src && !aac) return false;
    a.hidden = false;
    a.removeAttribute("data-tried-aac");
    a.onerror = function () {
      if (aac && !a.getAttribute("data-tried-aac")) {
        a.setAttribute("data-tried-aac", "1");
        a.src = resolve(aac);
        var q = a.play(); if (q && q.catch) q.catch(function () {});
      }
    };
    if (opts.onEnded) a.addEventListener("ended", opts.onEnded, { once: true });
    a.src = resolve(src || aac);
    a.setAttribute("data-id", song.id || "");
    try { a.currentTime = 0; } catch (e) { /* ignore */ }
    try { if (window.EdenSongPick && song.id) window.EdenSongPick.record(song.id); } catch (e) { /* ignore */ }
    var p = a.play();
    if (p && p.catch) p.catch(function () {});
    return true;
  }
  function stop(a) {
    if (!a) return;
    try { a.pause(); } catch (e) {}
    try { a.removeAttribute("src"); a.load(); } catch (e) {}
  }
  function embed(box, song) {
    var url = song && (song.embed || song.embed_url);
    if (!box || !url) return false;
    stopOthers(null);
    box.innerHTML = "";
    var f = document.createElement("iframe");
    f.src = url; f.title = song.title || "Suno"; f.allow = "autoplay; clipboard-write; encrypted-media"; f.loading = "lazy";
    f.setAttribute("frameborder", "0"); f.style.width = "100%"; f.style.height = "180px";
    box.appendChild(f); box.hidden = false;
    try { if (window.EdenSongPick && song.id) window.EdenSongPick.record(song.id); } catch (e) {}
    return true;
  }
  window.EdenFullSong = { play: play, stop: stop, embed: embed, busy: busy, stopOthers: stopOthers, claim: claim, release: release };
})();
