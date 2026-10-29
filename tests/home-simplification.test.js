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

test('first-time theme is light and explicit choice remains supported', () => {
  const firstPaint = html.match(/<script>\s*\/\/ Theme first paint:[\s\S]*?<\/script>/)?.[0] || '';
  assert.match(firstPaint, /var t = "light"/);
  assert.doesNotMatch(firstPaint, /prefers-color-scheme/);
  assert.doesNotMatch(theme, /prefers-color-scheme/);
  assert.match(theme, /localStorage\.setItem\(KEY, theme\)/);
});

test('responsive CSS hardens tablet and narrow phone header states', () => {
  assert.match(css, /@media \(max-width: 1099px\)/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /@media \(max-width: 420px\)/);
  assert.match(css, /position: sticky !important/);
  assert.match(css, /\.site-header\.is-floating/);
  assert.match(css, /\.mobile-nav-menu\s*\{/);
});

test('all six service brands remain discoverable for users and search engines', () => {
  for (const name of ['RideArrivo', 'ArrivoExpress', 'ArrivoChauffeur', 'ArrivoRemovals', 'ArrivoBoat', 'ArrivoAir']) {
    assert.match(html, new RegExp(name));
  }
});


test('service URLs stay clean and consent remains eligible on new anchors', () => {
  const marketing = fs.readFileSync(path.join(root, 'marketing-consent.js'), 'utf8');
  assert.doesNotMatch(theme, /searchParams\.set\("theme"/);
  assert.match(theme, /searchParams\.delete\("theme"/);
  assert.match(html, /href="https:\/\/express\.ridearrivo\.com\/"/);
  for (const anchor of ['choose', 'business', 'drive']) {
    assert.match(marketing, new RegExp('\"' + anchor + '\"'));
  }
});
