// Light / dark theme switch for the homepage.
// First paint is handled by a tiny inline script in <head> (no flash of the
// wrong theme). This file only wires up the toggle buttons.
(function () {
  "use strict";
  var KEY = "arrivo_theme";
  var root = document.documentElement;

  function current() {
    return root.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function dict() {
    var lang = root.lang || "en";
    return (typeof I18N !== "undefined" && (I18N[lang] || I18N.en)) || null;
  }

  function label(theme) {
    var d = dict();
    var home = d && d.home;
    if (theme === "dark") return (home && home.toLight) || "Switch to light mode";
    return (home && home.toDark) || "Switch to dark mode";
  }

  function paint() {
    var theme = current();
    var text = label(theme);
    document.querySelectorAll(".theme-toggle").forEach(function (btn) {
      btn.setAttribute("aria-label", text);
      btn.setAttribute("title", text);
      var span = btn.querySelector(".theme-toggle-text");
      if (span) span.textContent = text;
    });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0A0C24" : "#FBFAF7");
  }

  // Shared across every *.ridearrivo.com site (www, express, move, boat, air,
  // membership). On any other host (previews, localhost) it is just a normal
  // cookie for that host.
  function readCookie() {
    var m = document.cookie.match(/(?:^|; )arrivo_theme=(light|dark)/);
    return m ? m[1] : null;
  }
  function writeCookie(theme) {
    var host = location.hostname;
    var domain = /(^|\.)ridearrivo\.com$/.test(host) ? "; Domain=.ridearrivo.com" : "";
    var secure = location.protocol === "https:" ? "; Secure" : "";
    try {
      document.cookie = KEY + "=" + theme + "; Path=/; Max-Age=31536000; SameSite=Lax" + domain + secure;
    } catch (e) { /* cookies blocked: the choice still lasts for this visit */ }
  }

  function set(theme) {
    root.setAttribute("data-theme", theme);
    writeCookie(theme);
    try { localStorage.setItem(KEY, theme); } catch (e) { /* private mode: works for this visit only */ }
    paint();
  }

  // Arrived with ?theme= from another RideArrivo site: keep it as this visitor's choice.
  if (/[?&]theme=(light|dark)(?:&|$)/.test(location.search)) {
    writeCookie(current());
    try { localStorage.setItem(KEY, current()); } catch (e) { /* ignore */ }
  }

  try {
    var cleanUrl = new URL(location.href);
    if (cleanUrl.searchParams.has("theme")) {
      cleanUrl.searchParams.delete("theme");
      history.replaceState(history.state, "", cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
    }
  } catch (e) { /* keep the current URL if History/URL is unavailable */ }

  document.querySelectorAll(".theme-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      set(current() === "dark" ? "light" : "dark");
    });
  });

  // First-time visitors always start in light mode. Device colour-scheme
  // changes never override that default; only an explicit visitor choice does.

  // The language switcher sets <html lang>; re-label the button when it changes.
  new MutationObserver(paint).observe(root, { attributes: true, attributeFilter: ["lang"] });
  paint();
})();
