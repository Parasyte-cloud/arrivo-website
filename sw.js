// RideArrivo service worker.
//
// Goal: fast repeat visits and basic offline browsing, WITHOUT ever showing a
// returning visitor an old version of the site.
//
// Strategy
//   HTML, JS, CSS, JSON, other files ... network-first. The server is asked
//                                        every time; the cache is only the
//                                        fallback when the visitor is offline.
//   images and fonts .................. stale-while-revalidate: shown instantly
//                                        from cache, refreshed in the background.
//   backend API, Paystack, Google, Apple, /payment/ ... never touched.
//
// When to change VERSION: only when this file's own logic changes, or when you
// want to wipe every visitor's cache. Normal content deploys do NOT need a bump,
// because pages, scripts and styles are re-checked on every load.

const VERSION = "2026-09-20";
const CACHE_NAME = "arrivo-shell-" + VERSION;

// Precached on install so a first-time offline visit has something to show.
// Only used as an offline fallback: online, everything is fetched fresh.
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

// Same-origin paths that must always hit the network untouched. Payment
// callbacks carry one-time references and must never be cached or replayed.
const BYPASS_PATHS = ["/payment/", "/api/"];

const IMAGE_OR_FONT = /\.(png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        SHELL_FILES.map((url) =>
          // cache: "reload" skips the browser's HTTP cache, so the precache
          // can never capture an already-stale copy. One missing file must
          // not fail the whole install, hence the catch.
          fetch(new Request(url, { cache: "reload" }))
            .then((response) => (response.ok ? cache.put(url, response) : undefined))
            .catch(() => {})
        )
      )
    )
  );
  // Take over as soon as installed instead of waiting for every tab to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      // Delete EVERY cache except the current one. This is what removes the old
      // "arrivo-shell-v1" copies of JS and CSS from returning visitors' phones.
      .then((names) =>
        Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Leave alone (browser handles it normally): anything that isn't a plain GET
  // (bookings, payments, login are POST/PATCH), anything from another origin
  // (backend on onrender.com, Paystack, Google Maps/Sign-In, Apple Sign-In,
  // browser extensions), and the paths listed above.
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  if (BYPASS_PATHS.some((prefix) => url.pathname.startsWith(prefix))) return;
  if (url.pathname === "/sw.js") return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(event, request, true));
  } else if (IMAGE_OR_FONT.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event, request));
  } else {
    event.respondWith(networkFirst(event, request, false));
  }
});

function cacheable(response) {
  return response && response.ok && response.type === "basic";
}

async function networkFirst(event, request, isNavigation) {
  try {
    // no-cache = revalidate with the server even if the browser thinks its own
    // copy is still fresh (usually a tiny 304 reply, not a full download).
    const response = await fetch(request, isNavigation ? undefined : { cache: "no-cache" });
    if (cacheable(response)) {
      const copy = response.clone();
      event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {})
      );
    }
    return response;
  } catch (err) {
    return offlineFallback(request, isNavigation);
  }
}

async function offlineFallback(request, isNavigation) {
  const cache = await caches.open(CACHE_NAME);
  let cached = await cache.match(request);
  // Scripts and styles: an older cached copy is better than nothing when offline.
  if (!cached && !isNavigation) {
    cached = await cache.match(request, { ignoreSearch: true });
  }
  if (cached) return cached;

  if (isNavigation) {
    const homepage = await cache.match("/index.html");
    if (homepage) return homepage;
    // Nothing cached at all (first visit while offline). Return a real
    // Response, never undefined, which Chrome reports as ERR_FAILED.
    return new Response(
      "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>" +
        "<title>Offline</title><h1>You're offline</h1>" +
        "<p>This page hasn't been loaded before, so it isn't available offline yet. " +
        "Please reconnect and try again.</p>",
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
  return Response.error();
}

async function staleWhileRevalidate(event, request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const refresh = fetch(request).then((response) => {
    if (cacheable(response)) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  });

  if (cached) {
    event.waitUntil(refresh.catch(() => {}));
    return cached;
  }
  return refresh;
}