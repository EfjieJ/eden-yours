/* Eden Yours — Conte illustré (conte-blanchette.html, conte-petit-prince.html).
   Chaque scène a plusieurs images, chacune liée à une phrase (span.beat[data-beat]).
   En lisant (défilement) ou avec « Suite », l'image de la phrase en cours apparaît en fondu.
   La 1re image de chaque scène se « construit » doucement quand la scène entre à l'écran.
   ▶ en haut (lire en écoutant) et à la fin : la chanson du conte, via EdenFullSong (lecteur Suno). */
(function () {
  "use strict";
  // Chanson du conte : <body data-conte-song="<id du clip Suno>" data-conte-song-title="…"> ; sans attribut = Blanchette.
  var sid = document.body.getAttribute("data-conte-song"), stitle = document.body.getAttribute("data-conte-song-title");
  var SONG = sid ? { id: sid, title: stitle || document.title, embed_url: "https://suno.com/embed/" + sid }
    : { id: "4ec00297-cac3-40f7-8e48-9f12f59ac0d4", title: "La Septième Chèvre de Monsieur Seguin et la Lumière", embed_url: "https://suno.com/embed/4ec00297-cac3-40f7-8e48-9f12f59ac0d4" };
  var scenes = [].slice.call(document.querySelectorAll(".conte-scene"));
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("conte-js");

  function setBeat(scene, id) {
    if (scene.getAttribute("data-on") === id) return;
    scene.setAttribute("data-on", id);
    scene.querySelectorAll("[data-beat]").forEach(function (el) { el.classList.toggle("is-on", el.getAttribute("data-beat") === id); });
    // précharge l'image suivante
    var imgs = [].slice.call(scene.querySelectorAll(".conte-img")), i = imgs.findIndex(function (m) { return m.getAttribute("data-beat") === id; });
    if (imgs[i + 1]) imgs[i + 1].loading = "eager";
  }
  function show(s) {
    if (s.classList.contains("is-in")) return;
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

  // Phrase en cours = selon l'avancée dans la scène pendant que l'image reste fixée en haut :
  // chaque phrase reçoit une part égale du défilement (la scène a un espace de défilement par phrase).
  var manual = 0;
  scenes.forEach(function (s) { s.style.setProperty("--extra", Math.max(0, s.querySelectorAll(".beat").length - 1)); });
  function onScroll() {
    if (Date.now() < manual) return;
    scenes.forEach(function (s) {
      var r = s.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      var beats = s.querySelectorAll(".beat"); if (!beats.length) return;
      var fig = s.querySelector(".conte-fig"), stick = parseFloat(getComputedStyle(fig).top) || 70;
      var range = Math.max(1, s.offsetHeight - fig.offsetHeight - window.innerHeight * 0.25);
      var prog = (stick + 4 - r.top) / range;
      var i = Math.max(0, Math.min(beats.length - 1, Math.floor(prog * beats.length)));
      setBeat(s, beats[i].getAttribute("data-beat"));
    });
  }
  var tick = false;
  window.addEventListener("scroll", function () { if (!tick) { tick = true; requestAnimationFrame(function () { tick = false; onScroll(); }); } }, { passive: true });
  window.addEventListener("resize", onScroll);

  // « Suite » : phrase suivante de la scène (fondu d'image), puis scène suivante.
  scenes.forEach(function (s, si) {
    var btn = s.querySelector(".conte-next");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var beats = [].slice.call(s.querySelectorAll(".beat"));
      var i = beats.findIndex(function (b) { return b.getAttribute("data-beat") === s.getAttribute("data-on"); });
      if (i < beats.length - 1) {
        manual = Date.now() + 1400;
        setBeat(s, beats[i + 1].getAttribute("data-beat"));
        // défile jusqu'à la position qui correspond à cette phrase (le défilement suivant reste cohérent)
        var fig = s.querySelector(".conte-fig"), stick = parseFloat(getComputedStyle(fig).top) || 70;
        var range = Math.max(1, s.offsetHeight - fig.offsetHeight - window.innerHeight * 0.25);
        var y = s.getBoundingClientRect().top + window.scrollY - stick - 4 + range * (i + 1.5) / beats.length;
        window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
        return;
      }
      var n = scenes[si + 1]; if (!n) return;
      show(n);
      manual = Date.now() + 1200;
      n.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
  });
  // Toucher l'image = image suivante de la scène (comme « Suite », sans changer de scène)
  scenes.forEach(function (s) {
    var fig = s.querySelector(".conte-fig"), beats = [].slice.call(s.querySelectorAll(".beat"));
    if (!fig || beats.length < 2) return;
    fig.addEventListener("click", function () {
      var i = beats.findIndex(function (b) { return b.getAttribute("data-beat") === s.getAttribute("data-on"); });
      manual = Date.now() + 1500;
      setBeat(s, beats[(i + 1) % beats.length].getAttribute("data-beat"));
    });
  });

  document.querySelectorAll(".conte-play").forEach(function (b) {
    b.addEventListener("click", function () {
      var box = b.parentNode.querySelector(".conte-embed");
      document.querySelectorAll(".conte-embed").forEach(function (o) { if (o !== box) { o.innerHTML = ""; o.hidden = true; } });
      if (window.EdenFullSong) window.EdenFullSong.embed(box, SONG);
      else { box.innerHTML = '<iframe src="' + SONG.embed_url + '" title="Suno" allow="autoplay" style="width:100%;height:180px;border:0"></iframe>'; box.hidden = false; }
      b.classList.add("is-playing");
    });
  });
  // Page en français seulement : en anglais, une petite note le dit (le conte n'est pas traduit).
  function note() {
    var l = (window.EdenSongPick && window.EdenSongPick.lang()) || document.documentElement.lang || "fr";
    var p = document.querySelector(".conte-fr-note"); if (p) p.hidden = (l !== "en");
  }
  note(); document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest(".lang-btn")) setTimeout(note, 50); });
  onScroll();
})();
