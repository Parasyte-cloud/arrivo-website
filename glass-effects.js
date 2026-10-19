// Dynamic Liquid Glass highlight -- makes the specular highlight on buttons
// and cards track the cursor, the way light actually catches a curved
// glass surface as you move around it, rather than sitting in one fixed
// spot. Shared across every page since no single JS file was already
// loaded everywhere (index.html uses script.js, book.html uses
// booking.js, driver.html uses driver.js, account/login/signup only had
// inline scripts) -- this avoids duplicating the same logic six times.
(function () {
  function attach(el) {
    if (el.__glassHighlightAttached) return;
    el.__glassHighlightAttached = true;

    el.addEventListener("pointermove", function (e) {
      var rect = el.getBoundingClientRect();
      var x = ((e.clientX - rect.left) / rect.width) * 100;
      var y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty("--mx", x + "%");
      el.style.setProperty("--my", y + "%");
    });

    el.addEventListener("pointerleave", function () {
      // Drift back to the default resting highlight position rather than
      // snapping -- CSS transition on --mx/--my isn't animatable directly,
      // so this relies on the element's own background-position transition
      // picking up the change smoothly.
      el.style.removeProperty("--mx");
      el.style.removeProperty("--my");
    });
  }

  function attachAll() {
    document.querySelectorAll(".btn-primary, .btn-ghost, .card, .showcase-card, .safety-chip, .how-card, .hero-glass-panel").forEach(attach);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachAll);
  } else {
    attachAll();
  }

  // Booking flow and other dynamic pages reveal new buttons/cards after
  // the initial load (new steps, re-rendered lists) -- a light-touch
  // MutationObserver keeps new elements wired up without needing every
  // page to remember to call attachAll() again itself.
  var observer = new MutationObserver(function () { attachAll(); });
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  // Header starts flush against the top (no gap, no pill) so nothing
  // shows through behind it on page load -- it becomes the floating pill
  // only once scrolled, at which point there's always real page content
  // behind that gap rather than a stray strip of plain background.
  function updateHeaderScrollState() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    var was = header.classList.contains("is-scrolled");
    var now = window.scrollY > 8;
    header.classList.toggle("is-scrolled", now);
    if (was !== now) bounceHeader(now);
  }

  // Phone navbar "island" motion. The logo and the buttons take a small staggered spring each time the
  // header shrinks into its pill or grows back. Played with the Web Animations API so it restarts every
  // time. Phones only, and it follows the Reduce Motion setting unless the visitor opened the site with
  // ?fun=1 once (remembered on this device; ?fun=0 turns it back off).
  var FUN_KEY = "ar-island-fun";
  try {
    var q = /[?&]fun=([01])/.exec(window.location.search);
    if (q) { if (q[1] === "1") localStorage.setItem(FUN_KEY, "always"); else localStorage.removeItem(FUN_KEY); }
  } catch (e) { /* storage blocked */ }
  function funAllowed() {
    var reduce = false, forced = false;
    try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { /* ignore */ }
    try { forced = localStorage.getItem(FUN_KEY) === "always"; } catch (e) { /* ignore */ }
    return !reduce || forced;
  }
  function onPhone() {
    try { return window.matchMedia("(max-width: 859px)").matches; } catch (e) { return false; }
  }
  function syncFun() {
    document.documentElement.setAttribute("data-ar-fun", funAllowed() ? "on" : "off");
    var header = document.querySelector(".site-header");
    if (header && !header.querySelector(":scope > .ar-glow")) {
      var glow = document.createElement("span");
      glow.className = "ar-glow";
      glow.setAttribute("aria-hidden", "true");
      header.insertBefore(glow, header.firstChild);
    }
  }
  function bounceHeader(shrinking) {
    if (!funAllowed() || !onPhone()) return;
    var header = document.querySelector(".site-header");
    if (!header) return;
    var from = shrinking ? "scale(1.45)" : "scale(.55)";
    var els = header.querySelectorAll(
      ".brand, .header-actions .theme-toggle, .header-actions .lang-trigger, .header-actions .nav-account-link, .header-actions > .btn, .mobile-nav-toggle"
    );
    Array.prototype.forEach.call(els, function (el, i) {
      if (typeof el.animate !== "function") return;
      el.animate([{ transform: from }, { transform: "none" }], { duration: 650, delay: i * 45, easing: "cubic-bezier(.3,1.9,.5,1)" });
    });
  }
  syncFun();
  try { window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", syncFun); } catch (e) { /* older Safari */ }
  updateHeaderScrollState();
  window.addEventListener("scroll", updateHeaderScrollState, { passive: true });
})();
