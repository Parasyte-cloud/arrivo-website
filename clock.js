// Shows the visitor's own local date/time — uses the browser's timezone
// automatically (no geolocation needed), so someone in Lagos sees Lagos
// time, someone in Paris sees Paris time, etc.
(function () {
  "use strict";

  function update() {
    var el = document.getElementById("liveClock");
    if (!el) return;
    var now = new Date();
    var options = { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
    el.textContent = now.toLocaleString(undefined, options);
  }

  document.addEventListener("DOMContentLoaded", function () {
    update();
    setInterval(update, 30000); // refresh every 30s — a clock down to the second would be visual noise here
  });
})();
