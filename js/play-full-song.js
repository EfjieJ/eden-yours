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
    box.innerHTML = "";
    var f = document.createElement("iframe");
    f.src = url; f.title = song.title || "Suno"; f.allow = "autoplay; clipboard-write; encrypted-media"; f.loading = "lazy";
    f.setAttribute("frameborder", "0"); f.style.width = "100%"; f.style.height = "180px";
    box.appendChild(f); box.hidden = false;
    try { if (window.EdenSongPick && song.id) window.EdenSongPick.record(song.id); } catch (e) {}
    return true;
  }
  window.EdenFullSong = { play: play, stop: stop, embed: embed, busy: busy };
})();
