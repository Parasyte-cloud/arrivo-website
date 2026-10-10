"""Browser tests: cookie-only session handling and Paystack setup failure. Usage as e2e_dev.py."""
import os
import asyncio, json
from playwright.async_api import async_playwright
BASE=os.environ.get("SITE_BASE","http://127.0.0.1:8788")
res=[]
def rec(n,ok,d=""): res.append(ok); print(("PASS " if ok else "FAIL ")+n,d)
CORS={"access-control-allow-origin":BASE,"access-control-allow-credentials":"true"}
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    # ---- cookie-only session
    for me,label in [(200,"cookie session valid"),(401,"no session")]:
      ctx=await b.new_context(); pg=await ctx.new_page(); seen=[]
      async def h(route):
        r=route.request
        if r.url.startswith(BASE): await route.continue_(); return
        if "googleapis" in r.url: await route.abort()
        elif "/api/" in r.url:
          seen.append((r.url.split("/api/")[1][:20], r.headers.get("authorization")))
          if "auth/me" in r.url and me==200: await route.fulfill(status=200,content_type="application/json",headers=CORS,body=json.dumps({"user":{"name":"Cookie User","email":"c@example.com"}}))
          elif "auth/me" in r.url: await route.fulfill(status=401,content_type="application/json",headers=CORS,body="{}")
          else: await route.fulfill(status=200,content_type="application/json",headers=CORS,body="{}")
        else: await route.abort()
      await ctx.route("**/*",h)
      await pg.goto(BASE+"/book"); await pg.wait_for_timeout(2000)
      card=await pg.evaluate("!document.getElementById('bookingCard').hidden")
      gate=await pg.evaluate("!document.getElementById('authGate').hidden")
      rec(f"{label}: card={card} gate={gate}", card if me==200 else gate)
      auth=[a for _,a in seen if a]
      rec(f"{label}: no Bearer header sent without a token",not auth,str(auth))
      await ctx.close()
    # ---- Paystack setup throws
    ctx=await b.new_context(); pg=await ctx.new_page(); posts=[]
    async def h2(route):
      r=route.request
      if r.url.startswith(BASE): await route.continue_(); return
      if "googleapis" in r.url or "gstatic" in r.url: await route.abort()
      elif "/api/rides" in r.url and r.method=="POST":
        posts.append(1); await route.fulfill(status=200,content_type="application/json",headers=CORS,body=json.dumps({"ok":True,"fareNaira":5000}))
      elif "/api/" in r.url:
        await route.fulfill(status=200,content_type="application/json",headers=CORS,body=json.dumps({"user":{"name":"T","email":"t@e.com"}}))
      else: await route.abort()
    await ctx.route("**/*",h2)
    await pg.add_init_script("localStorage.setItem('arrivo_rider_token','t'); window.PaystackPop={setup:function(){throw new Error('sdk boom')}};")
    errs=[]; pg.on("pageerror",lambda e: errs.append(str(e)))
    await pg.goto(BASE+"/book"); await pg.wait_for_timeout(1500)
    await pg.evaluate("""()=>{const h=window.__arrivoBookingTestHooks; h.state.liveQuote={fareNaira:5000}; h.state.paymentMethod='card'; h.state.email='t@e.com'; h.goToStep(3); document.getElementById('fAgreeCancellation').checked=true;}""")
    await pg.evaluate("document.getElementById('payBtn').click()"); await pg.wait_for_timeout(1500)
    dis=await pg.evaluate("document.getElementById('payBtn').disabled")
    msg=await pg.evaluate("(()=>{const e=document.getElementById('payError');return e.hidden?'':e.textContent})()")
    rec("Paystack setup throws: Pay re-enabled",not dis)
    rec("Paystack setup throws: visible error",bool(msg),msg[:60])
    rec("Paystack setup throws: no uncaught page error",not errs,str(errs))
    rec("validate-only request was made once",len(posts)==1,str(len(posts)))
    await b.close()
  print(sum(res),"/",len(res))
asyncio.run(main())
# Non-zero exit on any failed check so CI turns red.
import sys
sys.exit(0 if all(res) else 1)
