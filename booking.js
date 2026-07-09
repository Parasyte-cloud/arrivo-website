(function () {
  "use strict";

  // ── Configuration — replace before going live ──────────────────────────
  var API_BASE_URL = "http://localhost:4000"; // same as script.js — point at your deployed backend
  var PAYSTACK_PUBLIC_KEY = "pk_test_replace_me"; // from dashboard.paystack.com/#/settings/developer

  var SUPPORTED_LANGS = ["en", "fr", "zh"];
  var LANG_KEY = "arrivo_site_lang";

  var state = {
    name: "", email: "", phone: "",
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
    localStorage.setItem(LANG_KEY, lang);
  }

  function currentLang() {
    return SUPPORTED_LANGS.indexOf(document.documentElement.lang) !== -1 ? document.documentElement.lang : "en";
  }

  function t(path) {
    return getNested(I18N[currentLang()], path) || path;
  }

  function initLanguage() {
    var saved = localStorage.getItem(LANG_KEY);
    var browserLang = (navigator.language || "en").slice(0, 2);
    var detected = SUPPORTED_LANGS.indexOf(browserLang) !== -1 ? browserLang : "en";
    applyLanguage(saved || detected);
    document.querySelectorAll(".lang-opt").forEach(function (btn) {
      btn.addEventListener("click", function () { applyLanguage(btn.getAttribute("data-lang")); });
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
    var loginPrompt = document.getElementById("loginPrompt");
    var loginError = document.getElementById("loginError");

    function showError(el, msg) {
      el.hidden = false;
      if (msg) el.textContent = msg;
    }
    function hideError(el) { el.hidden = true; }

    document.getElementById("contactContinue").addEventListener("click", function () {
      hideError(contactError);
      loginPrompt.hidden = true;

      state.name = document.getElementById("fName").value.trim();
      state.email = document.getElementById("fEmail").value.trim().toLowerCase();
      state.phone = document.getElementById("fPhone").value.trim();

      if (!state.name || !state.email) {
        showError(contactError, "Please enter your name and email.");
        return;
      }

      api("/api/auth/guest", {
        method: "POST",
        body: JSON.stringify({ name: state.name, email: state.email, phone: state.phone, preferredLanguage: currentLang() }),
      }).then(function (result) {
        if (result.ok) {
          state.token = result.data.token;
          goToStep(2);
        } else if (result.status === 409) {
          loginPrompt.hidden = false;
        } else {
          showError(contactError, result.data.error || "Something went wrong.");
        }
      }).catch(function () {
        showError(contactError, "Couldn't reach the server. Please try again.");
      });
    });

    document.getElementById("loginBtn").addEventListener("click", function () {
      hideError(loginError);
      var password = document.getElementById("fPassword").value;
      api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: state.email, password: password }),
      }).then(function (result) {
        if (result.ok) {
          state.token = result.data.token;
          goToStep(2);
        } else {
          showError(loginError);
        }
      }).catch(function () {
        showError(loginError, "Couldn't reach the server. Please try again.");
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
    });
    document.getElementById("backTo2").addEventListener("click", function () { goToStep(2); });
  }

  // ───────────────────────── Step 4: Pickup ─────────────────────────
  function initStep4() {
    var stopsList = document.getElementById("stopsList");
    var stopCount = 0;

    document.getElementById("addStopBtn").addEventListener("click", function () {
      if (stopCount >= 3) return;
      stopCount++;
      var input = document.createElement("input");
      input.type = "text";
      input.className = "field stop-input";
      input.placeholder = t("booking.stopPlaceholder");
      stopsList.appendChild(input);
    });

    document.getElementById("pickupContinue").addEventListener("click", function () {
      var pickup = document.getElementById("fPickup").value.trim();
      if (!pickup) return;
      state.pickup = pickup;
      state.stops = Array.prototype.slice.call(stopsList.querySelectorAll(".stop-input"))
        .map(function (i) { return i.value.trim(); })
        .filter(Boolean);
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

    document.getElementById("payBtn").addEventListener("click", function () {
      if (typeof PaystackPop === "undefined") {
        document.getElementById("payError").hidden = false;
        document.getElementById("payError").textContent = "Payment isn't configured yet — set PAYSTACK_PUBLIC_KEY in booking.js.";
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
    safeRun(initStep1, "initStep1");
    safeRun(initStep2, "initStep2");
    safeRun(initStep3, "initStep3");
    safeRun(initStep4, "initStep4");
    safeRun(initStep5, "initStep5");
  });

  // Exposed for automated testing only.
  window.__arrivoBookingTestHooks = { state: state, handlePaymentSuccess: handlePaymentSuccess, goToStep: goToStep };
})();
