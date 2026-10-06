// Registers the service worker so the site is installable (PWA) and loads fast
// on repeat visits. Fails silently on browsers without service worker support;
// nothing else on the site depends on it.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    // updateViaCache: "none" means the browser never trusts an HTTP-cached copy
    // of sw.js, so a new worker is noticed as soon as it is deployed.
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then(function (registration) {
        // An installed PWA can stay open for days without a page navigation, and
        // navigations are what normally trigger the update check. So also check
        // whenever the app returns to the foreground or the phone reconnects,
        // at most once a minute.
        var lastCheck = 0;
        function checkForUpdate() {
          var now = Date.now();
          if (now - lastCheck < 60000) return;
          lastCheck = now;
          registration.update().catch(function () {});
        }
        document.addEventListener("visibilitychange", function () {
          if (document.visibilityState === "visible") checkForUpdate();
        });
        window.addEventListener("online", checkForUpdate);
      })
      .catch(function (err) {
        console.warn("[Arrivo] Service worker registration failed:", err.message);
      });
  });
}