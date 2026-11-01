/* Words for the home page, in all nine languages. Short on purpose.
   Keys are data-i18n="h.<key>". Applies on load and whenever <html lang> changes. */
(function () {
  "use strict";
  var LANGS = ["en", "fr", "zh", "hi", "de", "es", "pt", "ar", "tr"];
  var T = {
 "eyebrow": [
  "Premium mobility in Lagos",
  "Mobilité premium à Lagos",
  "拉各斯高端出行",
  "लागोस में प्रीमियम मोबिलिटी",
  "Premium-Mobilität in Lagos",
  "Movilidad premium en Lagos",
  "Mobilidade premium em Lagos",
  "تنقّل راقٍ في لاغوس",
  "Lagos'ta premium ulaşım"
 ],
 "headline": [
  "Airport Transfers, Rides &amp; Chauffeur Services in Lagos",
  "Transferts aéroport, trajets &amp; chauffeur privé à Lagos",
  "拉各斯机场接送、出行与专车司机服务",
  "लागोस में एयरपोर्ट ट्रांसफर, राइड और शॉफर सेवाएँ",
  "Flughafentransfers, Fahrten &amp; Chauffeurservice in Lagos",
  "Traslados de aeropuerto, viajes y chófer en Lagos",
  "Transfers de aeroporto, viagens e motorista em Lagos",
  "نقل من وإلى المطار ورحلات وسائق خاص في لاغوس",
  "Lagos'ta havalimanı transferi, yolculuk ve şoför hizmeti"
 ],
 "sub": [
  "Verified drivers, live tracking and upfront prices.",
  "Chauffeurs vérifiés, suivi en direct, prix annoncés.",
  "认证司机、实时追踪、价格透明。",
  "सत्यापित ड्राइवर, लाइव ट्रैकिंग और पहले से तय कीमत।",
  "Geprüfte Fahrer, Live-Tracking, Festpreise.",
  "Conductores verificados, seguimiento en vivo y precio cerrado.",
  "Motoristas verificados, rastreio ao vivo e preço fechado.",
  "سائقون موثّقون، تتبّع مباشر وأسعار واضحة.",
  "Doğrulanmış sürücüler, canlı takip, net fiyat."
 ],
 "chooseTitle": [
  "What do you need?",
  "De quoi avez-vous besoin ?",
  "您需要什么？",
  "आपको क्या चाहिए?",
  "Was brauchen Sie?",
  "¿Qué necesitas?",
  "Do que você precisa?",
  "ماذا تحتاج؟",
  "Neye ihtiyacınız var?"
 ],
 "tabRide": [
  "Ride",
  "Trajet",
  "出行",
  "राइड",
  "Fahrt",
  "Viaje",
  "Viagem",
  "رحلة",
  "Yolculuk"
 ],
 "tabMove": [
  "Move",
  "Déménager",
  "搬家",
  "मूव",
  "Umzug",
  "Mudanza",
  "Mudança",
  "نقل",
  "Taşınma"
 ],
 "tabCharter": [
  "Charter",
  "Affrètement",
  "包租",
  "चार्टर",
  "Charter",
  "Chárter",
  "Fretamento",
  "تأجير",
  "Kiralama"
 ],
 "airport": [
  "Airport transfer",
  "Transfert aéroport",
  "机场接送",
  "एयरपोर्ट ट्रांसफर",
  "Flughafentransfer",
  "Traslado al aeropuerto",
  "Transfer de aeroporto",
  "نقل المطار",
  "Havalimanı transferi"
 ],
 "airportBody": [
  "Flight-aware pickup.",
  "Suivi de votre vol.",
  "随航班动态接送。",
  "फ़्लाइट के अनुसार पिकअप।",
  "Mit Flugverfolgung.",
  "Con seguimiento del vuelo.",
  "Acompanha o seu voo.",
  "استقبال حسب موعد رحلتك.",
  "Uçuşunuzu takip ederiz."
 ],
 "now": [
  "Ride now",
  "Partir maintenant",
  "立即出行",
  "अभी राइड",
  "Jetzt fahren",
  "Viajar ahora",
  "Viajar agora",
  "رحلة الآن",
  "Hemen yola çık"
 ],
 "nowBody": [
  "On demand, with ArrivoExpress.",
  "À la demande, avec ArrivoExpress.",
  "即时用车，ArrivoExpress。",
  "ArrivoExpress से तुरंत।",
  "Sofort, mit ArrivoExpress.",
  "Al instante, con ArrivoExpress.",
  "Na hora, com ArrivoExpress.",
  "فورًا مع ArrivoExpress.",
  "ArrivoExpress ile anında."
 ],
 "later": [
  "Schedule a ride",
  "Planifier un trajet",
  "预约出行",
  "राइड शेड्यूल करें",
  "Fahrt planen",
  "Programar un viaje",
  "Agendar uma viagem",
  "جدولة رحلة",
  "Yolculuk planla"
 ],
 "laterBody": [
  "Book ahead at a fixed fare.",
  "Réservez à l'avance, tarif fixe.",
  "提前预订，价格固定。",
  "पहले बुक करें, तय किराया।",
  "Vorab buchen, Festpreis.",
  "Reserva con precio cerrado.",
  "Reserve com preço fechado.",
  "احجز مسبقًا بسعر ثابت.",
  "Önceden ayırtın, sabit fiyat."
 ],
 "chauffeur": [
  "Chauffeur",
  "Chauffeur",
  "专车司机",
  "शॉफ़र",
  "Chauffeur",
  "Chófer",
  "Motorista",
  "سائق خاص",
  "Şoför"
 ],
 "chauffeurBody": [
  "A driver by the day or week.",
  "Un chauffeur à la journée ou à la semaine.",
  "按天或按周配司机。",
  "दिन या हफ़्ते के लिए ड्राइवर।",
  "Ein Fahrer pro Tag oder Woche.",
  "Un conductor por día o semana.",
  "Um motorista por dia ou semana.",
  "سائق باليوم أو الأسبوع.",
  "Günlük veya haftalık şoför."
 ],
 "removals": [
  "Home or office move",
  "Déménagement maison ou bureau",
  "家庭或办公室搬家",
  "घर या ऑफिस शिफ्टिंग",
  "Wohnungs- oder Büroumzug",
  "Mudanza de casa u oficina",
  "Mudança de casa ou escritório",
  "نقل منزل أو مكتب",
  "Ev veya ofis taşıma"
 ],
 "removalsBody": [
  "Crew and truck, one booking.",
  "Équipe et camion, une réservation.",
  "人员和货车，一次预订。",
  "क्रू और ट्रक, एक बुकिंग।",
  "Team und Lkw, eine Buchung.",
  "Equipo y camión, una reserva.",
  "Equipe e caminhão, uma reserva.",
  "طاقم وشاحنة بحجز واحد.",
  "Ekip ve kamyon, tek rezervasyon."
 ],
 "boat": [
  "Boat charter",
  "Location de bateau",
  "包船",
  "बोट चार्टर",
  "Bootscharter",
  "Chárter de barco",
  "Fretamento de barco",
  "تأجير قارب",
  "Tekne kiralama"
 ],
 "boatBody": [
  "Water transfers and events.",
  "Transferts sur l'eau et événements.",
  "水上接驳与活动。",
  "पानी पर ट्रांसफर और इवेंट।",
  "Wassertransfers und Events.",
  "Traslados por agua y eventos.",
  "Transfers aquáticos e eventos.",
  "تنقّل مائي وفعاليات.",
  "Su transferleri ve etkinlikler."
 ],
 "air": [
  "Air charter",
  "Jet privé",
  "私人飞机包机",
  "एयर चार्टर",
  "Flugcharter",
  "Vuelo privado",
  "Voo fretado",
  "طيران خاص",
  "Özel uçak"
 ],
 "airBody": [
  "Private jets, on request.",
  "Jets privés, sur demande.",
  "私人飞机，按需安排。",
  "निजी जेट, अनुरोध पर।",
  "Privatjets auf Anfrage.",
  "Jets privados, bajo pedido.",
  "Jatos privados, sob pedido.",
  "طائرات خاصة عند الطلب.",
  "İstek üzerine özel jet."
 ],
 "businessTitle": [
  "Moving a team or guest?",
  "Vous déplacez une équipe ou un invité ?",
  "接送团队或贵宾？",
  "टीम या मेहमान को ले जाना है?",
  "Team oder Gast unterwegs?",
  "¿Mueves a un equipo o invitado?",
  "Vai levar uma equipe ou convidado?",
  "تنقل فريقًا أو ضيفًا؟",
  "Ekip veya misafir mi taşıyorsunuz?"
 ],
 "businessBody": [
  "Airport, chauffeur and business travel, handled.",
  "Aéroport, chauffeur et voyages d'affaires, on s'en occupe.",
  "机场、专车与商务出行，一并搞定。",
  "एयरपोर्ट, शॉफ़र और बिज़नेस ट्रैवल, हम संभालते हैं।",
  "Flughafen, Chauffeur und Geschäftsreisen, erledigt.",
  "Aeropuerto, chófer y viajes de empresa, resuelto.",
  "Aeroporto, motorista e viagens de negócios, resolvido.",
  "المطار والسائق وسفر الأعمال، نتولّاها.",
  "Havalimanı, şoför ve iş seyahati, bizden."
 ],
 "businessCta": [
  "Talk to us",
  "Nous contacter",
  "联系我们",
  "हमसे बात करें",
  "Kontakt aufnehmen",
  "Hablemos",
  "Fale conosco",
  "تواصل معنا",
  "Bize ulaşın"
 ],
 "driveTitle": [
  "Drive with RideArrivo",
  "Conduire avec RideArrivo",
  "加入 RideArrivo 当司机",
  "RideArrivo के साथ ड्राइव करें",
  "Fahren mit RideArrivo",
  "Conduce con RideArrivo",
  "Dirija com a RideArrivo",
  "اعمل سائقًا مع RideArrivo",
  "RideArrivo ile sürün"
 ],
 "driveBody": [
  "Join our professional driver network.",
  "Rejoignez notre réseau de chauffeurs.",
  "加入我们的专业司机网络。",
  "हमारे ड्राइवर नेटवर्क से जुड़ें।",
  "Werden Sie Teil unseres Fahrernetzwerks.",
  "Únete a nuestra red de conductores.",
  "Entre na nossa rede de motoristas.",
  "انضم إلى شبكة سائقينا المحترفين.",
  "Profesyonel sürücü ağımıza katılın."
 ],
 "driveCta": [
  "Driver portal",
  "Espace chauffeur",
  "司机入口",
  "ड्राइवर पोर्टल",
  "Fahrerportal",
  "Portal de conductores",
  "Portal do motorista",
  "بوابة السائقين",
  "Sürücü portalı"
 ],
 "faqTitle": [
  "Before you book",
  "Avant de réserver",
  "预订前须知",
  "बुक करने से पहले",
  "Vor der Buchung",
  "Antes de reservar",
  "Antes de reservar",
  "قبل أن تحجز",
  "Rezervasyondan önce"
 ],
 "faqQ1": [
  "What if my flight is delayed?",
  "Et si mon vol est retardé ?",
  "航班延误怎么办？",
  "फ़्लाइट लेट हो जाए तो?",
  "Was, wenn mein Flug Verspätung hat?",
  "¿Y si mi vuelo se retrasa?",
  "E se o meu voo atrasar?",
  "ماذا لو تأخرت رحلتي؟",
  "Uçuşum rötar yaparsa?"
 ],
 "faqA1": [
  "We track your flight, so your driver meets you when you land.",
  "Nous suivons votre vol : votre chauffeur vous attend à l'atterrissage.",
  "我们追踪您的航班，司机会在您落地时接机。",
  "हम आपकी फ़्लाइट ट्रैक करते हैं, ड्राइवर लैंडिंग पर मिलेगा।",
  "Wir verfolgen Ihren Flug, Ihr Fahrer wartet bei der Landung.",
  "Seguimos tu vuelo: tu conductor te espera al aterrizar.",
  "Acompanhamos o seu voo: o motorista espera na chegada.",
  "نتابع رحلتك، فيكون السائق في انتظارك عند الهبوط.",
  "Uçuşunuzu izleriz, sürücü inişte sizi karşılar."
 ],
 "faqQ2": [
  "How do I pay?",
  "Comment payer ?",
  "如何付款？",
  "भुगतान कैसे करूँ?",
  "Wie bezahle ich?",
  "¿Cómo pago?",
  "Como pago?",
  "كيف أدفع؟",
  "Nasıl ödeyeceğim?"
 ],
 "faqA2": [
  "By card, wallet or membership. You see the fare before you confirm.",
  "Par carte, portefeuille ou abonnement. Le tarif s'affiche avant de confirmer.",
  "可用银行卡、钱包或会员，确认前先显示车费。",
  "कार्ड, वॉलेट या मेंबरशिप से। पुष्टि से पहले किराया दिखता है।",
  "Per Karte, Wallet oder Mitgliedschaft. Der Preis steht vorab fest.",
  "Con tarjeta, monedero o membresía. Ves la tarifa antes de confirmar.",
  "Por cartão, carteira ou assinatura. Você vê a tarifa antes de confirmar.",
  "بالبطاقة أو المحفظة أو العضوية. ترى الأجرة قبل التأكيد.",
  "Kart, cüzdan veya üyelikle. Onaydan önce ücreti görürsünüz."
 ],
 "faqQ3": [
  "Can I cancel?",
  "Puis-je annuler ?",
  "可以取消吗？",
  "क्या मैं रद्द कर सकता हूँ?",
  "Kann ich stornieren?",
  "¿Puedo cancelar?",
  "Posso cancelar?",
  "هل يمكنني الإلغاء؟",
  "İptal edebilir miyim?"
 ],
 "faqA3": [
  "Yes. Cancel 48 hours before pickup for a full refund, or get 50% back after that.",
  "Oui. Annulez 48 h avant la prise en charge pour un remboursement total, sinon 50 %.",
  "可以。接送前48小时取消全额退款，之后退50%。",
  "हाँ। पिकअप से 48 घंटे पहले रद्द करें तो पूरा रिफ़ंड, बाद में 50%।",
  "Ja. Bis 48 Stunden vorher volle Erstattung, danach 50 %.",
  "Sí. Cancela 48 horas antes para reembolso total, después recibes el 50 %.",
  "Sim. Cancele 48 horas antes para reembolso total, depois recebe 50%.",
  "نعم. الإلغاء قبل 48 ساعة يمنح استردادًا كاملًا، وبعدها 50%.",
  "Evet. 48 saat öncesine kadar tam iade, sonrasında %50."
 ],
 "faqQ4": [
  "Are the drivers verified?",
  "Les chauffeurs sont-ils vérifiés ?",
  "司机经过认证吗？",
  "क्या ड्राइवर सत्यापित हैं?",
  "Sind die Fahrer geprüft?",
  "¿Los conductores están verificados?",
  "Os motoristas são verificados?",
  "هل السائقون موثّقون؟",
  "Sürücüler doğrulanıyor mu?"
 ],
 "faqA4": [
  "Yes. Every driver passes ID and licence checks, and you can share your trip live.",
  "Oui. Chaque chauffeur passe des contrôles d'identité et de permis, et vous partagez votre trajet en direct.",
  "是的。每位司机都经过身份和驾照核验，您还可实时分享行程。",
  "हाँ। हर ड्राइवर की ID और लाइसेंस जाँच होती है, और आप ट्रिप लाइव शेयर कर सकते हैं।",
  "Ja. Jeder Fahrer besteht ID- und Führerscheinprüfung, Ihre Fahrt teilen Sie live.",
  "Sí. Cada conductor pasa controles de identidad y licencia, y puedes compartir el viaje en vivo.",
  "Sim. Todo motorista passa por checagem de identidade e carteira, e você pode compartilhar a viagem ao vivo.",
  "نعم. يخضع كل سائق لفحص الهوية والرخصة، ويمكنك مشاركة رحلتك مباشرة.",
  "Evet. Her sürücü kimlik ve ehliyet kontrolünden geçer, yolculuğu canlı paylaşabilirsiniz."
 ],
 "fTagline": [
  "Lagos airport pickups, done right.",
  "Transferts aéroport à Lagos, bien faits.",
  "拉各斯机场接送，做到位。",
  "लागोस एयरपोर्ट पिकअप, सही तरीके से।",
  "Flughafenabholung in Lagos, richtig gemacht.",
  "Recogidas en el aeropuerto de Lagos, bien hechas.",
  "Transfers em Lagos, bem feitos.",
  "استقبال مطار لاغوس كما يجب.",
  "Lagos havalimanı transferi, doğru yapılır."
 ],
 "fBook": [
  "Book a ride",
  "Réserver",
  "预订",
  "बुक करें",
  "Buchen",
  "Reservar",
  "Reservar",
  "احجز",
  "Rezervasyon"
 ],
 "fDrive": [
  "Drive",
  "Conduire",
  "司机",
  "ड्राइव",
  "Fahren",
  "Conducir",
  "Dirigir",
  "قيادة",
  "Sürücü"
 ],
 "fBlog": [
  "Blog",
  "Blog",
  "博客",
  "ब्लॉग",
  "Blog",
  "Blog",
  "Blog",
  "المدونة",
  "Blog"
 ],
 "fContact": [
  "Contact",
  "Contact",
  "联系",
  "संपर्क",
  "Kontakt",
  "Contacto",
  "Contato",
  "اتصل بنا",
  "İletişim"
 ],
 "fPrivacy": [
  "Privacy",
  "Confidentialité",
  "隐私",
  "गोपनीयता",
  "Datenschutz",
  "Privacidad",
  "Privacidade",
  "الخصوصية",
  "Gizlilik"
 ],
 "fTerms": [
  "Terms",
  "Conditions",
  "条款",
  "शर्तें",
  "AGB",
  "Términos",
  "Termos",
  "الشروط",
  "Şartlar"
 ],
 "fMade": [
  "Made in Lagos",
  "Fait à Lagos",
  "拉各斯制造",
  "लागोस में निर्मित",
  "Made in Lagos",
  "Hecho en Lagos",
  "Feito em Lagos",
  "صُنع في لاغوس",
  "Lagos'ta yapıldı"
 ]
};
  var KEY = "arrivo_site_lang";
  function lang() {
    var v = "";
    try { v = localStorage.getItem(KEY) || ""; } catch (e) {}
    if (LANGS.indexOf(v) === -1) {
      var h = (document.documentElement.lang || "").slice(0, 2);
      v = LANGS.indexOf(h) !== -1 ? h : "";
    }
    if (!v) { var n = (navigator.language || "en").slice(0, 2); v = LANGS.indexOf(n) !== -1 ? n : "en"; }
    return v;
  }
  function apply() {
    var l = lang(), i = LANGS.indexOf(l);
    if (document.documentElement.lang !== l) { document.documentElement.lang = l; return; }
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    document.querySelectorAll("[data-i18n^='h.']").forEach(function (el) {
      var row = T[el.getAttribute("data-i18n").slice(2)];
      if (row && row[i]) el.innerHTML = row[i];
    });
  }
  window.RA_HOME_T = function (key) { var r = T[key]; return r ? r[LANGS.indexOf(lang())] || r[0] : ""; };
  new MutationObserver(apply).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply); else apply();
})();
