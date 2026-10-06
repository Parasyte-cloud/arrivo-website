# ArrivoExpress: standalone launch on express.ridearrivo.com

Audit results, what changed, and the exact steps to go live. Follow the steps in order; each one is safe to do before the next.

## 1. What shipped in this change

**Front end (this repo)**

| Area | Before | Now |
|---|---|---|
| Edited address | Typing over a picked suggestion kept the OLD coordinates, so the quote and charge could be for a different place than the text shown | Any manual edit clears the coordinates and the pin; the rider must pick a suggestion again |
| Expired login mid-flow | Only handled at page load; a 401 later left a spinner or a vague error | One handler for every call: clears the token, redirects to login with `next=` |
| Fare moved between quote and confirm | Rider could be charged a different fare than the one shown | Client sends `expectedFareNaira`; on `FARE_CHANGED` the new fare is shown and re-confirmation is required (needs the backend patch, harmless without it) |
| Maps down or key rejected | Copy said "you can still type an address", which cannot work because a quote needs coordinates | Honest message in 7 languages; `gm_authFailure` also triggers it |
| Directions API not enabled | No route line at all | Dashed straight line between the pins, both in view |
| No current-location option | Rider had to type the pickup | "Use my current location" via the backend reverse-geocode endpoint |
| `window.alert()` for timeout, expiry, cancel failure | Blocking browser dialogs | Inline, screen-reader-announced messages |
| Poll failure counter | Not reset on a new search | Reset on every new search |
| `localStorage` access | Throws in some private modes and killed init | Safe wrapper everywhere |
| Hardcoded English | Services label, cross-sell strip | Translated in en, fr, zh, hi, de, es, pt |
| Accessibility | Silent step changes, unlabeled map | Focus moves to the new step heading, `role="alert"` on errors, `aria-live` on status, map labelled, focus ring on tier cards, reduced-motion spinner |
| Hardcoded URLs | API and page paths baked into `express.js` | Read from `express-config.js` (same defaults on the main site) |

**Backend (separate repo): `docs/backend-patches/express-backend-hardening.patch`**

Apply it in the Arrivo backend repo (`git apply --check` first). It touches `server.js` and `routes/instantRides.js` only and is additive.

1. CORS: adds `https://express.ridearrivo.com`, plus an optional `EXTRA_ALLOWED_ORIGINS` env var (comma-separated exact origins, for Pages preview URLs).
2. Per-rider rate limits: `/quote` 40 per 10 min, create 15 per 10 min (env: `INSTANT_QUOTE_RATE_LIMIT`, `INSTANT_CREATE_RATE_LIMIT`). `/quote` calls Google Distance Matrix every time, so it was the one unprotected cost path.
3. `FARE_CHANGED` guard on create: 409 before any money moves if the fare to charge exceeds what the rider agreed to by more than 10% (env: `INSTANT_FARE_TOLERANCE_PCT`). A lower fare is never blocked.
4. `/rider/active` bug: a request stays `matched` forever, so a rider whose last Express trip had finished was reported as active and bounced to the tracking page on every visit. A matched request now only counts while its ride is not `completed`/`cancelled`.

Not run against a database from here. Review the SQL in item 4 against production `rides.ride_status` values before merging, and run a test ride.

## 2. Go-live steps

### Step 1: Merge the code
1. PR #31 on `arrivo-website` still needs its required review approval. Get it approved and merged to `main`.
2. Open a PR in the backend repo with the patch above, review, merge, let Render deploy.
3. In Render set (all optional, defaults shown above): nothing is required. `ARRIVO_NOW_ENABLED=true` must already be set for Express to work at all.

Order matters: deploy the backend (specifically CORS) **before** the subdomain receives traffic, or every API call from the new site fails with a CORS error.

### Step 2: Create the Cloudflare Pages project
Create a **second** Pages project from the same `arrivo-website` repo (the existing one keeps serving ridearrivo.com unchanged).

- Production branch: `main`
- Build command: `node scripts/build-express.js`
- Build output directory: `dist/express`
- Environment variables: none required. Optional overrides: `API_BASE_URL`, `EXPRESS_ORIGIN`, `MAIN_SITE_ORIGIN`.
- Node version: 18 or newer (the script uses only built-ins).

Then **Custom domains** > add `express.ridearrivo.com`. If ridearrivo.com's DNS is in Cloudflare the CNAME is created for you; otherwise add `CNAME express -> <project>.pages.dev`. Wait for the certificate to show Active.

### Step 3: Google Cloud (Maps key)
APIs & Services > Credentials > the browser key:
1. HTTP referrers: add `https://express.ridearrivo.com/*` (keep the existing entries).
2. API restrictions must include **Maps JavaScript API** and **Places API**.
3. Directions: the key currently returns `REQUEST_DENIED` for Directions. Either enable the **Directions API** to get a drawn road route, or do nothing and riders see the dashed straight line. `DirectionsService` is deprecated by Google; plan a move to `routes.Route.computeRoutes` (Routes API) later.
4. Billing must be on, and add a budget alert. Autocomplete and Distance Matrix are the spend drivers.

### Step 4: Sign-in providers
Browser storage is per origin, so riders log in separately on express.ridearrivo.com. The bundled login page needs these registered or Google and Apple buttons fail there:
- Google Cloud > OAuth client (the one `login.html` uses) > **Authorized JavaScript origins**: add `https://express.ridearrivo.com`.
- Apple Developer > Services ID > add domain `express.ridearrivo.com` and its return URL. If you do not want Apple on this host yet, email and password and Google still work.
- Paystack top-up uses the inline popup and needs no domain registration. Test one small top-up from the new host anyway.

### Step 5: Smoke test (use a real rider account and a test driver)
1. `https://express.ridearrivo.com/` loads Express; the log-in gate shows when logged out.
2. Sign up, verify email, log in, you land back on Express.
3. Pickup autocomplete and "Use my current location" both work; the map shows both pins.
4. Edit the pickup text after choosing it, press See fare: you must be asked to pick a location again.
5. Quote shows; wallet balance note is correct; insufficient balance links to the wallet.
6. Top up the wallet from `account.html` on the new host.
7. Confirm a ride; driver accepts; you are sent to `track.html?ride=...` and the live map works.
8. Cancel a searching request; refund appears in the wallet.
9. Switch language to French and Chinese on each step.
10. Browser console: no CORS or CSP errors. Network tab: no 404s.
11. Finish a ride, reload Express: you must see the picker (not a redirect to tracking).

### Step 6: Cut over the main site (after step 5 passes)
- Point the Services menu and footer "ArrivoExpress" links on ridearrivo.com to `https://express.ridearrivo.com`, as the other services already do.
- Add a Cloudflare redirect rule `ridearrivo.com/express.html` -> `https://express.ridearrivo.com/` (301) so old links and SEO move over.
- Submit `https://express.ridearrivo.com/sitemap.xml` in Search Console.

## 3. Things to know

- **Separate sessions.** A rider logged in on ridearrivo.com is not logged in on the subdomain. Fixing that needs a shared-cookie SSO design on the backend; out of scope here.
- **Emails.** Verification and reset emails link to ridearrivo.com by default (`EMAIL_VERIFY_BASE_URL`, `PASSWORD_RESET_BASE_URL`). A rider who signs up on the subdomain verifies on the main site, which works, then logs in again on the subdomain.
- **No launch countdown** on the standalone site (the gate date, 2026-09-12, has passed).
- **Bundled supporting pages** (login, signup, account, track, reset, verify, legal) are marked `noindex`; their canonical stays on the main-site originals.
- **Service worker** is network-first, same as the main site, with its own cache name `arrivo-express-*`. Deploys need no version bump.
- The build **fails** on: a missing source file, a broken local link, a stray em dash, or the launch gate still present.

## 4. Rollback
- Subdomain misbehaving: in Pages, roll back to the previous deployment, or remove the custom domain. ridearrivo.com is never affected.
- Backend patch misbehaving: revert the PR; the front end still works without it (the new request field is ignored, and the old behavior returns).
- Nothing here changes the database schema or existing request fields.

## 5. Remaining risks (not fixed, by design)
- Polling is every 4 seconds with no push for the web rider; the apps use push.
- Fare uses live traffic, so quote and charge can differ within the 10% tolerance.
- The Maps browser key is public by nature; referrer restriction and the budget alert are the protection.
- `PR #31` has been open a long time and `main` keeps moving; merge soon to avoid another conflict round.
