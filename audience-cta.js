(function () {
  "use strict";
  var KEY = "arrivo_site_lang";
  var COPY = {
    en: { rider: "Book a ride \u2192", driver: "Become a driver \u2192" },
    fr: { rider: "R\u00e9server une course \u2192", driver: "Devenir chauffeur \u2192" },
    zh: { rider: "\u9884\u8ba2\u884c\u7a0b \u2192", driver: "\u6210\u4e3a\u53f8\u673a \u2192" },
    hi: { rider: "\u0930\u093e\u0907\u0921 \u092c\u0941\u0915 \u0915\u0930\u0947\u0902 \u2192", driver: "\u0921\u094d\u0930\u093e\u0907\u0935\u0930 \u092c\u0928\u0947\u0902 \u2192" },
    de: { rider: "Fahrt buchen \u2192", driver: "Fahrer werden \u2192" },
    es: { rider: "Reservar un viaje \u2192", driver: "Hazte conductor \u2192" },
    pt: { rider: "Reservar uma corrida \u2192", driver: "Seja motorista \u2192" }
  };
  function language() {
    var v = null;
    try { v = localStorage.getItem(KEY); } catch (e) {}
    if (!COPY[v]) v = (document.documentElement.lang || "en").slice(0, 2);
    return COPY[v] ? v : "en";
  }
  function apply() {
    var copy = COPY[language()];
    document.querySelectorAll("[data-audience-cta]").forEach(function (a) {
      var k = a.getAttribute("data-audience-cta");
      if (copy[k] && a.textContent !== copy[k]) a.textContent = copy[k];
    });
  }
  apply();
  new MutationObserver(apply).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  window.addEventListener("storage", apply);
})();
