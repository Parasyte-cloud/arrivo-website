/* Homepage hero background slideshow.

   Slide 1 is the photo the page already paints (the .hero-bg element, preloaded
   in the head), so nothing here can slow the first screen. The other slides are
   fetched one at a time, only after the page has loaded, and only when the
   visitor has not asked for reduced data. Each slide fades in over the last and
   drifts slowly (a gentle zoom), and the set repeats.

   TO CHANGE THE PICTURES: edit SLIDES below. Each entry needs a small file
   (phones, about 960px wide) and a large one (1000px and up, about 1672px wide).
   Photos should keep the subject in the middle and stay fairly dark on the left,
   where the headline sits; the dark overlay in styles.css does the rest.

   Accessibility: the pictures are decoration (aria-hidden). Anything that moves
   by itself for more than 5 seconds needs a way to stop it, so there is a pause
   button and one button per picture. With "reduce motion" on, nothing advances
   or drifts by itself, and the buttons still work. */
(function () {
  "use strict";

  var SLIDES = [
    // 1. Yacht at the dock. This one is the static background in CSS and the head preload.
    { sm: "assets/hero/slide-1-960.webp", lg: "assets/hero/slide-1-1672.webp" },
    // 2. Removals truck at a house
    { sm: "assets/hero/slide-2-960.webp", lg: "assets/hero/slide-2-1672.webp" },
    // 3. Private jet on the apron
    { sm: "assets/hero/slide-3-960.webp", lg: "assets/hero/slide-3-1672.webp" },
    // 4. Sedan at the hotel entrance
    { sm: "assets/hero/slide-4-960.webp", lg: "assets/hero/slide-4-1672.webp" },
    // 5. SUV at the airport kerb
    { sm: "assets/hero/slide-5-960.webp", lg: "assets/hero/slide-5-1672.webp" }
  ];
  var INTERVAL = 7000; // how long each picture stays, in milliseconds
  var FADE = 1400;     // how long the cross-fade takes (must match --hero-fade in home.css)

  var hero = document.getElementById("top");
  var first = hero && hero.querySelector(".hero-bg");
  if (!first || SLIDES.length < 2) return;

  var conn = navigator.connection || {};
  if (conn.saveData) return; // visitor asked for less data: keep the single photo

  var reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var wideQuery = window.matchMedia("(min-width: 1000px)");
  var els = new Array(SLIDES.length); // slide elements, null until loaded
  var failed = {};
  var current = 0;
  var timer = null;
  var userPaused = false;
  var ui = null;

  els[0] = first;
  first.classList.add("hero-slide", "is-active");
  first.setAttribute("data-kb", "0");

  function t(key, fallback) {
    return typeof window.RAt === "function" ? window.RAt(key, fallback) : fallback;
  }

  function load(i) {
    if (els[i]) return Promise.resolve(els[i]);
    if (failed[i]) return Promise.reject(new Error("failed"));
    return new Promise(function (resolve, reject) {
      var url = wideQuery.matches ? SLIDES[i].lg : SLIDES[i].sm;
      var img = new Image();
      img.onload = function () {
        var el = document.createElement("div");
        el.className = "hero-bg hero-slide";
        el.setAttribute("aria-hidden", "true");
        el.setAttribute("data-kb", String(i % 3));
        el.style.backgroundImage = 'url("' + url + '")';
        hero.insertBefore(el, first.nextSibling);
        els[i] = el;
        resolve(el);
      };
      img.onerror = function () { failed[i] = true; reject(new Error("failed")); };
      img.src = url;
    });
  }

  function paintUi() {
    if (!ui) return;
    var total = SLIDES.length;
    ui.dots.forEach(function (dot, i) {
      var label = t("ui.heroSlide", "Show picture {n} of {total}")
        .replace("{n}", String(i + 1)).replace("{total}", String(total));
      dot.setAttribute("aria-label", label);
      if (i === current) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
      dot.classList.toggle("is-on", i === current);
    });
    if (ui.pause) {
      var playing = !userPaused;
      ui.pause.setAttribute("aria-label", playing
        ? t("ui.heroPause", "Pause the background pictures")
        : t("ui.heroPlay", "Play the background pictures"));
      ui.pause.classList.toggle("is-paused", !playing);
    }
  }

  function show(i) {
    if (i === current) return;
    var from = els[current];
    var to = els[i];
    if (!to) return;
    els.forEach(function (el) { if (el) el.classList.remove("is-leaving"); });
    from.classList.remove("is-active");
    from.classList.add("is-leaving");
    to.classList.add("is-active");
    // Restart the drift on the incoming slide.
    to.style.animation = "none"; void to.offsetWidth; to.style.animation = "";
    current = i;
    paintUi();
    window.setTimeout(function () {
      if (els[i] !== to || current !== i) { from.classList.remove("is-leaving"); return; }
      from.classList.remove("is-leaving");
    }, FADE + 100);
  }

  function nextIndex(from) {
    for (var step = 1; step <= SLIDES.length; step++) {
      var n = (from + step) % SLIDES.length;
      if (!failed[n]) return n;
    }
    return from;
  }

  function schedule() {
    window.clearTimeout(timer);
    if (userPaused || reduceQuery.matches || document.hidden) return;
    timer = window.setTimeout(advance, INTERVAL);
  }

  function advance() {
    var n = nextIndex(current);
    if (n === current) return;
    load(n).then(function () { show(n); schedule(); }, function () { advance(); });
  }

  function goTo(i) {
    window.clearTimeout(timer);
    load(i).then(function () { show(i); schedule(); }, function () { schedule(); });
  }

  function buildUi() {
    var wrap = document.createElement("div");
    wrap.className = "hero-slider-ui";
    wrap.setAttribute("role", "group");
    ui = { dots: [], pause: null };
    var pause = document.createElement("button");
    pause.type = "button";
    pause.className = "hero-pause";
    pause.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<g class="ic-pause"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></g>' +
      '<path class="ic-play" d="M8 5.5v13a1 1 0 0 0 1.5.86l10-6.5a1 1 0 0 0 0-1.72l-10-6.5A1 1 0 0 0 8 5.5z"/></svg>';
    pause.addEventListener("click", function () {
      userPaused = !userPaused;
      if (userPaused) window.clearTimeout(timer); else schedule();
      paintUi();
    });
    ui.pause = pause;
    wrap.appendChild(pause);
    SLIDES.forEach(function (_, i) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "hero-dot";
      dot.innerHTML = "<span></span>";
      dot.addEventListener("click", function () { goTo(i); });
      ui.dots.push(dot);
      wrap.appendChild(dot);
    });
    hero.appendChild(wrap);
    paintUi();
  }

  function applyMotionPreference() {
    document.documentElement.classList.toggle("hero-still", reduceQuery.matches);
    if (ui && ui.pause) ui.pause.hidden = reduceQuery.matches; // nothing moves, nothing to pause
    if (reduceQuery.matches) window.clearTimeout(timer); else schedule();
  }

  function start() {
    buildUi();
    applyMotionPreference();
    if (reduceQuery.addEventListener) reduceQuery.addEventListener("change", applyMotionPreference);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) window.clearTimeout(timer); else schedule();
    });
    // Keep the button labels in the visitor's language when they switch.
    if (window.MutationObserver) {
      new MutationObserver(paintUi).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    }
    // Fetch the second picture early so the first change is smooth, then start the clock.
    load(nextIndex(0)).then(schedule, schedule);
  }

  function whenIdle(fn) {
    if ("requestIdleCallback" in window) window.requestIdleCallback(fn, { timeout: 3000 });
    else window.setTimeout(fn, 1200);
  }

  function boot() { whenIdle(start); }
  if (document.readyState === "complete") boot();
  else window.addEventListener("load", boot);
})();
