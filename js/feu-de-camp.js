/* Feu de camp / Campfire — intention → braise → étincelles → chanson EN ENTIER.
   Choix de la chanson : mots de l’intention croisés avec titres, paroles (lyrics-sources),
   noms/descriptions de catégories. Fallback aléatoire. Intentions = localStorage only. */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  var stage = $("fc-stage"), cv = $("fc-canvas"), cx = cv.getContext("2d"), statusEl = $("fc-status"), countEl = $("fc-count"),
    hintEl = $("fc-hint"), form = $("fc-form"), input = $("fc-input"), suggest = $("fc-suggest"), answerEl = $("fc-answer"),
    playerBox = $("fc-player"), nowEl = $("fc-now-playing"), embedBox = $("fc-embed"), audio = $("fc-audio"), listenBtn = $("fc-listen"),
    card = $("fc-card"), emptyBox = $("fc-empty"), journal = $("fc-journal"), listEl = $("fc-list"), clearBtn = $("fc-clear");
  var tracks = [], lyrics = {}, cats = { categories: [], tracks: {} }, song = null, ownStarted = false, AC = null;
  var W = 0, H = 0, dpr = 1, sparks = [], embers = [], logs = [], stars = [], smoke = [], dropping = null, lastTitles = [];
  var LK = "eden-fc-intentions";
  function t(k, v) { return window.EdenI18n && window.EdenI18n.t ? window.EdenI18n.t(k, v) : k; }
  function siteLang() { return window.EdenSongPick ? window.EdenSongPick.lang() : (document.documentElement.lang === "en" ? "en" : "fr"); }
  function ls() { try { return window.localStorage; } catch (e) { return null; } }
  function ctxAudio() { try { if (!AC) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AC = new C(); } if (AC.state === "suspended") AC.resume().catch(function () {}); return AC; } catch (e) { return null; } }
  function crackle() { var c = ctxAudio(); if (!c) return; try { var n = c.currentTime + 0.01, len = c.sampleRate * 0.18, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.35));
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = buf; f.type = "bandpass"; f.frequency.value = 900; f.Q.value = 0.6;
    g.gain.setValueAtTime(0.08, n); g.gain.exponentialRampToValueAtTime(0.0001, n + 0.18); s.connect(f); f.connect(g); g.connect(c.destination); s.start(n); } catch (e) {} }
  function whoosh() { var c = ctxAudio(); if (!c) return; try { var n = c.currentTime + 0.01, o = c.createOscillator(), g = c.createGain(); o.type = "sine";
    o.frequency.setValueAtTime(180, n); o.frequency.exponentialRampToValueAtTime(60, n + 0.6);
    g.gain.setValueAtTime(0.0001, n); g.gain.exponentialRampToValueAtTime(0.06, n + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, n + 0.7);
    o.connect(g); g.connect(c.destination); o.start(n); o.stop(n + 0.75); } catch (e) {} }
  /* songs */
  function playable() { var l = siteLang(), list = window.EdenSongPick ? window.EdenSongPick.forLang(tracks, l) : tracks; return list.filter(function (s) { return s.lang === l && (s.audio_url || s.audio_url_aac || s.embed_url); }); }
  function clearEmbed() { embedBox.innerHTML = ""; embedBox.hidden = true; }
  function stopSong() { if (window.EdenFullSong) window.EdenFullSong.stop(audio); else try { audio.pause(); } catch (e) {} clearEmbed(); listenBtn.hidden = true; playerBox.hidden = true; ownStarted = false; }
  function startSong(s) { var F = window.EdenFullSong; playerBox.hidden = false; nowEl.textContent = t("nt.playing", { title: s.title }); if (window.EdenSongPick && s.id) window.EdenSongPick.record(s.id);
    if (s.audio_url || s.audio_url_aac) { clearEmbed(); audio.hidden = false; if (F) F.play(audio, { id: s.id, audio: s.audio_url, aac: s.audio_url_aac }); else { audio.src = s.audio_url; audio.play().catch(function () {}); } }
    else if (s.embed_url) { audio.hidden = true; if (F) F.embed(embedBox, { id: s.id, embed: s.embed_url, title: s.title }); } }
  function playSong(s) { var F = window.EdenFullSong; if (F && F.busy(audio) && !ownStarted) { playerBox.hidden = false; listenBtn.hidden = false; listenBtn.textContent = t("nt.listen", { title: s.title }); listenBtn.onclick = function () { listenBtn.hidden = true; F.stop(audio); startSong(s); ownStarted = true; }; return; }
    if (F && F.busy(audio)) F.stop(audio); clearEmbed(); startSong(s); ownStarted = true; }
  /* matching */
  function norm(s) { return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim(); }
  var STOP = { fr: { le:1,la:1,les:1,un:1,une:1,des:1,de:1,du:1,et:1,en:1,au:1,aux:1,ce:1,cette:1,ces:1,mon:1,ma:1,mes:1,ton:1,ta:1,tes:1,son:1,sa:1,ses:1,notre:1,nos:1,votre:1,vos:1,leur:1,leurs:1,je:1,tu:1,il:1,elle:1,nous:1,vous:1,ils:1,elles:1,que:1,qui:1,dans:1,pour:1,par:1,sur:1,avec:1,sans:1,plus:1,pas:1,ne:1,me:1,te:1,se:1,y:1,a:1,est:1,suis:1,etre:1,etre:1,c:1,d:1,l:1,n:1,s:1,m:1,t:1 },
    en: { the:1,a:1,an:1,and:1,or:1,of:1,to:1,in:1,on:1,for:1,with:1,my:1,your:1,his:1,her:1,our:1,their:1,i:1,you:1,he:1,she:1,we:1,they:1,it:1,is:1,are:1,be:1,am:1,this:1,that:1,these:1,those:1,from:1,by:1,as:1,at:1,into:1,me:1,my:1 } };
  function tokens(text) { var stop = STOP[siteLang()] || STOP.fr; return norm(text).split(" ").filter(function (w) { return w.length > 2 && !stop[w]; }); }
  function corpus(s) { var parts = [s.title || ""]; var ly = lyrics[s.id]; if (ly && ly.lyrics) parts.push(ly.lyrics); var meta = cats.tracks[s.id];
    if (meta) { parts.push(meta.why || ""); var cat = (cats.categories || []).find(function (c) { return c.id === meta.primary; });
      if (cat) { parts.push((cat.name && (cat.name.fr || cat.name.en)) || ""); parts.push((cat.description && (cat.description.fr || cat.description.en)) || "");
        if (cat.name) parts.push(cat.name.en || "", cat.name.fr || ""); if (cat.description) parts.push(cat.description.en || "", cat.description.fr || ""); }
      (meta.tags || []).forEach(function (tid) { var c2 = (cats.categories || []).find(function (c) { return c.id === tid; }); if (c2 && c2.name) parts.push(c2.name.fr || "", c2.name.en || ""); }); }
    return norm(parts.join(" ")); }
  var bodyCache = {};
  function bodyWords(s) { if (bodyCache[s.id]) return bodyCache[s.id]; var set = {}; corpus(s).split(" ").forEach(function (w) { if (w) set[w] = 1; }); return (bodyCache[s.id] = set); }
  function score(intention, s) { var words = tokens(intention); if (!words.length) return 0; var set = bodyWords(s), keys = null, sc = 0,
      titleSet = {}; norm(s.title).split(" ").forEach(function (w) { titleSet[w] = 1; });
    words.forEach(function (w) {
      if (titleSet[w]) sc += 4; else if (w.length >= 5 && Object.keys(titleSet).some(function (b) { return b.length >= 5 && b.slice(0, 5) === w.slice(0, 5); })) sc += 3;
      if (set[w]) { sc += w.length >= 6 ? 3 : 2; return; }
      if (w.length >= 5) { var stem = w.slice(0, 5); keys = keys || Object.keys(set); if (keys.some(function (b) { return b.length >= 5 && b.slice(0, 5) === stem; })) sc += 1; } });
    return sc; }
  function pickFor(intention) { var list = playable(); if (!list.length) return null; var l = siteLang();
    var scored = list.map(function (s) { return { s: s, sc: score(intention, s) }; }).sort(function (a, b) { return b.sc - a.sc; });
    var best = scored.filter(function (x) { return x.sc > 0 && lastTitles.indexOf(x.s.id) < 0; });
    var pick; if (best.length) pick = best[0].s; else {
      var pool = list.filter(function (s) { return lastTitles.indexOf(s.id) < 0; }); if (!pool.length) pool = list;
      pick = window.EdenSongPick ? window.EdenSongPick.pick(pool, { record: false }) : null; if (!pick || pick.lang !== l) pick = pool[Math.floor(Math.random() * pool.length)]; }
    lastTitles.push(pick.id); lastTitles = lastTitles.slice(-Math.min(4, list.length - 1)); return pick; }
  /* intentions local only */
  function loadJournal() { try { return JSON.parse((ls() && ls().getItem(LK)) || "[]") || []; } catch (e) { return []; } }
  function saveJournal(arr) { try { if (ls()) ls().setItem(LK, JSON.stringify(arr.slice(-20))); } catch (e) {} }
  function renderJournal() { var arr = loadJournal().filter(function (x) { return x.lang === siteLang(); });
    if (!arr.length) { journal.hidden = true; listEl.innerHTML = ""; return; }
    journal.hidden = false; listEl.innerHTML = arr.slice().reverse().map(function (x) {
      return "<li>« " + escapeHtml(x.text) + " » → <em>" + escapeHtml(x.title) + "</em></li>"; }).join(""); }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  /* scene */
  function layout() { var r = stage.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!stars.length) for (var i = 0; i < 55; i++) stars.push({ x: Math.random(), y: Math.random() * 0.55, s: 0.6 + Math.random() * 1.4, tw: Math.random() * 6 });
    if (!logs.length) logs = [{ x: -28, y: 8, a: -0.25 }, { x: 0, y: 14, a: 0.05 }, { x: 26, y: 6, a: 0.3 }]; }
  function burst(n) { for (var i = 0; i < n; i++) sparks.push({ x: W * 0.5 + (Math.random() - .5) * 30, y: H * 0.72, vx: (Math.random() - .5) * 1.6, vy: -1.5 - Math.random() * 3.5, life: 0.7 + Math.random() * 0.5, hue: 20 + Math.random() * 40, r: 1.5 + Math.random() * 2.5 }); }
  function drop(text) { ctxAudio(); whoosh(); crackle(); var s = pickFor(text); song = s;
    dropping = { x: W * 0.5, y: H * 0.18, t: 0, text: text }; answerEl.hidden = true;
    statusEl.textContent = t("fc.dropping"); hintEl.textContent = t("fc.hintDrop");
    setTimeout(function () { dropping = null; burst(40); crackle();
      if (s) { answerEl.hidden = false; answerEl.textContent = t("fc.answer", { title: s.title }); statusEl.textContent = t("fc.answered"); hintEl.textContent = t("fc.hintSong"); playSong(s);
        var arr = loadJournal(); arr.push({ text: text, title: s.title, id: s.id, lang: siteLang(), at: Date.now() }); saveJournal(arr); renderJournal(); countEl.textContent = t("fc.count", { n: arr.filter(function (x) { return x.lang === siteLang(); }).length }); }
      else { statusEl.textContent = t("nt.empty"); } }, 1100); }
  function frame(tm) { cx.clearRect(0, 0, W, H);
    stars.forEach(function (st) { cx.fillStyle = "rgba(255,255,255," + (0.25 + 0.45 * (0.5 + 0.5 * Math.sin(tm / 700 + st.tw))) + ")"; cx.fillRect(st.x * W, st.y * H, st.s, st.s); });
    /* ground */
    cx.fillStyle = "rgba(12,8,6,0.9)"; cx.beginPath(); cx.ellipse(W * 0.5, H * 0.92, W * 0.42, H * 0.08, 0, 0, 7); cx.fill();
    /* logs */ var bx = W * 0.5, by = H * 0.78;
    logs.forEach(function (lg) { cx.save(); cx.translate(bx + lg.x, by + lg.y); cx.rotate(lg.a); cx.fillStyle = "#4a2a14"; cx.fillRect(-34, -7, 68, 14); cx.fillStyle = "#2c180c"; cx.fillRect(-34, 2, 68, 5); cx.restore(); });
    /* flame */ var flick = 0.85 + 0.15 * Math.sin(tm / 90) + 0.08 * Math.sin(tm / 37);
    [[0, 1, 1], [-14, 0.7, 0.85], [14, 0.7, 0.85], [0, 0.45, 1.15]].forEach(function (f, i) {
      var g = cx.createRadialGradient(bx + f[0], by - 10, 2, bx + f[0], by - 40 * f[2] * flick, 50 * f[1] * flick);
      g.addColorStop(0, "rgba(255,250,200," + (0.9 - i * 0.1) + ")"); g.addColorStop(0.35, "rgba(255,160,40,0.75)"); g.addColorStop(0.7, "rgba(255,60,10,0.35)"); g.addColorStop(1, "rgba(255,40,0,0)");
      cx.fillStyle = g; cx.beginPath(); cx.moveTo(bx + f[0] - 22 * f[1], by); cx.quadraticCurveTo(bx + f[0] - 8, by - 70 * f[2] * flick, bx + f[0], by - 90 * f[2] * flick);
      cx.quadraticCurveTo(bx + f[0] + 8, by - 70 * f[2] * flick, bx + f[0] + 22 * f[1], by); cx.fill(); });
    if (Math.random() < 0.35) burst(1);
    if (Math.random() < 0.2) smoke.push({ x: bx + (Math.random() - .5) * 20, y: by - 80, vx: (Math.random() - .5) * 0.3, vy: -0.4 - Math.random() * 0.4, life: 1, r: 6 + Math.random() * 10 });
    smoke = smoke.filter(function (m) { m.x += m.vx; m.y += m.vy; m.life -= 0.008; m.r += 0.08; cx.fillStyle = "rgba(180,160,140," + (m.life * 0.18) + ")"; cx.beginPath(); cx.arc(m.x, m.y, m.r, 0, 7); cx.fill(); return m.life > 0; });
    sparks = sparks.filter(function (m) { m.x += m.vx; m.y += m.vy; m.vy -= 0.02; m.life -= 0.012; cx.fillStyle = "hsla(" + m.hue + ",100%,70%," + m.life + ")"; cx.beginPath(); cx.arc(m.x, m.y, m.r, 0, 7); cx.fill(); return m.life > 0; });
    if (dropping) { dropping.t += 0.018; dropping.y = H * 0.18 + (H * 0.55) * Math.min(1, dropping.t); var er = 10 + 4 * Math.sin(tm / 80);
      cx.fillStyle = "rgba(255,200,80,0.95)"; cx.shadowColor = "rgba(255,140,40,0.9)"; cx.shadowBlur = 18; cx.beginPath(); cx.arc(dropping.x, dropping.y, er, 0, 7); cx.fill(); cx.shadowBlur = 0;
      cx.fillStyle = "rgba(255,240,200,0.9)"; cx.font = "12px system-ui,sans-serif"; cx.textAlign = "center";
      var short = dropping.text.length > 28 ? dropping.text.slice(0, 26) + "…" : dropping.text; cx.fillText("« " + short + " »", dropping.x, dropping.y - 18); }
    requestAnimationFrame(frame); }
  function suggestions() { var l = siteLang(); var list = l === "en"
      ? ["Peace in my heart", "I am present", "Gentle courage", "I trust life", "Love that heals", "I begin again", "Gratitude", "I am light"]
      : ["La paix dans mon cœur", "Je suis présent·e", "Le courage doux", "Je fais confiance", "L’amour qui guérit", "Je recommence", "La gratitude", "Je suis lumière"];
    suggest.innerHTML = ""; list.forEach(function (txt) { var b = document.createElement("button"); b.type = "button"; b.className = "fc-chip"; b.textContent = txt;
      b.addEventListener("click", function () { input.value = txt; input.focus(); }); suggest.appendChild(b); }); }
  function bind() { layout(); suggestions(); renderJournal();
    form.addEventListener("submit", function (e) { e.preventDefault(); var text = (input.value || "").trim(); if (!text) { hintEl.textContent = t("fc.hintEmpty"); return; }
      if (!playable().length) { card.hidden = true; emptyBox.hidden = false; return; } drop(text); input.value = ""; });
    clearBtn.addEventListener("click", function () { try { if (ls()) ls().removeItem(LK); } catch (e) {} renderJournal(); countEl.textContent = ""; statusEl.textContent = t("fc.status"); hintEl.textContent = t("fc.hintIdle"); });
    window.addEventListener("resize", layout);
    if (window.EdenI18n && window.EdenI18n.onChange) window.EdenI18n.onChange(function () { stopSong(); suggestions(); renderJournal(); statusEl.textContent = t("fc.status"); hintEl.textContent = t("fc.hintIdle"); answerEl.hidden = true; });
    var toggle = $("nav-toggle"), links = $("nav-links"); if (toggle && links) toggle.addEventListener("click", function () { var o = links.classList.toggle("is-open"); toggle.setAttribute("aria-expanded", o ? "true" : "false"); });
    requestAnimationFrame(frame); }
  window.EdenFeu = { drop: function (text) { drop(text); }, state: function () { return { song: song ? { id: song.id, title: song.title, lang: song.lang } : null, dropping: !!dropping, answer: answerEl.hidden ? null : answerEl.textContent }; },
    score: function (intention, id) { var s = tracks.find(function (x) { return x.id === id; }); return s ? score(intention, s) : 0; }, pick: function (intention) { return pickFor(intention); } };
  Promise.all([
    fetch("tracks.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (r) { tracks = r.tracks || r || []; }).catch(function () {}),
    fetch("data/lyrics-sources.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (r) { lyrics = r || {}; }).catch(function () {}),
    fetch("data/categories.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (r) { cats = r || cats; }).catch(function () {})
  ]).then(function () { if (window.EdenSongPick && window.EdenSongPick.ready && window.EdenSongPick.ready.then) return window.EdenSongPick.ready; }).then(bind, bind);
})();
