# Main-website Google Analytics 4

Measurement ID: `G-CL4Y16M64E` (web stream "RideArrivo Website",
`https://www.ridearrivo.com`).

## Why this exists

Realtime showed zero because the live site contained no Google tag at all. An
earlier `analytics.js` was never committed, only supported a Tag Manager
container id (`GTM-REPLACE_ME`), and the site's Content-Security-Policy would
have blocked Google anyway. This change loads GA4 directly, behind the existing
consent choice, with no Tag Manager container.

## How it behaves

GA4 lives in `marketing-consent.js` next to Meta Pixel and follows exactly the
same gate (`allowed()`):

- the visitor chose **Accept optional cookies**,
- the origin is `https://www.ridearrivo.com` or `https://ridearrivo.com`,
- the page is in `PUBLIC_PAGES`, the URL and referrer pass the safe-parameter
  filter, and no Global Privacy Control signal is present.

Before that, there is no request to Google at all. After it:

1. Consent Mode v2 is set to denied for everything.
2. `https://www.googletagmanager.com/gtag/js?id=G-CL4Y16M64E` is requested.
3. When the script has loaded, consent is read again. If the visitor rejected
   while it was downloading, nothing is configured or sent.
4. Otherwise `analytics_storage` is granted (advertising storage, user data and
   personalisation stay denied), the tag is configured with
   `send_page_view: false`, `allow_google_signals: false`,
   `allow_ad_personalization_signals: false` and a host-only cookie domain, and
   one `page_view` is sent per document.

Withdrawal sets consent back to denied, sets `window['ga-disable-G-CL4Y16M64E']`,
and removes the accessible `_ga` and `_ga_CL4Y16M64E` cookies. As with Meta, the
script cannot be unloaded from a running page, and events already sent are not
recalled.

The single stored choice is now version 2. Version 1 records (made when the
banner covered Meta only) are refused, so every visitor is asked once more.
The stored field is still called `marketing` for compatibility; it means
"optional cookies".

Pages tracked are the same as Meta: `/`, `/index`, `/hello`, `/contact-us`,
`/charter-booking`, `/privacy`, `/terms`. Account, login, booking, driver,
tracking and payment pages are never tracked. New pages must be reviewed and
added to `PUBLIC_PAGES`.

## Headers

`_headers` adds `https://www.googletagmanager.com` to `script-src` and
`https://www.googletagmanager.com`, `https://*.google-analytics.com` and
`https://*.analytics.google.com` to `connect-src`. The wildcards in
`connect-src` follow Google's published guidance because GA4 reports to regional
hosts. `script-src` has no wildcard and `img-src` is unchanged. The ArrivoExpress
build strips all of these, as it does for Meta.

## Google Analytics account settings (checked in the GA admin, not in code)

- Admin > Data collection and modification > **Data retention**: event data
  retention **14 months** (the privacy page says 14 months).
- Admin > Data collection and modification > **Data collection**: leave
  **Google signals** off, and do not turn on advertising features.
- Admin > Data streams > RideArrivo Website > **Enhanced measurement**: leave as
  is, but note outbound click and scroll events will also only exist after consent.
- Admin > Data streams > RideArrivo Website: the stream should list only the
  production domain. Do not install the tag a second time through a tag manager,
  Cloudflare or a plugin: it would bypass consent and double count.

## Live acceptance

Use a clean browser profile, extensions and ad blockers off, and the production
homepage with no query string.

1. Open DevTools > Network before choosing anything. There must be no request to
   `googletagmanager.com` or `google-analytics.com`.
2. Choose **Accept optional cookies**. A `gtag/js?id=G-CL4Y16M64E` request
   appears, followed by one `g/collect` request. GA4 Realtime shows 1 user within
   about a minute.
3. Reload and open another public page: one `collect` per page. Opening the
   preferences panel must not add one.
4. Choose **Reject optional cookies** (via Cookie preferences), reload: no Google
   requests, and `_ga` cookies are gone.
5. Open `/book`, `/login` and `/account` after accepting: no Google requests.
6. Check the browser console for CSP violations. A Cloudflare dashboard header can
   override `_headers`, so inspect the real response.

Realtime only counts visitors who accept. It will always read lower than your
true traffic, so do not compare it with server logs.

## Rollback

Revert the GA4 commit and redeploy. Visitors keep a version 2 record, which
simply stops being read; no data migration is needed.
