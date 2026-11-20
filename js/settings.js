// Podešavanja: podsetnici (push), tema, jezik, kontakt trenera, nalog, o aplikaciji. Deli ih klijent i trener.
import { $, qsa, esc, toast, copyText, isIOS, isStandalone, lsGet, lsSet, today, pad, APP_VERSION, downloadText } from "./util.js";
import { t, getLang, langSelectHtml, fmtShortDate, legalLink } from "./i18n.js";
import { decryptBackup, isEncryptedBackup, isPlainBackup, backupSummary } from "./backup-crypto.js";

/* ---------- vrste podsetnika ---------- */
// def: uključeno dok klijent ne promeni (isto kao u notifications.sql)
export var CLIENT_KINDS = [
  { k: "wake", def: true }, { k: "pretrain", def: true, lead: true }, { k: "train", def: true }, { k: "log", def: true },
  { k: "meal", def: false }, { k: "cook", def: false }, { k: "coffee", def: false }, { k: "sleep", def: false },
  { k: "checkin", def: true }, { k: "weekpick", def: true }, { k: "trainer", def: true }
];
export var ADMIN_KINDS = [{ k: "admin_intake", def: true }, { k: "admin_pain", def: true }];
export var LEADS = [60, 90, 120];

export function notifPrefs(settings, kinds) {
  var n = (settings && settings.notif) || {}, k = {};
  kinds.forEach(function (x) { k[x.k] = n.kinds && typeof n.kinds[x.k] === "boolean" ? n.kinds[x.k] : x.def; });
  return { on: !!n.on, kinds: k, lead: LEADS.indexOf(n.lead) >= 0 ? n.lead : 90 };
}

/* ---------- push na ovom uređaju ---------- */
function b64u(buf) { var b = new Uint8Array(buf), s = ""; for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function unb64u(s) { var t2 = String(s).replace(/-/g, "+").replace(/_/g, "/"), bin = atob(t2 + "===".slice((t2.length + 3) % 4)), out = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }

export function pushEnv() {
  var sw = "serviceWorker" in navigator, pm = typeof window.PushManager !== "undefined", nt = typeof window.Notification !== "undefined";
  return { supported: sw && pm && nt, ios: isIOS(), standalone: isStandalone(), permission: nt ? Notification.permission : "unsupported" };
}
async function swReg() { if (!("serviceWorker" in navigator)) return null; try { return (await navigator.serviceWorker.getRegistration()) || null; } catch (e) { return null; } }
export async function currentSub() { var reg = await swReg(); if (!reg || !reg.pushManager) return null; try { return await reg.pushManager.getSubscription(); } catch (e) { return null; } }
function subKey(sub) { try { return sub && sub.options && sub.options.applicationServerKey ? b64u(sub.options.applicationServerKey) : null; } catch (e) { return null; } }

// Mora da se pozove direktno iz klika (iPhone traži dozvolu samo tada); javni ključ je učitan unapred.
export async function enablePush(api, publicKey) {
  if (api.mode === "demo") return "demo";
  var env = pushEnv();
  if (!env.supported) return env.ios && !env.standalone ? "ios_install" : "unsupported";
  if (!publicKey) return "no_key";
  var perm = await Notification.requestPermission();
  if (perm !== "granted") return perm === "denied" ? "denied" : "dismissed";
  var reg = await navigator.serviceWorker.ready;
  var sub = await reg.pushManager.getSubscription();
  if (sub && subKey(sub) && subKey(sub) !== publicKey) { try { await sub.unsubscribe(); } catch (e) { /* ignore */ } sub = null; }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: unb64u(publicKey) });
  await api.savePushSub(sub.toJSON());
  lsSet("rekomp-push-sync", today());
  return "ok";
}
export async function disablePush(api) {
  var sub = await currentSub();
  if (sub) { try { await api.deletePushSub(sub.endpoint); } catch (e) { /* ignore */ } try { await sub.unsubscribe(); } catch (e) { /* ignore */ } }
}
// Posle otvaranja aplikacije: ako je dozvola data, pretplata postoji i važi za trenutni ključ (jednom dnevno javi bazi).
export async function ensurePush(api, settings) {
  try {
    if (api.mode === "demo" || api.mode === "artifact" || !(settings && settings.notif && settings.notif.on)) return;
    var env = pushEnv(); if (!env.supported || env.permission !== "granted") return;
    var cfg = await api.getAppSetting("push"); if (!cfg || !cfg.publicKey) return;
    var reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription();
    var fresh = false;
    if (sub && subKey(sub) && subKey(sub) !== cfg.publicKey) { await sub.unsubscribe(); sub = null; }
    if (!sub) { sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: unb64u(cfg.publicKey) }); fresh = true; }
    if (fresh || lsGet("rekomp-push-sync") !== today()) { await api.savePushSub(sub.toJSON()); lsSet("rekomp-push-sync", today()); }
  } catch (e) { /* tiho: probaće sledeći put */ }
}

/* ---------- pomoćno ---------- */
// Tabela ili funkcija ne postoji u bazi (notifications.sql još nije pokrenut).
function noDb(e) { var c = e && e.code, m = String((e && e.message) || ""); return c === "PGRST205" || c === "PGRST202" || c === "42P01" || c === "42883" || /schema cache|does not exist|could not find the (table|function)/i.test(m); }
function card(title, body, id) { return '<div class="card set-card"' + (id ? ' id="' + id + '"' : "") + "><h3>" + esc(title) + "</h3>" + body + "</div>"; }
function toggleRow(id, label, hint, checked, attr) {
  return '<label class="toggle"><input type="checkbox" id="' + id + '"' + (attr || "") + (checked ? " checked" : "") + '><span class="tg-l"><b>' + esc(label) + "</b>" + (hint ? "<small>" + esc(hint) + "</small>" : "") + '</span><span class="sw" aria-hidden="true"></span></label>';
}
function digits(p) { var d = String(p || "").replace(/[^\d+]/g, ""); if (/^0\d/.test(d)) d = "+381" + d.slice(1); return d; }
function fmtWhen(d) {
  var td = today(), dd = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  var tm = pad(d.getHours()) + ":" + pad(d.getMinutes());
  var tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  var tmw = tomorrow.getFullYear() + "-" + pad(tomorrow.getMonth() + 1) + "-" + pad(tomorrow.getDate());
  return (dd === td ? t("today_word") : dd === tmw ? t("tomorrow_word") : d.getDate() + "." + (d.getMonth() + 1) + ".") + " " + tm;
}

/* ---------- delovi ---------- */
function themeCard() {
  var cur = window.ReTheme ? window.ReTheme.get() : "dark";
  return card(t("set_theme"), '<div class="seg three" id="sTheme" role="group">' + ["dark", "light", "system"].map(function (v) {
    return '<button type="button" data-theme-opt="' + v + '" aria-pressed="' + (cur === v) + '">' + esc(t("theme_" + v)) + "</button>";
  }).join("") + '</div><p class="small muted">' + esc(t("theme_hint")) + "</p>");
}
function langCard() { return card(t("lang"), '<div class="field">' + langSelectHtml("pLang", getLang()) + "</div>"); }
function pwHtml() {
  return '<details class="set-details"><summary>' + esc(t("pw_change")) + '</summary><form id="pwForm" novalidate>' +
    '<div class="field"><label for="pw1">' + esc(t("new_pw")) + '</label><input id="pw1" type="password" autocomplete="new-password" minlength="8"><p class="q-help">' + esc(t("password_hint")) + "</p></div>" +
    '<div class="field"><label for="pw2">' + esc(t("new_pw2")) + '</label><input id="pw2" type="password" autocomplete="new-password" minlength="8"></div>' +
    '<p id="pwErr" class="form-err" role="alert" hidden></p><div class="actions"><button type="submit" class="btn small" id="pwBtn">' + esc(t("new_pw_btn")) + "</button></div></form></details>";
}
function aboutCard(art) {
  var inst = isStandalone() || art ? "" : '<p class="small"><b>' + esc(t("install_help")) + '</b></p><p class="small">Android: ' + esc(t("install_android")) + '</p><p class="small">iPhone: ' + esc(t("install_ios")) + "</p>";
  return card(t("set_about"), inst + '<p class="small muted">' + esc(t("version", { v: APP_VERSION })) + '</p><div class="actions"><button type="button" class="btn ghost small" id="pUpdate">' + esc(t("check_update")) + "</button></div>" +
    '<p class="small set-legal" id="pLegal">' + legalLink("privacy") + " · " + legalLink("terms") + " · " + legalLink("about") + "</p>");
}
function kindsHtml(kinds, prefs) {
  return '<div class="set-kinds">' + kinds.map(function (x) {
    var row = toggleRow("nk_" + x.k, t("n_" + x.k), t("n_" + x.k + "_h"), prefs.kinds[x.k], ' data-kind="' + x.k + '"');
    if (x.lead) row += '<div class="field set-lead"><label for="nLead">' + esc(t("n_lead")) + '</label><select id="nLead">' + LEADS.map(function (m) {
      return '<option value="' + m + '"' + (prefs.lead === m ? " selected" : "") + ">" + esc(t("n_lead_" + m)) + "</option>";
    }).join("") + "</select></div>";
    return row;
  }).join("") + "</div>";
}

/* ---------- ekran ---------- */
// o: { api, role: "client"|"admin", me, settings, client, kinds (dostupne vrste), preview(prefs) → [{at: Date, title, body}],
//      onSettings(data), onLang(l), onLogout(), onEditIntake(), exportData() → objekat, cfg }
export function renderSettings(el, o) {
  var S = { data: Object.assign({}, o.settings || {}), contact: null, push: null, sub: null, busy: false };
  var art = o.api.mode === "artifact";
  var kinds = o.kinds || (o.role === "admin" ? ADMIN_KINDS : CLIENT_KINDS);
  var prefs = notifPrefs(S.data, kinds);

  function save(patch) {
    S.data = Object.assign({}, S.data, patch);
    if (o.onSettings) o.onSettings(S.data);
    return o.api.saveMySettings(S.data).then(function () { return true; }, function () { toast(t("not_saved")); return false; });
  }

  function notifCard() {
    var env = pushEnv(), demo = o.api.mode === "demo", h = "";
    var device = !!S.sub, granted = env.permission === "granted";
    var st;
    if (demo) st = t("n_st_demo");
    else if (!env.supported) st = env.ios && !env.standalone ? t("n_st_ios") : t("n_st_unsupported");
    else if (env.permission === "denied") st = t("n_st_denied");
    else if (S.push && !S.push.publicKey) st = t("n_st_nokey");
    else if (prefs.on && device) st = t("n_st_on");
    else if (prefs.on) st = t("n_st_other_device");
    else st = t("n_st_off");
    h += '<p id="nStatus" class="small ' + (prefs.on && (device || demo) ? "ok-text" : "muted") + '">' + esc(st) + "</p>";
    var canEnable = demo || (env.supported && env.permission !== "denied");
    h += '<div class="actions">';
    if (!prefs.on || (!device && !demo)) h += canEnable ? '<button type="button" class="btn small" id="nOn">' + esc(prefs.on ? t("n_on_here") : t("n_on")) + "</button>" : "";
    if (prefs.on) h += '<button type="button" class="btn ghost small" id="nOff">' + esc(t("n_off")) + "</button>";
    if (prefs.on && (device || demo)) h += '<button type="button" class="btn ghost small" id="nTest">' + esc(t("n_test")) + "</button>";
    h += "</div>";
    if (env.ios && !env.standalone && !demo) h += '<p class="small muted">' + esc(t("install_ios")) + "</p>";
    h += '<span class="label">' + esc(t("n_what")) + "</span>" + kindsHtml(kinds, prefs);
    if (o.preview) {
      var list = o.preview(prefs);
      h += '<span class="label">' + esc(t("n_next")) + '</span><ol class="set-next" id="nNext">' + (list.length ? list.slice(0, 8).map(function (r) {
        return '<li><span class="tm">' + esc(fmtWhen(r.at)) + "</span><span><b>" + esc(r.title) + "</b>" + (r.body ? '<small class="muted">' + esc(r.body) + "</small>" : "") + "</span></li>";
      }).join("") : '<li class="muted small">' + esc(t("n_next_none")) + "</li>") + "</ol>";
    }
    return card(t("set_notif"), h, "nCard");
  }

  function contactCard() {
    var c = S.contact;
    if (!c || !(c.email || c.phone)) return card(t("set_contact"), '<p class="small muted">' + esc(t("contact_none")) + "</p>");
    var ph = digits(c.phone), wa = ph.replace(/^\+/, ""), h = "";
    if (c.name) h += "<p><b>" + esc(c.name) + "</b></p>";
    if (c.email) h += '<div class="set-contact"><span class="label">' + esc(t("email")) + '</span><a href="mailto:' + esc(c.email) + '" id="ctMail">' + esc(c.email) + '</a><button type="button" class="linkbtn" data-copy-ct="' + esc(c.email) + '">' + esc(t("copy")) + "</button></div>";
    if (c.phone) h += '<div class="set-contact"><span class="label">' + esc(t("phone")) + '</span><a href="tel:' + esc(ph) + '" id="ctTel">' + esc(c.phone) + '</a><button type="button" class="linkbtn" data-copy-ct="' + esc(c.phone) + '">' + esc(t("copy")) + "</button></div>";
    var btns = "";
    if (c.phone && c.viber) btns += '<a class="btn ghost small" id="ctViber" href="viber://chat?number=' + encodeURIComponent(ph) + '">Viber</a>';
    if (c.phone && c.whatsapp) btns += '<a class="btn ghost small" id="ctWa" href="https://wa.me/' + esc(wa) + '" target="_blank" rel="noopener">WhatsApp</a>';
    if (btns) h += '<div class="actions">' + btns + "</div>";
    if (c.note) h += '<p class="small muted">' + esc(c.note) + "</p>";
    return card(t("set_contact"), h, "ctCard");
  }

  function contactForm() {
    var c = S.contact || {};
    return card(t("set_contact_admin"), '<p class="small muted">' + esc(t("contact_admin_hint")) + "</p>" +
      '<form id="ctForm" novalidate><div class="field"><label for="ctName">' + esc(t("contact_name")) + '</label><input id="ctName" value="' + esc(c.name || "") + '" maxlength="60"></div>' +
      '<div class="field"><label for="ctEmail">' + esc(t("email")) + '</label><input id="ctEmail" type="email" inputmode="email" value="' + esc(c.email || "") + '" maxlength="120"></div>' +
      '<div class="field"><label for="ctPhone">' + esc(t("phone")) + '</label><input id="ctPhone" type="tel" inputmode="tel" value="' + esc(c.phone || "") + '" placeholder="+381 60 123 4567" maxlength="30"></div>' +
      toggleRow("ctViber", "Viber", "", !!c.viber) + toggleRow("ctWa", "WhatsApp", "", !!c.whatsapp) +
      '<div class="field"><label for="ctNote">' + esc(t("contact_note")) + '</label><input id="ctNote" value="' + esc(c.note || "") + '" maxlength="140" placeholder="' + esc(t("contact_note_ph")) + '"></div>' +
      '<p id="ctErr" class="form-err" hidden></p><div class="actions"><button type="submit" class="btn small">' + esc(t("save")) + '</button><span id="ctSt" class="status" role="status"></span></div></form>');
  }

  function keysCard() {
    var has = S.push && S.push.publicKey;
    return card(t("keys_title"), '<p class="small muted" id="kSt">' + esc(has ? t("keys_have", { d: (S.push.createdAt || "").slice(0, 10) }) : t("keys_none")) + "</p>" +
      '<div class="actions"><button type="button" class="btn ' + (has ? "ghost " : "") + 'small" id="kGen">' + esc(has ? t("keys_regen") : t("keys_gen")) + "</button></div><div id=\"kOut\"></div>", "kCard");
  }

  // Rezervna kopija na mejl (funkcija weekly-backup): stanje, slanje odmah i otvaranje šifrovane kopije iz mejla.
  function bkWhen(iso) { var d = new Date(iso); return isNaN(d) ? "—" : fmtShortDate(d) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function bkSize(n) { return !n ? "" : n < 1048576 ? Math.max(1, Math.round(n / 1024)) + " KB" : (n / 1048576).toFixed(1) + " MB"; }
  function bkWhy(code) { return t({ missing_password: "bk_why_password", missing_resend: "bk_why_resend", mail_failed: "bk_why_mail", read_failed: "bk_why_read" }[code] || "bk_why_other"); }
  function bkStatus() {
    var b = S.backup;
    if (!b) return '<p class="small muted" id="bkSt">' + esc(t("bk_none")) + "</p>";
    if (b.ok) return '<p class="small ok-text" id="bkSt">' + esc(t("bk_last", { when: bkWhen(b.at), size: bkSize(b.bytes) || "—", src: t(b.source === "auto" ? "bk_auto" : "bk_manual") })) + "</p>";
    return '<p class="small form-err" id="bkSt">' + esc(t("bk_last_fail", { when: bkWhen(b.at), why: bkWhy(b.error) })) + (b.last_ok ? " " + esc(t("bk_last_ok", { when: bkWhen(b.last_ok) })) : "") + "</p>";
  }
  function backupCard() {
    return card(t("bk_title"), '<p class="small muted">' + esc(t("bk_hint")) + "</p>" + bkStatus() +
      '<div class="actions"><button type="button" class="btn ghost small" id="bkSend">' + esc(t("bk_send")) + "</button></div>" +
      '<details class="set-details" id="bkBox"><summary>' + esc(t("bk_open")) + '</summary><p class="small muted">' + esc(t("bk_open_hint")) + "</p>" +
      '<div class="actions"><label class="btn ghost small" for="bkFile">' + esc(t("bk_file")) + '</label><input type="file" id="bkFile" accept=".json,application/json,text/plain" hidden><span class="small muted" id="bkName"></span></div>' +
      '<div class="field"><label for="bkPw">' + esc(t("bk_pw")) + '</label><input id="bkPw" type="password" autocomplete="off" spellcheck="false"></div>' +
      '<div class="actions"><button type="button" class="btn small" id="bkOpen">' + esc(t("bk_open_btn")) + '</button></div><div id="bkOut" role="status"></div></details>', "bkCard");
  }

  function accountCard() {
    if (art) return o.onEditIntake ? card(t("set_account"), '<p class="small muted">' + esc(t("art_account")) + '</p><div class="actions"><button type="button" class="btn ghost small" id="pIntake">' + esc(t("my_answers")) + "</button></div>") : "";
    var h = (o.me && o.me.email ? '<p class="small muted">' + esc(t("signed_in_as", { x: o.me.email })) + "</p>" : "") + pwHtml();
    if (o.role === "client") {
      h += '<div class="actions">' + (o.onEditIntake ? '<button type="button" class="btn ghost small" id="pIntake">' + esc(t("my_answers")) + "</button>" : "") +
        '<button type="button" class="btn ghost small" id="pExport">' + esc(t("export_mine")) + "</button></div>";
      var mail = S.contact && S.contact.email;
      h += '<details class="set-details"><summary>' + esc(t("delete_account")) + '</summary><p class="small">' + esc(t("delete_account_text")) + "</p>" +
        (mail ? '<div class="actions"><a class="btn ghost small" id="pDelete" href="mailto:' + esc(mail) + "?subject=" + encodeURIComponent(t("delete_subject")) + "&body=" + encodeURIComponent(t("delete_body", { x: (o.me && o.me.email) || "" })) + '">' + esc(t("delete_send")) + "</a></div>" : "") + "</details>";
    }
    h += '<div class="actions"><button type="button" class="btn ghost small" id="pLogout">' + esc(t("logout")) + "</button></div>";
    return card(t("set_account"), h);
  }

  function draw() {
    prefs = notifPrefs(S.data, kinds);
    el.classList.add("view");   // kartice jedna ispod druge sa razmakom, bez obzira gde se crta (klijent ili trener)
    var name = o.role === "client" && o.client ? '<p class="muted">' + esc(o.client.name) + "</p>" : "";
    var dbWarn = o.role === "admin" && S.dbMissing ? '<p class="form-err small" id="setDbMissing">' + esc(t("set_missing_db")) + "</p>" : "";
    el.innerHTML = '<div class="card">' + (o.back || "") + "<h2>" + esc(t("settings")) + "</h2>" + name + dbWarn + "</div>" +
      (art ? "" : notifCard() + (o.role === "admin" ? keysCard() + backupCard() + contactForm() : contactCard())) + themeCard() + langCard() + accountCard() + aboutCard(art);
    bind();
  }

  function bind() {
    qsa("[data-theme-opt]", el).forEach(function (b) { b.addEventListener("click", function () {
      var v = b.dataset.themeOpt; if (window.ReTheme) window.ReTheme.set(v);
      qsa("[data-theme-opt]", el).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      save({ theme: v });
    }); });
    $("pLang").addEventListener("change", function () { if (o.onLang) o.onLang($("pLang").value); });
    if ($("pLogout")) $("pLogout").addEventListener("click", function () { if (o.onLogout) o.onLogout(); });
    if ($("pIntake")) $("pIntake").addEventListener("click", function () { o.onEditIntake(); });
    if ($("pExport")) $("pExport").addEventListener("click", async function () {
      $("pExport").disabled = true;
      try { var data = await o.exportData(); downloadText("rekomp_moji_podaci_" + today() + ".json", JSON.stringify(data, null, 2), "application/json"); }
      catch (e) { toast(t("error_generic")); }
      $("pExport").disabled = false;
    });
    qsa("[data-copy-ct]", el).forEach(function (b) { b.addEventListener("click", function () { copyText(b.dataset.copyCt).then(function (okk) { toast(okk ? t("copied") : t("copy_failed")); }); }); });
    $("pUpdate").addEventListener("click", async function () {
      $("pUpdate").disabled = true;
      try { var reg = await swReg(); if (reg) await reg.update(); } catch (e) { /* ignore */ }
      location.reload();
    });
    if ($("pwForm")) $("pwForm").addEventListener("submit", async function (e) {
      e.preventDefault();
      var a = $("pw1").value, b = $("pw2").value, er = $("pwErr");
      er.hidden = true;
      if (a.length < 8) { er.textContent = t("err_pw_short"); er.hidden = false; return; }
      if (a !== b) { er.textContent = t("pw_mismatch"); er.hidden = false; return; }
      $("pwBtn").disabled = true;
      try { await o.api.updatePassword(a); $("pw1").value = ""; $("pw2").value = ""; toast(t("pw_changed")); el.querySelector("#pwForm").closest("details").open = false; }
      catch (err) { er.textContent = err.code === "same_pw" ? t("pw_same") : err.code === "pw_short" ? t("err_pw_short") : t("pw_change_fail"); er.hidden = false; }
      $("pwBtn").disabled = false;
    });

    // podsetnici
    qsa("[data-kind]", el).forEach(function (cb) { cb.addEventListener("change", function () {
      var k = Object.assign({}, prefs.kinds); k[cb.dataset.kind] = cb.checked;
      save({ notif: Object.assign({}, S.data.notif || {}, { kinds: k, lead: prefs.lead }) }).then(refreshPreview);
    }); });
    if ($("nLead")) $("nLead").addEventListener("change", function () {
      save({ notif: Object.assign({}, S.data.notif || {}, { kinds: prefs.kinds, lead: Number($("nLead").value) }) }).then(refreshPreview);
    });
    if ($("nOn")) $("nOn").addEventListener("click", function () {
      var btn = $("nOn"); btn.disabled = true;
      enablePush(o.api, S.push && S.push.publicKey).then(async function (res) {
        if (res === "ok" || res === "demo") {
          await save({ notif: Object.assign({}, S.data.notif || {}, { on: true, kinds: prefs.kinds, lead: prefs.lead }) });
          S.sub = await currentSub();
          toast(t(res === "demo" ? "n_st_demo" : "n_enabled"));
          draw();
        } else { btn.disabled = false; toast(t("n_res_" + res)); }
      }, function () { btn.disabled = false; toast(t("n_res_error")); });
    });
    if ($("nOff")) $("nOff").addEventListener("click", async function () {
      $("nOff").disabled = true;
      await disablePush(o.api);
      await save({ notif: Object.assign({}, S.data.notif || {}, { on: false }) });
      S.sub = null; toast(t("n_disabled")); draw();
    });
    if ($("nTest")) $("nTest").addEventListener("click", function () {
      var b = $("nTest"); b.disabled = true;
      o.api.testReminder(t("n_test_title"), t("n_test_body")).then(function () { toast(t(o.api.mode === "demo" ? "n_st_demo" : "n_test_sent")); }, function (e) { toast(e.code === "rate" ? t("n_test_wait") : t("error_generic")); });
      setTimeout(function () { if (b.isConnected) b.disabled = false; }, 60000);
    });

    // trener: kontakt i ključevi
    if ($("ctForm")) $("ctForm").addEventListener("submit", async function (e) {
      e.preventDefault();
      var c = { name: $("ctName").value.trim(), email: $("ctEmail").value.trim(), phone: $("ctPhone").value.trim(), viber: $("ctViber").checked, whatsapp: $("ctWa").checked, note: $("ctNote").value.trim() };
      if (c.email && !/^\S+@\S+\.\S+$/.test(c.email)) { $("ctErr").textContent = t("err_email"); $("ctErr").hidden = false; return; }
      if (c.phone && digits(c.phone).replace(/\D/g, "").length < 8) { $("ctErr").textContent = t("phone_bad"); $("ctErr").hidden = false; return; }
      $("ctErr").hidden = true;
      try { await o.api.saveAppSetting("contact", c); S.contact = c; $("ctSt").textContent = t("saved_at", { time: pad(new Date().getHours()) + ":" + pad(new Date().getMinutes()) }); }
      catch (err) { $("ctSt").textContent = noDb(err) ? t("set_missing_db") : t("not_saved"); }
    });
    bindBackup();
    if ($("kGen")) $("kGen").addEventListener("click", async function () {
      var b = $("kGen");
      if (S.push && S.push.publicKey && !b.dataset.armed) { b.dataset.armed = "1"; b.textContent = t("keys_regen_confirm"); b.classList.add("danger-btn"); return; }
      b.disabled = true;
      try { await generateKeys(); } catch (e) { if (noDb(e) && $("kSt")) $("kSt").textContent = t("set_missing_db"); toast(noDb(e) ? t("set_missing_db") : t("error_generic")); b.disabled = false; }
    });
  }

  function bindBackup() {
    if (!$("bkSend")) return;
    var file = null;
    $("bkSend").addEventListener("click", async function () {
      var b = $("bkSend"); b.disabled = true; b.textContent = t("bk_sending");
      try {
        var r = await o.api.sendBackupNow();
        toast(t(r && r.demo ? "bk_demo" : "bk_sent"));
        try { S.backup = await o.api.getBackupStatus(); } catch (e) { /* ostaje staro */ }
        if ($("bkSt")) $("bkSt").outerHTML = bkStatus();
      } catch (e) {
        var k = { no_function: "bk_err_nofn", jwt_on: "bk_err_jwt", forbidden: "bk_err_forbidden", rate: "bk_err_rate", missing_password: "bk_why_password", missing_resend: "bk_why_resend", mail_failed: "bk_why_mail", read_failed: "bk_why_read" }[e.code];
        var msg = k ? t(k) : t("error_generic");
        if ($("bkSt")) { $("bkSt").className = "small form-err"; $("bkSt").textContent = msg; }
        toast(msg);
      }
      if ($("bkSend")) { $("bkSend").disabled = false; $("bkSend").textContent = t("bk_send"); }
    });
    $("bkFile").addEventListener("change", function () {
      file = $("bkFile").files[0] || null; $("bkFile").value = "";
      $("bkName").textContent = file ? file.name : ""; $("bkOut").innerHTML = "";
      if (file) $("bkPw").focus();
    });
    $("bkOpen").addEventListener("click", async function () {
      var out = $("bkOut"), b = $("bkOpen");
      if (!file) { out.innerHTML = '<p class="small form-err">' + esc(t("bk_pick_file")) + "</p>"; return; }
      b.disabled = true; out.innerHTML = '<p class="small muted">' + esc(t("bk_opening")) + "</p>";
      var data = null, code = null;
      try {
        var txt = await file.text(), x = null;
        try { x = JSON.parse(txt.replace(/^\uFEFF/, "")); } catch (e) { throw Object.assign(new Error("bad_file"), { code: "bad_file" }); }
        if (isPlainBackup(x)) data = x;
        else if (isEncryptedBackup(x)) data = await decryptBackup(x, $("bkPw").value);
        else code = "bad_file";
      } catch (e) { code = e.code || "bad_file"; }
      b.disabled = false;
      if (!data) { out.innerHTML = '<p class="small form-err">' + esc(t({ bad_password: "bk_bad_pw", unsupported: "bk_unsupported" }[code] || "bk_bad_file")) + "</p>"; return; }
      var sm = backupSummary(data), day = String(sm.at || "").slice(0, 10) || today();
      out.innerHTML = '<div class="hint ok" id="bkSummary">' + esc(t("bk_opened", { when: sm.at ? bkWhen(sm.at) : "—", c: sm.clients, i: sm.intakes, p: sm.plans, d: sm.daily, s: sm.sessions })) + "</div>" +
        '<p class="small muted">' + esc(t("bk_dl_warn")) + '</p><div class="actions"><button type="button" class="btn ghost small" id="bkDl">' + esc(t("bk_download")) + "</button></div>";
      $("bkPw").value = "";
      $("bkDl").addEventListener("click", function () { downloadText("rekomp-rezervna-kopija-" + day + ".json", JSON.stringify(data, null, 1), "application/json"); });
    });
  }

  function refreshPreview() {
    if (!o.preview || !$("nNext")) return;
    var tmp = document.createElement("div"); prefs = notifPrefs(S.data, kinds);
    tmp.innerHTML = notifCard();
    $("nNext").innerHTML = tmp.querySelector("#nNext").innerHTML;
  }

  async function generateKeys() {
    var kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    var pub = b64u(await crypto.subtle.exportKey("raw", kp.publicKey));
    var priv = (await crypto.subtle.exportKey("jwk", kp.privateKey)).d;
    var cron = b64u(crypto.getRandomValues(new Uint8Array(24)));
    var subject = "mailto:" + ((S.contact && S.contact.email) || (o.me && o.me.email) || "nikola@rekomp.me");
    var push = { publicKey: pub, createdAt: new Date().toISOString() };
    await o.api.saveAppSetting("push", push);
    S.push = push;
    var secrets = "VAPID_PUBLIC_KEY=" + pub + "\nVAPID_PRIVATE_KEY=" + priv + "\nVAPID_SUBJECT=" + subject + "\nCRON_SECRET=" + cron;
    var url = (o.cfg && o.cfg.supabaseUrl ? o.cfg.supabaseUrl : "https://TVOJ-PROJEKAT.supabase.co").replace(/\/$/, "") + "/functions/v1/send-reminders";
    var sql = "create extension if not exists pg_cron;\ncreate extension if not exists pg_net;\n" +
      "select vault.create_secret('" + cron + "', 'rekomp_cron_secret', 'ReKomp: poziv funkcije send-reminders')\n where not exists (select 1 from vault.secrets where name = 'rekomp_cron_secret');\n" +
      "select vault.update_secret(id, '" + cron + "') from vault.secrets where name = 'rekomp_cron_secret';\n" +
      "select cron.unschedule('rekomp-reminders') where exists (select 1 from cron.job where jobname = 'rekomp-reminders');\n" +
      "select cron.schedule('rekomp-reminders', '* * * * *', $job$\n  select net.http_post(\n    url := '" + url + "',\n" +
      "    headers := jsonb_build_object('Content-Type', 'application/json',\n      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'rekomp_cron_secret')),\n" +
      "    body := '{}'::jsonb,\n    timeout_milliseconds := 25000);\n$job$);";
    var pairs = [["VAPID_PUBLIC_KEY", pub], ["VAPID_PRIVATE_KEY", priv], ["VAPID_SUBJECT", subject], ["CRON_SECRET", cron]];
    // Na telefonu Supabase ne razdvaja nalepljena 4 reda, pa svaki red ima svoje dugme za ime i za vrednost.
    $("kOut").innerHTML = '<p class="hint warn">' + esc(t("keys_once")) + "</p>" +
      '<span class="label">1. ' + esc(t("keys_step_secrets")) + '</span><p class="small muted">' + esc(t("keys_one_by_one")) + "</p>" +
      '<ul class="set-secrets" id="kPairs">' + pairs.map(function (p, i) {
        return '<li><code>' + esc(p[0]) + '</code><div class="actions"><button type="button" class="btn ghost small" data-kv="' + i + '" data-part="n">' + esc(t("keys_copy_name")) + '</button><button type="button" class="btn small" data-kv="' + i + '" data-part="v">' + esc(t("keys_copy_value")) + "</button></div></li>";
      }).join("") + "</ul>" +
      '<details class="set-details" id="kAll"><summary>' + esc(t("keys_all_at_once")) + '</summary><pre class="set-code" id="kSecrets">' + esc(secrets) + '</pre><div class="actions"><button type="button" class="btn small" data-kcopy="kSecrets">' + esc(t("copy")) + "</button></div></details>" +
      '<span class="label">2. ' + esc(t("keys_step_sql")) + '</span><pre class="set-code" id="kSql">' + esc(sql) + '</pre><div class="actions"><button type="button" class="btn small" data-kcopy="kSql">' + esc(t("copy")) + "</button></div>" +
      '<p class="small muted">' + esc(t("keys_after")) + "</p>";
    qsa("[data-kv]", el).forEach(function (b) {
      b.addEventListener("click", function () {
        var p = pairs[+b.dataset.kv], val = b.dataset.part === "v";
        copyText(val ? p[1] : p[0]).then(function (okk) {
          if (!okk) { toast(t("copy_failed")); return; }
          toast(t(val ? "keys_copied_value" : "keys_copied_name", { n: p[0] }));
          if (val) b.closest("li").classList.add("done");
        });
      });
    });
    qsa("[data-kcopy]", el).forEach(function (b) { b.addEventListener("click", function () { copyText($(b.dataset.kcopy).textContent).then(function (okk) { toast(okk ? t("copied") : t("copy_failed")); }); }); });
    $("kSt").textContent = t("keys_have", { d: push.createdAt.slice(0, 10) });
    var g = $("kGen"); g.textContent = t("keys_regen"); g.classList.remove("danger-btn"); delete g.dataset.armed; g.disabled = false;
  }

  draw();
  // učitaj kontakt, javni ključ i stanje telefona, pa osveži
  Promise.all([
    o.api.getAppSetting("contact").catch(function (e) { if (noDb(e)) S.dbMissing = true; return null; }),
    o.api.getAppSetting("push").catch(function (e) { if (noDb(e)) S.dbMissing = true; return null; }),
    currentSub(),
    o.role === "admin" && o.api.getBackupStatus ? o.api.getBackupStatus().catch(function () { return null; }) : null
  ]).then(function (r) {
    S.contact = r[0]; S.push = r[1] || {}; S.sub = r[2]; S.backup = r[3] || null;
    if (el.isConnected) draw();
  });
  return { redraw: draw };
}
