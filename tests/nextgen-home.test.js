const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const html = read('index.html');
const css = read('simplified-home.css');
const tokens = read('arrivo-design-tokens.css');
const island = read('arrivo-island.js');
const hero = read('hero-motion.js');
const theme = read('theme.js');
const marketing = read('marketing-consent.js');

test('SEO retains one high-intent H1 and matching Lagos metadata', () => {
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /<h1[^>]*>Airport Transfers, Rides &amp; Chauffeur Services in Lagos<\/h1>/);
  assert.match(html, /<title>Lagos Airport Transfers &amp; Chauffeur Services \| RideArrivo<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/ridearrivo\.com\/">/);
});

test('Arrivo Island is proprietary adaptive navigation, not the old movable header', () => {
  assert.match(html, /data-arrivo-island/);
  assert.match(island, /is-condensed/);
  assert.match(island, /data-island-state|islandState/);
  assert.doesNotMatch(html, /header-move\.js|heroQuoteForm|hero-form\.js/);
  assert.doesNotMatch(island, /navigator\.userAgent|iPhone|Android/);
});

test('mobile mode uses safe areas and a separate command rail', () => {
  assert.match(html, /class="mobile-command-bar"/);
  assert.match(css, /env\(safe-area-inset-top/);
  assert.match(css, /env\(safe-area-inset-bottom/);
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /border-radius: 999px;/);
});



test('footer wordmarks keep bounded intrinsic sizing across responsive modes', () => {
  assert.doesNotMatch(css, /\.site-footer img \{ max-width: 100%; height: auto; \}/);
  assert.match(css, /\.site-footer \.footer-wordmark \{[\s\S]*height: 20px !important;/);
  assert.match(css, /\.site-footer \.footer-parasyte-logo \{[\s\S]*height: 18px !important;/);
  assert.match(css, /\.site-footer \.footer-credit-row \{ flex: 0 0 auto;/);
});

test('mobile pill hardening prevents desktop grid leakage and makes the dock adaptive', () => {
  assert.match(html, /data-mobile-dock/);
  assert.match(html, /data-dock-item="book"/);
  assert.match(css, /Mobile responsive pill hardening 2026-10-29/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) !important;/);
  assert.match(css, /@media \(max-width: 430px\)/);
  assert.match(css, /@media \(max-width: 390px\)/);
  assert.match(css, /@media \(max-width: 360px\)/);
  assert.match(css, /mobile-command-bar\.is-travelling/);
  assert.match(island, /dockIdleTimer/);
  assert.match(island, /setDockActive/);
});

test('hero motion is subtle, lazy for secondary media and reduced-motion aware', () => {
  assert.match(html, /data-hero-motion/);
  assert.match(html, /hero-media-a/);
  assert.match(html, /hero-media-b/);
  assert.match(hero, /8500/);
  assert.match(hero, /new Image\(\)/);
  assert.match(hero, /prefers-reduced-motion: no-preference/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(html, /<video\b/i);
});

test('Arrivo Design Language exposes semantic light and dark tokens', () => {
  for (const name of ['--arrivo-bg','--arrivo-surface','--arrivo-surface-elevated','--arrivo-text','--arrivo-text-muted','--arrivo-border','--arrivo-amber','--arrivo-navy','--arrivo-glass','--arrivo-shadow','--arrivo-radius-island']) {
    assert.ok(tokens.includes(name), name);
  }
  assert.match(tokens, /html\[data-theme="dark"\]/);
  assert.match(tokens, /#050b13/i);
  assert.match(tokens, /#f4a340/i);
});

test('theme supports light dark and explicit system mode while first visit stays light', () => {
  assert.match(html, /var mode = "light", theme = "light"/);
  assert.match(html, /arrivo_theme_mode/);
  assert.match(theme, /\["light", "dark", "system"\]/);
  assert.match(theme, /prefers-color-scheme: dark/);
  assert.match(theme, /searchParams\.delete\("theme"\)/);
  assert.doesNotMatch(theme, /searchParams\.set\("theme"/);
});

test('Ride Move Charter remain the primary decision and all six services remain crawlable', () => {
  for (const id of ['ride-tab','move-tab','charter-tab']) assert.match(html, new RegExp('id="'+id+'"'));
  for (const service of ['RideArrivo','ArrivoExpress','ArrivoChauffeur','ArrivoRemovals','ArrivoBoat','ArrivoAir']) assert.ok(html.includes(service), service);
  assert.match(html, /href="https:\/\/express\.ridearrivo\.com\/"/);
  assert.doesNotMatch(html, /express\.ridearrivo\.com\/\?theme=/);
});

test('consent eligibility includes new public-home anchors', () => {
  for (const anchor of ['choose','business','drive']) assert.match(marketing, new RegExp('"'+anchor+'"'));
});

test('navigation remains a semantic landmark and intent tabs are keyboard navigable', () => {
  assert.match(html, /<nav class="main-nav" aria-label="Primary"/);
  assert.match(html, /role="tablist"/);
  assert.match(read('home-intent.js'), /ArrowRight/);
  assert.match(read('home-intent.js'), /ArrowDown/);
  assert.doesNotMatch(island, /remove\(\)|replaceWith|outerHTML/);
});


test("homepage avoids the full app translation payload and precaches its focused shell", () => {
  const sw = read("sw.js");
  assert.match(html, /home-i18n-base\.js/);
  assert.doesNotMatch(html, /<script src="i18n\.js/);
  for (const asset of ["arrivo-design-tokens.css", "simplified-home.css", "home-i18n-base.js", "simple-i18n.js", "theme.js", "home-intent.js", "arrivo-island.js", "hero-motion.js"]) {
    assert.match(sw, new RegExp('"/' + asset.replace(/\./g, '\\.') + '"'));
  }
});
