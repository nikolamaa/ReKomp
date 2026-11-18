# ReKomp za klijente

Aplikacija za personalne treninge: svaki klijent dobija svoju stranu sa treningom, ishranom, danom, kalendarom i napretkom, a ti imaš trenerski panel za sve klijente. Radi na Androidu i iPhoneu (dodaje se na početni ekran kao aplikacija), na srpskom, engleskom i ruskom.

Hosting je besplatan: kod je na **GitHub Pages**, podaci u bazi **Supabase** (besplatan plan).

---

## Kako izgleda rad sa klijentom

1. U panelu klikneš **+ Novi klijent**, upišeš ime i jezik. Aplikacija napravi **pozivni kod** i gotovu poruku za slanje (Viber, WhatsApp, SMS).
2. Klijent otvori link, izabere **Registracija**, upiše e-mail, lozinku i kod.
3. Klijent popunjava **upitnik** (12 delova: saglasnost, osnovni podaci, ciljevi, zdravlje i PAR-Q, povrede i bol, iskustvo, vreme i oprema, posao/san/stres, ishrana i alergije, suplementi, merenja, kontakt). Odgovori se čuvaju automatski, pa može da prekine i nastavi kasnije. Deo koji ga ne zanima može da preskoči.
4. Kad pošalje, klijent u listi dobija status **Upitnik stigao**. Odgovori sa „da“ u zdravstvenim pitanjima i ozbiljne alergije su označeni crveno.
5. Na kartici **Upitnik** klikneš **Kopiraj za Claude**, nalepiš u Claude i dobiješ plan u JSON formatu.
6. Na kartici **Plan** nalepiš JSON ili klikneš **📄 Učitaj iz fajla** i izabereš .txt/.json fajl, klikneš **Proveri** (aplikacija javi greške), pa **Sačuvaj nacrt** ili **Objavi**. Klijent vidi plan tek kad ga objaviš. Pre toga možeš **Pogledaj kao klijent**.
7. Na kartici **Sekcije** biraš šta klijent vidi. Aplikacija sama predloži sekcije za koje je klijent dao podatke (npr. ako je preskočio ishranu, nema sekcije Ishrana). Kasnije, kad dobiješ podatke, uključiš sekciju i dopuniš plan.
8. Klijent svakodnevno unosi težinu, san, bol, struk, kilaže po serijama. Ti to vidiš na kartici **Unosi** (nedeljni proseci, dnevna tabela, treninzi).

Na dan sa treningom klijent može da izabere **Lakši dan**: lakši trening (serija manje, više ponavljanja u rezervi), šetnju i mobilnost ili pomeranje treninga na sutra. Razlog se ne pita; ti na kartici **Unosi** vidiš samo da je dan bio lakši.

Na početnoj strani panela je **Pregled klijenata**: ko treba pažnju i zašto (nema unosa, malo treninga, težina ide suprotno od cilja, bol). Dugme **Napredak klijenata** otvara grafik za sve klijente (težina, struk, snaga, treninzi; 4, 8 ili 12 nedelja) i kartice sa tempom svakog klijenta, koje možeš da poređaš po stanju, težini, snazi ili treninzima.

Poruke klijentu dodaješ na kartici **Plan** (deo **Poruke od trenera**). Pojavljuju se klijentu na ekranu Danas.

---

## Postavljanje (jednom, oko 20 minuta)

### 1. Baza: Supabase

1. Otvori [supabase.com](https://supabase.com), napravi nalog i klikni **New project**.
   - Ime: `rekomp`
   - Database password: jaka lozinka, sačuvaj je (trebaće samo ako nešto radiš direktno u bazi).
   - Region: **Central EU (Frankfurt)** (najbliže Srbiji, podaci ostaju u EU).
2. Kad se projekat napravi: levo **SQL Editor** → **New query** → nalepi ceo sadržaj fajla `supabase/schema.sql` → **Run**. Treba da piše „Success. No rows returned“.
3. Levo **Authentication** → **Sign In / Providers**:
   - **Allow new users to sign up**: uključeno.
   - **Confirm email**: **isključi** i sačuvaj.
   Zašto: besplatni Supabase e-mail šalje poruke samo članovima tvog Supabase tima, pa klijenti ne bi mogli da potvrde nalog. Bez potvrde se nalog pravi odmah, a niko ne može da uđe bez tvog pozivnog koda.
4. Kopiraj dva podatka (oba su javna po prirodi, smeju da budu u kodu):
   - **Project URL** (izgleda kao `https://abcdefgh.supabase.co`): dugme **Connect** na početnoj strani projekta ili **Project Settings → Data API**.
   - **Publishable key** (počinje sa `sb_publishable_`) iz **Project Settings → API Keys**. Ako vidiš samo stari **anon** ključ, može i on.
   - **Nikad** ne kopiraj `secret` ili `service_role` ključ u aplikaciju. Taj ključ zaobilazi sva pravila pristupa.

### 2. Podešavanje: `config.js`

Otvori `config.js` (na GitHubu: klikni fajl → ikonica olovke) i upiši:

```js
window.REKOMP_CONFIG = {
  appName: "ReKomp",
  supabaseUrl: "https://abcdefgh.supabase.co",
  supabaseAnonKey: "sb_publishable_...",
  appUrl: "https://rekomp.me/"
};
```

Dok su `supabaseUrl` i `supabaseAnonKey` prazni, aplikacija radi u **demo režimu**: podaci se čuvaju samo u tom pregledaču i služe za probu.

### 3. Hosting: GitHub Pages

1. Repozitorijum `ReKomp` → **Settings** → **Pages**.
2. **Build and deployment** → Source: **Deploy from a branch** → Branch: **main**, folder **/ (root)** → **Save**.
3. Posle 1–2 minuta aplikacija je na `https://nikolamaa.github.io/ReKomp/`.

### 3a. Sopstveni domen: rekomp.me

Kod registra domena, u DNS podešavanjima za `rekomp.me`:

| Tip | Ime (host) | Vrednost |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `nikolamaa.github.io` |

Obriši postojeće A/CNAME zapise za `@` i `www` koje je registar sam napravio (parking strana). Fajl `CNAME` u repozitorijumu kaže GitHubu da je domen `rekomp.me`. U **Settings → Pages** posle provere DNS-a uključi **Enforce HTTPS**. Stari link `nikolamaa.github.io/ReKomp` automatski vodi na novi.

Repozitorijum je javan (besplatan GitHub Pages to traži za lične naloge). U kodu nema lozinki ni podataka klijenata; podaci su u Supabase bazi i zaštićeni pravilima pristupa (Row Level Security): klijent vidi samo svoje, ti vidiš sve.

### 4. Link u Supabase

**Authentication** → **URL Configuration** → **Site URL**: `https://rekomp.me/` → Save.

### 5. Tvoj trenerski nalog

1. Otvori aplikaciju, izaberi **Registracija**, upiši svoj e-mail i lozinku, **bez koda**.
2. U Supabase **SQL Editor** pokreni (zameni e-mail svojim):

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'TVOJ@EMAIL.com'
on conflict do nothing;
```

3. Osveži aplikaciju: otvara se trenerski panel.

Ako želiš i svoj lični plan u istoj aplikaciji: napravi klijenta za sebe, na kartici **Pristup** klikni **Poveži sa mojim nalogom**. U panelu se pojavi dugme **Moj plan**.

---

## Instalacija na telefonu (za tebe i klijente)

- **Android (Chrome):** otvori link → meni ⋮ → **Instaliraj aplikaciju** ili **Dodaj na početni ekran**.
- **iPhone (Safari):** otvori link u Safariju → dugme **Deli** (kvadrat sa strelicom) → **Dodaj na početni ekran**.

Uputstvo za instalaciju je i u samoj aplikaciji (profil klijenta) i u poruci sa pozivnim kodom. Izmene plana stižu čim klijent otvori aplikaciju sa internetom; bez interneta se otvara poslednja verzija.

---

## Česte situacije

**Klijent je zaboravio lozinku.** Na prijavi: **Zaboravio/la si lozinku?** → upiše e-mail → stiže link (Resend, `no-reply@mail.rekomp.me`) → otvara ekran **Nova lozinka**. Ako mejl ne stigne: na kartici **Pristup** klikni **Napravi novi kod**, klijent napravi novi nalog sa tim kodom i dobija sve svoje podatke (vezani su za klijenta, ne za nalog).

**E-pošta (Resend).** Domen `mail.rekomp.me` u Resendu (region Ireland), zapisi u Cloudflareu. Supabase → Authentication → Emails → SMTP: `smtp.resend.com`, port 465, korisnik `resend`, lozinka = Resend ključ samo za slanje. Šablon „Reset password“ je na tri jezika, sa logom (kopija za lepljenje: `supabase/email_reset.html`). U `config.js` je `emailReset: true`.

**Klijent je dopunio upitnik.** U listi dobija oznaku **Nove izmene u upitniku**. Pogledaj odgovore i klikni **Označi kao pregledano**.

**Klijent je prestao da trenira.** Na kartici **Pristup** postavi status **Arhiviran**. Ne vidi se u listi dok ne uključiš „Prikaži arhivirane“.

**Klijent traži brisanje podataka.** **Pristup** → **Obriši klijenta** (traži da upišeš ime za potvrdu). Briše plan, upitnik i sve unose. Nalog za prijavu ostaje u Supabase **Authentication → Users**; obriši ga i tamo.

**Rezervna kopija.** Besplatan Supabase nema automatske kopije. Jednom nedeljno u panelu klikni **Rezervna kopija** i sačuvaj preuzeti fajl (sadrži zdravstvene podatke klijenata, čuvaj ga kao poverljiv).

**Aplikacija ne radi nekoliko dana.** Besplatan Supabase projekat se pauzira posle oko nedelju dana bez korišćenja. Sa klijentima koji svakodnevno unose podatke to se ne dešava. Ako se desi: Supabase → projekat → **Restore**. Podaci ostaju.

---

## Privatnost i zdravstveni podaci

Upitnik sadrži zdravstvene podatke (bolesti, povrede, lekovi, trudnoća). Po Zakonu o zaštiti podataka o ličnosti to je posebna vrsta podataka i za obradu treba izričit pristanak. Zato je prvi deo upitnika saglasnost i bez nje klijent ne može dalje. Preporuke:

- Podatke klijenata drži samo u aplikaciji. Ne stavljaj ih u GitHub, Excel na javnom linku ili grupne četove.
- Kad kopiraš upitnik u Claude, koristi svoj **lični** Claude nalog, a ne poslovni (poslovni nalog pripada firmi).
- Zdravstveni odgovori „da“ i ozbiljne alergije su označeni. Ako PAR-Q ima „da“, pre početka traži mišljenje lekara.
- Aplikacija nije medicinski uređaj i ne postavlja dijagnoze.

---

## Kasnije: APK i Google Play

Ova aplikacija je PWA (web aplikacija koja se instalira sa sajta), pa ne treba APK. Ako jednog dana želiš Play prodavnicu:

- [PWABuilder](https://www.pwabuilder.com) od linka aplikacije pravi Android paket.
- Google Play traži jednokratnih 25 USD, a novi lični nalozi moraju prvo da imaju zatvoreno testiranje sa najmanje 12 testera tokom 14 dana.
- iPhone verzija za App Store traži Apple Developer nalog (godišnja članarina).

---

## Fajlovi

| Fajl | Šta je |
|---|---|
| `index.html`, `styles.css` | stranica i izgled (tamna tema) |
| `config.js` | adresa baze i ključ |
| `js/app.js` | prijava, upitnik, preusmeravanje |
| `js/intake.js` | pitanja upitnika (sva tri jezika) |
| `js/intake-ui.js` | prikaz upitnika korak po korak |
| `js/client.js` | klijentska strana: Danas, Trening, Ishrana, Kalendar, Napredak |
| `js/admin.js` | trenerski panel |
| `js/insights.js` | pregled napretka i upozorenja za trenera |
| `js/plan-format.js` | provera plana i tekst za Claude |
| `js/i18n.js` | prevodi (srpski, engleski, ruski) |
| `js/api.js` | rad sa bazom i demo režim |
| `js/demo-data.js` | izmišljeni primeri za demo |
| `supabase/schema.sql` | tabele i pravila pristupa |
| `sw.js`, `manifest.webmanifest`, `icons/` | instalacija na telefon i rad bez interneta |
| `PLAN_FORMAT.md` | opis formata plana |

Kad menjaš kod, u `sw.js` povećaj `VERSION` (npr. `rekomp-v2`) da telefoni sigurno preuzmu novu verziju.

Lokalna proba bez interneta: u folderu aplikacije pokreni `python3 -m http.server 8000` i otvori `http://localhost:8000`.
