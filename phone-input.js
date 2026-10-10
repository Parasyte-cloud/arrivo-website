// Shared country calling-code data and phone validation, used anywhere a
// phone/WhatsApp number is collected (booking, registration, contact).
//
// Deliberately a plain object, not a huge npm library -- this covers the
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

// Time zone -> calling code, used to pick a sensible default country before
// the visitor types anything. Anything else defaults to Nigeria (RideArrivo's
// home market); the browser language is deliberately not used, because many
// Nigerians have phones set to US English.
var ARRIVO_TZ_DIAL = {
  "Africa/Lagos": "+234", "Africa/Accra": "+233", "Africa/Porto-Novo": "+229",
  "Africa/Niamey": "+227", "Africa/Lome": "+228", "Africa/Abidjan": "+225",
  "Africa/Douala": "+237", "Africa/Dakar": "+221", "Africa/Johannesburg": "+27",
  "Europe/London": "+44", "Europe/Paris": "+33", "Europe/Berlin": "+49",
  "Europe/Lisbon": "+351", "Europe/Madrid": "+34", "Asia/Kolkata": "+91",
  "Asia/Calcutta": "+91", "Asia/Shanghai": "+86", "Asia/Dubai": "+971",
  "America/Sao_Paulo": "+55", "America/New_York": "+1", "America/Chicago": "+1",
  "America/Denver": "+1", "America/Los_Angeles": "+1", "America/Toronto": "+1"
};

function arrivoGuessDial() {
  try {
    var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && ARRIVO_TZ_DIAL[tz]) return ARRIVO_TZ_DIAL[tz];
  } catch (e) {}
  return "+234";
}

// If the text starts with +, 00, or is a bare Nigerian 234... number, work out
// which country it belongs to. Returns { dial, rest } with rest as digits, or
// null when nothing can be detected (so ordinary typing is left alone).
function arrivoDetectDial(raw) {
  var s = String(raw || "").replace(/[\s\-().]/g, "");
  var digits = null;
  if (s.charAt(0) === "+") digits = s.slice(1);
  else if (s.slice(0, 2) === "00") digits = s.slice(2);
  else if (/^234\d{10,11}$/.test(s)) digits = s;
  if (digits === null) return null;
  digits = digits.replace(/\D/g, "");
  var best = null;
  ARRIVO_COUNTRY_CODES.forEach(function (c) {
    var d = c.dial.slice(1);
    if (digits.indexOf(d) === 0 && (!best || d.length > best.dial.length - 1)) best = c;
  });
  if (!best) return null;
  return { dial: best.dial, rest: digits.slice(best.dial.length - 1) };
}

function arrivoValidatePhone(dialCode, nationalNumber) {
  var digitsOnly = (nationalNumber || "").replace(/\D/g, "");
  var country = ARRIVO_COUNTRY_CODES.find(function (c) { return c.dial === dialCode; });
  if (!country) return { valid: false, message: "Please choose a country code." };
  if (!digitsOnly) return { valid: false, message: "Please enter a phone number." };
  // Someone typed the country code into the number box as well.
  var dialDigits = dialCode.slice(1);
  if (digitsOnly.length > country.maxLen && digitsOnly.indexOf(dialDigits) === 0) {
    digitsOnly = digitsOnly.slice(dialDigits.length);
  }
  // Local format starts with a trunk 0 (0803...). Drop it, the country code replaces it.
  if (digitsOnly.charAt(0) === "0") digitsOnly = digitsOnly.slice(1);
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
// The country is picked automatically: from the visitor's time zone before they
// type, and from the number itself as they type or paste (+234..., 00233...).
function arrivoBuildPhoneInput(containerEl, options) {
  options = options || {};
  var defaultDial = options.defaultDial || arrivoGuessDial();

  containerEl.innerHTML =
    '<div style="display:flex; gap:8px;">' +
    '<select class="field arrivo-phone-country" aria-label="Country code" style="flex:0 0 110px; padding-left:8px; padding-right:4px;"></select>' +
    '<input type="tel" class="field arrivo-phone-number" style="flex:1;" autocomplete="tel-national" inputmode="tel" placeholder="' + (options.placeholder || "Phone number") + '">' +
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

  // Auto-detect the country as the number is typed or pasted.
  input.addEventListener("input", function () {
    var hit = arrivoDetectDial(input.value);
    if (!hit) return;
    select.value = hit.dial;
    input.value = hit.rest.replace(/^0/, "");
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
