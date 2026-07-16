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
    document.querySelectorAll(".btn-primary, .btn-ghost, .card, .showcase-card").forEach(attach);
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
})();
