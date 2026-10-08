// Applies translations to the small set of strings that live outside each
// page's own language code: header/footer chrome, the sign-in pages, the 404
// page and a few booking and homepage blocks. Reads the language the visitor
// picked on the homepage (arrivo_site_lang) and, for anything other than
// English, loads i18n.js on demand so English visitors download nothing extra.
(function () {
  "use strict";
  var KEY = "arrivo_site_lang";
  var SUPPORTED = ["en", "fr", "zh", "hi", "de", "es", "pt"];
  var NS = /^(ui|idx|auth|nf|bk)\./;

  function currentLang() {
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    if (saved && SUPPORTED.indexOf(saved) !== -1) return saved;
    var htmlLang = (document.documentElement.lang || "").slice(0, 2);
    if (SUPPORTED.indexOf(htmlLang) !== -1 && htmlLang !== "en") return htmlLang;
    var nav = (navigator.language || "en").slice(0, 2);
    return SUPPORTED.indexOf(nav) !== -1 ? nav : "en";
  }
  function dict() {
    if (typeof I18N === "undefined") return null;
    return I18N[currentLang()] || I18N.en;
  }
  function get(d, path) {
    return path.split(".").reduce(function (o, k) { return o == null ? undefined : o[k]; }, d);
  }

  // Translate a key for code that builds messages at runtime. The English
  // text passed in is the fallback, so a missing key never shows a raw key.
  window.RAt = function (key, fallback) {
    var d = dict();
    var v = d && get(d, key);
    return v == null ? fallback : v;
  };

  function apply() {
    var d = dict();
    if (!d) return;
    var lang = currentLang();
    if (document.documentElement.lang !== lang) document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var k = el.getAttribute("data-i18n");
      if (!NS.test(k)) return;
      var v = get(d, k);
      if (v != null) el.innerHTML = v;
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var k = el.getAttribute("data-i18n-placeholder");
      if (!NS.test(k)) return;
      var v = get(d, k);
      if (v != null) el.setAttribute("placeholder", v);
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      var v = get(d, el.getAttribute("data-i18n-aria"));
      if (v != null) el.setAttribute("aria-label", v);
    });
    labelAccount();
  }

  function labelAccount() {
    var d = dict();
    if (!d) return;
    var signedIn = false;
    try { signedIn = !!localStorage.getItem("arrivo_rider_token"); } catch (e) {}
    var label = get(d, signedIn ? "ui.myAccount" : "ui.register");
    if (label) ["accountNavLabel", "accountNavLabelMobile"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = label;
    });
  }

  function start() {
    apply();
    // Other scripts set <html lang> when the visitor switches language.
    new MutationObserver(apply).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    // Some pages set the account label after load; run once more.
    window.addEventListener("load", labelAccount);
  }

  function boot() {
    if (typeof I18N !== "undefined" || currentLang() === "en") { start(); return; }
    var s = document.createElement("script");
    s.src = "i18n.js?v=40";
    s.onload = start;
    document.head.appendChild(s);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
