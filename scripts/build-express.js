#!/usr/bin/env node
/*
 * Builds the standalone ArrivoExpress site for express.ridearrivo.com.
 *
 *   node scripts/build-express.js            -> writes dist/express/
 *
 * Cloudflare Pages: build command  `node scripts/build-express.js`
 *                   output dir     `dist/express`
 * No npm install needed (Node built-ins only).
 *
 * What it does
 *   - copies ONLY Express (plus privacy, terms, 404). Login, signup, account,
 *     ride tracking and password flows stay on www.ridearrivo.com: riders
 *     have one login for every RideArrivo site via a shared cookie set by
 *     the API for .ridearrivo.com, so nothing is duplicated here.
 *   - makes `/` serve Express (index.html is the Express page)
 *   - rewrites links to main-site-only pages (login, signup, account, track,
 *     book, driver, home-page anchors) to absolute https://ridearrivo.com/...
 *     URLs; sign-in links carry next=<full Express URL> to come back here
 *   - leaves the site-wide launch-countdown gate out
 *   - writes host-specific manifest, robots.txt, sitemap.xml, sw.js,
 *     express-config.js and _headers
 *   - fails the build if anything expected is missing or a link points at a
 *     file that was not bundled.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "dist", "express");
const MAIN = process.env.MAIN_SITE_ORIGIN || "https://ridearrivo.com";
const SELF = process.env.EXPRESS_ORIGIN || "https://express.ridearrivo.com";
// The shared login cookie is only accepted by browsers when the API is served
// from inside ridearrivo.com, so the standalone site defaults to the
// api.ridearrivo.com custom domain (see docs/EXPRESS-GO-LIVE.md, step 2).
const API = process.env.API_BASE_URL || "https://api.ridearrivo.com";

// Only what Express itself needs. Login, signup, password reset, email
// verification, wallet/account and ride tracking stay on www.ridearrivo.com:
// one login for every RideArrivo site (shared cookie), nothing duplicated
// here, and nothing on this host that can drift out of date.
const PAGES = ["express.html", "privacy.html", "terms.html", "404.html"];
const FILES = [
  "express.js", "express.css", "styles.css", "booking.css", "home.css", "i18n.js",
  "theme.js", "header-move.js", "clock.js", "glass-effects.js", "pwa-register.js", "paystack-config.js", "maps-config.js",
];
const MAIN_ONLY = "login|signup|account|track|forgot-password|reset-password|verify-email";

function die(msg) { console.error("BUILD FAILED: " + msg); process.exit(1); }
function read(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) die("missing source file " + rel);
  return fs.readFileSync(p, "utf8");
}
function write(rel, data) {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, data);
}
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

function stripLaunchGate(html) {
  let out = html
    // Any inline script that toggles the launch gate class, in either the
    // original form or the later date-guarded form from the launch-gate PR.
    .replace(/\s*<script>(?:(?!<\/script>)[\s\S])*ra-launch-pending(?:(?!<\/script>)[\s\S])*<\/script>/, "")
    .replace(/\s*<link rel="stylesheet" href="\/launch-countdown\.css[^"]*">/, "")
    .replace(/\s*<script src="\/launch-countdown\.js[^"]*" defer><\/script>/, "");
  return out;
}

// Links to pages that only exist on the main site become absolute.
function mainSiteLinks(html) {
  return html
    // Sign-in style pages: absolute, and "next" becomes the full Express URL
    // so the rider lands back here after logging in on www.
    .replace(new RegExp('href="(' + MAIN_ONLY + ')\\.html\\?next=express\\.html"', "g"),
      (m, page) => 'href="' + MAIN + "/" + page + ".html?next=" + encodeURIComponent(SELF + "/") + '"')
    .replace(new RegExp('href="(' + MAIN_ONLY + ')\\.html"', "g"), 'href="' + MAIN + '/$1.html"')
    .replace(/href="index\.html(#[^"]*)"/g, 'href="' + MAIN + '/index.html$1"')
    .replace(/href="(book|driver)\.html"/g, 'href="' + MAIN + '/$1.html"');
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// ---- pages ---------------------------------------------------------------
for (const rel of PAGES) {
  let html = mainSiteLinks(stripLaunchGate(read(rel)));
  if (rel === "express.html") {
    html = html
      .replace('<link rel="canonical" href="https://ridearrivo.com/express.html">', '<link rel="canonical" href="' + SELF + '/">')
      .replace('<meta property="og:url" content="https://ridearrivo.com/express.html">', '<meta property="og:url" content="' + SELF + '/">')
      .replace('"url": "https://ridearrivo.com/express.html"', '"url": "' + SELF + '/"');
    if (!html.includes('rel="canonical" href="' + SELF)) die("express.html canonical rewrite did not apply");
    write("express.html", html);
    // `/` must serve Express directly (no redirect rule needed).
    write("index.html", html);
    continue;
  }
  // Supporting pages exist for the rider flow only: keep them out of search,
  // and keep their canonical pointing at the main-site original.
  if (!/<meta name="robots"/.test(html)) {
    html = html.replace("<head>", '<head>\n<meta name="robots" content="noindex, follow">');
  }
  write(rel, html);
}
for (const rel of FILES) write(rel, read(rel));
copyDir(path.join(ROOT, "assets"), path.join(OUT, "assets"));

// ---- host-specific files ---------------------------------------------------
write("express-config.js",
`// Generated by scripts/build-express.js. Do not edit by hand.
window.ARRIVO_EXPRESS_CONFIG = {
  apiBase: ${JSON.stringify(API)},
  loginPath: ${JSON.stringify(MAIN + "/login.html")},
  accountPath: ${JSON.stringify(MAIN + "/account.html")},
  trackPath: ${JSON.stringify(MAIN + "/track.html")},
  selfPath: ${JSON.stringify(SELF + "/")}
};
`);

const manifest = JSON.parse(read("manifest.json"));
manifest.name = "ArrivoExpress";
manifest.short_name = "Express";
manifest.description = "On-demand rides in Lagos. Tap to book, no schedule needed.";
manifest.start_url = "/express.html";
manifest.scope = "/";
manifest.id = "/";
write("manifest.json", JSON.stringify(manifest, null, 2) + "\n");

write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SELF}/sitemap.xml\n`);
write("sitemap.xml",
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SELF}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`);

// Service worker: same logic as the main site, precache list trimmed to what
// exists here. A distinct cache-name prefix keeps it separate from any other
// worker should both ever run on one browser profile (different origins have
// separate caches anyway; this is belt and braces).
let sw = read("sw.js");
const shellRe = /const SHELL_FILES = \[[\s\S]*?\];/;
if (!shellRe.test(sw)) die("sw.js SHELL_FILES block not found");
sw = sw.replace(shellRe, `const SHELL_FILES = [
  "/",
  "/express.html",
  "/privacy.html",
  "/terms.html",
  "/styles.css",
  "/booking.css",
  "/home.css",
  "/express.css",
  "/theme.js",
  "/i18n.js",
  "/express.js",
  "/express-config.js",
  "/clock.js",
  "/manifest.json",
  "/assets/icon.png",
  "/assets/favicon.png",
  "/assets/ridearrivo-wordmark-light.png",
];`).replace('const CACHE_NAME = "arrivo-shell-"', 'const CACHE_NAME = "arrivo-express-"');
write("sw.js", sw);

// _headers: reuse the main site's rules unchanged (same CSP allowlist: the
// API host, Google Maps/Sign-In, Apple, Paystack all apply here too) and
// add no-store for the config file so an API URL change is picked up at once.
write("_headers", read("_headers").replace(/\s*$/, "\n") +
`
/express-config.js
  Cache-Control: no-store, no-cache, must-revalidate

/index.html
  Cache-Control: no-store, no-cache, must-revalidate
`);

// ---- verification ----------------------------------------------------------
const missing = [];
for (const rel of PAGES.map((p) => (p === "payment/callback/index.html" ? p : p))) {
  const html = fs.readFileSync(path.join(OUT, rel === "express.html" ? "express.html" : rel), "utf8");
  const base = path.dirname(rel);
  for (const m of html.matchAll(/(?:src|href)="([^"#?]+)(?:[?#][^"]*)?"/g)) {
    const ref = m[1];
    if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(ref) || ref.startsWith("mailto") || ref.startsWith("tel")) continue;
    const target = ref.startsWith("/") ? ref.slice(1) : path.join(base, ref);
    if (!fs.existsSync(path.join(OUT, target)) && !fs.existsSync(path.join(OUT, target, "index.html"))) {
      missing.push(rel + " -> " + ref);
    }
  }
}
for (const f of fs.readdirSync(OUT)) {
  if (/\.(html|js|css)$/.test(f) && fs.readFileSync(path.join(OUT, f), "utf8").includes(String.fromCharCode(0x2014))) {
    die("em dash found in " + f);
  }
}
if (missing.length) die("unresolved local references:\n  " + [...new Set(missing)].join("\n  "));
{
  const idx = fs.readFileSync(path.join(OUT, "index.html"), "utf8");
  if (/launch-countdown|ra-launch-pending/.test(idx)) die("launch gate still present");
}

const count = (function walk(d) { return fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? walk(path.join(d, e.name)) : 1), 0); })(OUT);
console.log("Built " + count + " files into " + path.relative(ROOT, OUT));
