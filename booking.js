(function () {
  "use strict";

  // ── Configuration — replace before going live ──────────────────────────
  var API_BASE_URL = "https://arrivo-backend-g1ku.onrender.com"; // same as script.js — point at your deployed backend
  var PAYSTACK_PUBLIC_KEY = "pk_test_replace_me"; // from dashboard.paystack.com/#/settings/developer

  var SUPPORTED_LANGS = ["en", "fr", "zh", "hi", "de", "es", "pt"];
  var LANG_LABELS = { en: "EN", fr: "FR", zh: "中文", hi: "हि", de: "DE", es: "ES", pt: "PT" };
  var LANG_KEY = "arrivo_site_lang";

  var state = {
    name: "", email: "", phone: "", whatsapp: "", country: "", agreedToTerms: false,
    token: null,
    flightNumber: "",
    bags: 1, bulky: false,
    bookingType: "one_way", durationDays: 1, multiplier: 1,
    vehicle: "sedan", vehicleBasePrice: 8500,
    vehicleManuallyPicked: false,
    pickup: "", stops: [],
  };

  // ───────────────────────── i18n (same pattern as script.js) ─────────────────────────
  function getNested(obj, path) {
    return path.split(".").reduce(function (acc, key) { return acc && acc[key]; }, obj);
  }

  function applyLanguage(lang) {
    var dict = I18N[lang] || I18N.en;
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
  }

  function currentLang() {
    return SUPPORTED_LANGS.indexOf(document.documentElement.lang) !== -1 ? document.documentElement.lang : "en";
  }

  function t(path) {
    return getNested(I18N[currentLang()], path) || path;
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

  // ───────────────────────── API helpers ─────────────────────────
  function api(path, options) {
    options = options || {};
    return fetch(API_BASE_URL + path, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { ok: res.ok, status: res.status, data: data };
      });
    });
  }

  function authHeader() {
    return { Authorization: "Bearer " + state.token };
  }

  // ───────────────────────── Step navigation ─────────────────────────
  function goToStep(n) {
    document.querySelectorAll(".step").forEach(function (el) {
      el.hidden = el.getAttribute("data-step") !== String(n);
    });
    document.querySelectorAll("#progress li").forEach(function (li) {
      var step = Number(li.getAttribute("data-step"));
      li.classList.toggle("active", step === n);
      li.classList.toggle("done", step < n);
    });
  }

  // ───────────────────────── Step 1: Contact ─────────────────────────
  function initStep1() {
    var contactError = document.getElementById("contactError");
    var whatsappField = arrivoBuildPhoneInput(document.getElementById("whatsappInputContainer"), {
      placeholder: t("booking.whatsapp"),
    });

    function showError(el, msg) {
      el.hidden = false;
      if (msg) el.textContent = msg;
    }
    function hideError(el) { el.hidden = true; }

    // Prefill the read-only name/email summary from the already-authenticated
    // rider's profile — registration happened on signup.html/login.html
    // before they ever reached this page.
    api("/api/auth/me", { headers: authHeader() }).then(function (result) {
      if (result.ok) {
        state.name = result.data.user.name;
        state.email = result.data.user.email;
        document.getElementById("profileName").textContent = state.name;
        document.getElementById("profileEmail").textContent = state.email;
        if (result.data.user.whatsapp_number) {
          // Stored as a full international number (e.g. "+2348011112222") —
          // split it back into country code + national number for the two-part input.
          var stored = result.data.user.whatsapp_number;
          var match = ARRIVO_COUNTRY_CODES
            .slice()
            .sort(function (a, b) { return b.dial.length - a.dial.length; }) // longest dial code first, so +234 doesn't get shadowed by +2
            .find(function (c) { return stored.indexOf(c.dial) === 0; });
          if (match) whatsappField.setRaw(match.dial, stored.slice(match.dial.length));
        }
        if (result.data.user.country_of_residence) document.getElementById("fCountry").value = result.data.user.country_of_residence;
      } else {
        // Token expired or invalid — send them back to log in properly.
        localStorage.removeItem("arrivo_rider_token");
        window.location.href = "login.html?next=book.html";
      }
    });

    document.getElementById("contactContinue").addEventListener("click", function () {
      hideError(contactError);

      var phoneResult = whatsappField.getValue();
      if (!phoneResult.valid) {
        showError(contactError, phoneResult.message);
        return;
      }
      state.whatsapp = phoneResult.full;
      state.country = document.getElementById("fCountry").value.trim();
      state.agreedToTerms = document.getElementById("fAgree").checked;

      if (!state.country) {
        showError(contactError, "Please enter your country of residence.");
        return;
      }
      if (!state.agreedToTerms) {
        showError(contactError, "Please agree to the privacy policy and terms of service to continue.");
        return;
      }

      // Save WhatsApp/Country to the rider's profile for next time, then continue.
      api("/api/auth/me", {
        method: "PATCH",
        headers: authHeader(),
        body: JSON.stringify({ whatsappNumber: state.whatsapp, countryOfResidence: state.country }),
      }).then(function () {
        goToStep(2);
      }).catch(function () {
        // Non-critical if this save fails — don't block the booking over it.
        goToStep(2);
      });
    });
  }

  // ───────────────────────── Step 2: Flight ─────────────────────────
  function initStep2() {
    var resultBox = document.getElementById("flightResult");
    var errorBox = document.getElementById("flightError");

    document.getElementById("trackFlightBtn").addEventListener("click", function () {
      var flightNumber = document.getElementById("fFlight").value.trim().toUpperCase();
      resultBox.hidden = true;
      errorBox.hidden = true;
      if (!flightNumber) return;

      api("/api/flights/status?flightNumber=" + encodeURIComponent(flightNumber) + "&arrIata=LOS").then(function (result) {
        if (result.ok) {
          resultBox.hidden = false;
          resultBox.innerHTML =
            "<strong>" + (result.data.airline || "") + " " + (result.data.flightNumber || "") + "</strong>" +
            (result.data.arrival && result.data.arrival.estimated
              ? new Date(result.data.arrival.estimated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "");
        } else {
          errorBox.hidden = false;
        }
      }).catch(function () { errorBox.hidden = false; });
    });

    document.getElementById("flightContinue").addEventListener("click", function () {
      state.flightNumber = document.getElementById("fFlight").value.trim().toUpperCase();
      goToStep(3);
    });
    document.getElementById("backTo1").addEventListener("click", function () { goToStep(1); });
  }

  // ───────────────────────── Step 3: Luggage & Vehicle ─────────────────────────
  function recommendVehicle(bags, bulky) {
    if (bulky || bags >= 5) return "truck";
    if (bags >= 3) return "suv";
    return "sedan";
  }

  function initStep3() {
    var bagsInput = document.getElementById("fBags");
    var bulkyInput = document.getElementById("fBulky");
    var vehicleCards = Array.prototype.slice.call(document.querySelectorAll(".vehicle-card"));
    var bookingChips = Array.prototype.slice.call(document.querySelectorAll(".booking-type-chip"));

    function updatePriceLabels() {
      vehicleCards.forEach(function (card) {
        var base = Number(card.getAttribute("data-price"));
        card.querySelector(".v-price").textContent = "₦" + (base * state.multiplier).toLocaleString();
      });
    }

    bookingChips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        bookingChips.forEach(function (c) { c.classList.remove("selected"); });
        chip.classList.add("selected");
        state.bookingType = chip.getAttribute("data-type");
        state.durationDays = Number(chip.getAttribute("data-days"));
        state.multiplier = Number(chip.getAttribute("data-multiplier"));
        updatePriceLabels();
      });
    });

    function updateRecommendation() {
      var bags = Number(bagsInput.value) || 0;
      var bulky = bulkyInput.checked;
      var recommended = recommendVehicle(bags, bulky);

      vehicleCards.forEach(function (card) {
        var isRecommended = card.getAttribute("data-vehicle") === recommended;
        card.classList.toggle("recommended", isRecommended);
        if (!state.vehicleManuallyPicked && isRecommended) selectVehicle(card, false);
      });
    }

    function selectVehicle(card, manual) {
      vehicleCards.forEach(function (c) { c.classList.remove("selected"); });
      card.classList.add("selected");
      state.vehicle = card.getAttribute("data-vehicle");
      state.vehicleBasePrice = Number(card.getAttribute("data-price"));
      if (manual) state.vehicleManuallyPicked = true;
    }

    bagsInput.addEventListener("input", updateRecommendation);
    bulkyInput.addEventListener("change", updateRecommendation);
    vehicleCards.forEach(function (card) {
      card.addEventListener("click", function () { selectVehicle(card, true); });
    });

    updatePriceLabels();
    updateRecommendation(); // set initial state on first load

    document.getElementById("luggageContinue").addEventListener("click", function () {
      state.bags = Number(bagsInput.value) || 0;
      state.bulky = bulkyInput.checked;
      goToStep(4);
      setupPlacesForStep4(); // the map container only has real dimensions once step 4 is visible
    });
    document.getElementById("backTo2").addEventListener("click", function () { goToStep(2); });
  }

  // ───────────────────────── Google Places autocomplete + map preview ─────────────────────────
  // Arrivo operates in Nigeria, so search results are restricted to Nigerian
  // addresses — this also makes suggestions far more relevant than an
  // unrestricted worldwide search would be.
  var LAGOS_CENTER = { lat: 6.5244, lng: 3.3792 };
  var googleMapInstance = null;
  var googleMapMarker = null;
  var autocompleteAttachedTo = [];

  // Referenced by name in the Google Maps <script> tag's callback= parameter,
  // so it must exist on window before that script finishes loading.
  window.initGoogleMaps = function () {
    window.__googleMapsReady = true;
  };

  function attachPlacesAutocomplete(inputEl) {
    if (!inputEl || autocompleteAttachedTo.indexOf(inputEl) !== -1) return;
    if (!window.google || !window.google.maps || !window.google.maps.places) return;
    autocompleteAttachedTo.push(inputEl);

    var autocomplete = new google.maps.places.Autocomplete(inputEl, {
      componentRestrictions: { country: "ng" },
      fields: ["formatted_address", "geometry", "name"],
    });

    autocomplete.addListener("place_changed", function () {
      var place = autocomplete.getPlace();
      // A place with no geometry means the visitor typed free text and hit
      // Enter without picking a suggestion from the dropdown — that's still
      // a valid address to us, we just can't show it on the map preview.
      if (!place.geometry || !place.geometry.location) return;
      updateMapMarker(place.geometry.location, place.formatted_address || place.name || inputEl.value);
    });
  }

  function initRouteMap() {
    var mapEl = document.getElementById("routeMap");
    var errEl = document.getElementById("mapsError");
    if (!mapEl) return;

    if (!window.google || !window.google.maps) {
      if (errEl) errEl.hidden = false;
      return;
    }
    if (errEl) errEl.hidden = true;

    if (!googleMapInstance) {
      googleMapInstance = new google.maps.Map(mapEl, {
        center: LAGOS_CENTER,
        zoom: 11,
        disableDefaultUI: true,
        zoomControl: true,
      });
    } else {
      // The map container is hidden (display:none) on every step except 4 —
      // Google Maps needs an explicit nudge to redraw correctly once it
      // becomes visible again, otherwise it can render blank or mis-sized.
      google.maps.event.trigger(googleMapInstance, "resize");
      googleMapInstance.setCenter(LAGOS_CENTER);
    }
  }

  function updateMapMarker(location, label) {
    if (!googleMapInstance) return;
    googleMapInstance.panTo(location);
    googleMapInstance.setZoom(15);
    if (!googleMapMarker) {
      googleMapMarker = new google.maps.Marker({ map: googleMapInstance, position: location, title: label });
    } else {
      googleMapMarker.setPosition(location);
      googleMapMarker.setTitle(label);
    }
  }

  function setupPlacesForStep4(attempsLeft) {
    if (attempsLeft === undefined) attempsLeft = 20; // ~6 seconds total before giving up
    if (window.google && window.google.maps && window.google.maps.places) {
      attachPlacesAutocomplete(document.getElementById("fPickup"));
      attachPlacesAutocomplete(document.getElementById("fDropoff"));
      Array.prototype.slice.call(document.querySelectorAll(".stop-input")).forEach(attachPlacesAutocomplete);
      initRouteMap();
    } else if (attempsLeft > 0) {
      // The Maps script loads async and may not be ready the instant the
      // rider reaches this step — poll briefly rather than giving up immediately.
      setTimeout(function () { setupPlacesForStep4(attempsLeft - 1); }, 300);
    } else {
      var errEl = document.getElementById("mapsError");
      if (errEl) errEl.hidden = false;
    }
  }

  // ───────────────────────── Step 4: Pickup ─────────────────────────
  function initStep4() {
    var stopsList = document.getElementById("stopsList");
    var stopCount = 0;

    document.getElementById("addStopBtn").addEventListener("click", function () {
      if (stopCount >= 2) return; // pickup + up to 2 waypoints + drop-off is plenty for this flow
      stopCount++;
      var row = document.createElement("div");
      row.className = "route-row";
      row.innerHTML =
        '<span class="route-dot route-dot-stop"></span>' +
        '<input type="text" class="field route-input stop-input" placeholder="' + t("booking.stopPlaceholder") + '">';
      stopsList.appendChild(row);
      attachPlacesAutocomplete(row.querySelector(".stop-input"));
    });

    document.getElementById("fPickup").addEventListener("input", function () { this.style.borderColor = ""; });
    document.getElementById("fDropoff").addEventListener("input", function () { this.style.borderColor = ""; });

    document.getElementById("pickupContinue").addEventListener("click", function () {
      var pickup = document.getElementById("fPickup").value.trim();
      var dropoff = document.getElementById("fDropoff").value.trim();

      if (!pickup || !dropoff) {
        // Simple inline validation without a dedicated error element on this step.
        if (!pickup) document.getElementById("fPickup").style.borderColor = "var(--coral)";
        if (!dropoff) document.getElementById("fDropoff").style.borderColor = "var(--coral)";
        return;
      }

      var waypoints = Array.prototype.slice.call(stopsList.querySelectorAll(".stop-input"))
        .map(function (i) { return i.value.trim(); })
        .filter(Boolean);

      state.pickup = pickup;
      state.stops = waypoints.concat([dropoff]); // waypoints first, drop-off always last
      renderReview();
      goToStep(5);
    });
    document.getElementById("backTo3").addEventListener("click", function () { goToStep(3); });
  }

  // ───────────────────────── Step 5: Review & Pay ─────────────────────────
  function renderReview() {
    var list = document.getElementById("reviewList");
    var vehicleLabel = t("booking.vehicle" + state.vehicle.charAt(0).toUpperCase() + state.vehicle.slice(1));
    var bookingLabel = t("booking.type" + toPascalCase(state.bookingType));
    var totalFare = state.vehicleBasePrice * state.multiplier;

    var rows = [
      [t("booking.reviewContact"), state.name + " · " + state.email],
      [t("booking.reviewBookingType"), bookingLabel],
      [t("booking.reviewFlight"), state.flightNumber || "—"],
      [t("booking.reviewVehicle"), vehicleLabel + " · ₦" + totalFare.toLocaleString()],
      [t("booking.reviewPickup"), [state.pickup].concat(state.stops).join(" → ")],
    ];
    list.innerHTML = rows.map(function (r) {
      return "<div><dt>" + r[0] + "</dt><dd>" + r[1] + "</dd></div>";
    }).join("");

    document.getElementById("reviewFare").textContent = "₦" + totalFare.toLocaleString();
    document.getElementById("payAmount").textContent = "₦" + totalFare.toLocaleString();
  }

  function toPascalCase(snake) {
    return snake.split("_").map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join("");
  }

  // Exposed separately so it can be tested independently of the real
  // Paystack popup (which needs a real key + real browser + a real card).
  function handlePaymentSuccess(reference) {
    var payError = document.getElementById("payError");
    payError.hidden = true;

    return api("/api/payments/verify/" + encodeURIComponent(reference))
      .then(function (verifyResult) {
        if (!verifyResult.ok || !verifyResult.data.success) {
          throw new Error(t("booking.paymentFailed"));
        }
        return api("/api/rides", {
          method: "POST",
          headers: authHeader(),
          body: JSON.stringify({
            pickupAddress: state.pickup,
            stops: state.stops,
            flightNumber: state.flightNumber || null,
            vehicleType: state.vehicle,
            fareNaira: state.vehicleBasePrice * state.multiplier,
            paymentReference: reference,
            bookingType: state.bookingType,
            durationDays: state.durationDays,
            agreedCancellationPolicy: true,
          }),
        });
      })
      .then(function (rideResult) {
        if (!rideResult.ok) throw new Error(t("booking.paymentFailed"));
        var rideId = rideResult.data.ride.id;
        return api("/api/rides/" + rideId + "/payment", {
          method: "PATCH",
          headers: authHeader(),
          body: JSON.stringify({ paymentStatus: "paid", paymentReference: reference }),
        });
      })
      .then(function () {
        document.getElementById("confirmRef").textContent = reference;
        goToStep(6);
      })
      .catch(function (err) {
        payError.hidden = false;
        payError.textContent = err.message || t("booking.paymentFailed");
      });
  }

  function initStep5() {
    document.getElementById("backTo4").addEventListener("click", function () { goToStep(4); });

    // Privacy policy popup (step 1's link)
    var privacyLink = document.getElementById("openPrivacyModalBooking");
    if (privacyLink) {
      privacyLink.addEventListener("click", function (e) {
        e.preventDefault();
        document.getElementById("privacyModal").style.display = "flex";
      });
    }
    document.getElementById("closePrivacyModal").addEventListener("click", function () {
      document.getElementById("privacyModal").style.display = "none";
    });
    document.getElementById("agreeInModalBtn").addEventListener("click", function () {
      document.getElementById("fAgree").checked = true;
      document.getElementById("privacyModal").style.display = "none";
    });

    // Cancellation & Refund Policy popup (step 5, before payment)
    document.getElementById("openCancellationModal").addEventListener("click", function (e) {
      e.preventDefault();
      document.getElementById("cancellationModal").style.display = "flex";
    });
    document.getElementById("closeCancellationModal").addEventListener("click", function () {
      document.getElementById("cancellationModal").style.display = "none";
    });
    document.getElementById("agreeCancellationModalBtn").addEventListener("click", function () {
      document.getElementById("fAgreeCancellation").checked = true;
      document.getElementById("cancellationModal").style.display = "none";
    });

    document.getElementById("payBtn").addEventListener("click", function () {
      var payError = document.getElementById("payError");
      payError.hidden = true;

      if (!document.getElementById("fAgreeCancellation").checked) {
        payError.hidden = false;
        payError.textContent = "Please agree to the Cancellation & Refund Policy before paying.";
        return;
      }

      if (typeof PaystackPop === "undefined") {
        payError.hidden = false;
        payError.textContent = "Payment isn't configured yet — set PAYSTACK_PUBLIC_KEY in booking.js.";
        return;
      }
      var handler = PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: state.email,
        amount: state.vehicleBasePrice * state.multiplier * 100,
        currency: "NGN",
        metadata: { name: state.name, phone: state.phone },
        callback: function (response) { handlePaymentSuccess(response.reference); },
        onClose: function () {},
      });
      handler.openIframe();
    });
  }

  // ───────────────────────── Init ─────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    function safeRun(fn, label) {
      try { fn(); } catch (err) { console.error("[arrivo booking] " + label + " failed:", err); }
    }

    safeRun(initLanguage, "initLanguage");

    // Registration is mandatory before booking — check for a saved rider
    // session before revealing the booking wizard at all.
    var savedToken = localStorage.getItem("arrivo_rider_token");
    if (!savedToken) {
      document.getElementById("authGate").hidden = false;
      document.getElementById("bookingCard").hidden = true;
      return; // don't initialize any of the booking steps — nothing to do yet
    }

    state.token = savedToken;
    document.getElementById("authGate").hidden = true;
    document.getElementById("bookingCard").hidden = false;

    safeRun(initStep1, "initStep1");
    safeRun(initStep2, "initStep2");
    safeRun(initStep3, "initStep3");
    safeRun(initStep4, "initStep4");
    safeRun(initStep5, "initStep5");
  });

  // Exposed for automated testing only.
  window.__arrivoBookingTestHooks = { state: state, handlePaymentSuccess: handlePaymentSuccess, goToStep: goToStep };
})();
