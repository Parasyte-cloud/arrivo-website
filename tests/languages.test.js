// PArAsYtE | RideArrivo website
// Every language must carry the flight booking strings and the ArrivoExpress
// strings, keep {placeholders} intact, and Arabic must be flagged right to left.
const test = require("node:test");
const assert = require("node:assert");
const I18N = require("../i18n.js");

const LANGS = ["en", "fr", "zh", "hi", "de", "es", "pt", "ar", "tr"];
const FLIGHT = ["flightHint", "flightDateTitle", "flightDateSub", "surnameTitle", "surnamePlaceholder", "optional", "pnrTitle", "pnrSub", "pnrPlaceholder", "errFlightPnr", "errFlightFormat", "errDateFormat", "errDateReal", "errDatePast", "errDateRequired", "errPnr"];
const tokens = (s) => (String(s).match(/\{[a-zA-Z]+\}/g) || []).sort().join(",");

test("nine languages are registered", () => {
  assert.deepStrictEqual(Object.keys(I18N).filter((k) => LANGS.includes(k)).sort(), [...LANGS].sort());
});

test("every language has every flight booking string", () => {
  for (const l of LANGS) for (const k of FLIGHT) assert.ok(I18N[l].booking[k], `${l}.booking.${k}`);
});

test("every language has every ArrivoExpress string with the same placeholders", () => {
  const en = I18N.en.arrivoExpress;
  for (const l of LANGS) {
    for (const k of Object.keys(en)) {
      if (k === "tiers") continue;
      assert.ok(I18N[l].arrivoExpress[k], `${l}.arrivoExpress.${k}`);
      assert.strictEqual(tokens(I18N[l].arrivoExpress[k]), tokens(en[k]), `${l}.arrivoExpress.${k} placeholders`);
    }
    for (const t of Object.keys(en.tiers)) assert.ok(I18N[l].arrivoExpress.tiers[t].label, `${l} tier ${t}`);
  }
});

test("Arabic and Turkish fall back to English for untranslated screens", () => {
  assert.strictEqual(I18N.ar.track.title, I18N.en.track.title);
  assert.strictEqual(I18N.tr.account.title, I18N.en.account.title);
});

test("the language blurb names the new markets", () => {
  assert.match(I18N.en.lang.body, /Lebanon|Lebanese/);
});
