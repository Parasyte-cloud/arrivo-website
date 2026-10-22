const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const consent = fs.readFileSync(
  path.join(root, "marketing-consent.js"),
  "utf8"
);
const headers = fs.readFileSync(path.join(root, "_headers"), "utf8");

const allHtml = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "dist" || entry.name === ".launch-backup") {
      continue;
    }

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith(".html")) allHtml.push(full);
  }
}
walk(root);

test("GTM container is owned by the consent controller, not hard-coded into HTML", () => {
  assert.equal(
    (consent.match(/GTM-WZ6Q7LPT/g) || []).length,
    1
  );

  for (const file of allHtml) {
    const html = fs.readFileSync(file, "utf8");
    assert.equal(
      html.includes("GTM-WZ6Q7LPT"),
      false,
      `direct GTM installation found in ${path.relative(root, file)}`
    );
  }
});

test("Google Tag Manager is loaded dynamically only from the consent controller", () => {
  assert.match(
    consent,
    /function startGoogle\(\)/
  );

  assert.match(
    consent,
    /if \(!allowed\(\)\) return;/
  );

  assert.match(
    consent,
    /www\.googletagmanager\.com\/gtm\.js/
  );

  assert.match(
    consent,
    /ridearrivo_marketing_consent_granted/
  );
});

test("Google Consent Mode v2 states are represented", () => {
  for (const setting of [
    "ad_storage",
    "analytics_storage",
    "ad_user_data",
    "ad_personalization",
  ]) {
    assert.match(consent, new RegExp(setting));
  }

  assert.match(consent, /googleConsent\("default", false\)/);
  assert.match(consent, /googleConsent\("update", true\)/);
  assert.match(consent, /googleConsent\("update", false\)/);
});

test("GTM and Analytics endpoints are explicitly permitted by CSP", () => {
  assert.match(headers, /https:\/\/www\.googletagmanager\.com/);
  assert.match(headers, /https:\/\/www\.google-analytics\.com/);
  assert.match(headers, /https:\/\/region1\.google-analytics\.com/);
});

test("privacy policy discloses main-site Google marketing measurement", () => {
  const privacy = fs.readFileSync(path.join(root, "privacy.html"), "utf8");

  assert.match(
    privacy,
    /Google Tag Manager, Google Analytics and Google advertising tools/
  );

  assert.match(
    privacy,
    /Meta Pixel and the main-site Google Tag Manager marketing container stay off until/
  );
});
