(function () {
  "use strict";

  var CFG = window.ARRIVO_EXPRESS_CONFIG || {};
  var ENGINE = String(CFG.engineBase || "https://express.ridearrivo.com").replace(/\/$/, "");
  var LOGIN_PATH = CFG.loginPath || "login.html";
  var SIGNUP_PATH = CFG.signupPath || "signup.html";
  var SELF_PATH = CFG.selfPath || "express.html";
  var LEGACY_TOKEN_KEY = "arrivo_rider_token";
  var JOURNEY_KEY = "arrivo_express_canonical_journey";
  var PENDING_LINK_KEY = "arrivo_express_pending_link";
  var PENDING_SOCIAL_CLAIM_KEY = "arrivo_express_social_claim";
  var $ = function (q) { return document.querySelector(q); };
  var $$ = function (q) { return Array.prototype.slice.call(document.querySelectorAll(q)); };

  var state = {
    identity: null,
    journey: null,
    journeyId: null,
    journeyToken: null,
    deepLink: null,
    selectedVehicle: null,
    pickup: null,
    destination: null,
    pollTimer: null,
    source: "web",
    attribution: {},
    postTipKobo: 0,
    postRating: 0,
    map: null,
    pickupMarker: null,
    destinationMarker: null,
    driverMarker: null,
    directionsService: null,
    directionsRenderer: null,
    socialClaimToken: null,
    trackingOnly: false
  };

  function safeStoreGet(store, key) { try { return store.getItem(key); } catch (e) { return null; } }
  function safeStoreSet(store, key, value) { try { store.setItem(key, value); } catch (e) {} }
  function safeStoreRemove(store, key) { try { store.removeItem(key); } catch (e) {} }
  function requestId() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : "web-" + Date.now() + "-" + Math.random().toString(16).slice(2); }
  function money(kobo) { return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(Number(kobo || 0) / 100); }
  function showError(id, message) { var el = $(id); if (!el) return; el.textContent = message || ""; el.hidden = !message; }
  function errorMessage(payload, fallback) { return payload && payload.error ? (payload.error.message || payload.error) : fallback; }
  function setBusy(btn, busy, label) { if (!btn) return; if (!btn.dataset.idleLabel) btn.dataset.idleLabel = btn.textContent; btn.disabled = !!busy; btn.classList.toggle("express-busy", !!busy); if (busy && label) btn.textContent = label; else if (!busy) btn.textContent = btn.dataset.idleLabel; }
  function sameSiteNext(path) { return encodeURIComponent(path || SELF_PATH); }

  function api(path, options) {
    options = options || {};
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, options.timeout || 12000);
    var headers = Object.assign({
      "Accept": "application/json",
      "X-Arrivo-Surface": "web",
      "X-Arrivo-Client": "ridearrivo-website",
      "X-Request-Id": requestId()
    }, options.headers || {});
    if (options.body !== undefined && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
    return fetch(ENGINE + path, {
      method: options.method || "GET",
      credentials: "include",
      headers: headers,
      body: options.body === undefined ? undefined : (typeof options.body === "string" ? options.body : JSON.stringify(options.body)),
      signal: controller.signal
    }).then(function (res) {
      clearTimeout(timeout);
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) {
          var e = new Error(errorMessage(data, "RideArrivo could not complete this request."));
          e.status = res.status;
          e.code = data && data.error && data.error.code;
          e.data = data;
          throw e;
        }
        return data;
      });
    }).catch(function (err) {
      clearTimeout(timeout);
      if (err && err.name === "AbortError") throw new Error("RideArrivo is taking too long to respond. Please try again.");
      throw err;
    });
  }

  function authHeaders() { return state.journeyToken ? { "Authorization": "Bearer " + state.journeyToken } : {}; }
  function showStep(id) {
    ["routeStep", "quoteStep", "searchingStep", "tripStep", "authStep"].forEach(function (x) {
      var el = $("#" + x); if (el) el.hidden = x !== id;
    });
    var active = $("#" + id); var heading = active && active.querySelector("h1,h2");
    if (heading) { heading.setAttribute("tabindex", "-1"); try { heading.focus({ preventScroll: true }); } catch (e) {} }
  }
  function shortAddress(s) { s = String(s || ""); return s.length > 27 ? s.slice(0, 26) + "…" : s; }
  function updateRouteChip() {
    var p = state.pickup && state.pickup.address; var d = state.destination && state.destination.address;
    var chip = $("#routeChip"); if (!chip) return;
    chip.hidden = !(p || d); if (p) $("#routeChipPickup").textContent = shortAddress(p); if (d) $("#routeChipDestination").textContent = shortAddress(d);
  }
  function rememberJourney(out) {
    if (out.journey) state.journey = out.journey;
    state.journeyId = (out.journey && out.journey.id) || state.journeyId;
    state.journeyToken = out.token || state.journeyToken;
    state.deepLink = out.deepLink || state.deepLink;
    if (state.journeyId && state.journeyToken) safeStoreSet(sessionStorage, JOURNEY_KEY, JSON.stringify({ id: state.journeyId, token: state.journeyToken, deepLink: state.deepLink || null }));
  }
  function clearJourney() { state.journey = null; state.journeyId = null; state.journeyToken = null; state.deepLink = null; state.selectedVehicle = null; safeStoreRemove(sessionStorage, JOURNEY_KEY); stopPolling(); }

  function initMap() {
    var el = $("#expressMap"); if (!el || !window.google || !google.maps) return;
    if (!state.map) {
      state.map = new google.maps.Map(el, { center: { lat: 6.5244, lng: 3.3792 }, zoom: 11, disableDefaultUI: true, zoomControl: true, gestureHandling: "cooperative" });
      state.directionsService = new google.maps.DirectionsService();
      state.directionsRenderer = new google.maps.DirectionsRenderer({ map: state.map, suppressMarkers: true, polylineOptions: { strokeColor: "#07111f", strokeWeight: 5, strokeOpacity: .86 } });
      $("#expressMapFallback").hidden = true;
      setupAutocomplete("rnPickup", "pickup"); setupAutocomplete("rnDestination", "destination");
    }
    updateMap();
  }
  function setupAutocomplete(id, kind) {
    var input = $("#" + id); if (!input || !google.maps.places) return;
    var ac = new google.maps.places.Autocomplete(input, { fields: ["formatted_address", "name", "geometry", "place_id"], componentRestrictions: { country: "ng" } });
    ac.addListener("place_changed", function () {
      var place = ac.getPlace(); if (!place || !place.geometry || !place.geometry.location) return;
      var value = { address: place.formatted_address || place.name || input.value, lat: place.geometry.location.lat(), lng: place.geometry.location.lng(), placeId: place.place_id || null };
      state[kind] = value; input.value = value.address; updateMap(); updateRouteChip();
    });
    input.addEventListener("input", function () { if (state[kind] && input.value.trim() !== state[kind].address) state[kind] = null; });
  }
  function marker(kind, location, label) {
    if (!state.map || !location) return;
    var key = kind + "Marker";
    if (!state[key]) state[key] = new google.maps.Marker({ map: state.map, title: label, label: kind === "pickup" ? "A" : kind === "destination" ? "B" : "D" });
    state[key].setPosition({ lat: Number(location.lat), lng: Number(location.lng) });
  }
  function updateMap() {
    if (!state.map) return;
    marker("pickup", state.pickup, "Pickup"); marker("destination", state.destination, "Destination");
    if (state.pickup && state.destination) {
      state.directionsService.route({ origin: state.pickup, destination: state.destination, travelMode: google.maps.TravelMode.DRIVING }, function (result, status) {
        if (status === "OK") state.directionsRenderer.setDirections(result);
      });
    } else if (state.pickup) state.map.panTo(state.pickup);
  }
  window.initGoogleMaps = initMap;

  function useMyLocation() {
    showError("#pickerError", "");
    if (!navigator.geolocation) return showError("#pickerError", "Location is not available on this device.");
    navigator.geolocation.getCurrentPosition(function (pos) {
      var loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, address: "Current location" };
      state.pickup = loc; $("#rnPickup").value = loc.address; updateRouteChip(); updateMap();
      if (window.google && google.maps && google.maps.Geocoder) {
        new google.maps.Geocoder().geocode({ location: loc }, function (results, status) {
          if (status === "OK" && results && results[0]) { state.pickup.address = results[0].formatted_address; $("#rnPickup").value = state.pickup.address; updateRouteChip(); }
        });
      }
    }, function (e) { showError("#pickerError", e && e.code === 1 ? "Allow location access to use your current pickup." : "We couldn't get your location. Enter your pickup instead."); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
  }

  function routeDraft() {
    var pickupText = $("#rnPickup").value.trim(); var destinationText = $("#rnDestination").value.trim();
    if (!pickupText || !destinationText) throw new Error("Choose both pickup and destination.");
    if (!state.pickup || !state.destination) throw new Error("Choose pickup and destination from the location suggestions so RideArrivo can price the route safely.");
    return { serviceType: "express", rideMode: "now", pickup: pickupText, destination: destinationText, pickupLocation: state.pickup, destinationLocation: state.destination, passengers: 1, bags: 0 };
  }
  function sourceContext() {
    var q = new URLSearchParams(location.search); var src = q.get("src") || state.source || "web";
    return { sourceChannel: src, attribution: { source: src, medium: src === "web" ? "website" : "social_handoff", campaign: q.get("utm_campaign") || "arrivoexpress", utm_source: q.get("utm_source") || src, utm_medium: q.get("utm_medium") || undefined } };
  }

  function federateLegacySession() {
    var token = safeStoreGet(localStorage, LEGACY_TOKEN_KEY);
    if (!token) return Promise.resolve(false);
    return api("/api/identity/first-party/ridearrivo", { method: "POST", headers: { "X-RideArrivo-Session": token }, body: {} }).then(function (out) {
      state.identity = out.identity || null; renderAccount(); return true;
    }).catch(function (e) {
      if (e.status === 401) { safeStoreRemove(localStorage, LEGACY_TOKEN_KEY); renderAccount(); return false; }
      throw e;
    });
  }
  function bootstrapIdentity() {
    return api("/api/session/bootstrap").then(function (out) { state.identity = out.identity || null; renderAccount(); return out; }).catch(function (e) { if (e.status === 401) { state.identity = null; renderAccount(); return null; } throw e; });
  }
  function renderAccount() {
    var btn = $("#expressAccountButton"); if (!btn) return;
    if (state.identity) { btn.textContent = state.identity.displayName || "My account"; btn.classList.add("express-account-name"); }
    else { btn.textContent = "Sign in"; btn.classList.remove("express-account-name"); }
  }
  function authHref(page) { return page + "?next=" + sameSiteNext(SELF_PATH); }
  function showAuth() {
    $("#expressLoginLink").href = authHref(LOGIN_PATH);
    $("#expressSignupLink").href = authHref(SIGNUP_PATH);
    showStep("authStep");
  }
  function claimJourneyIfNeeded() {
    if (!state.identity || !state.journeyId || !state.journeyToken) return Promise.resolve(false);
    return api("/api/booking/" + encodeURIComponent(state.journeyId) + "/claim", { method: "POST", headers: authHeaders(), body: {} }).then(function (out) { rememberJourney(out); return true; });
  }
  function claimPendingSocial() {
    var claim = state.socialClaimToken || safeStoreGet(sessionStorage, PENDING_SOCIAL_CLAIM_KEY);
    if (!claim || !state.identity) return Promise.resolve(false);
    return api("/api/social/claim", { method: "POST", body: { claimToken: claim } }).then(function () { state.socialClaimToken = null; safeStoreRemove(sessionStorage, PENDING_SOCIAL_CLAIM_KEY); return true; });
  }

  function socialExchange() {
    var hash = new URLSearchParams(location.hash.replace(/^#/, "")); var token = hash.get("social"); if (!token) return Promise.resolve(false);
    return api("/api/social/exchange", { method: "POST", body: { token: token } }).then(function (out) {
      state.source = out.provider || "web"; state.attribution = out.attribution || {}; state.identity = out.identity || state.identity; state.socialClaimToken = out.claimToken || null;
      if (state.socialClaimToken) safeStoreSet(sessionStorage, PENDING_SOCIAL_CLAIM_KEY, state.socialClaimToken);
      if (out.draftSeed && out.draftSeed.pickup) $("#rnPickup").value = out.draftSeed.pickup;
      if (out.draftSeed && out.draftSeed.destination) $("#rnDestination").value = out.draftSeed.destination;
      $("#expressSourceLabel").textContent = "via " + (state.source.charAt(0).toUpperCase() + state.source.slice(1));
      history.replaceState({}, "", location.pathname + location.search); renderAccount(); return true;
    });
  }
  function continuationExchange() {
    var hash = new URLSearchParams(location.hash.replace(/^#/, "")); var deep = hash.get("link") || safeStoreGet(sessionStorage, PENDING_LINK_KEY); if (!deep) return Promise.resolve(false);
    return api("/api/deeplink/exchange", { method: "POST", body: { token: deep } }).then(function (out) {
      rememberJourney(out); safeStoreRemove(sessionStorage, PENDING_LINK_KEY); history.replaceState({}, "", location.pathname + location.search); renderJourney(out.journey); return true;
    }).catch(function (e) {
      if (e.status === 401) { safeStoreSet(sessionStorage, PENDING_LINK_KEY, deep); history.replaceState({}, "", location.pathname + location.search); showAuth(); return false; }
      safeStoreRemove(sessionStorage, PENDING_LINK_KEY); throw e;
    });
  }
  function trackingExchange() {
    var hash = new URLSearchParams(location.hash.replace(/^#/, "")); var token = hash.get("track"); if (!token) return Promise.resolve(false);
    return api("/api/tracking/exchange", { method: "POST", body: { token: token } }).then(function (out) {
      state.trackingOnly = true; state.journey = out.journey; state.journeyId = out.journey.id; history.replaceState({}, "", location.pathname + location.search); renderTrip(out.journey); stopPolling(); return true;
    });
  }

  function getFare() {
    var btn = $("#seeFareBtn"); showError("#pickerError", ""); setBusy(btn, true, "Getting fare…");
    var draft;
    try { draft = routeDraft(); } catch (e) { setBusy(btn, false); return showError("#pickerError", e.message); }
    var ctx = sourceContext();
    api("/api/booking/start", { method: "POST", body: { sourceChannel: ctx.sourceChannel, draft: draft, attribution: Object.assign({}, state.attribution, ctx.attribution) } })
      .then(function (start) { rememberJourney(start); return api("/api/booking/" + encodeURIComponent(state.journeyId) + "/quote", { method: "POST", headers: authHeaders(), body: {} }); })
      .then(function (out) { state.journey = out.journey; renderQuote(out.journey); })
      .catch(function (e) { showError("#pickerError", e.message); }).finally(function () { setBusy(btn, false); });
  }
  function quoteBreakdown(vehicle) {
    var b = vehicle && vehicle.fareBreakdown; var box = $("#quoteBreakdown"); var rows = $("#quoteBreakdownRows"); if (!b || !box || !rows) return;
    var items = [
      ["Base fare", b.baseFareKobo], ["Distance", b.distanceFareKobo], ["Time", b.timeFareKobo], ["Lagos road levy", b.lagosRoadDevelopmentLevyKobo]
    ];
    rows.innerHTML = items.map(function (it) { return '<div class="express-fare-row"><span>' + it[0] + '</span><strong>' + money(it[1]) + '</strong></div>'; }).join("") + '<div class="express-fare-row total"><span>Estimated total</span><strong>' + money(vehicle.amountKobo) + '</strong></div>';
    box.hidden = false;
  }
  function renderQuote(journey) {
    state.journey = journey; state.selectedVehicle = journey.selectedVehicle || null; showStep("quoteStep");
    var d = journey.draft || {}; $("#quoteRoute").textContent = (d.pickup || "Pickup") + " → " + (d.destination || "Destination");
    var route = journey.quote && journey.quote.route || {}; $("#quoteDistance").textContent = route.distanceMeters ? (route.distanceMeters / 1000).toFixed(1) + " km" : "-"; $("#quoteDuration").textContent = route.durationSeconds ? Math.max(1, Math.round(route.durationSeconds / 60)) + " min" : "-";
    var list = $("#tierOptions"); list.innerHTML = "";
    (journey.quote && journey.quote.vehicles || []).forEach(function (v) {
      var btn = document.createElement("button"); btn.type = "button"; btn.className = "express-vehicle-card" + (state.selectedVehicle && state.selectedVehicle.code === v.code ? " selected" : ""); btn.dataset.vehicle = v.code;
      btn.innerHTML = '<span class="express-vehicle-icon">' + (v.code === "executive" ? "◆" : v.code === "suv" ? "▰" : "●") + '</span><span class="express-vehicle-copy"><strong>' + (v.name || v.code) + '</strong><small>' + (v.description || ((v.capacity || 4) + " seats")) + '</small></span><span class="express-vehicle-price"><strong>' + money(v.amountKobo) + '</strong><small>estimated</small></span>';
      btn.addEventListener("click", function () { selectVehicle(v, btn); }); list.appendChild(btn);
    });
    if (state.selectedVehicle) quoteBreakdown(state.selectedVehicle);
  }
  function selectVehicle(vehicle, button) {
    state.selectedVehicle = vehicle; $$(".express-vehicle-card").forEach(function (x) { x.classList.toggle("selected", x === button); }); quoteBreakdown(vehicle);
    var btn = $("#confirmRideBtn"); btn.disabled = false; btn.textContent = (state.identity ? "Request " : "Sign in to request ") + (vehicle.name || "ride") + " · " + money(vehicle.amountKobo);
  }
  function requestRide() {
    showError("#quoteError", ""); if (!state.selectedVehicle || !state.journeyId) return;
    if (!state.identity) return showAuth();
    var btn = $("#confirmRideBtn"); setBusy(btn, true, "Requesting driver…");
    claimJourneyIfNeeded().then(function () { return claimPendingSocial(); })
      .then(function () { return api("/api/booking/" + encodeURIComponent(state.journeyId) + "/checkout", { method: "POST", headers: authHeaders(), body: { vehicleCode: state.selectedVehicle.code } }); })
      .then(function (out) { rememberJourney(out); return api("/api/booking/" + encodeURIComponent(state.journeyId) + "/request", { method: "POST", headers: authHeaders(), body: {} }); })
      .then(function (out) { rememberJourney(out); renderJourney(out.journey); startPolling(); })
      .catch(function (e) { showError("#quoteError", e.message); }).finally(function () { setBusy(btn, false); });
  }

  function journeyFare(j) {
    return Number((j && j.settlement && j.settlement.finalFareKobo) || (j && j.selectedVehicle && (j.selectedVehicle.totalAmountKobo || j.selectedVehicle.amountKobo)) || 0);
  }
  function renderJourney(j) {
    if (!j) return; state.journey = j;
    if (j.draft && j.draft.pickupLocation) state.pickup = j.draft.pickupLocation;
    if (j.draft && j.draft.destinationLocation) state.destination = j.draft.destinationLocation;
    updateRouteChip(); updateMap();
    if (["draft", "quoted", "checkout"].indexOf(j.status) !== -1) return j.status === "draft" ? showStep("routeStep") : renderQuote(j);
    if (j.status === "booked" && !(j.dispatch && j.dispatch.queuedAfterJourneyId)) return renderSearching(j);
    return renderTrip(j);
  }
  function renderSearching(j) {
    showStep("searchingStep"); $("#searchingRoute").textContent = (j.draft.pickup || "Pickup") + " → " + (j.draft.destination || "Destination"); $("#searchingFare").textContent = money(journeyFare(j));
    $("#searchingStatus").textContent = j.dispatch && j.dispatch.status === "scheduled" ? "Your request is queued for dispatch" : "Matching you with a nearby ArrivoExpress driver…";
  }
  function renderDriverCard(j) {
    var d = j.dispatch && j.dispatch.driver || {}; var v = j.dispatch && j.dispatch.vehicle || {};
    $("#driverCard").innerHTML = '<div class="express-driver-main"><span class="express-driver-avatar">' + ((d.displayName || "D").charAt(0).toUpperCase()) + '</span><span><strong>' + (d.displayName || "Assigned driver") + '</strong><small>' + [v.color, v.make, v.model, v.plate].filter(Boolean).join(" · ") + '</small></span><span class="express-driver-eta">' + (j.dispatch && j.dispatch.etaMinutes != null ? j.dispatch.etaMinutes + " min" : "Live") + '</span></div>';
  }
  function renderTrip(j) {
    showStep("tripStep"); renderDriverCard(j);
    var queued = Boolean(j.dispatch && j.dispatch.queuedAfterJourneyId); $("#queuedStatusCard").hidden = !queued;
    var title = "Your driver is on the way", label = "Driver assigned", stage = "Live";
    if (queued) { title = "Your ride is reserved"; label = "Next ride reserved"; stage = "Queued"; }
    if (j.status === "in_trip") { title = "Trip in progress"; label = "ArrivoExpress trip"; stage = "In trip"; }
    if (j.status === "completed") { title = "Trip complete"; label = "Arrived"; stage = "Completed"; }
    $("#tripStageTitle").textContent = title; $("#tripStageLabel").textContent = label; $("#tripStageState").textContent = stage;
    var start = j.rideStart || null; var pin = start && (start.pin || start.rideStartPin || start.value); var pinCard = $("#rideStartCard"); pinCard.hidden = !(pin && j.status === "dispatched"); if (pin) $("#rideStartPinValue").textContent = pin;
    $("#driverTripCard").innerHTML = '<strong>' + (j.draft.pickup || "Pickup") + '</strong> → <strong>' + (j.draft.destination || "Destination") + '</strong>' + (j.bookingReference ? '<br><span>Journey ' + j.bookingReference + '</span>' : '');
    var canCancel = !state.trackingOnly && ["booked", "dispatched"].indexOf(j.status) !== -1; $("#cancelAssigned").hidden = !canCancel;
    renderPostTrip(j); renderReceipt(j);
    if (j.dispatch && j.dispatch.driverLocation) { marker("driver", j.dispatch.driverLocation, "Driver"); }
  }
  function renderPostTrip(j) {
    var panel = $("#postTripExperience"); var done = !state.trackingOnly && j.status === "completed"; panel.hidden = !done; if (!done) return;
    var saved = Boolean(j.settlement && j.settlement.feedbackSubmittedAt); state.postRating = Number(j.settlement && j.settlement.rating || 0); state.postTipKobo = Number(j.settlement && j.settlement.postTripTipKobo || 0); $("#postTripFare").textContent = money(journeyFare(j));
    $$("[data-rating]").forEach(function (b) { b.classList.toggle("active", Number(b.dataset.rating) <= state.postRating); b.disabled = saved; });
    $$("[data-post-tip]").forEach(function (b) { b.classList.toggle("active", Number(b.dataset.postTip) === state.postTipKobo); b.disabled = saved; });
    $("#postTipCustom").disabled = saved; $("#postTripComment").disabled = saved; $("#submitPostTripFeedback").disabled = saved; $("#submitPostTripFeedback").textContent = saved ? "Rating & tip saved" : "Save rating & tip";
    $("#postTripFeedbackStatus").textContent = saved ? "Thanks. Your post-trip feedback is saved." : "Tip is optional and is added only to the amount you pay your driver."; updatePostTripTotal(j);
  }
  function updatePostTripTotal(j) { $("#postTripTotal").textContent = money(journeyFare(j) + Number(state.postTipKobo || 0)); }
  function renderReceipt(j) {
    var complete = j.status === "completed" && !state.trackingOnly; $("#riderPaid").disabled = !complete; $("#riderPaymentIssue").disabled = !complete;
    var settlement = j.settlement || {}; var text = complete ? "Pay your driver directly, then confirm here. RideArrivo does not collect this fare." : "Payment opens after trip completion. RideArrivo does not collect this fare.";
    if (j.settlementStatus === "confirmed") text = "Payment confirmed by rider and driver."; else if (j.settlementStatus === "rider_confirmed") text = "You marked this fare paid. Waiting for driver confirmation."; else if (j.settlementStatus === "disputed" || settlement.paymentState === "disputed") text = "Payment issue recorded. RideArrivo support can review the journey audit trail.";
    $("#rideReceiptStatus").textContent = text;
  }
  function submitFeedback() {
    if (!state.journeyId || !state.identity || !state.postRating) return $("#postTripFeedbackStatus").textContent = "Choose a star rating first.";
    var btn = $("#submitPostTripFeedback"); setBusy(btn, true, "Saving…");
    api("/api/booking/" + encodeURIComponent(state.journeyId) + "/feedback", { method: "POST", headers: authHeaders(), body: { rating: state.postRating, tipKobo: state.postTipKobo, comment: $("#postTripComment").value || "" } }).then(function (out) { rememberJourney(out); renderPostTrip(out.journey); }).catch(function (e) { $("#postTripFeedbackStatus").textContent = e.message; }).finally(function () { setBusy(btn, false); });
  }
  function settlement(status) {
    if (!state.journeyId || !state.identity) return showAuth();
    api("/api/booking/" + encodeURIComponent(state.journeyId) + "/settlement", { method: "POST", headers: authHeaders(), body: { status: status } }).then(function (out) { rememberJourney(out); renderReceipt(out.journey); }).catch(function (e) { $("#rideReceiptStatus").textContent = e.message; });
  }
  function cancelJourney() {
    if (!state.journeyId) return; api("/api/booking/" + encodeURIComponent(state.journeyId) + "/cancel", { method: "POST", headers: authHeaders(), body: { reason: "rider_cancelled" } }).then(function () { clearJourney(); showStep("routeStep"); }).catch(function (e) { showError("#searchingError", e.message); });
  }
  function shareTrip() {
    if (!state.journeyId || !state.identity) return showAuth();
    api("/api/booking/" + encodeURIComponent(state.journeyId) + "/tracking-link", { method: "POST", headers: authHeaders(), body: {} }).then(function (out) {
      if (navigator.share) return navigator.share({ title: "My ArrivoExpress trip", text: "Track my RideArrivo trip", url: out.url }).catch(function () {});
      return navigator.clipboard && navigator.clipboard.writeText(out.url).then(function () { $("#rideReceiptStatus").textContent = "Read-only tracking link copied."; });
    }).catch(function (e) { $("#rideReceiptStatus").textContent = e.message; });
  }

  function poll() {
    if (!state.journeyId || !state.journeyToken) return;
    api("/api/booking/" + encodeURIComponent(state.journeyId), { headers: authHeaders(), timeout: 10000 }).then(function (out) {
      state.journey = out.journey; renderJourney(out.journey); if (["completed", "cancelled", "expired"].indexOf(out.journey.status) !== -1) stopPolling();
    }).catch(function (e) { if (e.status === 401 || e.status === 404) stopPolling(); });
  }
  function startPolling() { stopPolling(); state.pollTimer = setInterval(poll, document.hidden ? 12000 : 3500); }
  function stopPolling() { if (state.pollTimer) clearInterval(state.pollTimer); state.pollTimer = null; }

  function restoreJourney() {
    var raw = safeStoreGet(sessionStorage, JOURNEY_KEY); if (!raw) return Promise.resolve(false); var saved; try { saved = JSON.parse(raw); } catch (e) { safeStoreRemove(sessionStorage, JOURNEY_KEY); return Promise.resolve(false); }
    if (!saved || !saved.id || !saved.token) return Promise.resolve(false); state.journeyId = saved.id; state.journeyToken = saved.token; state.deepLink = saved.deepLink || null;
    return api("/api/booking/" + encodeURIComponent(saved.id), { headers: authHeaders() }).then(function (out) { state.journey = out.journey; renderJourney(out.journey); if (["booked", "dispatched", "in_trip"].indexOf(out.journey.status) !== -1) startPolling(); return true; }).catch(function () { clearJourney(); return false; });
  }
  function resumeActive() {
    if (!state.identity || state.journeyId) return Promise.resolve(false);
    return api("/api/booking/active?serviceType=express&rideMode=now&channel=web").then(function (out) { if (!out.journey) return false; rememberJourney(out); renderJourney(out.journey); if (["booked", "dispatched", "in_trip"].indexOf(out.journey.status) !== -1) startPolling(); return true; }).catch(function () { return false; });
  }

  function bind() {
    $("#useLocationBtn").addEventListener("click", useMyLocation); $("#seeFareBtn").addEventListener("click", getFare); $("#backToPickerBtn").addEventListener("click", function () { showStep("routeStep"); }); $("#confirmRideBtn").addEventListener("click", requestRide); $("#cancelSearchBtn").addEventListener("click", cancelJourney); $("#cancelAssigned").addEventListener("click", cancelJourney); $("#shareRide").addEventListener("click", shareTrip); $("#riderPaid").addEventListener("click", function () { settlement("paid"); }); $("#riderPaymentIssue").addEventListener("click", function () { settlement("disputed"); }); $("#submitPostTripFeedback").addEventListener("click", submitFeedback); $("#expressAccountButton").addEventListener("click", function () { if (state.identity) location.href = CFG.accountPath || "account.html"; else showAuth(); });
    $$("[data-rating]").forEach(function (b) { b.addEventListener("click", function () { state.postRating = Number(b.dataset.rating); $$("[data-rating]").forEach(function (x) { x.classList.toggle("active", Number(x.dataset.rating) <= state.postRating); }); }); });
    $$("[data-post-tip]").forEach(function (b) { b.addEventListener("click", function () { state.postTipKobo = Number(b.dataset.postTip || 0); $$("[data-post-tip]").forEach(function (x) { x.classList.toggle("active", x === b); }); $("#postTipCustom").value = ""; updatePostTripTotal(state.journey || {}); }); });
    $("#postTipCustom").addEventListener("input", function (e) { var naira = Math.max(0, Math.min(100000, Number(e.target.value || 0))); state.postTipKobo = Math.round(naira * 100); $$("[data-post-tip]").forEach(function (x) { x.classList.remove("active"); }); updatePostTripTotal(state.journey || {}); });
    document.addEventListener("visibilitychange", function () { if (state.pollTimer && !document.hidden) poll(); });
  }

  function boot() {
    bind(); renderAccount();
    var src = new URLSearchParams(location.search).get("src"); if (src) { state.source = src; $("#expressSourceLabel").textContent = "via " + src.charAt(0).toUpperCase() + src.slice(1); }
    Promise.resolve().then(function () { return socialExchange(); }).then(function () { return federateLegacySession(); }).then(function () { return bootstrapIdentity(); }).then(function () { return claimPendingSocial(); }).then(function () { return trackingExchange(); }).then(function (tracking) { if (tracking) return true; return continuationExchange(); }).then(function () { return restoreJourney(); }).then(function (restored) { if (!restored) return resumeActive(); }).catch(function (e) { showError("#pickerError", e.message); showStep("routeStep"); });
  }

  boot();
})();
