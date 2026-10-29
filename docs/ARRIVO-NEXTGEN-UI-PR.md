## Problem

The public RideArrivo homepage exposes too much product complexity at once, uses legacy movable/header and hero behavior, and does not yet share a coherent interaction/design foundation with Arrivo Everywhere. Mobile also needs deliberate safe-area behavior so the website navigation does not visually compete with iPhone hardware chrome.

## UX strategy

- compress the first decision to Ride / Move / Charter
- keep all six service brands behind progressive disclosure
- one SEO-focused hero message and one dominant interaction
- separate rider booking from driver acquisition
- light-first public website with deliberate dark/system support

## Navigation architecture

Introduces the proprietary Arrivo Island:
- full floating island >= 1100px
- condensed island 768-1099px
- deliberate mobile header + bottom action rail below 768px
- real states only: default, scrolled/condensed, service-selection context
- semantic `<nav>` is preserved while presentation morphs

## iPhone-specific handling

- no Apple Dynamic Island clone
- `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`
- mobile top header reads as a normal website header rather than a second black pill
- bottom rail clears Safari/device safe areas
- no user-agent sniffing

## Hero changes

- removes old hero booking form and fast carousel scripts from homepage
- keeps one LCP image preloaded
- deferred second desktop image
- slow drift/crossfade only on capable desktop/tablet layouts
- mobile uses one image with no continuous drift
- reduced-motion disables motion

## Dark mode / theme

- semantic Arrivo design tokens
- explicit Light / Dark / System modes
- Light remains first-visit default
- explicit mode persists
- shared resolved cookie remains compatible with sibling RideArrivo products
- inbound legacy `?theme=` links are cleaned after being honored

## Arrivo Everywhere alignment

Reuses design principles, not the dashboard layout:
- amber action accent
- navy/graphite dark surfaces
- consistent radii
- restrained glass
- compact capsule controls
- transform/opacity interaction feedback

The website intentionally remains more spacious, cinematic and hospitality/mobility oriented.

## Performance impact

Raw local baseline comparison:
- initial referenced JS: 362,059 B -> 84,913 B (-76.5%)
- initial CSS: 109,975 B -> 121,055 B
- raw initial static sum: 949,056 B -> 684,558 B (-27.9%)
- secondary desktop hero image (197,886 B) is deferred until after load and disabled on mobile

The large JS reduction comes from using a homepage-focused translation dictionary instead of the 316 KB full app dictionary.

Real Lighthouse/Web Vitals must be recorded from the Cloudflare preview before merge.

## Accessibility impact

- stable semantic navigation landmark
- keyboard-accessible Ride/Move/Charter tabs (arrows, Home, End)
- focus-visible styling
- 44/48px interaction targets
- reduced-motion handling
- reduced-transparency handling
- safe-area-aware mobile UI

## Tests

The implementation workspace passes:
- JS syntax checks
- homepage structural/SEO regression tests
- Meta consent/static tests available in the snapshot
- redirect security tests
- navigation/theme/motion/PWA regression tests
- 43/43 available Node tests
- production `scripts/build-site.js`

The apply script runs the complete test suite again on current `origin/main`, including the newly merged GA4 consent suite.

## Screenshots / visual QA

Cloudflare-preview screenshots must be attached before merge for:
- desktop light/dark
- tablet light/dark
- iPhone-size light/dark
- Android-size light/dark
- default/condensed navigation
- service selector
- mobile menu and command rail

The managed Chromium in the implementation environment blocks local/file origins, so no unverified local-browser screenshots are attached as evidence.

## Security / regression review

Not changed:
- booking API contracts
- auth flows
- Paystack/payment callbacks
- maps/flight tracking
- CSP policy
- driver onboarding
- customer data handling

Consent runtime is not replaced. Only safe public homepage anchors are added to its allow-list. No PII, location value, or booking detail is added to Meta/GA4.

## Rollback

No migrations or backend contract changes. Roll back by reverting this feature commit or closing the PR.
