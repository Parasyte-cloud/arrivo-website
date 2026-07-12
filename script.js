(function () {
  "use strict";

  // Point this at your deployed backend once it's live somewhere public
  // (Render/Railway/Fly.io — see arrivo-backend's README). Until then this
  // only works when testing the site locally alongside a locally-running backend.
  var API_BASE_URL = "http://localhost:4000";

  // ───────────────────────── i18n ─────────────────────────
  var LANG_KEY = "arrivo_site_lang";

  function getNested(obj, path) {
    return path.split(".").reduce(function (acc, key) { return acc && acc[key]; }, obj);
  }

  var SUPPORTED_LANGS = ["en", "fr", "zh", "hi", "de", "es", "pt"];
  var LANG_LABELS = { en: "EN", fr: "FR", zh: "中文", hi: "हि", de: "DE", es: "ES", pt: "PT" };

  function applyLanguage(lang) {
    var dict = I18N[lang] || I18N.en;
    document.documentElement.lang = lang;

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var value = getNested(dict, el.getAttribute("data-i18n"));
      if (value == null) return;
      // A handful of strings intentionally contain <br> for line breaks in
      // the headline — safe here since every value comes from our own
      // hardcoded dictionary above, never from user input.
      el.innerHTML = value;
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var value = getNested(dict, el.getAttribute("data-i18n-placeholder"));
      if (value != null) el.setAttribute("placeholder", value);
    });

    document.querySelectorAll(".lang-opt").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
    });

    var label = document.getElementById("langTriggerLabel");
    if (label) label.textContent = LANG_LABELS[lang] || lang.toUpperCase();

    localStorage.setItem(LANG_KEY, lang);
  }

  function closeLangMenu() {
    var dropdown = document.getElementById("langDropdown");
    var menu = document.getElementById("langMenu");
    var trigger = document.getElementById("langTrigger");
    if (!dropdown || !menu) return;
    dropdown.classList.remove("open");
    menu.hidden = true;
    if (trigger) trigger.setAttribute("aria-expanded", "false");
  }

  function initLanguage() {
    var saved = localStorage.getItem(LANG_KEY);
    var browserLang = (navigator.language || "en").slice(0, 2);
    var detected = SUPPORTED_LANGS.indexOf(browserLang) !== -1 ? browserLang : "en";
    applyLanguage(saved || detected);

    document.querySelectorAll(".lang-opt").forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyLanguage(btn.getAttribute("data-lang"));
        closeLangMenu();
      });
    });

    var dropdown = document.getElementById("langDropdown");
    var trigger = document.getElementById("langTrigger");
    var menu = document.getElementById("langMenu");
    if (!dropdown || !trigger || !menu) return;

    trigger.addEventListener("click", function (e) {
      e.stopPropagation();
      var isOpen = dropdown.classList.toggle("open");
      menu.hidden = !isOpen;
      trigger.setAttribute("aria-expanded", String(isOpen));
    });

    document.addEventListener("click", function (e) {
      if (!dropdown.contains(e.target)) closeLangMenu();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeLangMenu();
    });
  }

  // ───────────────────────── Waitlist form ─────────────────────────
  function initWaitlistForm() {
    var form = document.getElementById("waitlistForm");
    var note = document.getElementById("formNote");
    var honeypot = document.getElementById("waitlistHoneypot");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var lang = SUPPORTED_LANGS.indexOf(document.documentElement.lang) !== -1 ? document.documentElement.lang : "en";

      // Honeypot: real visitors never fill this hidden field in; bots often do.
      if (honeypot && honeypot.value) return;

      var email = document.getElementById("waitlistEmail").value.trim();
      var submitBtn = form.querySelector("button[type=submit]");
      var originalLabel = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = "…";

      fetch(API_BASE_URL + "/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, source: "website" }),
      })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (result) {
          if (note) {
            note.textContent = result.ok ? I18N[lang].download.thanks : (result.data.error || "Something went wrong.");
            note.style.color = result.ok ? "var(--teal)" : "var(--coral)";
            note.style.fontWeight = "600";
          }
          if (result.ok) form.reset();
        })
        .catch(function () {
          if (note) {
            note.textContent = "Couldn't reach the server — please try again in a moment.";
            note.style.color = "var(--coral)";
            note.style.fontWeight = "600";
          }
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
        });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    // Homepage account link: shows "Register or Login" for a first-time
    // visitor, or routes straight to their profile if they're already
    // signed in — checked fresh on every load, not cached in the markup.
    function initAccountNav() {
      var isLoggedIn = !!localStorage.getItem("arrivo_rider_token");
      var dest = isLoggedIn ? "account.html" : "login.html";
      var label = isLoggedIn ? "My Account" : "Register or Login";

      [
        { link: "accountNavLink", text: "accountNavLabel" },
        { link: "accountNavLinkMobile", text: "accountNavLabelMobile" },
      ].forEach(function (ids) {
        var linkEl = document.getElementById(ids.link);
        var textEl = document.getElementById(ids.text);
        if (linkEl) linkEl.href = dest;
        if (textEl) textEl.textContent = label;
      });
    }

    function initMobileNav() {
      var toggle = document.getElementById("mobileNavToggle");
      var menu = document.getElementById("mobileNavMenu");
      var closeBtn = document.getElementById("mobileNavClose");
      var backdrop = document.getElementById("mobileNavBackdrop");
      if (!toggle || !menu) return;

      function openMenu() {
        menu.hidden = false;
        if (backdrop) backdrop.hidden = false;
        toggle.classList.add("is-open");
        toggle.setAttribute("aria-expanded", "true");
      }
      function closeMenu() {
        menu.hidden = true;
        if (backdrop) backdrop.hidden = true;
        toggle.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }

      toggle.addEventListener("click", function () {
        if (menu.hidden) openMenu(); else closeMenu();
      });
      if (closeBtn) closeBtn.addEventListener("click", closeMenu);
      if (backdrop) backdrop.addEventListener("click", closeMenu);

      // Close the menu after tapping a link — otherwise it stays open
      // sitting over the section the visitor just navigated to.
      menu.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", closeMenu);
      });

      document.addEventListener("click", function (e) {
        if (!menu.hidden && !menu.contains(e.target) && !toggle.contains(e.target)) {
          closeMenu();
        }
      });
    }

    function safeRun(fn, label) {
      try {
        fn();
      } catch (err) {
        console.error("[arrivo site] " + label + " failed:", err);
      }
    }
    safeRun(initLanguage, "initLanguage");
    safeRun(initMobileNav, "initMobileNav");
    safeRun(initAccountNav, "initAccountNav");
    safeRun(initWaitlistForm, "initWaitlistForm");
  });
})();
