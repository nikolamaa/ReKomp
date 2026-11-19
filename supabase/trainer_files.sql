-- Trenerovi fajlovi u bazi (npr. meniji sa posla za proveru planova). Vidi ih samo trener.
-- Pokreni jednom u Supabase SQL Editoru (isti sadržaj je i na kraju schema.sql).

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
