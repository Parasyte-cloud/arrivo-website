// UX polish: account menu behaviour and the few strings added by the audit.
// Strings live here (all seven languages) so the big i18n files stay untouched.
(function () {
  "use strict";
  var T = {
    en: { signIn: "Sign in", signInAs: "Sign in as", riderHint: "Book and track your rides", driverLogin: "Driver login", driverHint: "Go online and see your earnings", applyHint: "Apply in about 10 minutes", becomeDriver: "Become a driver", becomeDriverArrow: "Become a driver →", accountLabel: "Account", riderTag: "Rider", driverTag: "Driver", contactUs: "Contact us", contactBtn: "Send us a message", joinMember: "Become a member", pickLabel: "Five ways to move. Tap one to start.", actRide: "Book an airport pickup", actExpress: "Get a ride right now", actRemovals: "Get a moving quote", actBoat: "Charter a boat", actAir: "Request a private jet", ctaExpress: "Book an Express ride →", ctaBook: "Book a ride →", alreadyDriver: "Already driving with us? Log in", account: "Account" },
    fr: { signIn: "Se connecter", signInAs: "Se connecter en tant que", riderHint: "Réservez et suivez vos courses", driverLogin: "Connexion chauffeur", driverHint: "Passez en ligne et suivez vos gains", applyHint: "Candidature en 10 minutes environ", becomeDriver: "Devenir chauffeur", becomeDriverArrow: "Devenir chauffeur →", accountLabel: "Compte", riderTag: "Passager", driverTag: "Chauffeur", contactUs: "Nous contacter", contactBtn: "Envoyez-nous un message", joinMember: "Devenir membre", pickLabel: "Cinq façons de vous déplacer. Touchez-en une pour commencer.", actRide: "Réserver une prise en charge à l'aéroport", actExpress: "Obtenir une course tout de suite", actRemovals: "Obtenir un devis de déménagement", actBoat: "Affréter un bateau", actAir: "Demander un jet privé", ctaExpress: "Réserver une course Express →", ctaBook: "Réserver une course →", alreadyDriver: "Déjà chauffeur chez nous ? Connectez-vous", account: "Compte" },
    zh: { signIn: "登录", signInAs: "选择登录身份", riderHint: "预订并跟踪行程", driverLogin: "司机登录", driverHint: "上线接单并查看收入", applyHint: "约 10 分钟完成申请", becomeDriver: "成为司机", becomeDriverArrow: "成为司机 →", accountLabel: "账户", riderTag: "乘客", driverTag: "司机", contactUs: "联系我们", contactBtn: "给我们留言", joinMember: "成为会员", pickLabel: "五种出行方式，点一下即可开始。", actRide: "预订机场接送", actExpress: "立即叫车", actRemovals: "获取搬家报价", actBoat: "包船出行", actAir: "申请私人飞机", ctaExpress: "预订 Express 行程 →", ctaBook: "预订行程 →", alreadyDriver: "已是司机？请登录", account: "账户" },
    hi: { signIn: "साइन इन", signInAs: "इस रूप में साइन इन करें", riderHint: "राइड बुक करें और ट्रैक करें", driverLogin: "ड्राइवर लॉगिन", driverHint: "ऑनलाइन जाएँ और कमाई देखें", applyHint: "लगभग 10 मिनट में आवेदन करें", becomeDriver: "ड्राइवर बनें", becomeDriverArrow: "ड्राइवर बनें →", accountLabel: "खाता", riderTag: "राइडर", driverTag: "ड्राइवर", contactUs: "संपर्क करें", contactBtn: "हमें संदेश भेजें", joinMember: "सदस्य बनें", pickLabel: "सफ़र के पाँच तरीके। शुरू करने के लिए किसी एक पर टैप करें।", actRide: "एयरपोर्ट पिकअप बुक करें", actExpress: "अभी राइड पाएँ", actRemovals: "शिफ्टिंग का कोट पाएँ", actBoat: "नाव किराए पर लें", actAir: "प्राइवेट जेट का अनुरोध करें", ctaExpress: "Express राइड बुक करें →", ctaBook: "राइड बुक करें →", alreadyDriver: "पहले से ड्राइवर हैं? लॉग इन करें", account: "खाता" },
    de: { signIn: "Anmelden", signInAs: "Anmelden als", riderHint: "Fahrten buchen und verfolgen", driverLogin: "Fahrer-Login", driverHint: "Online gehen und Einnahmen sehen", applyHint: "Bewerbung in etwa 10 Minuten", becomeDriver: "Fahrer werden", becomeDriverArrow: "Fahrer werden →", accountLabel: "Konto", riderTag: "Fahrgast", driverTag: "Fahrer", contactUs: "Kontakt", contactBtn: "Nachricht senden", joinMember: "Mitglied werden", pickLabel: "Fünf Wege, unterwegs zu sein. Tippen Sie einen an, um zu starten.", actRide: "Flughafenabholung buchen", actExpress: "Sofort eine Fahrt bekommen", actRemovals: "Umzugsangebot einholen", actBoat: "Boot chartern", actAir: "Privatjet anfragen", ctaExpress: "Express-Fahrt buchen →", ctaBook: "Fahrt buchen →", alreadyDriver: "Schon Fahrer bei uns? Anmelden", account: "Konto" },
    es: { signIn: "Iniciar sesión", signInAs: "Iniciar sesión como", riderHint: "Reserva y sigue tus viajes", driverLogin: "Acceso de conductor", driverHint: "Conéctate y consulta tus ganancias", applyHint: "Solicitud en unos 10 minutos", becomeDriver: "Hazte conductor", becomeDriverArrow: "Hazte conductor →", accountLabel: "Cuenta", riderTag: "Pasajero", driverTag: "Conductor", contactUs: "Contáctanos", contactBtn: "Envíanos un mensaje", joinMember: "Hazte miembro", pickLabel: "Cinco formas de moverte. Toca una para empezar.", actRide: "Reservar recogida en el aeropuerto", actExpress: "Pedir un viaje ahora", actRemovals: "Pedir presupuesto de mudanza", actBoat: "Alquilar un barco", actAir: "Solicitar un jet privado", ctaExpress: "Reservar viaje Express →", ctaBook: "Reservar un viaje →", alreadyDriver: "¿Ya conduces con nosotros? Inicia sesión", account: "Cuenta" },
    pt: { signIn: "Entrar", signInAs: "Entrar como", riderHint: "Reserve e acompanhe suas corridas", driverLogin: "Login de motorista", driverHint: "Fique online e veja seus ganhos", applyHint: "Inscrição em cerca de 10 minutos", becomeDriver: "Seja motorista", becomeDriverArrow: "Seja motorista →", accountLabel: "Conta", riderTag: "Passageiro", driverTag: "Motorista", contactUs: "Fale conosco", contactBtn: "Envie uma mensagem", joinMember: "Torne-se membro", pickLabel: "Cinco formas de se locomover. Toque em uma para começar.", actRide: "Reservar busca no aeroporto", actExpress: "Pedir uma corrida agora", actRemovals: "Pedir orçamento de mudança", actBoat: "Fretar um barco", actAir: "Solicitar um jato particular", ctaExpress: "Reservar corrida Express →", ctaBook: "Reservar uma corrida →", alreadyDriver: "Já é motorista conosco? Entre", account: "Conta" }
  };
  var KEY = "arrivo_site_lang";

  function lang() {
    var l = null;
    try { l = localStorage.getItem(KEY); } catch (e) {}
    if (!l || !T[l]) l = (document.documentElement.lang || "").slice(0, 2);
    return T[l] ? l : "en";
  }
  function signedIn() {
    try { return !!localStorage.getItem("arrivo_rider_token"); } catch (e) { return false; }
  }
  function apply() {
    var d = T[lang()];
    var nodes = document.querySelectorAll("[data-ux]");
    for (var i = 0; i < nodes.length; i++) {
      var v = d[nodes[i].getAttribute("data-ux")];
      if (v != null) nodes[i].textContent = v;
    }
    var trig = document.getElementById("acctTriggerText");
    if (trig && signedIn()) trig.textContent = d.account;
  }

  function initMenu() {
    var dd = document.getElementById("acctDropdown");
    var btn = document.getElementById("acctTrigger");
    var menu = document.getElementById("acctMenu");
    if (!dd || !btn || !menu) return;
    function close() { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); }
    function open() { menu.hidden = false; btn.setAttribute("aria-expanded", "true"); }
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (menu.hidden) open(); else close();
    });
    document.addEventListener("click", function (e) { if (!dd.contains(e.target)) close(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !menu.hidden) { close(); btn.focus(); }
    });
    menu.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("a")) close(); });
  }

  function start() {
    apply();
    initMenu();
    // script.js changes <html lang> when the visitor switches language.
    new MutationObserver(apply).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    // Re-apply once other scripts finish labelling the account link.
    window.addEventListener("load", apply);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
