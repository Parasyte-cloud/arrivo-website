"""Browser sandbox tests with real DOM/events, fake storage/location and a local SDK fixture.
No navigation, no Meta requests, no production events. This is not a live delivery test.
Run: python3 tests/browser_meta_pixel.py (requires playwright + Chromium).
"""
from pathlib import Path
import json, os, re, shutil, time
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
KEY='arrivo_marketing_consent_v1'
AGE=180*24*60*60*1000
BOOT=r'''({source,href,seed,gpc,referrer,iframe,blocked,hold,error}) => {
  const realWindow=window, realDocument=document;
  const jar={}, data=Object.assign({},seed||{}), listeners={};
  let fakeWindow, fakeDocument, pending=null;
  window.__calls=[]; window.__requests=[]; window.__timers=[];
  const storage={getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=String(v)},removeItem:k=>{delete data[k]}};
  const sdk=()=>{
    const q=fakeWindow.fbq; q.callMethod=function(...a){window.__calls.push(a);
      if(a[0]==='init') jar._fbp='test-cookie';
    }; q.queue.splice(0).forEach(a=>q.callMethod(...a));
  };
  const head={appendChild(el){
    if(el.tagName==='SCRIPT' && el.src.includes('connect.facebook.net')) {
      window.__requests.push(el.src);
      const finish=()=>{if(error){el.onerror&&el.onerror();return;}sdk();el.onload&&el.onload();};
      if(hold) pending=finish; else realWindow.setTimeout(finish,0);
      return el;
    }
    return realDocument.head.appendChild(el);
  }};
  fakeDocument=new Proxy(realDocument,{
    get(t,k){if(k==='head')return head;if(k==='referrer')return referrer||'';
      if(k==='cookie')return Object.entries(jar).map(([a,b])=>a+'='+b).join('; ');
      const v=Reflect.get(t,k,t);return typeof v==='function'?v.bind(t):v;},
    set(t,k,v){if(k==='cookie'){const first=v.split(';')[0],i=first.indexOf('=');
      if(/max-age=0/i.test(v))delete jar[first.slice(0,i)];else jar[first.slice(0,i)]=first.slice(i+1);return true;}
      return Reflect.set(t,k,v,t);}
  });
  fakeWindow=new Proxy(realWindow,{
    get(t,k){if(k==='location')return new URL(href);if(k==='self')return fakeWindow;
      if(k==='top')return iframe?{}:fakeWindow;
      if(k==='localStorage'){if(blocked)throw new Error('Storage unavailable');return storage;}
      if(k==='navigator')return {language:'en',globalPrivacyControl:!!gpc};
      if(k==='addEventListener')return (n,f)=>{(listeners[n]??=[]).push(f)};
      if(k==='setTimeout')return (f,ms)=>{const id=t.setTimeout(f,ms);window.__timers.push(id);return id};
      const v=Reflect.get(t,k,t);return typeof v==='function' && k!=='fbq'?v.bind(t):v;},
    set(t,k,v){return Reflect.set(t,k,v,t);}
  });
  const execute=()=>new Function('window','document',source)(fakeWindow,fakeDocument);
  execute();
  window.__test={data,jar,execute,release:()=>{pending&&pending();pending=null},
    fire:(name,event={})=>(listeners[name]||[]).forEach(f=>f(event)),
    state:()=>fakeWindow.RideArrivoPrivacy&&fakeWindow.RideArrivoPrivacy.getConsent()};
}'''
class Site:
    def __init__(self,browser,*,path='/',host='https://www.ridearrivo.com',seed=None,gpc=False,referrer='',iframe=False,blocked=False,hold=False,error=False,width=1280,lang='en',actual=False):
        self.ctx=browser.new_context(viewport={'width':width,'height':900}); self.page=self.ctx.new_page(); self.errors=[]
        self.page.on('pageerror',lambda e:self.errors.append(str(e)))
        css=(ROOT/'marketing-consent.css').read_text() if (ROOT/'marketing-consent.css').exists() else ''
        html='<html lang="'+lang+'"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body><main><h1>RideArrivo</h1><input value="private@example.invalid"></main><footer></footer></body></html>'
        if actual:
            html=(ROOT/'index.html').read_text()
            html=re.sub(r'<script\b[^>]*>[\s\S]*?</script>', '',html,flags=re.I)
            html=re.sub(r'<link\b[^>]*>', '',html,flags=re.I)
            local_css='\n'.join((ROOT/f).read_text() for f in ['styles.css','home.css','auth.css'] if (ROOT/f).exists())
            # No network assets in this offline visual test.
            local_css=re.sub(r'url\([^)]*\)','none',local_css)
            html=html.replace('</head>','<style>'+local_css+'\n'+css+'</style></head>')
            html=re.sub(r'<img\b[^>]*>','',html,flags=re.I)
        self.page.set_content(html)
        source=(ROOT/'marketing-consent.js').read_text() if (ROOT/'marketing-consent.js').exists() else ''
        self.page.evaluate(BOOT,dict(source=source,href=host+path,seed=seed or {},gpc=gpc,referrer=referrer,iframe=iframe,blocked=blocked,hold=hold,error=error))
        self.page.wait_for_timeout(35)
    def accept(self):self.page.locator('#ra-cookie-accept').click(timeout=1000);self.page.wait_for_timeout(40)
    def reject(self):self.page.locator('#ra-cookie-reject').click(timeout=1000);self.page.wait_for_timeout(30)
    def preferences(self):self.page.locator('#ra-cookie-settings').click(timeout=1000)
    def calls(self):return self.page.evaluate('window.__calls')
    def requests(self):return self.page.evaluate('window.__requests')
    def events(self):return [c for c in self.calls() if c[:2]==['track','PageView']]
    def close(self):self.ctx.close()
def saved(marketing=True,updated=None):
    return {KEY:json.dumps(dict(version=1,marketing=marketing,updatedAt=int(time.time()*1000) if updated is None else updated))}
def run(browser):
    results=[]
    def check(name,fn):
        try:fn();results.append(True);print('PASS',name)
        except Exception as e:results.append(False);print('FAIL',name,repr(e))
    def first():
        s=Site(browser);assert s.page.locator('#ra-cookie-banner').is_visible();assert not s.requests();assert s.page.evaluate('typeof window.fbq')=='undefined'
        s.reject();assert not s.requests();assert not json.loads(s.page.evaluate('window.__test.data["'+KEY+'"]'))['marketing'];s.close()
    check('no SDK before consent or after rejection',first)
    if not results[-1] and os.environ.get('STOP_ON_FIRST_FAILURE'):return results
    def accept():
        s=Site(browser);s.accept();calls=s.calls();assert calls.count(['init','956256323771727'])==1,calls
        assert calls.index(['set','autoConfig',False,'956256323771727'])<calls.index(['init','956256323771727'])
        assert len(s.events())==1;assert 'private@example.invalid' not in json.dumps(calls)
        s.page.evaluate('window.__test.execute()');s.preferences();s.accept();assert len(s.events())==1;assert len(s.requests())==1
        assert s.page.locator('#ra-cookie-banner').count()==1;s.close()
    check('single PageView, no form values, autoConfig off, duplicate guard',accept)
    def revoke():
        s=Site(browser);s.accept();s.preferences();s.reject();assert s.calls()[-1]==['consent','revoke'];assert not s.page.evaluate('window.__test.jar._fbp')
        s.preferences();s.accept();assert len(s.events())==1;s.close()
    check('withdrawal clears optional cookies and regrant does not duplicate',revoke)
    def race():
        s=Site(browser,hold=True);s.accept();s.preferences();s.reject();s.page.evaluate('window.__test.release()');assert not s.events();assert not any(c[0]=='init' for c in s.calls());s.close()
    check('revoke during SDK download does not send a queued event',race)
    for path in ['/account','/login.html','/signup','/forgot-password','/reset-password?token=secret','/verify-email','/driver','/track','/scan','/book','/express','/payment/callback/?reference=secret','/new-page','/404.html']:
        def private(path=path):
            s=Site(browser,path=path,seed=saved());assert not s.requests();s.close()
        check('excluded '+path,private)
    for path in ['/','/index.html','/contact-us','/charter-booking.html','/privacy','/terms.html','/hello']:
        def public(path=path):
            s=Site(browser,path=path,seed=saved());assert len(s.events())==1,s.calls();s.close()
        check('measured '+path,public)
    for path in ['/?token=secret','/?email=a%40b.com','/?Reference=secret','/#access_token=secret','/?unexpected=secret','/?utm_source=user%40example.com']:
        def unsafe(path=path):
            s=Site(browser,path=path,seed=saved());assert not s.requests();s.close()
        check('unsafe URL '+path,unsafe)
    def campaign():
        s=Site(browser,path='/?utm_source=facebook&utm_campaign=launch&fbclid=ABC123#how',seed=saved());assert len(s.events())==1;s.close()
    check('normal campaign URL',campaign)
    def referrer():
        s=Site(browser,seed=saved(),referrer='https://www.ridearrivo.com/reset-password?token=secret');assert not s.requests();s.close()
    check('sensitive referrer excluded',referrer)
    for host in ['https://ridearrivo.com','https://preview.arrivo-website.pages.dev','https://express.ridearrivo.com','http://localhost:8788','https://www.ridearrivo.com.evil.invalid']:
        def origin(host=host):
            s=Site(browser,host=host,seed=saved());assert bool(s.events())==(host=='https://ridearrivo.com');s.close()
        check('exact host '+host,origin)
    for value in ['invalid','null','true','{"version":1,"marketing":"yes"}',saved(updated=0)[KEY],saved(updated=int(time.time()*1000)+AGE)[KEY]]:
        def malformed(value=value):
            s=Site(browser,seed={KEY:value});assert not s.requests();assert s.page.locator('#ra-cookie-banner').is_visible();s.close()
        check('invalid/expired consent '+value,malformed)
    def gpc():
        s=Site(browser,gpc=True,seed=saved());assert not s.requests();s.preferences();assert s.page.locator('#ra-cookie-accept').is_disabled();s.close()
    check('Global Privacy Control respected',gpc)
    def blocked():
        s=Site(browser,blocked=True);s.accept();assert len(s.events())==1;assert not s.errors;s.close()
    check('storage unavailable degrades to this-page consent',blocked)
    def error():
        s=Site(browser,error=True);s.accept();assert not s.events();s.preferences();s.reject();assert not s.errors;s.close()
    check('SDK failure leaves preferences functional',error)
    def storage():
        s=Site(browser);s.accept();new=saved(False)[KEY];s.page.evaluate('(value)=>window.__test.fire("storage",{key:"'+KEY+'",newValue:value})',new)
        assert s.calls()[-1]==['consent','revoke'];s.close()
    check('cross-tab withdrawal event revokes consent',storage)
    def restored_page():
        s=Site(browser);s.accept();new=saved(False)[KEY]
        s.page.evaluate('(value)=>{window.__test.data["'+KEY+'"] = value; window.__test.fire("pageshow");}',new)
        assert s.calls()[-1]==['consent','revoke'];s.close()
    check('restored page re-reads a preference changed while frozen',restored_page)
    def expiry():
        s=Site(browser,seed=saved(updated=int(time.time()*1000)-AGE+700));assert len(s.events())==1;s.page.wait_for_timeout(850)
        assert s.calls()[-1]==['consent','revoke'];s.close()
    check('expiry in open page revokes consent',expiry)
    def frame():
        s=Site(browser,iframe=True,seed=saved());assert not s.requests();assert s.page.locator('#ra-cookie-banner').count()==0;s.close()
    check('embedded privacy pages do not fire duplicate views',frame)
    for lang in ['en','fr','zh','hi','de','es','pt']:
        def language(lang=lang):
            s=Site(browser,lang=lang);assert s.page.locator('#ra-cookie-banner').get_attribute('lang')==lang;assert s.page.locator('#ra-cookie-accept').inner_text();s.close()
        check('language '+lang,language)
    for width in [320,360,390,430,768,1440]:
        def size(width=width):
            s=Site(browser,width=width,actual=True);box=s.page.locator('#ra-cookie-banner').bounding_box()
            assert box and box['x']>=0 and box['x']+box['width']<=width+1,box
            assert box['y']>=0 and box['y']+box['height']<=901,box
            for selector in ['#ra-cookie-accept','#ra-cookie-reject']:
                b=s.page.locator(selector).bounding_box();assert b and b['height']>=44 and b['width']>=44,b
            assert not s.errors;s.close()
        check('offline DOM layout '+str(width)+'px',size)
    return results
if __name__=='__main__':
    with sync_playwright() as p:
        b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),headless=True)
        results=run(b);b.close()
    print(f'\n{sum(results)}/{len(results)} passed');raise SystemExit(0 if all(results) else 1)
