// Hero "Our services" button shows the five ways to RideArrivo; tap again to hide.
(function () {
  "use strict";
  var btn = document.getElementById("heroSvcBtn");
  var panel = document.getElementById("ways");
  if (!btn || !panel) return;
  function set(open) {
    panel.hidden = !open;
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) { try { panel.scrollIntoView({ block: "start", behavior: "smooth" }); } catch (e) {} }
  }
  btn.addEventListener("click", function () { set(panel.hidden); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !panel.hidden) { set(false); btn.focus(); }
  });
})();
