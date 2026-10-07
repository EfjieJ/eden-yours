/* Les Êtres de Lumière — finale : l'être rayonne avec ses 5 anneaux,
   « Je suis autour. Je suis déjà dans le Vrai pur. », puis une vraie chanson Eden Yours. */
(function () {
  "use strict";
  var EL = window.EL, U = EL.util, TAU = Math.PI * 2;

  /* Choix : audio_url local non nul, langue de la page, « featured » en priorité. */
  function pickTrack(list, lang) {
    list = Array.isArray(list) ? list : [];
    var local = list.filter(function (t) { return t && t.audio_url; });
    var same = local.filter(function (t) { return t.lang === lang; });
    var pool = same; /* jamais une chanson d’une autre langue */
    if (pool.length) {
      var feat = pool.filter(function (t) { return t.featured; });
      return { track: feat[0] || pool[0], kind: "audio" };
    }
    var emb = list.filter(function (t) { return t && t.embed_url; });
    var embSame = emb.filter(function (t) { return t.lang === lang; });
    var e = embSame[0];
    return e ? { track: e, kind: "embed" } : null;
  }
  EL.pickTrack = pickTrack;

  function Finale(opts) {
    this.ui = opts.ui;
    this.onClose = opts.onClose;
    this.T = 0;
    this.songAt = 7.5;
    this.songStarted = false;
    this.closed = false;
    this.fadeTimer = null;
    var ui = this.ui;
    ui.root.hidden = false;
    ui.song.hidden = true;
    ui.songNote.hidden = true;
    ui.play.hidden = true;
    ui.embed.innerHTML = "";
    ui.embed.hidden = true;
    [ui.l1, ui.l2, ui.sub, ui.actions].forEach(function (el) { el.classList.remove("is-on"); });
    requestAnimationFrame(function () { ui.root.classList.add("is-on"); });
    var self = this;
    this.timers = [
      setTimeout(function () { ui.l1.classList.add("is-on"); }, 1400),
      setTimeout(function () { ui.l2.classList.add("is-on"); }, 3400),
      setTimeout(function () { ui.sub.classList.add("is-on"); }, 5600),
      setTimeout(function () { ui.actions.classList.add("is-on"); }, 6400),
      setTimeout(function () { self.startSong(); }, this.songAt * 1000)
    ];
  }
  var P = Finale.prototype;

  P.update = function (dt) { this.T += dt; };

  P.startSong = function () {
    if (this.songStarted || this.closed) return;
    this.songStarted = true;
    var self = this, ui = this.ui;
    fetch("tracks.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (d) {
        if (self.closed) return;
        var pick = pickTrack(d && d.tracks, EL.lang);
        if (!pick) throw new Error("no track");
        self.show(pick);
      })
      .catch(function () {
        if (self.closed) return;
        ui.song.hidden = false;
        ui.songNote.hidden = false;
        ui.songNote.textContent = EL.t("songNone");
        ui.cover.hidden = true;
        ui.audio.hidden = true;
        requestAnimationFrame(function () { ui.song.classList.add("is-on"); });
      });
  };

  P.show = function (pick) {
    var ui = this.ui, t = pick.track, self = this;
    ui.title.textContent = t.title || "Eden Yours";
    ui.artist.textContent = t.artist || "Eden Yours";
    if (t.cover_url) { ui.cover.src = t.cover_url; ui.cover.alt = t.title || ""; ui.cover.hidden = false; }
    else ui.cover.hidden = true;
    ui.song.hidden = false;
    requestAnimationFrame(function () { ui.song.classList.add("is-on"); });
    EL.Audio.fadeOutAll(4);
    if (pick.kind === "audio") {
      var a = ui.audio;
      a.hidden = false;
      a.src = t.audio_url;
      a.muted = EL.Audio.muted;
      a.volume = 0;
      var tryPlay = function () {
        var pr = a.play();
        if (pr && pr.catch) pr.catch(function () { ui.play.hidden = false; });
      };
      setTimeout(function () {
        if (self.closed) return;
        tryPlay();
        var v = 0;
        self.fadeTimer = setInterval(function () {
          v = Math.min(1, v + 0.025);
          a.volume = v;
          if (v >= 1) { clearInterval(self.fadeTimer); self.fadeTimer = null; }
        }, 100);
      }, 1800);
      ui.play.onclick = function () { ui.play.hidden = true; a.volume = 1; tryPlay(); };
    } else {
      ui.audio.hidden = true;
      var f = document.createElement("iframe");
      f.src = t.embed_url;
      f.title = t.title || "Eden Yours";
      f.allow = "autoplay; encrypted-media";
      f.loading = "lazy";
      ui.embed.appendChild(f);
      ui.embed.hidden = false;
    }
  };

  P.setMuted = function (m) { this.ui.audio.muted = !!m; };

  P.close = function () {
    if (this.closed) return;
    this.closed = true;
    this.timers.forEach(clearTimeout);
    if (this.fadeTimer) clearInterval(this.fadeTimer);
    var ui = this.ui;
    try { ui.audio.pause(); } catch (e) {}
    ui.audio.removeAttribute("src");
    try { ui.audio.load(); } catch (e) {}
    ui.embed.innerHTML = "";
    ui.root.classList.remove("is-on");
    ui.song.classList.remove("is-on");
    setTimeout(function () { ui.root.hidden = true; }, 600);
    EL.Audio.fadeBackIn();
    if (this.onClose) this.onClose();
  };

  /* lumière de la finale autour de l'être (canvas) */
  P.drawOverlay = function (ctx, w, h, x, y) {
    var t = this.T, a = U.smooth(0, 3, t), red = EL.reduced, m = Math.max(w, h), i;
    ctx.globalCompositeOperation = "lighter";
    var g = ctx.createRadialGradient(x, y, 10, x, y, m * 0.9);
    g.addColorStop(0, "rgba(255,240,200," + (0.32 * a).toFixed(3) + ")");
    g.addColorStop(0.25, "rgba(255,200,120," + (0.12 * a).toFixed(3) + ")");
    g.addColorStop(1, "rgba(255,200,120,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    for (i = 0; i < 24; i++) {
      var an = (i / 24) * TAU + (red ? 0 : t * 0.04), wd = 0.03 + 0.025 * (0.5 + 0.5 * Math.sin(t * 0.5 + i * 1.7));
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(an - wd) * m, y + Math.sin(an - wd) * m);
      ctx.lineTo(x + Math.cos(an + wd) * m, y + Math.sin(an + wd) * m);
      ctx.closePath();
    }
    ctx.fill();
    for (i = 0; i < 5; i++) {
      var c = EL.PLANETS[i].ring, ph = ((t * 0.12 + i / 5) % 1);
      ctx.strokeStyle = U.rgba(c, 0.35 * a * (1 - ph));
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 40 + ph * m * 0.5, 0, TAU); ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  };

  EL.Finale = Finale;
})();
