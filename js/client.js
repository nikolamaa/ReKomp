// Klijentska strana: Danas, Trening, Ishrana, Kalendar, Napredak, Plan, Profil.
// Sekcija se prikazuje samo ako je uključena i plan za nju ima sadržaj.
import { $, qsa, esc, ymd, parseYmd, addDays, monday, weekdayKey, num, f1, fnum, hm, fmtMin, nowHM, lsGet, lsSet, lsDel, isStandalone, isIOS, toast } from "./util.js";
import { t, getLang, fmtShortDate, fmtLongDate, fmtRange, dayLong, langSelectHtml } from "./i18n.js";

var COLORS = ["blue", "red", "green", "amber", "violet"];
var ICON = {
  today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/></svg>',
  training: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6.5 7v10M3.5 9.5v5M17.5 7v10M20.5 9.5v5M6.5 12h11"/></svg>',
  nutrition: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3v7M5 3v5a2 2 0 0 0 4 0V3M7 10v11M17 3c-2.2 2.2-2.6 5.4-2 8h2v10"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  progress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h16M5.5 15.5l4-4.5 3.5 3 5.5-7"/></svg>',
  plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 5a2 2 0 0 1 2-2h11v15H7a2 2 0 0 0-2 2z"/><path d="M5 20a2 2 0 0 0 2 1h11v-3"/></svg>',
  profile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>'
};
var TAB_LABEL = { training: "tab_training", nutrition: "tab_food", today: "tab_today", calendar: "tab_calendar", progress: "tab_progress" };
var EXTRAS = [["water", { sr: "Voda", en: "Water", ru: "Вода" }], ["steps", { sr: "Koraci", en: "Steps", ru: "Шаги" }], ["supps", { sr: "Suplementi", en: "Supplements", ru: "Добавки" }]];

// ctx: { api, appName, clientId, client, plan, readonly, onEditIntake, onLogout, onExitPreview, onLang, extraHeaderBtn }
export function mountClient(root, ctx) {
  var P = ctx.plan || {};
  var SEC = ctx.client && ctx.client.sections ? ctx.client.sections : {};
  var RH = P.rhythms && typeof P.rhythms === "object" ? P.rhythms : {};
  var RH_KEYS = Object.keys(RH);
  var REC = P.recipes && typeof P.recipes === "object" ? P.recipes : {};
  var WORKOUTS = P.program && Array.isArray(P.program.workouts) ? P.program.workouts : [];
  var WK = {};
  WORKOUTS.forEach(function (w, i) { WK[w.code] = w; w._color = COLORS.indexOf(w.color) >= 0 ? w.color : COLORS[i % COLORS.length]; });
  var CI = Object.assign({ weight: true, sleep: true, pain: false, waist: true }, P.checkin || {});
  var lang = getLang();
  var S = { daily: {}, sessions: {}, loaded: false, view: "danas", trCode: null, trDate: null, trKey: null, trDirty: false,
    ciEdit: false, ciPain: null, ciDirty: false, wkStart: null, calScrolled: false, timer: null };

  /* ---------- sections ---------- */
  function hasContent(k) {
    if (k === "today" || k === "progress") return true;
    if (k === "training") return WORKOUTS.length > 0;
    if (k === "nutrition") return RH_KEYS.some(function (r) { return (RH[r].meals || []).length; }) || Object.keys(REC).length > 0 || !!(P.shopping && (P.shopping.items || []).length);
    if (k === "calendar") return !!((P.calendar && Object.keys(P.calendar).length) || (P.weekTemplate && Object.keys(P.weekTemplate).length));
    if (k === "rules") return !!((P.rules || []).length);
    if (k === "supplements") return !!((P.supplements || []).length);
    return false;
  }
  function on(k) { return (k in SEC ? !!SEC[k] : true) && hasContent(k); }
  var TABS = ["training", "nutrition", "today", "calendar", "progress"].filter(function (k) { return k === "today" || on(k); });
  var showPlan = on("rules") || on("supplements");

  /* ---------- day logic ---------- */
  function dayEntry(date) {
    var cal = P.calendar && P.calendar[date];
    var wt = P.weekTemplate && P.weekTemplate[weekdayKey(date)];
    if (!cal && !wt) return null;
    var e = Object.assign({}, wt || {}, cal || {}); e._template = !cal; return e;
  }
  function rhythmKey(date) {
    var e = dayEntry(date);
    if (e && e.rhythm && RH[e.rhythm]) return e.rhythm;
    if (P.defaultRhythm && RH[P.defaultRhythm]) return P.defaultRhythm;
    return RH_KEYS[0] || null;
  }
  function rhythmOf(date) { var k = rhythmKey(date); return k ? RH[k] : null; }
  function isWork(date) { var e = dayEntry(date); return !!(e && e.work); }
  function shiftLabel(date) {
    var e = dayEntry(date); if (e && e.shift) return e.shift;
    if (isWork(date)) { var r = rhythmOf(date); return (r && r.label) || t("work_day"); }
    return e ? t("free_day") : "";
  }
  function shiftClass(date) {
    if (!isWork(date)) return "sh-free";
    var i = RH_KEYS.indexOf(rhythmKey(date)); return "sh-" + (i < 0 ? 0 : i % 5);
  }
  function activeDay() {
    var now = new Date(), td = ymd(now), y = addDays(td, -1), r = rhythmOf(y);
    var end = r && typeof r.dayEnd === "number" ? r.dayEnd : 0;
    return end && now.getHours() < end ? y : td;
  }
  function nowMin(day) { return Math.round((Date.now() - parseYmd(day).getTime()) / 60000); }
  function menuPick(date) { var m = P.workMenu && P.workMenu[rhythmKey(date)]; return m && m.days ? (m.days[weekdayKey(date)] || null) : null; }
  // Kutija za obrok u minutu `at`: kuvanje istog dana važi tek za obroke posle vremena kuvanja.
  function boxFor(date, at) {
    for (var i = 0; i <= 4; i++) {
      var d = addDays(date, -i), e = dayEntry(d);
      if (!e || !e.cook) continue;
      if (i === 0 && at != null) { var rr = rhythmOf(d), ca = hm(e.cookAt || (rr && rr.cookAt)); if (ca != null && at < ca) continue; }
      var r = REC[e.cook]; return { name: r ? (r.short || r.name) : e.cook, frozen: i >= 3 };
    }
    return null;
  }
  function mealsFor(date) {
    var r = rhythmOf(date); if (!r) return null;
    var work = isWork(date), mp = menuPick(date);
    var list = !work && r.free && Array.isArray(r.free.meals) ? r.free.meals : (r.meals || []);
    return list.map(function (m) {
      var x = { key: m.key, at: hm(m.at || m.time), time: m.time || m.at, name: m.name, what: m.what, protein: m.protein, box: !!m.box };
      if (m.work) {
        if (work) { x.what = mp ? mp.pick : (m.what || ""); if (mp && mp.protein) x.protein = mp.protein; x.alts = mp && mp.alts; x.tip = mp && mp.tip; }
        else { x.name = m.freeName || x.name; x.what = m.freeWhat || x.what; x.protein = m.freeProtein || x.protein; if (m.freeAt) x.at = hm(m.freeAt); x.box = !m.freeWhat; }
      }
      var box = x.box ? boxFor(date, x.at) : null;
      if (box) x.what = t("box_of", { x: box.name }) + (box.frozen ? " (" + t("from_freezer") + ")" : "");
      return x;
    });
  }
  function inLabel(diff) {
    if (diff <= 5) return t("now");
    var h = Math.floor(diff / 60), m = diff % 60;
    return t("in_time", { x: [h ? h + " " + t("hours_short") : "", m ? m + " " + t("minutes_short") : ""].filter(Boolean).join(" ") });
  }
  function sessionDone(s) { return !!(s && s.entries && Object.keys(s.entries).length); }
  function wTitle(code) { return WK[code] ? WK[code].title || code : code; }
  function wColor(code) { return WK[code] ? WK[code]._color : "blue"; }

  /* ---------- lakši dan ---------- */
  // Klijent sam bira: light (lakši trening), walk (šetnja i mobilnost), move (pomeri na sutra). Razlog se ne pita.
  function planned(day) { var e = dayEntry(day); return e && e.workout && WK[e.workout] ? e : null; }
  function trainOf(day) {
    var d = S.daily[day] || {}, e = planned(day);
    if (e) return { code: e.workout, time: e.time, note: e.note, easy: d.easy && d.easy !== "move" ? d.easy : null, away: d.easy === "move" };
    var y = addDays(day, -1), ye = planned(y);
    if (ye && (S.daily[y] || {}).easy === "move") return { code: ye.workout, time: ye.time, easy: d.easy && d.easy !== "move" ? d.easy : null, movedIn: true };
    return null;
  }
  function canMove(day) { var tr = trainOf(day); return !!(tr && !tr.movedIn && !planned(addDays(day, 1))); }
  function easyHtml(day, tr) {
    if (tr.easy || tr.away) {
      var lbl = tr.away ? t("easy_moved_away") : (tr.easy === "walk" ? t("easy_walk") : t("easy_light"));
      return '<div class="easy-on"><span class="badge warnb">' + esc(t("easy_day")) + ": " + esc(lbl) + "</span>" +
        (ctx.readonly ? "" : '<button type="button" class="linkbtn" data-easy="" data-day="' + day + '">' + esc(t("easy_undo")) + "</button>") + "</div>";
    }
    if (ctx.readonly) return "";
    function opt(v, a, b) { return '<button type="button" class="easy-opt" data-easy="' + v + '" data-day="' + day + '"><b>' + esc(t(a)) + "</b><span>" + esc(t(b)) + "</span></button>"; }
    return '<details class="easy"><summary>' + esc(t("easy_day")) + '</summary><p class="small muted">' + esc(t("easy_hint")) + '</p><div class="easy-opts">' +
      opt("light", "easy_light", "easy_light_sub") + opt("walk", "easy_walk", "easy_walk_sub") + (canMove(day) ? opt("move", "easy_move", "easy_move_sub") : "") + "</div></details>";
  }

  /* ---------- shell ---------- */
  function tabBtn(k) {
    var main = k === "today";
    return '<button type="button" class="' + (main ? "main" : "") + '" data-view="' + (k === "today" ? "danas" : k) + '">' +
      (main ? '<span class="disc">' + ICON.today + "</span>" : ICON[k]) + "<span>" + esc(t(TAB_LABEL[k])) + "</span></button>";
  }
  root.innerHTML =
    (ctx.readonly ? '<div class="preview-bar"><span>' + esc(t("preview_banner")) + '</span><button type="button" class="btn small" id="cExitPreview">' + esc(t("exit_preview")) + "</button></div>" : "") +
    '<header class="top"><div class="wrap"><div class="brand">' + brandHtml(ctx.appName) + '</div><div class="top-r"><span id="hdrDate" class="hdr-date"></span>' +
    (showPlan ? '<button type="button" class="icon-btn" id="cPlanBtn" aria-label="' + esc(t("plan_btn")) + '">' + ICON.plan + "<span>" + esc(t("plan_btn")) + "</span></button>" : "") +
    (ctx.extraHeaderBtn || "") +
    '<button type="button" class="icon-btn round" id="cProfileBtn" aria-label="' + esc(t("profile")) + '">' + ICON.profile + "</button></div></div></header>" +
    '<main class="wrap" id="cMain">' +
    '<section id="v-danas" class="view">' +
      '<div id="hero" class="card hero"><p class="muted">' + esc(t("loading")) + "</p></div>" +
      '<div id="installCard" class="card" hidden></div>' +
      '<div id="checkin" class="card" hidden></div>' +
      '<div id="schedCard" class="card" hidden><div class="card-h"><h2>' + esc(t("schedule_title")) + '</h2><span id="protTotal" class="pill" hidden></span></div><ol id="timeline" class="tl"></ol><div id="extras" class="extras"></div><p id="dayTip" class="small muted"></p><span id="tlStatus" class="status" role="status"></span></div>' +
      '<div id="notesCard" class="card" hidden><span class="label">' + esc(t("messages")) + '</span><div id="notesBox" class="notes"></div></div>' +
    "</section>" +
    '<section id="v-training" class="view" hidden></section>' +
    '<section id="v-nutrition" class="view" hidden></section>' +
    '<section id="v-calendar" class="view" hidden></section>' +
    '<section id="v-progress" class="view" hidden></section>' +
    '<section id="v-plan" class="view" hidden></section>' +
    '<section id="v-profile" class="view" hidden></section>' +
    "</main>" +
    (TABS.length > 1 ? '<nav class="tabs" aria-label="' + esc(t("tab_today")) + '"><div class="inner" style="grid-template-columns:repeat(' + TABS.length + ',minmax(0,1fr))">' + TABS.map(tabBtn).join("") + "</div></nav>" : "");
  document.body.classList.toggle("no-tabs", TABS.length <= 1);

  var VIEWS = ["danas", "training", "nutrition", "calendar", "progress", "plan", "profile"];
  function go(view) {
    if (VIEWS.indexOf(view) < 0) view = "danas";
    if (view === "training" && !on("training")) view = "danas";
    if (view === "nutrition" && !on("nutrition")) view = "danas";
    if (view === "calendar" && !on("calendar")) view = "danas";
    if (view === "plan" && !showPlan) view = "danas";
    S.view = view;
    VIEWS.forEach(function (v) { var el = $("v-" + v); if (el) el.hidden = v !== view; });
    qsa(".tabs button", root).forEach(function (b) { if (b.dataset.view === view) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    window.scrollTo(0, 0);
    if (view === "calendar") { S.calScrolled = false; setTimeout(scrollCal, 0); }
    if (view === "profile") renderProfile();
  }
  qsa(".tabs button", root).forEach(function (b) { b.addEventListener("click", function () { go(b.dataset.view); }); });
  if ($("cPlanBtn")) $("cPlanBtn").addEventListener("click", function () { go(S.view === "plan" ? "danas" : "plan"); });
  $("cProfileBtn").addEventListener("click", function () { go(S.view === "profile" ? "danas" : "profile"); });
  if ($("cExitPreview")) $("cExitPreview").addEventListener("click", function () { if (ctx.onExitPreview) ctx.onExitPreview(); });

  /* ---------- writes ---------- */
  var dailyQ = Promise.resolve();
  function writeDaily(date, patch) {
    var body = Object.assign({}, S.daily[date] || {}, patch, { date: date });
    S.daily[date] = body;
    if (ctx.readonly) return Promise.resolve();
    var data = Object.assign({}, body); delete data.date;
    var run = dailyQ.catch(function () {}).then(function () { return ctx.api.saveDaily(ctx.clientId, date, data); });
    dailyQ = run; return run;
  }

  /* ---------- Danas ---------- */
  function buildTimeline(day) {
    var r = rhythmOf(day) || {}, e = dayEntry(day) || {}, work = isWork(day), items = [], d = S.daily[day] || {};
    var ye = dayEntry(addDays(day, -1));
    var painAsk = CI.pain && ye && ye.workout;
    var wake = hm(!work && r.free && r.free.wakeAt ? r.free.wakeAt : r.wakeAt);
    if (wake != null && CI.weight) items.push({ at: wake, o: 0, kind: "wake", title: t("wake_weigh"), sub: t("wake_sub") + (painAsk ? " " + t("wake_pain") : ""), done: num(d.weight) != null });
    if (on("nutrition")) (mealsFor(day) || []).forEach(function (m) {
      if (m.at == null) return;
      items.push({ at: m.at, o: 2, kind: "meal", key: m.key, title: m.name, sub: m.what, alts: m.alts, tip: m.tip, protein: m.protein });
    });
    var tr = on("training") ? trainOf(day) : null;
    if (tr && !tr.away) {
      var at = hm(tr.time) != null ? hm(tr.time) : hm(r.trainingAt), w = WK[tr.code];
      var ttl = tr.easy === "walk" ? t("easy_walk") : t("training_word") + ": " + (w.title || tr.code) + (tr.easy === "light" ? " · " + t("easy_light_tag") : "");
      var sub = tr.easy === "walk" ? t("easy_walk_sub") : (tr.easy === "light" ? t("easy_light_sub") : [w.focus, w.duration].filter(Boolean).join(" · ") + (tr.note ? ". " + tr.note : ""));
      if (tr.movedIn) sub = t("easy_moved_in") + ". " + sub;
      if (at != null) items.push({ at: at, o: 1, kind: "train", color: w._color, code: tr.code, title: ttl, sub: sub });
    }
    if (e.cook && hm(r.cookAt) != null && on("nutrition")) {
      var rc = REC[e.cook];
      items.push({ at: hm(r.cookAt), o: 3, kind: "cook", title: t("cooking", { x: rc ? rc.name : e.cook }), sub: (rc && rc.time ? rc.time + " " : "") + t("cooking_sub") });
    }
    if (work && hm(r.shiftStartAt) != null) items.push({ at: hm(r.shiftStartAt), o: 1, kind: "shift", title: t("shift_start"), sub: [r.hours, t("stand_up")].filter(Boolean).join(". ") });
    if (work && hm(r.shiftEndAt) != null) items.push({ at: hm(r.shiftEndAt), o: 1, kind: "shift", title: t("shift_end"), sub: r.endTip || "" });
    if (hm(r.coffeeAt) != null) items.push({ at: hm(r.coffeeAt), o: 4, kind: "coffee", title: t("last_coffee"), sub: t("last_coffee_sub") });
    if (hm(r.napAt) != null && (work || r.napOnFree)) items.push({ at: hm(r.napAt), o: 1, kind: "sleep", title: t("nap"), sub: r.nap || "" });
    if (hm(r.sleepAt) != null) items.push({ at: hm(r.sleepAt), o: 5, kind: "sleep", title: t("sleep"), sub: r.sleep ? t("sleep_goal", { x: r.sleep }) : "" });
    items.sort(function (a, b) { return a.at - b.at || a.o - b.o; });
    return items;
  }

  function renderDanas() {
    var day = activeDay(), e = dayEntry(day), d = S.daily[day] || {}, on2 = d.meals || {};
    $("hdrDate").textContent = fmtShortDate(parseYmd(day));
    var items = buildTimeline(day), nm = nowMin(day), nextIdx = -1;
    for (var i = 0; i < items.length; i++) { if (items[i].at >= nm - 15 && !(items[i].kind === "meal" && on2[items[i].key]) && !items[i].done) { nextIdx = i; break; } }
    var sl = shiftLabel(day);
    var h = '<div class="hero-top"><span class="label">' + esc(fmtLongDate(parseYmd(day))) + "</span>" + (sl ? '<span class="chip ' + shiftClass(day) + '">' + esc(sl) + "</span>" : "") + "</div>";
    if (nextIdx >= 0) {
      var n = items[nextIdx], bar = n.kind === "train" ? "b-" + n.color : (n.kind === "meal" ? "b-ok" : (n.kind === "sleep" ? "b-violet" : ""));
      h += '<div class="next"><div class="bar ' + bar + '"></div><div class="next-body"><span class="label">' + esc(t("next_up")) + "</span>" +
        '<span class="next-when">' + esc(fmtMin(n.at)) + " · " + esc(inLabel(n.at - nm)) + "</span>" +
        '<span class="next-title' + (n.kind === "train" ? " c-" + n.color : "") + '">' + esc(n.title) + "</span>" +
        (n.sub ? '<span class="muted">' + esc(n.sub) + "</span>" : "") + "</div></div>";
      if (n.kind === "train") h += '<div class="actions"><button class="btn" type="button" data-open="' + esc(n.code) + '">' + esc(t("open_training")) + "</button></div>";
    } else if (items.length) {
      h += '<div class="next"><div class="bar b-violet"></div><div class="next-body"><span class="next-title">' + esc(t("day_done")) + '</span><span class="muted">' + esc(t("day_done_text")) + "</span></div></div>";
    }
    var tr = on("training") ? trainOf(day) : null;
    if (tr && !tr.away && !(nextIdx >= 0 && items[nextIdx].kind === "train")) {
      var done = sessionDone(S.sessions[day + "_" + tr.code]);
      h += '<div class="row"><span class="badge t-' + wColor(tr.code) + '">' + esc(t("today_word")) + ": " + esc(wTitle(tr.code)) + (tr.time ? " " + esc(tr.time) : "") + "</span>" +
        (done ? '<span class="badge ok">' + esc(t("logged")) + "</span>" : '<button class="btn ghost small" type="button" data-open="' + esc(tr.code) + '">' + esc(t("open_training")) + "</button>") + "</div>";
    } else if (!items.length && e && !tr) {
      h += '<div class="next"><div class="bar"></div><div class="next-body"><span class="next-title">' + esc(t("rest_day")) + "</span>" + (e.note ? '<span class="muted">' + esc(e.note) + "</span>" : "") + "</div></div>";
    } else if (!items.length && !e) {
      h += '<p class="muted">' + esc(t("nothing_here")) + "</p>";
    }
    if (e && e.note && items.length && !(nextIdx >= 0 && items[nextIdx].kind === "train")) h += '<p class="small">' + esc(e.note) + "</p>";
    var slp = num(d.sleep);
    if (tr) h += easyHtml(day, tr);
    if (CI.sleep && slp != null && tr && !tr.away && !tr.easy) h += slp < 5 ? '<div class="hint bad">' + esc(t("sleep_bad")) + "</div>" : (slp < 6.5 ? '<div class="hint warn">' + esc(t("sleep_warn", { x: f1(slp) })) + "</div>" : '<div class="hint ok">' + esc(t("sleep_ok", { x: f1(slp) })) + "</div>");
    if (CI.pain && num(d.pain) != null && num(d.pain) > 3) h += '<div class="hint bad">' + esc(t("pain_bad", { x: d.pain })) + "</div>";
    var td = addDays(day, 1), te = dayEntry(td), tt = trainOf(td);
    if (te || tt) h += '<div class="tomorrow"><b>' + esc(t("tomorrow")) + ":</b> " + esc(shiftLabel(td)) + (tt && !tt.away ? ", " + esc(wTitle(tt.code)) + (tt.time ? " " + esc(tt.time) : "") + (tt.movedIn ? " (" + esc(t("easy_moved_in")) + ")" : "") : ", " + esc(t("no_training"))) + (te && te.note ? ". " + esc(te.note) : "") + "</div>";
    $("hero").innerHTML = h;

    // raspored
    var got = 0, plan = 0, marked = false;
    $("schedCard").hidden = !items.length;
    $("timeline").innerHTML = items.map(function (it) {
      var cls = ["k-" + it.kind]; if (it.color) cls.push("c-" + it.color);
      var isDone = it.kind === "meal" ? !!on2[it.key] : !!it.done;
      if (isDone) cls.push("done");
      if (it.kind === "meal") { var p = Number(it.protein) || 0; plan += p; if (on2[it.key]) got += p; }
      var past = it.at < nm - 15;
      if (!marked && !past && !isDone) { cls.push("now"); marked = true; } else if (past) cls.push("past");
      var body = '<span class="tt">' + esc(it.title) + "</span>" + (it.sub ? '<span class="ts">' + esc(it.sub) + "</span>" : "") +
        (it.alts && it.alts.length ? '<span class="ts">' + esc(t("if_missing", { x: it.alts.join(", ") })) + "</span>" : "") + (it.tip ? '<span class="ts">' + esc(it.tip) + "</span>" : "");
      var side = "";
      if (it.kind === "meal") side = (it.protein ? '<span class="pg">~' + (Number(it.protein) || 0) + " g</span>" : "") + '<input type="checkbox" data-meal="' + esc(it.key) + '" aria-label="' + esc(it.title) + '"' + (on2[it.key] ? " checked" : "") + (ctx.readonly ? " disabled" : "") + ">";
      else if (it.kind === "train") side = '<button class="linkbtn" type="button" data-open="' + esc(it.code) + '">' + esc(t("open")) + "</button>";
      return '<li class="' + cls.join(" ") + '"><span class="tm">' + esc(fmtMin(it.at)) + '</span><span class="dot"></span><span class="body">' + (cls.indexOf("now") >= 0 ? '<span class="now-tag">' + esc(t("next_up")) + "</span>" : "") + body + '</span><span class="side">' + side + "</span></li>";
    }).join("");
    var pt = $("protTotal");
    pt.hidden = !plan; pt.textContent = t("protein_of", { got: got, plan: plan });
    $("extras").innerHTML = on("nutrition") ? EXTRAS.map(function (x) { return '<label><input type="checkbox" data-meal="x_' + x[0] + '"' + (on2["x_" + x[0]] ? " checked" : "") + (ctx.readonly ? " disabled" : "") + ">" + esc(x[1][lang] || x[1].sr) + "</label>"; }).join("") : "";
    var r = rhythmOf(day);
    $("dayTip").textContent = ((r && r.tips) || []).join(" ");

    var notes = (P.notes || []).slice().sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
    $("notesCard").hidden = !notes.length;
    $("notesBox").innerHTML = notes.map(function (n) { return '<div class="note"><span class="when">' + esc(n.date ? fmtShortDate(parseYmd(n.date)) : "") + "</span><p>" + esc(n.text) + "</p></div>"; }).join("");
    renderInstall();
    renderCheckin();
  }
  root.addEventListener("click", function (e) {
    var eb = e.target.closest && e.target.closest("[data-easy]");
    if (eb && !ctx.readonly) {
      var eday = eb.dataset.day, ev = eb.dataset.easy || null;
      writeDaily(eday, { easy: ev }).then(function () { toast(t(ev ? "easy_saved" : "easy_removed")); }, function () { toast(t("not_saved")); });
      renderDanas(); if (S.trCode) renderTrForm(true);
      return;
    }
    var b = e.target.closest && e.target.closest("[data-open]"); if (!b) return;
    selectWorkout(b.dataset.open, activeDay()); go("training");
  });
  function onMealToggle(e) {
    var k = e.target && e.target.dataset ? e.target.dataset.meal : null; if (!k) return;
    var day = activeDay(), meals = Object.assign({}, (S.daily[day] && S.daily[day].meals) || {}); meals[k] = !!e.target.checked;
    writeDaily(day, { meals: meals }).then(function () { $("tlStatus").textContent = ""; }, function () { $("tlStatus").textContent = t("not_saved"); });
    renderDanas();
  }
  $("timeline").addEventListener("change", onMealToggle);
  $("extras").addEventListener("change", onMealToggle);

  /* ---------- install ---------- */
  function renderInstall() {
    var el = $("installCard");
    if (isStandalone() || lsGet("rekomp-install-hidden") || ctx.readonly) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = '<div class="card-h"><h3>' + esc(t("install_title")) + '</h3><button type="button" class="linkbtn" id="instHide">' + esc(t("hide")) + "</button></div>" +
      '<p class="small">' + esc(isIOS() ? t("install_ios") : t("install_android")) + "</p>" +
      (window.__bip ? '<div class="actions"><button type="button" class="btn small" id="instBtn">' + esc(t("install_btn")) + "</button></div>" : "");
    $("instHide").addEventListener("click", function () { lsSet("rekomp-install-hidden", 1); el.hidden = true; });
    if ($("instBtn")) $("instBtn").addEventListener("click", function () { var p = window.__bip; if (!p) return; p.prompt(); p.userChoice.finally(function () { window.__bip = null; renderInstall(); }); });
  }

  /* ---------- check-in ---------- */
  function ciFieldsHtml() {
    var h = '<form id="ciForm" autocomplete="off"><div class="grid2">';
    if (CI.weight) h += '<div class="field"><label for="dWeight">' + esc(t("weight_kg")) + '</label><input id="dWeight" inputmode="decimal" placeholder="' + (lang === "en" ? "e.g. 82.4" : "82,4") + '"></div>';
    if (CI.sleep) h += '<div class="field"><label for="dSleep">' + esc(t("sleep_h")) + '</label><input id="dSleep" inputmode="decimal" placeholder="' + (lang === "en" ? "e.g. 7.5" : "7,5") + '"></div>';
    h += "</div>";
    if (CI.pain) {
      var b = ""; for (var i = 0; i <= 10; i++) b += '<button type="button" data-p="' + i + '"' + (i > 3 ? ' class="hi"' : "") + ' aria-pressed="false">' + i + "</button>";
      h += '<div class="field" style="margin-top:12px"><span class="q-label" id="painLbl">' + esc((typeof CI.pain === "string" ? CI.pain : t("pain_default")) + " (0–10)") + '</span><div class="pain" id="pain" role="group" aria-labelledby="painLbl">' + b + "</div></div>";
    }
    h += '<details style="margin-top:12px"><summary class="small muted">' + esc(t("more_fields")) + '</summary><div class="grid2" style="margin-top:10px">' +
      (CI.waist ? '<div class="field"><label for="dWaist">' + esc(t("waist_cm")) + '</label><input id="dWaist" inputmode="decimal"></div>' : "") +
      '<div class="field"><label for="dDate">' + esc(t("entry_date")) + '</label><input id="dDate" type="date"></div>' +
      '<div class="field" style="grid-column:1/-1"><label for="dNote">' + esc(t("note")) + '</label><textarea id="dNote" placeholder="' + esc(t("note_ph")) + '"></textarea></div></div></details>' +
      '<div class="actions" style="margin-top:14px"><button class="btn" type="submit" id="dSave"' + (ctx.readonly ? " disabled" : "") + ">" + esc(t("save")) + '</button><span id="dStatus" class="status" role="status"></span></div></form>';
    return h;
  }
  var ciBuilt = false;
  function buildCheckin() {
    var el = $("checkin");
    if (!CI.weight && !CI.sleep && !CI.pain) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = '<div class="card-h"><h2>' + esc(t("checkin_title")) + '</h2><span id="ciDay" class="label"></span></div><div id="ciSummary" hidden><div class="row" id="ciLine"></div><div class="actions" style="margin-top:10px"><button type="button" class="btn ghost small" id="ciEdit">' + esc(t("edit")) + "</button></div></div>" + ciFieldsHtml();
    ciBuilt = true;
    if ($("pain")) $("pain").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; var v = Number(b.dataset.p); setPain(S.ciPain === v ? null : v); S.ciDirty = true; });
    $("ciEdit").addEventListener("click", function () { S.ciEdit = true; fillCheckin(ciDate()); renderCheckin(); var w = $("dWeight") || $("dSleep"); if (w) w.focus(); });
    $("dDate").addEventListener("change", function () { $("dDate").dataset.auto = "0"; S.ciEdit = true; fillCheckin(ciDate()); renderCheckin(); $("dStatus").textContent = ""; });
    ["dWeight", "dSleep", "dWaist", "dNote"].forEach(function (id) { if ($(id)) $(id).addEventListener("input", function () { S.ciDirty = true; }); });
    $("ciForm").addEventListener("submit", async function (e) {
      e.preventDefault();
      if (ctx.readonly) return;
      var date = ciDate(), patch = { note: $("dNote").value.trim() };
      if ($("dWeight")) patch.weight = num($("dWeight").value);
      if ($("dSleep")) patch.sleep = num($("dSleep").value);
      if (CI.pain) patch.pain = S.ciPain;
      if ($("dWaist")) patch.waist = num($("dWaist").value);
      $("dSave").disabled = true; $("dStatus").textContent = t("saving");
      try { await writeDaily(date, patch); S.ciDirty = false; S.ciEdit = false; $("dStatus").textContent = t("saved_at", { time: nowHM() }); $("dDate").value = activeDay(); $("dDate").dataset.auto = "1"; renderDanas(); renderProgress(); }
      catch (err) { $("dStatus").textContent = t("not_saved"); }
      $("dSave").disabled = false;
    });
  }
  function setPain(v) { S.ciPain = v; qsa("#pain button", root).forEach(function (b) { b.setAttribute("aria-pressed", String(Number(b.dataset.p) === v)); }); }
  function ciDate() { return ($("dDate") && $("dDate").value) || activeDay(); }
  function fillCheckin(date) {
    var d = S.daily[date] || {};
    if ($("dWeight")) $("dWeight").value = d.weight != null ? fnum(d.weight) : "";
    if ($("dSleep")) $("dSleep").value = d.sleep != null ? fnum(d.sleep) : "";
    if ($("dWaist")) $("dWaist").value = d.waist != null ? fnum(d.waist) : "";
    $("dNote").value = d.note || "";
    setPain(d.pain != null ? Number(d.pain) : null);
    S.ciDirty = false;
  }
  function renderCheckin() {
    if (!ciBuilt) buildCheckin();
    if ($("checkin").hidden) return;
    var day = activeDay();
    if (!$("dDate").value || (!S.ciDirty && $("dDate").dataset.auto !== "0")) { $("dDate").value = day; $("dDate").dataset.auto = "1"; }
    var date = ciDate(), d = S.daily[date] || {};
    $("ciDay").textContent = fmtShortDate(parseYmd(date));
    var has = (!CI.weight || num(d.weight) != null) && (!CI.sleep || num(d.sleep) != null) && (CI.weight || CI.sleep || num(d.pain) != null);
    var showSummary = has && !S.ciEdit && date === day;
    $("ciSummary").hidden = !showSummary; $("ciForm").hidden = showSummary;
    if (showSummary) {
      var parts = [];
      if (num(d.weight) != null) parts.push('<span class="pill">' + f1(num(d.weight)) + " kg</span>");
      if (num(d.sleep) != null) parts.push('<span class="pill">' + esc(t("sleep_h").split(" ")[0]) + " " + f1(num(d.sleep)) + " h</span>");
      if (CI.pain && num(d.pain) != null) parts.push('<span class="pill">' + esc(typeof CI.pain === "string" ? CI.pain : t("pain_default")) + " " + esc(d.pain) + "/10</span>");
      if (num(d.waist) != null) parts.push('<span class="pill">' + f1(num(d.waist)) + " cm</span>");
      $("ciLine").innerHTML = parts.join("");
    } else if (!S.ciDirty && !(document.activeElement && document.activeElement.closest && document.activeElement.closest("#ciForm"))) {
      fillCheckin(date);
    }
  }

  /* ---------- Trening ---------- */
  function setCount(ex) { var m = String(ex.sets || "").match(/^\s*(\d+)\s*[×x]/); return m ? Number(m[1]) : 1; }
  function timeUnit(ex) { var s = String(ex.sets || ""); return /\d\s*s\b/.test(s) && !/min/.test(s) ? "s" : "min"; }
  function parseEntry(str) {
    var out = [];
    String(str || "").split(" / ").forEach(function (seg) {
      var parts = seg.split(/[×x]/); if (parts.length < 2) return;
      var kg = num(parts[0]);
      parts[1].split(",").forEach(function (r) { var n = num(r); if (n != null) out.push({ kg: kg, reps: n }); });
    });
    return out;
  }
  function setsOf(s, name) {
    if (!s) return null;
    if (s.sets && Array.isArray(s.sets[name])) return s.sets[name];
    if (s.entries && s.entries[name]) { var p = parseEntry(s.entries[name]); return p.length ? p : [{ v: s.entries[name] }]; }
    return null;
  }
  function summarize(ex, sets) {
    if (ex.kind === "time") { var vs = sets.map(function (s) { return s.v; }).filter(function (v) { return v != null && v !== ""; }); return vs.length ? vs.map(fnum).join(", ") + " " + timeUnit(ex) : ""; }
    var ok = sets.filter(function (s) { return s.reps != null || s.kg != null; });
    if (!ok.length) return "";
    var same = ok.every(function (s) { return s.kg === ok[0].kg; });
    if (same) return (ok[0].kg != null ? fnum(ok[0].kg) : "?") + "×" + ok.map(function (s) { return s.reps != null ? s.reps : "?"; }).join(",");
    return ok.map(function (s) { return (s.kg != null ? fnum(s.kg) : "?") + "×" + (s.reps != null ? s.reps : "?"); }).join(" / ");
  }
  function lastSession(name) {
    return Object.keys(S.sessions).map(function (k) { return S.sessions[k]; })
      .filter(function (s) { return s && s.date && s.date + "_" + s.workout !== S.trKey && s.date <= S.trDate && setsOf(s, name); })
      .sort(function (a, b) { return b.date.localeCompare(a.date); })[0] || null;
  }
  function buildTraining() {
    var v = $("v-training"); if (!on("training")) { v.innerHTML = ""; return; }
    v.innerHTML = '<div class="card"><div class="seg" id="wkSeg" role="group" style="grid-template-columns:repeat(' + (WORKOUTS.length > 3 ? 2 : Math.max(WORKOUTS.length, 1)) + ',minmax(0,1fr))">' +
      WORKOUTS.map(function (w) { return '<button type="button" data-code="' + esc(w.code) + '" data-color="' + w._color + '">' + esc(w.title || w.code) + "</button>"; }).join("") +
      '</div><div class="tr-head"><div id="trHead" class="tr-title"></div><div class="field"><label for="trDate">' + esc(t("date")) + '</label><input id="trDate" type="date"></div></div><p class="small muted">' + esc(t("sets_hint")) + "</p></div>" +
      '<div id="trList" class="view"></div>' +
      '<div class="card"><div class="field"><label for="trNote">' + esc(t("workout_note")) + '</label><textarea id="trNote" placeholder="' + esc(t("workout_note_ph")) + '"></textarea></div>' +
      '<div class="actions"><button class="btn" type="button" id="trSave"' + (ctx.readonly ? " disabled" : "") + ">" + esc(t("save_workout")) + '</button><span id="trStatus" class="status" role="status"></span></div></div>';
    $("trList").addEventListener("input", function (e) { if (e.target.matches("input[data-ex]")) onTrInput(); });
    $("trList").addEventListener("click", function (e) {
      var b = e.target.closest("[data-copy]"); if (!b) return;
      var i = Number(b.dataset.copy), ex = WK[S.trCode].exercises[i], last = lastSession(ex.name), prev = last ? setsOf(last, ex.name) || [] : [];
      qsa('#trList [data-ex="' + i + '"][data-f="kg"]', root).forEach(function (inp) { var s = Number(inp.dataset.set), pv = prev[s] || prev[prev.length - 1]; if (pv && pv.kg != null && !inp.value) inp.value = fnum(pv.kg); });
      onTrInput();
    });
    $("trNote").addEventListener("input", onTrInput);
    $("trSave").addEventListener("click", function () { flushSession(true); });
    $("trDate").addEventListener("change", function () { selectWorkout(S.trCode, $("trDate").value || activeDay()); });
    qsa("#wkSeg button", root).forEach(function (b) { b.addEventListener("click", function () { selectWorkout(b.dataset.code, S.trDate); }); });
  }
  var saveTimer = null, writing = false, pending = false;
  function collectSession() {
    var w = WK[S.trCode], entries = {}, sets = {};
    (w ? w.exercises || [] : []).forEach(function (ex, i) {
      var rows = [];
      qsa('#trList [data-ex="' + i + '"][data-set]', root).forEach(function (inp) {
        var si = Number(inp.dataset.set); rows[si] = rows[si] || {};
        var v = num(inp.value); if (v != null) rows[si][inp.dataset.f] = v;
      });
      rows = rows.filter(Boolean).filter(function (r) { return Object.keys(r).length; });
      if (rows.length) { sets[ex.name] = rows; var s = summarize(ex, rows); if (s) entries[ex.name] = s; }
    });
    return { title: w ? w.title : "", entries: entries, sets: sets, note: $("trNote").value.trim() };
  }
  async function flushSession(manual) {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (!S.trKey) return;
    if (ctx.readonly) { if (manual) $("trStatus").textContent = t("preview_banner"); return; }
    var body = collectSession(), key = S.trKey, date = S.trDate, code = S.trCode;
    if (!Object.keys(body.entries).length && !body.note && !S.sessions[key]) { if (manual) $("trStatus").textContent = t("enter_one_set"); return; }
    if (writing) { pending = true; return; }
    writing = true; $("trStatus").textContent = t("saving");
    try {
      await ctx.api.saveSession(ctx.clientId, date, code, body);
      S.sessions[key] = Object.assign({ date: date, workout: code }, body);
      $("trStatus").textContent = t("saved_at", { time: nowHM() }); S.trDirty = false; lsDel("rekomp-draft-" + ctx.clientId + "-" + key);
    } catch (err) { $("trStatus").textContent = t("not_saved"); }
    writing = false;
    if (pending) { pending = false; flushSession(false); }
  }
  function onTrInput() {
    S.trDirty = true;
    if (!ctx.readonly) lsSet("rekomp-draft-" + ctx.clientId + "-" + S.trKey, collectSession());
    $("trStatus").textContent = t("unsaved");
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { flushSession(false); }, 2500);
  }
  async function selectWorkout(code, date) {
    if (saveTimer) await flushSession(false);
    S.trCode = code; S.trDate = date || S.trDate || activeDay();
    if ($("trDate")) $("trDate").value = S.trDate;
    renderTrForm(true);
  }
  function renderTrForm(force) {
    if (!S.trCode || !$("trList")) return;
    var key = S.trDate + "_" + S.trCode;
    if (!force && key === S.trKey && (S.trDirty || (document.activeElement && document.activeElement.closest && document.activeElement.closest("#v-training")))) return;
    S.trKey = key;
    qsa("#wkSeg button", root).forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.code === S.trCode ? "true" : "false"); });
    var w = WK[S.trCode], e = dayEntry(S.trDate), trd = trainOf(S.trDate), ez = trd && trd.code === S.trCode && !trd.away ? trd.easy : null;
    if (!w) { $("trList").innerHTML = '<div class="card"><p class="muted">' + esc(t("nothing_here")) + "</p></div>"; return; }
    $("trHead").innerHTML = '<span class="label">' + esc(fmtLongDate(parseYmd(S.trDate))) + (shiftLabel(S.trDate) ? " · " + esc(shiftLabel(S.trDate)) : "") + '</span><span class="big c-' + w._color + '">' + esc(w.title || w.code) + "</span>" +
      '<span class="muted small">' + esc([w.focus, w.duration].filter(Boolean).join(" · ")) + "</span>" + (e && e.workout === S.trCode && e.note ? '<span class="small">' + esc(e.note) + "</span>" : "") +
      (ez ? '<div class="hint warn">' + esc(t(ez === "walk" ? "easy_walk_tr" : "easy_light_tr")) + "</div>" : "");
    var saved = S.sessions[key], draft = ctx.readonly ? null : lsGet("rekomp-draft-" + ctx.clientId + "-" + key), src = draft || saved || null;
    var html = (w.exercises || []).map(function (ex, i) {
      var n = setCount(ex), cur = setsOf(src, ex.name) || [];
      if (ez === "light" && ex.kind !== "time" && n > 1) n = Math.max(n - 1, cur.length);
      var last = lastSession(ex.name), prev = last ? setsOf(last, ex.name) || [] : [];
      var meta = [ex.sets, ex.rir ? t("rir") + " " + ex.rir : "", ex.rest].filter(Boolean).map(function (m) { return "<span>" + esc(m) + "</span>"; }).join("");
      var rows = "";
      for (var s = 0; s < n; s++) {
        var cv = cur[s] || {}, pv = prev[s] || prev[prev.length - 1] || {};
        if (ex.kind === "time") {
          rows += '<div class="set one"><span class="sn">' + (n > 1 ? (s + 1) + "." : esc(timeUnit(ex) === "min" ? t("minutes") : t("seconds"))) + '</span><input data-ex="' + i + '" data-set="' + s + '" data-f="v" inputmode="decimal" aria-label="' + esc(ex.name) + " " + (s + 1) + '" value="' + esc(cv.v != null ? fnum(cv.v) : "") + '" placeholder="' + esc(pv.v != null ? fnum(pv.v) : timeUnit(ex)) + '"' + (ctx.readonly ? " disabled" : "") + "></div>";
        } else {
          rows += '<div class="set"><span class="sn" aria-hidden="true">' + (s + 1) + ".</span>" +
            '<input data-ex="' + i + '" data-set="' + s + '" data-f="kg" inputmode="decimal" aria-label="' + esc(ex.name) + " " + (s + 1) + ' kg" value="' + esc(cv.kg != null ? fnum(cv.kg) : "") + '" placeholder="' + esc(pv.kg != null ? fnum(pv.kg) + " kg" : t("kg_ph")) + '"' + (ctx.readonly ? " disabled" : "") + ">" +
            '<span class="x">×</span><input data-ex="' + i + '" data-set="' + s + '" data-f="reps" inputmode="numeric" aria-label="' + esc(ex.name) + " " + (s + 1) + " " + esc(t("reps_ph")) + '" value="' + esc(cv.reps != null ? cv.reps : "") + '" placeholder="' + esc(pv.reps != null ? pv.reps : t("reps_ph")) + '"' + (ctx.readonly ? " disabled" : "") + "></div>";
        }
      }
      var prevLine = last ? esc(t("last_time", { date: fmtShortDate(parseYmd(last.date)), x: (last.entries && last.entries[ex.name]) || summarize(ex, prev) })) : esc(t("no_history"));
      var copy = last && ex.kind !== "time" && !ctx.readonly && prev.some(function (x) { return x.kg != null; }) ? '<button type="button" class="linkbtn" data-copy="' + i + '">' + esc(t("copy_weights")) + "</button>" : "";
      return '<div class="ex"><div class="ex-name">' + esc(ex.name) + '</div><div class="ex-meta">' + meta + "</div>" +
        (ex.start || ex.tip ? '<div class="ex-tip">' + esc([ex.start ? t("start_with", { x: ex.start }) : "", ex.tip || ""].filter(Boolean).join(". ")) + "</div>" : "") +
        '<div class="prev"><span>' + prevLine + "</span>" + copy + '</div><div class="sets">' + rows + "</div></div>";
    }).join("");
    if (w.notes && w.notes.length) html += '<div class="hint">' + w.notes.map(esc).join("<br>") + "</div>";
    $("trList").innerHTML = html;
    $("trNote").value = (src && src.note) || "";
    S.trDirty = !!draft;
    $("trStatus").textContent = draft ? t("unsaved") : (saved ? t("logged_before") : "");
  }
  function defaultWorkout() {
    var d = activeDay();
    for (var i = 0; i < 14; i++) { var tr = trainOf(addDays(d, i)); if (tr && !tr.away) return tr.code; }
    return WORKOUTS[0] ? WORKOUTS[0].code : null;
  }

  /* ---------- Ishrana ---------- */
  function buildNutrition() {
    var v = $("v-nutrition"); if (!on("nutrition")) { v.innerHTML = ""; return; }
    var hasMeals = RH_KEYS.some(function (r) { return (RH[r].meals || []).length; });
    v.innerHTML =
      (hasMeals ? '<div class="card"><div class="weeknav"><button type="button" id="wkPrev" aria-label="' + esc(t("prev_week_aria")) + '">‹</button><div class="wl"><b id="wkLabel"></b><span id="wkSub" class="small muted"></span></div><button type="button" id="wkNext" aria-label="' + esc(t("next_week_aria")) + '">›</button></div><p class="small muted">' + esc(t("week_tap")) + '</p></div><div id="weekDays" class="view"></div>' : "") +
      (Object.keys(REC).length ? '<div class="card"><h2>' + esc(t("recipes")) + '</h2><div id="recipes"></div></div>' : "") +
      (P.shopping && (P.shopping.items || []).length ? '<div class="card"><div class="card-h"><h2>' + esc(t("shopping")) + '</h2><span id="shopTotal" class="pill"></span></div><ul id="shopList" class="checklist"></ul><p class="small muted">' + esc(P.shopping.note || t("shopping_note")) + '</p><div class="actions"><button type="button" class="btn ghost small" id="shopReset">' + esc(t("reset_checks")) + "</button></div></div>" : "") +
      ((P.nutritionRules || []).length ? '<div class="card plan-sec"><h2>' + esc(t("rules")) + "</h2><ul>" + P.nutritionRules.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>" : "");
    if ($("wkPrev")) {
      $("wkPrev").addEventListener("click", function () { S.wkStart = addDays(S.wkStart || monday(activeDay()), -7); renderWeek(); renderShop(); });
      $("wkNext").addEventListener("click", function () { S.wkStart = addDays(S.wkStart || monday(activeDay()), 7); renderWeek(); renderShop(); });
    }
    if ($("shopList")) {
      $("shopList").addEventListener("change", function (e) { var i = e.target.dataset ? e.target.dataset.shop : null; if (i == null) return; var g = lsGet(shopKey()) || {}; g[i] = e.target.checked; lsSet(shopKey(), g); });
      $("shopReset").addEventListener("click", function () { lsDel(shopKey()); renderShop(); });
    }
    renderWeek(); renderRecipes(); renderShop();
  }
  function renderWeek() {
    if (!$("weekDays")) return;
    if (!S.wkStart) S.wkStart = monday(activeDay());
    var ws = S.wkStart, td = activeDay();
    $("wkLabel").textContent = fmtRange(parseYmd(ws), parseYmd(addDays(ws, 6)));
    $("wkSub").textContent = ws === monday(td) ? t("this_week") : (ws === addDays(monday(td), 7) ? t("next_week") : (ws === addDays(monday(td), -7) ? t("prev_week") : t("other_week")));
    var openSet = {}; qsa("#weekDays details[open]", root).forEach(function (d) { openSet[d.dataset.day] = true; });
    var first = $("weekDays").dataset.wk !== ws, html = "";
    for (var i = 0; i < 7; i++) {
      var day = addDays(ws, i), e = dayEntry(day), meals = mealsFor(day) || [], prot = 0;
      meals.forEach(function (m) { prot += Number(m.protein) || 0; });
      var isOpen = first ? day === td : !!openSet[day], badges = [];
      if (day === td) badges.push('<span class="badge ok">' + esc(t("today_word")) + "</span>");
      if (e && e.workout && WK[e.workout]) badges.push('<span class="badge t-' + wColor(e.workout) + '">' + esc(wTitle(e.workout)) + (e.time ? " " + esc(e.time) : "") + "</span>");
      if (e && e.cook) { var rc = REC[e.cook]; badges.push('<span class="badge warnb">' + esc(t("cook_badge")) + ": " + esc(rc ? (rc.short || rc.name) : e.cook) + "</span>"); }
      var sl = shiftLabel(day);
      html += '<details class="card dayc' + (day === td ? " is-today" : "") + '" data-day="' + day + '"' + (isOpen ? " open" : "") + "><summary>" +
        '<div class="sl"><span class="dn">' + esc(dayLong(parseYmd(day))) + " " + parseYmd(day).getDate() + "." + (parseYmd(day).getMonth() + 1) + '.</span><span class="row">' + (prot ? '<span class="pill">~' + prot + " g</span>" : "") + '<span class="chev">›</span></span></div>' +
        '<div class="row">' + (sl ? '<span class="chip ' + shiftClass(day) + '">' + esc(sl) + "</span>" : "") + badges.join("") + '</div></summary><ul class="meals">' +
        meals.map(function (m) {
          return '<li><span class="tm">' + esc(m.at != null ? fmtMin(m.at) : (m.time || "")) + '</span><span><span class="mn">' + esc(m.name) + '</span><br><span class="mw">' + esc(m.what) + (m.alts && m.alts.length ? " · " + esc(t("if_missing", { x: m.alts.join(", ") })) : "") + "</span></span>" + (m.protein ? '<span class="pg muted">~' + m.protein + " g</span>" : "<span></span>") + "</li>";
        }).join("") + (e ? "" : '<li><span></span><span class="mw">' + esc(t("template_day")) + "</span><span></span></li>") + "</ul></details>";
    }
    $("weekDays").innerHTML = html; $("weekDays").dataset.wk = ws;
  }
  function renderRecipes() {
    if (!$("recipes")) return;
    var list = Object.keys(REC).map(function (k) { return Object.assign({ id: k }, REC[k]); }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    function ul(arr, tag) { return "<" + tag + ">" + arr.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</" + tag + ">"; }
    $("recipes").innerHTML = list.map(function (r) {
      return '<details class="recipe"><summary><b>' + esc(r.name) + '</b><span class="small muted">' + esc(r.perBox || "") + '</span></summary><div class="rb">' +
        (r.time ? '<p class="small muted">' + esc(r.time) + "</p>" : "") +
        ((r.ingredients || []).length ? '<span class="label">' + esc(t("ingredients")) + "</span>" + ul(r.ingredients, "ul") : "") +
        ((r.steps || []).length ? '<span class="label">' + esc(t("steps")) + "</span>" + ul(r.steps, "ol") : "") +
        ((r.storage || []).length ? '<span class="label">' + esc(t("storage")) + "</span>" + ul(r.storage, "ul") : "") + "</div></details>";
    }).join("");
  }
  function shopKey() { return "rekomp-shop-" + ctx.clientId + "-" + (S.wkStart || monday(activeDay())); }
  function renderShop() {
    if (!$("shopList")) return;
    var items = P.shopping.items || [], got = lsGet(shopKey()) || {}, lo = 0, hi = 0, cur = P.shopping.currency || "";
    var loc = lang === "en" ? "en-US" : (lang === "ru" ? "ru-RU" : "sr-RS");
    $("shopList").innerHTML = items.map(function (it, i) {
      lo += it.min || 0; hi += it.max || it.min || 0;
      return '<li><label><input type="checkbox" data-shop="' + i + '"' + (got[i] ? " checked" : "") + '><span><span class="n">' + esc(it.name) + '</span><br><span class="q">' + esc(it.qty || "") + '</span></span><span class="pr">' + (it.min ? esc(it.min.toLocaleString(loc) + (it.max && it.max !== it.min ? "–" + it.max.toLocaleString(loc) : "")) : "") + "</span></label></li>";
    }).join("");
    $("shopTotal").hidden = !lo;
    $("shopTotal").textContent = "≈ " + lo.toLocaleString(loc) + (hi !== lo ? "–" + hi.toLocaleString(loc) : "") + (cur ? " " + cur : "");
  }

  /* ---------- Kalendar ---------- */
  function scrollCal() { if (S.view !== "calendar" || S.calScrolled) return; var el = $("cal-" + activeDay()); if (!el) return; S.calScrolled = true; el.scrollIntoView({ block: "center" }); }
  function renderCal() {
    var v = $("v-calendar"); if (!on("calendar")) { v.innerHTML = ""; return; }
    var td = activeDay(), start = addDays(monday(td), -7), end = addDays(start, 34);
    var calKeys = P.calendar ? Object.keys(P.calendar).sort() : [];
    var maxCal = calKeys.length ? calKeys[calKeys.length - 1] : null;
    if (maxCal && maxCal > end && maxCal <= addDays(td, 90)) end = maxCal;
    var groups = [], cur = null;
    for (var d = start; d <= end; d = addDays(d, 1)) {
      var e = dayEntry(d); if (!e) continue;
      var m = monday(d);
      if (!cur || cur.m !== m) { cur = { m: m, days: [] }; groups.push(cur); }
      cur.days.push(d);
    }
    if (!groups.length) { v.innerHTML = '<div class="card"><p class="muted">' + esc(t("nothing_here")) + "</p></div>"; return; }
    v.innerHTML = '<div class="card"><h2>' + esc(t("tab_calendar")) + '</h2><p class="small muted">' + esc(t("cal_text")) + "</p></div>" + groups.map(function (g) {
      var work = g.days.filter(isWork), chip = RH_KEYS.length > 1 && work.length ? '<span class="chip ' + shiftClass(work[0]) + '">' + esc((rhythmOf(work[0]) || {}).label || "") + "</span>" : "";
      return '<div class="card"><div class="week-h"><h3>' + esc(fmtRange(parseYmd(g.m), parseYmd(addDays(g.m, 6)))) + "</h3>" + chip + "</div><div>" + g.days.map(function (k) {
        var e = dayEntry(k), cls = k < td ? "past" : (k === td ? "is-today" : ""), dd = parseYmd(k), rc = e.cook ? REC[e.cook] : null;
        var done = e.workout && sessionDone(S.sessions[k + "_" + e.workout]), sl = shiftLabel(k);
        return '<div class="day ' + cls + '" id="cal-' + k + '"><div class="dd">' + esc(fmtShortDate(dd).split(" ")[0]) + "<small>" + dd.getDate() + "." + (dd.getMonth() + 1) + '.</small></div><div class="body"><div class="row">' +
          (sl ? '<span class="chip ' + shiftClass(k) + '">' + esc(sl) + "</span>" : "") +
          (e.workout && WK[e.workout] ? '<span class="c-' + wColor(e.workout) + '" style="font-weight:700">' + esc(wTitle(e.workout)) + (e.time ? " · " + esc(e.time) : "") + "</span>" : '<span class="muted">' + esc(t("rest_day")) + "</span>") +
          (done ? '<span class="badge ok">' + esc(t("done_badge")) + "</span>" : "") + (e.cook && on("nutrition") ? '<span class="badge warnb">' + esc(t("cook_badge")) + (rc ? ": " + esc(rc.short || rc.name) : "") + "</span>" : "") +
          (k === td ? '<span class="badge ok">' + esc(t("today_word")) + "</span>" : "") + "</div>" + (e.note ? '<p class="small muted">' + esc(e.note) + "</p>" : "") + "</div></div>";
      }).join("") + "</div></div>";
    }).join("");
    scrollCal();
  }

  /* ---------- Napredak ---------- */
  function baseline(days) {
    if (P.baseline && typeof P.baseline.weight === "number") return P.baseline.weight;
    var f = days.filter(function (d) { return num(d.weight) != null; })[0]; return f ? num(f.weight) : null;
  }
  function renderProgress() {
    var v = $("v-progress"); if (!on("progress")) { v.innerHTML = ""; return; }
    var td = activeDay(), days = Object.keys(S.daily).sort().map(function (k) { return S.daily[k]; }), base = baseline(days);
    var html = "";
    if ((P.targets || []).length) html += '<div class="card"><h2>' + esc(t("goals")) + '</h2><div class="targets">' + P.targets.map(function (it) { return '<div class="target"><span class="label">' + esc(it.label) + '</span><span class="v">' + esc(it.value) + "</span>" + (it.note ? '<span class="small muted">' + esc(it.note) + "</span>" : "") + "</div>"; }).join("") + "</div></div>";
    var pts = days.filter(function (d) { return num(d.weight) != null; }).map(function (d) { return { date: d.date, w: num(d.weight) }; });
    html += '<div class="card"><h2>' + esc(t("weight_title")) + '</h2><div class="chart">';
    if (pts.length < 2) html += '<p class="muted">' + esc(t("weight_empty")) + "</p>";
    else {
      var W = 340, H = 170, L = 40, R = 12, T = 12, B = 26;
      var x0 = parseYmd(pts[0].date).getTime(), x1 = parseYmd(pts[pts.length - 1].date).getTime();
      var vals = pts.map(function (p) { return p.w; }).concat(base != null ? [base] : []);
      var lo = Math.floor(Math.min.apply(null, vals) - 0.5), hi = Math.ceil(Math.max.apply(null, vals) + 0.5);
      var X = function (d) { return L + (x1 === x0 ? 0.5 : (parseYmd(d).getTime() - x0) / (x1 - x0)) * (W - L - R); };
      var Y = function (val) { return T + (hi - val) / (hi - lo) * (H - T - B); };
      var grid = "", step = Math.max(1, Math.ceil((hi - lo) / 6));
      for (var g = lo; g <= hi; g += step) grid += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(g) + '" y2="' + Y(g) + '" stroke="var(--line)" stroke-width="1"/><text x="' + (L - 6) + '" y="' + (Y(g) + 4) + '" text-anchor="end">' + g + "</text>";
      var line = pts.map(function (p, i) { return (i ? "L" : "M") + X(p.date).toFixed(1) + " " + Y(p.w).toFixed(1); }).join(" ");
      var area = line + " L" + X(pts[pts.length - 1].date).toFixed(1) + " " + (H - B) + " L" + X(pts[0].date).toFixed(1) + " " + (H - B) + " Z";
      var last = pts[pts.length - 1];
      html += '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(t("chart_label")) + '">' + grid +
        (base != null ? '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(base) + '" y2="' + Y(base) + '" stroke="var(--muted)" stroke-dasharray="4 4" stroke-width="1"/>' : "") +
        '<path d="' + area + '" fill="var(--blue)" fill-opacity="0.14"/><path d="' + line + '" fill="none" stroke="var(--blue)" stroke-width="2"/>' +
        pts.map(function (p) { return '<circle cx="' + X(p.date).toFixed(1) + '" cy="' + Y(p.w).toFixed(1) + '" r="2.5" fill="var(--blue)"/>'; }).join("") +
        '<circle cx="' + X(last.date).toFixed(1) + '" cy="' + Y(last.w).toFixed(1) + '" r="4.5" fill="var(--blue)" stroke="var(--surface)" stroke-width="2"/>' +
        '<text x="' + L + '" y="' + (H - 6) + '">' + esc(fmtShortDate(parseYmd(pts[0].date))) + '</text><text x="' + (W - R) + '" y="' + (H - 6) + '" text-anchor="end">' + esc(fmtShortDate(parseYmd(last.date))) + "</text></svg>" +
        (base != null ? '<p class="small muted">' + esc(t("baseline_note", { x: f1(base), y: f1(last.w) })) + "</p>" : "");
    }
    html += "</div></div>";
    var startD = P.start || (days[0] && days[0].date) || monday(td), weeks = [];
    for (var s = monday(startD); s <= td; s = addDays(s, 7)) weeks.push(s);
    var prevAvg = base;
    var rows = weeks.map(function (ws) {
      var we = addDays(ws, 6), inW = days.filter(function (d) { return d.date >= ws && d.date <= we; });
      var w = inW.map(function (d) { return num(d.weight); }).filter(function (x) { return x != null; });
      var sl = inW.map(function (d) { return num(d.sleep); }).filter(function (x) { return x != null; });
      var pn = inW.map(function (d) { return num(d.pain); }).filter(function (x) { return x != null; });
      var tr = Object.keys(S.sessions).filter(function (k) { var x = S.sessions[k]; return x.date >= ws && x.date <= we && sessionDone(x); }).length;
      var avg = w.length ? w.reduce(function (a, b) { return a + b; }, 0) / w.length : null, ch = avg != null && prevAvg != null ? avg - prevAvg : null;
      if (avg != null) prevAvg = avg;
      return { ws: ws, we: we, avg: avg, ch: ch, sleep: sl.length ? sl.reduce(function (a, b) { return a + b; }, 0) / sl.length : null, pain: pn.length ? Math.max.apply(null, pn) : null, tr: tr };
    }).reverse();
    html += '<div class="card"><h2>' + esc(t("by_week")) + '</h2><div class="table-wrap"><table><tr><th>' + esc(t("col_week")) + '</th><th class="n">' + esc(t("col_avg")) + '</th><th class="n">' + esc(t("col_change")) + "</th>" + (CI.sleep ? '<th class="n">' + esc(t("col_sleep")) + "</th>" : "") + '<th class="n">' + esc(t("col_trainings")) + "</th>" + (CI.pain ? '<th class="n">' + esc(t("col_pain")) + "</th>" : "") + "</tr>" +
      rows.map(function (r) {
        var ch = r.ch == null ? "—" : (r.ch > 0 ? "+" : "") + f1(r.ch), col = r.ch == null ? "" : (r.ch <= -0.25 ? "color:var(--ok)" : (r.ch > 0.25 ? "color:var(--red)" : ""));
        return "<tr><td>" + esc(fmtRange(parseYmd(r.ws), parseYmd(r.we))) + '</td><td class="n">' + (r.avg == null ? "—" : f1(r.avg) + " kg") + '</td><td class="n" style="' + col + '">' + ch + "</td>" + (CI.sleep ? '<td class="n">' + (r.sleep == null ? "—" : f1(r.sleep) + " h") + "</td>" : "") + '<td class="n">' + r.tr + "</td>" + (CI.pain ? '<td class="n">' + (r.pain == null ? "—" : r.pain + "/10") + "</td>" : "") + "</tr>";
      }).join("") + '</table></div><p class="small muted">' + esc(t("compare_note")) + "</p></div>";
    var rec = days.slice().reverse().slice(0, 10);
    html += '<div class="card"><h2>' + esc(t("recent")) + '</h2><ul class="list">' + (rec.length ? rec.map(function (d) {
      var parts = [];
      if (num(d.weight) != null) parts.push(f1(num(d.weight)) + " kg");
      if (num(d.sleep) != null) parts.push(f1(num(d.sleep)) + " h");
      if (num(d.pain) != null) parts.push(d.pain + "/10");
      if (num(d.waist) != null) parts.push(f1(num(d.waist)) + " cm");
      return "<li><span>" + esc(fmtShortDate(parseYmd(d.date))) + '</span><span class="muted small" style="text-align:right">' + esc(parts.join(" · ") || "—") + "</span></li>";
    }).join("") : '<li class="muted">' + esc(t("no_entries")) + "</li>") + "</ul></div>";
    v.innerHTML = html;
  }

  /* ---------- Plan i Profil ---------- */
  function renderPlan() {
    var v = $("v-plan"); if (!showPlan) { v.innerHTML = ""; return; }
    var html = '<div class="card"><h2>' + esc(t("plan_title")) + "</h2></div>";
    if (on("rules")) html += (P.rules || []).map(function (r) { return '<div class="card plan-sec"><h2>' + esc(r.title || "") + "</h2><ul>" + (r.items || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>"; }).join("");
    if (on("supplements")) html += '<div class="card plan-sec"><h2>' + esc(t("supplements")) + "</h2><ul>" + P.supplements.map(function (s) {
      if (typeof s === "string") return "<li>" + esc(s) + "</li>";
      return "<li><b>" + esc(s.name || "") + "</b>" + (s.dose ? " · " + esc(s.dose) : "") + (s.note ? '<br><span class="muted small">' + esc(s.note) + "</span>" : "") + "</li>";
    }).join("") + "</ul></div>";
    v.innerHTML = html;
  }
  function renderProfile() {
    var v = $("v-profile");
    v.innerHTML = '<div class="card"><h2>' + esc(t("profile_title")) + "</h2>" + (ctx.client ? '<p class="muted">' + esc(ctx.client.name) + "</p>" : "") +
      '<div class="field"><label for="pLang">' + esc(t("lang")) + "</label>" + langSelectHtml("pLang", getLang()) + "</div>" +
      '<div class="actions">' + (ctx.onEditIntake && !ctx.readonly ? '<button type="button" class="btn ghost" id="pIntake">' + esc(t("my_answers")) + "</button>" : "") +
      (ctx.onLogout && !ctx.readonly ? '<button type="button" class="btn ghost" id="pLogout">' + esc(t("logout")) + "</button>" : "") + "</div></div>" +
      '<div class="card"><h3>' + esc(t("install_help")) + '</h3><p class="small">Android: ' + esc(t("install_android")) + '</p><p class="small">iPhone: ' + esc(t("install_ios")) + "</p></div>";
    $("pLang").addEventListener("change", function () { if (ctx.onLang) ctx.onLang($("pLang").value); });
    if ($("pIntake")) $("pIntake").addEventListener("click", function () { ctx.onEditIntake(); });
    if ($("pLogout")) $("pLogout").addEventListener("click", function () { ctx.onLogout(); });
  }

  /* ---------- start ---------- */
  function renderAll() {
    renderDanas(); renderCal(); renderProgress(); renderPlan();
    if (S.trCode == null && WORKOUTS.length) { S.trCode = defaultWorkout(); S.trDate = activeDay(); if ($("trDate")) $("trDate").value = S.trDate; renderTrForm(true); }
    else renderTrForm(false);
  }
  buildTraining(); buildNutrition();
  go((location.hash || "").replace("#", "") || "danas");
  renderAll();
  async function loadData() {
    try {
      var d = await ctx.api.listDaily(ctx.clientId), s = await ctx.api.listSessions(ctx.clientId);
      var dm = {}; (d || []).forEach(function (r) { dm[r.day] = Object.assign({}, r.data, { date: r.day }); });
      var sm = {}; (s || []).forEach(function (r) { sm[r.day + "_" + r.workout] = Object.assign({}, r.data, { date: r.day, workout: r.workout }); });
      Object.keys(S.daily).forEach(function (k) { if (!dm[k]) dm[k] = S.daily[k]; });
      S.daily = dm; S.sessions = sm; S.loaded = true;
      renderAll();
    } catch (e) { /* offline: keep what we have */ }
  }
  loadData();
  S.timer = setInterval(function () {
    if (S.view === "danas" && !S.ciDirty && !root.querySelector("#hero details.easy[open]") && !(document.activeElement && document.activeElement.closest && document.activeElement.closest("#checkin"))) renderDanas();
  }, 60000);
  function onVis() { if (document.visibilityState === "hidden" && saveTimer) flushSession(false); }
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("pagehide", onVis);

  return {
    destroy: function () { clearInterval(S.timer); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("pagehide", onVis); if (saveTimer) flushSession(false); },
    reloadData: loadData,
    view: function () { return S.view; }
  };
}

export function brandHtml(name) {
  name = name || "ReKomp";
  var m = name.match(/^(.*?)([A-ZČĆŽŠĐ][^A-ZČĆŽŠĐ]*)$/);
  if (m && m[1]) return esc(m[1]) + "<span>" + esc(m[2]) + "</span>";
  return esc(name);
}
