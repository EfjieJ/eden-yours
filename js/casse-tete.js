/* Eden Yours — vrai casse-tête : pièces dans un plateau, à déposer sur l'image. */
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

  var SNAP_RATIO = 0.45; /* fraction of slot size — phone-friendly */

  var n = 3;
  var songIndex = 0;
  var placed = {}; /* pieceId -> true when locked in its slot */
  var trayOrder = []; /* piece ids still in tray, display order */
  var locked = false;
  var drag = null;

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

  function song() { return SONGS[songIndex]; }

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
    if (c === 0) placeCount.textContent = "0 pièce placée";
    else if (c === 1) placeCount.textContent = "1 pièce placée / " + total;
    else placeCount.textContent = c + " pièces placées / " + total;
  }

  function playHint() {
    var coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse || "ontouchstart" in window) {
      return "Tire une pièce du plateau avec le doigt et dépose-la sur sa case.";
    }
    return "Glisse une pièce du plateau et dépose-la sur sa case.";
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

  function clearSlotsHighlight() {
    var slots = boardSlots.querySelectorAll(".slot");
    for (var i = 0; i < slots.length; i++) slots[i].classList.remove("is-target");
  }

  function renderBoard() {
    board.style.setProperty("--n", String(n));
    board.classList.toggle("is-solved", locked);
    boardSlots.innerHTML = "";
    var total = totalPieces();
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
        piece.setAttribute("aria-label", "Pièce " + (i + 1) + " placée");
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
    piece.setAttribute("aria-label", "Pièce " + (pieceId + 1) + " — à placer");
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
    board.classList.add("is-solved");
    audio.src = current.audio;
    var playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function () {
        hint.textContent = "Appuie sur lecture si le son ne part pas tout seul.";
      });
    }
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
      hint.textContent = "Pas la bonne case — la pièce revient au plateau.";
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
    hideWin();
    placed = {};
    locked = false;
    drag = null;
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
    if (isPhone() && n === 4) setGrid(3);
  }
  if (phoneQuery.addEventListener) phoneQuery.addEventListener("change", onPhoneChange);
  else if (phoneQuery.addListener) phoneQuery.addListener(onPhoneChange);

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
