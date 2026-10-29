const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function text(f){ return fs.readFileSync(require('node:path').join(__dirname,'..',f),'utf8'); }

test('ArrivoExpress website uses canonical Arrivo Everywhere booking facade only', () => {
  const js = text('express.js');
  for (const path of ['/api/booking/start','/quote','/checkout','/request','/feedback','/settlement','/api/deeplink/exchange','/api/social/exchange']) assert.match(js, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.doesNotMatch(js, /\/api\/instant-rides/);
  assert.doesNotMatch(js, /\/api\/wallet/);
  assert.doesNotMatch(js, /PaystackPop|PAYSTACK_PUBLIC_KEY/);
  assert.doesNotMatch(js, /1400|245\s*\/\s*km|40\s*\/\s*min/);
});

test('ArrivoExpress page has no rider Paystack or wallet checkout and states direct driver settlement', () => {
  const html = text('express.html');
  assert.doesNotMatch(html, /js\.paystack\.co|paystack-config\.js/);
  assert.doesNotMatch(html, /fare is held in your wallet|ArrivoExpress pays from your RideArrivo Wallet/i);
  assert.match(html, /Pay your assigned driver directly after completion/i);
  assert.match(html, /Ride Start PIN/);
  assert.match(html, /Optional tip/);
  assert.match(html, /Driver finishing a nearby trip/);
});

test('service isolation preserves Paystack and wallet for non-Express RideArrivo products', () => {
  const booking = text('booking.js');
  const book = text('book.html');
  assert.match(booking, /PaystackPop|paymentMethod|walletBalanceNaira/);
  assert.match(book, /Paystack|wallet/i);
  const expressBuild = text('scripts/build-express.js');
  assert.doesNotMatch(expressBuild, /"paystack-config\.js"/);
});

test('Cloudflare preview fails closed without an explicit staging Arrivo Everywhere origin', () => {
  const build = text('scripts/build-site.js');
  assert.match(build, /ARRIVO_EVERYWHERE_ORIGIN/);
  assert.match(build, /IS_NON_PROD_CF/);
  assert.match(build, /refusing to point preview traffic at production/);
  const headers = text('_headers');
  assert.match(headers, /https:\/\/staging-express\.ridearrivo\.com/);
  assert.match(headers, /https:\/\/express\.ridearrivo\.com/);
  assert.doesNotMatch(headers, /connect-src[^\n]*\s\*\s/);
});

test('main website keeps ArrivoExpress presentation route instead of redirecting away', () => {
  const redirects = text('_redirects');
  assert.doesNotMatch(redirects, /^\/express\s+\/express\.html/m);
  assert.doesNotMatch(redirects, /^\/express\.html\s/m);
  assert.doesNotMatch(redirects, /\/express(?:\.html)?\s+https:\/\/express\.ridearrivo\.com/);
});

test('continuation state stays opaque and short-lived in browser storage', () => {
  const js = text('express.js');
  assert.match(js, /#?link/);
  assert.match(js, /sessionStorage/);
  assert.match(js, /PENDING_LINK_KEY/);
  assert.doesNotMatch(js, /localStorage[^\n]*(journeyToken|deepLink)/i);
});
