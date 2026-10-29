# ArrivoExpress website + Arrivo Everywhere go-live

## Architecture

- `ridearrivo.com` is the public website and customer presentation surface.
- Arrivo Everywhere is the canonical ArrivoExpress orchestration engine.
- ArrivoOps is the operational control plane.
- A journey created on Instagram, Facebook, WhatsApp, TikTok, X, the app or the website keeps one Arrivo ID and one journey ID.

## Commercial boundary

This model applies **only to ArrivoExpress**:

- rider pays the assigned driver after trip completion;
- rider never pays the driver's ₦2,000 daily access fee;
- no ArrivoExpress wallet hold or rider Paystack trip checkout;
- RideArrivo trip commission is 0%;
- optional post-trip tip goes directly to the driver and remains separate from official fare.

Scheduled RideArrivo, Chauffeur, Removals, Boat, Air, memberships and their approved wallet/Paystack flows are unchanged.

## Staging

Website target: `https://staging.ridearrivo.com`

Arrivo Everywhere target: `https://staging-express.ridearrivo.com`

Cloudflare Pages preview must set:

```text
ARRIVO_EVERYWHERE_ORIGIN=https://staging-express.ridearrivo.com
MAIN_SITE_ORIGIN=https://staging.ridearrivo.com
```

The build fails closed for a non-main Cloudflare branch if `ARRIVO_EVERYWHERE_ORIGIN` is missing, so preview traffic cannot silently call production.

Arrivo Everywhere staging must allow only exact first-party origins, including `https://staging.ridearrivo.com`, and must run in production mode with demo mode disabled against staging dependencies/data.

## Continuation

Arrivo Everywhere issues opaque, short-lived continuation tokens in a URL fragment. The website exchanges the token once and then removes the fragment from browser history. Route, fare, auth token and PII are never placed in readable query parameters.

## Release sequence

1. Deploy Arrivo Everywhere feature branch to staging runtime.
2. Apply required migrations to staging Supabase only.
3. Verify `/health` and `/ready`.
4. Set Cloudflare preview environment variables and push website feature branch.
5. QA social -> website -> quote -> driver -> PIN -> trip -> post-trip -> direct settlement.
6. Review ArrivoOps: one journey only.
7. Promote only after explicit approval.
