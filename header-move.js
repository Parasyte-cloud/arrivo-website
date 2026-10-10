/* Double-click the header's empty space to unpin it, then drag it anywhere on
   the page. Double-click again to dock it back. Desktop widths only (the phone
   layout uses the hamburger menu). The spot is remembered for the tab session.

   Drag the floating pill to the left or right edge of the window and it turns
   into a vertical pill of icon buttons, with a label on hover or keyboard
   focus. Drag it away from the edge and it turns horizontal again.

   Pages that load this script with data-default="floating" start with the
   compact floating header (centred at the top). Double-clicking docks it, and
   that choice is remembered for the tab session too. The homepage does not set
   the attribute, so it keeps the full-width bar until the visitor moves it. */
(function () {
  "use strict";
  var header = document.querySelector(".site-header");
  if (!header) return;

  var KEY = "arrivo_header_pos";
  var DOCKED_KEY = "arrivo_header_docked";
  var tag = document.querySelector('script[src^="header-move.js"]');
  var DEFAULT_FLOAT = !!(tag && tag.getAttribute("data-default") === "floating");
  var MIN_W = 860;      // narrower than this the phone layout takes over
  var MIN_H = 560;      // a vertical pill needs this much height
  var MARGIN = 12;      // gap kept between the pill and the window edge
  var EDGE_IN = 64;     // pointer this close to an edge turns the pill vertical
  var EDGE_OUT = 160;   // and it stays vertical until the pointer is this far away
  var spacer = null;
  var drag = null;
  var side = null;      // null (horizontal), "left" or "right"

  function vw() { return document.documentElement.clientWidth || window.innerWidth; }
  function wide() { return window.innerWidth >= MIN_W; }
  function sideOK() { return wide() && window.innerHeight >= MIN_H; }
  function interactive(el) {
    return !!(el.closest && el.closest("a, button, input, select, textarea, ul, .lang-menu, .nav-dropdown-menu"));
  }
  function clamp(x, y) {
    var r = header.getBoundingClientRect();
    return {
      x: Math.min(Math.max(0, x), Math.max(0, vw() - r.width)),
      y: Math.min(Math.max(0, y), Math.max(0, window.innerHeight - r.height)),
    };
  }
  function place(x, y) {
    var p = clamp(x, y);
    var r = header.getBoundingClientRect();
    if (side === "left") p.x = MARGIN;
    else if (side === "right") p.x = Math.max(0, vw() - r.width - MARGIN);
    header.style.left = p.x + "px";
    header.style.top = p.y + "px";
    return p;
  }
  function save(p) {
    try { sessionStorage.setItem(KEY, JSON.stringify({ x: p.x, y: p.y, side: side })); } catch (e) { /* ignore */ }
  }
  function userDocked() {
    try { return sessionStorage.getItem(DOCKED_KEY) === "1"; } catch (e) { return false; }
  }
  function setDocked(on) {
    try { if (on) sessionStorage.setItem(DOCKED_KEY, "1"); else sessionStorage.removeItem(DOCKED_KEY); } catch (e) { /* ignore */ }
  }
  function load() {
    try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (e) { return null; }
  }

  /* The vertical pill shows icons only, so every control needs a text label for
     the hover tip. Read them at the moment the pill turns vertical so they
     follow the page language. */
  function labelControls() {
    var sel = ".main-nav > a, .nav-dropdown-trigger, .nav-account-link, .header-actions > .btn, .header-actions > .theme-toggle, .brand";
    Array.prototype.forEach.call(header.querySelectorAll(sel), function (el) {
      var text = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim();
      var acct = el.querySelector && el.querySelector("[id^='accountNavLabel']");
      if (acct) text = acct.textContent.trim();
      if (el.classList.contains("theme-toggle")) text = el.getAttribute("title") || el.getAttribute("aria-label") || text;
      if (text) el.setAttribute("data-tip", text);
    });
  }
  function setSide(next) {
    if (next === side) return;
    side = next;
    header.classList.toggle("is-side", !!next);
    header.classList.toggle("is-side-left", next === "left");
    header.classList.toggle("is-side-right", next === "right");
    if (next) labelControls();
  }
  function sideFor(x) {
    if (!sideOK()) return null;
    var w = vw();
    if (side === "left") return x < EDGE_OUT ? "left" : (x > w - EDGE_IN ? "right" : null);
    if (side === "right") return x > w - EDGE_OUT ? "right" : (x < EDGE_IN ? "left" : null);
    return x < EDGE_IN ? "left" : (x > w - EDGE_IN ? "right" : null);
  }

  function float(x, y, s) {
    if (header.classList.contains("is-floating")) return;
    setDocked(false);
    var r = header.getBoundingClientRect();
    // Keep the page layout where it is while the header leaves the flow.
    spacer = document.createElement("div");
    spacer.style.height = r.height + "px";
    spacer.setAttribute("aria-hidden", "true");
    header.parentNode.insertBefore(spacer, header);
    header.classList.add("is-floating");
    if (s && sideOK()) setSide(s);
    // The docked bar is full width; floating, it shrinks to its content so it
    // can sit anywhere. Start it centred where the full bar was.
    var r2 = header.getBoundingClientRect();
    return place(x == null ? r.left + (r.width - r2.width) / 2 : x, y == null ? r.top : y);
  }
  function dock(auto) {
    if (!header.classList.contains("is-floating")) return;
    // Only a deliberate double-click counts as "keep it docked"; docking
    // because the window got narrow must not.
    if (DEFAULT_FLOAT && !auto) setDocked(true);
    setSide(null);
    header.classList.remove("is-floating");
    header.style.left = header.style.top = "";
    if (spacer && spacer.parentNode) spacer.parentNode.removeChild(spacer);
    spacer = null;
    try { sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  }

  header.addEventListener("dblclick", function (e) {
    if (!wide() || interactive(e.target)) return;
    if (header.classList.contains("is-floating")) dock();
    else save(float());
  });

  header.addEventListener("pointerdown", function (e) {
    if (!header.classList.contains("is-floating") || e.button !== 0 || interactive(e.target)) return;
    var r = header.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, id: e.pointerId };
    header.classList.add("is-dragging");
    try { header.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    e.preventDefault();
  });
  header.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var want = sideFor(e.clientX);
    if (want !== side) {
      setSide(want);
      // The pill changed shape under the pointer: hold it by its middle.
      var r = header.getBoundingClientRect();
      drag.dx = r.width / 2;
      drag.dy = r.height / 2;
    }
    place(e.clientX - drag.dx, e.clientY - drag.dy);
  });
  function end() {
    if (!drag) return;
    drag = null;
    header.classList.remove("is-dragging");
    save({ x: parseFloat(header.style.left) || 0, y: parseFloat(header.style.top) || 0 });
  }
  header.addEventListener("pointerup", end);
  header.addEventListener("pointercancel", end);

  window.addEventListener("resize", function () {
    if (!header.classList.contains("is-floating")) {
      if (DEFAULT_FLOAT && wide() && !userDocked()) float(null, MARGIN);
      return;
    }
    if (!wide()) { dock(true); return; }
    if (side && !sideOK()) setSide(null);
    place(parseFloat(header.style.left) || 0, parseFloat(header.style.top) || 0);
  });

  var saved = load();
  if (saved && wide()) float(saved.x, saved.y, saved.side);
  else if (DEFAULT_FLOAT && wide() && !userDocked()) float(null, MARGIN);
})();
