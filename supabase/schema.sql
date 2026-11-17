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
