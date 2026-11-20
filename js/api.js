// Pristup podacima: Supabase kad je podešen, inače demo režim u ovom pregledaču.
import { randomCode, lsGet, lsSet, today, addDays } from "./util.js";
import { DEMO_SEED } from "./demo-data.js";

function err(code, message) { var e = new Error(message || code); e.code = code; return e; }

function mapAuthError(e) {
  var m = String((e && e.message) || "").toLowerCase();
  if (m.indexOf("invalid login") >= 0 || m.indexOf("invalid credentials") >= 0) return err("bad_login");
  if (m.indexOf("already registered") >= 0 || m.indexOf("already exists") >= 0) return err("exists");
  if (m.indexOf("password") >= 0 && m.indexOf("least") >= 0) return err("pw_short");
  if (m.indexOf("email") >= 0 && (m.indexOf("invalid") >= 0 || m.indexOf("valid") >= 0)) return err("bad_email");
  if (m.indexOf("security purposes") >= 0 || m.indexOf("rate limit") >= 0 || (e && e.status === 429)) return err("rate");
  if (m.indexOf("different from the old") >= 0 || m.indexOf("same password") >= 0) return err("same_pw");
  return err("generic", e && e.message);
}

export function createApi(cfg) {
  if (cfg && cfg.artifact) return artApi(cfg);
  if (cfg && cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase && window.supabase.createClient) return supaApi(cfg);
  return demoApi();
}

/* ======================= Supabase ======================= */
function supaApi(cfg) {
  var sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" }
  });
  function unwrap(res) { if (res.error) throw err(res.error.code || "db", res.error.message); return res.data; }

  return {
    mode: "supabase",
    async session() { var r = await sb.auth.getSession(); return r.data.session; },
    onAuth(cb) { sb.auth.onAuthStateChange(function (event) { cb(event); }); },
    async signIn(email, password) {
      var r = await sb.auth.signInWithPassword({ email: email, password: password });
      if (r.error) throw mapAuthError(r.error);
      return r.data.session;
    },
    async signUp(email, password) {
      var r = await sb.auth.signUp({ email: email, password: password });
      if (r.error) throw mapAuthError(r.error);
      if (r.data && r.data.user && Array.isArray(r.data.user.identities) && r.data.user.identities.length === 0) throw err("exists");
      if (!r.data.session) throw err("confirm_required", "Email confirmation is on in Supabase. Turn it off (see README).");
      return r.data.session;
    },
    async signOut() { await sb.auth.signOut(); },
    // Link za novu lozinku stiže e-poštom (Resend preko Supabase SMTP); vodi nazad u aplikaciju.
    async resetPassword(email, redirectTo) {
      var r = await sb.auth.resetPasswordForEmail(email, { redirectTo: redirectTo });
      if (r.error) throw mapAuthError(r.error);
    },
    async updatePassword(pw) {
      var r = await sb.auth.updateUser({ password: pw });
      if (r.error) throw mapAuthError(r.error);
    },
    async whoami() {
      var s = (await sb.auth.getSession()).data.session;
      if (!s) return null;
      var uid = s.user.id;
      var a = await sb.from("admins").select("user_id").eq("user_id", uid).maybeSingle();
      var m = await sb.from("client_members").select("client_id").eq("user_id", uid).maybeSingle();
      return { userId: uid, email: s.user.email, isAdmin: !!(a.data), clientId: m.data ? m.data.client_id : null };
    },
    async claimInvite(code) {
      var r = await sb.rpc("claim_invite", { code: code });
      if (r.error) throw err(/invalid_code/.test(r.error.message) ? "bad_code" : "generic", r.error.message);
      return r.data;
    },
    async setMyLang(l) { await sb.rpc("set_my_lang", { l: l }); },

    async getClient(id) { return unwrap(await sb.from("clients").select("*").eq("id", id).maybeSingle()); },
    async getIntake(cid) { return unwrap(await sb.from("intakes").select("*").eq("client_id", cid).maybeSingle()); },
    async saveIntake(cid, patch) {
      return unwrap(await sb.from("intakes").upsert(Object.assign({ client_id: cid }, patch)).select().single());
    },
    async getPlan(cid) { return unwrap(await sb.from("plans").select("*").eq("client_id", cid).maybeSingle()); },
    async listDaily(cid) {
      return unwrap(await sb.from("daily_logs").select("day,data,updated_at").eq("client_id", cid).order("day", { ascending: true }));
    },
    async saveDaily(cid, day, data) {
      return unwrap(await sb.from("daily_logs").upsert({ client_id: cid, day: day, data: data }).select("day").single());
    },
    async listSessions(cid) {
      return unwrap(await sb.from("sessions").select("day,workout,data,updated_at").eq("client_id", cid));
    },
    async saveSession(cid, day, workout, data) {
      return unwrap(await sb.from("sessions").upsert({ client_id: cid, day: day, workout: workout, data: data }).select("day").single());
    },
    async listWeeks(cid) {
      return unwrap(await sb.from("week_plans").select("week,days,updated_at").eq("client_id", cid));
    },
    // meniji sa posla (samo trener)
    async listWorkMenus() {
      var rows = unwrap(await sb.from("trainer_files").select("key,data,updated_at").like("key", "menu:%"));
      return rows.map(function (r) { return Object.assign({}, r.data, { id: r.key.slice(5), savedAt: r.updated_at }); });
    },
    async saveWorkMenu(menu) {
      return unwrap(await sb.from("trainer_files").upsert({ key: "menu:" + menu.id, data: menu }).select("key").single());
    },
    async saveWeek(cid, week, days) {
      return unwrap(await sb.from("week_plans").upsert({ client_id: cid, week: week, days: days }).select("week").single());
    },

    // podešavanja, kontakt trenera, notifikacije (notifications.sql)
    async getMySettings() {
      var s = (await sb.auth.getSession()).data.session; if (!s) return {};
      var d = unwrap(await sb.from("user_settings").select("data").eq("user_id", s.user.id).maybeSingle());
      return d ? d.data || {} : {};
    },
    async saveMySettings(data) {
      var s = (await sb.auth.getSession()).data.session; if (!s) throw err("auth");
      unwrap(await sb.from("user_settings").upsert({ user_id: s.user.id, data: data }).select("user_id").single());
    },
    async getAppSetting(key) { var d = unwrap(await sb.from("app_settings").select("data").eq("key", key).maybeSingle()); return d ? d.data : null; },
    async saveAppSetting(key, data) { unwrap(await sb.from("app_settings").upsert({ key: key, data: data }).select("key").single()); },
    async savePushSub(sub) {
      var r = await sb.rpc("save_push_sub", { p_endpoint: sub.endpoint, p_p256dh: sub.keys.p256dh, p_auth: sub.keys.auth, p_ua: navigator.userAgent.slice(0, 200) });
      if (r.error) throw err("db", r.error.message);
    },
    async deletePushSub(endpoint) { unwrap(await sb.from("push_subs").delete().eq("endpoint", endpoint)); },
    async setReminders(items) { var r = await sb.rpc("set_reminders", { p_items: items }); if (r.error) throw err("db", r.error.message); return r.data; },
    async testReminder(title, body) { var r = await sb.rpc("test_reminder", { p_title: title, p_body: body }); if (r.error) throw err(/rate/.test(r.error.message) ? "rate" : "db", r.error.message); },
    async notifyClient(cid, title, body) { var r = await sb.rpc("notify_client", { p_client: cid, p_title: title, p_body: body }); if (r.error) throw err("db", r.error.message); return r.data; },

    // trener
    async listClients() {
      var clients = unwrap(await sb.from("clients").select("*").order("created_at", { ascending: false }));
      var intakes = unwrap(await sb.from("intakes").select("client_id,answers,progress,submitted_at,updated_at,seen_by_trainer_at"));
      var plans = unwrap(await sb.from("plans").select("client_id,published,updated_at"));
      var since = addDays(today(), -60);
      var logs = unwrap(await sb.from("daily_logs").select("client_id,day").gte("day", since).order("day", { ascending: false }).limit(2000));
      var last = {};
      logs.forEach(function (r) { if (!last[r.client_id]) last[r.client_id] = r.day; });
      var im = {}, pm = {};
      intakes.forEach(function (r) { im[r.client_id] = r; });
      plans.forEach(function (r) { pm[r.client_id] = r; });
      return clients.map(function (c) { return Object.assign({}, c, { intake: im[c.id] || null, plan: pm[c.id] || null, lastLog: last[c.id] || null }); });
    },
    async createClient(fields) {
      for (var i = 0; i < 4; i++) {
        var r = await sb.from("clients").insert({ name: fields.name, lang: fields.lang || "sr", invite_code: randomCode(8) }).select().single();
        if (!r.error) return r.data;
        if (!/duplicate|unique/i.test(r.error.message)) throw err("db", r.error.message);
      }
      throw err("db", "code collision");
    },
    async updateClient(id, patch) { return unwrap(await sb.from("clients").update(patch).eq("id", id).select().single()); },
    async deleteClient(id) { unwrap(await sb.from("clients").delete().eq("id", id)); },
    async newInviteCode(id) {
      for (var i = 0; i < 4; i++) {
        var r = await sb.from("clients").update({ invite_code: randomCode(8) }).eq("id", id).select().single();
        if (!r.error) return r.data;
        if (!/duplicate|unique/i.test(r.error.message)) throw err("db", r.error.message);
      }
      throw err("db", "code collision");
    },
    async listMembers(cid) { return unwrap(await sb.from("client_members").select("user_id,email,created_at").eq("client_id", cid)); },
    async removeMember(uid) { unwrap(await sb.from("client_members").delete().eq("user_id", uid)); },
    async getPrivate(cid) { var d = unwrap(await sb.from("client_private").select("note").eq("client_id", cid).maybeSingle()); return d ? d.note : ""; },
    async savePrivate(cid, note) { unwrap(await sb.from("client_private").upsert({ client_id: cid, note: note })); },
    async savePlan(cid, data, published) {
      return unwrap(await sb.from("plans").upsert({ client_id: cid, data: data, published: !!published }).select().single());
    },
    async markSeen(cid) { unwrap(await sb.from("intakes").update({ seen_by_trainer_at: new Date().toISOString() }).eq("client_id", cid)); },
    // istorija plana (plan_versions.sql): prethodne verzije, najnovija prva
    async listPlanVersions(cid) {
      return unwrap(await sb.from("plan_versions").select("id,published,saved_at,plan_updated_at").eq("client_id", cid).order("id", { ascending: false }).limit(50));
    },
    async getPlanVersion(id) { return unwrap(await sb.from("plan_versions").select("id,client_id,data,published,saved_at,plan_updated_at").eq("id", id).maybeSingle()); },
    // rezervna kopija na mejl (funkcija weekly-backup)
    async getBackupStatus() { var d = unwrap(await sb.from("trainer_files").select("data").eq("key", "status:backup").maybeSingle()); return d ? d.data : null; },
    async sendBackupNow() {
      var s = (await sb.auth.getSession()).data.session; if (!s) throw err("auth");
      var r;
      try {
        r = await fetch(cfg.supabaseUrl.replace(/\/$/, "") + "/functions/v1/weekly-backup", { method: "POST", headers: { "Content-Type": "application/json", apikey: cfg.supabaseAnonKey, Authorization: "Bearer " + s.access_token }, body: "{}" });
      } catch (e) { throw err("network"); }
      var body = null; try { body = await r.json(); } catch (e) { body = null; }
      if (r.ok && body && body.ok) return body;
      if (r.status === 404) throw err("no_function");
      if (r.status === 401) throw err("jwt_on");
      if (r.status === 403) throw err("forbidden");
      if (r.status === 429) throw err("rate");
      throw err((body && body.error) || "server", body && body.detail);
    },

    // pregled napretka i rezervna kopija (samo trener, RLS)
    async listPlans() { return unwrap(await sb.from("plans").select("client_id,data,published")); },
    async listAllDaily(since) {
      return fetchAll(function () { return sb.from("daily_logs").select("client_id,day,data").gte("day", since).order("day").order("client_id"); });
    },
    // Nedeljni izbori svih klijenata (za brojanje planiranih treninga u napretku).
    async listAllWeeks(since) {
      return fetchAll(function () { return sb.from("week_plans").select("client_id,week,days").gte("week", since).order("week").order("client_id"); });
    },
    async listAllSessions(since) {
      return fetchAll(function () { return sb.from("sessions").select("client_id,day,workout,data").gte("day", since).order("day").order("client_id").order("workout"); });
    },
    async exportAll() {
      var T = { admins: ["user_id"], clients: ["id"], client_private: ["client_id"], client_members: ["user_id"], intakes: ["client_id"], plans: ["client_id"], daily_logs: ["client_id", "day"], sessions: ["client_id", "day", "workout"], week_plans: ["client_id", "week"] };
      T.trainer_files = ["key"]; T.app_settings = ["key"]; T.plan_versions = ["id"];
      var OPTIONAL = ["week_plans", "trainer_files", "app_settings", "plan_versions"], out = {};
      for (var name in T) {
        try { out[name] = await fetchAll(function () { var q = sb.from(name).select("*"); T[name].forEach(function (c) { q = q.order(c); }); return q; }); }
        catch (e) { if (OPTIONAL.indexOf(name) >= 0) out[name] = null; else throw e; }   // tabela možda još nije napravljena
      }
      return out;
    }
  };
  // PostgREST vraća najviše 1000 redova po zahtevu, pa se čita u delovima.
  async function fetchAll(make) {
    var out = [], step = 1000;
    for (var i = 0; i < 100000; i += step) {
      var r = unwrap(await make().range(i, i + step - 1));
      out = out.concat(r); if (r.length < step) break;
    }
    return out;
  }
}

/* ======================= Claude artefakt ======================= */
// Probna verzija u Claude artefaktu (trenerov lični plan): jedan korisnik, bez prijave,
// podaci u bazi artefakta (claude.use("db")). Kolekcije: <p>meta (plan, client, intake, settings),
// <p>daily, <p>sessions, <p>weeks; <p> je "rk_" da se ne mešaju sa starim podacima artefakta.
function artApi(cfg) {
  var PFX = cfg.artifactPrefix || "rk_", ME = "me", dbP = null;
  function db() {
    if (dbP) return dbP;
    dbP = new Promise(function (res, rej) {
      var c = window.claude;
      if (!c || typeof c.use !== "function") { rej(err("no_db", NO_DB)); return; }
      var to = setTimeout(function () { rej(err("no_db", NO_DB)); }, 15000);
      Promise.resolve(c.use("db")).then(function (d) { clearTimeout(to); if (d) res(d); else rej(err("no_db", NO_DB)); },
        function (e) { clearTimeout(to); rej(err("no_db", (e && e.message) || NO_DB)); });
    });
    dbP.catch(function () { dbP = null; });   // sledeći poziv pokušava ponovo
    return dbP;
  }
  var NO_DB = "Baza artefakta nije dostupna. Otvori stranicu na claude.ai dok si prijavljen.";
  function clone(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }
  function nowIso() { return new Date().toISOString(); }
  function dbErr(e) { return e && e.code === "no_db" ? e : err((e && e.code) || "db", (e && e.message) || String(e)); }
  async function getDoc(path) { try { var s = await (await db()).doc(PFX + path).get(); return s.exists ? s.data() : null; } catch (e) { throw dbErr(e); } }
  async function setDoc(path, data) { try { await (await db()).doc(PFX + path).set(clone(data)); } catch (e) { throw dbErr(e); } }
  async function listCol(col) {
    try { var s = await (await db()).collection(PFX + col).get(); return s.docs.filter(function (d) { return d.exists; }).map(function (d) { return { id: d.id, data: d.data() }; }); }
    catch (e) { throw dbErr(e); }
  }
  function guard(cid) { if (cid !== ME) throw err("forbidden"); }
  var unsupported = function () { return Promise.reject(err("unsupported")); };
  // Jedan upis u isti dokument u isto vreme (pravilo baze artefakta).
  var docQ = {};
  function queued(path, fn) { var run = (docQ[path] || Promise.resolve()).catch(function () {}).then(fn); docQ[path] = run; return run; }

  return {
    mode: "artifact",
    async session() { return { user: { id: ME } }; },
    onAuth() { /* nema prijave */ },
    async signIn() { return { user: { id: ME } }; },
    async signUp() { throw err("unsupported"); },
    async signOut() { /* nema odjave u artefaktu */ },
    async resetPassword() { throw err("unsupported"); },
    updatePassword: unsupported,
    async whoami() { return { userId: ME, email: null, isAdmin: false, clientId: ME }; },
    async claimInvite() { return ME; },
    async setMyLang(l) { var c = (await getDoc("meta/client")) || {}; c.lang = l; return queued("meta/client", function () { return setDoc("meta/client", c); }); },

    async getClient(id) { guard(id); var c = await getDoc("meta/client"); return Object.assign({ id: ME, name: "", lang: "sr", sections: {} }, c || {}, { id: ME }); },
    async getIntake(cid) { guard(cid); return clone(await getDoc("meta/intake")); },
    async saveIntake(cid, patch) {
      guard(cid);
      return queued("meta/intake", async function () {
        var cur = (await getDoc("meta/intake")) || { client_id: ME, answers: {}, progress: {}, submitted_at: null };
        var touched = ("answers" in patch) || ("progress" in patch) || ("submitted_at" in patch);
        cur = Object.assign(cur, clone(patch)); if (touched) cur.updated_at = nowIso();
        await setDoc("meta/intake", cur); return clone(cur);
      });
    },
    async getPlan(cid) { guard(cid); var p = await getDoc("meta/plan"); return p ? { client_id: ME, data: p.data || {}, published: p.published !== false, updated_at: p.updated_at || null } : null; },
    // Claude menja plan iz razgovora (rk_meta/plan); otvorena stranica to vidi bez ponovnog učitavanja.
    onPlanChange(cb) {
      var last;
      db().then(function (d) {
        d.doc(PFX + "meta/plan").onSnapshot(function (s) {
          var u = s.exists ? (s.data() || {}).updated_at || "" : "";
          if (last !== undefined && u !== last) cb(); last = u;
        }, function () { /* bez obaveštenja; plan se vidi pri sledećem otvaranju */ });
      }, function () {});
    },
    async listDaily(cid) { guard(cid); return (await listCol("daily")).sort(function (a, b) { return a.id.localeCompare(b.id); }).map(function (d) { return { day: d.id, data: d.data }; }); },
    async saveDaily(cid, day, data) { guard(cid); await queued("daily/" + day, function () { return setDoc("daily/" + day, data); }); return { day: day }; },
    async listWeeks(cid) { guard(cid); return (await listCol("weeks")).map(function (d) { return { week: d.id, days: (d.data || {}).days || {} }; }); },
    async saveWeek(cid, week, days) { guard(cid); await queued("weeks/" + week, function () { return setDoc("weeks/" + week, { days: days }); }); return { week: week }; },
    async listSessions(cid) { guard(cid); return (await listCol("sessions")).map(function (d) { return d.data; }).filter(function (x) { return x && x.day && x.workout; }); },
    async saveSession(cid, day, workout, data) {
      guard(cid); var k = "sessions/" + day + "_" + workout;
      await queued(k, function () { return setDoc(k, { day: day, workout: workout, data: data, updated_at: nowIso() }); }); return { day: day };
    },
    async getMySettings() { return clone((await getDoc("meta/settings")) || {}); },
    async saveMySettings(data) { await queued("meta/settings", function () { return setDoc("meta/settings", data); }); },
    async getAppSetting() { return null; },
    savePushSub: unsupported, deletePushSub: unsupported, testReminder: unsupported
  };
}

/* ======================= Demo (localStorage) ======================= */
var DEMO_KEY = "rekomp-demo-v2";

function demoApi() {
  function load() {
    var s = lsGet(DEMO_KEY);
    if (!s || !s.clients) { s = JSON.parse(JSON.stringify(DEMO_SEED)); lsSet(DEMO_KEY, s); }
    return s;
  }
  function store(s) { lsSet(DEMO_KEY, s); }
  function nowIso() { return new Date().toISOString(); }
  function me(s) { return s.session ? s.users.filter(function (u) { return u.id === s.session; })[0] : null; }
  function memberOf(s, uid) { var m = s.members.filter(function (x) { return x.user_id === uid; })[0]; return m ? m.client_id : null; }
  function isAdmin(s, uid) { return s.admins.indexOf(uid) >= 0; }
  function guardClient(s, cid) {
    var u = me(s); if (!u) throw err("auth");
    if (!isAdmin(s, u.id) && memberOf(s, u.id) !== cid) throw err("forbidden");
  }
  function guardAdmin(s) { var u = me(s); if (!u || !isAdmin(s, u.id)) throw err("forbidden"); }
  function clone(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }
  function withoutNotes(d) { var c = Object.assign({}, d || {}); delete c.notes; return c; }
  var listeners = [];
  function emit(ev) { listeners.forEach(function (cb) { cb(ev); }); }

  return {
    mode: "demo",
    async session() { var s = load(); return me(s) ? { user: me(s) } : null; },
    onAuth(cb) { listeners.push(cb); },
    async demoEnter(role) {
      var s = load(); s.session = role === "trainer" ? "demo-trainer" : "demo-client"; store(s); emit("SIGNED_IN");
    },
    demoReset() { lsSet(DEMO_KEY, null); try { localStorage.removeItem(DEMO_KEY); } catch (e) { /* ignore */ } },
    async signIn(email, password) {
      var s = load();
      var u = s.users.filter(function (x) { return x.email === String(email).toLowerCase() && x.password === password; })[0];
      if (!u) throw err("bad_login");
      s.session = u.id; store(s); emit("SIGNED_IN"); return { user: u };
    },
    async signUp(email, password) {
      var s = load(); email = String(email).toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) throw err("bad_email");
      if (String(password).length < 8) throw err("pw_short");
      if (s.users.some(function (x) { return x.email === email; })) throw err("exists");
      var u = { id: "u-" + randomCode(10).toLowerCase(), email: email, password: password };
      s.users.push(u); s.session = u.id; store(s); emit("SIGNED_IN"); return { user: u };
    },
    async signOut() { var s = load(); s.session = null; store(s); emit("SIGNED_OUT"); },
    async resetPassword() { /* demo: e-pošta se ne šalje */ },
    async updatePassword(pw) { var s = load(), u = me(s); if (u) { u.password = pw; store(s); } },
    async whoami() {
      var s = load(), u = me(s); if (!u) return null;
      return { userId: u.id, email: u.email, isAdmin: isAdmin(s, u.id), clientId: memberOf(s, u.id) };
    },
    async claimInvite(code) {
      var s = load(), u = me(s); if (!u) throw err("auth");
      code = String(code || "").trim().toUpperCase();
      var c = s.clients.filter(function (x) { return x.invite_code === code && x.status !== "archived"; })[0];
      if (!c) throw err("bad_code");
      s.members = s.members.filter(function (m) { return m.user_id !== u.id; });
      s.members.push({ user_id: u.id, client_id: c.id, email: u.email, created_at: nowIso() });
      c.invite_code = null; if (c.status === "invited") c.status = "intake";
      if (!s.intakes[c.id]) s.intakes[c.id] = { client_id: c.id, answers: {}, progress: {}, submitted_at: null, updated_at: nowIso(), seen_by_trainer_at: null };
      store(s); return c.id;
    },
    async setMyLang(l) { var s = load(), u = me(s); var cid = u && memberOf(s, u.id); var c = s.clients.filter(function (x) { return x.id === cid; })[0]; if (c) { c.lang = l; store(s); } },

    async getClient(id) { var s = load(); guardClient(s, id); return clone(s.clients.filter(function (c) { return c.id === id; })[0] || null); },
    async getIntake(cid) { var s = load(); guardClient(s, cid); return clone(s.intakes[cid] || null); },
    async saveIntake(cid, patch) {
      var s = load(); guardClient(s, cid);
      var cur = s.intakes[cid] || { client_id: cid, answers: {}, progress: {}, submitted_at: null, seen_by_trainer_at: null };
      var touched = ("answers" in patch) || ("progress" in patch) || ("submitted_at" in patch);
      cur = Object.assign(cur, patch); if (touched) cur.updated_at = nowIso();
      s.intakes[cid] = cur;
      if (cur.submitted_at) { var c = s.clients.filter(function (x) { return x.id === cid; })[0]; if (c && (c.status === "invited" || c.status === "intake")) c.status = "review"; }
      store(s); return clone(cur);
    },
    async getPlan(cid) {
      var s = load(); guardClient(s, cid);
      var p = s.plans[cid]; var u = me(s);
      if (p && !p.published && !isAdmin(s, u.id)) return null;
      return clone(p || null);
    },
    async listDaily(cid) {
      var s = load(); guardClient(s, cid);
      var m = s.daily[cid] || {};
      return Object.keys(m).sort().map(function (d) { return { day: d, data: clone(m[d]) }; });
    },
    async saveDaily(cid, day, data) { var s = load(); guardClient(s, cid); s.daily[cid] = s.daily[cid] || {}; s.daily[cid][day] = clone(data); store(s); return { day: day }; },
    async listWeeks(cid) {
      var s = load(); guardClient(s, cid);
      var m = (s.weeks || {})[cid] || {};
      return Object.keys(m).sort().map(function (w) { return { week: w, days: clone(m[w]) }; });
    },
    async saveWeek(cid, week, days) { var s = load(); guardClient(s, cid); s.weeks = s.weeks || {}; s.weeks[cid] = s.weeks[cid] || {}; s.weeks[cid][week] = clone(days); store(s); return { week: week }; },
    async getMySettings() { var s = load(), u = me(s); if (!u) return {}; return clone((s.settings || {})[u.id] || {}); },
    async saveMySettings(data) { var s = load(), u = me(s); if (!u) throw err("auth"); s.settings = s.settings || {}; s.settings[u.id] = clone(data); store(s); },
    async getAppSetting(key) { var s = load(), u = me(s); if (!u || (!isAdmin(s, u.id) && !memberOf(s, u.id))) return null; return clone((s.app || {})[key] || null); },
    async saveAppSetting(key, data) { var s = load(); guardAdmin(s); s.app = s.app || {}; s.app[key] = clone(data); store(s); },
    async savePushSub(sub) { var s = load(), u = me(s); if (!u) throw err("auth"); s.subs = (s.subs || []).filter(function (x) { return x.endpoint !== sub.endpoint; }); s.subs.push({ endpoint: sub.endpoint, user_id: u.id }); store(s); },
    async deletePushSub(endpoint) { var s = load(); s.subs = (s.subs || []).filter(function (x) { return x.endpoint !== endpoint; }); store(s); },
    async setReminders(items) { var s = load(), u = me(s); if (!u) throw err("auth"); var cid = memberOf(s, u.id); if (!cid) throw err("no_client"); s.reminders = s.reminders || {}; s.reminders[u.id] = clone(items); store(s); return items.length; },
    async testReminder() { var s = load(), u = me(s); if (!u) throw err("auth"); s.tests = (s.tests || 0) + 1; store(s); },
    async notifyClient(cid, title, body) { var s = load(); guardAdmin(s); s.notices = s.notices || []; s.notices.push({ client_id: cid, title: title, body: body, at: nowIso() }); store(s); return s.members.filter(function (m) { return m.client_id === cid; }).length; },
    async listWorkMenus() { var s = load(); guardAdmin(s); var m = s.menus || {}; return Object.keys(m).map(function (k) { return clone(m[k]); }); },
    async saveWorkMenu(menu) { var s = load(); guardAdmin(s); s.menus = s.menus || {}; s.menus[menu.id] = Object.assign(clone(menu), { savedAt: nowIso() }); store(s); return { key: "menu:" + menu.id }; },
    async listSessions(cid) {
      var s = load(); guardClient(s, cid);
      var m = s.sessions[cid] || {};
      return Object.keys(m).map(function (k) { return clone(m[k]); });
    },
    async saveSession(cid, day, workout, data) {
      var s = load(); guardClient(s, cid); s.sessions[cid] = s.sessions[cid] || {};
      s.sessions[cid][day + "_" + workout] = { day: day, workout: workout, data: clone(data), updated_at: nowIso() }; store(s); return { day: day };
    },

    async listClients() {
      var s = load(); guardAdmin(s);
      return s.clients.slice().sort(function (a, b) { return (b.created_at || "").localeCompare(a.created_at || ""); }).map(function (c) {
        var days = Object.keys(s.daily[c.id] || {}).sort();
        var p = s.plans[c.id];
        return Object.assign(clone(c), { intake: clone(s.intakes[c.id] || null), plan: p ? { client_id: c.id, published: p.published, updated_at: p.updated_at } : null, lastLog: days.length ? days[days.length - 1] : null });
      });
    },
    async createClient(f) {
      var s = load(); guardAdmin(s);
      var c = { id: "c-" + randomCode(10).toLowerCase(), name: f.name, lang: f.lang || "sr", invite_code: randomCode(8), status: "invited", sections: {}, created_at: nowIso(), updated_at: nowIso() };
      s.clients.push(c); store(s); return clone(c);
    },
    async updateClient(id, patch) {
      var s = load(); guardAdmin(s);
      var c = s.clients.filter(function (x) { return x.id === id; })[0]; Object.assign(c, patch, { updated_at: nowIso() }); store(s); return clone(c);
    },
    async deleteClient(id) {
      var s = load(); guardAdmin(s);
      s.clients = s.clients.filter(function (x) { return x.id !== id; });
      s.members = s.members.filter(function (m) { return m.client_id !== id; });
      delete s.intakes[id]; delete s.plans[id]; delete s.daily[id]; delete s.sessions[id]; delete s.private[id]; if (s.weeks) delete s.weeks[id]; if (s.planVersions) delete s.planVersions[id];
      store(s);
    },
    async newInviteCode(id) { return this.updateClient(id, { invite_code: randomCode(8) }); },
    async listMembers(cid) { var s = load(); guardAdmin(s); return clone(s.members.filter(function (m) { return m.client_id === cid; })); },
    async removeMember(uid) { var s = load(); guardAdmin(s); s.members = s.members.filter(function (m) { return m.user_id !== uid; }); store(s); },
    async getPrivate(cid) { var s = load(); guardAdmin(s); return s.private[cid] || ""; },
    async savePrivate(cid, note) { var s = load(); guardAdmin(s); s.private[cid] = note; store(s); },
    async savePlan(cid, data, published) {
      var s = load(); guardAdmin(s);
      var old = s.plans[cid];
      // kao okidač u plan_versions.sql: prethodna verzija se čuva kad se promeni plan (poruke se ne računaju)
      if (old && JSON.stringify(withoutNotes(old.data)) !== JSON.stringify(withoutNotes(data))) {
        s.planVersions = s.planVersions || {}; s.nextVersion = (s.nextVersion || 0) + 1;
        var list = (s.planVersions[cid] || []).concat([{ id: s.nextVersion, client_id: cid, data: clone(old.data), published: !!old.published, saved_at: nowIso(), plan_updated_at: old.updated_at || null }]);
        s.planVersions[cid] = list.slice(-50);
      }
      s.plans[cid] = { client_id: cid, data: clone(data), published: !!published, updated_at: nowIso() }; store(s); return clone(s.plans[cid]);
    },
    async listPlanVersions(cid) {
      var s = load(); guardAdmin(s);
      return ((s.planVersions || {})[cid] || []).slice().reverse().map(function (v) { return { id: v.id, published: v.published, saved_at: v.saved_at, plan_updated_at: v.plan_updated_at }; });
    },
    async getPlanVersion(id) {
      var s = load(), hit = null; guardAdmin(s);
      Object.keys(s.planVersions || {}).forEach(function (cid) { s.planVersions[cid].forEach(function (v) { if (v.id === Number(id)) hit = v; }); });
      return clone(hit);
    },
    async getBackupStatus() { var s = load(); guardAdmin(s); return clone(s.backupStatus || null); },
    async sendBackupNow() {
      var s = load(); guardAdmin(s);
      s.backupStatus = { at: nowIso(), ok: true, source: "manual", bytes: 0, demo: true }; store(s);
      return { ok: true, demo: true };
    },
    async markSeen(cid) { var s = load(); guardAdmin(s); if (s.intakes[cid]) { s.intakes[cid].seen_by_trainer_at = nowIso(); store(s); } },
    async listPlans() { var s = load(); guardAdmin(s); return Object.keys(s.plans).map(function (k) { var p = s.plans[k]; return { client_id: k, data: clone(p.data), published: p.published }; }); },
    async listAllDaily(since) {
      var s = load(), out = []; guardAdmin(s);
      Object.keys(s.daily).forEach(function (cid) { Object.keys(s.daily[cid]).forEach(function (d) { if (d >= since) out.push({ client_id: cid, day: d, data: clone(s.daily[cid][d]) }); }); });
      return out;
    },
    async listAllWeeks(since) {
      var s = load(), out = []; guardAdmin(s);
      Object.keys(s.weeks || {}).forEach(function (cid) { Object.keys(s.weeks[cid]).forEach(function (w) { if (w >= since) out.push({ client_id: cid, week: w, days: clone(s.weeks[cid][w]) }); }); });
      return out;
    },
    async listAllSessions(since) {
      var s = load(), out = []; guardAdmin(s);
      Object.keys(s.sessions).forEach(function (cid) { Object.keys(s.sessions[cid]).forEach(function (k) { var x = s.sessions[cid][k]; if (x.day >= since) out.push({ client_id: cid, day: x.day, workout: x.workout, data: clone(x.data) }); }); });
      return out;
    },
    async exportAll() {
      var s = load(); guardAdmin(s); var c = clone(s);
      c.users = (c.users || []).map(function (u) { return { id: u.id, email: u.email }; }); delete c.session;
      return c;
    }
  };
}
