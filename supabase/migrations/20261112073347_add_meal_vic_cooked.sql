-- Meal attribution defaults false for existing and new meals.
begin;
alter table public.calendar_meals add column vic_cooked boolean not null default false;
grant select (vic_cooked), insert (vic_cooked), update (vic_cooked)
 on public.calendar_meals to authenticated;
-- Older clients omit this field: preserve it on update, default false on insert.
create or replace function public.save_cookbook_changes(changes jsonb) returns void
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
    update public.calendar_meals set date=(d->>'date')::date,type=d->>'type',setting=coalesce(d->>'setting','home'),dishes=array(select jsonb_array_elements_text(d->'dishes')),note=coalesce(d->>'note',''),content=d->'content',vic_cooked=coalesce((d->>'vic_cooked')::boolean,vic_cooked) where id=op->>'id';
   else
    insert into public.calendar_meals(id,date,type,setting,dishes,note,content,vic_cooked) values(op->>'id',(d->>'date')::date,d->>'type',coalesce(d->>'setting','home'),array(select jsonb_array_elements_text(d->'dishes')),coalesce(d->>'note',''),d->'content',coalesce((d->>'vic_cooked')::boolean,false));
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
commit;
