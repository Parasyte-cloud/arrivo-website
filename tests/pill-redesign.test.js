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

// Tier switcher: every service reachable from the pill, theme and language carried across hosts.
const pj = r('arrivo-pill.js');
for (const h of ['express.ridearrivo.com', 'move.ridearrivo.com', 'boat.ridearrivo.com', 'air.ridearrivo.com']) assert(pj.includes(h), 'switcher lists ' + h);
assert(pj.includes('"theme"') && pj.includes('"lang"'), 'theme and lang are carried');
assert(/ridearrivo\\\.com\$/.test(pj), 'carry is limited to ridearrivo.com hosts');
console.log('tier switcher ok');

// Ride now and Schedule open the ArrivoExpress app straight on the right switch.
assert(home.includes('href="https://express.ridearrivo.com/express?mode=now" data-express-mode="now"'), 'Ride now opens Express on now');
assert(home.includes('href="https://express.ridearrivo.com/express?mode=schedule" data-express-mode="schedule"'), 'Schedule opens Express on schedule');
assert(pj.includes('"https://express.ridearrivo.com/express" : "https://staging-express.ridearrivo.com/express"'), 'production on ridearrivo.com, staging on previews');
assert(!/flightDateInput\.value = lagosTodayString/.test(r('booking.js')), 'flight date is never pre-filled');
for (const k of ['move', 'boat', 'air']) assert(pj.includes('https://' + k + '.ridearrivo.com/", status: "soon"'), k + ' stays soon until its domain is live');
console.log('express entry ok');
