/* Eden Yours Platform — vanilla player + UI */
(function () {
  "use strict";

  const cfg = window.EDEN_CONFIG || {};
  let tracks = [];
  let currentIndex = -1;
  let audio = null;

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
      el.textContent = cfg.tagline || "Écoute en continu. Ça régénère.";
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
  async function loadTracks() {
    try {
      const res = await fetch("tracks.json", { cache: "no-store" });
      if (!res.ok) throw new Error("tracks.json introuvable");
      const data = await res.json();
      tracks = Array.isArray(data.tracks) ? data.tracks : [];
    } catch (err) {
      console.error(err);
      tracks = [];
    }
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

  function playTrack(index) {
    if (index < 0 || index >= tracks.length) return;
    const t = tracks[index];
    if (!t.audio_url) {
      toast("Audio local indisponible — ouvrez Sur Suno");
      return;
    }
    const a = ensureAudio();
    const switching = currentIndex !== index;
    currentIndex = index;

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
          toast("Impossible de lire la musique");
        }
      };
    }

    a.play().catch((e) => {
      console.warn("Lecture bloquée:", e);
      toast("Impossible de démarrer la lecture — tapez une fois pour autoriser le son");
    });

    showPlayerBar(t);
    highlightActiveRow();
    updatePlayerCard(t);
  }

  function togglePlay() {
    if (currentIndex < 0) {
      if (tracks.length) playTrack(0);
      return;
    }
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
    if (a.currentTime > 3) {
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
    const a = ensureAudio();
    if (!a.duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * a.duration;
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
      btn.setAttribute("aria-label", playing ? "Pause" : "Lecture");
      btn.innerHTML = playing ? iconPause() : iconPlay();
    });
    $$("[data-play-label]").forEach((el) => {
      el.textContent = playing && currentIndex === Number(el.dataset.trackIndex)
        ? "Pause"
        : "Écouter";
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
    if (!card || !t) return;
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
              <button type="button" class="ctrl-btn js-prev" aria-label="Précédent">${iconPrev()}</button>
              <button type="button" class="ctrl-btn play js-toggle" aria-label="Lecture">${iconPlay()}</button>
              <button type="button" class="ctrl-btn js-next" aria-label="Suivant">${iconNext()}</button>
            </div>
            <div class="progress-row">
              <span class="time current">0:00</span>
              <div class="progress" role="slider" aria-label="Progression" tabindex="0"><div class="progress-fill"></div></div>
              <span class="time end">0:00</span>
            </div>
          </div>
          <div class="player-extra">
            <div class="volume-wrap" title="Volume">
              <span aria-hidden="true">♪</span>
              <input type="range" min="0" max="1" step="0.01" value="1" class="js-volume" aria-label="Volume">
            </div>
            <a class="btn btn-suno js-suno-link" href="#" target="_blank" rel="noopener" hidden style="padding:0.45rem 0.9rem;font-size:0.8rem;">Suno</a>
          </div>
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
    if (progress) {
      progress.addEventListener("click", (e) => seekFromEvent(e, progress));
    }
  }

  // ---------- Render track list ----------
  function renderTrackList(container) {
    if (!container) return;
    const withSoon = container.dataset.soonSlots !== "0";

    let html = "";
    tracks.forEach((t, i) => {
      html += `
        <article class="track-row" data-index="${i}" role="button" tabindex="0" aria-label="Lire ${escapeHtml(t.title)}">
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
          <span class="track-badge">Disponible</span>
          <button type="button" class="track-play-btn" aria-label="Lire">${iconPlay()}</button>
        </article>`;
    });

    if (withSoon) {
      for (let s = 0; s < 2; s++) {
        html += `
          <article class="track-row is-soon" aria-disabled="true">
            <span class="track-num">—</span>
            <div class="track-cover placeholder">◇</div>
            <div class="track-info">
              <h3>Bientôt</h3>
              <div class="sub">Nouveau titre à venir</div>
            </div>
            <span class="track-badge soon">Bientôt</span>
            <button type="button" class="track-play-btn" disabled aria-hidden="true">${iconPlay()}</button>
          </article>`;
      }
    }

    container.innerHTML = html || `<p class="hint">Aucun titre pour le moment.</p>`;

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
  function renderFeatured() {
    const card = $(".featured-card");
    if (!card) return;
    const featured = tracks.find((t) => t.featured) || tracks[0];
    if (!featured) {
      card.innerHTML = `<div class="featured-inner"><p class="hint">Aucun titre en vedette.</p></div>`;
      return;
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
    if (playBtn) {
      playBtn.addEventListener("click", () => playTrack(idx));
    }
    if (sunoBtn && featured.suno_share) {
      sunoBtn.href = featured.suno_share;
    }

    // Also wire hero primary CTA
    $$(".js-play-featured").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        playTrack(idx);
      });
    });
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
        status.textContent = "● PayPal prêt";
      }
      if (btn) {
        btn.classList.remove("is-disabled");
        btn.removeAttribute("aria-disabled");
        btn.href = url;
        btn.target = "_blank";
        btn.rel = "noopener noreferrer";
        btn.addEventListener("click", (e) => {
          // allow default navigation
        });
      }
    } else {
      if (status) {
        status.className = "paypal-status pending";
        status.textContent = "● PayPal bientôt branché";
      }
      if (btn) {
        btn.classList.add("is-disabled");
        btn.setAttribute("aria-disabled", "true");
        btn.href = "#";
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          toast("PayPal n'est pas encore configuré");
        });
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
    const songTitle = featured ? featured.title : "la bibliothèque";
    const suno = featured?.suno_share || "";

    const tagline = cfg.tagline || "Écoute en continu. Ça régénère.";
    const template = `Hey —

Bienvenue sur ${site}.

Le retour à l'état d'Être, la reconnexion à la Cause Pure.
Ce n'est pas un site Web ordinaire — c'est une plateforme vibratoire, un espace sacré pour ceux qui ont réalisé qu'ils ne sont pas leur corps, mais l'être spirituel créateur qui génère la réalité.

Écoute en continu. Ça régénère.
Laisse les titres s'enchaîner : la musique devient pratique de Sensibilité Pure et de Fonction avant Structure.

→ ${siteUrl}
${suno ? `→ « ${songTitle} » aussi sur Suno : ${suno}` : (featured ? `→ Titre en vedette : « ${songTitle} »` : "")}

Entrez, découvrez, et ne l'oubliez plus.

— ${artist}`;

    box.textContent = template.trim();

    const copyBtn = $(".js-copy-invite");
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(box.textContent);
          toast("Modèle copié ✓");
        } catch {
          // fallback
          const range = document.createRange();
          range.selectNodeContents(box);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          toast("Sélectionnez et copiez (Ctrl+C)");
        }
      });
    }

    const mailBtn = $(".js-mailto-invite");
    if (mailBtn) {
      const subject = encodeURIComponent(`${tagline} — ${site}`);
      const body = encodeURIComponent(template.trim());
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
      return cur === "USD" ? "10 $ US" : "10 €";
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
        "Demande de chanson — Eden Yours",
        "",
        "Nom : " + name,
        "Courriel : " + email,
        "Devise / montant : " + amountLabel(cur) + " (" + cur + ")",
        "PayPal : " + paypalAmountUrl(cur),
      ];
      if (suno) lines.push("Lien Suno : " + suno);
      if (desc) {
        lines.push("");
        lines.push("Description / intention :");
        lines.push(desc);
      }
      lines.push("");
      lines.push("(Résumé généré sur la page Demander une chanson)");
      return lines.join("\n");
    }

    function validate() {
      const name = (nameEl?.value || "").trim();
      const email = (emailEl?.value || "").trim();
      const suno = (sunoEl?.value || "").trim();
      const desc = (descEl?.value || "").trim();
      if (!name) return "Indiquez votre nom.";
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return "Indiquez un courriel de contact valide.";
      }
      if (!suno && !desc) {
        return "Ajoutez un lien Suno et/ou une description de votre demande.";
      }
      if (suno) {
        try {
          const u = new URL(suno);
          if (!/^https?:$/.test(u.protocol)) return "Le lien Suno doit commencer par https://";
        } catch {
          return "Le lien Suno n'est pas une URL valide.";
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
        ? "Payer 10 $ US via PayPal"
        : "Payer 10 € via PayPal";
    }

    async function copySummary(text) {
      try {
        await navigator.clipboard.writeText(text);
        toast("Résumé copié ✓ — collez-le dans la note PayPal");
        return true;
      } catch {
        if (summaryBox) {
          const range = document.createRange();
          range.selectNodeContents(summaryBox);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
        toast("Sélectionnez et copiez le résumé (Ctrl+C)");
        return false;
      }
    }

    function revealAfter(summary, cur) {
      if (summaryBox) summaryBox.textContent = summary;
      if (mailtoBtn) {
        const subject = encodeURIComponent("Demande de chanson — Eden Yours");
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

    form.querySelectorAll('input[name="currency"]').forEach((radio) => {
      radio.addEventListener("change", updatePayLabel);
    });
    updatePayLabel();

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
        const text = summaryBox?.textContent || buildSummary();
        await copySummary(text);
      });
    });

    // Bind contact email display from config
    $$("[data-contact-email]").forEach((el) => {
      el.textContent = contact;
      if (el.tagName === "A") el.href = "mailto:" + contact;
    });
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
  async function boot() {
    applyConfig();
    initNav();
    initPlayerBar();
    await loadTracks();
    renderFeatured();
    renderTrackList($(".track-list"));
    updatePlayerCard(tracks.find((t) => t.featured) || tracks[0]);
    initPayPal();
    initInvitations();
    initSongRequest();

    // Page-level play buttons that reference first track
    $$(".js-play-first").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        if (tracks.length) playTrack(0);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
