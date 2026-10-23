/* RideArrivo main-site optional-cookie consent. One optional PageView per
 * service (Meta Pixel and Google Analytics 4), no form events. Both services sit
 * behind the same accept/reject choice and the same page, origin, URL and
 * Global Privacy Control rules. See docs/META-PIXEL.md and docs/GA4-ANALYTICS.md
 * before adding a page, event or third-party integration.
 */
(function (window, document) {
  "use strict";
  if (window.RideArrivoPrivacy) return;

  var PIXEL_ID = "956256323771727";
  // Google Analytics 4 web stream "RideArrivo Website". Loaded as a direct gtag.js
  // tag, never through a Tag Manager container, so it cannot bypass these rules.
  var GA_ID = "G-CL4Y16M64E";
  // Version 2 = the choice now covers Google Analytics as well as Meta Pixel.
  // Version 1 records (Meta only) are refused, so every visitor is asked again.
  var RECORD_VERSION = 2;
  var STORAGE_KEY = "arrivo_marketing_consent_v1";
  var MAX_AGE = 180 * 24 * 60 * 60 * 1000;
  var PRODUCTION_ORIGINS = ["https://www.ridearrivo.com", "https://ridearrivo.com"];
  // Authenticated booking, account, driver, payment and tracking flows are NOT
  // marketing pages. New paths are off until deliberately reviewed here.
  var PUBLIC_PAGES = ["/", "/index", "/hello", "/contact-us", "/charter-booking", "/privacy", "/terms"];
  var SAFE_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id", "fbclid", "gclid", "theme", "lang", "src"];
  var SAFE_ANCHORS = ["", "how", "audiences", "safety", "contact", "fleet", "services", "main", "cookie-preferences", "cookies", "top", "faq"];
  var record = readRecord();
  var sdkStarted = false, sdkReady = false, sdkOwned = false;
  var initialized = false, pageViewSent = false, sdkGranted = false;
  var gaStarted = false, gaReady = false, gaOwned = false, gaGranted = false, gaConfigured = false, gaPageViewSent = false;
  var timer = null, banner, settings, accept, reject, close, message, status;
  var previousFocus = null;

  // Kept local so every page has translated choices without loading i18n.js.
  // Order: title, explanation, accept, reject, preferences, privacy, close,
  // browser opt-out explanation, saved announcement.
  var COPY = {
    en: ["Your privacy, your choice", "We use essential storage to run RideArrivo. With your permission, Google Analytics counts visits to our public pages and Meta Pixel helps measure and personalise ads on Facebook and Instagram. You can reject optional cookies and still use the site, or change your choice later.", "Accept optional cookies", "Reject optional cookies", "Cookie preferences", "Privacy policy", "Close", "Your browser's Global Privacy Control signal is on. Optional tracking stays off.", "Your cookie preference has been saved."],
    fr: ["Votre vie priv\u00e9e, votre choix", "Nous utilisons le stockage essentiel pour faire fonctionner RideArrivo. Avec votre accord, Google Analytics compte les visites de nos pages publiques et Meta Pixel aide \u00e0 mesurer et personnaliser les publicit\u00e9s sur Facebook et Instagram. Vous pouvez refuser les cookies facultatifs et utiliser le site, ou modifier votre choix plus tard.", "Accepter les cookies facultatifs", "Refuser les cookies facultatifs", "Pr\u00e9f\u00e9rences des cookies", "Politique de confidentialit\u00e9", "Fermer", "Le signal Global Privacy Control de votre navigateur est activ\u00e9. Le suivi facultatif reste d\u00e9sactiv\u00e9.", "Votre choix de cookies a \u00e9t\u00e9 enregistr\u00e9."],
    zh: ["\u60a8\u7684\u9690\u79c1\uff0c\u7531\u60a8\u9009\u62e9", "RideArrivo \u4f7f\u7528\u5fc5\u8981\u7684\u5b58\u50a8\u6765\u8fd0\u884c\u7f51\u7ad9\u3002\u7ecf\u60a8\u540c\u610f\uff0cGoogle Analytics \u4f1a\u7edf\u8ba1\u516c\u5f00\u9875\u9762\u7684\u8bbf\u95ee\uff0cMeta Pixel \u4f1a\u5e2e\u52a9\u8861\u91cf\u5e76\u5728 Facebook \u548c Instagram \u4e0a\u63d0\u4f9b\u4e2a\u6027\u5316\u5e7f\u544a\u3002\u60a8\u53ef\u4ee5\u62d2\u7edd\u53ef\u9009 Cookie \u5e76\u7ee7\u7eed\u4f7f\u7528\u7f51\u7ad9\uff0c\u6216\u7a0d\u540e\u66f4\u6539\u9009\u62e9\u3002", "\u63a5\u53d7\u53ef\u9009 Cookie", "\u62d2\u7edd\u53ef\u9009 Cookie", "Cookie \u504f\u597d", "\u9690\u79c1\u653f\u7b56", "\u5173\u95ed", "\u60a8\u7684\u6d4f\u89c8\u5668\u5df2\u542f\u7528 Global Privacy Control\u3002\u53ef\u9009\u8ddf\u8e2a\u4fdd\u6301\u5173\u95ed\u3002", "\u5df2\u4fdd\u5b58\u60a8\u7684 Cookie \u504f\u597d\u3002"],
    hi: ["\u0906\u092a\u0915\u0940 \u0928\u093f\u091c\u0924\u093e, \u0906\u092a\u0915\u0940 \u092a\u0938\u0902\u0926", "RideArrivo \u091a\u0932\u093e\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u0939\u092e \u0906\u0935\u0936\u094d\u092f\u0915 \u0938\u094d\u091f\u094b\u0930\u0947\u091c \u0915\u093e \u0909\u092a\u092f\u094b\u0917 \u0915\u0930\u0924\u0947 \u0939\u0948\u0902\u0964 \u0906\u092a\u0915\u0940 \u0905\u0928\u0941\u092e\u0924\u093f \u0938\u0947 Google Analytics \u0938\u093e\u0930\u094d\u0935\u091c\u0928\u093f\u0915 \u092a\u0943\u0937\u094d\u0920\u094b\u0902 \u0915\u0940 \u0935\u093f\u091c\u093c\u093f\u091f \u0917\u093f\u0928\u0924\u093e \u0939\u0948 \u0914\u0930 Meta Pixel, Facebook \u0924\u0925\u093e Instagram \u092a\u0930 \u0935\u093f\u091c\u094d\u091e\u093e\u092a\u0928 \u092e\u093e\u092a\u0928\u0947 \u0914\u0930 \u0935\u094d\u092f\u0915\u094d\u0924\u093f\u0917\u0924 \u092c\u0928\u093e\u0928\u0947 \u092e\u0947\u0902 \u092e\u0926\u0926 \u0915\u0930\u0924\u093e \u0939\u0948\u0964 \u0906\u092a \u0935\u0948\u0915\u0932\u094d\u092a\u093f\u0915 \u0915\u0941\u0915\u0940 \u0905\u0938\u094d\u0935\u0940\u0915\u093e\u0930 \u0915\u0930\u0915\u0947 \u092d\u0940 \u0938\u093e\u0907\u091f \u0909\u092a\u092f\u094b\u0917 \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902 \u0914\u0930 \u092c\u093e\u0926 \u092e\u0947\u0902 \u0905\u092a\u0928\u0940 \u092a\u0938\u0902\u0926 \u092c\u0926\u0932 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964", "\u0935\u0948\u0915\u0932\u094d\u092a\u093f\u0915 \u0915\u0941\u0915\u0940 \u0938\u094d\u0935\u0940\u0915\u093e\u0930 \u0915\u0930\u0947\u0902", "\u0935\u0948\u0915\u0932\u094d\u092a\u093f\u0915 \u0915\u0941\u0915\u0940 \u0905\u0938\u094d\u0935\u0940\u0915\u093e\u0930 \u0915\u0930\u0947\u0902", "\u0915\u0941\u0915\u0940 \u092a\u0938\u0902\u0926", "\u0917\u094b\u092a\u0928\u0940\u092f\u0924\u093e \u0928\u0940\u0924\u093f", "\u092c\u0902\u0926 \u0915\u0930\u0947\u0902", "\u0906\u092a\u0915\u0947 \u092c\u094d\u0930\u093e\u0909\u091c\u093c\u0930 \u092e\u0947\u0902 Global Privacy Control \u091a\u093e\u0932\u0942 \u0939\u0948\u0964 \u0935\u0948\u0915\u0932\u094d\u092a\u093f\u0915 \u091f\u094d\u0930\u0948\u0915\u093f\u0902\u0917 \u092c\u0902\u0926 \u0930\u0939\u0947\u0917\u0940\u0964", "\u0906\u092a\u0915\u0940 \u0915\u0941\u0915\u0940 \u092a\u0938\u0902\u0926 \u0938\u0939\u0947\u091c \u0926\u0940 \u0917\u0908 \u0939\u0948\u0964"],
    de: ["Ihre Privatsph\u00e4re, Ihre Wahl", "Wir verwenden notwendigen Speicher, um RideArrivo zu betreiben. Mit Ihrer Erlaubnis z\u00e4hlt Google Analytics Besuche unserer \u00f6ffentlichen Seiten und Meta Pixel hilft, Werbung auf Facebook und Instagram zu messen und zu personalisieren. Sie k\u00f6nnen optionale Cookies ablehnen und die Website weiter nutzen oder Ihre Wahl sp\u00e4ter \u00e4ndern.", "Optionale Cookies akzeptieren", "Optionale Cookies ablehnen", "Cookie-Einstellungen", "Datenschutzerkl\u00e4rung", "Schlie\u00dfen", "Global Privacy Control ist in Ihrem Browser aktiviert. Optionales Tracking bleibt ausgeschaltet.", "Ihre Cookie-Einstellung wurde gespeichert."],
    es: ["Tu privacidad, tu decisi\u00f3n", "Usamos almacenamiento esencial para que RideArrivo funcione. Con tu permiso, Google Analytics cuenta las visitas a nuestras p\u00e1ginas p\u00fablicas y Meta Pixel ayuda a medir y personalizar anuncios en Facebook e Instagram. Puedes rechazar las cookies opcionales y seguir usando el sitio, o cambiar tu decisi\u00f3n m\u00e1s adelante.", "Aceptar cookies opcionales", "Rechazar cookies opcionales", "Preferencias de cookies", "Pol\u00edtica de privacidad", "Cerrar", "La se\u00f1al Global Privacy Control de tu navegador est\u00e1 activada. El seguimiento opcional permanece desactivado.", "Se ha guardado tu preferencia de cookies."],
    pt: ["Sua privacidade, sua escolha", "Usamos armazenamento essencial para o funcionamento do RideArrivo. Com sua permiss\u00e3o, o Google Analytics conta as visitas \u00e0s nossas p\u00e1ginas p\u00fablicas e o Meta Pixel ajuda a medir e personalizar an\u00fancios no Facebook e Instagram. Voc\u00ea pode recusar os cookies opcionais e continuar usando o site, ou mudar sua escolha depois.", "Aceitar cookies opcionais", "Recusar cookies opcionais", "Prefer\u00eancias de cookies", "Pol\u00edtica de privacidade", "Fechar", "O sinal Global Privacy Control do seu navegador est\u00e1 ativado. O rastreamento opcional permanece desativado.", "Sua prefer\u00eancia de cookies foi salva."]
  };

  function parseRecord(raw) {
    try {
      var value = JSON.parse(raw);
      if (!value || value.version !== RECORD_VERSION || typeof value.marketing !== "boolean" ||
          !Number.isFinite(value.updatedAt) || value.updatedAt < 0 ||
          value.updatedAt > Date.now() || Date.now() - value.updatedAt >= MAX_AGE) return null;
      return value;
    } catch (e) { return null; }
  }
  function readRecord() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var parsed = parseRecord(raw);
      if (raw !== null && !parsed) window.localStorage.removeItem(STORAGE_KEY);
      return parsed;
    } catch (e) { return null; }
  }
  function refreshAndSync() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      record = parseRecord(raw);
      if (raw !== null && !record) window.localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* Keep this-page choice when storage is unavailable. */ }
    sync();
  }
  function validRecord() {
    return record && Date.now() - record.updatedAt < MAX_AGE ? record : null;
  }
  function gpcEnabled() { return window.navigator.globalPrivacyControl === true; }
  function isPublicPath(path) {
    try { path = decodeURIComponent(path); } catch (e) { return false; }
    path = path.replace(/\.html$/i, "").replace(/\/$/, "") || "/";
    return PUBLIC_PAGES.indexOf(path) !== -1;
  }
  function safeUrl(url) {
    try {
      var parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
      if (parsed.username || parsed.password) return false;
      var safe = true;
      parsed.searchParams.forEach(function (value, key) {
        // Unknown keys, email-like values and token-bearing fragments cause the
        // ENTIRE visit to be skipped. Do not rewrite auth/campaign URLs in place.
        if (SAFE_PARAMS.indexOf(key) === -1 || value.length > 512 || !/^[a-zA-Z0-9 _.,:\/-]*$/.test(value)) safe = false;
      });
      return safe && SAFE_ANCHORS.indexOf(parsed.hash.slice(1)) !== -1;
    } catch (e) { return false; }
  }
  function eligible() {
    if (window.self !== window.top || PRODUCTION_ORIGINS.indexOf(window.location.origin) === -1 ||
        !isPublicPath(window.location.pathname) || !safeUrl(window.location.href)) return false;
    if (document.referrer) {
      if (!safeUrl(document.referrer)) return false;
      try {
        var from = new URL(document.referrer);
        if ((PRODUCTION_ORIGINS.indexOf(from.origin) !== -1 || from.origin === window.location.origin) && !isPublicPath(from.pathname)) return false;
      } catch (e) { return false; }
    }
    return true;
  }
  function allowed() {
    var choice = validRecord();
    return !!(choice && choice.marketing && !gpcEnabled() && eligible());
  }
  function expireCookies(names) {
    var domains = [""];
    if (/(^|\.)ridearrivo\.com$/.test(window.location.hostname)) {
      domains.push("; Domain=" + window.location.hostname, "; Domain=ridearrivo.com");
    }
    names.forEach(function (name) {
      domains.forEach(function (domain) {
        try { document.cookie = name + "=; Max-Age=0; Path=/; SameSite=Lax" + domain + (window.location.protocol === "https:" ? "; Secure" : ""); } catch (e) {}
      });
    });
  }
  function clearMarketingCookies() { expireCookies(["_fbp", "_fbc"]); }
  // GA4 names its cookies _ga and _ga_<measurement id without "G-">.
  function clearAnalyticsCookies() { expireCookies(["_ga", "_gid", "_gat", "_ga_" + GA_ID.replace(/^G-/, "")]); }
  function grantReadySdk() {
    if (!sdkReady || !allowed()) return;
    if (!sdkGranted) { window.fbq("consent", "grant"); sdkGranted = true; }
    if (!initialized) {
      // No advanced-matching fields, automatic DOM events or extra conversions.
      window.fbq("set", "autoConfig", false, PIXEL_ID);
      window.fbq("init", PIXEL_ID);
      initialized = true;
    }
    if (!pageViewSent) {
      pageViewSent = true;
      window.fbq("track", "PageView");
    }
  }
  function startSdk() {
    if (!allowed()) return;
    if (sdkReady) { grantReadySdk(); return; }
    if (sdkStarted || window.fbq) return; // Never initialize over another pixel installation.
    sdkStarted = true;
    sdkOwned = true;
    var fbq = window.fbq = function () {
      if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
      else fbq.queue.push(arguments);
    };
    if (!window._fbq) window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    fbq("consent", "revoke");
    fbq("set", "autoConfig", false, PIXEL_ID);
    var script = document.createElement("script");
    script.id = "ra-meta-pixel-sdk";
    script.async = true;
    script.referrerPolicy = "no-referrer";
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    script.onload = function () {
      sdkReady = true;
      // Re-check after download. A visitor may have rejected or expired while
      // the network was slow. Do not queue init/PageView before this check.
      if (allowed()) grantReadySdk();
      else { fbq("consent", "revoke"); clearMarketingCookies(); }
    };
    script.onerror = function () { sdkReady = false; }; // A blocker never breaks booking.
    document.head.appendChild(script);
  }
  function ensureGtag() {
    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
      gaOwned = true;
      // gtag.js only understands the real `arguments` object, not an array.
      window.gtag = function () { window.dataLayer.push(arguments); };
    }
    return window.gtag;
  }
  function grantReadyGa() {
    if (!gaReady || !allowed()) return;
    window["ga-disable-" + GA_ID] = false;
    if (!gaGranted) {
      // Analytics storage only. Advertising storage and signals are never granted.
      window.gtag("consent", "update", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
      gaGranted = true;
    }
    if (!gaConfigured) {
      // No automatic page_view (sent once below), no Google signals, no ad
      // personalisation, and a host-only cookie so it is not shared with the
      // forms subdomains, which have their own consent choice.
      window.gtag("config", GA_ID, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        cookie_domain: window.location.hostname,
        cookie_flags: "SameSite=Lax;Secure"
      });
      gaConfigured = true;
    }
    if (!gaPageViewSent) {
      gaPageViewSent = true;
      window.gtag("event", "page_view");
    }
  }
  function startGa() {
    if (!allowed()) return;
    if (gaReady) { grantReadyGa(); return; }
    // Never initialise over another Google tag installation.
    if (gaStarted || (window.gtag && !gaOwned) || document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) return;
    gaStarted = true;
    var gtag = ensureGtag();
    // Consent Mode v2: everything denied until the checks below pass. Nothing is
    // configured or sent before the script has downloaded and consent is re-read.
    gtag("consent", "default", {
      ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied",
      analytics_storage: "denied", functionality_storage: "denied",
      personalization_storage: "denied", security_storage: "granted"
    });
    gtag("js", new Date());
    var script = document.createElement("script");
    script.id = "ra-ga4-sdk";
    script.async = true;
    script.referrerPolicy = "no-referrer";
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_ID);
    script.onload = function () {
      gaReady = true;
      // Re-check after download: the visitor may have rejected while it loaded.
      if (allowed()) grantReadyGa();
      else revokeGa();
    };
    script.onerror = function () { gaReady = false; }; // A blocker never breaks booking.
    document.head.appendChild(script);
  }
  function revokeGa() {
    window["ga-disable-" + GA_ID] = true;
    if (gaOwned && window.gtag && (gaGranted || !gaReady)) {
      window.gtag("consent", "update", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    }
    gaGranted = false;
    clearAnalyticsCookies();
  }
  function scheduleExpiry() {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
    var choice = validRecord();
    if (!choice) return;
    // Browser timers have a signed 32-bit limit. Re-arm long-lived choices.
    timer = window.setTimeout(refreshAndSync, Math.min(2147483647, Math.max(1, choice.updatedAt + MAX_AGE - Date.now() + 20)));
  }
  function sync() {
    if (!validRecord()) record = null;
    if (allowed()) { startSdk(); startGa(); }
    else {
      if (sdkOwned && (sdkGranted || !sdkReady)) window.fbq("consent", "revoke");
      sdkGranted = false;
      clearMarketingCookies();
      revokeGa();
    }
    scheduleExpiry();
    if (banner) {
      translate();
      if (!validRecord() && isPublicPath(window.location.pathname)) banner.hidden = false;
    }
  }
  function choose(marketing) {
    if (marketing && gpcEnabled()) return;
    // "marketing" is the stored name of the single optional-cookies choice.
    record = { version: RECORD_VERSION, marketing: marketing, updatedAt: Date.now() };
    // If storage is unavailable, consent lasts for this document only.
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record)); } catch (e) {}
    sync();
    hideBanner();
    status.textContent = text()[8];
  }
  function lang() {
    var value;
    try { value = window.localStorage.getItem("arrivo_site_lang"); } catch (e) {}
    value = value || document.documentElement.lang || window.navigator.language || "en";
    value = value.slice(0, 2).toLowerCase();
    return Object.prototype.hasOwnProperty.call(COPY, value) ? value : "en";
  }
  function text() { return COPY[lang()]; }
  function element(tag, id, className, parent) {
    var el = document.createElement(tag);
    if (id) el.id = id;
    if (className) el.className = className;
    if (parent) parent.appendChild(el);
    return el;
  }
  function button(id, parent) {
    var el = element("button", id, "ra-cookie-button", parent);
    el.type = "button";
    return el;
  }
  function translate() {
    var copy = text();
    banner.lang = lang();
    document.getElementById("ra-cookie-title").textContent = copy[0];
    document.getElementById("ra-cookie-description").textContent = copy[1];
    accept.textContent = copy[2];
    reject.textContent = copy[3];
    settings.textContent = copy[4];
    document.getElementById("ra-cookie-policy").textContent = copy[5];
    close.textContent = copy[6];
    message.textContent = gpcEnabled() ? copy[7] : "";
    message.hidden = !gpcEnabled();
    accept.disabled = gpcEnabled();
    close.hidden = !validRecord();
  }
  function showBanner() {
    if (!banner) return;
    previousFocus = document.activeElement;
    translate();
    banner.hidden = false;
    reject.focus({ preventScroll: true });
  }
  function hideBanner() {
    banner.hidden = true;
    if (previousFocus && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    previousFocus = null;
  }
  function boot() {
    // Legal-policy iframes inside checkout must not count as separate visits.
    if (window.self !== window.top) return;
    var controls = element("div", "", "ra-cookie-control", document.querySelector("footer") || document.body);
    settings = button("ra-cookie-settings", controls);
    settings.setAttribute("aria-controls", "ra-cookie-banner");
    settings.addEventListener("click", showBanner);
    banner = element("section", "ra-cookie-banner", "ra-cookie-banner", document.body);
    banner.hidden = true;
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-labelledby", "ra-cookie-title");
    banner.setAttribute("aria-describedby", "ra-cookie-description");
    var heading = element("div", "", "ra-cookie-heading", banner);
    element("h2", "ra-cookie-title", "", heading);
    close = button("ra-cookie-close", heading);
    close.addEventListener("click", hideBanner);
    element("p", "ra-cookie-description", "", banner);
    message = element("p", "ra-cookie-signal", "ra-cookie-signal", banner);
    var row = element("div", "", "ra-cookie-actions", banner);
    // Equal-sized, equal-emphasis choices, with reject first in keyboard order.
    reject = button("ra-cookie-reject", row);
    accept = button("ra-cookie-accept", row);
    reject.addEventListener("click", function () { choose(false); });
    accept.addEventListener("click", function () { choose(true); });
    var policy = element("a", "ra-cookie-policy", "ra-cookie-policy", banner);
    policy.href = "/privacy.html#cookies";
    status = element("span", "ra-cookie-status", "ra-cookie-sr-only", controls);
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    banner.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && validRecord()) { event.preventDefault(); hideBanner(); }
    });
    document.addEventListener("click", function (event) {
      var target = event.target.closest && event.target.closest("[data-ra-cookie-settings]");
      if (target) { event.preventDefault(); showBanner(); }
    });
    new window.MutationObserver(translate).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    sync();
    if (window.location.hash === "#cookie-preferences") showBanner();
  }

  window.RideArrivoPrivacy = Object.freeze({
    openPreferences: showBanner,
    getConsent: function () {
      var choice = validRecord();
      return { marketing: allowed(), analytics: allowed(), choice: choice ? choice.marketing : null,
        eligible: eligible(), expiresAt: choice ? choice.updatedAt + MAX_AGE : null,
        globalPrivacyControl: gpcEnabled() };
    }
  });
  window.addEventListener("storage", function (event) {
    if (event.key === STORAGE_KEY || event.key === null) {
      record = event.key === null ? null : parseRecord(event.newValue);
      sync();
    } else if (event.key === "arrivo_site_lang" && banner) translate();
  });
  window.addEventListener("pageshow", refreshAndSync);
  window.addEventListener("popstate", sync);
  window.addEventListener("hashchange", sync);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) refreshAndSync(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})(window, document);
