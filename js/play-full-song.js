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
  function isSong(m) { var u = (m && (m.currentSrc || m.getAttribute && m.getAttribute("src") || m.src)) || ""; return /assets\/audio\/|\.(mp3|m4a)(\?|$)/i.test(u) && u.indexOf("data:") !== 0; }
  function killEmbeds(keep) {
    var fr = document.querySelectorAll('iframe[src*="suno.com"]');
    for (var i = 0; i < fr.length; i++) { var f = fr[i]; if (f === keep) continue; try { f.src = "about:blank"; } catch (e) {} if (f.parentNode) { var box = f.parentNode; box.removeChild(f); if (box.classList && /embed/.test(box.className)) box.hidden = true; } }
  }
  function stopOthers(except, keepFrame) {
    var all = songs.concat([].slice.call(document.querySelectorAll("audio, video")));
    for (var i = 0; i < all.length; i++) { var m = all[i]; if (m === except || !isSong(m)) continue; try { if (!m.paused) m.pause(); } catch (e) {} }
    killEmbeds(keepFrame);
  }
  var nativePlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    try { if (isSong(this)) { if (songs.indexOf(this) === -1) songs.push(this); stopOthers(this); } } catch (e) {}
    return nativePlay.apply(this, arguments);
  };
  document.addEventListener("play", function (e) { var m = e.target; if (isSong(m)) stopOthers(m); }, true);
  try {
    new MutationObserver(function (muts) {
      muts.forEach(function (mu) { [].forEach.call(mu.addedNodes, function (n) {
        if (n.nodeType !== 1) return;
        var f = n.tagName === "IFRAME" ? n : n.querySelector && n.querySelector('iframe[src*="suno.com"]');
        if (f && /suno\.com/.test(f.src || "")) stopOthers(null, f);
      }); });
    }).observe(document.documentElement, { childList: true, subtree: true });
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
  window.EdenFullSong = { play: play, stop: stop, embed: embed, busy: busy, stopOthers: stopOthers };
})();
