const fs = require('fs');
const assert = require('assert');
const r = (f) => fs.readFileSync(f, 'utf8');
const pages = fs.readdirSync('.').filter((f) => f.endsWith('.html') && f !== 'hello.html');

for (const f of pages) {
  const h = r(f);
  assert(h.includes('data-ra-pill'), f + ' has the pill');
  assert(h.includes('arrivo-ui.css'), f + ' loads arrivo-ui.css');
  assert(h.includes('arrivo-pill.js'), f + ' loads arrivo-pill.js');
  assert(!h.includes('header-move.js'), f + ' no retired header script');
}
const home = r('index.html');
assert(!/id="(how|safety|services)"/.test(home), 'home stays simple');
for (const id of ['choose', 'business', 'drive']) assert(home.includes('id="' + id + '"'), 'home has #' + id);
assert(home.includes('parasyte-sig'), 'home carries the PArAsYtE signature');

const ui = r('arrivo-ui.css');
assert(ui.includes('.ra-pill__here'), 'current page circle styled');
assert(/\.ra-pill__word/.test(ui) && !/\.ra-pill__word\s*\{[^}]*display:\s*none/.test(ui.split('wm-on-dark')[0]), 'wordmark stays');
const pill = r('arrivo-pill.js');
for (const l of ['en', 'fr', 'zh', 'hi', 'de', 'es', 'pt', 'ar', 'tr']) assert(new RegExp('\\b' + l + '\\s*:').test(pill), 'pill has ' + l);

const theme = r('theme.js');
assert(!/system/.test(theme.split('nextMode')[1] || ''), 'theme toggles light and dark only');

for (const f of ['arrivo-ui.css', 'arrivo-pill.js', 'arrivo-home.css', 'arrivo-home-i18n.js', 'index.html']) assert(!r(f).includes('—'), f + ' has no em dash');
console.log('pill redesign ok');
