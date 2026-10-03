/* Eden Yours — taquin : la pochette, puis la chanson. */
(function () {
  "use strict";

  /* Paires vérifiées sur disque : cover jpeg + mp3 local (tracks.json). */
  var SONGS = [
    {
      id: "f5bf8830-85bb-4a9b-9545-081800be485f",
      title: "La Sensibilité est la Fonction",
      cover: "assets/covers/f5bf8830-85bb-4a9b-9545-081800be485f.jpeg",
      audio: "assets/audio/f5bf8830-85bb-4a9b-9545-081800be485f.mp3"
    },
    {
      id: "dead13bb-42bc-492e-83a1-87609f224734",
      title: "Particule Pure",
      cover: "assets/covers/dead13bb-42bc-492e-83a1-87609f224734.jpeg",
      audio: "assets/audio/dead13bb-42bc-492e-83a1-87609f224734.mp3"
    },
    {
      id: "2c8a36c9-4207-41b9-80e9-bf78313c2099",
      title: "Tout ce que je demande l'univers me le donne",
      cover: "assets/covers/2c8a36c9-4207-41b9-80e9-bf78313c2099.jpeg",
      audio: "assets/audio/2c8a36c9-4207-41b9-80e9-bf78313c2099.mp3"
    },
    {
      id: "f95b9e6c-bc0b-4d6f-b2b6-8089d498c6ef",
      title: "Et que ce soit",
      cover: "assets/covers/f95b9e6c-bc0b-4d6f-b2b6-8089d498c6ef.jpeg",
      audio: "assets/audio/f95b9e6c-bc0b-4d6f-b2b6-8089d498c6ef.mp3"
    },
    {
      id: "ad12c762-07a4-4a0e-8c7e-a411b2419008",
      title: "La pensée",
      cover: "assets/covers/ad12c762-07a4-4a0e-8c7e-a411b2419008.jpeg",
      audio: "assets/audio/ad12c762-07a4-4a0e-8c7e-a411b2419008.mp3"
    },
    {
      id: "5535b9e6-78f1-4a96-bfed-f0c5666a75c3",
      title: "La Mécanique du Jeu",
      cover: "assets/covers/5535b9e6-78f1-4a96-bfed-f0c5666a75c3.jpeg",
      audio: "assets/audio/5535b9e6-78f1-4a96-bfed-f0c5666a75c3.mp3"
    }
  ];

  var n = 3;
  var songIndex = 0;
  var tiles = [];
  var blank = 0;
  var moves = 0;
  var locked = false;

  var menu = document.getElementById("song-menu");
  var board = document.getElementById("board");
  var nowTitle = document.getElementById("now-title");
  var moveCount = document.getElementById("move-count");
  var modelImg = document.getElementById("model-img");
  var winPanel = document.getElementById("win-panel");
  var winLine = document.getElementById("win-line");
  var audio = document.getElementById("win-audio");
  var hint = document.getElementById("hint");

  function song() { return SONGS[songIndex]; }

  function size() { return n * n; }

  function neighbors(index) {
    var r = Math.floor(index / n);
    var c = index % n;
    var out = [];
    if (r > 0) out.push(index - n);
    if (r < n - 1) out.push(index + n);
    if (c > 0) out.push(index - 1);
    if (c < n - 1) out.push(index + 1);
    return out;
  }

  function isSolved() {
    for (var i = 0; i < tiles.length; i++) {
      if (tiles[i] !== i) return false;
    }
    return true;
  }

  function shuffle() {
    var total = size();
    tiles = [];
    for (var i = 0; i < total; i++) tiles.push(i);
    blank = total - 1;
    var last = -1;
    var steps = n === 3 ? 48 : 90;
    for (var s = 0; s < steps; s++) {
      var opts = neighbors(blank).filter(function (p) { return p !== last; });
      var pick = opts[Math.floor(Math.random() * opts.length)];
      tiles[blank] = tiles[pick];
      tiles[pick] = total - 1;
      last = blank;
      blank = pick;
    }
    if (isSolved()) {
      var nudge = neighbors(blank)[0];
      tiles[blank] = tiles[nudge];
      tiles[nudge] = total - 1;
      blank = nudge;
    }
    moves = 0;
    locked = false;
  }

  function paintMoves() {
    moveCount.textContent = moves + (moves === 1 ? " coup" : " coups");
  }

  function renderMenu() {
    menu.innerHTML = "";
    SONGS.forEach(function (item, i) {
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

  function renderBoard() {
    var current = song();
    board.style.setProperty("--n", String(n));
    board.classList.toggle("is-solved", locked);
    board.innerHTML = "";
    var bgSize = (n * 100) + "% " + (n * 100) + "%";
    tiles.forEach(function (tileId, pos) {
      var btn = document.createElement("button");
      btn.type = "button";
      var isBlank = tileId === size() - 1;
      btn.className = "tile" + (isBlank ? " tile-blank" : "");
      if (isBlank) {
        btn.tabIndex = -1;
        btn.setAttribute("aria-label", "Case vide");
        btn.setAttribute("aria-disabled", "true");
      } else {
        var srcRow = Math.floor(tileId / n);
        var srcCol = tileId % n;
        var x = n === 1 ? 0 : (srcCol * 100) / (n - 1);
        var y = n === 1 ? 0 : (srcRow * 100) / (n - 1);
        btn.style.backgroundImage = "url('" + current.cover + "')";
        btn.style.backgroundSize = bgSize;
        btn.style.backgroundPosition = x + "% " + y + "%";
        btn.setAttribute("aria-label", "Pièce " + (tileId + 1));
        btn.addEventListener("click", function (ev) {
          if (swallowClick) {
            swallowClick = false;
            ev.preventDefault();
            return;
          }
          tryMove(pos);
        });
      }
      board.appendChild(btn);
    });
  }

  function stopAudio() {
    audio.pause();
  }

  function hideWin() {
    winPanel.classList.remove("is-open");
    stopAudio();
    audio.removeAttribute("src");
    audio.load();
  }

  function showWin() {
    locked = true;
    var current = song();
    winLine.textContent = "Écoute « " + current.title + " ».";
    winPanel.classList.add("is-open");
    hint.textContent = "La pochette est entière. La chanson peut jouer.";
    renderBoard();
    audio.src = current.audio;
    var playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function () {
        hint.textContent = "Appuie sur lecture si le son ne part pas tout seul.";
      });
    }
  }

  function tryMove(pos) {
    if (locked) return;
    if (neighbors(blank).indexOf(pos) === -1) return;
    tiles[blank] = tiles[pos];
    tiles[pos] = size() - 1;
    blank = pos;
    moves += 1;
    paintMoves();
    if (isSolved()) showWin();
    else renderBoard();
  }

  function moveByKey(key) {
    if (locked) return;
    var r = Math.floor(blank / n);
    var c = blank % n;
    var target = -1;
    if (key === "ArrowLeft" && c < n - 1) target = blank + 1;
    if (key === "ArrowRight" && c > 0) target = blank - 1;
    if (key === "ArrowUp" && r < n - 1) target = blank + n;
    if (key === "ArrowDown" && r > 0) target = blank - n;
    if (target >= 0) tryMove(target);
  }

  function start() {
    var current = song();
    hideWin();
    nowTitle.textContent = current.title;
    modelImg.src = current.cover;
    modelImg.alt = "Pochette — " + current.title;
    hint.textContent = playHint();
    shuffle();
    paintMoves();
    paintGridButtons();
    renderMenu();
    renderBoard();
  }

  function selectSong(i) {
    songIndex = i;
    start();
  }

  var phoneQuery = window.matchMedia("(max-width: 700px)");
  var swallowClick = false;

  function isPhone() {
    return phoneQuery.matches;
  }

  function playHint() {
    var coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse || "ontouchstart" in window) {
      return "Touche une pièce à côté du vide, ou glisse-la vers la case vide.";
    }
    return "Clique une pièce à côté du vide, ou utilise les flèches.";
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
    if (isPhone()) next = 3;
    n = next === 4 ? 4 : 3;
    paintGridButtons();
    start();
  }

  document.getElementById("btn-shuffle").addEventListener("click", start);
  document.getElementById("btn-replay").addEventListener("click", start);
  document.getElementById("btn-stop").addEventListener("click", function () {
    if (audio.paused) audio.play();
    else audio.pause();
  });
  document.getElementById("grid-3").addEventListener("click", function () { setGrid(3); });
  document.getElementById("grid-4").addEventListener("click", function () { setGrid(4); });

  function onPhoneChange() {
    paintGridButtons();
    if (isPhone() && n !== 3) setGrid(3);
  }
  if (phoneQuery.addEventListener) phoneQuery.addEventListener("change", onPhoneChange);
  else if (phoneQuery.addListener) phoneQuery.addListener(onPhoneChange);

  var swipe = null;
  var SWIPE_MIN = 28;

  function tilePosFromEvent(e) {
    var node = e.target;
    if (!node || !node.closest) return -1;
    var tile = node.closest(".tile");
    if (!tile || !board.contains(tile)) return -1;
    var all = board.querySelectorAll(".tile");
    for (var i = 0; i < all.length; i++) {
      if (all[i] === tile) return i;
    }
    return -1;
  }

  function swipeDirection(dx, dy) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return null;
    if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? "ArrowLeft" : "ArrowRight";
    return dy < 0 ? "ArrowUp" : "ArrowDown";
  }

  function directionTowardBlank(pos) {
    var dr = Math.floor(blank / n) - Math.floor(pos / n);
    var dc = (blank % n) - (pos % n);
    if (dr === -1 && dc === 0) return "ArrowUp";
    if (dr === 1 && dc === 0) return "ArrowDown";
    if (dc === -1 && dr === 0) return "ArrowLeft";
    if (dc === 1 && dr === 0) return "ArrowRight";
    return null;
  }

  function armSwallowClick() {
    swallowClick = true;
    window.setTimeout(function () { swallowClick = false; }, 450);
  }

  board.addEventListener("touchstart", function (e) {
    if (locked || !e.touches || e.touches.length !== 1) {
      swipe = null;
      return;
    }
    var t = e.touches[0];
    swipe = { x: t.clientX, y: t.clientY, pos: tilePosFromEvent(e) };
  }, { passive: true });

  board.addEventListener("touchmove", function (e) {
    if (!swipe || !e.touches || e.touches.length !== 1) return;
    var dx = e.touches[0].clientX - swipe.x;
    var dy = e.touches[0].clientY - swipe.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 10) e.preventDefault();
  }, { passive: false });

  board.addEventListener("touchend", function (e) {
    if (!swipe) return;
    var startTouch = swipe;
    swipe = null;
    var t = e.changedTouches && e.changedTouches[0];
    if (!t || locked) return;
    var dir = swipeDirection(t.clientX - startTouch.x, t.clientY - startTouch.y);
    if (!dir) return;
    armSwallowClick();
    var onTile = startTouch.pos;
    if (onTile >= 0 && neighbors(blank).indexOf(onTile) !== -1) {
      if (directionTowardBlank(onTile) === dir) tryMove(onTile);
      return;
    }
    moveByKey(dir);
  }, { passive: true });

  board.addEventListener("touchcancel", function () { swipe = null; });

  document.addEventListener("keydown", function (e) {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].indexOf(e.key) === -1) return;
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    e.preventDefault();
    moveByKey(e.key);
  });

  var toggle = document.getElementById("nav-toggle");
  var links = document.getElementById("nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () { links.classList.toggle("open"); });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { links.classList.remove("open"); });
    });
  }

  start();
})();
