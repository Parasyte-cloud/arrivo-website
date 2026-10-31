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

// Arabic is right to left. A negative physical offset (left: -999px) opens a scrollable strip on the
// left in an rtl page, which showed up as a 1000px blank area and a sideways scroll. Use logical offsets.
const fs = require("node:fs");
const path = require("node:path");
test("no stylesheet hides things with a large negative physical offset", () => {
  for (const f of fs.readdirSync(path.join(__dirname, "..")).filter((n) => n.endsWith(".css"))) {
    const css = fs.readFileSync(path.join(__dirname, "..", f), "utf8");
    assert.ok(!/(^|[^-a-z])left:\s*-\d{3,}px/.test(css), `${f} has left: -NNNpx`);
  }
});

test("Arabic marks each translated element for its own direction", () => {
  for (const f of ["script.js", "booking.js", "express.js", "i18n-apply.js"]) {
    const js = fs.readFileSync(path.join(__dirname, "..", f), "utf8");
    assert.match(js, /lang === "ar"\) el\.setAttribute\("dir", "auto"\)/, f);
  }
});

// Arabic and Turkish: every English string must be translated (or be a known identical term),
// and placeholders and markup must survive translation.
{
  const test = require("node:test");
  const assert = require("node:assert/strict");
  const fs = require("node:fs");
  const m = {};
  new Function("module", "window", "self", fs.readFileSync(require("node:path").join(__dirname, "..", "i18n.js"), "utf8") + ";module.exports=I18N")(m, global, global);
  const I = m.exports;
  const flat = (o, p = "", out = {}) => { for (const k in o) { const v = o[k]; if (v && typeof v === "object" && !Array.isArray(v)) flat(v, p + k + ".", out); else out[p + k] = v; } return out; };
  const en = flat(I.en);
  const SAME = new Set(["brand", "download.placeholder", "account.profileUserEmailPlaceholder", "arrivoExpress.tiers.xl.label", "nav.blog", "nav.express", "nav.removals", "nav.chauffeur", "booking.vehicleSuv", "account.planPremium", "account.planExecutive", "arrivoExpress.title", "arrivoExpress.tiers.premium.label", "arrivoExpress.distanceKm"]);
  const tokens = (s) => String(s).match(/\{\w+\}|<[^>]+>/g)?.sort().join("|") || "";
  for (const lang of ["ar", "tr"]) {
    test(`${lang}: every string is translated and keeps its placeholders`, () => {
      const f = flat(I[lang]);
      const untranslated = Object.keys(en).filter((k) => typeof en[k] === "string" && f[k] === en[k] && !SAME.has(k));
      assert.deepEqual(untranslated, [], `still English in ${lang}: ${untranslated.slice(0, 10).join(", ")}`);
      const broken = Object.keys(en).filter((k) => typeof en[k] === "string" && !k.startsWith("track.rateRelax") && !k.startsWith("track.keepSame") && tokens(f[k]) !== tokens(en[k]));
      assert.deepEqual(broken, [], `placeholder or markup changed in ${lang}: ${broken.slice(0, 10).join(", ")}`);
      assert.ok(!Object.values(f).some((v) => typeof v === "string" && v.includes("—")), "no em dash");
    });
  }
}
