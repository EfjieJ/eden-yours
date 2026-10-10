/* Les Êtres de Lumière — noyau : utilitaires, bruit procédural, langue, textes, stockage.
   Page non listée (prototype). Aucun fichier audio : tout est synthétisé. */
(function () {
  "use strict";
  var EL = (window.EL = window.EL || {});

  /* ---------- utilitaires ---------- */
  var U = (EL.util = {
    clamp: function (v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    smooth: function (e0, e1, x) {
      var t = U.clamp((x - e0) / (e1 - e0), 0, 1);
      return t * t * (3 - 2 * t);
    },
    easeInOut: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    easeOut: function (t) { return 1 - Math.pow(1 - t, 3); },
    easeIn: function (t) { return t * t * t; },
    mix: function (a, b, t) {
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    },
    rgba: function (c, a) {
      return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + (a == null ? 1 : +a.toFixed(3)) + ")";
    },
    rng: function (seed) {
      var s = seed >>> 0;
      return function () {
        s = (s + 0x6d2b79f5) >>> 0;
        var t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    canvas: function (w, h) {
      var c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(w));
      c.height = Math.max(1, Math.round(h));
      return c;
    }
  });

  /* ---------- bruit de valeur (périodique en x pour les textures de planètes) ---------- */
  EL.makeNoise = function (seed) {
    var r = U.rng(seed), p = [], i, perm = new Uint16Array(512), vals = new Float32Array(256);
    for (i = 0; i < 256; i++) { p[i] = i; vals[i] = r(); }
    for (i = 255; i > 0; i--) { var j = (r() * (i + 1)) | 0, tmp = p[i]; p[i] = p[j]; p[j] = tmp; }
    for (i = 0; i < 512; i++) perm[i] = p[i & 255];
    function h(x, y) { return vals[perm[(x & 255) + perm[y & 255]]]; }
    function n2(x, y, px) {
      var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      var x0 = xi, x1 = xi + 1;
      if (px) { x0 = ((xi % px) + px) % px; x1 = (((xi + 1) % px) + px) % px; }
      var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      var a = h(x0, yi), b = h(x1, yi), c = h(x0, yi + 1), d = h(x1, yi + 1);
      return a + (b - a) * u + (c - a + (a - b - c + d) * u) * v;
    }
    function fbm(x, y, oct, px) {
      var s = 0, amp = 0.5, f = 1, norm = 0;
      for (var o = 0; o < oct; o++) {
        s += amp * n2(x * f, y * f, px ? px * f : 0);
        norm += amp; amp *= 0.5; f *= 2;
      }
      return s / norm;
    }
    return { n2: n2, fbm: fbm };
  };

  /* ---------- halo lumineux en cache (sprite radial par couleur) ---------- */
  var glowCache = {};
  EL.glow = function (c, soft) {
    var key = c.join(",") + (soft ? "s" : "");
    if (glowCache[key]) return glowCache[key];
    var S = 128, cv = U.canvas(S, S), g = cv.getContext("2d");
    var gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    if (soft) {
      gr.addColorStop(0, U.rgba(c, 0.55));
      gr.addColorStop(0.4, U.rgba(c, 0.22));
      gr.addColorStop(1, U.rgba(c, 0));
    } else {
      gr.addColorStop(0, U.rgba(c, 1));
      gr.addColorStop(0.18, U.rgba(c, 0.55));
      gr.addColorStop(0.5, U.rgba(c, 0.12));
      gr.addColorStop(1, U.rgba(c, 0));
    }
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);
    glowCache[key] = cv;
    return cv;
  };
  EL.drawGlow = function (ctx, c, x, y, r, a, soft) {
    if (a <= 0.003 || r <= 0.5) return;
    ctx.globalAlpha = a > 1 ? 1 : a;
    ctx.drawImage(EL.glow(c, soft), x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  };

  /* ---------- vibration douce (seulement après un geste de l'utilisateur) ---------- */
  EL.vibrate = function (pattern) {
    if (!navigator.vibrate) return;
    var ua = navigator.userActivation;
    if (ua && !ua.hasBeenActive) return;
    try { navigator.vibrate(pattern); } catch (e) {}
  };

  /* ---------- accessibilité : mouvement réduit ---------- */
  var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  EL.reduced = !!(mq && mq.matches);
  if (mq) {
    var onMq = function () { EL.reduced = mq.matches; };
    if (mq.addEventListener) mq.addEventListener("change", onMq);
    else if (mq.addListener) mq.addListener(onMq);
  }

  /* ---------- paramètres d'URL ---------- */
  var params;
  try { params = new URLSearchParams(location.search); } catch (e) { params = { get: function () { return null; } }; }
  EL.params = params;

  /* ---------- langue : ?lang=en, localStorage eden-lang, langue du navigateur ---------- */
  function detectLang() {
    if (window.EdenSongPick) return window.EdenSongPick.lang(); /* même règle que le reste du site */
    var q = (params.get("lang") || "").toLowerCase();
    if (q === "en" || q === "fr") return q;
    try {
      var s = localStorage.getItem("eden-lang");
      if (s === "en" || s === "fr") return s;
    } catch (e) {}
    var langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "fr"];
    return String(langs[0] || "fr").toLowerCase().indexOf("en") === 0 ? "en" : "fr";
  }
  EL.lang = detectLang();

  /* ---------- stockage ---------- */
  var KEY = "eden-etres-lumiere", MUTE_KEY = "eden-etres-lumiere-mute";
  EL.store = {
    load: function () {
      try {
        var d = JSON.parse(localStorage.getItem(KEY) || "null");
        if (d && Array.isArray(d.done)) {
          return { done: d.done.filter(function (i, k, a) { return i >= 0 && i < 5 && a.indexOf(i) === k; }), finaleSeen: !!d.finaleSeen };
        }
      } catch (e) {}
      return { done: [], finaleSeen: false };
    },
    save: function (st) {
      try { localStorage.setItem(KEY, JSON.stringify({ v: 1, done: st.done, finaleSeen: !!st.finaleSeen })); } catch (e) {}
    },
    clear: function () { try { localStorage.removeItem(KEY); } catch (e) {} },
    muted: function () { try { return localStorage.getItem(MUTE_KEY) === "1"; } catch (e) { return false; } },
    setMuted: function (m) { try { localStorage.setItem(MUTE_KEY, m ? "1" : "0"); } catch (e) {} }
  };
})();
