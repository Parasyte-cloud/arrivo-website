// Run: node --test tests/redirect.test.js
// Extracts the real getNextUrl() from login.html and signup.html and checks
// that no input can leave the approved origins.
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const ORIGIN = "https://www.ridearrivo.com";
function load(file) {
  const src = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  const m = src.match(/var SSO_RETURN_HOSTS[\s\S]*?function getNextUrl\(\) \{[\s\S]*?\n  \}\n/);
  assert.ok(m, "getNextUrl not found in " + file);
  return function (next) {
    const w = { location: { search: "?next=" + encodeURIComponent(next), href: ORIGIN + "/login.html", origin: ORIGIN } };
    return new Function("window", "URLSearchParams", "URL", m[0] + ";return getNextUrl();")(w, URLSearchParams, URL);
  };
}
const allowed = (u) => {
  try { const x = new URL(u, ORIGIN + "/"); return x.protocol === "https:" && !x.username && !x.port &&
    ["www.ridearrivo.com", "ridearrivo.com", "express.ridearrivo.com", "move.ridearrivo.com", "boat.ridearrivo.com", "air.ridearrivo.com", "membership.ridearrivo.com"].includes(x.hostname); }
  catch (e) { return false; }
};

for (const file of ["login.html", "signup.html"]) {
  const fn = load(file);
  test(file + ": hostile inputs stay on approved origins", () => {
    for (const bad of ["//example.invalid/a", "/.//example.invalid/a", ORIGIN + "//example.invalid/a", "\t//example.invalid", " javascript:alert(1)",
      "javascript:alert(1)", "data:text/html,x", "https://evil.example/", "https://user:pw@express.ridearrivo.com/", "https://express.ridearrivo.com:8443/", "\\\\evil.example"]) {
      assert.ok(allowed(fn(bad)), file + " leaked for " + JSON.stringify(bad) + " -> " + fn(bad));
    }
  });
  test(file + ": legitimate returns preserved", () => {
    assert.strictEqual(fn("book.html?type=air"), ORIGIN + "/book.html?type=air");
    assert.strictEqual(fn("https://express.ridearrivo.com/x?a=1"), "https://express.ridearrivo.com/x?a=1");
  });
}
