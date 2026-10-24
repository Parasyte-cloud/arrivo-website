# Main-website Google Analytics 4 through Google Tag Manager

Tag Manager container: `GTM-WZ6Q7LPT`. GA4 measurement ID: `G-CL4Y16M64E`
(web stream "RideArrivo Website", `https://www.ridearrivo.com`).

## Why this exists

Realtime showed zero because the live site had no Google tag at all, and the
Content-Security-Policy would have blocked Google anyway. This change loads the
Tag Manager container from `marketing-consent.js`, only after the visitor
accepts optional cookies.

**Never paste the standard Tag Manager snippet or its `<noscript>` iframe into
an HTML page.** The snippet loads Google on every page before any choice, which
breaks the consent rules and the privacy policy, and the noscript iframe does
the same. A test fails if any page contains it. A visitor with JavaScript off
cannot accept the banner, so they are not tracked.

## How it behaves

Tag Manager sits in `marketing-consent.js` next to Meta Pixel and follows exactly
the same gate (`allowed()`):

- the visitor chose **Accept optional cookies**,
- the origin is `https://www.ridearrivo.com` or `https://ridearrivo.com`,
- the page is in `PUBLIC_PAGES`, the URL and referrer pass the safe-parameter
  filter, and no Global Privacy Control signal is present.

Before that there is no request to Google at all. After it:

1. Consent Mode v2 is set to denied for everything.
2. `https://www.googletagmanager.com/gtm.js?id=GTM-WZ6Q7LPT` is requested.
3. When the script has loaded, consent is read again. If the visitor rejected
   while it was downloading, the container is never started and nothing fires.
4. Otherwise all four signals are granted together (`analytics_storage`,
   `ad_storage`, `ad_user_data`, `ad_personalization`) and the container is
   started once with the
   `gtm.js` event. The Google tag inside the container then sends the one
   `page_view`. This file sends no events and configures no tag itself.

Withdrawal sets consent back to denied, sets `window['ga-disable-G-CL4Y16M64E']`,
and removes the accessible `_ga`, `_ga_CL4Y16M64E`, `_gcl_au`, `_gcl_aw`,
`_gcl_dc`, `_gcl_gb` and `_ttp` cookies (plus Meta's `_fbp` and `_fbc`). As with Meta, the
script cannot be unloaded from a running page, and events already sent are not
recalled.

The single stored choice is version 3. Version 1 (Meta only) and version 2
(analytics only) records are refused, so every visitor is asked once more. The stored
field is still called `marketing`; it means "optional cookies".

Pages tracked are the same as Meta: `/`, `/index`, `/hello`, `/contact-us`,
`/charter-booking`, `/privacy`, `/terms`. Account, login, booking, driver,
tracking and payment pages never load Google. New pages must be reviewed and
added to `PUBLIC_PAGES`.

## Set up the container (in tagmanager.google.com, not in code)

The site will keep showing zero until the container has a **published** Google
tag. Tags created in a workspace do nothing until you submit and publish.

1. Tags > New > **Google tag**. Tag ID: `G-CL4Y16M64E`.
2. Trigger: **Initialization - All Pages**.
3. Under *Configuration settings* add these parameters:
   - `allow_google_signals` = `false`
   - `allow_ad_personalization_signals` = `false`
   - `cookie_domain` = `{{Page Hostname}}` (host-only cookie, not shared with
     the forms subdomains, which have their own consent choice)
   - `cookie_flags` = `SameSite=Lax;Secure`
4. Under *Advanced settings > Consent settings*, choose **Require additional
   consent for tag to fire** and add `analytics_storage`.
5. Leave "Send a page view event when this configuration loads" on. That is the
   one page_view per visit.
6. **Submit** and **Publish** the version. Then check Admin > Container
   settings shows the new version live.

Advertising tags (Google Ads remarketing, TikTok) may be added to this container
because one "optional cookies" choice now grants analytics and advertising
consent. For every tag:
- Open Advanced Settings > Consent Settings and require the signals it needs:
  GA4 needs `analytics_storage`; advertising and remarketing tags need
  `ad_storage` and `ad_user_data` (add `ad_personalization` for remarketing).
- Add the origins the tag loads to the `_headers` Content-Security-Policy and
  to `scripts/build-express.js` (which strips them again on Express). Check GTM
  Preview and the browser console for CSP violations after consent.
- Test in GTM Preview with consent rejected (the tag must not fire) and then
  accepted.
Heatmaps and chat widgets still need a consent review. Do not install Meta
through the container: Meta Pixel is already loaded directly by
`marketing-consent.js`, so a Facebook tag in GTM would count every event twice.
Do not add a direct `gtag.js` tag either: it would double count or bypass the
controls. A test fails if
`gtag/js` appears in `marketing-consent.js`.

Tag Assistant preview mode is blocked by the site's Content-Security-Policy, so
test with GA4 Realtime (below) instead.

## Headers

`_headers` allows `https://www.googletagmanager.com` in `script-src`, and
`https://www.googletagmanager.com`, `https://*.google-analytics.com` and
`https://*.analytics.google.com` in `connect-src`. The wildcards in `connect-src`
follow Google's published guidance because GA4 reports to regional hosts.
`script-src` has no wildcard and `img-src` is unchanged. The ArrivoExpress build
strips all of these, as it does for Meta.

## Google Analytics account settings (in the GA admin, not in code)

- Admin > Data collection and modification > **Data retention**: event data
  retention **14 months** (the privacy page says 14 months).
- Admin > Data collection and modification > **Data collection**: turn
  **Google signals** on only if Google Ads remarketing is used. The privacy page
  describes advertising tags run through Tag Manager.
- Admin > Data streams > RideArrivo Website: the stream should list only the
  production domain.

## Live acceptance

Use a clean browser profile, extensions and ad blockers off, and the production
homepage with no query string.

1. Open DevTools > Network before choosing anything. There must be no request to
   `googletagmanager.com` or `google-analytics.com`.
2. Choose **Accept optional cookies**. A `gtm.js?id=GTM-WZ6Q7LPT` request appears,
   then `gtag/js?id=G-CL4Y16M64E` (loaded by your Google tag), then one `collect`
   request. GA4 Realtime shows 1 user within about a minute.
3. If `gtm.js` loads but there is no `collect`, the container has no published
   Google tag, or the tag's consent setting is not satisfied: recheck the
   container steps above.
4. Reload and open another public page: one `collect` per page. Opening the
   preferences panel must not add one.
5. Choose **Reject optional cookies** (via Cookie preferences), reload: no Google
   requests, and `_ga` cookies are gone.
6. Open `/book`, `/login` and `/account` after accepting: no Google requests.
7. Check the browser console for CSP violations. A Cloudflare dashboard header can
   override `_headers`, so inspect the real response.

Realtime only counts visitors who accept. It will always read lower than your
true traffic, so do not compare it with server logs.

## Rollback

Revert the commit and redeploy. Visitors keep a version 2 record, which simply
stops being read; no data migration is needed. To stop collection immediately
without a deploy, unpublish the Google tag in Tag Manager.
