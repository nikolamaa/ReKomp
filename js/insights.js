// Napredak klijenata za trenera: trendovi, nedeljne serije i upozorenja.
// Sve je procena iz unosa klijenata; kad podataka ima malo, vraća se null umesto broja.
import { addDays, monday, parseYmd, num, today, weekdayKey } from "./util.js";

var WEIGHT_GOALS = { fat_loss: "loss", recomp: "hold", muscle: "gain" };

function daysBetween(a, b) { return Math.round((parseYmd(b) - parseYmd(a)) / 86400000); }

// Nagib linearne regresije (jedinica po danu).
function slope(points) {
  if (points.length < 2) return null;
  var n = points.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
  points.forEach(function (p) { sx += p.x; sy += p.y; sxx += p.x * p.x; sxy += p.x * p.y; });
  var d = n * sxx - sx * sx;
  return d ? (n * sxy - sx * sy) / d : null;
}

function planEntry(plan, day) {
  if (!plan) return null;
  var cal = plan.calendar && plan.calendar[day];
  var wt = plan.weekTemplate && plan.weekTemplate[weekdayKey(day)];
  if (!cal && !wt) return null;
  return Object.assign({}, wt || {}, cal || {});
}
function plannedWorkout(plan, day) {
  var e = planEntry(plan, day);
  if (!e || !e.workout) return null;
  var ws = (plan.program && plan.program.workouts) || [];
  return ws.some(function (w) { return w.code === e.workout; }) ? e.workout : null;
}

// Procena 1RM (Epley) za najbolju seriju; asistirane vežbe i vežbe na vreme se preskaču.
function bestE1rm(sets) {
  var best = null;
  (sets || []).forEach(function (s) {
    var kg = num(s.kg), r = num(s.reps);
    if (kg == null || r == null || kg <= 0 || r <= 0 || r > 20) return;
    var e = kg * (1 + r / 30);
    if (best == null || e > best) best = e;
  });
  return best;
}
function sessionHasEntries(s) { return !!(s && s.data && s.data.entries && Object.keys(s.data.entries).length); }

function median(arr) {
  if (!arr.length) return null;
  var a = arr.slice().sort(function (x, y) { return x - y; }), m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/*
  input: { clients: [...], plans: {cid: {data, published}}, goals: {cid: goal_main}, daily: [{client_id, day, data}], sessions: [{client_id, day, workout, data}] }
  opts:  { weeks: 4 | 8 | 12, now: "YYYY-MM-DD" }
  return: { weeks: [mondays], rows: [{ client, goal, status, reasons, weight, waist, strength, adherence, checkins, easy, lastDay, series }] }
*/
export function computeInsights(input, opts) {
  opts = opts || {};
  var now = opts.now || today(), nWeeks = opts.weeks || 8;
  var firstMon = addDays(monday(now), -7 * (nWeeks - 1));
  var weeks = []; for (var i = 0; i < nWeeks; i++) weeks.push(addDays(firstMon, 7 * i));
  var from = firstMon, yesterday = addDays(now, -1);

  var byClient = {};
  (input.clients || []).forEach(function (c) { byClient[c.id] = { daily: {}, sessions: [] }; });
  (input.daily || []).forEach(function (r) { if (byClient[r.client_id]) byClient[r.client_id].daily[r.day] = r.data || {}; });
  (input.sessions || []).forEach(function (r) { if (byClient[r.client_id]) byClient[r.client_id].sessions.push(r); });

  var rows = (input.clients || []).filter(function (c) { return c.status === "active"; }).map(function (c) {
    var B = byClient[c.id], plan = input.plans && input.plans[c.id] ? input.plans[c.id].data || {} : {};
    var goal = (input.goals && input.goals[c.id]) || null, wgoal = WEIGHT_GOALS[goal] || null;
    var days = Object.keys(B.daily).sort();
    var lastDay = days.length ? days[days.length - 1] : null;
    var sessDays = B.sessions.filter(sessionHasEntries).map(function (s) { return s.day; }).sort();
    if (sessDays.length && (!lastDay || sessDays[sessDays.length - 1] > lastDay)) lastDay = sessDays[sessDays.length - 1];

    // težina i struk: trend u periodu
    function trend(field) {
      var pts = days.filter(function (d) { return d >= from && d <= now; }).map(function (d) { return { d: d, y: num(B.daily[d][field]) }; }).filter(function (p) { return p.y != null; });
      if (pts.length < 4 || daysBetween(pts[0].d, pts[pts.length - 1].d) < 10) return { rate: null, pts: pts };
      var s = slope(pts.map(function (p) { return { x: daysBetween(from, p.d), y: p.y }; }));
      var avg = pts.reduce(function (a, p) { return a + p.y; }, 0) / pts.length;
      return { rate: s == null ? null : s * 7, pct: s == null || !avg ? null : s * 7 / avg * 100, pts: pts, avg: avg };
    }
    var W = trend("weight"), WA = trend("waist");

    var wStatus = null;
    if (wgoal && W.pct != null) {
      var r = W.pct;
      if (wgoal === "loss") wStatus = r <= -1 ? "fast" : r <= -0.25 ? "on" : r < 0.15 ? "slow" : "wrong";
      else if (wgoal === "gain") wStatus = r > 0.5 ? "fast" : r >= 0.1 ? "on" : r >= 0 ? "slow" : "wrong";
      else wStatus = Math.abs(r) <= 0.25 ? "on" : r < 0 ? "fast" : "wrong";
    }

    // snaga: procenjeni 1RM po vežbi, prvi naspram poslednjih treninga u periodu
    var perEx = {};
    B.sessions.filter(function (s) { return s.day >= from && s.day <= now && s.data && s.data.sets; }).sort(function (a, b) { return a.day.localeCompare(b.day); }).forEach(function (s) {
      Object.keys(s.data.sets).forEach(function (name) {
        if (/pomo[ćc]|asist|assist/i.test(name)) return;
        var e = bestE1rm(s.data.sets[name]); if (e == null) return;
        (perEx[name] = perEx[name] || []).push({ d: s.day, e: e });
      });
    });
    var changes = [], weekStr = {};
    Object.keys(perEx).forEach(function (name) {
      var L = perEx[name]; if (L.length < 2 || daysBetween(L[0].d, L[L.length - 1].d) < 7) return;
      var k = L.length >= 4 ? 2 : 1;
      var a = L.slice(0, k).reduce(function (x, p) { return x + p.e; }, 0) / k, b = L.slice(-k).reduce(function (x, p) { return x + p.e; }, 0) / k;
      changes.push((b / a - 1) * 100);
      L.forEach(function (p) { var wk = monday(p.d); (weekStr[wk] = weekStr[wk] || []).push((p.e / L[0].e - 1) * 100); });
    });
    var strength = changes.length ? median(changes) : null;

    // treninzi po planu (do juče) i lakši dani
    var planStart = plan.start && plan.start > from ? plan.start : from;
    // Po nedelji: odrađeni treninzi (bilo kog dana) naspram planiranih, najviše 100%.
    var planned = 0, done = 0, easy = 0, weekPlan = {}, weekDone = {}, weekSess = {};
    B.sessions.forEach(function (s) { if (sessionHasEntries(s) && s.day >= planStart && s.day <= now) { var k = monday(s.day); weekSess[k] = (weekSess[k] || 0) + 1; } });
    for (var d = planStart; d <= yesterday; d = addDays(d, 1)) {
      if ((B.daily[d] || {}).easy) easy++;
      if (!plannedWorkout(plan, d)) continue;
      var wk = monday(d); planned++; weekPlan[wk] = (weekPlan[wk] || 0) + 1;
    }
    Object.keys(weekPlan).forEach(function (wk) { weekDone[wk] = Math.min(weekSess[wk] || 0, weekPlan[wk]); done += weekDone[wk]; });
    var adherence = planned ? Math.round(done / planned * 100) : null;
    var last14 = 0; for (var j = 0; j < 14; j++) { if (B.daily[addDays(now, -j)]) last14++; }

    // poslednjih 7 dana: bol i san
    var pain = null, sleeps = [];
    for (var q = 0; q < 7; q++) { var x = B.daily[addDays(now, -q)]; if (!x) continue; var pv = num(x.pain); if (pv != null && (pain == null || pv > pain)) pain = pv; var sv = num(x.sleep); if (sv != null) sleeps.push(sv); }
    var sleepAvg = sleeps.length >= 3 ? sleeps.reduce(function (a, b) { return a + b; }, 0) / sleeps.length : null;

    // stanje i razlozi
    var reasons = [], level = 0; // 0 dobro, 1 pratiti, 2 pažnja
    function add(lv, key, vars) { reasons.push({ level: lv, key: key, vars: vars || {} }); if (lv > level) level = lv; }
    var gap = lastDay ? daysBetween(lastDay, now) : null;
    if (gap == null) add(2, "r_never"); else if (gap >= 5) add(2, "r_no_entry", { n: gap }); else if (gap >= 3) add(1, "r_no_entry", { n: gap });
    if (adherence != null && planned >= 3) { if (adherence < 50) add(2, "r_adherence", { x: adherence }); else if (adherence < 80) add(1, "r_adherence", { x: adherence }); }
    if (wStatus === "wrong") add(2, "r_wrong"); else if (wStatus === "fast" && wgoal === "loss") add(2, "r_fast"); else if (wStatus === "fast") add(1, "r_fast_" + wgoal); else if (wStatus === "slow") add(1, "r_slow");
    if (pain != null && pain > 3) add(2, "r_pain", { x: pain });
    if (sleepAvg != null && sleepAvg < 6) add(1, "r_sleep", { x: sleepAvg });
    if (easy >= 3) add(1, "r_easy", { n: easy });
    if (strength != null && strength <= -3) add(1, "r_strength_down", { x: strength });
    var enough = W.pts.length >= 4 || Object.keys(perEx).length > 0 || planned >= 3;
    var status = !enough && level < 2 ? "nodata" : level === 2 ? "bad" : level === 1 ? "watch" : "good";
    if (status === "good" && strength != null && strength >= 2) reasons.push({ level: 0, key: "r_strength_up", vars: { x: strength } });
    if (status === "good" && wStatus === "on") reasons.push({ level: 0, key: "r_on_pace" });

    // nedeljne serije za grafik
    function weekAvg(field) {
      var out = {}; days.forEach(function (d) { var v = num(B.daily[d][field]); if (v == null || d < from) return; var wk = monday(d); (out[wk] = out[wk] || []).push(v); });
      var m = {}; Object.keys(out).forEach(function (k) { m[k] = out[k].reduce(function (a, b) { return a + b; }, 0) / out[k].length; }); return m;
    }
    var wAvg = weekAvg("weight"), waAvg = weekAvg("waist");
    var w0 = null, wa0 = null;
    weeks.forEach(function (wk) { if (w0 == null && wAvg[wk] != null) w0 = wAvg[wk]; if (wa0 == null && waAvg[wk] != null) wa0 = waAvg[wk]; });
    var series = {
      weight: weeks.map(function (wk) { return wAvg[wk] != null && w0 ? (wAvg[wk] / w0 - 1) * 100 : null; }),
      waist: weeks.map(function (wk) { return waAvg[wk] != null && wa0 != null ? waAvg[wk] - wa0 : null; }),
      strength: weeks.map(function (wk) { return weekStr[wk] ? median(weekStr[wk]) : null; }),
      adherence: weeks.map(function (wk) { return weekPlan[wk] ? Math.round((weekDone[wk] || 0) / weekPlan[wk] * 100) : null; })
    };

    return {
      client: c, goal: goal, status: status, level: level, reasons: reasons, gap: gap, lastDay: lastDay,
      weight: { rate: W.rate, pct: W.pct, status: wStatus, n: W.pts.length },
      waist: { rate: WA.rate, n: WA.pts.length },
      strength: strength, adherence: adherence, planned: planned, checkins: last14, easy: easy, pain: pain, sleepAvg: sleepAvg,
      series: series
    };
  });

  var rank = { bad: 0, watch: 1, nodata: 2, good: 3 };
  rows.sort(function (a, b) { return rank[a.status] - rank[b.status] || a.client.name.localeCompare(b.client.name); });
  return { weeks: weeks, rows: rows };
}
