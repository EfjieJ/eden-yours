/* Eden Yours — thèmes (catégories) des chansons : « Explorer par thème » (accueil) + filtres de la bibliothèque.
   Données : data/categories.json (catégories FR/EN + une catégorie principale par chanson, établie d'après les paroles).
   Langue : uniquement les chansons de la langue active (EdenSongPick.forLang) — aucune chanson d'une autre langue n'est comptée ni listée.
   Lecture : « Lire toute la catégorie » met les chansons du thème en file (EdenLibrary.playQueue) : chaque chanson joue en entier. */
(function () {
  "use strict";
  var DATA = null, TRACKS = [], current = "all";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function t(key, vars) { return window.EdenI18n && window.EdenI18n.t ? window.EdenI18n.t(key, vars) : key; }
  function lang() { return window.EdenSongPick ? window.EdenSongPick.lang() : (window.EdenI18n && window.EdenI18n.getLang ? window.EdenI18n.getLang() : "fr"); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function loc(o) { return (o && (o[lang()] || o.fr)) || ""; }

  /* chansons jouables de la langue active, regroupées par catégorie principale */
  function groups() {
    var l = lang(), pool = window.EdenSongPick ? window.EdenSongPick.forLang(TRACKS, l) : TRACKS.filter(function (x) { return x.lang === l; });
    var by = {}; DATA.categories.forEach(function (c) { by[c.id] = []; });
    pool.forEach(function (tr) {
      var m = DATA.tracks[tr.id]; if (!m || !by[m.primary]) return;
      by[m.primary].push(tr);
    });
    return by;
  }
  function cats() {
    var by = groups();
    return DATA.categories.slice().sort(function (a, b) { return a.order - b.order; })
      .map(function (c) { return { def: c, songs: by[c.id] }; })
      .filter(function (c) { return c.songs.length; });
  }
  function countLabel(n) { return t(n === 1 ? "cat.one" : "cat.many", { n: n }); }
  function pillarName(c) { return DATA.pillars[c.pillar] ? loc(DATA.pillars[c.pillar]) : ""; }
  function libHref(id) { return "bibliotheque.html?cat=" + id + "&lang=" + lang() + "#themes"; }
  function playAll(id) {
    var c = cats().filter(function (x) { return x.def.id === id; })[0]; if (!c) return;
    // Les chansons à fichier audio d'abord (elles s'enchaînent seules, en entier) ; les titres « embed Suno » (lecteur Suno,
    // qui ne peut pas passer seul à la suite) viennent en dernier pour ne jamais interrompre l'enchaînement.
    var files = c.songs.filter(function (x) { return !!x.audio_url; }), embeds = c.songs.filter(function (x) { return !x.audio_url; });
    if (window.EdenLibrary && window.EdenLibrary.playQueue) window.EdenLibrary.playQueue(files.concat(embeds).map(function (x) { return x.id; }));
  }

  /* ——— accueil : cartes ——— */
  function renderHome(box) {
    var list = cats();
    box.innerHTML = list.map(function (c) {
      var d = c.def, name = loc(d.name);
      return '<article class="cat-card" data-cat="' + esc(d.id) + '" style="--cat-i:' + d.order + '">' +
        '<div class="cat-card-top"><span class="cat-icon" aria-hidden="true">' + esc(d.icon) + '</span><span class="cat-count">' + esc(countLabel(c.songs.length)) + '</span></div>' +
        '<h3>' + esc(name) + '</h3>' +
        '<p class="cat-pillar">' + esc(t("cat.pillar", { name: pillarName(d) })) + '</p>' +
        '<p class="cat-desc">' + esc(loc(d.description)) + '</p>' +
        '<div class="cat-actions">' +
        '<button type="button" class="btn btn-primary cat-play" data-cat-play="' + esc(d.id) + '" aria-label="' + esc(t("cat.playAll") + " — " + name) + '">' + esc(t("cat.playAll")) + '</button>' +
        '<a class="btn btn-ghost cat-view" href="' + libHref(d.id) + '" data-lang-href="bibliotheque.html?cat=' + esc(d.id) + '#themes" aria-label="' + esc(t("cat.viewList") + " — " + name) + '">' + esc(t("cat.viewList")) + '</a>' +
        '</div></article>';
    }).join("");
    var hint = $("#parcours .cat-sequence"); if (hint) hint.textContent = t("cat.sequence");
    var close = $("#parcours .cat-closing"); if (close) close.textContent = "« " + loc(DATA.tagline) + " »";
    bindPlay(box); markPlaying();
  }

  /* ——— bibliothèque : puces + panneau + filtre de la liste ——— */
  function renderLibrary(box) {
    var list = cats(), total = list.reduce(function (n, c) { return n + c.songs.length; }, 0);
    if (current !== "all" && !list.some(function (c) { return c.def.id === current; })) current = "all";
    var chips = '<button type="button" class="cat-chip" data-cat-chip="all" aria-pressed="' + (current === "all") + '">' + esc(t("cat.all")) + ' <span class="cat-chip-n">' + total + '</span></button>';
    chips += list.map(function (c) {
      return '<button type="button" class="cat-chip" data-cat-chip="' + esc(c.def.id) + '" aria-pressed="' + (current === c.def.id) + '"><span aria-hidden="true">' + esc(c.def.icon) + '</span> ' + esc(loc(c.def.name)) + ' <span class="cat-chip-n">' + c.songs.length + '</span></button>';
    }).join("");
    var sel = list.filter(function (c) { return c.def.id === current; })[0];
    var panel = "";
    if (sel) {
      panel = '<div class="cat-panel" role="status"><div><h2>' + esc(loc(sel.def.name)) + '</h2><p>' + esc(loc(sel.def.description)) + '</p><p class="cat-pillar">' + esc(t("cat.pillar", { name: pillarName(sel.def) })) + " · " + esc(countLabel(sel.songs.length)) + '</p></div>' +
        '<button type="button" class="btn btn-primary cat-play" data-cat-play="' + esc(sel.def.id) + '">' + esc(t("cat.playAll")) + '</button></div>';
    }
    box.innerHTML = '<div class="cat-chips" role="group" aria-label="' + esc(t("cat.chipsAria")) + '">' + chips + '</div>' + panel;
    box.querySelectorAll("[data-cat-chip]").forEach(function (b) {
      b.addEventListener("click", function () { select(b.getAttribute("data-cat-chip")); });
    });
    bindPlay(box); markPlaying(); filterList();
  }
  function select(id) {
    current = id;
    try { var u = new URL(location.href); if (id === "all") u.searchParams.delete("cat"); else u.searchParams.set("cat", id); history.replaceState(history.state, "", u.pathname + u.search + u.hash); } catch (e) {}
    var box = $("[data-cat-library]"); if (box) renderLibrary(box);
  }
  function filterList() {
    var wrap = $(".track-list"); if (!wrap || !window.EdenLibrary) return;
    var tracks = window.EdenLibrary.tracks(), by = groups(), ok = null;
    if (current !== "all") { ok = {}; (by[current] || []).forEach(function (x) { ok[x.id] = true; }); }
    var n = 0;
    wrap.querySelectorAll(".track-row").forEach(function (row) {
      var tr = tracks[Number(row.getAttribute("data-index"))], soon = row.classList.contains("is-soon");
      var show = soon ? !ok : (!ok || (tr && ok[tr.id]));
      row.hidden = !show;
      if (show && !soon) { var num = row.querySelector(".track-num"); if (num) { n++; num.textContent = String(n).padStart(2, "0"); } }
    });
  }

  /* ——— lecture / état ——— */
  function bindPlay(box) {
    box.querySelectorAll("[data-cat-play]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-cat-play"), L = window.EdenLibrary;
        // thème déjà en file : le bouton met en pause / reprend (jamais de redémarrage involontaire)
        if (L && L.queue && L.queue() && DATA.tracks[L.queue()[0]] && DATA.tracks[L.queue()[0]].primary === id) { L.togglePlay(); setTimeout(markPlaying, 120); return; }
        playAll(id); setTimeout(markPlaying, 200);
      });
    });
  }
  function markPlaying() {
    var L = window.EdenLibrary, q = L && L.queue && L.queue(), activeCat = null;
    if (q && q.length) { var m = DATA.tracks[q[0]]; activeCat = m && m.primary; }
    var playing = !!(L && L.isPlaying && L.isPlaying());
    document.querySelectorAll("[data-cat-play]").forEach(function (b) {
      var on = !!activeCat && b.getAttribute("data-cat-play") === activeCat, txt = on && playing ? t("cat.playing") : t("cat.playAll");
      b.classList.toggle("is-on", on);
      if (b.textContent !== txt) b.textContent = txt;
    });
    document.querySelectorAll(".cat-card").forEach(function (c) { c.classList.toggle("is-playing", c.getAttribute("data-cat") === activeCat); });
  }

  function renderAll() {
    if (!DATA) return;
    var h = $("[data-cat-home]"); if (h) renderHome(h);
    var l = $("[data-cat-library]"); if (l) renderLibrary(l);
  }

  function init() {
    var home = $("[data-cat-home]"), lib = $("[data-cat-library]");
    if (!home && !lib) return;
    try { var q = new URLSearchParams(location.search).get("cat"); if (q) current = q; } catch (e) {}
    Promise.all([
      window.EdenSongPick ? window.EdenSongPick.ready.catch(function () {}) : null,
      fetch("data/categories.json", { cache: "no-cache" }).then(function (r) { return r.json(); }),
      fetch("tracks.json", { cache: "no-cache" }).then(function (r) { return r.json(); })
    ]).then(function (r) {
      DATA = r[1]; TRACKS = (r[2] && r[2].tracks) || [];
      renderAll();
      if (lib) {
        var wrap = $(".track-list");
        if (wrap) {
          new MutationObserver(function () { filterList(); }).observe(wrap, { childList: true });
          // la liste est rendue par app.js (asynchrone) : on réapplique le filtre quand elle apparaît
          var tries = 0, iv = setInterval(function () { filterList(); if (wrap.children.length || ++tries > 40) clearInterval(iv); }, 150);
        }
        if (new URLSearchParams(location.search).get("cat") && location.hash === "#themes") {
          setTimeout(function () { var el = $("#themes"); if (el && el.scrollIntoView) el.scrollIntoView({ block: "start" }); }, 400);
        }
      }
      if (window.EdenI18n && window.EdenI18n.onChange) window.EdenI18n.onChange(function () { setTimeout(renderAll, 0); });
      document.addEventListener("eden:queue", markPlaying);
      setInterval(markPlaying, 700);
    }).catch(function (e) { console.error(e); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
