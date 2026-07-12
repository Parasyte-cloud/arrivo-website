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
  document.addEventListener("DOMContentLoaded", function () {
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
