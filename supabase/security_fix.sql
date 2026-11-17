-- ReKomp: ispravke po Supabase Security Advisoru (bezbedno je pokrenuti više puta).

-- 1) Fiksan search_path za trigger funkcije
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

-- Namerno ostaje dostupno prijavljenim korisnicima (aplikacija ih koristi):
-- claim_invite, set_my_lang (pozivi iz aplikacije), is_admin, my_client_id (koriste ih RLS pravila;
-- vraćaju samo podatke o samom korisniku koji pita).
