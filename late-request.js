/*
 * Late-booking request dialog, shared by book.html, the homepage booking
 * form and charter-booking.html.
 *
 * Why it exists: a standard booking needs MIN_HOURS notice. When a rider
 * picks something sooner, they used to get a red line of text and nothing
 * else. This dialog explains the rule, lets them change the time in one tap,
 * or lets them send exactly what they already filled in to Support as a
 * request, with WhatsApp / call / email shortcuts for a fast answer. The
 * form behind it is never touched, so nothing the rider typed is lost.
 *
 * Also owns the Lagos-time helpers, because a time typed into the form is a
 * Lagos wall-clock time (WAT, UTC+1, no daylight saving) whatever the
 * device's own timezone is. new Date("2026-10-10T07:30:00") would use the
 * device zone instead and shift the instant for anyone abroad.
 *
 * Public API: window.ArrivoLate = { MIN_HOURS, lagosInstant, lagosNow,
 *   earliestAllowed, formatLagos, open }.
 */
(function () {
  "use strict";

  var MIN_HOURS = 12; // keep equal to ON_THE_GO_ONLY_HOURS in arrivo-backend/services/bookingWindow.js
  var SUPPORT_PHONE = "+2348162706078";
  var SUPPORT_WA = "2348162706078";
  var SUPPORT_EMAIL = "info@ridearrivo.com";
  var LAGOS_OFFSET_MS = 60 * 60 * 1000;

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  // "YYYY-MM-DD" + "HH:MM" typed in Lagos time -> the real instant.
  function lagosInstant(dateStr, timeStr) {
    if (!dateStr || !timeStr) return null;
    var d = new Date(dateStr + "T" + timeStr + ":00+01:00");
    return isNaN(d.getTime()) ? null : d;
  }

  // Today's date and time as Lagos shows them right now (not the device's).
  function lagosNow(at) {
    var shifted = new Date((at ? at.getTime() : Date.now()) + LAGOS_OFFSET_MS);
    return {
      date: shifted.getUTCFullYear() + "-" + pad(shifted.getUTCMonth() + 1) + "-" + pad(shifted.getUTCDate()),
      time: pad(shifted.getUTCHours()) + ":" + pad(shifted.getUTCMinutes()),
    };
  }

  // Earliest instant a standard booking is allowed, rounded up to the next 5 minutes.
  function earliestAllowed() {
    var ms = Date.now() + MIN_HOURS * 3600 * 1000;
    return new Date(Math.ceil(ms / 300000) * 300000);
  }

  function formatLagos(date) {
    try {
      return new Intl.DateTimeFormat("en-GB", {
        timeZone: "Africa/Lagos", weekday: "short", day: "numeric", month: "short",
        hour: "2-digit", minute: "2-digit", hour12: false,
      }).format(date) + " (Lagos time)";
    } catch (e) {
      var p = lagosNow(date);
      return p.date + " " + p.time + " (Lagos time)";
    }
  }

  var CSS = [
    ".alr-overlay{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(10,12,36,.55);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}",
    ".alr-overlay[hidden]{display:none}",
    ".alr-dialog{width:100%;max-width:480px;max-height:calc(100vh - 32px);overflow:auto;background:#fff;color:#12123B;border:1px solid #E7E5F0;border-radius:20px;padding:24px 22px;box-shadow:0 24px 60px rgba(10,12,36,.35);font-family:'Inter',system-ui,sans-serif}",
    "html[data-theme=\"dark\"] .alr-dialog{background:#14173d;color:#F3F3FA;border-color:rgba(255,255,255,.14)}",
    ".alr-dialog h2{margin:0 0 8px;font-size:20px;line-height:1.25;color:inherit}",
    ".alr-dialog p{margin:0 0 12px;font-size:14.5px;line-height:1.5}",
    ".alr-muted{color:#6b6b85}html[data-theme=\"dark\"] .alr-muted{color:#A9ADC9}",
    ".alr-actions{display:flex;flex-direction:column;gap:10px;margin:16px 0}",
    ".alr-btn{display:block;width:100%;padding:13px 16px;border-radius:12px;border:1.5px solid #E7E5F0;background:transparent;color:inherit;font:600 14.5px 'Inter',system-ui,sans-serif;text-align:center;text-decoration:none;cursor:pointer}",
    "html[data-theme=\"dark\"] .alr-btn{border-color:rgba(255,255,255,.2)}",
    ".alr-btn:focus-visible,.alr-input:focus-visible,.alr-x:focus-visible{outline:3px solid #2E4C8C;outline-offset:2px}",
    "html[data-theme=\"dark\"] .alr-btn:focus-visible,html[data-theme=\"dark\"] .alr-input:focus-visible,html[data-theme=\"dark\"] .alr-x:focus-visible{outline-color:#fff}",
    ".alr-btn-primary{background:#F4A300;border-color:#F4A300;color:#12123B}",
    ".alr-btn[disabled]{opacity:.6;cursor:default}",
    ".alr-contacts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 0 6px}",
    ".alr-contacts .alr-btn{padding:10px 6px;font-size:13.5px}",
    ".alr-field{margin:0 0 10px}.alr-field label{display:block;margin:0 0 4px;font-size:13px;font-weight:600}",
    ".alr-input{display:block;width:100%;box-sizing:border-box;padding:11px 12px;border-radius:10px;border:1.5px solid #E7E5F0;background:transparent;color:inherit;font:15px 'Inter',system-ui,sans-serif}",
    "html[data-theme=\"dark\"] .alr-input{border-color:rgba(255,255,255,.2)}",
    ".alr-summary{margin:0 0 14px;padding:10px 12px;border-radius:10px;background:rgba(46,76,140,.08);font-size:13.5px;line-height:1.5}",
    "html[data-theme=\"dark\"] .alr-summary{background:rgba(255,255,255,.07)}",
    ".alr-summary div{display:flex;gap:8px}.alr-summary b{min-width:84px;font-weight:600}",
    ".alr-err{color:#B3261E;font-size:13.5px;margin:0 0 10px}html[data-theme=\"dark\"] .alr-err{color:#FF9A8B}",
    ".alr-x{float:right;margin:-6px -6px 0 8px;width:36px;height:36px;border:0;border-radius:50%;background:transparent;color:inherit;font-size:22px;line-height:1;cursor:pointer}",
    ".alr-hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}",
  ].join("\n");

  function injectCss() {
    if (document.getElementById("alr-css")) return;
    var s = document.createElement("style");
    s.id = "alr-css";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }

  function submitIntake(payload, website) {
    if (typeof SUPABASE_URL === "undefined" || typeof SUPABASE_ANON_KEY === "undefined") {
      return Promise.reject(new Error("no-config"));
    }
    return fetch(SUPABASE_URL + "/functions/v1/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ slug: "charter-booking", payload: payload, website: website || "" }),
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { ok: res.ok, data: data };
      });
    });
  }

  var active = null;

  /*
   * opts:
   *   when        Date the rider asked for (required)
   *   summary     [{label, value}] shown back to the rider (what they filled in)
   *   intake      object merged into the charter-booking intake payload
   *               (rental_date, pickup_time, pickup_address, dropoff_address,
   *                car_preference, full_name, contact_number ...). Missing
   *                required keys get safe defaults.
   *   name, phone prefill for the contact fields
   *   reference   payment reference, when the rider already paid (post-payment case)
   *   onAdjust    called when the rider chooses to change the time
   *   onUseEarliest(date) optional one-tap "use the earliest time"
   *   onSent      called after Support has the request
   *   source      short string saying where it came from
   */
  function open(opts) {
    opts = opts || {};
    close();
    injectCss();
    var returnFocus = document.activeElement;
    var when = opts.when instanceof Date ? opts.when : null;
    var hoursAway = when ? Math.max(0, (when.getTime() - Date.now()) / 3600000) : null;
    var earliest = earliestAllowed();

    var overlay = el("div", { "class": "alr-overlay" });
    var dlg = el("div", { "class": "alr-dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "alrTitle" });
    overlay.appendChild(dlg);

    var x = el("button", { type: "button", "class": "alr-x", "aria-label": "Close" }, "×");
    dlg.appendChild(x);
    dlg.appendChild(el("h2", { id: "alrTitle" }, opts.reference ? "We need to confirm this booking" : "That time is sooner than we can book online"));

    var rule = "Online bookings need at least " + MIN_HOURS + " hours' notice.";
    if (when) {
      rule += " The time you picked, " + formatLagos(when) + ", is " +
        (hoursAway < 1 ? "less than an hour" : "about " + Math.round(hoursAway) + (Math.round(hoursAway) === 1 ? " hour" : " hours")) + " away.";
    }
    dlg.appendChild(el("p", null, rule));
    if (opts.reference) {
      dlg.appendChild(el("p", { "class": "alr-muted" }, "Your payment went through (reference " + opts.reference + "), so you will not be charged twice. Tell Support this reference and they will finish it with you."));
    }
    dlg.appendChild(el("p", { "class": "alr-muted" }, "Nothing you filled in has been lost. Pick a later time, or send it to Support as it is and we will confirm if we can make it work."));

    if (opts.summary && opts.summary.length) {
      var box = el("div", { "class": "alr-summary" });
      opts.summary.forEach(function (row) {
        if (!row || !row.value) return;
        var line = el("div");
        line.appendChild(el("b", null, row.label));
        line.appendChild(el("span", null, row.value));
        box.appendChild(line);
      });
      dlg.appendChild(box);
    }

    var actions = el("div", { "class": "alr-actions" });
    if (typeof opts.onUseEarliest === "function" && !opts.reference) {
      var useBtn = el("button", { type: "button", "class": "alr-btn alr-btn-primary" }, "Use the earliest time: " + formatLagos(earliest));
      useBtn.addEventListener("click", function () { close(); opts.onUseEarliest(earliest); });
      actions.appendChild(useBtn);
    }
    var adjustBtn = el("button", { type: "button", "class": "alr-btn" + (typeof opts.onUseEarliest === "function" && !opts.reference ? "" : " alr-btn-primary") }, "Change my time");
    adjustBtn.addEventListener("click", function () { close(); if (opts.onAdjust) opts.onAdjust(); });
    if (!opts.reference) actions.appendChild(adjustBtn);
    dlg.appendChild(actions);

    var form = el("div");
    form.appendChild(el("h2", { style: "font-size:16px;margin:4px 0 8px" }, "Or send it to Support as a request"));
    var nameF = el("div", { "class": "alr-field" });
    nameF.appendChild(el("label", { "for": "alrName" }, "Your name"));
    var nameI = el("input", { id: "alrName", "class": "alr-input", type: "text", autocomplete: "name", maxlength: "160" });
    nameI.value = opts.name || (opts.intake && opts.intake.full_name) || "";
    nameF.appendChild(nameI);
    var phoneF = el("div", { "class": "alr-field" });
    phoneF.appendChild(el("label", { "for": "alrPhone" }, "Phone or WhatsApp number"));
    var phoneI = el("input", { id: "alrPhone", "class": "alr-input", type: "tel", autocomplete: "tel", maxlength: "40", placeholder: "e.g. 0801 234 5678" });
    phoneI.value = opts.phone || (opts.intake && opts.intake.contact_number) || "";
    phoneF.appendChild(phoneI);
    var hp = el("input", { "class": "alr-hp", type: "text", tabindex: "-1", autocomplete: "off", "aria-hidden": "true" });
    var err = el("p", { "class": "alr-err", role: "alert" });
    err.hidden = true;
    var send = el("button", { type: "button", "class": "alr-btn alr-btn-primary" }, "Send request to Support");
    form.appendChild(nameF); form.appendChild(phoneF); form.appendChild(hp); form.appendChild(err); form.appendChild(send);
    dlg.appendChild(form);

    var summaryText = (opts.summary || []).filter(function (r) { return r && r.value; })
      .map(function (r) { return r.label + ": " + r.value; }).join("\n");
    var waText = "Hello RideArrivo, I need a booking sooner than 12 hours from now.\n" + summaryText +
      (opts.reference ? "\nPayment reference: " + opts.reference : "");
    var contacts = el("div", { "class": "alr-contacts", style: "margin-top:14px" });
    var wa = el("a", { "class": "alr-btn", href: "https://wa.me/" + SUPPORT_WA + "?text=" + encodeURIComponent(waText), target: "_blank", rel: "noopener" }, "WhatsApp");
    var call = el("a", { "class": "alr-btn", href: "tel:" + SUPPORT_PHONE }, "Call");
    var mail = el("a", { "class": "alr-btn", href: "mailto:" + SUPPORT_EMAIL + "?subject=" + encodeURIComponent("Booking sooner than 12 hours") + "&body=" + encodeURIComponent(waText) }, "Email");
    contacts.appendChild(wa); contacts.appendChild(call); contacts.appendChild(mail);
    dlg.appendChild(el("p", { "class": "alr-muted", style: "margin:14px 0 6px;font-size:13px" }, "For the fastest answer, message or call us:"));
    dlg.appendChild(contacts);

    send.addEventListener("click", function () {
      var name = nameI.value.trim();
      var phone = phoneI.value.trim();
      err.hidden = true;
      if (!name || phone.replace(/\D/g, "").length < 7) {
        err.hidden = false;
        err.textContent = "Please add your name and a phone number we can reach you on.";
        return;
      }
      var p = Object.assign({
        rental_date: "", pickup_time: "", pickup_address: "", area_of_use: "Other", dropoff_address: "",
        rental_duration: "Late request, under " + MIN_HOURS + "h notice", car_preference: "No preference",
      }, opts.intake || {}, { full_name: name, contact_number: phone });
      if (when) {
        var lp = lagosNow(when);
        p.rental_date = p.rental_date || lp.date;
        p.pickup_time = p.pickup_time || (lp.time + " (Lagos time)");
      }
      if (opts.reference) p.rental_duration = ("Paid, ref " + opts.reference).slice(0, 80);
      Object.keys(p).forEach(function (k) { if (!p[k]) p[k] = "Not given"; });
      send.disabled = true;
      send.textContent = "Sending…";
      if (hp.value) return;
      submitIntake(p, hp.value).then(function (r) {
        if (!r.ok) throw new Error("intake");
        form.innerHTML = "";
        form.appendChild(el("p", null, "Thank you, your request is with Support. We will reach you on " + phone + ". For a faster answer, use WhatsApp or Call below."));
        if (opts.onSent) opts.onSent();
      }).catch(function () {
        send.disabled = false;
        send.textContent = "Send request to Support";
        err.hidden = false;
        err.textContent = "We could not send that just now. Please use WhatsApp or Call below and we will sort it out.";
      });
    });

    function onKey(e) {
      if (e.key === "Escape") { close(); return; }
      if (e.key !== "Tab") return;
      var f = dlg.querySelectorAll("a[href],button:not([disabled]),input:not(.alr-hp)");
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    function close() {
      if (!active) return;
      document.removeEventListener("keydown", active.onKey, true);
      if (active.overlay.parentNode) active.overlay.parentNode.removeChild(active.overlay);
      var rf = active.returnFocus;
      active = null;
      if (rf && rf.focus) { try { rf.focus(); } catch (e) {} }
    }
    x.addEventListener("click", close);
    overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) close(); });
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(overlay);
    active = { overlay: overlay, onKey: onKey, returnFocus: returnFocus, close: close };
    (nameI.value ? (actions.querySelector("button") || nameI) : nameI).focus();
    return { close: close };
  }

  function close() { if (active) active.close(); }

  window.ArrivoLate = {
    MIN_HOURS: MIN_HOURS,
    lagosInstant: lagosInstant,
    lagosNow: lagosNow,
    earliestAllowed: earliestAllowed,
    formatLagos: formatLagos,
    open: open,
    close: close,
  };
})();
