// Deployment settings for ArrivoExpress. This is the main-site copy; the
// standalone build (scripts/build-express.js) writes its own version of this
// file into dist/express with the same keys. express.js reads these and falls
// back to the same defaults if the file is missing.
window.ARRIVO_EXPRESS_CONFIG = {
  apiBase: "https://api.ridearrivo.com",
  loginPath: "login.html",
  accountPath: "account.html",
  trackPath: "track.html",
  selfPath: "express.html"
};
