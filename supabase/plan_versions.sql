-- ReKomp: istorija plana. Pre svake izmene plana prethodna verzija se sačuva (najviše 50 po klijentu).
-- Poruke treneru (notes) se ne računaju kao izmena plana. Vidi je samo trener (kartica Plan → Istorija plana).
-- Pokreni jednom u Supabase SQL Editoru. Bezbedno je pokrenuti više puta (isti sadržaj je i na kraju schema.sql).

create table if not exists public.plan_versions (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  data jsonb not null,
  published boolean not null default false,
  plan_updated_at timestamptz,                -- kad je ova verzija bila sačuvana
  saved_at timestamptz not null default now() -- kad ju je zamenila novija
);
create index if not exists plan_versions_client_idx on public.plan_versions (client_id, id desc);

alter table public.plan_versions enable row level security;
drop policy if exists plan_versions_admin_read on public.plan_versions;
create policy plan_versions_admin_read on public.plan_versions for select using (public.is_admin());
drop policy if exists plan_versions_admin_delete on public.plan_versions;
create policy plan_versions_admin_delete on public.plan_versions for delete using (public.is_admin());

-- Upisuje samo okidač; niko ne može ručno da doda ili menja verziju.
grant select, delete on public.plan_versions to authenticated;
revoke insert, update on public.plan_versions from authenticated;
revoke all on public.plan_versions from anon;

create or replace function public.plan_keep_version() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (old.data - 'notes') is distinct from (new.data - 'notes') then
    insert into public.plan_versions (client_id, data, published, plan_updated_at)
      values (old.client_id, old.data, old.published, old.updated_at);
    delete from public.plan_versions
     where client_id = old.client_id
       and id not in (select id from public.plan_versions where client_id = old.client_id order by id desc limit 50);
  end if;
  return new;
end $$;
revoke execute on function public.plan_keep_version() from public, anon, authenticated;

drop trigger if exists plans_keep_version on public.plans;
create trigger plans_keep_version before update on public.plans
  for each row execute function public.plan_keep_version();
