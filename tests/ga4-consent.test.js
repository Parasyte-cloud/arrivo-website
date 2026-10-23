const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const SOURCE = fs.readFileSync(path.join(ROOT, "marketing-consent.js"), "utf8");
const GA_ID = "G-CL4Y16M64E";
const KEY = "arrivo_marketing_consent_v1";

function elementFactory(registry) {
  return function createElement(tag) {
    const el = {
      tag, children: [], style: {}, hidden: false, textContent: "", isConnected: true,
      appendChild(child) { this.children.push(child); child.parent = this; if (child.id) registry[child.id] = child; return child; },
      setAttribute(k, v) { this[k] = v; },
      addEventListener() {},
      focus() {},
      closest() { return null; },
    };
    return el;
  };
}

/** Run the real marketing-consent.js in a minimal fake browser. */
function load({ url = "https://www.ridearrivo.com/", record = null, gpc = false, referrer = "", existingGtagScript = false } = {}) {
  const u = new URL(url);
  const registry = {};
  const scripts = existingGtagScript ? [{ src: "https://www.googletagmanager.com/gtag/js?id=G-OTHER" }] : [];
  const cookieWrites = [];
  const listeners = {};
  const store = {};
  if (record) store[KEY] = JSON.stringify(record);
  const createElement = elementFactory(registry);
  const body = createElement("body");
  const head = createElement("head");
  head.appendChild = (child) => { if (child.src) scripts.push(child); return child; };
  const document = {
    readyState: "complete", referrer, head, body, documentElement: { lang: "en" },
    createElement,
    getElementById: (id) => registry[id] || null,
    querySelector: (sel) => {
      if (sel === "footer") return null;
      if (sel.includes("googletagmanager.com/gtag/js")) return scripts.find((s) => /googletagmanager\.com\/gtag\/js/.test(s.src)) || null;
      return null;
    },
    addEventListener() {},
    set cookie(v) { cookieWrites.push(v); },
    get cookie() { return ""; },
  };
  const win = {
    document, self: null, top: null,
    location: { origin: u.origin, pathname: u.pathname, href: u.href, hash: u.hash, hostname: u.hostname, protocol: u.protocol },
    navigator: { globalPrivacyControl: gpc, language: "en" },
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
    addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); },
    URL, URLSearchParams, // browser globals that a bare vm context does not have
    MutationObserver: class { observe() {} },
    setTimeout: () => 0, clearTimeout() {},
    dispatchEvent() {},
  };
  win.window = win; win.self = win; win.top = win;
  vm.createContext(win);
  vm.runInContext(SOURCE, win);
  const gaScript = () => scripts.find((s) => /googletagmanager\.com\/gtag\/js/.test(s.src) && /G-CL4Y16M64E/.test(s.src));
  const layer = () => (win.dataLayer || []).map((entry) => Array.from(entry));
  const commands = (name) => layer().filter((c) => c[0] === name);
  const emit = (type, event) => (listeners[type] || []).forEach((fn) => fn(event));
  return { win, scripts, cookieWrites, store, gaScript, layer, commands, emit };
}

const accepted = () => ({ version: 2, marketing: true, updatedAt: Date.now() - 1000 });
const rejected = () => ({ version: 2, marketing: false, updatedAt: Date.now() - 1000 });
const googleRequests = (scripts) => scripts.filter((s) => /googletagmanager|google-analytics/.test(s.src));

test("GA4: no request to Google before any choice", () => {
  const env = load();
  assert.equal(googleRequests(env.scripts).length, 0);
  assert.equal(env.win.dataLayer, undefined, "not even a dataLayer exists yet");
});

test("GA4: rejected choice, and a Meta-only version 1 choice, load nothing", () => {
  assert.equal(googleRequests(load({ record: rejected() }).scripts).length, 0);
  const old = load({ record: { version: 1, marketing: true, updatedAt: Date.now() - 1000 } });
  assert.equal(googleRequests(old.scripts).length, 0, "old Meta-only consent must not enable analytics");
  assert.equal(old.store[KEY], undefined, "old record is discarded so the visitor is asked again");
});

test("GA4: accepted choice loads gtag.js with consent denied first, then grants after download", () => {
  const env = load({ record: accepted() });
  const script = env.gaScript();
  assert.ok(script, "gtag.js requested for " + GA_ID);
  assert.equal(script.src, "https://www.googletagmanager.com/gtag/js?id=" + GA_ID);
  assert.equal(env.commands("config").length, 0, "nothing configured before the script has loaded");
  assert.equal(env.commands("event").length, 0, "nothing sent before the script has loaded");
  const def = env.commands("consent").find((c) => c[1] === "default");
  assert.ok(def, "consent default is set");
  assert.equal(def[2].analytics_storage, "denied");
  assert.equal(def[2].ad_storage, "denied");
  assert.equal(def[2].ad_user_data, "denied");
  assert.equal(def[2].ad_personalization, "denied");

  script.onload();
  const update = env.commands("consent").find((c) => c[1] === "update");
  assert.equal(update[2].analytics_storage, "granted");
  assert.equal(update[2].ad_storage, "denied");
  assert.equal(update[2].ad_user_data, "denied");
  assert.equal(update[2].ad_personalization, "denied");
  const config = env.commands("config");
  assert.equal(config.length, 1);
  assert.equal(config[0][1], GA_ID);
  assert.equal(config[0][2].send_page_view, false);
  assert.equal(config[0][2].allow_google_signals, false);
  assert.equal(config[0][2].allow_ad_personalization_signals, false);
  assert.equal(config[0][2].cookie_domain, "www.ridearrivo.com", "host-only cookie, not shared with subdomains");
  const events = env.commands("event");
  assert.equal(events.length, 1);
  assert.equal(events[0][1], "page_view");
  assert.deepEqual(Object.keys(events[0][2] || {}), [], "no custom parameters are sent");
});

test("GA4: one page_view per document even when consent is re-synced", () => {
  const env = load({ record: accepted() });
  env.gaScript().onload();
  env.emit("pageshow", {});
  env.emit("hashchange", {});
  env.emit("popstate", {});
  assert.equal(env.commands("event").length, 1);
  assert.equal(googleRequests(env.scripts).length, 1, "gtag.js is requested once");
});

test("GA4: pages outside the reviewed public list are never tracked, even after accepting", () => {
  for (const url of [
    "https://www.ridearrivo.com/book", "https://www.ridearrivo.com/login", "https://www.ridearrivo.com/account",
    "https://www.ridearrivo.com/driver", "https://www.ridearrivo.com/track", "https://www.ridearrivo.com/payment/callback/",
    "https://www.ridearrivo.com/signup", "https://www.ridearrivo.com/new-unreviewed-page",
  ]) {
    assert.equal(googleRequests(load({ url, record: accepted() }).scripts).length, 0, url);
  }
  for (const url of ["https://www.ridearrivo.com/", "https://www.ridearrivo.com/contact-us", "https://www.ridearrivo.com/privacy.html", "https://ridearrivo.com/charter-booking"]) {
    assert.equal(googleRequests(load({ url, record: accepted() }).scripts).length, 1, url);
  }
});

test("GA4: not on preview domains, with unsafe URL parameters, or with Global Privacy Control", () => {
  assert.equal(googleRequests(load({ url: "https://abc123.arrivo-website.pages.dev/", record: accepted() }).scripts).length, 0);
  assert.equal(googleRequests(load({ url: "https://www.ridearrivo.com/?token=TEST_ONLY", record: accepted() }).scripts).length, 0);
  assert.equal(googleRequests(load({ url: "https://www.ridearrivo.com/?email=a@b.com", record: accepted() }).scripts).length, 0);
  assert.equal(googleRequests(load({ gpc: true, record: accepted() }).scripts).length, 0);
  assert.equal(googleRequests(load({ url: "https://www.ridearrivo.com/?utm_source=x&gclid=abc", record: accepted() }).scripts).length, 1, "reviewed campaign parameters still count");
});

test("GA4: rejecting while gtag.js is still downloading sends nothing", () => {
  const env = load({ record: accepted() });
  const script = env.gaScript();
  env.store[KEY] = JSON.stringify(rejected());
  env.emit("storage", { key: KEY, newValue: env.store[KEY] });
  script.onload();
  assert.equal(env.commands("config").length, 0);
  assert.equal(env.commands("event").length, 0);
  assert.equal(env.commands("consent").filter((c) => c[1] === "update" && c[2].analytics_storage === "granted").length, 0, "analytics storage is never granted");
});

test("GA4: withdrawal denies storage, disables the tag and removes the cookies", () => {
  const env = load({ record: accepted() });
  env.gaScript().onload();
  env.cookieWrites.length = 0;
  env.store[KEY] = JSON.stringify(rejected());
  env.emit("storage", { key: KEY, newValue: env.store[KEY] });
  const updates = env.commands("consent").filter((c) => c[1] === "update");
  assert.equal(updates[updates.length - 1][2].analytics_storage, "denied");
  assert.equal(env.win["ga-disable-" + GA_ID], true);
  const names = env.cookieWrites.map((c) => c.split("=")[0]);
  for (const cookie of ["_ga", "_ga_CL4Y16M64E"]) assert.ok(names.includes(cookie), cookie + " expired");
  assert.ok(env.cookieWrites.every((c) => /Max-Age=0/.test(c)));
});

test("GA4: does not start over another Google tag installation", () => {
  const env = load({ record: accepted(), existingGtagScript: true });
  assert.equal(env.gaScript(), undefined);
});

test("GA4: measurement id is defined once and nothing bypasses the consent module", () => {
  assert.equal((SOURCE.match(/G-CL4Y16M64E/g) || []).length, 1);
  assert.match(GA_ID, /^G-[A-Z0-9]{6,14}$/);
  const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html")).concat(["payment/callback/index.html"]);
  for (const page of pages) {
    const html = fs.readFileSync(path.join(ROOT, page), "utf8");
    assert.ok(!/googletagmanager|google-analytics|gtag\(/.test(html), page + " must not load Google directly");
  }
  assert.ok(!/GTM-/.test(SOURCE), "no Tag Manager container");
});

function directive(headers, name) {
  const line = headers.split("\n").find((l) => l.includes("Content-Security-Policy: default-src"));
  return (line.split(";").map((p) => p.trim()).find((p) => p.startsWith(name + " ")) || "");
}

test("GA4: CSP allows only the Google hosts GA4 needs", () => {
  const headers = fs.readFileSync(path.join(ROOT, "_headers"), "utf8");
  const script = directive(headers, "script-src"), connect = directive(headers, "connect-src"), img = directive(headers, "img-src");
  assert.match(script, /https:\/\/www\.googletagmanager\.com/);
  assert.ok(!script.includes("*"), "no wildcard in script-src");
  for (const host of ["https://www.googletagmanager.com", "https://*.google-analytics.com", "https://*.analytics.google.com"]) {
    assert.ok(connect.includes(host), host);
  }
  assert.ok(!/google/.test(img.replace(/googleusercontent/g, "")), "img-src not widened for Google");
  assert.ok(!/default-src[^;]*google/.test(headers), "default-src not widened");
});

test("GA4: the Express build strips the Google origins like the Meta ones", () => {
  const build = fs.readFileSync(path.join(ROOT, "scripts/build-express.js"), "utf8");
  for (const host of ["www\\.googletagmanager\\.com", "\\*\\.google-analytics\\.com", "\\*\\.analytics\\.google\\.com"]) {
    assert.ok(build.includes(host), host + " is stripped from the Express CSP");
  }
});

test("GA4: privacy policy discloses Google Analytics, the 14 month retention and the new labels", () => {
  const html = fs.readFileSync(path.join(ROOT, "privacy.html"), "utf8");
  assert.match(html, /Google Analytics \(main website\)/);
  assert.match(html, /_ga_CL4Y16M64E/);
  assert.match(html, /14 months/);
  assert.match(html, /Accept optional cookies/);
  assert.ok(!/Accept marketing|Reject marketing/.test(html), "buttons were renamed, so the policy must not name the old ones");
});

test("GA4: banner copy names Google Analytics in all seven languages and uses no em dash", () => {
  for (const lang of ["en", "fr", "zh", "hi", "de", "es", "pt"]) {
    const line = SOURCE.split("\n").find((l) => l.startsWith("    " + lang + ": ["));
    assert.ok(line, lang);
    const text = JSON.parse(line.trim().replace(/^[a-z]{2}: /, "").replace(/,$/, ""));
    assert.equal(text.length, 9, lang);
    assert.ok(text[1].includes("Google Analytics") && text[1].includes("Meta Pixel"), lang + " explanation names both services");
    assert.ok(!text.some((t) => t.includes("\u2014")), lang);
  }
});
