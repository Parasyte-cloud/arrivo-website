"""ArrivoExpress must never sit on the loading spinner.
Serve the standalone build (node scripts/build-express.js, then any static server on dist/express), then:
  SITE_BASE=http://127.0.0.1:8790 SITE_PATH=/ python3 -I tests/e2e_express.py
The main site redirects /express to the express host, so it cannot be used here."""
import os, asyncio, json, sys
from playwright.async_api import async_playwright

BASE = os.environ.get("SITE_BASE", "http://127.0.0.1:8788")
PATH = os.environ.get("SITE_PATH", "/express")
CORS = {"access-control-allow-origin": BASE, "access-control-allow-credentials": "true",
        "access-control-allow-headers": "*", "access-control-allow-methods": "*"}
res = []


def rec(name, ok, detail=""):
    res.append(bool(ok))
    print(("PASS " if ok else "FAIL ") + name, detail)


async def visible_cards(pg):
    return await pg.evaluate("[...document.querySelectorAll('#loadingCard,#loadErrorCard,#pickerCard,#authGate,#unavailableCard')].filter(e=>!e.hidden && getComputedStyle(e).display!='none').map(e=>e.id)")


async def run(b, mode, wait_ms):
    ctx = await b.new_context()
    pg = await ctx.new_page()

    def ok(route, body, status=200, ctype="application/json"):
        return route.fulfill(status=status, content_type=ctype, headers=CORS, body=body if isinstance(body, str) else json.dumps(body))

    async def h(route):
        u = route.request.url
        if u.startswith(BASE):
            await route.continue_()
            return
        if "api.ridearrivo.com" in u or "onrender.com" in u:
            if route.request.method == "OPTIONS":
                await route.fulfill(status=204, headers=CORS)
                return
            if mode == "hang":
                return  # never answered
            if mode == "502":
                await ok(route, "<html>bad gateway</html>", 502, "text/html")
            elif u.endswith("/status"):
                await ok(route, {"enabled": True})
            elif u.endswith("/rider/active"):
                await ok(route, {"request": None})
            elif u.endswith("/tiers"):
                await ok(route, {"tiers": [] if mode == "no-tiers" else [{"key": "standard", "label": "Standard", "description": "x"}]})
            else:
                await ok(route, {})
            return
        if mode == "paystack-hang" and "paystack" in u:
            return  # never answered
        await route.abort()

    await ctx.route("**/*", h)
    await pg.add_init_script("localStorage.setItem('arrivo_rider_token','t');")
    await pg.goto(BASE + PATH, wait_until="commit")
    await pg.wait_for_timeout(wait_ms)
    cards = await visible_cards(pg)
    await ctx.close()
    return cards


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        rec("normal load reaches the picker", await run(b, "ok", 6000) == ["pickerCard"])
        rec("server 502 shows the error card", await run(b, "502", 6000) == ["loadErrorCard"])
        rec("empty tier list shows the error card", await run(b, "no-tiers", 6000) == ["loadErrorCard"])
        rec("Paystack script hanging does not block the page", await run(b, "paystack-hang", 6000) == ["pickerCard"])
        c = await run(b, "hang", 19000)
        rec("API that never answers ends in the error card, not the spinner", c == ["loadErrorCard"], str(c))
        await b.close()
    print(sum(res), "/", len(res))


asyncio.run(main())
sys.exit(0 if all(res) else 1)
