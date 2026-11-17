// Trenerski panel: klijenti, upitnik, sekcije, plan, unosi, pristup.
import { $, qsa, esc, parseYmd, addDays, monday, num, f1, nowHM, copyText, toast, today } from "./util.js";
import { t, getLang, fmtShortDate, fmtRange, inviteText, langSelectHtml, LANGS } from "./i18n.js";
import { SECTIONS, tx, fieldVisible, displayValue, isFlagged, parqPositive, sectionAnswered, defaultSections } from "./intake.js";
import { validatePlan, claudePrompt } from "./plan-format.js";
import { brandHtml } from "./client.js";

var SECTION_KEYS = ["today", "training", "nutrition", "calendar", "progress", "rules", "supplements"];
var SECTION_LABEL = { today: "sec_today", training: "sec_training", nutrition: "sec_nutrition", calendar: "sec_calendar", progress: "sec_progress", rules: "sec_rules", supplements: "sec_supplements" };
var STATUS = ["invited", "intake", "review", "active", "archived"];

function planHas(k, p) {
  p = p || {};
  if (k === "today" || k === "progress") return true;
  if (k === "training") return !!(p.program && (p.program.workouts || []).length);
  if (k === "nutrition") return !!(Object.keys(p.rhythms || {}).some(function (r) { return (p.rhythms[r].meals || []).length; }) || Object.keys(p.recipes || {}).length || (p.shopping && (p.shopping.items || []).length));
  if (k === "calendar") return !!(Object.keys(p.calendar || {}).length || Object.keys(p.weekTemplate || {}).length);
  if (k === "rules") return !!(p.rules || []).length;
  if (k === "supplements") return !!(p.supplements || []).length;
  return false;
}

// ctx: { api, appName, appUrl, me, onPreview(client, plan), onOwnPlan, onLogout, onLang }
export function mountAdmin(root, ctx) {
  var S = { clients: [], showArchived: false, q: "", detail: null };

  root.innerHTML = '<header class="top"><div class="wrap"><div class="brand">' + brandHtml(ctx.appName) + ' <small class="role">' + esc(t("trainer")) + '</small></div><div class="top-r">' +
    (ctx.me && ctx.me.clientId ? '<button type="button" class="icon-btn" id="aOwn">' + esc(t("my_plan")) + "</button>" : "") +
    langSelectHtml("aLang", getLang()) + '<button type="button" class="icon-btn" id="aLogout">' + esc(t("logout")) + "</button></div></div></header>" +
    '<main class="wrap"><div id="aMain" class="view"><p class="muted">' + esc(t("loading")) + "</p></div></main>";
  document.body.classList.add("no-tabs");
  $("aLang").addEventListener("change", function () { ctx.onLang($("aLang").value); });
  $("aLogout").addEventListener("click", function () { ctx.onLogout(); });
  if ($("aOwn")) $("aOwn").addEventListener("click", function () { ctx.onOwnPlan(); });

  function route() {
    var h = (location.hash || "").replace(/^#\/?/, "").split("/");
    if (h[0] === "c" && h[1]) return openClient(h[1], h[2] || "intake");
    return renderList();
  }
  window.addEventListener("hashchange", route);
  function nav(hash) { if (location.hash === hash) route(); else location.hash = hash; }

  /* ---------- list ---------- */
  async function renderList() {
    S.detail = null;
    var m = $("aMain");
    try { S.clients = await ctx.api.listClients(); } catch (e) { m.innerHTML = '<div class="card"><p class="form-err">' + esc(t("error_generic")) + "</p></div>"; return; }
    var counts = {}; S.clients.forEach(function (c) { counts[c.status] = (counts[c.status] || 0) + 1; });
    m.innerHTML =
      '<div class="card"><div class="card-h"><h2>' + esc(t("clients")) + '</h2><button type="button" class="btn small" id="aNew">+ ' + esc(t("new_client")) + "</button></div>" +
      '<div id="aNewForm" hidden><form id="aNewF" class="grid2" autocomplete="off"><div class="field"><label for="ncName">' + esc(t("client_name")) + '</label><input id="ncName" required></div>' +
      '<div class="field"><label for="ncLang">' + esc(t("client_lang")) + "</label>" + langSelectHtml("ncLang", "sr") + "</div>" +
      '<div class="actions" style="grid-column:1/-1"><button class="btn" type="submit">' + esc(t("create")) + '</button><button class="btn ghost" type="button" id="ncCancel">' + esc(t("cancel")) + "</button></div></form></div>" +
      '<div id="aInvite" hidden></div>' +
      '<div class="row">' + STATUS.filter(function (s) { return counts[s]; }).map(function (s) { return '<span class="chip st-' + s + '">' + esc(t("st_" + s)) + " · " + counts[s] + "</span>"; }).join("") + "</div>" +
      '<input id="aSearch" type="search" placeholder="' + esc(t("search")) + '" aria-label="' + esc(t("search")) + '" value="' + esc(S.q) + '">' +
      '<label class="checkrow small"><input type="checkbox" id="aArch"' + (S.showArchived ? " checked" : "") + "><span>" + esc(t("show_archived")) + "</span></label></div>" +
      '<div id="aList" class="view"></div>';
    $("aNew").addEventListener("click", function () { $("aNewForm").hidden = false; $("ncName").focus(); });
    $("ncCancel").addEventListener("click", function () { $("aNewForm").hidden = true; });
    $("aNewF").addEventListener("submit", async function (e) {
      e.preventDefault();
      var name = $("ncName").value.trim(); if (!name) return;
      try {
        var c = await ctx.api.createClient({ name: name, lang: $("ncLang").value });
        $("aNewForm").hidden = true; $("ncName").value = "";
        S.clients = await ctx.api.listClients(); drawList();
        showInvite($("aInvite"), c);
      } catch (err) { toast(t("error_generic")); }
    });
    $("aSearch").addEventListener("input", function () { S.q = $("aSearch").value; drawList(); });
    $("aArch").addEventListener("change", function () { S.showArchived = $("aArch").checked; drawList(); });
    drawList();
  }
  function drawList() {
    var q = S.q.trim().toLowerCase();
    var list = S.clients.filter(function (c) { return (S.showArchived || c.status !== "archived") && (!q || c.name.toLowerCase().indexOf(q) >= 0); });
    var order = { review: 0, intake: 1, active: 2, invited: 3, archived: 4 };
    list.sort(function (a, b) { return (order[a.status] - order[b.status]) || a.name.localeCompare(b.name); });
    $("aList").innerHTML = list.length ? list.map(function (c) {
      var it = c.intake, changed = it && it.submitted_at && (!it.seen_by_trainer_at || it.updated_at > it.seen_by_trainer_at);
      var flags = it && it.answers ? parqPositive(it.answers).length : 0;
      return '<a class="card client-card" href="#/c/' + esc(c.id) + '/' + (c.status === "invited" ? "access" : "intake") + '"><div class="card-h"><b>' + esc(c.name) + '</b><span class="chip st-' + c.status + '">' + esc(t("st_" + c.status)) + "</span></div>" +
        '<div class="row small muted"><span>' + esc((LANGS.filter(function (l) { return l.code === c.lang; })[0] || {}).name || c.lang) + "</span><span>·</span><span>" + esc(t("last_entry", { x: c.lastLog ? fmtShortDate(parseYmd(c.lastLog)) : t("never") })) + "</span>" +
        (c.plan ? "<span>·</span><span>" + esc(c.plan.published ? t("plan_published").split(":")[0] : t("plan_draft").split(":")[0]) + "</span>" : "") + "</div>" +
        (changed || flags ? '<div class="row">' + (changed ? '<span class="badge warnb">' + esc(t("new_changes")) + "</span>" : "") + (flags ? '<span class="badge bad">PAR-Q · ' + flags + "</span>" : "") + "</div>" : "") + "</a>";
    }).join("") : '<div class="card"><p class="muted">' + esc(t("no_clients")) + "</p></div>";
  }
  function showInvite(el, c) {
    if (!c.invite_code) { el.hidden = true; return; }
    var msg = inviteText(c.lang, { name: c.name.split(" ")[0], url: ctx.appUrl, code: c.invite_code });
    el.hidden = false;
    el.innerHTML = '<div class="invite"><h3>' + esc(t("invite_title")) + '</h3><p class="code">' + esc(c.invite_code) + '</p><pre class="msg">' + esc(msg) + '</pre><div class="actions"><button type="button" class="btn small" data-copyinv>' + esc(t("copy_invite")) + "</button></div></div>";
    el.querySelector("[data-copyinv]").addEventListener("click", async function () { toast((await copyText(msg)) ? t("copied") : t("error_generic")); });
  }

  /* ---------- detail ---------- */
  async function openClient(id, tab) {
    var m = $("aMain");
    if (!S.detail || S.detail.id !== id) {
      m.innerHTML = '<p class="muted">' + esc(t("loading")) + "</p>";
      try {
        var c = await ctx.api.getClient(id);
        if (!c) { nav("#/"); return; }
        var res = await Promise.all([ctx.api.getIntake(id), ctx.api.getPlan(id), ctx.api.listDaily(id), ctx.api.listSessions(id), ctx.api.listMembers(id), ctx.api.getPrivate(id)]);
        S.detail = { id: id, client: c, intake: res[0], plan: res[1], daily: res[2] || [], sessions: res[3] || [], members: res[4] || [], note: res[5] || "" };
      } catch (e) { m.innerHTML = '<div class="card"><p class="form-err">' + esc(t("error_generic")) + "</p></div>"; return; }
    }
    var D = S.detail, c2 = D.client;
    var tabs = ["intake", "sections", "plan", "logs", "access"];
    if (tabs.indexOf(tab) < 0) tab = "intake";
    m.innerHTML = '<div class="card"><a href="#/" class="linkbtn">‹ ' + esc(t("back_to_clients")) + '</a><div class="card-h"><h2>' + esc(c2.name) + '</h2><span class="chip st-' + c2.status + '">' + esc(t("st_" + c2.status)) + "</span></div>" +
      '<div class="seg tabs5" role="tablist">' + tabs.map(function (k) { return '<a role="tab" href="#/c/' + esc(id) + "/" + k + '" aria-selected="' + (k === tab) + '">' + esc(t("t_" + k)) + "</a>"; }).join("") + "</div></div>" +
      '<div id="aTab" class="view"></div>';
    ({ intake: tabIntake, sections: tabSections, plan: tabPlan, logs: tabLogs, access: tabAccess })[tab]($("aTab"), D);
  }
  async function refreshDetail() { var id = S.detail.id; S.detail = null; await openClient(id, (location.hash.split("/")[3] || "intake")); }

  /* Upitnik */
  function tabIntake(el, D) {
    var it = D.intake, lang = getLang();
    if (!it || !Object.keys(it.answers || {}).length) { el.innerHTML = '<div class="card"><p class="muted">' + esc(t("intake_none")) + "</p></div>"; return; }
    var a = it.answers, parq = parqPositive(a);
    var changed = it.submitted_at && (!it.seen_by_trainer_at || it.updated_at > it.seen_by_trainer_at);
    var h = '<div class="card"><div class="row small muted">' + (it.submitted_at ? "<span>" + esc(t("submitted_on", { x: fmtShortDate(new Date(it.submitted_at)) })) + "</span>" : "<span>" + esc(t("st_intake")) + "</span>") +
      (it.updated_at ? "<span>·</span><span>" + esc(t("updated_on", { x: fmtShortDate(new Date(it.updated_at)) })) + "</span>" : "") + "</div>" +
      (parq.length ? '<div class="hint bad">' + esc(t("parq_warn")) + "</div>" : "") +
      '<div class="actions"><button type="button" class="btn small" id="iClaude">' + esc(t("copy_claude")) + "</button>" + (changed ? '<button type="button" class="btn ghost small" id="iSeen">' + esc(t("mark_seen")) + "</button>" : "") + '</div><p class="small muted">' + esc(t("copy_claude_hint")) + "</p></div>";
    SECTIONS.forEach(function (s) {
      if (s.id === "consent") return;
      var rows = s.fields.filter(function (f) { return fieldVisible(f, a) && displayValue(f, a[f.id], lang); }).map(function (f) {
        var fl = isFlagged(f, a[f.id]);
        return '<div class="ans' + (fl ? " flag" : "") + '"><span class="ak">' + esc(tx(f.label, lang)) + '</span><span class="av">' + esc(displayValue(f, a[f.id], lang)) + "</span></div>";
      });
      var st = (it.progress || {})[s.id];
      h += '<div class="card"><div class="card-h"><h3>' + esc(tx(s.title, lang)) + "</h3>" + (!rows.length ? '<span class="badge">' + esc(st === "skipped" ? t("skipped") : t("not_filled")) + "</span>" : "") + "</div>" + rows.join("") + "</div>";
    });
    el.innerHTML = h;
    $("iClaude").addEventListener("click", async function () { toast((await copyText(claudePrompt(D.client, a))) ? t("copied") : t("error_generic")); });
    if ($("iSeen")) $("iSeen").addEventListener("click", async function () { await ctx.api.markSeen(D.id); await refreshDetail(); });
  }

  /* Sekcije */
  function tabSections(el, D) {
    var a = (D.intake && D.intake.answers) || {}, prog = (D.intake && D.intake.progress) || {};
    var defs = defaultSections(a, prog), cur = D.client.sections || {}, hasSaved = Object.keys(cur).length > 0, p = D.plan ? D.plan.data : {};
    var intakeFor = {};
    SECTIONS.forEach(function (s) { if (sectionAnswered(s, a)) s.feeds.forEach(function (k) { intakeFor[k] = true; }); });
    el.innerHTML = '<div class="card"><p class="small muted">' + esc(t("sections_hint")) + '</p><div class="toggles">' + SECTION_KEYS.map(function (k) {
      var val = hasSaved ? !!cur[k] : (k === "today" || k === "progress" || !!defs[k]);
      return '<label class="toggle"><input type="checkbox" data-sec="' + k + '"' + (val ? " checked" : "") + '><span class="tg-l"><b>' + esc(t(SECTION_LABEL[k])) + "</b><small>" +
        esc((intakeFor[k] || k === "today" ? t("from_intake_yes") : t("from_intake_no")) + " · " + (planHas(k, p) ? t("has_content") : t("no_content"))) + '</small></span><span class="sw" aria-hidden="true"></span></label>';
    }).join("") + '</div><div class="actions"><button type="button" class="btn" id="secSave">' + esc(t("save")) + '</button><span class="status" id="secSt" role="status"></span></div></div>';
    $("secSave").addEventListener("click", async function () {
      var sec = {}; qsa("[data-sec]", el).forEach(function (i) { sec[i.dataset.sec] = i.checked; });
      $("secSt").textContent = t("saving");
      try { D.client = await ctx.api.updateClient(D.id, { sections: sec }); $("secSt").textContent = t("saved_at", { time: nowHM() }); }
      catch (e) { $("secSt").textContent = t("not_saved"); }
    });
  }

  /* Plan */
  function tabPlan(el, D) {
    var plan = D.plan, data = plan ? plan.data : null, pub = plan && plan.published;
    var text = data && Object.keys(data).length ? JSON.stringify(data, null, 2) : "";
    el.innerHTML = '<div class="card"><div class="card-h"><h3>' + esc(t("t_plan")) + '</h3><span class="badge ' + (pub ? "ok" : "") + '">' + esc(plan ? (pub ? t("plan_published") : t("plan_draft")) : t("plan_empty")) + "</span></div>" +
      '<div class="field"><label for="pJson">' + esc(t("plan_json")) + '</label><textarea id="pJson" class="code" rows="14" spellcheck="false" placeholder="{ … }">' + esc(text) + '</textarea><p class="q-help">' + esc(t("plan_json_hint")) + "</p></div>" +
      '<div id="pCheck" role="status"></div>' +
      '<div class="actions"><button type="button" class="btn ghost small" id="pVal">' + esc(t("validate")) + '</button><button type="button" class="btn ghost small" id="pDraft">' + esc(t("save_draft")) + "</button>" +
      '<button type="button" class="btn small" id="pPub">' + esc(pub ? t("unpublish") : t("publish")) + '</button><button type="button" class="btn ghost small" id="pPrev">' + esc(t("preview")) + '</button><button type="button" class="btn ghost small" id="pCopy">' + esc(t("copy")) + "</button></div></div>" +
      '<div class="card"><h3>' + esc(t("messages")) + '</h3><div id="pNotes" class="notes"></div><div class="field"><label for="pMsg">' + esc(t("add_message")) + '</label><textarea id="pMsg" rows="2"></textarea></div><div class="actions"><button type="button" class="btn small" id="pAddMsg">' + esc(t("add")) + "</button></div></div>";
    function drawNotes() {
      var notes = (D.plan && D.plan.data && D.plan.data.notes) || [];
      $("pNotes").innerHTML = notes.length ? notes.map(function (n, i) { return '<div class="note"><span class="when">' + esc(n.date ? fmtShortDate(parseYmd(n.date)) : "") + '</span><p>' + esc(n.text) + '</p><button type="button" class="linkbtn" data-rm="' + i + '">' + esc(t("remove")) + "</button></div>"; }).join("") : '<p class="muted small">—</p>';
      qsa("[data-rm]", $("pNotes")).forEach(function (b) {
        b.addEventListener("click", async function () { var d = Object.assign({}, D.plan.data); d.notes = (d.notes || []).filter(function (_, i) { return i !== Number(b.dataset.rm); }); await save(d, D.plan.published); drawNotes(); });
      });
    }
    function check() {
      var r = validatePlan($("pJson").value);
      $("pCheck").innerHTML = r.ok ? '<div class="hint ok">' + esc(t("json_ok", { x: r.summary })) + "</div>" + (r.warnings.length ? '<div class="hint warn">' + r.warnings.map(esc).join("<br>") + "</div>" : "")
        : '<div class="hint bad">' + esc(t("json_err", { x: "" })) + "<br>" + r.errors.slice(0, 12).map(esc).join("<br>") + "</div>";
      return r;
    }
    async function save(data, published) {
      D.plan = await ctx.api.savePlan(D.id, data, published);
      if (published && (D.client.status === "review" || D.client.status === "intake" || D.client.status === "invited")) D.client = await ctx.api.updateClient(D.id, { status: "active" });
      return D.plan;
    }
    $("pVal").addEventListener("click", check);
    $("pDraft").addEventListener("click", async function () {
      var r = check(); if (!r.ok) return;
      try { await save(r.plan, D.plan ? D.plan.published : false); toast(t("saved")); tabPlan(el, D); } catch (e) { toast(t("not_saved")); }
    });
    $("pPub").addEventListener("click", async function () {
      var r = check(); if (!r.ok) return;
      try { await save(r.plan, !(D.plan && D.plan.published)); toast(t("saved")); tabPlan(el, D); } catch (e) { toast(t("not_saved")); }
    });
    $("pPrev").addEventListener("click", function () {
      var r = check(); if (!r.ok) return;
      ctx.onPreview(D.client, r.plan, D.id);
    });
    $("pCopy").addEventListener("click", async function () { toast((await copyText($("pJson").value)) ? t("copied") : t("error_generic")); });
    $("pAddMsg").addEventListener("click", async function () {
      var txt = $("pMsg").value.trim(); if (!txt) return;
      var d = Object.assign({}, (D.plan && D.plan.data) || {});
      d.notes = [{ date: today(), text: txt }].concat(d.notes || []);
      try { await save(d, D.plan ? D.plan.published : false); $("pMsg").value = ""; toast(t("message_added")); $("pJson").value = JSON.stringify(d, null, 2); drawNotes(); } catch (e) { toast(t("not_saved")); }
    });
    drawNotes();
  }

  /* Unosi */
  function tabLogs(el, D) {
    var days = D.daily.slice().sort(function (a, b) { return b.day.localeCompare(a.day); });
    var p = (D.plan && D.plan.data) || {}, painLabel = p.checkin && p.checkin.pain ? (typeof p.checkin.pain === "string" ? p.checkin.pain : t("pain_default")) : null;
    if (!days.length && !D.sessions.length) { el.innerHTML = '<div class="card"><p class="muted">' + esc(t("logs_empty")) + "</p></div>"; return; }
    var weeks = {};
    days.forEach(function (r) { var w = monday(r.day); (weeks[w] = weeks[w] || []).push(r); });
    var wk = Object.keys(weeks).sort().reverse().map(function (w) {
      var ws = weeks[w].map(function (r) { return num(r.data.weight); }).filter(function (x) { return x != null; });
      var sl = weeks[w].map(function (r) { return num(r.data.sleep); }).filter(function (x) { return x != null; });
      var tr = D.sessions.filter(function (s) { return s.day >= w && s.day <= addDays(w, 6); }).length;
      return "<tr><td>" + esc(fmtRange(parseYmd(w), parseYmd(addDays(w, 6)))) + '</td><td class="n">' + (ws.length ? f1(ws.reduce(function (a, b) { return a + b; }, 0) / ws.length) + " kg" : "—") + '</td><td class="n">' + (sl.length ? f1(sl.reduce(function (a, b) { return a + b; }, 0) / sl.length) + " h" : "—") + '</td><td class="n">' + tr + "</td></tr>";
    }).join("");
    var h = '<div class="card"><h3>' + esc(t("week_avg")) + '</h3><div class="table-wrap"><table><tr><th>' + esc(t("col_week")) + '</th><th class="n">' + esc(t("col_avg")) + '</th><th class="n">' + esc(t("col_sleep")) + '</th><th class="n">' + esc(t("col_trainings")) + "</th></tr>" + wk + "</table></div></div>";
    h += '<div class="card"><h3>' + esc(t("daily_title")) + '</h3><div class="table-wrap"><table><tr><th>' + esc(t("date")) + '</th><th class="n">kg</th><th class="n">h</th>' + (painLabel ? '<th class="n">' + esc(painLabel) + "</th>" : "") + '<th class="n">cm</th><th>' + esc(t("note")) + "</th></tr>" +
      days.slice(0, 60).map(function (r) {
        var d = r.data || {};
        return "<tr><td>" + esc(fmtShortDate(parseYmd(r.day))) + '</td><td class="n">' + (num(d.weight) != null ? f1(num(d.weight)) : "—") + '</td><td class="n">' + (num(d.sleep) != null ? f1(num(d.sleep)) : "—") + "</td>" + (painLabel ? '<td class="n">' + (d.pain != null ? esc(d.pain) : "—") + "</td>" : "") + '<td class="n">' + (num(d.waist) != null ? f1(num(d.waist)) : "—") + "</td><td>" + (d.easy ? '<span class="badge warnb">' + esc(t("easy_day")) + ": " + esc(t(d.easy === "walk" ? "easy_walk" : d.easy === "move" ? "easy_moved_away" : "easy_light")) + "</span> " : "") + esc(d.note || "") + "</td></tr>";
      }).join("") + "</table></div></div>";
    var ss = D.sessions.slice().sort(function (a, b) { return b.day.localeCompare(a.day); });
    h += '<div class="card"><h3>' + esc(t("sessions_title")) + "</h3>" + (ss.length ? ss.slice(0, 30).map(function (s) {
      var e = (s.data && s.data.entries) || {};
      return '<details class="recipe"><summary><b>' + esc(fmtShortDate(parseYmd(s.day))) + " · " + esc((s.data && s.data.title) || s.workout) + '</b><span class="small muted">' + Object.keys(e).length + '</span></summary><div class="rb">' +
        Object.keys(e).map(function (k) { return '<div class="ans"><span class="ak">' + esc(k) + '</span><span class="av">' + esc(e[k]) + "</span></div>"; }).join("") + (s.data && s.data.note ? '<p class="small">' + esc(s.data.note) + "</p>" : "") + "</div></details>";
    }).join("") : '<p class="muted small">—</p>') + "</div>";
    el.innerHTML = h;
  }

  /* Pristup */
  function tabAccess(el, D) {
    var c = D.client;
    el.innerHTML = '<div class="card"><h3>' + esc(t("invite_code_label")) + '</h3><div id="acInv"></div>' + (!c.invite_code ? '<p class="small muted">' + esc(t("code_used")) + "</p>" : "") +
      '<div class="actions"><button type="button" class="btn ghost small" id="acCode">' + esc(t("new_code")) + "</button></div>" +
      '<p class="small muted">' + esc(t("app_link")) + ": " + esc(ctx.appUrl) + "</p></div>" +
      '<div class="card"><h3>' + esc(t("linked")) + '</h3><ul class="list" id="acMembers">' + (D.members.length ? D.members.map(function (m) {
        return "<li><span>" + esc(m.email || m.user_id) + '<br><span class="small muted">' + esc(m.created_at ? fmtShortDate(new Date(m.created_at)) : "") + '</span></span><button type="button" class="btn ghost small" data-unlink="' + esc(m.user_id) + '">' + esc(t("unlink")) + "</button></li>";
      }).join("") : '<li class="muted">' + esc(t("none_linked")) + "</li>") + "</ul></div>" +
      '<div class="card"><div class="grid2"><div class="field"><label for="acName">' + esc(t("client_name")) + '</label><input id="acName" value="' + esc(c.name) + '"></div>' +
      '<div class="field"><label for="acLang">' + esc(t("client_lang")) + "</label>" + langSelectHtml("acLang", c.lang) + "</div>" +
      '<div class="field"><label for="acStatus">' + esc(t("status_label")) + '</label><select id="acStatus">' + STATUS.map(function (s) { return '<option value="' + s + '"' + (s === c.status ? " selected" : "") + ">" + esc(t("st_" + s)) + "</option>"; }).join("") + "</select></div></div>" +
      '<div class="field"><label for="acNote">' + esc(t("private_note")) + '</label><textarea id="acNote" rows="3">' + esc(D.note) + "</textarea></div>" +
      '<div class="actions"><button type="button" class="btn" id="acSave">' + esc(t("save")) + '</button><span class="status" id="acSt" role="status"></span></div></div>' +
      '<div class="card danger"><h3>' + esc(t("delete_client")) + '</h3><p class="small">' + esc(t("delete_confirm")) + '</p><input id="acDelName" aria-label="' + esc(t("client_name")) + '"><div class="actions"><button type="button" class="btn danger-btn small" id="acDel">' + esc(t("delete_client")) + "</button></div></div>";
    if (c.invite_code) showInvite($("acInv"), c);
    if (c.invite_code && !(ctx.me && ctx.me.clientId)) {
      var lm = document.createElement("div");
      lm.className = "actions";
      lm.innerHTML = '<button type="button" class="btn ghost small" id="acMe">' + esc(t("link_me")) + '</button><span class="small muted">' + esc(t("link_me_hint")) + "</span>";
      $("acInv").appendChild(lm);
      $("acMe").addEventListener("click", async function () {
        try { await ctx.api.claimInvite(c.invite_code); toast(t("linked_me")); location.hash = "#/"; ctx.onRelinked(); } catch (e) { toast(t("error_generic")); }
      });
    }
    $("acCode").addEventListener("click", async function () { try { D.client = await ctx.api.newInviteCode(D.id); tabAccess(el, D); } catch (e) { toast(t("error_generic")); } });
    qsa("[data-unlink]", el).forEach(function (b) { b.addEventListener("click", async function () { await ctx.api.removeMember(b.dataset.unlink); D.members = await ctx.api.listMembers(D.id); tabAccess(el, D); }); });
    $("acSave").addEventListener("click", async function () {
      $("acSt").textContent = t("saving");
      try {
        D.client = await ctx.api.updateClient(D.id, { name: $("acName").value.trim() || c.name, lang: $("acLang").value, status: $("acStatus").value });
        await ctx.api.savePrivate(D.id, $("acNote").value); D.note = $("acNote").value;
        $("acSt").textContent = t("saved_at", { time: nowHM() });
      } catch (e) { $("acSt").textContent = t("not_saved"); }
    });
    $("acDel").addEventListener("click", async function () {
      if ($("acDelName").value.trim() !== c.name) { $("acDelName").focus(); return; }
      try { await ctx.api.deleteClient(D.id); toast(t("deleted")); S.detail = null; nav("#/"); } catch (e) { toast(t("error_generic")); }
    });
  }

  route();
  return { destroy: function () { window.removeEventListener("hashchange", route); } };
}
