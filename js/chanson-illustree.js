/* Eden Yours — Chanson illustrée (chanson-grand-poumon.html), sur le modèle du conte (js/conte.js).
   Chaque ligne des paroles (span.beat[data-beat][data-t]) a son image. En lisant (défilement) ou avec « Suite »,
   l'image de la ligne en cours apparaît en fondu. ▶ (en haut et à la fin) lance la chanson en entier via EdenFullSong
   (lecteur Suno) ; les images suivent alors la chanson selon un minutage approximatif (data-t, en secondes) :
   on ne peut pas lire le temps du lecteur Suno, alors une horloge part au ▶ ; −5 s / +5 s pour recaler, ⏸ pour arrêter. */
(function () {
  "use strict";
  var SONG = { id: "0d719cb9-cd9e-4bf8-bc1e-3ee90dbe2345", title: "Le Grand Poumon", embed_url: "https://suno.com/embed/0d719cb9-cd9e-4bf8-bc1e-3ee90dbe2345" };
  var DURATION = 222.8;
  var scenes = [].slice.call(document.querySelectorAll(".conte-scene"));
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("conte-js");

  function setBeat(scene, id) {
    if (scene.getAttribute("data-on") === id) return;
    scene.setAttribute("data-on", id);
    scene.querySelectorAll("[data-beat]").forEach(function (el) { el.classList.toggle("is-on", el.getAttribute("data-beat") === id); });
    var imgs = [].slice.call(scene.querySelectorAll(".conte-img")), i = imgs.findIndex(function (m) { return m.getAttribute("data-beat") === id; });
    if (imgs[i + 1]) imgs[i + 1].loading = "eager";
    // la ligne en cours s'affiche aussi sur l'image (le texte de la scène passe sous l'image fixée en défilant)
    var line = scene.querySelector('.beat[data-beat="' + id + '"]'), fig = scene.querySelector(".conte-fig");
    if (line && fig) {
      var cap = fig.querySelector(".gp-cap");
      if (!cap) { cap = document.createElement("figcaption"); cap.className = "gp-cap"; cap.setAttribute("aria-live", "polite"); fig.appendChild(cap); }
      cap.classList.remove("is-new"); void cap.offsetWidth; cap.textContent = line.textContent; cap.classList.add("is-new");
    }
  }
  function show(s) {
    if (!s || s.classList.contains("is-in")) return;
    s.classList.add("is-in");
    s.querySelectorAll(".conte-img").forEach(function (m) { m.loading = "eager"; });
  }
  scenes.forEach(function (s) { var b = s.querySelector(".beat"); if (b) setBeat(s, b.getAttribute("data-beat")); });
  if (reduce || !("IntersectionObserver" in window)) scenes.forEach(show);
  else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
    scenes.forEach(function (s) { io.observe(s); });
  }

  var manual = 0;
  scenes.forEach(function (s) { s.style.setProperty("--extra", Math.max(0, s.querySelectorAll(".beat").length - 1)); });
  function geom(s) {
    var fig = s.querySelector(".conte-fig"), stick = parseFloat(getComputedStyle(fig).top) || 70;
    // l'image reste fixée tant que son bas n'atteint pas le bas de la scène : course = hauteur de la scène − image
    return { stick: stick, range: Math.max(1, s.offsetHeight - fig.offsetHeight - window.innerHeight * 0.3) };
  }
  function yFor(s, i, n) { var g = geom(s); return s.getBoundingClientRect().top + window.scrollY - g.stick - 4 + g.range * (i + 0.5) / n; }
  function onScroll() {
    if (Date.now() < manual) return;
    scenes.forEach(function (s) {
      var r = s.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      var beats = s.querySelectorAll(".beat"); if (!beats.length) return;
      var g = geom(s), prog = (g.stick + 4 - r.top) / g.range;
      var i = Math.max(0, Math.min(beats.length - 1, Math.floor(prog * beats.length)));
      setBeat(s, beats[i].getAttribute("data-beat"));
    });
  }
  var tick = false;
  window.addEventListener("scroll", function () { if (!tick) { tick = true; requestAnimationFrame(function () { tick = false; onScroll(); }); } }, { passive: true });
  // Le texte de la scène reste fixé juste sous l'image quand il tient dans l'écran (téléphone et ordinateur)
  function pinText() {
    scenes.forEach(function (s) {
      var fig = s.querySelector(".conte-fig"), tx = s.querySelector(".conte-text"); if (!fig || !tx) return;
      var top = (parseFloat(getComputedStyle(fig).top) || 70) + fig.offsetHeight + 10;
      var fits = top + tx.offsetHeight + 8 < window.innerHeight;
      tx.classList.toggle("gp-pin", fits); tx.style.top = fits ? top + "px" : "";
    });
  }
  pinText();
  window.addEventListener("resize", function () { pinText(); onScroll(); });

  scenes.forEach(function (s, si) {
    var btn = s.querySelector(".conte-next");
    if (!btn) return;
    btn.addEventListener("click", function () {
      pauseFollow();
      var beats = [].slice.call(s.querySelectorAll(".beat"));
      var i = beats.findIndex(function (b) { return b.getAttribute("data-beat") === s.getAttribute("data-on"); });
      if (i < beats.length - 1) {
        manual = Date.now() + 1400;
        setBeat(s, beats[i + 1].getAttribute("data-beat"));
        window.scrollTo({ top: yFor(s, i + 1, beats.length), behavior: reduce ? "auto" : "smooth" });
        return;
      }
      var n = scenes[si + 1]; if (!n) return;
      show(n); manual = Date.now() + 1200;
      n.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
  });
  scenes.forEach(function (s) {
    var fig = s.querySelector(".conte-fig"), beats = [].slice.call(s.querySelectorAll(".beat"));
    if (!fig || beats.length < 2) return;
    fig.addEventListener("click", function () {
      pauseFollow();
      var i = beats.findIndex(function (b) { return b.getAttribute("data-beat") === s.getAttribute("data-on"); });
      manual = Date.now() + 1500;
      setBeat(s, beats[(i + 1) % beats.length].getAttribute("data-beat"));
    });
  });

  // ---- Les images suivent la chanson (horloge approximative à partir du ▶) ----
  var all = [].slice.call(document.querySelectorAll(".beat[data-t]")).map(function (b) {
    return { el: b, t: parseFloat(b.getAttribute("data-t")) || 0, scene: b.closest(".conte-scene") };
  });
  var bar = document.querySelector(".gp-follow"), toggle = bar && bar.querySelector(".gp-toggle");
  var t0 = 0, offset = 0, following = false, timer = null, last = null;
  function now() { return (Date.now() - t0) / 1000 + offset; }
  function step() {
    var t = now();
    if (t > DURATION + 2) { stopFollow(); return; }
    var cur = null;
    for (var i = 0; i < all.length; i++) { if (all[i].t <= t) cur = all[i]; else break; }
    if (!cur || cur === last) return;
    last = cur;
    var s = cur.scene, beats = [].slice.call(s.querySelectorAll(".beat")), k = beats.indexOf(cur.el);
    show(s); setBeat(s, cur.el.getAttribute("data-beat"));
    manual = Date.now() + 1300;
    window.scrollTo({ top: yFor(s, k, beats.length), behavior: reduce ? "auto" : "smooth" });
  }
  function startFollow(fromStart) {
    if (fromStart) { t0 = Date.now(); offset = 0; }
    following = true; last = null;
    if (bar) bar.hidden = false;
    if (toggle) toggle.textContent = "⏸ Arrêter";
    clearInterval(timer); timer = setInterval(step, 400); step();
  }
  var pausedAt = null;
  function pauseFollow() {
    if (!following) return;
    following = false; clearInterval(timer); pausedAt = now();
    if (toggle) toggle.textContent = "▶ Suivre la chanson";
  }
  function stopFollow() { following = false; clearInterval(timer); pausedAt = null; if (bar) bar.hidden = true; }
  if (bar) bar.addEventListener("click", function (e) {
    var b = e.target.closest("[data-gp]"); if (!b) return;
    var a = b.getAttribute("data-gp");
    if (a === "toggle") {
      if (following) pauseFollow();
      else { if (pausedAt != null) { t0 = Date.now(); offset = pausedAt; } startFollow(false); }
    } else {
      var d = a === "back" ? -5 : 5;
      if (following) { offset += d; last = null; step(); }
      else if (pausedAt != null) pausedAt = Math.max(0, pausedAt + d);
    }
  });
  // Le visiteur fait défiler lui-même : on arrête de suivre (il peut reprendre avec ▶ Suivre)
  ["wheel", "touchmove"].forEach(function (ev) { window.addEventListener(ev, function () { if (following && Date.now() > manual) pauseFollow(); }, { passive: true }); });
  window.addEventListener("keydown", function (e) { if (/^(Arrow|Page|Home|End| )/.test(e.key) && e.target === document.body) pauseFollow(); });

  document.querySelectorAll(".conte-play").forEach(function (b, bi) {
    b.addEventListener("click", function () {
      var box = b.parentNode.querySelector(".conte-embed");
      document.querySelectorAll(".conte-embed").forEach(function (o) { if (o !== box) { o.innerHTML = ""; o.hidden = true; } });
      if (window.EdenFullSong) window.EdenFullSong.embed(box, SONG);
      else { box.innerHTML = '<iframe src="' + SONG.embed_url + '" title="Suno" allow="autoplay" style="width:100%;height:180px;border:0"></iframe>'; box.hidden = false; }
      b.classList.add("is-playing");
      if (bi === 0) { playedAt = Date.now(); setTimeout(function () { startFollow(true); }, 1500); } // ▶ du haut : lire en suivant
      else stopFollow(); // ▶ de la fin : écoute seule
    });
  });
  // Si le lecteur Suno demande un toucher sur son propre ▶ (pas de lecture automatique), on recale l'horloge
  // au moment où le visiteur touche le lecteur (la page perd le focus au profit de l'iframe), dans les 25 s qui suivent.
  var playedAt = 0;
  window.addEventListener("blur", function () {
    setTimeout(function () {
      var a = document.activeElement;
      if (a && a.tagName === "IFRAME" && playedAt && Date.now() - playedAt < 25000) {
        playedAt = 0; t0 = Date.now(); offset = 0; last = null; if (!following) startFollow(false);
      }
    }, 0);
  });
  function note() {
    var l = (window.EdenSongPick && window.EdenSongPick.lang()) || document.documentElement.lang || "fr";
    var p = document.querySelector(".conte-fr-note"); if (p) p.hidden = (l !== "en");
  }
  note(); document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest(".lang-btn")) setTimeout(note, 50); });
  onScroll();
})();
