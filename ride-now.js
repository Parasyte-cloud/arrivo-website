(function () {
  "use strict";

  // ── Configuration ────────────────────────────────────────────────────
  var API_BASE_URL = "https://arrivo-backend-g1ku.onrender.com"; // same as booking.js/script.js

  var SUPPORTED_LANGS = ["en", "fr", "zh", "hi", "de", "es", "pt"];
  var LANG_LABELS = { en: "EN", fr: "FR", zh: "中文", hi: "हि", de: "DE", es: "ES", pt: "PT" };
  var LANG_KEY = "arrivo_site_lang";

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  // ───────────────────────── i18n (identical pattern to booking.js) ─────
  // Only the shared header/footer chrome (nav, footer links) is actually
  // translated via data-i18n here -- this page's own ArrivoExpress copy is
  // English-only for now (see PR notes: translate alongside the mobile
  // app's ArrivoExpress strings in a follow-up localization pass).
  function getNested(obj, path) {
    return path.split(".").reduce(function (acc, key) { return acc && acc[key]; }, obj);
  }

  function applyLanguage(lang) {
    var dict = (window.I18N || {})[lang] || (window.I18N || {}).en || {};
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var value = getNested(dict, el.getAttribute("data-i18n"));
      if (value != null) el.innerHTML = value;
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

  // ───────────────────────── API helpers (same shape as booking.js) ─────
  function api(path, options) {
    options = options || {};
    return fetch(API_BASE_URL + path, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { ok: res.ok, status: res.status, data: data };
      });
    }).catch(function () {
      return { ok: false, status: 0, data: { error: "Couldn't reach the server. Please check your connection and try again." } };
    });
  }

  function authHeader() {
    return { Authorization: "Bearer " + state.token };
  }

  function formatNaira(amount) {
    return "NGN " + Math.round(Number(amount) || 0).toLocaleString();
  }

  // ───────────────────────── State ───────────────────────────────────
  var state = {
    token: null,
    tiers: [],
    selectedTier: null,
    pickup: "",
    pickupLatLng: null,
    destination: "",
    destinationLatLng: null,
    quote: null,
    activeRequestId: null,
    pollTimer: null,
  };

  var CARD_IDS = ["authGate", "unavailableCard", "loadingCard", "pickerCard", "quoteCard", "searchingCard"];

  function showCard(id) {
    CARD_IDS.forEach(function (cid) {
      var el = document.getElementById(cid);
      if (el) el.hidden = cid !== id;
    });
  }

  // ───────────────────────── Tier picker ─────────────────────────────
  function renderTiers() {
    var container = document.getElementById("tierOptions");
    if (!container) return;
    container.innerHTML = "";
    state.tiers.forEach(function (tier) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "vehicle-card" + (tier.key === state.selectedTier ? " selected" : "");
      btn.innerHTML =
        '<span class="v-name">' + escapeHtml(tier.label) + "</span>" +
        '<span class="v-description">' + escapeHtml(tier.description) + "</span>";
      btn.addEventListener("click", function () {
        state.selectedTier = tier.key;
        renderTiers();
      });
      container.appendChild(btn);
    });
  }

  // ───────────────────────── Google Places (same pattern as booking.js) ─
  function attachPlacesAutocomplete(inputEl, onSelect) {
    if (!inputEl || !window.google || !window.google.maps || !window.google.maps.places) return;
    var autocomplete = new google.maps.places.Autocomplete(inputEl, {
      componentRestrictions: { country: "ng" },
      fields: ["formatted_address", "geometry", "name"],
    });
    autocomplete.addListener("place_changed", function () {
      var place = autocomplete.getPlace();
      if (!place.geometry || !place.geometry.location) return; // free text, no coords -- can't quote yet
      onSelect({
        address: place.formatted_address || place.name || inputEl.value,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      });
    });
  }

  // Google's script tag calls this once the Maps JS API has loaded (see
  // ride-now.html's script tag, callback=initGoogleMaps) -- same global
  // callback name booking.js uses, safe because the two pages never load
  // together.
  window.initGoogleMaps = function () {
    var pickupEl = document.getElementById("rnPickup");
    var destEl = document.getElementById("rnDestination");
    attachPlacesAutocomplete(pickupEl, function (r) {
      state.pickup = r.address;
      state.pickupLatLng = { lat: r.lat, lng: r.lng };
      if (pickupEl) pickupEl.value = r.address;
    });
    attachPlacesAutocomplete(destEl, function (r) {
      state.destination = r.address;
      state.destinationLatLng = { lat: r.lat, lng: r.lng };
      if (destEl) destEl.value = r.address;
    });
  };

  // ───────────────────────── Quote / booking flow ────────────────────
  function buildTrip() {
    return {
      tier: state.selectedTier,
      pickupAddress: state.pickup,
      pickupLat: state.pickupLatLng.lat,
      pickupLng: state.pickupLatLng.lng,
      destinationAddress: state.destination,
      destinationLat: state.destinationLatLng.lat,
      destinationLng: state.destinationLatLng.lng,
    };
  }

  function getFare() {
    var err = document.getElementById("pickerError");
    err.hidden = true;

    if (!state.selectedTier) {
      err.textContent = "Choose a vehicle to continue.";
      err.hidden = false;
      return;
    }
    var pickupVal = document.getElementById("rnPickup").value.trim();
    var destVal = document.getElementById("rnDestination").value.trim();
    if (!pickupVal || !state.pickupLatLng) {
      err.textContent = "Select your pickup address from the suggestions.";
      err.hidden = false;
      return;
    }
    if (!destVal || !state.destinationLatLng) {
      err.textContent = "Select your destination from the suggestions.";
      err.hidden = false;
      return;
    }
    state.pickup = pickupVal;
    state.destination = destVal;

    var btn = document.getElementById("seeFareBtn");
    btn.disabled = true;
    btn.textContent = "Getting fare…";

    api("/api/instant-rides/quote", {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify(buildTrip()),
    }).then(function (result) {
      btn.disabled = false;
      btn.textContent = "See fare";
      if (!result.ok) {
        err.textContent = result.data.error || "Couldn't get a fare for that trip. Please try again.";
        err.hidden = false;
        return;
      }
      state.quote = result.data.quote;
      renderQuote();
    });
  }

  function renderQuote() {
    var q = state.quote;
    var tierConfig = state.tiers.filter(function (t) { return t.key === state.selectedTier; })[0];

    document.getElementById("quoteTierLabel").textContent = tierConfig ? tierConfig.label : state.selectedTier;
    document.getElementById("quoteZoneTag").style.display = q.zone === "yellow" ? "inline-block" : "none";
    document.getElementById("quoteRoute").textContent = state.pickup + " → " + state.destination;
    document.getElementById("quoteDistance").textContent = (q.distanceKm != null ? q.distanceKm.toFixed(1) : "—") + " km";
    document.getElementById("quoteDuration").textContent = Math.round(q.durationMin) + " min";
    document.getElementById("quoteFare").textContent = formatNaira(q.fareNaira);
    document.getElementById("quoteError").hidden = true;

    showCard("quoteCard");

    var confirmBtn = document.getElementById("confirmRideBtn");
    var note = document.getElementById("walletBalanceNote");
    confirmBtn.disabled = true;
    note.textContent = "Checking your wallet balance…";

    api("/api/wallet", { headers: authHeader() }).then(function (result) {
      if (!result.ok) {
        note.textContent = "";
        confirmBtn.disabled = false; // let the backend be the final word on this
        return;
      }
      var balance = Number(result.data.balanceNaira || 0);
      if (balance >= q.fareNaira) {
        note.innerHTML = "Wallet balance: " + formatNaira(balance) + " — charged on confirmation.";
        confirmBtn.disabled = false;
      } else {
        note.innerHTML =
          "Wallet balance: " + formatNaira(balance) +
          " — not enough for this fare. <a href=\"account.html\">Top up your wallet</a> first.";
        confirmBtn.disabled = true;
      }
    });
  }

  function confirmRide() {
    var err = document.getElementById("quoteError");
    err.hidden = true;

    var btn = document.getElementById("confirmRideBtn");
    btn.disabled = true;
    btn.textContent = "Booking…";

    api("/api/instant-rides", {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify(buildTrip()),
    }).then(function (result) {
      btn.textContent = "Confirm & find a driver";

      if (!result.ok) {
        if (result.data.code === "ACTIVE_INSTANT_REQUEST") {
          // Already has one in flight (double-submit, or another tab) --
          // just resume watching it instead of showing an error.
          state.activeRequestId = result.data.requestId;
          startSearching(null);
          return;
        }
        btn.disabled = false;
        if (result.data.code === "INSUFFICIENT_WALLET") {
          err.innerHTML = "Not enough wallet balance. <a href=\"account.html\">Top up your wallet</a> and try again.";
        } else {
          err.textContent = result.data.error || "Couldn't book this ride. Please try again.";
        }
        err.hidden = false;
        return;
      }

      state.activeRequestId = result.data.request.id;
      startSearching(result.data.request);
    });
  }

  // ───────────────────────── Searching / polling ─────────────────────
  function startSearching(request) {
    showCard("searchingCard");
    document.getElementById("searchingStatus").textContent = "Looking for a nearby driver…";
    document.getElementById("searchingRoute").textContent = state.pickup + " → " + state.destination;
    document.getElementById("searchingFare").textContent = request ? formatNaira(request.estimated_fare_naira) : "";
    stopPolling();
    pollActive();
    state.pollTimer = setInterval(pollActive, 4000);
  }

  function stopPolling() {
    if (state.pollTimer) {
      clearInterval(state.pollTimer);
      state.pollTimer = null;
    }
  }

  function pollActive() {
    api("/api/instant-rides/rider/active", { headers: authHeader() }).then(function (result) {
      if (!result.ok) return; // transient hiccup -- try again next tick

      var request = result.data.request;

      if (!request) {
        // No longer active anywhere -- expired (auto-refunded server-side,
        // see arrivo-backend services/instantWallet.js) or cancelled from
        // another tab/device.
        stopPolling();
        window.alert("We couldn't match you with a driver in time. Any wallet charge has been refunded.");
        resetToPicker();
        return;
      }

      document.getElementById("searchingStatus").textContent =
        request.status === "offering" ? "Confirming with a nearby driver…"
        : request.status === "matched" ? "Driver found!"
        : "Looking for a nearby driver…";

      if (request.status === "matched" && request.ride_id) {
        stopPolling();
        window.location.href = "track.html?ride=" + request.ride_id;
      }
    });
  }

  function cancelSearch() {
    if (!state.activeRequestId) return;
    var btn = document.getElementById("cancelSearchBtn");
    btn.disabled = true;
    api("/api/instant-rides/rider/requests/" + state.activeRequestId + "/cancel", {
      method: "POST",
      headers: authHeader(),
    }).then(function () {
      btn.disabled = false;
      stopPolling();
      resetToPicker();
    });
  }

  function resetToPicker() {
    state.quote = null;
    state.activeRequestId = null;
    showCard("pickerCard");
  }

  // ───────────────────────── Init ────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    function safeRun(fn, label) {
      try { fn(); } catch (err) { console.error("[ride-now] " + label + " failed:", err); }
    }

    safeRun(initLanguage, "initLanguage");

    document.getElementById("seeFareBtn").addEventListener("click", getFare);
    document.getElementById("confirmRideBtn").addEventListener("click", confirmRide);
    document.getElementById("backToPickerBtn").addEventListener("click", function () { showCard("pickerCard"); });
    document.getElementById("cancelSearchBtn").addEventListener("click", cancelSearch);

    // ArrivoExpress settles from the RideArrivo Wallet, so -- same rule
    // book.html already enforces for scheduled bookings -- a logged-in
    // account is required. No guest path here.
    var savedToken = localStorage.getItem("arrivo_rider_token");
    if (!savedToken) {
      showCard("authGate");
      return;
    }
    state.token = savedToken;
    showCard("loadingCard");

    Promise.all([
      api("/api/instant-rides/status", { headers: authHeader() }),
      api("/api/instant-rides/rider/active", { headers: authHeader() }),
    ]).then(function (results) {
      var statusResult = results[0];
      var activeResult = results[1];

      if (!statusResult.ok || !statusResult.data.enabled) {
        showCard("unavailableCard");
        return null;
      }

      var existing = activeResult.ok ? activeResult.data.request : null;

      if (existing && existing.status === "matched" && existing.ride_id) {
        window.location.href = "track.html?ride=" + existing.ride_id;
        return null;
      }

      if (existing) {
        state.activeRequestId = existing.id;
        state.pickup = existing.pickup_address;
        state.destination = existing.destination_address;
        startSearching(existing);
        return null;
      }

      return api("/api/instant-rides/tiers", { headers: authHeader() }).then(function (tiersResult) {
        state.tiers = (tiersResult.ok && tiersResult.data.tiers) || [];
        state.selectedTier = state.tiers.length ? state.tiers[0].key : null;
        renderTiers();
        showCard("pickerCard");
      });
    });
  });
})();
