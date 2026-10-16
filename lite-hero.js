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

// Services: "Five ways to RideArrivo" shows the five cards; tap again to hide.
(function () {
  "use strict";
  var b = document.getElementById("ltWaysBtn"), p = document.getElementById("ltWays");
  if (!b || !p) return;
  function set(open) {
    p.hidden = !open;
    b.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) { try { p.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) {} }
  }
  b.addEventListener("click", function () { set(p.hidden); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !p.hidden) { set(false); b.focus(); } });
})();
