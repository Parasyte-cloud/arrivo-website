// Static delivery contracts; browser behavior is covered by browser_meta_pixel.py.
// Run: node --test tests/*.test.js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
const pages = fs.readdirSync(ROOT).filter(p => p.endsWith(".html")).concat("payment/callback/index.html");

for (const page of pages) {
  test(page + ": exactly one shared consent loader and stylesheet", () => {
    const html = read(page);
    assert.equal((html.match(/<script[^>]+src="\/marketing-consent\.js\?v=20261024-1"/g) || []).length, 1);
    assert.equal((html.match(/<link[^>]+href="\/marketing-consent\.css\?v=20261023-1"/g) || []).length, 1);
    assert.ok(!/connect\.facebook\.net|facebook\.com\/tr|fbq\(/.test(html), "no bypass via inline or noscript pixel");
  });
}

test("pixel ID has one production definition", () => {
  assert.ok(fs.existsSync(path.join(ROOT, "marketing-consent.js")), "shared module exists");
  const source = read("marketing-consent.js");
  assert.equal((source.match(/956256323771727/g) || []).length, 1);
});

test("CSP allows Meta script and event transport without adding a wildcard", () => {
  const csp = read("_headers").match(/Content-Security-Policy: ([^\n]+)/)[1];
  const directive = n => csp.split(";").find(s => s.trim().startsWith(n + " "));
  assert.match(directive("script-src"), /https:\/\/connect\.facebook\.net/);
  assert.match(directive("connect-src"), /https:\/\/www\.facebook\.com/);
  assert.ok(!directive("script-src").includes("*"));
  assert.match(directive("object-src"), /'none'/);
});

test("privacy policy discloses marketing and does not retain contradictory claims", () => {
  const html = read("privacy.html");
  assert.match(html, /Meta Pixel/);
  assert.match(html, /data-ra-cookie-settings/);
  for (const text of ["This website sets no cookies", "we do not share it with advertising networks", "we do not carry out profiling for advertising", "The one third party your browser contacts"]) {
    assert.ok(!html.includes(text), "remove obsolete claim: " + text);
  }
});

test("marketing preference assets are in the offline shell", () => {
  const sw = read("sw.js");
  assert.match(sw, /"\/marketing-consent\.js"/);
  assert.match(sw, /"\/marketing-consent\.css"/);
});
