-- ReKomp: automatska rezervna kopija na mejl, svakog ponedeljka u 2:40 UTC (kod nas 3:40 zimi, 4:40 leti).
-- Pokreni POSLE cron.sql (koristi istu šifru iz Vaulta) i posle objave funkcije weekly-backup.
-- Uputstvo: README → „Rezervna kopija na mejl“.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('rekomp-backup') where exists (select 1 from cron.job where jobname = 'rekomp-backup');
select cron.schedule('rekomp-backup', '40 2 * * 1', $job$
  select net.http_post(
    url := 'https://ezowwzleaivcoqkuvyig.supabase.co/functions/v1/weekly-backup',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'rekomp_cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000);
$job$);

-- Provera (posle prvog ponedeljka ili posle „Pošalji kopiju sada“ u aplikaciji):
--   select data from public.trainer_files where key = 'status:backup';
--   select status_code, content from net._http_response order by created desc limit 5;
