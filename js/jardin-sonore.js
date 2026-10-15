/* Jardin sonore / Sound Garden — fleurs de lumière, notes pentatoniques WebAudio.
   Manche 1 : éveiller toutes les fleurs. Manches suivantes : rejouer la mélodie du jardin (3, 4, 5… notes).
   À chaque réussite, une chanson de la langue de la page joue EN ENTIER (EdenFullSong). */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  var stage = $("sg-stage"), cv = $("sg-canvas"), cx = cv.getContext("2d"), overlay = $("sg-overlay"), startBtn = $("sg-start"),
    statusEl = $("sg-status"), countEl = $("sg-count"), hintEl = $("sg-hint"), actions = $("sg-actions"), replayBtn = $("sg-replay"), resetBtn = $("sg-reset"),
    playerBox = $("sg-player"), nowEl = $("sg-now-playing"), embedBox = $("sg-embed"), audio = $("sg-audio"), listenBtn = $("sg-listen"), card = $("sg-card"), emptyBox = $("sg-empty");
  var NOTES = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33]; /* do ré mi sol la do ré : pentatonique */
  var HUES = [330, 285, 200, 160, 50, 20, 260];
  var tracks = [], state = "idle", round = 0, plants = [], seq = [], input = 0, song = null, ownStarted = false, AC = null, W = 0, H = 0, dpr = 1, motes = [], busy = false, wins = 0;
  function t(k, v) { return window.EdenI18n && window.EdenI18n.t ? window.EdenI18n.t(k, v) : k; }
  function siteLang() { return window.EdenSongPick ? window.EdenSongPick.lang() : (document.documentElement.lang === "en" ? "en" : "fr"); }
  function ctxAudio() { try { if (!AC) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AC = new C(); } if (AC.state === "suspended") AC.resume().catch(function () {}); return AC; } catch (e) { return null; } }
  function note(f, dur) { var c = ctxAudio(); if (!c) return; try { var n = c.currentTime + 0.01, d = dur || 1.2;
    [[f, "sine", 0.16], [f * 2, "triangle", 0.04]].forEach(function (p) { var o = c.createOscillator(), g = c.createGain(); o.type = p[1]; o.frequency.value = p[0];
      g.gain.setValueAtTime(0.0001, n); g.gain.exponentialRampToValueAtTime(p[2], n + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, n + d); o.connect(g); g.connect(c.destination); o.start(n); o.stop(n + d + 0.05); }); } catch (e) {} }
  function chord() { [0, 2, 4].forEach(function (i, k) { setTimeout(function () { note(NOTES[i] * 2, 1.6); }, k * 120); }); }
  /* chansons */
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
  function success() { wins++; chord(); song = pickSong(); if (song) playSong(song); burst(); }
  /* jardin */
  function layout() { var r = stage.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = NOTES.length; plants.forEach(function (p, i) { p.x = W * (0.09 + 0.82 * i / (n - 1)); p.base = H * (0.94 - 0.03 * Math.sin(i * 1.7)); p.h = H * (0.32 + 0.16 * ((i * 37) % 5) / 4); p.r = Math.max(18, Math.min(W, H) * 0.06); }); }
  function makePlants() { plants = NOTES.map(function (f, i) { return { f: f, hue: HUES[i], awake: false, bloom: 0, glow: 0, sway: Math.random() * 6 }; }); layout(); }
  function head(p, tm) { var s = Math.sin(tm / 900 + p.sway) * (6 + 10 * p.glow); return { x: p.x + s, y: p.base - p.h }; }
  function burst(p) { var list = p ? [p] : plants; list.forEach(function (q) { var h = head(q, performance.now()); for (var i = 0; i < (p ? 14 : 10); i++) motes.push({ x: h.x, y: h.y, vx: (Math.random() - .5) * 2, vy: -Math.random() * 2 - .5, life: 1, hue: q.hue }); }); }
  function touch(i) { var p = plants[i]; ctxAudio(); note(p.f); p.glow = 1; burst(p);
    if (state === "awaken") { if (!p.awake) { p.awake = true; } var n = plants.filter(function (q) { return q.awake; }).length; updateUI();
      if (n === plants.length) { state = "wait"; statusEl.textContent = t("sg.awakeDone"); hintEl.textContent = t("sg.hintSong"); success(); setTimeout(nextRound, 2600); } }
    else if (state === "repeat") { if (i === seq[input]) { input++; updateUI(); if (input === seq.length) { state = "wait"; statusEl.textContent = t("sg.melodyDone"); hintEl.textContent = t("sg.hintSong"); success(); setTimeout(nextRound, 3000); } }
      else { statusEl.textContent = t("sg.miss"); input = 0; updateUI(); setTimeout(sing, 900); } } }
  function nextRound() { round++; var len = Math.min(8, 2 + round); seq = []; for (var k = 0; k < len; k++) { var j; do { j = Math.floor(Math.random() * plants.length); } while (k && j === seq[k - 1]); seq.push(j); } sing(); }
  function sing() { try { var rr = stage.getBoundingClientRect(); if (rr.top < 0 || rr.bottom > window.innerHeight) stage.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) {} state = "listen"; input = 0; busy = true; statusEl.textContent = t("sg.listenStatus"); hintEl.textContent = t("sg.hintListen"); updateUI();
    seq.forEach(function (j, k) { setTimeout(function () { var p = plants[j]; note(p.f, 0.9); p.glow = 1; burst(p); }, 600 + k * 620); });
    setTimeout(function () { busy = false; state = "repeat"; statusEl.textContent = t("sg.yourTurn"); hintEl.textContent = t("sg.hintRepeat"); }, 600 + seq.length * 620); }
  function updateUI() { if (state === "awaken") countEl.textContent = t("sg.countAwake", { n: plants.filter(function (q) { return q.awake; }).length, m: plants.length });
    else if (round) countEl.textContent = t("sg.countMelody", { r: round, n: input, m: seq.length }); else countEl.textContent = ""; }
  function hit(e) { if (state !== "awaken" && state !== "repeat") return; var r = stage.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, tm = performance.now(), best = -1, bd = 1e9;
    plants.forEach(function (p, i) { var h = head(p, tm), d = Math.abs(x - h.x) + Math.max(0, y - p.base) ; if (y > h.y - p.r * 2.5 && d < bd) { bd = d; best = i; } });
    if (best >= 0) { e.preventDefault(); touch(best); } }
  function frame(tm) { cx.clearRect(0, 0, W, H);
    for (var s = 0; s < 40; s++) { var sx = (s * 97) % W, sy = (s * 53) % (H * 0.5); cx.fillStyle = "rgba(255,255,255," + (0.2 + 0.2 * Math.sin(tm / 700 + s)) + ")"; cx.fillRect(sx, sy, 1.5, 1.5); }
    plants.forEach(function (p) { var h = head(p, tm), on = p.awake || state === "listen" || state === "repeat" || state === "wait"; p.bloom += ((on ? 1 : 0.25) - p.bloom) * 0.06; p.glow *= 0.94;
      cx.strokeStyle = "hsla(" + (110 + p.glow * 40) + ",60%," + (35 + 25 * p.bloom) + "%,0.9)"; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(p.x, p.base); cx.quadraticCurveTo(p.x - (h.x - p.x), p.base - p.h * 0.5, h.x, h.y); cx.stroke();
      cx.fillStyle = "hsla(120,55%,40%,0.8)"; cx.beginPath(); cx.ellipse(p.x + 10, p.base - p.h * 0.35, 12, 5, -0.5, 0, 7); cx.fill();
      var R = p.r * (0.5 + 0.5 * p.bloom) * (1 + 0.25 * p.glow), g = cx.createRadialGradient(h.x, h.y, 0, h.x, h.y, R * 2.6);
      g.addColorStop(0, "hsla(" + p.hue + ",100%,85%," + (0.25 + 0.6 * p.bloom * 0.6 + 0.4 * p.glow) + ")"); g.addColorStop(1, "hsla(" + p.hue + ",100%,60%,0)"); cx.fillStyle = g; cx.beginPath(); cx.arc(h.x, h.y, R * 2.6, 0, 7); cx.fill();
      for (var k = 0; k < 6; k++) { var a = k / 6 * Math.PI * 2 + tm / 4000; cx.fillStyle = "hsla(" + p.hue + ",90%," + (55 + 25 * p.bloom) + "%,0.85)"; cx.beginPath(); cx.ellipse(h.x + Math.cos(a) * R * 0.6, h.y + Math.sin(a) * R * 0.6, R * 0.55 * p.bloom + 2, R * 0.25 + 1, a, 0, 7); cx.fill(); }
      cx.fillStyle = "rgba(255,250,220," + (0.6 + 0.4 * p.glow) + ")"; cx.beginPath(); cx.arc(h.x, h.y, R * 0.28 + 2, 0, 7); cx.fill(); });
    motes = motes.filter(function (m) { m.x += m.vx; m.y += m.vy; m.life -= 0.012; cx.fillStyle = "hsla(" + m.hue + ",100%,80%," + m.life + ")"; cx.beginPath(); cx.arc(m.x, m.y, 2.2, 0, 7); cx.fill(); return m.life > 0; });
    requestAnimationFrame(frame); }
  function start() { if (!playable().length) { card.hidden = true; emptyBox.hidden = false; return; } ctxAudio(); stopSong(); round = 0; seq = []; wins = 0; makePlants(); state = "awaken";
    overlay.classList.add("is-hidden"); actions.hidden = false; statusEl.textContent = t("sg.awakeStatus"); hintEl.textContent = t("sg.hintAwake"); updateUI(); }
  function init() { state = "idle"; makePlants(); overlay.classList.remove("is-hidden"); actions.hidden = true; statusEl.textContent = t("gn.ready"); hintEl.textContent = t("sg.hintIdle"); card.hidden = false; emptyBox.hidden = true; updateUI(); }
  function bind() { startBtn.addEventListener("click", start); resetBtn.addEventListener("click", start); replayBtn.addEventListener("click", function () { if (state === "repeat" && !busy) sing(); });
    stage.addEventListener("pointerdown", hit); window.addEventListener("resize", layout);
    if (window.EdenI18n && window.EdenI18n.onChange) window.EdenI18n.onChange(function () { stopSong(); init(); });
    var toggle = $("nav-toggle"), links = $("nav-links"); if (toggle && links) toggle.addEventListener("click", function () { var o = links.classList.toggle("is-open"); toggle.setAttribute("aria-expanded", o ? "true" : "false"); });
    init(); requestAnimationFrame(frame); }
  window.EdenJardinSonore = { state: function () { return { state: state, round: round, seq: seq.slice(), input: input, wins: wins, song: song ? { id: song.id, title: song.title, lang: song.lang } : null }; }, touch: function (i) { touch(i); },
    head: function (i) { var r = stage.getBoundingClientRect(), h = head(plants[i], performance.now()); return { x: r.left + h.x, y: r.top + h.y }; } };
  fetch("tracks.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (r) { tracks = r.tracks || r || []; }).catch(function () {})
    .then(function () { if (window.EdenSongPick && window.EdenSongPick.ready && window.EdenSongPick.ready.then) return window.EdenSongPick.ready; }).then(bind, bind);
})();
