-- Schedule the wire refresh from inside Supabase, independent of GitHub.
-- Run once in the SQL editor (Dashboard → Database → Extensions first, or the
-- `create extension` lines below). Replace <CRON_SECRET> with the same value
-- set in Vercel; never commit the real secret.
--
-- Requires the pg_cron and pg_net extensions.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Re-running this file replaces the previous schedule.
select cron.unschedule('wire-ingest')
where exists (select 1 from cron.job where jobname = 'wire-ingest');

select cron.schedule(
  'wire-ingest',
  '*/15 * * * *',
  $job$
  select net.http_post(
    url := 'https://the-bureaucracy.vercel.app/api/ingest',
    headers := '{"Authorization":"Bearer <CRON_SECRET>","Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $job$
);

-- Inspect: select * from cron.job_run_details order by start_time desc limit 5;
-- Responses: select * from net._http_response order by id desc limit 5;
