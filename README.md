# ridearrivo.com

Marketing site + web booking flow for Arrivo. Plain HTML/CSS/JS, no framework, no build step. Deploys to Cloudflare Pages by just pushing static files.

## Run it locally

Any static file server works, e.g.:

```bash
npx serve .
```

Nothing to install or build.

## Pages

- `index.html` — marketing homepage
- `book.html` — real 5-step guest checkout (no account needed): contact, flight lookup, booking type + vehicle matching, pickup/stops, Paystack payment
- `track.html` — live ride tracking (Google Maps)
- `login.html` / `signup.html` / `forgot-password.html` / `reset-password.html` / `verify-email.html` — account flows
- `account.html` — logged-in rider account/ride history
- `driver.html` — driver web registration
- `scan.html` — QR-driven flow
- `privacy.html` / `terms.html` — legal

## Config

Set your Paystack public key in `paystack-config.js` before payments will work for real visitors. The site talks to `arrivo-backend`'s public API — no separate backend config needed beyond that.

## Notes

- `i18n.js` holds all translations — it's a big file because it covers every language the site supports, not because it's doing anything complicated.
- Website and mobile apps are separate codebases. A feature shipped here doesn't exist on mobile until it's built there too.
