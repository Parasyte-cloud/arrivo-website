"""Browser regression suite for the RideArrivo main site (redirects, policy popups, profile outage, service worker).
Run the site first (e.g. node scripts/build-site.js && npx wrangler pages dev dist/site --port 8788),
then: SITE_BASE=http://127.0.0.1:8788 python3 -I tests/e2e_dev.py   (needs: pip install playwright)
"""
import os
import json, asyncio
from playwright.async_api import async_playwright
BASE=os.environ.get("SITE_BASE","http://127.0.0.1:8788")
results=[]
def rec(n,ok,d=""): results.append((n,ok,d)); print(("PASS " if ok else "FAIL ")+n, d)

async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    # ---- redirect tests
    for nxt,expect_same in [("//example.invalid/audit",True),("/.//example.invalid/audit",True),(BASE+"//example.invalid/audit",True),("https://evil.example/",True),("javascript:alert(1)",True)]:
      ctx=await b.new_context(); pg=await ctx.new_page()
      await pg.add_init_script("localStorage.setItem('arrivo_rider_token','t')")
      external=[]
      async def h(route):
        u=route.request.url
        if not u.startswith(BASE): external.append(u); await route.fulfill(status=200,body="x")
        else: await route.continue_()
      await ctx.route("**/*",h)
      from urllib.parse import quote
      await pg.goto(f"{BASE}/login.html?next={quote(nxt,safe='')}")
      await pg.wait_for_timeout(1200)
      ok=pg.url.startswith(BASE) and not any("example.invalid" in u or "evil.example" in u for u in external)
      rec(f"login redirect next={nxt}",ok,pg.url)
      await ctx.close()
    # ---- booking page
    ctx=await b.new_context(viewport={"width":390,"height":844}); pg=await ctx.new_page()
    csp=[]; pg.on("console",lambda m: csp.append(m.text) if "Content Security Policy" in m.text or "Refused" in m.text else None)
    me_status={"v":200}
    async def api(route):
      u=route.request.url
      if u.startswith(BASE): await route.continue_(); return
      if "/api/auth/me" in u:
        if me_status["v"]==200:
          await route.fulfill(status=200,content_type="application/json",headers={"access-control-allow-origin":BASE,"access-control-allow-credentials":"true"},body=json.dumps({"user":{"name":"Test","email":"t@example.com"}}))
        else:
          await route.fulfill(status=me_status["v"],content_type="application/json",headers={"access-control-allow-origin":BASE,"access-control-allow-credentials":"true"},body="{}")
      elif "maps.googleapis" in u or "paystack" in u or "google" in u:
        await route.abort()
      else:
        await route.fulfill(status=200,content_type="application/json",headers={"access-control-allow-origin":BASE,"access-control-allow-credentials":"true"},body="{}")
    await ctx.route("**/*",api)
    await pg.add_init_script("localStorage.setItem('arrivo_rider_token','t')")
    await pg.goto(BASE+"/book.html"); await pg.wait_for_timeout(1500)
    # profile 200 -> stays
    rec("book stays with valid profile","book" in pg.url,pg.url)
    # cancellation modal across languages
    for lang in ["en","fr","zh","hi","de","es","pt"]:
      await pg.evaluate("""(l)=>{const b=document.querySelector('.lang-opt[data-lang="'+l+'"]'); if(b) b.click();}""",lang)
      await pg.wait_for_timeout(150)
      await pg.evaluate("document.getElementById('cancellationModal').style.display='none'")
      opened=await pg.evaluate("""()=>{const a=document.getElementById('openCancellationModal'); if(!a) return 'nolink'; a.click(); return document.getElementById('cancellationModal').style.display}""")
      rec(f"cancellation link opens after lang={lang}",opened=="flex",str(opened))
    # iframe loads under CSP
    await pg.wait_for_timeout(800)
    fr=[f for f in pg.frames if "/terms" in f.url]
    txt=""
    if fr:
      try: txt=await fr[0].evaluate("document.body.innerText.length")
      except Exception as e: txt=str(e)
    rec("cancellation iframe content loaded",bool(fr) and isinstance(txt,int) and txt>100,str(txt))
    rec("no CSP frame violations",not any("frame" in c.lower() for c in csp),str(csp[:2]))
    await pg.keyboard.press("Escape")
    rec("Escape closes modal",await pg.evaluate("document.getElementById('cancellationModal').style.display")=="none")
    titles=await pg.evaluate("[...document.querySelectorAll('#privacyModal iframe,#cancellationModal iframe')].map(i=>i.title)")
    rec("iframes titled",all(titles) and len(titles)==2,str(titles))
    await ctx.close()
    # profile 503 -> no logout
    for st,expect_logout in [(503,False),(429,False),(401,True)]:
      ctx=await b.new_context(); pg=await ctx.new_page(); me_status["v"]=st
      await ctx.route("**/*",api)
      await pg.add_init_script("if(!sessionStorage.getItem('seeded')){localStorage.setItem('arrivo_rider_token','t');sessionStorage.setItem('seeded','1')}")
      await pg.goto(BASE+"/book.html"); await pg.wait_for_timeout(1800)
      tok=await pg.evaluate("localStorage.getItem('arrivo_rider_token')")
      logged_out=("login" in pg.url) or tok is None
      rec(f"profile {st} logout={expect_logout}",logged_out==expect_logout,f"{pg.url} token={tok}")
      await ctx.close()
    # service worker caching
    ctx=await b.new_context(); pg=await ctx.new_page(); await ctx.route("**/*",api)
    await pg.goto(BASE+"/"); await pg.wait_for_timeout(2500)
    await pg.evaluate("navigator.serviceWorker.ready.then(()=>1)")
    await pg.reload(); await pg.wait_for_timeout(1500)
    for path in ["/reset-password?token=SECRET123","/verify-email?token=SECRET456","/account","/privacy"]:
      await pg.goto(BASE+path); await pg.wait_for_timeout(1200)
    keys=await pg.evaluate("caches.keys().then(async ns=>{let o=[];for(const n of ns){const c=await caches.open(n);o=o.concat((await c.keys()).map(r=>r.url))}return o})")
    ctl=await pg.evaluate("!!navigator.serviceWorker.controller")
    rec("service worker active",ctl)
    bad=[k for k in keys if "SECRET" in k or "reset-password" in k or "verify-email" in k or "/account" in k]
    rec("no sensitive URLs cached",not bad,str(bad))
    rec("public page cached (privacy)",any("privacy" in k for k in keys),f"{len(keys)} entries")
    await b.close()
  print(sum(1 for r in results if r[1]),"/",len(results),"passed")
asyncio.run(main())
