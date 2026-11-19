-- Nedeljni raspored koji klijent bira sam: slobodni dani, smena i dani treninga.
-- Pokreni jednom u Supabase SQL Editoru (isti sadržaj je i na kraju schema.sql).

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
