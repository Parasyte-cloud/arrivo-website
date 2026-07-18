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
  // login), anything to the hosts listed above, or anything that isn't a
  // plain http(s) request. Browser extensions can trigger fetch events
  // with schemes like chrome-extension:// — the Cache API only supports
  // http(s), so trying to cache.put() one of those throws.
  if (
    event.request.method !== "GET" ||
    !url.protocol.startsWith("http") ||
    NEVER_CACHE_HOSTS.some((host) => url.hostname.includes(host))
  ) {
    return; // let the browser handle it normally, untouched
  }

  // Full-page navigations (e.g. someone typing ridearrivo.com/book directly,
  // or refreshing) get network-first treatment — always try the real network
  // first, and only fall back to a cached copy if that genuinely fails.
  // This avoids ever serving a stale shell for a page the visitor expects
  // to be current.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return caches.match("/index.html").then((homepage) => {
              if (homepage) return homepage;
              // Absolute last resort — nothing cached at all (e.g. someone's
              // very first visit, already offline). A real Response here,
              // not undefined, is what keeps this from ever becoming the
              // confusing ERR_FAILED error.
              return new Response(
                "<h1>You're offline</h1><p>This page hasn't been loaded before, so it isn't available offline yet. Please reconnect and try again.</p>",
                { headers: { "Content-Type": "text/html" } }
              );
            });
          })
        )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached; // instant load from cache — don't even wait on the network

      // Not cached — go to the network. If that fails and there's nothing
      // cached either, let the browser's native error handling take over
      // (a real network error) rather than silently resolving to
      // `undefined`, which Chrome reports as the confusing ERR_FAILED.
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
