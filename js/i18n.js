// Prevodi interfejsa: srpski (latinica), engleski i ruski.

export var LANGS = [
  { code: "sr", name: "Srpski" },
  { code: "en", name: "English" },
  { code: "ru", name: "Русский" }
];

var T = {
  sr: {
    tagline: "Trening, ishrana i napredak na jednom mestu",
    lang: "Jezik", loading: "Učitavam…", save: "Sačuvaj", saving: "Čuvam…", saved_at: "Sačuvano {time}",
    not_saved: "Nije sačuvano. Pokušaj ponovo.", cancel: "Otkaži", close: "Zatvori", back: "Nazad", next: "Dalje",
    edit: "Izmeni", copy: "Kopiraj", copied: "Kopirano", optional: "neobavezno", required_mark: "obavezno",
    error_generic: "Nešto nije uspelo. Pokušaj ponovo.", offline: "Nema interneta. Izmene čekaju vezu.",
    demo_banner: "Demo režim: podaci se čuvaju samo u ovom pregledaču. Aplikacija još nije povezana sa bazom.",
    demo_as_trainer: "Uđi kao trener", demo_as_client: "Uđi kao klijent", demo_reset: "Vrati demo podatke",
    login: "Prijava", signup: "Registracija", email: "E-mail", password: "Lozinka", password_hint: "Najmanje 8 znakova",
    invite_code: "Pozivni kod", invite_code_hint: "Kod dobijaš od trenera.", login_btn: "Prijavi se", signup_btn: "Napravi nalog",
    forgot: "Zaboravio/la si lozinku?",
    forgot_text: "Javi se treneru. Dobićeš novi pozivni kod, napraviš novi nalog, i svi tvoji podaci ostaju.",
    err_login: "Pogrešan e-mail ili lozinka.", err_exists: "Nalog sa ovim e-mailom već postoji. Prijavi se.",
    err_pw_short: "Lozinka mora imati bar 8 znakova.", err_code: "Kod ne važi ili je već iskorišćen. Proveri ga sa trenerom.",
    err_email: "Upiši ispravan e-mail.", logout: "Odjavi se",
    code_title: "Unesi pozivni kod", code_text: "Ovaj nalog još nije povezan sa trenerom. Upiši kod koji si dobio/la.",
    code_btn: "Poveži nalog",
    intake_title: "Upitnik", intake_intro: "Odgovori pomažu treneru da napravi plan baš za tebe. Odgovori se čuvaju dok ideš kroz upitnik.",
    step_of: "Korak {n} od {total}", skip_section: "Preskoči ovaj deo", skipped: "Preskočeno", filled: "Popunjeno", not_started: "Nije počelo",
    review_title: "Pregled pre slanja", review_text: "Proveri delove. Preskočene možeš da dopuniš i kasnije, iz profila.",
    submit: "Pošalji treneru", submitted_title: "Hvala!", submitted_text: "Trener sada pravi tvoj plan i javiće ti kad bude spreman.",
    edit_answers: "Izmeni odgovore", required_missing: "Popuni obavezna polja.", choose: "Izaberi…",
    answers_updated: "Izmene su sačuvane. Trener će ih videti.", answers_edit_hint: "Izmeni bilo koji deo upitnika. Trener vidi sve izmene.",  save_changes: "Sačuvaj izmene", yes: "Da", no: "Ne",
    tab_today: "Danas", tab_training: "Trening", tab_food: "Ishrana", tab_calendar: "Kalendar", tab_progress: "Napredak",
    plan_btn: "Plan", profile: "Profil",
    next_up: "Sledeće", in_time: "za {x}", now: "sada", hours_short: "h", minutes_short: "min",
    day_done: "Dan je gotov", day_done_text: "Odmor. Sutra nastavljamo.", tomorrow: "Sutra", rest_day: "Odmor",
    no_training: "bez treninga", today_word: "Danas", open_training: "Otvori trening", open: "Otvori", logged: "upisan",
    checkin_title: "Jutarnji unos", weight_kg: "Težina (kg)", sleep_h: "San (h)", pain_default: "Bol", more_fields: "+ Struk, napomena ili drugi datum",
    waist_cm: "Struk, u visini pupka (cm)", note: "Napomena", note_ph: "glad, energija, raspoloženje…", entry_date: "Datum unosa",
    schedule_title: "Raspored dana", protein_of: "{got} / {plan} g proteina", if_missing: "Ako nema: {x}",
    wake_weigh: "Buđenje i vaga", wake_sub: "Posle toaleta, pre jela.", wake_pain: "Upiši i bol posle jučerašnjeg treninga.",
    shift_start: "Početak smene", shift_end: "Kraj smene", stand_up: "Ustani na 1–2 minuta na svakih 30–45 minuta sedenja.",
    last_coffee: "Poslednja kafa", last_coffee_sub: "Posle ovoga bez kofeina.", nap: "Dremka", sleep: "Spavanje",
    sleep_goal: "Cilj: {x}.", cooking: "Kuvanje: {x}", cooking_sub: "Kutije koje nećeš pojesti za 3 dana odmah u zamrzivač.",
    messages: "Poruke od trenera", training_word: "Trening",
    sleep_bad: "San ispod 5 h: skraćena verzija treninga ili samo šetnja.", sleep_warn: "San {x} h: ceo trening, ali lakše (RIR +1) i bez dizanja težine.",
    sleep_ok: "San {x} h: ceo trening, normalna progresija.", pain_bad: "Bol {x}/10: smanji opterećenje na sledećem treningu i javi treneru.",
    install_title: "Instaliraj aplikaciju", install_android: "U Chromeu: meni ⋮ → „Dodaj na početni ekran“ ili „Instaliraj aplikaciju“.",
    install_ios: "U Safariju: dugme Deli (kvadrat sa strelicom) → „Dodaj na početni ekran“.", install_btn: "Instaliraj", hide: "Sakrij",
    sets_hint: "Upiši kilograme i ponavljanja po seriji. Sivi brojevi su prošli put. Čuva se dok kucaš.",
    last_time: "Prošli put {date}: {x}", no_history: "Još nema unosa za ovu vežbu.", copy_weights: "Prepiši kilažu",
    workout_note: "Napomena za trening", workout_note_ph: "kako je išlo, san, energija…", save_workout: "Sačuvaj trening",
    unsaved: "Nesačuvano", logged_before: "Upisano ranije", enter_one_set: "Upiši bar jednu seriju.", start_with: "Kreni: {x}",
    minutes: "Minuta", seconds: "Sekundi", reps_ph: "pon.", kg_ph: "kg", date: "Datum", rir: "RIR",
    this_week: "Ova nedelja", next_week: "Sledeća nedelja", prev_week: "Prošla nedelja", other_week: "Nedelja",
    week_tap: "Dodirni dan da vidiš sve obroke.", recipes: "Recepti", ingredients: "Sastojci", steps: "Priprema", storage: "Čuvanje",
    shopping: "Kupovina za nedelju", shopping_note: "Cene su okvirna procena.", reset_checks: "Poništi štikliranje",
    rules: "Pravila", cook_badge: "Kuvanje", template_day: "Za ovaj dan nema posebnog rasporeda, prikazan je šablon.",
    box_of: "1 kutija: {x}", from_freezer: "iz zamrzivača", prev_week_aria: "Prethodna nedelja", next_week_aria: "Sledeća nedelja",
    cal_text: "Tvoj raspored treninga i obaveza. Kad trener nešto promeni, ovde se odmah vidi.", shift_word: "smena",
    done_badge: "upisano", week_template: "Tvoja nedelja", free_day: "Slobodan dan", work_day: "Radni dan",
    goals: "Ciljevi", weight_title: "Težina", weight_empty: "Upiši težinu bar dva puta i ovde se pojavljuje grafik.",
    baseline_note: "Isprekidana linija: početnih {x} kg. Poslednje: {y} kg.", by_week: "Po nedeljama",
    col_week: "Nedelja", col_avg: "Prosek", col_change: "±", col_sleep: "San", col_trainings: "Tren.", col_pain: "Bol",
    compare_note: "Gledaj nedeljne proseke, ne pojedinačne dane: voda i so pomeraju vagu i do 1 kg.", recent: "Poslednji unosi",
    no_entries: "Još nema unosa. Prvi unos dodaješ na kartici Danas.", chart_label: "Grafik težine",
    plan_title: "Plan i pravila", supplements: "Suplementi",
    profile_title: "Profil", my_answers: "Moji odgovori iz upitnika", install_help: "Kako da instaliram aplikaciju",
    plan_pending: "Plan se priprema", plan_pending_text: "Tvoj trener je dobio upitnik i pravi plan. Kad ga objavi, ovde ćeš videti trening, ishranu i raspored.",
    intake_continue: "Nastavi upitnik", nothing_here: "Ovde još nema sadržaja.",
    // trener
    trainer: "Trener", clients: "Klijenti", new_client: "Novi klijent", client_name: "Ime i prezime", client_lang: "Jezik klijenta",
    create: "Napravi", invite_title: "Pošalji poziv", copy_invite: "Kopiraj poruku", search: "Pretraga",
    st_invited: "Pozvan", st_intake: "Popunjava upitnik", st_review: "Upitnik stigao", st_active: "Aktivan", st_archived: "Arhiviran",
    new_changes: "Nove izmene u upitniku", last_entry: "Poslednji unos: {x}", never: "nema", no_clients: "Još nema klijenata. Dodaj prvog.",
    show_archived: "Prikaži arhivirane",
    t_intake: "Upitnik", t_sections: "Sekcije", t_plan: "Plan", t_logs: "Unosi", t_access: "Pristup",
    mark_seen: "Označi kao pregledano", copy_claude: "Kopiraj za Claude",
    copy_claude_hint: "Kopira odgovore i uputstvo za pravljenje plana. Nalepi to u Claude i dobićeš plan koji uvoziš na kartici Plan.",
    not_filled: "Nije popunjeno", intake_none: "Klijent još nije počeo upitnik.", submitted_on: "Poslato {x}", updated_on: "Izmenjeno {x}",
    parq_warn: "Bar jedan odgovor „da“ u zdravstvenim pitanjima: pre početka treninga klijentu treba dozvola lekara.",
    flag_warn: "Označeni odgovori traže posebnu pažnju.",
    sections_hint: "Klijent vidi uključene sekcije, ali samo kad plan za njih ima sadržaj.",
    sec_today: "Danas (raspored dana)", sec_training: "Trening", sec_nutrition: "Ishrana", sec_calendar: "Kalendar",
    sec_progress: "Napredak", sec_rules: "Plan i pravila", sec_supplements: "Suplementi",
    from_intake_yes: "u upitniku ima podataka", from_intake_no: "u upitniku nema podataka", has_content: "plan ima sadržaj", no_content: "plan nema sadržaj",
    plan_draft: "Nacrt: klijent ga ne vidi", plan_published: "Objavljen: klijent ga vidi", plan_empty: "Plan još nije napravljen.",
    plan_json: "Plan (JSON)", plan_json_hint: "Nalepi plan koji ti je napravio Claude, pa klikni Proveri.",
    validate: "Proveri", save_draft: "Sačuvaj nacrt", publish: "Objavi", unpublish: "Povuci objavu", preview: "Pogledaj kao klijent",
    preview_banner: "Pregled kao klijent. Izmene se ne čuvaju.", exit_preview: "Izađi iz pregleda",
    json_ok: "Plan je ispravan: {x}", json_err: "Greška u planu: {x}", add_message: "Nova poruka klijentu", add: "Dodaj",
    message_added: "Poruka je dodata.", remove: "Ukloni",
    logs_empty: "Klijent još nema unosa.", daily_title: "Dnevni unosi", sessions_title: "Treninzi",
    invite_code_label: "Pozivni kod", new_code: "Napravi novi kod",
    code_used: "Nema aktivnog koda. Napravi novi ako klijent treba da poveže nov nalog (npr. zaboravio je lozinku).",
    linked: "Povezani nalozi", none_linked: "Nijedan nalog još nije povezan.", unlink: "Ukloni pristup",
    rename: "Promeni ime", archive: "Arhiviraj", unarchive: "Vrati iz arhive", delete_client: "Obriši klijenta",
    delete_confirm: "Brisanje je trajno: briše upitnik, plan i sve unose. Upiši ime klijenta da potvrdiš.",
    private_note: "Privatna beleška (klijent je ne vidi)", deleted: "Klijent je obrisan.", status_label: "Status",
    set_status: "Promeni status", app_link: "Link aplikacije", not_admin: "Nemaš pristup trenerskom delu.",
    summary_workouts: "{n} treninga", summary_days: "{n} dana u kalendaru", summary_recipes: "{n} recepata",
    summary_rhythms: "{n} rasporeda dana", summary_targets: "{n} ciljeva",
    week_avg: "Prosek nedelje", load_file: "📄 Učitaj iz fajla", load_file_hint: ".txt ili .json fajl koji ti da Claude", file_loaded: "Učitano: {name}. Proveri poruku ispod pa objavi.", file_error: "Fajl ne može da se pročita.", forgot_text_email: "Upiši svoj e-mail iznad i klikni dugme. Stiže ti link za novu lozinku.", forgot_send: "Pošalji link za novu lozinku", forgot_need_email: "Prvo upiši svoj e-mail u polje iznad.", forgot_sent: "Ako nalog postoji, link je poslat na {email}. Proveri i Spam ili Promocije.", err_rate: "Sačekaj minut, pa pokušaj ponovo.", new_pw_title: "Nova lozinka", new_pw_text: "Upiši novu lozinku za svoj nalog.", new_pw: "Nova lozinka", new_pw2: "Ponovi lozinku", new_pw_btn: "Sačuvaj lozinku", pw_mismatch: "Lozinke se ne poklapaju.", pw_same: "Nova lozinka mora da se razlikuje od stare.", pw_changed: "Lozinka je promenjena.", link_expired: "Link je istekao ili je već iskorišćen. Zatraži novi.", pr_sort: "Poređaj:", pr_sort_status: "po stanju", pr_sort_weight: "po tempu težine", pr_sort_strength: "po snazi", pr_sort_adherence: "po treninzima", pr_planned: "od {n} planiranih", ov_title: "Pregled klijenata", ov_progress_btn: "Napredak klijenata", ov_backup_btn: "Rezervna kopija", ov_none_active: "Još nema aktivnih klijenata sa objavljenim planom.", ov_last_weeks: "poslednje {n} nedelje", ov_all_good: "Svi aktivni klijenti su u planu. Nema upozorenja.", backup_done: "Rezervna kopija je preuzeta. Sačuvaj fajl na sigurno mesto.", pg_good: "Napreduje", pg_watch: "Pratiti", pg_bad: "Treba pažnja", pg_nodata: "Malo podataka", pr_title: "Napredak klijenata", pr_weeks: "{n} ned.", pr_m_weight: "Težina", pr_m_waist: "Struk", pr_m_strength: "Snaga", pr_m_adherence: "Treninzi", pr_y_weight: "Promena težine u % od prve nedelje (nedeljni prosek).", pr_y_waist: "Promena struka u cm od prve nedelje (nedeljni prosek).", pr_y_strength: "Promena snage u % (procena 1RM po vežbi, medijana vežbi).", pr_y_adherence: "Odrađeni treninzi u odnosu na plan, po nedelji (%).", pr_no_data: "Još nema dovoljno unosa za ovaj grafik.", pr_table: "Ko kako napreduje", pr_note: "Procena iz unosa klijenata. Tempo težine i struka je trend iz svih merenja u periodu (najmanje 4 merenja u 10+ dana). Ocena tempa zavisi od cilja: gubitak masti 0,25–1% nedeljno, rekompozicija ±0,25%, mišićna masa +0,1–0,5%. Snaga je procenjeni 1RM, prvi naspram poslednjih treninga. Treninzi su odrađeni u odnosu na plan do juče.", col_client: "Klijent", col_status: "Stanje", col_weight_rate: "Težina/ned.", col_waist: "Struk/ned.", col_strength: "Snaga", col_adherence: "Treninzi", col_checkins: "Unosi", col_easy: "Lakši dani", col_last: "Poslednji unos", w_on: "u planu", w_fast: "brže od plana", w_slow: "sporije", w_wrong: "suprotan smer", days_ago: "pre {n} d.", r_never: "nema nijednog unosa", r_no_entry: "nema unosa {n} dana", r_adherence: "treninzi {x}%", r_wrong: "težina ide suprotno od cilja", r_fast: "gubi više od 1% nedeljno", r_fast_hold: "gubi brže nego za rekompoziciju", r_fast_gain: "dobija više od 0,5% nedeljno", r_slow: "težina se sporo menja", r_pain: "bol {x}/10", r_sleep: "san prosečno {x} h", r_easy: "{n} lakših dana", r_strength_down: "snaga pada {x}%", r_strength_up: "snaga +{x}%", r_on_pace: "težina u planu", easy_day: "Lakši dan", easy_hint: "Kad si umoran/na, loše si spavao/la ili se ne osećaš dobro. Ne moraš da objašnjavaš zašto.", easy_light: "Lakši trening", easy_light_tag: "lakše", easy_light_sub: "1 serija manje po vežbi, 1–2 ponavljanja više u rezervi.", easy_light_tr: "Lakši dan: po jedna serija manje na svakoj vežbi i 1–2 ponavljanja više u rezervi. Težinu danas ne povećavaj.", easy_walk: "Šetnja i mobilnost", easy_walk_sub: "30–45 min šetnje i 10 min mobilnosti umesto treninga.", easy_walk_tr: "Lakši dan: umesto ovog treninga danas šetnja 30–45 min i 10 min mobilnosti. Ako ipak treniraš, upiši kao i obično.", easy_move: "Pomeri na sutra", easy_move_sub: "Danas odmor, trening ide sutra.", easy_moved_away: "trening pomeren za sutra", easy_moved_in: "pomereno od juče", easy_undo: "Poništi", easy_saved: "Sačuvano. Lakši dan je sasvim u redu.", easy_removed: "Vraćeno na plan.", link_me: "Poveži sa mojim nalogom", link_me_hint: "Za tvoj lični plan: tvoj nalog je tada i trener i klijent.", linked_me: "Povezano. Tvoj plan otvaraš dugmetom Moj plan.", my_plan: "Moj plan",  back_to_clients: "Klijenti", saved: "Sačuvano"
  },
  en: {
    tagline: "Training, nutrition and progress in one place",
    lang: "Language", loading: "Loading…", save: "Save", saving: "Saving…", saved_at: "Saved {time}",
    not_saved: "Not saved. Try again.", cancel: "Cancel", close: "Close", back: "Back", next: "Next",
    edit: "Edit", copy: "Copy", copied: "Copied", optional: "optional", required_mark: "required",
    error_generic: "Something went wrong. Try again.", offline: "No internet. Changes are waiting for a connection.",
    demo_banner: "Demo mode: data is stored only in this browser. The app is not connected to a database yet.",
    demo_as_trainer: "Enter as trainer", demo_as_client: "Enter as client", demo_reset: "Reset demo data",
    login: "Sign in", signup: "Sign up", email: "Email", password: "Password", password_hint: "At least 8 characters",
    invite_code: "Invite code", invite_code_hint: "You get the code from your trainer.", login_btn: "Sign in", signup_btn: "Create account",
    forgot: "Forgot your password?",
    forgot_text: "Contact your trainer. You'll get a new invite code, create a new account, and all your data stays.",
    err_login: "Wrong email or password.", err_exists: "An account with this email already exists. Sign in.",
    err_pw_short: "The password must have at least 8 characters.", err_code: "The code is not valid or has already been used. Check it with your trainer.",
    err_email: "Enter a valid email.", logout: "Sign out",
    code_title: "Enter your invite code", code_text: "This account isn't linked to a trainer yet. Enter the code you received.",
    code_btn: "Link account",
    intake_title: "Questionnaire", intake_intro: "Your answers help your trainer build a plan just for you. Answers are saved as you go.",
    step_of: "Step {n} of {total}", skip_section: "Skip this part", skipped: "Skipped", filled: "Completed", not_started: "Not started",
    review_title: "Review before sending", review_text: "Check the parts. You can fill in skipped ones later from your profile.",
    submit: "Send to trainer", submitted_title: "Thank you!", submitted_text: "Your trainer is now building your plan and will let you know when it's ready.",
    edit_answers: "Edit answers", required_missing: "Fill in the required fields.", choose: "Choose…",
    answers_updated: "Changes saved. Your trainer will see them.", answers_edit_hint: "Edit any part of the questionnaire. Your trainer sees every change.",  save_changes: "Save changes", yes: "Yes", no: "No",
    tab_today: "Today", tab_training: "Training", tab_food: "Food", tab_calendar: "Calendar", tab_progress: "Progress",
    plan_btn: "Plan", profile: "Profile",
    next_up: "Next", in_time: "in {x}", now: "now", hours_short: "h", minutes_short: "min",
    day_done: "Day complete", day_done_text: "Rest. We continue tomorrow.", tomorrow: "Tomorrow", rest_day: "Rest",
    no_training: "no training", today_word: "Today", open_training: "Open workout", open: "Open", logged: "logged",
    checkin_title: "Morning check-in", weight_kg: "Weight (kg)", sleep_h: "Sleep (h)", pain_default: "Pain", more_fields: "+ Waist, note or another date",
    waist_cm: "Waist at the navel (cm)", note: "Note", note_ph: "hunger, energy, mood…", entry_date: "Entry date",
    schedule_title: "Today's schedule", protein_of: "{got} / {plan} g protein", if_missing: "If not available: {x}",
    wake_weigh: "Wake up and weigh in", wake_sub: "After the toilet, before eating.", wake_pain: "Also log pain after yesterday's workout.",
    shift_start: "Shift starts", shift_end: "Shift ends", stand_up: "Stand up for 1–2 minutes every 30–45 minutes of sitting.",
    last_coffee: "Last coffee", last_coffee_sub: "No caffeine after this.", nap: "Nap", sleep: "Sleep",
    sleep_goal: "Goal: {x}.", cooking: "Cooking: {x}", cooking_sub: "Freeze any boxes you won't eat within 3 days right away.",
    messages: "Messages from your trainer", training_word: "Workout",
    sleep_bad: "Under 5 h of sleep: do the short version or just go for a walk.", sleep_warn: "{x} h of sleep: full workout, but easier (RIR +1) and no weight increases.",
    sleep_ok: "{x} h of sleep: full workout, normal progression.", pain_bad: "Pain {x}/10: reduce the load next workout and tell your trainer.",
    install_title: "Install the app", install_android: "In Chrome: menu ⋮ → “Add to Home screen” or “Install app”.",
    install_ios: "In Safari: Share button (square with an arrow) → “Add to Home Screen”.", install_btn: "Install", hide: "Hide",
    sets_hint: "Enter kilograms and reps for each set. Grey numbers are from last time. Saved as you type.",
    last_time: "Last time {date}: {x}", no_history: "No entries for this exercise yet.", copy_weights: "Copy weights",
    workout_note: "Workout note", workout_note_ph: "how it went, sleep, energy…", save_workout: "Save workout",
    unsaved: "Unsaved", logged_before: "Logged earlier", enter_one_set: "Enter at least one set.", start_with: "Start: {x}",
    minutes: "Minutes", seconds: "Seconds", reps_ph: "reps", kg_ph: "kg", date: "Date", rir: "RIR",
    this_week: "This week", next_week: "Next week", prev_week: "Last week", other_week: "Week",
    week_tap: "Tap a day to see all meals.", recipes: "Recipes", ingredients: "Ingredients", steps: "Method", storage: "Storage",
    shopping: "Shopping for the week", shopping_note: "Prices are rough estimates.", reset_checks: "Clear ticks",
    rules: "Rules", cook_badge: "Cooking", template_day: "There is no specific schedule for this day, so the template is shown.",
    box_of: "1 box: {x}", from_freezer: "from the freezer", prev_week_aria: "Previous week", next_week_aria: "Next week",
    cal_text: "Your training and commitments. When your trainer changes something, it shows here right away.", shift_word: "shift",
    done_badge: "logged", week_template: "Your week", free_day: "Day off", work_day: "Work day",
    goals: "Goals", weight_title: "Weight", weight_empty: "Log your weight at least twice and a chart appears here.",
    baseline_note: "Dashed line: starting {x} kg. Latest: {y} kg.", by_week: "By week",
    col_week: "Week", col_avg: "Average", col_change: "±", col_sleep: "Sleep", col_trainings: "Workouts", col_pain: "Pain",
    compare_note: "Look at weekly averages, not single days: water and salt can move the scale by up to 1 kg.", recent: "Recent entries",
    no_entries: "No entries yet. Add your first one on the Today tab.", chart_label: "Weight chart",
    plan_title: "Plan and rules", supplements: "Supplements",
    profile_title: "Profile", my_answers: "My questionnaire answers", install_help: "How to install the app",
    plan_pending: "Your plan is being prepared", plan_pending_text: "Your trainer has your questionnaire and is building your plan. Once it's published, you'll see training, food and your schedule here.",
    intake_continue: "Continue the questionnaire", nothing_here: "Nothing here yet.",
    trainer: "Trainer", clients: "Clients", new_client: "New client", client_name: "Full name", client_lang: "Client's language",
    create: "Create", invite_title: "Send the invite", copy_invite: "Copy message", search: "Search",
    st_invited: "Invited", st_intake: "Filling in questionnaire", st_review: "Questionnaire received", st_active: "Active", st_archived: "Archived",
    new_changes: "New questionnaire changes", last_entry: "Last entry: {x}", never: "none", no_clients: "No clients yet. Add your first.",
    show_archived: "Show archived",
    t_intake: "Questionnaire", t_sections: "Sections", t_plan: "Plan", t_logs: "Entries", t_access: "Access",
    mark_seen: "Mark as reviewed", copy_claude: "Copy for Claude",
    copy_claude_hint: "Copies the answers and the plan instructions. Paste it into Claude and you'll get a plan to import on the Plan tab.",
    not_filled: "Not filled in", intake_none: "The client hasn't started the questionnaire yet.", submitted_on: "Sent {x}", updated_on: "Changed {x}",
    parq_warn: "At least one “yes” in the health questions: the client needs a doctor's approval before training.",
    flag_warn: "Marked answers need special attention.",
    sections_hint: "The client sees the sections you switch on, but only when the plan has content for them.",
    sec_today: "Today (daily schedule)", sec_training: "Training", sec_nutrition: "Food", sec_calendar: "Calendar",
    sec_progress: "Progress", sec_rules: "Plan and rules", sec_supplements: "Supplements",
    from_intake_yes: "questionnaire has data", from_intake_no: "no data in questionnaire", has_content: "plan has content", no_content: "plan has no content",
    plan_draft: "Draft: the client can't see it", plan_published: "Published: the client can see it", plan_empty: "No plan yet.",
    plan_json: "Plan (JSON)", plan_json_hint: "Paste the plan Claude made for you, then click Check.",
    validate: "Check", save_draft: "Save draft", publish: "Publish", unpublish: "Unpublish", preview: "View as client",
    preview_banner: "Viewing as client. Changes are not saved.", exit_preview: "Exit preview",
    json_ok: "The plan is valid: {x}", json_err: "Plan error: {x}", add_message: "New message to client", add: "Add",
    message_added: "Message added.", remove: "Remove",
    logs_empty: "The client has no entries yet.", daily_title: "Daily entries", sessions_title: "Workouts",
    invite_code_label: "Invite code", new_code: "Create a new code",
    code_used: "No active code. Create a new one if the client needs to link a new account (e.g. forgot the password).",
    linked: "Linked accounts", none_linked: "No account linked yet.", unlink: "Remove access",
    rename: "Rename", archive: "Archive", unarchive: "Restore from archive", delete_client: "Delete client",
    delete_confirm: "Deletion is permanent: it removes the questionnaire, plan and all entries. Type the client's name to confirm.",
    private_note: "Private note (the client can't see it)", deleted: "Client deleted.", status_label: "Status",
    set_status: "Change status", app_link: "App link", not_admin: "You don't have access to the trainer area.",
    summary_workouts: "{n} workouts", summary_days: "{n} calendar days", summary_recipes: "{n} recipes",
    summary_rhythms: "{n} day schedules", summary_targets: "{n} goals",
    week_avg: "Weekly average", load_file: "📄 Load from file", load_file_hint: ".txt or .json file from Claude", file_loaded: "Loaded: {name}. Check the message below, then publish.", file_error: "The file can't be read.", forgot_text_email: "Enter your email above and tap the button. You'll get a link to set a new password.", forgot_send: "Send me a reset link", forgot_need_email: "First enter your email in the field above.", forgot_sent: "If the account exists, we sent a link to {email}. Check Spam or Promotions too.", err_rate: "Wait a minute, then try again.", new_pw_title: "New password", new_pw_text: "Enter a new password for your account.", new_pw: "New password", new_pw2: "Repeat password", new_pw_btn: "Save password", pw_mismatch: "Passwords don't match.", pw_same: "The new password must be different from the old one.", pw_changed: "Password changed.", link_expired: "The link has expired or was already used. Request a new one.", pr_sort: "Sort:", pr_sort_status: "by status", pr_sort_weight: "by weight pace", pr_sort_strength: "by strength", pr_sort_adherence: "by workouts", pr_planned: "of {n} planned", ov_title: "Client overview", ov_progress_btn: "Client progress", ov_backup_btn: "Backup", ov_none_active: "No active clients with a published plan yet.", ov_last_weeks: "last {n} weeks", ov_all_good: "All active clients are on track. No warnings.", backup_done: "Backup downloaded. Keep the file somewhere safe.", pg_good: "Progressing", pg_watch: "Watch", pg_bad: "Needs attention", pg_nodata: "Little data", pr_title: "Client progress", pr_weeks: "{n} wk", pr_m_weight: "Weight", pr_m_waist: "Waist", pr_m_strength: "Strength", pr_m_adherence: "Workouts", pr_y_weight: "Weight change in % from the first week (weekly average).", pr_y_waist: "Waist change in cm from the first week (weekly average).", pr_y_strength: "Strength change in % (estimated 1RM per exercise, median of exercises).", pr_y_adherence: "Workouts done vs. planned, per week (%).", pr_no_data: "Not enough entries for this chart yet.", pr_table: "Who is progressing how", pr_note: "Estimated from client entries. Weight and waist pace is the trend of all measurements in the period (at least 4 in 10+ days). Pace is judged by goal: fat loss 0.25–1% per week, recomposition ±0.25%, muscle gain +0.1–0.5%. Strength is estimated 1RM, first vs. latest sessions. Workouts are done vs. planned up to yesterday.", col_client: "Client", col_status: "Status", col_weight_rate: "Weight/wk", col_waist: "Waist/wk", col_strength: "Strength", col_adherence: "Workouts", col_checkins: "Entries", col_easy: "Lighter days", col_last: "Last entry", w_on: "on pace", w_fast: "faster than planned", w_slow: "slower", w_wrong: "wrong direction", days_ago: "{n} d ago", r_never: "no entries yet", r_no_entry: "no entries for {n} days", r_adherence: "workouts {x}%", r_wrong: "weight moving against the goal", r_fast: "losing more than 1% a week", r_fast_hold: "losing faster than recomposition", r_fast_gain: "gaining more than 0.5% a week", r_slow: "weight changing slowly", r_pain: "pain {x}/10", r_sleep: "sleep avg {x} h", r_easy: "{n} lighter days", r_strength_down: "strength down {x}%", r_strength_up: "strength +{x}%", r_on_pace: "weight on pace", easy_day: "Lighter day", easy_hint: "For days when you are tired, slept badly or don't feel well. No need to explain why.", easy_light: "Lighter workout", easy_light_tag: "lighter", easy_light_sub: "1 set less per exercise, 1–2 more reps in reserve.", easy_light_tr: "Lighter day: one set less on every exercise and 1–2 more reps in reserve. Don't add weight today.", easy_walk: "Walk and mobility", easy_walk_sub: "30–45 min walk and 10 min mobility instead of the workout.", easy_walk_tr: "Lighter day: instead of this workout, a 30–45 min walk and 10 min of mobility. If you train anyway, log it as usual.", easy_move: "Move to tomorrow", easy_move_sub: "Rest today, the workout moves to tomorrow.", easy_moved_away: "workout moved to tomorrow", easy_moved_in: "moved from yesterday", easy_undo: "Undo", easy_saved: "Saved. A lighter day is completely fine.", easy_removed: "Back to the plan.", link_me: "Link to my account", link_me_hint: "For your own plan: your account is then both trainer and client.", linked_me: "Linked. Open your plan with the My plan button.", my_plan: "My plan",  back_to_clients: "Clients", saved: "Saved"
  },
  ru: {
    tagline: "Тренировки, питание и прогресс в одном месте",
    lang: "Язык", loading: "Загрузка…", save: "Сохранить", saving: "Сохраняю…", saved_at: "Сохранено в {time}",
    not_saved: "Не сохранено. Попробуй ещё раз.", cancel: "Отмена", close: "Закрыть", back: "Назад", next: "Далее",
    edit: "Изменить", copy: "Копировать", copied: "Скопировано", optional: "необязательно", required_mark: "обязательно",
    error_generic: "Что-то пошло не так. Попробуй ещё раз.", offline: "Нет интернета. Изменения ждут подключения.",
    demo_banner: "Демо-режим: данные хранятся только в этом браузере. Приложение ещё не подключено к базе.",
    demo_as_trainer: "Войти как тренер", demo_as_client: "Войти как клиент", demo_reset: "Сбросить демо-данные",
    login: "Вход", signup: "Регистрация", email: "Эл. почта", password: "Пароль", password_hint: "Минимум 8 символов",
    invite_code: "Код приглашения", invite_code_hint: "Код выдаёт тренер.", login_btn: "Войти", signup_btn: "Создать аккаунт",
    forgot: "Забыл(а) пароль?",
    forgot_text: "Напиши тренеру. Получишь новый код приглашения, создашь новый аккаунт, и все данные сохранятся.",
    err_login: "Неверная почта или пароль.", err_exists: "Аккаунт с этой почтой уже есть. Войди.",
    err_pw_short: "В пароле должно быть минимум 8 символов.", err_code: "Код недействителен или уже использован. Уточни у тренера.",
    err_email: "Введи правильную почту.", logout: "Выйти",
    code_title: "Введи код приглашения", code_text: "Этот аккаунт ещё не связан с тренером. Введи полученный код.",
    code_btn: "Связать аккаунт",
    intake_title: "Анкета", intake_intro: "Ответы помогают тренеру составить план именно для тебя. Ответы сохраняются по ходу заполнения.",
    step_of: "Шаг {n} из {total}", skip_section: "Пропустить этот раздел", skipped: "Пропущено", filled: "Заполнено", not_started: "Не начато",
    review_title: "Проверка перед отправкой", review_text: "Проверь разделы. Пропущенные можно дополнить позже в профиле.",
    submit: "Отправить тренеру", submitted_title: "Спасибо!", submitted_text: "Тренер составляет твой план и сообщит, когда он будет готов.",
    edit_answers: "Изменить ответы", required_missing: "Заполни обязательные поля.", choose: "Выбери…",
    answers_updated: "Изменения сохранены. Тренер их увидит.", answers_edit_hint: "Можно изменить любой раздел анкеты. Тренер видит все изменения.",  save_changes: "Сохранить изменения", yes: "Да", no: "Нет",
    tab_today: "Сегодня", tab_training: "Тренировки", tab_food: "Питание", tab_calendar: "Календарь", tab_progress: "Прогресс",
    plan_btn: "План", profile: "Профиль",
    next_up: "Далее", in_time: "через {x}", now: "сейчас", hours_short: "ч", minutes_short: "мин",
    day_done: "День завершён", day_done_text: "Отдых. Завтра продолжим.", tomorrow: "Завтра", rest_day: "Отдых",
    no_training: "без тренировки", today_word: "Сегодня", open_training: "Открыть тренировку", open: "Открыть", logged: "записана",
    checkin_title: "Утренний отчёт", weight_kg: "Вес (кг)", sleep_h: "Сон (ч)", pain_default: "Боль", more_fields: "+ Талия, заметка или другая дата",
    waist_cm: "Талия на уровне пупка (см)", note: "Заметка", note_ph: "голод, энергия, настроение…", entry_date: "Дата записи",
    schedule_title: "План дня", protein_of: "{got} / {plan} г белка", if_missing: "Если нет: {x}",
    wake_weigh: "Подъём и взвешивание", wake_sub: "После туалета, до еды.", wake_pain: "Отметь и боль после вчерашней тренировки.",
    shift_start: "Начало смены", shift_end: "Конец смены", stand_up: "Вставай на 1–2 минуты каждые 30–45 минут сидения.",
    last_coffee: "Последний кофе", last_coffee_sub: "После этого без кофеина.", nap: "Дневной сон", sleep: "Сон",
    sleep_goal: "Цель: {x}.", cooking: "Готовка: {x}", cooking_sub: "Контейнеры, которые не съешь за 3 дня, сразу в морозилку.",
    messages: "Сообщения от тренера", training_word: "Тренировка",
    sleep_bad: "Сон меньше 5 ч: короткая версия тренировки или просто прогулка.", sleep_warn: "Сон {x} ч: полная тренировка, но легче (RIR +1) и без увеличения веса.",
    sleep_ok: "Сон {x} ч: полная тренировка, обычная прогрессия.", pain_bad: "Боль {x}/10: снизь нагрузку на следующей тренировке и сообщи тренеру.",
    install_title: "Установи приложение", install_android: "В Chrome: меню ⋮ → «Добавить на главный экран» или «Установить приложение».",
    install_ios: "В Safari: кнопка «Поделиться» (квадрат со стрелкой) → «На экран „Домой“».", install_btn: "Установить", hide: "Скрыть",
    sets_hint: "Вводи килограммы и повторы для каждого подхода. Серые цифры — с прошлого раза. Сохраняется по ходу ввода.",
    last_time: "В прошлый раз {date}: {x}", no_history: "По этому упражнению ещё нет записей.", copy_weights: "Перенести веса",
    workout_note: "Заметка к тренировке", workout_note_ph: "как прошло, сон, энергия…", save_workout: "Сохранить тренировку",
    unsaved: "Не сохранено", logged_before: "Записано ранее", enter_one_set: "Введи хотя бы один подход.", start_with: "Начни с: {x}",
    minutes: "Минуты", seconds: "Секунды", reps_ph: "повт.", kg_ph: "кг", date: "Дата", rir: "RIR",
    this_week: "Эта неделя", next_week: "Следующая неделя", prev_week: "Прошлая неделя", other_week: "Неделя",
    week_tap: "Нажми на день, чтобы увидеть все приёмы пищи.", recipes: "Рецепты", ingredients: "Ингредиенты", steps: "Приготовление", storage: "Хранение",
    shopping: "Покупки на неделю", shopping_note: "Цены приблизительные.", reset_checks: "Снять отметки",
    rules: "Правила", cook_badge: "Готовка", template_day: "Для этого дня нет отдельного расписания, показан шаблон.",
    box_of: "1 контейнер: {x}", from_freezer: "из морозилки", prev_week_aria: "Предыдущая неделя", next_week_aria: "Следующая неделя",
    cal_text: "Твои тренировки и дела. Когда тренер что-то меняет, это сразу видно здесь.", shift_word: "смена",
    done_badge: "записано", week_template: "Твоя неделя", free_day: "Выходной", work_day: "Рабочий день",
    goals: "Цели", weight_title: "Вес", weight_empty: "Запиши вес хотя бы два раза, и здесь появится график.",
    baseline_note: "Пунктир: стартовые {x} кг. Последнее: {y} кг.", by_week: "По неделям",
    col_week: "Неделя", col_avg: "Среднее", col_change: "±", col_sleep: "Сон", col_trainings: "Трен.", col_pain: "Боль",
    compare_note: "Смотри на средние за неделю, а не на отдельные дни: вода и соль сдвигают вес до 1 кг.", recent: "Последние записи",
    no_entries: "Записей пока нет. Первую можно добавить на вкладке «Сегодня».", chart_label: "График веса",
    plan_title: "План и правила", supplements: "Добавки",
    profile_title: "Профиль", my_answers: "Мои ответы в анкете", install_help: "Как установить приложение",
    plan_pending: "План готовится", plan_pending_text: "Тренер получил анкету и составляет план. Когда он его опубликует, здесь появятся тренировки, питание и расписание.",
    intake_continue: "Продолжить анкету", nothing_here: "Здесь пока ничего нет.",
    trainer: "Тренер", clients: "Клиенты", new_client: "Новый клиент", client_name: "Имя и фамилия", client_lang: "Язык клиента",
    create: "Создать", invite_title: "Отправь приглашение", copy_invite: "Копировать сообщение", search: "Поиск",
    st_invited: "Приглашён", st_intake: "Заполняет анкету", st_review: "Анкета получена", st_active: "Активен", st_archived: "В архиве",
    new_changes: "Новые изменения в анкете", last_entry: "Последняя запись: {x}", never: "нет", no_clients: "Клиентов пока нет. Добавь первого.",
    show_archived: "Показать архив",
    t_intake: "Анкета", t_sections: "Разделы", t_plan: "План", t_logs: "Записи", t_access: "Доступ",
    mark_seen: "Отметить как просмотренное", copy_claude: "Копировать для Claude",
    copy_claude_hint: "Копирует ответы и инструкцию для составления плана. Вставь это в Claude и получишь план для импорта на вкладке «План».",
    not_filled: "Не заполнено", intake_none: "Клиент ещё не начал анкету.", submitted_on: "Отправлено {x}", updated_on: "Изменено {x}",
    parq_warn: "Хотя бы один ответ «да» в вопросах о здоровье: перед тренировками клиенту нужно разрешение врача.",
    flag_warn: "Отмеченные ответы требуют особого внимания.",
    sections_hint: "Клиент видит включённые разделы, но только если в плане для них есть содержимое.",
    sec_today: "Сегодня (план дня)", sec_training: "Тренировки", sec_nutrition: "Питание", sec_calendar: "Календарь",
    sec_progress: "Прогресс", sec_rules: "План и правила", sec_supplements: "Добавки",
    from_intake_yes: "в анкете есть данные", from_intake_no: "в анкете нет данных", has_content: "в плане есть содержимое", no_content: "в плане нет содержимого",
    plan_draft: "Черновик: клиент его не видит", plan_published: "Опубликован: клиент его видит", plan_empty: "Плана пока нет.",
    plan_json: "План (JSON)", plan_json_hint: "Вставь план, который составил Claude, и нажми «Проверить».",
    validate: "Проверить", save_draft: "Сохранить черновик", publish: "Опубликовать", unpublish: "Снять с публикации", preview: "Посмотреть как клиент",
    preview_banner: "Просмотр глазами клиента. Изменения не сохраняются.", exit_preview: "Выйти из просмотра",
    json_ok: "План в порядке: {x}", json_err: "Ошибка в плане: {x}", add_message: "Новое сообщение клиенту", add: "Добавить",
    message_added: "Сообщение добавлено.", remove: "Удалить",
    logs_empty: "У клиента пока нет записей.", daily_title: "Ежедневные записи", sessions_title: "Тренировки",
    invite_code_label: "Код приглашения", new_code: "Создать новый код",
    code_used: "Активного кода нет. Создай новый, если клиенту нужно связать новый аккаунт (например, забыл пароль).",
    linked: "Связанные аккаунты", none_linked: "Пока ни один аккаунт не связан.", unlink: "Отключить доступ",
    rename: "Переименовать", archive: "В архив", unarchive: "Вернуть из архива", delete_client: "Удалить клиента",
    delete_confirm: "Удаление необратимо: удаляются анкета, план и все записи. Введи имя клиента для подтверждения.",
    private_note: "Личная заметка (клиент её не видит)", deleted: "Клиент удалён.", status_label: "Статус",
    set_status: "Изменить статус", app_link: "Ссылка на приложение", not_admin: "У тебя нет доступа к разделу тренера.",
    summary_workouts: "тренировок: {n}", summary_days: "дней в календаре: {n}", summary_recipes: "рецептов: {n}",
    summary_rhythms: "расписаний дня: {n}", summary_targets: "целей: {n}",
    week_avg: "Среднее за неделю", load_file: "📄 Загрузить из файла", load_file_hint: "файл .txt или .json от Claude", file_loaded: "Загружено: {name}. Проверь сообщение ниже и публикуй.", file_error: "Не удалось прочитать файл.", forgot_text_email: "Введи свой e-mail выше и нажми кнопку. Придёт ссылка для нового пароля.", forgot_send: "Отправить ссылку для нового пароля", forgot_need_email: "Сначала введи e-mail в поле выше.", forgot_sent: "Если аккаунт существует, ссылка отправлена на {email}. Проверь также «Спам» и «Промоакции».", err_rate: "Подожди минуту и попробуй снова.", new_pw_title: "Новый пароль", new_pw_text: "Введи новый пароль для своего аккаунта.", new_pw: "Новый пароль", new_pw2: "Повтори пароль", new_pw_btn: "Сохранить пароль", pw_mismatch: "Пароли не совпадают.", pw_same: "Новый пароль должен отличаться от старого.", pw_changed: "Пароль изменён.", link_expired: "Ссылка устарела или уже использована. Запроси новую.", pr_sort: "Сортировать:", pr_sort_status: "по состоянию", pr_sort_weight: "по темпу веса", pr_sort_strength: "по силе", pr_sort_adherence: "по тренировкам", pr_planned: "из {n} по плану", ov_title: "Обзор клиентов", ov_progress_btn: "Прогресс клиентов", ov_backup_btn: "Резервная копия", ov_none_active: "Пока нет активных клиентов с опубликованным планом.", ov_last_weeks: "последние {n} недели", ov_all_good: "Все активные клиенты в плане. Предупреждений нет.", backup_done: "Резервная копия скачана. Сохрани файл в надёжном месте.", pg_good: "Прогрессирует", pg_watch: "Следить", pg_bad: "Нужно внимание", pg_nodata: "Мало данных", pr_title: "Прогресс клиентов", pr_weeks: "{n} нед.", pr_m_weight: "Вес", pr_m_waist: "Талия", pr_m_strength: "Сила", pr_m_adherence: "Тренировки", pr_y_weight: "Изменение веса в % от первой недели (среднее за неделю).", pr_y_waist: "Изменение талии в см от первой недели (среднее за неделю).", pr_y_strength: "Изменение силы в % (оценка 1ПМ по упражнению, медиана упражнений).", pr_y_adherence: "Выполненные тренировки относительно плана, по неделям (%).", pr_no_data: "Пока недостаточно записей для этого графика.", pr_table: "Кто как прогрессирует", pr_note: "Оценка по записям клиентов. Темп веса и талии — тренд всех измерений за период (минимум 4 за 10+ дней). Темп оценивается по цели: снижение жира 0,25–1% в неделю, рекомпозиция ±0,25%, набор мышц +0,1–0,5%. Сила — оценка 1ПМ, первые против последних тренировок. Тренировки — выполненные относительно плана до вчерашнего дня.", col_client: "Клиент", col_status: "Состояние", col_weight_rate: "Вес/нед.", col_waist: "Талия/нед.", col_strength: "Сила", col_adherence: "Тренировки", col_checkins: "Записи", col_easy: "Лёгкие дни", col_last: "Последняя запись", w_on: "в плане", w_fast: "быстрее плана", w_slow: "медленнее", w_wrong: "не в ту сторону", days_ago: "{n} дн. назад", r_never: "ещё нет записей", r_no_entry: "нет записей {n} дн.", r_adherence: "тренировки {x}%", r_wrong: "вес идёт против цели", r_fast: "теряет больше 1% в неделю", r_fast_hold: "теряет быстрее, чем для рекомпозиции", r_fast_gain: "набирает больше 0,5% в неделю", r_slow: "вес меняется медленно", r_pain: "боль {x}/10", r_sleep: "сон в среднем {x} ч", r_easy: "лёгких дней: {n}", r_strength_down: "сила падает на {x}%", r_strength_up: "сила +{x}%", r_on_pace: "вес в плане", easy_day: "Лёгкий день", easy_hint: "Когда устал(а), плохо спал(а) или плохо себя чувствуешь. Объяснять не нужно.", easy_light: "Лёгкая тренировка", easy_light_tag: "легче", easy_light_sub: "На 1 подход меньше в каждом упражнении, в запасе на 1–2 повтора больше.", easy_light_tr: "Лёгкий день: в каждом упражнении на один подход меньше и на 1–2 повтора больше в запасе. Вес сегодня не увеличивай.", easy_walk: "Прогулка и мобильность", easy_walk_sub: "30–45 мин прогулки и 10 мин мобильности вместо тренировки.", easy_walk_tr: "Лёгкий день: вместо этой тренировки прогулка 30–45 мин и 10 мин мобильности. Если всё же тренируешься, записывай как обычно.", easy_move: "Перенести на завтра", easy_move_sub: "Сегодня отдых, тренировка завтра.", easy_moved_away: "тренировка перенесена на завтра", easy_moved_in: "перенесено со вчера", easy_undo: "Отменить", easy_saved: "Сохранено. Лёгкий день — это нормально.", easy_removed: "Возвращено к плану.", link_me: "Связать с моим аккаунтом", link_me_hint: "Для личного плана: твой аккаунт будет и тренером, и клиентом.", linked_me: "Связано. Свой план открывай кнопкой «Мой план».", my_plan: "Мой план",  back_to_clients: "Клиенты", saved: "Сохранено"
  }
};

// Poruka-poziv za klijenta, na jeziku klijenta.
var INVITE = {
  sr: "Zdravo {name}! Ovo je tvoja aplikacija za trening i ishranu: {url}\n\n1. Otvori link na telefonu i izaberi Registracija.\n2. Upiši svoj e-mail, lozinku i pozivni kod: {code}\n3. Popuni upitnik, pa pravim tvoj plan.\n\nAplikaciju dodaj na početni ekran: na Androidu meni ⋮ → „Dodaj na početni ekran“, na iPhoneu u Safariju Deli → „Dodaj na početni ekran“.",
  en: "Hi {name}! This is your training and nutrition app: {url}\n\n1. Open the link on your phone and choose Sign up.\n2. Enter your email, a password and your invite code: {code}\n3. Fill in the questionnaire, then I'll build your plan.\n\nAdd the app to your home screen: on Android, menu ⋮ → “Add to Home screen”; on iPhone, in Safari, Share → “Add to Home Screen”.",
  ru: "Привет, {name}! Это твоё приложение для тренировок и питания: {url}\n\n1. Открой ссылку на телефоне и выбери «Регистрация».\n2. Введи почту, пароль и код приглашения: {code}\n3. Заполни анкету, и я составлю твой план.\n\nДобавь приложение на главный экран: на Android меню ⋮ → «Добавить на главный экран», на iPhone в Safari «Поделиться» → «На экран „Домой“»."
};

var DAYS = {
  sr: { short: ["Ned", "Pon", "Uto", "Sre", "Čet", "Pet", "Sub"], long: ["Nedelja", "Ponedeljak", "Utorak", "Sreda", "Četvrtak", "Petak", "Subota"],
    months: ["januar", "februar", "mart", "april", "maj", "jun", "jul", "avgust", "septembar", "oktobar", "novembar", "decembar"] },
  en: { short: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], long: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] },
  ru: { short: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"], long: ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"],
    months: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"] }
};

var current = "sr";

export function detectLang() {
  try {
    var saved = localStorage.getItem("rekomp-lang");
    if (saved && T[saved]) return saved;
  } catch (e) { /* ignore */ }
  var nav = (navigator.language || "sr").slice(0, 2).toLowerCase();
  if (nav === "ru" || nav === "uk" || nav === "be") return "ru";
  if (nav === "sr" || nav === "hr" || nav === "bs" || nav === "me") return "sr";
  return "en";
}

// persist = true samo kad korisnik sam izabere jezik.
export function setLang(l, persist) {
  if (!T[l]) l = "sr";
  current = l;
  document.documentElement.lang = l === "sr" ? "sr-Latn" : l;
  if (persist) { try { localStorage.setItem("rekomp-lang", l); } catch (e) { /* ignore */ } }
}
export function chosenLang() {
  try { var s = localStorage.getItem("rekomp-lang"); return T[s] ? s : null; } catch (e) { return null; }
}
export function getLang() { return current; }

export function t(key, vars) {
  var s = (T[current] && T[current][key]) || T.sr[key] || key;
  if (vars) Object.keys(vars).forEach(function (k) { s = s.split("{" + k + "}").join(vars[k]); });
  return s;
}

export function inviteText(lang, vars) {
  var s = INVITE[lang] || INVITE.sr;
  Object.keys(vars).forEach(function (k) { s = s.split("{" + k + "}").join(vars[k]); });
  return s;
}

export function dayShort(d) { return DAYS[current].short[d.getDay()]; }
export function dayLong(d) { return DAYS[current].long[d.getDay()]; }
export function fmtShortDate(d) { return dayShort(d) + " " + d.getDate() + "." + (d.getMonth() + 1) + "."; }
export function fmtLongDate(d) {
  if (current === "en") return dayLong(d) + ", " + DAYS.en.months[d.getMonth()] + " " + d.getDate();
  return dayLong(d) + ", " + d.getDate() + ". " + DAYS[current].months[d.getMonth()];
}
export function fmtRange(a, b) { return a.getDate() + "." + (a.getMonth() + 1) + ". – " + b.getDate() + "." + (b.getMonth() + 1) + "."; }

export function langSelectHtml(id, value) {
  return '<select id="' + id + '" class="lang-select" aria-label="' + t("lang") + '">' + LANGS.map(function (l) {
    return '<option value="' + l.code + '"' + (l.code === value ? " selected" : "") + ">" + l.name + "</option>";
  }).join("") + "</select>";
}

export var STRINGS = T;
