/* Eden Yours — « Reconstruis la chanson » / « Rebuild the song ».
   Les couplets de VRAIES paroles (data/lyrics-sources.json) sont mélangés ; on les remet dans l'ordre
   (glisser-déposer pointeur souris + tactile, flèches ↑ ↓, touche-pour-échanger, clavier).
   Règles de découpage : voir data/rebuild-songs.json (« rules »). Quand l'ordre est juste : motif de victoire du site
   (EdenStars), bulles de lumière dorées, puis la chanson reconstruite joue EN ENTIER (EdenFullSong / embed Suno).
   Langue stricte : EdenSongPick.forLang ; le choix de manche passe par EdenSongPick.pick (sans répétition consécutive). */
(function () {
  "use strict";

  var GAME_ID = "rebuild";
  var $ = function (id) { return document.getElementById(id); };
  var listEl = $("rb-list"), overlay = $("rb-overlay"), overlayKicker = $("rb-overlay-kicker"),
    overlayTitle = $("rb-overlay-title"), overlayText = $("rb-overlay-text"), startBtn = $("rb-start"),
    againBtn = $("rb-again"), statusEl = $("rb-status"), scoreEl = $("rb-score"), hintEl = $("rb-hint"),
    liveEl = $("rb-live"), starsBox = $("rb-stars"), playerBox = $("rb-player"), nowEl = $("rb-now-playing"),
    embedBox = $("rb-embed"), audio = $("rb-audio"), listenBtn = $("rb-listen"), actions = $("rb-actions"),
    checkBtn = $("rb-check"), helpBtn = $("rb-help"), emptyBox = $("rb-empty"), card = $("rb-card"),
    stage = $("rb-stage"), celebrate = $("rb-celebrate");

  var cfg = null, tracks = [], lyrics = {};
  var state = "idle";                 // idle | playing | won
  var round = null;                   // { song, template, solution, cards, order }
  var moves = 0, hints = 0, wrongChecks = 0, selected = -1, drag = null, suppressClick = false;
  var loadFailed = false;

  function t(key, vars) { return window.EdenI18n && window.EdenI18n.t ? window.EdenI18n.t(key, vars) : key; }
  function siteLang() { return window.EdenSongPick ? window.EdenSongPick.lang() : (document.documentElement.lang === "en" ? "en" : "fr"); }
  function reduced() { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } }
  function say(msg) { if (liveEl) { liveEl.textContent = ""; setTimeout(function () { liveEl.textContent = msg; }, 30); } }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }

  /* ——— Découpage des paroles en strophes ——— */
  function norm(s) { return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim(); }
  var LABEL = /^(?:\[[^\]]*\]|\(?(?:final\s+)?(?:couplet|verse|refrain|chorus|pont|bridge|intro|outro|pre[- ]?chorus|pr[ée][- ]?refrain|hook)(?:\s+(?:final|\d+))*\)?\s*:?)$/i;
  function parseStanzas(text, title) {
    var first = String(text || "").replace(/\u00a0/g, " ").split(/\r?\n\s*-{3,}\s*\r?\n/)[0];     // 1re version seulement
    var lines = first.split(/\r?\n/).map(function (l) { return l.replace(/\s+$/, "").replace(/^\s+/, ""); });
    var out = [], cur = [];
    function flush() { if (cur.length) { out.push(cur); cur = []; } }
    var seenAny = false;
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i];
      if (!ln) { flush(); continue; }
      if (LABEL.test(ln)) { flush(); seenAny = true; continue; }
      if (!seenAny && !out.length && !cur.length && title && norm(ln) === norm(title) && !lines[i + 1]) { seenAny = true; continue; } // titre en tête
      seenAny = true;
      cur.push(ln);
    }
    flush();
    return out.map(function (ls) { return { lines: ls, key: norm(ls.join(" ")) }; });
  }
  /* strophes → { template: [{fixed, key, lines}], movable: [{key, lines}] } */
  function buildRound(stanzas) {
    var count = {};
    stanzas.forEach(function (s) { count[s.key] = (count[s.key] || 0) + 1; });
    var template = [], movable = [];
    stanzas.forEach(function (s) {
      if (count[s.key] > 1) template.push({ fixed: true, key: s.key, lines: s.lines });
      else { template.push({ fixed: false, key: s.key, lines: s.lines }); movable.push({ key: s.key, lines: s.lines }); }
    });
    return { template: template, movable: movable };
  }

  /* ——— Chargement ——— */
  function getJSON(url) { return fetch(url, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); }); }
  function load() {
    return Promise.all([getJSON("data/rebuild-songs.json"), getJSON("tracks.json"), getJSON("data/lyrics-sources.json")]).then(function (r) {
      cfg = r[0]; tracks = (r[1] && r[1].tracks) || r[1] || []; lyrics = r[2] || {};
    }).catch(function () { loadFailed = true; });
  }
  /* chansons jouables dans la langue de la page */
  function playable() {
    if (!cfg) return [];
    var max = cfg.maxMovable || 7, lang = siteLang(), out = [];
    var entries = (cfg.songs || []).filter(function (s) { return s.lang === lang; });
    entries.forEach(function (e) {
      var tr = tracks.filter(function (x) { return x.id === e.id; })[0], ly = lyrics[e.id];
      if (!tr || !ly || !ly.lyrics) return;
      if (window.EdenSongPick && !window.EdenSongPick.sameLang(tr, lang)) return;      // langue stricte (piste = langue de la page)
      var built = buildRound(parseStanzas(ly.lyrics, tr.title));
      if (built.movable.length < 3 || built.movable.length > max) return;
      out.push({ id: tr.id, title: tr.title, lang: tr.lang, cover: tr.cover_url || null, audio: tr.audio_url || null,
        aac: tr.audio_url_aac || null, embed: tr.embed_url || null, built: built });
    });
    return out;
  }

  /* ——— Rendu ——— */
  function startOf(c) { var s = c.lines[0] || ""; return s.length > 60 ? s.slice(0, 58) + "…" : s; }
  function makeCard(c, id) {
    var li = document.createElement("li");
    li.className = "rb-card-item"; li.setAttribute("data-card", String(id)); li.tabIndex = 0;
    li.innerHTML =
      '<span class="rb-handle" aria-hidden="true">⠿</span>' +
      '<p class="rb-text"></p>' +
      '<span class="rb-move"><button type="button" class="rb-mv rb-up"></button><button type="button" class="rb-mv rb-down"></button></span>';
    li.querySelector(".rb-text").textContent = c.lines.join("\n");
    var up = li.querySelector(".rb-up"), dn = li.querySelector(".rb-down");
    up.textContent = "↑"; dn.textContent = "↓";
    up.addEventListener("click", function (e) { e.stopPropagation(); moveBy(id, -1, up); });
    dn.addEventListener("click", function (e) { e.stopPropagation(); moveBy(id, 1, dn); });
    li.querySelector(".rb-text").addEventListener("click", function () { if (!suppressClick) tapSelect(id); });
    li.addEventListener("keydown", function (e) {
      if (state !== "playing") return;
      if (e.target !== li) return;
      if (e.key === "ArrowUp") { e.preventDefault(); moveBy(id, -1, li); }
      else if (e.key === "ArrowDown") { e.preventDefault(); moveBy(id, 1, li); }
      else if (e.key === " " || e.key === "Enter") { e.preventDefault(); tapSelect(id); }
      else if (e.key === "Escape" && selected >= 0) { selected = -1; refreshAttrs(); say(t("rebuild.unselected")); }
    });
    li.addEventListener("pointerdown", function (e) { onPointerDown(e, id, li); });
    return li;
  }
  function makeBand(item) {
    var li = document.createElement("li");
    li.className = "rb-band"; li.setAttribute("aria-label", t("rebuild.refrainAria"));
    var a = document.createElement("span"); a.textContent = t("rebuild.refrain");
    var b = document.createElement("span"); b.className = "rb-band-line"; b.setAttribute("aria-hidden", "true");
    b.textContent = "« " + (item.lines[0] || "") + " »";
    li.appendChild(a); li.appendChild(b);
    return li;
  }
  function newRound(song) {
    var built = song.built, solution = built.movable.map(function (m) { return m.key; });
    var order = built.movable.map(function (_, i) { return i; });
    var guard = 0;
    do { shuffle(order); guard++; } while (isSolved(order, built.movable) && guard < 50);
    round = { song: song, template: built.template, movable: built.movable, solution: solution, order: order, cardEls: [], bandEls: [] };
    listEl.innerHTML = "";
    built.movable.forEach(function (m, i) { round.cardEls.push(makeCard(m, i)); });
    round.template.forEach(function (it) { round.bandEls.push(it.fixed ? makeBand(it) : null); });
    layout();
  }
  function isSolved(order, movable) {
    for (var i = 0; i < order.length; i++) if (movable[order[i]].key !== movable[i].key) return false;
    return true;
  }
  /* range les <li> dans l'ordre du template (ordre DOM = ordre de lecture) */
  function layout() {
    var k = 0, frag = document.createDocumentFragment();
    round.template.forEach(function (it, pos) {
      if (it.fixed) frag.appendChild(round.bandEls[pos]);
      else frag.appendChild(round.cardEls[round.order[k++]]);
    });
    listEl.appendChild(frag);
    var els = listEl.querySelectorAll(".rb-card-item");
    for (var i = 0; i < els.length; i++) els[i].style.order = "";
    for (var j = 0; j < listEl.children.length; j++) listEl.children[j].style.order = "";
    refreshAttrs();
  }
  function posOf(id) { return round.order.indexOf(id); }
  function refreshAttrs() {
    var total = round.order.length;
    round.order.forEach(function (id, p) {
      var el = round.cardEls[id], c = round.movable[id];
      el.setAttribute("aria-label", t("rebuild.cardAria", { n: p + 1, total: total, start: startOf(c) }));
      el.classList.toggle("is-selected", selected === id);
      el.setAttribute("aria-current", selected === id ? "true" : "false");
      var up = el.querySelector(".rb-up"), dn = el.querySelector(".rb-down");
      up.setAttribute("aria-label", t("rebuild.up")); dn.setAttribute("aria-label", t("rebuild.down"));
      up.disabled = p === 0 || state !== "playing"; dn.disabled = p === total - 1 || state !== "playing";
      el.querySelector(".rb-handle").setAttribute("title", t("rebuild.handleAria"));
    });
  }
  function updateHud() {
    if (statusEl) statusEl.textContent = state === "idle" ? t("rebuild.ready") : state === "won" ? t("rebuild.wonStatus") : t("rebuild.status");
    if (scoreEl) scoreEl.textContent = state === "idle" ? "" : t("rebuild.moves", { n: moves });
  }

  /* ——— Déplacements ——— */
  function moveBy(id, d, focusEl) {
    if (state !== "playing") return;
    var p = posOf(id), q = p + d;
    if (q < 0 || q >= round.order.length) return;
    round.order.splice(p, 1); round.order.splice(q, 0, id);
    moves++; selected = -1; layout(); updateHud();
    say(t("rebuild.movedTo", { pos: q + 1, total: round.order.length }));
    var el = round.cardEls[id], tgt = focusEl && focusEl.classList && focusEl.classList.contains("rb-card-item") ? el : el.querySelector(d < 0 ? ".rb-up" : ".rb-down");
    if (tgt && tgt.disabled) tgt = el;
    try { tgt.focus({ preventScroll: true }); } catch (e) {}
    afterChange();
  }
  function tapSelect(id) {
    if (state !== "playing") return;
    if (selected < 0) { selected = id; refreshAttrs(); say(t("rebuild.selected")); return; }
    if (selected === id) { selected = -1; refreshAttrs(); say(t("rebuild.unselected")); return; }
    var a = posOf(selected), b = posOf(id), tmp = round.order[a];
    round.order[a] = round.order[b]; round.order[b] = tmp;
    moves++; selected = -1; layout(); updateHud(); say(t("rebuild.swapped"));
    afterChange();
  }
  function afterChange() {
    if (isSolved(round.order, round.movable)) win();
  }

  /* ——— Glisser-déposer (pointeur : souris + tactile ; poignée ⠿ au doigt, toute la carte à la souris) ——— */
  var scrollRaf = 0, lastY = 0;
  function onPointerDown(e, id, li) {
    if (state !== "playing" || drag) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.target.closest && e.target.closest(".rb-mv")) return;
    var onHandle = !!(e.target.closest && e.target.closest(".rb-handle"));
    if (e.pointerType !== "mouse" && !onHandle) return;   // au doigt : le corps de la carte fait défiler la page / touche = échanger
    var rect = li.getBoundingClientRect();
    drag = { id: id, li: li, pid: e.pointerId, startX: e.clientX, startY: e.clientY, offY: e.clientY - rect.top, active: false, target: e.target };
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    if (onHandle) { try { li.setPointerCapture(e.pointerId); } catch (x) {} }
  }
  function applyOrders() {
    // pendant le glisser : on n'ose pas déplacer le nœud (capture du pointeur) → CSS order
    var k = 0;
    round.template.forEach(function (it, pos) {
      var el = it.fixed ? round.bandEls[pos] : round.cardEls[round.order[k++]];
      el.style.order = String(pos);
    });
  }
  function placeDragged(clientY) {
    var li = drag.li;
    li.style.transform = "none";
    var others = round.order.filter(function (i) { return i !== drag.id; }), n = 0;
    others.forEach(function (i) { var r = round.cardEls[i].getBoundingClientRect(); if (r.top + r.height / 2 < clientY - drag.offY + li.offsetHeight / 2) n++; });
    var cur = posOf(drag.id);
    if (n !== cur) {
      round.order.splice(cur, 1); round.order.splice(n, 0, drag.id);
      applyOrders();
    }
    var nat = li.getBoundingClientRect().top;
    li.style.transform = "translateY(" + Math.round(clientY - drag.offY - nat) + "px)";
  }
  function onPointerMove(e) {
    if (!drag || e.pointerId !== drag.pid) return;
    var dy = e.clientY - drag.startY, dx = e.clientX - drag.startX;
    if (!drag.active) {
      if (Math.abs(dy) < 4 && Math.abs(dx) < 4) return;
      drag.active = true;
      drag.li.classList.add("is-dragging");
      selected = -1; refreshAttrs();
      applyOrders();
      say(t("rebuild.dragging"));
    }
    e.preventDefault();
    lastY = e.clientY;
    placeDragged(e.clientY);
    if (!scrollRaf) scrollRaf = requestAnimationFrame(autoScroll);
  }
  function autoScroll() {
    scrollRaf = 0;
    if (!drag || !drag.active) return;
    var vh = window.innerHeight, step = 0;
    if (lastY < 70) step = -Math.ceil((70 - lastY) / 5); else if (lastY > vh - 70) step = Math.ceil((lastY - (vh - 70)) / 5);
    if (step) { window.scrollBy(0, step); placeDragged(lastY); }
    scrollRaf = requestAnimationFrame(autoScroll);
  }
  function onPointerUp(e) {
    if (!drag || (e && e.pointerId !== drag.pid)) return;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
    if (scrollRaf) { cancelAnimationFrame(scrollRaf); scrollRaf = 0; }
    var d = drag; drag = null;
    try { d.li.releasePointerCapture(d.pid); } catch (x) {}
    if (!d.active) return;
    d.li.classList.remove("is-dragging"); d.li.style.transform = "";
    suppressClick = true; setTimeout(function () { suppressClick = false; }, 60);
    moves++; layout(); updateHud();
    say(t("rebuild.movedTo", { pos: posOf(d.id) + 1, total: round.order.length }));
    afterChange();
  }

  /* ——— Indices doux (jamais d'échec) ——— */
  function inPlace() {
    var n = 0; round.order.forEach(function (id, p) { if (round.movable[id].key === round.solution[p]) n++; }); return n;
  }
  function onCheck() {
    if (state !== "playing") return;
    var n = inPlace();
    wrongChecks++;
    round.order.forEach(function (id, p) { round.cardEls[id].classList.toggle("is-placed", round.movable[id].key === round.solution[p]); });
    hintEl.textContent = n === 0 ? t("rebuild.checkNone") : n === 1 ? t("rebuild.checkOne") : t("rebuild.checkMany", { n: n });
    say(hintEl.textContent);
    setTimeout(function () { round && round.cardEls.forEach(function (el) { el.classList.remove("is-placed"); }); }, 2600);
  }
  function onHelp() {
    if (state !== "playing") return;
    hints++;
    var p = -1;
    for (var i = 0; i < round.order.length; i++) if (round.movable[round.order[i]].key !== round.solution[i]) { p = i; break; }
    if (p < 0) return;
    // le couplet qui appartient à la place p brille doucement
    var rightId = -1;
    round.movable.forEach(function (m, i) { if (m.key === round.solution[p]) rightId = i; });
    var el = round.cardEls[rightId];
    el.classList.remove("is-nudge"); void el.offsetWidth; el.classList.add("is-nudge");
    setTimeout(function () { el.classList.remove("is-nudge"); }, 3400);
    hintEl.textContent = t("rebuild.helpMsg", { pos: p + 1 });
    say(hintEl.textContent);
  }

  /* ——— Victoire ——— */
  function starsForWin() { var n = hints + wrongChecks; return n === 0 ? 3 : n <= 2 ? 2 : 1; }
  function bubbles() {
    if (!celebrate) return;
    celebrate.innerHTML = "";
    stage.classList.add("is-glow");
    if (reduced()) return;
    var N = window.innerWidth < 520 ? 22 : 34, h = stage.clientHeight || 360;
    for (var i = 0; i < N; i++) {
      var b = document.createElement("i");
      b.className = "rb-bubble" + (i % 4 === 0 ? " is-spark" : "");
      b.style.setProperty("--x", (4 + Math.random() * 92).toFixed(1) + "%");
      b.style.setProperty("--s", (i % 4 === 0 ? 6 + Math.random() * 6 : 12 + Math.random() * 26).toFixed(1) + "px");
      b.style.setProperty("--d", (Math.random() * 1.1).toFixed(2) + "s");
      b.style.setProperty("--t", (2.8 + Math.random() * 2.2).toFixed(2) + "s");
      b.style.setProperty("--dx", (Math.random() * 70 - 35).toFixed(0) + "px");
      b.style.setProperty("--h", Math.round(h * (0.55 + Math.random() * 0.6)) + "px");
      celebrate.appendChild(b);
    }
    setTimeout(function () { if (celebrate) celebrate.innerHTML = ""; }, 6200);
  }
  function win() {
    if (state !== "playing") return;
    state = "won"; selected = -1;
    listEl.classList.add("is-won");
    round.order.forEach(function (id, p) { var el = round.cardEls[id]; el.style.setProperty("--k", String(p)); el.classList.add("is-won"); el.removeAttribute("tabindex"); });
    refreshAttrs(); updateHud();
    if (actions) actions.hidden = true;
    var stars = starsForWin(), rec = window.EdenStars ? window.EdenStars.record(GAME_ID, stars) : { session: stars, best: stars };
    if (window.EdenStars) {
      window.EdenStars.play(stars);                        // même motif de victoire que casse-tête / blind test / mémoire
      window.EdenStars.render(starsBox, stars, { line: t("rebuild.star" + stars), detail: t("rebuild.starDetail", { moves: moves, hints: hints }), session: rec });
    }
    bubbles();
    hintEl.textContent = t("rebuild.hintWin");
    say(t("rebuild.wonText", { title: round.song.title }));
    if (againBtn) { againBtn.hidden = false; againBtn.textContent = t("rebuild.again"); }
    playSong(round.song);
    try { stage.scrollIntoView({ block: "nearest", behavior: reduced() ? "auto" : "smooth" }); } catch (e) {}
  }

  /* chanson reconstruite, EN ENTIER (aucun minuteur d'arrêt ; une chanson déjà en cours n'est pas coupée) */
  function clearEmbed() { if (embedBox) { embedBox.innerHTML = ""; embedBox.hidden = true; } }
  function stopSong() {
    if (window.EdenFullSong) window.EdenFullSong.stop(audio); else try { audio.pause(); } catch (e) {}
    clearEmbed();
    if (listenBtn) listenBtn.hidden = true;
    if (playerBox) playerBox.hidden = true;
  }
  function playSong(song) {
    if (!song || !playerBox) return;
    playerBox.hidden = false;
    if (nowEl) nowEl.textContent = t("rebuild.playing", { title: song.title });
    var F = window.EdenFullSong, same = audio && audio.getAttribute("data-id") === song.id;
    if (F && F.busy(audio) && !same) {                       // autre chanson déjà en cours : on ne la coupe pas, on propose
      if (listenBtn) {
        listenBtn.hidden = false; listenBtn.textContent = t("rebuild.listen", { title: song.title });
        listenBtn.onclick = function () { listenBtn.hidden = true; F.stop(audio); startSong(song); };
      }
      return;
    }
    if (F && F.busy(audio) && same) return;                  // la même chanson continue
    startSong(song);
  }
  function startSong(song) {
    var F = window.EdenFullSong;
    if (nowEl) nowEl.textContent = t("rebuild.playing", { title: song.title });
    playerBox.hidden = false;
    if (song.audio || song.aac) {
      clearEmbed(); audio.hidden = false;
      if (F) F.play(audio, { id: song.id, audio: song.audio, aac: song.aac });
      else { audio.src = song.audio; try { audio.currentTime = 0; } catch (e) {} var p = audio.play(); if (p && p.catch) p.catch(function () {}); }
    } else if (song.embed) {
      audio.hidden = true;
      if (F) F.embed(embedBox, { id: song.id, embed: song.embed, title: song.title });
    }
  }

  /* ——— Cycle de jeu ——— */
  function showOverlay(show) { if (overlay) overlay.classList.toggle("is-hidden", !show); }
  function startGame() {
    if (window.EdenStars && window.EdenStars.unlock) window.EdenStars.unlock();
    if (window.EdenStars) window.EdenStars.clear(starsBox);
    var pool = playable();
    if (!pool.length) { card.hidden = true; emptyBox.hidden = false; return; }
    card.hidden = false; emptyBox.hidden = true;
    var pick = window.EdenSongPick ? window.EdenSongPick.pick(pool, { record: false }) : pool[Math.floor(Math.random() * pool.length)];
    moves = 0; hints = 0; wrongChecks = 0; selected = -1; state = "playing";
    stage.classList.remove("is-glow"); if (celebrate) celebrate.innerHTML = "";
    listEl.classList.remove("is-won");
    newRound(pick);
    listEl.hidden = false; showOverlay(false);
    if (startBtn) startBtn.hidden = true;
    if (againBtn) againBtn.hidden = true;
    if (actions) actions.hidden = false;
    hintEl.textContent = t("rebuild.hintPlay");
    updateHud();
  }
  function showWelcome() {
    state = "idle"; round = null; selected = -1;
    showOverlay(true);
    overlayKicker.textContent = t("rebuild.welcomeKicker");
    overlayTitle.textContent = t("rebuild.welcomeTitle");
    overlayText.textContent = t("rebuild.welcomeText");
    startBtn.hidden = false; startBtn.textContent = t("rebuild.start");
    againBtn.hidden = true; if (actions) actions.hidden = true;
    listEl.hidden = true; listEl.innerHTML = ""; listEl.classList.remove("is-won");
    stage.classList.remove("is-glow"); if (celebrate) celebrate.innerHTML = "";
    if (window.EdenStars) window.EdenStars.clear(starsBox);
    hintEl.textContent = t("rebuild.hintIdle");
    updateHud();
  }
  function bind() {
    startBtn.addEventListener("click", startGame);
    againBtn.addEventListener("click", startGame);
    checkBtn.addEventListener("click", onCheck);
    helpBtn.addEventListener("click", onHelp);
    if (window.EdenI18n && window.EdenI18n.onChange) {
      window.EdenI18n.onChange(function () { stopSong(); init(); });   // langue changée : on arrête la chanson, nouveau corpus
    }
    var toggle = $("nav-toggle"), links = $("nav-links");
    if (toggle && links) toggle.addEventListener("click", function () {
      var open = links.classList.toggle("is-open"); toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    init();
  }
  function init() {
    if (loadFailed) { showWelcome(); hintEl.textContent = t("rebuild.loadError"); startBtn.hidden = true; return; }
    if (!playable().length) { card.hidden = true; emptyBox.hidden = false; return; }
    card.hidden = false; emptyBox.hidden = true;
    showWelcome();
  }

  window.EdenRebuild = { parseStanzas: parseStanzas, buildRound: buildRound, playable: function () { return playable().map(function (s) { return { id: s.id, title: s.title, lang: s.lang }; }); } };
  load().then(function () {
    if (window.EdenSongPick && window.EdenSongPick.ready && window.EdenSongPick.ready.then) return window.EdenSongPick.ready;
  }).then(bind, bind);
})();
