/* Eden Yours — Éclats de rire : sourires de lumière, rires soft (Web Audio), combos doux. */
(function () {
  "use strict";

  var GOAL = 8;
  var ROUNDS = 3;
  var COMBO_WINDOW_MS = 1600;
  var VICTORY_PLAY_S = 18;
  var GAME_ID = "eclats";

  /* Manches : un peu plus vives, jamais agressives */
  var ROUND_CFG = [
    { duration: 55, spawnMs: 1100, maxBeings: 4, speed: 0.55, size: 1 },
    { duration: 50, spawnMs: 900, maxBeings: 5, speed: 0.75, size: 0.95 },
    { duration: 45, spawnMs: 720, maxBeings: 6, speed: 0.95, size: 0.9 }
  ];

  var LAST_VICTORY_KEY = "eden-eclats-last-victory";

  var audioCtx = null;
  var beings = [];
  var sparks = [];
  var waves = [];
  var state = "idle"; /* idle | playing | won | lost | session */
  var round = 0;
  var eclats = 0;
  var combo = 0;
  var bestCombo = 0;
  var lastTap = 0;
  var timeLeft = 0;
  var lastTs = 0;
  var spawnAcc = 0;
  var raf = 0;
  var tracksCache = null;
  var sessionStars = 0;
  var reduced = false;
  var lastVictoryId = (function () {
    try { return sessionStorage.getItem(LAST_VICTORY_KEY); } catch (e) { return null; }
  })();


  var $ = function (id) { return document.getElementById(id); };
  var canvas = $("edr-canvas");
  var ctx = canvas ? canvas.getContext("2d") : null;
  var overlay = $("edr-overlay");
  var overlayKicker = $("edr-overlay-kicker");
  var overlayTitle = $("edr-overlay-title");
  var overlayText = $("edr-overlay-text");
  var startBtn = $("edr-start");
  var nextBtn = $("edr-next");
  var againBtn = $("edr-again");
  var roundEl = $("edr-round");
  var scoreEl = $("edr-score");
  var timerEl = $("edr-timer");
  var comboEl = $("edr-combo");
  var meterEl = $("edr-meter");
  var hintEl = $("edr-hint");
  var starsBox = $("edr-stars");
  var playerBox = $("edr-player");
  var nowPlaying = $("edr-now-playing");
  var audio = $("edr-audio");
  var stage = $("edr-stage");

  function t(key, vars) {
    return window.EdenI18n && window.EdenI18n.t ? window.EdenI18n.t(key, vars) : key;
  }

  function siteLang() {
    try {
      if (window.EdenI18n && window.EdenI18n.getLang) return window.EdenI18n.getLang();
      var stored = localStorage.getItem("eden-lang");
      if (stored === "en" || stored === "fr") return stored;
    } catch (e) {}
    var q = new URLSearchParams(location.search).get("lang");
    return q === "en" ? "en" : "fr";
  }

  function reducedMotion() {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
  }

  function ctxAudio() {
    try {
      if (!audioCtx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        audioCtx = new AC();
      }
      if (audioCtx.state === "suspended" && audioCtx.resume) audioCtx.resume();
      return audioCtx;
    } catch (e) { return null; }
  }

  /* ——— Rires soft (synth) ——— */
  function giggleNote(c, out, freq, start, peak, len, type) {
    var o = c.createOscillator();
    var g = c.createGain();
    var f = c.createBiquadFilter();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, start);
    o.frequency.exponentialRampToValueAtTime(freq * 1.08, start + len * 0.4);
    o.frequency.exponentialRampToValueAtTime(freq * 0.92, start + len);
    f.type = "lowpass";
    f.frequency.value = 3200;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + len);
    o.connect(f); f.connect(g); g.connect(out);
    o.start(start); o.stop(start + len + 0.05);
  }

  function playLaugh(level) {
    try {
      var c = ctxAudio();
      if (!c) return;
      var now = c.currentTime + 0.01;
      var master = c.createGain();
      master.gain.value = 0.22;
      master.connect(c.destination);
      var n = Math.min(6, 2 + (level | 0));
      var base = 420 + Math.min(level, 5) * 40;
      for (var i = 0; i < n; i++) {
        var f = base * Math.pow(1.12, i) + (Math.random() * 18 - 9);
        var t0 = now + i * (0.055 + Math.random() * 0.02);
        giggleNote(c, master, f, t0, 0.18 - i * 0.015, 0.14 + Math.random() * 0.06, i % 2 ? "triangle" : "sine");
        if (level >= 3 && i > 1) {
          giggleNote(c, master, f * 1.5, t0 + 0.02, 0.06, 0.1, "sine");
        }
      }
      if (level >= 4) {
        /* petit accord de joie */
        [523.25, 659.25, 783.99].forEach(function (fq, k) {
          giggleNote(c, master, fq, now + 0.22 + k * 0.04, 0.1, 0.45, "sine");
        });
      }
    } catch (e) {}
  }

  function softResetChime() {
    try {
      var c = ctxAudio();
      if (!c) return;
      var now = c.currentTime + 0.01;
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.06, now + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
      g.connect(c.destination);
      var o = c.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(392, now);
      o.frequency.exponentialRampToValueAtTime(330, now + 0.45);
      o.connect(g);
      o.start(now); o.stop(now + 0.55);
    } catch (e) {}
  }

  /* ——— Canvas helpers ——— */
  function resizeCanvas() {
    if (!canvas || !stage) return;
    var rect = stage.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(280, Math.floor(rect.width));
    var h = Math.max(260, Math.min(Math.floor(w * 0.58), Math.floor(window.innerHeight * 0.48)));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function cssSize() {
    return {
      w: canvas ? canvas.clientWidth : 720,
      h: canvas ? canvas.clientHeight : 420
    };
  }

  function spawnBeing(cfg) {
    var sz = cssSize();
    var r = (36 + Math.random() * 18) * (cfg.size || 1);
    var margin = r + 8;
    beings.push({
      x: margin + Math.random() * (sz.w - margin * 2),
      y: margin + Math.random() * (sz.h - margin * 2),
      r: r,
      vx: (Math.random() - 0.5) * cfg.speed,
      vy: (Math.random() - 0.5) * cfg.speed,
      hue: 40 + Math.random() * 50, /* or → violet soft */
      phase: Math.random() * Math.PI * 2,
      smile: 0.6 + Math.random() * 0.4,
      life: 1,
      pulse: Math.random() * Math.PI * 2
    });
  }

  function burstAt(x, y, strength) {
    var n = reduced ? 6 : 10 + strength * 4;
    for (var i = 0; i < n; i++) {
      var a = (Math.PI * 2 * i) / n + Math.random() * 0.2;
      var sp = 1.2 + Math.random() * (1.5 + strength * 0.4);
      sparks.push({
        x: x, y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - (reduced ? 0 : 0.4),
        life: 1,
        decay: 0.018 + Math.random() * 0.012,
        gold: Math.random() > 0.35
      });
    }
    waves.push({ x: x, y: y, r: 8, life: 1, max: 50 + strength * 18 });
  }

  function drawBeing(b, tNow) {
    var breathe = reduced ? 1 : 1 + Math.sin(tNow * 0.003 + b.pulse) * 0.06;
    var R = b.r * breathe * b.life;
    var g = ctx.createRadialGradient(b.x - R * 0.25, b.y - R * 0.3, R * 0.1, b.x, b.y, R * 1.35);
    g.addColorStop(0, "rgba(255,248,230," + (0.95 * b.life) + ")");
    g.addColorStop(0.45, "hsla(" + b.hue + ",85%,70%," + (0.55 * b.life) + ")");
    g.addColorStop(1, "hsla(" + (b.hue + 40) + ",70%,55%,0)");
    ctx.beginPath();
    ctx.fillStyle = g;
    ctx.arc(b.x, b.y, R * 1.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = "rgba(255,250,240," + (0.92 * b.life) + ")";
    ctx.arc(b.x, b.y, R * 0.72, 0, Math.PI * 2);
    ctx.fill();

    /* yeux doux */
    var eyeY = b.y - R * 0.12;
    var eyeX = R * 0.22;
    ctx.fillStyle = "rgba(55,30,90," + (0.55 * b.life) + ")";
    ctx.beginPath();
    ctx.ellipse(b.x - eyeX, eyeY, R * 0.08, R * 0.1, 0, 0, Math.PI * 2);
    ctx.ellipse(b.x + eyeX, eyeY, R * 0.08, R * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();

    /* sourire */
    ctx.strokeStyle = "rgba(55,30,90," + (0.5 * b.life) + ")";
    ctx.lineWidth = Math.max(1.5, R * 0.06);
    ctx.lineCap = "round";
    ctx.beginPath();
    var smileW = R * 0.28 * b.smile;
    var smileY = b.y + R * 0.18;
    ctx.moveTo(b.x - smileW, smileY);
    ctx.quadraticCurveTo(b.x, smileY + R * 0.22 * b.smile, b.x + smileW, smileY);
    ctx.stroke();
  }

  function drawFrame(ts) {
    if (!ctx || !canvas) return;
    var sz = cssSize();
    ctx.clearRect(0, 0, sz.w, sz.h);

    /* fond doux */
    var bg = ctx.createRadialGradient(sz.w * 0.5, sz.h * 0.45, 20, sz.w * 0.5, sz.h * 0.5, sz.w * 0.7);
    bg.addColorStop(0, "rgba(60,35,100,0.35)");
    bg.addColorStop(1, "rgba(10,5,24,0)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, sz.w, sz.h);

    var i;
    for (i = 0; i < waves.length; i++) {
      var w = waves[i];
      ctx.beginPath();
      ctx.strokeStyle = "rgba(246,201,106," + (w.life * 0.45) + ")";
      ctx.lineWidth = 2;
      ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (i = 0; i < beings.length; i++) drawBeing(beings[i], ts);

    for (i = 0; i < sparks.length; i++) {
      var s = sparks[i];
      ctx.beginPath();
      ctx.fillStyle = s.gold
        ? "rgba(253,230,138," + s.life + ")"
        : "rgba(233,196,255," + s.life + ")";
      ctx.arc(s.x, s.y, 2 + s.life * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function update(dt, ts) {
    var cfg = ROUND_CFG[Math.min(round, ROUND_CFG.length - 1)];
    var sz = cssSize();
    var i;

    if (state === "playing") {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        endRound(false);
        return;
      }

      spawnAcc += dt * 1000;
      while (spawnAcc >= cfg.spawnMs && beings.length < cfg.maxBeings) {
        spawnAcc -= cfg.spawnMs;
        spawnBeing(cfg);
      }

      /* combo soft reset */
      if (combo > 0 && lastTap && (performance.now() - lastTap) > COMBO_WINDOW_MS) {
        combo = 0;
        softResetChime();
        updateComboUi();
      }

      for (i = beings.length - 1; i >= 0; i--) {
        var b = beings[i];
        if (!reduced) {
          b.x += b.vx * dt * 60;
          b.y += b.vy * dt * 60;
          b.phase += dt;
          b.vx += Math.sin(b.phase * 0.7) * 0.01;
          b.vy += Math.cos(b.phase * 0.5) * 0.01;
        }
        if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); }
        if (b.x > sz.w - b.r) { b.x = sz.w - b.r; b.vx = -Math.abs(b.vx); }
        if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); }
        if (b.y > sz.h - b.r) { b.y = sz.h - b.r; b.vy = -Math.abs(b.vy); }
        if (b.life < 1) {
          b.life -= dt * 2.2;
          if (b.life <= 0) beings.splice(i, 1);
        }
      }
    }

    for (i = sparks.length - 1; i >= 0; i--) {
      var s = sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      if (!reduced) s.vy -= 0.03;
      s.life -= s.decay;
      if (s.life <= 0) sparks.splice(i, 1);
    }

    for (i = waves.length - 1; i >= 0; i--) {
      var w = waves[i];
      w.r += reduced ? 1.2 : 2.2;
      w.life -= 0.03;
      if (w.life <= 0 || w.r > w.max) waves.splice(i, 1);
    }

    drawFrame(ts);
    updateHud();
  }

  function loop(ts) {
    if (!lastTs) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    update(dt, ts);
    raf = requestAnimationFrame(loop);
  }

  function pointerPos(e) {
    var rect = canvas.getBoundingClientRect();
    var src = e.touches && e.touches[0] ? e.touches[0] : e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : e;
    return {
      x: (src.clientX - rect.left) * (canvas.clientWidth / rect.width),
      y: (src.clientY - rect.top) * (canvas.clientHeight / rect.height)
    };
  }

  function hitTest(x, y) {
    var best = -1;
    var bestD = Infinity;
    for (var i = 0; i < beings.length; i++) {
      var b = beings[i];
      if (b.life < 1) continue;
      var dx = b.x - x, dy = b.y - y;
      var d = Math.sqrt(dx * dx + dy * dy);
      var hitR = b.r * 1.15; /* grosse zone tactile */
      if (d <= hitR && d < bestD) { best = i; bestD = d; }
    }
    return best;
  }

  function onTap(e) {
    if (state !== "playing") return;
    if (e.cancelable) e.preventDefault();
    ctxAudio();
    var p = pointerPos(e);
    var idx = hitTest(p.x, p.y);
    if (idx < 0) {
      /* tap dans le vide : combo soft reset, pas d'échec dur */
      if (combo > 0) {
        combo = 0;
        softResetChime();
        updateComboUi();
        if (hintEl) hintEl.textContent = t("eclats.hintMiss");
      }
      return;
    }

    var b = beings[idx];
    var now = performance.now();
    if (lastTap && (now - lastTap) <= COMBO_WINDOW_MS) combo += 1;
    else combo = 1;
    lastTap = now;
    if (combo > bestCombo) bestCombo = combo;

    var strength = Math.min(5, combo);
    playLaugh(strength);
    burstAt(b.x, b.y, strength);
    b.life = 0.99; /* fade out */

    eclats += 1;
    updateComboUi();
    updateHud();
    if (hintEl) {
      hintEl.textContent = combo >= 3 ? t("eclats.hintCombo", { n: combo }) : t("eclats.hintTap");
    }

    if (eclats >= GOAL) endRound(true);
  }

  function updateComboUi() {
    if (!comboEl) return;
    if (combo >= 2) comboEl.textContent = t("eclats.combo", { n: combo });
    else comboEl.textContent = "";
  }

  function updateHud() {
    if (scoreEl) scoreEl.textContent = t("eclats.score", { n: eclats, goal: GOAL });
    if (meterEl) meterEl.style.width = Math.min(100, (eclats / GOAL) * 100) + "%";
    if (timerEl && (state === "playing" || timeLeft > 0)) {
      var s = Math.max(0, Math.ceil(timeLeft));
      var m = Math.floor(s / 60);
      var r = s % 60;
      timerEl.textContent = m + ":" + (r < 10 ? "0" : "") + r;
    }
    if (roundEl && state === "playing") {
      roundEl.textContent = t("eclats.round", { n: round + 1, total: ROUNDS });
    }
  }

  function showOverlay(show) {
    if (!overlay) return;
    overlay.classList.toggle("is-hidden", !show);
  }

  function clearVictoryEmbed() {
    var box = $("edr-embed");
    if (!box) return;
    box.innerHTML = "";
    box.hidden = true;
  }

  function stopAudioClip() {
    try {
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        audio.hidden = false;
      }
    } catch (e) {}
    clearVictoryEmbed();
    if (playerBox) playerBox.hidden = true;
  }

  function rememberVictoryId(id) {
    lastVictoryId = id || null;
    try {
      if (lastVictoryId) sessionStorage.setItem(LAST_VICTORY_KEY, lastVictoryId);
      else sessionStorage.removeItem(LAST_VICTORY_KEY);
    } catch (e) {}
  }

  function pickRandom(arr) {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /* Victoire : toute piste de la langue du site (MP3 local ou embed Suno).
     Évite de rejouer la dernière id (sessionStorage) quand d'autres candidats existent. */
  function pickLightTrack(list) {
    if (!list || !list.length) return null;
    var lang = siteLang();
    var pool = [];
    var i, tr;
    for (i = 0; i < list.length; i++) {
      tr = list[i];
      if (!tr.audio && !tr.embed) continue;
      if (tr.lang && tr.lang !== lang) continue;
      pool.push(tr);
    }
    if (!pool.length) return null;
    if (pool.length > 1 && lastVictoryId) {
      var others = pool.filter(function (item) { return item.id !== lastVictoryId; });
      if (others.length) pool = others;
    }
    return pickRandom(pool);
  }

  function showVictoryEmbed(song) {
    var box = $("edr-embed");
    if (!box || !song || !song.embed) return false;
    box.innerHTML = "";
    var frame = document.createElement("iframe");
    frame.src = song.embed;
    frame.width = "100%";
    frame.height = "180";
    frame.setAttribute("frameborder", "0");
    frame.setAttribute("allow", "autoplay; clipboard-write; encrypted-media");
    frame.setAttribute("title", (song.title || "Suno") + " — Suno");
    frame.className = "edr-suno-embed";
    box.appendChild(frame);
    box.hidden = false;
    if (audio) audio.hidden = true;
    return true;
  }

  function playVictoryTrack() {
    var list = tracksCache || [];
    var song = pickLightTrack(list);
    if (!song) return false;
    try {
      stopAudioClip();
      rememberVictoryId(song.id || null);
      if (nowPlaying) nowPlaying.textContent = t("eclats.playing", { title: song.title });
      if (playerBox) playerBox.hidden = false;

      if (song.audio && audio) {
        if (audio) audio.hidden = false;
        audio.src = song.audio;
        audio.currentTime = 0;
        var stopAt = VICTORY_PLAY_S;
        var onTime = function () {
          if (audio.currentTime >= stopAt) {
            audio.pause();
            audio.removeEventListener("timeupdate", onTime);
          }
        };
        audio.addEventListener("timeupdate", onTime);
        var p = audio.play();
        if (p && p.catch) p.catch(function () {});
        return true;
      }

      if (song.embed) return showVictoryEmbed(song);
      return false;
    } catch (e) { return false; }
  }

  function starsForRound(won, timeUsed, cfgDuration, comboBest) {
    if (!won) return 1;
    var leftRatio = 1 - (timeUsed / cfgDuration);
    if (leftRatio >= 0.35 && comboBest >= 4) return 3;
    if (leftRatio >= 0.15 || comboBest >= 3) return 2;
    return 1;
  }

  function endRound(won) {
    state = won ? "won" : "lost";
    beings = [];
    var cfg = ROUND_CFG[Math.min(round, ROUND_CFG.length - 1)];
    var used = cfg.duration - timeLeft;
    var stars = starsForRound(won, used, cfg.duration, bestCombo);
    var rec = window.EdenStars ? window.EdenStars.record(GAME_ID, stars) : { session: stars, best: stars, isNewBest: false };
    sessionStars = rec.session;

    if (window.EdenStars) {
      window.EdenStars.play(stars);
      window.EdenStars.render(starsBox, stars, {
        line: t(won ? ("eclats.star" + stars) : "eclats.starSoft", { n: stars }),
        detail: won ? t("eclats.starDetail", { combo: bestCombo, eclats: eclats }) : t("eclats.starDetailSoft"),
        session: rec
      });
    }

    showOverlay(true);
    if (overlayKicker) overlayKicker.textContent = won ? t("eclats.wonKicker") : t("eclats.softKicker");
    if (overlayTitle) overlayTitle.textContent = won ? t("eclats.wonTitle") : t("eclats.softTitle");
    if (overlayText) {
      overlayText.textContent = won
        ? t("eclats.wonText", { n: round + 1 })
        : t("eclats.softText");
    }

    if (startBtn) startBtn.hidden = true;
    var isLast = round >= ROUNDS - 1;
    if (nextBtn) {
      nextBtn.hidden = !(won && !isLast);
      nextBtn.textContent = t("eclats.next");
    }
    if (againBtn) {
      againBtn.hidden = !(!won || isLast);
      againBtn.textContent = isLast && won ? t("eclats.again") : (won ? t("eclats.again") : t("eclats.retry"));
    }

    if (hintEl) {
      hintEl.textContent = won
        ? (isLast ? t("eclats.hintSession") : t("eclats.hintNext"))
        : t("eclats.hintRetry");
    }

    if (won) {
      playVictoryTrack();
    }

    if (won && isLast) {
      state = "session";
      if (overlayTitle) overlayTitle.textContent = t("eclats.sessionTitle");
      if (overlayText) overlayText.textContent = t("eclats.sessionText", { stars: sessionStars });
    }

    updateHud();
  }

  function beginRound(n) {
    stopAudioClip();
    if (window.EdenStars) window.EdenStars.clear(starsBox);
    round = n;
    eclats = 0;
    combo = 0;
    bestCombo = 0;
    lastTap = 0;
    beings = [];
    sparks = [];
    waves = [];
    spawnAcc = 0;
    var cfg = ROUND_CFG[Math.min(round, ROUND_CFG.length - 1)];
    timeLeft = cfg.duration;
    state = "playing";
    showOverlay(false);
    if (startBtn) startBtn.hidden = true;
    if (nextBtn) nextBtn.hidden = true;
    if (againBtn) againBtn.hidden = true;
    if (hintEl) hintEl.textContent = t("eclats.hintPlay");
    updateComboUi();
    updateHud();
    resizeCanvas();
    for (var i = 0; i < Math.min(3, cfg.maxBeings); i++) spawnBeing(cfg);
  }

  function startSession() {
    stopAudioClip();
    ctxAudio();
    if (window.EdenStars) window.EdenStars.unlock && window.EdenStars.unlock();
    beginRound(0);
  }

  function loadTracks() {
    return fetch("tracks.json", { cache: "no-store" })
      .then(function (res) { if (!res.ok) throw new Error("tracks"); return res.json(); })
      .then(function (data) {
        var list = (data && data.tracks) || data || [];
        tracksCache = list.map(function (tr) {
          return {
            id: tr.id,
            title: tr.title,
            lang: tr.lang,
            audio: tr.audio_url || tr.audio || null,
            aac: tr.audio_url_aac || null,
            embed: tr.embed_url || tr.embed || null
          };
        }).filter(function (tr) { return tr.audio || tr.embed; });
      })
      .catch(function () { tracksCache = []; });
  }

  function bind() {
    if (!canvas) return;
    reduced = reducedMotion();
    resizeCanvas();
    window.addEventListener("resize", function () {
      resizeCanvas();
      drawFrame(performance.now());
    });

    var usePointer = window.PointerEvent;
    if (usePointer) {
      canvas.addEventListener("pointerdown", onTap);
    } else {
      canvas.addEventListener("touchstart", onTap, { passive: false });
      canvas.addEventListener("mousedown", onTap);
    }

    if (startBtn) startBtn.addEventListener("click", function () { startSession(); });
    if (nextBtn) nextBtn.addEventListener("click", function () {
      if (round < ROUNDS - 1) beginRound(round + 1);
    });
    if (againBtn) againBtn.addEventListener("click", function () {
      startSession();
    });

    if (window.EdenI18n && window.EdenI18n.onChange) {
      window.EdenI18n.onChange(function () {
        updateHud();
        updateComboUi();
        if (state === "idle" && overlayText) {
          overlayKicker.textContent = t("eclats.welcomeKicker");
          overlayTitle.textContent = t("eclats.welcomeTitle");
          overlayText.textContent = t("eclats.welcomeText");
          if (startBtn) startBtn.textContent = t("eclats.start");
          if (hintEl) hintEl.textContent = t("eclats.hintIdle");
        }
      });
    }

    /* nav mobile toggle (même chrome que quiz) */
    var toggle = document.getElementById("nav-toggle");
    var links = document.getElementById("nav-links");
    if (toggle && links) {
      toggle.addEventListener("click", function () {
        var open = links.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }

    showOverlay(true);
    updateHud();
    if (timerEl) {
      var d0 = ROUND_CFG[0].duration;
      timerEl.textContent = "0:" + (d0 < 10 ? "0" : "") + d0;
    }
    if (scoreEl) scoreEl.textContent = t("eclats.score", { n: 0, goal: GOAL });
    drawFrame(0);
    raf = requestAnimationFrame(loop);
  }

  loadTracks().finally(bind);
})();
