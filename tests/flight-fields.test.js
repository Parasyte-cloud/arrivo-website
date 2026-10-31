// Run: node --test tests/flight-fields.test.js
// Pulls the real flight checks out of booking.js and pins them to the same rules the backend uses
// (arrivo-backend/services/flightInput.js), and checks the form actually sends the new fields.
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const js = fs.readFileSync(path.join(__dirname, "..", "booking.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "..", "book.html"), "utf8");
const block = js.slice(js.indexOf("var FLIGHT_IATA"), js.indexOf("function initStep2()"));
assert.ok(block.includes("flightNumberProblem"), "flight checks not found in booking.js");
const f = new Function("window", block + "; return { flightNumberProblem, flightDateProblem, pnrProblem, squashCode };")({});

test("real flight numbers pass in any casing or spacing", () => {
  ["BA75", "ba 075", "ET-905", "W3 123", "3K5", "BAW75", ""].forEach((v) => assert.strictEqual(f.flightNumberProblem(v), null, v));
});

test("a booking code in the flight box is named as one", () => {
  assert.match(f.flightNumberProblem("XQ7K9P"), /booking code/);
  assert.match(f.flightNumberProblem("Lagos"), /airline code/);
});

test("the flight date must be a real day, today or later", () => {
  assert.strictEqual(f.flightDateProblem("2026-11-02", "2026-11-01"), null);
  assert.match(f.flightDateProblem("2026-10-31", "2026-11-01"), /passed/);
  assert.match(f.flightDateProblem("2026-02-30", "2026-11-01"), /real date/);
  assert.match(f.flightDateProblem("02/11/2026", "2026-11-01"), /year-month-day/);
});

test("the booking code is optional, 5 to 8 characters", () => {
  assert.strictEqual(f.pnrProblem(""), null);
  assert.strictEqual(f.pnrProblem("ab12cd"), null);
  assert.match(f.pnrProblem("ab"), /5 to 8/);
});

test("the form has the new fields and the booking sends them", () => {
  ["fFlightDate", "fSurname", "fPnr", "flightDateError", "pnrError"].forEach((id) => assert.ok(html.includes(`id="${id}"`), id));
  const payload = js.slice(js.indexOf("function buildRidePayload"), js.indexOf("function buildRidePayload") + 1200);
  ["flightDate: state.flightDate", "passengerSurname: state.passengerSurname", "pnr: state.pnr"].forEach((k) => assert.ok(payload.includes(k), k));
});
