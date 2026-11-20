-- ReKomp: slanje podsetnika svakog minuta (pokreni POSLE notifications.sql i posle objave funkcije send-reminders).
-- Najlakše: u trenerskom panelu → Podešavanja → Notifikacije → „Napravi ključeve“ dobiješ ovaj SQL sa već upisanom šifrom.
-- Ručno: zameni OVDE_CRON_SECRET istom vrednošću kao CRON_SECRET u Edge Functions → Secrets.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- šifra za poziv funkcije (čuva se u Supabase Vaultu, ne u kodu)
select vault.create_secret('OVDE_CRON_SECRET', 'rekomp_cron_secret', 'ReKomp: poziv funkcije send-reminders')
 where not exists (select 1 from vault.secrets where name = 'rekomp_cron_secret');
select vault.update_secret(id, 'OVDE_CRON_SECRET') from vault.secrets where name = 'rekomp_cron_secret';

select cron.unschedule('rekomp-reminders') where exists (select 1 from cron.job where jobname = 'rekomp-reminders');
select cron.schedule('rekomp-reminders', '* * * * *', $job$
  select net.http_post(
    url := 'https://ezowwzleaivcoqkuvyig.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'rekomp_cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000);
$job$);

-- Čišćenje istorije: cron upisuje red svakog minuta (oko 1.440 dnevno), pa se jednom dnevno brišu redovi starije od 7 dana.
select cron.unschedule('rekomp-cron-cleanup') where exists (select 1 from cron.job where jobname = 'rekomp-cron-cleanup');
select cron.schedule('rekomp-cron-cleanup', '17 3 * * *', $c$ delete from cron.job_run_details where end_time < now() - interval '7 days' $c$);

-- Provera: select * from cron.job_run_details order by start_time desc limit 5;
--          select status_code, content from net._http_response order by created desc limit 5;
