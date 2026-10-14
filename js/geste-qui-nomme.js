/* Eden Yours — Le Geste qui nomme / The Gesture That Names.
   « On nomme ce qui bouge ; la vie, c'est un geste ; l'émotion, c'est le mouvement qu'on fige en le nommant. »
   Chaque geste (glisser/lancer le point de lumière) est analysé : vitesse, accélération, direction, courbure, longueur, fluidité (tremblement),
   pause avant le geste. Ces mesures donnent un point dans un espace d'émotions à 6 dimensions (énergie, haut/bas, fluidité, ouverture, courbe, pause) ;
   le mot est le voisin le plus proche dans un lexique bilingue (~70 mots), avec une légère variation (parmi les plus proches, sans répéter les derniers).
   Même style de geste → mots voisins. Le mot apparaît TOUJOURS dans les deux langues (« Joie / Joy »). Après 12 gestes (ou « Terminer ») :
   constellation + petit poème bilingue, et une chanson de la langue de la page joue EN ENTIER (EdenFullSong). */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var stage = $("gn-stage"), canvas = $("gn-canvas"); if (!canvas) return;
  var ctx = canvas.getContext("2d"), overlay = $("gn-overlay"), startBtn = $("gn-start"), statusEl = $("gn-status"), countEl = $("gn-count"), readout = $("gn-readout"),
    actions = $("gn-actions"), finishBtn = $("gn-finish"), resetBtn = $("gn-reset"), hintEl = $("gn-hint"), liveEl = $("gn-live"), poemEl = $("gn-poem"), playerBox = $("gn-player"),
    nowEl = $("gn-now-playing"), embedBox = $("gn-embed"), audio = $("gn-audio"), listenBtn = $("gn-listen"), againBtn = $("gn-again"), emptyBox = $("gn-empty"), card = $("gn-card");
  var GOAL = 12;
  //            fr               en               E     U     F     O     C     P
  var LEX = [
    ["élan", "momentum", 0.9, 0.7, 0.7, 0.8, -0.5, -0.3], ["joie", "joy", 0.7, 0.9, 0.6, 0.9, 0.2, 0], ["enthousiasme", "enthusiasm", 0.9, 0.7, 0.4, 0.9, 0.1, -0.4],
    ["émerveillement", "wonder", 0.3, 0.9, 0.8, 0.9, 0.6, 0.4], ["allégresse", "elation", 0.8, 1, 0.5, 0.7, 0.3, -0.2], ["audace", "daring", 1, 0.4, 0.2, 0.9, -0.8, -0.3],
    ["fierté", "pride", 0.6, 0.8, 0.1, 0.6, -0.6, 0], ["espoir", "hope", 0.3, 0.9, 0.6, 0.6, -0.2, 0.3], ["liberté", "freedom", 0.7, 0.6, 0.9, 1, 0.2, 0],
    ["envol", "soaring", 0.8, 1, 0.9, 0.8, -0.2, 0], ["gratitude", "gratitude", 0.1, 0.6, 0.8, 0.7, 0.2, 0.4], ["sérénité", "serenity", -0.8, 0.2, 0.9, 0.4, 0.1, 0.5],
    ["paix", "peace", -0.9, 0, 1, 0.3, 0, 0.6], ["douceur", "gentleness", -0.6, 0.1, 0.9, 0.2, 0.4, 0.2], ["tendresse", "tenderness", -0.5, -0.1, 0.8, 0.5, 0.5, 0.2],
    ["confiance", "trust", -0.1, 0.3, 0.7, 0.6, -0.4, 0.1], ["contemplation", "contemplation", -0.9, 0.4, 0.6, -0.1, 0.2, 0.9], ["patience", "patience", -0.9, -0.2, 0.6, 0, -0.3, 0.9],
    ["rêverie", "reverie", -0.6, 0.5, 0.6, -0.3, 0.7, 0.5], ["nostalgie", "nostalgia", -0.5, -0.6, 0.6, -0.3, 0.4, 0.4], ["mélancolie", "melancholy", -0.6, -0.8, 0.5, -0.4, 0.2, 0.3],
    ["tristesse", "sadness", -0.7, -1, 0.2, -0.6, -0.2, 0.2], ["lassitude", "weariness", -0.8, -0.8, 0, -0.5, -0.4, 0.4], ["abandon", "surrender", -0.4, -0.9, 0.8, 0.4, 0.1, 0],
    ["recueillement", "reflection", -0.9, -0.4, 0.7, -0.5, 0, 0.9], ["pudeur", "modesty", -0.6, -0.3, 0.3, -0.8, 0.2, 0.5], ["timidité", "shyness", -0.5, -0.2, -0.2, -0.9, 0.3, 0.7],
    ["hésitation", "hesitation", -0.3, 0, -0.8, -0.6, 0.3, 0.8], ["doute", "doubt", -0.2, -0.3, -0.7, -0.4, 0.5, 0.5], ["inquiétude", "worry", 0.1, -0.3, -0.8, -0.5, 0.4, 0.2],
    ["nervosité", "nervousness", 0.5, 0, -0.9, -0.3, 0.4, -0.5], ["agitation", "restlessness", 0.7, 0, -1, 0, 0.6, -0.8], ["impatience", "impatience", 0.8, 0.2, -0.6, 0.2, -0.2, -0.9],
    ["frustration", "frustration", 0.6, -0.4, -0.7, -0.2, 0.2, -0.4], ["colère", "anger", 1, -0.5, -0.6, 0.3, -0.6, -0.6], ["rage", "rage", 1, -0.8, -0.9, 0.5, 0, -0.8],
    ["révolte", "revolt", 0.9, 0.5, -0.5, 0.6, -0.4, -0.5], ["défi", "defiance", 0.8, 0.2, -0.2, 0.5, -0.7, -0.2], ["détermination", "determination", 0.7, 0.1, 0.4, 0.5, -0.9, 0.1],
    ["courage", "courage", 0.7, 0.5, 0, 0.7, -0.5, 0.2], ["surprise", "surprise", 0.9, 0.6, -0.3, 0, 0.2, -1], ["peur", "fear", 0.6, -0.6, -0.6, -0.8, 0.2, -0.6],
    ["angoisse", "anguish", 0.3, -0.7, -0.9, -0.7, 0.5, 0], ["vertige", "vertigo", 0.6, -0.9, 0.4, 0.1, 0.8, -0.3], ["désarroi", "dismay", 0.2, -0.8, -0.5, -0.3, 0.6, 0.2],
    ["curiosité", "curiosity", 0.2, 0.4, -0.3, 0.5, 0.6, 0.3], ["espièglerie", "playfulness", 0.6, 0.3, -0.4, 0.6, 0.8, -0.4], ["fantaisie", "whimsy", 0.4, 0.5, 0.1, 0.5, 0.9, 0],
    ["ivresse", "rapture", 0.8, 0.6, 0.6, 0.7, 0.9, -0.3], ["grâce", "grace", 0.1, 0.5, 1, 0.6, 0.6, 0.3], ["désir", "desire", 0.5, 0.3, 0.6, 0.7, 0.3, 0.1],
    ["passion", "passion", 0.9, 0.3, 0.4, 0.9, 0.5, -0.4], ["amour", "love", 0.3, 0.6, 0.9, 1, 0.5, 0.3], ["compassion", "compassion", -0.3, -0.2, 0.8, 0.8, 0.2, 0.3],
    ["apaisement", "soothing", -0.6, -0.4, 1, 0.3, 0.2, 0.3], ["soulagement", "relief", -0.3, -0.6, 0.8, 0.7, -0.3, 0], ["lâcher-prise", "letting go", -0.2, -0.7, 0.9, 0.8, 0.1, -0.1],
    ["plénitude", "fullness", -0.7, 0.3, 1, 0.8, 0.4, 0.4], ["ennui", "boredom", -0.9, -0.5, -0.2, -0.6, -0.2, 0.6], ["solitude", "solitude", -0.7, -0.4, 0.4, -0.9, -0.4, 0.5],
    ["jubilation", "jubilation", 1, 0.9, 0.2, 0.8, 0.4, -0.5], ["excitation", "excitement", 0.9, 0.5, -0.4, 0.6, 0.5, -0.7], ["fougue", "zest", 1, 0.6, 0.1, 0.8, -0.2, -0.6],
    ["insouciance", "carefreeness", 0.4, 0.6, 0.7, 0.6, 0.5, -0.1], ["gaieté", "cheerfulness", 0.6, 0.7, 0.3, 0.6, 0.6, -0.2], ["attente", "anticipation", -0.6, 0.2, 0.2, 0, -0.5, 1],
    ["fragilité", "fragility", -0.4, -0.2, -0.5, -0.4, 0.3, 0.4], ["émoi", "stirring", 0.3, 0.2, -0.3, 0.2, 0.5, 0.2], ["admiration", "admiration", 0.1, 0.8, 0.6, 0.5, -0.2, 0.5],
    ["ravissement", "delight", 0.5, 0.8, 0.7, 0.8, 0.6, 0.1], ["calme", "calm", -0.8, 0, 0.8, 0, -0.4, 0.3], ["sincérité", "sincerity", -0.2, 0.1, 0.5, 0.4, -0.8, 0.4]
  ];
  var WT = [1.3, 1.1, 0.9, 0.7, 0.6, 0.5];

  var tracks = [], state = "idle", words = [], recent = [], song = null, ownStarted = false, AC = null;
  var W = 0, H = 0, dpr = 1, orb = { x: 0, y: 0, vx: 0, vy: 0 }, drag = null, flying = null, lastEnd = performance.now(), trail = [], crystals = [], sparks = [], stars = [];

  function t(key, vars) { return window.EdenI18n && window.EdenI18n.t ? window.EdenI18n.t(key, vars) : key; }
  function siteLang() { return window.EdenSongPick ? window.EdenSongPick.lang() : (document.documentElement.lang === "en" ? "en" : "fr"); }
  function reduced() { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } }
  function say(m) { liveEl.textContent = ""; setTimeout(function () { liveEl.textContent = m; }, 30); }
  function ls() { try { return window.localStorage; } catch (e) { return null; } }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function cap(w) { return w.charAt(0).toUpperCase() + w.slice(1); }
  function label(e) { return siteLang() === "en" ? cap(e[1]) + " / " + cap(e[0]) : cap(e[0]) + " / " + cap(e[1]); }

  /* sons */
  function ctxAudio() { try { if (!AC) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AC = new C(); } if (AC.state === "suspended" && AC.resume) (function (r) { if (r && r.catch) r.catch(function () {}); })(AC.resume()); return AC; } catch (e) { return null; } }
  function tone(freqs, gain, step, dur) { try { var c = ctxAudio(); if (!c) return; var now = c.currentTime + 0.01;
      freqs.forEach(function (f, i) { var o = c.createOscillator(), g = c.createGain(); o.type = "sine"; o.frequency.value = f; var a = now + i * step; g.gain.setValueAtTime(0.0001, a); g.gain.exponentialRampToValueAtTime(gain, a + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, a + dur); o.connect(g); g.connect(c.destination); o.start(a); o.stop(a + dur + 0.05); }); } catch (e) {} }

  /* chanson stricte par langue, variée */
  function getJSON(u) { return fetch(u, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }
  function playable() { var l = siteLang(), list = window.EdenSongPick ? window.EdenSongPick.forLang(tracks, l) : tracks; return list.filter(function (s) { return s.lang === l && (s.audio_url || s.audio_url_aac || s.embed_url); }); }
  var RK = "eden-gn-recent";
  function pickSong() { var list = playable(); if (!list.length) return null; var l = siteLang(), rec = [];
    try { rec = (JSON.parse(ls().getItem(RK) || "{}")[l]) || []; } catch (e) {}
    var avoid = rec.slice(-Math.min(4, list.length - 1)), pool = list.filter(function (s) { return avoid.indexOf(s.id) < 0; }); if (!pool.length) pool = list;
    var s = window.EdenSongPick ? window.EdenSongPick.pick(pool, { record: false }) : null; if (!s || s.lang !== l) s = pool[Math.floor(Math.random() * pool.length)];
    try { var o = JSON.parse(ls().getItem(RK) || "{}"); var a = (o[l] || []).filter(function (x) { return x !== s.id; }); a.push(s.id); o[l] = a.slice(-6); ls().setItem(RK, JSON.stringify(o)); } catch (e) {}
    return s; }
  function clearEmbed() { embedBox.innerHTML = ""; embedBox.hidden = true; }
  function stopSong() { if (window.EdenFullSong) window.EdenFullSong.stop(audio); else try { audio.pause(); } catch (e) {} clearEmbed(); listenBtn.hidden = true; playerBox.hidden = true; ownStarted = false; }
  function playSong(s) { playerBox.hidden = false; nowEl.textContent = t("nt.playing", { title: s.title });
    var F = window.EdenFullSong, same = audio.getAttribute("data-id") === s.id;
    if (F && F.busy(audio) && !same && ownStarted) { F.stop(audio); clearEmbed(); }
    else if (F && F.busy(audio) && !same) { listenBtn.hidden = false; listenBtn.textContent = t("nt.listen", { title: s.title }); listenBtn.onclick = function () { listenBtn.hidden = true; F.stop(audio); startSong(s); ownStarted = true; }; return; }
    if (F && F.busy(audio) && same) return; startSong(s); ownStarted = true; }
  function startSong(s) { var F = window.EdenFullSong; playerBox.hidden = false; nowEl.textContent = t("nt.playing", { title: s.title }); if (window.EdenSongPick && s.id) window.EdenSongPick.record(s.id);
    if (s.audio_url || s.audio_url_aac) { clearEmbed(); audio.hidden = false; if (F) F.play(audio, { id: s.id, audio: s.audio_url, aac: s.audio_url_aac }); else { audio.src = s.audio_url; var p = audio.play(); if (p && p.catch) p.catch(function () {}); } }
    else if (s.embed_url) { audio.hidden = true; if (F) F.embed(embedBox, { id: s.id, embed: s.embed_url, title: s.title }); } }

  /* analyse du geste */
  function analyse(pts, pause) {
    var n = pts.length, diag = Math.hypot(W, H), len = 0, turn = 0, absTurn = 0, revs = 0, prevA = null, prevD = 0, sp = [], maxAcc = 0;
    for (var i = 1; i < n; i++) { var dx = pts[i].x - pts[i - 1].x, dy = pts[i].y - pts[i - 1].y, dt = Math.max(1, pts[i].t - pts[i - 1].t), d = Math.hypot(dx, dy); len += d;
      var v = d / dt * 1000; if (sp.length) maxAcc = Math.max(maxAcc, Math.abs(v - sp[sp.length - 1]) / dt * 1000); sp.push(v);
      if (d > 1.5) { var a = Math.atan2(dy, dx); if (prevA !== null) { var da = a - prevA; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; turn += da; absTurn += Math.abs(da);
          if (Math.abs(da) > 0.25 && prevD && Math.sign(da) !== Math.sign(prevD)) revs++; if (Math.abs(da) > 0.25) prevD = da; } prevA = a; } }
    var dur = Math.max(60, pts[n - 1].t - pts[0].t), avg = len / dur * 1000, mean = sp.reduce(function (a, b) { return a + b; }, 0) / Math.max(1, sp.length),
      sd = Math.sqrt(sp.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / Math.max(1, sp.length)), cv = mean ? sd / mean : 0,
      net = Math.hypot(pts[n - 1].x - pts[0].x, pts[n - 1].y - pts[0].y), up = (pts[0].y - pts[n - 1].y) / Math.max(40, H * 0.4);
    var f = { speed: avg / diag, acc: maxAcc / (diag * 30), length: len / diag, up: up, curve: absTurn / Math.max(1, len / 60), jitter: revs / Math.max(1, len / 40) + Math.max(0, cv - 0.6) * 0.5, pause: pause / 1000, straight: net / Math.max(1, len) };
    var v6 = [clamp(f.speed * 1.6 + f.acc * 0.4 - 0.8, -1, 1), clamp(up, -1, 1), clamp(1 - 2.4 * f.jitter, -1, 1), clamp(f.length * 2.6 - 0.7 + 0.25 * up, -1, 1),
      clamp(f.curve * 1.2 - 0.5 - (f.straight > 0.92 ? 0.4 : 0), -1, 1), clamp(f.pause / 1.4 - 1, -1, 1)];
    return { f: f, v: v6 };
  }
  function nameFor(v) {
    var ranked = LEX.map(function (e) { var d = 0; for (var k = 0; k < 6; k++) d += WT[k] * (e[2 + k] - v[k]) * (e[2 + k] - v[k]); return { e: e, d: Math.sqrt(d) }; }).sort(function (a, b) { return a.d - b.d; });
    var cand = ranked.filter(function (r) { return recent.indexOf(r.e[0]) < 0; }).slice(0, 3), best = cand[0].d, sum = 0;
    cand.forEach(function (c) { c.w = Math.exp(-(c.d - best) / 0.12); sum += c.w; }); var r = Math.random() * sum;
    for (var i = 0; i < cand.length; i++) { r -= cand[i].w; if (r <= 0) return cand[i]; } return cand[0];
  }

  /* scène */
  function layout() { var r = stage.getBoundingClientRect(); W = r.width; H = r.height; dpr = Math.min(2, window.devicePixelRatio || 1); canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    if (!orb.x) { orb.x = W * 0.5; orb.y = H * 0.62; }
    stars = []; for (var i = 0; i < (W < 600 ? 60 : 120); i++) stars.push([Math.random() * W, Math.random() * H * 0.9, 0.4 + Math.random() * 1.2, Math.random() * 6.3, 0.8 + Math.random() * 2]);
    words.forEach(function (w, i) { var s = slot(i); w.sx = s[0]; w.sy = s[1]; }); }
  function slot(i) { var cols = W < 600 ? 2 : 3, rows = Math.ceil(GOAL / cols), r = Math.floor(i / cols), c = i % cols, zig = (r % 2 ? 0.5 : -0.25) / cols;
    return [W * (0.5 / cols + c / cols + zig * 0.5 + (cols === 2 ? 0 : 0)), H * (0.1 + 0.8 * (r + 0.5 * (c % 2) * (cols === 3 ? 0.4 : 0.6)) / rows)]; }
  function local(e) { var r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() }; }

  stage.addEventListener("pointerdown", function (e) {
    if (state !== "playing") return; ctxAudio(); var p = local(e); try { stage.setPointerCapture(e.pointerId); } catch (er) {}
    flying = null; orb.vx = orb.vy = 0; drag = { pts: [], pause: Math.min(4000, p.t - lastEnd), id: e.pointerId, hold: p.t }; orb.x = p.x; orb.y = p.y; drag.pts.push(p); trail = [{ x: p.x, y: p.y, t: p.t }];
  });
  stage.addEventListener("pointermove", function (e) { if (!drag) return; var p = local(e); p.x = clamp(p.x, 6, W - 6); p.y = clamp(p.y, 6, H - 6);
    var last = drag.pts[drag.pts.length - 1]; if (Math.hypot(p.x - last.x, p.y - last.y) < 1) return;
    if (drag.pts.length === 1) drag.pause += p.t - drag.hold;                     // immobilité avant de bouger = pause aussi
    drag.pts.push(p); orb.x = p.x; orb.y = p.y; trail.push({ x: p.x, y: p.y, t: p.t }); if (trail.length > 400) trail.shift(); });
  function endDrag(e) { if (!drag) return; var d = drag; drag = null; var pts = d.pts, now = performance.now(); lastEnd = now;
    var len = 0; for (var i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (pts.length < 4 || len < 25) { hintEl.textContent = t("gn.hintShort"); return; }
    // vitesse au lâcher (≈ 90 dernières ms)
    var k = pts.length - 1; while (k > 0 && now - pts[k].t < 90) k--; var dt = Math.max(16, pts[pts.length - 1].t - pts[k].t);
    var vx = (pts[pts.length - 1].x - pts[k].x) / dt * 1000, vy = (pts[pts.length - 1].y - pts[k].y) / dt * 1000; if (now - pts[pts.length - 1].t > 120) vx = vy = 0;
    flying = { pts: pts, pause: d.pause, t: now }; orb.vx = clamp(vx, -2400, 2400) * 0.6; orb.vy = clamp(vy, -2400, 2400) * 0.6; }
  stage.addEventListener("pointerup", endDrag); stage.addEventListener("pointercancel", endDrag);
  stage.addEventListener("keydown", function (e) {                          // clavier : flèches = geste (Maj = vif, Alt = lent et courbe)
    if (state !== "playing") return; var dir = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key]; if (!dir) return; e.preventDefault(); ctxAudio();
    var sp = e.shiftKey ? 1600 : e.altKey ? 260 : 700, now = performance.now(), pts = [], x = orb.x, y = orb.y, n = 14, curve = e.altKey ? 0.5 : 0;
    for (var i = 0; i < n; i++) { var a = Math.atan2(dir[1], dir[0]) + Math.sin(i / n * Math.PI) * curve; x = clamp(x + Math.cos(a) * sp * 0.016, 8, W - 8); y = clamp(y + Math.sin(a) * sp * 0.016, 8, H - 8); pts.push({ x: x, y: y, t: now + i * 16 }); trail.push({ x: x, y: y, t: now + i * 16 }); }
    orb.x = x; orb.y = y; flying = { pts: pts, pause: Math.min(4000, now - lastEnd), t: now }; lastEnd = now; orb.vx = dir[0] * sp * 0.5; orb.vy = dir[1] * sp * 0.5; });

  function freeze() {
    var fl = flying; flying = null; var res = analyse(fl.pts, fl.pause), pick = nameFor(res.v), e = pick.e;
    recent.push(e[0]); if (recent.length > 8) recent.shift();
    var ix = words.length, s = slot(ix), w = { e: e, x: clamp(orb.x, 70, W - 70), y: clamp(orb.y, 30, H - 24), t: performance.now(), sx: s[0], sy: s[1], v: res.v, f: res.f,
      dots: trail.slice(-60).map(function (p) { return { x: p.x, y: p.y }; }) };
    words.push(w); trail = []; tone([392 + res.v[1] * 120 + 260, 523.25 + res.v[0] * 80 + 200], 0.07, 0.08, 0.7);
    for (var i = 0; i < 26; i++) { var a = Math.random() * 6.283, v = 40 + Math.random() * 120; sparks.push({ x: w.x, y: w.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.9, age: 0 }); }
    var f = res.f; readout.textContent = t("gn.readout", { s: Math.round(f.speed * 100), d: f.up > 0.15 ? "↑" : f.up < -0.15 ? "↓" : "→", c: Math.round(clamp(f.curve, 0, 2) * 50), fl: Math.round((res.v[2] + 1) * 50), p: (f.pause).toFixed(1) });
    say(label(e)); updateUI();
    if (words.length >= GOAL) setTimeout(finish, 2200);
  }
  function frame(now) {
    requestAnimationFrame(frame); if (!W) return; var dt = Math.min(0.05, (now - (frame.l || now)) / 1000); frame.l = now; var T = now / 1000;
    if (flying) { orb.x += orb.vx * dt; orb.y += orb.vy * dt; if (orb.x < 10 || orb.x > W - 10) { orb.vx *= -0.6; orb.x = clamp(orb.x, 10, W - 10); } if (orb.y < 10 || orb.y > H - 10) { orb.vy *= -0.6; orb.y = clamp(orb.y, 10, H - 10); }
      var fr = Math.pow(0.04, dt); orb.vx *= fr; orb.vy *= fr; trail.push({ x: orb.x, y: orb.y, t: now });
      if (Math.hypot(orb.vx, orb.vy) < 30 || now - flying.t > 1300) freeze(); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    stars.forEach(function (s) { ctx.fillStyle = "rgba(255,248,235," + (0.25 + 0.6 * (0.5 + 0.5 * Math.sin(T * s[4] + s[3]))) + ")"; ctx.beginPath(); ctx.arc(s[0], s[1], s[2], 0, 6.283); ctx.fill(); });
    // constellation : lignes entre les mots posés
    var settled = words.filter(function (w) { return now - w.t > 2600; });
    if (settled.length > 1) { ctx.save(); ctx.strokeStyle = state === "done" ? "rgba(253,230,138," + (0.45 + 0.25 * Math.sin(T * 2)) + ")" : "rgba(200,220,255,0.22)"; ctx.lineWidth = state === "done" ? 1.6 : 1; ctx.beginPath();
      settled.forEach(function (w, i) { var p = wpos(w, now); if (!i) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); }); if (state === "done" && settled.length > 2) ctx.closePath(); ctx.stroke(); ctx.restore(); }
    // traînée
    if (trail.length > 1) { ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round"; for (var i = 1; i < trail.length; i++) { var a = i / trail.length; ctx.strokeStyle = "rgba(160,235,255," + a * 0.8 + ")"; ctx.lineWidth = 1 + a * 5; ctx.beginPath(); ctx.moveTo(trail[i - 1].x, trail[i - 1].y); ctx.lineTo(trail[i].x, trail[i].y); ctx.stroke(); } ctx.restore();
      if (!drag && !flying) trail = trail.filter(function (p) { return now - p.t < 500; }); }
    // mots : cristallisation → constellation
    words.forEach(function (w) { var age = (now - w.t) / 1000;
      if (age < 0.7) { var k = age / 0.7; ctx.fillStyle = "rgba(200,245,255,0.9)"; w.dots.forEach(function (d, i) { if (i % 2) return; var x = d.x + (w.x - d.x) * k * k, y = d.y + (w.y - d.y) * k * k; ctx.beginPath(); ctx.arc(x, y, 2 * (1 - k) + 0.6, 0, 6.283); ctx.fill(); }); }
      var p = wpos(w, now), big = age < 2.2, fs = big ? (W < 600 ? 22 : 30) * Math.min(1, 0.4 + age * 1.4) : (W < 600 ? 11.5 : 14), alpha = Math.min(1, age * 2.2);
      ctx.save(); ctx.globalAlpha = alpha; ctx.shadowColor = "rgba(253,230,138,0.95)"; ctx.shadowBlur = big ? 22 : 10; ctx.fillStyle = "#fff8e6";
      ctx.beginPath(); ctx.arc(p.x, p.y - (big ? 0 : 9), big ? 0 : 2.6, 0, 6.283); ctx.fill();
      ctx.font = (big ? "600 " : "500 ") + Math.round(fs) + "px system-ui, -apple-system, 'Segoe UI', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      var txt = label(w.e), tw = ctx.measureText(txt).width, px = clamp(p.x, tw / 2 + 6, W - tw / 2 - 6); ctx.fillText(txt, px, p.y + (big ? 0 : 4)); ctx.restore(); });
    // étincelles
    for (var q = sparks.length - 1; q >= 0; q--) { var s = sparks[q]; s.age += dt; if (s.age > s.life) { sparks.splice(q, 1); continue; } s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.96; s.vy *= 0.96;
      ctx.fillStyle = "rgba(253,230,138," + (1 - s.age / s.life) + ")"; ctx.beginPath(); ctx.arc(s.x, s.y, 1.6, 0, 6.283); ctx.fill(); }
    if (state === "done" && Math.random() < 0.2) { var w0 = words[Math.floor(Math.random() * words.length)]; if (w0) sparks.push({ x: w0.sx, y: w0.sy - 9, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 20, life: 1, age: 0 }); }
    // point de lumière
    if (state === "playing") { var pr = 9 + 2 * Math.sin(T * 3), g = ctx.createRadialGradient(orb.x, orb.y, 1, orb.x, orb.y, pr * 3.2); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.25, "rgba(190,245,255,0.9)"); g.addColorStop(1, "rgba(120,200,255,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(orb.x, orb.y, pr * 3.2, 0, 6.283); ctx.fill(); }
  }
  function wpos(w, now) { var age = (now - w.t) / 1000, k = age < 2.2 ? 0 : Math.min(1, (age - 2.2) / 1.2), e = k * k * (3 - 2 * k), bob = Math.sin(now / 900 + w.sx) * 2 * e;
    return { x: w.x + (w.sx - w.x) * e, y: w.y + (w.sy - w.y) * e + bob }; }

  /* interface */
  function updateUI() { countEl.textContent = state === "idle" ? "" : t("gn.count", { n: words.length, m: GOAL });
    statusEl.textContent = state === "done" ? t("gn.doneStatus") : state === "playing" ? (words.length ? label(words[words.length - 1].e) : t("gn.firstStatus")) : t("gn.ready");
    finishBtn.disabled = words.length < 3; }
  function finish() {
    if (state !== "playing") return; if (flying) freeze(); state = "done"; actions.hidden = true; againBtn.hidden = false; updateUI();
    tone([523.25, 659.25, 783.99, 1046.5, 1318.5], 0.08, 0.13, 1.3);
    var lines = [], ws = words.map(function (w) { return label(w.e); }); for (var i = 0; i < ws.length; i += 3) lines.push(ws.slice(i, i + 3).join(" · "));
    poemEl.innerHTML = "<h3>" + t("gn.poemTitle") + "</h3>" + lines.map(function (l, i) { return '<p style="animation-delay:' + (i * 0.35) + 's">' + l + "</p>"; }).join("") +
      '<p class="gn-close" style="animation-delay:' + (lines.length * 0.35 + 0.2) + 's">' + t("gn.poemClose") + "</p>"; poemEl.hidden = false;
    hintEl.textContent = t("gn.hintDone"); say(t("gn.doneStatus"));
    if (song) playSong(song);
    try { poemEl.scrollIntoView({ block: "nearest", behavior: reduced() ? "auto" : "smooth" }); } catch (e) {}
  }
  function start() { if (!playable().length) { card.hidden = true; emptyBox.hidden = false; return; }
    ctxAudio(); stopSong(); words = []; recent = []; trail = []; sparks = []; flying = null; state = "playing"; song = pickSong(); lastEnd = performance.now();
    overlay.classList.add("is-hidden"); actions.hidden = false; againBtn.hidden = true; poemEl.hidden = true; readout.textContent = ""; layout(); orb.x = W * 0.5; orb.y = H * 0.62;
    hintEl.textContent = t("gn.hintPlay"); updateUI(); try { stage.focus({ preventScroll: true }); } catch (e) {} }
  function init() { state = "idle"; words = []; trail = []; overlay.classList.remove("is-hidden"); actions.hidden = true; againBtn.hidden = true; poemEl.hidden = true; readout.textContent = "";
    hintEl.textContent = t("gn.hintIdle"); card.hidden = false; emptyBox.hidden = true; updateUI(); layout(); }
  function bind() {
    startBtn.addEventListener("click", start); againBtn.addEventListener("click", start); resetBtn.addEventListener("click", start); finishBtn.addEventListener("click", finish);
    window.addEventListener("resize", layout);
    if (window.EdenI18n && window.EdenI18n.onChange) window.EdenI18n.onChange(function () { stopSong(); init(); });
    var toggle = $("nav-toggle"), links = $("nav-links"); if (toggle && links) toggle.addEventListener("click", function () { var o = links.classList.toggle("is-open"); toggle.setAttribute("aria-expanded", o ? "true" : "false"); });
    init(); requestAnimationFrame(frame);
  }
  window.EdenGeste = {
    state: function () { return { state: state, n: words.length, words: words.map(function (w) { return { fr: w.e[0], en: w.e[1], label: label(w.e), v: w.v.map(function (x) { return Math.round(x * 100) / 100; }) }; }), song: song ? { id: song.id, title: song.title, lang: song.lang } : null, flying: !!flying }; },
    lexicon: function () { return LEX.length; }, orb: function () { var r = stage.getBoundingClientRect(); return { x: r.left + orb.x, y: r.top + orb.y }; },
    classify: function (v) { return nameFor(v).e; }
  };
  getJSON("tracks.json").then(function (r) { tracks = r.tracks || r || []; }).catch(function () {})
    .then(function () { if (window.EdenSongPick && window.EdenSongPick.ready && window.EdenSongPick.ready.then) return window.EdenSongPick.ready; }).then(bind, bind);
})();
