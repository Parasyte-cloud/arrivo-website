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
for (const h of ['express.ridearrivo.com', 'removals.ridearrivo.com', 'boat.ridearrivo.com', 'air.ridearrivo.com']) assert(pj.includes(h), 'switcher lists ' + h);
assert(pj.includes('"theme"') && pj.includes('"lang"'), 'theme and lang are carried');
assert(/ridearrivo\\\.com\$/.test(pj), 'carry is limited to ridearrivo.com hosts');
console.log('tier switcher ok');

// Ride now and Schedule open the ArrivoExpress app straight on the right switch.
assert(home.includes('href="https://express.ridearrivo.com/express?mode=now" data-express-mode="now"'), 'Ride now opens Express on now');
assert(home.includes('href="https://express.ridearrivo.com/express?mode=schedule" data-express-mode="schedule"'), 'Schedule opens Express on schedule');
assert(pj.includes('"https://express.ridearrivo.com/express" : "https://staging-express.ridearrivo.com/express"'), 'production on ridearrivo.com, staging on previews');
assert(!/flightDateInput\.value = lagosTodayString/.test(r('booking.js')), 'flight date is never pre-filled');
for (const k of ['removals', 'boat', 'air']) assert(pj.includes('https://' + k + '.ridearrivo.com/", status: "live"'), k + ' is live now that its domain answers');
assert(pj.includes('(express|removals|move|boat|air|chauffeur|campus)'), 'the switcher recognises the removals tier host');
assert(pj.includes('https://campus.ridearrivo.com/", status: "live"'), 'campus is listed as live now that its host answers');
console.log('express entry ok');

// Audit 1 Nov: the signature sits alone and centred at the base, and a service that is "soon" is never a link.
for (const f of ['book.html', 'express.html', 'privacy.html', 'terms.html']) {
  assert(!r(f).includes('footer-credit-label'), f + ' has no "Powered by" label beside the signature');
}
assert(/\.footer-credit-row\s*\{[^}]*justify-content:\s*center[^}]*width:\s*100%/s.test(r('styles.css')), 'footer credit row is centred full width');
const pillJs = r('arrivo-pill.js');
assert(pillJs.includes('class="ra-pill__tier is-soon" aria-disabled="true"'), 'soon tiers in the switcher are not links');
assert(pillJs.includes('function holdSoon'), 'links to soon hosts are held back site wide');
assert(/for="fFullDayCountInput"/.test(r('book.html')), 'number of days input has a label');

// ArrivoCampus must be reachable from the home chooser on desktop, not only in the mobile menu.
assert(/<a class="rh-opt" href="https:\/\/campus\.ridearrivo\.com\//.test(home), 'home chooser has the ArrivoCampus card');
