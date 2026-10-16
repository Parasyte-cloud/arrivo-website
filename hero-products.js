/*
 * Hero product row: a slow right-to-left ticker of the RideArrivo family.
 * Each item is a button that opens a small card explaining the product,
 * with one clear button to go there. If this script fails, the original
 * .hero-chips row stays visible and keeps working.
 */
(function () {
  "use strict";

  var KEY = "arrivo_site_lang";
  var SPEED = 28; /* pixels per second: slow enough to read and tap */

  /* status: "live" or "soon". Change these two words when a product launches. */
  var PRODUCTS = [
    { k: "ride",      name: "RideArrivo",      icon: "i-car",    href: "book.html",                                   status: "live" },
    { k: "express",   name: "ArrivoExpress",   icon: "i-bolt",   href: "https://express.ridearrivo.com/?theme=dark",  status: "live" },
    { k: "removals",  name: "ArrivoRemovals",  icon: "i-truck",  href: "https://move.ridearrivo.com/?theme=dark",     status: "soon" },
    { k: "chauffeur", name: "ArrivoChauffeur", icon: "i-shield", href: "charter-booking.html",                        status: "live" },
    { k: "boat",      name: "ArrivoBoat",      icon: "i-ship",   href: "https://boat.ridearrivo.com/?theme=dark",     status: "soon" },
    { k: "air",       name: "ArrivoAir",       icon: "i-plane",  href: "https://air.ridearrivo.com/?theme=dark",      status: "soon" }
  ];

  var T = {
    en: {
      lead: "Our services. Tap one to learn more.",
      book: "Book a ride", open: "Open", live: "Live", soon: "Coming soon", close: "Close",
      pause: "Pause scrolling", play: "Resume scrolling",
      ride: ["Airport pickups and everyday rides", "Verified drivers meet you at the airport, you track the ride live, and you can share the trip with someone who cares."],
      express: ["On-demand city rides", "Get a ride across the city in minutes, with a verified driver and live tracking."],
      removals: ["House and office moves", "A trained crew and the right vehicle to move your home or office."],
      chauffeur: ["Chauffeur and charter", "Book a professional chauffeur and a vehicle for the hour, the day or a special occasion."],
      boat: ["Travel by water", "Our water transport service. We are building it now."],
      air: ["Travel by air", "Our air travel service. We are building it now."]
    },
    fr: {
      lead: "Nos services. Touchez-en un pour en savoir plus.",
      book: "Réserver une course", open: "Ouvrir", live: "Disponible", soon: "Bientôt", close: "Fermer",
      pause: "Mettre le défilement en pause", play: "Reprendre le défilement",
      ride: ["Transferts aéroport et trajets du quotidien", "Des chauffeurs vérifiés vous accueillent à l'aéroport, vous suivez la course en direct et vous pouvez partager le trajet avec un proche."],
      express: ["Courses en ville à la demande", "Une course à travers la ville en quelques minutes, avec un chauffeur vérifié et un suivi en direct."],
      removals: ["Déménagements maison et bureau", "Une équipe formée et le bon véhicule pour déménager votre domicile ou votre bureau."],
      chauffeur: ["Chauffeur et location privée", "Réservez un chauffeur professionnel et un véhicule à l'heure, à la journée ou pour une occasion spéciale."],
      boat: ["Voyager par voie d'eau", "Notre service de transport par eau. Nous le construisons actuellement."],
      air: ["Voyager par les airs", "Notre service de transport aérien. Nous le construisons actuellement."]
    },
    es: {
      lead: "Nuestros servicios. Toca uno para saber más.",
      book: "Reservar un viaje", open: "Abrir", live: "Disponible", soon: "Próximamente", close: "Cerrar",
      pause: "Pausar el desplazamiento", play: "Reanudar el desplazamiento",
      ride: ["Recogidas en el aeropuerto y viajes diarios", "Conductores verificados te reciben en el aeropuerto, sigues el viaje en vivo y puedes compartirlo con alguien que se preocupa por ti."],
      express: ["Viajes urbanos a demanda", "Un viaje por la ciudad en minutos, con conductor verificado y seguimiento en vivo."],
      removals: ["Mudanzas de casa y oficina", "Un equipo capacitado y el vehículo adecuado para mudar tu hogar u oficina."],
      chauffeur: ["Chófer y alquiler privado", "Reserva un chófer profesional y un vehículo por horas, por días o para una ocasión especial."],
      boat: ["Viaja por agua", "Nuestro servicio de transporte acuático. Lo estamos construyendo ahora."],
      air: ["Viaja por aire", "Nuestro servicio de transporte aéreo. Lo estamos construyendo ahora."]
    },
    pt: {
      lead: "Nossos serviços. Toque em um para saber mais.",
      book: "Reservar uma corrida", open: "Abrir", live: "Disponível", soon: "Em breve", close: "Fechar",
      pause: "Pausar a rolagem", play: "Retomar a rolagem",
      ride: ["Transfers de aeroporto e corridas do dia a dia", "Motoristas verificados recebem você no aeroporto, você acompanha a corrida ao vivo e pode compartilhar a viagem com quem se importa com você."],
      express: ["Corridas urbanas sob demanda", "Uma corrida pela cidade em minutos, com motorista verificado e acompanhamento ao vivo."],
      removals: ["Mudanças de casa e escritório", "Uma equipe treinada e o veículo certo para mudar sua casa ou escritório."],
      chauffeur: ["Motorista particular e fretamento", "Reserve um motorista profissional e um veículo por hora, por dia ou para uma ocasião especial."],
      boat: ["Viaje pela água", "Nosso serviço de transporte aquático. Estamos construindo agora."],
      air: ["Viaje pelo ar", "Nosso serviço de transporte aéreo. Estamos construindo agora."]
    },
    de: {
      lead: "Unsere Services. Tippen Sie auf einen, um mehr zu erfahren.",
      book: "Fahrt buchen", open: "Öffnen", live: "Verfügbar", soon: "Demnächst", close: "Schließen",
      pause: "Bildlauf anhalten", play: "Bildlauf fortsetzen",
      ride: ["Flughafenabholung und Alltagsfahrten", "Geprüfte Fahrer holen Sie am Flughafen ab, Sie verfolgen die Fahrt live und können sie mit einer Vertrauensperson teilen."],
      express: ["Stadtfahrten auf Abruf", "Eine Fahrt durch die Stadt in wenigen Minuten, mit geprüftem Fahrer und Live-Tracking."],
      removals: ["Umzüge für Haus und Büro", "Ein geschultes Team und das passende Fahrzeug für Ihren Umzug."],
      chauffeur: ["Chauffeur und Charter", "Buchen Sie einen professionellen Chauffeur samt Fahrzeug für Stunden, Tage oder einen besonderen Anlass."],
      boat: ["Reisen auf dem Wasser", "Unser Wassertransport-Service. Wir bauen ihn gerade auf."],
      air: ["Reisen in der Luft", "Unser Luftverkehrs-Service. Wir bauen ihn gerade auf."]
    },
    zh: {
      lead: "我们的服务。点按任意一项了解更多。",
      book: "预订行程", open: "打开", live: "已上线", soon: "即将推出", close: "关闭",
      pause: "暂停滚动", play: "继续滚动",
      ride: ["机场接送与日常出行", "经过验证的司机在机场接您，您可以实时查看行程，并与关心您的人分享。"],
      express: ["按需城市出行", "几分钟内即可乘车穿行全城，司机经过验证，并支持实时追踪。"],
      removals: ["家庭与办公室搬迁", "专业培训的团队和合适的车辆，帮您搬家或搬办公室。"],
      chauffeur: ["专车司机与包车", "按小时、按天或为特殊场合预订专业司机和车辆。"],
      boat: ["水上出行", "我们的水上交通服务，正在建设中。"],
      air: ["空中出行", "我们的航空出行服务，正在建设中。"]
    },
    hi: {
      lead: "हमारी सेवाएँ। ज़्यादा जानने के लिए किसी एक पर टैप करें।",
      book: "राइड बुक करें", open: "खोलें", live: "उपलब्ध", soon: "जल्द आ रहा है", close: "बंद करें",
      pause: "स्क्रॉल रोकें", play: "स्क्रॉल फिर शुरू करें",
      ride: ["एयरपोर्ट पिकअप और रोज़ की राइड", "सत्यापित ड्राइवर आपको एयरपोर्ट पर मिलते हैं, आप राइड को लाइव ट्रैक करते हैं और अपने किसी अपने के साथ यात्रा साझा कर सकते हैं।"],
      express: ["ज़रूरत पर शहर में राइड", "कुछ ही मिनटों में शहर भर में राइड पाएँ, सत्यापित ड्राइवर और लाइव ट्रैकिंग के साथ।"],
      removals: ["घर और ऑफ़िस शिफ़्टिंग", "आपके घर या ऑफ़िस को शिफ़्ट करने के लिए प्रशिक्षित टीम और सही वाहन।"],
      chauffeur: ["शोफ़र और चार्टर", "घंटे, दिन या किसी ख़ास मौके के लिए पेशेवर ड्राइवर और वाहन बुक करें।"],
      boat: ["जल मार्ग से यात्रा", "हमारी जल परिवहन सेवा। हम इसे अभी बना रहे हैं।"],
      air: ["हवाई यात्रा", "हमारी हवाई यात्रा सेवा। हम इसे अभी बना रहे हैं।"]
    }
  };

  var nav = document.querySelector(".hero-chips");
  var probe = document.createElement("dialog");
  if (!nav || typeof probe.showModal !== "function") return; /* keep the original chips */

  function lang() {
    var v = null;
    try { v = localStorage.getItem(KEY); } catch (e) {}
    if (!T[v]) v = (document.documentElement.lang || "en").slice(0, 2);
    return T[v] ? v : "en";
  }
  function copy() { return T[lang()]; }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function icon(id) {
    var s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("class", "ico");
    s.setAttribute("aria-hidden", "true");
    s.setAttribute("focusable", "false");
    var u = document.createElementNS("http://www.w3.org/2000/svg", "use");
    u.setAttribute("href", "#" + id);
    s.appendChild(u);
    return s;
  }
  function chevron() {
    var s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("class", "hp-chev");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("aria-hidden", "true");
    s.setAttribute("focusable", "false");
    var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", "M9 5l7 7-7 7");
    s.appendChild(p);
    return s;
  }

  /* ---------- the ticker ---------- */
  var root = el("div", "hp");
  root.setAttribute("role", "region");
  var head = el("div", "hp-head");
  var lead = el("p", "hp-lead");
  var toggle = el("button", "hp-toggle");
  toggle.type = "button";
  toggle.setAttribute("aria-pressed", "false");
  toggle.innerHTML =
    '<svg class="hp-i-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>' +
    '<svg class="hp-i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg>';
  head.appendChild(lead);
  head.appendChild(toggle);

  var view = el("div", "hp-view");
  var track = el("div", "hp-track");
  view.appendChild(track);
  root.appendChild(head);
  root.appendChild(view);

  function makeChip(p, clone) {
    var b = el("button", "hp-chip");
    b.type = "button";
    b.setAttribute("data-k", p.k);
    b.setAttribute("aria-haspopup", "dialog");
    b.appendChild(icon(p.icon));
    var col = el("span", "hp-chip-text");
    col.appendChild(el("span", "hp-chip-name", p.name));
    col.appendChild(el("span", "hp-chip-tag"));
    b.appendChild(col);
    b.appendChild(chevron());
    if (clone) {
      b.setAttribute("aria-hidden", "true");
      b.tabIndex = -1;
      b.className += " hp-clone";
    }
    return b;
  }
  PRODUCTS.forEach(function (p) { track.appendChild(makeChip(p, false)); });
  PRODUCTS.forEach(function (p) { track.appendChild(makeChip(p, true)); });

  /* ---------- the product card ---------- */
  var dlg = el("dialog", "hp-sheet");
  dlg.setAttribute("aria-labelledby", "hpSheetName");
  var sIcon = el("span", "hp-sheet-icon");
  var sName = el("h3", "hp-sheet-name"); sName.id = "hpSheetName";
  var sStatus = el("span", "hp-status");
  var sTag = el("p", "hp-sheet-tag");
  var sDesc = el("p", "hp-sheet-desc");
  var sGo = el("a", "hp-go");
  var sClose = el("button", "hp-close"); sClose.type = "button";
  var sTop = el("div", "hp-sheet-top");
  var sTitle = el("div", "hp-sheet-title");
  sTitle.appendChild(sName); sTitle.appendChild(sStatus);
  sTop.appendChild(sIcon); sTop.appendChild(sTitle);
  var sActions = el("div", "hp-sheet-actions");
  sActions.appendChild(sGo); sActions.appendChild(sClose);
  dlg.appendChild(sTop); dlg.appendChild(sTag); dlg.appendChild(sDesc); dlg.appendChild(sActions);

  var openKey = "";
  function productByKey(k) {
    for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].k === k) return PRODUCTS[i];
    return null;
  }
  function fillSheet() {
    var p = productByKey(openKey);
    if (!p) return;
    var c = copy();
    sIcon.textContent = "";
    sIcon.appendChild(icon(p.icon));
    sName.textContent = p.name;
    sStatus.textContent = p.status === "live" ? c.live : c.soon;
    sStatus.setAttribute("data-status", p.status);
    sTag.textContent = c[p.k][0];
    sDesc.textContent = c[p.k][1];
    sGo.textContent = (p.k === "ride" ? c.book : c.open + " " + p.name) + " →";
    sGo.href = p.href;
    if (/^https?:/.test(p.href)) { sGo.target = "_blank"; sGo.rel = "noopener"; }
    else { sGo.removeAttribute("target"); sGo.removeAttribute("rel"); }
    sClose.textContent = c.close;
  }
  function openSheet(k) {
    openKey = k;
    fillSheet();
    document.documentElement.classList.add("hp-lock");
    if (!dlg.open) dlg.showModal();
    sGo.focus();
  }
  dlg.addEventListener("close", function () {
    document.documentElement.classList.remove("hp-lock");
    openKey = "";
  });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  sClose.addEventListener("click", function () { dlg.close(); });

  track.addEventListener("click", function (e) {
    var chip = e.target.closest(".hp-chip");
    if (chip) openSheet(chip.getAttribute("data-k"));
  });

  /* ---------- motion: pause on touch, pause button, speed from width ---------- */
  var touchTimer = 0;
  root.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "mouse") return;
    window.clearTimeout(touchTimer);
    root.classList.add("hp-touch");
  });
  function releaseTouch() {
    window.clearTimeout(touchTimer);
    touchTimer = window.setTimeout(function () { root.classList.remove("hp-touch"); }, 2500);
  }
  root.addEventListener("pointerup", releaseTouch);
  root.addEventListener("pointercancel", releaseTouch);

  toggle.addEventListener("click", function () {
    var on = root.getAttribute("data-paused") === "true";
    if (on) root.removeAttribute("data-paused"); else root.setAttribute("data-paused", "true");
    toggle.setAttribute("aria-pressed", on ? "false" : "true");
    apply();
  });

  function setSpeed() {
    var half = track.scrollWidth / 2;
    if (half > 0) track.style.animationDuration = Math.round(half / SPEED) + "s";
  }

  /* ---------- text ---------- */
  function apply() {
    var c = copy();
    lead.textContent = c.lead;
    root.setAttribute("aria-label", c.lead);
    var paused = root.getAttribute("data-paused") === "true";
    toggle.setAttribute("aria-label", paused ? c.play : c.pause);
    toggle.title = paused ? c.play : c.pause;
    var chips = track.querySelectorAll(".hp-chip");
    for (var i = 0; i < chips.length; i++) {
      var p = productByKey(chips[i].getAttribute("data-k"));
      var tag = c[p.k][0];
      chips[i].querySelector(".hp-chip-tag").textContent = tag;
      if (!chips[i].classList.contains("hp-clone")) chips[i].setAttribute("aria-label", p.name + ", " + tag);
    }
    if (openKey) fillSheet();
    setSpeed();
  }

  nav.parentNode.insertBefore(root, nav.nextSibling);
  document.body.appendChild(dlg);
  document.documentElement.classList.add("hp-on");
  apply();

  new MutationObserver(apply).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  window.addEventListener("storage", apply);
  window.addEventListener("resize", setSpeed);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setSpeed);
})();
