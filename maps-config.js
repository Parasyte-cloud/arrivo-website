// Single source of truth for the Google Maps BROWSER key, same idea as
// paystack-config.js. It used to be typed straight into the script tag in
// book.html, so rotating it meant editing HTML and hoping no other page had
// its own copy.
//
// This key is PUBLIC and cannot be hidden. The booking page draws a real map,
// drops markers and runs Places autocomplete, and all of that needs the SDK
// running in the visitor's browser. Secrecy is not what protects it.
// Restrictions are.
//
// So whenever this value changes, the new key MUST be set up in Google Cloud
// Console under APIs and Services, Credentials, with:
//
//   Application restrictions: HTTP referrers
//       https://ridearrivo.com/
//       https://www.ridearrivo.com/
//   API restrictions:
//       Maps JavaScript API
//       Places API
//       Distance Matrix API (Legacy)  -- booking.js calls
//         google.maps.DistanceMatrixService() for the pickup/drop-off
//         distance-and-duration estimate; Google's own Maps Platform
//         guidance requires this API to also be authorized for a key
//         used with Distance Matrix Service through the JS SDK, or
//         restricting the key to just the first two breaks that
//         feature silently.
//   A billing budget alert on the project
//
// Do NOT add localhost or a broad Vercel wildcard to this production key --
// give any development/preview environment that needs Maps its own,
// separately restricted key instead.
//
// This file itself is marked no-store in _headers and excluded from the
// service worker's cache (see sw.js's BYPASS_PATHS) specifically so that
// rotating the value below is the *entire* rotation: no ?v= to remember to
// bump anywhere, no stale cached copy of this file on a returning visitor's
// device still serving the old key.
//
// Without the above, anyone can copy this line out of the public repo, use
// it on their own site, and the bill lands on us.
var GOOGLE_MAPS_BROWSER_KEY = "AIzaSyCLWAbQmxIAoGPP0LLDp6oTosaHZBa0Y5s";
