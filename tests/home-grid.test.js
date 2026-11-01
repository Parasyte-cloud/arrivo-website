const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const css = fs.readFileSync(path.join(__dirname, "..", "lite-home.css"), "utf8");

// A plain `1fr` track is minmax(auto, 1fr): it cannot shrink below the content's
// minimum width, so on a 320px phone the "Drive with us" block made the whole
// homepage 36px wider than the screen. minmax(0, ...) lets it shrink.
test("homepage drive grid columns can shrink below their content (no sideways scroll on 320px phones)", () => {
  const rules = css.match(/\.lt-drive-grid\{[^}]*grid-template-columns:[^;}]*/g) || [];
  assert.equal(rules.length, 2, "mobile and desktop rule both present");
  for (const rule of rules) {
    const columns = rule.split("grid-template-columns:")[1];
    assert.ok(/minmax\(0,/.test(columns), "uses minmax(0, ...): " + columns);
    assert.ok(!/(^|\s)1fr(\s|$)/.test(columns) && !/\d\.\d+fr\s+1fr/.test(columns), "no bare fr track: " + columns);
  }
});
