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
  function getNested(obj, path) {
    return path.split(".").reduce(function (acc, key) { return acc && acc[key]; }, obj);
  }

  function currentLang() {
    return SUPPORTED_LANGS.indexOf(document.documentElement.lang) !== -1 ? document.documentElement.lang : "en";
  }

  // Looks up "arrivoExpress.foo"-style keys from I18N, same convention as
  // booking.js's t() — every dynamically-set string on this page (button
  // labels, status text, error messages) goes through this rather than
  // being hardcoded in English, so the page is fully translated like the
  // rest of the site instead of only the shared header/footer chrome.
  function t(path) {
    // NOTE: reference the bare `I18N` identifier, not `window.I18N`. i18n.js
    // declares it as a top-level `const`, which — unlike `var` — never
    // becomes a `window` property, even though it's still visible by name
    // to every other classic (non-module) script on the page. booking.js
    // relies on this same bare-identifier lookup; `window.I18N` is always
    // undefined and silently breaks every translation lookup that uses it.
    var dict = (typeof I18N !== "undefined" && (I18N[currentLang()] || I18N.en)) || {};
    return getNested(dict, path) || path;
  }

  function tFormat(path, replacements) {
    var str = t(path);
    Object.keys(replacements || {}).forEach(function (key) {
      str = str.replace(new RegExp("\\{" + key + "\\}", "g"), replacements[key]);
    });
    return str;
  }

  function applyLanguage(lang) {
    var dict = (typeof I18N !== "undefined" && (I18N[lang] || I18N.en)) || {};
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

    // Re-render anything that mixes translated copy with live values —
    // static data-i18n swaps above don't cover these.
    if (!document.getElementById("pickerCard").hidden) renderTiers();
    if (!document.getElementById("quoteCard").hidden && state.quote) renderQuote(true);
    if (!document.getElementById("searchingCard").hidden) renderSearchingChrome();
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
      return { ok: false, status: 0, data: { error: t("arrivoExpress.networkError") } };
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
    lastKnownStatus: null,
  };

  var CARD_IDS = ["authGate", "unavailableCard", "loadingCard", "loadErrorCard", "pickerCard", "quoteCard", "searchingCard"];

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
      // tier.label / tier.description come from the backend's tier catalogue
      // (services/instantTiers.js) and are English-only today, same as the
      // mobile app's ArrivoExpressScreen — not run through t().
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
  var placesReady = false;

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
  // express.html's script tag, callback=initGoogleMaps) -- same global
  // callback name booking.js uses, safe because the two pages never load
  // together.
  window.initGoogleMaps = function () {
    placesReady = true;
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

  // If the Maps script is slow, blocked, or fails to load, don't leave the
  // picker silently broken -- tell the visitor plain typing still works.
  function checkMapsLoaded(attemptsLeft) {
    if (attemptsLeft === undefined) attemptsLeft = 20; // ~6s total
    if (placesReady) return;
    if (attemptsLeft > 0) {
      setTimeout(function () { checkMapsLoaded(attemptsLeft - 1); }, 300);
      return;
    }
    var errEl = document.getElementById("mapsError");
    if (errEl) errEl.hidden = false;
  }

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
      err.textContent = t("arrivoExpress.chooseVehicleError");
      err.hidden = false;
      return;
    }
    var pickupVal = document.getElementById("rnPickup").value.trim();
    var destVal = document.getElementById("rnDestination").value.trim();
    if (!pickupVal || !state.pickupLatLng) {
      err.textContent = t("arrivoExpress.selectPickupError");
      err.hidden = false;
      return;
    }
    if (!destVal || !state.destinationLatLng) {
      err.textContent = t("arrivoExpress.selectDestinationError");
      err.hidden = false;
      return;
    }
    state.pickup = pickupVal;
    state.destination = destVal;

    var btn = document.getElementById("seeFareBtn");
    btn.disabled = true;
    btn.textContent = t("arrivoExpress.gettingFare");

    api("/api/instant-rides/quote", {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify(buildTrip()),
    }).then(function (result) {
      btn.disabled = false;
      btn.textContent = t("arrivoExpress.seeFare");
      if (!result.ok) {
        err.textContent = result.data.error || t("arrivoExpress.fareError");
        err.hidden = false;
        return;
      }
      state.quote = result.data.quote;
      renderQuote();
    });
  }

  function renderQuote(skipWalletCheck) {
    var q = state.quote;
    var tierConfig = state.tiers.filter(function (tr) { return tr.key === state.selectedTier; })[0];

    document.getElementById("quoteTierLabel").textContent = tierConfig ? tierConfig.label : state.selectedTier;
    document.getElementById("quoteZoneTag").style.display = q.zone === "yellow" ? "inline-block" : "none";
    document.getElementById("quoteRoute").textContent = state.pickup + " → " + state.destination;
    document.getElementById("quoteDistance").textContent = tFormat("arrivoExpress.distanceKm", { distance: q.distanceKm != null ? q.distanceKm.toFixed(1) : "—" });
    document.getElementById("quoteDuration").textContent = tFormat("arrivoExpress.durationMin", { duration: Math.round(q.durationMin) });
    document.getElementById("quoteFare").textContent = formatNaira(q.fareNaira);
    document.getElementById("quoteError").hidden = true;

    showCard("quoteCard");

    // On a language switch we're just re-rendering already-fetched numbers,
    // not re-checking the wallet balance again.
    if (skipWalletCheck) return;

    var confirmBtn = document.getElementById("confirmRideBtn");
    var note = document.getElementById("walletBalanceNote");
    confirmBtn.disabled = true;
    note.textContent = t("arrivoExpress.walletBalanceChecking");

    api("/api/wallet", { headers: authHeader() }).then(function (result) {
      if (!result.ok) {
        note.textContent = "";
        confirmBtn.disabled = false; // let the backend be the final word on this
        return;
      }
      var balance = Number(result.data.balanceNaira || 0);
      if (balance >= q.fareNaira) {
        note.textContent = tFormat("arrivoExpress.walletBalanceSufficient", { balance: formatNaira(balance) });
        confirmBtn.disabled = false;
      } else {
        note.innerHTML =
          tFormat("arrivoExpress.walletBalanceInsufficient", { balance: formatNaira(balance) }) +
          ' <a href="account.html">' + escapeHtml(t("arrivoExpress.topUpWalletLink")) + "</a>";
        confirmBtn.disabled = true;
      }
    });
  }

  function confirmRide() {
    var err = document.getElementById("quoteError");
    err.hidden = true;

    var btn = document.getElementById("confirmRideBtn");
    btn.disabled = true;
    btn.textContent = t("arrivoExpress.bookingRide");

    api("/api/instant-rides", {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify(buildTrip()),
    }).then(function (result) {
      btn.textContent = t("arrivoExpress.confirmFindDriver");

      if (!result.ok) {
        if (result.data.code === "ACTIVE_INSTANT_REQUEST") {
          // Already has one in flight (double-submit, another tab, or a
          // rare race against the app-level check) -- don't trust a
          // possibly-missing requestId in the response, just ask the
          // server what's actually active and resume watching that. This
          // mirrors the mobile app's ArrivoExpressScreen.confirmRide,
          // which does the same re-fetch instead of trusting the error body.
          api("/api/instant-rides/rider/active", { headers: authHeader() }).then(function (activeResult) {
            var existing = activeResult.ok ? activeResult.data.request : null;
            if (existing) {
              state.pickup = existing.pickup_address || state.pickup;
              state.destination = existing.destination_address || state.destination;
              startSearching(existing);
            } else {
              btn.disabled = false;
              err.textContent = result.data.error || t("arrivoExpress.bookError");
              err.hidden = false;
            }
          });
          return;
        }
        btn.disabled = false;
        if (result.data.code === "INSUFFICIENT_WALLET") {
          err.innerHTML = tFormat("arrivoExpress.walletBalanceInsufficient", { balance: formatNaira(result.data.balanceNaira || 0) }) +
            ' <a href="account.html">' + escapeHtml(t("arrivoExpress.topUpWalletLink")) + "</a>";
        } else {
          err.textContent = result.data.error || t("arrivoExpress.bookError");
        }
        err.hidden = false;
        return;
      }

      state.activeRequestId = result.data.request.id;
      startSearching(result.data.request);
    });
  }

  // ───────────────────────── Searching / polling ─────────────────────
  function renderSearchingChrome() {
    document.getElementById("searchingStatus").textContent = statusLabel(state.lastKnownStatus);
    document.getElementById("searchingRoute").textContent = state.pickup + " → " + state.destination;
  }

  function statusLabel(status) {
    if (status === "offering") return t("arrivoExpress.statusOffering");
    if (status === "matched") return t("arrivoExpress.statusMatched");
    if (status === "searching") return t("arrivoExpress.statusSearching");
    return t("arrivoExpress.statusDefault");
  }

  function startSearching(request) {
    showCard("searchingCard");
    state.lastKnownStatus = (request && request.status) || "searching";
    document.getElementById("searchingStatus").textContent = statusLabel(state.lastKnownStatus);
    document.getElementById("searchingRoute").textContent = state.pickup + " → " + state.destination;
    document.getElementById("searchingFare").textContent = request && request.estimated_fare_naira != null ? formatNaira(request.estimated_fare_naira) : "";
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
        window.alert(t("arrivoExpress.expiredBody"));
        resetToPicker();
        return;
      }

      // Keep this in sync however we entered the searching phase (a fresh
      // booking, a resumed double-submit, or an existing request found on
      // page load) so "Cancel request" always has a real id to act on.
      state.activeRequestId = request.id;
      state.lastKnownStatus = request.status;
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
    showCard("pickerCard");
  }

  // ───────────────────────── Init ────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    function safeRun(fn, label) {
      try { fn(); } catch (err) { console.error("[express] " + label + " failed:", err); }
    }

    safeRun(initLanguage, "initLanguage");
    checkMapsLoaded();

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

    function loadEverything() {
      showCard("loadingCard");
      Promise.all([
        api("/api/instant-rides/status", { headers: authHeader() }),
        api("/api/instant-rides/rider/active", { headers: authHeader() }),
      ]).then(function (results) {
        var statusResult = results[0];
        var activeResult = results[1];

        if (statusResult.status === 401) {
          // Token expired/invalid -- same handling as book.html's initStep1.
          localStorage.removeItem("arrivo_rider_token");
          window.location.href = "login.html?next=express.html";
          return null;
        }

        if (!statusResult.ok) {
          document.getElementById("loadErrorText").textContent = statusResult.data.error || t("arrivoExpress.loadError");
          showCard("loadErrorCard");
          return null;
        }

        if (!statusResult.data.enabled) {
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
    }

    document.getElementById("loadRetryBtn").addEventListener("click", loadEverything);
    loadEverything();
  });

  // Exposed for automated testing only.
  window.__arrivoExpressTestHooks = { state: state, showCard: showCard };
})();
