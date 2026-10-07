// Header behaviour for the sign-in pages: Services menu, phone menu and the
// account link. (The theme switch itself lives in theme.js.)
(function () {
  "use strict";

  function initServices() {
    if (document.body.getAttribute("data-nav-wired") === "services") return; // booking.js already wires it
    var dd = document.getElementById("servicesDropdown");
    var trigger = document.getElementById("servicesTrigger");
    var menu = document.getElementById("servicesMenu");
    if (!dd || !trigger || !menu) return;
    function close() {
      dd.classList.remove("open");
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    }
    trigger.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = dd.classList.toggle("open");
      menu.hidden = !open;
      trigger.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", function (e) { if (!dd.contains(e.target)) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }

  function initMobile() {
    var toggle = document.getElementById("mobileNavToggle");
    var menu = document.getElementById("mobileNavMenu");
    var backdrop = document.getElementById("mobileNavBackdrop");
    if (!toggle || !menu) return;
    function set(open) {
      menu.hidden = !open;
      if (backdrop) backdrop.hidden = !open;
      toggle.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    }
    toggle.addEventListener("click", function () { set(menu.hidden); });
    if (backdrop) backdrop.addEventListener("click", function () { set(false); });
    menu.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { set(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) { set(false); toggle.focus(); } });
  }

  function initAccount() {
    var signedIn = false;
    try { signedIn = !!localStorage.getItem("arrivo_rider_token"); } catch (e) {}
    var dest = signedIn ? "account.html" : "login.html";
    var label = signedIn ? "My Account" : "Register or Login";
    [["accountNavLink", "accountNavLabel"], ["accountNavLinkMobile", "accountNavLabelMobile"]].forEach(function (ids) {
      var a = document.getElementById(ids[0]);
      var t = document.getElementById(ids[1]);
      if (a) a.setAttribute("href", dest);
      if (t) t.textContent = label;
    });
  }

  function run() {
    [initServices, initMobile, initAccount].forEach(function (fn) {
      try { fn(); } catch (err) { console.error("[auth header]", err); }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();
