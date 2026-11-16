// Express shares the one consent choice and gate with the main site.
// Run: node --test tests/*.test.js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const ROOT = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");

test("consent script lists the Express origin and its own page list", () => {
  const s = read("marketing-consent.js");
  assert.match(s, /EXPRESS_ORIGIN = "https:\/\/express\.ridearrivo\.com"/);
  assert.match(s, /EXPRESS_PAGES = \["\/", "\/index", "\/express", "\/privacy", "\/terms"\]/);
  assert.ok(!/EXPRESS_PAGES[^;]*(signup|login|account|track|book)/.test(s), "no account, booking or tracking page is approved");
});

test("TikTok click id is an approved campaign parameter", () => {
  assert.match(read("marketing-consent.js"), /SAFE_PARAMS = \[[^\]]*"ttclid"/);
});

test("registration hand-off carries no personal data", () => {
  const s = read("marketing-consent.js");
  assert.match(s, /REG_KEY = "arrivo_reg"/);
  assert.match(s, /\[0-9a-f\]\{24\}/, "note is a random 24 hex id");
  const q = s.slice(s.indexOf("function queueRegistration"), s.indexOf("function flushRegistration"));
  assert.ok(!/email|phone|name|token/i.test(q), "no identity fields in the note");
  assert.match(q, /gpcEnabled\(\)/);
  assert.match(q, /choice\.marketing/);
});

test("signup counts a registration only for a certainly new account", () => {
  const h = read("signup.html");
  assert.equal((h.match(/queueRegistration\(\)/g) || []).length, 2);
  assert.match(h, /isNewUser === true \|\| result\.data\.created === true/);
});

test("CSP allows the TikTok pixel transport without a wildcard", () => {
  const csp = read("_headers").match(/Content-Security-Policy: ([^\n]+)/)[1];
  const d = n => csp.split(";").find(x => x.trim().startsWith(n + " "));
  assert.match(d("script-src"), /https:\/\/analytics\.tiktok\.com/);
  assert.match(d("connect-src"), /https:\/\/analytics\.tiktok\.com/);
  assert.ok(!/\*\.tiktok/.test(csp));
});

test("Express build bundles consent and keeps the tracking origins", () => {
  cp.execFileSync("node", ["scripts/build-express.js"], { cwd: ROOT, stdio: "pipe" });
  const out = f => fs.readFileSync(path.join(ROOT, "dist/express", f), "utf8");
  assert.ok(fs.existsSync(path.join(ROOT, "dist/express/marketing-consent.js")));
  assert.ok(fs.existsSync(path.join(ROOT, "dist/express/marketing-consent.css")));
  assert.match(out("express.html"), /marketing-consent\.js/);
  assert.match(out("index.html"), /marketing-consent\.js/);
  const h = out("_headers");
  for (const host of ["connect.facebook.net", "www.googletagmanager.com", "analytics.tiktok.com"]) assert.ok(h.includes(host), host);
  assert.ok(out("sw.js").includes("/marketing-consent.js"));
  assert.ok(!out("express.html").includes(String.fromCharCode(0x2014)));
});
