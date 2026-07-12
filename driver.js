(function () {
  "use strict";

  var API_BASE_URL = "https://arrivo-backend-g1ku.onrender.com";
  var TOKEN_KEY = "arrivo_driver_token";
  var POLL_INTERVAL_MS = 8000;

  var state = { token: null, driver: null, activeRide: null, pollTimer: null };

  // Ride data here (pickup address, rider name, flight number) was typed
  // by the rider, not the driver viewing this screen — it must be escaped
  // before going into innerHTML, or a malicious rider could run script in
  // every driver's browser via something as simple as their own name field.
  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function api(path, options) {
    options = options || {};
    var headers = { "Content-Type": "application/json" };
    if (state.token) headers.Authorization = "Bearer " + state.token;
    return fetch(API_BASE_URL + path, { ...options, headers: { ...headers, ...(options.headers || {}) } })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { ok: res.ok, status: res.status, data: data };
        });
      });
  }

  function showSection(id) {
    document.querySelectorAll("#driverApp section").forEach(function (s) { s.classList.remove("active"); });
    document.getElementById(id).classList.add("active");
  }

  // ───────────────────────── Login ─────────────────────────
  document.getElementById("loginBtn").addEventListener("click", function () {
    var email = document.getElementById("loginEmail").value.trim();
    var password = document.getElementById("loginPassword").value;
    var errEl = document.getElementById("loginError");
    errEl.hidden = true;

    api("/api/auth/login", { method: "POST", body: JSON.stringify({ email: email, password: password }) })
      .then(function (result) {
        if (!result.ok) {
          errEl.hidden = false;
          errEl.textContent = result.data.error || "Login failed.";
          return;
        }
        if (result.data.user.role !== "driver") {
          errEl.hidden = false;
          errEl.textContent = "This account isn't registered as a driver.";
          return;
        }
        state.token = result.data.token;
        localStorage.setItem(TOKEN_KEY, state.token);
        checkProfile();
      })
      .catch(function () {
        errEl.hidden = false;
        errEl.textContent = "Couldn't reach the server. Please try again.";
      });
  });

  // ───────────────────────── Profile check/setup ─────────────────────────
  function checkProfile() {
    api("/api/drivers/me").then(function (result) {
      if (result.ok) {
        state.driver = result.data.driver;
        showSection("dashboardSection");
        initDashboard();
      } else {
        showSection("profileSection");
      }
    });
  }

  document.querySelectorAll("#vehicleTypeChips .chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      document.querySelectorAll("#vehicleTypeChips .chip").forEach(function (c) { c.classList.remove("selected"); });
      chip.classList.add("selected");
    });
  });
  document.querySelectorAll("#langChips .chip").forEach(function (chip) {
    chip.addEventListener("click", function () { chip.classList.toggle("selected"); });
  });

  document.getElementById("saveProfileBtn").addEventListener("click", function () {
    var license = document.getElementById("pLicense").value.trim();
    var lasdri = document.getElementById("pLasdri").value.trim();
    var makeModel = document.getElementById("pMakeModel").value.trim();
    var plate = document.getElementById("pPlate").value.trim();
    var vehicleType = document.querySelector("#vehicleTypeChips .chip.selected").getAttribute("data-type");
    var langs = Array.prototype.slice.call(document.querySelectorAll("#langChips .chip.selected"))
      .map(function (c) { return c.getAttribute("data-lang"); }).join(",");
    var errEl = document.getElementById("profileError");
    errEl.hidden = true;

    if (!license || !makeModel || !plate) {
      errEl.hidden = false;
      errEl.textContent = "License number, vehicle, and plate number are required.";
      return;
    }

    api("/api/drivers/profile", {
      method: "POST",
      body: JSON.stringify({
        licenseNumber: license, lasdriNumber: lasdri, spokenLanguages: langs || "en",
        vehicle: { makeModel: makeModel, plateNumber: plate, vehicleType: vehicleType },
      }),
    }).then(function (result) {
      if (!result.ok) {
        errEl.hidden = false;
        errEl.textContent = result.data.error || "Couldn't save profile.";
        return;
      }
      state.driver = result.data.driver;
      showSection("dashboardSection");
      initDashboard();
    });
  });

  // ───────────────────────── Dashboard ─────────────────────────
  function initDashboard() {
    var isOnline = !!(state.driver && state.driver.is_online);
    setOnlineUI(isOnline);
    checkActiveRide();

    document.getElementById("onlineToggle").onclick = function () {
      var goingOnline = !document.getElementById("onlineToggle").classList.contains("on");
      var errEl = document.getElementById("onlineError");
      errEl.hidden = true;

      api("/api/drivers/status", { method: "PATCH", body: JSON.stringify({ isOnline: goingOnline }) })
        .then(function (result) {
          if (!result.ok) {
            errEl.hidden = false;
            errEl.textContent = result.data.error || "Couldn't update status.";
            return;
          }
          setOnlineUI(result.data.isOnline);
          if (result.data.isOnline) startPolling(); else stopPolling();
        });
    };
  }

  function setOnlineUI(isOnline) {
    var toggle = document.getElementById("onlineToggle");
    toggle.classList.toggle("on", isOnline);
    document.getElementById("onlineLabel").textContent = isOnline ? "You're online" : "You're offline";
    if (isOnline) startPolling(); else stopPolling();
  }

  function startPolling() {
    if (state.pollTimer) return;
    refreshAvailable();
    state.pollTimer = setInterval(refreshAvailable, POLL_INTERVAL_MS);
  }
  function stopPolling() {
    clearInterval(state.pollTimer);
    state.pollTimer = null;
    document.getElementById("availableRidesBox").innerHTML = "";
  }

  function checkActiveRide() {
    api("/api/rides/driver/mine").then(function (result) {
      if (!result.ok) return;
      var active = result.data.rides.find(function (r) { return r.ride_status === "accepted" || r.ride_status === "in_progress"; });
      state.activeRide = active || null;
      renderActiveRide();
      if (active) stopPolling();
    });
  }

  function refreshAvailable() {
    if (state.activeRide) return;
    api("/api/rides/available").then(function (result) {
      if (!result.ok) return;
      var box = document.getElementById("availableRidesBox");
      if (result.data.rides.length === 0) {
        box.innerHTML = '<div class="ride-card" style="text-align:center;color:var(--text-muted);">Searching for ride requests…</div>';
        return;
      }
      box.innerHTML = result.data.rides.map(function (r) {
        return '<div class="ride-card">' +
          '<div style="display:flex;justify-content:space-between;"><strong>' + escapeHtml(r.pickup_address) + '</strong><span class="fare">NGN ' + Number(r.fare_naira).toLocaleString() + '</span></div>' +
          (r.flight_number ? '<div style="font-size:12px;color:var(--text-muted);">Flight ' + escapeHtml(r.flight_number) + '</div>' : '') +
          '<div style="font-size:12px;color:var(--text-muted);">Rider: ' + escapeHtml(r.rider_name) + '</div>' +
          '<button class="btn btn-primary" style="width:100%;margin-top:10px;" onclick="window.__acceptRide(' + Number(r.id) + ')">Accept Ride</button>' +
          '</div>';
      }).join("");
    });
  }

  window.__acceptRide = function (rideId) {
    api("/api/rides/" + rideId + "/accept", { method: "POST" }).then(function (result) {
      if (!result.ok) {
        alert(result.data.error || "This ride was just taken by another driver.");
        refreshAvailable();
        return;
      }
      state.activeRide = result.data.ride;
      stopPolling();
      renderActiveRide();
    });
  };

  function renderActiveRide() {
    var box = document.getElementById("activeRideBox");
    if (!state.activeRide) { box.innerHTML = ""; return; }
    var r = state.activeRide;
    var isAccepted = r.ride_status === "accepted";
    box.innerHTML = '<div class="ride-card">' +
      '<div style="display:flex;justify-content:space-between;"><strong>' + escapeHtml(r.pickup_address) + '</strong><span class="fare">NGN ' + Number(r.fare_naira).toLocaleString() + '</span></div>' +
      '<div style="font-size:12px;color:var(--text-muted);">Rider: ' + escapeHtml(r.rider_name) + (r.rider_phone ? " · " + escapeHtml(r.rider_phone) : "") + '</div>' +
      '<div style="font-size:12px;color:var(--teal);font-weight:700;margin-top:6px;">' + escapeHtml(r.ride_status.replace("_", " ").toUpperCase()) + '</div>' +
      '<button class="btn btn-primary" style="width:100%;margin-top:10px;" id="advanceBtn">' + (isAccepted ? "Start Trip" : "Complete Trip") + '</button>' +
      '</div>';
    document.getElementById("advanceBtn").onclick = function () {
      var nextStatus = isAccepted ? "in_progress" : "completed";
      api("/api/rides/" + r.id + "/status", { method: "PATCH", body: JSON.stringify({ status: nextStatus }) })
        .then(function (result) {
          if (!result.ok) { alert(result.data.error || "Couldn't update trip."); return; }
          if (nextStatus === "completed") {
            state.activeRide = null;
            checkActiveRide();
          } else {
            state.activeRide = result.data.ride;
            renderActiveRide();
          }
        });
    };
  }

  // ───────────────────────── Earnings ─────────────────────────
  document.getElementById("viewEarningsBtn").addEventListener("click", function () {
    api("/api/drivers/earnings").then(function (result) {
      if (!result.ok) return;
      document.getElementById("earnMonth").textContent = "NGN " + Number(result.data.thisMonthNaira).toLocaleString();
      document.getElementById("earnTotal").textContent = "NGN " + Number(result.data.totalNaira).toLocaleString();
      document.getElementById("earnTrips").textContent = result.data.completedTrips;
      showSection("earningsSection");
    });
  });
  document.getElementById("backToDashBtn").addEventListener("click", function () { showSection("dashboardSection"); });

  // ───────────────────────── Logout ─────────────────────────
  document.getElementById("logoutBtn").addEventListener("click", function () {
    localStorage.removeItem(TOKEN_KEY);
    state = { token: null, driver: null, activeRide: null, pollTimer: null };
    showSection("loginSection");
  });

  // ───────────────────────── Init: restore session ─────────────────────────
  // ───────────────────────── Emergency SOS ─────────────────────────
  // Per the Product Requirements Briefing (Panic Button & Safety System):
  //   - One trigger, full response: this fires the alert AND the listening
  //     device together, not as separate manual steps.
  //   - No manual reset: once active, neither party can turn it off from
  //     this device. State persists in localStorage until a real backend/
  //     admin-cleared flag exists. (Dev note: to clear it while testing, run
  //     localStorage.removeItem("arrivo_panic_active") in the console —
  //     there is intentionally no UI path to do this.)
  // /api/panic-alerts and /api/listening-device are best-effort guesses at
  // the endpoint shape — if the admin dashboard's existing Panic Alerts page
  // (built for the mobile app) already has a real one, swap these to match
  // it exactly so web alerts land in the same system.
  function initPanicButton(userType, tokenKey, apiBaseUrl) {
    var btn = document.getElementById("panicBtn");
    if (!btn) return;
    var countdownRow = document.getElementById("panicCountdownRow");
    var countdownText = document.getElementById("panicCountdownText");
    var cancelBtn = document.getElementById("panicCancelBtn");
    var statusText = document.getElementById("panicStatusText");
    var activeBanner = document.getElementById("panicActiveBanner");
    var listeningBtn = document.getElementById("listeningDeviceBtn");
    var ARRIVO_SUPPORT_WHATSAPP = "2348162706078";
    var PANIC_STATE_KEY = "arrivo_panic_active";

    var countdownTimer = null;
    var pendingWindow = null;
    var listeningActive = false;

    function showActiveBanner() {
      if (countdownTimer) clearInterval(countdownTimer);
      btn.hidden = true;
      countdownRow.hidden = true;
      statusText.hidden = true;
      activeBanner.hidden = false;
    }

    if (localStorage.getItem(PANIC_STATE_KEY) === "1") {
      showActiveBanner();
    }

    // Aborts an accidental tap before the alert fires — not a reset of an
    // already-active alert, which deliberately has no control here.
    function cancelCountdown() {
      if (countdownTimer) clearInterval(countdownTimer);
      countdownRow.hidden = true;
      btn.hidden = false;
      if (pendingWindow) { try { pendingWindow.close(); } catch (e) {} }
      pendingWindow = null;
    }

    btn.addEventListener("click", function () {
      pendingWindow = window.open("", "_blank");

      var secondsLeft = 3;
      btn.hidden = true;
      countdownRow.hidden = false;
      countdownText.textContent = "Sending SOS in " + secondsLeft + "...";

      countdownTimer = setInterval(function () {
        secondsLeft--;
        if (secondsLeft <= 0) {
          clearInterval(countdownTimer);
          triggerAlert();
        } else {
          countdownText.textContent = "Sending SOS in " + secondsLeft + "...";
        }
      }, 1000);
    });

    cancelBtn.addEventListener("click", cancelCountdown);

    function triggerAlert() {
      countdownRow.hidden = true;
      statusText.hidden = false;
      statusText.textContent = "Getting your location...";

      function finish(position) {
        var mapsLink = position
          ? "https://maps.google.com/?q=" + position.coords.latitude + "," + position.coords.longitude
          : null;

        localStorage.setItem(PANIC_STATE_KEY, "1");
        activateListeningDevice(true); // bundled: one trigger, full response

        try {
          var token = localStorage.getItem(tokenKey);
          fetch(apiBaseUrl + "/api/panic-alerts", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
            body: JSON.stringify({
              userType: userType,
              rideId: state.activeRide ? state.activeRide.id : null,
              latitude: position ? position.coords.latitude : null,
              longitude: position ? position.coords.longitude : null,
              timestamp: new Date().toISOString(),
            }),
          }).catch(function () {});
        } catch (e) {}

        var message = "SOS. I need help." + (mapsLink ? " My location: " + mapsLink : " Location unavailable.");
        var waUrl = "https://wa.me/" + ARRIVO_SUPPORT_WHATSAPP + "?text=" + encodeURIComponent(message);

        if (pendingWindow) {
          pendingWindow.location.href = waUrl;
        } else {
          window.open(waUrl, "_blank");
        }

        showActiveBanner(); // stays locked — no auto-reset, no manual dismiss
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(finish, function () { finish(null); }, { timeout: 4000 });
      } else {
        finish(null);
      }
    }

    function activateListeningDevice(viaPanic) {
      if (listeningActive) return;
      listeningActive = true;
      if (listeningBtn) {
        listeningBtn.textContent = "🎙️ Listening device: on";
        listeningBtn.classList.add("is-active");
      }
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true }).catch(function () {});
      }
      try {
        fetch(apiBaseUrl + "/api/listening-device", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + localStorage.getItem(tokenKey) },
          body: JSON.stringify({ userType: userType, active: true, viaPanic: !!viaPanic, timestamp: new Date().toISOString() }),
        }).catch(function () {});
      } catch (e) {}
    }
    if (listeningBtn) {
      listeningBtn.addEventListener("click", function () { activateListeningDevice(false); });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    initPanicButton("driver", TOKEN_KEY, API_BASE_URL);

    var saved = localStorage.getItem(TOKEN_KEY);
    if (saved) {
      state.token = saved;
      api("/api/auth/me").then(function (result) {
        if (result.ok && result.data.user.role === "driver") {
          checkProfile();
        } else {
          localStorage.removeItem(TOKEN_KEY);
          showSection("loginSection");
        }
      });
    }
  });
})();
