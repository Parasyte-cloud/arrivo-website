// Arrivo service worker.
//
// What this DOES cache: the static site shell — HTML pages, CSS, JS, images.
// This is what makes the site installable as a PWA and lets it load
// instantly (and even work offline for browsing) on repeat visits.
//
// What this NEVER caches: anything going to the backend API, Paystack, or
// Google Maps. Ride bookings, payments, and login must always hit the
// network fresh — caching any of that would risk showing stale or
// incorrect data for something people are paying real money through.

const CACHE_NAME = "arrivo-shell-v1";

const SHELL_FILES = [
  "/",
  "/index.html",
  "/book.html",
  "/driver.html",
  "/privacy.html",
  "/terms.html",
  "/signup.html",
  "/forgot-password.html",
  "/reset-password.html",
  "/verify-email.html",
  "/styles.css",
  "/booking.css",
  "/i18n.js",
  "/script.js",
  "/booking.js",
  "/clock.js",
  "/driver.js",
  "/manifest.json",
  "/assets/icon.png",
  "/assets/favicon.png",
  "/assets/ride-arrivo-wordmark.png",
];

// Requests to these hosts are never intercepted — always go straight to
// the network, no caching, no offline fallback. This list intentionally
// stays narrow and explicit rather than trying to guess.
const NEVER_CACHE_HOSTS = [
  "onrender.com",       // arrivo-backend
  "paystack.co",         // Paystack checkout
  "googleapis.com",      // Google Maps / Places / Fonts
  "gstatic.com",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache what we can; don't let one missing file (e.g. a page that
      // doesn't exist yet in an older deploy) fail the whole install.
      return Promise.all(
        SHELL_FILES.map((url) => cache.add(url).catch(() => {}))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never intercept non-GET requests (POST/PATCH/etc. — bookings, payments,
  // login) or anything to the hosts listed above.
  if (event.request.method !== "GET" || NEVER_CACHE_HOSTS.some((host) => url.hostname.includes(host))) {
    return; // let the browser handle it normally, untouched
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Cache-first for the static shell: instant loads, works offline.
      // Falls back to network for anything not pre-cached (e.g. a new
      // page added after this service worker was installed).
      const networkFetch = fetch(event.request)
        .then((response) => {
          // Keep the cache fresh with whatever we actually get from the
          // network, so future visits pick up real updates.
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached); // offline and not cached — nothing we can do

      return cached || networkFetch;
    })
  );
});
