(function () {
  "use strict";

  var header = document.querySelector(".site-header[data-arrivo-island]");
  if (!header) return;
  var context = header.querySelector("[data-island-context]");
  var mainNav = header.querySelector(".main-nav");
  var choose = document.getElementById("choose");
  var dock = document.querySelector("[data-mobile-dock]");
  var dockItems = dock ? Array.prototype.slice.call(dock.querySelectorAll("[data-dock-item]")) : [];
  var islandToggle = document.getElementById("mobileIslandToggle");
  var islandActions = document.getElementById("mobileIslandActions");
  var islandActionItems = islandActions ? Array.prototype.slice.call(islandActions.querySelectorAll("[data-mobile-island-action]")) : [];
  var islandAccount = document.getElementById("mobileIslandAccountLink");
  var mobileQuery = window.matchMedia ? window.matchMedia("(max-width: 767px)") : null;
  var lastScrollY = Math.max(0, window.scrollY || window.pageYOffset || 0);
  var dockIdleTimer = 0;
  var raf = 0;
  var lastY = -1;

  function reduceMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function setMobileExpanded(open) {
    open = !!open && (!mobileQuery || mobileQuery.matches);
    header.classList.toggle("is-mobile-expanded", open);
    if (islandToggle) islandToggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (islandActions) islandActions.hidden = !open;
  }

  function setMobileIslandActive(name) {
    islandActionItems.forEach(function (item) {
      var active = item.getAttribute("data-mobile-island-action") === name;
      item.classList.toggle("is-active", active);
    });
  }

  function updateScrollState() {
    raf = 0;
    var y = Math.max(0, window.scrollY || window.pageYOffset || 0);
    if (Math.abs(y - lastY) < 2) return;
    var movingDown = y > lastScrollY;
    lastScrollY = y;
    lastY = y;
    header.classList.toggle("is-condensed", y > 36);
    if (mobileQuery && mobileQuery.matches && header.classList.contains("is-mobile-expanded") && movingDown && y > 24) {
      setMobileExpanded(false);
    }
    if (dock) {
      dock.classList.toggle("is-scrolled", y > 80);
      if (movingDown && y > 220) dock.classList.add("is-travelling");
      else dock.classList.remove("is-travelling");
      if (dockIdleTimer) window.clearTimeout(dockIdleTimer);
      dockIdleTimer = window.setTimeout(function () {
        dock.classList.remove("is-travelling");
      }, reduceMotion() ? 0 : 420);
    }
  }

  function scheduleScrollUpdate() {
    if (!raf) raf = window.requestAnimationFrame(updateScrollState);
  }

  function labelFor(intent) {
    if (intent === "move") return "Move · choose a service";
    if (intent === "charter") return "Charter · choose a service";
    return "Ride · choose a service";
  }

  function setIntent(intent) {
    header.dataset.islandState = "selector";
    if (context) context.textContent = labelFor(intent);
    if (mainNav) {
      mainNav.querySelectorAll("[data-intent-open]").forEach(function (link) {
        link.classList.toggle("is-active", link.getAttribute("data-intent-open") === intent);
      });
    }
  }

  function clearIntent() {
    header.dataset.islandState = "default";
    if (context) context.textContent = "";
    if (mainNav) mainNav.querySelectorAll(".is-active").forEach(function (link) { link.classList.remove("is-active"); });
  }

  document.addEventListener("arrivo:intent", function (event) {
    setIntent(event.detail && event.detail.intent ? event.detail.intent : "ride");
    setDockActive("services");
  });

  function setDockActive(name) {
    if (islandAccount) {
    try { islandAccount.href = localStorage.getItem("arrivo_rider_token") ? "account.html" : "login.html"; } catch (e) {}
  }

  if (islandToggle) {
    islandToggle.addEventListener("click", function () {
      setMobileExpanded(!header.classList.contains("is-mobile-expanded"));
    });
  }

  islandActionItems.forEach(function (item) {
    item.addEventListener("click", function () {
      var name = item.getAttribute("data-mobile-island-action");
      setMobileIslandActive(name);
      if (name !== "menu") setMobileExpanded(false);
    });
  });

  document.addEventListener("click", function (event) {
    if (!header.classList.contains("is-mobile-expanded")) return;
    if (header.contains(event.target)) return;
    setMobileExpanded(false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && header.classList.contains("is-mobile-expanded")) {
      setMobileExpanded(false);
      if (islandToggle) islandToggle.focus();
    }
  });

  if (mobileQuery) {
    var handleMobileQuery = function (event) { if (!event.matches) setMobileExpanded(false); };
    if (mobileQuery.addEventListener) mobileQuery.addEventListener("change", handleMobileQuery);
    else if (mobileQuery.addListener) mobileQuery.addListener(handleMobileQuery);
  }

  dockItems.forEach(function (item) {
      var active = item.getAttribute("data-dock-item") === name;
      item.classList.toggle("is-active", active);
      if (active) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });
  }

  dockItems.forEach(function (item) {
    item.addEventListener("click", function () {
      setDockActive(item.getAttribute("data-dock-item"));
    });
  });

  if (dockItems.length) setDockActive("home");
  if (islandActionItems.length) setMobileIslandActive("home");
  setMobileExpanded(false);

  if (choose && "IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting && !choose.contains(document.activeElement)) clearIntent();
      });
    }, { threshold: .18 });
    observer.observe(choose);
  }


  window.addEventListener("scroll", scheduleScrollUpdate, { passive: true });
  window.addEventListener("resize", scheduleScrollUpdate, { passive: true });
  updateScrollState();

  // Keep a stable semantic nav. Motion only changes presentation/state.
  header.dataset.motion = reduceMotion() ? "reduced" : "full";
})();
