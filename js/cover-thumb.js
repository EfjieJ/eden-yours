/* Eden Yours — vignettes de pochettes pour les jeux de mémoire.
   Robustesse mobile : petites vignettes webp 256 px (assets/covers-sm/), chargées tout de suite (pas de lazy-loading dans des cartes retournées),
   dimensions explicites, repli sur la pochette d'origine puis sur un fond dégradé + titre : une carte n'est jamais vide. */
(function () {
  "use strict";
  if (window.EdenThumb) return;
  function abs(u) { try { return new URL(u, document.baseURI).href; } catch (e) { return u; } }
  function small(u) {
    var m = /(^|\/)assets\/covers\/([^\/.?#]+)\.\w+(\?.*)?$/.exec(String(u || ""));
    return m ? String(u).replace(/assets\/covers\/([^\/.?#]+)\.\w+(\?.*)?$/, "assets/covers-sm/$1.webp") : u;
  }
  /* remplit `box` d'une <img> + d'un titre de secours (affiché seulement si l'image échoue) */
  function fill(box, cover, title) {
    var img = document.createElement("img"), tried = 0, orig = abs(cover);
    img.alt = ""; img.width = 256; img.height = 256; img.decoding = "async"; img.loading = "eager"; img.draggable = false;
    img.setAttribute("referrerpolicy", "no-referrer");
    img.onerror = function () {
      if (tried === 0 && small(cover) !== cover) { tried = 1; img.src = orig; return; }          // 1) pochette d'origine
      box.classList.add("ct-failed");                                                              // 2) dégradé + titre
    };
    img.onload = function () { box.classList.remove("ct-failed"); };
    img.src = abs(small(cover));
    var fb = document.createElement("span"); fb.className = "ct-fb"; fb.setAttribute("aria-hidden", "true"); fb.textContent = title || "✦";
    box.appendChild(img); box.appendChild(fb);
    return img;
  }
  window.EdenThumb = { small: small, fill: fill };
})();
