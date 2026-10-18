// Tap a step picture to see it bigger, with its title and a short line.
(function () {
  "use strict";
  var dlg = document.getElementById("ltStepDlg");
  if (!dlg || typeof dlg.showModal !== "function") return;
  var img = document.getElementById("ltStepImg");
  var nEl = document.getElementById("ltStepN");
  var tEl = document.getElementById("ltStepTitle");
  var bEl = document.getElementById("ltStepBody");
  var cur = 1, last = 5;

  function words() {
    var lang = (document.documentElement.lang || "en").slice(0, 2);
    var d = (typeof I18N !== "undefined" && (I18N[lang] || I18N.en)) || {};
    return d.home || {};
  }
  function show(n) {
    cur = Math.max(1, Math.min(last, n));
    var h = words();
    var en = (typeof I18N !== "undefined" && I18N.en && I18N.en.home) || {};
    img.src = "assets/how/how-step" + cur + "-860.webp";
    nEl.textContent = cur + " / " + last;
    tEl.textContent = h["step" + cur + "Title"] || en["step" + cur + "Title"] || "";
    bEl.textContent = h["step" + cur + "Body"] || en["step" + cur + "Body"] || "";
    dlg.querySelector('[data-act="prev"]').disabled = cur === 1;
    dlg.querySelector('[data-act="next"]').disabled = cur === last;
  }
  function open(n) {
    show(n);
    var x = dlg.querySelector(".lt-dlg-x");
    var lang = (document.documentElement.lang || "en").slice(0, 2);
    var d = (typeof I18N !== "undefined" && I18N[lang] && I18N[lang].lite) || {};
    x.setAttribute("aria-label", d.close || "Close");
    document.documentElement.classList.add("lt-lock");
    dlg.showModal();
  }
  function close() { if (dlg.open) dlg.close(); }

  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".lt-step-btn");
    if (b) { open(parseInt(b.getAttribute("data-step"), 10) || 1); return; }
    if (e.target === dlg) { close(); return; }
    var a = e.target.closest && e.target.closest("#ltStepDlg [data-act]");
    if (!a) return;
    var act = a.getAttribute("data-act");
    if (act === "close") close();
    else if (act === "prev") show(cur - 1);
    else if (act === "next") show(cur + 1);
  });
  dlg.addEventListener("close", function () { document.documentElement.classList.remove("lt-lock"); });
  dlg.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") show(cur + 1);
    if (e.key === "ArrowLeft") show(cur - 1);
  });
})();
