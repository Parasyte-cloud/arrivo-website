(function () {
  "use strict";

  // ── Configuration — replace before going live ──────────────────────────
  var API_BASE_URL = "https://arrivo-backend-g1ku.onrender.com"; // same as script.js — point at your deployed backend
  var PAYSTACK_PUBLIC_KEY = "pk_test_replace_me"; // from dashboard.paystack.com/#/settings/developer

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
    bags: 1, bulky: false,
    bookingType: "one_way", durationDays: 1, multiplier: 1,
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
      state.flightNumber = document.getElementById("fFlight").value.trim().toUpperCase();
      goToStep(3);
      setupPlacesForStep4(); // Pickup is now step 3 — the map container only has real dimensions once this step is visible. Function name predates the reorder.
    });
    document.getElementById("backTo1").addEventListener("click", function () { goToStep(1); });
  }

  // ───────────────────────── Step 3: Luggage & Vehicle ─────────────────────────
  function recommendVehicle(bags, bulky, passengers) {
    if (bulky || bags >= 5 || passengers >= 5) return "truck";
    if (bags >= 3 || passengers >= 4) return "suv";
    return "sedan";
  }

  function initStep3() {
    var bagsInput = document.getElementById("fBags");
    var bulkyInput = document.getElementById("fBulky");
    var adultsInput = document.getElementById("fAdults");
    var childrenInput = document.getElementById("fChildren");
    var passengersError = document.getElementById("passengersError");
    var vehicleCards = Array.prototype.slice.call(document.querySelectorAll(".vehicle-card"));
    var bookingChips = Array.prototype.slice.call(document.querySelectorAll(".booking-type-chip"));

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
      var passengers = (Number(adultsInput.value) || 0) + (Number(childrenInput.value) || 0);
      var recommended = recommendVehicle(bags, bulky, passengers);

      vehicleCards.forEach(function (card) {
        var isRecommended = card.getAttribute("data-vehicle") === recommended;
        card.classList.toggle("recommended", isRecommended);

        var maxPassengers = Number(card.getAttribute("data-max-passengers"));
        var overCapacity = passengers > maxPassengers;
        card.classList.toggle("over-capacity", overCapacity);

        if (!state.vehicleManuallyPicked && isRecommended && !overCapacity) selectVehicle(card, false);
      });

      // If the passenger count grew past what the manually-picked vehicle
      // can actually hold, don't leave an invalid selection standing —
      // fall back to whatever the auto-recommendation says fits instead.
      if (state.vehicleManuallyPicked) {
        var currentCard = vehicleCards.filter(function (c) { return c.getAttribute("data-vehicle") === state.vehicle; })[0];
        var currentMax = currentCard ? Number(currentCard.getAttribute("data-max-passengers")) : Infinity;
        if (passengers > currentMax) {
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

    bagsInput.addEventListener("input", updateRecommendation);
    bulkyInput.addEventListener("change", updateRecommendation);
    adultsInput.addEventListener("input", updateRecommendation);
    childrenInput.addEventListener("input", updateRecommendation);
    vehicleCards.forEach(function (card) {
      card.addEventListener("click", function () {
        var capacityError = document.getElementById("vehicleCapacityError");
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
      var selectedCard = vehicleCards.filter(function (c) { return c.getAttribute("data-vehicle") === state.vehicle; })[0];
      var maxPassengers = selectedCard ? Number(selectedCard.getAttribute("data-max-passengers")) : Infinity;
      if (adults + children > maxPassengers) {
        document.getElementById("vehicleCapacityError").hidden = false;
        return;
      }
      state.adults = adults;
      state.children = children;
      state.bags = Number(bagsInput.value) || 0;
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
  // Hard capacity caps, not just a recommendation — a sedan genuinely
  // can't safely carry more than a few passengers, and the point of this
  // is to actually push larger groups toward a bigger vehicle or fleet
  // accompaniment rather than let them cram into whatever they clicked.
  var MAX_PASSENGERS = { sedan: 3, suv: 6, truck: 6 };
  // Fleet accompaniment add-on, per vehicle type.
  var FLEET_PRICE = {
    sedan: { 2: 70000, 3: 100000 },
    suv: { 2: 70000, 3: 100000 },
    truck: { 2: 70000, 3: 100000 },
  };
  var SECURITY_ESCORT_PRICE = 100000;

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
  // every vehicle type across 20+ areas.
  var VEHICLE_TIER_DELTA = { sedan: 0, suv: 15000, truck: 30000 }; // "truck" is the internal id for Executive Vehicle — kept stable to avoid renaming every reference; only the *label* shown to riders changed

  // Situational charges — applied automatically where they can be
  // determined from what the rider has already entered, rather than
  // requiring a separate manual toggle for each one.
  var EXCESS_LUGGAGE_FEE = 5000;   // more than 3 large suitcases
  var MULTI_STOP_FEE = 7500;       // per additional stop beyond the first drop-off (midpoint of ₦5,000–₦10,000)
  var MIDNIGHT_PICKUP_FEE = 7500;  // pickups between 11 PM and 5 AM (midpoint of ₦5,000–₦10,000)

  function isMidnightPickup() {
    var hour = new Date().getHours();
    return hour >= 23 || hour < 5;
  }

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

  function calculateSituationalCharges(state) {
    var total = 0;
    var items = [];
    if ((state.bags || 0) > 3) {
      total += EXCESS_LUGGAGE_FEE;
      items.push({ label: "Excess luggage (4+ suitcases)", amount: EXCESS_LUGGAGE_FEE });
    }
    var extraStops = Math.max(0, (state.stops ? state.stops.length : 1) - 1);
    if (extraStops > 0) {
      var stopsFee = extraStops * MULTI_STOP_FEE;
      total += stopsFee;
      items.push({ label: extraStops + " additional stop" + (extraStops === 1 ? "" : "s"), amount: stopsFee });
    }
    if (isMidnightPickup()) {
      total += MIDNIGHT_PICKUP_FEE;
      items.push({ label: "Midnight pickup (11 PM – 5 AM)", amount: MIDNIGHT_PICKUP_FEE });
    }
    return { total: total, items: items };
  }

  function updatePriceLabels() {
    document.querySelectorAll(".vehicle-card").forEach(function (card) {
      var vehicle = card.getAttribute("data-vehicle");
      var price;
      if (state.bookingType === "one_way" && state.zone) {
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

  // ───────────────────────── Lightweight currency estimate ─────────────────────────
  // Payments themselves stay in Naira — Paystack/wallet only ever charge
  // NGN here. This is display-only: for a rider who isn't currently in
  // Nigeria, show an approximate USD figure next to the fare so the price
  // means something to them, using a fixed rate rather than a live FX
  // API. A prior review of adding real USD payment processing (Stripe)
  // found it blocked by foreign-entity requirements for a Nigerian
  // business — the recommendation then was to keep pricing in Naira and
  // let the card network handle conversion, which this still does; this
  // just adds a clearer estimate on screen, not a new payment path.
  var USD_NGN_RATE = 1600; // update periodically — not a live rate
  var NIGERIA_BOUNDS = { minLat: 4.0, maxLat: 14.0, minLng: 2.5, maxLng: 15.0 };

  function isLikelyOutsideNigeria() {
    if (!state.userLocation) return false;
    var lat = state.userLocation.lat, lng = state.userLocation.lng;
    return lat < NIGERIA_BOUNDS.minLat || lat > NIGERIA_BOUNDS.maxLat || lng < NIGERIA_BOUNDS.minLng || lng > NIGERIA_BOUNDS.maxLng;
  }

  function formatNairaWithUsdEstimate(nairaAmount) {
    if (!isLikelyOutsideNigeria()) return "NGN " + nairaAmount.toLocaleString();
    var usd = Math.round(nairaAmount / USD_NGN_RATE);
    return "NGN " + nairaAmount.toLocaleString() + " (~$" + usd.toLocaleString() + ")";
  }

  function recalculateFareEstimate() {
    var box = document.getElementById("fareEstimateBox");
    var errEl = document.getElementById("fareError");
    if (!box) return;

    if (state.bookingType !== "one_way") {
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

    var situational = calculateSituationalCharges(state);
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
  // One shared source of truth for the final fare, used both in the review
  // display and the actual submission payload — this was previously
  // computed inline in three separate places, and never accounted for
  // distance, security escort, or fleet accompaniment at all.
  function getFinalFare() {
    var baseFare;
    if (state.bookingType === "one_way" && state.zone) {
      baseFare = zoneVehiclePrice(state.vehicle, state.zone);
    } else {
      baseFare = state.vehicleBasePrice * state.multiplier;
    }
    var fleetTable = FLEET_PRICE[state.vehicle] || FLEET_PRICE.sedan;
    var situational = calculateSituationalCharges(state);
    var total = baseFare + situational.total;
    if (state.securityEscort) total += SECURITY_ESCORT_PRICE;
    if (state.fleetSize) total += fleetTable[state.fleetSize] || 0;
    return { baseFare: baseFare, situational: situational, total: total };
  }

  function renderReview() {
    var list = document.getElementById("reviewList");
    var vehicleLabel = t("booking.vehicle" + state.vehicle.charAt(0).toUpperCase() + state.vehicle.slice(1));
    var bookingLabel = t("booking.type" + toPascalCase(state.bookingType));
    var fare = getFinalFare();
    var totalFare = fare.total;

    var rows = [
      [t("booking.reviewContact"), escapeHtml(state.name) + " · " + escapeHtml(state.email)],
    ];
    if (state.bookingFor === "other" && state.passengerName) {
      rows.push([t("booking.reviewPassenger"), escapeHtml(state.passengerName) + " · " + escapeHtml(state.passengerWhatsapp)]);
    }
    rows.push([t("booking.reviewEmergencyContact"), escapeHtml(state.emergencyContactName)]);
    rows.push(
      [t("booking.reviewBookingType"), escapeHtml(bookingLabel)],
      [t("booking.reviewPassengers"), state.adults + " adult" + (state.adults === 1 ? "" : "s") + (state.children > 0 ? ", " + state.children + " child" + (state.children === 1 ? "" : "ren") : "")],
      [t("booking.reviewFlight"), escapeHtml(state.flightNumber) || "N/A"],
      [t("booking.reviewVehicle"), escapeHtml(vehicleLabel) + " · NGN " + fare.baseFare.toLocaleString()],
      [t("booking.reviewPickup"), escapeHtml([state.pickup].concat(state.stops).join(" → "))]
    );
    if (state.securityEscort) rows.push(["Security escort", "+NGN " + SECURITY_ESCORT_PRICE.toLocaleString()]);
    if (state.fleetSize) {
      var reviewFleetTable = FLEET_PRICE[state.vehicle] || FLEET_PRICE.sedan;
      rows.push(["Fleet accompaniment", "Fleet of " + state.fleetSize + " · +NGN " + (reviewFleetTable[state.fleetSize] || 0).toLocaleString()]);
    }
    fare.situational.items.forEach(function (item) {
      rows.push([item.label, "+NGN " + item.amount.toLocaleString()]);
    });
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

  function toPascalCase(snake) {
    return snake.split("_").map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join("");
  }

  // Exposed separately so it can be tested independently of the real
  // Paystack popup (which needs a real key + real browser + a real card).
  function handleDirectPayment() {
    var payError = document.getElementById("payError");
    payError.hidden = true;

    return api("/api/rides", {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify({
        pickupAddress: state.pickup,
        stops: state.stops,
        flightNumber: state.flightNumber || null,
        vehicleType: state.vehicle,
        fareNaira: getFinalFare().total,
        distanceKm: state.distanceKm,
        durationMin: state.durationMin,
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
      }),
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
      goToStep(6);
    }).catch(function () {
      payError.hidden = false;
      payError.textContent = t("booking.paymentFailed");
    });
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
        return api("/api/rides", {
          method: "POST",
          headers: authHeader(),
          body: JSON.stringify({
            pickupAddress: state.pickup,
            stops: state.stops,
            flightNumber: state.flightNumber || null,
            vehicleType: state.vehicle,
            fareNaira: getFinalFare().total,
            distanceKm: state.distanceKm,
            durationMin: state.durationMin,
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
          }),
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
      .then(function () {
        document.getElementById("confirmRef").textContent = reference;
        var barcodeEl = document.getElementById("confirmBarcode");
        var barcodeBox = document.getElementById("confirmBarcodeBox");
        if (barcodeEl && barcodeBox && createdRide && createdRide.barcode) {
          barcodeEl.textContent = createdRide.barcode;
          barcodeBox.hidden = false;
        }
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

      if (state.paymentMethod === "wallet" || state.paymentMethod === "membership") {
        handleDirectPayment();
        return;
      }

      if (typeof PaystackPop === "undefined") {
        payError.hidden = false;
        payError.textContent = "Payment isn't configured yet. Set PAYSTACK_PUBLIC_KEY in booking.js.";
        return;
      }
      var handler = PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: state.email,
        amount: getFinalFare().total * 100,
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
    safeRun(initLocationPermission, "initLocationPermission");
    safeRun(initStep5, "initStep5");
  });

  // Exposed for automated testing only.
  window.__arrivoBookingTestHooks = { state: state, handlePaymentSuccess: handlePaymentSuccess, goToStep: goToStep };
})();
