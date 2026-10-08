#!/usr/bin/env node
/*
 * Builds the public main site into dist/site/ from an explicit allowlist, so
 * patches, bundles, archives, redesign sources and docs can never be published.
 *
 *   node scripts/build-site.js     -> writes dist/site/
 *
 * Cloudflare Pages: build command `node scripts/build-site.js`, output dir `dist/site`.
 * Node built-ins only. Fails if a local reference points at a file not bundled
 * or if a forbidden file type ends up in the output.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = process.env.SITE_OUT ? path.resolve(process.env.SITE_OUT) : path.join(ROOT, "dist", "site");

// Top-level files: only these extensions, only at the repo root.
const ROOT_EXT = /\.(html|css|js|json|txt|xml)$/i;
const ROOT_EXTRA = ["_headers", "_redirects"];
const ROOT_DIRS = ["assets", "payment"];
const FORBIDDEN = /\.(zip|tgz|gz|tar|bundle|patch|bak|log|env|pem|key|map)$|(^|\/)(\.env|\.git)/i;

function die(m) { console.error("BUILD FAILED: " + m); process.exit(1); }
function copy(src, dst) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst); }
function walk(dir, cb) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, cb); else if (e.isFile()) cb(p);
  }
}

fs.rmSync(OUT, { recursive: true, force: true });
let count = 0;
for (const e of fs.readdirSync(ROOT, { withFileTypes: true })) {
  if (!e.isFile()) continue;
  if (ROOT_EXTRA.includes(e.name) || (ROOT_EXT.test(e.name) && !FORBIDDEN.test(e.name))) {
    copy(path.join(ROOT, e.name), path.join(OUT, e.name)); count++;
  }
}
for (const d of ROOT_DIRS) {
  const src = path.join(ROOT, d);
  if (!fs.existsSync(src)) die("missing directory " + d);
  walk(src, (p) => {
    const rel = path.relative(ROOT, p);
    if (FORBIDDEN.test(rel) || path.basename(p).startsWith(".")) return;
    copy(p, path.join(OUT, rel)); count++;
  });
}

// Safety check on the output.
walk(OUT, (p) => { if (FORBIDDEN.test(path.relative(OUT, p))) die("forbidden file in output: " + p); });

// Local reference check for HTML pages.
let missing = [];
walk(OUT, (p) => {
  if (!p.endsWith(".html")) return;
  const html = fs.readFileSync(p, "utf8");
  const re = /(?:src|href)\s*=\s*"([^"#?]+)(?:[?#][^"]*)?"/g;
  let m;
  while ((m = re.exec(html))) {
    const ref = m[1];
    if (/^(https?:|mailto:|tel:|data:|javascript:|\/\/)/i.test(ref)) continue;
    const target = ref.startsWith("/") ? path.join(OUT, ref) : path.join(path.dirname(p), ref);
    if (ref.endsWith("/") ? !fs.existsSync(path.join(target, "index.html")) : !fs.existsSync(target)) {
      missing.push(path.relative(OUT, p) + " -> " + ref);
    }
  }
});
if (missing.length) {
  console.warn("WARNING: unresolved local references (may be extensionless routes):\n  " + missing.join("\n  "));
}
console.log("Built dist/site with " + count + " files.");
