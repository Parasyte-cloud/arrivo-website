"""Typed addresses must still get a server quote when Google Maps is unavailable.
Usage: SITE_BASE=http://127.0.0.1:8788 python3 -I tests/e2e_typed_address.py"""
import asyncio, json, os
from playwright.async_api import async_playwright
BASE = os.environ.get("SITE_BASE", "http://127.0.0.1:8788")
CORS = {"access-control-allow-origin": BASE, "access-control-allow-credentials": "true"}
res = []
def rec(n, ok, d=""): ok = bool(ok); res.append(ok); print(("PASS " if ok else "FAIL ") + n, d)

async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(); ctx = await b.new_context(); pg = await ctx.new_page()
    quotes = []
    async def h(route):
      r = route.request
      if r.url.startswith(BASE): await route.continue_(); return
      if "googleapis" in r.url or "gstatic" in r.url: await route.abort(); return   # Maps unavailable
      if r.url.endswith("/api/rides/quote"):
        quotes.append(json.loads(r.post_data or "{}"))
        await route.fulfill(status=200, content_type="application/json", headers=CORS, body=json.dumps({"fareNaira": 65000, "fareUsd": 45, "ngnPerUsd": 1450, "vehicleCount": 1})); return
      await route.fulfill(status=200, content_type="application/json", headers=CORS, body=json.dumps({"user": {"name": "T", "email": "t@e.com"}}))
    await ctx.route("**/*", h)
    await pg.add_init_script("localStorage.setItem('arrivo_rider_token','t')")
    await pg.goto(BASE + "/book"); await pg.wait_for_timeout(1500)
    await pg.evaluate("""()=>{const s=window.__arrivoBookingTestHooks.state; s.bookingType='one_way'; s.vehicle='sedan'; s.pickup='Murtala Muhammed International Airport'; s.stops=['12 Admiralty Way, Lekki Phase 1']; s.pickupLatLng=null; s.dropoffLatLng=null; window.__arrivoBookingTestHooks.renderReview(); window.__arrivoBookingTestHooks.goToStep(3);}""")
    await pg.wait_for_timeout(2000)
    rec("quote request sent without coordinates", len(quotes) >= 1, str(len(quotes)))
    if quotes:
      q = quotes[-1]
      rec("addresses sent", q.get("pickupAddress") and q.get("destinationAddress"), f"{q.get('pickupAddress')} -> {q.get('destinationAddress')}")
      rec("no coordinates sent", not any(k in q for k in ("pickupLat", "pickupLng", "destinationLat", "destinationLng")))
    err = await pg.evaluate("(()=>{const e=document.getElementById('payError');return e&&!e.hidden?e.textContent:''})()")
    rec("no error shown on Review", not err, err[:80])
    # Missing destination still gives a clear message, not a request
    n0 = len(quotes)
    await pg.evaluate("""()=>{const h=window.__arrivoBookingTestHooks; h.state.stops=[]; h.renderReview(); h.goToStep(3);}""")
    await pg.wait_for_timeout(1500)
    rec("no quote request when destination missing", len(quotes) == n0, f"{len(quotes)-n0} extra")
    await b.close()
  print(sum(res), "/", len(res))
asyncio.run(main())
# Non-zero exit on any failed check so CI turns red.
import sys
sys.exit(0 if all(res) else 1)
