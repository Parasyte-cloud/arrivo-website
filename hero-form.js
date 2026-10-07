/* Homepage hero booking form.
   It does not create a booking. It collects pickup, destination and (for a
   scheduled ride) a date and time, then opens book.html with those values
   in the query string. booking.js reads them (preset=quick) and fills the
   real booking form, so pricing, the flight number, sign-in and payment all
   stay in one place.

   Address suggestions (Google Places) are a convenience only. If Google
   refuses the page (key not allowed for this address, API off, quota, offline)
   the boxes fall back to plain text inputs and the form keeps working. */
(function () {
  "use strict";
  var form = document.getElementById("heroQuoteForm");
  if (!form) return;

  var MAPS_KEY = "AIzaSyCLWAbQmxIAoGPP0LLDp6oTosaHZBa0Y5s"; // same browser key book.html uses (referrer-restricted)
  var MIN_HOURS = 12; // same rule as booking.js MIN_STANDARD_BOOKING_HOURS
  var STORE_KEY = "arrivo_hero_quote";

  var tabs = form.querySelectorAll(".hf-tab");
  var pickup = document.getElementById("hfPickup");
  var dest = document.getElementById("hfDest");
  var when = document.getElementById("hfWhen");
  var dateEl = document.getElementById("hfDate");
  var timeEl = document.getElementById("hfTime");
  var errEl = document.getElementById("hfError");
  var submitBtn = form.querySelector(".hf-submit");
  var mode = "one_way";
  var coords = { pickup: null, dest: null };
  var suggestionsOff = false;
  var mapsRequested = false;
  var observer = null;

  function dict() {
    var lang = document.documentElement.lang || "en";
    return (typeof I18N !== "undefined" && (I18N[lang] || I18N.en)) || null;
  }
  function tr(key, fallback) {
    var d = dict();
    return (d && d.home && d.home[key]) || fallback;
  }
  function pad(n) { return String(n).padStart(2, "0"); }
  function isoDate(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function showError(msg, el) {
    errEl.textContent = msg;
    errEl.hidden = false;
    if (el) { try { el.setAttribute("aria-invalid", "true"); el.focus(); } catch (e) { /* ignore */ } }
  }
  function clearError() {
    errEl.hidden = true;
    [pickup, dest, dateEl, timeEl].forEach(function (el) { if (el) el.removeAttribute("aria-invalid"); });
  }

  // ---- Mode toggle (Book a ride / Schedule) ----
  function setMode(next) {
    mode = next;
    tabs.forEach(function (t) {
      var on = t.getAttribute("data-mode") === next;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-pressed", on ? "true" : "false");
    });
    when.hidden = next !== "dropoff";
    if (next === "dropoff" && !dateEl.value) {
      var d = new Date();
      d.setDate(d.getDate() + 2);
      dateEl.value = isoDate(d);
      timeEl.value = "09:00";
    }
    clearError();
  }
  tabs.forEach(function (t) {
    t.addEventListener("click", function () { setMode(t.getAttribute("data-mode")); });
  });
  dateEl.min = isoDate(new Date());

  // ---- Address inputs ----
  function suggestionListOpen() {
    var lists = document.querySelectorAll(".pac-container");
    for (var i = 0; i < lists.length; i++) {
      if (lists[i].offsetParent !== null && lists[i].children.length) return true;
    }
    return false;
  }
  function bindInput(el, slot) {
    // Typing free text invalidates coordinates from an earlier suggestion.
    el.addEventListener("input", function () { coords[slot] = null; clearError(); });
    el.addEventListener("focus", loadMaps);
    // Enter inside the suggestion list means "pick this", not "submit the form".
    el.addEventListener("keydown", function (e) {
      if ((e.key === "Enter" || e.keyCode === 13) && suggestionListOpen()) e.preventDefault();
    });
  }
  bindInput(pickup, "pickup");
  bindInput(dest, "dest");

  // ---- Google Places suggestions: loaded on first focus, dropped on any failure ----
  function stripGoogleMarkup(el) {
    el.className = "hf-input";
    el.removeAttribute("style");
    ["role", "aria-autocomplete", "aria-expanded", "aria-haspopup", "aria-owns", "aria-activedescendant"].forEach(function (a) {
      el.removeAttribute(a);
    });
    el.setAttribute("autocomplete", "off");
  }
  function disableSuggestions() {
    if (suggestionsOff) return;
    suggestionsOff = true;
    if (observer) { observer.disconnect(); observer = null; }
    var slots = [["pickup", "hfPickup"], ["dest", "hfDest"]];
    slots.forEach(function (s) {
      var old = document.getElementById(s[1]);
      if (!old) return;
      var fresh = old.cloneNode(true); // a clone has none of Google's event listeners
      stripGoogleMarkup(fresh);
      fresh.value = old.value;
      // Google overwrites the placeholder with its error text; put ours back.
      var phKey = fresh.getAttribute("data-i18n-placeholder");
      var phText = phKey ? tr(phKey.replace(/^home\./, ""), "") : "";
      if (phText) fresh.setAttribute("placeholder", phText);
      var hadFocus = document.activeElement === old;
      var selStart = old.selectionStart, selEnd = old.selectionEnd;
      old.parentNode.replaceChild(fresh, old);
      if (s[0] === "pickup") pickup = fresh; else dest = fresh;
      bindInput(fresh, s[0]);
      if (hadFocus) {
        fresh.focus();
        // Chrome selects all text on a scripted focus(); the next key would
        // then replace what was typed. Put the caret back where it was.
        var end = fresh.value.length;
        try { fresh.setSelectionRange(selStart == null ? end : selStart, selEnd == null ? end : selEnd); } catch (e) { /* ignore */ }
      }
    });
    coords.pickup = coords.dest = null;
    Array.prototype.forEach.call(document.querySelectorAll(".pac-container"), function (n) {
      if (n.parentNode) n.parentNode.removeChild(n);
    });
  }
  // Google calls this when it rejects the key or referrer.
  window.gm_authFailure = disableSuggestions;

  function attachAutocomplete(input, slot) {
    var ac = new google.maps.places.Autocomplete(input, {
      componentRestrictions: { country: "ng" },
      fields: ["formatted_address", "geometry", "name"],
    });
    ac.addListener("place_changed", function () {
      var p = ac.getPlace();
      if (!p || !p.geometry || !p.geometry.location) return;
      coords[slot] = { lat: p.geometry.location.lat(), lng: p.geometry.location.lng() };
      if (p.formatted_address) input.value = p.formatted_address;
    });
  }
  window.__heroPlacesReady = function () {
    if (suggestionsOff) return;
    try {
      attachAutocomplete(pickup, "pickup");
      attachAutocomplete(dest, "dest");
      // Google marks a failed box with this class instead of calling gm_authFailure in some cases.
      observer = new MutationObserver(function () {
        var failed = [pickup, dest].some(function (el) {
          return el.classList.contains("gm-err-autocomplete") || /sorry|went wrong/i.test(el.getAttribute("placeholder") || "");
        });
        if (failed) disableSuggestions();
      });
      observer.observe(pickup, { attributes: true, attributeFilter: ["class", "placeholder"] });
      observer.observe(dest, { attributes: true, attributeFilter: ["class", "placeholder"] });
    } catch (e) { disableSuggestions(); }
  };
  function loadMaps() {
    if (mapsRequested || suggestionsOff) return;
    mapsRequested = true;
    if (window.google && window.google.maps && window.google.maps.places) { window.__heroPlacesReady(); return; }
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://maps.googleapis.com/maps/api/js?key=" + MAPS_KEY + "&libraries=places&callback=__heroPlacesReady";
    s.onerror = disableSuggestions; // offline or blocked: carry on without suggestions
    document.head.appendChild(s);
  }

  // ---- Submit: hand off to the real booking page ----
  var submitting = false;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (submitting) return;
    clearError();
    var p = pickup.value.trim();
    var d = dest.value.trim();
    if (!p) { showError(tr("formErrPlaces", "Enter a pickup and a destination to continue."), pickup); return; }
    if (!d) { showError(tr("formErrPlaces", "Enter a pickup and a destination to continue."), dest); return; }

    var params = new URLSearchParams();
    params.set("preset", "quick");
    params.set("type", mode);
    params.set("pickup", p);
    params.set("destination", d);
    if (coords.pickup) { params.set("pickupLat", coords.pickup.lat); params.set("pickupLng", coords.pickup.lng); }
    if (coords.dest) { params.set("destinationLat", coords.dest.lat); params.set("destinationLng", coords.dest.lng); }

    if (mode === "dropoff") {
      var at = dateEl.value && timeEl.value ? new Date(dateEl.value + "T" + timeEl.value + ":00") : null;
      if (!at || isNaN(at.getTime()) || at.getTime() - Date.now() < MIN_HOURS * 3600 * 1000) {
        showError(tr("formErrWhen", "Choose a pickup date and time at least 12 hours from now."), dateEl);
        return;
      }
      params.set("date", dateEl.value);
      params.set("time", timeEl.value);
    }
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({ q: params.toString(), t: Date.now() }));
    } catch (err) { /* private mode: the query string still carries the trip */ }
    submitting = true;
    if (submitBtn) submitBtn.disabled = true;
    window.location.href = "book.html?" + params.toString();
  });
  // Coming back with the browser's Back button restores the page from cache.
  window.addEventListener("pageshow", function (ev) {
    if (ev.persisted) { submitting = false; if (submitBtn) submitBtn.disabled = false; }
  });
})();
