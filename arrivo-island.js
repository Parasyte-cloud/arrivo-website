(function () {
  "use strict";

  var header = document.querySelector(".site-header[data-arrivo-island]");
  if (!header) return;
  var context = header.querySelector("[data-island-context]");
  var mainNav = header.querySelector(".main-nav");
  var choose = document.getElementById("choose");
  var raf = 0;
  var lastY = -1;

  function reduceMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function updateScrollState() {
    raf = 0;
    var y = Math.max(0, window.scrollY || window.pageYOffset || 0);
    if (Math.abs(y - lastY) < 2) return;
    lastY = y;
    header.classList.toggle("is-condensed", y > 46);
  }

  function scheduleScrollUpdate() {
    if (!raf) raf = window.requestAnimationFrame(updateScrollState);
  }

  function labelFor(intent) {
    if (intent === "move") return "Move · choose a service";
    if (intent === "charter") return "Charter · choose a service";
    return "Ride · choose a service";
  }

  function setIntent(intent) {
    header.dataset.islandState = "selector";
    if (context) context.textContent = labelFor(intent);
    if (mainNav) {
      mainNav.querySelectorAll("[data-intent-open]").forEach(function (link) {
        link.classList.toggle("is-active", link.getAttribute("data-intent-open") === intent);
      });
    }
  }

  function clearIntent() {
    header.dataset.islandState = "default";
    if (context) context.textContent = "";
    if (mainNav) mainNav.querySelectorAll(".is-active").forEach(function (link) { link.classList.remove("is-active"); });
  }

  document.addEventListener("arrivo:intent", function (event) {
    setIntent(event.detail && event.detail.intent ? event.detail.intent : "ride");
  });

  if (choose && "IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting && !choose.contains(document.activeElement)) clearIntent();
      });
    }, { threshold: .18 });
    observer.observe(choose);
  }


  window.addEventListener("scroll", scheduleScrollUpdate, { passive: true });
  window.addEventListener("resize", scheduleScrollUpdate, { passive: true });
  updateScrollState();

  // Keep a stable semantic nav. Motion only changes presentation/state.
  header.dataset.motion = reduceMotion() ? "reduced" : "full";
})();
