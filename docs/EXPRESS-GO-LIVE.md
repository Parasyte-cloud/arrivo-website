# ArrivoExpress on express.ridearrivo.com: one login, independent deploys

This is the plan, the reasoning, and the exact steps. It replaces the earlier "separate login on the subdomain" design.

## 0. The pull requests (merge in this order)

| Order | PR | What | Merge when |
|---|---|---|---|
| 1 | Arrivo #50 (backend) | Shared login cookie, CORS, rate limits, fare guard, stale-matched fix | Reviewed and tested on staging; then set `SESSION_COOKIE_DOMAIN` and `NODE_ENV` on Render |
| 2 | arrivo-website #31 | Express hardening, shared login, standalone build, this guide | Review approved |
| 3 | arrivo-website #42 | Switch website to `api.ridearrivo.com` | `api.ridearrivo.com` is live on Render with a valid certificate |
| 4 | arrivo-website #43 | Link cutover and 301 from `/express.html` | Express is live on its subdomain and the smoke test passed |

#42 and #43 are drafts based on #31's branch; GitHub retargets them to `main` after #31 merges. The backend half of this work is already on the backend `main` (Arrivo #50).

## 1. The architecture and why

```
                 .ridearrivo.com  (one login cookie, HttpOnly, Secure, SameSite=Lax)
                          |
   www.ridearrivo.com   express.   move.   air.   boat.   membership.     <- independent static deploys
   (login, account,        \         |       |      |        /
    tracking, book)         \________|_______|______|_______/
                                      |
                          api.ridearrivo.com  (Render)  ->  Postgres
```

**What is a microservice setup here?** Each product is its own deployable (own Cloudflare Pages project, own release, own failure). They share exactly two things on purpose: the identity (who the rider is) and the wallet (what they can pay with). Everything else is separate.

**Why a cookie instead of the token in localStorage?** `localStorage` is per origin, so a token saved on `ridearrivo.com` is invisible on `express.ridearrivo.com`. That is what forced a second login. A cookie with `Domain=.ridearrivo.com` is sent by the browser to every subdomain automatically. It is also `HttpOnly`, so page JavaScript cannot read it: a script-injection bug on one site cannot steal the session, which a localStorage token cannot promise.

**Why does the API need its own ridearrivo.com address?** A browser only accepts `Domain=.ridearrivo.com` from a response that itself came from inside ridearrivo.com. From `arrivo-backend-g1ku.onrender.com` the cookie is rejected or treated as a third-party cookie, which Safari and Chrome block. So the API must be served as `api.ridearrivo.com` (a custom domain on Render). If you skip this, login still works on www through the old token, but the shared login silently does not.

**What stays the same:** the mobile apps. The API accepts a Bearer token or the cookie (Bearer wins), so nothing in the apps changes.

## 2. What "if one goes down, the others stay up" means

| If this is down | What still works |
|---|---|
| www.ridearrivo.com | express., move., air., boat. load and work; riders with a session keep booking. Only sign-in (hosted on www), account and tracking pages are affected. |
| express. | www and every other product |
| Cloudflare Pages for one project | the other projects (separate deployments) |
| api.ridearrivo.com / the database | **everything.** This is still the single shared failure point. See roadmap. |

Rules that keep front ends independent: Express loads no scripts or images from www at runtime, and its links to www are plain links that fail only when clicked.

**Honest limit:** the one thing front-end separation cannot fix is the shared API and database. The roadmap in section 5 is how to reduce that.

## 3. What shipped

**Website repo (PR #31)**
- Express works with the shared cookie (sends `credentials: "include"`, Bearer only if a token exists, shows the log-in card on a 401 instead of redirecting blindly).
- `login.html` / `signup.html` accept a return URL on an exact allowlist of our own https hosts (`express`, `move`, `boat`, `air`, `membership`, `www`, apex), and send `credentials: "include"` so the browser stores the cookie. Anything else is refused (no open redirect). Tested: `evil.com`, `express.ridearrivo.com.evil.com`, `https://ridearrivo.com@evil.com/`, `http://`, `//evil.com`, `javascript:` and embedded credentials are all denied.
- `account.html` logout also clears the shared cookie.
- `track.html` no longer requires a locally stored token: it sends the shared cookie, adds the token when present, and sends a 401 to login.
- `scripts/build-express.js` now builds Express only (plus privacy, terms, 404). Login, signup, account and tracking are links to www with `next=` pointing back at Express. No duplicate auth pages to drift.
- Earlier hardening still applies (stale coordinates, 401 handling, fare-change guard, honest Maps errors, a11y, 7-language strings).

**Backend repo (already merged, Arrivo #50)**
- CORS for `express.ridearrivo.com`, per-rider rate limits, `FARE_CHANGED` guard, stale-`matched` fix.
- New `middleware/sessionCookie.js` (cookie set/clear/read, CSRF origin check); login, signup, Google and Apple sign-in also set the cookie; guest checkout does not.
- `requireAuth` accepts Bearer or cookie; `POST /api/auth/logout` clears the cookie.
- CORS `credentials: true` (safe because origins are an exact list; browsers refuse a wildcard with credentials).
- `scripts/test-session-cookie.js` covers cookie attributes, CSRF refusals, Bearer bypass and clearing.

**CSRF, explained.** Because a cookie is sent automatically, a malicious site could make your browser send a request that carries it. Two layers stop that: `SameSite=Lax` (the browser does not attach the cookie to cross-site POSTs) and an `Origin` check on state-changing requests that rely on the cookie (must be one of our own sites). Requests using a Bearer header or no cookie skip the check because there is nothing automatic to abuse.

Do a staging login before production.

## 4. Go-live steps (in this order)

### Step 1: Backend environment
The backend code is already on `main` (Arrivo #50). What is still outstanding is the Render environment:
- `SESSION_COOKIE_DOMAIN=.ridearrivo.com` (leading dot)
- `NODE_ENV=production` (makes the cookie `Secure`)
- `ARRIVO_NOW_ENABLED=true` (already required for Express)
- optional: `EXTRA_ALLOWED_ORIGINS` for a Pages preview URL while testing

If `JWT_SECRET` ever changes, every session ends; that is expected.

### Step 2: api.ridearrivo.com
Render > the API service > Settings > Custom Domains > add `api.ridearrivo.com`. In Cloudflare DNS add the CNAME Render shows. Keep it **DNS only (grey cloud)** until Render shows the certificate as issued; the orange proxy can block Render's certificate check. Confirm `https://api.ridearrivo.com/` answers (the old onrender URL keeps working too, which the apps rely on).

### Step 3: Point the website at the API domain
Do not repeat the cutover here. It is PR #42 (draft), which holds the exact change, its hold conditions and the rollback. Merge it once Step 2 is verified.

Other sites that sign riders in (the membership site posts to `/api/auth/google` and `/apple` itself) must also call the API at `api.ridearrivo.com` with `credentials: "include"`, or riders who sign up there will not get the shared cookie. That code is outside this repo.

### Step 4: Cloudflare Pages project for Express
New Pages project from the same repo:
- Production branch `main`
- Build command `node scripts/build-express.js`
- Output directory `dist/express`
- No environment variables needed (optional: `API_BASE_URL`, `EXPRESS_ORIGIN`, `MAIN_SITE_ORIGIN`)

Custom domain `express.ridearrivo.com`. Wait for the certificate to be Active. The build fails loudly on a broken link, missing file, stray em dash or the launch gate.

### Step 5: Google Maps key
Add referrer `https://express.ridearrivo.com/*`. Allow Maps JavaScript API and Places API. Directions is currently denied for the key: enable it for a road-following route line, or leave it and riders see a dashed straight line. Keep a billing budget alert.

You do **not** need new Google or Apple sign-in origins for Express, because sign-in only happens on www.

### Step 6: Smoke test
1. Logged out, open `https://express.ridearrivo.com/`: log-in card shows.
2. Click Log in: you go to www, sign in, and land back on Express already signed in (no second login).
3. DevTools > Application > Cookies: `arrivo_session`, Domain `.ridearrivo.com`, HttpOnly, Secure, SameSite Lax.
4. Open `https://move.ridearrivo.com` (or any other subdomain that calls the API with credentials): also signed in.
5. Pick pickup and destination, edit the pickup text: you must be asked to pick again. See fare, confirm, driver accepts, you are sent to tracking on www.
6. Top up from www account, return to Express, balance updated.
7. Log out on www: refresh Express, log-in card shows again.
8. Console: no CORS or CSP errors. A POST from a foreign origin with your cookie is refused (403).
9. Language switch on every step; finish a ride and reload Express: you see the picker, not tracking.
10. Mobile app login still works (Bearer path).

### Step 7: Cut over
Point the Services menu and footer link on ridearrivo.com to `https://express.ridearrivo.com`, add a Cloudflare redirect `ridearrivo.com/express.html` to the subdomain (301), submit `https://express.ridearrivo.com/sitemap.xml` in Search Console.

## 5. Roadmap: from "separate front ends" to real service isolation

1. **Now:** independent front ends, one identity cookie, one API.
2. **Harden the shared core (do before heavy traffic):** two or more API instances behind health checks, Postgres backups with point-in-time recovery, alerting on 5xx and latency, a status page. This removes most of the shared-failure risk for far less effort than splitting services.
3. **Then, if load or team size justifies it:** move Express (dispatch, offers, matching) into its own API service with its own scaling. Switch JWTs from a shared secret to a public/private key pair (RS256) so each service can verify sessions with only the public key. Keep the wallet as one service that owns balances, so money logic exists in exactly one place with row locks and idempotent refunds.

Why not split now: the instant-ride code and the wallet share database transactions today (accepting a ride locks rows and moves money atomically). Splitting before there is a clear boundary trades a database transaction for a distributed one, which is harder to get right and easy to get wrong with real money.

## 6. Things to know
- **Logout and JWTs.** Tokens are stateless and last 7 days. Logout clears the cookie and the local token but cannot revoke a copy someone already stole. If that matters, shorten expiry and add refresh tokens later.
- **Ride tracking lives on www and works from the shared login alone.** `track.html` sends the cookie and the stored token only if one exists; a 401 sends the rider to sign in.
- **Emails** (verify, reset) link to ridearrivo.com by default, which is now correct for every product since login lives there.
- **Service worker** on Express is network-first with its own cache name `arrivo-express-*`; deploys need no version bump.
- **No launch countdown** on the standalone site.

## 7. Rollback
- Express misbehaving: roll back the Pages deployment or remove the custom domain; nothing else is affected.
- Cookie login misbehaving: unset `SESSION_COOKIE_DOMAIN` (cookies become host-only and harmless) or revert patch 2; Bearer login for www and the apps keeps working throughout.
- API domain misbehaving: reverse the `sed` command; the old onrender URL was never turned off.
- No database schema changes in either patch.
