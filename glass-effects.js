// Dynamic Liquid Glass highlight — makes the specular highlight on buttons
// and cards track the cursor, the way light actually catches a curved
// glass surface as you move around it, rather than sitting in one fixed
// spot. Shared across every page since no single JS file was already
// loaded everywhere (index.html uses script.js, book.html uses
// booking.js, driver.html uses driver.js, account/login/signup only had
// inline scripts) — this avoids duplicating the same logic six times.
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
      // snapping — CSS transition on --mx/--my isn't animatable directly,
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
  // the initial load (new steps, re-rendered lists) — a light-touch
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
  // shows through behind it on page load — it becomes the floating pill
  // only once scrolled, at which point there's always real page content
  // behind that gap rather than a stray strip of plain background.
  function updateHeaderScrollState() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  }
  updateHeaderScrollState();
  window.addEventListener("scroll", updateHeaderScrollState, { passive: true });
})();
