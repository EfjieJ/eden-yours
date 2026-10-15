/* Sentier d’étoiles / Star Path — étoiles le long d’un sentier, battement doux (WebAudio).
   Touche au rythme : l’étoile s’allume et se relie. Sentier complet → chanson EN ENTIER.
   Niveaux de tempo : 72 → 96 → 120 BPM (ou « Plus lent »). */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  var stage = $("se-stage"), cv = $("se-canvas"), cx = cv.getContext("2d"), overlay = $("se-overlay"), startBtn = $("se-start"),
    statusEl = $("se-status"), countEl = $("se-count"), hintEl = $("se-hint"), actions = $("se-actions"), slowBtn = $("se-replay"), resetBtn = $("se-reset"),
    playerBox = $("se-player"), nowEl = $("se-now-playing"), embedBox = $("se-embed"), audio = $("se-audio"), listenBtn = $("se-listen"), card = $("se-card"), emptyBox = $("se-empty");
  var TEMPOS = [72, 96, 120], N_STARS = [5, 7, 9];
  var tracks = [], state = "idle", level = 0, stars = [], next = 0, song = null, ownStarted = false, AC = null, W = 0, H = 0, dpr = 1;
  var beatMs = 0, beatT0 = 0, beatN = 0, tickId = null, trail = [], sparks = [], wins = 0, missGrace = false, softMode = false;
  function t(k, v) { return window.EdenI18n && window.EdenI18n.t ? window.EdenI18n.t(k, v) : k; }
  function siteLang() { return window.EdenSongPick ? window.EdenSongPick.lang() : (document.documentElement.lang === "en" ? "en" : "fr"); }
  function ctxAudio() { try { if (!AC) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AC = new C(); } if (AC.state === "suspended") AC.resume().catch(function () {}); return AC; } catch (e) { return null; } }
  function click() { var c = ctxAudio(); if (!c) return; try { var n = c.currentTime + 0.005, o = c.createOscillator(), g = c.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(660, n); o.frequency.exponentialRampToValueAtTime(220, n + 0.08);
    g.gain.setValueAtTime(0.0001, n); g.gain.exponentialRampToValueAtTime(0.07, n + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, n + 0.12);
    o.connect(g); g.connect(c.destination); o.start(n); o.stop(n + 0.15); } catch (e) {} }
  function chime() { var c = ctxAudio(); if (!c) return; [523.25, 659.25, 783.99].forEach(function (f, i) { setTimeout(function () {
    try { var n = c.currentTime + 0.01, o = c.createOscillator(), g = c.createGain(); o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, n); g.gain.exponentialRampToValueAtTime(0.1, n + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, n + 1.2);
      o.connect(g); g.connect(c.destination); o.start(n); o.stop(n + 1.3); } catch (e) {} }, i * 140); }); }
  /* songs */
  function playable() { var l = siteLang(), list = window.EdenSongPick ? window.EdenSongPick.forLang(tracks, l) : tracks; return list.filter(function (s) { return s.lang === l && (s.audio_url || s.audio_url_aac || s.embed_url); }); }
  var last = [];
  function pickSong() { var list = playable(); if (!list.length) return null; var pool = list.filter(function (s) { return last.indexOf(s.id) < 0; }); if (!pool.length) pool = list;
    var s = window.EdenSongPick ? window.EdenSongPick.pick(pool, { record: false }) : null; if (!s || s.lang !== siteLang()) s = pool[Math.floor(Math.random() * pool.length)];
    last.push(s.id); last = last.slice(-Math.min(4, list.length - 1)); return s; }
  function clearEmbed() { embedBox.innerHTML = ""; embedBox.hidden = true; }
  function stopSong() { if (window.EdenFullSong) window.EdenFullSong.stop(audio); else try { audio.pause(); } catch (e) {} clearEmbed(); listenBtn.hidden = true; playerBox.hidden = true; ownStarted = false; }
  function startSong(s) { var F = window.EdenFullSong; playerBox.hidden = false; nowEl.textContent = t("nt.playing", { title: s.title }); if (window.EdenSongPick && s.id) window.EdenSongPick.record(s.id);
    if (s.audio_url || s.audio_url_aac) { clearEmbed(); audio.hidden = false; if (F) F.play(audio, { id: s.id, audio: s.audio_url, aac: s.audio_url_aac }); else { audio.src = s.audio_url; audio.play().catch(function () {}); } }
    else if (s.embed_url) { audio.hidden = true; if (F) F.embed(embedBox, { id: s.id, embed: s.embed_url, title: s.title }); } }
  function playSong(s) { var F = window.EdenFullSong; if (F && F.busy(audio) && !ownStarted) { playerBox.hidden = false; listenBtn.hidden = false; listenBtn.textContent = t("nt.listen", { title: s.title }); listenBtn.onclick = function () { listenBtn.hidden = true; F.stop(audio); startSong(s); ownStarted = true; }; return; }
    if (F && F.busy(audio)) F.stop(audio); clearEmbed(); startSong(s); ownStarted = true; }
  function success() { wins++; chime(); song = pickSong(); if (song) playSong(song); for (var i = 0; i < 30; i++) sparks.push({ x: W / 2, y: H / 2, vx: (Math.random() - .5) * 4, vy: (Math.random() - .5) * 4, life: 1 }); }
  /* path */
  function layout() { var r = stage.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars.forEach(function (s, i) { var t = i / Math.max(1, stars.length - 1); s.x = W * (0.1 + 0.8 * t); s.y = H * (0.72 - 0.42 * Math.sin(t * Math.PI) + 0.06 * Math.sin(t * Math.PI * 3)); s.r = Math.max(14, Math.min(W, H) * 0.045); }); }
  function makeStars(n) { stars = []; for (var i = 0; i < n; i++) stars.push({ lit: false, pulse: 0 }); layout(); }
  function bpm() { return softMode ? Math.max(60, TEMPOS[level] - 24) : TEMPOS[level]; }
  function startBeat() { stopBeat(); beatMs = 60000 / bpm(); beatT0 = performance.now(); beatN = 0; onBeat(); tickId = setInterval(onBeat, beatMs); }
  function stopBeat() { if (tickId) clearInterval(tickId); tickId = null; }
  function onBeat() { if (state !== "play") return; click(); beatN++; var s = stars[next]; if (s) s.pulse = 1; }
  function phase() { if (!beatMs) return 0; return ((performance.now() - beatT0) % beatMs) / beatMs; }
  function onTime() { var p = phase(), win = softMode ? 0.42 : 0.32; return p < win || p > 1 - win; }
  function updateUI() { countEl.textContent = t("se.count", { n: next, m: stars.length, bpm: bpm() }); }
  function light(i) { var s = stars[i]; if (!s || s.lit) return; s.lit = true; s.pulse = 1; trail.push({ x: s.x, y: s.y }); for (var k = 0; k < 10; k++) sparks.push({ x: s.x, y: s.y, vx: (Math.random() - .5) * 2, vy: (Math.random() - .5) * 2, life: 1 });
    next++; updateUI();
    if (next >= stars.length) { stopBeat(); state = "done"; statusEl.textContent = t("se.doneStatus"); hintEl.textContent = t("se.hintSong"); success();
      setTimeout(function () { if (level < TEMPOS.length - 1) { level++; beginLevel(); } else { level = 0; softMode = false; beginLevel(); } }, 3200); }
    else { statusEl.textContent = t("se.playStatus"); hintEl.textContent = t("se.hintPlay"); } }
  function tap(e) { if (state !== "play") return; e.preventDefault();
    if (!onTime()) { if (!missGrace) { missGrace = true; statusEl.textContent = t("se.miss"); setTimeout(function () { missGrace = false; if (state === "play") statusEl.textContent = t("se.playStatus"); }, 700); } return; }
    missGrace = false; light(next); }
  function beginLevel() { try { stage.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) {}
    makeStars(N_STARS[level]); next = 0; trail = []; state = "play"; statusEl.textContent = t("se.levelStatus", { n: level + 1 }); hintEl.textContent = t("se.hintPlay"); updateUI(); startBeat(); }
  function frame(tm) { cx.clearRect(0, 0, W, H);
    for (var i = 0; i < 50; i++) { var sx = (i * 97 + tm / 40) % W, sy = (i * 53) % H; cx.fillStyle = "rgba(255,255,255," + (0.15 + 0.2 * Math.sin(tm / 800 + i)) + ")"; cx.fillRect(sx, sy, 1.4, 1.4); }
    if (stars.length > 1) { cx.strokeStyle = "rgba(180,200,255,0.18)"; cx.lineWidth = 2; cx.setLineDash([4, 8]); cx.beginPath(); stars.forEach(function (s, i) { if (i) cx.lineTo(s.x, s.y); else cx.moveTo(s.x, s.y); }); cx.stroke(); cx.setLineDash([]); }
    if (trail.length > 1) { cx.strokeStyle = "rgba(200,230,255,0.85)"; cx.lineWidth = 3; cx.shadowColor = "rgba(160,200,255,0.8)"; cx.shadowBlur = 12; cx.beginPath(); trail.forEach(function (p, i) { if (i) cx.lineTo(p.x, p.y); else cx.moveTo(p.x, p.y); }); cx.stroke(); cx.shadowBlur = 0; }
    var ph = phase(), glowBeat = Math.max(0, 1 - Math.min(ph, 1 - ph) * 6);
    stars.forEach(function (s, i) { s.pulse *= 0.92; var R = s.r * (s.lit ? 1.15 : 0.85) * (1 + 0.35 * s.pulse + (i === next ? 0.25 * glowBeat : 0));
      var g = cx.createRadialGradient(s.x, s.y, 0, s.x, s.y, R * 2.4);
      g.addColorStop(0, "rgba(255,255,255," + (0.3 + 0.5 * (s.lit ? 1 : 0.3 + 0.5 * glowBeat * (i === next ? 1 : 0))) + ")");
      g.addColorStop(0.4, "hsla(" + (210 + i * 12) + ",90%,75%," + (s.lit ? 0.7 : 0.35 + 0.4 * glowBeat * (i === next ? 1 : 0)) + ")");
      g.addColorStop(1, "hsla(220,80%,60%,0)"); cx.fillStyle = g; cx.beginPath(); cx.arc(s.x, s.y, R * 2.4, 0, 7); cx.fill();
      cx.fillStyle = "rgba(255,250,230," + (s.lit ? 0.95 : 0.55) + ")"; cx.beginPath(); cx.arc(s.x, s.y, R * 0.35, 0, 7); cx.fill();
      if (i === next && state === "play") { cx.strokeStyle = "rgba(255,255,255," + (0.3 + 0.5 * glowBeat) + ")"; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(s.x, s.y, R * 1.6, 0, 7); cx.stroke(); } });
    sparks = sparks.filter(function (m) { m.x += m.vx; m.y += m.vy; m.life -= 0.02; cx.fillStyle = "rgba(200,230,255," + m.life + ")"; cx.beginPath(); cx.arc(m.x, m.y, 2, 0, 7); cx.fill(); return m.life > 0; });
    requestAnimationFrame(frame); }
  function start() { if (!playable().length) { card.hidden = true; emptyBox.hidden = false; return; } ctxAudio(); stopSong(); stopBeat(); level = 0; softMode = false; wins = 0; trail = [];
    overlay.classList.add("is-hidden"); actions.hidden = false; beginLevel(); }
  function init() { stopBeat(); state = "idle"; makeStars(5); overlay.classList.remove("is-hidden"); actions.hidden = true; statusEl.textContent = t("gn.ready"); hintEl.textContent = t("se.hintIdle"); card.hidden = false; emptyBox.hidden = true; countEl.textContent = ""; }
  function bind() { startBtn.addEventListener("click", start); resetBtn.addEventListener("click", start);
    slowBtn.addEventListener("click", function () { softMode = !softMode; slowBtn.textContent = softMode ? t("se.normal") : t("se.slower"); if (state === "play") startBeat(); updateUI(); });
    stage.addEventListener("pointerdown", tap); window.addEventListener("resize", layout);
    if (window.EdenI18n && window.EdenI18n.onChange) window.EdenI18n.onChange(function () { stopSong(); stopBeat(); init(); });
    var toggle = $("nav-toggle"), links = $("nav-links"); if (toggle && links) toggle.addEventListener("click", function () { var o = links.classList.toggle("is-open"); toggle.setAttribute("aria-expanded", o ? "true" : "false"); });
    init(); requestAnimationFrame(frame); }
  window.EdenSentier = { state: function () { return { state: state, level: level, next: next, n: stars.length, bpm: bpm(), wins: wins, song: song ? { id: song.id, title: song.title, lang: song.lang } : null, onTime: onTime() }; },
    tap: function () { if (state === "play") light(next); }, waitBeat: function () { return new Promise(function (res) { var iv = setInterval(function () { if (onTime()) { clearInterval(iv); res(); } }, 16); }); } };
  fetch("tracks.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (r) { tracks = r.tracks || r || []; }).catch(function () {})
    .then(function () { if (window.EdenSongPick && window.EdenSongPick.ready && window.EdenSongPick.ready.then) return window.EdenSongPick.ready; }).then(bind, bind);
})();
