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

  // ───────────────────────── i18n (same pattern as booking.js) ──────────
  // The shared header/footer chrome AND this page's own ArrivoExpress
  // copy are both translated: static text via data-i18n /
  // data-i18n-placeholder, and JS-rendered dynamic text (tier cards,
  // quote summary, searching status, error messages) via the t() helper
  // below, which reads from the same "rideNow" namespace in i18n.js.
  var currentLang = "en";

  function getNested(obj, path) {
    return path.split(".").reduce(function (acc, key) { return acc && acc[key]; }, obj);
  }

  function t(key, vars) {
    var dict = (window.I18N || {})[currentLang] || (window.I18N || {}).en || {};
    var str = getNested(dict, key);
    if (str == null) str = getNested((window.I18N || {}).en || {}, key);
    if (str == null) return key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        str = str.split("{{" + k + "}}").join(vars[k]);
      });
    }
    return str;
  }

  function applyLanguage(lang) {
    currentLang = lang;
    var dict = (window.I18N || {})[lang] || (window.I18N || {}).en || {};
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var value = getNested(dict, el.getAttribute("data-i18n"));
      if (value != null) el.innerHTML = value;
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
    refreshDynamicText();
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
      return { ok: false, status: 0, data: { error: t("rideNow.serverUnreachable") } };
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
    lastRequestStatus: null,
    booking: false,
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
      err.textContent = t("rideNow.chooseVehicleError");
      err.hidden = false;
      return;
    }
    var pickupVal = document.getElementById("rnPickup").value.trim();
    var destVal = document.getElementById("rnDestination").value.trim();
    if (!pickupVal || !state.pickupLatLng) {
      err.textContent = t("rideNow.selectPickupError");
      err.hidden = false;
      return;
    }
    if (!destVal || !state.destinationLatLng) {
      err.textContent = t("rideNow.selectDestinationError");
      err.hidden = false;
      return;
    }
    state.pickup = pickupVal;
    state.destination = destVal;

    var btn = document.getElementById("seeFareBtn");
    btn.disabled = true;
    btn.textContent = t("rideNow.gettingFare");

    api("/api/instant-rides/quote", {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify(buildTrip()),
    }).then(function (result) {
      btn.disabled = false;
      btn.textContent = t("rideNow.seeFare");
      if (!result.ok) {
        err.textContent = result.data.error || t("rideNow.fareError");
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
    document.getElementById("quoteZoneTag").textContent = t("rideNow.highTrafficArea");
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
    note.textContent = t("rideNow.checkingWallet");

    api("/api/wallet", { headers: authHeader() }).then(function (result) {
      if (!result.ok) {
        note.textContent = "";
        confirmBtn.disabled = false; // let the backend be the final word on this
        return;
      }
      var balance = Number(result.data.balanceNaira || 0);
      if (balance >= q.fareNaira) {
        note.innerHTML = t("rideNow.walletBalanceNote", { balance: formatNaira(balance) });
        confirmBtn.disabled = false;
      } else {
        note.innerHTML = t("rideNow.walletInsufficientNoteHtml", {
          balance: formatNaira(balance),
          linkText: t("rideNow.topUpWalletLink"),
        });
        confirmBtn.disabled = true;
      }
    });
  }

  function confirmRide() {
    var err = document.getElementById("quoteError");
    err.hidden = true;

    var btn = document.getElementById("confirmRideBtn");
    btn.disabled = true;
    state.booking = true;
    btn.textContent = t("rideNow.booking");

    api("/api/instant-rides", {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify(buildTrip()),
    }).then(function (result) {
      state.booking = false;
      btn.textContent = t("rideNow.confirmFindDriver");

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
          err.innerHTML = t("rideNow.insufficientWalletErrorHtml", { linkText: t("rideNow.topUpWalletLink") });
        } else {
          err.textContent = result.data.error || t("rideNow.bookError");
        }
        err.hidden = false;
        return;
      }

      state.activeRequestId = result.data.request.id;
      startSearching(result.data.request);
    });
  }

  // ───────────────────────── Searching / polling ─────────────────────
  function statusLabel(status) {
    if (status === "offering") return t("rideNow.statusOffering");
    if (status === "matched") return t("rideNow.statusMatched");
    return t("rideNow.statusSearching");
  }

  function startSearching(request) {
    showCard("searchingCard");
    state.lastRequestStatus = request ? request.status : "searching";
    document.getElementById("searchingStatus").textContent = statusLabel(state.lastRequestStatus);
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
        window.alert(t("rideNow.expiredAlert"));
        resetToPicker();
        return;
      }

      state.lastRequestStatus = request.status;
      document.getElementById("searchingStatus").textContent = statusLabel(request.status);

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
    state.lastRequestStatus = null;
    showCard("pickerCard");
  }

  // Re-renders JS-driven dynamic text (as opposed to the static
  // data-i18n-swapped chrome) after a language switch, so a user who
  // changes language mid-flow sees the new language immediately instead
  // of only on their next action.
  function refreshDynamicText() {
    var seeFareBtn = document.getElementById("seeFareBtn");
    if (seeFareBtn) seeFareBtn.textContent = seeFareBtn.disabled ? t("rideNow.gettingFare") : t("rideNow.seeFare");

    var confirmBtn = document.getElementById("confirmRideBtn");
    if (confirmBtn) confirmBtn.textContent = state.booking ? t("rideNow.booking") : t("rideNow.confirmFindDriver");

    var zoneTag = document.getElementById("quoteZoneTag");
    if (zoneTag) zoneTag.textContent = t("rideNow.highTrafficArea");

    var searchingStatus = document.getElementById("searchingStatus");
    if (searchingStatus && state.lastRequestStatus) {
      searchingStatus.textContent = statusLabel(state.lastRequestStatus);
    }
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
    //
    // Note: initLanguage() above already applied the detected/saved
    // language and called refreshDynamicText() once, before any of
    // this state exists yet -- harmless no-op at that point since
    // there's nothing dynamic on screen until a card below is shown.
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
