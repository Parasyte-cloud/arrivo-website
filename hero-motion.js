(function () {
  "use strict";
  var hero = document.querySelector(".simple-hero[data-hero-motion]");
  if (!hero) return;

  var media = window.matchMedia ? window.matchMedia("(min-width: 768px) and (prefers-reduced-motion: no-preference)") : null;
  var timer = null;
  var ready = false;

  function eligible() { return !media || media.matches; }
  function stop() {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
    hero.classList.remove("is-alt");
  }
  function start() {
    stop();
    if (!ready || !eligible() || document.hidden) return;
    timer = window.setInterval(function () {
      hero.classList.toggle("is-alt");
    }, 8500);
  }
  function loadSecondary() {
    if (!eligible()) return;
    var img = new Image();
    img.decoding = "async";
    img.onload = function () { ready = true; start(); };
    img.src = "assets/hero/slide-2-1672.webp";
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else start();
  });
  if (media && media.addEventListener) media.addEventListener("change", function () { if (eligible()) loadSecondary(); else stop(); });

  if (document.readyState === "complete") loadSecondary();
  else window.addEventListener("load", loadSecondary, { once: true });
})();
