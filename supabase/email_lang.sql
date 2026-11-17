-- ReKomp: jezik mejlova (nova lozinka) prema jeziku klijenta.
-- Upisuje jezik klijenta u auth.users.raw_user_meta_data.lang; šablon mejla čita {{ .Data.lang }}.
-- Pokreni jednom u Supabase SQL Editoru (može i ponovo, bezbedno je).

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
