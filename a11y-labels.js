// Gives every form field that has a placeholder but no <label> an accessible name,
// so screen readers announce "First name" instead of "edit text". It follows the
// placeholder, so it stays right when the page language changes.
(function () {
  "use strict";
  var SKIP = /^(hidden|checkbox|radio|submit|button|image|file)$/i;
  function label(el) {
    if (el.hasAttribute("aria-labelledby")) return;
    if (el.hasAttribute("aria-label") && !el.hasAttribute("data-ra-auto-label")) return;
    if (el.type && SKIP.test(el.type)) return;
    if (el.labels && el.labels.length) return;
    var p = (el.getAttribute("placeholder") || "").trim();
    if (!p) return;
    el.setAttribute("aria-label", p);
    el.setAttribute("data-ra-auto-label", "");
  }
  function run(root) {
    (root || document).querySelectorAll("input, textarea, select").forEach(label);
  }
  function start() {
    run();
    if (!window.MutationObserver) return;
    new MutationObserver(function (list) {
      list.forEach(function (m) {
        if (m.type === "attributes") label(m.target);
        else m.addedNodes.forEach(function (n) { if (n.nodeType === 1) { if (/^(INPUT|TEXTAREA|SELECT)$/.test(n.tagName)) label(n); else run(n); } });
      });
    }).observe(document.body, { attributes: true, attributeFilter: ["placeholder"], childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
