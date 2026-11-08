begin;
create schema if not exists app_private;
revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated;
create table app_private.cookbook_allowlist (
 email text primary key check(email = lower(email)),
 added_at timestamptz not null default now()
);
alter table app_private.cookbook_allowlist enable row level security;
revoke all on app_private.cookbook_allowlist from public,anon,authenticated;
-- Allowlisted addresses are provisioned separately as private configuration data.

-- Read trusted Auth records, never user-editable JWT user_metadata. This helper is
-- private, exposes only a boolean, and rechecks the allowlist on each statement.
create function app_private.can_access_cookbook() returns boolean
language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and exists (
  select 1 from auth.users u
  join app_private.cookbook_allowlist a on a.email=lower(u.email)
  where u.id=(select auth.uid()) and u.email_confirmed_at is not null
  and exists(select 1 from auth.identities i where i.user_id=u.id
   and i.provider='google' and lower(i.identity_data->>'email')=lower(u.email)
   and i.identity_data->>'email_verified'='true')
 );
$$;
revoke all on function app_private.can_access_cookbook() from public,anon;
grant execute on function app_private.can_access_cookbook() to authenticated;
create function public.cookbook_access() returns boolean
language sql stable security invoker set search_path='' as $$ select app_private.can_access_cookbook(); $$;
revoke all on function public.cookbook_access() from public,anon;
grant execute on function public.cookbook_access() to authenticated;

drop policy recipes_public_read on public.recipes;
drop policy calendar_days_public_read on public.calendar_days;
drop policy calendar_meals_public_read on public.calendar_meals;
drop policy away_events_public_read on public.away_events;

-- Revoke old column grants too: table-level REVOKE alone doesn't remove them.
do $revoke$
declare tab text; cols text;
begin
 foreach tab in array array['recipes','calendar_days','calendar_meals','away_events'] loop
  select string_agg(quote_ident(a.attname),',') into cols from pg_attribute a
   where a.attrelid=format('public.%I',tab)::regclass and a.attnum>0 and not a.attisdropped;
  execute format('revoke all privileges (%s) on public.%I from anon,authenticated',cols,tab);
  execute format('revoke all on public.%I from anon,authenticated',tab);
 end loop;
end $revoke$;

alter table public.calendar_meals alter column source_day_id drop not null;
alter table public.calendar_meals alter column original_text set default '';
alter table public.away_events alter column source_record set default '{}'::jsonb;
alter table public.calendar_meals add column updated_at timestamptz not null default now();
alter table public.away_events add column updated_at timestamptz not null default now();
create function app_private.touch_updated_at() returns trigger
language plpgsql security invoker set search_path='' as $$ begin new.updated_at=clock_timestamp();return new;end; $$;
revoke all on function app_private.touch_updated_at() from public,anon;
create trigger recipes_updated_at before update on public.recipes for each row execute function app_private.touch_updated_at();
create trigger calendar_meals_updated_at before update on public.calendar_meals for each row execute function app_private.touch_updated_at();
create trigger away_events_updated_at before update on public.away_events for each row execute function app_private.touch_updated_at();

create policy recipes_allowlisted on public.recipes for all to authenticated
 using ((select app_private.can_access_cookbook())) with check ((select app_private.can_access_cookbook()));
create policy calendar_meals_allowlisted on public.calendar_meals for all to authenticated
 using ((select app_private.can_access_cookbook())) with check ((select app_private.can_access_cookbook()));
create policy away_events_allowlisted on public.away_events for all to authenticated
 using ((select app_private.can_access_cookbook())) with check ((select app_private.can_access_cookbook()));
create policy calendar_days_allowlisted_read on public.calendar_days for select to authenticated
 using ((select app_private.can_access_cookbook()));

grant select (id,name,description,category,cuisine,cuisine_inferred,original_source,image,preparation_minutes,servings,favorite,ingredients,steps,note,updated_at)
 on public.recipes to authenticated;
grant insert (id,name,description,category,cuisine,cuisine_inferred,original_source,image,preparation_minutes,servings,favorite,ingredients,steps,note),
 update (name,description,category,cuisine,cuisine_inferred,original_source,image,preparation_minutes,servings,favorite,ingredients,steps,note)
 on public.recipes to authenticated;
grant select (id,date,type,setting,dishes,note,content,updated_at),
 insert (id,date,type,setting,dishes,note,content), update (date,type,setting,dishes,note,content)
 on public.calendar_meals to authenticated;
grant select (id,title,start_date,end_date,note,updated_at),
 insert (id,title,start_date,end_date,note), update (title,start_date,end_date,note)
 on public.away_events to authenticated;
grant delete on public.recipes,public.calendar_meals,public.away_events to authenticated;
grant select (id,date,day_kind,source_color,note) on public.calendar_days to authenticated;

-- Transactional, per-row optimistic concurrency. All writes still run as the
-- caller under the same allowlist RLS and limited column permissions.
create function public.save_cookbook_changes(changes jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare op jsonb; d jsonb; actual timestamptz; expected timestamptz; exists_row boolean;
begin
 if not app_private.can_access_cookbook() then raise exception 'This account is not allowed to access this cookbook.' using errcode='42501'; end if;
 if changes is null or jsonb_typeof(changes)<>'array' or jsonb_array_length(changes)>500 then raise exception 'Invalid change list';end if;
 for op in select value from jsonb_array_elements(changes) order by value->>'table',value->>'id' loop
  d=op->'data'; expected=(op->>'expected_updated_at')::timestamptz; actual=null;
  if op->>'table'='recipes' then
   select updated_at into actual from public.recipes where id=op->>'id' for update;
  elsif op->>'table'='calendar_meals' then
   select updated_at into actual from public.calendar_meals where id=op->>'id' for update;
  elsif op->>'table'='away_events' then
   select updated_at into actual from public.away_events where id=op->>'id' for update;
  else raise exception 'Invalid collection';end if;
  exists_row=found;
  if (exists_row and expected is null) or (not exists_row and expected is not null)
   or (exists_row and actual is distinct from expected) then
   raise exception 'This item changed on another device. Reload shared data before saving.' using errcode='40001';
  end if;
  if d is null or d='null'::jsonb then
   if op->>'table'='recipes' then delete from public.recipes where id=op->>'id';
   elsif op->>'table'='calendar_meals' then delete from public.calendar_meals where id=op->>'id';
   else delete from public.away_events where id=op->>'id';end if;
  elsif op->>'table'='recipes' then
   if exists_row then
    update public.recipes set name=d->>'name',description=coalesce(d->>'description',''),category=d->>'category',cuisine=d->>'cuisine',cuisine_inferred=coalesce((d->>'cuisine_inferred')::boolean,false),original_source=nullif(d->>'original_source',''),image=coalesce(d->>'image',''),preparation_minutes=coalesce((d->>'preparation_minutes')::integer,0),servings=coalesce(d->>'servings',''),favorite=coalesce((d->>'favorite')::boolean,false),ingredients=d->'ingredients',steps=d->'steps',note=coalesce(d->>'note','') where id=op->>'id';
   else
    insert into public.recipes(id,name,description,category,cuisine,cuisine_inferred,original_source,image,preparation_minutes,servings,favorite,ingredients,steps,note)
     values(op->>'id',d->>'name',coalesce(d->>'description',''),d->>'category',d->>'cuisine',coalesce((d->>'cuisine_inferred')::boolean,false),nullif(d->>'original_source',''),coalesce(d->>'image',''),coalesce((d->>'preparation_minutes')::integer,0),coalesce(d->>'servings',''),coalesce((d->>'favorite')::boolean,false),d->'ingredients',d->'steps',coalesce(d->>'note',''));
   end if;
  elsif op->>'table'='calendar_meals' then
   if exists_row then
    update public.calendar_meals set date=(d->>'date')::date,type=d->>'type',setting=coalesce(d->>'setting','home'),dishes=array(select jsonb_array_elements_text(d->'dishes')),note=coalesce(d->>'note',''),content=d->'content' where id=op->>'id';
   else
    insert into public.calendar_meals(id,date,type,setting,dishes,note,content) values(op->>'id',(d->>'date')::date,d->>'type',coalesce(d->>'setting','home'),array(select jsonb_array_elements_text(d->'dishes')),coalesce(d->>'note',''),d->'content');
   end if;
  else
   if exists_row then
    update public.away_events set title=d->>'title',start_date=(d->>'start_date')::date,end_date=(d->>'end_date')::date,note=coalesce(d->>'note','') where id=op->>'id';
   else
    insert into public.away_events(id,title,start_date,end_date,note) values(op->>'id',d->>'title',(d->>'start_date')::date,(d->>'end_date')::date,coalesce(d->>'note',''));
   end if;
  end if;
 end loop;
end;
$$;
revoke all on function public.save_cookbook_changes(jsonb) from public,anon;
grant execute on function public.save_cookbook_changes(jsonb) to authenticated;
comment on table public.recipes is 'Shared cookbook restricted to verified Google users in the private allowlist. Source/review provenance is not client writable.';
commit;
