"use strict";
// The old ArrivoExpress page charged riders (wallet and Paystack card). It is
// retired: it must forward to the engine app and never initialise or pay.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const src = fs.readFileSync(path.join(ROOT, "express.js"), "utf8");

function run(hostname, search) {
  const calls = { replaced: null, domTouched: 0, paystack: 0 };
  const win = {
    location: { hostname, search, replace: (u) => { calls.replaced = u; } },
    ARRIVO_EXPRESS_CONFIG: { engineUrl: "https://arrivo-everywhere.onrender.com/express" },
    PaystackPop: { setup: () => { calls.paystack++; return { openIframe() {} }; } },
  };
  const doc = new Proxy({}, { get() { calls.domTouched++; return () => null; } });
  vm.runInNewContext(src, { window: win, document: doc, URL, URLSearchParams, console, setTimeout, clearTimeout });
  return calls;
}

test("old Express page forwards to the engine app and keeps mode and theme", () => {
  const c = run("express.ridearrivo.com", "?mode=schedule&theme=dark&secret=x");
  assert.equal(c.replaced, "https://arrivo-everywhere.onrender.com/express?mode=schedule&theme=dark");
});

test("old Express page never starts up or opens a card payment", () => {
  const c = run("ridearrivo.com", "");
  assert.equal(c.domTouched, 0, "nothing on the page is initialised");
  assert.equal(c.paystack, 0, "no Paystack popup");
});

test("the payment functions are hard stopped even if the gate is removed", () => {
  assert.match(src, /function payShortfallThenBook\([^)]*\) \{\n[^\n]*\n\s*return;/);
  assert.match(src, /function confirmRide\(\) \{\n[^\n]*\n\s*return;/);
});
