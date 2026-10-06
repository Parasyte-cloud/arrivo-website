(function () {
  "use strict";

  // ── Configuration ────────────────────────────────────────────────────
  // Deployment settings come from express-config.js (loaded before this
  // file). The standalone express.ridearrivo.com build ships its own copy of
  // that file; the main-site copy just holds these same defaults, so this
  // page behaves identically on both hosts.
  var CFG = window.ARRIVO_EXPRESS_CONFIG || {};
  var API_BASE_URL = CFG.apiBase || "https://arrivo-backend-g1ku.onrender.com"; // same as booking.js/script.js
  // On the main site these are relative page names. On express.ridearrivo.com
  // they are absolute URLs: login, account and ride tracking live on
  // www.ridearrivo.com, and "next" carries the full Express URL back.
  var LOGIN_PATH = CFG.loginPath || "login.html";
  var ACCOUNT_PATH = CFG.accountPath || "account.html";
  var TRACK_PATH = CFG.trackPath || "track.html";
  var SELF_PATH = CFG.selfPath || "express.html";

  // localStorage throws in some private-browsing modes and when site data is
  // blocked. Every read/write goes through these so the page still works
  // (the visitor just isn't remembered) instead of dying mid-init.
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
    remove: function (k) { try { window.localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };

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
  // booking.js's t() -- every dynamically-set string on this page (button
  // labels, status text, error messages) goes through this rather than
  // being hardcoded in English, so the page is fully translated like the
  // rest of the site instead of only the shared header/footer chrome.
  function t(path) {
    // NOTE: reference the bare `I18N` identifier, not `window.I18N`. i18n.js
    // declares it as a top-level `const`, which -- unlike `var` -- never
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
    document.querySelectorAll("[data-i18n-aria-label]").forEach(function (el) {
      var value = getNested(dict, el.getAttribute("data-i18n-aria-label"));
      if (value != null) el.setAttribute("aria-label", value);
    });
    document.querySelectorAll(".lang-opt").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
    });
    var label = document.getElementById("langTriggerLabel");
    if (label) label.textContent = LANG_LABELS[lang] || lang.toUpperCase();
    store.set(LANG_KEY, lang);

    // Re-render anything that mixes translated copy with live values --
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
    var saved = store.get(LANG_KEY);
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
      closeServicesMenu();
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

  // ───────────────────────── Services nav dropdown ─────────────────────
  // Same pattern as the language dropdown above, listing the four Arrivo
  // products. ArrivoBoat/ArrivoAir show as non-interactive "Coming soon"
  // rows (no href) until their subdomains are actually live.
  function closeServicesMenu() {
    var dropdown = document.getElementById("servicesDropdown");
    var menu = document.getElementById("servicesMenu");
    var trigger = document.getElementById("servicesTrigger");
    if (!dropdown || !menu) return;
    dropdown.classList.remove("open");
    menu.hidden = true;
    if (trigger) trigger.setAttribute("aria-expanded", "false");
  }

  function initServicesDropdown() {
    var dropdown = document.getElementById("servicesDropdown");
    var trigger = document.getElementById("servicesTrigger");
    var menu = document.getElementById("servicesMenu");
    if (!dropdown || !trigger || !menu) return;

    trigger.addEventListener("click", function (e) {
      e.stopPropagation();
      closeLangMenu();
      var isOpen = dropdown.classList.toggle("open");
      menu.hidden = !isOpen;
      trigger.setAttribute("aria-expanded", String(isOpen));
    });

    document.addEventListener("click", function (e) {
      if (!dropdown.contains(e.target)) closeServicesMenu();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeServicesMenu();
    });
  }

  // ───────────────────────── API helpers (same shape as booking.js) ─────
  //
  // options.auth     -> this call needs a signed-in rider. Sends the Bearer
  //                     token if this browser has one, and ALWAYS sends the
  //                     shared single sign-on cookie (credentials:"include"),
  //                     which is how a rider who logged in on www is already
  //                     signed in here with no token of our own.
  // options.soft401  -> a 401 is an expected answer (page-load probe), not a
  //                     reason to redirect to login.
  function api(path, options) {
    options = options || {};
    var headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
    if (options.auth && state.token) headers.Authorization = "Bearer " + state.token;
    var init = Object.assign({}, options, { headers: headers, credentials: "include" });
    delete init.auth;
    delete init.soft401;
    return fetch(API_BASE_URL + path, init).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        // A 401 on any authenticated call means the saved token is dead.
        // Handle it in one place so no step of the flow can strand the
        // rider on a spinner or a vague error.
        if (res.status === 401 && options.auth && !options.soft401) sessionExpired();
        return { ok: res.ok, status: res.status, data: data };
      });
    }).catch(function () {
      return { ok: false, status: 0, data: { error: t("arrivoExpress.networkError") } };
    });
  }

  var redirectingToLogin = false;
  function sessionExpired() {
    if (redirectingToLogin) return;
    redirectingToLogin = true;
    stopPolling();
    store.remove("arrivo_rider_token");
    window.location.href = LOGIN_PATH + "?next=" + encodeURIComponent(SELF_PATH);
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
    pollFailures: 0,
    booted: false,
  };

  var CARD_IDS = ["authGate", "unavailableCard", "loadingCard", "loadErrorCard", "pickerCard", "quoteCard", "searchingCard"];

  function showCard(id) {
    CARD_IDS.forEach(function (cid) {
      var el = document.getElementById(cid);
      if (el) el.hidden = cid !== id;
    });
    // Move keyboard/screen-reader focus to the new card's heading so a
    // step change is announced instead of silently swapping content.
    var shown = document.getElementById(id);
    var heading = shown && shown.querySelector("h2, p.error-text");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      if (state.booted) heading.focus({ preventScroll: true });
    }
    // Bring the shared map along to whichever card is now visible -- see
    // initRouteMap's comment on why this is one reparented div rather than
    // a map instance per card.
    if (id === "pickerCard") {
      mountMapInto("rnMapPickerSlot");
      initRouteMap();
    } else if (id === "quoteCard") {
      mountMapInto("rnMapQuoteSlot");
      if (googleMapInstance) google.maps.event.trigger(googleMapInstance, "resize");
    }
  }

  // ───────────────────────── Tier picker ─────────────────────────────
  // tier.label / tier.description in the API response come from the
  // backend's tier catalogue (services/instantTiers.js) and are
  // English-only -- arrivoExpress.tiers in i18n.js carries the translated
  // label/description for each known tier.key, looked up here instead.
  // Falls back to the backend's own English text for any tier.key that
  // isn't in that dictionary (a tier the backend added before i18n.js was
  // updated for it), so a new tier still renders instead of breaking.
  function tierText(tier, field) {
    var dict = (typeof I18N !== "undefined" && (I18N[currentLang()] || I18N.en)) || {};
    var entry = getNested(dict, "arrivoExpress.tiers." + tier.key);
    return (entry && entry[field]) || tier[field];
  }

  function renderTiers() {
    var container = document.getElementById("tierOptions");
    if (!container) return;
    container.innerHTML = "";
    state.tiers.forEach(function (tier) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "vehicle-card" + (tier.key === state.selectedTier ? " selected" : "");
      btn.innerHTML =
        '<span class="v-name">' + escapeHtml(tierText(tier, "label")) + "</span>" +
        '<span class="v-description">' + escapeHtml(tierText(tier, "description")) + "</span>";
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

  function setPickup(r) {
    var el = document.getElementById("rnPickup");
    state.pickup = r.address;
    state.pickupLatLng = { lat: r.lat, lng: r.lng };
    if (el) el.value = r.address;
    updateMapMarkers();
  }

  // Google's script tag calls this once the Maps JS API has loaded (see
  // express.html's script tag, callback=initGoogleMaps) -- same global
  // callback name booking.js uses, safe because the two pages never load
  // together.
  // Typing over a chosen address invalidates the coordinates that came with
  // it. Without this, editing the text after picking a suggestion would
  // quote and charge for the OLD place while showing the NEW text.
  function watchManualEdits() {
    var pickupEl = document.getElementById("rnPickup");
    var destEl = document.getElementById("rnDestination");
    if (pickupEl) pickupEl.addEventListener("input", function () {
      if (pickupEl.value.trim() !== state.pickup) { state.pickupLatLng = null; clearMarker("pickup"); }
    });
    if (destEl) destEl.addEventListener("input", function () {
      if (destEl.value.trim() !== state.destination) { state.destinationLatLng = null; clearMarker("destination"); }
    });
  }

  window.initGoogleMaps = function () {
    placesReady = true;
    var pickupEl = document.getElementById("rnPickup");
    var destEl = document.getElementById("rnDestination");
    attachPlacesAutocomplete(pickupEl, function (r) {
      setPickup(r);
    });
    attachPlacesAutocomplete(destEl, function (r) {
      state.destination = r.address;
      state.destinationLatLng = { lat: r.lat, lng: r.lng };
      if (destEl) destEl.value = r.address;
      updateMapMarkers();
    });
    initRouteMap();
  };

  // ───────────────────────── Route map (pickup/destination preview) ─────
  // One Google Map instance shared between the picker card (while choosing
  // addresses) and the quote card (to preview the confirmed route) -- the
  // #rnMap div itself gets physically reparented between the two cards'
  // slots rather than standing up a second map instance, same
  // single-map-instance idea booking.js uses for book.html's #routeMap.
  var LAGOS_CENTER = { lat: 6.5244, lng: 3.3792 };
  var googleMapInstance = null;
  var pickupMarker = null;
  var destinationMarker = null;
  var directionsService = null;
  var directionsRenderer = null;

  function initRouteMap() {
    var mapEl = document.getElementById("rnMap");
    var errEl = document.getElementById("mapsError");
    if (!mapEl) return;

    if (!window.google || !window.google.maps) {
      // Not loaded YET is normal (script is async); checkMapsLoaded decides
      // when to give up and show the error.
      return;
    }

    if (!googleMapInstance) {
      googleMapInstance = new google.maps.Map(mapEl, {
        center: LAGOS_CENTER,
        zoom: 11,
        disableDefaultUI: true,
        zoomControl: true,
      });
      directionsService = new google.maps.DirectionsService();
      directionsRenderer = new google.maps.DirectionsRenderer({
        map: googleMapInstance,
        suppressMarkers: true, // pickupMarker/destinationMarker below give us control of their look
        polylineOptions: { strokeColor: "#12123B", strokeWeight: 4, strokeOpacity: 0.85 },
      });
    } else {
      // The map div may just have been reparented, or its card may have
      // been hidden (display:none) and just become visible again -- either
      // way Google Maps needs an explicit nudge to redraw at the right
      // size, otherwise it can render blank or mis-sized.
      google.maps.event.trigger(googleMapInstance, "resize");
      if (!state.pickupLatLng && !state.destinationLatLng) googleMapInstance.setCenter(LAGOS_CENTER);
    }
  }

  // Moves the single #rnMap div into whichever card's slot should show it
  // right now, then nudges Maps to redraw -- see initRouteMap's comment.
  function mountMapInto(slotId) {
    var mapEl = document.getElementById("rnMap");
    var slot = document.getElementById(slotId);
    if (!mapEl || !slot || mapEl.parentNode === slot) return;
    slot.appendChild(mapEl);
    if (googleMapInstance) google.maps.event.trigger(googleMapInstance, "resize");
  }

  function updateMapMarkers() {
    if (!googleMapInstance) return;

    if (state.pickupLatLng) {
      if (!pickupMarker) {
        pickupMarker = new google.maps.Marker({
          map: googleMapInstance,
          position: state.pickupLatLng,
          label: { text: "A", color: "#fff", fontSize: "11px", fontWeight: "700" },
          title: state.pickup,
        });
      } else {
        pickupMarker.setPosition(state.pickupLatLng);
        pickupMarker.setTitle(state.pickup);
      }
    }

    if (state.destinationLatLng) {
      if (!destinationMarker) {
        destinationMarker = new google.maps.Marker({
          map: googleMapInstance,
          position: state.destinationLatLng,
          label: { text: "B", color: "#fff", fontSize: "11px", fontWeight: "700" },
          title: state.destination,
        });
      } else {
        destinationMarker.setPosition(state.destinationLatLng);
        destinationMarker.setTitle(state.destination);
      }
    }

    if (state.pickupLatLng && state.destinationLatLng) {
      drawRoute();
    } else if (state.pickupLatLng) {
      googleMapInstance.panTo(state.pickupLatLng);
      googleMapInstance.setZoom(15);
    } else if (state.destinationLatLng) {
      googleMapInstance.panTo(state.destinationLatLng);
      googleMapInstance.setZoom(15);
    }
  }

  function clearMarker(which) {
    if (which === "pickup" && pickupMarker) { pickupMarker.setMap(null); pickupMarker = null; }
    if (which === "destination" && destinationMarker) { destinationMarker.setMap(null); destinationMarker = null; }
    clearRouteLines();
  }

  var fallbackLine = null;
  function clearRouteLines() {
    if (fallbackLine) { fallbackLine.setMap(null); fallbackLine = null; }
    if (directionsRenderer) directionsRenderer.set("directions", null);
  }

  function drawRoute() {
    if (!directionsService || !directionsRenderer || !googleMapInstance) return;
    directionsService.route({
      origin: state.pickupLatLng,
      destination: state.destinationLatLng,
      travelMode: google.maps.TravelMode.DRIVING,
    }, function (result, status) {
      // Ignore a late answer for addresses the rider has since changed.
      if (!state.pickupLatLng || !state.destinationLatLng) return;
      if (fallbackLine) { fallbackLine.setMap(null); fallbackLine = null; }
      if (status === "OK") {
        directionsRenderer.setDirections(result);
        return;
      }
      // Directions unavailable (API not enabled for this key, no drivable
      // route, or a transient error): show both pins joined by a dashed
      // straight line so the map still reads as a trip, and fit both in view.
      directionsRenderer.set("directions", null);
      fallbackLine = new google.maps.Polyline({
        map: googleMapInstance,
        path: [state.pickupLatLng, state.destinationLatLng],
        strokeOpacity: 0,
        icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.8, strokeColor: "#12123B", scale: 3 }, offset: "0", repeat: "14px" }],
      });
      var bounds = new google.maps.LatLngBounds();
      bounds.extend(state.pickupLatLng);
      bounds.extend(state.destinationLatLng);
      googleMapInstance.fitBounds(bounds, 40);
    });
  }

  // If the Maps script is slow, blocked, or fails to load, don't leave the
  // picker silently broken -- tell the visitor plain typing still works.
  function checkMapsLoaded(attemptsLeft) {
    if (attemptsLeft === undefined) attemptsLeft = 20; // ~6s total
    if (placesReady) return;
    if (attemptsLeft > 0) {
      setTimeout(function () { checkMapsLoaded(attemptsLeft - 1); }, 300);
      return;
    }
    showMapsError();
  }

  function showMapsError() {
    var errEl = document.getElementById("mapsError");
    if (errEl) errEl.hidden = false;
  }

  // Google calls this when the key is rejected (referrer not allowed, API
  // not enabled, billing off). Treated like a load failure.
  window.gm_authFailure = function () { showMapsError(); };

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
      auth: true,
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

  function useMyLocation() {
    var err = document.getElementById("pickerError");
    var btn = document.getElementById("useLocationBtn");
    err.hidden = true;
    if (!navigator.geolocation) {
      err.textContent = t("arrivoExpress.locationFailed");
      err.hidden = false;
      return;
    }
    btn.disabled = true;
    btn.textContent = t("arrivoExpress.locating");
    function done() {
      btn.disabled = false;
      btn.textContent = t("arrivoExpress.useMyLocation");
    }
    navigator.geolocation.getCurrentPosition(function (pos) {
      var lat = pos.coords.latitude;
      var lng = pos.coords.longitude;
      api("/api/places/reverse-geocode?lat=" + encodeURIComponent(lat) + "&lng=" + encodeURIComponent(lng), { auth: true }).then(function (result) {
        done();
        if (!result.ok || !result.data.address) {
          err.textContent = t("arrivoExpress.locationFailed");
          err.hidden = false;
          return;
        }
        setPickup({ address: result.data.address, lat: lat, lng: lng });
      });
    }, function (e) {
      done();
      err.textContent = e && e.code === 1 ? t("arrivoExpress.locationDenied") : t("arrivoExpress.locationFailed");
      err.hidden = false;
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }

  function renderQuote(skipWalletCheck) {
    var q = state.quote;
    var tierConfig = state.tiers.filter(function (tr) { return tr.key === state.selectedTier; })[0];

    document.getElementById("quoteTierLabel").textContent = tierConfig ? tierText(tierConfig, "label") : state.selectedTier;
    document.getElementById("quoteZoneTag").style.display = q.zone === "yellow" ? "inline-block" : "none";
    document.getElementById("quoteRoute").textContent = state.pickup + " → " + state.destination;
    document.getElementById("quoteDistance").textContent = tFormat("arrivoExpress.distanceKm", { distance: typeof q.distanceKm === "number" ? q.distanceKm.toFixed(1) : "N/A" });
    document.getElementById("quoteDuration").textContent = tFormat("arrivoExpress.durationMin", { duration: Math.round(Number(q.durationMin) || 0) });
    document.getElementById("quoteFare").textContent = formatNaira(q.fareNaira);
    document.getElementById("quoteError").hidden = true;

    updateMapMarkers();
    showCard("quoteCard");

    // On a language switch we're just re-rendering already-fetched numbers,
    // not re-checking the wallet balance again.
    if (skipWalletCheck) return;

    refreshWalletNote();
  }

  function refreshWalletNote() {
    var q = state.quote;
    var confirmBtn = document.getElementById("confirmRideBtn");
    var note = document.getElementById("walletBalanceNote");
    confirmBtn.disabled = true;
    note.textContent = t("arrivoExpress.walletBalanceChecking");

    api("/api/wallet", { auth: true }).then(function (result) {
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
          ' <a href="' + ACCOUNT_PATH + '">' + escapeHtml(t("arrivoExpress.topUpWalletLink")) + "</a>";
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
      auth: true,
      // expectedFareNaira lets the server refuse (409 FARE_CHANGED) if live
      // traffic pushed the fare up since the rider saw it. Older backends
      // ignore the unknown field.
      body: JSON.stringify(Object.assign(buildTrip(), { expectedFareNaira: state.quote ? state.quote.fareNaira : undefined })),
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
          api("/api/instant-rides/rider/active", { auth: true }).then(function (activeResult) {
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
        if (result.data.code === "FARE_CHANGED" && result.data.fareNaira != null) {
          state.quote.fareNaira = Number(result.data.fareNaira);
          renderQuote(true);
          document.getElementById("walletBalanceNote").textContent = "";
          refreshWalletNote();
          err.textContent = tFormat("arrivoExpress.fareChanged", { fare: formatNaira(state.quote.fareNaira) });
          err.hidden = false;
          return;
        }
        if (result.data.code === "INSUFFICIENT_WALLET") {
          err.innerHTML = tFormat("arrivoExpress.walletBalanceInsufficient", { balance: formatNaira(result.data.balanceNaira || 0) }) +
            ' <a href="' + ACCOUNT_PATH + '">' + escapeHtml(t("arrivoExpress.topUpWalletLink")) + "</a>";
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
    state.pollFailures = 0;
    setSearchingError("");
    pollActive();
    state.pollTimer = setInterval(pollActive, 4000);
  }

  function stopPolling() {
    if (state.pollTimer) {
      clearInterval(state.pollTimer);
      state.pollTimer = null;
    }
  }

  var MAX_POLL_FAILURES = 15; // ~1 minute at the 4s poll interval

  function pollActive() {
    api("/api/instant-rides/rider/active", { auth: true }).then(function (result) {
      if (!result.ok) {
        // Transient hiccup -- try again next tick, but not forever: after
        // MAX_POLL_FAILURES in a row (backend down, token expired, etc.)
        // leaving the rider on an endless spinner with no feedback is
        // worse than stopping and telling them something went wrong.
        state.pollFailures += 1;
        if (state.pollFailures >= MAX_POLL_FAILURES) {
          stopPolling();
          resetToPicker(t("arrivoExpress.searchTimedOutTitle") + " " + t("arrivoExpress.searchTimedOutBody"));
        }
        return;
      }
      state.pollFailures = 0;

      var request = result.data.request;

      if (!request) {
        // No longer active anywhere -- expired (auto-refunded server-side,
        // see arrivo-backend services/instantWallet.js) or cancelled from
        // another tab/device.
        stopPolling();
        resetToPicker(t("arrivoExpress.expiredBody"));
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
        window.location.href = TRACK_PATH + "?ride=" + request.ride_id;
      }
    });
  }

  function cancelSearch() {
    if (!state.activeRequestId) return;
    var btn = document.getElementById("cancelSearchBtn");
    btn.disabled = true;
    api("/api/instant-rides/rider/requests/" + state.activeRequestId + "/cancel", {
      method: "POST",
      auth: true,
    }).then(function (result) {
      btn.disabled = false;
      if (!result.ok) {
        // The cancel call actually failed server-side -- the request is
        // still live there. Keep polling and tell the rider, instead of
        // silently resetting to the picker while a driver could still be
        // matched underneath them.
        setSearchingError(t("arrivoExpress.cantCancelTitle") + " " + t("arrivoExpress.cantCancelBody"));
        return;
      }
      stopPolling();
      resetToPicker();
    });
  }

  function setSearchingError(msg) {
    var el = document.getElementById("searchingError");
    if (!el) return;
    el.textContent = msg || "";
    el.hidden = !msg;
  }

  function resetToPicker(message) {
    state.quote = null;
    state.activeRequestId = null;
    state.pollFailures = 0;
    showCard("pickerCard");
    var err = document.getElementById("pickerError");
    if (message) {
      err.textContent = message;
      err.hidden = false;
    } else {
      err.hidden = true;
    }
  }

  // ───────────────────────── Init ────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    function safeRun(fn, label) {
      try { fn(); } catch (err) { console.error("[express] " + label + " failed:", err); }
    }

    safeRun(initLanguage, "initLanguage");
    safeRun(initServicesDropdown, "initServicesDropdown");
    checkMapsLoaded();

    document.getElementById("seeFareBtn").addEventListener("click", getFare);
    document.getElementById("confirmRideBtn").addEventListener("click", confirmRide);
    document.getElementById("backToPickerBtn").addEventListener("click", function () { showCard("pickerCard"); });
    document.getElementById("cancelSearchBtn").addEventListener("click", cancelSearch);
    document.getElementById("useLocationBtn").addEventListener("click", useMyLocation);
    watchManualEdits();

    // ArrivoExpress settles from the RideArrivo Wallet, so -- same rule
    // book.html already enforces for scheduled bookings -- a logged-in
    // account is required. No guest path here.
    // No saved token no longer means "logged out": on a subdomain the
    // session is the shared cookie, which page JavaScript cannot see. So
    // always ask the server; a 401 below shows the log-in card.
    state.token = store.get("arrivo_rider_token");
    showCard("loadingCard");

    function loadEverything() {
      showCard("loadingCard");
      Promise.all([
        api("/api/instant-rides/status", { auth: true, soft401: true }),
        api("/api/instant-rides/rider/active", { auth: true, soft401: true }),
      ]).then(function (results) {
        var statusResult = results[0];
        var activeResult = results[1];

        if (statusResult.status === 401) {
          // Not signed in (or the session expired). Show the log-in card
          // rather than bouncing, so a first-time visitor sees what this is.
          store.remove("arrivo_rider_token");
          state.token = null;
          showCard("authGate");
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
          window.location.href = TRACK_PATH + "?ride=" + existing.ride_id;
          return null;
        }

        if (existing) {
          state.activeRequestId = existing.id;
          state.pickup = existing.pickup_address;
          state.destination = existing.destination_address;
          startSearching(existing);
          return null;
        }

        return api("/api/instant-rides/tiers", { auth: true }).then(function (tiersResult) {
          state.tiers = (tiersResult.ok && tiersResult.data.tiers) || [];
          state.selectedTier = state.tiers.length ? state.tiers[0].key : null;
          renderTiers();
          showCard("pickerCard");
        });
      });
    }

    document.getElementById("loadRetryBtn").addEventListener("click", loadEverything);
    loadEverything();
    state.booted = true;
  });

  // Exposed for automated testing only.
  window.__arrivoExpressTestHooks = { state: state, showCard: showCard };
})();
