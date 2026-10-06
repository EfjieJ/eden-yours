/* Eden Yours — vrai casse-tête : pièces dans un plateau, à déposer sur l'image.
   Langue du site (FR | EN, localStorage eden-lang) : seules les chansons de cette langue sont proposées. */
(function () {
  "use strict";

  /* Paires vérifiées sur disque : cover jpeg + mp3 local (tracks.json).
     lang : titre français resté français ; anglais d'après le titre et les paroles. */
  var SONGS = [
    { id: "f5bf8830-85bb-4a9b-9545-081800be485f", lang: "fr", title: "La Sensibilité est la Fonction", cover: "assets/covers/f5bf8830-85bb-4a9b-9545-081800be485f.jpeg", audio: "assets/audio/f5bf8830-85bb-4a9b-9545-081800be485f.mp3" },
    { id: "dead13bb-42bc-492e-83a1-87609f224734", lang: "fr", title: "Particule Pure", cover: "assets/covers/dead13bb-42bc-492e-83a1-87609f224734.jpeg", audio: "assets/audio/dead13bb-42bc-492e-83a1-87609f224734.mp3" },
    { id: "2c8a36c9-4207-41b9-80e9-bf78313c2099", lang: "fr", title: "Tout ce que je demande l'univers me le donne", cover: "assets/covers/2c8a36c9-4207-41b9-80e9-bf78313c2099.jpeg", audio: "assets/audio/2c8a36c9-4207-41b9-80e9-bf78313c2099.mp3" },
    { id: "f95b9e6c-bc0b-4d6f-b2b6-8089d498c6ef", lang: "fr", title: "Et que ce soit", cover: "assets/covers/f95b9e6c-bc0b-4d6f-b2b6-8089d498c6ef.jpeg", audio: "assets/audio/f95b9e6c-bc0b-4d6f-b2b6-8089d498c6ef.mp3" },
    { id: "ad12c762-07a4-4a0e-8c7e-a411b2419008", lang: "fr", title: "La pensée", cover: "assets/covers/ad12c762-07a4-4a0e-8c7e-a411b2419008.jpeg", audio: "assets/audio/ad12c762-07a4-4a0e-8c7e-a411b2419008.mp3" },
    { id: "5535b9e6-78f1-4a96-bfed-f0c5666a75c3", lang: "fr", title: "La Mécanique du Jeu", cover: "assets/covers/5535b9e6-78f1-4a96-bfed-f0c5666a75c3.jpeg", audio: "assets/audio/5535b9e6-78f1-4a96-bfed-f0c5666a75c3.mp3" },
    { id: "a0b2b33d-66f6-4c6a-b933-cdb5977d920e", lang: "fr", title: "Le Léger Futur", cover: "assets/covers/a0b2b33d-66f6-4c6a-b933-cdb5977d920e.jpeg", audio: "assets/audio/a0b2b33d-66f6-4c6a-b933-cdb5977d920e.mp3" },
    { id: "51d7f27c-2ed1-4de0-821a-83e21384ffd6", lang: "fr", title: "Commencer", cover: "assets/covers/51d7f27c-2ed1-4de0-821a-83e21384ffd6.jpeg", audio: "assets/audio/51d7f27c-2ed1-4de0-821a-83e21384ffd6.mp3" },
    { id: "702aaf9e-cde4-4b51-900c-a790db4a2320", lang: "fr", title: "Éternel sur Terre", cover: "assets/covers/702aaf9e-cde4-4b51-900c-a790db4a2320.jpeg", audio: "assets/audio/702aaf9e-cde4-4b51-900c-a790db4a2320.mp3" },
    { id: "2c1321b1-378d-47f3-be06-1ba9437edd30", lang: "fr", title: "La Vraie Liberté", cover: "assets/covers/2c1321b1-378d-47f3-be06-1ba9437edd30.jpeg", audio: "assets/audio/2c1321b1-378d-47f3-be06-1ba9437edd30.mp3" },
    { id: "e9a0dfac-1925-49e4-aa3a-a2b8c20bc06c", lang: "fr", title: "Commencer", cover: "assets/covers/e9a0dfac-1925-49e4-aa3a-a2b8c20bc06c.jpeg", audio: "assets/audio/e9a0dfac-1925-49e4-aa3a-a2b8c20bc06c.mp3" },
    { id: "04441f4e-8d4b-4831-a038-c5a602e09e25", lang: "fr", title: "Le postulat", cover: "assets/covers/04441f4e-8d4b-4831-a038-c5a602e09e25.jpeg", audio: "assets/audio/04441f4e-8d4b-4831-a038-c5a602e09e25.mp3" },
    /* Pas de MP3 local : lecteur Suno intégré (iframe) à la fin du casse-tête. */
    { id: "3fa852e8-50d1-4b6f-a02d-84a7d3a0575a", lang: "fr", title: "Accompagner la régénération", cover: "assets/covers/3fa852e8-50d1-4b6f-a02d-84a7d3a0575a.jpeg", embed: "https://suno.com/embed/3fa852e8-50d1-4b6f-a02d-84a7d3a0575a" },
    { id: "b51d4773-9849-4bb8-9def-06b99c2a8dc2", lang: "fr", title: "Optim Us Le Double Cœur", cover: "assets/covers/b51d4773-9849-4bb8-9def-06b99c2a8dc2.jpeg", embed: "https://suno.com/embed/b51d4773-9849-4bb8-9def-06b99c2a8dc2" },
    { id: "c8c1762f-a285-45c2-909d-77fbd4ddd395", lang: "fr", title: "Ç'a main", cover: "assets/covers/c8c1762f-a285-45c2-909d-77fbd4ddd395.jpeg", embed: "https://suno.com/embed/c8c1762f-a285-45c2-909d-77fbd4ddd395" },
    { id: "2a9f903f-cc96-4649-922b-4e8ec1339c5c", lang: "fr", title: "Le souffle et la main", cover: "assets/covers/2a9f903f-cc96-4649-922b-4e8ec1339c5c.jpeg", embed: "https://suno.com/embed/2a9f903f-cc96-4649-922b-4e8ec1339c5c" },
    { id: "d34adae3-fd22-4ac7-80c3-6978b0457546", lang: "fr", title: "La beauté vénère", cover: "assets/covers/d34adae3-fd22-4ac7-80c3-6978b0457546.jpeg", embed: "https://suno.com/embed/d34adae3-fd22-4ac7-80c3-6978b0457546" },
    { id: "8e360ed6-fb4a-43fa-962f-55020c20ce05", lang: "fr", title: "Regarde avec le cœur", cover: "assets/covers/8e360ed6-fb4a-43fa-962f-55020c20ce05.jpeg", embed: "https://suno.com/embed/8e360ed6-fb4a-43fa-962f-55020c20ce05" },
    { id: "f40bcbea-d8a7-448c-9e3b-fe6f7556f176", lang: "fr", title: "Le Grand Jeu", cover: "assets/covers/f40bcbea-d8a7-448c-9e3b-fe6f7556f176.jpeg", embed: "https://suno.com/embed/f40bcbea-d8a7-448c-9e3b-fe6f7556f176" },
    { id: "6d91a0bb-d51e-4dd7-b69e-19be51580fc6", lang: "fr", title: "Présence au centre", cover: "assets/covers/6d91a0bb-d51e-4dd7-b69e-19be51580fc6.jpeg", embed: "https://suno.com/embed/6d91a0bb-d51e-4dd7-b69e-19be51580fc6" },
    { id: "6f66fa1b-ee30-428e-823d-d62524debf08", lang: "fr", title: "Présence en Chœur", cover: "assets/covers/6f66fa1b-ee30-428e-823d-d62524debf08.jpeg", embed: "https://suno.com/embed/6f66fa1b-ee30-428e-823d-d62524debf08" },
    { id: "a11c8f21-163b-4b53-8d3a-5353e809bb50", lang: "en", title: "Start - Continue - Finish", cover: "assets/covers/a11c8f21-163b-4b53-8d3a-5353e809bb50.jpeg", audio: "assets/audio/a11c8f21-163b-4b53-8d3a-5353e809bb50.mp3" },
    { id: "a5ba4262-22f6-4c9c-a6df-05bff2d5e713", lang: "en", title: "The Body Is an Antenna", cover: "assets/covers/a5ba4262-22f6-4c9c-a6df-05bff2d5e713.jpeg", audio: "assets/audio/a5ba4262-22f6-4c9c-a6df-05bff2d5e713.mp3" },
    { id: "18a2266c-70b1-4e80-94e5-144a5ccd29fc", lang: "en", title: "Start", cover: "assets/covers/18a2266c-70b1-4e80-94e5-144a5ccd29fc.jpeg", audio: "assets/audio/18a2266c-70b1-4e80-94e5-144a5ccd29fc.mp3" },
    { id: "d2d61703-a205-41ac-a670-6e5cf7c22911", lang: "en", title: "The Postulate", cover: "assets/covers/d2d61703-a205-41ac-a670-6e5cf7c22911.jpeg", audio: "assets/audio/d2d61703-a205-41ac-a670-6e5cf7c22911.mp3" },
    { id: "b495fcd7-5db9-4de1-8fe5-4ba9a397e325", lang: "en", title: "Sensitivity is Pure Function", cover: "assets/covers/b495fcd7-5db9-4de1-8fe5-4ba9a397e325.jpeg", audio: "assets/audio/b495fcd7-5db9-4de1-8fe5-4ba9a397e325.mp3" },
    { id: "bd31373d-709e-4a64-a7dd-7baed7ec7bb7", lang: "en", title: "the postulat", cover: "assets/covers/bd31373d-709e-4a64-a7dd-7baed7ec7bb7.jpeg", audio: "assets/audio/bd31373d-709e-4a64-a7dd-7baed7ec7bb7.mp3" },
    { id: "b0eb0f76-f2d8-4e16-85a9-037fc3f32b01", lang: "en", title: "The slight future", cover: "assets/covers/b0eb0f76-f2d8-4e16-85a9-037fc3f32b01.jpeg", audio: "assets/audio/b0eb0f76-f2d8-4e16-85a9-037fc3f32b01.mp3" },
    { id: "d8d9dfd9-223c-4a2b-b72c-3bf1424b7b9d", lang: "en", title: "The Lightest Particle", cover: "assets/covers/d8d9dfd9-223c-4a2b-b72c-3bf1424b7b9d.jpeg", embed: "https://suno.com/embed/d8d9dfd9-223c-4a2b-b72c-3bf1424b7b9d" },
    { id: "4f9514ec-7ad0-4d80-9f7e-120179145eab", lang: "en", title: "The Sacredness of Emotions", cover: "assets/covers/4f9514ec-7ad0-4d80-9f7e-120179145eab.jpeg", embed: "https://suno.com/embed/4f9514ec-7ad0-4d80-9f7e-120179145eab" },
    { id: "c188685c-c903-4d4a-a47f-15a4a1a9a599", lang: "en", title: "The Sacredness of Emotions", cover: "assets/covers/c188685c-c903-4d4a-a47f-15a4a1a9a599.jpeg", embed: "https://suno.com/embed/c188685c-c903-4d4a-a47f-15a4a1a9a599" }
  ];

  /* Langue des chansons = langue du site (localStorage eden-lang, bouton FR | EN). */
  var COPY = {
    fr: {
      docTitle: "Casse-tête — Eden Yours",
      eyebrow: "Jeu · vibration",
      h1: "Casse-tête",
      lead: "Choisis une chanson française. Prends les pièces dans le plateau, puis dépose-les une à une sur l'image fantôme. Quand la pochette est entière, la chanson s'ouvre.",
      menu: "Chansons françaises",
      tray: "Pièces à placer",
      hintFinger: "Tire une pièce du plateau avec le doigt et dépose-la sur sa case.",
      hintMouse: "Glisse une pièce du plateau et dépose-la sur sa case.",
      wrong: "Pas la bonne case — la pièce revient au plateau.",
      zero: "0 pièce placée",
      one: function (total) { return "1 pièce placée / " + total; },
      many: function (c, total) { return c + " pièces placées / " + total; },
      winTitle: "L'image est réunie",
      winLine: function (title) { return "Écoute « " + title + " »."; },
      solved: "La pochette est entière. La chanson peut jouer.",
      blocked: "Appuie sur lecture si le son ne part pas tout seul.",
      embedTap: "La pochette est entière. Appuie sur lecture dans le lecteur Suno.",
      shuffle: "Mélanger",
      replay: "Rejouer",
      pause: "Pause",
      grid3: "9 pièces",
      grid4: "16 pièces",
      gridAria: "Nombre de pièces",
      boardAria: "Plateau du casse-tête",
      placed: function (n) { return "Pièce " + n + " placée"; },
      todo: function (n) { return "Pièce " + n + " — à placer"; },
      nav: "Casse-tête",
      footName: "Casse-tête",
      tagline: "Écoute sans t'arrêter. Ça régénère.",
      emptyFr: "Pas encore de chanson française",
      emptyEn: "No French song yet"
    },
    en: {
      docTitle: "Jigsaw — Eden Yours",
      eyebrow: "Game · vibration",
      h1: "Jigsaw",
      lead: "Choose an English song. Take the pieces from the tray and drop them one by one onto the ghost image. When the cover is whole, the song opens.",
      menu: "English songs",
      tray: "Pieces to place",
      hintFinger: "Drag a piece with your finger and drop it on its square.",
      hintMouse: "Drag a piece from the tray and drop it on its square.",
      wrong: "Not the right square — the piece goes back to the tray.",
      zero: "0 pieces placed",
      one: function (total) { return "1 piece placed / " + total; },
      many: function (c, total) { return c + " pieces placed / " + total; },
      winTitle: "The picture is whole",
      winLine: function (title) { return "Listen to “" + title + "”."; },
      solved: "The cover is complete. The song can play.",
      blocked: "Press play if the sound does not start on its own.",
      embedTap: "The cover is complete. Press play in the Suno player.",
      shuffle: "Shuffle",
      replay: "Play again",
      pause: "Pause",
      grid3: "9 pieces",
      grid4: "16 pieces",
      gridAria: "Number of pieces",
      boardAria: "Jigsaw board",
      placed: function (n) { return "Piece " + n + " placed"; },
      todo: function (n) { return "Piece " + n + " — to place"; },
      nav: "Jigsaw",
      footName: "Jigsaw",
      tagline: "Listen without stopping. It regenerates.",
      emptyFr: "Pas encore de chanson anglaise",
      emptyEn: "No English song yet"
    }
  };

  var SNAP_RATIO = 0.45;

  var n = 3;
  var puzzleLang = null;
  var songIndex = 0;
  var placed = {};
  var trayOrder = [];
  var locked = false;
  var drag = null;
  var wrongDrops = 0;   // pièces lâchées sur une mauvaise case (pour les étoiles)
  var startedAt = 0;    // chrono : part au premier geste sur une pièce
  var songTimer = null; // la chanson démarre après le motif de victoire
  var lastResult = null;

  var menu = document.getElementById("song-menu");
  var board = document.getElementById("board");
  var boardSlots = document.getElementById("board-slots");
  var boardGhost = document.getElementById("board-ghost");
  var tray = document.getElementById("tray");
  var nowTitle = document.getElementById("now-title");
  var placeCount = document.getElementById("place-count");
  var winPanel = document.getElementById("win-panel");
  var winLine = document.getElementById("win-line");
  var audio = document.getElementById("win-audio");
  var hint = document.getElementById("hint");
  var layout = document.getElementById("puzzle-layout");
  var emptyBox = document.getElementById("empty-songs");
  var starsBox = document.getElementById("win-stars");

  function copy() {
    return COPY[puzzleLang] || COPY.fr;
  }

  function songs() {
    if (puzzleLang !== "fr" && puzzleLang !== "en") return [];
    return SONGS.filter(function (item) { return item.lang === puzzleLang; });
  }

  function song() {
    var list = songs();
    if (!list.length) return null;
    if (songIndex < 0 || songIndex >= list.length) songIndex = 0;
    return list[songIndex];
  }

  function totalPieces() { return n * n; }

  function placedCount() {
    var c = 0;
    for (var k in placed) {
      if (Object.prototype.hasOwnProperty.call(placed, k) && placed[k]) c += 1;
    }
    return c;
  }

  function isSolved() {
    return placedCount() === totalPieces();
  }

  function pieceBg(pieceId) {
    var current = song();
    var row = Math.floor(pieceId / n);
    var col = pieceId % n;
    var x = n === 1 ? 0 : (col * 100) / (n - 1);
    var y = n === 1 ? 0 : (row * 100) / (n - 1);
    var bgSize = (n * 100) + "% " + (n * 100) + "%";
    return {
      image: "url('" + current.cover + "')",
      size: bgSize,
      position: x + "% " + y + "%"
    };
  }

  function applyPieceStyle(el, pieceId) {
    var bg = pieceBg(pieceId);
    el.style.backgroundImage = bg.image;
    el.style.backgroundSize = bg.size;
    el.style.backgroundPosition = bg.position;
  }

  function shuffleIds(ids) {
    for (var i = ids.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = ids[i];
      ids[i] = ids[j];
      ids[j] = tmp;
    }
    return ids;
  }

  function paintCount() {
    var c = placedCount();
    var total = totalPieces();
    var text = copy();
    if (c === 0) placeCount.textContent = text.zero;
    else if (c === 1) placeCount.textContent = text.one(total);
    else placeCount.textContent = text.many(c, total);
  }

  function playHint() {
    var text = copy();
    var coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse || "ontouchstart" in window) return text.hintFinger;
    return text.hintMouse;
  }

  function applyCopy() {
    var text = copy();
    document.title = text.docTitle;
    var eyebrow = document.getElementById("puzzle-eyebrow");
    var h1 = document.getElementById("puzzle-h1");
    var lead = document.getElementById("puzzle-lead");
    var menuLabel = document.getElementById("menu-label");
    var trayLabel = document.getElementById("tray-label");
    var winTitle = document.getElementById("win-title");
    var navPuzzle = document.getElementById("nav-puzzle");
    var footName = document.getElementById("foot-puzzle");
    var footTag = document.getElementById("foot-tagline");
    if (eyebrow) eyebrow.textContent = text.eyebrow;
    if (h1) h1.textContent = text.h1;
    if (lead) lead.textContent = text.lead;
    if (menuLabel) menuLabel.textContent = text.menu;
    if (trayLabel) trayLabel.textContent = text.tray;
    if (winTitle) winTitle.textContent = text.winTitle;
    if (navPuzzle) navPuzzle.textContent = text.nav;
    if (footName) footName.textContent = text.footName;
    if (footTag) footTag.textContent = text.tagline;
    var shuffle = document.getElementById("btn-shuffle");
    var replay = document.getElementById("btn-replay");
    var stop = document.getElementById("btn-stop");
    var g3 = document.getElementById("grid-3");
    var g4 = document.getElementById("grid-4");
    var grid = document.querySelector(".grid-switch");
    if (shuffle) shuffle.textContent = text.shuffle;
    if (replay) replay.textContent = text.replay;
    if (stop) stop.textContent = text.pause;
    if (g3) g3.textContent = text.grid3;
    if (g4) g4.textContent = text.grid4;
    if (grid) grid.setAttribute("aria-label", text.gridAria);
    if (board) board.setAttribute("aria-label", text.boardAria);
    var emptyFr = document.getElementById("empty-line-fr");
    var emptyEn = document.getElementById("empty-line-en");
    if (emptyFr) emptyFr.textContent = text.emptyFr;
    if (emptyEn) emptyEn.textContent = text.emptyEn;
  }

  function paintLangButtons() {
    var fr = document.getElementById("choose-fr");
    var en = document.getElementById("choose-en");
    if (fr) {
      var on = puzzleLang === "fr";
      fr.classList.toggle("is-active", on);
      fr.setAttribute("aria-pressed", on ? "true" : "false");
    }
    if (en) {
      var onEn = puzzleLang === "en";
      en.classList.toggle("is-active", onEn);
      en.setAttribute("aria-pressed", onEn ? "true" : "false");
    }
  }

  function renderMenu() {
    menu.innerHTML = "";
    var list = songs();
    list.forEach(function (item, i) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "song-pick" + (i === songIndex ? " is-active" : "");
      btn.setAttribute("role", "option");
      btn.setAttribute("aria-selected", i === songIndex ? "true" : "false");
      btn.innerHTML = '<img alt="" src="' + item.cover + '"><span></span>';
      btn.querySelector("span").textContent = item.title;
      btn.addEventListener("click", function () { selectSong(i); });
      menu.appendChild(btn);
    });
  }

  function clearSlotsHighlight() {
    var slots = boardSlots.querySelectorAll(".slot");
    for (var i = 0; i < slots.length; i++) slots[i].classList.remove("is-target");
  }

  function renderBoard() {
    board.style.setProperty("--n", String(n));
    board.classList.toggle("is-solved", locked);
    boardSlots.innerHTML = "";
    var total = totalPieces();
    var text = copy();
    for (var i = 0; i < total; i++) {
      var slot = document.createElement("div");
      slot.className = "slot";
      slot.dataset.slot = String(i);
      if (placed[i]) {
        slot.classList.add("is-filled");
        var piece = document.createElement("div");
        piece.className = "piece is-placed is-locked";
        piece.dataset.piece = String(i);
        applyPieceStyle(piece, i);
        piece.setAttribute("aria-label", text.placed(i + 1));
        slot.appendChild(piece);
      }
      boardSlots.appendChild(slot);
    }
  }

  function makeTrayPiece(pieceId) {
    var piece = document.createElement("button");
    piece.type = "button";
    piece.className = "piece";
    piece.dataset.piece = String(pieceId);
    applyPieceStyle(piece, pieceId);
    piece.setAttribute("aria-label", copy().todo(pieceId + 1));
    piece.addEventListener("pointerdown", onPiecePointerDown);
    return piece;
  }

  function renderTray() {
    tray.innerHTML = "";
    trayOrder.forEach(function (pieceId) {
      if (!placed[pieceId]) tray.appendChild(makeTrayPiece(pieceId));
    });
  }

  function removeFromTrayOrder(pieceId) {
    trayOrder = trayOrder.filter(function (id) { return id !== pieceId; });
  }

  function stopAudio() {
    audio.pause();
  }

  /* Chansons sans MP3 (champ embed) : lecteur Suno en iframe à la place de <audio>. */
  var embedBox = null;
  var stopBtn = document.getElementById("btn-stop");

  function clearEmbed() {
    if (embedBox) {
      embedBox.innerHTML = "";
      embedBox.hidden = true;
    }
    audio.hidden = false;
    if (stopBtn) stopBtn.hidden = false;
  }

  function showEmbed(current) {
    if (!embedBox) {
      embedBox = document.createElement("div");
      embedBox.className = "win-embed";
      embedBox.id = "win-embed";
      audio.parentNode.insertBefore(embedBox, audio);
    }
    embedBox.innerHTML = "";
    var frame = document.createElement("iframe");
    frame.src = current.embed;
    frame.width = "100%";
    frame.height = "240";
    frame.setAttribute("frameborder", "0");
    frame.setAttribute("allow", "autoplay; clipboard-write; encrypted-media");
    frame.setAttribute("title", current.title + " — Suno");
    frame.className = "suno-embed";
    embedBox.appendChild(frame);
    embedBox.hidden = false;
    audio.hidden = true;
    if (stopBtn) stopBtn.hidden = true;
  }

  function hideWin() {
    clearTimeout(songTimer);
    if (window.EdenStars) window.EdenStars.clear(starsBox);
    winPanel.classList.remove("is-open");
    stopAudio();
    audio.muted = false;
    audio.removeAttribute("src");
    audio.load();
    clearEmbed();
  }

  /* Étoiles : 1 à 3 selon les mauvais dépôts et le temps (règles dans js/stars.js),
     trois étoiles qui se remplissent + une note par étoile, puis la chanson. */
  function awardStars() {
    var S = window.EdenStars;
    if (!S) return 0;
    var seconds = startedAt ? (Date.now() - startedAt) / 1000 : 0;
    var stars = S.puzzleStars(totalPieces(), wrongDrops, seconds);
    var session = S.record("puzzle", stars);
    lastResult = { stars: stars, wrong: wrongDrops, seconds: seconds, pieces: totalPieces(), session: session };
    var t = window.EdenI18n && window.EdenI18n.t ? window.EdenI18n.t : function (k) { return k; };
    S.render(starsBox, stars, {
      line: t("stars.puzzle" + stars),
      detail: t("stars.puzzleDetail", { wrong: wrongDrops, time: S.formatTime(seconds) }),
      session: session
    });
    S.play(stars);
    return S.motifMs(stars);
  }

  function showWin() {
    locked = true;
    var current = song();
    if (!current) return;
    var text = copy();
    winLine.textContent = text.winLine(current.title);
    winPanel.classList.add("is-open");
    hint.textContent = text.solved;
    board.classList.add("is-solved");
    var delay = awardStars();
    if (current.embed && !current.audio) {
      showEmbed(current);
      hint.textContent = text.embedTap;
      return;
    }
    audio.src = current.audio;
    // On « débloque » le lecteur pendant le geste (muet), puis la chanson part après le motif.
    audio.muted = true;
    var prime = audio.play();
    if (prime && typeof prime.catch === "function") prime.catch(function () { /* on réessaie plus bas */ });
    clearTimeout(songTimer);
    songTimer = setTimeout(function () {
      if (!winPanel.classList.contains("is-open")) return;
      try { audio.currentTime = 0; } catch (e) { /* ignore */ }
      audio.muted = false;
      var playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(function () {
          hint.textContent = text.blocked;
        });
      }
    }, delay);
  }

  function getPoint(e) {
    return { x: e.clientX, y: e.clientY };
  }

  function slotAtPoint(x, y) {
    var slots = boardSlots.querySelectorAll(".slot");
    var best = null;
    var bestDist = Infinity;
    for (var i = 0; i < slots.length; i++) {
      var slot = slots[i];
      var rect = slot.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var dx = x - cx;
      var dy = y - cy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var threshold = Math.min(rect.width, rect.height) * SNAP_RATIO;
      if (dist <= threshold && dist < bestDist) {
        bestDist = dist;
        best = { el: slot, index: Number(slot.dataset.slot), dist: dist };
      }
    }
    return best;
  }

  function highlightTarget(pieceId, x, y) {
    clearSlotsHighlight();
    var hit = slotAtPoint(x, y);
    if (hit && hit.index === pieceId && !placed[pieceId]) {
      hit.el.classList.add("is-target");
      return hit;
    }
    return null;
  }

  function liftPiece(piece, point) {
    var rect = piece.getBoundingClientRect();
    var offsetX = point.x - rect.left;
    var offsetY = point.y - rect.top;
    piece.classList.add("is-dragging");
    piece.style.position = "fixed";
    piece.style.left = (point.x - offsetX) + "px";
    piece.style.top = (point.y - offsetY) + "px";
    piece.style.width = rect.width + "px";
    piece.style.height = rect.height + "px";
    piece.style.margin = "0";
    piece.style.zIndex = "50";
    document.body.appendChild(piece);
    return { offsetX: offsetX, offsetY: offsetY, w: rect.width, h: rect.height };
  }

  function moveLifted(piece, point, offsets) {
    piece.style.left = (point.x - offsets.offsetX) + "px";
    piece.style.top = (point.y - offsets.offsetY) + "px";
  }

  function resetPieceInline(pieceEl) {
    pieceEl.classList.remove("is-dragging");
    pieceEl.style.position = "";
    pieceEl.style.left = "";
    pieceEl.style.top = "";
    pieceEl.style.width = "";
    pieceEl.style.height = "";
    pieceEl.style.margin = "";
    pieceEl.style.zIndex = "";
  }

  function placeInSlot(pieceId, pieceEl) {
    placed[pieceId] = true;
    removeFromTrayOrder(pieceId);
    if (pieceEl && pieceEl.parentNode) pieceEl.parentNode.removeChild(pieceEl);
    renderBoard();
    renderTray();
    paintCount();
    if (isSolved()) showWin();
    else hint.textContent = playHint();
  }

  function returnToTray(pieceId, pieceEl) {
    resetPieceInline(pieceEl);
    if (trayOrder.indexOf(pieceId) === -1) trayOrder.push(pieceId);
    if (pieceEl.parentNode !== tray) {
      if (pieceEl.parentNode) pieceEl.parentNode.removeChild(pieceEl);
      tray.appendChild(pieceEl);
    }
  }

  function endDrag(successSlot) {
    if (!drag) return;
    var pieceId = drag.pieceId;
    var pieceEl = drag.el;
    var pointerId = drag.pointerId;
    try {
      if (pieceEl.releasePointerCapture) pieceEl.releasePointerCapture(pointerId);
    } catch (err) { /* ignore */ }
    clearSlotsHighlight();

    if (successSlot) {
      placeInSlot(pieceId, pieceEl);
    } else {
      returnToTray(pieceId, pieceEl);
      hint.textContent = copy().wrong;
    }
    drag = null;
  }

  function onPiecePointerDown(e) {
    if (locked) return;
    if (e.button != null && e.button !== 0) return;
    var piece = e.currentTarget;
    if (!piece || !piece.classList.contains("piece") || piece.classList.contains("is-locked")) return;
    if (drag) return;

    var pieceId = Number(piece.dataset.piece);
    if (placed[pieceId]) return;
    if (!startedAt) startedAt = Date.now();
    if (window.EdenStars) window.EdenStars.unlock(); // Web Audio prêt pour le motif de fin

    e.preventDefault();
    var point = getPoint(e);
    var offsets = liftPiece(piece, point);
    drag = {
      el: piece,
      pieceId: pieceId,
      pointerId: e.pointerId,
      offsets: offsets
    };
    try {
      piece.setPointerCapture(e.pointerId);
    } catch (err) { /* ignore */ }
    highlightTarget(pieceId, point.x, point.y);
  }

  function onPointerMove(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.preventDefault();
    var point = getPoint(e);
    moveLifted(drag.el, point, drag.offsets);
    highlightTarget(drag.pieceId, point.x, point.y);
  }

  function onPointerUp(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.preventDefault();
    var point = getPoint(e);
    var hit = highlightTarget(drag.pieceId, point.x, point.y);
    var ok = !!(hit && hit.index === drag.pieceId);
    if (!ok) {
      var over = slotAtPoint(point.x, point.y);
      if (over && over.index !== drag.pieceId) wrongDrops += 1;
    }
    endDrag(ok);
  }

  function onPointerCancel(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    endDrag(false);
  }

  document.addEventListener("pointermove", onPointerMove, { passive: false });
  document.addEventListener("pointerup", onPointerUp, { passive: false });
  document.addEventListener("pointercancel", onPointerCancel);

  function dealTray() {
    var ids = [];
    var total = totalPieces();
    for (var i = 0; i < total; i++) ids.push(i);
    trayOrder = shuffleIds(ids);
  }

  function start() {
    var current = song();
    if (!current) return;
    hideWin();
    placed = {};
    locked = false;
    drag = null;
    wrongDrops = 0;
    startedAt = 0;
    lastResult = null;
    nowTitle.textContent = current.title;
    boardGhost.src = current.cover;
    boardGhost.alt = "";
    hint.textContent = playHint();
    dealTray();
    paintGridButtons();
    renderMenu();
    renderBoard();
    renderTray();
    paintCount();
  }

  function selectSong(i) {
    songIndex = i;
    start();
  }

  var phoneQuery = window.matchMedia("(max-width: 700px)");

  function isPhone() {
    return phoneQuery.matches;
  }

  function paintGridButtons() {
    var g3 = document.getElementById("grid-3");
    var g4 = document.getElementById("grid-4");
    var phone = isPhone();
    g3.classList.toggle("is-active", n === 3);
    g4.classList.toggle("is-active", n === 4);
    g3.setAttribute("aria-pressed", n === 3 ? "true" : "false");
    g4.setAttribute("aria-pressed", n === 4 ? "true" : "false");
    g4.hidden = phone;
    if (phone) g4.setAttribute("aria-hidden", "true");
    else g4.removeAttribute("aria-hidden");
  }

  function setGrid(next) {
    if (!song()) return;
    if (isPhone()) next = 3;
    n = next === 4 ? 4 : 3;
    paintGridButtons();
    start();
  }

  document.getElementById("btn-shuffle").addEventListener("click", function () {
    if (song()) start();
  });
  document.getElementById("btn-replay").addEventListener("click", function () {
    if (song()) start();
  });
  var nextSongBtn = document.getElementById("btn-next-song");
  if (nextSongBtn) {
    nextSongBtn.addEventListener("click", function () {
      var list = songs();
      if (!list.length) return;
      selectSong((songIndex + 1) % list.length);
    });
  }
  document.getElementById("btn-stop").addEventListener("click", function () {
    if (!audio.getAttribute("src")) return;
    if (audio.paused) audio.play();
    else audio.pause();
  });
  document.getElementById("grid-3").addEventListener("click", function () { setGrid(3); });
  document.getElementById("grid-4").addEventListener("click", function () { setGrid(4); });

  function onPhoneChange() {
    paintGridButtons();
    if (isPhone() && n === 4 && song()) setGrid(3);
  }
  if (phoneQuery.addEventListener) phoneQuery.addEventListener("change", onPhoneChange);
  else if (phoneQuery.addListener) phoneQuery.addListener(onPhoneChange);

  function readQuery() {
    try {
      var q = new URLSearchParams(window.location.search).get("lang");
      if (q === "fr" || q === "en") return q;
    } catch (err) { /* ignore */ }
    return null;
  }

  function showEmpty() {
    hideWin();
    if (drag && drag.el && drag.el.parentNode) drag.el.parentNode.removeChild(drag.el);
    drag = null;
    layout.hidden = true;
    emptyBox.hidden = false;
    menu.innerHTML = "";
    if (nowTitle) nowTitle.textContent = "—";
  }

  function applyPuzzleLang(next) {
    if (next !== "fr" && next !== "en") return;
    if (puzzleLang === next && layout && !layout.hidden) return;
    puzzleLang = next;
    songIndex = 0;
    paintLangButtons();
    applyCopy();
    if (!songs().length) {
      showEmpty();
      return;
    }
    emptyBox.hidden = true;
    layout.hidden = false;
    start();
  }

  function chooseLang(next) {
    if (next !== "fr" && next !== "en") return;
    if (window.EdenI18n && window.EdenI18n.setLang) {
      window.EdenI18n.setLang(next);
      return;
    }
    applyPuzzleLang(next);
  }

  document.getElementById("choose-fr").addEventListener("click", function () { chooseLang("fr"); });
  document.getElementById("choose-en").addEventListener("click", function () { chooseLang("en"); });

  var toggle = document.getElementById("nav-toggle");
  var links = document.getElementById("nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () { links.classList.toggle("open"); });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { links.classList.remove("open"); });
    });
  }

  paintLangButtons();
  if (window.EdenI18n && window.EdenI18n.onChange) {
    window.EdenI18n.onChange(function (l) { applyPuzzleLang(l); });
  }
  var fromQuery = readQuery();
  if (fromQuery && window.EdenI18n && window.EdenI18n.setLang) {
    window.EdenI18n.setLang(fromQuery);
  } else if (window.EdenI18n && window.EdenI18n.getLang) {
    applyPuzzleLang(window.EdenI18n.getLang());
  } else {
    applyPuzzleLang(fromQuery || "en");
  }
  window.EdenPuzzle = {
    state: function () { return { pieces: totalPieces(), wrong: wrongDrops, startedAt: startedAt, locked: locked, result: lastResult }; }
  };
})();
