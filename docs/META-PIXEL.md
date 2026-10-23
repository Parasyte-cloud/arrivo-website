# Main-website Meta Pixel

Pixel: `956256323771727`.

Prepared from the uploaded Git archive of `Parasyte-cloud/arrivo-website`, commit
`145a2d577f3dbbd464ccdfc5c2736e89ff26ff05`, on 15 October 2026.
This source change is not proof of a deployment or of delivery to Meta.

## Scope and behavior

Every main-site HTML document loads the same local `marketing-consent.js` and
`marketing-consent.css`. The local module is not itself a Meta tracking request.
The remote SDK is loaded only when the visitor grants marketing consent, the
origin is exactly `https://www.ridearrivo.com` or `https://ridearrivo.com`, and the
page is approved below. There is no noscript tracking image, preconnect to Meta,
Google Tag Manager container, Conversions API integration or secret credential.
Google Analytics 4 now shares this same consent choice and gate: see
`docs/GA4-ANALYTICS.md`. The banner offers one choice (**Accept optional cookies**)
that covers both services.

| Approved public pages | Explicitly excluded |
| --- | --- |
| Home (`/`, `/index`, `/index.html`) | Account, login, signup, password recovery, email verification |
| Contact (`/contact-us`, `/contact-us.html`) | Authenticated booking (`/book`), Express and driver flows |
| Charter enquiry (`/charter-booking`, `/charter-booking.html`) | Live trip tracking, QR tracking and payment callbacks |
| Survey/arrival landing (`/hello`, `/hello.html`) | Unknown/new page paths and error pages |
| Privacy and terms, when top-level | Embedded policy iframes |

Trailing-slash variants are supported. New public pages must be reviewed and
added to `PUBLIC_PAGES`; the default for an unreviewed route is no tracking.
The standalone Express build strips the local consent assets and the new Meta
CSP origins. No other subdomain or app is enabled by this patch.

One `PageView` is sent per eligible document, after consent. There are no Purchase,
Lead, registration, checkout or form-submission events. Reopening the preferences
or accidentally loading the module twice does not send another PageView.
Automatic configuration is disabled before initialization. No identity fields or
form answers are passed as advanced matching or event parameters.

Only known marketing/UI query parameters and reviewed section anchors are
accepted. Unknown parameters, token-like fragments, email-like parameter values
and sensitive main-site referrers suppress tracking for that visit. URLs are not
rewritten. Never place personal information in UTM/campaign parameter values.
This conservative filter intentionally trades some attribution coverage for
privacy. Meta still receives normal browser/IP/URL information after consent.

## Consent and accessibility

Accept and reject have equal prominence. Choices are available in English,
French, Chinese, Hindi, German, Spanish and Portuguese. The banner is non-modal,
does not steal focus on arrival, uses real buttons and a labelled region, and
provides keyboard focus indication and a screen-reader confirmation. Cookie
preferences are available at the foot of every top-level page, including private
pages where no marketing banner is automatically displayed.

A versioned record in `arrivo_marketing_consent_v1` contains a boolean and a
timestamp, valid for 180 days. Origins have separate choices. Malformed, expired
and future-dated records are refused. Storage failure leaves consent valid for
the current document only. A Global Privacy Control signal overrides consent.

Withdrawal calls `fbq('consent', 'revoke')` and removes accessible `_fbp`/`_fbc`
cookies for the host and parent RideArrivo domain. It does not reload the page,
clear authentication, undo events already sent, or remove cookies on Meta's own
domains. The SDK cannot be unloaded from a running JavaScript document; it is
instructed to stop through its consent API. It is not loaded on the next denied
visit. Storage events, expiry, returning from the back-forward cache and tab
visibility are handled. A revoke during download cannot flush a queued PageView.

## Files and deployment

- `marketing-consent.js` / `.css`: shared implementation and isolated UI styles.
- All 19 HTML documents: one local script and stylesheet reference in each head.
- `_headers`: narrow Meta script/connect/frame permissions; previous protections
  are retained. Existing broad `img-src https:` is not expanded by this change.
- `sw.js`: new cache version and precached local consent assets. Cross-origin
  requests, including Meta requests, are not cached by this worker.
- `privacy.html`: advertising, consent, sharing and retention disclosures updated;
  contradictory no-cookie/no-advertising claims removed.
- `scripts/build-express.js`: keeps the separate Express deployment pixel-free and
  links its shared privacy page to main-site preferences.
- `tests/meta-pixel.test.js` / `tests/browser_meta_pixel.py`: regression coverage.

Use the repository's allowlisted production build, not the complete source tree:

```sh
node --test tests/*.test.js
node scripts/build-site.js
node scripts/build-express.js
```

For the main Cloudflare Pages project, the intended build command is
`node scripts/build-site.js` and the output directory is `dist/site`.
Keep the Express project on `node scripts/build-express.js` / `dist/express`.
These are instructions, not a claim that the dashboard configuration was changed.

## Meta account checks before live acceptance

In the pixel/dataset settings, confirm the ID, ownership, ad-account association
and allowed traffic domains for the main site. Keep **Automatic advanced matching**
and **Track events automatically without code** off for this PageView-only rollout;
remove any earlier Event Setup Tool rules that collect fields or add events.
Settings labels may vary. No Meta account setting was read or changed in this task.
Do not add the original pixel snippet again through a tag manager or Cloudflare
injection: it would bypass these consent rules and can duplicate events.

The privacy-policy owner should review the updated disclosure, vendor terms,
international-transfer assessment and marketing use before publishing. This patch
implements technical controls; it is not a legal-compliance certification.

## Live acceptance after deployment

Use a clean browser profile with extensions/ad blockers disabled for the test.
Do not test delivery on a Pages preview domain: production events are deliberately
disabled there. Use the root homepage with no sensitive query string or referrer.

1. In DevTools Network, load the production homepage before making a choice.
   There must be no request to `connect.facebook.net` or `www.facebook.com/tr`.
2. Reject marketing, reload, and navigate between public pages. Meta must stay off.
3. Open Cookie preferences and accept. The SDK should load and the pixel should
   initialize once. Use Meta Events Manager's test-events facility and Pixel
   Helper to check that this pixel receives one `PageView` for the visit.
4. Open another public page and verify one PageView for that document. Opening
   preferences or changing a section anchor must not duplicate the event.
5. Revoke consent, then reload and visit another public page. No new Meta requests
   should be made. Repeat withdrawal in a second tab and check the original tab.
6. Check account, login, booking, trip tracking and payment pages after previously
   accepting. No Meta SDK is loaded on those documents. Also test a public URL with
   a dummy `?token=TEST_ONLY` parameter; do not use a real token.
7. Confirm there are no Meta CSP violations after acceptance. A Cloudflare
   dashboard/Worker header may override `_headers`; inspect the actual response.
8. Check the banner and footer preference button on desktop and mobile, including
   a returning installed-PWA visit. Consent rejection must not break booking.

If nothing arrives, check consent, GPC, extensions, exact hostname, URL/referrer
filters, deployment output, CSP and Meta's traffic permissions. The absence of
an SDK on an excluded page, preview domain or rejected visit is intentional.

## Verification evidence and limits

27 Node tests passed, including all 4 original redirect tests. The browser
sandbox suite passed 64 cases using the real Chromium DOM/events and a local
SDK fixture. Its storage, location and SDK transport are simulated; these are
NOT network end-to-end or Meta-delivery tests. An additional 21 language/width
combinations showed no horizontal consent overflow; light/dark renders were
inspected. Both production builds and JavaScript syntax checks passed.

The main-site build retains a pre-existing warning from its naive HTML reference
scanner: `account.html -> ' + MEMBERSHIP_URL + '`. It is also present in the
unmodified upload and was not changed by this patch. The build exits successfully.

Network browser navigation is blocked by the execution environment's managed
Chromium policy. The original `e2e_dev.py`, `e2e_payment_recovery.py`,
`e2e_session_checkout.py` and `e2e_typed_address.py` suites could not be completed
here. Run them in the normal project environment before merging if required by
your release process. No booking/payment result is inferred from the consent tests.
No live site, Meta account, ad configuration or production event was modified or
verified. Meta's documentation could not be fetched here (access/rate-limit
errors), so the live SDK/account checks above remain an explicit release gate.

## Rollback

After release, revert the dedicated pixel commit and redeploy the main-site
build. The current service worker uses network-first HTML/JS/CSS, but verify a
returning browser/PWA after rollback. Do not clear customers' auth storage or
reset unrelated commits. No backend migration needs reversing.
