/* RideArrivo main-site marketing consent. One optional PageView, no form events.
 * See docs/META-PIXEL.md before adding a page, event or third-party integration.
 */
(function (window, document) {
  "use strict";
  if (window.RideArrivoPrivacy) return;

  var PIXEL_ID = "956256323771727";
  var GTM_ID = "GTM-WZ6Q7LPT";
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
  var googleStarted = false, googleScript = null;
  var timer = null, banner, settings, accept, reject, close, message, status;
  var previousFocus = null;

  // Kept local so every page has translated choices without loading i18n.js.
  // Order: title, explanation, accept, reject, preferences, privacy, close,
  // browser opt-out explanation, saved announcement.
  var COPY = {
    en: ["Your privacy, your choice", "We use essential storage to run RideArrivo. With your permission, Meta Pixel and Google advertising and analytics tools measure visits to approved public pages and help us understand and improve our advertising. You can reject marketing and still use the site, or change your choice later.", "Accept marketing", "Reject marketing", "Cookie preferences", "Privacy policy", "Close", "Your browser's Global Privacy Control signal is on. Marketing tracking stays off.", "Your cookie preference has been saved."],
    fr: ["Votre vie priv\u00e9e, votre choix", "Nous utilisons le stockage essentiel pour faire fonctionner RideArrivo. Avec votre accord, Meta Pixel ainsi que les outils publicitaires et analytiques de Google mesurent les visites des pages publiques approuvees et nous aident a comprendre et ameliorer notre publicite. Vous pouvez refuser le marketing et continuer a utiliser le site, ou modifier votre choix plus tard.", "Accepter le marketing", "Refuser le marketing", "Pr\u00e9f\u00e9rences des cookies", "Politique de confidentialit\u00e9", "Fermer", "Le signal Global Privacy Control de votre navigateur est activ\u00e9. Le suivi marketing reste d\u00e9sactiv\u00e9.", "Votre choix de cookies a \u00e9t\u00e9 enregistr\u00e9."],
    zh: ["\u60a8\u7684\u9690\u79c1\uff0c\u7531\u60a8\u9009\u62e9", "RideArrivo \u4f7f\u7528\u5fc5\u8981\u7684\u5b58\u50a8\u6765\u8fd0\u884c\u7f51\u7ad9\u3002\u7ecf\u60a8\u540c\u610f\uff0cMeta Pixel \u4ee5\u53ca Google \u7684\u5e7f\u544a\u548c\u5206\u6790\u5de5\u5177\u4f1a\u8861\u91cf\u7ecf\u6279\u51c6\u7684\u516c\u5f00\u9875\u9762\u8bbf\u95ee\u60c5\u51b5\uff0c\u5e76\u5e2e\u52a9\u6211\u4eec\u4e86\u89e3\u548c\u6539\u8fdb\u5e7f\u544a\u6548\u679c\u3002\u60a8\u53ef\u4ee5\u62d2\u7edd\u8425\u9500\u5e76\u7ee7\u7eed\u4f7f\u7528\u7f51\u7ad9\uff0c\u4e5f\u53ef\u4ee5\u7a0d\u540e\u66f4\u6539\u9009\u62e9\u3002", "\u63a5\u53d7\u8425\u9500", "\u62d2\u7edd\u8425\u9500", "Cookie \u504f\u597d", "\u9690\u79c1\u653f\u7b56", "\u5173\u95ed", "\u60a8\u7684\u6d4f\u89c8\u5668\u5df2\u542f\u7528 Global Privacy Control\u3002\u8425\u9500\u8ddf\u8e2a\u4fdd\u6301\u5173\u95ed\u3002", "\u5df2\u4fdd\u5b58\u60a8\u7684 Cookie \u504f\u597d\u3002"],
    hi: ["\u0906\u092a\u0915\u0940 \u0928\u093f\u091c\u0924\u093e, \u0906\u092a\u0915\u0940 \u092a\u0938\u0902\u0926", "RideArrivo \u091a\u0932\u093e\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u0939\u092e \u0906\u0935\u0936\u094d\u092f\u0915 \u0938\u094d\u091f\u094b\u0930\u0947\u091c \u0915\u093e \u0909\u092a\u092f\u094b\u0917 \u0915\u0930\u0924\u0947 \u0939\u0948\u0902\u0964 \u0906\u092a\u0915\u0940 \u0905\u0928\u0941\u092e\u0924\u093f \u0938\u0947 Meta Pixel \u0914\u0930 Google \u0915\u0947 \u0935\u093f\u091c\u094d\u091e\u093e\u092a\u0928 \u0935 \u090f\u0928\u093e\u0932\u093f\u091f\u093f\u0915\u094d\u0938 \u091f\u0942\u0932 \u0938\u094d\u0935\u0940\u0915\u0943\u0924 \u0938\u093e\u0930\u094d\u0935\u091c\u0928\u093f\u0915 \u092a\u0947\u091c\u094b\u0902 \u0915\u0940 \u0935\u093f\u091c\u093c\u093f\u091f \u092e\u093e\u092a\u0924\u0947 \u0939\u0948\u0902 \u0914\u0930 \u0939\u092e\u0947\u0902 \u0905\u092a\u0928\u0947 \u0935\u093f\u091c\u094d\u091e\u093e\u092a\u0928 \u0915\u094b \u0938\u092e\u091d\u0928\u0947 \u0924\u0925\u093e \u092c\u0947\u0939\u0924\u0930 \u092c\u0928\u093e\u0928\u0947 \u092e\u0947\u0902 \u092e\u0926\u0926 \u0915\u0930\u0924\u0947 \u0939\u0948\u0902\u0964 \u0906\u092a \u092e\u093e\u0930\u094d\u0915\u0947\u091f\u093f\u0902\u0917 \u0905\u0938\u094d\u0935\u0940\u0915\u093e\u0930 \u0915\u0930\u0915\u0947 \u092d\u0940 \u0938\u093e\u0907\u091f \u0915\u093e \u0909\u092a\u092f\u094b\u0917 \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902 \u0914\u0930 \u092c\u093e\u0926 \u092e\u0947\u0902 \u0905\u092a\u0928\u0940 \u092a\u0938\u0902\u0926 \u092c\u0926\u0932 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964", "\u092e\u093e\u0930\u094d\u0915\u0947\u091f\u093f\u0902\u0917 \u0938\u094d\u0935\u0940\u0915\u093e\u0930 \u0915\u0930\u0947\u0902", "\u092e\u093e\u0930\u094d\u0915\u0947\u091f\u093f\u0902\u0917 \u0905\u0938\u094d\u0935\u0940\u0915\u093e\u0930 \u0915\u0930\u0947\u0902", "\u0915\u0941\u0915\u0940 \u092a\u0938\u0902\u0926", "\u0917\u094b\u092a\u0928\u0940\u092f\u0924\u093e \u0928\u0940\u0924\u093f", "\u092c\u0902\u0926 \u0915\u0930\u0947\u0902", "\u0906\u092a\u0915\u0947 \u092c\u094d\u0930\u093e\u0909\u091c\u093c\u0930 \u092e\u0947\u0902 Global Privacy Control \u091a\u093e\u0932\u0942 \u0939\u0948\u0964 \u092e\u093e\u0930\u094d\u0915\u0947\u091f\u093f\u0902\u0917 \u091f\u094d\u0930\u0948\u0915\u093f\u0902\u0917 \u092c\u0902\u0926 \u0930\u0939\u0947\u0917\u0940\u0964", "\u0906\u092a\u0915\u0940 \u0915\u0941\u0915\u0940 \u092a\u0938\u0902\u0926 \u0938\u0939\u0947\u091c \u0926\u0940 \u0917\u0908 \u0939\u0948\u0964"],
    de: ["Ihre Privatsph\u00e4re, Ihre Wahl", "Wir verwenden notwendigen Speicher, um RideArrivo zu betreiben. Mit Ihrer Erlaubnis messen Meta Pixel sowie Werbe- und Analysetools von Google Besuche auf freigegebenen \u00f6ffentlichen Seiten und helfen uns, unsere Werbung zu verstehen und zu verbessern. Sie k\u00f6nnen Marketing ablehnen und die Website weiter nutzen oder Ihre Wahl sp\u00e4ter \u00e4ndern.", "Marketing akzeptieren", "Marketing ablehnen", "Cookie-Einstellungen", "Datenschutzerkl\u00e4rung", "Schlie\u00dfen", "Global Privacy Control ist in Ihrem Browser aktiviert. Marketing-Tracking bleibt ausgeschaltet.", "Ihre Cookie-Einstellung wurde gespeichert."],
    es: ["Tu privacidad, tu decisi\u00f3n", "Usamos almacenamiento esencial para que RideArrivo funcione. Con tu permiso, Meta Pixel y las herramientas de publicidad y anal\u00edtica de Google miden las visitas a p\u00e1ginas p\u00fablicas aprobadas y nos ayudan a entender y mejorar nuestra publicidad. Puedes rechazar el marketing y seguir usando el sitio, o cambiar tu decisi\u00f3n m\u00e1s adelante.", "Aceptar marketing", "Rechazar marketing", "Preferencias de cookies", "Pol\u00edtica de privacidad", "Cerrar", "La se\u00f1al Global Privacy Control de tu navegador est\u00e1 activada. El seguimiento de marketing permanece desactivado.", "Se ha guardado tu preferencia de cookies."],
    pt: ["Sua privacidade, sua escolha", "Usamos armazenamento essencial para o funcionamento do RideArrivo. Com sua permiss\u00e3o, o Meta Pixel e as ferramentas de publicidade e an\u00e1lise do Google medem visitas \u00e0s p\u00e1ginas p\u00fablicas aprovadas e nos ajudam a entender e melhorar nossa publicidade. Voc\u00ea pode recusar o marketing e continuar usando o site, ou mudar sua escolha depois.", "Aceitar marketing", "Recusar marketing", "Prefer\u00eancias de cookies", "Pol\u00edtica de privacidade", "Fechar", "O sinal Global Privacy Control do seu navegador est\u00e1 ativado. O rastreamento de marketing permanece desativado.", "Sua prefer\u00eancia de cookies foi salva."]
  };

  function parseRecord(raw) {
    try {
      var value = JSON.parse(raw);
      if (!value || value.version !== 1 || typeof value.marketing !== "boolean" ||
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
  function clearMarketingCookies() {
    var domains = [""];
    if (/(^|\.)ridearrivo\.com$/.test(window.location.hostname)) {
      domains.push("; Domain=" + window.location.hostname, "; Domain=ridearrivo.com");
    }
    ["_fbp", "_fbc"].forEach(function (name) {
      domains.forEach(function (domain) {
        try { document.cookie = name + "=; Max-Age=0; Path=/; SameSite=Lax" + domain + (window.location.protocol === "https:" ? "; Secure" : ""); } catch (e) {}
      });
    });
  }
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

  function googleConsent(command, granted) {
    window.dataLayer = window.dataLayer || [];

    if (typeof window.gtag !== "function") {
      window.gtag = function () { window.dataLayer.push(arguments); };
    }

    window.gtag("consent", command, {
      ad_storage: granted ? "granted" : "denied",
      analytics_storage: granted ? "granted" : "denied",
      ad_user_data: granted ? "granted" : "denied",
      ad_personalization: granted ? "granted" : "denied"
    });
  }

  function clearGoogleMarketingCookies() {
    var domains = [""];

    if (/(^|\.)ridearrivo\.com$/.test(window.location.hostname)) {
      domains.push(
        "; Domain=" + window.location.hostname,
        "; Domain=ridearrivo.com"
      );
    }

    var names = [];
    try {
      document.cookie.split(";").forEach(function (part) {
        var name = part.split("=")[0].trim();

        if (
          name === "_gid" ||
          name.indexOf("_ga") === 0 ||
          name.indexOf("_gat") === 0 ||
          name.indexOf("_gcl") === 0
        ) {
          names.push(name);
        }
      });
    } catch (e) {}

    names.forEach(function (name) {
      domains.forEach(function (domain) {
        try {
          document.cookie =
            name +
            "=; Max-Age=0; Path=/; SameSite=Lax" +
            domain +
            (window.location.protocol === "https:" ? "; Secure" : "");
        } catch (e) {}
      });
    });
  }

  function startGoogle() {
    if (!allowed()) return;

    /*
     * Basic Google Consent Mode:
     * nothing from Google Tag Manager is requested before marketing consent.
     * Defaults and the granted update are queued before the container loads.
     */
    if (googleStarted) {
      googleConsent("update", true);
      return;
    }

    googleStarted = true;

    googleConsent("default", false);
    googleConsent("update", true);

    window.dataLayer.push({
      event: "ridearrivo_marketing_consent_granted"
    });

    /*
     * The standard container snippet pushes this just before loading gtm.js.
     * Without it GTM's built-in "All Pages" / "Page View" triggers never fire,
     * so GA4 and any page-view tag stay silent even though the container loads.
     */
    window.dataLayer.push({
      "gtm.start": Date.now(),
      event: "gtm.js"
    });

    googleScript = document.createElement("script");
    googleScript.id = "ra-google-tag-manager";
    googleScript.async = true;
    googleScript.referrerPolicy = "no-referrer";
    googleScript.src =
      "https://www.googletagmanager.com/gtm.js?id=" +
      encodeURIComponent(GTM_ID);

    googleScript.onerror = function () {
      googleStarted = false;

      if (googleScript && googleScript.parentNode) {
        googleScript.parentNode.removeChild(googleScript);
      }

      googleScript = null;
    };

    document.head.appendChild(googleScript);
  }

  function revokeGoogle() {
    if (googleStarted && typeof window.gtag === "function") {
      googleConsent("update", false);
    }

    clearGoogleMarketingCookies();
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
    if (allowed()) {
      startSdk();
      startGoogle();
    } else {
      if (sdkOwned && (sdkGranted || !sdkReady)) window.fbq("consent", "revoke");
      sdkGranted = false;
      clearMarketingCookies();
      revokeGoogle();
    }
    scheduleExpiry();
    if (banner) {
      translate();
      if (!validRecord() && isPublicPath(window.location.pathname)) banner.hidden = false;
    }
  }
  function choose(marketing) {
    if (marketing && gpcEnabled()) return;
    record = { version: 1, marketing: marketing, updatedAt: Date.now() };
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
      return { marketing: allowed(), choice: choice ? choice.marketing : null,
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
