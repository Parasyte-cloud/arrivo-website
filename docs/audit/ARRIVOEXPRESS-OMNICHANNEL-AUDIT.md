# ArrivoExpress Omnichannel Audit - arrivo-website

Baseline: Cloudflare preview lineage `c4564ef` (`770ebacb.arrivo-website.pages.dev`).

| Finding | Repository | Severity | Current behaviour | Required behaviour | Remediation |
|---|---|---:|---|---|---|
| Express uses legacy instant-ride API | arrivo-website | Critical | `express.js` owns `/api/instant-rides/*` request state | Arrivo Everywhere owns the canonical journey | Replace with `/api/booking/*` canonical journey facade |
| Express rider wallet gate | arrivo-website | Critical | Rider wallet is checked before requesting | No Express wallet requirement | Remove wallet calls and wallet eligibility UI from Express only |
| Express Paystack fare top-up | arrivo-website | Critical | Rider can top up shortfall through Paystack before ride | Rider pays assigned driver only after completion | Remove Paystack from Express page/build; preserve Paystack elsewhere |
| Held/refund fare copy | arrivo-website | High | UI says fare is held/refunded in wallet | No RideArrivo collection for Express fare | Replace with direct-driver post-trip settlement copy |
| Separate journey identifier | arrivo-website | Critical | Legacy instant request can diverge from social journey | One Arrivo ID + one journey across channels | Recover/create via Arrivo Everywhere continuation token and canonical booking APIs |
| Duplicate pricing contract | arrivo-website | High | UI renders legacy multipliers/minimum assumptions | Server owns Express tariff and breakdown | Render only canonical quote fields returned by Arrivo Everywhere |
| Cookie/token federation gap | arrivo-website | High | Website auth and Arrivo Everywhere sessions are independent | One first-party rider identity | Federate the existing RideArrivo bearer session server-side; never trust client identity fields |
| Unsafe fallback risk | arrivo-website | High | Old API could act as a fallback if new API fails | Fail closed | No fallback to `/api/instant-rides/*` or local fare logic |
| Express build ships Paystack | arrivo-website | High | Standalone Express bundle includes Paystack SDK/config | Express rider fare never uses Paystack | Remove Paystack assets from standalone Express build only |
| Staging endpoint drift risk | arrivo-website | Medium | Static config can silently point previews at production | Explicit staging engine | Generate Express config at build time and fail non-main Cloudflare builds without staging origin |
| CSP integration | arrivo-website | Medium | CSP has legacy backend/Paystack origins | Exact canonical engine origin needed | Keep existing service origins for other products; add staging/production Express engines explicitly |
| Marketing leakage | arrivo-website | Low | Booking pages already excluded from Meta Pixel | Preserve exclusion | Keep consent/pixel code from collecting Express booking/payment state |

## Service isolation

This remediation changes **ArrivoExpress only**. `book.html`, scheduled RideArrivo, Chauffeur, Removals, Air, Boat, wallet, membership and their approved Paystack flows are not globally removed.
