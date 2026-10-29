// RideArrivo theme controller: Light / Dark / System.
// First paint is handled by the small inline bootstrap in <head>.
(function () {
  "use strict";
  var RESOLVED_KEY = "arrivo_theme";
  var MODE_KEY = "arrivo_theme_mode";
  var MODES = ["light", "dark", "system"];
  var root = document.documentElement;
  var systemQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function mode() {
    var value = root.getAttribute("data-theme-mode");
    if (MODES.indexOf(value) !== -1) return value;
    try {
      value = localStorage.getItem(MODE_KEY);
      if (MODES.indexOf(value) !== -1) return value;
    } catch (e) {}
    value = root.getAttribute("data-theme");
    return value === "dark" ? "dark" : "light";
  }
  function resolved(value) {
    if (value === "system") return systemQuery && systemQuery.matches ? "dark" : "light";
    return value === "dark" ? "dark" : "light";
  }
  function dict() {
    var lang = root.lang || "en";
    return (typeof I18N !== "undefined" && (I18N[lang] || I18N.en)) || null;
  }
  function nextMode(value) { return MODES[(MODES.indexOf(value) + 1) % MODES.length]; }
  function label(value) {
    var d = dict(), home = d && d.home;
    if (value === "light") return (home && home.toDark) || "Theme: Light. Switch to dark mode";
    if (value === "dark") return "Theme: Dark. Switch to system mode";
    return "Theme: System. Switch to light mode";
  }
  function writeCookie(name, value) {
    var host = location.hostname;
    var domain = /(^|\.)ridearrivo\.com$/.test(host) ? "; Domain=.ridearrivo.com" : "";
    var secure = location.protocol === "https:" ? "; Secure" : "";
    try { document.cookie = name + "=" + value + "; Path=/; Max-Age=31536000; SameSite=Lax" + domain + secure; } catch (e) {}
  }
  function paint() {
    var value = mode();
    var theme = resolved(value);
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-theme-mode", value);
    writeCookie(RESOLVED_KEY, theme); // sibling products already understand this cookie
    writeCookie(MODE_KEY, value);
    var text = label(value);
    document.querySelectorAll(".theme-toggle").forEach(function (btn) {
      btn.setAttribute("aria-label", text);
      btn.setAttribute("title", text);
      btn.setAttribute("data-theme-mode", value);
      var span = btn.querySelector(".theme-toggle-text");
      if (span) span.textContent = value === "system" ? "Theme: System" : (value === "dark" ? "Theme: Dark" : "Theme: Light");
    });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#050B13" : "#FBFAF7");
  }
  function setMode(value) {
    if (MODES.indexOf(value) === -1) value = "light";
    root.setAttribute("data-theme-mode", value);
    try { localStorage.setItem(MODE_KEY, value); localStorage.setItem(RESOLVED_KEY, resolved(value)); } catch (e) {}
    paint();
  }

  // Backward-compatible inbound theme links are remembered once then cleaned.
  var inbound = location.search.match(/[?&]theme=(light|dark)(?:&|$)/);
  if (inbound) {
    setMode(inbound[1]);
    try {
      var cleanUrl = new URL(location.href);
      cleanUrl.searchParams.delete("theme");
      history.replaceState(history.state, "", cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
    } catch (e) {}
  }

  document.querySelectorAll(".theme-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () { setMode(nextMode(mode())); });
  });

  function systemChanged() { if (mode() === "system") paint(); }
  if (systemQuery) {
    if (systemQuery.addEventListener) systemQuery.addEventListener("change", systemChanged);
    else if (systemQuery.addListener) systemQuery.addListener(systemChanged);
  }

  new MutationObserver(paint).observe(root, { attributes: true, attributeFilter: ["lang"] });
  paint();
})();
