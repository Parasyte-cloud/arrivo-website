(function () {
  "use strict";

  function trackEvent(eventName, parameters = {}) {
    // Only track when the site's consent system allows analytics.
    const privacy = window.RideArrivoPrivacy;

    if (!privacy || !privacy.getConsent().analytics) {
      return;
    }

    window.dataLayer = window.dataLayer || [];

    window.dataLayer.push({
      event: eventName,
      ...parameters
    });
  }

  document.addEventListener("click", function (e) {
    const element = e.target.closest("a, button");

    if (!element) return;

    // Ride, Move and Charter tabs
    if (element.matches(".rh-tab")) {
      trackEvent("service_tab_click", {
        service_type: element.id.replace("-tab", "")
      });
      return;
    }

    // Airport transfer
    if (element.matches('[data-entry-intent="airport"]')) {
      trackEvent("service_click", {
        service_name: "airport_transfer"
      });
      return;
    }

    // Ride Now / Schedule a Ride
    if (element.matches("[data-express-mode]")) {
      trackEvent("service_click", {
        service_name: element.dataset.expressMode
      });
      return;
    }

    // Book a Ride
    if (element.matches('[data-ra="book"]')) {
      trackEvent("cta_click", {
        cta_name: "book_a_ride",
        cta_location: element.closest("#raMenu")
          ? "mobile_menu"
          : "header"
      });
      return;
    }
  });
})();