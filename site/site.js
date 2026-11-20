// Stranice sajta: izbor jezika (isti ključ kao u aplikaciji) i dugmad za kopiranje adrese.
(function () {
  var LANGS = ["sr", "en", "ru"], root = document.documentElement;
  function detect() {
    var q = (location.search.match(/[?&]lang=(sr|en|ru)\b/) || [])[1];
    if (q) return q;
    try { var s = localStorage.getItem("rekomp-lang"); if (LANGS.indexOf(s) >= 0) return s; } catch (e) { /* privatni režim */ }
    var n = (navigator.language || "sr").slice(0, 2).toLowerCase();
    if (n === "ru" || n === "uk" || n === "be") return "ru";
    if (n === "sr" || n === "hr" || n === "bs" || n === "me") return "sr";
    return "en";
  }
  function apply(l, persist) {
    root.setAttribute("data-lang", l);
    root.lang = l === "sr" ? "sr-Latn" : l;
    var title = root.getAttribute("data-title-" + l); if (title) document.title = title;
    var desc = root.getAttribute("data-desc-" + l), m = document.querySelector('meta[name="description"]'); if (desc && m) m.setAttribute("content", desc);
    document.querySelectorAll("[data-set-lang]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-set-lang") === l)); });
    if (persist) { try { localStorage.setItem("rekomp-lang", l); } catch (e) { /* privatni režim */ } }
  }
  apply(detect(), false);
  document.querySelectorAll("[data-set-lang]").forEach(function (b) {
    b.addEventListener("click", function () { apply(b.getAttribute("data-set-lang"), true); });
  });
  document.querySelectorAll("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var txt = b.getAttribute("data-copy"), ok = b.parentNode.querySelector(".s-copy-ok");
      var done = function () { if (ok) { ok.hidden = false; setTimeout(function () { ok.hidden = true; }, 2500); } };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { select(b); });
      else select(b);
    });
  });
  function select(b) {
    var c = b.parentNode.querySelector("code"); if (!c) return;
    var r = document.createRange(); r.selectNodeContents(c); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }
})();
