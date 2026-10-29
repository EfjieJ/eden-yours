/* Eden Yours — Conte illustré (conte-blanchette.html, conte-petit-prince.html).
   Chaque scène a plusieurs images, chacune liée à une phrase (span.beat[data-beat]).
   En lisant (défilement) ou avec « Suite », l'image de la phrase en cours apparaît en fondu.
   La 1re image de chaque scène se « construit » doucement quand la scène entre à l'écran.
   ▶ en haut (lire en écoutant) et à la fin : la chanson du conte, via EdenFullSong (lecteur Suno). */
(function () {
  "use strict";
  // Chanson du conte : <body data-conte-song="<id du clip Suno>" data-conte-song-title="…"> ; sans attribut = Blanchette.
  var sid = document.body.getAttribute("data-conte-song"), stitle = document.body.getAttribute("data-conte-song-title");
  // Pas de chanson par défaut : sans data-conte-song valide (ou « none »), ou sur une page EN sans id propre, on ne joue rien.
  if (sid === "none" || sid === "") sid = null;
  var SONG = sid ? { id: sid, title: stitle || document.title, embed_url: "https://suno.com/embed/" + sid }
    : (document.body.hasAttribute("data-conte-song") || document.body.getAttribute("data-conte-lang") === "en" || (document.documentElement.lang || "").slice(0, 2) === "en") ? null
    : { id: "4ec00297-cac3-40f7-8e48-9f12f59ac0d4", title: "La Septième Chèvre de Monsieur Seguin et la Lumière", embed_url: "https://suno.com/embed/4ec00297-cac3-40f7-8e48-9f12f59ac0d4" };
  // Conte bilingue : <body data-conte-lang="fr|en" data-conte-pair="page de l'autre langue">.
  // Si la langue du site n'est pas celle de la page (au chargement ou au clic FR/EN), on va à la version traduite :
  // la page anglaise ne joue que la chanson anglaise, la française que la française.
  var PL = document.body.getAttribute("data-conte-lang"), PAIR = document.body.getAttribute("data-conte-pair");
  function siteLang() { return (window.EdenSongPick && window.EdenSongPick.lang()) || ((document.documentElement.lang || "fr").slice(0, 2) === "en" ? "en" : "fr"); }
  function toPair() {
    if (!PL || !PAIR) return false;
    var l = siteLang(); if (l === PL) return false;
    location.replace(PAIR + "?lang=" + l + location.hash); return true;
  }
  if (toPair()) return;
  // Sélecteur FR / EN du conte : le lien garde SA langue (le site réécrit sinon ?lang= avec la langue courante).
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest(".conte-lang-pick a[hreflang]"); if (!a) return;
    var l = a.getAttribute("hreflang"); e.preventDefault(); e.stopPropagation();
    try { localStorage.setItem("eden-lang", l); } catch (x) {}
    location.href = a.getAttribute("href").split("?")[0] + "?lang=" + l;
  }, true);
  document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest(".lang-btn, [data-set-lang], [data-pill-lang]")) setTimeout(toPair, 60); });
  var scenes = [];
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
  var io = (reduce || !("IntersectionObserver" in window)) ? null : new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });

  // Phrase en cours = selon l'avancée dans la scène pendant que l'image reste fixée en haut :
  // chaque phrase reçoit une part égale du défilement (la scène a un espace de défilement par phrase).
  var manual = 0;
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

  // Mise en place d'une scène (au chargement, ou plus tard pour des scènes ajoutées : EdenConte.add).
  function setup(s) {
    if (s.__conte) return; s.__conte = 1;
    scenes.push(s);
    var b0 = s.querySelector(".beat"); if (b0) setBeat(s, b0.getAttribute("data-beat"));
    if (io) io.observe(s); else show(s);
    s.style.setProperty("--extra", Math.max(0, s.querySelectorAll(".beat").length - 1));
    // « Suite » : phrase suivante de la scène (fondu d'image), puis scène suivante.
    var btn = s.querySelector(".conte-next");
    if (btn) btn.addEventListener("click", function () {
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
      var n = scenes[scenes.indexOf(s) + 1];
      var target = n || document.querySelector(".conte-end"); if (!target) return;
      if (n) show(n);
      manual = Date.now() + 1200;
      target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
    // Toucher l'image = image suivante de la scène (comme « Suite », sans changer de scène)
    var fig = s.querySelector(".conte-fig"), beats = [].slice.call(s.querySelectorAll(".beat"));
    if (fig && beats.length > 1) fig.addEventListener("click", function () {
      var i = beats.findIndex(function (b) { return b.getAttribute("data-beat") === s.getAttribute("data-on"); });
      manual = Date.now() + 1500;
      setBeat(s, beats[(i + 1) % beats.length].getAttribute("data-beat"));
    });
  }
  function add(list) { [].forEach.call(list || [], setup); onScroll(); }
  add(document.querySelectorAll(".conte-scene"));
  window.EdenConte = { add: add };

  document.querySelectorAll(".conte-play").forEach(function (b) {
    b.addEventListener("click", function () {
      if (!SONG) { b.hidden = true; return; }
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
