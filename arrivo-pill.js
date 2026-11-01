/* RideArrivo pill: the one header used on every page.
   - A glass pill that condenses on scroll, like the phone's Dynamic Island.
   - A small circle on the side always shows which page you are on (icon), and
     briefly opens to say its name when the page loads or when you tap it.
   - Phone: the same pill, with a menu sheet that drops from it.
   Self-contained: its own small dictionary, so it works on every page whether
   or not the big i18n.js is loaded. */
(function () {
  "use strict";

  var pill = document.querySelector("[data-ra-pill]");
  if (!pill) return;

  var KEY = "arrivo_site_lang";
  var SUPPORTED = ["en", "fr", "zh", "hi", "de", "es", "pt", "ar", "tr"];
  var LABELS = { en: "EN", fr: "FR", zh: "中文", hi: "हि", de: "DE", es: "ES", pt: "PT", ar: "ع", tr: "TR" };

  // Words used only by the pill. Order: en fr zh hi de es pt ar tr.
  var W = {
    ride: ["Ride", "Course", "出行", "सवारी", "Fahrt", "Viaje", "Viagem", "رحلة", "Yolculuk"],
    move: ["Move", "Déménager", "搬家", "शिफ्ट", "Umzug", "Mudanza", "Mudança", "نقل", "Taşınma"],
    charter: ["Charter", "Affrètement", "包租", "चार्टर", "Charter", "Chárter", "Fretamento", "تأجير", "Kiralama"],
    business: ["Business", "Entreprise", "企业", "बिज़नेस", "Business", "Empresas", "Empresas", "الأعمال", "Kurumsal"],
    book: ["Book a ride", "Réserver", "预订", "बुक करें", "Buchen", "Reservar", "Reservar", "احجز", "Rezervasyon"],
    login: ["Log in", "Connexion", "登录", "लॉग इन", "Anmelden", "Entrar", "Entrar", "دخول", "Giriş"],
    account: ["Account", "Compte", "账户", "खाता", "Konto", "Cuenta", "Conta", "حسابي", "Hesabım"],
    menu: ["Menu", "Menu", "菜单", "मेन्यू", "Menü", "Menú", "Menu", "القائمة", "Menü"],
    here: ["You are on", "Vous êtes sur", "当前页面", "आप यहाँ हैं", "Sie sind auf", "Estás en", "Você está em", "أنت في", "Şu an"],
    p_home: ["Home", "Accueil", "首页", "होम", "Start", "Inicio", "Início", "الرئيسية", "Ana sayfa"],
    p_book: ["Book", "Réserver", "预订", "बुकिंग", "Buchen", "Reservar", "Reservar", "الحجز", "Rezervasyon"],
    p_express: ["Express", "Express", "快车", "एक्सप्रेस", "Express", "Express", "Express", "إكسبريس", "Ekspres"],
    p_chauffeur: ["Chauffeur", "Chauffeur", "专车司机", "शोफ़र", "Chauffeur", "Chófer", "Motorista", "سائق خاص", "Şoför"],
    p_account: ["Account", "Compte", "账户", "खाता", "Konto", "Cuenta", "Conta", "حسابي", "Hesabım"],
    p_signin: ["Sign in", "Connexion", "登录", "साइन इन", "Anmelden", "Acceder", "Entrar", "تسجيل الدخول", "Giriş"],
    p_track: ["Track", "Suivi", "追踪", "ट्रैक", "Tracking", "Seguimiento", "Rastreio", "تتبع", "Takip"],
    p_drive: ["Drive", "Conduire", "司机", "ड्राइवर", "Fahren", "Conducir", "Dirigir", "قيادة", "Sürücü"],
    p_scan: ["Scan", "Scanner", "扫码", "स्कैन", "Scannen", "Escanear", "Digitalizar", "مسح", "Tara"],
    p_help: ["Help", "Aide", "帮助", "मदद", "Hilfe", "Ayuda", "Ajuda", "مساعدة", "Yardım"],
    p_legal: ["Legal", "Légal", "法律", "कानूनी", "Rechtliches", "Legal", "Legal", "قانوني", "Yasal"],
    p_other: ["RideArrivo", "RideArrivo", "RideArrivo", "RideArrivo", "RideArrivo", "RideArrivo", "RideArrivo", "RideArrivo", "RideArrivo"]
  };

  // One simple line icon per page (24px grid, stroke only).
  var ICONS = {
    home: '<path d="M4 11l8-6.5 8 6.5v8.5h-5.4v-5.2H9.4v5.2H4z"/>',
    book: '<path d="M5 15h14l-1.4-5.2A2.5 2.5 0 0 0 15.2 8H8.8a2.5 2.5 0 0 0-2.4 1.8z"/><path d="M4 15v3.5M20 15v3.5M7.5 18.5h9"/><circle cx="8" cy="12.4" r=".6"/><circle cx="16" cy="12.4" r=".6"/>',
    express: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
    chauffeur: '<path d="M12 3l7 2.6v5.4c0 4.4-3 7.8-7 9-4-1.2-7-4.6-7-9V5.6z"/><path d="M9 12l2 2 4-4"/>',
    account: '<circle cx="12" cy="8.5" r="3.4"/><path d="M5 20c1.2-3.6 3.8-5.4 7-5.4s5.8 1.8 7 5.4"/>',
    signin: '<rect x="5" y="10.5" width="14" height="9.5" rx="2.4"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    track: '<path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 0 0-13 0c0 5.4 6.5 11 6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    drive: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.2"/><path d="M3.8 10.6c3 .3 5.2.7 6.2 1.4M20.2 10.6c-3 .3-5.2.7-6.2 1.4M12 14.2V20.5"/>',
    scan: '<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16M4 12h16"/>',
    help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.6 2.6 0 1 1 3.7 2.4c-.9.5-1.3 1-1.3 2M12 17h.01"/>',
    legal: '<path d="M7 3.5h7l4 4V20.5H7z"/><path d="M14 3.5v4h4M9.5 12h6M9.5 15.5h6"/>',
    other: '<circle cx="12" cy="12" r="8.5"/>'
  };

  function lang() {
    var v = "en";
    try { v = localStorage.getItem(KEY) || ""; } catch (e) {}
    if (SUPPORTED.indexOf(v) === -1) {
      var h = (document.documentElement.lang || "").slice(0, 2);
      v = SUPPORTED.indexOf(h) !== -1 ? h : "";
    }
    if (!v) {
      var n = (navigator.language || "en").slice(0, 2);
      v = SUPPORTED.indexOf(n) !== -1 ? n : "en";
    }
    return v;
  }
  function word(key, l) {
    var row = W[key];
    if (!row) return "";
    var i = SUPPORTED.indexOf(l || lang());
    return row[i < 0 ? 0 : i] || row[0];
  }

  var page = pill.getAttribute("data-page") || "other";
  var here = pill.querySelector("[data-ra-here]");
  var hereLabel = pill.querySelector("[data-ra-here-label]");
  var peekTimer = 0;

  function paintWords() {
    var l = lang();
    pill.querySelectorAll("[data-ra]").forEach(function (el) {
      var t = word(el.getAttribute("data-ra"), l);
      if (t) el.textContent = t;
    });
    var name = word("p_" + page, l) || word("p_other", l);
    if (hereLabel) hereLabel.textContent = name;
    if (here) here.setAttribute("aria-label", word("here", l) + ": " + name);
    var toggle = document.getElementById("raMenuToggle");
    if (toggle) toggle.setAttribute("aria-label", word("menu", l));
    var trig = document.getElementById("langTriggerLabel");
    if (trig) trig.textContent = LABELS[l] || l.toUpperCase();
    pill.querySelectorAll(".ra-lang-opt").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-lang") === l);
    });
  }

  function paintIcon() {
    var svg = pill.querySelector("[data-ra-here-icon]");
    if (svg) svg.innerHTML = ICONS[page] || ICONS.other;
  }

  // The circle opens for a moment to name the page, then tucks back in.
  function peek(ms) {
    if (!here) return;
    here.classList.add("is-peek");
    clearTimeout(peekTimer);
    peekTimer = setTimeout(function () { here.classList.remove("is-peek"); }, ms || 2400);
  }

  // ---- account link: same rule the old header used --------------------------
  function paintAccount() {
    var signedIn = false;
    try { signedIn = !!localStorage.getItem("arrivo_rider_token"); } catch (e) {}
    var dest = signedIn ? "account.html" : "login.html";
    var label = word(signedIn ? "account" : "login");
    ["accountNavLink", "accountNavLinkMobile"].forEach(function (id) {
      var a = document.getElementById(id);
      if (!a) return;
      var cur = a.getAttribute("href") || "";
      // Pages on other hosts (ArrivoExpress) set an absolute link themselves.
      if (!/^https?:/.test(cur)) a.setAttribute("href", dest);
    });
    ["accountNavLabel", "accountNavLabelMobile"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = label;
    });
  }

  // ---- language ------------------------------------------------------------
  function getNested(obj, path) {
    return path.split(".").reduce(function (a, k) { return a && a[k]; }, obj);
  }
  function setLang(l) {
    try { localStorage.setItem(KEY, l); } catch (e) {}
    document.documentElement.lang = l;
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    // Pages that carry their own dictionary (the home page) re-apply it here.
    if (typeof I18N !== "undefined") {
      var d = I18N[l] || I18N.en;
      document.querySelectorAll("[data-i18n]").forEach(function (el) {
        var v = getNested(d, el.getAttribute("data-i18n"));
        if (v != null) el.innerHTML = v;
      });
    }
    paintWords();
    paintAccount();
    closeLang();
  }
  var langBox = document.getElementById("raLang");
  var langBtn = document.getElementById("raLangBtn");
  var langMenu = document.getElementById("raLangMenu");
  function closeLang() {
    if (!langMenu) return;
    langMenu.hidden = true;
    if (langBtn) langBtn.setAttribute("aria-expanded", "false");
  }
  if (langBtn && langMenu) {
    langBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = langMenu.hidden;
      langMenu.hidden = !open;
      langBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function (e) { if (langBox && !langBox.contains(e.target)) closeLang(); });
  }
  pill.querySelectorAll(".ra-lang-opt").forEach(function (b) {
    b.addEventListener("click", function () { setLang(b.getAttribute("data-lang")); });
  });

  // ---- phone menu sheet ----------------------------------------------------
  var toggle = document.getElementById("raMenuToggle");
  var sheet = document.getElementById("raMenu");
  var backdrop = document.getElementById("raBackdrop");
  function setMenu(open) {
    if (!toggle || !sheet) return;
    sheet.hidden = !open;
    if (backdrop) backdrop.hidden = !open;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    pill.classList.toggle("is-open", open);
    document.documentElement.classList.toggle("ra-menu-open", open);
    if (open) closeLang();
  }
  if (toggle && sheet) {
    toggle.addEventListener("click", function (e) { e.stopPropagation(); setMenu(sheet.hidden); });
    sheet.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    if (backdrop) backdrop.addEventListener("click", function () { setMenu(false); });
    document.addEventListener("click", function (e) { if (!sheet.hidden && !pill.contains(e.target)) setMenu(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { if (!sheet.hidden) { setMenu(false); toggle.focus(); } closeLang(); }
    });
    var mq = window.matchMedia ? window.matchMedia("(min-width: 900px)") : null;
    if (mq && mq.addEventListener) mq.addEventListener("change", function (e) { if (e.matches) setMenu(false); });
  }

  // Click anywhere on the island (not on a link or button) to open or close it.
  var bar = pill.querySelector(".ra-pill__bar");
  function islandMode() {
    return !window.matchMedia || window.matchMedia("(max-width: 899px)").matches || pill.classList.contains("is-condensed");
  }
  if (bar && toggle && sheet) {
    bar.addEventListener("click", function (e) {
      if (e.target.closest("a, button, .ra-pill__langmenu")) return;
      if (islandMode()) setMenu(sheet.hidden);
    });
  }

  // ---- scroll: condense, like the island shrinking --------------------------
  var raf = 0;
  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      var was = pill.classList.contains("is-condensed");
      var now = (window.scrollY || 0) > 28;
      pill.classList.toggle("is-condensed", now);
      // Back at the top on a wide screen the full pill returns, so close the sheet.
      if (was && !now && sheet && !sheet.hidden && window.matchMedia && window.matchMedia("(min-width: 900px)").matches) setMenu(false);
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  if (here) {
    here.addEventListener("click", function (e) {
      if (here.getAttribute("href") === "#" ) e.preventDefault();
      peek(2400);
    });
    here.addEventListener("focus", function () { peek(2400); });
  }

  // Home page: when a chooser tab is picked, the circle says so.
  document.addEventListener("arrivo:intent", function (e) {
    if (page !== "home" || !hereLabel) return;
    var k = e.detail && e.detail.intent;
    if (k && W[k]) { hereLabel.textContent = word(k); peek(2000); setTimeout(function () { hereLabel.textContent = word("p_home"); }, 2100); }
  });

  paintIcon();
  paintWords();
  paintAccount();
  window.addEventListener("load", function () { paintAccount(); peek(2600); });
  // Other scripts switch <html lang>; keep the pill in step.
  new MutationObserver(function () { paintWords(); paintAccount(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  onScroll();
})();
