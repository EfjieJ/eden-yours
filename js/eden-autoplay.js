/* Eden Yours — démarrage automatique des chansons.
   Les navigateurs exigent un geste de l'utilisateur avant le son. Ce module :
   1) au premier geste (et à chaque geste), « débloque » un AudioContext partagé et un <audio> partagé,
      et réveille tous les AudioContext de la page ;
   2) si un play() est quand même refusé, affiche un seul grand bouton « Touche pour écouter » ;
   3) ajoute ?autoplay=1 aux lecteurs Suno insérés après un geste (le lecteur Suno le prend en charge). */
(function () {
  "use strict";
  if (window.EdenAutoplay) return;

  var contexts = [];
  var Native = window.AudioContext || window.webkitAudioContext;
  var shared = null;
  if (Native) {
    var Wrapped = function (opts) {
      var c = opts !== undefined ? new Native(opts) : new Native();
      contexts.push(c);
      return c;
    };
    Wrapped.prototype = Native.prototype;
    try {
      if (window.AudioContext) window.AudioContext = Wrapped;
      if (window.webkitAudioContext) window.webkitAudioContext = Wrapped;
    } catch (e) { /* ignore */ }
  }

  var activated = false;
  var SILENT = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
  var sharedAudio = null;
  var nativePlay = HTMLMediaElement.prototype.play;

  function lang() {
    var l = (document.documentElement.getAttribute("lang") || "fr").toLowerCase();
    return l.indexOf("en") === 0 ? "en" : "fr";
  }
  function tr(key, fr, en) {
    try {
      var I = window.EdenI18n;
      if (I && I.t) { var v = I.t(key); if (v && v !== key) return v; }
    } catch (e) { /* ignore */ }
    return lang() === "en" ? en : fr;
  }

  function resumeAll() {
    for (var i = 0; i < contexts.length; i++) {
      var c = contexts[i];
      if (c && c.state === "suspended" && c.resume) { try { c.resume(); } catch (e) { /* ignore */ } }
    }
  }

  function unlock() {
    resumeAll();
    if (activated) return;
    activated = true;
    try {
      if (!shared && Native) shared = new window.AudioContext();
      if (shared) {
        var b = shared.createBuffer(1, 1, 22050);
        var s = shared.createBufferSource();
        s.buffer = b; s.connect(shared.destination); s.start(0);
      }
    } catch (e) { /* ignore */ }
    try {
      sharedAudio = sharedAudio || new Audio();
      sharedAudio.src = SILENT;
      var p = nativePlay.call(sharedAudio);
      if (p && p.catch) p.catch(function () {});
    } catch (e) { /* ignore */ }
  }
  ["pointerdown", "touchend", "mousedown", "keydown", "click"].forEach(function (ev) {
    window.addEventListener(ev, unlock, { capture: true, passive: true });
  });

  /* ——— un seul grand bouton de secours ——— */
  var tap = null, tapTarget = null;
  function hideTap() {
    if (tap) tap.hidden = true;
    tapTarget = null;
  }
  function showTap(target) {
    tapTarget = target;
    if (!tap) {
      tap = document.createElement("button");
      tap.type = "button";
      tap.className = "eden-tap-listen";
      tap.setAttribute("aria-live", "polite");
      tap.style.cssText = "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483000;" +
        "padding:1.4rem 2.4rem;font:600 1.35rem/1.2 system-ui,sans-serif;color:#17131f;background:rgba(255,244,225,.97);" +
        "border:0;border-radius:999px;box-shadow:0 0 0 8px rgba(255,236,200,.18),0 20px 60px rgba(0,0,0,.55);cursor:pointer;";
      tap.addEventListener("click", function () {
        var t = tapTarget;
        hideTap();
        unlock();
        resumeAll();
        if (t && t.play) {
          var p = nativePlay.call(t);
          if (p && p.catch) p.catch(function () {});
        }
      });
      document.body.appendChild(tap);
    }
    tap.textContent = "▶ " + tr("autoplay.tap", "Touche pour écouter", "Tap to listen");
    tap.hidden = false;
    try { tap.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }

  HTMLMediaElement.prototype.play = function () {
    var el = this;
    var p = nativePlay.apply(el, arguments);
    if (p && typeof p.then === "function") {
      p.then(function () { if (tapTarget === el) hideTap(); }, function (err) {
        if (err && err.name === "NotAllowedError" && !el.muted && !el.__edenNoTap) showTap(el);
      });
    }
    return p;
  };
  document.addEventListener("emptied", function (e) { if (e.target === tapTarget) hideTap(); }, true);
  document.addEventListener("playing", function (e) { if (e.target === tapTarget) hideTap(); }, true);

  /* Chansons jouées par Web Audio (ex. Rythme-Compasse) : si le contexte reste suspendu, bouton de secours. */
  if (window.AudioBufferSourceNode) {
    var nStart = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function () {
      var node = this, ctx = node.context;
      var r = nStart.apply(node, arguments);
      try {
        if (ctx && ctx.state === "suspended" && node.buffer && node.buffer.duration > 8) {
          ctx.resume();
          setTimeout(function () {
            if (ctx.state === "suspended") showTap({ play: function () { return ctx.resume(); } });
          }, 400);
        }
      } catch (e) { /* ignore */ }
      return r;
    };
  }

  /* ——— lecteurs Suno : autoplay=1 après un geste ——— */
  var toastEl = null, toastTimer = 0;
  function toast() {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "eden-autoplay-toast";
      toastEl.setAttribute("role", "status");
      toastEl.style.cssText = "position:fixed;left:50%;bottom:calc(var(--player-h,0px) + 18px);transform:translateX(-50%);" +
        "z-index:2147482000;padding:.6rem 1.1rem;border-radius:999px;font:500 .95rem/1.3 system-ui,sans-serif;" +
        "color:#f4efe6;background:rgba(10,10,18,.88);border:1px solid rgba(255,255,255,.14);pointer-events:none;max-width:92vw;text-align:center;";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = tr("autoplay.embedHint", "La chanson démarre… Sinon, touche ▶ dans le lecteur Suno.",
      "The song is starting… If not, tap ▶ in the Suno player.");
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 6000);
  }
  function hasActivation() {
    var ua = navigator.userActivation;
    return activated || !!(ua && ua.hasBeenActive);
  }
  function fixFrame(f) {
    var src = f.getAttribute("src") || "";
    if (!/^https:\/\/suno\.com\/embed\//.test(src) || /[?&]autoplay=/.test(src)) return;
    if (!hasActivation() || f.hasAttribute("data-no-autoplay")) return;
    var allow = f.getAttribute("allow") || "";
    if (allow.indexOf("autoplay") < 0) f.setAttribute("allow", (allow ? allow + "; " : "") + "autoplay");
    f.removeAttribute("loading");
    f.setAttribute("src", src + (src.indexOf("?") < 0 ? "?" : "&") + "autoplay=1");
    toast();
    setTimeout(function () {
      try {
        var r = f.getBoundingClientRect();
        if (r.bottom > window.innerHeight || r.top < 0) f.scrollIntoView({ block: "nearest", behavior: "smooth" });
      } catch (e) { /* ignore */ }
    }, 60);
  }
  function scan(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.tagName === "IFRAME") fixFrame(node);
    else if (node.querySelectorAll) {
      var l = node.querySelectorAll("iframe");
      for (var i = 0; i < l.length; i++) fixFrame(l[i]);
    }
  }
  function observe() {
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === "attributes") scan(m.target);
        else for (var j = 0; j < m.addedNodes.length; j++) scan(m.addedNodes[j]);
      }
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
  }
  observe();

  window.EdenAutoplay = {
    unlock: unlock,
    context: function () { if (!shared && Native) shared = new window.AudioContext(); return shared; },
    audio: function () { return sharedAudio || (sharedAudio = new Audio()); },
    showTap: showTap,
    hideTap: hideTap,
    activated: hasActivation
  };
})();
