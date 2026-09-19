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
//       https://ridearrivo.com/*
//       https://www.ridearrivo.com/*
//   API restrictions: Maps JavaScript API and Places API only
//   A billing budget alert on the project
//
// Without those, anyone can copy this line out of the public repo, use it on
// their own site, and the bill lands on us.
var GOOGLE_MAPS_BROWSER_KEY = "AIzaSyCLWAbQmxIAoGPP0LLDp6oTosaHZBa0Y5s";
