// Registers the service worker so the site becomes installable (PWA) and
// loads instantly on repeat visits. Fails silently and harmlessly on
// browsers that don't support service workers — nothing depends on it.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js").catch(function (err) {
      console.warn("[Arrivo] Service worker registration failed:", err.message);
    });
  });
}
