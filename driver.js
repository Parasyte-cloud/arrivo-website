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
        if (state.driver.is_verified) {
          showSection("dashboardSection");
          initDashboard();
        } else {
          showSection("pendingApprovalSection");
          startPendingPoll();
        }
      } else {
        showSection("profileSection");
      }
    });
  }

  // Once an application is fully submitted, there's nothing left for the
  // driver to do but wait — so this checks in the background and moves them
  // straight to the dashboard the moment an admin verifies them, without
  // needing to manually refresh or re-log-in.
  var pendingPollTimer = null;
  function startPendingPoll() {
    if (pendingPollTimer) return;
    pendingPollTimer = setInterval(function () {
      api("/api/drivers/me").then(function (result) {
        if (result.ok && result.data.driver.is_verified) {
          clearInterval(pendingPollTimer);
          pendingPollTimer = null;
          state.driver = result.data.driver;
          showSection("dashboardSection");
          initDashboard();
        }
      });
    }, 15000);
  }

  // ───────────────────────── Sign up: Step 1 (Account) ─────────────────────────
  var signupPhoneField = arrivoBuildPhoneInput(document.getElementById("signupPhoneContainer"), { placeholder: "WhatsApp number" });
  var ownerPhoneField = arrivoBuildPhoneInput(document.getElementById("ownerPhoneContainer"), { placeholder: "Owner's WhatsApp number" });
  var driverEmergencyPhoneField = arrivoBuildPhoneInput(document.getElementById("driverEmergencyPhoneContainer"), { placeholder: "Emergency contact number" });

  document.getElementById("goToSignupLink").addEventListener("click", function (e) {
    e.preventDefault();
    showSection("signupAccountSection");
  });
  document.getElementById("backToLoginLink").addEventListener("click", function (e) {
    e.preventDefault();
    showSection("loginSection");
  });

  document.getElementById("signupAccountContinue").addEventListener("click", function () {
    var name = document.getElementById("sName").value.trim();
    var email = document.getElementById("sEmail").value.trim();
    var dob = document.getElementById("sDob").value;
    var password = document.getElementById("sPassword").value;
    var passwordConfirm = document.getElementById("sPasswordConfirm").value;
    var errEl = document.getElementById("signupAccountError");
    errEl.hidden = true;

    var phoneResult = signupPhoneField.getValue();

    if (!name || !email) {
      errEl.hidden = false; errEl.textContent = "Please enter your name and email."; return;
    }
    if (!dob) {
      errEl.hidden = false; errEl.textContent = "Please enter your date of birth."; return;
    }
    var age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 21) {
      errEl.hidden = false; errEl.textContent = "Drivers must be at least 21 years old."; return;
    }
    if (!phoneResult.valid) {
      errEl.hidden = false; errEl.textContent = phoneResult.message; return;
    }
    if (!password || password.length < 8) {
      errEl.hidden = false; errEl.textContent = "Password must be at least 8 characters."; return;
    }
    if (password !== passwordConfirm) {
      errEl.hidden = false; errEl.textContent = "Passwords don't match."; return;
    }

    api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: name, email: email, password: password, role: "driver",
        whatsappNumber: phoneResult.full, dateOfBirth: dob,
      }),
    }).then(function (result) {
      if (!result.ok) {
        errEl.hidden = false;
        errEl.textContent = result.data.error || "Couldn't create your account.";
        return;
      }
      state.token = result.data.token;
      localStorage.setItem(TOKEN_KEY, state.token);
      document.getElementById("profileStepProgress").hidden = false;
      showSection("profileSection");
    }).catch(function () {
      errEl.hidden = false;
      errEl.textContent = "Couldn't reach the server. Please try again.";
    });
  });

  // ───────────────────────── Sign up: Step 2 (Vehicle & license) ─────────────────────────
  document.querySelectorAll("#vehicleTypeChips .chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      document.querySelectorAll("#vehicleTypeChips .chip").forEach(function (c) { c.classList.remove("selected"); });
      chip.classList.add("selected");
    });
  });
  document.querySelectorAll("#langChips .chip").forEach(function (chip) {
    chip.addEventListener("click", function () { chip.classList.toggle("selected"); });
  });

  var vehicleOwnership = "self";
  var ownershipToggle = document.getElementById("ownershipToggle");
  var ownerFields = document.getElementById("ownerFields");
  ownershipToggle.querySelectorAll(".for-who-opt").forEach(function (btn) {
    btn.addEventListener("click", function () {
      vehicleOwnership = btn.getAttribute("data-owner");
      ownershipToggle.querySelectorAll(".for-who-opt").forEach(function (b) { b.classList.toggle("is-active", b === btn); });
      ownerFields.hidden = vehicleOwnership !== "other";
    });
  });

  document.getElementById("saveProfileBtn").addEventListener("click", function () {
    var license = document.getElementById("pLicense").value.trim();
    var lasdri = document.getElementById("pLasdri").value.trim();
    var insurance = document.getElementById("pInsurance").value.trim();
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

    var ownerName = "", ownerPhone = "";
    if (vehicleOwnership === "other") {
      ownerName = document.getElementById("pOwnerName").value.trim();
      var ownerPhoneResult = ownerPhoneField.getValue();
      if (!ownerName || !ownerPhoneResult.valid) {
        errEl.hidden = false;
        errEl.textContent = "Please enter the vehicle owner's name and a valid WhatsApp number.";
        return;
      }
      ownerPhone = ownerPhoneResult.full;
    }

    api("/api/drivers/profile", {
      method: "POST",
      body: JSON.stringify({
        licenseNumber: license, lasdriNumber: lasdri, insuranceNumber: insurance, spokenLanguages: langs || "en",
        vehicle: { makeModel: makeModel, plateNumber: plate, vehicleType: vehicleType },
        vehicleOwnership: vehicleOwnership, ownerName: ownerName, ownerWhatsapp: ownerPhone,
      }),
    }).then(function (result) {
      if (!result.ok) {
        errEl.hidden = false;
        errEl.textContent = result.data.error || "Couldn't save your vehicle details.";
        return;
      }
      state.driver = result.data.driver;
      if (document.getElementById("profileStepProgress").hidden) {
        // Reached this screen directly (mobile-app account, incomplete
        // profile) rather than through the new web signup wizard — skip
        // straight to checking overall status instead of forcing them
        // through the web-only Photos/Safety steps too.
        checkProfile();
      } else {
        showSection("signupPhotosSection");
      }
    });
  });

  // ───────────────────────── Sign up: Step 3 (Photos & documents) ─────────────────────────
  var docPhotos = { profile: null, license: null, vehicle: null };

  function wireDocUpload(uploadId, inputId, thumbId, statusId, key, requiredLabel) {
    var upload = document.getElementById(uploadId);
    var input = document.getElementById(inputId);
    upload.addEventListener("click", function () { input.click(); });
    input.addEventListener("change", function (e) {
      var file = e.target.files[0];
      var errEl = document.getElementById("photosError");
      errEl.hidden = true;
      if (!file) return;
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        errEl.hidden = false; errEl.textContent = "Please choose a PNG, JPEG, or WEBP image."; return;
      }
      if (file.size > 6 * 1024 * 1024) {
        errEl.hidden = false; errEl.textContent = "Please choose an image smaller than 6MB."; return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        docPhotos[key] = reader.result;
        var thumb = document.getElementById(thumbId);
        thumb.innerHTML = "";
        var img = document.createElement("img");
        img.src = reader.result;
        thumb.appendChild(img);
        document.getElementById(statusId).textContent = "Selected: " + file.name;
        upload.classList.add("has-file");
      };
      reader.readAsDataURL(file);
    });
  }
  wireDocUpload("profilePhotoUpload", "fProfilePhoto", "profilePhotoThumb", "profilePhotoStatus", "profile");
  wireDocUpload("licensePhotoUpload", "fLicensePhoto", "licensePhotoThumb", "licensePhotoStatus", "license");
  wireDocUpload("vehiclePhotoUpload", "fVehiclePhoto", "vehiclePhotoThumb", "vehiclePhotoStatus", "vehicle");

  document.getElementById("photosContinue").addEventListener("click", function () {
    var errEl = document.getElementById("photosError");
    errEl.hidden = true;
    if (!docPhotos.profile || !docPhotos.license) {
      errEl.hidden = false;
      errEl.textContent = "Your profile photo and driver's license photo are both required.";
      return;
    }
    api("/api/drivers/me", {
      method: "PATCH",
      body: JSON.stringify({
        profilePhotoDataUrl: docPhotos.profile,
        licensePhotoDataUrl: docPhotos.license,
        vehiclePhotoDataUrl: docPhotos.vehicle,
      }),
    }).then(function (result) {
      if (!result.ok) {
        errEl.hidden = false;
        errEl.textContent = result.data.error || "Couldn't upload your photos. Please try again.";
        return;
      }
      showSection("signupSafetySection");
    });
  });

  // ───────────────────────── Sign up: Step 4 (Safety & consent) ─────────────────────────
  document.getElementById("submitApplicationBtn").addEventListener("click", function () {
    var emergencyName = document.getElementById("sEmergencyName").value.trim();
    var emergencyPhoneResult = driverEmergencyPhoneField.getValue();
    var backgroundConsent = document.getElementById("sBackgroundCheckConsent").checked;
    var termsConsent = document.getElementById("sTermsConsent").checked;
    var errEl = document.getElementById("safetyError");
    errEl.hidden = true;

    if (!emergencyName || !emergencyPhoneResult.valid) {
      errEl.hidden = false; errEl.textContent = "Please enter an emergency contact name and a valid number."; return;
    }
    if (!backgroundConsent || !termsConsent) {
      errEl.hidden = false; errEl.textContent = "Please agree to both checkboxes to submit your application."; return;
    }

    api("/api/drivers/me", {
      method: "PATCH",
      body: JSON.stringify({
        emergencyContactName: emergencyName,
        emergencyContactPhone: emergencyPhoneResult.full,
        agreedBackgroundCheck: true,
        agreedTerms: true,
      }),
    }).then(function (result) {
      if (!result.ok) {
        errEl.hidden = false;
        errEl.textContent = result.data.error || "Couldn't submit your application. Please try again.";
        return;
      }
      showSection("pendingApprovalSection");
      startPendingPoll();
    });
  });

  document.getElementById("pendingLogoutBtn").addEventListener("click", function () {
    if (pendingPollTimer) { clearInterval(pendingPollTimer); pendingPollTimer = null; }
    localStorage.removeItem(TOKEN_KEY);
    state.token = null;
    showSection("loginSection");
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

  // ───────────────────────── My Profile ─────────────────────────
  var driverProfilePhoneField = arrivoBuildPhoneInput(document.getElementById("driverProfilePhoneContainer"), { placeholder: "WhatsApp number" });

  document.getElementById("viewProfileBtn").addEventListener("click", function () {
    renderProfileView();
    showSection("profileViewSection");
  });
  document.getElementById("backToDashFromProfileBtn").addEventListener("click", function () { showSection("dashboardSection"); });

  function renderProfileView() {
    var d = state.driver || {};
    document.getElementById("driverProfileName").textContent = d.name || "";
    document.getElementById("driverProfileEmail").textContent = d.email || "";
    document.getElementById("driverAvatarInitial").textContent = (d.name || "?").charAt(0).toUpperCase();

    var circle = document.getElementById("driverAvatarCircle");
    if (d.profile_photo_url) {
      circle.innerHTML = '<div class="avatar-edit-badge">✎</div>';
      var img = document.createElement("img");
      img.src = d.profile_photo_url; // property assignment, not string-built HTML — can't break out of an attribute this way
      circle.prepend(img);
    }

    if (d.whatsapp_number) {
      var stored = d.whatsapp_number;
      var match = ARRIVO_COUNTRY_CODES
        .slice().sort(function (a, b) { return b.dial.length - a.dial.length; })
        .find(function (c) { return stored.indexOf(c.dial) === 0; });
      if (match) driverProfilePhoneField.setRaw(match.dial, stored.slice(match.dial.length));
    }

    var vehicleEl = document.getElementById("driverVehicleSummary");
    if (d.make_model) {
      vehicleEl.innerHTML =
        escapeHtml(d.make_model) + " · " + escapeHtml(d.plate_number || "") + "<br>" +
        escapeHtml((d.vehicle_type || "").toUpperCase()) +
        (d.license_number ? " · License " + escapeHtml(d.license_number) : "") +
        (d.lasdri_number ? "<br>LASDRI " + escapeHtml(d.lasdri_number) : "") +
        (d.insurance_number ? "<br>Insurance " + escapeHtml(d.insurance_number) : "");
    } else {
      vehicleEl.textContent = "No vehicle details on file yet.";
    }

    var statusEl = document.getElementById("driverVerificationStatus");
    if (d.is_verified) {
      statusEl.innerHTML = '<span style="color:var(--teal);font-weight:700;">✓ Verified.</span> You can go online and accept rides.';
    } else {
      statusEl.innerHTML = '<span style="color:var(--coral);font-weight:700;">Pending review.</span> Our team is still checking your documents.';
    }
  }

  document.getElementById("driverAvatarCircle").addEventListener("click", function () {
    document.getElementById("fDriverAvatarInput").click();
  });
  document.getElementById("fDriverAvatarInput").addEventListener("change", function (e) {
    var file = e.target.files[0];
    var errEl = document.getElementById("driverAvatarError");
    errEl.hidden = true;
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      errEl.hidden = false; errEl.textContent = "Please choose a PNG, JPEG, or WEBP image."; return;
    }
    if (file.size > 4 * 1024 * 1024) {
      errEl.hidden = false; errEl.textContent = "Please choose an image smaller than 4MB."; return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var circle = document.getElementById("driverAvatarCircle");
      circle.innerHTML = '<div class="avatar-edit-badge">✎</div>';
      var img = document.createElement("img");
      img.src = reader.result;
      circle.prepend(img);
      api("/api/drivers/me", { method: "PATCH", body: JSON.stringify({ profilePhotoDataUrl: reader.result }) })
        .then(function (result) {
          if (result.ok) state.driver = result.data.driver;
          else { errEl.hidden = false; errEl.textContent = result.data.error || "Couldn't save that photo."; }
        });
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("saveDriverContactBtn").addEventListener("click", function () {
    var phoneResult = driverProfilePhoneField.getValue();
    if (!phoneResult.valid) return;
    api("/api/drivers/me", { method: "PATCH", body: JSON.stringify({ whatsappNumber: phoneResult.full }) })
      .then(function (result) {
        if (!result.ok) return;
        state.driver = result.data.driver;
        var note = document.getElementById("driverContactSaveNote");
        note.hidden = false;
        setTimeout(function () { note.hidden = true; }, 2000);
      });
  });

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

        // The real admin Panic Alerts page (confirmed from arrivo-admin's
        // source) reads panics as a property OF a ride — panic_triggered_at
        // and panic_notes live on the ride record itself, surfaced via
        // GET /api/admin/panics and cleared via PATCH /api/admin/panics/:rideId/resolve.
        // There's no standalone panic-alert entity, so this can only attach
        // to an actual in-progress ride. If there isn't one, this call is
        // skipped entirely — but the WhatsApp/GPS fallback below still fires
        // regardless, since that doesn't depend on a ride existing.
        if (state.activeRide) {
          try {
            var token = localStorage.getItem(tokenKey);
            fetch(apiBaseUrl + "/api/rides/" + state.activeRide.id + "/panic", {
              method: "PATCH",
              headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
              body: JSON.stringify({
                currentLat: position ? position.coords.latitude : null,
                currentLng: position ? position.coords.longitude : null,
              }),
            }).catch(function () {});
          } catch (e) {}
        }

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
