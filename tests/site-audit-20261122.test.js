// Regression checks from the 2026-11-22 site audit. Run: node --test tests/*.test.js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
const pages = fs.readdirSync(ROOT).filter(p => p.endsWith(".html"));

test("every page loads the same consent script version", () => {
  const seen = new Set();
  for (const p of pages) for (const m of read(p).matchAll(/marketing-consent\.js\?v=([\w-]+)/g)) seen.add(m[1]);
  assert.equal(seen.size, 1, "mixed consent script versions: " + [...seen].join(", "));
});

test("home page social title matches the page, not an old slogan", () => {
  const html = read("index.html");
  assert.ok(!/Text me when you reach/.test(html));
  assert.match(html, /og:title" content="RideArrivo: airport transfers/);
});

test("every indexable page has a social image", () => {
  for (const p of pages) {
    const html = read(p);
    if (/noindex/.test(html) || p === "404.html" || p === "express.html") continue;
    assert.match(html, /property="og:image"/, p + " has no og:image");
  }
});

test("pages with form fields give unlabeled fields an accessible name", () => {
  for (const p of pages) {
    const html = read(p);
    if (!/<(input|textarea)\b/.test(html)) continue;
    assert.match(html, /a11y-labels\.js/, p + " is missing a11y-labels.js");
  }
});

test("contact page offers WhatsApp, phone and email, and its phone label points at a real control", () => {
  const html = read("contact-us.html");
  assert.match(html, /wa\.me\/2348162706078/);
  assert.match(html, /id="footerPhoneLink"/);
  assert.match(html, /id="footerEmailLink"/);
  assert.ok(!/for="cPhoneContainer"/.test(html), "label for= must not point at a div");
});

test("booking and driver footers list Campus-era links and Contact", () => {
  for (const p of ["book.html", "driver.html"]) {
    const foot = read(p).split("<footer").pop();
    assert.match(foot, /contact-us\.html/, p);
    assert.match(foot, /safety\.html/, p);
  }
  assert.match(read("book.html").split("<footer").pop(), /campus\.ridearrivo\.com/);
});

test("phone field keeps its placeholder readable on narrow phones", () => {
  const js = read("phone-input.js");
  assert.match(js, /flex:0 0 clamp\(106px/);
  assert.match(js, /arrivo-phone-number" style="flex:1; min-width:0/);
});
