// Hero: the play button shows the service chips, then they fade away on their own.
(function () {
  "use strict";
  var btn = document.getElementById("heroSvcBtn");
  var box = document.getElementById("heroSvcChips");
  if (!btn || !box) return;
  var SHOW_MS = 8000, timer = null;

  function clear() { if (timer) { clearTimeout(timer); timer = null; } }
  function arm() { clear(); timer = setTimeout(hide, SHOW_MS); }
  function show() {
    box.hidden = false;
    requestAnimationFrame(function () {
      box.classList.add("is-in");
      try { box.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) {}
    });
    btn.setAttribute("aria-expanded", "true");
    arm();
  }
  function hide() {
    clear();
    box.classList.remove("is-in");
    btn.setAttribute("aria-expanded", "false");
    setTimeout(function () { if (!box.classList.contains("is-in")) box.hidden = true; }, 260);
  }
  btn.addEventListener("click", function () {
    if (btn.getAttribute("aria-expanded") === "true") hide(); else show();
  });
  // keep it open while someone is reading or has keyboard focus inside
  box.addEventListener("mouseenter", clear);
  box.addEventListener("mouseleave", function () { if (!box.hidden) arm(); });
  box.addEventListener("focusin", clear);
  box.addEventListener("focusout", function () { if (!box.hidden) arm(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !box.hidden) { hide(); btn.focus(); } });
})();
