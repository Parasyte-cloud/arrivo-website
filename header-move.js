/* Double-click the header's empty space to unpin it, then drag it anywhere on
   the page. Double-click again to dock it back. Desktop widths only (the phone
   layout uses the hamburger menu). The spot is remembered for the tab session. */
(function () {
  "use strict";
  var header = document.querySelector(".site-header");
  if (!header) return;

  var KEY = "arrivo_header_pos";
  var MIN_W = 860;
  var spacer = null;
  var drag = null;

  function wide() { return window.innerWidth >= MIN_W; }
  function interactive(el) {
    return !!(el.closest && el.closest("a, button, input, select, textarea, ul, .lang-menu, .nav-dropdown-menu"));
  }
  function clamp(x, y) {
    var r = header.getBoundingClientRect();
    return {
      x: Math.min(Math.max(0, x), Math.max(0, window.innerWidth - r.width)),
      y: Math.min(Math.max(0, y), Math.max(0, window.innerHeight - r.height)),
    };
  }
  function place(x, y) {
    var p = clamp(x, y);
    header.style.left = p.x + "px";
    header.style.top = p.y + "px";
    return p;
  }
  function save(p) {
    try { sessionStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* ignore */ }
  }
  function load() {
    try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (e) { return null; }
  }

  function float(x, y) {
    if (header.classList.contains("is-floating")) return;
    var r = header.getBoundingClientRect();
    // Keep the page layout where it is while the header leaves the flow.
    spacer = document.createElement("div");
    spacer.style.height = r.height + "px";
    spacer.setAttribute("aria-hidden", "true");
    header.parentNode.insertBefore(spacer, header);
    header.classList.add("is-floating");
    // The docked bar is full width; floating, it shrinks to its content so it
    // can sit anywhere. Start it centred where the full bar was.
    var r2 = header.getBoundingClientRect();
    return place(x == null ? r.left + (r.width - r2.width) / 2 : x, y == null ? r.top : y);
  }
  function dock() {
    if (!header.classList.contains("is-floating")) return;
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
    if (!header.classList.contains("is-floating")) return;
    if (!wide()) { dock(); return; }
    place(parseFloat(header.style.left) || 0, parseFloat(header.style.top) || 0);
  });

  var saved = load();
  if (saved && wide()) float(saved.x, saved.y);
})();
