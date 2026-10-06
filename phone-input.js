// Shared country calling-code data and phone validation, used anywhere a
// phone/WhatsApp number is collected (booking, registration).
//
// Deliberately a plain object, not a huge npm library — this covers the
// countries actually relevant to RideArrivo's visitor mix (Nigeria + its
// neighbours, plus the other markets RideArrivo already supports content for)
// with a real min/max national-number-length check per country, which
// catches the most common mistake: picking the wrong country code and
// pasting a number that obviously doesn't fit it.
var ARRIVO_COUNTRY_CODES = [
  { code: "NG", dial: "+234", name: "Nigeria", minLen: 10, maxLen: 10 },
  { code: "GH", dial: "+233", name: "Ghana", minLen: 9, maxLen: 9 },
  { code: "BJ", dial: "+229", name: "Benin", minLen: 8, maxLen: 8 },
  { code: "NE", dial: "+227", name: "Niger", minLen: 8, maxLen: 8 },
  { code: "TG", dial: "+228", name: "Togo", minLen: 8, maxLen: 8 },
  { code: "CI", dial: "+225", name: "Côte d'Ivoire", minLen: 8, maxLen: 10 },
  { code: "CM", dial: "+237", name: "Cameroon", minLen: 9, maxLen: 9 },
  { code: "SN", dial: "+221", name: "Senegal", minLen: 9, maxLen: 9 },
  { code: "GB", dial: "+44", name: "United Kingdom", minLen: 10, maxLen: 10 },
  { code: "US", dial: "+1", name: "United States", minLen: 10, maxLen: 10 },
  { code: "CA", dial: "+1", name: "Canada", minLen: 10, maxLen: 10 },
  { code: "FR", dial: "+33", name: "France", minLen: 9, maxLen: 9 },
  { code: "DE", dial: "+49", name: "Germany", minLen: 10, maxLen: 11 },
  { code: "CN", dial: "+86", name: "China", minLen: 11, maxLen: 11 },
  { code: "IN", dial: "+91", name: "India", minLen: 10, maxLen: 10 },
  { code: "PT", dial: "+351", name: "Portugal", minLen: 9, maxLen: 9 },
  { code: "BR", dial: "+55", name: "Brazil", minLen: 10, maxLen: 11 },
  { code: "ES", dial: "+34", name: "Spain", minLen: 9, maxLen: 9 },
  { code: "ZA", dial: "+27", name: "South Africa", minLen: 9, maxLen: 9 },
  { code: "AE", dial: "+971", name: "United Arab Emirates", minLen: 9, maxLen: 9 },
];

function arrivoValidatePhone(dialCode, nationalNumber) {
  var digitsOnly = (nationalNumber || "").replace(/\D/g, "");
  var country = ARRIVO_COUNTRY_CODES.find(function (c) { return c.dial === dialCode; });
  if (!country) return { valid: false, message: "Please choose a country code." };
  if (!digitsOnly) return { valid: false, message: "Please enter a phone number." };
  if (digitsOnly.length < country.minLen || digitsOnly.length > country.maxLen) {
    return {
      valid: false,
      message: country.minLen === country.maxLen
        ? `A ${country.name} number should have ${country.minLen} digits after the country code.`
        : `A ${country.name} number should have ${country.minLen}-${country.maxLen} digits after the country code.`,
    };
  }
  return { valid: true, full: dialCode + digitsOnly };
}

// Renders a country-code <select> + number <input> pair into a container
// element, and returns a getter for the combined, validated value.
function arrivoBuildPhoneInput(containerEl, options) {
  options = options || {};
  var defaultDial = options.defaultDial || "+234";

  containerEl.innerHTML =
    '<div style="display:flex; gap:8px;">' +
    '<select class="field arrivo-phone-country" style="flex:0 0 110px; padding-left:8px; padding-right:4px;"></select>' +
    '<input type="tel" class="field arrivo-phone-number" style="flex:1;" placeholder="' + (options.placeholder || "Phone number") + '">' +
    "</div>";

  var select = containerEl.querySelector(".arrivo-phone-country");
  var input = containerEl.querySelector(".arrivo-phone-number");

  ARRIVO_COUNTRY_CODES.forEach(function (c) {
    var opt = document.createElement("option");
    opt.value = c.dial;
    opt.textContent = c.code + " " + c.dial;
    if (c.dial === defaultDial) opt.selected = true;
    select.appendChild(opt);
  });

  return {
    getValue: function () {
      return arrivoValidatePhone(select.value, input.value);
    },
    setRaw: function (dial, number) {
      select.value = dial;
      input.value = number;
    },
  };
}
