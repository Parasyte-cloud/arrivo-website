// Single source of truth for the Paystack PUBLIC key, shared by every page
// that opens a Paystack popup (book.html via booking.js, track.html for
// tipping). Previously each page kept its own copy — booking.js had the
// real live key, track.html had a separate, never-updated
// "pk_test_replace_me" placeholder, which silently disabled card tipping
// on the tracking page. One value here means they can't drift again.
//
// This is the PUBLISHABLE key (safe to ship in client-side JS — it's
// designed to be public, same as it was before). The SECRET key lives only
// in arrivo-backend's .env (PAYSTACK_SECRET_KEY) and is never sent to the
// browser.
var PAYSTACK_PUBLIC_KEY = "pk_live_138a2b3fc8f4518974a3b404858e62ac5255f893"; // from dashboard.paystack.com/#/settings/developer
