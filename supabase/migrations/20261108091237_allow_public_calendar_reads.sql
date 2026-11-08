begin;
do $verify$ begin
 if (select count(*) from public.calendar_days)<>599 or (select count(*) from public.calendar_meals)<>822 or (select count(*) from public.away_events)<>87 then raise exception 'Calendar import incomplete; keep reads closed';end if;
 if exists(select 1 from public.calendar_meals m cross join unnest(m.dishes) d where not exists(select 1 from public.recipes r where r.id=d)) then raise exception 'Broken recipe reference';end if;
end $verify$;
grant select(id,date,day_kind,source_color,note) on public.calendar_days to anon,authenticated;
grant select(id,date,type,setting,dishes,note,content) on public.calendar_meals to anon,authenticated;
grant select(id,title,start_date,end_date,note) on public.away_events to anon,authenticated;
create policy calendar_days_public_read on public.calendar_days for select to anon,authenticated using(true);
create policy calendar_meals_public_read on public.calendar_meals for select to anon,authenticated using(true);
create policy away_events_public_read on public.away_events for select to anon,authenticated using(true);
-- No client write grants. Source/review provenance columns remain private.
commit;
