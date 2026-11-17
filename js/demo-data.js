// Izmišljeni primer podataka za demo režim. Ne sadrži prave klijente.
import { today, addDays } from "./util.js";

var T0 = today();

export var SAMPLE_PLAN = {
  version: 1,
  start: addDays(T0, -14),
  baseline: { weight: 72.4 },
  targets: [
    { label: "Kalorije", value: "~1.900 kcal", note: "koriguje se po nedeljnom proseku" },
    { label: "Protein", value: "~120 g", note: "dnevno" },
    { label: "Treninzi", value: "3 nedeljno", note: "pon, sre, pet" },
    { label: "Koraci", value: "~8.000", note: "dnevni prosek" }
  ],
  checkin: { weight: true, sleep: true, pain: "Bol u kolenu", waist: true },
  notes: [
    { date: addDays(T0, -1), text: "Odlična prva nedelja! Od sada posle svakog treninga 10 minuta hoda na traci." }
  ],
  program: {
    workouts: [
      {
        code: "A", title: "Full body A", color: "blue", focus: "Čučanj i potisak", duration: "~60 min",
        exercises: [
          { name: "1. Goblet čučanj", sets: "3 × 8–12", rir: "2", rest: "2 min", start: "16 kg", tip: "Kolena prate prste, bez bola" },
          { name: "2. Potisak bučicama na kosoj klupi", sets: "3 × 8–12", rir: "1–2", rest: "2 min", start: "2 × 10 kg" },
          { name: "3. Veslanje na sajli", sets: "3 × 10–12", rir: "1–2", rest: "90 s" },
          { name: "4. Hip thrust", sets: "3 × 10–12", rir: "1", rest: "90 s" },
          { name: "5. Bočno podizanje", sets: "2 × 12–15", rir: "0–1", rest: "60 s" },
          { name: "6. Plank", sets: "2 × 30–40 s", rest: "60 s", kind: "time" }
        ],
        notes: ["Zagrevanje: 5 minuta bicikla i 2 lagane serije čučnja."]
      },
      {
        code: "B", title: "Full body B", color: "red", focus: "Mrtvo dizanje i povlačenje", duration: "~60 min",
        exercises: [
          { name: "1. Rumunsko mrtvo dizanje bučicama", sets: "3 × 8–10", rir: "2", rest: "2 min", start: "2 × 14 kg", tip: "Leđa ravna, spuštaj dok kukovi idu unazad" },
          { name: "2. Lat pulldown", sets: "3 × 8–12", rir: "1–2", rest: "2 min" },
          { name: "3. Leg press", sets: "3 × 10–12", rir: "2", rest: "2 min", tip: "Bez bola u kolenu; dubina koliko prija" },
          { name: "4. Potisak bučicama iznad glave", sets: "2 × 8–12", rir: "1–2", rest: "90 s" },
          { name: "5. Pregib nogu ležeći", sets: "2 × 10–15", rir: "1", rest: "60 s" },
          { name: "6. Traka sa nagibom", sets: "10 min", kind: "time" }
        ]
      }
    ]
  },
  defaultRhythm: "posao",
  rhythms: {
    posao: {
      label: "Posao 9–17", hours: "9–17", sleep: "7–8 h",
      wakeAt: "07:00", shiftStartAt: "09:00", shiftEndAt: "17:00", trainingAt: "18:00", coffeeAt: "15:00", cookAt: "19:30", sleepAt: "23:00",
      meals: [
        { key: "dorucak", at: "07:30", name: "Doručak", what: "Ovsena kaša sa jogurtom i voćem", protein: 25 },
        { key: "rucak", at: "12:30", name: "Ručak", what: "1 kutija iz kuvanja", protein: 35, box: true },
        { key: "uzina", at: "16:00", name: "Užina", what: "Grčki jogurt i jabuka", protein: 20 },
        { key: "vecera", at: "19:30", name: "Večera", what: "Omlet od 3 jaja, salata i hleb", protein: 25 }
      ],
      free: {
        wakeAt: "08:30",
        meals: [
          { key: "dorucak", at: "09:00", name: "Doručak", what: "Omlet od 3 jaja i hleb", protein: 22 },
          { key: "rucak", at: "13:30", name: "Ručak", what: "1 kutija iz kuvanja", protein: 35, box: true },
          { key: "uzina", at: "17:00", name: "Užina", what: "Grčki jogurt i voće", protein: 20 },
          { key: "vecera", at: "20:00", name: "Večera", what: "Tunjevina, krompir i salata", protein: 30 }
        ]
      },
      tips: ["Ponesi užinu na posao da ne preskočiš obrok."]
    }
  },
  weekTemplate: {
    mon: { work: true, workout: "A", time: "18:00" },
    tue: { work: true },
    wed: { work: true, workout: "B", time: "18:00" },
    thu: { work: true, cook: "r2" },
    fri: { work: true, workout: "A", time: "18:00" },
    sat: { note: "Šetnja 45 minuta" },
    sun: { cook: "r1", note: "Kuvanje za 3 dana" }
  },
  calendar: {},
  recipes: {
    r1: {
      name: "Piletina sa povrćem iz rerne", short: "Piletina i povrće", perBox: "4 kutije · ~450 kcal · ~38 g", time: "Oko 50 min, od toga 15 min aktivno.",
      ingredients: ["600 g pilećeg filea", "800 g krompira", "2 paprike i 1 tikvica", "2 kašike maslinovog ulja", "začini po ukusu"],
      steps: ["Iseci sve na kocke i izmešaj sa uljem i začinima.", "Peci na 200 °C oko 35 minuta, promešaj na pola.", "Podeli u 4 kutije."],
      storage: ["Frižider do 3 dana.", "Kutiju za 4. dan odmah zamrzni."]
    },
    r2: {
      name: "Ćuretina sa pirinčem", short: "Ćuretina i pirinač", perBox: "3 kutije · ~500 kcal · ~40 g", time: "Oko 30 min.",
      ingredients: ["450 g ćurećeg filea", "200 g pirinča", "300 g smrznutog povrća", "začini"],
      steps: ["Skuvaj pirinač.", "Ispeci ćuretinu u tiganju, 6–8 minuta po strani.", "Dodaj povrće 5 minuta pred kraj."],
      storage: ["Frižider do 3 dana."]
    }
  },
  shopping: {
    currency: "RSD", note: "Okvirna procena.",
    items: [
      { name: "Pileći file", qty: "600 g", min: 450, max: 550 },
      { name: "Ćureći file", qty: "450 g", min: 450, max: 600 },
      { name: "Jaja", qty: "20 kom", min: 400, max: 500 },
      { name: "Grčki jogurt", qty: "5 čaša", min: 450, max: 600 },
      { name: "Ovsene pahuljice", qty: "500 g", min: 120, max: 180 },
      { name: "Povrće i voće", qty: "~4 kg", min: 900, max: 1300 }
    ]
  },
  nutritionRules: ["Ako preskočiš obrok, sledeći jedi normalno, bez kazne.", "Voda 2–2,5 l dnevno."],
  rules: [
    { title: "Progresija", items: ["Ista težina dok sve serije ne dođu do gornje granice ponavljanja.", "Onda +1–2 kg na bučicama ili +5 kg na mašinama."] },
    { title: "Koleno", items: ["Bol do 3/10 je u redu ako ne raste sledećeg dana.", "Ako pređe 3/10, smanji dubinu i javi mi."] }
  ],
  supplements: [
    { name: "Kreatin monohidrat", dose: "3–5 g dnevno", note: "Bilo kada u toku dana." },
    { name: "Vitamin D", dose: "po nalazu", note: "Prvo nalaz 25(OH)D." }
  ]
};

var ANA_ANSWERS = {
  consent_data: true, consent_medical: true, consent_update: true,
  full_name: "Ana Petrović (primer)", birth_date: "1994-05-12", sex: "female", height_cm: 168, weight_kg: 72.4, city: "Novi Sad", occupation: "Računovođa",
  goal_main: "recomp", goals_extra: ["posture", "energy"], body_focus: ["glutes", "legs", "back"],
  goal_specific: "Manje masti na stomaku i jače noge. Da uradim 10 sklekova.", goal_why: "Hoću da se osećam jače i imam više energije posle posla.",
  success_measure: ["tape", "clothes", "strength"], commitment: 8, support_type: ["structure", "accountability"],
  parq_heart: "no", parq_chest: "no", parq_dizzy: "no", parq_chronic: "no", parq_meds: "no", parq_bone: "no", parq_supervised: "no",
  conditions: ["none"], pregnancy: "no", smoking: "no", alcohol: "rarely",
  pain_now: "yes", pain_areas: ["knees"], pain_level: 3, pain_when: ["after"], pain_spreads: "no", posture: ["none"], movements_pain: ["lunges"],
  active_now: "sometimes", years: "6-12m", level: "beginner", activities: ["gym", "classes"], cardio_fitness: "walk30",
  days_per_week: "3", session_length: "60-75", time_of_day: ["evening"], location: "gym",
  work_type: "sitting", shift: "fixed", work_hours: "9–17", sleep_hours: 7, sleep_quality: 3, stress: 6, energy: 5,
  meals_day: "3", breakfast: "sometimes", cooking: "me", cook_time: "batch", kitchen: ["oven", "microwave"], work_meals: "own", diet: "all",
  allergies: ["none"], intolerances: ["lactose"], dislikes: "Brokoli", favorites: "Piletina, krompir, voće", water: "1-2", tracking: "rough",
  supps_now: ["none"], supps_open: "basic",
  m_date: addDays(T0, -14), m_waist: 82, m_hips: 101,
  checkin_freq: "weekly", contact_method: ["viber"]
};

var MARKO_ANSWERS = {
  consent_data: true, consent_medical: true,
  full_name: "Marko Jovanović (primer)", sex: "male", height_cm: 184, weight_kg: 96, goal_main: "fat_loss",
  goal_specific: "−10 kg do leta", parq_heart: "no", parq_chest: "no", parq_dizzy: "no", parq_chronic: "no", parq_meds: "no", parq_bone: "yes", parq_supervised: "no",
  conditions: ["none"], pain_now: "yes", pain_areas: ["lower_back"], pain_level: 4, pain_when: ["sitting"], pain_spreads: "no",
  diagnoses: "Protruzija L5-S1 (nalaz od pre godinu dana)", days_per_week: "4", location: "gym",
  shift: "three", shift_details: "Smene 6–14, 14–22, 22–6, menjaju se svake nedelje.", sleep_hours: 6,
  allergies: ["peanut"], allergy_severity: "severe", diet: "all"
};

function dailyDemo() {
  var out = {}, w = 72.6;
  for (var i = 12; i >= 1; i--) {
    var d = addDays(T0, -i);
    w = Math.round((w - 0.06 + (i % 3 === 0 ? 0.25 : -0.05)) * 10) / 10;
    if (i % 2 === 0 || i < 4) out[d] = { weight: w, sleep: 6.5 + (i % 3) * 0.5, pain: i % 4 === 0 ? 2 : 1, meals: { dorucak: true, rucak: true } };
  }
  return out;
}

function sessionsDemo() {
  var out = {};
  var d1 = addDays(T0, -5), d2 = addDays(T0, -3);
  out[d1 + "_A"] = { day: d1, workout: "A", data: { title: "Full body A", sets: { "1. Goblet čučanj": [{ kg: 16, reps: 12 }, { kg: 16, reps: 11 }, { kg: 16, reps: 10 }] }, entries: { "1. Goblet čučanj": "16×12,11,10" }, note: "" } };
  out[d2 + "_B"] = { day: d2, workout: "B", data: { title: "Full body B", sets: { "2. Lat pulldown": [{ kg: 35, reps: 10 }, { kg: 35, reps: 9 }, { kg: 35, reps: 8 }] }, entries: { "2. Lat pulldown": "35×10,9,8" }, note: "Koleno ok" } };
  return out;
}

export var DEMO_SEED = {
  session: null,
  users: [
    { id: "demo-trainer", email: "trener@demo.rs", password: "demo1234" },
    { id: "demo-client", email: "ana@demo.rs", password: "demo1234" }
  ],
  admins: ["demo-trainer"],
  clients: [
    { id: "c-ana", name: "Ana Petrović (primer)", lang: "sr", invite_code: null, status: "active",
      sections: { today: true, training: true, nutrition: true, calendar: true, progress: true, rules: true, supplements: true },
      created_at: addDays(T0, -20) + "T10:00:00Z", updated_at: addDays(T0, -14) + "T10:00:00Z" },
    { id: "c-marko", name: "Marko Jovanović (primer)", lang: "sr", invite_code: null, status: "review", sections: {},
      created_at: addDays(T0, -4) + "T10:00:00Z", updated_at: addDays(T0, -1) + "T10:00:00Z" },
    { id: "c-james", name: "James Miller (example)", lang: "en", invite_code: "JAMES234", status: "invited", sections: {},
      created_at: addDays(T0, -1) + "T10:00:00Z", updated_at: addDays(T0, -1) + "T10:00:00Z" }
  ],
  members: [{ user_id: "demo-client", client_id: "c-ana", email: "ana@demo.rs", created_at: addDays(T0, -19) + "T10:00:00Z" }],
  intakes: {
    "c-ana": { client_id: "c-ana", answers: ANA_ANSWERS, progress: {}, submitted_at: addDays(T0, -18) + "T10:00:00Z", updated_at: addDays(T0, -18) + "T10:00:00Z", seen_by_trainer_at: addDays(T0, -17) + "T10:00:00Z" },
    "c-marko": { client_id: "c-marko", answers: MARKO_ANSWERS, progress: {}, submitted_at: addDays(T0, -1) + "T18:00:00Z", updated_at: addDays(T0, -1) + "T18:00:00Z", seen_by_trainer_at: null }
  },
  plans: { "c-ana": { client_id: "c-ana", data: SAMPLE_PLAN, published: true, updated_at: addDays(T0, -14) + "T10:00:00Z" } },
  daily: { "c-ana": dailyDemo() },
  sessions: { "c-ana": sessionsDemo() },
  private: { "c-ana": "Primer privatne beleške: voli kad je trening kratak i jasan." }
};
