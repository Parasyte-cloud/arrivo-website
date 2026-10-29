(function () {
  "use strict";

  var header = document.querySelector(".site-header[data-arrivo-island]");
  if (!header) return;

  var context = header.querySelector("[data-island-context]");
  var mainNav = header.querySelector(".main-nav");
  var choose = document.getElementById("choose");
  var islandToggle = document.getElementById("mobileIslandToggle");
  var islandActions = document.getElementById("mobileIslandActions");
  var islandActionItems = islandActions ? Array.prototype.slice.call(islandActions.querySelectorAll("[data-mobile-island-action]")) : [];
  var islandAccount = document.getElementById("mobileIslandAccountLink");
  var menuToggle = document.getElementById("mobileNavToggle");
  var menu = document.getElementById("mobileNavMenu");
  var backdrop = document.getElementById("mobileNavBackdrop");
  var mobileQuery = window.matchMedia ? window.matchMedia("(max-width: 767px)") : null;
  var raf = 0;
  var lastY = -1;
  var lastScrollY = Math.max(0, window.scrollY || window.pageYOffset || 0);
  var lastFocused = null;

  function reduceMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function isMobile() {
    return !mobileQuery || mobileQuery.matches;
  }

  function focusablesInMenu() {
    if (!menu || menu.hidden) return [];
    return Array.prototype.slice.call(menu.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter(function (el) { return !el.hidden && el.offsetParent !== null; });
  }

  function setMobileIslandActive(name) {
    islandActionItems.forEach(function (item) {
      var active = item.getAttribute("data-mobile-island-action") === name;
      item.classList.toggle("is-active", active);
      if (active && name === "home") item.setAttribute("aria-current", "page");
      else if (active && name === "services") item.setAttribute("aria-current", "location");
      else item.removeAttribute("aria-current");
    });
  }

  function setMobileExpanded(open) {
    open = !!open && isMobile();
    if (!open && menu && !menu.hidden) closeMobileMenu(false);
    header.classList.toggle("is-mobile-expanded", open);
    if (islandToggle) {
      islandToggle.setAttribute("aria-expanded", open ? "true" : "false");
      islandToggle.setAttribute("aria-label", open ? "Close quick navigation" : "Open quick navigation");
    }
    if (islandActions) islandActions.hidden = !open;
  }

  function openMobileMenu() {
    if (!isMobile() || !menu || !menuToggle) return;
    setMobileExpanded(true);
    lastFocused = document.activeElement;
    menu.hidden = false;
    if (backdrop) backdrop.hidden = false;
    menuToggle.classList.add("is-open");
    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Close menu");
    header.classList.add("is-mobile-menu-open");
    document.documentElement.classList.add("arrivo-menu-open");
    window.requestAnimationFrame(function () {
      try { menu.focus({ preventScroll: true }); } catch (e) { menu.focus(); }
    });
  }

  function closeMobileMenu(restoreFocus) {
    if (!menu || !menuToggle) return;
    menu.hidden = true;
    if (backdrop) backdrop.hidden = true;
    menuToggle.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Menu");
    header.classList.remove("is-mobile-menu-open");
    document.documentElement.classList.remove("arrivo-menu-open");
    if (restoreFocus !== false) {
      var target = (lastFocused && document.contains(lastFocused)) ? lastFocused : menuToggle;
      try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
    }
    lastFocused = null;
  }

  function toggleMobileMenu() {
    if (!menu) return;
    if (menu.hidden) openMobileMenu();
    else closeMobileMenu(true);
  }

  function updateScrollState() {
    raf = 0;
    var y = Math.max(0, window.scrollY || window.pageYOffset || 0);
    if (Math.abs(y - lastY) < 2) return;
    var movingDown = y > lastScrollY;
    lastScrollY = y;
    lastY = y;
    header.classList.toggle("is-condensed", y > 36);

    // The page must never leave a detached menu sheet behind when the island
    // condenses. Page scrolling closes transient navigation; menu-sheet
    // scrolling itself is unaffected because the document is locked while open.
    if (isMobile() && movingDown && y > 24 && header.classList.contains("is-mobile-expanded") && (!menu || menu.hidden)) {
      setMobileExpanded(false);
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
    setMobileIslandActive("services");
  }

  function clearIntent() {
    header.dataset.islandState = "default";
    if (context) context.textContent = "";
    if (mainNav) mainNav.querySelectorAll(".is-active").forEach(function (link) { link.classList.remove("is-active"); });
  }

  function updateAccountDestination() {
    if (!islandAccount) return;
    try {
      islandAccount.href = localStorage.getItem("arrivo_rider_token") ? "account.html" : "login.html";
    } catch (e) {
      islandAccount.href = "login.html";
    }
  }

  function trapMenuFocus(event) {
    if (event.key !== "Tab" || !menu || menu.hidden) return;
    var items = focusablesInMenu();
    if (!items.length) {
      event.preventDefault();
      menu.focus();
      return;
    }
    var first = items[0];
    var last = items[items.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === menu)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  document.addEventListener("arrivo:intent", function (event) {
    setIntent(event.detail && event.detail.intent ? event.detail.intent : "ride");
  });

  if (islandToggle) {
    islandToggle.addEventListener("click", function () {
      if (menu && !menu.hidden) closeMobileMenu(false);
      setMobileExpanded(!header.classList.contains("is-mobile-expanded"));
    });
  }

  islandActionItems.forEach(function (item) {
    item.addEventListener("click", function (event) {
      var name = item.getAttribute("data-mobile-island-action");
      setMobileIslandActive(name);
      if (name === "menu") {
        event.preventDefault();
        toggleMobileMenu();
        return;
      }
      closeMobileMenu(false);
      setMobileExpanded(false);
    });
  });

  if (backdrop) {
    backdrop.addEventListener("click", function () {
      closeMobileMenu(false);
      setMobileExpanded(false);
    });
  }

  if (menu) {
    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        closeMobileMenu(false);
        setMobileExpanded(false);
      });
    });
  }

  document.addEventListener("click", function (event) {
    if (!isMobile()) return;
    if (menu && !menu.hidden) {
      if (menu.contains(event.target) || header.contains(event.target)) return;
      closeMobileMenu(false);
      setMobileExpanded(false);
      return;
    }
    if (!header.classList.contains("is-mobile-expanded")) return;
    if (!header.contains(event.target)) setMobileExpanded(false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      if (menu && !menu.hidden) {
        event.preventDefault();
        closeMobileMenu(true);
        return;
      }
      if (header.classList.contains("is-mobile-expanded")) {
        event.preventDefault();
        setMobileExpanded(false);
        if (islandToggle) islandToggle.focus();
      }
      return;
    }
    trapMenuFocus(event);
  });

  if (mobileQuery) {
    var handleMobileQuery = function (event) {
      if (!event.matches) {
        closeMobileMenu(false);
        setMobileExpanded(false);
      }
    };
    if (mobileQuery.addEventListener) mobileQuery.addEventListener("change", handleMobileQuery);
    else if (mobileQuery.addListener) mobileQuery.addListener(handleMobileQuery);
  }

  updateAccountDestination();
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
