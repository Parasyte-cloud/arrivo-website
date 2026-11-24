/* RideArrivo main-site optional-cookie consent. Meta Pixel and Google Tag
 * Manager (which runs Google Analytics 4) sit behind the same accept/reject
 * choice and the same page, origin, URL and Global Privacy Control rules. Neither
 * is requested before consent. See docs/META-PIXEL.md and docs/GA4-ANALYTICS.md
 * before adding a page, event, tag or third-party integration.
 */
(function (window, document) {
  "use strict";
  if (window.RideArrivoPrivacy) return;

  var PIXEL_ID = "956256323771727";
  // Google Tag Manager container. It is injected here, only after consent, and
  // NEVER pasted into the HTML heads (that would load Google before any choice).
  // The GA4 tag for the stream below lives inside this container.
  var GTM_ID = "GTM-WZ6Q7LPT";
  // GA4 web stream "RideArrivo Website". Only used here to name and remove its
  // cookies and to switch it off on withdrawal; the tag itself is in GTM.
  var GA_ID = "G-CL4Y16M64E";
  // Version 3 = the choice now also covers advertising tags run through Tag
  // Manager (Google advertising, TikTok). Version 1 (Meta only) and version 2
  // (analytics only) records are refused, so every visitor is asked again.
  var RECORD_VERSION = 3;
  var STORAGE_KEY = "arrivo_marketing_consent_v1";
  var MAX_AGE = 180 * 24 * 60 * 60 * 1000;
  var EXPRESS_ORIGIN = "https://express.ridearrivo.com";
  var PRODUCTION_ORIGINS = ["https://www.ridearrivo.com", "https://ridearrivo.com", EXPRESS_ORIGIN];
  // The Express site is its own deployment, so its pages are listed on their own.
  // "/" and "/express" are the ad landing page. Nothing typed into the booking
  // form ever reaches the URL, and the same URL filters below still apply.
  var EXPRESS_PAGES = ["/", "/index", "/express", "/privacy", "/terms"];
  // One choice for every ridearrivo.com site. localStorage is per origin, so the
  // choice is also kept in a first-party cookie on .ridearrivo.com. It holds the
  // same record as localStorage and nothing else about the visitor.
  var SHARED_KEY = "arrivo_mc";
  // One-time hand-off for the "registration completed" conversion. The signup page
  // is not a tracked page, so it only leaves this note (a random id and a time,
  // no personal data) and the next approved page sends the event.
  var REG_KEY = "arrivo_reg";
  var REG_MAX_AGE = 15 * 60;
  // Authenticated booking, account, driver, payment and tracking flows are NOT
  // marketing pages. New paths are off until deliberately reviewed here.
  var PUBLIC_PAGES = ["/", "/index", "/hello", "/contact-us", "/charter-booking", "/privacy", "/terms"];
  var SAFE_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id", "fbclid", "gclid", "ttclid", "theme", "lang", "src"];
  var SAFE_ANCHORS = ["", "how", "audiences", "safety", "contact", "fleet", "services", "drive", "business", "choose", "main", "cookie-preferences", "cookies", "top", "faq"];
  var record = readRecord();
  var sdkStarted = false, sdkReady = false, sdkOwned = false;
  var initialized = false, pageViewSent = false, sdkGranted = false;
  var regMetaSent = false, regGtmSent = false;
  var gtmStarted = false, gtmReady = false, gtmOwned = false, gtmGranted = false, gtmEventSent = false;
  var timer = null, banner, settings, accept, reject, close, message, status;
  var previousFocus = null;

  // Kept local so every page has translated choices without loading i18n.js.
  // Order: title, explanation, accept, reject, preferences, privacy, close,
  // browser opt-out explanation, saved announcement.
  var COPY = {
    en: ["Your privacy, your choice", "We use essential storage to run RideArrivo. With your permission, Google Analytics counts visits to our public pages, and advertising partners (Meta, Google and TikTok) help us measure and personalise ads. You can reject optional cookies and still use the site, or change your choice later.", "Accept optional cookies", "Reject optional cookies", "Cookie preferences", "Privacy policy", "Close", "Your browser's Global Privacy Control signal is on. Optional tracking stays off.", "Your cookie preference has been saved."],
    fr: ["Votre vie privée, votre choix", "Nous utilisons le stockage essentiel pour faire fonctionner RideArrivo. Avec votre accord, Google Analytics compte les visites de nos pages publiques, et des partenaires publicitaires (Meta, Google et TikTok) nous aident à mesurer et personnaliser les publicités. Vous pouvez refuser les cookies facultatifs et utiliser le site, ou modifier votre choix plus tard.", "Accepter les cookies facultatifs", "Refuser les cookies facultatifs", "Préférences des cookies", "Politique de confidentialité", "Fermer", "Le signal Global Privacy Control de votre navigateur est activé. Le suivi facultatif reste désactivé.", "Votre choix de cookies a été enregistré."],
    zh: ["您的隐私，由您选择", "RideArrivo 使用必要的存储来运行网站。经您同意，Google Analytics 会统计公开页面的访问，广告合作伙伴（Meta、Google 和 TikTok）会帮助我们衡量并个性化广告。您可以拒绝可选 Cookie 并继续使用网站，或稍后更改选择。", "接受可选 Cookie", "拒绝可选 Cookie", "Cookie 偏好", "隐私政策", "关闭", "您的浏览器已启用 Global Privacy Control。可选跟踪保持关闭。", "已保存您的 Cookie 偏好。"],
    hi: ["आपकी निजता, आपकी पसंद", "RideArrivo चलाने के लिए हम आवश्यक स्टोरेज का उपयोग करते हैं। आपकी अनुमति से Google Analytics सार्वजनिक पृष्ठों की विज़िट गिनता है, और विज्ञापन साझेदार (Meta, Google और TikTok) विज्ञापनों को मापने और व्यक्तिगत बनाने में हमारी मदद करते हैं। आप वैकल्पिक कुकीज़ अस्वीकार करके भी साइट का उपयोग कर सकते हैं, या बाद में अपना विकल्प बदल सकते हैं।", "वैकल्पिक कुकी स्वीकार करें", "वैकल्पिक कुकी अस्वीकार करें", "कुकी पसंद", "गोपनीयता नीति", "बंद करें", "आपके ब्राउज़र में Global Privacy Control चालू है। वैकल्पिक ट्रैकिंग बंद रहेगी।", "आपकी कुकी पसंद सहेज दी गई है।"],
    de: ["Ihre Privatsphäre, Ihre Wahl", "Wir verwenden notwendigen Speicher, um RideArrivo zu betreiben. Mit Ihrer Erlaubnis zählt Google Analytics Besuche auf unseren öffentlichen Seiten, und Werbepartner (Meta, Google und TikTok) helfen uns, Anzeigen zu messen und zu personalisieren. Sie können optionale Cookies ablehnen und die Website trotzdem nutzen oder Ihre Wahl später ändern.", "Optionale Cookies akzeptieren", "Optionale Cookies ablehnen", "Cookie-Einstellungen", "Datenschutzerklärung", "Schließen", "Global Privacy Control ist in Ihrem Browser aktiviert. Optionales Tracking bleibt ausgeschaltet.", "Ihre Cookie-Einstellung wurde gespeichert."],
    es: ["Tu privacidad, tu decisión", "Usamos almacenamiento esencial para que RideArrivo funcione. Con tu permiso, Google Analytics cuenta las visitas a nuestras páginas públicas y socios publicitarios (Meta, Google y TikTok) nos ayudan a medir y personalizar los anuncios. Puedes rechazar las cookies opcionales y seguir usando el sitio, o cambiar tu elección más tarde.", "Aceptar cookies opcionales", "Rechazar cookies opcionales", "Preferencias de cookies", "Política de privacidad", "Cerrar", "La señal Global Privacy Control de tu navegador está activada. El seguimiento opcional permanece desactivado.", "Se ha guardado tu preferencia de cookies."],
    pt: ["Sua privacidade, sua escolha", "Usamos armazenamento essencial para o RideArrivo funcionar. Com a sua permissão, o Google Analytics conta as visitas às nossas páginas públicas e parceiros de publicidade (Meta, Google e TikTok) nos ajudam a medir e personalizar anúncios. Você pode recusar os cookies opcionais e continuar usando o site, ou mudar sua escolha depois.", "Aceitar cookies opcionais", "Recusar cookies opcionais", "Preferências de cookies", "Política de privacidade", "Fechar", "O sinal Global Privacy Control do seu navegador está ativado. O rastreamento opcional permanece desativado.", "Sua preferência de cookies foi salva."]
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
  function sharedDomain() {
    return /(^|\.)ridearrivo\.com$/.test(window.location.hostname) ? "; Domain=.ridearrivo.com" : "";
  }
  function readCookie(name) {
    try {
      var m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
      return m ? decodeURIComponent(m[1]) : null;
    } catch (e) { return null; }
  }
  function writeCookie(name, value, maxAge) {
    try {
      document.cookie = name + "=" + encodeURIComponent(value) + "; Max-Age=" + maxAge + "; Path=/; SameSite=Lax" +
        sharedDomain() + (window.location.protocol === "https:" ? "; Secure" : "");
    } catch (e) {}
  }
  function dropCookie(name) {
    try {
      document.cookie = name + "=; Max-Age=0; Path=/; SameSite=Lax" + sharedDomain() + (window.location.protocol === "https:" ? "; Secure" : "");
    } catch (e) {}
  }
  // Newest valid choice wins between this origin's storage and the shared cookie.
  function readRecord() {
    var local = null, shared = null;
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      local = parseRecord(raw);
      if (raw !== null && !local) window.localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* storage may be blocked */ }
    var cookie = readCookie(SHARED_KEY);
    if (cookie !== null) {
      shared = parseRecord(cookie);
      if (!shared) dropCookie(SHARED_KEY);
    }
    var best = local;
    if (shared && (!best || shared.updatedAt > best.updatedAt)) {
      best = shared;
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(shared)); } catch (e) {}
    }
    return best;
  }
  function refreshAndSync() {
    record = readRecord();
    sync();
  }
  function validRecord() {
    return record && Date.now() - record.updatedAt < MAX_AGE ? record : null;
  }
  function gpcEnabled() { return window.navigator.globalPrivacyControl === true; }
  function isPublicPath(path) {
    try { path = decodeURIComponent(path); } catch (e) { return false; }
    path = path.replace(/\.html$/i, "").replace(/\/$/, "") || "/";
    var pages = window.location.origin === EXPRESS_ORIGIN ? EXPRESS_PAGES : PUBLIC_PAGES;
    return pages.indexOf(path) !== -1;
  }

  // Tag Assistant adds gtm_debug to the page URL while previewing. Permit that
  // single diagnostic parameter only when the navigation came from Tag Assistant.
  // All other unknown parameters remain blocked by the normal URL allowlist.
  function safeUrl(url, allowTagAssistantDebug) {
    try {
      var parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
      if (parsed.username || parsed.password) return false;
      var safe = true;
      parsed.searchParams.forEach(function (value, key) {
        var allowedParam = SAFE_PARAMS.indexOf(key) !== -1 ||
          (allowTagAssistantDebug === true && key === "gtm_debug");
        if (!allowedParam || value.length > 512 || !/^[a-zA-Z0-9 _.,:\\/-]*$/.test(value)) safe = false;
      });
      return safe && SAFE_ANCHORS.indexOf(parsed.hash.slice(1)) !== -1;
    } catch (e) { return false; }
  }
  function eligible() {
    if (window.self !== window.top || PRODUCTION_ORIGINS.indexOf(window.location.origin) === -1 ||
        !isPublicPath(window.location.pathname)) return false;

    var fromTagAssistant = false;
    if (document.referrer) {
      if (!safeUrl(document.referrer)) return false;
      try {
        var from = new URL(document.referrer);
        fromTagAssistant = from.origin === "https://tagassistant.google.com";
        if ((PRODUCTION_ORIGINS.indexOf(from.origin) !== -1 || from.origin === window.location.origin) &&
            !isPublicPath(from.pathname)) return false;
      } catch (e) { return false; }
    }

    return safeUrl(window.location.href, fromTagAssistant);
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
  // Meta, Google advertising (_gcl_*) and TikTok (_ttp) cookies set by the pixel
  // and by advertising tags in the container.
  function clearMarketingCookies() { expireCookies(["_fbp", "_fbc", "_gcl_au", "_gcl_aw", "_gcl_dc", "_gcl_gb", "_ttp"]); }
  // GA4 names its cookies _ga and _ga_<measurement id without "G-">.
  function clearAnalyticsCookies() { expireCookies(["_ga", "_gid", "_gat", "_ga_" + GA_ID.replace(/^G-/, "")]); }
  // ---- registration conversion -------------------------------------------
  // Flow: signup page calls queueRegistration() right after a new account is
  // created. The next approved page (home, or Express) finds the note, and if
  // consent is still granted sends CompleteRegistration to Meta and a
  // dataLayer event for Tag Manager (TikTok and Google tags listen for it).
  // The note is removed as soon as it is used, or on rejection, or after 15 min.
  function newEventId() {
    var a = new Uint8Array(12);
    try { window.crypto.getRandomValues(a); } catch (e) { for (var i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256); }
    return Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  }
  function pendingRegistration() {
    var raw = readCookie(REG_KEY);
    if (!raw) return null;
    var parts = raw.split(".");
    var at = Number(parts[1]);
    if (!/^[0-9a-f]{24}$/.test(parts[0] || "") || !Number.isFinite(at) || Date.now() - at > REG_MAX_AGE * 1000 || at > Date.now() + 60000) {
      dropCookie(REG_KEY);
      return null;
    }
    return { id: parts[0], at: at };
  }
  // Called BEFORE the signup request. Returns what the server needs to send the
  // same conversion from its side (Meta Conversions API, TikTok Events API), or
  // null when there is no live consent. The id is shared with queueRegistration
  // so Meta and TikTok can match the browser event and the server event.
  function prepareRegistration() {
    var choice = validRecord();
    if (!choice || !choice.marketing || gpcEnabled() || PRODUCTION_ORIGINS.indexOf(window.location.origin) === -1 || window.self !== window.top) return null;
    var out = { consent: true, eventId: newEventId(), url: window.location.origin + window.location.pathname };
    var fbp = readCookie("_fbp"), fbc = readCookie("_fbc"), ttp = readCookie("_ttp");
    if (fbp) out.fbp = fbp;
    if (fbc) out.fbc = fbc;
    if (ttp) out.ttp = ttp;
    return out;
  }
  function queueRegistration(eventId) {
    // Same rules as any tracking: a live "yes", no Global Privacy Control, real site.
    var choice = validRecord();
    if (!choice || !choice.marketing || gpcEnabled() || PRODUCTION_ORIGINS.indexOf(window.location.origin) === -1 || window.self !== window.top) return false;
    writeCookie(REG_KEY, (/^[0-9a-f]{24}$/.test(eventId || "") ? eventId : newEventId()) + "." + Date.now(), REG_MAX_AGE);
    return true;
  }
  function flushRegistration() {
    var pending = pendingRegistration();
    if (!pending) return;
    if (!allowed()) return; // Not an approved page right now. The note waits, or expires.
    if (sdkReady && sdkGranted && !regMetaSent) {
      regMetaSent = true;
      // eventID lets Meta de-duplicate this against a server-side copy later.
      window.fbq("track", "CompleteRegistration", {}, { eventID: pending.id });
    }
    if (gtmReady && gtmGranted && !regGtmSent) {
      regGtmSent = true;
      window.dataLayer.push({ event: "arrivo_registration", event_id: pending.id });
    }
    // Used once. Keep the note only while a started channel is still loading.
    if ((!sdkStarted || regMetaSent) && (!gtmStarted || regGtmSent)) dropCookie(REG_KEY);
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
    flushRegistration();
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
      gtmOwned = true;
      // gtag.js and GTM only understand the real `arguments` object, not an array.
      window.gtag = function () { window.dataLayer.push(arguments); };
    }
    return window.gtag;
  }
  function grantReadyGtm() {
    if (!gtmReady || !allowed()) return;
    window["ga-disable-" + GA_ID] = false;
    if (!gtmGranted) {
      // The one optional-cookies choice covers analytics and advertising, so all
      // four Consent Mode signals follow it. Each tag in the container still has
      // its own consent requirements (GA4 needs analytics_storage; advertising
      // tags need ad_storage and ad_user_data).
      window.gtag("consent", "update", { analytics_storage: "granted", ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" });
      gtmGranted = true;
    }
    if (!gtmEventSent) {
      // Starts the container once per document, after consent is granted. Its
      // Google tag then sends the single page_view; this file sends no events.
      gtmEventSent = true;
      window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    }
    flushRegistration();
  }
  function startGtm() {
    if (!allowed()) return;
    if (gtmReady) { grantReadyGtm(); return; }
    // Never initialise over another Tag Manager installation.
    if (gtmStarted || (window.google_tag_manager && window.google_tag_manager[GTM_ID]) || document.querySelector('script[src*="googletagmanager.com/gtm.js"]')) return;
    gtmStarted = true;
    var gtag = ensureGtag();
    // Consent Mode v2: everything denied until the checks below pass. The
    // container is not started (no gtm.js event) before the script has downloaded
    // and consent has been read again, so no tag can fire for a visitor who
    // rejected while it was loading.
    gtag("consent", "default", {
      ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied",
      analytics_storage: "denied", functionality_storage: "denied",
      personalization_storage: "denied", security_storage: "granted"
    });
    var script = document.createElement("script");
    script.id = "ra-gtm-sdk";
    script.async = true;
    script.referrerPolicy = "no-referrer";
    script.src = "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(GTM_ID);
    script.onload = function () {
      gtmReady = true;
      // Re-check after download: the visitor may have rejected while it loaded.
      if (allowed()) grantReadyGtm();
      else revokeGtm();
    };
    script.onerror = function () { gtmReady = false; }; // A blocker never breaks booking.
    document.head.appendChild(script);
  }
  function revokeGtm() {
    window["ga-disable-" + GA_ID] = true;
    if (gtmOwned && window.gtag && (gtmGranted || !gtmReady)) {
      window.gtag("consent", "update", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    }
    gtmGranted = false;
    clearAnalyticsCookies();
    clearMarketingCookies();
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
    if (allowed()) { startSdk(); startGtm(); }
    else {
      if (sdkOwned && (sdkGranted || !sdkReady)) window.fbq("consent", "revoke");
      sdkGranted = false;
      clearMarketingCookies();
      revokeGtm();
      // A "no" (or GPC) also cancels any registration note that was waiting.
      var c = validRecord();
      if ((c && !c.marketing) || gpcEnabled()) dropCookie(REG_KEY);
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
    writeCookie(SHARED_KEY, JSON.stringify(record), Math.floor(MAX_AGE / 1000));
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
    banner.dir = "ltr"; // the consent copy has no Arabic yet, so it is English and reads left to right
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
    prepareRegistration: prepareRegistration,
    queueRegistration: queueRegistration,
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
