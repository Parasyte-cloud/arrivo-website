// Tells Bing, Yandex, Naver and other IndexNow engines that the sitemap URLs changed. Run after a deploy:
//   node scripts/indexnow.js
// The key is public by design: the same value is served at https://ridearrivo.com/<key>.txt so engines can verify ownership.
// Google does not use IndexNow; use Search Console for Google.
const fs = require("fs");
const path = require("path");
const KEY = "d4a4c90565296225d9b17e41dea08043";
const HOST = "ridearrivo.com";
const xml = fs.readFileSync(path.join(__dirname, "..", "sitemap.xml"), "utf8");
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: "https://" + HOST + "/" + KEY + ".txt", urlList }),
}).then((r) => { console.log("IndexNow status", r.status, "for", urlList.length, "URLs"); process.exit(r.ok || r.status === 202 ? 0 : 1); })
  .catch((e) => { console.error("IndexNow failed:", e.message); process.exit(1); });
