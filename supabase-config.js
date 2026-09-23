// Single source of truth for the Supabase project URL and PUBLISHABLE
// (anon) key, shared by every page that talks to a Supabase edge function
// directly from the browser (currently contact-us.html and
// charter-booking.html, via the `intake` function).
//
// This is the PUBLISHABLE key — safe to ship in client-side JS, same idea
// as PAYSTACK_PUBLIC_KEY in paystack-config.js. Access control lives in
// the edge function itself (origin allowlist, rate limiting, RLS on the
// underlying tables), not in keeping this value secret.
var SUPABASE_URL = "https://fkkxcivxnwshahnbatnp.supabase.co";
var SUPABASE_ANON_KEY = "sb_publishable_cEESUEfhOMOCXHG30-FjqQ_EzAe8JB7";
