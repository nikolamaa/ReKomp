// Pokretanje aplikacije: prijava, upitnik, klijentska strana i trenerski panel.
import { $, esc, toast } from "./util.js";
import { t, setLang, detectLang, getLang, langSelectHtml, chosenLang } from "./i18n.js";
import { createApi } from "./api.js";
import { mountIntake } from "./intake-ui.js";
import { mountClient, brandHtml } from "./client.js";
import { mountAdmin } from "./admin.js";

var CFG = window.REKOMP_CONFIG || {};
var APP = CFG.appName || "ReKomp";
var api = createApi(CFG);
var root = $("app");
var current = null;   // { destroy }
var state = { me: null, screen: null, preview: null, ownPlan: false };

setLang(detectLang());
document.title = APP;

window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); window.__bip = e; });
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("./sw.js").catch(function () { /* ignore */ });
}
window.addEventListener("offline", function () { toast(t("offline")); });

function appUrl() { return CFG.appUrl || (location.origin + location.pathname.replace(/index\.html$/, "")); }

function unmount() { if (current && current.destroy) current.destroy(); current = null; document.body.classList.remove("no-tabs"); }

function demoBar() {
  if (api.mode !== "demo") return "";
  return '<div class="demo-bar"><span>' + esc(t("demo_banner")) + '</span><button type="button" class="linkbtn" id="demoReset">' + esc(t("demo_reset")) + "</button></div>";
}
function bindDemoBar() {
  var b = $("demoReset");
  if (b) b.addEventListener("click", async function () { await api.signOut(); api.demoReset(); location.hash = ""; boot(); });
}

function changeLang(l) {
  setLang(l, true);
  if (state.me && state.me.clientId && !state.me.isAdmin) api.setMyLang(l).catch(function () { /* ignore */ });
  boot(true);
}

/* ---------- prijava ---------- */
function renderAuth(mode) {
  unmount();
  mode = mode || "login";
  root.innerHTML = demoBar() + '<main class="wrap auth"><div class="auth-head"><div class="brand big-brand">' + brandHtml(APP) + '</div><p class="muted">' + esc(t("tagline")) + "</p>" + langSelectHtml("authLang", getLang()) + "</div>" +
    (api.mode === "demo" ? '<div class="card"><div class="actions"><button type="button" class="btn" id="demoT">' + esc(t("demo_as_trainer")) + '</button><button type="button" class="btn ghost" id="demoC">' + esc(t("demo_as_client")) + "</button></div></div>" : "") +
    '<div class="card"><div class="seg two" role="tablist"><button type="button" role="tab" aria-selected="' + (mode === "login") + '" data-mode="login">' + esc(t("login")) + '</button><button type="button" role="tab" aria-selected="' + (mode === "signup") + '" data-mode="signup">' + esc(t("signup")) + "</button></div>" +
    '<form id="authForm" autocomplete="on" novalidate>' +
    '<div class="field"><label for="aEmail">' + esc(t("email")) + '</label><input id="aEmail" type="email" autocomplete="email" inputmode="email" required></div>' +
    '<div class="field"><label for="aPw">' + esc(t("password")) + '</label><input id="aPw" type="password" autocomplete="' + (mode === "login" ? "current-password" : "new-password") + '" required minlength="8">' + (mode === "signup" ? '<p class="q-help">' + esc(t("password_hint")) + "</p>" : "") + "</div>" +
    (mode === "signup" ? '<div class="field"><label for="aCode">' + esc(t("invite_code")) + '</label><input id="aCode" autocapitalize="characters" autocomplete="off" spellcheck="false"><p class="q-help">' + esc(t("invite_code_hint")) + "</p></div>" : "") +
    '<p id="authErr" class="form-err" role="alert" hidden></p>' +
    '<div class="actions"><button type="submit" class="btn" id="authBtn">' + esc(mode === "login" ? t("login_btn") : t("signup_btn")) + "</button></div>" +
    (mode === "login" ? '<details class="small"><summary class="muted">' + esc(t("forgot")) + '</summary><p class="small">' + esc(t("forgot_text")) + "</p></details>" : "") +
    "</form></div></main>";
  bindDemoBar();
  $("authLang").addEventListener("change", function () { setLang($("authLang").value, true); renderAuth(mode); });
  root.querySelectorAll("[data-mode]").forEach(function (b) { b.addEventListener("click", function () { renderAuth(b.dataset.mode); }); });
  if ($("demoT")) $("demoT").addEventListener("click", async function () { await api.demoEnter("trainer"); boot(); });
  if ($("demoC")) $("demoC").addEventListener("click", async function () { await api.demoEnter("client"); boot(); });
  $("authForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var email = $("aEmail").value.trim(), pw = $("aPw").value, errEl = $("authErr");
    errEl.hidden = true;
    if (!/^\S+@\S+\.\S+$/.test(email)) return showErr("err_email");
    if (mode === "signup" && pw.length < 8) return showErr("err_pw_short");
    $("authBtn").disabled = true;
    try {
      if (mode === "login") await api.signIn(email, pw);
      else {
        await api.signUp(email, pw);
        var code = ($("aCode").value || "").trim();
        if (code) { try { await api.claimInvite(code); } catch (e2) { await boot(); var ce = $("codeErr"); if (ce) { ce.textContent = t("err_code"); ce.hidden = false; } return; } }
      }
      await boot();
    } catch (err) {
      $("authBtn").disabled = false;
      showErr(err.code === "bad_login" ? "err_login" : err.code === "exists" ? "err_exists" : err.code === "pw_short" ? "err_pw_short" : err.code === "bad_email" ? "err_email" : null, err.message);
    }
    function showErr(key, raw) { errEl.textContent = key ? t(key) : (t("error_generic") + (raw ? " (" + raw + ")" : "")); errEl.hidden = false; }
  });
}

/* ---------- pozivni kod ---------- */
function renderCode() {
  unmount();
  root.innerHTML = demoBar() + '<main class="wrap auth"><div class="auth-head"><div class="brand big-brand">' + brandHtml(APP) + "</div>" + langSelectHtml("cLang", getLang()) + "</div>" +
    '<div class="card"><h2>' + esc(t("code_title")) + '</h2><p class="muted">' + esc(t("code_text")) + '</p><form id="codeForm"><div class="field"><label for="cCode">' + esc(t("invite_code")) + '</label><input id="cCode" autocapitalize="characters" autocomplete="off" spellcheck="false"></div>' +
    '<p id="codeErr" class="form-err" role="alert" hidden></p><div class="actions"><button class="btn" type="submit">' + esc(t("code_btn")) + '</button><button class="btn ghost" type="button" id="cOut">' + esc(t("logout")) + "</button></div></form></div></main>";
  bindDemoBar();
  $("cLang").addEventListener("change", function () { setLang($("cLang").value, true); renderCode(); });
  $("cOut").addEventListener("click", async function () { await api.signOut(); boot(); });
  $("codeForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    try { await api.claimInvite($("cCode").value); await boot(); }
    catch (err) { $("codeErr").textContent = t("err_code"); $("codeErr").hidden = false; }
  });
}

/* ---------- upitnik / čekanje ---------- */
async function renderIntake(client, intake, opts) {
  unmount();
  opts = opts || {};
  root.innerHTML = demoBar() + '<header class="top"><div class="wrap"><div class="brand">' + brandHtml(APP) + '</div><div class="top-r">' + langSelectHtml("iLang", getLang()) +
    '<button type="button" class="icon-btn" id="iOut">' + esc(opts.toAdmin ? t("trainer") : opts.back ? t("close") : t("logout")) + '</button></div></div></header><main class="wrap"><div id="iRoot" class="view"></div></main>';
  document.body.classList.add("no-tabs");
  bindDemoBar();
  $("iLang").addEventListener("change", function () { changeLang($("iLang").value); });
  $("iOut").addEventListener("click", async function () { if (opts.toAdmin) { state.ownPlan = false; location.hash = "#/"; boot(); return; } if (opts.back) { boot(); return; } await api.signOut(); boot(); });
  var submitted = !!(intake && intake.submitted_at);
  var ui = mountIntake($("iRoot"), {
    answers: (intake && intake.answers) || {}, progress: (intake && intake.progress) || {}, submitted: submitted,
    onSave: function (answers, progress) { return api.saveIntake(client.id, { answers: answers, progress: progress }); },
    onSubmit: async function () { await api.saveIntake(client.id, { submitted_at: new Date().toISOString() }); toast(t("submitted_title")); boot(); },
    onDone: function () { boot(); }
  });
  current = { destroy: function () { ui.flush(); } };
}

function renderPending(client, isAdmin) {
  unmount();
  root.innerHTML = demoBar() + '<header class="top"><div class="wrap"><div class="brand">' + brandHtml(APP) + '</div><div class="top-r">' + langSelectHtml("wLang", getLang()) + "</div></div></header>" +
    '<main class="wrap"><div class="view"><div class="card hero"><span class="label">' + esc(client.name) + '</span><div class="next"><div class="bar b-violet"></div><div class="next-body"><span class="next-title">' + esc(t("plan_pending")) + '</span><span class="muted">' + esc(t("plan_pending_text")) + "</span></div></div>" +
    '<div class="actions"><button type="button" class="btn ghost" id="wEdit">' + esc(t("edit_answers")) + '</button><button type="button" class="btn ghost" id="wOut">' + esc(isAdmin ? t("trainer") : t("logout")) + "</button></div></div>" +
    '<div class="card"><h3>' + esc(t("install_help")) + '</h3><p class="small">Android: ' + esc(t("install_android")) + '</p><p class="small">iPhone: ' + esc(t("install_ios")) + "</p></div></div></main>";
  document.body.classList.add("no-tabs");
  bindDemoBar();
  $("wLang").addEventListener("change", function () { changeLang($("wLang").value); });
  $("wEdit").addEventListener("click", async function () { var it = await api.getIntake(client.id); renderIntake(client, it, { back: true }); });
  $("wOut").addEventListener("click", async function () { if (isAdmin) { state.ownPlan = false; location.hash = "#/"; boot(); return; } await api.signOut(); boot(); });
}

/* ---------- klijent ---------- */
function renderClient(client, plan, opts) {
  unmount();
  opts = opts || {};
  root.innerHTML = demoBar() + '<div id="cRoot"></div>';
  bindDemoBar();
  var c = mountClient($("cRoot"), {
    api: api, appName: APP, clientId: client.id, client: client, plan: plan, readonly: !!opts.readonly,
    extraHeaderBtn: opts.adminSwitch ? '<button type="button" class="icon-btn" id="toAdmin">' + esc(t("trainer")) + "</button>" : "",
    onEditIntake: async function () { var it = await api.getIntake(client.id); renderIntake(client, it, { back: true }); },
    onLogout: async function () { await api.signOut(); boot(); },
    onExitPreview: opts.onExitPreview,
    onLang: changeLang
  });
  if ($("toAdmin")) $("toAdmin").addEventListener("click", function () { state.ownPlan = false; location.hash = "#/"; boot(); });
  current = c;
}

/* ---------- glavni tok ---------- */
var booting = false;
export async function boot(keepView) {
  if (booting) return; booting = true;
  try {
    var me = await api.whoami();
    state.me = me;
    if (!me) { state.preview = null; setLang(detectLang()); renderAuth("login"); return; }
    if (state.preview && me.isAdmin) {
      var pv = state.preview;
      renderClient(pv.client, pv.plan, { readonly: true, onExitPreview: function () { state.preview = null; location.hash = "#/c/" + pv.id + "/plan"; boot(); } });
      return;
    }
    if (me.isAdmin && !state.ownPlan) {
      setLang(detectLang());
      unmount();
      root.innerHTML = demoBar() + '<div id="aRoot"></div>';
      bindDemoBar();
      current = mountAdmin($("aRoot"), {
        api: api, appName: APP, appUrl: appUrl(), me: me,
        onPreview: function (client, plan, id) { state.preview = { client: client, plan: plan, id: id }; location.hash = ""; boot(); },
        onOwnPlan: function () { state.ownPlan = true; location.hash = ""; boot(); },
        onLogout: async function () { await api.signOut(); state.ownPlan = false; boot(); },
        onRelinked: function () { boot(); },
        onLang: function (l) { setLang(l, true); boot(true); }
      });
      return;
    }
    if (!me.clientId) { renderCode(); return; }
    var client = await api.getClient(me.clientId);
    var chosen = chosenLang();
    if (client && !chosen && client.lang) setLang(client.lang);
    if (client && chosen && client.lang !== chosen && !me.isAdmin) api.setMyLang(chosen).catch(function () { /* ignore */ });
    if (me.isAdmin) {
      var own = await api.getPlan(me.clientId);
      if (own && own.data && Object.keys(own.data).length) { renderClient(client, own.data, { adminSwitch: true }); return; }
    }
    var intake = await api.getIntake(me.clientId);
    if (!intake || !intake.submitted_at) { renderIntake(client, intake, me.isAdmin ? { back: true, toAdmin: true } : null); return; }
    var plan = await api.getPlan(me.clientId);
    if (!plan || !plan.published) { renderPending(client, me.isAdmin); return; }
    renderClient(client, plan.data, { adminSwitch: me.isAdmin });
  } catch (e) {
    root.innerHTML = '<main class="wrap"><div class="card"><p class="form-err">' + esc(t("error_generic")) + '</p><p class="small muted">' + esc(e && e.message || "") + '</p><div class="actions"><button class="btn" id="retry">' + esc(t("next")) + "</button></div></div></main>";
    $("retry").addEventListener("click", function () { boot(); });
  } finally { booting = false; }
}

api.onAuth(function (ev) { if (ev === "SIGNED_OUT") { state.ownPlan = false; state.preview = null; } });
var lastHidden = 0;
document.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "hidden") { lastHidden = Date.now(); return; }
  if (lastHidden && Date.now() - lastHidden > 10 * 60 * 1000 && state.me && !state.me.isAdmin && !state.preview) boot(true);
});
boot();
