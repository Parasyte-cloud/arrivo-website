const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'simplified-home.css'), 'utf8');
const theme = fs.readFileSync(path.join(root, 'theme.js'), 'utf8');

function count(re) { return (html.match(re) || []).length; }

test('homepage has one SEO-focused H1 and matching title metadata', () => {
  assert.equal(count(/<h1\b/g), 1);
  assert.match(html, /<h1[^>]*>Airport Transfers, Rides &amp; Chauffeur Services in Lagos<\/h1>/);
  assert.match(html, /<title>Lagos Airport Transfers &amp; Chauffeur Services \| RideArrivo<\/title>/);
  assert.match(html, /name="description" content="Book airport transfers, scheduled rides and chauffeur services in Lagos/);
});

test('primary decision is compressed to Ride Move Charter', () => {
  assert.equal(count(/class="intent-tab"/g), 3);
  assert.match(html, /id="ride-tab"/);
  assert.match(html, /id="move-tab"/);
  assert.match(html, /id="charter-tab"/);
  assert.match(html, /id="ride-panel"/);
  assert.match(html, /id="move-panel"/);
  assert.match(html, /id="charter-panel"/);
  assert.doesNotMatch(html, /book\.html\?intent=/);
});

test('old complex hero booking UI and movable header are not loaded', () => {
  assert.doesNotMatch(html, /id="heroQuoteForm"/);
  assert.doesNotMatch(html, /hero-form\.js/);
  assert.doesNotMatch(html, /hero-slides\.js/);
  assert.doesNotMatch(html, /header-move\.js/);
  assert.doesNotMatch(html, /maps-config\.js/);
});

test('first-time theme is light and explicit Light Dark System choices are supported', () => {
  const firstPaint = html.match(/<meta name="theme-color"[\s\S]*?<\/script>/)?.[0] || '';
  assert.match(firstPaint, /var mode = "light", theme = "light"/);
  assert.match(firstPaint, /arrivo_theme_mode/);
  assert.match(theme, /\["light", "dark", "system"\]/);
  assert.match(theme, /prefers-color-scheme: dark/);
  assert.match(theme, /localStorage\.setItem\(MODE_KEY, value\)/);
});

test('responsive CSS uses deliberate desktop tablet and mobile navigation modes', () => {
  assert.match(css, /@media \(min-width: 1100px\)/);
  assert.match(css, /@media \(min-width: 768px\) and \(max-width: 1099px\)/);
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /env\(safe-area-inset-top/);
  assert.match(css, /env\(safe-area-inset-bottom/);
  assert.match(css, /position: sticky !important/);
  assert.match(css, /\.site-header\.is-floating/);
  assert.match(css, /\.mobile-command-bar\s*\{/);
});

test('all six service brands remain discoverable for users and search engines', () => {
  for (const name of ['RideArrivo', 'ArrivoExpress', 'ArrivoChauffeur', 'ArrivoRemovals', 'ArrivoBoat', 'ArrivoAir']) {
    assert.match(html, new RegExp(name));
  }
});
