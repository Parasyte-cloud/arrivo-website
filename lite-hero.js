// Hero: the "Our services" play button shows the service ticker, and tapping it again hides it.
(function () {
  "use strict";
  var btn = document.getElementById("heroSvcBtn");
  if (!btn) return;
  var root = document.documentElement;
  btn.addEventListener("click", function () {
    var open = !root.classList.contains("lt-svc-open");
    root.classList.toggle("lt-svc-open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      var t = document.querySelector(".hp") || document.getElementById("heroSvcChips");
      try { if (t) t.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) {}
    }
  });
})();
