(function () {
  "use strict";

  function initIntentSelector() {
    var root = document.getElementById("intentSelector");
    if (!root) return;

    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
    var panels = Array.prototype.slice.call(root.querySelectorAll('[role="tabpanel"]'));

    function intentOf(tab) {
      return (tab.id || "ride-tab").replace(/-tab$/, "");
    }

    function announce(tab) {
      try {
        document.dispatchEvent(new CustomEvent("arrivo:intent", { detail: { intent: intentOf(tab) } }));
      } catch (e) { /* CustomEvent is enhancement only. */ }
    }

    function activate(tab, focus) {
      var panelId = tab.getAttribute("aria-controls");
      tabs.forEach(function (item) {
        var active = item === tab;
        item.setAttribute("aria-selected", active ? "true" : "false");
        item.setAttribute("tabindex", active ? "0" : "-1");
      });
      panels.forEach(function (panel) { panel.hidden = panel.id !== panelId; });
      announce(tab);
      if (focus) tab.focus();
    }

    tabs.forEach(function (tab, index) {
      tab.addEventListener("click", function () { activate(tab, false); });
      tab.addEventListener("focus", function () { announce(tab); });
      tab.addEventListener("keydown", function (event) {
        var next = null;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") next = tabs[(index + 1) % tabs.length];
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = tabs[(index - 1 + tabs.length) % tabs.length];
        if (event.key === "Home") next = tabs[0];
        if (event.key === "End") next = tabs[tabs.length - 1];
        if (!next) return;
        event.preventDefault();
        activate(next, true);
      });
    });

    document.querySelectorAll("[data-intent-open]").forEach(function (link) {
      link.addEventListener("click", function (event) {
        var wanted = link.getAttribute("data-intent-open");
        var tab = root.querySelector("#" + wanted + "-tab");
        if (!tab) return;
        event.preventDefault();
        activate(tab, false);
        var target = document.getElementById("choose");
        var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (target) target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initIntentSelector);
  else initIntentSelector();
})();
