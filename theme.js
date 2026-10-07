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
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0A0C24" : "#12123B");
  }

  function set(theme) {
    root.setAttribute("data-theme", theme);
    try { localStorage.setItem(KEY, theme); } catch (e) { /* private mode: works for this visit only */ }
    paint();
  }

  document.querySelectorAll(".theme-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      set(current() === "dark" ? "light" : "dark");
    });
  });

  // Follow the device setting until the visitor makes their own choice.
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var onChange = function (e) {
      var saved = null;
      try { saved = localStorage.getItem(KEY); } catch (err) { /* ignore */ }
      if (saved !== "light" && saved !== "dark") {
        root.setAttribute("data-theme", e.matches ? "dark" : "light");
        paint();
      }
    };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  // The language switcher sets <html lang>; re-label the button when it changes.
  new MutationObserver(paint).observe(root, { attributes: true, attributeFilter: ["lang"] });
  paint();
})();
