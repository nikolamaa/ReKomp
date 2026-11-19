// Tema aplikacije: tamna (podrazumevana), svetla ili kao telefon. Učitava se pre crtanja strane da ne bi treptalo.
(function () {
  var KEY = "rekomp-theme", COLORS = { dark: "#141D26", light: "#FFFFFF" };
  var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;
  function pref() { try { var v = localStorage.getItem(KEY); return v === "light" || v === "system" ? v : "dark"; } catch (e) { return "dark"; } }
  function resolve(p) { return p === "system" ? (mq && mq.matches ? "light" : "dark") : p; }
  function apply() {
    var p = pref(), th = resolve(p), root = document.documentElement;
    root.setAttribute("data-theme", th);
    root.style.colorScheme = th;
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", COLORS[th]);
    var cs = document.querySelector('meta[name="color-scheme"]');
    if (cs) cs.setAttribute("content", th);
  }
  window.ReTheme = {
    get: pref,
    resolved: function () { return resolve(pref()); },
    set: function (p) {
      try { if (p === "light" || p === "system") localStorage.setItem(KEY, p); else localStorage.removeItem(KEY); } catch (e) { /* privatni režim */ }
      apply();
    }
  };
  if (mq) { var on = function () { if (pref() === "system") apply(); }; if (mq.addEventListener) mq.addEventListener("change", on); else if (mq.addListener) mq.addListener(on); }
  apply();
})();
