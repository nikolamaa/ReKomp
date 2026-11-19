// Upitnik za klijente: pitanja na srpskom, engleskom i ruskom.
// Svaka sekcija može da se preskoči osim saglasnosti. Odgovori se čuvaju po id-u polja.

function L(sr, en, ru) { return { sr: sr, en: en, ru: ru }; }
function O(v, sr, en, ru) { return { v: v, sr: sr, en: en, ru: ru }; }
var YES = O("yes", "Da", "Yes", "Да");
var NO = O("no", "Ne", "No", "Нет");

export var SECTIONS = [
  {
    id: "consent", required: true, feeds: [],
    title: L("Saglasnost", "Consent", "Согласие"),
    intro: L(
      "Pre nego što počneš: tvoji odgovori služe samo za pravljenje i praćenje tvog plana. Vidiš ih ti i tvoj trener.",
      "Before you start: your answers are used only to create and track your plan. Only you and your trainer can see them.",
      "Перед началом: твои ответы используются только для составления и сопровождения твоего плана. Их видите только ты и твой тренер."
    ),
    fields: [
      { id: "consent_data", type: "check", required: true, label: L(
        "Saglasan/na sam da trener koristi moje odgovore, uključujući podatke o zdravlju, isključivo za pravljenje i praćenje mog plana.",
        "I agree that my trainer may use my answers, including health information, only to create and track my plan.",
        "Я согласен(на), что тренер использует мои ответы, включая данные о здоровье, только для составления и сопровождения моего плана.") },
      { id: "consent_medical", type: "check", required: true, label: L(
        "Razumem da plan nije medicinski savet i da ću se zbog zdravstvenih tegoba obratiti lekaru.",
        "I understand that the plan is not medical advice and that I will see a doctor about health problems.",
        "Я понимаю, что план не является медицинской рекомендацией, и по вопросам здоровья обращусь к врачу.") },
      { id: "consent_update", type: "check", label: L(
        "Javiću treneru kad se nešto promeni (zdravlje, povrede, raspored).",
        "I will tell my trainer when something changes (health, injuries, schedule).",
        "Я сообщу тренеру, если что-то изменится (здоровье, травмы, расписание).") }
    ]
  },
  {
    id: "basics", feeds: ["progress"],
    title: L("Osnovni podaci", "Basic information", "Основные данные"),
    fields: [
      { id: "full_name", type: "text", required: true, label: L("Ime i prezime", "Full name", "Имя и фамилия") },
      { id: "birth_date", type: "date", label: L("Datum rođenja", "Date of birth", "Дата рождения") },
      { id: "sex", type: "single", label: L("Pol", "Sex", "Пол"), options: [
        O("male", "Muški", "Male", "Мужской"), O("female", "Ženski", "Female", "Женский"), O("na", "Ne želim da navedem", "Prefer not to say", "Не хочу указывать")] },
      { id: "height_cm", type: "number", unit: "cm", min: 120, max: 230, label: L("Visina", "Height", "Рост") },
      { id: "weight_kg", type: "number", unit: "kg", min: 30, max: 300, step: 0.1, label: L("Trenutna težina", "Current weight", "Текущий вес") },
      { id: "city", type: "text", label: L("Grad", "City", "Город") },
      { id: "occupation", type: "text", label: L("Zanimanje", "Occupation", "Профессия") }
    ]
  },
  {
    id: "goals", feeds: ["progress", "training"],
    title: L("Ciljevi", "Goals", "Цели"),
    intro: L("Što konkretnije, to bolje.", "The more specific, the better.", "Чем конкретнее, тем лучше."),
    fields: [
      { id: "goal_main", type: "single", required: true, label: L("Glavni cilj", "Main goal", "Главная цель"), options: [
        O("fat_loss", "Gubitak masti", "Fat loss", "Снижение жира"),
        O("muscle", "Više mišićne mase", "More muscle", "Набор мышечной массы"),
        O("recomp", "Manje masti i više mišića (rekompozicija)", "Less fat and more muscle (recomposition)", "Меньше жира и больше мышц (рекомпозиция)"),
        O("strength", "Snaga", "Strength", "Сила"),
        O("endurance", "Kondicija i izdržljivost", "Fitness and endurance", "Выносливость"),
        O("health", "Zdravlje i bolje osećanje", "Health and feeling better", "Здоровье и самочувствие"),
        O("comeback", "Povratak posle povrede ili pauze", "Coming back after injury or a break", "Возвращение после травмы или перерыва"),
        O("event", "Priprema za sport ili događaj", "Preparing for a sport or event", "Подготовка к спорту или событию"),
        O("other", "Ostalo", "Other", "Другое")] },
      { id: "goal_other", type: "text", showIf: { f: "goal_main", eq: "other" }, label: L("Koji cilj?", "Which goal?", "Какая цель?") },
      { id: "goals_extra", type: "multi", label: L("Šta još želiš da postigneš?", "What else do you want to achieve?", "Чего ещё хочешь добиться?"), options: [
        O("posture", "Bolje držanje", "Better posture", "Лучшая осанка"),
        O("less_pain", "Manje bolova", "Less pain", "Меньше боли"),
        O("energy", "Više energije", "More energy", "Больше энергии"),
        O("sleep", "Bolji san", "Better sleep", "Лучший сон"),
        O("mobility", "Bolja pokretljivost", "Better mobility", "Подвижность"),
        O("sport", "Bolji rezultati u sportu", "Better sports performance", "Результаты в спорте"),
        O("routine", "Disciplina i rutina", "Discipline and routine", "Дисциплина и режим"),
        O("habits", "Zdravije navike u ishrani", "Healthier eating habits", "Здоровые пищевые привычки")] },
      { id: "body_focus", type: "multi", label: L("Na koje delove tela želiš da se fokusiraš?", "Which body areas do you want to focus on?", "На какие части тела хочешь сделать упор?"), options: [
        O("shoulders", "Ramena", "Shoulders", "Плечи"), O("chest", "Grudi", "Chest", "Грудь"), O("back", "Leđa", "Back", "Спина"),
        O("arms", "Ruke", "Arms", "Руки"), O("waist", "Stomak i struk", "Belly and waist", "Живот и талия"), O("glutes", "Gluteus", "Glutes", "Ягодицы"),
        O("legs", "Noge", "Legs", "Ноги"), O("calves", "Listovi", "Calves", "Икры"), O("overall", "Ceo izgled", "Overall look", "Общий вид")] },
      { id: "goal_specific", type: "textarea", label: L("Opiši cilj konkretno", "Describe your goal specifically", "Опиши цель конкретно"),
        help: L("Na primer: −8 kg do leta, 100 kg na benču, 5 km trčanja bez stajanja.", "For example: −8 kg by summer, 100 kg bench press, run 5 km without stopping.", "Например: −8 кг к лету, жим лёжа 100 кг, пробежать 5 км без остановки.") },
      { id: "goal_deadline", type: "date", label: L("Rok, ako postoji", "Deadline, if any", "Срок, если есть") },
      { id: "goal_event", type: "text", label: L("Događaj ili razlog roka (venčanje, takmičenje, more…)", "Event or reason for the deadline (wedding, competition, holiday…)", "Событие или причина срока (свадьба, соревнования, отпуск…)") },
      { id: "goal_why", type: "textarea", label: L("Zašto ti je ovo važno baš sada?", "Why does this matter to you right now?", "Почему это важно тебе именно сейчас?") },
      { id: "success_measure", type: "multi", label: L("Po čemu ćeš znati da napreduješ?", "How will you know you are making progress?", "По чему поймёшь, что есть прогресс?"), options: [
        O("scale", "Vaga", "Scale", "Весы"), O("tape", "Obim struka i drugih delova", "Waist and other measurements", "Обхват талии и других частей"),
        O("photos", "Slike", "Photos", "Фото"), O("strength", "Snaga na vežbama", "Strength in exercises", "Сила в упражнениях"),
        O("clothes", "Kako mi stoji odeća", "How clothes fit", "Как сидит одежда"), O("energy", "Energija i raspoloženje", "Energy and mood", "Энергия и настроение"),
        O("labs", "Nalazi kod lekara", "Medical test results", "Анализы"), O("sport", "Sportski rezultati", "Sports results", "Спортивные результаты")] },
      { id: "past_attempts", type: "textarea", label: L("Šta si do sada probao/la? Šta je radilo, a šta nije?", "What have you tried so far? What worked and what didn't?", "Что ты уже пробовал(а)? Что сработало, а что нет?") },
      { id: "commitment", type: "scale", min: 1, max: 10, label: L("Koliko si spreman/na da se držiš plana?", "How ready are you to stick to a plan?", "Насколько ты готов(а) придерживаться плана?"),
        ends: L("1 = jedva · 10 = potpuno", "1 = barely · 10 = fully", "1 = едва · 10 = полностью") },
      { id: "support_type", type: "multi", label: L("Kakva podrška ti najviše prija?", "What kind of support suits you best?", "Какая поддержка тебе нужна больше всего?"), options: [
        O("structure", "Jasan plan i struktura", "A clear plan and structure", "Чёткий план и структура"),
        O("motivation", "Motivacija i podrška", "Motivation and encouragement", "Мотивация и поддержка"),
        O("education", "Učenje i objašnjenja", "Learning and explanations", "Обучение и объяснения"),
        O("accountability", "Redovne provere i odgovornost", "Regular check-ins and accountability", "Регулярные проверки и ответственность"),
        O("flexibility", "Fleksibilnost", "Flexibility", "Гибкость")] }
    ]
  },
  {
    id: "health", feeds: ["rules"],
    title: L("Zdravlje", "Health", "Здоровье"),
    intro: L(
      "Ovo su standardna pitanja pre početka treninga. Ako na neko od prvih sedam odgovoriš „da“, pre početka treba da se konsultuješ sa lekarom.",
      "These are standard questions before starting training. If you answer “yes” to any of the first seven, talk to a doctor before you start.",
      "Это стандартные вопросы перед началом тренировок. Если ответишь «да» хотя бы на один из первых семи, перед началом нужно проконсультироваться с врачом."),
    fields: [
      { id: "parq_heart", type: "yesno", flag: "yes", label: L("Da li ti je lekar ikada rekao da imaš srčani problem ili visok krvni pritisak?", "Has a doctor ever said you have a heart condition or high blood pressure?", "Говорил ли тебе врач, что у тебя проблемы с сердцем или высокое давление?") },
      { id: "parq_chest", type: "yesno", flag: "yes", label: L("Da li osećaš bol u grudima u mirovanju, tokom svakodnevnih aktivnosti ili tokom vežbanja?", "Do you feel chest pain at rest, during daily activities or during exercise?", "Бывает ли у тебя боль в груди в покое, при повседневной активности или при нагрузке?") },
      { id: "parq_dizzy", type: "yesno", flag: "yes", label: L("Da li gubiš ravnotežu zbog vrtoglavice ili si izgubio/la svest u poslednjih 12 meseci?", "Do you lose balance because of dizziness, or have you lost consciousness in the last 12 months?", "Теряешь ли ты равновесие из-за головокружения или терял(а) сознание за последние 12 месяцев?") },
      { id: "parq_chronic", type: "yesno", flag: "yes", label: L("Da li imaš dijagnostikovano hronično oboljenje (osim srčanog ili pritiska)?", "Have you been diagnosed with another chronic medical condition (other than heart disease or high blood pressure)?", "Есть ли у тебя другое хроническое заболевание (кроме сердца или давления)?") },
      { id: "parq_meds", type: "yesno", flag: "yes", label: L("Da li uzimaš lekove koje ti je lekar prepisao za neko hronično stanje?", "Do you take medication prescribed by a doctor for a chronic condition?", "Принимаешь ли ты лекарства, назначенные врачом при хроническом состоянии?") },
      { id: "parq_bone", type: "yesno", flag: "yes", label: L("Da li imaš problem sa kostima, zglobovima ili mišićima, ligamentima i tetivama koji bi mogao da se pogorša od vežbanja?", "Do you have a bone, joint or soft-tissue (muscle, ligament, tendon) problem that could get worse with exercise?", "Есть ли проблема с костями, суставами или мягкими тканями (мышцы, связки, сухожилия), которая может усилиться от нагрузок?") },
      { id: "parq_supervised", type: "yesno", flag: "yes", label: L("Da li ti je lekar rekao da smeš da vežbaš samo pod medicinskim nadzorom?", "Has a doctor said you should only exercise under medical supervision?", "Говорил ли врач, что тебе можно заниматься только под медицинским наблюдением?") },
      { id: "conditions", type: "multi", exclusive: "none", flagValues: ["heart", "eating"], label: L("Označi ako nešto od ovoga imaš", "Tick anything that applies to you", "Отметь, если что-то из этого есть"), options: [
        O("bp", "Visok krvni pritisak", "High blood pressure", "Высокое давление"),
        O("diabetes1", "Dijabetes tip 1", "Type 1 diabetes", "Диабет 1 типа"),
        O("diabetes2", "Dijabetes tip 2 ili insulinska rezistencija", "Type 2 diabetes or insulin resistance", "Диабет 2 типа или инсулинорезистентность"),
        O("asthma", "Astma", "Asthma", "Астма"),
        O("thyroid", "Bolest štitne žlezde", "Thyroid disease", "Заболевание щитовидной железы"),
        O("cholesterol", "Povišen holesterol", "High cholesterol", "Повышенный холестерин"),
        O("heart", "Srčana bolest", "Heart disease", "Болезнь сердца"),
        O("epilepsy", "Epilepsija", "Epilepsy", "Эпилепсия"),
        O("osteoporosis", "Osteoporoza", "Osteoporosis", "Остеопороз"),
        O("autoimmune", "Autoimuno oboljenje", "Autoimmune disease", "Аутоиммунное заболевание"),
        O("pcos", "PCOS", "PCOS", "СПКЯ"),
        O("anemia", "Anemija", "Anemia", "Анемия"),
        O("migraine", "Migrena", "Migraine", "Мигрень"),
        O("digestive", "Problemi sa varenjem (IBS, refluks)", "Digestive problems (IBS, reflux)", "Проблемы с пищеварением (СРК, рефлюкс)"),
        O("mental", "Depresija ili anksioznost", "Depression or anxiety", "Депрессия или тревожность"),
        O("eating", "Poremećaj ishrane, sada ili ranije", "Eating disorder, now or in the past", "Расстройство пищевого поведения, сейчас или раньше"),
        O("none", "Ništa od navedenog", "None of these", "Ничего из этого")] },
      { id: "conditions_details", type: "textarea", label: L("Detalji o stanjima koja si označio/la", "Details about the conditions you ticked", "Подробности об отмеченных состояниях") },
      { id: "medications", type: "textarea", label: L("Lekovi koje redovno uzimaš (naziv i doza, ako znaš)", "Medication you take regularly (name and dose, if you know)", "Лекарства, которые принимаешь регулярно (название и доза, если знаешь)") },
      { id: "pregnancy", type: "single", flagValues: ["pregnant", "postpartum"], showIf: { f: "sex", eq: "female" }, label: L("Trudnoća i dojenje", "Pregnancy and breastfeeding", "Беременность и кормление"), options: [
        O("no", "Ništa od toga", "None of these", "Ничего из этого"), O("pregnant", "Trudna sam", "I am pregnant", "Я беременна"),
        O("postpartum", "Do godinu dana posle porođaja", "Up to a year after giving birth", "До года после родов"),
        O("breastfeeding", "Dojim", "I am breastfeeding", "Кормлю грудью"), O("planning", "Planiram trudnoću", "Planning a pregnancy", "Планирую беременность")] },
      { id: "cycle_effect", type: "single", showIf: { f: "sex", eq: "female" },
        label: L("Da li i kako menstruacija utiče na tvoje treninge? (nije obavezno da odgovoriš)", "Does your period affect your training, and how? (you don't have to answer)", "Влияют ли месячные на твои тренировки и как? (отвечать не обязательно)"),
        help: L("Pomaže da plan bude realan tih dana. U aplikaciji uvek imaš dugme „Lakši dan“, bez objašnjavanja zašto.", "It helps keep the plan realistic on those days. The app always has a “Lighter day” button, no explanation needed.", "Помогает сделать план реалистичным в эти дни. В приложении всегда есть кнопка «Лёгкий день», без объяснений."),
        options: [
          O("none", "Ne utiče", "It doesn't", "Не влияют"),
          O("little", "Malo, treniram normalno", "A little, I train as usual", "Немного, тренируюсь как обычно"),
          O("lighter", "Tih dana treniram lakše", "I train lighter on those days", "В эти дни тренируюсь легче"),
          O("skip", "Ponekad preskočim trening", "I sometimes skip training", "Иногда пропускаю тренировку"),
          O("private", "Ne želim da odgovorim", "I'd rather not say", "Не хочу отвечать")] },
      { id: "cycle_note", type: "textarea", showIf: { f: "cycle_effect", in: ["little", "lighter", "skip"] },
        label: L("Ako želiš, napiši više: koji dani su najteži i šta ti tada prija (nije obavezno)", "If you like, tell me more: which days are hardest and what helps then (optional)", "Если хочешь, расскажи подробнее: какие дни самые тяжёлые и что тогда помогает (не обязательно)") },
      { id: "surgery_recent", type: "textarea", label: L("Operacije ili bolničko lečenje u poslednje 2 godine", "Surgery or hospital treatment in the last 2 years", "Операции или лечение в больнице за последние 2 года") },
      { id: "doctor_clearance", type: "single", label: L("Dozvola lekara za trening", "Doctor's approval for training", "Разрешение врача на тренировки"), options: [
        O("yes", "Imam dozvolu lekara", "I have a doctor's approval", "Есть разрешение врача"),
        O("caution", "Lekar je rekao da treba oprez", "My doctor said to be careful", "Врач сказал быть осторожнее"),
        O("not_asked", "Nisam pitao/la", "I haven't asked", "Не спрашивал(а)"),
        O("not_needed", "Mislim da mi ne treba", "I don't think I need it", "Думаю, не нужно")] },
      { id: "blood_pressure", type: "text", label: L("Krvni pritisak, ako znaš (npr. 120/80)", "Blood pressure, if you know (e.g. 120/80)", "Давление, если знаешь (например, 120/80)") },
      { id: "resting_hr", type: "number", unit: "bpm", min: 30, max: 140, label: L("Puls u mirovanju, ako znaš", "Resting heart rate, if you know", "Пульс в покое, если знаешь") },
      { id: "smoking", type: "single", label: L("Pušenje", "Smoking", "Курение"), options: [
        O("no", "Ne pušim", "I don't smoke", "Не курю"), O("former", "Bivši pušač", "Former smoker", "Бросил(а)"),
        O("sometimes", "Ponekad", "Sometimes", "Иногда"), O("daily", "Svakodnevno", "Daily", "Каждый день")] },
      { id: "alcohol", type: "single", label: L("Alkohol", "Alcohol", "Алкоголь"), options: [
        O("no", "Ne pijem", "I don't drink", "Не пью"), O("rarely", "Retko", "Rarely", "Редко"),
        O("weekly", "1–2 puta nedeljno", "1–2 times a week", "1–2 раза в неделю"), O("often", "3 ili više puta nedeljno", "3 or more times a week", "3 и более раз в неделю")] },
      { id: "labs", type: "textarea", label: L("Poslednji nalazi krvi, ako ih imaš (vitamin D, gvožđe, šećer, holesterol…)", "Latest blood test results, if you have them (vitamin D, iron, glucose, cholesterol…)", "Последние анализы крови, если есть (витамин D, железо, сахар, холестерин…)") }
    ]
  },
  {
    id: "injuries", feeds: ["rules", "training"],
    title: L("Povrede i ograničenja", "Injuries and limitations", "Травмы и ограничения"),
    fields: [
      { id: "pain_now", type: "yesno", label: L("Da li te trenutno nešto boli?", "Is anything painful right now?", "Что-нибудь болит сейчас?") },
      { id: "pain_areas", type: "multi", showIf: { f: "pain_now", eq: "yes" }, label: L("Gde?", "Where?", "Где?"), options: [
        O("neck", "Vrat", "Neck", "Шея"), O("shoulders", "Ramena", "Shoulders", "Плечи"), O("upper_back", "Lopatice i gornja leđa", "Shoulder blades and upper back", "Лопатки и верх спины"),
        O("lower_back", "Donja leđa", "Lower back", "Поясница"), O("elbows", "Laktovi", "Elbows", "Локти"), O("wrists", "Ručni zglobovi", "Wrists", "Запястья"),
        O("hips", "Kukovi", "Hips", "Тазобедренные суставы"), O("knees", "Kolena", "Knees", "Колени"), O("ankles", "Skočni zglobovi i stopala", "Ankles and feet", "Голеностоп и стопы"),
        O("chest", "Grudni koš", "Chest", "Грудная клетка"), O("other", "Ostalo", "Other", "Другое")] },
      { id: "pain_level", type: "scale", min: 0, max: 10, showIf: { f: "pain_now", eq: "yes" }, label: L("Koliko jako, od 0 do 10?", "How strong, from 0 to 10?", "Насколько сильно, от 0 до 10?") },
      { id: "pain_when", type: "multi", showIf: { f: "pain_now", eq: "yes" }, label: L("Kada se javlja?", "When does it appear?", "Когда появляется?"), options: [
        O("during", "Tokom treninga", "During training", "Во время тренировки"), O("after", "Posle treninga", "After training", "После тренировки"),
        O("sitting", "Posle dugog sedenja", "After long sitting", "После долгого сидения"), O("morning", "Ujutru", "In the morning", "Утром"),
        O("night", "Noću", "At night", "Ночью"), O("always", "Stalno", "All the time", "Постоянно")] },
      { id: "pain_spreads", type: "yesno", flag: "yes", showIf: { f: "pain_now", eq: "yes" }, label: L("Da li se bol širi u ruku ili nogu, ili osećaš trnjenje ili slabost?", "Does the pain spread into an arm or leg, or do you feel numbness or weakness?", "Отдаёт ли боль в руку или ногу, есть ли онемение или слабость?") },
      { id: "injuries_past", type: "textarea", label: L("Ranije povrede, lomovi i operacije (šta, kada, da li je potpuno zaraslo)", "Past injuries, fractures and surgery (what, when, fully healed or not)", "Прошлые травмы, переломы и операции (что, когда, зажило ли полностью)") },
      { id: "diagnoses", type: "textarea", label: L("Dijagnoze i nalazi (npr. protruzija diska, skolioza, nalaz magnetne rezonance ili rendgena)", "Diagnoses and findings (e.g. disc protrusion, scoliosis, MRI or X-ray report)", "Диагнозы и заключения (например, протрузия диска, сколиоз, МРТ или рентген)") },
      { id: "posture", type: "multi", exclusive: "none", label: L("Poznati problemi sa držanjem", "Known posture issues", "Известные проблемы с осанкой"), options: [
        O("scoliosis", "Skolioza", "Scoliosis", "Сколиоз"), O("kyphosis", "Kifoza (pogrbljenost)", "Kyphosis (rounded back)", "Кифоз (сутулость)"),
        O("lordosis", "Pojačana lordoza", "Increased lordosis", "Усиленный лордоз"), O("flat_feet", "Ravna stopala", "Flat feet", "Плоскостопие"),
        O("winging", "Odstupanje lopatica", "Winged shoulder blades", "Крыловидные лопатки"), O("leg_length", "Različita dužina nogu", "Leg length difference", "Разная длина ног"),
        O("none", "Ništa ili ne znam", "None or don't know", "Нет или не знаю")] },
      { id: "movements_pain", type: "multi", exclusive: "none", label: L("Pokreti koji izazivaju bol ili nelagodnost", "Movements that cause pain or discomfort", "Движения, вызывающие боль или дискомфорт"), options: [
        O("squat", "Čučanj", "Squat", "Присед"), O("hinge", "Mrtvo dizanje i savijanje napred", "Deadlift and bending forward", "Становая тяга и наклоны"),
        O("overhead", "Potisak iznad glave", "Overhead pressing", "Жим над головой"), O("bench", "Potisak na klupi", "Bench pressing", "Жим лёжа"),
        O("hang", "Zgibovi i visovi", "Pull-ups and hanging", "Подтягивания и висы"), O("running", "Trčanje", "Running", "Бег"),
        O("jumping", "Skokovi", "Jumping", "Прыжки"), O("lunges", "Iskoraci", "Lunges", "Выпады"), O("kneeling", "Klečanje", "Kneeling", "Стояние на коленях"),
        O("none", "Ništa", "None", "Ничего")] },
      { id: "avoid", type: "textarea", label: L("Vežbe koje ne smeš ili ne želiš da radiš, i zašto", "Exercises you must not or don't want to do, and why", "Упражнения, которые нельзя или не хочешь делать, и почему") },
      { id: "therapy_now", type: "single", label: L("Da li se trenutno lečiš ili ideš na terapiju?", "Are you currently in treatment or therapy?", "Проходишь ли сейчас лечение или терапию?"), options: [
        O("no", "Ne", "No", "Нет"), O("physio", "Kod fizioterapeuta", "With a physiotherapist", "У физиотерапевта"),
        O("doctor", "Kod lekara", "With a doctor", "У врача"), O("both", "Oba", "Both", "И то, и другое")] },
      { id: "therapy_details", type: "textarea", showIf: { f: "therapy_now", notIn: ["no", ""] }, label: L("Šta ti je preporučeno?", "What were you told to do?", "Что тебе рекомендовали?") }
    ]
  },
  {
    id: "experience", feeds: ["training"],
    title: L("Trenažno iskustvo", "Training experience", "Тренировочный опыт"),
    fields: [
      { id: "active_now", type: "single", label: L("Da li sada treniraš?", "Are you training now?", "Тренируешься сейчас?"), options: [
        O("no", "Ne", "No", "Нет"), O("sometimes", "Povremeno", "Occasionally", "Иногда"),
        O("1-2", "Redovno, 1–2 puta nedeljno", "Regularly, 1–2 times a week", "Регулярно, 1–2 раза в неделю"),
        O("3+", "Redovno, 3 ili više puta nedeljno", "Regularly, 3 or more times a week", "Регулярно, 3 и более раз в неделю")] },
      { id: "years", type: "single", label: L("Koliko dugo treniraš sa tegovima?", "How long have you trained with weights?", "Сколько занимаешься с отягощениями?"), options: [
        O("never", "Nikad", "Never", "Никогда"), O("lt6m", "Manje od 6 meseci", "Less than 6 months", "Меньше 6 месяцев"),
        O("6-12m", "6–12 meseci", "6–12 months", "6–12 месяцев"), O("1-3y", "1–3 godine", "1–3 years", "1–3 года"),
        O("3-5y", "3–5 godina", "3–5 years", "3–5 лет"), O("5y+", "Više od 5 godina", "More than 5 years", "Больше 5 лет")] },
      { id: "break", type: "text", label: L("Da li si imao/la pauzu? Koliko je trajala i kad si se vratio/la?", "Did you have a break? How long, and when did you come back?", "Был ли перерыв? Какой длительности и когда вернулся(лась)?") },
      { id: "level", type: "single", label: L("Kako bi ocenio/la svoj nivo?", "How would you rate your level?", "Как оценишь свой уровень?"), options: [
        O("beginner", "Početnik", "Beginner", "Новичок"), O("intermediate", "Srednji", "Intermediate", "Средний"), O("advanced", "Napredni", "Advanced", "Продвинутый")] },
      { id: "activities", type: "multi", label: L("Čime se baviš ili si se bavio/la?", "What activities do or did you do?", "Чем занимаешься или занимался(лась)?"), options: [
        O("gym", "Teretana", "Gym", "Тренажёрный зал"), O("running", "Trčanje", "Running", "Бег"), O("cycling", "Biciklizam", "Cycling", "Велосипед"),
        O("swimming", "Plivanje", "Swimming", "Плавание"), O("team", "Timski sport", "Team sport", "Командный спорт"), O("martial", "Borilačke veštine", "Martial arts", "Единоборства"),
        O("yoga", "Joga ili pilates", "Yoga or pilates", "Йога или пилатес"), O("classes", "Grupni treninzi", "Group classes", "Групповые занятия"),
        O("home", "Kućni trening", "Home workouts", "Домашние тренировки"), O("hiking", "Planinarenje", "Hiking", "Походы")] },
      { id: "current_program", type: "textarea", label: L("Opiši trenutni trening: dani, vežbe, serije i ponavljanja", "Describe your current training: days, exercises, sets and reps", "Опиши текущие тренировки: дни, упражнения, подходы и повторы") },
      { id: "strength", type: "textarea", label: L("Najbolji rezultati koje znaš (npr. benč 80 kg × 5, čučanj 100 kg × 5, 8 zgibova)", "Best results you know (e.g. bench 80 kg × 5, squat 100 kg × 5, 8 pull-ups)", "Лучшие результаты (например, жим 80 кг × 5, присед 100 кг × 5, 8 подтягиваний)") },
      { id: "cardio_fitness", type: "single", label: L("Kondicija", "Cardio fitness", "Выносливость"), options: [
        O("low", "Teško mi je 10 minuta brzog hoda", "10 minutes of brisk walking is hard", "Трудно 10 минут быстрой ходьбы"),
        O("walk30", "Mogu 30 minuta brzog hoda", "I can walk briskly for 30 minutes", "Могу 30 минут быстрой ходьбы"),
        O("run20", "Mogu da trčim 20–30 minuta", "I can run for 20–30 minutes", "Могу бегать 20–30 минут"),
        O("run5k", "Trčim 5 km i više", "I run 5 km or more", "Бегаю 5 км и больше")] },
      { id: "liked_ex", type: "textarea", label: L("Vežbe koje voliš", "Exercises you like", "Любимые упражнения") },
      { id: "disliked_ex", type: "textarea", label: L("Vežbe koje ne voliš", "Exercises you dislike", "Нелюбимые упражнения") },
      { id: "coached_before", type: "yesno", label: L("Da li si ranije radio/la sa trenerom?", "Have you worked with a trainer before?", "Занимался(лась) раньше с тренером?") }
    ]
  },
  {
    id: "availability", feeds: ["training", "calendar"],
    title: L("Vreme i oprema", "Time and equipment", "Время и оборудование"),
    fields: [
      { id: "days_per_week", type: "single", label: L("Koliko dana nedeljno možeš da treniraš?", "How many days a week can you train?", "Сколько дней в неделю можешь тренироваться?"), options: [
        O("2", "2", "2", "2"), O("3", "3", "3", "3"), O("4", "4", "4", "4"), O("5", "5", "5", "5"), O("6", "6", "6", "6")] },
      { id: "session_length", type: "single", label: L("Koliko može da traje jedan trening?", "How long can one session last?", "Сколько может длиться одна тренировка?"), options: [
        O("30-45", "30–45 min", "30–45 min", "30–45 мин"), O("45-60", "45–60 min", "45–60 min", "45–60 мин"),
        O("60-75", "60–75 min", "60–75 min", "60–75 мин"), O("75-90", "75–90 min", "75–90 min", "75–90 мин"), O("90+", "Više od 90 min", "More than 90 min", "Больше 90 мин")] },
      { id: "time_of_day", type: "multi", label: L("Kada ti najviše odgovara?", "When suits you best?", "Когда тебе удобнее всего?"), options: [
        O("early", "Rano ujutru", "Early morning", "Рано утром"), O("morning", "Pre podne", "Late morning", "До обеда"),
        O("afternoon", "Posle podne", "Afternoon", "После обеда"), O("evening", "Uveče", "Evening", "Вечером"), O("shift", "Zavisi od smene", "Depends on my shift", "Зависит от смены")] },
      { id: "busy_days", type: "multi", label: L("Dani kada sigurno ne možeš", "Days when you definitely can't", "Дни, когда точно не можешь"), options: [
        O("mon", "Ponedeljak", "Monday", "Понедельник"), O("tue", "Utorak", "Tuesday", "Вторник"), O("wed", "Sreda", "Wednesday", "Среда"),
        O("thu", "Četvrtak", "Thursday", "Четверг"), O("fri", "Petak", "Friday", "Пятница"), O("sat", "Subota", "Saturday", "Суббота"), O("sun", "Nedelja", "Sunday", "Воскресенье")] },
      { id: "location", type: "single", label: L("Gde treniraš?", "Where do you train?", "Где тренируешься?"), options: [
        O("gym", "Komercijalna teretana", "Commercial gym", "Тренажёрный зал"), O("home_gym", "Kućna teretana", "Home gym", "Домашний зал"),
        O("home", "Kod kuće, bez opreme", "At home, no equipment", "Дома, без оборудования"), O("outdoor", "Napolju", "Outdoors", "На улице"), O("mix", "Kombinacija", "A mix", "Комбинация")] },
      { id: "gym_name", type: "text", showIf: { f: "location", in: ["gym", "mix"] }, label: L("Koja teretana?", "Which gym?", "Какой зал?") },
      { id: "equipment", type: "multi", showIf: { f: "location", in: ["home_gym", "home", "outdoor", "mix"] }, label: L("Oprema koju imaš", "Equipment you have", "Какое оборудование есть"), options: [
        O("dumbbells", "Bučice", "Dumbbells", "Гантели"), O("barbell", "Šipka i tegovi", "Barbell and plates", "Штанга и блины"), O("bench", "Klupa", "Bench", "Скамья"),
        O("rack", "Stalak za čučanj", "Squat rack", "Стойка для приседаний"), O("pullup", "Šipka za zgibove", "Pull-up bar", "Турник"), O("bands", "Elastične trake", "Resistance bands", "Резинки"),
        O("kettlebell", "Girja", "Kettlebell", "Гиря"), O("cardio", "Traka ili sobni bicikl", "Treadmill or exercise bike", "Беговая дорожка или велотренажёр"), O("nothing", "Ništa", "Nothing", "Ничего")] },
      { id: "sessions_with_me", type: "single", label: L("Kako želiš da radimo?", "How would you like to work together?", "Как хочешь заниматься?"), options: [
        O("all", "Svaki trening sa trenerom", "Every session with the trainer", "Каждая тренировка с тренером"),
        O("some", "Neki treninzi sa trenerom, ostali sam/a", "Some sessions with the trainer, the rest alone", "Часть тренировок с тренером, остальные сам(а)"),
        O("online", "Samo plan i praćenje online", "Plan and online check-ins only", "Только план и онлайн-сопровождение")] },
      { id: "cardio_pref", type: "multi", label: L("Kardio koji ti odgovara", "Cardio you're happy to do", "Какое кардио подходит"), options: [
        O("walk", "Hod na traci", "Treadmill walking", "Ходьба на дорожке"), O("bike", "Bicikl", "Bike", "Велосипед"), O("elliptical", "Eliptični trenažer", "Elliptical", "Эллипс"),
        O("rower", "Veslanje", "Rowing machine", "Гребной тренажёр"), O("run", "Trčanje napolju", "Running outside", "Бег на улице"), O("swim", "Plivanje", "Swimming", "Плавание"),
        O("none", "Ne volim kardio", "I don't like cardio", "Не люблю кардио")] },
      { id: "steps", type: "single", label: L("Koliko koraka dnevno prosečno napraviš?", "How many steps do you take on an average day?", "Сколько шагов в среднем проходишь в день?"), options: [
        O("lt4", "Ispod 4.000", "Under 4,000", "Меньше 4000"), O("4-7", "4.000–7.000", "4,000–7,000", "4000–7000"),
        O("7-10", "7.000–10.000", "7,000–10,000", "7000–10 000"), O("gt10", "Preko 10.000", "Over 10,000", "Больше 10 000"), O("unknown", "Ne znam", "I don't know", "Не знаю")] }
    ]
  },
  {
    id: "lifestyle", feeds: ["today", "calendar"],
    title: L("Posao, san i dnevni ritam", "Work, sleep and daily rhythm", "Работа, сон и режим дня"),
    fields: [
      { id: "work_type", type: "single", label: L("Kakav posao radiš?", "What kind of work do you do?", "Какая у тебя работа?"), options: [
        O("sitting", "Uglavnom sedim", "Mostly sitting", "В основном сидячая"), O("standing", "Uglavnom stojim ili hodam", "Mostly standing or walking", "В основном стоя или в движении"),
        O("physical", "Fizički zahtevan posao", "Physically demanding work", "Физически тяжёлая работа"), O("student", "Student/kinja ili ne radim", "Student or not working", "Учусь или не работаю"),
        O("retired", "Penzioner/ka", "Retired", "На пенсии")] },
      { id: "shift", type: "single", label: L("Da li radiš u smenama?", "Do you work shifts?", "Работаешь посменно?"), options: [
        O("fixed", "Ne, imam fiksno radno vreme", "No, fixed working hours", "Нет, фиксированный график"), O("two", "Dve smene", "Two shifts", "Две смены"),
        O("three", "Tri smene", "Three shifts", "Три смены"), O("night", "Samo noćna", "Nights only", "Только ночные"), O("irregular", "Nepravilno ili po turnusima", "Irregular or rotating", "Нерегулярно или вахтой")] },
      { id: "work_hours", type: "text", showIf: { f: "shift", eq: "fixed" }, label: L("Radno vreme (npr. 9–17)", "Working hours (e.g. 9–5)", "Часы работы (например, 9–17)") },
      { id: "shift_details", type: "textarea", showIf: { f: "shift", notIn: ["fixed", ""] }, label: L("Opiši smene: radno vreme svake smene, redosled i koliko traje svaka (npr. nedelju dana)", "Describe your shifts: hours of each, the order and how long each lasts (e.g. one week)", "Опиши смены: часы каждой, порядок и сколько длится каждая (например, неделю)") },
      { id: "shift_now", type: "text", showIf: { f: "shift", notIn: ["fixed", ""] }, label: L("Koja ti je smena sada i kada se sledeći put menja?", "Which shift are you on now and when does it change next?", "Какая у тебя смена сейчас и когда она сменится?") },
      { id: "days_off", type: "single", label: L("Kakvi su ti slobodni dani?", "What are your days off like?", "Какие у тебя выходные?"), options: [
        O("weekend", "Uvek vikend", "Always the weekend", "Всегда суббота и воскресенье"),
        O("fixed", "Uvek isti dani, ali ne vikend", "Always the same days, but not the weekend", "Всегда одни и те же дни, но не выходные"),
        O("rotating", "Menjaju se iz nedelje u nedelju", "They change from week to week", "Меняются каждую неделю"),
        O("none", "Nemam stalne slobodne dane", "I have no regular days off", "Нет постоянных выходных")] },
      { id: "days_off_which", type: "text", showIf: { f: "days_off", eq: "fixed" }, label: L("Koji su to dani?", "Which days?", "Какие это дни?") },
      { id: "schedule_known", type: "single", showIf: { f: "days_off", in: ["rotating", "none"] }, label: L("Kada saznaš raspored za sledeću nedelju?", "When do you find out next week's schedule?", "Когда узнаёшь график на следующую неделю?"), options: [
        O("month", "Znam ga unapred za ceo mesec ili duže", "I know it a month or more ahead", "Знаю на месяц вперёд или больше"),
        O("week", "Do kraja tekuće nedelje", "By the end of the current week", "До конца текущей недели"),
        O("late", "Tek u ponedeljak ili kasnije", "Only on Monday or later", "Только в понедельник или позже")] },
      { id: "commute", type: "text", label: L("Koliko ti treba do posla i do teretane?", "How long does it take you to get to work and to the gym?", "Сколько времени дорога до работы и до зала?") },
      { id: "sleep_hours", type: "number", unit: "h", min: 2, max: 14, step: 0.5, label: L("Koliko sati spavaš prosečno?", "How many hours do you sleep on average?", "Сколько часов в среднем спишь?") },
      { id: "sleep_quality", type: "scale", min: 1, max: 5, label: L("Kvalitet sna", "Sleep quality", "Качество сна"), ends: L("1 = loš · 5 = odličan", "1 = poor · 5 = excellent", "1 = плохое · 5 = отличное") },
      { id: "bed_wake", type: "text", label: L("Kad obično ležeš i ustaješ? (po smenama, ako radiš u smenama)", "When do you usually go to bed and wake up? (per shift, if you work shifts)", "Во сколько обычно ложишься и встаёшь? (по сменам, если работаешь посменно)") },
      { id: "sleep_issues", type: "multi", exclusive: "none", label: L("Problemi sa snom", "Sleep problems", "Проблемы со сном"), options: [
        O("falling", "Teško zaspim", "Hard to fall asleep", "Трудно заснуть"), O("waking", "Budim se tokom noći", "I wake up during the night", "Просыпаюсь ночью"),
        O("early", "Budim se prerano", "I wake up too early", "Просыпаюсь слишком рано"), O("snoring", "Hrčem ili imam prekide disanja", "Snoring or breathing pauses", "Храп или остановки дыхания"),
        O("heat", "Vrućina u sobi", "A hot bedroom", "Жарко в спальне"), O("noise", "Buka ili svetlo", "Noise or light", "Шум или свет"), O("none", "Nemam problema", "No problems", "Проблем нет")] },
      { id: "stress", type: "scale", min: 1, max: 10, label: L("Nivo stresa", "Stress level", "Уровень стресса"), ends: L("1 = nizak · 10 = vrlo visok", "1 = low · 10 = very high", "1 = низкий · 10 = очень высокий") },
      { id: "energy", type: "scale", min: 1, max: 10, label: L("Energija tokom dana", "Energy during the day", "Энергия в течение дня"), ends: L("1 = nikakva · 10 = odlična", "1 = none · 10 = excellent", "1 = никакой · 10 = отличная") },
      { id: "obligations", type: "textarea", label: L("Obaveze koje utiču na raspored (deca, studije, putovanja)", "Commitments that affect your schedule (children, studies, travel)", "Обязанности, влияющие на график (дети, учёба, поездки)") }
    ]
  },
  {
    id: "nutrition", feeds: ["nutrition"],
    title: L("Ishrana", "Nutrition", "Питание"),
    fields: [
      { id: "meals_day", type: "single", label: L("Koliko obroka dnevno jedeš?", "How many meals do you eat a day?", "Сколько раз в день ешь?"), options: [
        O("1-2", "1–2", "1–2", "1–2"), O("3", "3", "3", "3"), O("4", "4", "4", "4"), O("5+", "5 ili više", "5 or more", "5 и больше"), O("irregular", "Nepravilno", "Irregular", "Нерегулярно")] },
      { id: "breakfast", type: "single", label: L("Doručak", "Breakfast", "Завтрак"), options: [
        O("always", "Redovno doručkujem", "I eat breakfast regularly", "Завтракаю регулярно"), O("sometimes", "Ponekad", "Sometimes", "Иногда"), O("never", "Ne doručkujem", "I skip breakfast", "Не завтракаю")] },
      { id: "typical_day", type: "textarea", label: L("Opiši šta jedeš u jednom običnom danu", "Describe what you eat on a typical day", "Опиши, что ешь в обычный день"),
        help: L("Doručak, ručak, večera, užine i piće, okvirno.", "Breakfast, lunch, dinner, snacks and drinks, roughly.", "Завтрак, обед, ужин, перекусы и напитки, примерно.") },
      { id: "cooking", type: "single", label: L("Ko kuva?", "Who cooks?", "Кто готовит?"), options: [
        O("me", "Kuvam sam/a", "I cook myself", "Готовлю сам(а)"), O("someone", "Kuva neko drugi", "Someone else cooks", "Готовит кто-то другой"),
        O("mixed", "Mešovito", "A mix", "По-разному"), O("out", "Uglavnom jedem napolju ili naručujem", "I mostly eat out or order", "В основном ем вне дома или заказываю")] },
      { id: "cook_time", type: "single", label: L("Koliko vremena imaš za kuvanje?", "How much time do you have for cooking?", "Сколько времени есть на готовку?"), options: [
        O("15", "Do 15 minuta dnevno", "Up to 15 minutes a day", "До 15 минут в день"), O("30", "15–30 minuta dnevno", "15–30 minutes a day", "15–30 минут в день"),
        O("60", "30–60 minuta dnevno", "30–60 minutes a day", "30–60 минут в день"), O("batch", "Kuvam unapred 1–2 puta nedeljno", "I batch-cook 1–2 times a week", "Готовлю заранее 1–2 раза в неделю")] },
      { id: "kitchen", type: "multi", label: L("Šta imaš u kuhinji?", "What do you have in your kitchen?", "Что есть на кухне?"), options: [
        O("oven", "Šporet i rerna", "Stove and oven", "Плита и духовка"), O("airfryer", "Air fryer", "Air fryer", "Аэрогриль"), O("microwave", "Mikrotalasna", "Microwave", "Микроволновка"),
        O("multicooker", "Multicooker ili ekspres lonac", "Multicooker or pressure cooker", "Мультиварка или скороварка"), O("blender", "Blender", "Blender", "Блендер"), O("basic", "Samo osnovno", "Just the basics", "Только самое простое")] },
      { id: "work_meals", type: "single", label: L("Kako jedeš na poslu ili fakultetu?", "How do you eat at work or university?", "Как питаешься на работе или учёбе?"), options: [
        O("none", "Ne jedem tamo", "I don't eat there", "Не ем там"), O("menu", "Dobijam obrok (fiksni meni)", "A meal is provided (set menu)", "Дают обед (фиксированное меню)"),
        O("own", "Nosim hranu od kuće", "I bring food from home", "Ношу еду из дома"), O("buy", "Kupujem napolju", "I buy food out", "Покупаю на месте")] },
      { id: "work_menu", type: "textarea", showIf: { f: "work_meals", eq: "menu" }, label: L("Šta se nudi? (meni možeš i da pošalješ treneru)", "What is on offer? (you can also send the menu to your trainer)", "Что предлагают? (меню можно отправить тренеру)") },
      { id: "eating_out", type: "single", label: L("Koliko često jedeš napolju ili naručuješ?", "How often do you eat out or order food?", "Как часто ешь вне дома или заказываешь?"), options: [
        O("rarely", "Retko", "Rarely", "Редко"), O("1-2", "1–2 puta nedeljno", "1–2 times a week", "1–2 раза в неделю"),
        O("3-5", "3–5 puta nedeljno", "3–5 times a week", "3–5 раз в неделю"), O("daily", "Skoro svaki dan", "Almost every day", "Почти каждый день")] },
      { id: "diet", type: "single", label: L("Način ishrane", "Eating pattern", "Тип питания"), options: [
        O("all", "Jedem sve", "I eat everything", "Ем всё"), O("vegetarian", "Vegetarijanac/ka", "Vegetarian", "Вегетарианец"), O("vegan", "Vegan", "Vegan", "Веган"),
        O("pescatarian", "Pescetarijanac/ka (riba da, meso ne)", "Pescatarian (fish yes, meat no)", "Пескетарианец (рыба да, мясо нет)"), O("no_pork", "Bez svinjetine", "No pork", "Без свинины"),
        O("fasting", "Poštujem verske postove", "I observe religious fasts", "Соблюдаю религиозные посты"), O("halal", "Halal", "Halal", "Халяль"), O("kosher", "Košer", "Kosher", "Кошер"), O("other", "Ostalo", "Other", "Другое")] },
      { id: "diet_details", type: "text", showIf: { f: "diet", in: ["fasting", "other"] }, label: L("Koje postove ili pravila?", "Which fasts or rules?", "Какие посты или правила?") },
      { id: "allergies", type: "multi", exclusive: "none", label: L("Alergije na hranu", "Food allergies", "Пищевая аллергия"), options: [
        O("none", "Nemam", "None", "Нет"), O("peanut", "Kikiriki", "Peanuts", "Арахис"), O("nuts", "Orašasti plodovi", "Tree nuts", "Орехи"),
        O("milk", "Mleko", "Milk", "Молоко"), O("egg", "Jaja", "Eggs", "Яйца"), O("gluten", "Pšenica ili gluten", "Wheat or gluten", "Пшеница или глютен"),
        O("soy", "Soja", "Soy", "Соя"), O("fish", "Riba", "Fish", "Рыба"), O("shellfish", "Školjke i rakovi", "Shellfish", "Моллюски и ракообразные"),
        O("sesame", "Susam", "Sesame", "Кунжут"), O("celery", "Celer", "Celery", "Сельдерей"), O("mustard", "Senf", "Mustard", "Горчица"), O("other", "Ostalo", "Other", "Другое")] },
      { id: "allergy_severity", type: "single", flagValues: ["severe", "anaphylaxis"], showIf: { f: "allergies", any: true }, label: L("Kakva je reakcija?", "What kind of reaction?", "Какая реакция?"), options: [
        O("mild", "Blaga", "Mild", "Лёгкая"), O("severe", "Jaka", "Severe", "Сильная"), O("anaphylaxis", "Anafilaksa (nosim adrenalin)", "Anaphylaxis (I carry adrenaline)", "Анафилаксия (ношу адреналин)")] },
      { id: "allergy_details", type: "textarea", showIf: { f: "allergies", any: true }, label: L("Detalji o alergijama", "Allergy details", "Подробности об аллергии") },
      { id: "intolerances", type: "multi", exclusive: "none", label: L("Netolerancije i osetljivosti", "Intolerances and sensitivities", "Непереносимости"), options: [
        O("none", "Nemam", "None", "Нет"), O("lactose", "Laktoza", "Lactose", "Лактоза"), O("celiac", "Celijakija", "Coeliac disease", "Целиакия"),
        O("gluten_sens", "Osetljivost na gluten", "Gluten sensitivity", "Чувствительность к глютену"), O("fructose", "Fruktoza", "Fructose", "Фруктоза"),
        O("histamine", "Histamin", "Histamine", "Гистамин"), O("fodmap", "IBS ili osetljivost na FODMAP", "IBS or FODMAP sensitivity", "СРК или чувствительность к FODMAP"), O("other", "Ostalo", "Other", "Другое")] },
      { id: "dislikes", type: "textarea", label: L("Namirnice koje ne jedeš ili ne voliš", "Foods you don't eat or dislike", "Продукты, которые не ешь или не любишь") },
      { id: "favorites", type: "textarea", label: L("Omiljena jela i namirnice", "Favourite dishes and foods", "Любимые блюда и продукты") },
      { id: "digestion", type: "multi", exclusive: "none", label: L("Varenje", "Digestion", "Пищеварение"), options: [
        O("bloating", "Nadimanje", "Bloating", "Вздутие"), O("reflux", "Gorušica ili refluks", "Heartburn or reflux", "Изжога или рефлюкс"),
        O("constipation", "Zatvor", "Constipation", "Запоры"), O("diarrhea", "Dijareja", "Diarrhoea", "Диарея"), O("none", "Bez problema", "No problems", "Без проблем")] },
      { id: "hunger", type: "text", label: L("Kada si najgladniji/a? Imaš li napade gladi ili želju za slatkim?", "When are you hungriest? Do you get hunger attacks or sweet cravings?", "Когда больше всего голоден(на)? Бывают ли приступы голода или тяга к сладкому?") },
      { id: "emotional_eating", type: "single", label: L("Da li jedeš zbog stresa, dosade ili raspoloženja?", "Do you eat because of stress, boredom or mood?", "Ешь ли из-за стресса, скуки или настроения?"), options: [
        O("no", "Ne", "No", "Нет"), O("sometimes", "Ponekad", "Sometimes", "Иногда"), O("often", "Često", "Often", "Часто")] },
      { id: "water", type: "single", label: L("Koliko vode piješ dnevno?", "How much water do you drink a day?", "Сколько воды пьёшь в день?"), options: [
        O("lt1", "Manje od 1 l", "Less than 1 l", "Меньше 1 л"), O("1-2", "1–2 l", "1–2 l", "1–2 л"), O("2-3", "2–3 l", "2–3 l", "2–3 л"), O("gt3", "Više od 3 l", "More than 3 l", "Больше 3 л")] },
      { id: "caffeine", type: "text", label: L("Koliko kafa ili energetskih pića dnevno, i do koliko sati?", "How many coffees or energy drinks a day, and until what time?", "Сколько кофе или энергетиков в день и до какого часа?") },
      { id: "snacks", type: "text", label: L("Grickalice, slatkiši i sokovi: koliko često?", "Snacks, sweets and soft drinks: how often?", "Снеки, сладости и газировка: как часто?") },
      { id: "budget", type: "text", label: L("Nedeljni budžet za hranu (iznos i valuta)", "Weekly food budget (amount and currency)", "Бюджет на еду в неделю (сумма и валюта)") },
      { id: "shopping_where", type: "text", label: L("Gde najčešće kupuješ? (marketi, pijaca)", "Where do you usually shop? (supermarkets, market)", "Где обычно покупаешь продукты? (магазины, рынок)") },
      { id: "tracking", type: "single", label: L("Kako ti je lakše da pratiš ishranu?", "How would you rather track your eating?", "Как тебе удобнее отслеживать питание?"), options: [
        O("weigh", "Mogu da merim hranu i brojim", "I can weigh food and count", "Могу взвешивать еду и считать"),
        O("rough", "Okvirno, bez vage", "Roughly, without a scale", "Примерно, без весов"),
        O("template", "Ne želim da brojim, hoću šablon obroka", "I don't want to count, I want a meal template", "Не хочу считать, нужен шаблон питания")] }
    ]
  },
  {
    id: "supplements", feeds: ["supplements"],
    title: L("Suplementi", "Supplements", "Добавки"),
    fields: [
      { id: "supps_now", type: "multi", exclusive: "none", label: L("Šta trenutno uzimaš?", "What do you take at the moment?", "Что принимаешь сейчас?"), options: [
        O("none", "Ništa", "Nothing", "Ничего"), O("protein", "Protein (whey ili biljni)", "Protein (whey or plant)", "Протеин (сывороточный или растительный)"),
        O("creatine", "Kreatin", "Creatine", "Креатин"), O("vitd", "Vitamin D", "Vitamin D", "Витамин D"), O("omega3", "Omega-3", "Omega-3", "Омега-3"),
        O("magnesium", "Magnezijum", "Magnesium", "Магний"), O("multi", "Multivitamin", "Multivitamin", "Мультивитамины"), O("iron", "Gvožđe", "Iron", "Железо"),
        O("electrolytes", "Elektroliti", "Electrolytes", "Электролиты"), O("preworkout", "Pre-workout", "Pre-workout", "Предтренировочный комплекс"),
        O("burner", "Sagorevači masti", "Fat burners", "Жиросжигатели"), O("other", "Ostalo", "Other", "Другое")] },
      { id: "supps_details", type: "textarea", showIf: { f: "supps_now", any: true }, label: L("Nazivi i doze", "Names and doses", "Названия и дозы") },
      { id: "supps_open", type: "single", label: L("Da li si otvoren/a za suplemente?", "Are you open to supplements?", "Готов(а) принимать добавки?"), options: [
        O("yes", "Da, ako imaju smisla", "Yes, if they make sense", "Да, если есть смысл"), O("basic", "Samo osnovno", "Only the basics", "Только базовые"), O("no", "Ne želim suplemente", "I don't want supplements", "Не хочу добавки")] }
    ]
  },
  {
    id: "measurements", feeds: ["progress"],
    title: L("Merenja", "Measurements", "Замеры"),
    intro: L(
      "Meri ujutru, posle toaleta, pre jela. Metar drži opušteno, da ne steže. Polja koja ne znaš ostavi prazna.",
      "Measure in the morning, after the toilet and before eating. Keep the tape relaxed, not tight. Leave anything you don't know empty.",
      "Измеряй утром, после туалета и до еды. Лента должна прилегать свободно, не сдавливать. Если что-то не знаешь, оставь пустым."),
    fields: [
      { id: "m_date", type: "date", label: L("Datum merenja", "Measurement date", "Дата замеров") },
      { id: "m_neck", type: "number", unit: "cm", step: 0.5, label: L("Vrat", "Neck", "Шея") },
      { id: "m_chest", type: "number", unit: "cm", step: 0.5, label: L("Grudi, u visini bradavica", "Chest, at nipple height", "Грудь, на уровне сосков") },
      { id: "m_waist", type: "number", unit: "cm", step: 0.5, label: L("Struk, u visini pupka", "Waist, at the navel", "Талия, на уровне пупка") },
      { id: "m_hips", type: "number", unit: "cm", step: 0.5, label: L("Kukovi, najširi deo", "Hips, widest point", "Бёдра, самая широкая часть") },
      { id: "m_arm", type: "number", unit: "cm", step: 0.5, label: L("Nadlaktica, opušteno, najširi deo", "Upper arm, relaxed, widest point", "Плечо, расслабленно, самая широкая часть") },
      { id: "m_thigh", type: "number", unit: "cm", step: 0.5, label: L("Butina, najširi deo", "Thigh, widest point", "Бедро, самая широкая часть") },
      { id: "m_calf", type: "number", unit: "cm", step: 0.5, label: L("List, najširi deo", "Calf, widest point", "Икра, самая широкая часть") },
      { id: "bodyfat", type: "text", label: L("Procenat masti, ako znaš, i čime je meren (vaga, InBody, kaliper)", "Body fat %, if you know, and how it was measured (scale, InBody, calipers)", "Процент жира, если знаешь, и чем измерен (весы, InBody, калипер)") },
      { id: "photos", type: "single", label: L("Slike napretka", "Progress photos", "Фото прогресса"), options: [
        O("yes", "Mogu da šaljem slike treneru", "I can send photos to my trainer", "Могу отправлять фото тренеру"), O("no", "Radije ne", "I'd rather not", "Лучше нет")] }
    ]
  },
  {
    id: "contact", feeds: [],
    title: L("Praćenje i komunikacija", "Check-ins and contact", "Связь и отчёты"),
    fields: [
      { id: "checkin_freq", type: "single", label: L("Koliko često želiš da se javljaš treneru?", "How often do you want to check in with your trainer?", "Как часто хочешь выходить на связь с тренером?"), options: [
        O("daily", "Svakodnevno, kratko", "Daily, briefly", "Каждый день, коротко"), O("weekly", "Jednom nedeljno", "Once a week", "Раз в неделю"), O("biweekly", "Na dve nedelje", "Every two weeks", "Раз в две недели")] },
      { id: "contact_method", type: "multi", label: L("Kako ti je najlakše da se čujemo?", "What is the easiest way to reach you?", "Как с тобой проще связаться?"), options: [
        O("viber", "Viber", "Viber", "Viber"), O("whatsapp", "WhatsApp", "WhatsApp", "WhatsApp"), O("telegram", "Telegram", "Telegram", "Telegram"),
        O("instagram", "Instagram", "Instagram", "Instagram"), O("email", "E-mail", "Email", "Эл. почта"), O("phone", "Telefonski poziv", "Phone call", "Звонок")] },
      { id: "contact_handle", type: "text", label: L("Broj telefona ili korisničko ime", "Phone number or username", "Номер телефона или имя пользователя") },
      { id: "start_date", type: "date", label: L("Kad želiš da počneš?", "When do you want to start?", "Когда хочешь начать?") },
      { id: "anything_else", type: "textarea", label: L("Još nešto što trener treba da zna?", "Anything else your trainer should know?", "Что ещё нужно знать тренеру?") }
    ]
  }
];

export var FIELD_INDEX = {};
SECTIONS.forEach(function (s) { s.fields.forEach(function (f) { f.section = s.id; FIELD_INDEX[f.id] = f; }); });

export function tx(obj, lang) { return obj ? (obj[lang] || obj.sr || "") : ""; }

function isEmpty(v) {
  if (v == null || v === "" || v === false) return true;
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

export function fieldVisible(field, answers) {
  var c = field.showIf;
  if (!c) return true;
  var v = answers[c.f];
  if (c.eq != null) return v === c.eq;
  if (c.in) return c.in.indexOf(v) >= 0;
  if (c.notIn) return v != null && v !== "" && c.notIn.indexOf(v) < 0;
  if (c.any) return Array.isArray(v) ? v.some(function (x) { return x !== "none"; }) : !isEmpty(v) && v !== "none";
  return true;
}

export function sectionAnswered(section, answers) {
  return section.fields.some(function (f) { return fieldVisible(f, answers) && !isEmpty(answers[f.id]); });
}

export function missingRequired(section, answers) {
  return section.fields.filter(function (f) { return f.required && fieldVisible(f, answers) && isEmpty(answers[f.id]); });
}

export function optionLabel(field, v, lang) {
  var o = (field.options || []).filter(function (x) { return x.v === v; })[0];
  if (o) return o[lang] || o.sr;
  if (v === "yes") return YES[lang]; if (v === "no") return NO[lang];
  return String(v);
}

export function displayValue(field, v, lang) {
  if (isEmpty(v)) return "";
  if (field.type === "check") return v ? YES[lang] : "";
  if (field.type === "yesno") return optionLabel({ options: [YES, NO] }, v, lang);
  if (field.type === "single") return optionLabel(field, v, lang);
  if (field.type === "multi") return v.map(function (x) { return optionLabel(field, x, lang); }).join(", ");
  if (field.type === "number") return String(v).replace(".", lang === "en" ? "." : ",") + (field.unit ? " " + field.unit : "");
  if (field.type === "scale") return v + " / " + field.max;
  return String(v);
}

export function isFlagged(field, v) {
  if (isEmpty(v)) return false;
  if (field.flag && v === field.flag) return true;
  if (field.flagValues) {
    if (Array.isArray(v)) return v.some(function (x) { return field.flagValues.indexOf(x) >= 0; });
    return field.flagValues.indexOf(v) >= 0;
  }
  return false;
}

export function parqPositive(answers) {
  return SECTIONS.filter(function (s) { return s.id === "health"; })[0].fields
    .filter(function (f) { return /^parq_/.test(f.id) && answers[f.id] === "yes"; });
}

// Koje sekcije aplikacije podrazumevano uključiti, na osnovu popunjenih delova upitnika.
export function defaultSections(answers, progress) {
  var on = {};
  SECTIONS.forEach(function (s) {
    var filled = progress && progress[s.id] === "done" ? sectionAnswered(s, answers) : sectionAnswered(s, answers);
    if (filled) s.feeds.forEach(function (k) { on[k] = true; });
  });
  // Klizni slobodni dani: klijent sam bira nedelju (slobodni dani, smena, treninzi).
  if (answers && (answers.days_off === "rotating" || answers.days_off === "none")) on.weekpick = true;
  return on;
}

// Tekst ankete za kopiranje (za trenera ili za Claude).
export function intakeAsText(answers, lang) {
  var out = [];
  SECTIONS.forEach(function (s) {
    if (s.id === "consent") return;
    var lines = [];
    s.fields.forEach(function (f) {
      if (!fieldVisible(f, answers)) return;
      var v = displayValue(f, answers[f.id], lang);
      if (!v) return;
      lines.push("- " + tx(f.label, lang) + ": " + v + (isFlagged(f, answers[f.id]) ? " [!]" : ""));
    });
    if (lines.length) out.push("## " + tx(s.title, lang) + "\n" + lines.join("\n"));
  });
  return out.join("\n\n");
}
