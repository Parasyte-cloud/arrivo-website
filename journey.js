/* Five portrait panels (#journey). One loop, about 15 seconds:
     1. build   the five panels arrive one after another (the effect changes each loop)
     2. tour    each panel takes the spotlight in turn
     3. all     all five side by side, a light sweep passes over them
     4. shatter each one cracks and breaks apart, one after another
   then it rebuilds, shards flying back together on the first rebuild.

   TO CHANGE THE PICTURES: replace assets/journey/journey-1.webp ... journey-5.webp
   (same file names, 4:5 portrait, 1200 x 1500). Nothing else to edit.

   It only runs while on screen and the tab is visible, pauses on hover and
   keyboard focus, and has a pause button. With "reduce motion" or "save data"
   it shows the five panels still, and hover or focus widens one. */
(function () {
  "use strict";

  var TOUR_MS = 1500;
  var WORDS = {
    en: ["Meet", "Ride", "Track", "Arrive"],
    fr: ["Accueil", "Trajet", "Suivi", "Arrivée"],
    zh: ["接机", "乘车", "追踪", "抵达"],
    hi: ["स्वागत", "सफ़र", "ट्रैक", "पहुँचें"],
    de: ["Empfang", "Fahrt", "Live-Tracking", "Ankunft"],
    es: ["Recibimiento", "Viaje", "Seguimiento", "Llegada"],
    pt: ["Recepção", "Viagem", "Acompanhe", "Chegada"]
  };
  var UI = {
    en: { label: "Your RideArrivo journey in pictures", pause: "Pause animation", play: "Play animation" },
    fr: { label: "Votre trajet RideArrivo en images", pause: "Mettre l'animation en pause", play: "Lancer l'animation" },
    zh: { label: "图片中的 RideArrivo 行程", pause: "暂停动画", play: "播放动画" },
    hi: { label: "तस्वीरों में आपका RideArrivo सफ़र", pause: "एनिमेशन रोकें", play: "एनिमेशन चलाएँ" },
    de: { label: "Ihre RideArrivo-Fahrt in Bildern", pause: "Animation anhalten", play: "Animation starten" },
    es: { label: "Tu viaje con RideArrivo en imágenes", pause: "Pausar la animación", play: "Reanudar la animación" },
    pt: { label: "Sua viagem RideArrivo em imagens", pause: "Pausar a animação", play: "Retomar a animação" }
  };

  var root = document.getElementById("journey");
  if (!root) return;
  var stage = root.querySelector(".jp-stage");
  var panels = Array.prototype.slice.call(root.querySelectorAll(".jp"));
  var tog = root.querySelector(".jp-toggle");
  if (!stage || panels.length < 2) return;
  root.classList.add("jp-root");

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var conn = navigator.connection || {};
  var canAnimate = !!(Element.prototype.animate);
  var still = reduce.matches || !!conn.saveData || !canAnimate;

  var userPaused = false, hovering = false, inView = false, visible = !document.hidden;
  var token = 0, anims = [];

  function lang() {
    var l = null;
    try { l = localStorage.getItem("arrivo_site_lang"); } catch (e) {}
    if (!l || !UI[l]) l = (document.documentElement.lang || "").slice(0, 2);
    return UI[l] ? l : "en";
  }
  function labels() {
    var l = lang(), w = WORDS[l] || WORDS.en, u = UI[l];
    root.setAttribute("aria-label", u.label);
    panels.forEach(function (p, i) {
      var el = p.querySelector(".jp-word[data-jp]");
      if (el && w[i - 1]) el.textContent = w[i - 1];
    });
    var paused = userPaused;
    tog.setAttribute("aria-label", paused ? u.play : u.pause);
    tog.setAttribute("aria-pressed", paused ? "true" : "false");
  }

  // seeded random so each panel always cracks the same way
  function rng(seed) {
    var a = seed * 2654435761 >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  var NS = "http://www.w3.org/2000/svg";
  var data = panels.map(function (p, i) {
    var r = rng(i + 7);
    var img = p.querySelector(".jp-img");
    var host = document.createElement("div");
    host.className = "jp-shards";
    host.setAttribute("aria-hidden", "true");
    var ix = 34 + r() * 32, iy = 28 + r() * 40; // impact point, in percent
    var cols = 3, rows = 5, pts = [];
    for (var y = 0; y <= rows; y++) {
      pts[y] = [];
      for (var x = 0; x <= cols; x++) {
        var jx = (x === 0 || x === cols) ? 0 : (r() - 0.5) * 0.7;
        var jy = (y === 0 || y === rows) ? 0 : (r() - 0.5) * 0.7;
        pts[y][x] = [(x + jx) * 100 / cols, (y + jy) * 100 / rows];
      }
    }
    var shards = [];
    function add(tri) {
      var el = document.createElement("div");
      el.className = "jp-shard";
      el.style.clipPath = "polygon(" + tri.map(function (q) { return q[0].toFixed(1) + "% " + q[1].toFixed(1) + "%"; }).join(",") + ")";
      var cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
      var dx = cx - ix, dy = cy - iy, dist = Math.sqrt(dx * dx + dy * dy) || 1;
      var k = 50 + r() * 150;
      var end = "translate(" + (dx / dist * k + (r() - .5) * 60).toFixed(0) + "px," + (dy / dist * k + 140 + r() * 260).toFixed(0) + "px) rotate(" + ((r() - .5) * 110).toFixed(0) + "deg) scale(" + (0.55 + r() * .3).toFixed(2) + ")";
      host.appendChild(el);
      shards.push({ el: el, dist: dist, end: end, dur: 900 + r() * 500 });
    }
    for (var yy = 0; yy < rows; yy++) {
      for (var xx = 0; xx < cols; xx++) {
        var a = pts[yy][xx], b = pts[yy][xx + 1], c = pts[yy + 1][xx + 1], d = pts[yy + 1][xx];
        if ((xx + yy) % 2) { add([a, b, c]); add([a, c, d]); } else { add([a, b, d]); add([b, c, d]); }
      }
    }
    p.insertBefore(host, p.querySelector(".jp-label"));

    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "jp-crack");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");
    var rays = 8;
    for (var n = 0; n < rays; n++) {
      var ang = (n / rays) * Math.PI * 2 + (r() - .5) * .5, px = ix, py = iy, dstr = "M" + px.toFixed(1) + " " + py.toFixed(1);
      var steps = 4 + Math.floor(r() * 3);
      for (var s = 0; s < steps; s++) {
        var len = 9 + r() * 12, wob = (r() - .5) * .9;
        px += Math.cos(ang + wob) * len * .55; py += Math.sin(ang + wob) * len;
        dstr += "L" + px.toFixed(1) + " " + py.toFixed(1);
      }
      var path = document.createElementNS(NS, "path");
      path.setAttribute("d", dstr);
      path.setAttribute("pathLength", "1");
      path.style.setProperty("--d", (n * 0.02).toFixed(2) + "s");
      svg.appendChild(path);
    }
    p.insertBefore(svg, p.querySelector(".jp-label"));
    var flash = document.createElement("div");
    flash.className = "jp-flash";
    p.appendChild(flash);
    return { shards: shards, flash: flash, ready: false, img: img };
  });

  function prepShards(i) {
    var d = data[i];
    if (d.ready) return;
    var src = d.img.currentSrc || d.img.src;
    d.shards.forEach(function (s) { s.el.style.backgroundImage = 'url("' + src + '")'; });
    d.ready = true;
  }

  function running() { return !still && !userPaused && !hovering && inView && visible; }
  function apply() {
    var r = running();
    anims.forEach(function (a) { try { if (r) a.play(); else a.pause(); } catch (e) {} });
    root.classList.toggle("is-paused", !r);
  }
  function track(a) {
    anims.push(a);
    function done() { var k = anims.indexOf(a); if (k > -1) anims.splice(k, 1); }
    a.onfinish = done; a.oncancel = done;
    if (!running()) a.pause();
    return a;
  }

  // a timer that stops counting while paused
  function sleep(ms) {
    var mine = token;
    return new Promise(function (res) {
      var left = ms, last = performance.now();
      (function tick(now) {
        if (mine !== token) { res(); return; }
        if (running()) left -= now - last;
        last = now;
        if (left <= 0) res(); else requestAnimationFrame(tick);
      })(last);
    });
  }

  function setMode(m) { stage.setAttribute("data-mode", m); }
  function setActive(i) { panels.forEach(function (p, k) { p.classList.toggle("is-active", k === i); }); }

  function enter(p, i, eff) {
    p.classList.remove("is-off", "is-shards", "is-cracking");
    var opt = { duration: 900, delay: i * 150, easing: "cubic-bezier(.2,.7,.2,1)", fill: "backwards" };
    var rr = "round 18px";
    if (eff === "rise") {
      track(p.animate([{ opacity: 0, transform: "translateY(70px) scale(.96)", clipPath: "inset(100% 0 0 0 " + rr + ")" }, { opacity: 1, transform: "none", clipPath: "inset(0 0 0 0 " + rr + ")" }], opt));
    } else if (eff === "wipe") {
      track(p.animate([{ clipPath: "inset(0 100% 0 0 " + rr + ")", transform: "translateX(-24px)" }, { clipPath: "inset(0 0 0 0 " + rr + ")", transform: "none" }], opt));
    } else if (eff === "zoom") {
      track(p.animate([{ opacity: 0, transform: "scale(1.25)", filter: "blur(14px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], opt));
    } else { // assemble: the shards fly back together
      prepShards(i);
      p.classList.add("is-shards");
      data[i].shards.forEach(function (s) {
        track(s.el.animate([{ transform: s.end, opacity: 0 }, { transform: "none", opacity: 1 }], {
          duration: 900 + s.dur * .3, delay: i * 170 + (100 - Math.min(100, s.dist)) * 5, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards"
        }));
      });
    }
  }
  async function build(eff) {
    setMode("build"); setActive(-1);
    panels.forEach(function (p, i) { enter(p, i, eff); });
    var total = eff === "assemble" ? 2600 : 900 + (panels.length - 1) * 150;
    await sleep(total + 150);
    panels.forEach(function (p, i) {
      p.classList.remove("is-shards");
      data[i].shards.forEach(function (s) { s.el.getAnimations().forEach(function (a) { a.cancel(); }); });
    });
  }
  async function tour() {
    setMode("tour");
    for (var i = 0; i < panels.length; i++) {
      setActive(i);
      await sleep(TOUR_MS + 150);
    }
    setActive(-1);
  }
  async function all() {
    setMode("all");
    stage.classList.remove("is-shine"); void stage.offsetWidth; stage.classList.add("is-shine");
    await sleep(2800);
    stage.classList.remove("is-shine");
  }
  async function breakPanel(p, i) {
    var d = data[i];
    prepShards(i);
    p.classList.add("is-cracking");
    track(p.animate([{ transform: "translateX(0)" }, { transform: "translateX(-3px)" }, { transform: "translateX(3px)" }, { transform: "translateX(-2px)" }, { transform: "none" }], { duration: 360 }));
    await sleep(400);
    p.classList.add("is-shards");
    p.classList.remove("is-cracking");
    track(d.flash.animate([{ opacity: .55 }, { opacity: 0 }], { duration: 260, easing: "ease-out" }));
    d.shards.forEach(function (s) {
      track(s.el.animate([{ transform: "none", opacity: 1 }, { transform: s.end, opacity: 0 }], {
        duration: s.dur, delay: s.dist * 6, easing: "cubic-bezier(.5,0,.9,.5)", fill: "forwards"
      }));
    });
    await sleep(1500);
    p.classList.add("is-off");
    p.classList.remove("is-shards");
    d.shards.forEach(function (s) { s.el.getAnimations().forEach(function (a) { a.cancel(); }); });
  }
  async function shatter() {
    setMode("shatter"); setActive(-1);
    await Promise.all(panels.map(function (p, i) { return sleep(i * 520).then(function () { return breakPanel(p, i); }); }));
  }

  async function loop() {
    var mine = ++token, cycle = 0;
    var effects = ["assemble", "wipe", "assemble", "zoom"];
    while (mine === token) {
      var eff = cycle === 0 ? "rise" : effects[(cycle - 1) % effects.length];
      await build(eff); if (mine !== token) return;
      await tour(); if (mine !== token) return;
      await all(); if (mine !== token) return;
      await shatter(); if (mine !== token) return;
      await sleep(700);
      cycle++;
    }
  }

  function startStill() {
    root.classList.add("is-static");
    setMode("all");
    panels.forEach(function (p) { p.classList.remove("is-off"); p.setAttribute("tabindex", "0"); });
  }

  tog.addEventListener("click", function () { userPaused = !userPaused; labels(); apply(); });
  stage.addEventListener("mouseenter", function () { hovering = true; apply(); });
  stage.addEventListener("mouseleave", function () { hovering = false; apply(); });
  stage.addEventListener("focusin", function () { hovering = true; apply(); });
  stage.addEventListener("focusout", function () { hovering = false; apply(); });
  document.addEventListener("visibilitychange", function () { visible = !document.hidden; apply(); });
  new MutationObserver(labels).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  window.addEventListener("load", labels);
  labels();

  if (still) { startStill(); return; }

  // start only when scrolled near, so the pictures are not fetched for nothing
  var started = false;
  function begin() { if (started) return; started = true; panels.forEach(function (p) { var im = p.querySelector("img"); if (im) im.loading = "eager"; }); panels.forEach(function (p) { p.classList.add("is-off"); }); loop(); }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) {
      inView = en[0].isIntersecting; if (inView) begin(); apply();
    }, { threshold: 0.3 }).observe(stage);
  } else { inView = true; begin(); }
})();
