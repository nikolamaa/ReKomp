// Format plana: provera i opis za Claude.
import { t } from "./i18n.js";
import { intakeAsText } from "./intake.js";

var TIME = /^\d{1,2}:\d{2}$/;
var DAY = /^\d{4}-\d{2}-\d{2}$/;
var WEEK = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
var KNOWN = ["version", "start", "baseline", "targets", "checkin", "notes", "program", "defaultRhythm", "rhythms", "weekTemplate",
  "calendar", "workMenu", "recipes", "shopping", "nutritionRules", "rules", "supplements"];

export function validatePlan(text) {
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
      if (r[f] != null && !TIME.test(String(r[f]))) errors.push("rhythms." + rk + "." + f + " must be HH:MM (can be over 24:00)");
    });
    var lists = [r.meals || []].concat(r.free && r.free.meals ? [r.free.meals] : []);
    lists.forEach(function (meals) {
      if (!Array.isArray(meals)) { errors.push("rhythms." + rk + ".meals must be a list"); return; }
      meals.forEach(function (m, j) {
        if (!m.key) errors.push("rhythms." + rk + " meal " + j + ": key missing");
        if (m.at != null && !TIME.test(String(m.at))) errors.push("rhythms." + rk + " meal " + (m.key || j) + ": at must be HH:MM");
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
  if (p.shopping && p.shopping.items && !Array.isArray(p.shopping.items)) errors.push("shopping.items must be a list");
  ["targets", "notes", "rules", "supplements", "nutritionRules"].forEach(function (k) { if (p[k] != null && !Array.isArray(p[k])) errors.push(k + " must be a list"); });

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
  '      "wakeAt": "07:00", "shiftStartAt": "09:00", "shiftEndAt": "17:00", "trainingAt": "18:00", "coffeeAt": "15:00", "napAt": "", "cookAt": "19:30", "sleepAt": "23:00",',
  '      "dayEnd": 0,   // za noćnu smenu: sat do kog važi prethodni dan, npr. 9',
  '      "meals": [ { "key": "dorucak", "at": "07:30", "name": "Doručak", "what": "", "protein": 25, "box": true (kutija iz kuvanja), "work": true (obrok sa posla),',
  '                   "post": true (obrok posle treninga; na dan bez treninga dobija restName ili Ručak/Večera), "restName": "",',
  '                   "freeName": "", "freeWhat": "", "freeProtein": 0, "freeAt": "" (zamena za slobodan dan) } ],',
  '      "endTip": "" (bez pominjanja treninga), "endTipTrain": "" (samo za dane sa treningom),',
  '      "free": { "wakeAt": "08:30", "trainingAt": "10:00", "meals": [ … ] },   // poseban raspored za slobodne dane',
  '      "tips": [ "" ] } },',
  '  "weekTemplate": { "mon": { "work": true, "rhythm": "kljuc", "shift": "naziv dana", "workout": "A", "time": "18:00", "cook": "r1", "note": "" }, … "sun": {} },',
  '  "calendar": { "YYYY-MM-DD": { isto kao dan u weekTemplate } },   // izuzeci i smene po datumima',
  '  "workMenu": { "kljuc": { "days": { "mon": { "pick": "", "protein": 35, "alts": [ "" ], "tip": "" } } } },',
  '  "recipes": { "r1": { "name": "", "short": "", "perBox": "4 kutije · ~450 kcal · ~38 g", "time": "", "ingredients": [ "" ], "steps": [ "" ], "storage": [ "" ] } },',
  '  "shopping": { "currency": "RSD", "note": "", "items": [ { "name": "", "qty": "", "min": 0, "max": 0 } ] },',
  '  "nutritionRules": [ "" ],',
  '  "rules": [ { "title": "", "items": [ "" ] } ],',
  '  "supplements": [ { "name": "", "dose": "", "note": "" } ]',
  "}",
  "Vremena su HH:MM; posle ponoći piši 24:30, 26:00 itd. da ostanu u istom danu.",
  "Kodovi treninga u weekTemplate i calendar moraju postojati u program.workouts; cook mora biti ključ iz recipes.",
  "Tekstovi koji se ponavljaju svaki dan (obroci, saveti, endTip) ne smeju da pretpostave da tog dana ima treninga; za to služe post/restName i endTipTrain, a za konkretan dan note u calendar."
].join("\n");

var LANG_NAME = { sr: "srpski (latinica)", en: "engleski", ru: "ruski" };

export function claudePrompt(client, answers) {
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
    "- Vrati SAMO validan JSON, bez objašnjenja i bez ``` oznaka.",
    "",
    PLAN_FORMAT,
    "",
    "KLIJENT: " + client.name,
    "",
    "ODGOVORI IZ UPITNIKA:",
    intakeAsText(answers || {}, "sr")
  ].join("\n");
}
