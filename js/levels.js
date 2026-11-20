// Nivo i XP: računa se iz unosa koje klijent već pravi (jutarnji unos, obroci, treninzi), ništa se posebno ne čuva.
// Isti unosi daju isti XP na svakom uređaju. Vaga ne donosi XP i ništa se ne oduzima; propušten dan samo prekida niz.
// Početni nivo dolazi iz upitnika (iskustvo, da li sada trenira, samoprocena, kondicija, pauza).
import { esc, addDays, monday, num, parseYmd, f1 } from "./util.js";
import { t, getLang, fmtShortDate } from "./i18n.js";
import { FIELD_INDEX, optionLabel, tx } from "./intake.js";

export var XP = { checkin: 15, partial: 8, pain: 5, waist: 10, sleep7: 10, sleep6: 5, meal: 5, allMeals: 15, protein: 10, extra: 3,
  train: 40, fullTrain: 20, better: 10, same: 2, pr: 25, streakPer: 2, streakMax: 10, weekTrain: 100, weekCheckin: 50 };
var TIERS = [1, 5, 10, 15, 20, 30, 40];
export var BADGES = ["first", "streak7", "streak30", "pr1", "pr10", "week", "weeks4", "meals5", "prot7", "sleep5", "waist4", "xp1000"];
var MAX_DAYS = 1500;   // zaštita: najviše ~4 godine unazad

export function needFor(l) { return 150 + 50 * l; }
export function tierOf(l) { var k = TIERS[0]; TIERS.forEach(function (x) { if (l >= x) k = x; }); return t("lv_tier_" + k); }
export function fmtN(n) {
  var loc = { sr: "sr-Latn-RS", en: "en-GB", ru: "ru-RU" }[getLang()] || "sr-Latn-RS";
  try { return Math.round(n).toLocaleString(loc); } catch (e) { return String(Math.round(n)); }
}
export function levelFrom(start, total) {
  var l = start, rem = total;
  while (rem >= needFor(l) && l < 99) { rem -= needFor(l); l++; }
  return { level: l, into: rem, need: needFor(l), p: Math.min(1, rem / needFor(l)) };
}

/* ---------- početni nivo iz upitnika ---------- */
var Y_LV = { never: 1, lt6m: 2, "6-12m": 4, "1-3y": 6, "3-5y": 9, "5y+": 12 };
var ADJ = { active_now: { no: -3, sometimes: -2, "1-2": -1, "3+": 0 }, level: { beginner: -1, intermediate: 0, advanced: 1 }, cardio_fitness: { low: -1, run5k: 1 } };
function fieldText(id, v) {
  var f = FIELD_INDEX[id], lang = getLang();
  return f ? tx(f.label, lang).replace(/[?:？]\s*$/, "") + ": " + optionLabel(f, v, lang) : String(v);
}
export function startLevel(answers) {
  var a = answers || {}, lines = [];
  var lv = Y_LV[a.years] || 1;
  lines.push({ text: a.years ? fieldText("years", a.years) : t("lv_s_no_years"), level: lv });
  Object.keys(ADJ).forEach(function (id) {
    var d = ADJ[id][a[id]];
    if (d != null) { lv += d; lines.push({ text: fieldText(id, a[id]), delta: d }); }
  });
  var br = String(a.break || "").trim();
  if (br && !/^(ne|nema|nisam|nije|no|none|нет|не)\b/i.test(br)) { lv -= 1; lines.push({ text: t("lv_s_break", { x: br }), delta: -1 }); }
  return { level: Math.max(1, Math.min(15, lv)), lines: lines, has: Object.keys(a).length > 0 };
}

/* ---------- XP ---------- */
// Procena za rekorde: kg × (1 + ponavljanja/30); bez kilaže broje se ponavljanja; za vežbe na vreme vreme.
export function bestScore(sets, ex) {
  var best = null;
  (sets || []).forEach(function (st) {
    var v = null, kg = num(st.kg), r = num(st.reps);
    if (ex && ex.kind === "time") v = num(st.v);
    else if (kg != null && r != null) v = kg > 0 ? kg * (1 + r / 30) : r;
    else if (r != null) v = r;
    else if (st.v != null) v = num(st.v);
    if (v != null && (best == null || v > best)) best = v;
  });
  return best;
}

// src: { from, today, daily, sessions, ci, nutrition, training, extras, mealsFor(day), trainOf(day), exercises(code), setsOf(s, name), sessionDone(s), title(code) }
export function computeXP(src) {
  var today = src.today, ev = {}, total = 0, got = {}, prs = [], streak = 0, maxStreak = 0;
  var cnt = { meals: 0, prot: 0, prs: 0, weeksFull: 0 }, waistWeeks = {}, weeks = {}, ci = src.ci || {};
  var from = src.from && src.from <= today ? src.from : today;
  if (addDays(from, MAX_DAYS) < today) from = addDays(today, -MAX_DAYS);
  function add(day, xp, k, v) { if (!xp) return; (ev[day] = ev[day] || []).push({ xp: xp, k: k, v: v || null }); total += xp; }
  function badge(k, day) { if (!got[k]) got[k] = day; }
  var sess = Object.keys(src.sessions || {}).map(function (k) { return src.sessions[k]; })
    .filter(function (x) { return x && x.date && x.date >= from && x.date <= today && src.sessionDone(x); })
    .sort(function (a, b) { return a.date.localeCompare(b.date) || String(a.workout).localeCompare(String(b.workout)); });
  var byDay = {}; sess.forEach(function (x) { (byDay[x.date] = byDay[x.date] || []).push(x); });
  var lastBy = {}, bestBy = {};
  var req = (ci.weight ? ["weight"] : []).concat(ci.sleep ? ["sleep"] : []);
  for (var day = from; day <= today; day = addDays(day, 1)) {
    var d = (src.daily || {})[day] || {}, on = d.meals || {}, sl = num(d.sleep), wk = monday(day);
    var W = weeks[wk] = weeks[wk] || { xp: 0, ci: 0, done: 0, planned: null, sleep7: 0, bonusT: false, bonusC: false };
    var before = total;
    // jutarnji unos i niz bez preskakanja
    var have = req.filter(function (f) { return num(d[f]) != null; }).length;
    if (req.length && have === req.length) add(day, XP.checkin, "lv_e_checkin");
    else if (have) add(day, XP.partial, "lv_e_partial");
    if (have) { streak++; W.ci++; badge("first", day); maxStreak = Math.max(maxStreak, streak); if (streak >= 2) add(day, Math.min(streak, XP.streakMax) * XP.streakPer, "lv_e_streak", { n: streak }); }
    else if (day !== today) streak = 0;
    if (streak >= 7) badge("streak7", day);
    if (streak >= 30) badge("streak30", day);
    if (ci.pain && num(d.pain) != null) add(day, XP.pain, "lv_e_pain");
    if (ci.waist && num(d.waist) != null && !waistWeeks[wk]) { waistWeeks[wk] = true; add(day, XP.waist, "lv_e_waist"); if (Object.keys(waistWeeks).length >= 4) badge("waist4", day); }
    if (ci.sleep && sl != null && sl >= 7) { add(day, XP.sleep7, "lv_e_sleep7"); W.sleep7++; if (W.sleep7 >= 5) badge("sleep5", day); }
    else if (ci.sleep && sl != null && sl >= 6) add(day, XP.sleep6, "lv_e_sleep6");
    // obroci, proteini, voda/koraci/suplementi
    if (src.nutrition) {
      var meals = src.mealsFor(day) || [], ticked = meals.filter(function (m) { return on[m.key]; });
      if (ticked.length) add(day, ticked.length * XP.meal, "lv_e_meals", { n: ticked.length, m: meals.length });
      if (meals.length && ticked.length === meals.length) { add(day, XP.allMeals, "lv_e_allmeals"); cnt.meals++; if (cnt.meals >= 5) badge("meals5", day); }
      var pPlan = 0, pGot = 0; meals.forEach(function (m) { var p = Number(m.protein) || 0; pPlan += p; if (on[m.key]) pGot += p; });
      if (pPlan && pGot >= 0.9 * pPlan) { add(day, XP.protein, "lv_e_protein"); cnt.prot++; if (cnt.prot >= 7) badge("prot7", day); }
      var ex = (src.extras || []).filter(function (k) { return on[k]; });
      if (ex.length) add(day, ex.length * XP.extra, "lv_e_extras", { n: ex.length, m: src.extras.length });
    }
    // treninzi i napredak na vežbama
    if (src.training) (byDay[day] || []).forEach(function (x, i) {
      var list = src.exercises(x.workout) || [], names = Object.keys(Object.assign({}, x.entries || {}, x.sets || {}));
      if (i === 0) { add(day, XP.train, "lv_e_train", { x: src.title(x.workout) }); W.done++; }
      if (list.length && names.length >= 0.8 * list.length) add(day, XP.fullTrain, "lv_e_full");
      var nb = 0, ns = 0, npr = 0;
      names.forEach(function (name) {
        var e = list.filter(function (q) { return q.name === name; })[0] || null, cur = bestScore(src.setsOf(x, name), e);
        if (cur == null) return;
        var prev = lastBy[name], top = bestBy[name];
        if (prev != null) { if (cur > prev * 1.005) nb++; else if (cur >= prev * 0.995) ns++; }
        if (top != null && cur > top * 1.005 && npr < 3) { npr++; cnt.prs++; prs.push({ date: day, name: name, v: cur, prev: top, kind: e && e.kind }); }
        lastBy[name] = cur; bestBy[name] = top == null ? cur : Math.max(top, cur);
      });
      if (nb) add(day, Math.min(nb, 6) * XP.better, "lv_e_better", { n: nb });
      if (ns) add(day, Math.min(ns, 6) * XP.same, "lv_e_same", { n: ns });
      if (npr) { add(day, npr * XP.pr, npr === 1 ? "lv_e_pr1" : "lv_e_prn", { n: npr }); badge("pr1", day); if (cnt.prs >= 10) badge("pr10", day); }
    });
    // nedeljni bonusi, čim se ispune; šetnja i pomeren trening (lakši dan) se ne traže
    if (src.training && W.planned == null) {
      W.planned = 0;
      for (var k = 0; k < 7; k++) { var tr = src.trainOf(addDays(wk, k)); if (tr && !tr.away && tr.easy !== "walk") W.planned++; }
    }
    if (src.training && !W.bonusT && W.planned && W.done >= W.planned) { W.bonusT = true; add(day, XP.weekTrain, "lv_e_week_train"); cnt.weeksFull++; badge("week", day); if (cnt.weeksFull >= 4) badge("weeks4", day); }
    if (req.length && !W.bonusC && W.ci >= 6) { W.bonusC = true; add(day, XP.weekCheckin, "lv_e_week_ci"); }
    W.xp += total - before;
    if (total >= 1000) badge("xp1000", day);
  }
  var todayEv = ev[today] || [];
  return { total: total, ev: ev, got: got, prs: prs.reverse(), streak: streak, maxStreak: maxStreak, weeks: weeks, today: today,
    todayXP: todayEv.reduce(function (a, b) { return a + b.xp; }, 0) };
}
export function evLabel(e) { return t(e.k, e.v || {}); }
export function evKey(e) { return e.k + "|" + JSON.stringify(e.v || {}) + "|" + e.xp; }

/* ---------- HTML ---------- */
function ring(L, big) { return '<div class="lvl-ring' + (big ? " big" : "") + '" style="--p:' + L.p.toFixed(3) + '"><span>' + L.level + "</span></div>"; }
function bar(L) {
  return '<div class="lvl-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + L.need + '" aria-valuenow="' + Math.round(L.into) + '"><span style="width:' + (L.p * 100).toFixed(1) + '%"></span></div>';
}
export function cardHtml(R) {
  var L = R.L;
  return '<div class="lvl-top">' + ring(L) + '<div class="lvl-meta"><span class="label">' + esc(t("lv_level")) + " · " + esc(tierOf(L.level)) + "</span>" + bar(L) +
    '<span class="small muted">' + esc(fmtN(L.into) + " / " + fmtN(L.need) + " XP") + ' · <span class="xp-text">' + esc(t("lv_plus_today", { x: fmtN(R.X.todayXP) })) + "</span></span></div>" +
    '<span class="lvl-chev" aria-hidden="true">›</span></div>';
}
// opt: { ci, nutrition, training }
export function viewHtml(R, opt) {
  var X = R.X, L = R.L, st = R.st, h = "";
  h += '<div class="card"><div class="lvl-top">' + ring(L, true) + '<div class="lvl-meta"><span class="label">' + esc(t("lv_level")) + " " + L.level + '</span><span class="lvl-tier">' + esc(tierOf(L.level)) + "</span>" + bar(L) +
    '<span class="small muted">' + esc(t("lv_to_next", { a: fmtN(L.into), b: fmtN(L.need), n: L.level + 1 })) + "</span></div></div></div>";
  var tev = X.ev[X.today] || [];
  h += '<div class="card"><div class="card-h"><h2>' + esc(t("lv_today")) + '</h2><span class="pill xp">+' + esc(fmtN(X.todayXP)) + ' XP</span></div><ul class="lvl-todo" id="lvToday">' +
    (tev.length ? tev.map(function (e) { return "<li><span>" + esc(evLabel(e)) + "</span><b>+" + e.xp + "</b></li>"; }).join("") : '<li class="muted">' + esc(t("lv_none_today")) + "</li>") + "</ul></div>";
  var W = X.weeks[monday(X.today)] || { xp: 0, ci: 0, done: 0, planned: 0 };
  var wl = "";
  if (opt.training) wl += "<li><span>" + esc(t("lv_w_train")) + "</span><b>" + W.done + " / " + (W.planned || 0) + (W.planned && W.done >= W.planned ? " ✓" : "") + "</b></li>";
  if (opt.ci.weight || opt.ci.sleep) wl += "<li><span>" + esc(t("lv_w_ci")) + "</span><b>" + W.ci + " / 7" + (W.ci >= 6 ? " ✓" : "") + "</b></li>";
  h += '<div class="card"><div class="card-h"><h2>' + esc(t("lv_week")) + '</h2><span class="pill xp">+' + esc(fmtN(W.xp)) + ' XP</span></div><ul class="lvl-todo" id="lvWeek">' + wl + "</ul></div>";
  h += '<div class="card"><h2>' + esc(t("lv_14")) + '</h2><div class="xp-chart">' + chart(X) + "</div></div>";
  h += '<div class="card"><h2>' + esc(t("lv_badges")) + '</h2><div class="badges" id="lvBadges">' + BADGES.map(function (b) {
    var g = X.got[b];
    return '<div class="bdg ' + (g ? "on" : "off") + '"><b>' + esc(t("lv_b_" + b)) + '</b><span class="small">' + esc(t("lv_bd_" + b)) + "</span>" + (g ? '<span class="small muted">' + esc(fmtShortDate(parseYmd(g))) + "</span>" : "") + "</div>";
  }).join("") + "</div></div>";
  if (opt.training) h += '<div class="card"><h2>' + esc(t("lv_prs")) + '</h2><ul class="list" id="lvPrs">' + (X.prs.length ? X.prs.slice(0, 10).map(function (p) {
    var unit = p.kind === "time" ? "" : " kg";
    return '<li><span><b>' + esc(p.name.replace(/^\d+[a-z]?\.\s*/, "")) + '</b><br><span class="small muted">' + esc(fmtShortDate(parseYmd(p.date))) + '</span></span><span class="small lvl-pr">~' + esc(f1(p.v) + unit) + '<br><span class="muted">' + esc(t("lv_pr_prev", { x: f1(p.prev) + unit })) + "</span></span></li>";
  }).join("") : '<li class="muted">' + esc(t("lv_prs_none")) + "</li>") + '</ul><p class="small muted">' + esc(t("lv_prs_hint")) + "</p></div>";
  h += '<div class="card"><h2>' + esc(t("lv_rules")) + '</h2><div class="table-wrap"><table class="lvl-rules" id="lvRules"><tr><th>' + esc(t("lv_what")) + '</th><th class="n">XP</th></tr>' +
    rules(opt).map(function (r) { return "<tr><td>" + esc(r[0]) + '</td><td class="n">' + esc(r[1]) + "</td></tr>"; }).join("") +
    "<tr><td>" + esc(t("lv_need")) + '</td><td class="n">' + esc(t("lv_need_v")) + "</td></tr></table></div>" +
    '<p class="small">' + esc(t("lv_streak_text", { a: XP.streakPer, b: XP.streakPer * XP.streakMax, c: XP.streakMax })) + '</p><p class="small muted">' + esc(t("lv_fair_text")) + "</p></div>";
  h += '<div class="card"><h2>' + esc(t("lv_start")) + '</h2><p>' + esc(t("lv_start_text", { n: st.level, tier: tierOf(st.level) })) + "</p><ul id=\"lvStart\">" +
    st.lines.map(function (l) { return "<li>" + esc(l.text) + " " + esc(l.level != null ? "→ " + t("lv_level").toLowerCase() + " " + l.level : "(" + (l.delta > 0 ? "+" : l.delta < 0 ? "−" : "±") + Math.abs(l.delta) + ")") + "</li>"; }).join("") + "</ul>" +
    (st.has ? "" : '<p class="small muted">' + esc(t("lv_start_none")) + "</p>") + "</div>";
  return h;
}
function rules(opt) {
  var r = [], ci = opt.ci || {};
  function plus(x) { return "+" + x; }
  if (ci.weight || ci.sleep) {
    r.push([t(ci.weight && ci.sleep ? "lv_r_checkin" : "lv_r_checkin1"), plus(XP.checkin)]);
    r.push([t("lv_r_streak"), t("lv_r_streak_v", { a: XP.streakPer, b: XP.streakPer * XP.streakMax })]);
  }
  if (ci.sleep) r.push([t("lv_r_sleep"), plus(XP.sleep7) + " / " + plus(XP.sleep6)]);
  if (ci.pain) r.push([t("lv_r_pain"), plus(XP.pain)]);
  if (ci.waist) r.push([t("lv_r_waist"), plus(XP.waist)]);
  if (opt.nutrition) {
    r.push([t("lv_r_meal"), plus(XP.meal)], [t("lv_r_allmeals"), plus(XP.allMeals)], [t("lv_r_protein"), plus(XP.protein)], [t("lv_r_extra"), t("lv_each", { x: XP.extra })]);
  }
  if (opt.training) {
    r.push([t("lv_r_train"), plus(XP.train)], [t("lv_r_full"), plus(XP.fullTrain)], [t("lv_r_better"), t("lv_per_ex", { x: XP.better })], [t("lv_r_same"), t("lv_per_ex", { x: XP.same })],
      [t("lv_r_pr"), plus(XP.pr)], [t("lv_r_week_train"), plus(XP.weekTrain)]);
  }
  if (ci.weight || ci.sleep) r.push([t("lv_r_week_ci"), plus(XP.weekCheckin)]);
  return r;
}
function chart(X) {
  var days = []; for (var i = 13; i >= 0; i--) days.push(addDays(X.today, -i));
  var vals = days.map(function (d) { return (X.ev[d] || []).reduce(function (a, b) { return a + b.xp; }, 0); });
  var mx = Math.max(50, Math.max.apply(null, vals)), Wd = 340, H = 140, B = 22, T = 14, bw = (Wd - 8) / 14;
  return '<svg viewBox="0 0 ' + Wd + " " + H + '" role="img" aria-label="' + esc(t("lv_chart_aria")) + '">' + days.map(function (d, i) {
    var h = vals[i] / mx * (H - B - T), x = 4 + i * bw, y = H - B - h, isT = d === X.today;
    return '<rect x="' + (x + 2).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (bw - 4).toFixed(1) + '" height="' + Math.max(h, vals[i] ? 2 : 0).toFixed(1) + '" rx="3" class="' + (isT ? "xb-today" : "xb") + '"/>' +
      (vals[i] ? '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 3).toFixed(1) + '" text-anchor="middle">' + vals[i] + "</text>" : "") +
      (i % 2 === 1 || isT ? '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + parseYmd(d).getDate() + ".</text>" : "");
  }).join("") + "</svg>";
}
