// Format plana: provera i opis za Claude.
import { t } from "./i18n.js";
import { intakeAsText } from "./intake.js";

var TIME = /^\d{1,2}:\d{2}$/;
var DAY = /^\d{4}-\d{2}-\d{2}$/;
var WEEK = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
var KNOWN = ["version", "start", "baseline", "targets", "checkin", "notes", "program", "defaultRhythm", "rhythms", "weekTemplate",
  "calendar", "workMenu", "recipes", "shopping", "nutritionRules", "rules", "supplements", "noTrainDays", "workplace"];

// ---------- Provera obroka sa posla prema meniju firme (meni je u bazi, kartica „Meniji sa posla“) ----------
var DAY_SR = { mon: "ponedeljak", tue: "utorak", wed: "sreda", thu: "četvrtak", fri: "petak", sat: "subota", sun: "nedelja" };
function normDish(x) {
  return String(x || "").toLowerCase().replace(/đ/g, "dj").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, " ").replace(/\bobrok\s+i{1,3}\b\s*[-–]?/g, " ").replace(/-?\s*porcija\b/g, " ")
    .replace(/prilozi po zelji/g, " ").replace(/[^a-z0-9&]+/g, " ").replace(/\s+/g, " ").trim();
}
function shiftFor(menu, rk, r) {
  if (menu.shifts[rk]) return rk;
  var s = (rk + " " + ((r && r.label) || "")).toLowerCase();
  if (/prva|jutarnj|\b1\b/.test(s) && menu.shifts.prva) return "prva";
  if (/druga|popodnev|\b2\b/.test(s) && menu.shifts.druga) return "druga";
  if (/tre[cć]a|no[cć]n|\b3\b/.test(s) && menu.shifts.treca) return "treca";
  return null;
}
// Jelo je na meniju ako se glavni deo (bez salata i priloga, npr. „i kupus salata“) poklapa sa jelom za taj dan.
function onMenu(dish, list, extra) {
  var d = " " + normDish(dish) + " ";
  (extra || []).map(normDish).filter(function (c) { return c.length >= 3; }).sort(function (a, b) { return b.length - a.length; })
    .forEach(function (c) { d = d.split(" " + c + " ").join(" "); });
  d = d.replace(/\s+/g, " ").trim();
  for (var k = 0; k < 4; k++) d = d.replace(/^(i|sa|uz|bez|ili) /, "").replace(/ (i|sa|uz|bez|ili)$/, "");   // veznici ostali posle salate/priloga
  if (d.length < 3) return true;   // samo salata ili prilog
  return list.some(function (m) { var c = normDish(m); return c.length >= 3 && (d.indexOf(c) >= 0 || c.indexOf(d) >= 0); });
}
export function checkWorkMenu(p, menus) {
  var out = [];
  if (!p || !p.workplace) return out;
  var menu = menus && menus[p.workplace];
  if (!menu || !menu.shifts) { out.push("workplace „" + p.workplace + "“: meni te firme nije učitan u aplikaciju (Meniji sa posla), pa obroci sa posla nisu provereni."); return out; }
  var wm = p.workMenu || {}, rh = p.rhythms || {};
  Object.keys(wm).forEach(function (rk) {
    var sk = shiftFor(menu, rk, rh[rk]);
    if (!sk) { out.push("workMenu." + rk + ": ne znam kojoj smeni u meniju „" + (menu.name || p.workplace) + "“ odgovara."); return; }
    var days = (wm[rk] && wm[rk].days) || {}, sh = menu.shifts[sk];
    Object.keys(days).forEach(function (dk) {
      var list = sh[dk] || [], e = days[dk] || {};
      [e.pick].concat(e.alts || []).forEach(function (dish) {
        if (dish && !onMenu(dish, list, sh.extra)) out.push("workMenu." + rk + "." + dk + ": „" + dish + "“ nije na meniju za " + (DAY_SR[dk] || dk) + " (" + sk + " smena).");
      });
    });
  });
  return out;
}

export function validatePlan(text, opts) {
  var errors = [], warnings = [], p;
  try { p = typeof text === "string" ? JSON.parse(text) : text; }
  catch (e) { return { ok: false, errors: ["JSON: " + e.message], warnings: [], plan: null, summary: "" }; }
  if (!p || typeof p !== "object" || Array.isArray(p)) return { ok: false, errors: ["root must be an object {…}"], warnings: [], plan: null, summary: "" };

  Object.keys(p).forEach(function (k) { if (KNOWN.indexOf(k) < 0) warnings.push("unknown key: " + k); });
  var codes = {};
  var workouts = p.program && Array.isArray(p.program.workouts) ? p.program.workouts : [];
  if (p.program && !Array.isArray(p.program.workouts)) errors.push("program.workouts must be a list");
  workouts.forEach(function (w, i) {
    if (!w.code) errors.push("program.workouts[" + i + "].code missing");
    if (codes[w.code]) errors.push("duplicate workout code: " + w.code);
    codes[w.code] = true;
    if (!Array.isArray(w.exercises) || !w.exercises.length) errors.push("workout " + (w.code || i) + ": exercises missing");
    (w.exercises || []).forEach(function (ex, j) { if (!ex.name) errors.push("workout " + w.code + " exercise " + j + ": name missing"); });
  });
  var rhythms = p.rhythms && typeof p.rhythms === "object" ? p.rhythms : {};
  Object.keys(rhythms).forEach(function (rk) {
    var r = rhythms[rk];
    ["wakeAt", "sleepAt", "coffeeAt", "napAt", "shiftStartAt", "shiftEndAt", "trainingAt", "cookAt"].forEach(function (f) {
      if (r[f] != null && r[f] !== "" && !TIME.test(String(r[f]))) errors.push("rhythms." + rk + "." + f + " must be HH:MM (can be over 24:00)");
    });
    if (r.free) ["wakeAt", "trainingAt"].forEach(function (f) {
      if (r.free[f] != null && r.free[f] !== "" && !TIME.test(String(r.free[f]))) errors.push("rhythms." + rk + ".free." + f + " must be HH:MM");
    });
    var lists = [r.meals || []].concat(r.free && r.free.meals ? [r.free.meals] : []);
    lists.forEach(function (meals) {
      if (!Array.isArray(meals)) { errors.push("rhythms." + rk + ".meals must be a list"); return; }
      meals.forEach(function (m, j) {
        if (!m.key) errors.push("rhythms." + rk + " meal " + j + ": key missing");
        if (m.at != null && m.at !== "" && !TIME.test(String(m.at))) errors.push("rhythms." + rk + " meal " + (m.key || j) + ": at must be HH:MM");
      });
    });
  });
  if (p.defaultRhythm && !rhythms[p.defaultRhythm]) errors.push("defaultRhythm not found in rhythms: " + p.defaultRhythm);
  var recipes = p.recipes && typeof p.recipes === "object" ? p.recipes : {};
  function checkDay(where, d) {
    if (!d || typeof d !== "object") { errors.push(where + " must be an object"); return; }
    if (d.workout && !codes[d.workout]) errors.push(where + ".workout not in program: " + d.workout);
    if (d.rhythm && !rhythms[d.rhythm]) errors.push(where + ".rhythm not in rhythms: " + d.rhythm);
    if (d.cook && !recipes[d.cook]) warnings.push(where + ".cook recipe not found: " + d.cook);
    if (d.time && !TIME.test(String(d.time))) errors.push(where + ".time must be HH:MM");
  }
  if (p.weekTemplate) Object.keys(p.weekTemplate).forEach(function (k) {
    if (WEEK.indexOf(k) < 0) errors.push("weekTemplate key must be mon…sun: " + k); else checkDay("weekTemplate." + k, p.weekTemplate[k]);
  });
  if (p.calendar) Object.keys(p.calendar).forEach(function (k) {
    if (!DAY.test(k)) errors.push("calendar key must be YYYY-MM-DD: " + k); else checkDay("calendar." + k, p.calendar[k]);
  });
  if (p.start && !DAY.test(p.start)) errors.push("start must be YYYY-MM-DD");
  if (p.noTrainDays != null && (!Array.isArray(p.noTrainDays) || p.noTrainDays.some(function (d) { return WEEK.indexOf(d) < 0; }))) errors.push("noTrainDays must be a list of mon…sun");
  if (p.shopping && p.shopping.items && !Array.isArray(p.shopping.items)) errors.push("shopping.items must be a list");
  ["targets", "notes", "rules", "supplements", "nutritionRules"].forEach(function (k) { if (p[k] != null && !Array.isArray(p[k])) errors.push(k + " must be a list"); });
  if (p.workplace) warnings = warnings.concat(checkWorkMenu(p, opts && opts.menus));

  var parts = [];
  if (workouts.length) parts.push(t("summary_workouts", { n: workouts.length }));
  var nr = Object.keys(rhythms).length; if (nr) parts.push(t("summary_rhythms", { n: nr }));
  var nc = p.calendar ? Object.keys(p.calendar).length : 0; if (nc) parts.push(t("summary_days", { n: nc }));
  var nrec = Object.keys(recipes).length; if (nrec) parts.push(t("summary_recipes", { n: nrec }));
  if (Array.isArray(p.targets) && p.targets.length) parts.push(t("summary_targets", { n: p.targets.length }));
  return { ok: !errors.length, errors: errors, warnings: warnings, plan: p, summary: parts.join(", ") || "—" };
}

export var PLAN_FORMAT = [
  "FORMAT PLANA (JSON objekat; svi delovi su neobavezni, izostavi ono za šta nema podataka):",
  "{",
  '  "version": 1,',
  '  "start": "YYYY-MM-DD",                       // početak praćenja',
  '  "baseline": { "weight": 0 },                  // početna težina u kg',
  '  "targets": [ { "label": "", "value": "", "note": "" } ],',
  '  "checkin": { "weight": true, "sleep": true, "pain": "Bol u kolenu" | false, "waist": true },',
  '  "notes": [ { "date": "YYYY-MM-DD", "text": "" } ],   // poruke klijentu',
  '  "program": { "workouts": [ { "code": "A", "title": "", "color": "blue|red|green|amber|violet", "focus": "", "duration": "~60 min",',
  '      "exercises": [ { "name": "1. …", "sets": "3 × 8–12", "rir": "1–2", "rest": "2 min", "start": "početna težina", "tip": "", "kind": "time" (samo za vreme) } ],',
  '      "notes": [ "" ] } ] },',
  '  "defaultRhythm": "ključ iz rhythms",',
  '  "rhythms": { "kljuc": { "label": "Posao 9–17", "hours": "9–17", "sleep": "7–8 h", "nap": "",',
  '      "wakeAt": "07:00", "shiftStartAt": "09:00", "shiftEndAt": "17:00", "trainingAt": "18:00", "coffeeAt": "15:00", "napAt": "20:30" (samo ako ima dremku), "cookAt": "19:30", "sleepAt": "23:00",',
  '      "dayEnd": 0,   // za noćnu smenu: sat do kog važi prethodni dan, npr. 9',
  '      "meals": [ { "key": "dorucak", "at": "07:30", "name": "Doručak", "what": "", "protein": 25, "box": true (kutija iz kuvanja), "work": true (obrok sa posla),',
  '                   "post": true (obrok posle treninga; na dan bez treninga dobija restName ili Ručak/Večera), "restName": "",',
  '                   "freeName": "", "freeWhat": "", "freeProtein": 0, "freeAt": "" (zamena za slobodan dan) } ],',
  '      "endTip": "" (bez pominjanja treninga), "endTipTrain": "" (samo za dane sa treningom),',
  '      "free": { "wakeAt": "08:30", "trainingAt": "10:00", "meals": [ … ] },   // poseban raspored za slobodne dane',
  '      "tips": [ "" ] } },',
  '  "weekTemplate": { "mon": { "work": true, "rhythm": "kljuc", "shift": "naziv dana", "workout": "A", "time": "18:00", "cook": "r1", "note": "" }, … "sun": {} },',
  '  "calendar": { "YYYY-MM-DD": { isto kao dan u weekTemplate } },   // izuzeci i smene po datumima; napomene vezane za trening stavi u workouts[].notes',
  '  "noTrainDays": [ "tue" ],   // dani kad klijent nikad ne može da trenira (stalna obaveza); predlog dana treninga ih preskače',
  '  "workplace": "mbcare",   // posao sa fiksnim menijem; Proveri tada proverava workMenu prema meniju te firme',
  '  "workMenu": { "kljuc": { "days": { "mon": { "pick": "", "protein": 35, "alts": [ "" ], "tip": "" } } } },',
  '  "recipes": { "r1": { "name": "", "short": "", "perBox": "4 kutije · ~450 kcal · ~38 g", "time": "", "ingredients": [ "" ], "steps": [ "" ], "storage": [ "" ] } },',
  '  "shopping": { "currency": "RSD", "note": "", "items": [ { "name": "", "qty": "", "min": 0, "max": 0 } ] },',
  '  "nutritionRules": [ "" ],',
  '  "rules": [ { "title": "", "items": [ "" ] } ],',
  '  "supplements": [ { "name": "", "dose": "", "note": "" } ]',
  "}",
  "Vremena su HH:MM; posle ponoći piši 24:30, 26:00 itd. da ostanu u istom danu.",
  "Kodovi treninga u weekTemplate i calendar moraju postojati u program.workouts; cook mora biti ključ iz recipes.",
  "Polja za koja nemaš vrednost izostavi; ne piši prazne stringove (\"\").",
  "Tekstovi koji se ponavljaju svaki dan (obroci, saveti, endTip) ne smeju da pretpostave da tog dana ima treninga; za to služe post/restName i endTipTrain, a za konkretan dan note u calendar."
].join("\n");

var LANG_NAME = { sr: "srpski (latinica)", en: "engleski", ru: "ruski" };

// Za Claude se šalje što manje ličnih podataka: inicijali umesto imena, godine umesto datuma rođenja, bez kontakta.
var PRIVATE_FIELDS = ["full_name", "contact_handle", "contact_method"];
export function initials(name) {
  return String(name || "").replace(/\(.*?\)/g, " ").trim().split(/\s+/).filter(Boolean).map(function (w) { return w.charAt(0).toUpperCase() + "."; }).join(" ") || "Klijent";
}
export function ageFrom(birth, now) {
  var m = String(birth || "").match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return null;
  var d = now || new Date(), age = d.getFullYear() - Number(m[1]);
  if (d.getMonth() + 1 < Number(m[2]) || (d.getMonth() + 1 === Number(m[2]) && d.getDate() < Number(m[3]))) age--;
  return age >= 0 && age < 120 ? age : null;
}
export function claudePrompt(client, answers) {
  var a = Object.assign({}, answers || {}), age = ageFrom(a.birth_date);
  delete a.birth_date; PRIVATE_FIELDS.forEach(function (k) { delete a[k]; });
  return [
    "Napravi plan za mog klijenta u formatu ReKomp plana (JSON).",
    "",
    "Pravila:",
    "- Jezik celog sadržaja plana (nazivi, saveti, obroci, poruke): " + (LANG_NAME[client.lang] || "srpski") + ".",
    "- Poštuj povrede, ograničenja, alergije, netolerancije i ishranu iz odgovora. Ako nešto zahteva lekara, napiši to u rules.",
    "- Ako je u zdravstvenim pitanjima neki odgovor „da“ (označeno [!]), dodaj u notes poruku da pre početka treba dozvola lekara.",
    "- Ne izmišljaj cene; označi ih kao procenu.",
    "- Recepti i priprema samo uz opremu koju klijent ima („Šta imaš u kuhinji?“); ako ima samo osnovno, bez rerne i air fryera. Prilagodi ih tome ko kuva i koliko vremena ima.",
    "- Kupovna lista (shopping) treba da stane u nedeljni budžet iz odgovora; ako ne može, napiši to u shopping.note i predloži jeftiniju zamenu.",
    "- Ako su slobodni dani klizni (days_off: menjaju se ili nemam stalne), klijent ih svake nedelje sam bira u aplikaciji: weekTemplate napravi kao uobičajenu nedelju sa željenim brojem treninga, a svaki ritam (smena) neka ima free raspored za slobodan dan (wakeAt, trainingAt, meals).",
    "- Popuni samo delove za koje odgovori daju osnovu. Za smene napravi rhythms za svaku smenu i calendar po datumima, ako je raspored poznat.",
    "- Podaci su bez imena i kontakta; u planu klijenta ne oslovljavaj imenom.",
    "- Kad klijent sam bira nedelju, napomene u weekTemplate i calendar ne smeju da kažu da je dan sa ili bez treninga (trening može da se pomeri). Stalne zabrane za trening idu u noTrainDays.",
    "- Vrati SAMO validan JSON, bez objašnjenja i bez ``` oznaka.",
    "",
    PLAN_FORMAT,
    "",
    "KLIJENT: " + initials(client.name) + (age != null ? ", " + age + " god." : ""),
    "",
    "ODGOVORI IZ UPITNIKA:",
    intakeAsText(a, "sr")
  ].join("\n");
}
