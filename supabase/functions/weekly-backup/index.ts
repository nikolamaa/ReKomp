// @ts-nocheck
// ReKomp: nedeljna rezervna kopija na mejl. Poziva je cron (supabase/backup.sql) ili trener dugmetom
// „Pošalji kopiju sada“ (Podešavanja → Rezervna kopija na mejl).
// Kopija sadrži sve tabele aplikacije, sabijena (gzip) i šifrovana lozinkom (PBKDF2-SHA256 + AES-256-GCM).
// Otvara se u trenerskom panelu: Podešavanja → Rezervna kopija na mejl → Otvori kopiju iz mejla.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY   Resend ključ samo za slanje (domen mail.rekomp.me)
//   BACKUP_PASSWORD  lozinka za otvaranje kopije (bar 12 znakova; zapiši je, bez nje kopija ne može da se otvori)
//   CRON_SECRET      već postoji (isti kao za send-reminders)
//   BACKUP_TO        (neobavezno) adresa, podrazumevano nikola@rekomp.me
//   BACKUP_FROM      (neobavezno) pošiljalac, podrazumevano ReKomp <no-reply@mail.rekomp.me>
// Podešavanje funkcije: „Verify JWT“ isključen (funkcija sama proverava cron šifru ili da je pozivalac trener).

const enc = new TextEncoder();
export const ITER = 600000;

// Tabele i redosled čitanja (isto kao ručna kopija u aplikaciji + istorija plana i podešavanja).
export const TABLES = {
  admins: ["user_id"], clients: ["id"], client_private: ["client_id"], client_members: ["user_id"], intakes: ["client_id"],
  plans: ["client_id"], daily_logs: ["client_id", "day"], sessions: ["client_id", "day", "workout"], week_plans: ["client_id", "week"],
  trainer_files: ["key"], app_settings: ["key"], plan_versions: ["id"], user_settings: ["user_id"]
};
export const OPTIONAL = ["week_plans", "trainer_files", "app_settings", "plan_versions", "user_settings"];

export function b64(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(s);
}
export function unb64(s) {
  const bin = atob(String(s));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function gzip(bytes) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer());
}
async function deriveKey(password, salt, iter, usage) {
  const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, [usage]);
}

// Isti format otvara js/backup-crypto.js u pregledaču.
export async function encryptBackup(obj, password, iter = ITER) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, iter, "encrypt");
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, await gzip(enc.encode(JSON.stringify(obj)))));
  return { rekomp: "encrypted-backup", v: 1, created_at: obj.exported_at || new Date().toISOString(), kdf: "PBKDF2-SHA256", iter, cipher: "AES-256-GCM", zip: "gzip", salt: b64(salt), iv: b64(iv), data: b64(ct) };
}

function secretKey(env) {
  try {
    const k = JSON.parse(env.SUPABASE_SECRET_KEYS || "{}");
    if (k.default) return k.default;
    const first = Object.values(k)[0];
    if (first) return first;
  } catch (_) { /* stari ključevi */ }
  return env.SUPABASE_SERVICE_ROLE_KEY;
}
function publicKey(env) {
  try {
    const k = JSON.parse(env.SUPABASE_PUBLISHABLE_KEYS || "{}");
    if (k.default) return k.default;
    const first = Object.values(k)[0];
    if (first) return first;
  } catch (_) { /* stari ključevi */ }
  return env.SUPABASE_ANON_KEY;
}
function dbHeaders(key, extra) {
  const h = Object.assign({ "Content-Type": "application/json", apikey: key }, extra || {});
  if (!String(key).startsWith("sb_")) h.Authorization = "Bearer " + key;   // stari JWT ključ
  return h;
}
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: Object.assign({ "Content-Type": "application/json" }, CORS) });

function ddmmyyyy(d) { return String(d.getUTCDate()).padStart(2, "0") + "." + String(d.getUTCMonth() + 1).padStart(2, "0") + "." + d.getUTCFullYear(); }
function kb(n) { return n < 1024 * 1024 ? Math.max(1, Math.round(n / 1024)) + " KB" : (n / 1024 / 1024).toFixed(1) + " MB"; }

export async function handle(req, env, fetchImpl = fetch) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const key = secretKey(env), base = env.SUPABASE_URL;
  const rest = async (path, init) => {
    const r = await fetchImpl(base + "/rest/v1/" + path, Object.assign({ headers: dbHeaders(key) }, init || {}));
    if (!r.ok) { const e = new Error(path.split("?")[0] + " " + r.status + " " + (await r.text()).slice(0, 200)); e.status = r.status; throw e; }
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  };

  // Ko poziva: cron (šifra) ili prijavljen trener (dugme u aplikaciji).
  let source = null;
  if (env.CRON_SECRET && req.headers.get("x-cron-secret") === env.CRON_SECRET) source = "auto";
  else {
    const auth = req.headers.get("authorization") || "";
    const jwt = auth.replace(/^Bearer\s+/i, "");
    if (jwt && jwt.split(".").length === 3) {
      const u = await fetchImpl(base + "/auth/v1/user", { headers: { apikey: publicKey(env) || key, Authorization: "Bearer " + jwt } });
      if (u.ok) {
        const user = await u.json();
        const a = user && user.id ? await rest("admins?select=user_id&user_id=eq." + encodeURIComponent(user.id)) : [];
        if (a && a.length) source = "manual";
      }
    }
  }
  if (!source) return json({ error: "forbidden" }, 403);

  const saveStatus = (data) => rest("trainer_files", {
    method: "POST", headers: dbHeaders(key, { Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify({ key: "status:backup", data })
  }).catch(() => null);
  let prev = null;
  try { const r = await rest("trainer_files?select=data&key=eq." + encodeURIComponent("status:backup")); prev = r && r[0] ? r[0].data : null; } catch (_) { /* tabela možda ne postoji */ }
  if (source === "manual" && prev && prev.source === "manual" && Date.now() - Date.parse(prev.at) < 120000) return json({ error: "rate" }, 429);

  const fail = async (code, status, detail) => { await saveStatus({ at: new Date().toISOString(), ok: false, source, error: code, detail: detail || null, last_ok: prev && prev.ok ? prev.at : (prev && prev.last_ok) || null }); return json({ error: code, detail: detail || undefined }, status); };
  if (!env.BACKUP_PASSWORD || String(env.BACKUP_PASSWORD).length < 12) return fail("missing_password", 500);
  if (!env.RESEND_API_KEY) return fail("missing_resend", 500);

  // Čitanje svih tabela (PostgREST vraća najviše 1000 redova po zahtevu).
  const data = {}, counts = {};
  try {
    for (const name of Object.keys(TABLES)) {
      const order = TABLES[name].map((c) => c + ".asc").join(",");
      let rows = [];
      try {
        for (let off = 0; off < 1000000; off += 1000) {
          const part = await rest(name + "?select=*&order=" + order + "&limit=1000&offset=" + off);
          rows = rows.concat(part || []);
          if (!part || part.length < 1000) break;
        }
      } catch (e) {
        if (OPTIONAL.includes(name) && (e.status === 404 || /PGRST205|42P01|does not exist|schema cache/.test(String(e.message)))) { data[name] = null; continue; }
        throw e;
      }
      data[name] = rows; counts[name] = rows.length;
    }
  } catch (e) { return fail("read_failed", 500, String(e.message || e).slice(0, 300)); }

  const now = new Date();
  const backup = { app: "ReKomp", exported_at: now.toISOString(), source, data };
  const file = enc.encode(JSON.stringify(await encryptBackup(backup, String(env.BACKUP_PASSWORD))));
  const day = now.toISOString().slice(0, 10);
  const lines = [
    "Klijenata: " + (counts.clients || 0), "Upitnika: " + (counts.intakes || 0), "Planova: " + (counts.plans || 0),
    "Dnevnih unosa: " + (counts.daily_logs || 0), "Upisanih treninga: " + (counts.sessions || 0)
  ];
  const text = "Rezervna kopija ReKomp podataka od " + ddmmyyyy(now) + " (" + (source === "auto" ? "automatska" : "ručno poslata") + ", " + kb(file.length) + ").\n\n" + lines.join("\n") +
    "\n\nFajl je šifrovan lozinkom iz Supabase Secrets (BACKUP_PASSWORD). Otvara se u aplikaciji: Podešavanja → Rezervna kopija na mejl → Otvori kopiju iz mejla.\nKopije starije od 3 meseca obriši (Politika privatnosti).";
  const html = '<div style="font-family:Arial,Helvetica,sans-serif;color:#141D26;font-size:14px;line-height:20px;max-width:560px">' +
    '<p style="margin:0 0 12px"><b>Rezervna kopija ReKomp podataka</b><br>' + ddmmyyyy(now) + " · " + (source === "auto" ? "automatska" : "ručno poslata") + " · " + kb(file.length) + "</p>" +
    '<p style="margin:0 0 12px">' + lines.join("<br>") + "</p>" +
    '<p style="margin:0 0 12px">Fajl je šifrovan lozinkom iz Supabase Secrets (BACKUP_PASSWORD). Otvara se u aplikaciji: <b>Podešavanja → Rezervna kopija na mejl → Otvori kopiju iz mejla</b>.</p>' +
    '<p style="margin:0;color:#4F5D6B;font-size:12px">Kopije starije od 3 meseca obriši (Politika privatnosti).</p></div>';
  const r = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.BACKUP_FROM || "ReKomp <no-reply@mail.rekomp.me>",
      to: [env.BACKUP_TO || "nikola@rekomp.me"],
      subject: "ReKomp: rezervna kopija " + ddmmyyyy(now),
      text, html,
      attachments: [{ filename: "rekomp-sifrovana-kopija-" + day + ".json", content: b64(file) }]
    })
  });
  if (!r.ok) return fail("mail_failed", 502, (r.status + " " + (await r.text())).slice(0, 300));
  const st = { at: now.toISOString(), ok: true, source, bytes: file.length, counts, last_ok: now.toISOString() };
  await saveStatus(st);
  return json({ ok: true, source, bytes: file.length, counts });
}

if (typeof Deno !== "undefined" && Deno.serve && !Deno.env.get("REKOMP_TEST")) {
  const env = new Proxy({}, { get: (_, k) => Deno.env.get(String(k)) });
  Deno.serve((req) => handle(req, env));
}
