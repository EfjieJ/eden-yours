/* Eden Yours — sélecteur de langue FR | EN, visible dès l'arrivée sur CHAQUE page (haut de l'écran, sans défiler).
   Pastille fixe en haut à droite (au-dessus des canevas 3D et des écrans d'introduction), grandes cibles tactiles (≥ 44 px),
   langue active mise en évidence, aria-labels, utilisable au clavier (Tab / Entrée / Espace).
   Le choix est enregistré (localStorage « eden-lang »), ?lang= est mis à jour dans l'URL, les liens internes gardent la langue,
   et le contenu (+ la liste de chansons) est rafraîchi par les mécanismes existants (EdenI18n.setLang / bouton propre à Êtres de Lumière). */
(function () {
  "use strict";
  if (window.EdenLangPill) return;
  var STORE = "eden-lang";
  var root = document.documentElement;

  function current() {
    try { var I = window.EdenI18n; if (I && I.getLang) return I.getLang(); } catch (e) {}
    if (window.EL && (window.EL.lang === "fr" || window.EL.lang === "en")) return window.EL.lang;
    if (window.EdenSongPick) return window.EdenSongPick.lang();
    try { var q = new URLSearchParams(location.search).get("lang"); if (q === "fr" || q === "en") return q; } catch (e) {}
    try { var s = localStorage.getItem(STORE); if (s === "fr" || s === "en") return s; } catch (e) {}
    return (root.getAttribute("lang") || "fr").toLowerCase().indexOf("en") === 0 ? "en" : "fr";
  }

  function css() {
    var st = document.createElement("style");
    st.textContent =
      ".eden-lang-pill{position:fixed;top:max(10px,env(safe-area-inset-top));right:max(10px,env(safe-area-inset-right));z-index:2147482600;" +
      "display:inline-flex;align-items:center;gap:2px;padding:3px;border-radius:999px;background:rgba(16,10,30,.86);" +
      "border:1px solid rgba(255,255,255,.34);box-shadow:0 4px 18px rgba(0,0,0,.5);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);" +
      "font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;margin:0;line-height:1}" +
      ".eden-lang-pill button{appearance:none;-webkit-appearance:none;border:0;margin:0;cursor:pointer;min-width:48px;min-height:44px;padding:0 14px;" +
      "border-radius:999px;background:transparent;color:#ece7f8;font:700 15px/1 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;letter-spacing:.06em;" +
      "display:inline-flex;align-items:center;justify-content:center;gap:6px;-webkit-tap-highlight-color:transparent;touch-action:manipulation}" +
      ".eden-lang-pill button .lp-long{display:none;font-weight:700;letter-spacing:.01em}" +
      ".eden-lang-pill button[aria-pressed=true]{background:linear-gradient(135deg,#ffe8a8,#f4b9d6);color:#1a1226;box-shadow:0 0 0 1px rgba(255,255,255,.5) inset}" +
      ".eden-lang-pill button:not([aria-pressed=true]):hover{background:rgba(255,255,255,.14)}" +
      ".eden-lang-pill button:focus-visible{outline:3px solid #67e8f9;outline-offset:2px}" +
      "@media (min-width:721px){.eden-lang-pill button .lp-long{display:inline}.eden-lang-pill button .lp-s{display:none}.eden-lang-pill button{padding:0 18px}}" +
      /* pages à en-tête du site : réserver la place, et sur téléphone se placer à gauche du bouton menu */
      "@media (min-width:1101px){html.has-lang-pill .site-nav .container{padding-right:max(1rem,230px)}}" +
      "@media (max-width:1100px){html.has-lang-pill.has-site-header .eden-lang-pill{right:calc(max(10px,env(safe-area-inset-right)) + 62px)}}" +
      /* Êtres de Lumière : sous la barre du haut (boutons à droite) */
      "html.has-lang-pill.has-el-top .eden-lang-pill{top:calc(max(10px,env(safe-area-inset-top)) + 58px)}" +
      /* les sélecteurs en double (pied de page / menu / coins) sont remplacés par cette pastille */
      "html.has-lang-pill .lang-switch:not(.eden-lang-pill),html.has-lang-pill #el-lang{display:none!important}";
    document.head.appendChild(st);
  }

  var pill, btns = {};
  function paint() {
    var l = current();
    ["fr", "en"].forEach(function (k) {
      if (!btns[k]) return;
      btns[k].setAttribute("aria-pressed", k === l ? "true" : "false");
      if (k === l) btns[k].setAttribute("aria-current", "true"); else btns[k].removeAttribute("aria-current");
    });
    pill.setAttribute("aria-label", l === "en" ? "Language" : "Langue / Language");
  }

  function sameOriginHtml(a) {
    var h = a.getAttribute("href");
    if (!h || h.charAt(0) === "#" || /^(mailto:|tel:|javascript:)/i.test(h) || a.hasAttribute("data-lang-href") || a.hasAttribute("download")) return null;
    try {
      var u = new URL(h, location.href);
      if (u.origin !== location.origin) return null;
      if (!/\.html$/.test(u.pathname) && !/\/$/.test(u.pathname)) return null;
      return u;
    } catch (e) { return null; }
  }
  function decorate(l) {
    var as = document.querySelectorAll("a[href]");
    for (var i = 0; i < as.length; i++) {
      var u = sameOriginHtml(as[i]); if (!u) continue;
      u.searchParams.set("lang", l);
      var raw = as[i].getAttribute("href"), hash = u.hash;
      var base = raw.split("#")[0].split("?")[0];
      as[i].setAttribute("href", base + "?" + u.searchParams.toString() + hash);
    }
  }
  function syncUrl(l) {
    try {
      var u = new URL(location.href); u.searchParams.set("lang", l);
      history.replaceState(history.state, "", u.pathname + u.search + u.hash);
    } catch (e) {}
  }

  function choose(next) {
    if (next !== "fr" && next !== "en") return;
    var before = current();
    try { localStorage.setItem(STORE, next); } catch (e) {}
    syncUrl(next);
    if (next !== before) {
      var I = window.EdenI18n;
      if (I && I.setLang) I.setLang(next);                       // contenu + chansons : mécanisme existant (arrête la chanson en cours)
      else if (window.EL && document.getElementById("el-lang")) {  // Êtres de Lumière : bascule propre à la page
        var b = document.getElementById("el-lang");
        // le bouton de la page bascule fr<->en ; il est masqué par CSS mais reste cliquable par script
        b.click();
      } else { location.replace(location.pathname + "?lang=" + next + location.hash); return; }
    }
    decorate(next); paint();
  }

  function build() {
    if (pill) return;
    css();
    pill = document.createElement("div");
    pill.className = "eden-lang-pill";
    pill.setAttribute("role", "group");
    [["fr", "FR", "Français", "Passer en français"], ["en", "EN", "English", "Switch to English"]].forEach(function (d) {
      var b = document.createElement("button");
      b.type = "button"; b.setAttribute("data-pill-lang", d[0]);
      b.setAttribute("lang", d[0]); b.setAttribute("aria-label", d[2] + " — " + d[3]); b.title = d[2];
      b.innerHTML = '<span class="lp-s" aria-hidden="true">' + d[1] + '</span><span class="lp-long" aria-hidden="true">' + d[2] + "</span>";
      b.addEventListener("click", function () { choose(d[0]); });
      btns[d[0]] = b; pill.appendChild(b);
      if (d[0] === "fr") { var sep = document.createElement("span"); sep.setAttribute("aria-hidden", "true"); sep.style.cssText = "width:1px;height:20px;background:rgba(255,255,255,.28)"; pill.appendChild(sep); }
    });
    document.body.appendChild(pill);
    root.classList.add("has-lang-pill");
    if (document.querySelector(".site-nav")) root.classList.add("has-site-header");
    if (document.querySelector(".el-top")) root.classList.add("has-el-top");
    // ?lang= présent dans l'URL : il devient le choix enregistré (comme i18n.js) ; sinon l'URL reflète la langue active
    var l = current(); syncUrl(l); decorate(l); paint();
    if (window.EdenI18n && window.EdenI18n.onChange) window.EdenI18n.onChange(function () { var c = current(); syncUrl(c); decorate(c); paint(); });
    setInterval(function () { var c = current(); if (btns[c] && btns[c].getAttribute("aria-pressed") !== "true") { decorate(c); paint(); } }, 800);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
  window.EdenLangPill = { choose: choose, current: current };
})();
