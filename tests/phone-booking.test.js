// A missing or invalid phone must keep the rider inside booking, not bounce them away.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const s = fs.readFileSync(path.join(__dirname, "..", "booking.js"), "utf8");

test("booking handles PHONE_REQUIRED and PHONE_INVALID by returning to the contact step", () => {
  const fn = s.slice(s.indexOf("function handlePhoneProblem"), s.indexOf("function bookingErrorText"));
  assert.match(fn, /PHONE_REQUIRED/);
  assert.match(fn, /PHONE_INVALID/);
  assert.match(fn, /goToStep\(2\)/);
  assert.match(fn, /contactError/);
  assert.ok(!/location\.(href|assign|replace)/.test(fn), "never navigates away");
});

test("quote, ride create and card pre-check all use the phone handler", () => {
  assert.equal((s.match(/handlePhoneProblem\(/g) || []).length, 4, "definition plus three call sites");
});

test("the ride itself carries the rider phone", () => {
  const b = s.slice(s.indexOf("function buildRidePayload"));
  assert.match(b.slice(0, 1800), /riderPhone: state\.whatsapp/);
});
