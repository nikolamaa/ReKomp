// Trenerski panel: klijenti, upitnik, sekcije, plan, unosi, pristup.
import { $, qsa, esc, parseYmd, addDays, monday, num, f1, nowHM, copyText, toast, today, isIOS, isStandalone } from "./util.js";
import { t, getLang, fmtShortDate, fmtRange, inviteText, langSelectHtml, LANGS } from "./i18n.js";
import { SECTIONS, tx, fieldVisible, displayValue, isFlagged, parqPositive, sectionAnswered, defaultSections } from "./intake.js";
import { validatePlan, claudePrompt, initials } from "./plan-format.js";
import { brandHtml } from "./client.js";
import { computeInsights } from "./insights.js";
import { FIELD_INDEX, optionLabel } from "./intake.js";

var SECTION_KEYS = ["today", "training", "nutrition", "calendar", "weekpick", "progress", "rules", "supplements"];
var SECTION_LABEL = { today: "sec_today", training: "sec_training", nutrition: "sec_nutrition", calendar: "sec_calendar", weekpick: "sec_weekpick", progress: "sec_progress", rules: "sec_rules", supplements: "sec_supplements" };
var STATUS = ["invited", "intake", "review", "active", "archived"];

function planHas(k, p) {
  p = p || {};
  if (k === "today" || k === "progress") return true;
  if (k === "training") return !!(p.program && (p.program.workouts || []).length);
  if (k === "nutrition") return !!(Object.keys(p.rhythms || {}).some(function (r) { return (p.rhythms[r].meals || []).length; }) || Object.keys(p.recipes || {}).length || (p.shopping && (p.shopping.items || []).length));
  if (k === "calendar" || k === "weekpick") return !!(Object.keys(p.calendar || {}).length || Object.keys(p.weekTemplate || {}).length);
  if (k === "rules") return !!(p.rules || []).length;
  if (k === "supplements") return !!(p.supplements || []).length;
  return false;
}

// ctx: { api, appName, appUrl, me, onPreview(client, plan), onOwnPlan, onLogout, onLang }
export function mountAdmin(root, ctx) {
  var S = { clients: [], showArchived: false, q: "", detail: null, ins: null, prWeeks: 8, prMetric: "weight", prHidden: {}, menus: null, menusOk: false };

  // Tekstualni fajl: preuzimanje, a u iPhone aplikaciji sa početnog ekrana deljenje (tamo preuzimanje ne radi pouzdano).
  function downloadText(name, text) {
    var file = null; try { file = new File([text], name, { type: "text/plain" }); } catch (e) { file = null; }
    if (isIOS() && isStandalone() && file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: name }).catch(function () {}); return;
    }
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }

  /* ---------- meniji sa posla (za proveru planova) ---------- */
  async function loadMenus(force) {
    if (S.menus && !force) return S.menus;
    try { var list = await ctx.api.listWorkMenus(), m = {}; (list || []).forEach(function (x) { if (x && x.id) m[x.id] = x; }); S.menus = m; S.menusOk = true; }
    catch (e) { S.menus = {}; S.menusOk = false; }   // tabela trainer_files još ne postoji
    return S.menus;
  }
  function menuValid(x) {
    if (!x || typeof x !== "object" || !/^[a-z0-9_-]{2,40}$/.test(String(x.id || "")) || !x.shifts || typeof x.shifts !== "object") return false;
    return Object.keys(x.shifts).every(function (k) {
      var sh = x.shifts[k]; return sh && typeof sh === "object" && Object.keys(sh).every(function (d) { return Array.isArray(sh[d]) && sh[d].every(function (v) { return typeof v === "string"; }); });
    });
  }
  async function drawMenus() {
    var el = $("aMenus"); if (!el) return;
    await loadMenus();
    if (!$("aMenus")) return;
    var ids = Object.keys(S.menus).sort();
    el.innerHTML = '<div class="card"><h3>' + esc(t("menus_title")) + '</h3><p class="small muted">' + esc(t("menus_hint")) + "</p>" +
      (!S.menusOk ? '<p class="small form-err">' + esc(t("menus_missing_db")) + "</p>" :
        (ids.length ? '<ul class="list">' + ids.map(function (id) { var m = S.menus[id]; return "<li><span><b>" + esc(m.name || id) + '</b> <span class="small muted">workplace: ' + esc(id) + "</span></span><span class=\"small muted\">" + esc(t("menu_updated", { x: /^\d{4}-\d{2}-\d{2}$/.test(m.updated || "") ? fmtShortDate(parseYmd(m.updated)) : (m.updated || "—") })) + "</span></li>"; }).join("") + "</ul>"
          : '<p class="small muted">' + esc(t("menus_none")) + "</p>")) +
      (S.menusOk ? '<div class="actions"><label class="btn ghost small" for="aMenuFile">' + esc(t("menus_load")) + '</label><input type="file" id="aMenuFile" accept=".json,.txt,application/json,text/plain" hidden><span class="status" id="aMenuSt" role="status"></span></div>' : "") + "</div>";
    var inp = $("aMenuFile"); if (!inp) return;
    inp.addEventListener("change", function () {
      var f = inp.files[0]; inp.value = ""; if (!f) return;
      var rd = new FileReader();
      rd.onload = async function () {
        var x = null; try { x = JSON.parse(String(rd.result || "").replace(/^\uFEFF/, "")); } catch (e) { x = null; }
        if (!menuValid(x)) { $("aMenuSt").textContent = t("menus_bad"); return; }
        $("aMenuSt").textContent = t("saving");
        try { await ctx.api.saveWorkMenu(x); await loadMenus(true); await drawMenus(); toast(t("menus_saved")); }
        catch (e) { $("aMenuSt").textContent = t("not_saved"); }
      };
      rd.readAsText(f);
    });
  }

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
    if (h[0] === "napredak") return renderProgress();
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
      '<div id="aOverview"></div><div id="aList" class="view"></div><div id="aMenus"></div>';
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
    drawOverview();
    drawMenus();
  }

  /* ---------- pregled i napredak ---------- */
  var PALETTE = ["#F27F70", "#6FB7FF", "#7AD3A0", "#F2C14E", "#B79CFF", "#FF9DCB", "#5ED6D0", "#C9D36A", "#FFB077", "#9FB3C8"];
  async function loadInsightData(force) {
    if (S.ins && !force && Date.now() - S.ins.at < 60000) return S.ins;
    var since = addDays(monday(today()), -7 * 12);
    var res = await Promise.all([ctx.api.listPlans(), ctx.api.listAllDaily(since), ctx.api.listAllSessions(since),
      ctx.api.listAllWeeks(since).catch(function () { return []; })]);   // week_plans možda još ne postoji
    var plans = {}; (res[0] || []).forEach(function (p) { plans[p.client_id] = p; });
    var goals = {}; S.clients.forEach(function (c) { if (c.intake && c.intake.answers) goals[c.id] = c.intake.answers.goal_main || null; });
    var colors = {}; S.clients.filter(function (c) { return c.status === "active"; }).sort(function (a, b) { return a.name.localeCompare(b.name); }).forEach(function (c, i) { colors[c.id] = PALETTE[i % PALETTE.length]; });
    S.ins = { at: Date.now(), plans: plans, goals: goals, daily: res[1] || [], sessions: res[2] || [], weeks: res[3] || [], colors: colors };
    return S.ins;
  }
  function insights(weeks) {
    return computeInsights({ clients: S.clients, plans: S.ins.plans, goals: S.ins.goals, daily: S.ins.daily, sessions: S.ins.sessions, weeks: S.ins.weeks }, { weeks: weeks });
  }
  function reasonText(r) {
    var v = Object.assign({}, r.vars);
    if (v.x != null && typeof v.x === "number" && r.key !== "r_adherence" && r.key !== "r_pain") v.x = f1(Math.abs(v.x));
    return t(r.key, v);
  }
  function statusBadge(st) { var cls = { good: "ok", watch: "warnb", bad: "bad", nodata: "" }[st]; return '<span class="badge ' + cls + '">' + esc(t("pg_" + st)) + "</span>"; }
  async function drawOverview() {
    var el = $("aOverview"); if (!el) return;
    var active = S.clients.filter(function (c) { return c.status === "active"; });
    var btns = '<div class="actions"><a class="btn small" href="#/napredak">' + esc(t("ov_progress_btn")) + '</a><button type="button" class="btn ghost small" id="aBackup">' + esc(t("ov_backup_btn")) + "</button></div>";
    if (!active.length) { el.innerHTML = '<div class="card"><h3>' + esc(t("ov_title")) + '</h3><p class="small muted">' + esc(t("ov_none_active")) + "</p>" + btns + "</div>"; bindBackup(); return; }
    el.innerHTML = '<div class="card"><h3>' + esc(t("ov_title")) + '</h3><p class="muted small">' + esc(t("loading")) + "</p></div>";
    try { await loadInsightData(); } catch (e) { el.innerHTML = '<div class="card"><h3>' + esc(t("ov_title")) + '</h3><p class="small form-err">' + esc(t("error_generic")) + "</p>" + btns + "</div>"; bindBackup(); return; }
    if (!$("aOverview")) return;
    var R = insights(4).rows, need = R.filter(function (r) { return r.status === "bad" || r.status === "watch"; });
    var cnt = { good: 0, watch: 0, bad: 0, nodata: 0 }; R.forEach(function (r) { cnt[r.status]++; });
    el.innerHTML = '<div class="card"><div class="card-h"><h3>' + esc(t("ov_title")) + '</h3><span class="small muted">' + esc(t("ov_last_weeks", { n: 4 })) + "</span></div>" +
      '<div class="row">' + ["bad", "watch", "good", "nodata"].filter(function (k) { return cnt[k]; }).map(function (k) { return statusBadge(k).replace("</span>", " · " + cnt[k] + "</span>"); }).join("") + "</div>" +
      (need.length ? '<ul class="ov-list">' + need.slice(0, 8).map(function (r) {
        return '<li><a href="#/c/' + esc(r.client.id) + '/logs"><span class="ov-dot" style="background:' + S.ins.colors[r.client.id] + '"></span><b>' + esc(r.client.name) + "</b> " + statusBadge(r.status) +
          '<span class="small muted">' + esc(r.reasons.filter(function (x) { return x.level > 0; }).map(reasonText).join(" · ")) + "</span></a></li>";
      }).join("") + "</ul>" : '<p class="small muted">' + esc(t("ov_all_good")) + "</p>") + btns + "</div>";
    bindBackup();
  }
  function bindBackup() {
    var b = $("aBackup"); if (!b) return;
    b.addEventListener("click", async function () {
      b.disabled = true;
      try {
        var data = await ctx.api.exportAll();
        var blob = new Blob([JSON.stringify({ app: "ReKomp", exported_at: new Date().toISOString(), data: data }, null, 1)], { type: "application/json" });
        var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "rekomp-rezervna-kopija-" + today() + ".json";
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
        toast(t("backup_done"));
      } catch (e) { toast(t("error_generic")); }
      b.disabled = false;
    });
  }

  async function renderProgress() {
    S.detail = null;
    var m = $("aMain");
    m.innerHTML = '<p class="muted">' + esc(t("loading")) + "</p>";
    try { if (!S.clients.length) S.clients = await ctx.api.listClients(); await loadInsightData(); }
    catch (e) { m.innerHTML = '<div class="card"><p class="form-err">' + esc(t("error_generic")) + "</p></div>"; return; }
    var I = insights(S.prWeeks), rows = I.rows;
    var metrics = ["weight", "waist", "strength", "adherence"];
    m.innerHTML = '<div class="card"><a href="#/" class="linkbtn">‹ ' + esc(t("back_to_clients")) + "</a><h2>" + esc(t("pr_title")) + "</h2>" +
      '<div class="seg pr-seg" id="prWeeks">' + [4, 8, 12].map(function (n) { return '<button type="button" data-w="' + n + '" aria-pressed="' + (S.prWeeks === n) + '">' + esc(t("pr_weeks", { n: n })) + "</button>"; }).join("") + "</div>" +
      '<div class="seg pr-seg" id="prMetric">' + metrics.map(function (k) { return '<button type="button" data-m="' + k + '" aria-pressed="' + (S.prMetric === k) + '">' + esc(t("pr_m_" + k)) + "</button>"; }).join("") + "</div>" +
      '<p class="small muted">' + esc(t("pr_y_" + S.prMetric)) + '</p><div id="prChart"></div><div id="prLegend" class="pr-legend"></div></div>' +
      '<div class="card"><div class="card-h"><h3>' + esc(t("pr_table")) + '</h3><label class="small muted pr-sort">' + esc(t("pr_sort")) + ' <select id="prSort">' +
      ["status", "weight", "strength", "adherence"].map(function (k) { return '<option value="' + k + '"' + (S.prSort === k ? " selected" : "") + ">" + esc(t("pr_sort_" + k)) + "</option>"; }).join("") + "</select></label></div>" +
      '<div class="pr-cards">' + (rows.length ? sortRows(rows).map(rowHtml).join("") : '<p class="muted">' + esc(t("ov_none_active")) + "</p>") + "</div>" +
      '<p class="small muted">' + esc(t("pr_note")) + "</p></div>";
    qsa("#prWeeks button", m).forEach(function (b) { b.addEventListener("click", function () { S.prWeeks = Number(b.dataset.w); renderProgress(); }); });
    qsa("#prMetric button", m).forEach(function (b) { b.addEventListener("click", function () { S.prMetric = b.dataset.m; renderProgress(); }); });
    $("prSort").addEventListener("change", function () { S.prSort = $("prSort").value; renderProgress(); });
    drawChart(I);
  }
  function sign(x, dec) { var r = Number(Number(x).toFixed(dec == null ? 1 : dec)); return (r > 0 ? "+" : r < 0 ? "−" : "") + f1(Math.abs(r), dec); }
  function sortRows(rows) {
    var k = S.prSort || "status", list = rows.slice();
    function v(r) { return k === "weight" ? r.weight.pct : k === "strength" ? r.strength : k === "adherence" ? r.adherence : null; }
    if (k === "status") return list;
    return list.sort(function (a, b) {
      var x = v(a), y = v(b); if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
      return k === "weight" ? x - y : y - x;
    });
  }
  function stat(label, value, sub) { return '<div class="pr-stat"><span class="pr-l">' + esc(label) + '</span><span class="pr-v">' + value + "</span>" + (sub ? '<span class="pr-s">' + esc(sub) + "</span>" : "") + "</div>"; }
  function rowHtml(r) {
    var goal = r.goal && FIELD_INDEX.goal_main ? optionLabel(FIELD_INDEX.goal_main, r.goal, getLang()) : "";
    var reasons = r.reasons.map(reasonText).join(" · ");
    return '<div class="pr-card" data-cid="' + esc(r.client.id) + '"><div class="pr-head"><a href="#/c/' + esc(r.client.id) + '/logs"><span class="ov-dot" style="background:' + S.ins.colors[r.client.id] + '"></span><b>' + esc(r.client.name) + "</b></a>" + statusBadge(r.status) + "</div>" +
      (goal ? '<div class="small muted">' + esc(goal) + "</div>" : "") + (reasons ? '<div class="small">' + esc(reasons) + "</div>" : "") +
      '<div class="pr-stats">' +
        stat(t("col_weight_rate"), r.weight.rate != null ? esc(sign(r.weight.rate)) + " kg" : "—", r.weight.pct != null ? sign(r.weight.pct, 2) + "%" + (r.weight.status ? " · " + t("w_" + r.weight.status) : "") : "") +
        stat(t("col_waist"), r.waist.rate != null ? esc(sign(r.waist.rate)) + " cm" : "—") +
        stat(t("col_strength"), r.strength != null ? esc(sign(r.strength)) + "%" : "—") +
        stat(t("col_adherence"), r.adherence != null ? r.adherence + "%" : "—", r.planned ? t("pr_planned", { n: r.planned }) : "") +
        stat(t("col_checkins"), r.checkins + "/14", r.easy ? t("r_easy", { n: r.easy }) : "") +
        stat(t("col_last"), esc(r.gap == null ? t("never") : r.gap === 0 ? t("today_word") : t("days_ago", { n: r.gap }))) +
      "</div></div>";
  }
  function drawChart(I) {
    var key = S.prMetric, weeks = I.weeks;
    var lines = I.rows.map(function (r) { return { id: r.client.id, name: r.client.name, color: S.ins.colors[r.client.id], v: r.series[key] }; })
      .filter(function (l) { return l.v.filter(function (x) { return x != null; }).length >= (key === "adherence" ? 1 : 2); });
    var leg = $("prLegend"), box = $("prChart");
    if (!lines.length) { box.innerHTML = '<p class="muted small">' + esc(t("pr_no_data")) + "</p>"; leg.innerHTML = ""; return; }
    var shown = lines.filter(function (l) { return !S.prHidden[l.id]; });
    var vals = []; shown.forEach(function (l) { l.v.forEach(function (x) { if (x != null) vals.push(x); }); });
    var lo = Math.min.apply(null, vals.concat([0])), hi = Math.max.apply(null, vals.concat([0]));
    if (key === "adherence") { lo = 0; hi = Math.max(100, hi); }
    if (hi - lo < 1) { hi += 0.5; lo -= 0.5; }
    var padv = (hi - lo) * 0.1; lo -= key === "adherence" ? 0 : padv; hi += padv;
    var W = 360, H = 210, L = 38, Rm = 10, T = 10, B = 26, iw = W - L - Rm, ih = H - T - B;
    function X(i) { return L + (weeks.length > 1 ? i * iw / (weeks.length - 1) : iw / 2); }
    function Y(v) { return T + (hi - v) / (hi - lo) * ih; }
    var svg = '<svg viewBox="0 0 ' + W + " " + H + '" class="pr-svg" role="img" aria-label="' + esc(t("pr_m_" + key)) + '">';
    for (var g = 0; g <= 4; g++) {
      var gv = lo + (hi - lo) * g / 4, gy = Y(gv);
      svg += '<line x1="' + L + '" x2="' + (W - Rm) + '" y1="' + gy + '" y2="' + gy + '" class="grid"/><text x="' + (L - 6) + '" y="' + (gy + 4) + '" class="ax" text-anchor="end">' + esc(f1(gv, Math.abs(hi - lo) < 6 ? 1 : 0).replace(/^-(0([.,]0+)?)$/, "$1")) + "</text>";
    }
    if (lo < 0 && hi > 0) svg += '<line x1="' + L + '" x2="' + (W - Rm) + '" y1="' + Y(0) + '" y2="' + Y(0) + '" class="zero"/>';
    var step = Math.ceil(weeks.length / 6);
    // Oznake nedelja: poslednja uvek, a prethodna se preskače ako bi se preklopila sa njom.
    weeks.forEach(function (wk, i) {
      var last = i === weeks.length - 1;
      if (!(i % step === 0 || last) || (!last && weeks.length - 1 - i < step)) return;
      var d = parseYmd(wk), anchor = i === 0 ? "start" : last ? "end" : "middle";
      svg += '<text x="' + X(i) + '" y="' + (H - 8) + '" class="ax" text-anchor="' + anchor + '">' + d.getDate() + "." + (d.getMonth() + 1) + ".</text>";
    });
    shown.forEach(function (l) {
      var seg = [], segs = [];
      l.v.forEach(function (v, i) { if (v == null) { if (seg.length) segs.push(seg); seg = []; } else seg.push(X(i).toFixed(1) + "," + Y(v).toFixed(1)); });
      if (seg.length) segs.push(seg);
      segs.forEach(function (s) { svg += '<polyline points="' + s.join(" ") + '" fill="none" stroke="' + l.color + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>'; });
      l.v.forEach(function (v, i) { if (v != null) svg += '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="3" fill="' + l.color + '"><title>' + esc(l.name + ": " + f1(v)) + "</title></circle>"; });
    });
    box.innerHTML = svg + "</svg>";
    leg.innerHTML = lines.map(function (l) { return '<button type="button" data-cid="' + esc(l.id) + '" aria-pressed="' + !S.prHidden[l.id] + '"><span class="ov-dot" style="background:' + l.color + '"></span>' + esc(l.name) + "</button>"; }).join("");
    qsa("button", leg).forEach(function (b) { b.addEventListener("click", function () { S.prHidden[b.dataset.cid] = !S.prHidden[b.dataset.cid]; drawChart(I); }); });
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
      '<div class="actions"><button type="button" class="btn small" id="iClaude">' + esc(t("copy_claude")) + "</button>" + '<button type="button" class="btn ghost small" id="iClaudeTxt">' + esc(t("download_claude")) + "</button>" + (changed ? '<button type="button" class="btn ghost small" id="iSeen">' + esc(t("mark_seen")) + "</button>" : "") + '</div><p class="small muted">' + esc(t("copy_claude_hint")) + "</p></div>";
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
    $("iClaudeTxt").addEventListener("click", function () {
      var tag = initials(D.client.name).replace(/[.\s]/g, "") || "klijent";
      downloadText("upitnik_" + tag + "_" + today() + ".txt", claudePrompt(D.client, a));
    });
    if ($("iSeen")) $("iSeen").addEventListener("click", async function () { await ctx.api.markSeen(D.id); await refreshDetail(); });
  }

  /* Sekcije */
  function tabSections(el, D) {
    var a = (D.intake && D.intake.answers) || {}, prog = (D.intake && D.intake.progress) || {};
    var defs = defaultSections(a, prog), cur = D.client.sections || {}, hasSaved = Object.keys(cur).length > 0, p = D.plan ? D.plan.data : {};
    var intakeFor = {};
    SECTIONS.forEach(function (s) { if (sectionAnswered(s, a)) s.feeds.forEach(function (k) { intakeFor[k] = true; }); });
    if (defs.weekpick) intakeFor.weekpick = true;
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
      '<div class="actions"><label class="btn small" for="pFile">' + esc(t("load_file")) + '</label><input type="file" id="pFile" accept=".txt,.json,text/plain,application/json" hidden><span class="small muted">' + esc(t("load_file_hint")) + "</span></div>" +
      '<div class="field"><label for="pJson">' + esc(t("plan_json")) + '</label><textarea id="pJson" class="code" rows="14" spellcheck="false" placeholder="{ … }">' + esc(text) + '</textarea><p class="q-help">' + esc(t("plan_json_hint")) + "</p></div>" +
      '<div id="pCheck" role="status"></div>' +
      '<div class="actions"><button type="button" class="btn ghost small" id="pVal">' + esc(t("validate")) + '</button><button type="button" class="btn ghost small" id="pDraft">' + esc(pub ? t("save_changes") : t("save_draft")) + "</button>" +
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
      var r = validatePlan($("pJson").value, { menus: S.menus || {} });
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
    if (!S.menus) loadMenus().then(function () { if ($("pCheck") && $("pCheck").innerHTML) check(); });
    // Plan iz .txt / .json fajla (dugme ili prevlačenje fajla na polje)
    function loadFile(file) {
      if (!file) return;
      var rd = new FileReader();
      rd.onload = function () {
        var txt = String(rd.result || "").replace(/^\uFEFF/, "").trim();
        if (/^```/.test(txt)) txt = txt.replace(/^```[a-z]*\s*/i, "").replace(/\s*```\s*$/, "");
        $("pJson").value = txt;
        var r = check();
        toast(t("file_loaded", { name: file.name }));
        $("pCheck").scrollIntoView({ behavior: "smooth", block: "center" });
        return r;
      };
      rd.onerror = function () { toast(t("file_error")); };
      rd.readAsText(file);
    }
    $("pFile").addEventListener("change", function () { loadFile($("pFile").files[0]); $("pFile").value = ""; });
    $("pJson").addEventListener("dragover", function (e) { e.preventDefault(); });
    $("pJson").addEventListener("drop", function (e) {
      if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return;
      e.preventDefault(); loadFile(e.dataTransfer.files[0]);
    });
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
    // Uklanjanje pristupa: drugi klik u roku od 5 s potvrđuje (klijent posle treba nov kod).
    qsa("[data-unlink]", el).forEach(function (b) {
      b.addEventListener("click", async function () {
        if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = t("unlink_confirm"); b.classList.add("danger-btn"); setTimeout(function () { if (b.isConnected) { delete b.dataset.armed; b.textContent = t("unlink"); b.classList.remove("danger-btn"); } }, 5000); return; }
        b.disabled = true;
        try { await ctx.api.removeMember(b.dataset.unlink); D.members = await ctx.api.listMembers(D.id); tabAccess(el, D); } catch (e) { b.disabled = false; toast(t("error_generic")); }
      });
    });
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
