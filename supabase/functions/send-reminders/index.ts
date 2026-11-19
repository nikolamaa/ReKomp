// @ts-nocheck
// ReKomp: šalje podsetnike koji su na redu. Poziva ga cron svakog minuta (supabase/cron.sql).
// Web Push (RFC 8291 aes128gcm + VAPID RFC 8292) samo preko WebCrypto, bez spoljnih biblioteka.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (npr. mailto:nikola@rekomp.me), CRON_SECRET
// Podešavanje funkcije: „Verify JWT“ isključen (funkcija sama proverava x-cron-secret).

const enc = new TextEncoder();

export function b64u(buf) {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function unb64u(s) {
  const t = String(s).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(t + "===".slice((t.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function concat(...parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
async function hmac(key, data) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}
// HKDF sa jednim blokom (dovoljno za ≤ 32 bajta)
async function hkdf(salt, ikm, info, len) {
  const prk = await hmac(salt, ikm);
  return (await hmac(prk, concat(info, new Uint8Array([1])))).slice(0, len);
}

// Šifrovanje sadržaja za pretplatu (p256dh, auth) po RFC 8291.
export async function encryptPayload(sub, text) {
  const ua = unb64u(sub.p256dh), authSecret = unb64u(sub.auth);
  const eph = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", eph.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", ua, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, eph.privateKey, 256));
  const ikm = await hkdf(authSecret, shared, concat(enc.encode("WebPush: info\0"), ua, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, concat(enc.encode(text), new Uint8Array([2]))));
  const head = new Uint8Array(21 + asPub.length);
  head.set(salt, 0);
  new DataView(head.buffer).setUint32(16, 4096);
  head[20] = asPub.length;
  head.set(asPub, 21);
  return concat(head, ct);
}

// VAPID potpis (ES256) za adresu push servisa; potpis važi 12 h, čuva se po servisu.
let signKey = null, signKeyFor = "";
const jwtCache = new Map();
export async function vapidHeader(endpoint, pub, priv, subject) {
  const aud = new URL(endpoint).origin;
  const hit = jwtCache.get(aud);
  if (hit && hit.exp - 3600 > Date.now() / 1000) return hit.h;
  if (!signKey || signKeyFor !== pub + priv) {
    const p = unb64u(pub);
    signKey = await crypto.subtle.importKey("jwk",
      { kty: "EC", crv: "P-256", x: b64u(p.slice(1, 33)), y: b64u(p.slice(33, 65)), d: priv, ext: true },
      { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
    signKeyFor = pub + priv;
  }
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const unsigned = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" }))) + "." + b64u(enc.encode(JSON.stringify({ aud, exp, sub: subject })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, signKey, enc.encode(unsigned)));
  const h = "vapid t=" + unsigned + "." + b64u(sig) + ", k=" + pub;
  jwtCache.set(aud, { h, exp });
  return h;
}

export async function sendPush(sub, payload, env, fetchImpl) {
  const body = await encryptPayload(sub, payload);
  const auth = await vapidHeader(sub.endpoint, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY, env.VAPID_SUBJECT || "mailto:nikola@rekomp.me");
  const r = await fetchImpl(sub.endpoint, {
    method: "POST",
    headers: { TTL: "1800", Urgency: "high", "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", Authorization: auth },
    body
  });
  return r.status;
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
function dbHeaders(key) {
  const h = { "Content-Type": "application/json", apikey: key };
  if (!String(key).startsWith("sb_")) h.Authorization = "Bearer " + key;   // stari JWT ključ
  return h;
}
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });

async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) await fn(items[i++]); }));
}

export async function handle(req, env, fetchImpl = fetch) {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!env.CRON_SECRET || req.headers.get("x-cron-secret") !== env.CRON_SECRET) return json({ error: "forbidden" }, 403);
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return json({ error: "missing VAPID keys" }, 500);
  const key = secretKey(env);
  const rpc = async (fn, args) => {
    const r = await fetchImpl(env.SUPABASE_URL + "/rest/v1/rpc/" + fn, { method: "POST", headers: dbHeaders(key), body: JSON.stringify(args) });
    if (!r.ok) throw new Error(fn + " " + r.status + " " + (await r.text()));
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  };
  let rows;
  try { rows = (await rpc("claim_due_reminders", { p_limit: 300 })) || []; }
  catch (e) { return json({ error: String(e.message || e) }, 500); }
  let sent = 0, failed = 0;
  const gone = new Set(), errors = [];
  await pool(rows, 8, async (r) => {
    const payload = JSON.stringify({ title: r.title, body: r.body || "", url: r.url || "./", tag: r.kind, id: r.rid });
    try {
      const s = await sendPush({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth }, payload, env, fetchImpl);
      if (s >= 200 && s < 300) sent++;
      else if (s === 404 || s === 410) gone.add(r.endpoint);
      else { failed++; if (errors.length < 5) errors.push(s); }
    } catch (e) { failed++; if (errors.length < 5) errors.push(String(e.message || e)); }
  });
  if (gone.size) { try { await rpc("drop_push_subs", { p_endpoints: [...gone] }); } catch (_) { /* sledeći put */ } }
  return json({ due: rows.length, sent, failed, gone: gone.size, errors });
}

if (typeof Deno !== "undefined" && Deno.serve && !Deno.env.get("REKOMP_TEST")) {
  const env = new Proxy({}, { get: (_, k) => Deno.env.get(String(k)) });
  Deno.serve((req) => handle(req, env));
}
