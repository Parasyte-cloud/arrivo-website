// Shows the visitor's own local date/time — uses the browser's timezone
// automatically (no geolocation needed), so someone in Lagos sees Lagos
// time, someone in Paris sees Paris time, etc.
//
// Deliberately does NOT wait for the DOMContentLoaded event: some in-app
// browsers/webviews fire that event before this script's listener can
// attach, which silently prevented the clock from ever rendering. Since
// this script tag sits after the header in the HTML, #liveClock already
// exists in the DOM by the time this code runs — no need to wait at all.
(function () {
  "use strict";

  var MOBILE_BREAKPOINT = 780;

  function applyVisibility(el) {
    // Belt-and-suspenders alongside the CSS media query — some webviews
    // report viewport widths that don't match their actual rendered size,
    // so we also check it directly in JS.
    el.style.display = window.innerWidth < MOBILE_BREAKPOINT ? "none" : "flex";
  }

  function update() {
    var el = document.getElementById("liveClock");
    if (!el) return;

    applyVisibility(el);

    var now = new Date();
    var dateStr = now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    var hours = now.getHours();
    var minutes = String(now.getMinutes()).padStart(2, "0");
    var ampm = hours >= 12 ? "PM" : "AM";
    var displayHours = hours % 12 === 0 ? 12 : hours % 12;

    el.innerHTML =
      '<span class="clock-date">' + dateStr + '</span>' +
      '<span class="clock-time">' + displayHours + '<span class="clock-colon">:</span>' + minutes + ' ' + ampm + '</span>';
  }

  update();
  setInterval(update, 15000);
  window.addEventListener("resize", update);
})();
