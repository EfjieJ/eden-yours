/* Eden Yours Platform — vanilla player + UI */
(function () {
  "use strict";

  const cfg = window.EDEN_CONFIG || {};
  function i18n(key, vars) {
    return (window.EdenI18n && window.EdenI18n.t)
      ? window.EdenI18n.t(key, vars)
      : key;
  }
  let allTracks = [];
  let tracks = [];
  let currentIndex = -1;
  let currentId = null;
  let audio = null;
  let featuredTemplate = null;
  let queueIds = null; // lecture d'un thème (data/categories.json) : ids dans l'ordre, chanson entière après chanson entière

  // ---------- Helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function formatTime(sec) {
    if (!Number.isFinite(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ":" + String(s).padStart(2, "0");
  }

  function toast(msg) {
    let el = $(".copy-toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "copy-toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 2200);
  }


  // ---------- Config bind ----------
  function applyConfig() {
    $$("[data-site-name]").forEach((el) => {
      el.textContent = cfg.siteName || "Eden Yours";
    });
    $$("[data-artist-name]").forEach((el) => {
      el.textContent = cfg.artistName || "Eden Yours";
    });
    $$("[data-site-url]").forEach((el) => {
      el.textContent = cfg.siteUrl || "https://votresite.example.com";
    });
    $$("[data-tagline]").forEach((el) => {
      if (el.hasAttribute("data-i18n")) return;
      el.textContent = i18n("common.tagline");
    });
    document.title = document.title.replace(
      /\{\{siteName\}\}/g,
      cfg.siteName || "Eden Yours"
    );
  }

  // ---------- Nav ----------
  function initNav() {
    const toggle = $(".nav-toggle");
    const links = $(".nav-links");
    if (toggle && links) {
      toggle.addEventListener("click", () => links.classList.toggle("open"));
      links.querySelectorAll("a").forEach((a) =>
        a.addEventListener("click", () => links.classList.remove("open"))
      );
    }
    const path = location.pathname.split("/").pop() || "index.html";
    $$(".nav-links a").forEach((a) => {
      const href = a.getAttribute("href");
      if (href === path || (path === "" && href === "index.html")) {
        a.classList.add("active");
      }
    });
  }

  // ---------- Load tracks ----------
  function siteLang() {
    if (window.EdenSongPick) return window.EdenSongPick.lang();
    const l = window.EdenI18n && window.EdenI18n.getLang && window.EdenI18n.getLang();
    return l === "fr" || l === "en" ? l : "en";
  }

  // ---------- Chanson de départ (au hasard à chaque chargement, dans la langue du site) ----------
  const startPicks = {};
  function hasStartUI() { return !!($(".featured-card") || $(".js-play-first") || $(".js-play-featured")); }
  function startTrack() {
    const lang = siteLang();
    let t = startPicks[lang] ? tracks.find((x) => x.id === startPicks[lang]) : null;
    if (t) return t;
    const pool = tracks.filter((x) => x && (x.audio_url || x.embed_url));
    const P = window.EdenSongPick;
    t = P ? P.pickOpening(pool, lang) : pool[Math.floor(Math.random() * pool.length)];
    t = t || tracks[0] || null;
    if (t) startPicks[lang] = t.id;
    return t;
  }
  function startIndex() {
    const t = startTrack();
    const i = t ? tracks.indexOf(t) : -1;
    return i >= 0 ? i : 0;
  }
  function headTrack() { return hasStartUI() ? startTrack() : (tracks.find((t) => t.featured) || tracks[0] || null); }

  function applyLangFilter() {
    if (queueIds) { queueIds = null; emitQueue(); }
    const lang = siteLang();
    tracks = window.EdenSongPick ? window.EdenSongPick.forLang(allTracks, lang) : allTracks.filter((t) => t && t.lang === lang);
    // Nouveautés (drapeau new: true dans tracks.json) en tête de liste, le reste dans l'ordre habituel.
    tracks = tracks.filter((t) => t.new).sort((a, b) => String(b.added || "").localeCompare(String(a.added || ""))).concat(tracks.filter((t) => !t.new));
    if (currentId && tracks.some((t) => t.id === currentId)) {
      currentIndex = tracks.findIndex((t) => t.id === currentId);
      return;
    }
    if (audio && currentId) {
      audio.pause();
      try {
        audio.removeAttribute("src");
        audio.load();
      } catch (_) {}
    }
    clearEmbed();
    if (window.EdenShuffle) window.EdenShuffle.cancel();
    currentIndex = -1;
    currentId = null;
    const bar = $(".player-bar");
    if (bar) bar.classList.remove("visible");
  }

  async function loadTracks() {
    try { if (window.EdenSongPick) await window.EdenSongPick.ready; } catch (_) {}
    try {
      const res = await fetch("tracks.json", { cache: "no-store" });
      if (!res.ok) throw new Error("tracks.json introuvable");
      const data = await res.json();
      allTracks = Array.isArray(data.tracks) ? data.tracks : [];
    } catch (err) {
      console.error(err);
      allTracks = [];
    }
    applyLangFilter();
    return tracks;
  }

  // ---------- Audio engine ----------
  function ensureAudio() {
    if (audio) return audio;
    audio = new Audio();
    audio.preload = "metadata";

    audio.addEventListener("timeupdate", syncProgress);
    audio.addEventListener("loadedmetadata", syncProgress);
    audio.addEventListener("ended", () => playNext());
    audio.addEventListener("play", () => updatePlayButtons(true));
    audio.addEventListener("pause", () => updatePlayButtons(false));

    return audio;
  }

  function getTrack(i) {
    return tracks[i] || null;
  }

  // ---------- Suno embed tracks (embed_url, no local audio) ----------
  // Suno's own player handles playback (no <audio>).
  function isEmbedTrack(t) {
    return !!(t && t.embed_url && !t.audio_url);
  }

  function embedSlot() {
    return $(".player-bar .player-embed");
  }

  function clearEmbed() {
    const slot = embedSlot();
    if (slot) {
      slot.innerHTML = "";
      slot.hidden = true;
    }
    const bar = $(".player-bar");
    if (bar) bar.classList.remove("is-embed");
    document.body.classList.remove("has-embed-player");
  }

  function showEmbed(t) {
    const bar = $(".player-bar");
    const slot = embedSlot();
    if (!bar || !slot) return;
    const current = slot.querySelector("iframe");
    if (!current || current.getAttribute("data-id") !== t.id) {
      slot.innerHTML = "";
      const frame = document.createElement("iframe");
      frame.src = t.embed_url;
      frame.width = "100%";
      frame.height = "240";
      frame.setAttribute("frameborder", "0");
      frame.setAttribute("allow", "autoplay; clipboard-write; encrypted-media");
      frame.setAttribute("title", (t.title || "Suno") + " — Suno");
      frame.setAttribute("data-id", t.id);
      frame.className = "suno-embed";
      slot.appendChild(frame);
    }
    slot.hidden = false;
    bar.classList.add("is-embed");
    document.body.classList.add("has-embed-player");
  }

  function playEmbedTrack(index) {
    const t = tracks[index];
    if (audio) {
      audio.onerror = null;
      audio.pause();
      try {
        audio.removeAttribute("src");
        audio.removeAttribute("data-id");
        audio.removeAttribute("data-tried-aac");
        audio.load();
      } catch (_) {}
    }
    currentIndex = index;
    currentId = t.id;
    showPlayerBar(t);
    showEmbed(t);
    highlightActiveRow();
    updatePlayerCard(t);
    updatePlayButtons(false);
    if (window.EdenShuffle) window.EdenShuffle.onEmbed(t, playNext); // mode aléatoire : enchaînement par minuteur (durée Suno vérifiée)
  }

  function playTrack(index) {
    if (index < 0 || index >= tracks.length) return;
    const t = tracks[index];
    if (queueIds && queueIds.indexOf(t.id) === -1) { queueIds = null; emitQueue(); } // l'utilisateur choisit un titre hors thème
    if (window.EdenShuffle) { window.EdenShuffle.cancel(); window.EdenShuffle.noteStart(t.id); window.EdenShuffle.setMedia(t); }
    if (isEmbedTrack(t)) {
      playEmbedTrack(index);
      return;
    }
    if (!t.audio_url) {
      toast(i18n("toast.noAudio"));
      return;
    }
    clearEmbed();
    if (window.EdenSongPick) window.EdenSongPick.record(t.id);
    const a = ensureAudio();
    const switching = currentIndex !== index;
    currentIndex = index;
    currentId = t.id;

    const resolveUrl = (u) => {
      try { return new URL(u, document.baseURI).href; } catch { return u; }
    };

    if (switching || a.getAttribute("data-id") !== t.id) {
      a.src = resolveUrl(t.audio_url);
      a.setAttribute("data-id", t.id);
      a.onerror = () => {
        if (t.audio_url_aac && !a.getAttribute("data-tried-aac")) {
          a.setAttribute("data-tried-aac", "1");
          a.src = resolveUrl(t.audio_url_aac);
          a.play().catch(() => toast("Impossible de lire la musique"));
        } else {
          toast(i18n("toast.cantPlay"));
        }
      };
    }

    a.play().catch((e) => {
      console.warn("Lecture bloquée:", e);
      toast(i18n("toast.playBlocked"));
    });

    showPlayerBar(t);
    highlightActiveRow();
    updatePlayerCard(t);
  }

  function togglePlay() {
    if (currentIndex < 0) {
      if (tracks.length) playTrack(startIndex());
      return;
    }
    if (isEmbedTrack(tracks[currentIndex])) return;
    const a = ensureAudio();
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  }

  function emitQueue() {
    try { document.dispatchEvent(new CustomEvent("eden:queue", { detail: { active: !!queueIds, ids: queueIds ? queueIds.slice() : [], current: currentId } })); } catch (_) {}
  }
  // Thème : file d'attente (ids). Retourne l'index de la prochaine chanson de la file, -1 si fin.
  function queueStep(dir) {
    const pos = queueIds.indexOf(currentId);
    const nid = queueIds[pos + dir];
    if (!nid) return -1;
    return tracks.findIndex((x) => x.id === nid);
  }
  function playQueue(ids) {
    const list = (ids || []).filter((id) => tracks.some((x) => x.id === id));
    if (!list.length) return false;
    queueIds = list;
    const idx = tracks.findIndex((x) => x.id === list[0]);
    playTrack(idx);
    emitQueue();
    return true;
  }
  window.EdenLibrary = {
    tracks: () => tracks.slice(),
    playQueue,
    queue: () => (queueIds ? queueIds.slice() : null),
    currentId: () => currentId,
    isPlaying: () => !!(audio && !audio.paused && !audio.ended && currentIndex >= 0),
    togglePlay,
    play: () => { if (currentIndex >= 0 && !isEmbedTrack(tracks[currentIndex])) { const a = ensureAudio(); if (a.paused) a.play().catch(() => {}); } },
    pause: () => { if (audio && !audio.paused) audio.pause(); },
    next: () => playNext(),
    prev: () => playPrev(),
    shuffleKick,
  };

  // Mode aléatoire : prochaine chanson au hasard (même langue, dans le thème si une file est active), jamais la même deux fois de suite.
  function shufflePick() {
    const S = window.EdenShuffle;
    if (!S || !S.on()) return -1;
    const pool = queueIds ? tracks.filter((x) => queueIds.indexOf(x.id) !== -1) : tracks;
    const t = S.pick(pool, currentId);
    return t ? tracks.indexOf(t) : -1;
  }
  function shuffleKick() { // mode activé (ou langue changée) : démarre / arme l'enchaînement
    if (currentIndex < 0) {
      const t = window.EdenShuffle && window.EdenShuffle.pick(tracks, null);
      const i = t ? tracks.indexOf(t) : -1;
      if (i >= 0) playTrack(i);
      return;
    }
    const cur = tracks[currentIndex];
    if (isEmbedTrack(cur) && window.EdenShuffle) window.EdenShuffle.onEmbed(cur, playNext);
  }
  function playNext() {
    if (!tracks.length) return;
    const sh = shufflePick();
    if (sh >= 0) { playTrack(sh); if (queueIds) emitQueue(); return; }
    if (queueIds) {
      const q = queueStep(1);
      if (q >= 0) { playTrack(q); emitQueue(); return; }
      queueIds = null; emitQueue(); toast(i18n("cat.queueEnd")); return;
    }
    const next = (currentIndex + 1) % tracks.length;
    playTrack(next);
  }

  function playPrev() {
    if (!tracks.length) return;
    const a = ensureAudio();
    if (!isEmbedTrack(tracks[currentIndex]) && a.currentTime > 3) {
      a.currentTime = 0;
      return;
    }
    if (window.EdenShuffle && window.EdenShuffle.on()) {
      const pid = window.EdenShuffle.prevId(currentId);
      const pi = pid ? tracks.findIndex((x) => x.id === pid) : -1;
      if (pi >= 0) { playTrack(pi); if (queueIds) emitQueue(); return; }
    }
    if (queueIds) {
      const q = queueStep(-1);
      if (q >= 0) { playTrack(q); emitQueue(); }
      return;
    }
    const prev = (currentIndex - 1 + tracks.length) % tracks.length;
    playTrack(prev);
  }

  function syncProgress() {
    const a = ensureAudio();
    const cur = a.currentTime || 0;
    const dur = a.duration || 0;
    const pct = dur ? (cur / dur) * 100 : 0;

    $$(".progress-fill").forEach((el) => (el.style.width = pct + "%"));
    $$(".time.current").forEach((el) => (el.textContent = formatTime(cur)));
    $$(".time.end").forEach((el) => (el.textContent = formatTime(dur)));
  }

  function seekFromEvent(e, bar) {
    if (isEmbedTrack(tracks[currentIndex])) return;
    const a = ensureAudio();
    if (!a.duration) return;
    const rect = bar.getBoundingClientRect();
    const clientX = e.clientX != null ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    let t = ratio * a.duration;
    a.currentTime = t;
  }

  function iconPlay() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`;
  }
  function iconPause() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>`;
  }
  function iconShuffle() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>`;
  }
  function iconPrev() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>`;
  }
  function iconNext() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/></svg>`;
  }

  function updatePlayButtons(playing) {
    $$(".ctrl-btn.play").forEach((btn) => {
      btn.setAttribute("aria-label", playing ? i18n("player.pause") : i18n("player.play"));
      btn.innerHTML = playing ? iconPause() : iconPlay();
    });
    $$("[data-play-label]").forEach((el) => {
      el.textContent = playing && currentIndex === Number(el.dataset.trackIndex)
        ? i18n("player.pause")
        : i18n("player.listen");
    });
  }

  function showPlayerBar(t) {
    const bar = $(".player-bar");
    if (!bar) return;
    bar.classList.add("visible");
    const cover = $(".player-cover img", bar);
    const title = $(".player-now-meta .title", bar);
    const artist = $(".player-now-meta .artist", bar);
    if (cover) {
      cover.src = t.cover_url || "";
      cover.alt = t.title || "";
    }
    if (title) title.textContent = t.title || "";
    if (artist) artist.textContent = t.artist || cfg.artistName || "";

    const suno = $(".player-extra .js-suno-link", bar);
    if (suno) {
      if (t.suno_share) {
        suno.href = t.suno_share;
        suno.hidden = false;
      } else {
        suno.hidden = true;
      }
    }
  }

  function highlightActiveRow() {
    $$(".track-row").forEach((row) => {
      const idx = Number(row.dataset.index);
      row.classList.toggle("is-active", idx === currentIndex);
    });
  }

  function updatePlayerCard(t) {
    const card = $(".player-card");
    if (!card) return;
    if (!t) {
      const title = $("[data-player-title]", card);
      const artist = $("[data-player-artist]", card);
      if (title) title.textContent = i18n("player.noFeatured");
      if (artist) artist.textContent = "";
      return;
    }
    const img = $(".player-card-cover img", card);
    const ph = $(".player-card-cover", card);
    if (img && t.cover_url) {
      img.src = t.cover_url;
      img.alt = t.title;
      img.hidden = false;
      if (ph) ph.classList.remove("placeholder");
    }
    const title = $("[data-player-title]", card);
    const artist = $("[data-player-artist]", card);
    if (title) title.textContent = t.title;
    if (artist) artist.textContent = t.artist || cfg.artistName || "";
    const suno = $(".js-suno-link", card);
    if (suno && t.suno_share) suno.href = t.suno_share;
  }

  function initPlayerBar() {
    let bar = $(".player-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "player-bar";
      bar.innerHTML = `
        <div class="player-inner">
          <div class="player-now">
            <div class="player-cover"><img src="" alt=""></div>
            <div class="player-now-meta">
              <div class="title">—</div>
              <div class="artist">—</div>
            </div>
          </div>
          <div class="player-controls">
            <div class="player-btns">
              <button type="button" class="ctrl-btn js-shuffle" aria-pressed="false" aria-label="${i18n("shuffle.aria")}" title="${i18n("shuffle.aria")}">${iconShuffle()}<span class="js-shuffle-label shuffle-bar-label">${i18n("shuffle.label")}</span></button>
              <button type="button" class="ctrl-btn js-prev" aria-label="${i18n("player.prev")}">${iconPrev()}</button>
              <button type="button" class="ctrl-btn play js-toggle" aria-label="${i18n("player.play")}">${iconPlay()}</button>
              <button type="button" class="ctrl-btn js-next" aria-label="${i18n("player.next")}">${iconNext()}</button>
            </div>
            <div class="progress-row">
              <span class="time current">0:00</span>
              <div class="progress" role="slider" aria-label="${i18n("player.progress")}" tabindex="0"><div class="progress-fill"></div></div>
              <span class="time end">0:00</span>
            </div>
          </div>
          <div class="player-extra">
            <div class="volume-wrap" title="${i18n("player.volume")}">
              <span aria-hidden="true">♪</span>
              <input type="range" min="0" max="1" step="0.01" value="1" class="js-volume" aria-label="${i18n("player.volume")}">
            </div>
            <a class="btn btn-suno js-suno-link" href="#" target="_blank" rel="noopener" hidden style="padding:0.45rem 0.9rem;font-size:0.8rem;">Suno</a>
          </div>
          <div class="player-embed" hidden></div>
        </div>`;
      document.body.appendChild(bar);
    }

    bar.querySelector(".js-toggle")?.addEventListener("click", togglePlay);
    bar.querySelector(".js-prev")?.addEventListener("click", playPrev);
    bar.querySelector(".js-next")?.addEventListener("click", playNext);
    bar.querySelector(".js-volume")?.addEventListener("input", (e) => {
      ensureAudio().volume = Number(e.target.value);
    });
    const progress = bar.querySelector(".progress");
    if (progress && !progress.dataset.seekBound) {
      progress.dataset.seekBound = "1";
      let dragging = false;
      const onPointer = (e) => {
        if (e.cancelable) e.preventDefault();
        seekFromEvent(e, progress);
      };
      progress.addEventListener("click", onPointer);
      progress.addEventListener("pointerdown", (e) => {
        dragging = true;
        progress.setPointerCapture?.(e.pointerId);
        onPointer(e);
      });
      progress.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        onPointer(e);
      });
      const endDrag = () => { dragging = false; };
      progress.addEventListener("pointerup", endDrag);
      progress.addEventListener("pointercancel", endDrag);
    }
  }

  // ---------- Render track list ----------
  function renderTrackList(container) {
    if (!container) return;
    const withSoon = container.dataset.soonSlots !== "0";

    let html = "";
    tracks.forEach((t, i) => {
      const embed = isEmbedTrack(t);
      const badge = embed
        ? `<span class="track-badge suno-embed-badge">Suno</span>`
        : `<span class="track-badge">${escapeHtml(i18n("player.available"))}</span>`;
      html += `
        <article class="track-row${embed ? " is-embed" : ""}" data-index="${i}" role="button" tabindex="0" aria-label="${escapeAttr(i18n("player.playTrack", { title: t.title }))}">
          <span class="track-num">${String(i + 1).padStart(2, "0")}</span>
          <div class="track-cover">
            ${t.cover_url
              ? `<img src="${escapeAttr(t.cover_url)}" alt="">`
              : `<div class="track-cover placeholder">♫</div>`}
          </div>
          <div class="track-info">
            <h3>${escapeHtml(t.title)}${t.new ? ` <span class="track-new">${escapeHtml(i18n("player.new"))}</span>` : ""}</h3>
            <div class="sub">${escapeHtml(t.artist || cfg.artistName || "")}</div>
          </div>
          ${badge}
          <button type="button" class="track-play-btn" aria-label="${escapeAttr(i18n("player.playAria"))}">${iconPlay()}</button>
        </article>`;
    });

    if (withSoon) {
      for (let s = 0; s < 2; s++) {
        html += `
          <article class="track-row is-soon" aria-disabled="true">
            <span class="track-num">—</span>
            <div class="track-cover placeholder">◇</div>
            <div class="track-info">
              <h3>${escapeHtml(i18n("player.soon"))}</h3>
              <div class="sub">${escapeHtml(i18n("player.soonSub"))}</div>
            </div>
            <span class="track-badge soon">${escapeHtml(i18n("player.soon"))}</span>
            <button type="button" class="track-play-btn" disabled aria-hidden="true">${iconPlay()}</button>
          </article>`;
      }
    }

    container.innerHTML = html || `<p class="hint">${escapeHtml(i18n("player.empty"))}</p>`;

    container.querySelectorAll(".track-row:not(.is-soon)").forEach((row) => {
      const play = () => playTrack(Number(row.dataset.index));
      row.addEventListener("click", (e) => {
        if (e.target.closest("a")) return;
        play();
      });
      row.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          play();
        }
      });
    });
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, "&#39;");
  }

  // ---------- Featured / home ----------
  function bindPlayIndex(btn, idx) {
    if (!btn) return;
    btn.dataset.trackIndex = String(idx);
    if (btn.dataset.bound) return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const i = Number(btn.dataset.trackIndex);
      if (Number.isFinite(i) && i >= 0) playTrack(i);
    });
  }

  function renderFeatured() {
    const card = $(".featured-card");
    if (!card) return;
    if (featuredTemplate == null) featuredTemplate = card.innerHTML;
    const featured = startTrack();
    if (!featured) {
      card.innerHTML = `<div class="featured-inner"><p class="hint">${escapeHtml(i18n("player.noFeatured"))}</p></div>`;
      $$(".js-play-featured").forEach((btn) => {
        btn.dataset.trackIndex = "-1";
      });
      return;
    }
    if (!$("[data-featured-title]", card)) {
      card.innerHTML = featuredTemplate;
      card.querySelectorAll("[data-i18n]").forEach((el) => {
        el.textContent = i18n(el.getAttribute("data-i18n"));
      });
    }
    const idx = tracks.indexOf(featured);
    const cover = $(".featured-cover img", card);
    const title = $("[data-featured-title]", card);
    const artist = $("[data-featured-artist]", card);
    const playBtn = $(".js-featured-play", card);
    const sunoBtn = $(".js-suno-link", card);

    if (cover && featured.cover_url) {
      cover.src = featured.cover_url;
      cover.alt = featured.title;
    }
    if (title) title.textContent = featured.title;
    if (artist) artist.textContent = featured.artist || cfg.artistName || "";
    bindPlayIndex(playBtn, idx);
    if (sunoBtn && featured.suno_share) {
      sunoBtn.href = featured.suno_share;
      sunoBtn.hidden = false;
    } else if (sunoBtn) {
      sunoBtn.hidden = true;
    }

    $$(".js-play-featured").forEach((btn) => bindPlayIndex(btn, idx));
  }

  // ---------- PayPal ----------
  function initPayPal() {
    const status = $(".paypal-status");
    const btn = $(".js-paypal-btn");
    const url = (cfg.paypalUrl || "").trim();

    if (!status && !btn) return;

    if (url) {
      if (status) {
        status.className = "paypal-status ready";
        status.textContent = i18n("support.paypalReady");
      }
      if (btn) {
        btn.classList.remove("is-disabled");
        btn.removeAttribute("aria-disabled");
        btn.href = url;
        btn.target = "_blank";
        btn.rel = "noopener noreferrer";
        btn.textContent = i18n("support.paypalBtn");
        // keep one listener via flag
        if (!btn.dataset.paypalBound) {
          btn.dataset.paypalBound = "1";
          btn.addEventListener("click", () => {
            // allow default navigation when configured
          });
        }
      }
    } else {
      if (status) {
        status.className = "paypal-status pending";
        status.textContent = i18n("support.paypalPending");
      }
      if (btn) {
        btn.classList.add("is-disabled");
        btn.setAttribute("aria-disabled", "true");
        btn.href = "#";
        btn.textContent = i18n("support.paypalBtn");
        if (!btn.dataset.paypalBound) {
          btn.dataset.paypalBound = "1";
          btn.addEventListener("click", (e) => {
            if (btn.classList.contains("is-disabled")) {
              e.preventDefault();
              toast(i18n("toast.paypalMissing"));
            }
          });
        }
      }
    }
  }

  // ---------- Invitations ----------
  function initInvitations() {
    const box = $(".template-box");
    if (!box) return;

    const siteUrl = cfg.siteUrl || "https://votresite.example.com";
    const artist = cfg.artistName || "Eden Yours";
    const site = cfg.siteName || "Eden Yours";
    const featured = tracks.find((t) => t.featured) || tracks[0];
    const songTitle = featured ? featured.title : i18n("invite.libraryFallback");
    const suno = featured?.suno_share || "";

    const tagline = i18n("common.tagline");
    const songTitleSafe = featured ? featured.title : i18n("invite.libraryFallback");
    let extra = "";
    if (suno) {
      extra = i18n("invite.extraSuno", { songTitle: songTitleSafe, suno });
    } else if (featured) {
      extra = i18n("invite.extraFeatured", { songTitle: songTitleSafe });
    }
    const template = i18n("invite.templateBody", {
      site,
      siteUrl,
      artist,
      extra: extra ? extra + "\n" : "",
    }).replace(/\n\n\n+/g, "\n\n").trim();

    box.textContent = template;

    const copyBtn = $(".js-copy-invite");
    if (copyBtn && !copyBtn.dataset.bound) {
      copyBtn.dataset.bound = "1";
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(box.textContent);
          toast(i18n("invite.copied"));
        } catch {
          const range = document.createRange();
          range.selectNodeContents(box);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          toast(i18n("invite.selectCopy"));
        }
      });
    }

    const mailBtn = $(".js-mailto-invite");
    if (mailBtn) {
      const subject = encodeURIComponent(`${tagline} — ${site}`);
      const body = encodeURIComponent(template);
      const to = (cfg.contactEmail || "").trim();
      mailBtn.href = `mailto:${to}?subject=${subject}&body=${body}`;
    }
  }


  // ---------- Public API for inline handlers ----------
  window.EdenPlayer = {
    play: playTrack,
    toggle: togglePlay,
    next: playNext,
    prev: playPrev,
    getTracks: () => tracks.slice(),
  };

  // ---------- Boot ----------
  function refreshPlayerLabels() {
    const bar = $(".player-bar");
    if (!bar) return;
    const set = (sel, key, attr = "aria-label") => { const n = bar.querySelector(sel); if (n) n.setAttribute(attr, i18n(key)); };
    set(".js-prev", "player.prev");
    set(".js-next", "player.next");
    set(".progress", "player.progress");
    set(".js-volume", "player.volume");
    set(".volume-wrap", "player.volume", "title");
  }

  function refreshLangUI() {
    refreshPlayerLabels();
    const wasActive = currentIndex >= 0;
    const prevId = currentId;
    applyLangFilter();
    // Chanson jumelle dans la nouvelle langue (ex. Le Grand Oui ↔ The Big Yes) : on la lance à la place.
    const wasPlaying = window.__edenLangStopWasPlaying !== false;
    const twin = wasActive && wasPlaying && currentIndex < 0 && window.EdenSongPick && window.EdenSongPick.counterpart ? window.EdenSongPick.counterpart(prevId, tracks) : null;
    if (twin) { const ti = tracks.findIndex((t) => t.id === twin.id); if (ti >= 0) { playTrack(ti); } }
    // Mode aléatoire : la chanson est arrêtée au changement de langue, puis ça continue dans la nouvelle langue.
    if (wasActive && currentIndex < 0 && window.EdenShuffle && window.EdenShuffle.on()) shuffleKick();
    renderFeatured();
    renderTrackList($(".track-list"));
    const head = headTrack();
    updatePlayerCard(currentIndex >= 0 ? tracks[currentIndex] : head);
    highlightActiveRow();
    updatePlayButtons(audio && !audio.paused && currentIndex >= 0);
    initPayPal();
    initInvitations();
    if (window.EdenShuffle) window.EdenShuffle.refresh();
    // Re-apply static i18n after dynamic HTML rebuilds if needed
    if (window.EdenI18n && window.EdenI18n.apply) {
      // only refresh switcher pressed state; avoid listener loop by not calling apply here
      document.querySelectorAll(".lang-btn").forEach((btn) => {
        const l = btn.getAttribute("data-set-lang");
        const active = l === window.EdenI18n.getLang();
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }
  }

  async function boot() {
    applyConfig();
    initNav();
    initPlayerBar();
    await loadTracks();
    renderFeatured();
    renderTrackList($(".track-list"));
    updatePlayerCard(headTrack());
    initPayPal();
    initInvitations();

    // Page-level play buttons that reference first track
    $$(".js-play-first").forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        if (tracks.length) playTrack(startIndex());
      });
    });

    if (window.EdenI18n && window.EdenI18n.onChange) {
      window.EdenI18n.onChange(() => refreshLangUI());
    }
    if (window.EdenShuffle) {
      window.EdenShuffle.refresh();
      // Mode aléatoire resté actif d'une page à l'autre : on reprend (si le navigateur refuse l'autoplay, eden-autoplay.js affiche « Touche pour écouter »).
      if (window.EdenShuffle.on() && tracks.length) setTimeout(() => { if (currentIndex < 0) shuffleKick(); }, 500);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
