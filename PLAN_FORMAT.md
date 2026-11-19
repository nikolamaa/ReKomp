# Format plana

Plan svakog klijenta je jedan JSON objekat. Nalepiš ga na kartici **Plan** u trenerskom panelu, klikneš **Proveri**, pa **Objavi**.
Najlakše ga praviš tako što na kartici **Upitnik** klikneš **Kopiraj za Claude**: kopira se uputstvo, ovaj format i svi odgovori klijenta.

Svi delovi su neobavezni. Šta klijent vidi zavisi od dva uslova: sekcija je uključena na kartici **Sekcije** i plan ima sadržaj za nju.

| Sekcija | Koji delovi plana je pune |
|---|---|
| Danas | `rhythms`, `weekTemplate`, `calendar`, `checkin`, `notes` |
| Trening | `program.workouts` |
| Ishrana | `rhythms[].meals`, `workMenu`, `recipes`, `shopping`, `nutritionRules` |
| Kalendar | `weekTemplate`, `calendar` |
| Napredak | `baseline`, `targets`, `checkin` (i dnevni unosi klijenta) |
| Plan (dugme gore) | `rules`, `supplements` |

## Polja

```text
FORMAT PLANA (JSON objekat; svi delovi su neobavezni, izostavi ono za šta nema podataka):
{
  "version": 1,
  "start": "YYYY-MM-DD",                       // početak praćenja
  "baseline": { "weight": 0 },                  // početna težina u kg
  "targets": [ { "label": "", "value": "", "note": "" } ],
  "checkin": { "weight": true, "sleep": true, "pain": "Bol u kolenu" | false, "waist": true },
  "notes": [ { "date": "YYYY-MM-DD", "text": "" } ],   // poruke klijentu
  "program": { "workouts": [ { "code": "A", "title": "", "color": "blue|red|green|amber|violet", "focus": "", "duration": "~60 min",
      "exercises": [ { "name": "1. …", "sets": "3 × 8–12", "rir": "1–2", "rest": "2 min", "start": "početna težina", "tip": "", "kind": "time" (samo za vreme) } ],
      "notes": [ "" ] } ] },
  "defaultRhythm": "ključ iz rhythms",
  "rhythms": { "kljuc": { "label": "Posao 9–17", "hours": "9–17", "sleep": "7–8 h", "nap": "",
      "wakeAt": "07:00", "shiftStartAt": "09:00", "shiftEndAt": "17:00", "trainingAt": "18:00", "coffeeAt": "15:00", "napAt": "", "cookAt": "19:30", "sleepAt": "23:00",
      "dayEnd": 0,   // za noćnu smenu: sat do kog važi prethodni dan, npr. 9
      "meals": [ { "key": "dorucak", "at": "07:30", "name": "Doručak", "what": "", "protein": 25, "box": true (kutija iz kuvanja), "work": true (obrok sa posla),
                   "post": true (obrok posle treninga), "restName": "" (naziv kad nema treninga),
                   "freeName": "", "freeWhat": "", "freeProtein": 0, "freeAt": "" (zamena za slobodan dan) } ],
      "endTip": "", "endTipTrain": "",   // savet za kraj smene; endTipTrain samo za dane sa treningom
      "free": { "wakeAt": "08:30", "meals": [ … ] },   // poseban raspored za slobodne dane
      "tips": [ "" ] } },
  "weekTemplate": { "mon": { "work": true, "rhythm": "kljuc", "shift": "naziv dana", "workout": "A", "time": "18:00", "cook": "r1", "note": "" }, … "sun": {} },
  "calendar": { "YYYY-MM-DD": { isto kao dan u weekTemplate } },   // izuzeci i smene po datumima
  "workMenu": { "kljuc": { "days": { "mon": { "pick": "", "protein": 35, "alts": [ "" ], "tip": "" } } } },
  "recipes": { "r1": { "name": "", "short": "", "perBox": "4 kutije · ~450 kcal · ~38 g", "time": "", "ingredients": [ "" ], "steps": [ "" ], "storage": [ "" ] } },
  "shopping": { "currency": "RSD", "note": "", "items": [ { "name": "", "qty": "", "min": 0, "max": 0 } ] },
  "nutritionRules": [ "" ],
  "rules": [ { "title": "", "items": [ "" ] } ],
  "supplements": [ { "name": "", "dose": "", "note": "" } ]
}
Vremena su HH:MM; posle ponoći piši 24:30, 26:00 itd. da ostanu u istom danu.
Kodovi treninga u weekTemplate i calendar moraju postojati u program.workouts; cook mora biti ključ iz recipes.
```

Napomene:
- `weekTemplate` važi za svaku nedelju; `calendar` po datumu ima prednost (smene, slobodni dani, izuzeci).
- Za noćnu smenu: `dayEnd` (npr. 9) znači da do 09:00 aplikacija i dalje prikazuje prethodni dan, a vremena posle ponoći pišeš kao 24:30, 26:00…
- `box: true` u obroku znači kutiju iz poslednjeg kuvanja (`cook` u rasporedu), `work: true` obrok sa posla (`workMenu`).
- Obrok posle treninga označi sa `"post": true` (ili ga nazovi „Posle treninga“). Na dan bez treninga, kad je trening pomeren ili zamenjen šetnjom, aplikacija ga sama preimenuje u `restName` (npr. „Ručak“) ili u Ručak/Večera/Obrok po vremenu. Kad trening počinje kasnije, obrok se pomera na 90 min posle početka treninga.
- Tekst za kraj smene koji pominje trening ide u `endTipTrain` (prikazuje se samo kad tog dana ima treninga); `endTip` piši bez treninga.
- Boje treninga: `blue`, `red`, `green`, `amber`, `violet`.

## Primer (izmišljena klijentkinja iz demo režima)

```json
{
  "version": 1,
  "start": "2026-11-03",
  "baseline": {
    "weight": 72.4
  },
  "targets": [
    {
      "label": "Kalorije",
      "value": "~1.900 kcal",
      "note": "koriguje se po nedeljnom proseku"
    },
    {
      "label": "Protein",
      "value": "~120 g",
      "note": "dnevno"
    },
    {
      "label": "Treninzi",
      "value": "3 nedeljno",
      "note": "pon, sre, pet"
    },
    {
      "label": "Koraci",
      "value": "~8.000",
      "note": "dnevni prosek"
    }
  ],
  "checkin": {
    "weight": true,
    "sleep": true,
    "pain": "Bol u kolenu",
    "waist": true
  },
  "notes": [
    {
      "date": "2026-11-16",
      "text": "Odlična prva nedelja! Od sada posle svakog treninga 10 minuta hoda na traci."
    }
  ],
  "program": {
    "workouts": [
      {
        "code": "A",
        "title": "Full body A",
        "color": "blue",
        "focus": "Čučanj i potisak",
        "duration": "~60 min",
        "exercises": [
          {
            "name": "1. Goblet čučanj",
            "sets": "3 × 8–12",
            "rir": "2",
            "rest": "2 min",
            "start": "16 kg",
            "tip": "Kolena prate prste, bez bola"
          },
          {
            "name": "2. Potisak bučicama na kosoj klupi",
            "sets": "3 × 8–12",
            "rir": "1–2",
            "rest": "2 min",
            "start": "2 × 10 kg"
          },
          {
            "name": "3. Veslanje na sajli",
            "sets": "3 × 10–12",
            "rir": "1–2",
            "rest": "90 s"
          },
          {
            "name": "4. Hip thrust",
            "sets": "3 × 10–12",
            "rir": "1",
            "rest": "90 s"
          },
          {
            "name": "5. Bočno podizanje",
            "sets": "2 × 12–15",
            "rir": "0–1",
            "rest": "60 s"
          },
          {
            "name": "6. Plank",
            "sets": "2 × 30–40 s",
            "rest": "60 s",
            "kind": "time"
          }
        ],
        "notes": [
          "Zagrevanje: 5 minuta bicikla i 2 lagane serije čučnja."
        ]
      },
      {
        "code": "B",
        "title": "Full body B",
        "color": "red",
        "focus": "Mrtvo dizanje i povlačenje",
        "duration": "~60 min",
        "exercises": [
          {
            "name": "1. Rumunsko mrtvo dizanje bučicama",
            "sets": "3 × 8–10",
            "rir": "2",
            "rest": "2 min",
            "start": "2 × 14 kg",
            "tip": "Leđa ravna, spuštaj dok kukovi idu unazad"
          },
          {
            "name": "2. Lat pulldown",
            "sets": "3 × 8–12",
            "rir": "1–2",
            "rest": "2 min"
          },
          {
            "name": "3. Leg press",
            "sets": "3 × 10–12",
            "rir": "2",
            "rest": "2 min",
            "tip": "Bez bola u kolenu; dubina koliko prija"
          },
          {
            "name": "4. Potisak bučicama iznad glave",
            "sets": "2 × 8–12",
            "rir": "1–2",
            "rest": "90 s"
          },
          {
            "name": "5. Pregib nogu ležeći",
            "sets": "2 × 10–15",
            "rir": "1",
            "rest": "60 s"
          },
          {
            "name": "6. Traka sa nagibom",
            "sets": "10 min",
            "kind": "time"
          }
        ]
      }
    ]
  },
  "defaultRhythm": "posao",
  "rhythms": {
    "posao": {
      "label": "Posao 9–17",
      "hours": "9–17",
      "sleep": "7–8 h",
      "wakeAt": "07:00",
      "shiftStartAt": "09:00",
      "shiftEndAt": "17:00",
      "trainingAt": "18:00",
      "coffeeAt": "15:00",
      "cookAt": "19:30",
      "sleepAt": "23:00",
      "meals": [
        {
          "key": "dorucak",
          "at": "07:30",
          "name": "Doručak",
          "what": "Ovsena kaša sa jogurtom i voćem",
          "protein": 25
        },
        {
          "key": "rucak",
          "at": "12:30",
          "name": "Ručak",
          "what": "1 kutija iz kuvanja",
          "protein": 35,
          "box": true
        },
        {
          "key": "uzina",
          "at": "16:00",
          "name": "Užina",
          "what": "Grčki jogurt i jabuka",
          "protein": 20
        },
        {
          "key": "vecera",
          "at": "19:30",
          "name": "Večera",
          "what": "Omlet od 3 jaja, salata i hleb",
          "protein": 25
        }
      ],
      "free": {
        "wakeAt": "08:30",
        "meals": [
          {
            "key": "dorucak",
            "at": "09:00",
            "name": "Doručak",
            "what": "Omlet od 3 jaja i hleb",
            "protein": 22
          },
          {
            "key": "rucak",
            "at": "13:30",
            "name": "Ručak",
            "what": "1 kutija iz kuvanja",
            "protein": 35,
            "box": true
          },
          {
            "key": "uzina",
            "at": "17:00",
            "name": "Užina",
            "what": "Grčki jogurt i voće",
            "protein": 20
          },
          {
            "key": "vecera",
            "at": "20:00",
            "name": "Večera",
            "what": "Tunjevina, krompir i salata",
            "protein": 30
          }
        ]
      },
      "tips": [
        "Ponesi užinu na posao da ne preskočiš obrok."
      ]
    }
  },
  "weekTemplate": {
    "mon": {
      "work": true,
      "workout": "A",
      "time": "18:00"
    },
    "tue": {
      "work": true
    },
    "wed": {
      "work": true,
      "workout": "B",
      "time": "18:00"
    },
    "thu": {
      "work": true,
      "cook": "r2"
    },
    "fri": {
      "work": true,
      "workout": "A",
      "time": "18:00"
    },
    "sat": {
      "note": "Šetnja 45 minuta"
    },
    "sun": {
      "cook": "r1",
      "note": "Kuvanje za 3 dana"
    }
  },
  "calendar": {},
  "recipes": {
    "r1": {
      "name": "Piletina sa povrćem iz rerne",
      "short": "Piletina i povrće",
      "perBox": "4 kutije · ~450 kcal · ~38 g",
      "time": "Oko 50 min, od toga 15 min aktivno.",
      "ingredients": [
        "600 g pilećeg filea",
        "800 g krompira",
        "2 paprike i 1 tikvica",
        "2 kašike maslinovog ulja",
        "začini po ukusu"
      ],
      "steps": [
        "Iseci sve na kocke i izmešaj sa uljem i začinima.",
        "Peci na 200 °C oko 35 minuta, promešaj na pola.",
        "Podeli u 4 kutije."
      ],
      "storage": [
        "Frižider do 3 dana.",
        "Kutiju za 4. dan odmah zamrzni."
      ]
    },
    "r2": {
      "name": "Ćuretina sa pirinčem",
      "short": "Ćuretina i pirinač",
      "perBox": "3 kutije · ~500 kcal · ~40 g",
      "time": "Oko 30 min.",
      "ingredients": [
        "450 g ćurećeg filea",
        "200 g pirinča",
        "300 g smrznutog povrća",
        "začini"
      ],
      "steps": [
        "Skuvaj pirinač.",
        "Ispeci ćuretinu u tiganju, 6–8 minuta po strani.",
        "Dodaj povrće 5 minuta pred kraj."
      ],
      "storage": [
        "Frižider do 3 dana."
      ]
    }
  },
  "shopping": {
    "currency": "RSD",
    "note": "Okvirna procena.",
    "items": [
      {
        "name": "Pileći file",
        "qty": "600 g",
        "min": 450,
        "max": 550
      },
      {
        "name": "Ćureći file",
        "qty": "450 g",
        "min": 450,
        "max": 600
      },
      {
        "name": "Jaja",
        "qty": "20 kom",
        "min": 400,
        "max": 500
      },
      {
        "name": "Grčki jogurt",
        "qty": "5 čaša",
        "min": 450,
        "max": 600
      },
      {
        "name": "Ovsene pahuljice",
        "qty": "500 g",
        "min": 120,
        "max": 180
      },
      {
        "name": "Povrće i voće",
        "qty": "~4 kg",
        "min": 900,
        "max": 1300
      }
    ]
  },
  "nutritionRules": [
    "Ako preskočiš obrok, sledeći jedi normalno, bez kazne.",
    "Voda 2–2,5 l dnevno."
  ],
  "rules": [
    {
      "title": "Progresija",
      "items": [
        "Ista težina dok sve serije ne dođu do gornje granice ponavljanja.",
        "Onda +1–2 kg na bučicama ili +5 kg na mašinama."
      ]
    },
    {
      "title": "Koleno",
      "items": [
        "Bol do 3/10 je u redu ako ne raste sledećeg dana.",
        "Ako pređe 3/10, smanji dubinu i javi mi."
      ]
    }
  ],
  "supplements": [
    {
      "name": "Kreatin monohidrat",
      "dose": "3–5 g dnevno",
      "note": "Bilo kada u toku dana."
    },
    {
      "name": "Vitamin D",
      "dose": "po nalazu",
      "note": "Prvo nalaz 25(OH)D."
    }
  ]
}
```
