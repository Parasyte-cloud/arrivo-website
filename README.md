# ridearrivo.com — Marketing Website + Web Booking

A static, mobile-responsive site for Arrivo. Plain HTML/CSS/JS — no build step, no framework, no dependencies. That's deliberate: it means Cloudflare Pages can deploy it with zero configuration.

## NEW: riders can actually book a ride now (`book.html`)

This isn't just a marketing page anymore. `book.html` is a real 5-step guest checkout — no account/password required for a first booking:

1. **Contact** — name, email, phone. Creates a lightweight account behind the scenes (no password prompt) via a new `POST /api/auth/guest` backend endpoint. If that email already has a real account, it asks for a password instead of silently taking over someone else's account.
2. **Flight** — optional flight number lookup (reuses the existing AviationStack integration).
3. **Booking type + Luggage → vehicle matching** — choose one-way pickup, full day, full week, or full month, then enter bag count and whether you have bulky items; the right vehicle class (sedan/SUV/truck) is recommended automatically with the price shown (adjusted for the booking type's duration), and can still be manually overridden.
4. **Pickup** — address plus up to 3 additional stops.
5. **Review & Pay** — Paystack's inline checkout (a JS popup, the standard modern web integration — not a redirect). On success, the ride is created — with its booking type and duration — and marked paid using the exact same backend endpoints the mobile app uses.

**Tested everything except the literal Paystack popup itself** (needs your real public key, a real browser, and a real test card — outside what a sandboxed test can drive). Everything around it — guest account creation, the duplicate-email refusal, flight lookup, the luggage recommendation logic including a manual override, booking-type pricing multipliers, multi-stop pickup, and the full post-payment chain (verify → create ride → mark paid → confirmation) — was run end-to-end against a real instance of `arrivo-backend` running on Postgres, and I queried the database afterward to confirm the ride was actually saved with the correct booking type, duration, and fare.

### Before this works for real visitors

**Set your Paystack public key** in `booking.js`:
```js
var PAYSTACK_PUBLIC_KEY = "pk_test_replace_me";
```
Replace with your real key from `dashboard.paystack.com/#/settings/developer` (use the **test** key until ready to take real payments).

**Point it at your deployed backend** — same as `script.js`, `API_BASE_URL` in `booking.js` needs your backend's real public URL, not `localhost`.

---

## Test it locally

No install needed for the site itself — it's static files. From this folder:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`. (Any static file server works — `npx serve` is another common option if you have Node.)

**To test the waitlist form locally**, also run `arrivo-backend` at the same time (in a separate terminal — see its README). The form is pre-configured to talk to `http://localhost:4000`, so as long as the backend is running locally, signups will actually save to its database.

---

## Push to GitHub

```bash
cd ridearrivo-website
git init
git add .
git commit -m "Initial commit — Arrivo marketing site"
git branch -M main
git remote add origin https://github.com/<your-username>/ridearrivo-website.git
git push -u origin main
```

---

## Deploy to Cloudflare Pages

You bought `ridearrivo.com` on Cloudflare already, which makes this the natural place to host it — DNS and hosting live in the same dashboard.

### One-time setup

1. Log into the **Cloudflare dashboard** → go to **Workers & Pages** in the left sidebar.
2. Click **Create application** → the **Pages** tab → **Connect to Git**.
3. Authorize Cloudflare to access your GitHub account if you haven't already, then pick the `ridearrivo-website` repo.
4. Build settings — since this is a plain static site with no build step:
   - **Build command**: leave blank (or `exit 0` if it won't let you leave it empty)
   - **Build output directory**: `/` (the repo root, since `index.html` lives there directly)
5. Click **Save and Deploy**. Cloudflare will pull the repo and publish it — first deploy takes about a minute.

You'll get a working URL immediately at `<project-name>.pages.dev` — good for checking it before connecting your real domain.

### Connect your domain

1. In the Pages project, go to **Custom domains** → **Set up a custom domain**.
2. Enter `ridearrivo.com` (and add `www.ridearrivo.com` too, if you want both to work).
3. Since the domain is already on Cloudflare, DNS records are added **automatically** — no manual DNS editing needed. This is the main advantage of buying the domain and hosting on the same platform.
4. Wait a few minutes for the SSL certificate to provision. Cloudflare handles HTTPS automatically.

### After that

Every `git push` to `main` automatically triggers a new deployment — Cloudflare watches the repo. No manual redeploy step needed going forward.

## Alternative: deploying to Vercel instead

Since `ridearrivo.com` is already on Cloudflare, Cloudflare Pages is the more natural fit — but Vercel works equally well for this kind of static site if you'd rather use it (e.g. if you're also hosting other projects there):

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → import the `ridearrivo-website` GitHub repo.
2. Framework Preset: choose **Other** (this is plain HTML, not a framework Vercel needs to build).
3. Leave **Build Command** and **Output Directory** at their defaults — Vercel serves the repo root as-is for a project with no framework detected.
4. Click **Deploy**. You'll get a `<project-name>.vercel.app` URL immediately.
5. To use your real domain: **Project Settings → Domains** → add `ridearrivo.com`. Since the domain's DNS is managed by Cloudflare (not Vercel), you'll need to add the DNS records Vercel shows you (usually a CNAME or A record) into your Cloudflare DNS dashboard manually — this is the one extra step compared to Cloudflare Pages, where DNS updates itself automatically.

Every `git push` to `main` auto-redeploys on Vercel too.

---

## What's been wired up (this update)

- **Booking types** — the booking flow now offers one-way pickup, full day, full week, or full month, each with its own fare multiplier, before choosing a vehicle. Verified against the real database that a completed booking saves with the correct `booking_type`, `duration_days`, and total fare.
- **Waitlist form is now real.** It posts to `arrivo-backend`'s new `POST /api/waitlist` endpoint, which stores emails in a `waitlist` table (same database as everything else). Handles duplicates gracefully, validates email format, and has a basic honeypot field against bots. Tested end-to-end against a real running backend — valid signup, duplicate signup, invalid email, and a simulated bot submission all behave correctly.
- **Privacy Policy and Terms of Service pages** (`privacy.html`, `terms.html`) — real content covering what data is collected, how it's used, and rider/driver/owner-specific sections. Both are **template drafts** — replace every `[BRACKETED]` placeholder and have a Nigerian lawyer review before these go live or get submitted with an App Store/Play Store listing.
- **Mandarin added as a third language**, alongside English and French — the header now has a three-way EN / FR / 中文 switcher instead of a toggle. Added because a meaningful share of Lagos's international visitors are Chinese business travelers, alongside the existing French-speaking-neighbours reasoning.
- **Store badges now show icons**, not just placeholder text — still marked "coming soon" since the apps aren't submitted yet.

## Still to do before this actually launches

1. **Deploy `arrivo-backend` somewhere public.** Right now the waitlist form only works when you're running the backend locally (`API_BASE_URL` in `script.js` points at `http://localhost:4000`). For the **live** `ridearrivo.com` site to actually capture emails, deploy the backend to Render, Railway, or Fly.io, then update that URL in `script.js` to the real deployed address.

   If you want the live site collecting emails **before** you deploy the backend, a zero-deployment stopgap is to swap the form to post to a service like Buttondown or Mailchimp instead — a few minutes of setup, no server needed. Just say the word and I'll wire that version instead.

2. **Set up `hello@ridearrivo.com`** — since the domain is already on Cloudflare, the free path is Cloudflare Email Routing:
   - Cloudflare dashboard → your domain → **Email** → **Email Routing**
   - Click **Get started**, then **Create address**
   - Set `hello@ridearrivo.com` to forward to whatever inbox you actually check (e.g. your Gmail)
   - Cloudflare adds the necessary MX/DNS records automatically since it already manages your domain
   - Takes about 5 minutes, and mail starts forwarding almost immediately

3. **Get the Privacy Policy and Terms reviewed by a lawyer**, fill in the bracketed placeholders (legal entity name, CAC number, cancellation policy specifics), and update the "Last updated" date on both pages.

4. **Swap the store badges for real links** once the rider and driver apps are actually submitted and approved — replace the `<span class="store-badge">` elements in `index.html` with real `<a href="...">` links to your App Store and Play Store listings. Worth also swapping to Apple's and Google's *official* badge artwork at that point (downloadable from their developer brand guideline pages) instead of the custom icons here, since Apple in particular has strict badge usage guidelines.
