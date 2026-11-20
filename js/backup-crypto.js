// Šifrovana rezervna kopija (stiže mejlom iz funkcije weekly-backup): otvaranje u pregledaču.
// Format: { rekomp: "encrypted-backup", v: 1, kdf: "PBKDF2-SHA256", iter, cipher: "AES-256-GCM", zip: "gzip", salt, iv, data } (base64).
var enc = new TextEncoder();

function err(code) { var e = new Error(code); e.code = code; return e; }
export function b64(bytes) {
  var b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), s = "";
  for (var i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(s);
}
export function unb64(s) {
  var bin = atob(String(s)), out = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function pipe(bytes, stream) { return new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer().then(function (b) { return new Uint8Array(b); }); }
async function deriveKey(password, salt, iter, usage) {
  var base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt, iterations: iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, [usage]);
}

export function isEncryptedBackup(x) { return !!(x && typeof x === "object" && x.rekomp === "encrypted-backup" && x.data && x.salt && x.iv); }
export function isPlainBackup(x) { return !!(x && typeof x === "object" && x.app === "ReKomp" && x.data && typeof x.data === "object"); }

// Za testove i za isti format kao funkcija weekly-backup.
export async function encryptBackup(obj, password, iter) {
  iter = iter || 600000;
  var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  var key = await deriveKey(password, salt, iter, "encrypt");
  var zipped = await pipe(enc.encode(JSON.stringify(obj)), new CompressionStream("gzip"));
  var ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, zipped));
  return { rekomp: "encrypted-backup", v: 1, created_at: obj.exported_at || new Date().toISOString(), kdf: "PBKDF2-SHA256", iter: iter, cipher: "AES-256-GCM", zip: "gzip", salt: b64(salt), iv: b64(iv), data: b64(ct) };
}

// Greške: bad_file (nije kopija ili je oštećena), bad_password (pogrešna lozinka), unsupported (stari pregledač).
export async function decryptBackup(env, password) {
  if (!isEncryptedBackup(env) || env.v !== 1 || env.kdf !== "PBKDF2-SHA256" || env.cipher !== "AES-256-GCM") throw err("bad_file");
  if (typeof DecompressionStream === "undefined" || !crypto.subtle) throw err("unsupported");
  var iter = Number(env.iter);
  if (!(iter >= 100000 && iter <= 5000000)) throw err("bad_file");
  var salt, iv, data;
  try { salt = unb64(env.salt); iv = unb64(env.iv); data = unb64(env.data); } catch (e) { throw err("bad_file"); }
  var key = await deriveKey(String(password || ""), salt, iter, "decrypt");
  var plain;
  try { plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, data)); } catch (e) { throw err("bad_password"); }
  var out;
  try { out = JSON.parse(new TextDecoder().decode(env.zip === "gzip" ? await pipe(plain, new DecompressionStream("gzip")) : plain)); } catch (e) { throw err("bad_file"); }
  if (!isPlainBackup(out)) throw err("bad_file");
  return out;
}

// Kratak pregled kopije: datum i broj redova po tabeli (bez ličnih podataka).
export function backupSummary(b) {
  var d = (b && b.data) || {};
  function n(k) { return Array.isArray(d[k]) ? d[k].length : d[k] && typeof d[k] === "object" ? Object.keys(d[k]).length : 0; }
  // demo kopija čuva unose po klijentu: { klijent: { dan: … } }
  function nested(k) { var o = d[k], c = 0; if (o && typeof o === "object") Object.keys(o).forEach(function (x) { if (o[x] && typeof o[x] === "object") c += Object.keys(o[x]).length; }); return c; }
  return { at: b && b.exported_at, source: b && b.source, clients: n("clients"), intakes: n("intakes"), plans: n("plans"),
    daily: Array.isArray(d.daily_logs) ? d.daily_logs.length : nested("daily"), sessions: Array.isArray(d.sessions) ? d.sessions.length : nested("sessions") };
}
