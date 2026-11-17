// Pomoćne funkcije za celu aplikaciju.

export function $(id) { return document.getElementById(id); }
export function qs(sel, root) { return (root || document).querySelector(sel); }
export function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

export function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

export function pad(n) { return String(n).padStart(2, "0"); }
export function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
export function parseYmd(s) { var p = String(s).split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); }
export function addDays(s, n) { var d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); }
export function today() { return ymd(new Date()); }
export function monday(s) { var d = parseYmd(s); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return ymd(d); }
export var WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
export function weekdayKey(s) { return WEEKDAY_KEYS[parseYmd(s).getDay()]; }

export function num(v) {
  if (v === "" || v == null) return null;
  var n = Number(String(v).trim().replace(",", "."));
  return isFinite(n) ? n : null;
}
export function f1(n, dec) {
  if (n == null) return "—";
  var s = Number(n).toFixed(dec == null ? 1 : dec);
  return document.documentElement.lang === "en" ? s : s.replace(".", ",");
}
export function fnum(n) {
  if (n == null) return "";
  var s = (Math.round(n * 10) / 10).toString();
  return document.documentElement.lang === "en" ? s : s.replace(".", ",");
}
export function hm(s) {
  var m = String(s || "").match(/(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
export function fmtMin(x) { return pad(Math.floor(x / 60) % 24) + ":" + pad(x % 60); }
export function nowHM() { var d = new Date(); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }

export function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
export function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
export function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }

export function randomCode(len) {
  var alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  var out = "", buf = new Uint32Array(len || 8);
  crypto.getRandomValues(buf);
  for (var i = 0; i < buf.length; i++) out += alphabet[buf[i] % alphabet.length];
  return out;
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e2) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
}

var toastTimer = null;
export function toast(msg) {
  var el = $("toast");
  if (!el) return;
  el.textContent = msg; el.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.hidden = true; }, 2600);
}

export function debounce(fn, ms) {
  var t = null;
  var d = function () { var a = arguments, self = this; if (t) clearTimeout(t); t = setTimeout(function () { t = null; fn.apply(self, a); }, ms); };
  d.flush = function () { if (t) { clearTimeout(t); t = null; fn(); } };
  return d;
}

export function isStandalone() {
  return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
}
export function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); }
