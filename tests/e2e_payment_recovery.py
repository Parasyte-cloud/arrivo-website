"""Browser tests: paid-then-reloaded recovery. Usage: SITE_BASE=http://127.0.0.1:8788 python3 tests/e2e_payment_recovery.py
SITE_PATH defaults to /book (use /book.html on a plain static server)."""
import os, asyncio, json, time
from playwright.async_api import async_playwright
BASE=os.environ.get("SITE_BASE","http://127.0.0.1:8788")
PATH=os.environ.get("SITE_PATH","/book")
res=[]
def rec(n,ok,d=""): res.append(ok); print(("PASS " if ok else "FAIL ")+n,d)
CORS={"access-control-allow-origin":BASE,"access-control-allow-credentials":"true"}
KEY="arrivo_pending_card_payment"
def pending(age_ms=1000):
  return json.dumps({"reference":"arrivo_test_ref1","savedAt":int(time.time()*1000)-age_ms,
    "payload":{"pickupAddress":"Murtala Muhammed Airport","stops":["Victoria Island"],"bookingType":"one_way","paymentMethod":"card","paymentReference":"arrivo_test_ref1"}})
async def scenario(b,name,verify,ride_status,seed):
  ctx=await b.new_context(); pg=await ctx.new_page(); calls=[]
  async def h(route):
    r=route.request
    if r.url.startswith(BASE): await route.continue_(); return
    if "googleapis" in r.url or "gstatic" in r.url: await route.abort(); return
    if "/api/payments/verify/" in r.url:
      calls.append("verify"); await route.fulfill(status=200,content_type="application/json",headers=CORS,body=json.dumps(verify)); return
    if r.url.endswith("/api/rides") and r.method=="POST":
      calls.append("ride")
      body={"ride":{"id":7,"fare_naira":5000,"barcode":"B1"}} if ride_status<300 else {"error":"x"}
      await route.fulfill(status=ride_status,content_type="application/json",headers=CORS,body=json.dumps(body)); return
    if "/payment" in r.url and r.method=="PATCH":
      calls.append("patch"); await route.fulfill(status=200,content_type="application/json",headers=CORS,body="{}"); return
    if r.method=="OPTIONS": await route.fulfill(status=204,headers={**CORS,"access-control-allow-headers":"*","access-control-allow-methods":"*"}); return
    await route.fulfill(status=200,content_type="application/json",headers=CORS,body=json.dumps({"user":{"name":"T","email":"t@e.com"}}))
  await ctx.route("**/*",h)
  await pg.add_init_script("localStorage.setItem('arrivo_rider_token','t');"+(f"if(!localStorage.getItem('seeded')){{localStorage.setItem('seeded','1');localStorage.setItem('{KEY}',{json.dumps(seed)});}}" if seed else ""))
  await pg.goto(BASE+PATH); await pg.wait_for_timeout(2500)
  step4=await pg.evaluate("[...document.querySelectorAll('.step')].some(e=>e.getAttribute('data-step')==='4'&&!e.hidden)")
  left=await pg.evaluate(f"localStorage.getItem('{KEY}')")
  await ctx.close(); return calls,step4,left
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    calls,step4,left=await scenario(b,"paid",{"success":True,"status":"success"},200,pending())
    rec("paid then reloaded: booking confirmed (step 4)",step4)
    rec("paid then reloaded: one verify, one ride, one patch",calls==["verify","ride","patch"],str(calls))
    rec("paid then reloaded: pending record cleared",left is None,str(left))
    calls,step4,left=await scenario(b,"abandoned recent",{"success":False,"status":"abandoned"},200,pending(1000))
    rec("recent abandoned: no ride created, record kept",calls==["verify"] and not step4 and left is not None,str(calls))
    calls,step4,left=await scenario(b,"abandoned old",{"success":False,"status":"abandoned"},200,pending(3*3600*1000))
    rec("old abandoned: no ride created, record cleared",calls==["verify"] and left is None,str(calls))
    calls,step4,left=await scenario(b,"ride 500",{"success":True,"status":"success"},500,pending())
    rec("server error on ride: not confirmed, record kept for retry",not step4 and left is not None,str(calls))
    calls,step4,left=await scenario(b,"ride 400",{"success":True,"status":"success"},400,pending())
    rec("refused ride (4xx): not confirmed, record cleared",not step4 and left is None,str(calls))
    calls,step4,left=await scenario(b,"expired",{"success":True,"status":"success"},200,pending(25*3600*1000))
    rec("record older than 24h is ignored",calls==[] and left is None,str(calls))
    calls,step4,left=await scenario(b,"none",{"success":True},200,None)
    rec("no record: nothing called",calls==[],str(calls))
    # checkout saves the record with the same ref it hands to Paystack, before opening
    ctx=await b.new_context(); pg=await ctx.new_page()
    async def h2(route):
      r=route.request
      if r.url.startswith(BASE): await route.continue_(); return
      if "googleapis" in r.url or "gstatic" in r.url: await route.abort(); return
      if r.url.endswith("/api/rides") and r.method=="POST":
        await route.fulfill(status=200,content_type="application/json",headers=CORS,body=json.dumps({"ok":True,"fareNaira":5000})); return
      if r.method=="OPTIONS": await route.fulfill(status=204,headers={**CORS,"access-control-allow-headers":"*","access-control-allow-methods":"*"}); return
      await route.fulfill(status=200,content_type="application/json",headers=CORS,body=json.dumps({"user":{"name":"T","email":"t@e.com"}}))
    await ctx.route("**/*",h2)
    await pg.add_init_script("""localStorage.setItem('arrivo_rider_token','t');
      window.PaystackPop={setup:function(o){window.__ref=o.ref;window.__saved=localStorage.getItem('arrivo_pending_card_payment');return {openIframe:function(){}}}};""")
    await pg.goto(BASE+PATH); await pg.wait_for_timeout(1500)
    await pg.evaluate("""()=>{const h=window.__arrivoBookingTestHooks; h.state.liveQuote={fareNaira:5000}; h.state.paymentMethod='card'; h.state.email='t@e.com'; h.goToStep(3); document.getElementById('fAgreeCancellation').checked=true;}""")
    await pg.evaluate("document.getElementById('payBtn').click()"); await pg.wait_for_timeout(1500)
    ref=await pg.evaluate("window.__ref"); saved=await pg.evaluate("window.__saved")
    ok=bool(ref) and bool(saved) and json.loads(saved)["reference"]==ref and json.loads(saved)["payload"]["paymentReference"]==ref
    rec("checkout: client reference passed to Paystack and saved before it opens",ok,str(ref))
    await b.close()
  print(sum(res),"/",len(res))
asyncio.run(main())
# Non-zero exit on any failed check so CI turns red.
import sys
sys.exit(0 if all(res) else 1)
