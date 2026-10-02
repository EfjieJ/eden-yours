/* Eden Yours — offre piste parlée (live vs PayPal Sandbox) */
(function () {
  "use strict";
  var cfg = (window.EDEN_CONFIG && window.EDEN_CONFIG.spokenOffer) || {};
  var btn = document.getElementById("spoken-paypal-btn");
  var banner = document.getElementById("spoken-test-banner");
  var setup = document.getElementById("spoken-test-setup");
  if (!btn) return;

  function sandboxUrl() {
    if (cfg.sandboxButtonUrl) return cfg.sandboxButtonUrl;
    var email = (cfg.sandboxBusinessEmail || "").trim();
    if (!email) return "";
    var params = new URLSearchParams({
      cmd: "_xclick",
      business: email,
      item_name: cfg.itemName || "Eden Yours — Une piste parlée sur mesure",
      amount: cfg.amount || "25.00",
      currency_code: cfg.currency || "CAD",
      no_shipping: "1",
      no_note: "0"
    });
    return "https://www.sandbox.paypal.com/cgi-bin/webscr?" + params.toString();
  }

  if (cfg.testMode) {
    if (banner) banner.hidden = false;
    var url = sandboxUrl();
    if (url) {
      btn.href = url;
      btn.textContent = "Tester 25 $ CAD (PayPal Sandbox)";
      btn.setAttribute("data-i18n", "request.spokenPayTest");
      if (setup) setup.hidden = true;
    } else {
      btn.href = "#spoken-test-setup";
      btn.removeAttribute("target");
      btn.textContent = "Configurer le test PayPal (voir doc)";
      if (setup) setup.hidden = false;
    }
  } else {
    if (banner) banner.hidden = true;
    if (setup) setup.hidden = true;
    btn.href = cfg.liveUrl || "https://paypal.me/Francjul/25CAD";
  }
})();
