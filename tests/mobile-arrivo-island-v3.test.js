const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const html = read('index.html');
const css = read('simplified-home.css');
const island = read('arrivo-island.js');
const site = read('script.js');

test('mobile island has five ordered actions and no legacy bottom dock DOM', () => {
  const actions = Array.from(html.matchAll(/data-mobile-island-action="([^"]+)"/g)).map((m) => m[1]);
  assert.deepEqual(actions.slice(0, 5), ['home', 'book', 'services', 'account', 'menu']);
  assert.equal(actions.length, 5);
  assert.doesNotMatch(html, /data-mobile-dock|mobile-command-bar/);
});

test('homepage uses one mobile navigation controller', () => {
  assert.match(site, /data-arrivo-island/);
  assert.match(site, /mobileIslandActions/);
  assert.doesNotMatch(island, /function setDockActive|dockItems|data-mobile-dock/);
  assert.equal((island.match(/islandToggle\.addEventListener\("click"/g) || []).length, 1);
  assert.equal((island.match(/menuToggle\.addEventListener/g) || []).length, 0);
});

test('attached menu is viewport positioned and cannot inherit the legacy right-drawer transform', () => {
  assert.match(html, /<\/header>\s*<nav class="mobile-nav-menu" id="mobileNavMenu"/);
  assert.match(html, /id="mobileNavMenu"[^>]*tabindex="-1"/);
  assert.match(html, /aria-controls="mobileNavMenu"/);
  assert.match(css, /Mobile Arrivo Island v3/);
  assert.match(css, /\.mobile-nav-menu \{[\s\S]*position: fixed !important;/);
  assert.match(css, /left: 12px !important;/);
  assert.match(css, /right: 12px !important;/);
  assert.match(css, /max-width: 360px !important;/);
  assert.match(css, /transform: none !important;/);
  assert.match(css, /arrivoMenuSheetIn/);
});

test('menu state locks background and has escape backdrop and focus management', () => {
  for (const token of ['openMobileMenu', 'closeMobileMenu', 'trapMenuFocus', 'arrivo-menu-open']) {
    assert.ok(island.includes(token), token);
  }
  assert.match(island, /event\.key === "Escape"/);
  assert.match(island, /backdrop\.addEventListener\("click"/);
  assert.match(css, /html\.arrivo-menu-open/);
  assert.match(css, /overscroll-behavior: none/);
});

test('mobile island is fixed safe-area centered and reduced-motion aware without UA sniffing', () => {
  assert.match(html, /viewport-fit=cover/);
  assert.match(css, /position: fixed !important;/);
  assert.match(css, /env\(safe-area-inset-top/);
  assert.match(css, /env\(safe-area-inset-bottom/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(island, /navigator\.userAgent|iPhone|Android/);
});
