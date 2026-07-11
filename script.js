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

  // ───────────────────── Hero landing animation ─────────────────────
  function initHeroAnimation() {
    var arc = document.getElementById("flightArc");
    var dot = document.getElementById("planeDot");
    if (!arc || !dot) return;

    var prefersReduced = typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    var length = arc.getTotalLength();
    arc.style.strokeDasharray = length;
    arc.style.strokeDashoffset = length;

    var duration = 1400; // ms
    var start = null;

    function frame(timestamp) {
      if (!start) start = timestamp;
      var progress = Math.min((timestamp - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 2); // ease-out

      arc.style.strokeDashoffset = String(length * (1 - eased));

      var point = arc.getPointAtLength(length * eased);
      dot.setAttribute("cx", point.x);
      dot.setAttribute("cy", point.y);

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        // Small "landing" bounce on the pin/phone once the arc completes.
        var phone = document.querySelector(".phone-frame");
        if (phone) {
          phone.style.transition = "transform 0.4s cubic-bezier(.34,1.56,.64,1)";
          phone.style.transform = "translateY(-6px)";
          setTimeout(function () { phone.style.transform = "translateY(0)"; }, 400);
        }
      }
    }

    requestAnimationFrame(frame);
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
    function initMobileNav() {
      var toggle = document.getElementById("mobileNavToggle");
      var menu = document.getElementById("mobileNavMenu");
      if (!toggle || !menu) return;

      toggle.addEventListener("click", function () {
        var isOpen = menu.hidden;
        menu.hidden = !isOpen;
        toggle.setAttribute("aria-expanded", String(isOpen));
      });

      // Close the menu after tapping a link — otherwise it stays open
      // sitting over the section the visitor just navigated to.
      menu.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
          menu.hidden = true;
          toggle.setAttribute("aria-expanded", "false");
        });
      });

      document.addEventListener("click", function (e) {
        if (!menu.hidden && !menu.contains(e.target) && !toggle.contains(e.target)) {
          menu.hidden = true;
          toggle.setAttribute("aria-expanded", "false");
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
    safeRun(initHeroAnimation, "initHeroAnimation");
    safeRun(initWaitlistForm, "initWaitlistForm");
  });
})();
