-- ReKomp: baza za trenera i klijente
-- Pokreni ceo fajl jednom u Supabase: SQL Editor → New query → nalepi → Run.
-- Bezbedno je pokrenuti ga ponovo: ne briše podatke.

create extension if not exists pgcrypto;

-- ---------- Tabele ----------

-- Treneri (admin pristup). Dodaješ se ručno, jednom (vidi README).
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Klijenti
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lang text not null default 'sr' check (lang in ('sr', 'en', 'ru')),
  invite_code text unique,
  status text not null default 'invited' check (status in ('invited', 'intake', 'review', 'active', 'archived')),
  sections jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Privatne beleške trenera o klijentu (klijent ih ne vidi)
create table if not exists public.client_private (
  client_id uuid primary key references public.clients(id) on delete cascade,
  note text not null default '',
  updated_at timestamptz not null default now()
);

-- Veza nalog → klijent (jedan nalog pripada jednom klijentu)
create table if not exists public.client_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);
create index if not exists client_members_client_idx on public.client_members (client_id);

-- Anketa
create table if not exists public.intakes (
  client_id uuid primary key references public.clients(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  progress jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  seen_by_trainer_at timestamptz
);

-- Plan klijenta (pravi ga trener). Klijent ga vidi tek kad je objavljen.
create table if not exists public.plans (
  client_id uuid primary key references public.clients(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Dnevni unosi klijenta (težina, san, bol, obroci…)
create table if not exists public.daily_logs (
  client_id uuid not null references public.clients(id) on delete cascade,
  day date not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (client_id, day)
);

-- Upisani treninzi
create table if not exists public.sessions (
  client_id uuid not null references public.clients(id) on delete cascade,
  day date not null,
  workout text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (client_id, day, workout)
);

-- ---------- Pomoćne funkcije ----------

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.my_client_id() returns uuid
language sql stable security definer set search_path = public as $$
  select client_id from public.client_members where user_id = auth.uid();
$$;

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Klijent unosi pozivni kod → nalog se vezuje za klijenta, kod se troši.
create or replace function public.claim_invite(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
  uemail text;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  select id into cid from public.clients
    where invite_code = upper(trim(code)) and status <> 'archived';
  if cid is null then
    raise exception 'invalid_code';
  end if;
  select email into uemail from auth.users where id = auth.uid();
  insert into public.client_members (user_id, client_id, email)
    values (auth.uid(), cid, uemail)
    on conflict (user_id) do update set client_id = excluded.client_id, email = excluded.email;
  update public.clients
    set invite_code = null,
        status = case when status = 'invited' then 'intake' else status end
    where id = cid;
  insert into public.intakes (client_id) values (cid) on conflict do nothing;
  return cid;
end $$;

-- Klijent menja jezik aplikacije.
create or replace function public.set_my_lang(l text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if l not in ('sr', 'en', 'ru') then
    raise exception 'invalid_lang';
  end if;
  update public.clients set lang = l where id = public.my_client_id();
end $$;

-- Kad klijent pošalje anketu, status prelazi u „anketa stigla“.
create or replace function public.on_intake_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.submitted_at is not null and (tg_op = 'INSERT' or old.submitted_at is null) then
    update public.clients set status = 'review'
      where id = new.client_id and status in ('invited', 'intake');
  end if;
  return new;
end $$;

-- ---------- Okidači ----------

drop trigger if exists clients_updated on public.clients;
create trigger clients_updated before update on public.clients
  for each row execute function public.set_updated_at();

drop trigger if exists private_updated on public.client_private;
create trigger private_updated before update on public.client_private
  for each row execute function public.set_updated_at();

drop trigger if exists plans_updated on public.plans;
create trigger plans_updated before update on public.plans
  for each row execute function public.set_updated_at();

drop trigger if exists daily_updated on public.daily_logs;
create trigger daily_updated before update on public.daily_logs
  for each row execute function public.set_updated_at();

drop trigger if exists sessions_updated on public.sessions;
create trigger sessions_updated before update on public.sessions
  for each row execute function public.set_updated_at();

-- Vreme izmene ankete se menja samo kad klijent promeni odgovore,
-- ne kad trener označi da je pregledao.
create or replace function public.intake_touch() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT'
     or new.answers is distinct from old.answers
     or new.progress is distinct from old.progress
     or new.submitted_at is distinct from old.submitted_at then
    new.updated_at := now();
  end if;
  return new;
end $$;

drop trigger if exists intakes_touch on public.intakes;
create trigger intakes_touch before insert or update on public.intakes
  for each row execute function public.intake_touch();

drop trigger if exists intakes_status on public.intakes;
create trigger intakes_status after insert or update on public.intakes
  for each row execute function public.on_intake_change();

-- ---------- Pravila pristupa (RLS) ----------
-- Trener vidi i menja sve. Klijent vidi samo svoje, a plan tek kad je objavljen.

alter table public.admins enable row level security;
alter table public.clients enable row level security;
alter table public.client_private enable row level security;
alter table public.client_members enable row level security;
alter table public.intakes enable row level security;
alter table public.plans enable row level security;
alter table public.daily_logs enable row level security;
alter table public.sessions enable row level security;

drop policy if exists admins_self on public.admins;
create policy admins_self on public.admins for select using (user_id = auth.uid());

drop policy if exists clients_admin on public.clients;
create policy clients_admin on public.clients for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists clients_member on public.clients;
create policy clients_member on public.clients for select using (id = public.my_client_id());

drop policy if exists private_admin on public.client_private;
create policy private_admin on public.client_private for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists members_admin on public.client_members;
create policy members_admin on public.client_members for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists members_self on public.client_members;
create policy members_self on public.client_members for select using (user_id = auth.uid());

drop policy if exists intakes_admin on public.intakes;
create policy intakes_admin on public.intakes for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists intakes_member_read on public.intakes;
create policy intakes_member_read on public.intakes for select using (client_id = public.my_client_id());
drop policy if exists intakes_member_insert on public.intakes;
create policy intakes_member_insert on public.intakes for insert with check (client_id = public.my_client_id());
drop policy if exists intakes_member_update on public.intakes;
create policy intakes_member_update on public.intakes for update
  using (client_id = public.my_client_id()) with check (client_id = public.my_client_id());

drop policy if exists plans_admin on public.plans;
create policy plans_admin on public.plans for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists plans_member on public.plans;
create policy plans_member on public.plans for select using (client_id = public.my_client_id() and published);

drop policy if exists daily_admin on public.daily_logs;
create policy daily_admin on public.daily_logs for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists daily_member on public.daily_logs;
create policy daily_member on public.daily_logs for all
  using (client_id = public.my_client_id()) with check (client_id = public.my_client_id());

drop policy if exists sessions_admin on public.sessions;
create policy sessions_admin on public.sessions for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists sessions_member on public.sessions;
create policy sessions_member on public.sessions for all
  using (client_id = public.my_client_id()) with check (client_id = public.my_client_id());

-- ---------- Dozvole ----------

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.admins, public.clients, public.client_private, public.client_members,
  public.intakes, public.plans, public.daily_logs, public.sessions
  to authenticated;

revoke all on
  public.admins, public.clients, public.client_private, public.client_members,
  public.intakes, public.plans, public.daily_logs, public.sessions
  from anon;

revoke execute on function public.claim_invite(text) from public, anon;
revoke execute on function public.set_my_lang(text) from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.my_client_id() from public, anon;
grant execute on function public.claim_invite(text) to authenticated;
grant execute on function public.set_my_lang(text) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.my_client_id() to authenticated;

-- Jezik mejlova: vidi supabase/email_lang.sql (isti sadržaj)
create or replace function public.member_lang_sync() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  update auth.users u
     set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('lang', c.lang)
    from public.clients c
   where c.id = new.client_id and u.id = new.user_id;
  return new;
end $$;

drop trigger if exists member_lang on public.client_members;
create trigger member_lang after insert or update of client_id on public.client_members
  for each row execute function public.member_lang_sync();

create or replace function public.client_lang_sync() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  if new.lang is distinct from old.lang then
    update auth.users u
       set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('lang', new.lang)
      from public.client_members m
     where m.client_id = new.id and u.id = m.user_id;
  end if;
  return new;
end $$;

drop trigger if exists client_lang on public.clients;
create trigger client_lang after update of lang on public.clients
  for each row execute function public.client_lang_sync();

revoke execute on function public.member_lang_sync() from public, anon, authenticated;
revoke execute on function public.client_lang_sync() from public, anon, authenticated;

-- postojeći nalozi dobijaju jezik svog klijenta
update auth.users u
   set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('lang', c.lang)
  from public.client_members m
  join public.clients c on c.id = m.client_id
 where u.id = m.user_id;

-- Ispravke po Security Advisoru: vidi supabase/security_fix.sql
alter function public.set_updated_at() set search_path = public;
alter function public.intake_touch() set search_path = public;

-- 2) Trigger funkcije ne treba da se pozivaju preko API-ja (/rest/v1/rpc)
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.intake_touch() from public, anon, authenticated;
revoke execute on function public.on_intake_change() from public, anon, authenticated;
do $$ begin
  if to_regprocedure('public.member_lang_sync()') is not null then
    revoke execute on function public.member_lang_sync() from public, anon, authenticated;
  end if;
  if to_regprocedure('public.client_lang_sync()') is not null then
    revoke execute on function public.client_lang_sync() from public, anon, authenticated;
  end if;
end $$;

-- ---------- Nedeljni raspored klijenta (week_plans.sql) ----------

create table if not exists public.week_plans (
  client_id uuid not null references public.clients(id) on delete cascade,
  week date not null,                         -- ponedeljak te nedelje
  days jsonb not null default '{}'::jsonb,    -- { "2026-11-23": { "work": true, "rhythm": "prva", "workout": "A" }, ... }
  updated_at timestamptz not null default now(),
  primary key (client_id, week)
);

drop trigger if exists week_plans_updated on public.week_plans;
create trigger week_plans_updated before update on public.week_plans
  for each row execute function public.set_updated_at();

alter table public.week_plans enable row level security;

drop policy if exists weeks_admin on public.week_plans;
create policy weeks_admin on public.week_plans for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists weeks_member on public.week_plans;
create policy weeks_member on public.week_plans for all
  using (client_id = public.my_client_id()) with check (client_id = public.my_client_id());

grant select, insert, update, delete on public.week_plans to authenticated;
revoke all on public.week_plans from anon;

-- ---------- Trenerovi fajlovi: meniji sa posla (trainer_files.sql) ----------

create table if not exists public.trainer_files (
  key text primary key,                       -- npr. "menu:mbcare"
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists trainer_files_updated on public.trainer_files;
create trigger trainer_files_updated before update on public.trainer_files
  for each row execute function public.set_updated_at();

alter table public.trainer_files enable row level security;

drop policy if exists trainer_files_admin on public.trainer_files;
create policy trainer_files_admin on public.trainer_files for all using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.trainer_files to authenticated;
revoke all on public.trainer_files from anon;

-- ---------- Podešavanja, kontakt i podsetnici (notifications.sql) ----------

-- ---------- 1) Podešavanja korisnika (podsetnici, tema): svako vidi i menja samo svoja ----------
create table if not exists public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,   -- { "notif": { "on": true, "kinds": { "wake": true, ... }, "lead": 90 }, "theme": "dark" }
  updated_at timestamptz not null default now()
);
drop trigger if exists user_settings_updated on public.user_settings;
create trigger user_settings_updated before update on public.user_settings
  for each row execute function public.set_updated_at();
alter table public.user_settings enable row level security;
drop policy if exists user_settings_own on public.user_settings;
create policy user_settings_own on public.user_settings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- 2) Podešavanja aplikacije koja vide klijenti (kontakt trenera, javni ključ za notifikacije) ----------
create table if not exists public.app_settings (
  key text primary key,                      -- "contact", "push"
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
drop trigger if exists app_settings_updated on public.app_settings;
create trigger app_settings_updated before update on public.app_settings
  for each row execute function public.set_updated_at();
alter table public.app_settings enable row level security;
drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings for select
  using (public.is_admin() or public.my_client_id() is not null);   -- samo trener i povezani klijenti
drop policy if exists app_settings_admin on public.app_settings;
create policy app_settings_admin on public.app_settings for all using (public.is_admin()) with check (public.is_admin());

-- ---------- 3) Pretplate za notifikacije (jedan red po telefonu/pregledaču) ----------
create table if not exists public.push_subs (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  ua text,
  created_at timestamptz not null default now()
);
create index if not exists push_subs_user on public.push_subs (user_id);
alter table public.push_subs enable row level security;
drop policy if exists push_subs_own_read on public.push_subs;
create policy push_subs_own_read on public.push_subs for select using (user_id = auth.uid());
drop policy if exists push_subs_own_delete on public.push_subs;
create policy push_subs_own_delete on public.push_subs for delete using (user_id = auth.uid());

-- Telefon pripada onome ko se poslednji prijavio za notifikacije na njemu.
create or replace function public.save_push_sub(p_endpoint text, p_p256dh text, p_auth text, p_ua text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if p_endpoint !~ '^https://' or length(p_endpoint) > 1000 or length(p_p256dh) > 200 or length(p_auth) > 100 then
    raise exception 'bad_subscription';
  end if;
  delete from public.push_subs where endpoint = p_endpoint;
  insert into public.push_subs (endpoint, user_id, p256dh, auth, ua)
    values (p_endpoint, auth.uid(), p_p256dh, p_auth, left(p_ua, 200));
  -- najviše 5 uređaja po nalogu
  delete from public.push_subs where user_id = auth.uid() and endpoint in (
    select endpoint from public.push_subs where user_id = auth.uid() order by created_at desc offset 5);
end $$;

-- ---------- 4) Zakazani podsetnici ----------
create table if not exists public.reminders (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  kind text not null,            -- wake, pretrain, train, log, meal, cook, coffee, sleep, checkin, weekpick, trainer, test, admin_intake, admin_pain
  day date,                      -- dan u planu (za proveru „već urađeno“)
  ref text,                      -- oznaka treninga ili ponedeljak nedelje
  fire_at timestamptz not null,
  title text not null,
  body text,
  url text,
  sent_at timestamptz,
  status text,                   -- sent, done, off, expired
  created_at timestamptz not null default now()
);
create index if not exists reminders_due on public.reminders (fire_at) where sent_at is null;
create index if not exists reminders_user on public.reminders (user_id);
alter table public.reminders enable row level security;
drop policy if exists reminders_own_read on public.reminders;
create policy reminders_own_read on public.reminders for select using (user_id = auth.uid());

-- Aplikacija klijenta šalje raspored podsetnika za narednih ~14 dana; zamenjuje prethodni.
create or replace function public.set_reminders(p_items jsonb) returns integer
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cid uuid := public.my_client_id();
  n integer;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if cid is null then raise exception 'no_client'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 600 then raise exception 'bad_items'; end if;
  delete from public.reminders
   where user_id = uid and sent_at is null
     and kind in ('wake','pretrain','train','log','meal','cook','coffee','sleep','checkin','weekpick');
  insert into public.reminders (user_id, client_id, kind, day, ref, fire_at, title, body, url)
  select uid, cid, x->>'kind', (x->>'day')::date, left(x->>'ref', 40), (x->>'at')::timestamptz,
         left(x->>'title', 120), left(x->>'body', 300), left(x->>'url', 80)
    from jsonb_array_elements(p_items) x
   where x->>'kind' in ('wake','pretrain','train','log','meal','cook','coffee','sleep','checkin','weekpick')
     and coalesce(x->>'title', '') <> ''
     and (x->>'at')::timestamptz > now()
     and (x->>'at')::timestamptz < now() + interval '16 days';
  get diagnostics n = row_count;
  return n;
end $$;

-- Probna notifikacija (stiže za najviše minut).
create or replace function public.test_reminder(p_title text, p_body text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if exists (select 1 from public.reminders where user_id = auth.uid() and kind = 'test' and created_at > now() - interval '1 minute') then
    raise exception 'rate';
  end if;
  insert into public.reminders (user_id, client_id, kind, fire_at, title, body, url)
    values (auth.uid(), public.my_client_id(), 'test', now(), left(p_title, 120), left(p_body, 300), './');
end $$;

-- Trener šalje obaveštenje klijentu (nov plan, nova poruka).
create or replace function public.notify_client(p_client uuid, p_title text, p_body text) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  insert into public.reminders (user_id, client_id, kind, fire_at, title, body, url)
    select m.user_id, p_client, 'trainer', now(), left(p_title, 120), left(p_body, 300), './#danas'
      from public.client_members m where m.client_id = p_client;
  get diagnostics n = row_count;
  return n;
end $$;

-- Obaveštenja treneru: stigao upitnik, klijent upisao jak bol (6/10 ili više).
create or replace function public.notify_admins_intake() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.submitted_at is not null and (tg_op = 'INSERT' or old.submitted_at is null) then
    insert into public.reminders (user_id, client_id, kind, fire_at, title, body, url)
      select a.user_id, new.client_id, 'admin_intake', now(), 'Stigao je upitnik',
             coalesce((select name from public.clients where id = new.client_id), 'Klijent') || ' je poslao/la upitnik.',
             './#/c/' || new.client_id || '/intake'
        from public.admins a;
  end if;
  return new;
end $$;
drop trigger if exists intakes_notify on public.intakes;
create trigger intakes_notify after insert or update of submitted_at on public.intakes
  for each row execute function public.notify_admins_intake();

create or replace function public.notify_admins_pain() returns trigger
language plpgsql security definer set search_path = public as $$
declare p numeric; op numeric;
begin
  p := case when jsonb_typeof(new.data->'pain') = 'number' then (new.data->>'pain')::numeric end;
  op := case when tg_op = 'UPDATE' and jsonb_typeof(old.data->'pain') = 'number' then (old.data->>'pain')::numeric end;
  if p is not null and p >= 6 and (op is null or op <> p) and new.day >= current_date - 1 then
    insert into public.reminders (user_id, client_id, kind, day, fire_at, title, body, url)
      select a.user_id, new.client_id, 'admin_pain', new.day, now(), 'Bol ' || p || '/10',
             coalesce((select name from public.clients where id = new.client_id), 'Klijent') || ' je upisao/la bol ' || p || '/10.',
             './#/c/' || new.client_id || '/logs'
        from public.admins a;
  end if;
  return new;
end $$;
drop trigger if exists daily_notify on public.daily_logs;
create trigger daily_notify after insert or update of data on public.daily_logs
  for each row execute function public.notify_admins_pain();

-- ---------- 5) Za Edge funkciju (samo service_role) ----------
-- Uzima podsetnike koji su na redu, preskače već urađeno i isključeno, vraća šta treba poslati.
create or replace function public.claim_due_reminders(p_limit integer default 300)
returns table (rid bigint, endpoint text, p256dh text, auth text, title text, body text, url text, kind text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  update public.reminders set sent_at = now(), status = 'expired'
   where sent_at is null and fire_at < now() - interval '20 minutes';
  delete from public.reminders where fire_at < now() - interval '3 days';

  return query
  with due as (
    select r.id, r.user_id, r.client_id, r.kind, r.day, r.ref, r.title, r.body, r.url
      from public.reminders r
     where r.sent_at is null and r.fire_at <= now()
     order by r.fire_at
     limit p_limit
     for update skip locked
  ), judged as (
    select d.*,
      case
        when d.kind = 'test' then 'sent'
        when coalesce(s.data->'notif'->>'on', 'false') <> 'true' then 'off'
        when coalesce((s.data->'notif'->'kinds'->>d.kind)::boolean, d.kind not in ('meal','cook','coffee','sleep')) = false then 'off'
        when d.kind = 'wake' and exists (select 1 from public.daily_logs l
               where l.client_id = d.client_id and l.day = d.day and l.data->>'weight' is not null) then 'done'
        when d.kind = 'checkin' and exists (select 1 from public.daily_logs l
               where l.client_id = d.client_id and l.day = d.day
                 and (l.data->>'weight' is not null or l.data->>'sleep' is not null
                      or exists (select 1 from jsonb_each(coalesce(l.data->'meals', '{}'::jsonb)) m where m.value = 'true'::jsonb))) then 'done'
        when d.kind in ('pretrain','train','log') and exists (select 1 from public.sessions x
               where x.client_id = d.client_id and x.day = d.day and x.workout = d.ref and x.data->'entries' <> '{}'::jsonb) then 'done'
        when d.kind in ('pretrain','train','log') and exists (select 1 from public.daily_logs l
               where l.client_id = d.client_id and l.day = d.day and l.data->>'easy' = 'move') then 'done'
        when d.kind = 'weekpick' and exists (select 1 from public.week_plans w
               where w.client_id = d.client_id and w.week = d.ref::date) then 'done'
        else 'sent'
      end as verdict
      from due d left join public.user_settings s on s.user_id = d.user_id
  ), upd as (
    update public.reminders r set sent_at = now(), status = j.verdict
      from judged j where r.id = j.id
    returning r.id
  )
  select j.id, p.endpoint, p.p256dh, p.auth, j.title, j.body, j.url, j.kind
    from judged j join public.push_subs p on p.user_id = j.user_id
   where j.verdict = 'sent';
end $$;

-- Briše pretplate kojima je istekao rok (telefon odjavljen, aplikacija obrisana).
create or replace function public.drop_push_subs(p_endpoints text[]) returns void
language sql security definer set search_path = public as $$
  delete from public.push_subs where endpoint = any(p_endpoints);
$$;

-- ---------- Dozvole ----------
grant select, insert, update, delete on public.user_settings to authenticated;
grant select, insert, update, delete on public.app_settings to authenticated;
grant select, delete on public.push_subs to authenticated;
grant select on public.reminders to authenticated;
revoke all on public.user_settings, public.app_settings, public.push_subs, public.reminders from anon;

revoke execute on function public.save_push_sub(text, text, text, text) from public, anon;
revoke execute on function public.set_reminders(jsonb) from public, anon;
revoke execute on function public.test_reminder(text, text) from public, anon;
revoke execute on function public.notify_client(uuid, text, text) from public, anon;
grant execute on function public.save_push_sub(text, text, text, text) to authenticated;
grant execute on function public.set_reminders(jsonb) to authenticated;
grant execute on function public.test_reminder(text, text) to authenticated;
grant execute on function public.notify_client(uuid, text, text) to authenticated;

revoke execute on function public.notify_admins_intake() from public, anon, authenticated;
revoke execute on function public.notify_admins_pain() from public, anon, authenticated;
revoke execute on function public.claim_due_reminders(integer) from public, anon, authenticated;
revoke execute on function public.drop_push_subs(text[]) from public, anon, authenticated;
grant execute on function public.claim_due_reminders(integer) to service_role;
grant execute on function public.drop_push_subs(text[]) to service_role;
