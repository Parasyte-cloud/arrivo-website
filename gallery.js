/* Home gallery slideshow (section #gallery).

   TO CHANGE THE PICTURES: edit the <figure class="gal-slide"> items in index.html.
   Each one needs an <img> (a 1200px and a 640px webp) and a caption. The slide
   count, progress bars and counter all follow the markup, nothing to change here.

   How it moves: the active progress bar fills over INTERVAL and, when it ends,
   the next picture comes in. Pausing the bar pauses everything, so timing never
   drifts. It only runs while the section is on screen and the tab is visible,
   stops on hover and keyboard focus, and has a pause button. With "reduce motion"
   on, or "save data", it never advances by itself; the buttons and swipe still work. */
(function () {
  "use strict";

  var INTERVAL = 6500;

  var CAP = {
    en: ["Met at arrivals, bags handled", "Step in, sit back, relax", "Follow every trip live", "Arrive the way you planned"],
    fr: ["Accueilli aux arrivées, bagages pris en charge", "Montez, installez-vous, détendez-vous", "Suivez chaque course en direct", "Arrivez comme prévu"],
    zh: ["到达厅迎接，行李有人照看", "上车坐稳，放松身心", "实时跟踪每一次行程", "从容抵达，如您所愿"],
    hi: ["अराइवल पर स्वागत, सामान की ज़िम्मेदारी हमारी", "बैठिए, आराम कीजिए", "हर सफ़र को लाइव देखिए", "जैसा सोचा था, वैसे पहुँचिए"],
    de: ["Empfang in der Ankunftshalle, Gepäck inklusive", "Einsteigen, zurücklehnen, entspannen", "Jede Fahrt live verfolgen", "So ankommen, wie Sie es geplant haben"],
    es: ["Te recibimos en llegadas y nos encargamos del equipaje", "Sube, relájate y disfruta", "Sigue cada viaje en vivo", "Llega como lo planeaste"],
    pt: ["Recepção no desembarque, bagagem por nossa conta", "Entre, acomode-se e relaxe", "Acompanhe cada corrida ao vivo", "Chegue como planejou"]
  };
  var UI = {
    en: { label: "Photo gallery", prev: "Previous photo", next: "Next photo", pause: "Pause slideshow", play: "Play slideshow", go: "Show photo" },
    fr: { label: "Galerie photo", prev: "Photo précédente", next: "Photo suivante", pause: "Mettre le diaporama en pause", play: "Lancer le diaporama", go: "Afficher la photo" },
    zh: { label: "图片库", prev: "上一张", next: "下一张", pause: "暂停幻灯片", play: "播放幻灯片", go: "显示图片" },
    hi: { label: "फ़ोटो गैलरी", prev: "पिछली फ़ोटो", next: "अगली फ़ोटो", pause: "स्लाइडशो रोकें", play: "स्लाइडशो चलाएँ", go: "फ़ोटो दिखाएँ" },
    de: { label: "Fotogalerie", prev: "Vorheriges Foto", next: "Nächstes Foto", pause: "Diashow anhalten", play: "Diashow starten", go: "Foto anzeigen" },
    es: { label: "Galería de fotos", prev: "Foto anterior", next: "Foto siguiente", pause: "Pausar la presentación", play: "Reanudar la presentación", go: "Mostrar foto" },
    pt: { label: "Galeria de fotos", prev: "Foto anterior", next: "Próxima foto", pause: "Pausar a apresentação", play: "Retomar a apresentação", go: "Mostrar foto" }
  };

  var root = document.getElementById("gallery");
  if (!root) return;
  var stage = root.querySelector(".gal-stage");
  var slides = Array.prototype.slice.call(root.querySelectorAll(".gal-slide"));
  var n = slides.length;
  if (!stage || n < 2) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var conn = navigator.connection || {};
  var noAuto = reduce.matches || !!conn.saveData;
  var cur = 0, userPaused = false, hovering = false, inView = false, visible = !document.hidden, leaving = null;

  function lang() {
    var l = null;
    try { l = localStorage.getItem("arrivo_site_lang"); } catch (e) {}
    if (!l || !UI[l]) l = (document.documentElement.lang || "").slice(0, 2);
    return UI[l] ? l : "en";
  }

  var prev = root.querySelector(".gal-prev"), next = root.querySelector(".gal-next"), tog = root.querySelector(".gal-toggle");
  var bars = root.querySelector(".gal-progress"), counter = root.querySelector(".gal-counter");
  var btns = [];
  bars.innerHTML = "";
  slides.forEach(function (s, i) {
    var li = document.createElement("li"), b = document.createElement("button");
    b.type = "button";
    b.addEventListener("click", function () { go(i, true); });
    li.appendChild(b); li.style.flex = "1"; bars.appendChild(li); btns.push(b);
  });

  function labels() {
    var l = lang(), u = UI[l], c = CAP[l] || CAP.en;
    root.setAttribute("aria-label", u.label);
    prev.setAttribute("aria-label", u.prev);
    next.setAttribute("aria-label", u.next);
    setToggle();
    btns.forEach(function (b, i) { b.setAttribute("aria-label", u.go + " " + (i + 1)); });
    // slide 1 keeps the site-wide "Real vehicles. Real drivers. Real Lagos." line (data-i18n),
    // the others take their caption from this file
    slides.forEach(function (s, i) {
      var h = s.querySelector("h3[data-gal]");
      if (h && c[i - 1]) h.textContent = c[i - 1];
    });
  }
  function setToggle() {
    var u = UI[lang()], paused = userPaused || noAuto;
    tog.setAttribute("aria-label", paused ? u.play : u.pause);
    tog.setAttribute("aria-pressed", paused ? "true" : "false");
    root.classList.toggle("is-paused", paused);
  }

  function render(from) {
    slides.forEach(function (s, i) {
      var on = i === cur;
      s.classList.toggle("is-active", on);
      s.classList.remove("is-leaving");
      s.setAttribute("aria-hidden", on ? "false" : "true");
    });
    if (from != null && from !== cur) {
      slides[from].classList.add("is-leaving");
      clearTimeout(leaving);
      leaving = setTimeout(function () { slides[from].classList.remove("is-leaving"); }, 1400);
    }
    btns.forEach(function (b, i) {
      b.classList.toggle("is-done", i < cur);
      b.classList.remove("is-active");
      b.removeAttribute("aria-current");
    });
    // restart the active bar's animation
    void bars.offsetWidth;
    btns[cur].classList.add("is-active");
    btns[cur].setAttribute("aria-current", "true");
    if (counter) counter.innerHTML = "<b>" + pad(cur + 1) + "</b> / " + pad(n);
    warm((cur + 1) % n);
  }
  function pad(x) { return x < 10 ? "0" + x : "" + x; }

  // make sure the next picture is already downloaded before its turn
  function warm(i) {
    var img = slides[i].querySelector("img");
    if (img && img.loading === "lazy") img.loading = "eager";
  }

  function go(i, byUser) {
    var from = cur;
    cur = (i + n) % n;
    render(from);
    if (byUser) { /* manual choice: keep autoplay state as it was */ }
    sync();
  }

  function running() { return !noAuto && !userPaused && !hovering && inView && visible; }
  function sync() {
    root.classList.toggle("is-static", noAuto);
    root.classList.toggle("is-paused", !running());
  }

  btns.forEach(function (b) {
    b.addEventListener("animationend", function (e) {
      if (e.animationName === "gal-fill" && b.classList.contains("is-active")) go(cur + 1);
    });
  });
  prev.addEventListener("click", function () { go(cur - 1, true); });
  next.addEventListener("click", function () { go(cur + 1, true); });
  tog.addEventListener("click", function () {
    if (noAuto) { noAuto = false; userPaused = false; } else { userPaused = !userPaused; }
    setToggle(); sync();
  });

  stage.addEventListener("mouseenter", function () { hovering = true; sync(); });
  stage.addEventListener("mouseleave", function () { hovering = false; sync(); });
  stage.addEventListener("focusin", function () { hovering = true; sync(); });
  stage.addEventListener("focusout", function () { hovering = false; sync(); });
  stage.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { go(cur + 1, true); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { go(cur - 1, true); e.preventDefault(); }
  });

  // swipe
  var sx = null, sy = null;
  stage.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse") { sx = e.clientX; sy = e.clientY; } });
  stage.addEventListener("pointerup", function (e) {
    if (sx == null) return;
    var dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) go(cur + (dx < 0 ? 1 : -1), true);
  });
  stage.addEventListener("pointercancel", function () { sx = null; });

  document.addEventListener("visibilitychange", function () { visible = !document.hidden; sync(); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) { inView = en[0].isIntersecting; sync(); }, { threshold: 0.35 }).observe(stage);
  } else { inView = true; }
  if (reduce.addEventListener) reduce.addEventListener("change", function () { noAuto = reduce.matches; setToggle(); sync(); });

  // language changes
  new MutationObserver(labels).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  window.addEventListener("load", labels);

  labels();
  render();
  sync();
})();
