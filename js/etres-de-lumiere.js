/* Les Êtres de Lumière — boucle principale : espace, déplacement, caméra, étoiles en parallaxe,
   être de lumière et ses anneaux, indices de bord, cartes de planètes, incarnations, finale.
   Prototype non listé. Modules : js/etres/*.js (chargés avant ce fichier). */
(function () {
  "use strict";
  var EL = window.EL;
  if (!EL || !EL.Planets) return;
  var U = EL.util, TAU = Math.PI * 2, PLANETS = EL.PLANETS;
  function $(id) { return document.getElementById(id); }

  var canvas = $("el-canvas"), ctx = canvas.getContext("2d");
  var W = 0, H = 0, DPR = 1, ZOOM = 1;
  var state = EL.store.load();
  var mode = "start";
  var T = 0, last = 0;
  var player = { x: 0, y: 60, vx: 0, vy: 0 }, target = null, pointerDown = false, keys = {};
  var camBase = { x: 0, y: 0 }, cam = { x: 0, y: 0, z: 1 }, finCam = { x: 0, y: 0 }, finaleZoom = 1;
  var trail = [], shards = [], bursts = [], glowBoost = 0;
  var prox = [0, 0, 0, 0, 0], nearIdx = -1, hasMoved = false;
  var inc = null, finale = null, demo = EL.params.get("demo"), needTapForSound = false;
  var stars = [], nebulae = [];
  var restartArmed = 0, toastTimer = null;
  var WORLD_R = 2400, MAXS = 520, FONT = "system-ui, sans-serif";

  /* même ciel que le site : violet profond (#120a26) en haut, or chaud en bas */
  var BASE_SKY = [[18, 10, 38], [84, 40, 132], [236, 170, 92]];
  /* aurores du site (js/ambiance.js, partagées via js/eden-passage.js) peintes dans le ciel basse résolution */
  var AURORA = (window.EdenPassage && window.EdenPassage.AURORA) || [], auroraSprites = null;

  var ui = {
    start: $("el-start"), startBtn: $("el-start-btn"), startNote: $("el-start-note"),
    hint: $("el-hint"), card: $("el-card"), cardName: $("el-card-name"), cardLine: $("el-card-line"),
    cardVisited: $("el-card-visited"), incarnate: $("el-incarnate"),
    mute: $("el-mute"), restart: $("el-restart"), finaleBtn: $("el-finale-btn"), progress: $("el-progress"),
    toast: $("el-toast"), inc: $("el-inc"),
    incUi: { title: $("el-inc-title"), phrase: $("el-inc-phrase"), breath: $("el-inc-breath"), leave: $("el-leave") },
    finale: {
      root: $("el-finale"), l1: $("el-finale-l1"), l2: $("el-finale-l2"), sub: $("el-finale-sub"),
      song: $("el-song"), cover: $("el-song-cover"), title: $("el-song-title"), artist: $("el-song-artist"),
      audio: $("el-song-audio"), embed: $("el-song-embed"), play: $("el-song-play"), songNote: $("el-song-note"),
      actions: $("el-finale-actions")
    },
    finaleClose: $("el-finale-close"), finaleRestart: $("el-finale-restart")
  };

  /* ---------- textes ---------- */
  function applyI18n() {
    document.documentElement.lang = EL.lang;
    document.title = EL.t("docTitle");
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute("content", EL.t("metaDesc"));
    var lt = document.getElementById("el-lang");
    if (lt) { lt.textContent = EL.t("langToggle"); lt.setAttribute("aria-label", EL.t("langToggleAria")); lt.title = EL.t("langToggleAria"); }
    Array.prototype.forEach.call(document.querySelectorAll("[data-t]"), function (el) { el.textContent = EL.t(el.getAttribute("data-t")); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-t-aria]"), function (el) {
      var s = EL.t(el.getAttribute("data-t-aria")); el.setAttribute("aria-label", s); el.title = s;
    });
    var fine = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
    ui.hint.textContent = EL.t(fine ? "hintKeys" : "hint");
    ui.startNote.textContent = state.done.length ? EL.t("resumeNote", { n: state.done.length }) : EL.t("soundNote");
  }

  function updateProgress() {
    ui.progress.innerHTML = "";
    for (var i = 0; i < 5; i++) {
      var d = document.createElement("span"), on = state.done.indexOf(i) >= 0;
      d.className = "el-dot" + (on ? " is-on" : "");
      d.style.setProperty("--c", U.rgba(PLANETS[i].ring, 1));
      ui.progress.appendChild(d);
    }
    ui.progress.setAttribute("aria-label", EL.t("progress", { n: state.done.length }));
    ui.progress.title = EL.t("progress", { n: state.done.length });
    ui.finaleBtn.hidden = state.done.length < 5;
  }

  function updateMuteBtn() {
    var m = EL.Audio.muted;
    ui.mute.classList.toggle("is-muted", m);
    var s = EL.t(m ? "unmute" : "mute");
    ui.mute.setAttribute("aria-label", s); ui.mute.title = s;
    ui.mute.setAttribute("aria-pressed", m ? "true" : "false");
  }

  function toast(msg, ms) {
    ui.toast.textContent = msg;
    ui.toast.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { ui.toast.classList.remove("is-on"); }, ms || 2800);
  }

  /* ---------- taille ---------- */
  function resize() {
    W = Math.max(1, window.innerWidth); H = Math.max(1, window.innerHeight);
    DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ZOOM = U.clamp(Math.sqrt(W * H) / 900, 0.5, 1.0);
    genStars();
    if (inc) inc.resize(W, H, DPR);
  }

  function genStars() {
    var r = U.rng(42), depths = [0.12, 0.3, 0.55], dens = [5200, 8000, 15000];
    stars = [];
    for (var l = 0; l < 3; l++) {
      var n = Math.round((W * H) / dens[l]);
      for (var k = 0; k < n; k++) {
        stars.push({ x: r() * W, y: r() * H, d: depths[l], s: 0.5 + r() * (0.6 + l * 0.8), ph: r() * TAU, sp: 0.5 + r() * 1.5, c: r() < 0.15 ? [255, 220, 180] : r() < 0.3 ? [200, 210, 255] : [255, 255, 255] });
      }
    }
    nebulae = [];
    var cols = [[150, 80, 230], [255, 150, 200], [90, 180, 255], [255, 190, 110], [120, 255, 220], [190, 120, 255]];
    for (k = 0; k < 7; k++) nebulae.push({ x: r() * W * 2, y: r() * H * 2, rr: (0.35 + r() * 0.4) * Math.max(W, H), c: cols[k % cols.length], a: 0.1 + r() * 0.08 });
  }

  /* ---------- coordonnées ---------- */
  function toScreen(x, y) { return [(x - cam.x) * cam.z + W / 2, (y - cam.y) * cam.z + H / 2]; }
  function toWorld(x, y) { return [(x - W / 2) / cam.z + cam.x, (y - H / 2) / cam.z + cam.y]; }

  /* ---------- mise à jour ---------- */
  function update(dt) {
    T += dt;
    var i, p;
    if (mode === "space") {
      var ax = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), ay = (keys.down ? 1 : 0) - (keys.up ? 1 : 0), dvx = 0, dvy = 0;
      if (ax || ay) {
        target = null;
        var l = Math.hypot(ax, ay); dvx = (ax / l) * MAXS; dvy = (ay / l) * MAXS;
      } else if (target) {
        /* doigt maintenu : la cible suit le point de l'écran, on continue d'avancer dans cette direction */
        if (pointerDown && pointerScreen) { var tw = toWorld(pointerScreen[0], pointerScreen[1]); target.x = tw[0]; target.y = tw[1]; }
        var dx = target.x - player.x, dy = target.y - player.y, dd = Math.hypot(dx, dy);
        if (dd < 8 && !pointerDown) target = null;
        else { var sp = Math.min(MAXS, dd * 2.0); dvx = (dx / (dd || 1)) * sp; dvy = (dy / (dd || 1)) * sp; }
      }
      var k = 1 - Math.exp(-dt * 3.2);
      player.vx += (dvx - player.vx) * k; player.vy += (dvy - player.vy) * k;
      player.x += player.vx * dt; player.y += player.vy * dt;
      var rr = Math.hypot(player.x, player.y);
      if (rr > WORLD_R) { var pull = (rr - WORLD_R) * 2.5 * dt; player.x -= (player.x / rr) * pull; player.y -= (player.y / rr) * pull; }
      /* ne pas traverser les planètes : glisser autour */
      for (i = 0; i < PLANETS.length; i++) {
        p = PLANETS[i];
        var ddx = player.x - p.x, ddy = player.y - p.y, d0 = Math.hypot(ddx, ddy), minD = p.r * 1.12 + 30;
        if (d0 < minD) { player.x = p.x + (ddx / (d0 || 1)) * minD; player.y = p.y + (ddy / (d0 || 1)) * minD; }
      }
      if (!hasMoved && Math.hypot(player.vx, player.vy) > 40) { hasMoved = true; ui.hint.classList.remove("is-on"); }
    } else {
      player.vx *= 0.9; player.vy *= 0.9;
    }

    /* proximité des planètes → son, ciel, cartes */
    var best = -1, bestD = 1e9;
    for (i = 0; i < PLANETS.length; i++) {
      p = PLANETS[i];
      var d = Math.hypot(player.x - p.x, player.y - p.y) - p.r;
      prox[i] = 1 - U.smooth(40, 1150, d);
      if (d < bestD) { bestD = d; best = i; }
      if (p.style === "cells") p.gather += (U.smooth(0.3, 0.85, prox[i]) - p.gather) * Math.min(1, dt * 0.9);
    }
    if (mode === "space" || mode === "start") EL.Audio.setPresence(prox.map(function (v) { return Math.pow(v, 1.6); }));
    var thr = nearIdx === best ? 250 : 200;
    var newNear = mode === "space" && bestD < thr ? best : -1;
    if (newNear !== nearIdx) { nearIdx = newNear; showCard(nearIdx); }

    /* caméra */
    var look = EL.reduced ? 0 : 0.32, ct;
    if (mode === "start") {
      var p0 = PLANETS[0];
      ct = [U.lerp(player.x, p0.x, 0.45), U.lerp(player.y, p0.y, 0.45)];
    } else ct = [player.x + player.vx * look, player.y + player.vy * look];
    /* la carte de planète occupe le bas de l'écran : remonter le monde pour garder l'être visible */
    if (mode === "space" && nearIdx >= 0) ct[1] += (ui.card.offsetHeight * 0.45) / ZOOM;
    var kc = 1 - Math.exp(-dt * 2.4);
    camBase.x += (ct[0] - camBase.x) * kc; camBase.y += (ct[1] - camBase.y) * kc;
    cam.x = camBase.x; cam.y = camBase.y; cam.z = ZOOM;
    if (inc) {
      var sv = inc.spaceView(), pp = inc.p;
      cam.x = U.lerp(camBase.x, pp.x, sv.focus); cam.y = U.lerp(camBase.y, pp.y, sv.focus);
      cam.z = ZOOM * sv.zoom;
    }
    var fzT = mode === "finale" ? 2.1 : 1;
    finaleZoom += (fzT - finaleZoom) * (1 - Math.exp(-dt * 0.8));
    cam.z *= finaleZoom;
    if (mode === "finale") {
      /* l'être rayonne dans le haut de l'écran, les mots et la chanson en dessous */
      finCam.x += (player.x - finCam.x) * Math.min(1, dt * 1.5);
      finCam.y += (player.y + (H * 0.23) / cam.z - finCam.y) * Math.min(1, dt * 1.5);
      cam.x = finCam.x; cam.y = finCam.y;
    } else { finCam.x = cam.x; finCam.y = cam.y; }

    /* traînée */
    if (Math.hypot(player.vx, player.vy) > 20) trail.push({ x: player.x, y: player.y, t: T });
    while (trail.length && (trail.length > 30 || T - trail[0].t > 0.6)) trail.shift();

    /* éclats qui volent vers l'être */
    for (i = shards.length - 1; i >= 0; i--) {
      var s = shards[i];
      s.t += dt;
      var q = Math.min(1, s.t / s.dur), e = U.easeInOut(q);
      var cx = (s.x0 + player.x) / 2 + s.nx, cy = (s.y0 + player.y) / 2 + s.ny;
      s.x = (1 - e) * (1 - e) * s.x0 + 2 * (1 - e) * e * cx + e * e * player.x;
      s.y = (1 - e) * (1 - e) * s.y0 + 2 * (1 - e) * e * cy + e * e * player.y;
      s.tr.push([s.x, s.y]); if (s.tr.length > 22) s.tr.shift();
      if (q >= 1) { shards.splice(i, 1); onShardArrive(s.pi); }
    }
    for (i = bursts.length - 1; i >= 0; i--) { bursts[i].t += dt; if (bursts[i].t > 1.6) bursts.splice(i, 1); }
    glowBoost = Math.max(0, glowBoost - dt * 0.35);

    if (inc) inc.update(dt);
    if (finale) finale.update(dt);
    if (restartArmed && T > restartArmed) { restartArmed = 0; ui.restart.classList.remove("is-armed"); }
  }

  /* ---------- rendu ---------- */
  function skyColors() {
    var s = [BASE_SKY[0], BASE_SKY[1], BASE_SKY[2]];
    for (var i = 0; i < PLANETS.length; i++) {
      var w = Math.pow(prox[i], 2) * 0.72;
      if (w > 0.002) for (var j = 0; j < 3; j++) s[j] = U.mix(s[j], PLANETS[i].sky[j], w);
    }
    if (mode === "finale") {
      var f = U.smooth(1, 6, finale ? finale.T : 0);
      s = [U.mix(s[0], [60, 30, 90], f), U.mix(s[1], [190, 120, 150], f), U.mix(s[2], [255, 220, 150], f)];
    }
    return s;
  }

  /* aurores qui respirent (mêmes nappes, teintes et périodes que le site) ; figées si mouvement réduit.
     Elles s'effacent un peu près d'une planète pour laisser son ciel propre s'exprimer. */
  function drawAurora(b) {
    if (!AURORA.length) return;
    if (!auroraSprites) auroraSprites = AURORA.map(function (a) {
      var n = 64, c = U.canvas(n, n), g = c.getContext("2d"), gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
      gr.addColorStop(0, "rgba(" + a[4] + ",1)"); gr.addColorStop(0.35, "rgba(" + a[4] + ",0.72)");
      gr.addColorStop(0.7, "rgba(" + a[4] + ",0.22)"); gr.addColorStop(1, "rgba(" + a[4] + ",0)");
      g.fillStyle = gr; g.fillRect(0, 0, n, n);
      return c;
    });
    var t = EL.reduced ? 0 : T, near = Math.max.apply(null, prox), fade = 1 - 0.45 * near * near;
    for (var i = 0; i < AURORA.length; i++) {
      var a = AURORA[i], ph = (t / a[6]) * TAU + i * 1.7;
      var cx = (a[0] + Math.sin(ph) * a[7]) * W, cy = (a[1] + Math.cos(ph * 0.8) * a[7] * 0.6) * H;
      var sc = 1 + Math.sin(ph * 0.5) * 0.05, rx = a[2] * W * sc, ry = a[3] * H * sc;
      b.globalAlpha = fade * a[5] * (1 - a[8] / 2 + (a[8] / 2) * Math.sin(ph + 0.6));
      b.drawImage(auroraSprites[i], cx - rx, cy - ry, rx * 2, ry * 2);
    }
    b.globalAlpha = 1;
  }

  /* ciel + nébuleuses : rendus en basse résolution (doux par nature) puis agrandis — économise le remplissage */
  var bgCv = null;
  function drawBackground() {
    var s = skyColors(), BS = 0.25;
    var bw = Math.max(2, Math.ceil(W * BS)), bh = Math.max(2, Math.ceil(H * BS));
    if (!bgCv || bgCv.width !== bw || bgCv.height !== bh) bgCv = U.canvas(bw, bh);
    var b = bgCv.getContext("2d");
    b.setTransform(BS, 0, 0, BS, 0, 0);
    /* espace profond : les teintes du ciel sont assombries vers le noir bleuté, l'horizon reste chaud et discret */
    var space = [6, 6, 16];
    var g = b.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, U.rgba(U.mix(s[0], space, 0.72), 1));
    g.addColorStop(0.58, U.rgba(U.mix(s[1], space, 0.6), 1));
    g.addColorStop(1, U.rgba(U.mix(s[2], space, 0.45), 1));
    b.fillStyle = g;
    b.fillRect(0, 0, W, H);
    b.globalCompositeOperation = "lighter";
    var i, k, n;
    drawAurora(b);
    for (i = 0; i < nebulae.length; i++) {
      n = nebulae[i];
      var nx = (((n.x - cam.x * ZOOM * 0.06) % (W * 2)) + W * 2) % (W * 2) - W * 0.5;
      var ny = (((n.y - cam.y * ZOOM * 0.06) % (H * 2)) + H * 2) % (H * 2) - H * 0.5;
      EL.drawGlow(b, n.c, nx, ny, n.rr, n.a, true);
    }
    b.globalCompositeOperation = "source-over";
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(bgCv, 0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    var red = EL.reduced;
    for (k = 0; k < stars.length; k++) {
      var st = stars[k];
      var x = (((st.x - cam.x * ZOOM * st.d) % W) + W) % W, y = (((st.y - cam.y * ZOOM * st.d) % H) + H) % H;
      var a = red ? 0.7 : 0.45 + 0.45 * Math.sin(T * st.sp + st.ph);
      a *= 1 - 0.55 * (y / H);
      if (st.s > 1.4) EL.drawGlow(ctx, st.c, x, y, st.s * 4, a * 0.5);
      ctx.fillStyle = U.rgba(st.c, a);
      ctx.fillRect(x - st.s / 2, y - st.s / 2, st.s, st.s);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function planetScreen(p, i) {
    var sc = toScreen(p.x, p.y), R = p.r * cam.z * (1 + 0.2 * prox[i] * prox[i]);
    return [sc[0], sc[1], R];
  }

  function drawWorld() {
    var i, p, ps;
    for (i = 0; i < PLANETS.length; i++) {
      p = PLANETS[i]; ps = planetScreen(p, i);
      var ext = ps[2] * (p.style === "radiant" ? 4 : 3);
      if (ps[0] + ext < 0 || ps[0] - ext > W || ps[1] + ext < 0 || ps[1] - ext > H) continue;
      EL.Planets.draw(ctx, p, ps[0], ps[1], ps[2], T, prox[i], EL.reduced);
      if ((mode === "space" || mode === "start") && !inc) {
        var la = U.smooth(0.08, 0.45, prox[i]) * (mode === "start" ? 0.7 : 1);
        if (la > 0.02) {
          var name = EL.pt(i).name + (state.done.indexOf(i) >= 0 ? "  ✦" : "");
          ctx.font = "600 " + Math.round(U.clamp(W / 28, 13, 17)) + "px " + FONT;
          ctx.textAlign = "center";
          ctx.fillStyle = "rgba(255,248,240," + (0.9 * la).toFixed(3) + ")";
          ctx.shadowColor = "rgba(20,8,40,0.8)"; ctx.shadowBlur = 8;
          ctx.fillText(name, ps[0], ps[1] + ps[2] * (p.style === "pearl" ? 1.55 : 1.3) + 18);
          ctx.shadowBlur = 0;
        }
      }
    }
    drawShards();
    var b = toScreen(player.x, player.y);
    drawBeing(b[0], b[1], Math.max(0.9, cam.z * 1.15) * (mode === "finale" ? 1.25 : 1));
  }

  function drawShards() {
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < shards.length; i++) {
      var s = shards[i], c = PLANETS[s.pi].ring;
      for (var k = 0; k < s.tr.length; k++) {
        var tp = toScreen(s.tr[k][0], s.tr[k][1]);
        EL.drawGlow(ctx, c, tp[0], tp[1], 6 + k * 0.6, (k / s.tr.length) * 0.5);
      }
      var sp = toScreen(s.x, s.y);
      EL.drawGlow(ctx, c, sp[0], sp[1], 34, 0.9);
      EL.drawGlow(ctx, [255, 255, 255], sp[0], sp[1], 12, 1);
    }
    for (i = 0; i < bursts.length; i++) {
      var bu = bursts[i], q = bu.t / 1.6, bp = toScreen(player.x, player.y);
      ctx.strokeStyle = U.rgba(bu.c, 0.8 * (1 - q)); ctx.lineWidth = 3 * (1 - q) + 0.5;
      ctx.beginPath(); ctx.arc(bp[0], bp[1], 20 + U.easeOut(q) * 160, 0, TAU); ctx.stroke();
      for (var j = 0; j < 14; j++) {
        var an = (j / 14) * TAU + bu.t * 0.3, rr = 10 + U.easeOut(q) * 120;
        EL.drawGlow(ctx, bu.c, bp[0] + Math.cos(an) * rr, bp[1] + Math.sin(an) * rr, 8, 0.8 * (1 - q));
      }
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function drawBeing(x, y, s) {
    var n = state.done.length, bright = 1 + 0.2 * n + glowBoost * 0.8, red = EL.reduced, k;
    var bob = red ? 0 : Math.sin(T * 1.6) * 3 * s;
    y += mode === "space" ? 0 : bob;
    ctx.globalCompositeOperation = "lighter";
    for (k = 0; k < trail.length; k++) {
      var tp = toScreen(trail[k].x, trail[k].y), a = (k / trail.length) * 0.35;
      EL.drawGlow(ctx, [255, 226, 190], tp[0], tp[1], (5 + k * 0.5) * s, a);
    }
    EL.drawGlow(ctx, [255, 200, 150], x, y, 78 * s * bright, 0.3, true);
    var last = n ? PLANETS[state.done[n - 1]].ring : [255, 220, 255];
    EL.drawGlow(ctx, last, x, y, 46 * s * bright, 0.28 + 0.2 * glowBoost);
    EL.drawGlow(ctx, [255, 244, 228], x, y, 28 * s * bright, 0.75);
    /* anneaux reçus */
    for (k = 0; k < n; k++) {
      var c = PLANETS[state.done[k]].ring, rx = (24 + k * 8) * s, ry = rx * 0.34;
      var rot = k * 0.63 + (red ? 0 : T * 0.13 * (k % 2 ? 1 : -1));
      ctx.lineWidth = 6 * s; ctx.strokeStyle = U.rgba(c, 0.16);
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
      ctx.lineWidth = 2.2 * s; ctx.strokeStyle = U.rgba(c, 0.95);
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.stroke();
      ctx.globalCompositeOperation = "lighter";
      var ma = (red ? 0 : T * (0.9 + k * 0.15)) + k;
      var mx = Math.cos(ma) * rx, my = Math.sin(ma) * ry;
      EL.drawGlow(ctx, c, x + mx * Math.cos(rot) - my * Math.sin(rot), y + mx * Math.sin(rot) + my * Math.cos(rot), 7 * s, 0.9);
    }
    /* étincelles en orbite */
    for (k = 0; k < 3; k++) {
      var aa = T * (1.2 + k * 0.4) + k * 2.1, r2 = (16 + k * 5) * s;
      EL.drawGlow(ctx, [255, 240, 220], x + Math.cos(aa) * r2, y + Math.sin(aa) * r2 * 0.6, 4 * s, red ? 0.4 : 0.55 + 0.3 * Math.sin(T * 3 + k));
    }
    var g = ctx.createRadialGradient(x, y - 2 * s, 0, x, y, 11 * s * Math.sqrt(bright));
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.5, "rgba(255,246,226,0.9)");
    g.addColorStop(1, "rgba(255,220,180,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, 11 * s * Math.sqrt(bright), 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }

  /* flèches lumineuses au bord de l'écran vers les planètes non visitées */
  function drawEdgeHints() {
    if (mode !== "space" || inc) return;
    var cardH = ui.card.classList.contains("is-on") ? ui.card.offsetHeight + 24 : 0;
    var L = 30, R = W - 30, Tp = 92, B = H - Math.max(36, cardH);
    var cx = W / 2, cy = H / 2;
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < PLANETS.length; i++) {
      if (state.done.indexOf(i) >= 0) continue;
      var p = PLANETS[i], ps = planetScreen(p, i);
      if (ps[0] > -ps[2] * 0.75 && ps[0] < W + ps[2] * 0.75 && ps[1] > -ps[2] * 0.75 && ps[1] < H + ps[2] * 0.75) continue;
      var dx = ps[0] - cx, dy = ps[1] - cy, tx = 1e9, ty = 1e9;
      if (dx > 0) tx = (R - cx) / dx; else if (dx < 0) tx = (L - cx) / dx;
      if (dy > 0) ty = (B - cy) / dy; else if (dy < 0) ty = (Tp - cy) / dy;
      var t = Math.min(tx, ty), hx = cx + dx * t, hy = cy + dy * t, ang = Math.atan2(dy, dx);
      var dist = Math.hypot(player.x - p.x, player.y - p.y);
      var pulse = EL.reduced ? 0.8 : 0.6 + 0.4 * Math.sin(T * 2.2 + i);
      var a = (0.55 + 0.45 * (1 - U.smooth(600, 3500, dist))) * pulse, covered = false;
      /* discret s'il tombe sur une autre planète visible */
      for (var j = 0; j < PLANETS.length; j++) {
        if (j === i) continue;
        var qs = planetScreen(PLANETS[j], j);
        if (Math.hypot(hx - qs[0], hy - qs[1]) < qs[2] * 1.15) { covered = true; break; }
      }
      if (covered) a *= 0.3;
      EL.drawGlow(ctx, p.pal.glow, hx, hy, 26, a * 0.8);
      ctx.save();
      ctx.translate(hx, hy); ctx.rotate(ang);
      ctx.fillStyle = U.rgba(p.ring, a);
      ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(-4, -7); ctx.lineTo(-1, 0); ctx.lineTo(-4, 7); ctx.closePath(); ctx.fill();
      ctx.restore();
      if (W >= 700 && !covered) {
        ctx.font = "500 12px " + FONT;
        ctx.textAlign = hx > cx + 10 ? "right" : hx < cx - 10 ? "left" : "center";
        ctx.fillStyle = "rgba(255,248,240," + (a * 0.85).toFixed(3) + ")";
        var ox = ctx.textAlign === "right" ? -18 : ctx.textAlign === "left" ? 18 : 0;
        ctx.fillText(EL.pt(i).name, hx + ox, hy + (hy > cy ? -16 : 24));
      }
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var spaceOn = !inc || inc.spaceView().active;
    if (spaceOn) {
      drawBackground();
      drawWorld();
      drawEdgeHints();
    }
    if (inc) inc.draw(ctx, W, H);
    if (finale && mode === "finale") {
      var b = toScreen(player.x, player.y);
      finale.drawOverlay(ctx, W, H, b[0], b[1]);
    }
  }

  function loop(ts) {
    var dt = last ? Math.min(0.1, (ts - last) / 1000) : 0.016;
    last = ts;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  /* ---------- carte de planète ---------- */
  function showCard(i) {
    if (i < 0) { ui.card.classList.remove("is-on"); ui.card.setAttribute("aria-hidden", "true"); return; }
    var t = EL.pt(i), p = PLANETS[i];
    ui.cardName.textContent = t.name;
    ui.cardLine.textContent = t.line;
    ui.cardVisited.hidden = state.done.indexOf(i) < 0;
    ui.card.style.setProperty("--pc", U.rgba(p.ring, 1));
    ui.card.style.setProperty("--pg", U.rgba(p.pal.glow, 0.35));
    ui.card.classList.add("is-on");
    ui.card.setAttribute("aria-hidden", "false");
    EL.Audio.ping(81 + i * 2);
  }

  /* ---------- incarnation ---------- */
  function startIncarnation(i) {
    if (inc) return;
    mode = "incarnation";
    target = null; pointerDown = false;
    showCard(-1); nearIdx = -1;
    ui.hint.classList.remove("is-on");
    document.body.classList.add("is-incarnated");
    ui.inc.hidden = false;
    requestAnimationFrame(function () { ui.inc.classList.add("is-on"); });
    inc = new EL.Incarnation(i, { ui: ui.incUi, w: W, h: H, dpr: DPR, audio: EL.Audio.started, onExit: endIncarnation });
    if (!EL.Audio.started) { needTapForSound = true; toast(EL.t("tapSound"), 4000); }
  }

  function endIncarnation(success) {
    var i = inc ? inc.i : -1;
    inc = null;
    mode = "space";
    ui.inc.classList.remove("is-on");
    ui.inc.hidden = true;
    document.body.classList.remove("is-incarnated");
    EL.Audio.unfocus();
    if (success && i >= 0) {
      var p = PLANETS[i], dx = player.x - p.x, dy = player.y - p.y, d = Math.hypot(dx, dy) || 1;
      shards.push({ pi: i, t: 0, dur: 1.7, x0: p.x + (dx / d) * p.r, y0: p.y + (dy / d) * p.r, x: p.x, y: p.y, nx: -dy / d * 140, ny: dx / d * 140, tr: [] });
    }
  }

  function onShardArrive(i) {
    var isNew = state.done.indexOf(i) < 0;
    if (isNew) { state.done.push(i); EL.store.save(state); }
    glowBoost = isNew ? 1 : 0.5;
    bursts.push({ t: 0, c: PLANETS[i].ring });
    EL.Audio.chime();
    EL.vibrate([20, 60, 20]);
    updateProgress();
    if (nearIdx === i) ui.cardVisited.hidden = false;
    toast(isNew ? EL.t("ringGained", { p: EL.pt(i).name }) : EL.t("gift"));
    if (isNew && state.done.length === 5) setTimeout(function () { if (mode === "space") startFinale(); }, 2800);
  }

  /* ---------- finale ---------- */
  function startFinale() {
    if (finale || inc) return;
    mode = "finale";
    showCard(-1); nearIdx = -1;
    target = null;
    state.finaleSeen = true;
    if (demo !== "finale") EL.store.save(state);
    document.body.classList.add("is-finale");
    finale = new EL.Finale({ ui: ui.finale, onClose: function () {} });
  }
  function closeFinale() {
    if (!finale) return;
    finale.close();
    finale = null;
    mode = "space";
    document.body.classList.remove("is-finale");
  }

  /* ---------- recommencer ---------- */
  function restart() {
    if (!restartArmed) {
      restartArmed = T + 3.2;
      ui.restart.classList.add("is-armed");
      toast(EL.t("restartConfirm"), 3000);
      return;
    }
    restartArmed = 0; ui.restart.classList.remove("is-armed");
    if (finale) closeFinale();
    if (inc) { inc = null; ui.inc.classList.remove("is-on"); ui.inc.hidden = true; document.body.classList.remove("is-incarnated"); EL.Audio.unfocus(); if (EL.stopDiscoverySong) EL.stopDiscoverySong(true); }
    state = { done: [], finaleSeen: false };
    EL.store.clear();
    shards = []; bursts = []; trail = [];
    player.x = 0; player.y = 60; player.vx = player.vy = 0; target = null;
    if (mode !== "start") mode = "space";
    updateProgress();
    applyI18n();
    toast(EL.t("restarted"));
  }

  /* ---------- démarrage ---------- */
  function begin() {
    EL.Audio.start();
    mode = "space";
    ui.start.classList.add("is-off");
    setTimeout(function () { ui.start.hidden = true; }, 900);
    ui.hint.classList.add("is-on");
    setTimeout(function () { ui.hint.classList.remove("is-on"); }, 9000);
    EL.Audio.ping(86);
  }

  /* ---------- entrées ---------- */
  var pointerScreen = null;
  function setTargetFromEvent(e) {
    pointerScreen = [e.clientX, e.clientY];
    var w = toWorld(e.clientX, e.clientY);
    target = { x: w[0], y: w[1] };
  }
  canvas.addEventListener("pointerdown", function (e) {
    if (needTapForSound) { needTapForSound = false; soundFromTap(); }
    if (mode !== "space") return;
    pointerDown = true;
    setTargetFromEvent(e);
    try { canvas.setPointerCapture(e.pointerId); } catch (er) {}
  });
  canvas.addEventListener("pointermove", function (e) { if (pointerDown && mode === "space") setTargetFromEvent(e); });
  function up() { pointerDown = false; }
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  document.addEventListener("pointerdown", function (e) {
    if (needTapForSound && e.target !== canvas) { needTapForSound = false; soundFromTap(); }
  });

  function soundFromTap() {
    EL.Audio.start();
    if (inc) {
      inc.audioOn = true;
      EL.Audio.focus(inc.i);
      if (inc.phase === "breathing") EL.Audio.breathe(inc.half % 2 === 0, 5 - ((inc.pt % 5)));
    }
  }

  var KEYMAP = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", a: "left", d: "right", w: "up", s: "down", q: "left", z: "up" };
  window.addEventListener("keydown", function (e) {
    var k = KEYMAP[e.key] || KEYMAP[(e.key || "").toLowerCase()];
    if (k && mode === "space" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      keys[k] = true; e.preventDefault();
      if (needTapForSound) { needTapForSound = false; soundFromTap(); }
      return;
    }
    if (e.key === "Escape") {
      if (inc) inc.leave();
      else if (finale) closeFinale();
    }
    if (e.key === "Enter" && mode === "space" && nearIdx >= 0 && document.activeElement === document.body) startIncarnation(nearIdx);
  });
  window.addEventListener("keyup", function (e) {
    var k = KEYMAP[e.key] || KEYMAP[(e.key || "").toLowerCase()];
    if (k) keys[k] = false;
  });
  window.addEventListener("blur", function () { keys = {}; pointerDown = false; });

  ui.startBtn.addEventListener("click", begin);
  ui.incarnate.addEventListener("click", function () { if (nearIdx >= 0) startIncarnation(nearIdx); });
  ui.incUi.leave.addEventListener("click", function () { if (inc) inc.leave(); });
  ui.mute.addEventListener("click", function () {
    EL.Audio.setMuted(!EL.Audio.muted);
    if (finale) finale.setMuted(EL.Audio.muted);
    if (EL.setDiscoveryMuted) EL.setDiscoveryMuted(EL.Audio.muted);
    updateMuteBtn();
  });
  ui.restart.addEventListener("click", restart);
  ui.finaleBtn.addEventListener("click", function () { if (mode === "space") startFinale(); });
  ui.finaleClose.addEventListener("click", closeFinale);
  ui.finaleRestart.addEventListener("click", function () { restartArmed = T + 3; restart(); });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) EL.Audio.suspend(); else EL.Audio.resume();
  });
  var rzPending = false;
  window.addEventListener("resize", function () {
    if (rzPending) return;
    rzPending = true;
    requestAnimationFrame(function () { rzPending = false; resize(); });
  });

  /* ---------- init ---------- */
  EL.Planets.init();
  FONT = getComputedStyle(document.body).fontFamily || FONT;
  applyI18n();
  updateProgress();
  updateMuteBtn();
  var langBtn = document.getElementById("el-lang");
  if (langBtn) langBtn.addEventListener("click", function () {
    EL.lang = EL.lang === "en" ? "fr" : "en";
    try { localStorage.setItem("eden-lang", EL.lang); } catch (e) {}
    try {
      var u = new URL(location.href);
      if (u.searchParams.has("lang")) { u.searchParams.set("lang", EL.lang); history.replaceState(null, "", u); }
    } catch (e) {}
    applyI18n(); updateProgress(); updateMuteBtn();
  });
  resize();
  camBase.x = U.lerp(player.x, PLANETS[0].x, 0.45); camBase.y = U.lerp(player.y, PLANETS[0].y, 0.45);
  cam.x = camBase.x; cam.y = camBase.y; cam.z = ZOOM;

  if (demo === "incarnation") {
    var di = U.clamp(parseInt(EL.params.get("planet") || "1", 10) - 1 || 0, 0, 4);
    var dp = PLANETS[di];
    player.x = dp.x - dp.r - 140; player.y = dp.y + 40;
    camBase.x = player.x; camBase.y = player.y;
    ui.start.hidden = true;
    mode = "space";
    startIncarnation(di);
  } else if (demo === "finale") {
    ui.start.hidden = true;
    mode = "space";
    if (state.done.length < 5) state.done = [0, 1, 2, 3, 4];
    updateProgress();
    camBase.x = player.x; camBase.y = player.y;
    needTapForSound = true;
    startFinale();
  } else {
    ui.start.hidden = false;
    requestAnimationFrame(function () { ui.start.classList.add("is-on"); });
  }
  document.body.classList.add("is-ready");
  requestAnimationFrame(loop);
})();
