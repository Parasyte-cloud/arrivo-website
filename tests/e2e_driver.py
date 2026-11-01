"""Browser tests for driver.html: full trip loop, My Profile twice, logout then login again,
and what happens when the profile call fails.
Usage: SITE_BASE=http://127.0.0.1:8788 python3 -I tests/e2e_driver.py   (SITE_PATH defaults to /driver)."""
import os, asyncio, json, sys
from playwright.async_api import async_playwright

BASE = os.environ.get("SITE_BASE", "http://127.0.0.1:8788")
PATH = os.environ.get("SITE_PATH", "/driver")
CORS = {"access-control-allow-origin": BASE, "access-control-allow-credentials": "true",
        "access-control-allow-headers": "*", "access-control-allow-methods": "*"}
res = []


def rec(name, ok, detail=""):
    res.append(bool(ok))
    print(("PASS " if ok else "FAIL ") + name, detail)


DRIVER = {"id": 1, "name": "Ada Driver", "email": "ada@example.com", "is_verified": True, "is_online": True,
          "profile_photo_url": "https://example.com/p.png", "whatsapp_number": "+2348011112222"}
RIDE = {"id": 7, "pickup_address": "Airport", "fare_naira": 5000, "rider_name": "Rider", "ride_status": "requested"}


async def wait_until(pg, expr, tries=40):
    # wait_for_function evaluates a string, which the page CSP forbids. Poll with evaluate.
    for _ in range(tries):
        if await pg.evaluate(expr):
            return True
        await pg.wait_for_timeout(150)
    return False


async def new_page(b, me_status=200, profile_status=200):
    ctx = await b.new_context()
    pg = await ctx.new_page()
    log = {"available": 0, "status_patch": [], "profile": 0, "ride_state": "requested"}

    async def handler(route):
        r = route.request
        url = r.url
        if url.startswith(BASE):
            await route.continue_()
            return
        if "googleapis" in url or "gstatic" in url or "example.com" in url:
            await route.abort()
            return
        if r.method == "OPTIONS":
            await route.fulfill(status=204, headers=CORS)
            return

        def ok(body, status=200):
            return route.fulfill(status=status, content_type="application/json", headers=CORS, body=json.dumps(body))

        if url.endswith("/api/auth/login"):
            await ok({"token": "tok", "user": {"role": "driver"}})
        elif url.endswith("/api/auth/me"):
            await ok({"user": {"role": "driver"}}, me_status)
        elif url.endswith("/api/drivers/me"):
            log["profile"] += 1
            await ok({"driver": DRIVER} if profile_status == 200 else {"error": "boom"}, profile_status)
        elif url.endswith("/api/drivers/status"):
            log["status_patch"].append(json.loads(r.post_data or "{}"))
            await ok({"isOnline": json.loads(r.post_data or "{}").get("isOnline", True)})
        elif url.endswith("/api/rides/available"):
            log["available"] += 1
            await ok({"rides": [RIDE] if log["ride_state"] == "requested" else []})
        elif url.endswith("/api/rides/driver/mine"):
            active = [dict(RIDE, ride_status=log["ride_state"])] if log["ride_state"] in ("accepted", "in_progress") else []
            await ok({"rides": active})
        elif url.endswith("/api/rides/7/accept"):
            log["ride_state"] = "accepted"
            await ok({"ride": dict(RIDE, ride_status="accepted")})
        elif url.endswith("/api/rides/7/status"):
            nxt = json.loads(r.post_data or "{}").get("status")
            log["ride_state"] = nxt
            await ok({"ride": dict(RIDE, ride_status=nxt)})
        else:
            await ok({})

    await ctx.route("**/*", handler)
    return ctx, pg, log


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # 1. Signed-in driver: trip loop, profile twice, logout, sign in again.
        ctx, pg, log = await new_page(b)
        await pg.add_init_script("if(!localStorage.getItem('seeded')){localStorage.setItem('seeded','1');localStorage.setItem('arrivo_driver_token','tok');}")
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        await pg.goto(BASE + PATH)
        await pg.wait_for_selector("#dashboardSection.active", timeout=8000)
        await pg.wait_for_selector("text=Accept Ride", timeout=8000)
        rec("online driver sees the available ride", True)
        await pg.click("text=Accept Ride")
        await pg.wait_for_selector("#advanceBtn", timeout=5000)
        await pg.click("#advanceBtn")  # Start Trip
        await wait_until(pg, "!!document.getElementById('advanceBtn') && document.getElementById('advanceBtn').textContent.includes('Complete')")
        before = log["available"]
        await pg.click("#advanceBtn")  # Complete Trip
        await pg.wait_for_timeout(1500)
        rec("after completing a trip an online driver gets polling again", log["available"] > before, f"{before} -> {log['available']}")

        await pg.click("#viewProfileBtn")
        await pg.wait_for_selector("#profileViewSection.active", timeout=3000)
        await pg.click("#backToDashFromProfileBtn")
        await pg.click("#viewProfileBtn")
        await pg.wait_for_timeout(500)
        on_profile = await pg.evaluate("document.getElementById('profileViewSection').classList.contains('active')")
        rec("My Profile opens a second time", on_profile, str(errors))
        rec("no page errors during the loop", not errors, str(errors))
        await pg.click("#backToDashFromProfileBtn")

        await pg.click("#logoutBtn")
        await pg.wait_for_selector("#loginSection.active", timeout=3000)
        rec("logout told the server the driver is offline", {"isOnline": False} in log["status_patch"], str(log["status_patch"]))
        await pg.fill("#loginEmail", "ada@example.com")
        await pg.fill("#loginPassword", "pw")
        await pg.click("#loginBtn")
        await pg.wait_for_selector("#dashboardSection.active", timeout=8000)
        await pg.click("#logoutBtn")
        await pg.wait_for_selector("#loginSection.active", timeout=3000)
        disabled = await pg.evaluate("document.getElementById('loginBtn').disabled")
        rec("login button is usable again after logging in and out", not disabled)
        await ctx.close()

        # 2. A 500 from the profile call must not send a verified driver to the vehicle form.
        ctx, pg, log = await new_page(b, profile_status=500)
        await pg.add_init_script("localStorage.setItem('arrivo_driver_token','tok');")
        await pg.goto(BASE + PATH)
        await pg.wait_for_timeout(2500)
        active = await pg.evaluate("document.querySelector('#driverApp section.active').id")
        rec("profile 500: not sent to vehicle setup", active != "profileSection", active)
        rec("profile 500: token kept for a retry", await pg.evaluate("localStorage.getItem('arrivo_driver_token')") == "tok")
        await ctx.close()

        # 3. A 404 means no profile yet: setup is correct.
        ctx, pg, log = await new_page(b, profile_status=404)
        await pg.add_init_script("localStorage.setItem('arrivo_driver_token','tok');")
        await pg.goto(BASE + PATH)
        await pg.wait_for_timeout(2500)
        active = await pg.evaluate("document.querySelector('#driverApp section.active').id")
        rec("profile 404: vehicle setup is shown", active == "profileSection", active)
        await ctx.close()

        # 4. /auth/me 503 at startup keeps the token.
        ctx, pg, log = await new_page(b, me_status=503)
        await pg.add_init_script("localStorage.setItem('arrivo_driver_token','tok');")
        await pg.goto(BASE + PATH)
        await pg.wait_for_timeout(2000)
        rec("auth/me 503: token kept", await pg.evaluate("localStorage.getItem('arrivo_driver_token')") == "tok")
        await ctx.close()

        await b.close()
    print(sum(res), "/", len(res))


asyncio.run(main())
sys.exit(0 if all(res) else 1)
