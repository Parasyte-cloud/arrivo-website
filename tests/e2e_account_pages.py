"""Browser tests for track, scan, account, login and verify-email fixes.
Usage: SITE_BASE=http://127.0.0.1:8788 python3 -I tests/e2e_account_pages.py"""
import os, asyncio, json, sys
from playwright.async_api import async_playwright

BASE = os.environ.get("SITE_BASE", "http://127.0.0.1:8788")
CORS = {"access-control-allow-origin": BASE, "access-control-allow-credentials": "true",
        "access-control-allow-headers": "*", "access-control-allow-methods": "*"}
res = []


def rec(name, ok, detail=""):
    res.append(bool(ok))
    print(("PASS " if ok else "FAIL ") + name, detail)


async def poll(pg, expr, tries=40):
    # wait_for_function evaluates a string, which the page CSP forbids.
    for _ in range(tries):
        if await pg.evaluate(expr):
            return True
        await pg.wait_for_timeout(150)
    return False


RIDE = {"id": "r1", "ride_status": "in_progress", "pickup_address": "Airport", "stops": [], "fare_naira": 5000,
        "driver_name": "Ada Driver", "driver_phone": "+2348011112222", "make_model": "Toyota Camry", "plate_number": "ABC123"}


async def new_ctx(b, handler):
    ctx = await b.new_context()
    pg = await ctx.new_page()

    async def h(route):
        url = route.request.url
        if url.startswith(BASE):
            await route.continue_()
            return
        if any(x in url for x in ("googleapis", "gstatic", "paystack", "googletagmanager")):
            await route.abort()
            return
        if route.request.method == "OPTIONS":
            await route.fulfill(status=204, headers=CORS)
            return
        await handler(route)

    await ctx.route("**/*", h)
    return ctx, pg


def ok(route, body, status=200):
    return route.fulfill(status=status, content_type="application/json", headers=CORS, body=json.dumps(body))


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # track: a failed poll shows the error card, the next good poll hides it, vehicle slot has the car.
        state = {"n": 0}

        async def track_h(route):
            if "/api/rides/r1" in route.request.url and route.request.method == "GET" and "/fleet" not in route.request.url:
                state["n"] += 1
                if state["n"] == 1:
                    await ok(route, {"error": "temporary"}, 500)
                else:
                    await ok(route, {"ride": RIDE})
            else:
                await ok(route, {})

        ctx, pg = await new_ctx(b, track_h)
        await pg.add_init_script("localStorage.setItem('arrivo_rider_token','t');window.POLL_INTERVAL_MS=500;")
        await pg.goto(BASE + "/track?ride=r1")
        shown = await poll(pg, "!document.getElementById('errorCard').hidden")
        rec("track: first failure shows the error card", shown)
        # the poll interval is the page's own constant; wait for a second poll
        recovered = await poll(pg, "document.getElementById('errorCard').hidden && !document.getElementById('rideCard').hidden", 200)
        rec("track: a later good answer hides the error card", recovered, f"polls={state['n']}")
        veh = await pg.evaluate("document.getElementById('driverVehicle').textContent")
        rec("track: vehicle line shows car and plate", "Toyota Camry (ABC123)" in veh, veh)
        await ctx.close()

        # track: an unsafe ride id is treated as none
        ctx, pg = await new_ctx(b, track_h)
        await pg.goto(BASE + "/track?ride=..%2F..%2Fadmin")
        await pg.wait_for_timeout(800)
        err = await pg.evaluate("!document.getElementById('errorCard').hidden")
        rec("track: path-like ride id is refused", err)
        await ctx.close()

        # scan: 401 clears the token and goes to login with next
        async def scan_h(route):
            if route.request.url.endswith("/api/rides/scan"):
                await ok(route, {"error": "bad token"}, 401)
            else:
                await ok(route, {})

        ctx, pg = await new_ctx(b, scan_h)
        await pg.add_init_script("if(!sessionStorage.getItem('s')){sessionStorage.setItem('s','1');localStorage.setItem('arrivo_rider_token','stale');}")
        await pg.goto(BASE + "/scan?token=abc&name=Fake%20Driver")
        await pg.wait_for_url("**/login*", timeout=6000)
        rec("scan: 401 goes to login", "next=" in pg.url, pg.url)
        await ctx.close()

        # scan: a definitive refusal hides the driver details taken from the link
        async def scan_h2(route):
            if route.request.url.endswith("/api/rides/scan"):
                await ok(route, {"error": "not your ride"}, 403)
            else:
                await ok(route, {})

        ctx, pg = await new_ctx(b, scan_h2)
        await pg.add_init_script("localStorage.setItem('arrivo_rider_token','t');")
        await pg.goto(BASE + "/scan?token=abc&name=Fake%20Driver")
        await pg.wait_for_timeout(1000)
        hidden = await pg.evaluate("getComputedStyle(document.getElementById('driverPreview')).display === 'none'")
        rec("scan: refused code hides the driver details from the link", hidden)
        await ctx.close()

        # account: /me 500 keeps the token and the page
        async def acct_h(route):
            if route.request.url.endswith("/api/auth/me"):
                await ok(route, {"error": "boom"}, 500)
            else:
                await ok(route, {})

        ctx, pg = await new_ctx(b, acct_h)
        await pg.add_init_script("localStorage.setItem('arrivo_rider_token','t');")
        await pg.goto(BASE + "/account")
        await pg.wait_for_timeout(1500)
        rec("account: /me 500 keeps the token", await pg.evaluate("localStorage.getItem('arrivo_rider_token')") == "t")
        rec("account: /me 500 stays on the account page", "/login" not in pg.url, pg.url)
        await ctx.close()

        async def acct_h401(route):
            if route.request.url.endswith("/api/auth/me"):
                await ok(route, {"error": "no"}, 401)
            else:
                await ok(route, {})

        ctx, pg = await new_ctx(b, acct_h401)
        await pg.add_init_script("localStorage.setItem('arrivo_rider_token','t');")
        await pg.goto(BASE + "/account")
        await pg.wait_for_url("**/login*", timeout=6000)
        rec("account: /me 401 goes to login", True, pg.url)
        await ctx.close()

        # login: next pointing at login itself does not loop
        ctx, pg = await new_ctx(b, acct_h)
        await pg.add_init_script("localStorage.setItem('arrivo_rider_token','t');")
        await pg.goto(BASE + "/login?next=login.html")
        await pg.wait_for_timeout(1500)
        rec("login: next=login.html does not loop", "/account" in pg.url, pg.url)
        await ctx.close()

        # verify-email: token leaves the address bar
        async def ve_h(route):
            await ok(route, {"message": "Email verified"})

        ctx, pg = await new_ctx(b, ve_h)
        await pg.goto(BASE + "/verify-email?token=secrettoken")
        await pg.wait_for_timeout(1200)
        rec("verify-email: token removed from the URL", "secrettoken" not in pg.url, pg.url)
        txt = await pg.evaluate("document.getElementById('statusMsg').textContent")
        rec("verify-email: success message shown", "verified" in txt.lower(), txt)
        await ctx.close()

        # 404: assets load from the root on a deep path
        failed = []
        ctx = await b.new_context()
        pg = await ctx.new_page()
        pg.on("response", lambda r: failed.append(r.url) if r.status >= 400 and r.url.startswith(BASE) and "/deep/" in r.url and not r.url.endswith("/deep/missing/page") else None)
        await pg.goto(BASE + "/deep/missing/page")
        await pg.wait_for_timeout(1200)
        css = await pg.evaluate("[...document.styleSheets].filter(s=>s.href && s.href.indexOf('/styles.css')>-1).length")
        rec("404: stylesheet resolves on a deep path", css >= 1 and not failed, str(failed))
        await ctx.close()

        await b.close()
    print(sum(res), "/", len(res))


asyncio.run(main())
sys.exit(0 if all(res) else 1)
