(function () {
  "use strict";

  // ── Configuration — replace before going live ──────────────────────────
  var API_BASE_URL = "https://arrivo-backend-g1ku.onrender.com"; // same as script.js — point at your deployed backend
  // PAYSTACK_PUBLIC_KEY now lives in paystack-config.js (loaded before this
  // file in book.html) — shared with track.html's tip flow so the two
  // can't drift out of sync again (see that file for why).

  var SUPPORTED_LANGS = ["en", "fr", "zh", "hi", "de", "es", "pt"];
  var LANG_LABELS = { en: "EN", fr: "FR", zh: "中文", hi: "हि", de: "DE", es: "ES", pt: "PT" };
  var LANG_KEY = "arrivo_site_lang";

  // Anything that started as free text the person typed (name, pickup
  // address, flight number, etc.) gets run through this before it's ever
  // put into innerHTML. Without it, someone could type e.g. an <img onerror>
  // payload as their name and have it execute in their own or someone
  // else's browser (rider info is later rendered on the driver's screen).
  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  var state = {
    name: "", email: "", phone: "", whatsapp: "", country: "", agreedToTerms: false, dashcamConsent: false,
    token: null,
    bookingFor: "self", passengerName: "",
    emergencyContactName: "", emergencyContactPhone: "",
    flightNumber: "",
    adults: 1, children: 0,
    carryOnBags: 1, checkedBags: 1, bulky: false,
    bookingType: "one_way", durationDays: 1, multiplier: 1, fullDayCount: 1,
    scheduledPickupAt: null, linkedRideId: null,
    vehicle: "sedan", vehicleBasePrice: 8500,
    vehicleManuallyPicked: false,
    pickup: "", stops: [],
    pickupLatLng: null, dropoffLatLng: null,
    securityEscort: false, fleetSize: 0,
    distanceKm: null, durationMin: null,
    paymentMethod: "card", walletBalanceNaira: 0,
    userLocation: null, locationPermission: null, excludedAreaMatch: null,
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

  // Same idea as t(), but for copy that needs a runtime value spliced in
  // (a passenger count, a vehicle name) — replaces {token} placeholders in
  // the translated string. Simple on purpose: this app has no existing
  // templated-string convention, and a real i18n formatting library would
  // be overkill for a handful of strings.
  function tFormat(path, replacements) {
    var str = t(path);
    Object.keys(replacements || {}).forEach(function (key) {
      str = str.replace(new RegExp("\\{" + key + "\\}", "g"), replacements[key]);
    });
    return str;
  }

  // "dropoff" (Airport Drop-off) is priced and location-gathered exactly
  // like "one_way" (Airport Pickup) — both are per-location trips with a
  // real pickup/destination address, unlike the flat-rate multi-day
  // charter types. Used everywhere a check used to just be
  // `bookingType === "one_way"` before Airport Drop-off existed.
  function isOneWayStyle(bookingType) {
    return bookingType === "one_way" || bookingType === "dropoff";
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
    }).catch(function () {
      // fetch() itself rejected — offline, server unreachable, CORS, etc.
      // Previously uncaught here, so every caller's .then(...) simply never
      // ran on a network failure: renderReview() left loadingText visible
      // and payBtn disabled forever with no error shown, since its only
      // handling was inside the .then. Resolving the same {ok:false} shape
      // every other failure already uses means every existing caller's
      // "if (!result.ok)" branch now handles this case too, with zero
      // changes needed at each call site.
      return { ok: false, status: 0, data: { error: "Couldn't reach the server. Please check your connection and try again." } };
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
    var passengerPhoneField = arrivoBuildPhoneInput(document.getElementById("passengerPhoneContainer"), {
      placeholder: t("booking.passengerWhatsapp"),
    });
    var emergencyPhoneField = arrivoBuildPhoneInput(document.getElementById("emergencyPhoneContainer"), {
      placeholder: t("booking.emergencyContactPhonePlaceholder"),
    });

    function showError(el, msg) {
      el.hidden = false;
      if (msg) el.textContent = msg;
    }
    function hideError(el) { el.hidden = true; }

    // "Who is this ride for" — myself vs. someone else. The top WhatsApp
    // field is always the account holder's own number; when it's for
    // someone else, a separate "Passenger's WhatsApp number" field appears
    // alongside their name, so the two numbers are always visibly distinct
    // fields rather than one field being relabeled and reused.
    var forWhoToggle = document.getElementById("forWhoToggle");
    var passengerFields = document.getElementById("passengerFields");
    if (forWhoToggle) {
      forWhoToggle.querySelectorAll(".for-who-opt").forEach(function (btn) {
        btn.addEventListener("click", function () {
          state.bookingFor = btn.getAttribute("data-for");
          forWhoToggle.querySelectorAll(".for-who-opt").forEach(function (b) {
            b.classList.toggle("is-active", b === btn);
          });
          if (passengerFields) passengerFields.hidden = state.bookingFor !== "other";
        });
      });
    }

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
        if (result.data.user.emergency_contact_name) document.getElementById("fEmergencyName").value = result.data.user.emergency_contact_name;
        if (result.data.user.emergency_contact_phone) {
          var eStored = result.data.user.emergency_contact_phone;
          var eMatch = ARRIVO_COUNTRY_CODES
            .slice()
            .sort(function (a, b) { return b.dial.length - a.dial.length; })
            .find(function (c) { return eStored.indexOf(c.dial) === 0; });
          if (eMatch) emergencyPhoneField.setRaw(eMatch.dial, eStored.slice(eMatch.dial.length));
        }
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
      state.dashcamConsent = document.getElementById("fDashcamConsent").checked;

      if (state.bookingFor === "other") {
        var passengerNameInput = document.getElementById("fPassengerName");
        state.passengerName = passengerNameInput ? passengerNameInput.value.trim() : "";
        if (!state.passengerName) {
          showError(contactError, t("booking.passengerNameRequired"));
          return;
        }
        var passengerPhoneResult = passengerPhoneField.getValue();
        if (!passengerPhoneResult.valid) {
          showError(contactError, t("booking.passengerWhatsappRequired"));
          return;
        }
        if (passengerPhoneResult.full === state.whatsapp) {
          showError(contactError, t("booking.samePassengerNumber"));
          return;
        }
        state.passengerWhatsapp = passengerPhoneResult.full;
      } else {
        state.passengerName = "";
        state.passengerWhatsapp = state.whatsapp;
      }

      var emergencyNameInput = document.getElementById("fEmergencyName");
      state.emergencyContactName = emergencyNameInput ? emergencyNameInput.value.trim() : "";
      if (!state.emergencyContactName) {
        showError(contactError, t("booking.emergencyContactNameRequired"));
        return;
      }
      var emergencyPhoneResult = emergencyPhoneField.getValue();
      if (!emergencyPhoneResult.valid) {
        showError(contactError, t("booking.emergencyContactPhoneRequired"));
        return;
      }
      if (emergencyPhoneResult.full === state.whatsapp || emergencyPhoneResult.full === state.passengerWhatsapp) {
        showError(contactError, t("booking.emergencyContactSameAsRider"));
        return;
      }
      state.emergencyContactPhone = emergencyPhoneResult.full;

      if (!state.country) {
        showError(contactError, "Please enter your country of residence.");
        return;
      }
      if (!state.dashcamConsent) {
        showError(contactError, t("booking.dashcamConsentRequired"));
        return;
      }
      if (!state.agreedToTerms) {
        showError(contactError, "Please agree to the privacy policy and terms of service to continue.");
        return;
      }


      // Save WhatsApp/Country to the rider's profile for next time, then continue.
      // Only when booking for self — if this is a passenger's number, it
      // belongs to the ride, not to the account holder's saved profile.
      var profilePatch = {
        countryOfResidence: state.country,
        whatsappNumber: state.whatsapp,
        emergencyContactName: state.emergencyContactName,
        emergencyContactPhone: state.emergencyContactPhone,
      };

      api("/api/auth/me", {
        method: "PATCH",
        headers: authHeader(),
        body: JSON.stringify(profilePatch),
      }).then(function () {
        goToStep(2);
      }).catch(function () {
        // Non-critical if this save fails — don't block the booking over it.
        goToStep(2);
      });
    });
  }

  // ───────────────────────── Step 2: Trip type + Flight ─────────────────────────
  // Booking type now lives here (moved from the old Luggage & Vehicle
  // step) specifically so the flight-number question can react to it:
  // one-way airport pickups need a flight number (it's the only way to
  // track ETA), but multi-day charter bookings (full_day/week/month) have
  // no single flight to track, so they skip this question entirely rather
  // than being blocked by a required field that doesn't apply to them.
  function initStep2() {
    var resultBox = document.getElementById("flightResult");
    var errorBox = document.getElementById("flightError");
    var requiredErrorBox = document.getElementById("flightRequiredError");
    var flightInput = document.getElementById("fFlight");
    var flightSection = document.getElementById("flightNumberSection");
    var flightLabel = document.getElementById("flightSectionLabel");
    var flightSub = document.getElementById("flightSectionSub");
    var scheduledSection = document.getElementById("scheduledPickupSection");
    var scheduledErrorBox = document.getElementById("scheduledPickupError");
    var dateInput = document.getElementById("fScheduledDate");
    var timeInput = document.getElementById("fScheduledTime");
    // Can't be a static HTML attribute since "today" changes — set it once
    // here instead, so the date picker itself refuses a past date (immediate
    // feedback) rather than only learning it's invalid after hitting Continue.
    if (dateInput) {
      var todayStr = new Date().toISOString().slice(0, 10);
      dateInput.min = todayStr;
    }
    var bookingChips = Array.prototype.slice.call(document.querySelectorAll("#bookingTypeOptions .booking-type-chip"));
    var fullDayCountSection = document.getElementById("fullDayCountSection");
    var fullDayCountInput = document.getElementById("fFullDayCountInput");
    // Matches CHARTER_MULTIPLIER.full_day in arrivo-backend/services/fare.js
    // — a single full day's multiplier, before any multi-day count is applied.
    var FULL_DAY_BASE_MULTIPLIER = 6;

    // No preset ceiling here — any whole number the rider types (8, 18, 78...)
    // is accepted and the fare calculated on checkout. Only a floor of 1 and
    // a fallback to 1 for non-numeric input. The backend still enforces a
    // generous sanity-check upper bound server-side (MAX_FULL_DAY_COUNT in
    // arrivo-backend/services/fare.js) purely to reject garbage input.
    function setFullDayCount(n) {
      var normalized = Math.max(Math.round(Number(n)) || 1, 1);
      state.fullDayCount = normalized;
      state.durationDays = normalized;
      state.multiplier = FULL_DAY_BASE_MULTIPLIER * normalized;
      if (fullDayCountInput) fullDayCountInput.value = normalized;
      updatePriceLabels();
    }

    if (fullDayCountInput) {
      fullDayCountInput.addEventListener("change", function () {
        setFullDayCount(fullDayCountInput.value);
      });
    }

    // Default the date picker to tomorrow — a sensible starting point for a
    // next-day departure — rather than leaving it blank.
    if (dateInput && !dateInput.value) {
      var tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateInput.value = tomorrow.toISOString().slice(0, 10);
    }
    if (timeInput && !timeInput.value) timeInput.value = "09:00";

    function updateFlightSectionVisibility() {
      var isOneWay = state.bookingType === "one_way";
      var isDropoff = state.bookingType === "dropoff";
      var isFullDay = state.bookingType === "full_day";
      flightSection.hidden = !isOneWayStyle(state.bookingType);
      scheduledSection.hidden = !isDropoff;
      fullDayCountSection.hidden = !isFullDay;
      if (!isOneWay) requiredErrorBox.hidden = true;
      if (!isDropoff) scheduledErrorBox.hidden = true;

      // Airport Pickup: flight number required (it's the only way to track
      // an arriving rider's ETA). Airport Drop-off: optional (useful for
      // delay-awareness — timing already comes from the scheduled date/time
      // above, not from a flight-landing event).
      if (isDropoff) {
        flightLabel.textContent = t("booking.flightTitleOptional");
        flightSub.textContent = t("booking.flightSubOptional");
      } else if (isOneWay) {
        flightLabel.textContent = t("booking.flightTitle");
        flightSub.textContent = t("booking.flightSub");
      }
    }

    bookingChips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        bookingChips.forEach(function (c) { c.classList.remove("selected"); });
        chip.classList.add("selected");
        state.bookingType = chip.getAttribute("data-type");
        state.durationDays = Number(chip.getAttribute("data-days"));
        state.multiplier = Number(chip.getAttribute("data-multiplier"));
        // Reset back to a single day each time "Full Day" is (re)selected —
        // same "leave it as it is" default as landing on the step fresh.
        if (state.bookingType === "full_day") setFullDayCount(1);
        updateFlightSectionVisibility();
        updatePriceLabels();
      });
    });
    updateFlightSectionVisibility(); // set initial state on first load (defaults to one-way)

    // Flight number is required for one-way bookings — it's the only way
    // we can actually track a rider's flight and know their real arrival
    // time (see arrivo-backend/routes/flights.js). Clear the "required"
    // warning as soon as they start typing again, rather than leaving it
    // stuck up after they've already fixed it.
    flightInput.addEventListener("input", function () {
      requiredErrorBox.hidden = true;
    });
    [dateInput, timeInput].forEach(function (el) {
      if (el) el.addEventListener("input", function () { scheduledErrorBox.hidden = true; });
    });

    document.getElementById("trackFlightBtn").addEventListener("click", function () {
      var flightNumber = flightInput.value.trim().toUpperCase();
      resultBox.hidden = true;
      errorBox.hidden = true;
      if (!flightNumber) return;

      api("/api/flights/status?flightNumber=" + encodeURIComponent(flightNumber) + "&arrIata=LOS").then(function (result) {
        if (result.ok) {
          resultBox.hidden = false;
          resultBox.innerHTML =
            "<strong>" + escapeHtml(result.data.airline || "") + " " + escapeHtml(result.data.flightNumber || "") + "</strong>" +
            (result.data.arrival && result.data.arrival.estimated
              ? new Date(result.data.arrival.estimated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "");
        } else {
          errorBox.hidden = false;
        }
      }).catch(function () { errorBox.hidden = false; });
    });

    document.getElementById("flightContinue").addEventListener("click", function () {
      if (!isOneWayStyle(state.bookingType)) {
        // Charter bookings don't have a flight to track.
        state.flightNumber = "";
        goToStep(3);
        setupPlacesForStep4(); // Pickup is now step 3 — the map container only has real dimensions once this step is visible. Function name predates the reorder.
        return;
      }

      if (state.bookingType === "dropoff") {
        var dateVal = dateInput.value;
        var timeVal = timeInput.value || "09:00";
        var scheduled = dateVal ? new Date(dateVal + "T" + timeVal + ":00") : null;
        if (!scheduled || isNaN(scheduled.getTime()) || scheduled.getTime() <= Date.now()) {
          scheduledErrorBox.hidden = false;
          return;
        }
        scheduledErrorBox.hidden = true;
        state.scheduledPickupAt = scheduled.toISOString();
      } else {
        state.scheduledPickupAt = null;
      }

      // Flight number is required for Airport Pickup, optional for Airport
      // Drop-off (timing already comes from the scheduled date/time above).
      var flightNumber = flightInput.value.trim().toUpperCase();
      if (state.bookingType === "one_way" && !flightNumber) {
        requiredErrorBox.hidden = false;
        flightInput.focus();
        return;
      }
      requiredErrorBox.hidden = true;
      state.flightNumber = flightNumber;
      goToStep(3);
      setupPlacesForStep4(); // Pickup is now step 3 — the map container only has real dimensions once this step is visible. Function name predates the reorder.
    });
    document.getElementById("backTo1").addEventListener("click", function () { goToStep(1); });
  }

  // ───────────────────────── Step 3: Luggage & Vehicle ─────────────────────────
  // Airline-style luggage entry: carry-on (stays with the rider, never
  // affects vehicle choice) + checked bags (the actual cargo load) + a
  // heavy/oversized flag (mirrors an airline's "excess baggage" question).
  // Heavy/oversized or a large checked-bag count is what should steer
  // someone toward the Pickup Truck — it's a cargo vehicle, not a bigger
  // passenger vehicle, so it's recommended independently of passenger
  // count. A big passenger count with normal luggage still recommends
  // Executive (truck), same as before. Recommending is the only thing
  // this does — the rider can always pick a different vehicle manually
  // (see selectVehicle below), same as the existing suv/truck behavior.
  function recommendVehicle(checkedBags, bulky, passengers) {
    if (bulky || checkedBags >= 5) return "pickup";
    if (passengers >= 5) return "truck";
    if (checkedBags >= 3 || passengers >= 4) return "suv";
    return "sedan";
  }

  function initStep3() {
    var checkedInput = document.getElementById("fChecked");
    var bulkyInput = document.getElementById("fBulky");
    var adultsInput = document.getElementById("fAdults");
    var childrenInput = document.getElementById("fChildren");
    var passengersError = document.getElementById("passengersError");
    var vehicleCards = Array.prototype.slice.call(document.querySelectorAll(".vehicle-card"));
    // Booking-type chips now live in Step 2 (initStep2) — moved there so
    // the flight-number question can react to them. Nothing to bind here
    // anymore.

    // Updates each vehicle card's "× N" multi-vehicle note and disables
    // only the vehicles that would need MORE than MAX_AUTO_VEHICLE_COUNT of
    // themselves to fit the group — a group bigger than one vehicle holds
    // no longer blocks anything, it just books more than one (see
    // computeVehicleCount above), same as both apps already do.
    function updateRecommendation() {
      var checkedBags = Number(checkedInput.value) || 0;
      var bulky = bulkyInput.checked;
      var passengers = Math.max(1, (Number(adultsInput.value) || 0) + (Number(childrenInput.value) || 0));
      var recommended = recommendVehicle(checkedBags, bulky, passengers);

      vehicleCards.forEach(function (card) {
        var vehicleType = card.getAttribute("data-vehicle");
        var isRecommended = vehicleType === recommended;
        card.classList.toggle("recommended", isRecommended);

        var neededCount = computeVehicleCount(passengers, vehicleType);
        var tooLarge = neededCount > MAX_AUTO_VEHICLE_COUNT;
        card.classList.toggle("over-capacity", tooLarge);

        var noteEl = card.querySelector(".v-multi-note");
        if (noteEl) {
          if (!tooLarge && neededCount > 1) {
            noteEl.textContent = tFormat("booking.multiVehicleCardNote", { count: neededCount });
            noteEl.hidden = false;
          } else {
            noteEl.hidden = true;
          }
        }

        if (!state.vehicleManuallyPicked && isRecommended && !tooLarge) selectVehicle(card, false);
      });

      // If the passenger count grew past what the manually-picked vehicle
      // can handle even across MAX_AUTO_VEHICLE_COUNT of it, don't leave an
      // invalid selection standing — fall back to the auto-recommendation.
      if (state.vehicleManuallyPicked) {
        var currentCard = vehicleCards.filter(function (c) { return c.getAttribute("data-vehicle") === state.vehicle; })[0];
        var currentTooLarge = currentCard ? computeVehicleCount(passengers, state.vehicle) > MAX_AUTO_VEHICLE_COUNT : false;
        if (currentTooLarge) {
          state.vehicleManuallyPicked = false;
          var recommendedCard = vehicleCards.filter(function (c) { return c.getAttribute("data-vehicle") === recommended; })[0];
          if (recommendedCard) selectVehicle(recommendedCard, false);
        }
      }
    }

    function selectVehicle(card, manual) {
      vehicleCards.forEach(function (c) { c.classList.remove("selected"); });
      card.classList.add("selected");
      state.vehicle = card.getAttribute("data-vehicle");
      state.vehicleBasePrice = Number(card.getAttribute("data-price"));
      if (manual) state.vehicleManuallyPicked = true;
    }

    var carryOnInput = document.getElementById("fCarryOn");
    checkedInput.addEventListener("input", updateRecommendation);
    bulkyInput.addEventListener("change", updateRecommendation);
    adultsInput.addEventListener("input", updateRecommendation);
    childrenInput.addEventListener("input", updateRecommendation);
    vehicleCards.forEach(function (card) {
      card.addEventListener("click", function () {
        var capacityError = document.getElementById("vehicleCapacityError");
        // over-capacity now only means "even MAX_AUTO_VEHICLE_COUNT of this
        // vehicle can't fit the group" — anything short of that is a
        // perfectly bookable multi-vehicle trip, so it's selectable.
        if (card.classList.contains("over-capacity")) {
          capacityError.hidden = false;
          return;
        }
        capacityError.hidden = true;
        selectVehicle(card, true);
      });
    });

    updatePriceLabels();
    updateRecommendation(); // set initial state on first load

    document.getElementById("luggageContinue").addEventListener("click", function () {
      var adults = Number(adultsInput.value) || 0;
      var children = Number(childrenInput.value) || 0;
      passengersError.hidden = true;
      document.getElementById("vehicleCapacityError").hidden = true;
      if (adults < 1) {
        passengersError.hidden = false;
        return;
      }
      // Only genuinely blocks when the selected vehicle would need MORE
      // than MAX_AUTO_VEHICLE_COUNT of itself to fit the whole group — a
      // group that fits within that (even across several vehicles of the
      // same type) proceeds normally; vehicleCount is recomputed from
      // adults/children server-side at quote and booking time regardless.
      var passengers = adults + children;
      if (computeVehicleCount(passengers, state.vehicle) > MAX_AUTO_VEHICLE_COUNT) {
        document.getElementById("vehicleCapacityError").hidden = false;
        return;
      }
      state.adults = adults;
      state.children = children;
      state.carryOnBags = Number(carryOnInput.value) || 0;
      state.checkedBags = Number(checkedInput.value) || 0;
      state.bulky = bulkyInput.checked;
      renderReview();
      goToStep(5);
    });
    document.getElementById("backTo2").addEventListener("click", function () { goToStep(3); }); // Pickup is now the previous step — id predates the reorder
  }

  // ───────────────────────── Google Places autocomplete + map preview ─────────────────────────
  // RideArrivo operates in Nigeria, so search results are restricted to Nigerian
  // addresses — this also makes suggestions far more relevant than an
  // unrestricted worldwide search would be.
  var LAGOS_CENTER = { lat: 6.5244, lng: 3.3792 };
  var googleMapInstance = null;
  var googleMapMarker = null;
  var autocompleteAttachedTo = [];
  var activeAutocompleteInstances = [];

  // Referenced by name in the Google Maps <script> tag's callback= parameter,
  // so it must exist on window before that script finishes loading.
  window.initGoogleMaps = function () {
    window.__googleMapsReady = true;
  };

  // ───────────────────────── Zone-based pricing ─────────────────────────
  // Only applies to one-way bookings. Full day/week/month bookings are
  // chauffeur-style flat-rate pricing and keep using the existing
  // vehicleBasePrice × booking-type multiplier shown on the vehicle cards.
  // Lagos Zone Classification & Pricing — per the operations team's PRD.
  // Each area maps to a tier (green = operate freely, yellow = dynamic
  // pricing due to traffic/distance, red = don't operate) and a sedan
  // base price. Where the PRD gave a range (e.g. "₦45,000–₦50,000"), the
  // midpoint is used as the actual charged price — a range isn't
  // something a checkout can charge directly, and picking the low or
  // high end arbitrarily would be a bigger assumption than the middle.
  // Where the PRD's "Recommended Fixed Pricing" table (which explicitly
  // supersedes the earlier range) gave a number for an area, that number
  // is used instead of the general range table.
  // How many passengers each vehicle type seats — mirrors
  // arrivo-backend/services/fare.js's MAX_PASSENGERS exactly (same numbers
  // kept in sync manually, same as both apps' booking screens). This used
  // to be treated as a hard per-vehicle cap that dead-ended any group over
  // 5-6 people with a prompt to "add fleet accompaniment" — but fleet
  // accompaniment is a flat escort/convoy add-on (see FLEET_PRICE below),
  // not a way to carry more passengers. The real mechanism for a big group
  // is booking multiple of the SAME vehicle (see computeVehicleCount below),
  // which the backend and both apps already do — this brings the website in
  // line with that instead of blocking bookings it can actually fulfill.
  // Pickup Truck seats fewer passengers than SUV/Executive — it's a cargo
  // vehicle first, so the bed isn't passenger space.
  var MAX_PASSENGERS = { sedan: 3, suv: 5, truck: 5, pickup: 3 };
  // Past this many vehicles, no driver pool can realistically staff one
  // group's trip at once — mirrors arrivo-backend/services/fare.js's
  // MAX_AUTO_VEHICLE_COUNT exactly. Above this, the rider is asked to
  // contact RideArrivo directly, same message the backend itself would
  // give if this client-side check were somehow bypassed.
  var MAX_AUTO_VEHICLE_COUNT = 6;

  // Given a passenger count and a vehicle type, works out how many of that
  // vehicle are actually needed to fit everyone (e.g. 8 passengers in a
  // 5-seat SUV needs 2 SUVs) — same math as the backend's computeVehicleCount
  // and the rider app's RouteScreen.js. This is purely a UI preview; the
  // backend independently re-derives the real vehicleCount from adults/
  // children at quote and booking time and never trusts a client-sent count.
  function computeVehicleCount(passengerCount, vehicleType) {
    var capacity = MAX_PASSENGERS[vehicleType] || 1;
    return Math.max(1, Math.ceil((Number(passengerCount) || 1) / capacity));
  }
  // Fleet accompaniment add-on, per vehicle type.
  var FLEET_PRICE = {
    sedan: { 2: 70000, 3: 100000 },
    suv: { 2: 70000, 3: 100000 },
    truck: { 2: 70000, 3: 100000 },
    pickup: { 2: 70000, 3: 100000 },
  };
  // Security escort is now priced at $100-equivalent, computed live by the
  // backend (services/fare.js SECURITY_ESCORT_PRICE_USD) via the real quote
  // endpoint — there's no local naira constant for it anymore. The old
  // NGN 100,000 flat price this constant used to hold is gone; the UI shows
  // "priced at checkout" instead of a specific number for this reason.

  var AREA_PRICING = {
    // Green zone — operate freely (closer to airport, best roads)
    "ikeja gra": 27500, "maryland": 30000, "ogba": 30000, "magodo": 32500,
    "surulere": 32500, "yaba": 34500, "anthony": 30000, "anthony village": 30000,
    "ilupeju": 30000, "gbagada": 37500, "allen avenue": 30000, "alausa": 30000,
    "ajao estate": 30000, "victoria island": 45000, "ikoyi": 50000,
    "lekki phase 1": 45000,

    // Yellow zone — traffic corridors, using the Recommended Fixed
    // Pricing table (supersedes the earlier general range for these)
    "iyana-ipaja": 47500, "iyana ipaja": 47500, "egbeda": 47500, "akowonjo": 47500,
    "idimu": 52500, "ipaja": 47500, "ayobo": 55000, "baruwa": 55000,
    "alimosho": 50000, "command": 57500, "abule egba": 55000,
    "ijaiye": 47500, "oko oba": 47500, "dopemu": 42500, "shasha": 50000,

    // Yellow zone — premium/distance pricing
    "lekki": 45000, "ajah": 55000, "ikorodu": 50000, "festac": 50000,
    "satellite town": 60000,
  };

  // Red zone — limited or no operations. Reuses the same exclusion
  // mechanism built for the generic "outskirts" blocking feature, since
  // this is exactly that feature with real data now filled in.
  var EXCLUDED_AREAS = [
    { name: "Badagry", keywords: ["badagry"] },
    { name: "Epe", keywords: ["epe"] },
    { name: "Ibeju-Lekki", keywords: ["ibeju-lekki", "ibeju lekki"] },
    { name: "Makoko", keywords: ["makoko"] },
  ];

  // Areas not explicitly listed above still need *some* price — rather
  // than silently defaulting to the cheapest tier (which would make
  // unlisted-but-genuinely-far areas underpriced), unmatched addresses
  // fall back to this mid-range green-zone figure. Flag this to whoever
  // owns pricing if a specific area keeps hitting the fallback — it
  // probably needs its own entry.
  var DEFAULT_AREA_PRICE = 32000;

  function findAreaPrice(address) {
    var a = (" " + (address || "").toLowerCase() + " ");
    var bestMatch = null;
    for (var key in AREA_PRICING) {
      if (a.indexOf(key) !== -1) {
        // Prefer the longest/most specific keyword match (e.g. "lekki
        // phase 1" over the more general "lekki") rather than whichever
        // happens to be checked first in object iteration order.
        if (!bestMatch || key.length > bestMatch.length) bestMatch = key;
      }
    }
    return bestMatch ? AREA_PRICING[bestMatch] : DEFAULT_AREA_PRICE;
  }

  // Vehicle tier pricing is the area's base (sedan) price plus a fixed
  // delta per tier, matching the "from ₦30,000 / ₦45,000 / ₦60,000"
  // spacing given for Standard Sedan / Premium SUV / Executive Vehicle —
  // a flat +15k / +30k rather than re-deriving a per-area number for
  // every vehicle type across 20+ areas. "pickup" (Pickup Truck) is a
  // later addition for heavy/bulky cargo — a working vehicle, not a
  // luxury one, so it's priced between Sedan and SUV rather than at/above
  // Executive. Mirrors arrivo-backend/services/fare.js exactly — that's
  // the real source of truth; this is just what's shown before a live
  // quote loads. "truck" is the internal id for Executive Vehicle — kept
  // stable to avoid renaming every reference; only the *label* shown to
  // riders changed.
  var VEHICLE_TIER_DELTA = { sedan: 0, suv: 15000, truck: 30000, pickup: 10000 };

  // Night pricing (8pm–5am) and the one-fee-per-location model live
  // entirely server-side now (arrivo-backend/services/fare.js) — the old
  // itemized excess-luggage/multi-stop/midnight-pickup fees this file used
  // to calculate here were removed from actual billing a while back, per
  // the "one fee per location, no more fees" product decision. Luggage
  // counts below only drive which vehicle gets auto-recommended, same as
  // before — they were never sent to the backend or billed directly.

  function findExcludedArea(address, latLng) {
    var a = (" " + (address || "").toLowerCase() + " ");
    for (var i = 0; i < EXCLUDED_AREAS.length; i++) {
      var area = EXCLUDED_AREAS[i];
      if (area.keywords) {
        for (var k = 0; k < area.keywords.length; k++) {
          if (a.indexOf(area.keywords[k].toLowerCase()) !== -1) return area;
        }
      }
      if (area.box && latLng) {
        var lat = typeof latLng.lat === "function" ? latLng.lat() : latLng.lat;
        var lng = typeof latLng.lng === "function" ? latLng.lng() : latLng.lng;
        if (typeof lat === "number" && typeof lng === "number" &&
            lat >= area.box.minLat && lat <= area.box.maxLat &&
            lng >= area.box.minLng && lng <= area.box.maxLng) {
          return area;
        }
      }
    }
    return null;
  }

  function zoneVehiclePrice(vehicle, zone) {
    var areaBase = zone && zone.areaPrice != null ? zone.areaPrice : DEFAULT_AREA_PRICE;
    var delta = VEHICLE_TIER_DELTA[vehicle] != null ? VEHICLE_TIER_DELTA[vehicle] : 0;
    return areaBase + delta;
  }

  function updatePriceLabels() {
    document.querySelectorAll(".vehicle-card").forEach(function (card) {
      var vehicle = card.getAttribute("data-vehicle");
      var price;
      if (isOneWayStyle(state.bookingType) && state.zone) {
        price = zoneVehiclePrice(vehicle, state.zone);
      } else {
        var base = Number(card.getAttribute("data-price"));
        price = base * state.multiplier;
      }
      card.querySelector(".v-price").textContent = "NGN " + price.toLocaleString();
    });
  }

  function applyLocationBiasTo(autocomplete) {
    if (!state.userLocation || !window.google) return;
    try {
      var circle = new google.maps.Circle({ center: state.userLocation, radius: 20000 }); // 20km, biases without hard-restricting
      autocomplete.setBounds(circle.getBounds());
    } catch (e) {
      // Biasing is a nice-to-have, never worth breaking address search over.
    }
  }

  function applyLocationBiasToAllAutocompletes() {
    activeAutocompleteInstances.forEach(applyLocationBiasTo);
  }

  // ───────────────────────── Location permission ─────────────────────────
  // Explicit, visible prompt rather than silently calling
  // getCurrentPosition() and letting the browser's own native permission
  // dialog be the only thing asking — the requirement was that the rider
  // clearly understands what's being requested and why before it happens.
  function initLocationPermission() {
    var box = document.getElementById("locationPermissionBox");
    var declinedNote = document.getElementById("locationDeclinedNote");
    if (!box) return;

    document.getElementById("allowLocationBtn").addEventListener("click", function () {
      if (!navigator.geolocation) {
        state.locationPermission = "unavailable";
        box.hidden = true;
        declinedNote.hidden = false;
        return;
      }
      navigator.geolocation.getCurrentPosition(
        function (position) {
          state.locationPermission = "granted";
          state.userLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
          box.hidden = true;
          declinedNote.hidden = true;
          applyLocationBiasToAllAutocompletes();
        },
        function () {
          // Browser prompt was shown but the rider said no at that layer —
          // same outcome as clicking "Not now" here, just via a different path.
          state.locationPermission = "declined";
          box.hidden = true;
          declinedNote.hidden = false;
        },
        { timeout: 6000 }
      );
    });

    document.getElementById("declineLocationBtn").addEventListener("click", function () {
      state.locationPermission = "declined";
      box.hidden = true;
      declinedNote.hidden = false;
    });
  }

  // ───────────────────────── Currency display ─────────────────────────
  // Payments themselves stay in Naira — Paystack/wallet only ever charge
  // NGN here. This is display-only: for a rider who isn't currently in
  // Nigeria, show an approximate USD figure next to the fare so the price
  // means something to them. A prior review of adding real USD payment
  // processing (Stripe) found it blocked by foreign-entity requirements for
  // a Nigerian business — the recommendation then was to keep pricing in
  // Naira and let the card network handle conversion, which this still
  // does; this just adds a clearer estimate on screen, not a new payment
  // path.
  //
  // Detection uses the browser's language/region setting, matching how the
  // apps do it via device locale (see arrivo-app/hooks/useCurrency.js) —
  // this used to depend on the geolocation permission prompt above
  // ("share your location for... the right currency"), which conflated two
  // unrelated things (address-search proximity bias vs. what currency to
  // display) and simply didn't work for anyone who declined location
  // sharing. The conversion rate is fetched live from the backend (same
  // GET /api/rides/fx-rate the apps use) instead of a hardcoded constant
  // that would silently go stale as the real exchange rate moves.
  function getRegionCode() {
    var lang = navigator.language || navigator.userLanguage || "";
    try {
      if (window.Intl && Intl.Locale) {
        var loc = new Intl.Locale(lang);
        if (loc.region) return loc.region;
        if (typeof loc.maximize === "function") {
          var maxed = loc.maximize();
          if (maxed.region) return maxed.region;
        }
      }
    } catch (e) {
      // Fall through to the manual parse below (older browsers, or a
      // language tag Intl.Locale doesn't like).
    }
    var parts = lang.split("-");
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : null;
  }

  state.isNigeria = getRegionCode() === "NG";
  state.ngnPerUsd = null;

  function loadFxRate() {
    if (state.isNigeria) return; // no need to fetch a rate for naira-only display
    api("/api/rides/fx-rate", { headers: authHeader() }).then(function (result) {
      if (result.ok) state.ngnPerUsd = result.data.ngnPerUsd;
    }).catch(function () {
      // Best-effort — formatNairaWithUsdEstimate below just keeps showing
      // naira if this never resolves (e.g. offline). Explicit no-op catch
      // so a network failure here doesn't surface as an unhandled
      // rejection in the console.
    });
  }

  function formatNairaWithUsdEstimate(nairaAmount) {
    if (state.isNigeria || !state.ngnPerUsd) return "NGN " + nairaAmount.toLocaleString();
    var usd = (nairaAmount / state.ngnPerUsd).toFixed(2);
    return "NGN " + nairaAmount.toLocaleString() + " (~$" + usd + ")";
  }

  function recalculateFareEstimate() {
    var box = document.getElementById("fareEstimateBox");
    var errEl = document.getElementById("fareError");
    if (!box) return;

    if (!isOneWayStyle(state.bookingType)) {
      box.hidden = true;
      errEl.hidden = true;
      return;
    }
    if (!state.stops.length && !state.dropoffLatLng) {
      box.hidden = true;
      return;
    }

    var dropoffAddress = state.stops.length ? state.stops[state.stops.length - 1] : document.getElementById("fDropoff").value;
    state.zone = { areaPrice: findAreaPrice(dropoffAddress) };
    errEl.hidden = true;

    document.getElementById("fareDistanceText").textContent = "Base fare for this area";
    document.getElementById("fareBaseText").textContent = "Sedan NGN " + zoneVehiclePrice("sedan", state.zone).toLocaleString() + " · SUV NGN " + zoneVehiclePrice("suv", state.zone).toLocaleString();
    document.getElementById("fareSecurityRow").hidden = !state.securityEscort;
    var fleetRow = document.getElementById("fareFleetRow");
    fleetRow.hidden = !state.fleetSize;
    if (state.fleetSize) {
      document.getElementById("fareFleetLabel").textContent = "Fleet of " + state.fleetSize;
      document.getElementById("fareFleetAmount").textContent = "+NGN " + (FLEET_PRICE.sedan[state.fleetSize] || 0).toLocaleString();
    }
    document.getElementById("fareTotalText").textContent = "Choose your vehicle on the next step to see the exact price.";
    box.hidden = false;

    // Optional nice-to-have: real distance/duration for display only, never
    // used for pricing — if this fails for any reason, area-based pricing
    // above already works regardless.
    if (state.pickupLatLng && state.dropoffLatLng && window.google && window.google.maps) {
      var service = new google.maps.DistanceMatrixService();
      service.getDistanceMatrix({
        origins: [state.pickupLatLng],
        destinations: [state.dropoffLatLng],
        travelMode: google.maps.TravelMode.DRIVING,
      }, function (response, status) {
        var el = status === "OK" && response.rows[0] && response.rows[0].elements[0];
        if (!el || el.status !== "OK") return;
        state.distanceKm = el.distance.value / 1000;
        state.durationMin = el.duration.value / 60;
        document.getElementById("fareDistanceText").textContent = state.distanceKm.toFixed(1) + " km, ~" + Math.round(state.durationMin) + " min";
      });
    }
  }

  var securityEscortCheckbox = document.getElementById("fSecurityEscort");
  if (securityEscortCheckbox) {
    securityEscortCheckbox.addEventListener("change", function () {
      state.securityEscort = securityEscortCheckbox.checked;
      recalculateFareEstimate();
    });
  }
  document.querySelectorAll("#fleetChips .chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      document.querySelectorAll("#fleetChips .chip").forEach(function (c) { c.classList.remove("selected"); });
      chip.classList.add("selected");
      state.fleetSize = Number(chip.getAttribute("data-fleet"));
      recalculateFareEstimate();
    });
  });

  function attachPlacesAutocomplete(inputEl) {
    if (!inputEl || autocompleteAttachedTo.indexOf(inputEl) !== -1) return;
    if (!window.google || !window.google.maps || !window.google.maps.places) return;
    autocompleteAttachedTo.push(inputEl);

    var autocomplete = new google.maps.places.Autocomplete(inputEl, {
      componentRestrictions: { country: "ng" },
      fields: ["formatted_address", "geometry", "name"],
    });
    activeAutocompleteInstances.push(autocomplete);
    if (state.userLocation) applyLocationBiasTo(autocomplete);

    autocomplete.addListener("place_changed", function () {
      var place = autocomplete.getPlace();
      // A place with no geometry means the visitor typed free text and hit
      // Enter without picking a suggestion from the dropdown — that's still
      // a valid address to us, we just can't show it on the map preview,
      // and we can't calculate a real distance-based fare for it either.
      if (!place.geometry || !place.geometry.location) return;
      updateMapMarker(place.geometry.location, place.formatted_address || place.name || inputEl.value);

      if (inputEl.id === "fPickup") {
        state.pickupLatLng = place.geometry.location;
      } else if (inputEl.id === "fDropoff") {
        state.dropoffLatLng = place.geometry.location;
      }
      checkExcludedAreas();
      recalculateFareEstimate();
    });
  }

  function checkExcludedAreas() {
    var errEl = document.getElementById("excludedAreaError");
    if (!errEl) return;
    var pickupText = document.getElementById("fPickup") ? document.getElementById("fPickup").value : "";
    var dropoffText = document.getElementById("fDropoff") ? document.getElementById("fDropoff").value : "";
    var matched = findExcludedArea(pickupText, state.pickupLatLng) || findExcludedArea(dropoffText, state.dropoffLatLng);
    state.excludedAreaMatch = matched;
    if (matched) {
      errEl.hidden = false;
      errEl.textContent = "We don't currently operate in " + matched.name + ". Please choose a different pickup or drop-off location.";
    } else {
      errEl.hidden = true;
    }
    return matched;
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

      if (checkExcludedAreas()) return; // error message already shown by checkExcludedAreas()

      var waypoints = Array.prototype.slice.call(stopsList.querySelectorAll(".stop-input"))
        .map(function (i) { return i.value.trim(); })
        .filter(Boolean);

      state.pickup = pickup;
      state.stops = waypoints.concat([dropoff]); // waypoints first, drop-off always last
      updatePriceLabels(); // zone is known now — refresh vehicle card prices before showing them
      goToStep(4);
    });
    document.getElementById("backTo3").addEventListener("click", function () { goToStep(2); }); // Flight is now the previous step — id predates the reorder
  }

  // ───────────────────────── Step 5: Review & Pay ─────────────────────────
  // The fare charged and submitted here now ALWAYS comes from the backend's
  // live quote (POST /api/rides/quote) — the same real, distance-based
  // formula (services/fare.js + actual Google Distance Matrix driving
  // distance) that both RideArrivo apps use. This used to be computed
  // locally from a hardcoded area-price table and never sent real
  // pickup/drop-off coordinates to the backend at all — which meant the
  // backend's own fare re-verification (added when the apps got real
  // distance-based pricing) would reject essentially every one-way booking
  // made through this website, in some cases AFTER a card had already been
  // charged via the Paystack popup below. This rewrite fixes that by
  // fetching the real number before anything can be charged.
  //
  // One consequence worth knowing: the excess-luggage/multi-stop/midnight
  // situational fees this file used to add locally are NOT part of the
  // backend's fare formula yet, so they're no longer charged here either —
  // charging for something the backend doesn't independently verify would
  // trip the same rejection this fix is meant to solve. If those fees are
  // still wanted, they need to be added to arrivo-backend/services/fare.js
  // so they apply consistently (and get charged) on the apps too.
  function getLiveQuote() {
    var body = {
      bookingType: state.bookingType,
      vehicleType: state.vehicle,
      securityEscort: state.securityEscort,
      fleetSize: state.fleetSize,
      // Only actually changes the charged fare for 'full_day' (see
      // arrivo-backend/services/fare.js computeCharterFare) — harmless to
      // always send it.
      durationDays: state.durationDays,
      // Previously never sent — the backend defaulted passengerCount to 1
      // (vehicleCount 1) for every quote, so a 6+ passenger group booking 2
      // SUVs would see a 1-SUV preview fare here and only get charged the
      // real (vehicleCount-scaled) amount at POST /api/rides. Sending these
      // makes the review-step preview match what's actually charged.
      adults: state.adults,
      children: state.children,
    };
    if (isOneWayStyle(state.bookingType)) {
      if (!state.pickupLatLng || !state.dropoffLatLng) {
        return Promise.resolve({
          ok: false,
          data: { error: "Please select a suggested pickup and drop-off address (from the dropdown) on the previous step so we can calculate your exact fare." },
        });
      }
      // pickupAddress/destinationAddress are what actually price a one-way
      // trip now — a flat per-location fare (see
      // arrivo-backend/services/fare.js), same formula the apps use.
      // lat/lng are sent too, but only used server-side for an
      // informational distance/duration display, never for the fare
      // itself.
      body.pickupAddress = state.pickup;
      body.destinationAddress = state.stops.length ? state.stops[state.stops.length - 1] : "";
      body.pickupLat = typeof state.pickupLatLng.lat === "function" ? state.pickupLatLng.lat() : state.pickupLatLng.lat;
      body.pickupLng = typeof state.pickupLatLng.lng === "function" ? state.pickupLatLng.lng() : state.pickupLatLng.lng;
      body.destinationLat = typeof state.dropoffLatLng.lat === "function" ? state.dropoffLatLng.lat() : state.dropoffLatLng.lat;
      body.destinationLng = typeof state.dropoffLatLng.lng === "function" ? state.dropoffLatLng.lng() : state.dropoffLatLng.lng;
    }
    return api("/api/rides/quote", { method: "POST", headers: authHeader(), body: JSON.stringify(body) });
  }

  // Coordinates for the actual POST /api/rides call below — same
  // derivation as getLiveQuote, only needed for one-way bookings.
  function getCoordsPayload() {
    if (!isOneWayStyle(state.bookingType) || !state.pickupLatLng || !state.dropoffLatLng) return {};
    return {
      pickupLat: typeof state.pickupLatLng.lat === "function" ? state.pickupLatLng.lat() : state.pickupLatLng.lat,
      pickupLng: typeof state.pickupLatLng.lng === "function" ? state.pickupLatLng.lng() : state.pickupLatLng.lng,
      destinationLat: typeof state.dropoffLatLng.lat === "function" ? state.dropoffLatLng.lat() : state.dropoffLatLng.lat,
      destinationLng: typeof state.dropoffLatLng.lng === "function" ? state.dropoffLatLng.lng() : state.dropoffLatLng.lng,
    };
  }

  function renderReview() {
    var loadingText = document.getElementById("quoteLoadingText");
    var errorText = document.getElementById("quoteErrorText");
    var retryBtn = document.getElementById("quoteRetryBtn");
    var content = document.getElementById("reviewContent");
    var payBtn = document.getElementById("payBtn");

    state.liveQuote = null;
    loadingText.hidden = false;
    errorText.hidden = true;
    retryBtn.style.display = "none";
    content.hidden = true;
    payBtn.disabled = true;

    getLiveQuote().then(function (result) {
      loadingText.hidden = true;
      if (!result.ok) {
        errorText.hidden = false;
        errorText.textContent = result.data.error || "Couldn't calculate your fare right now. Please try again.";
        // api() now always resolves {ok:false} instead of rejecting on a
        // real network failure (see the fetch().catch in api() above), so
        // this path is reachable on a plain connectivity blip, not just a
        // real validation error — offer a retry right here instead of
        // forcing a trip back through earlier steps.
        retryBtn.style.display = "inline-block";
        return;
      }
      state.liveQuote = result.data; // { fareNaira, distanceKm, durationMin }
      content.hidden = false;
      payBtn.disabled = false;
      renderReviewContent();
      checkWalletMinimum();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var retryBtn = document.getElementById("quoteRetryBtn");
    if (retryBtn) retryBtn.addEventListener("click", renderReview);
  });

  function renderReviewContent() {
    var list = document.getElementById("reviewList");
    var vehicleLabel = t("booking.vehicle" + state.vehicle.charAt(0).toUpperCase() + state.vehicle.slice(1));
    var bookingLabel = t("booking.type" + toPascalCase(state.bookingType));
    var totalFare = state.liveQuote.fareNaira;

    var rows = [
      [t("booking.reviewContact"), escapeHtml(state.name) + " · " + escapeHtml(state.email)],
    ];
    if (state.bookingFor === "other" && state.passengerName) {
      rows.push([t("booking.reviewPassenger"), escapeHtml(state.passengerName) + " · " + escapeHtml(state.passengerWhatsapp)]);
    }
    rows.push([t("booking.reviewEmergencyContact"), escapeHtml(state.emergencyContactName)]);
    // adult/adults and child/children pluralization is still hardcoded
    // English here (a pre-existing, separately-flagged i18n gap — see
    // reviewPassengers row) — not changed by this edit.
    var passengersText = state.adults + " adult" + (state.adults === 1 ? "" : "s") + (state.children > 0 ? ", " + state.children + " child" + (state.children === 1 ? "" : "ren") : "");
    // vehicleCount comes from the live quote (the backend's own
    // computeVehicleCount, re-derived from adults/children — see
    // getLiveQuote above) — not recomputed locally, so this always matches
    // what was actually priced, never a stale client-side guess.
    var vehicleCount = (state.liveQuote && state.liveQuote.vehicleCount) || 1;
    var vehicleText = escapeHtml(vehicleLabel) + (vehicleCount > 1 ? " × " + vehicleCount : "");
    var passengerCountForFare = state.adults + state.children;
    rows.push(
      [t("booking.reviewBookingType"), escapeHtml(bookingLabel)],
      [t("booking.reviewPassengers"), passengersText],
      [t("booking.reviewFlight"), escapeHtml(state.flightNumber) || "N/A"],
      [t("booking.reviewVehicle"), vehicleText],
      [t("booking.reviewPickup"), escapeHtml([state.pickup].concat(state.stops).join(" → "))]
    );
    if (vehicleCount > 1) {
      rows.push([
        t("booking.reviewMultiVehicleNote"),
        tFormat("booking.reviewMultiVehicleDetail", { count: vehicleCount, vehicle: escapeHtml(vehicleLabel), passengers: passengerCountForFare }),
      ]);
    }
    // Only Airport Drop-off collects an explicit scheduled time — Airport
    // Pickup is flight-landing-driven instead, and charter bookings don't
    // show a review row for it at all here.
    if (state.bookingType === "dropoff" && state.scheduledPickupAt) {
      rows.push([
        t("booking.reviewScheduledPickup"),
        new Date(state.scheduledPickupAt).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
      ]);
    }
    if (state.bookingType === "full_day" && state.durationDays > 1) {
      rows.push([t("booking.reviewFullDayCount"), state.durationDays + " days"]);
    }
    // No per-item naira breakdown for escort/fleet here anymore — the
    // backend only returns one final total, not a line-item split, and
    // showing a made-up number for "how much of the total was the escort"
    // would just be a guess. "Included" says what's true without faking precision.
    if (state.securityEscort) rows.push([t("booking.reviewSecurityEscort"), t("booking.reviewIncluded")]);
    if (state.fleetSize) {
      rows.push([t("booking.reviewFleetAccompaniment"), t("booking.reviewFleetOf") + " " + state.fleetSize + " · " + t("booking.reviewIncluded")]);
    }

    list.innerHTML = rows.map(function (r) {
      return "<div><dt>" + r[0] + "</dt><dd>" + r[1] + "</dd></div>";
    }).join("");

    document.getElementById("reviewFare").textContent = formatNairaWithUsdEstimate(totalFare);
    document.getElementById("payAmount").textContent = "NGN " + totalFare.toLocaleString();

    // Check the rider's wallet balance so we can tell them upfront whether
    // paying from it is actually an option for this specific fare, rather
    // than letting them pick it and only finding out it fails at checkout.
    api("/api/wallet", { headers: authHeader() }).then(function (result) {
      if (!result.ok) return;
      state.walletBalanceNaira = result.data.balanceNaira;
      var hint = document.getElementById("walletBalanceHint");
      var walletOpt = document.getElementById("walletPaymentOpt");
      var insufficientNote = document.getElementById("walletInsufficientNote");
      var sufficient = state.walletBalanceNaira >= totalFare;
      hint.textContent = "(NGN " + state.walletBalanceNaira.toLocaleString() + ")";
      walletOpt.disabled = !sufficient;
      walletOpt.style.opacity = sufficient ? "1" : "0.5";
      if (state.paymentMethod === "wallet" && !sufficient) {
        state.paymentMethod = "card";
        document.querySelectorAll("#paymentMethodToggle .for-who-opt").forEach(function (b) {
          b.classList.toggle("is-active", b.getAttribute("data-method") === "card");
        });
        insufficientNote.hidden = false;
      }
    });

    api("/api/memberships/mine", { headers: authHeader() }).then(function (result) {
      if (!result.ok) return;
      var membershipOpt = document.getElementById("membershipPaymentOpt");
      if (result.data.membership) {
        membershipOpt.hidden = false;
        // A membership covers the ride outright — the obviously better
        // default the moment it's available, rather than making someone
        // notice and switch to it themselves.
        state.paymentMethod = "membership";
        document.querySelectorAll("#paymentMethodToggle .for-who-opt").forEach(function (b) {
          b.classList.toggle("is-active", b.getAttribute("data-method") === "membership");
        });
      } else {
        membershipOpt.hidden = true;
      }
    });
  }

  // Standing wallet-balance floor (~$100-equivalent) every rider must clear
  // before ANY ride can be booked, regardless of which payment method they
  // use for the fare itself — see GET /api/rides/wallet-minimum. Checked
  // here, proactively, before the rider can reach a Paystack charge, same
  // as both apps do (rather than only finding out from a POST /api/rides
  // rejection after already being charged).
  function checkWalletMinimum() {
    var note = document.getElementById("walletMinimumNote");
    var payBtn = document.getElementById("payBtn");
    api("/api/rides/wallet-minimum", { headers: authHeader() }).then(function (result) {
      if (!result.ok) return; // don't block checkout on this lookup failing — POST /api/rides still enforces it for real
      if (!result.data.meetsMinimum) {
        note.hidden = false;
        note.innerHTML =
          "RideArrivo requires a minimum wallet balance of NGN " + Math.round(result.data.minWalletBalanceNaira).toLocaleString() +
          " before any ride can be booked. Your current balance is NGN " + Math.round(result.data.walletBalanceNaira).toLocaleString() +
          ". <a href=\"account.html\" style=\"color:var(--primary);text-decoration:underline;\">Top up in My Account</a>.";
        payBtn.disabled = true;
      } else {
        note.hidden = true;
        payBtn.disabled = false;
      }
    });
  }

  function toPascalCase(snake) {
    return snake.split("_").map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join("");
  }

  // Exposed separately so it can be tested independently of the real
  // Paystack popup (which needs a real key + real browser + a real card).
  function handleDirectPayment() {
    var payError = document.getElementById("payError");
    payError.hidden = true;

    if (!state.liveQuote) {
      payError.hidden = false;
      payError.textContent = "We couldn't confirm your fare. Please go back to the review step and try again.";
      return Promise.resolve();
    }

    var payload = Object.assign({
      pickupAddress: state.pickup,
      stops: state.stops,
      flightNumber: state.flightNumber || null,
      vehicleType: state.vehicle,
      fareNaira: state.liveQuote.fareNaira,
      distanceKm: state.liveQuote.distanceKm != null ? state.liveQuote.distanceKm : state.distanceKm,
      durationMin: state.liveQuote.durationMin != null ? state.liveQuote.durationMin : state.durationMin,
      securityEscort: state.securityEscort,
      fleetSize: state.fleetSize,
      paymentMethod: state.paymentMethod,
      bookingType: state.bookingType,
      durationDays: state.durationDays,
      agreedCancellationPolicy: true,
      agreedDashcamConsent: state.dashcamConsent,
      bookingFor: state.bookingFor,
      passengerName: state.bookingFor === "other" ? state.passengerName : null,
      passengerWhatsapp: state.passengerWhatsapp,
      adults: state.adults,
      children: state.children,
      emergencyContactName: state.emergencyContactName,
      emergencyContactPhone: state.emergencyContactPhone,
      scheduledPickupAt: state.scheduledPickupAt || null,
      linkedRideId: state.linkedRideId || null,
    }, getCoordsPayload());

    return api("/api/rides", {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify(payload),
    }).then(function (rideResult) {
      if (!rideResult.ok) {
        payError.hidden = false;
        payError.textContent = rideResult.data.error || t("booking.paymentFailed");
        return;
      }
      var createdRide = rideResult.data.ride;
      document.getElementById("confirmRef").textContent = "Ride #" + createdRide.id;
      var barcodeEl = document.getElementById("confirmBarcode");
      var barcodeBox = document.getElementById("confirmBarcodeBox");
      if (barcodeEl && barcodeBox && createdRide.barcode) {
        barcodeEl.textContent = createdRide.barcode;
        barcodeBox.hidden = false;
      }
      if (state.bookingType === "one_way") showReturnDropoffPrompt(createdRide.id);
      goToStep(6);
    }).catch(function () {
      payError.hidden = false;
      payError.textContent = t("booking.paymentFailed");
    });
  }

  // Offered right after paying for an Airport Pickup ("one_way") — builds a
  // link back into this same booking flow with the reversed route
  // (destination becomes pickup, original pickup/airport becomes
  // destination) and the airport pickup's own resolved coordinates
  // pre-filled, so the rider isn't forced to re-search either address for
  // the return trip. See initReturnDropoffPreset below, which reads these
  // back out of the URL on a fresh page load.
  function showReturnDropoffPrompt(rideId) {
    var promptBox = document.getElementById("returnDropoffPrompt");
    var link = document.getElementById("bookReturnDropoffLink");
    var bookAnotherLink = document.getElementById("bookAnotherLink");
    if (!promptBox || !link) return;

    var reversedPickup = state.stops.length ? state.stops[state.stops.length - 1] : "";
    var reversedDestination = state.pickup;
    var pickupLatLng = state.dropoffLatLng;
    var dropoffLatLng = state.pickupLatLng;

    var params = new URLSearchParams();
    params.set("preset", "dropoff");
    params.set("pickup", reversedPickup);
    params.set("destination", reversedDestination);
    params.set("linkedRideId", rideId);
    if (pickupLatLng) {
      params.set("pickupLat", typeof pickupLatLng.lat === "function" ? pickupLatLng.lat() : pickupLatLng.lat);
      params.set("pickupLng", typeof pickupLatLng.lng === "function" ? pickupLatLng.lng() : pickupLatLng.lng);
    }
    if (dropoffLatLng) {
      params.set("destinationLat", typeof dropoffLatLng.lat === "function" ? dropoffLatLng.lat() : dropoffLatLng.lat);
      params.set("destinationLng", typeof dropoffLatLng.lng === "function" ? dropoffLatLng.lng() : dropoffLatLng.lng);
    }
    link.href = "book.html?" + params.toString();
    promptBox.hidden = false;
    // "Add my return drop-off" becomes the prominent action here — "Book
    // another ride" (a completely blank booking) steps back to secondary.
    if (bookAnotherLink) {
      bookAnotherLink.classList.remove("btn-primary");
      bookAnotherLink.classList.add("btn-ghost");
    }
  }

  // Reads the query params showReturnDropoffPrompt above builds, on a fresh
  // page load — pre-fills the reversed route and selects the "dropoff"
  // booking-type chip by simulating the same click a rider would make
  // themselves (reuses that handler's existing logic exactly, rather than
  // duplicating what it sets).
  function initReturnDropoffPreset() {
    var params = new URLSearchParams(window.location.search);
    if (params.get("preset") !== "dropoff") return;

    var pickup = params.get("pickup") || "";
    var destination = params.get("destination") || "";
    var pickupLat = parseFloat(params.get("pickupLat"));
    var pickupLng = parseFloat(params.get("pickupLng"));
    var destinationLat = parseFloat(params.get("destinationLat"));
    var destinationLng = parseFloat(params.get("destinationLng"));
    var linkedRideId = params.get("linkedRideId");

    state.pickup = pickup;
    state.stops = [destination];
    if (!isNaN(pickupLat) && !isNaN(pickupLng)) state.pickupLatLng = { lat: pickupLat, lng: pickupLng };
    if (!isNaN(destinationLat) && !isNaN(destinationLng)) state.dropoffLatLng = { lat: destinationLat, lng: destinationLng };
    if (linkedRideId) state.linkedRideId = linkedRideId;

    var pickupInput = document.getElementById("fPickup");
    if (pickupInput) pickupInput.value = pickup;
    var dropoffInput = document.getElementById("fDropoff");
    if (dropoffInput) dropoffInput.value = destination;

    var dropoffChip = document.querySelector('.booking-type-chip[data-type="dropoff"]');
    if (dropoffChip) dropoffChip.click();
  }

  function handlePaymentSuccess(reference) {
    var payError = document.getElementById("payError");
    payError.hidden = true;
    var createdRide = null;

    return api("/api/payments/verify/" + encodeURIComponent(reference))
      .then(function (verifyResult) {
        if (!verifyResult.ok || !verifyResult.data.success) {
          throw new Error(t("booking.paymentFailed"));
        }
        var payload = Object.assign({
          pickupAddress: state.pickup,
          stops: state.stops,
          flightNumber: state.flightNumber || null,
          vehicleType: state.vehicle,
          fareNaira: state.liveQuote.fareNaira,
          distanceKm: state.liveQuote.distanceKm != null ? state.liveQuote.distanceKm : state.distanceKm,
          durationMin: state.liveQuote.durationMin != null ? state.liveQuote.durationMin : state.durationMin,
          securityEscort: state.securityEscort,
          fleetSize: state.fleetSize,
          paymentReference: reference,
          bookingType: state.bookingType,
          durationDays: state.durationDays,
          agreedCancellationPolicy: true,
          agreedDashcamConsent: state.dashcamConsent,
          bookingFor: state.bookingFor,
          passengerName: state.bookingFor === "other" ? state.passengerName : null,
          passengerWhatsapp: state.passengerWhatsapp,
          adults: state.adults,
          children: state.children,
          emergencyContactName: state.emergencyContactName,
          emergencyContactPhone: state.emergencyContactPhone,
          scheduledPickupAt: state.scheduledPickupAt || null,
          linkedRideId: state.linkedRideId || null,
        }, getCoordsPayload());

        return api("/api/rides", {
          method: "POST",
          headers: authHeader(),
          body: JSON.stringify(payload),
        });
      })
      .then(function (rideResult) {
        if (!rideResult.ok) throw new Error(t("booking.paymentFailed"));
        createdRide = rideResult.data.ride;
        var rideId = createdRide.id;
        return api("/api/rides/" + rideId + "/payment", {
          method: "PATCH",
          headers: authHeader(),
          body: JSON.stringify({ paymentStatus: "paid", paymentReference: reference }),
        });
      })
      .then(function (paymentSyncResult) {
        // The ride was already created successfully at this point — this
        // PATCH just re-verifies the Paystack reference and marks it paid
        // server-side. If THIS step fails (Paystack re-verify hiccup,
        // amount mismatch), the rider was actually charged and a ride DOES
        // exist, so don't show a false "not confirmed" error either — just
        // don't claim it's fully confirmed, and point them to support with
        // the reference so nothing gets lost.
        if (!paymentSyncResult.ok) {
          throw new Error(
            "Your payment went through and your ride was created, but we couldn't finish confirming it automatically. " +
            "Please contact support with reference " + reference + " (Ride #" + (createdRide ? createdRide.id : "—") + ")."
          );
        }
        document.getElementById("confirmRef").textContent = reference;
        var barcodeEl = document.getElementById("confirmBarcode");
        var barcodeBox = document.getElementById("confirmBarcodeBox");
        if (barcodeEl && barcodeBox && createdRide && createdRide.barcode) {
          barcodeEl.textContent = createdRide.barcode;
          barcodeBox.hidden = false;
        }
        if (state.bookingType === "one_way" && createdRide) showReturnDropoffPrompt(createdRide.id);
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

    document.querySelectorAll("#paymentMethodToggle .for-who-opt").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (btn.disabled) return;
        state.paymentMethod = btn.getAttribute("data-method");
        document.querySelectorAll("#paymentMethodToggle .for-who-opt").forEach(function (b) { b.classList.toggle("is-active", b === btn); });
        document.getElementById("walletInsufficientNote").hidden = true;
      });
    });

    document.getElementById("payBtn").addEventListener("click", function () {
      var payError = document.getElementById("payError");
      payError.hidden = true;

      if (!document.getElementById("fAgreeCancellation").checked) {
        payError.hidden = false;
        payError.textContent = "Please agree to the Cancellation & Refund Policy before paying.";
        return;
      }

      if (!state.liveQuote) {
        payError.hidden = false;
        payError.textContent = "We couldn't confirm your fare. Please go back to the review step and try again.";
        return;
      }

      if (state.paymentMethod === "wallet" || state.paymentMethod === "membership") {
        handleDirectPayment();
        return;
      }

      // This is the primary revenue path — card payment for a real booking —
      // so it gets the same guard account.html/track.html already have for
      // their card flows: checks PAYSTACK_PUBLIC_KEY is actually defined
      // (not just PaystackPop) and isn't still the "replace_me" placeholder,
      // rather than letting `key: PAYSTACK_PUBLIC_KEY` below throw an
      // uncaught ReferenceError or silently open Paystack with a bad key.
      if (typeof PaystackPop === "undefined" || typeof PAYSTACK_PUBLIC_KEY === "undefined" || PAYSTACK_PUBLIC_KEY.indexOf("replace_me") !== -1) {
        payError.hidden = false;
        payError.textContent = "Payment isn't configured right now. Please try again shortly or contact RideArrivo support.";
        return;
      }
      var handler = PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: state.email,
        amount: state.liveQuote.fareNaira * 100,
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

    safeRun(loadFxRate, "loadFxRate");
    safeRun(initStep1, "initStep1");
    safeRun(initStep2, "initStep2");
    safeRun(initStep3, "initStep3");
    safeRun(initStep4, "initStep4");
    safeRun(initLocationPermission, "initLocationPermission");
    safeRun(initStep5, "initStep5");
    // Must run after initStep2 (it simulates a click on the "dropoff" chip,
    // which only has its listener bound once initStep2 has run).
    safeRun(initReturnDropoffPreset, "initReturnDropoffPreset");
  });

  // Exposed for automated testing only.
  window.__arrivoBookingTestHooks = { state: state, handlePaymentSuccess: handlePaymentSuccess, goToStep: goToStep };
})();
