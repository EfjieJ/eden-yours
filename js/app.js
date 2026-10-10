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


  // ---------- Freemium unlock ----------
  function previewLimit() {
    const n = Number(cfg.FREE_PREVIEW_SECONDS != null ? cfg.FREE_PREVIEW_SECONDS : cfg.previewSeconds);
    return Number.isFinite(n) && n > 0 ? n : Infinity; // 0 = chanson entière
  }

  function unlockKey() {
    return cfg.unlockStorageKey || "eden-yours-unlocked";
  }

  function isUnlocked() {
    if (previewLimit() === Infinity) return true;
    try {
      return localStorage.getItem(unlockKey()) === "1";
    } catch {
      return false;
    }
  }

  function setUnlocked(on) {
    try {
      if (on) localStorage.setItem(unlockKey(), "1");
      else localStorage.removeItem(unlockKey());
    } catch (_) {}
  }

  function unlockPaypalHref() {
    return (cfg.unlockPaypalUrl || cfg.paypalUrl || "https://paypal.me/Francjul").trim();
  }

  let unlockModalEl = null;

  function refreshUnlockModalCopy() {
    if (!unlockModalEl) return;
    const title = unlockModalEl.querySelector("[data-unlock-title]");
    const body = unlockModalEl.querySelector("[data-unlock-body]");
    const pay = unlockModalEl.querySelector("[data-unlock-pay]");
    const paid = unlockModalEl.querySelector("[data-unlock-paid]");
    if (title) title.textContent = i18n("unlock.title");
    if (body) body.textContent = i18n("unlock.body");
    if (pay) pay.textContent = i18n("unlock.payCta");
    if (paid) paid.textContent = i18n("unlock.alreadyPaid");
  }

  function ensureUnlockModal() {
    if (unlockModalEl) return unlockModalEl;
    const el = document.createElement("div");
    el.id = "unlock-modal";
    el.className = "unlock-modal";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.hidden = true;
    el.innerHTML = `
      <div class="unlock-modal-backdrop" data-unlock-close tabindex="-1"></div>
      <div class="unlock-modal-card">
        <p class="unlock-modal-eyebrow">Eden Yours</p>
        <h2 class="unlock-modal-title" data-unlock-title></h2>
        <p class="unlock-modal-body" data-unlock-body></p>
        <div class="unlock-modal-actions">
          <button type="button" class="btn btn-primary" data-unlock-pay></button>
          <button type="button" class="btn btn-ghost" data-unlock-paid></button>
        </div>
      </div>`;
    document.body.appendChild(el);

    el.querySelector("[data-unlock-pay]").addEventListener("click", () => {
      const url = unlockPaypalHref();
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    });
    el.querySelector("[data-unlock-paid]").addEventListener("click", () => {
      setUnlocked(true);
      hideUnlockModal();
      updatePreviewBadges();
      if (isEmbedTrack(tracks[currentIndex])) return;
      const a = ensureAudio();
      const limit = previewLimit();
      if (a.currentTime >= limit - 0.35) a.currentTime = 0;
      a.play().catch(() => {});
    });
    el.querySelector("[data-unlock-close]").addEventListener("click", () => {
      hideUnlockModal();
    });

    unlockModalEl = el;
    refreshUnlockModalCopy();
    return el;
  }

  function showUnlockModal() {
    const el = ensureUnlockModal();
    refreshUnlockModalCopy();
    el.hidden = false;
    el.classList.add("is-open");
    document.body.classList.add("unlock-modal-open");
  }

  function hideUnlockModal() {
    if (!unlockModalEl) return;
    unlockModalEl.hidden = true;
    unlockModalEl.classList.remove("is-open");
    document.body.classList.remove("unlock-modal-open");
  }

  function enforcePreviewGate() {
    if (isUnlocked()) return;
    const a = audio;
    if (!a) return;
    const limit = previewLimit();
    if (a.currentTime >= limit) {
      try { a.currentTime = limit; } catch (_) {}
      if (!a.paused) a.pause();
      showUnlockModal();
    }
  }

  function updatePreviewBadges() {
    const unlocked = isUnlocked();
    $$(".track-row:not(.is-soon):not(.is-embed) .track-badge").forEach((badge) => {
      if (badge.classList.contains("soon")) return;
      badge.classList.toggle("preview", !unlocked);
      badge.textContent = unlocked
        ? i18n("player.available")
        : i18n("unlock.previewBadge");
    });
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
    const lang = siteLang();
    tracks = window.EdenSongPick ? window.EdenSongPick.forLang(allTracks, lang) : allTracks.filter((t) => t && t.lang === lang);
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

    audio.addEventListener("timeupdate", () => {
      enforcePreviewGate();
      syncProgress();
    });
    audio.addEventListener("seeking", enforcePreviewGate);
    audio.addEventListener("seeked", enforcePreviewGate);
    audio.addEventListener("loadedmetadata", syncProgress);
    // Locked: still allow playNext so each track gets its own 30s preview
    audio.addEventListener("ended", () => playNext());
    audio.addEventListener("play", () => updatePlayButtons(true));
    audio.addEventListener("pause", () => updatePlayButtons(false));

    return audio;
  }

  function getTrack(i) {
    return tracks[i] || null;
  }

  // ---------- Suno embed tracks (embed_url, no local audio) ----------
  // Suno's own player handles playback: no 30 s freemium gate, no <audio>.
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
    hideUnlockModal();
    currentIndex = index;
    currentId = t.id;
    showPlayerBar(t);
    showEmbed(t);
    highlightActiveRow();
    updatePlayerCard(t);
    updatePlayButtons(false);
  }

  function playTrack(index) {
    if (index < 0 || index >= tracks.length) return;
    const t = tracks[index];
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

  function playNext() {
    if (!tracks.length) return;
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
    if (!isUnlocked()) t = Math.min(t, previewLimit());
    a.currentTime = t;
  }

  function iconPlay() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`;
  }
  function iconPause() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>`;
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
    ensureUnlockModal();
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
        : `<span class="track-badge${isUnlocked() ? "" : " preview"}">${escapeHtml(isUnlocked() ? i18n("player.available") : i18n("unlock.previewBadge"))}</span>`;
      html += `
        <article class="track-row${embed ? " is-embed" : ""}" data-index="${i}" role="button" tabindex="0" aria-label="${escapeAttr(i18n("player.playTrack", { title: t.title }))}">
          <span class="track-num">${String(i + 1).padStart(2, "0")}</span>
          <div class="track-cover">
            ${t.cover_url
              ? `<img src="${escapeAttr(t.cover_url)}" alt="">`
              : `<div class="track-cover placeholder">♫</div>`}
          </div>
          <div class="track-info">
            <h3>${escapeHtml(t.title)}</h3>
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


  // ---------- Song request (Demander une chanson) ----------
  function initSongRequest() {
    const form = $("#song-request-form");
    if (!form) return;

    const nameEl = $("#req-name");
    const emailEl = $("#req-email");
    const sunoEl = $("#req-suno");
    const descEl = $("#req-desc");
    const validation = $("#req-validation");
    const after = $("#request-after");
    const summaryBox = $(".js-request-summary");
    const mailtoBtn = $(".js-mailto-request");
    const paypalAgain = $(".js-paypal-again");
    const payBtn = $(".js-request-paypal", form);

    const contact = (cfg.contactEmail || "efjie8008@gmail.com").trim();
    const paypalBase = (cfg.paypalUrl || "https://paypal.me/Francjul").replace(/\/$/, "");

    function selectedCurrency() {
      const checked = form.querySelector('input[name="currency"]:checked');
      return checked ? checked.value : "EUR";
    }

    function amountLabel(cur) {
      return cur === "USD" ? i18n("request.amountUsd") : i18n("request.amountEur");
    }

    function paypalAmountUrl(cur) {
      // paypal.me/<handle>/<amount><CURRENCY> — verified working
      return cur === "USD"
        ? paypalBase + "/10USD"
        : paypalBase + "/10EUR";
    }

    function buildSummary() {
      const name = (nameEl?.value || "").trim();
      const email = (emailEl?.value || "").trim();
      const suno = (sunoEl?.value || "").trim();
      const desc = (descEl?.value || "").trim();
      const cur = selectedCurrency();
      const lines = [
        i18n("request.summaryTitle"),
        "",
        i18n("request.summaryName") + name,
        i18n("request.summaryEmail") + email,
        i18n("request.summaryCurrency") + amountLabel(cur) + " (" + cur + ")",
        i18n("request.summaryPaypal") + paypalAmountUrl(cur),
      ];
      if (suno) lines.push(i18n("request.summarySuno") + suno);
      if (desc) {
        lines.push("");
        lines.push(i18n("request.summaryDesc"));
        lines.push(desc);
      }
      lines.push("");
      lines.push(i18n("request.summaryFooter"));
      return lines.join("\n");
    }

    function validate() {
      const name = (nameEl?.value || "").trim();
      const email = (emailEl?.value || "").trim();
      const suno = (sunoEl?.value || "").trim();
      const desc = (descEl?.value || "").trim();
      if (!name) return i18n("request.errName");
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return i18n("request.errEmail");
      }
      if (!suno && !desc) {
        return i18n("request.errContent");
      }
      if (suno) {
        try {
          const u = new URL(suno);
          if (!/^https?:$/.test(u.protocol)) return i18n("request.errSunoProto");
        } catch {
          return i18n("request.errSunoUrl");
        }
      }
      return "";
    }

    function showValidation(msg) {
      if (!validation) return;
      if (msg) {
        validation.hidden = false;
        validation.textContent = msg;
      } else {
        validation.hidden = true;
        validation.textContent = "";
      }
    }

    function updatePayLabel() {
      if (!payBtn) return;
      const cur = selectedCurrency();
      payBtn.textContent = cur === "USD"
        ? i18n("request.payUsd")
        : i18n("request.payEur");
    }

    async function copySummary(text) {
      try {
        await navigator.clipboard.writeText(text);
        toast(i18n("request.copied"));
        return true;
      } catch {
        if (summaryBox) {
          const range = document.createRange();
          range.selectNodeContents(summaryBox);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
        toast(i18n("request.selectCopy"));
        return false;
      }
    }

    function revealAfter(summary, cur) {
      if (summaryBox) summaryBox.textContent = summary;
      if (mailtoBtn) {
        const subject = encodeURIComponent(i18n("request.summaryTitle"));
        const body = encodeURIComponent(summary);
        mailtoBtn.href = `mailto:${contact}?subject=${subject}&body=${body}`;
      }
      if (paypalAgain) {
        paypalAgain.href = paypalAmountUrl(cur);
      }
      if (after) {
        after.hidden = false;
        after.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }

    if (!form.dataset.edenBound) {
      form.dataset.edenBound = "1";
      form.querySelectorAll('input[name="currency"]').forEach((radio) => {
        radio.addEventListener("change", updatePayLabel);
      });

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const err = validate();
        if (err) {
          showValidation(err);
          toast(err);
          return;
        }
        showValidation("");
        const cur = selectedCurrency();
        const summary = buildSummary();
        await copySummary(summary);
        revealAfter(summary, cur);
        const url = paypalAmountUrl(cur);
        window.open(url, "_blank", "noopener,noreferrer");
      });

      $$(".js-copy-request").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const err = validate();
          if (err) {
            showValidation(err);
            toast(err);
            return;
          }
          showValidation("");
          const summary = buildSummary();
          if (summaryBox) summaryBox.textContent = summary;
          await copySummary(summary);
        });
      });

      $$(".js-copy-request-again").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const textVal = summaryBox?.textContent || buildSummary();
          await copySummary(textVal);
        });
      });
    }

    // Bind contact email display from config
    $$("[data-contact-email]").forEach((el) => {
      el.textContent = contact;
      if (el.tagName === "A") el.href = "mailto:" + contact;
    });
    updatePayLabel();
  }

  // ---------- Public API for inline handlers ----------
  window.EdenPlayer = {
    play: playTrack,
    toggle: togglePlay,
    next: playNext,
    prev: playPrev,
    getTracks: () => tracks.slice(),
    isUnlocked,
    unlock: () => { setUnlocked(true); hideUnlockModal(); updatePreviewBadges(); },
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
    applyLangFilter();
    renderFeatured();
    renderTrackList($(".track-list"));
    const head = headTrack();
    updatePlayerCard(currentIndex >= 0 ? tracks[currentIndex] : head);
    highlightActiveRow();
    updatePlayButtons(audio && !audio.paused && currentIndex >= 0);
    refreshUnlockModalCopy();
    updatePreviewBadges();
    initPayPal();
    initInvitations();
    initSongRequest();
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
    initSongRequest();

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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
