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

  // The browser key lives in maps-config.js (loaded by index.html), the one place
  // it is kept. If that file is missing, suggestions are simply off.
  var MAPS_KEY = window.GOOGLE_MAPS_BROWSER_KEY || "";
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

  // ---- Address inputs with our own suggestion list ----
  // Google's ready-made Autocomplete widget takes over the text box and, when
  // Google refuses the page, leaves it broken. So the box here is a plain input
  // that Google never touches: we ask Google's AutocompleteService for text
  // predictions and draw the dropdown ourselves. If Google says no, the list
  // simply never appears and typing carries on as normal.
  var svc = null;
  var token = null;
  var mapsRequested = false;
  var combos = [];

  function makeCombo(input, slot) {
    var list = document.createElement("ul");
    list.className = "hf-suggest";
    list.id = "hfList-" + slot;
    list.setAttribute("role", "listbox");
    list.hidden = true;
    input.parentNode.appendChild(list);
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", list.id);

    var items = [];
    var active = -1;
    var timer = null;
    var seq = 0;

    function close() {
      list.hidden = true;
      list.innerHTML = "";
      items = [];
      active = -1;
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
    }
    function setActive(i) {
      var nodes = list.children;
      if (!nodes.length) return;
      active = (i + nodes.length) % nodes.length;
      for (var n = 0; n < nodes.length; n++) {
        var on = n === active;
        nodes[n].classList.toggle("is-active", on);
        nodes[n].setAttribute("aria-selected", on ? "true" : "false");
      }
      input.setAttribute("aria-activedescendant", nodes[active].id);
    }
    function choose(i) {
      if (!items[i]) return;
      input.value = items[i];
      coords[slot] = null; // the booking page looks the place up from its text
      close();
      clearError();
      token = null;
    }
    function render(preds) {
      list.innerHTML = "";
      items = preds.slice(0, 5);
      if (!items.length) { close(); return; }
      items.forEach(function (text, i) {
        var li = document.createElement("li");
        li.id = list.id + "-" + i;
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", "false");
        li.textContent = text;
        li.addEventListener("mousedown", function (e) { e.preventDefault(); choose(i); });
        list.appendChild(li);
      });
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }
    function ask() {
      var q = input.value.trim();
      if (!svc || q.length < 3) { close(); return; }
      var mine = ++seq;
      predict(q, function (texts) {
        if (mine !== seq || input.value.trim() !== q) return; // a newer keystroke owns the list
        if (texts && texts.length) render(texts);
        else close(); // no matches, or Google said no: just no list
      });
    }

    input.addEventListener("input", function () {
      coords[slot] = null;
      clearError();
      clearTimeout(timer);
      timer = setTimeout(ask, 220);
    });
    input.addEventListener("focus", loadMaps);
    input.addEventListener("keydown", function (e) {
      if (list.hidden) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
      else if (e.key === "Enter" && active >= 0) { e.preventDefault(); choose(active); }
      else if (e.key === "Escape") { close(); }
    });
    input.addEventListener("blur", function () { setTimeout(close, 150); });
    combos.push({ close: close });
  }
  makeCombo(pickup, "pickup");
  makeCombo(dest, "dest");

  // Suggestions: try Google's newer Places API first and fall back to the
  // older one, because a Google Cloud project may have only one of them
  // switched on. Either way Google only supplies text; it never touches the box.
  var useNew = true;
  function predict(q, done) {
    var P = window.google && google.maps && google.maps.places;
    if (!P) { done(null); return; }
    if (token === null && P.AutocompleteSessionToken) token = new P.AutocompleteSessionToken();
    if (useNew && P.AutocompleteSuggestion && P.AutocompleteSuggestion.fetchAutocompleteSuggestions) {
      P.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: q, includedRegionCodes: ["ng"], sessionToken: token || undefined
      }).then(function (res) {
        done((res.suggestions || []).filter(function (x) { return x.placePrediction; })
          .map(function (x) { return x.placePrediction.text.toString(); }));
      }).catch(function (err) {
        console.warn("[hero-form] Places API (New) refused:", err && err.message ? err.message : err, "- trying the older Places API");
        useNew = false;
        predict(q, done);
      });
      return;
    }
    try {
      svc.getPlacePredictions(
        { input: q, componentRestrictions: { country: "ng" }, sessionToken: token || undefined },
        function (res, status) {
          if (status !== "OK" && status !== "ZERO_RESULTS") {
            console.warn("[hero-form] address suggestions off, Google said:", status);
          }
          done(status === "OK" && res ? res.map(function (p) { return p.description; }) : []);
        }
      );
    } catch (e) { console.warn("[hero-form] suggestions failed:", e); svc = null; done([]); }
  }

  function suggestionsOff() {
    svc = null;
    combos.forEach(function (c) { c.close(); });
  }
  window.gm_authFailure = function () { // Google rejected the key or the page address
    console.warn("[hero-form] Google rejected the Maps key for this page address. Add this site to the key's allowed referrers.");
    suggestionsOff();
  };
  window.__heroPlacesReady = function () {
    try {
      var P = google.maps.places;
      svc = P.AutocompleteService ? new P.AutocompleteService() : true;
    } catch (e) { suggestionsOff(); }
  };
  function loadMaps() {
    if (mapsRequested) return;
    mapsRequested = true;
    if (!MAPS_KEY) return;
    if (window.google && window.google.maps && window.google.maps.places) { window.__heroPlacesReady(); return; }
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://maps.googleapis.com/maps/api/js?key=" + MAPS_KEY + "&libraries=places&callback=__heroPlacesReady";
    s.onerror = suggestionsOff; // offline or blocked: carry on without suggestions
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
