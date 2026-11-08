begin;

-- IDs remain text so a later, explicit prototype import can retain stable IDs.
create table public.cookbooks (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  revision integer not null default 0
);
create table public.dishes (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  -- Full Recipe JSON, including optional originalSource (HTTP(S) website or sheet-tab URL).
  content jsonb not null check (jsonb_typeof(content) = 'object' and content->>'id' = id),
  primary key (owner_id, id)
);
create table public.meals (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  date date not null,
  type text not null check (type in ('Lunch', 'Dinner')),
  note text not null default '',
  primary key (owner_id, id)
);
create index meals_owner_date on public.meals(owner_id, date);
create table public.meal_dishes (
  owner_id uuid not null,
  meal_id text not null,
  dish_id text not null,
  position integer not null check (position >= 0),
  primary key (owner_id, meal_id, position),
  foreign key (owner_id, meal_id) references public.meals(owner_id, id) on delete cascade,
  foreign key (owner_id, dish_id) references public.dishes(owner_id, id)
);

alter table public.cookbooks enable row level security;
alter table public.dishes enable row level security;
alter table public.meals enable row level security;
alter table public.meal_dishes enable row level security;
create policy owner_only on public.cookbooks for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy owner_only on public.dishes for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy owner_only on public.meals for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy owner_only on public.meal_dishes for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

-- Reads one consistent snapshot, including ordered recipe links, without REST row limits.
create function public.load_cookbook() returns jsonb
language sql security invoker set search_path = '' as $$
  select jsonb_build_object(
    'revision', coalesce((select revision from public.cookbooks where owner_id = auth.uid()), 0),
    'recipes', coalesce((select jsonb_agg(content order by id) from public.dishes where owner_id = auth.uid()), '[]'::jsonb),
    'meals', coalesce((select jsonb_agg(jsonb_build_object(
      'id', m.id, 'date', m.date, 'type', m.type, 'note', m.note,
      'dishes', coalesce((select jsonb_agg(md.dish_id order by md.position)
        from public.meal_dishes md where md.owner_id = m.owner_id and md.meal_id = m.id), '[]'::jsonb)
    ) order by m.date, m.id) from public.meals m where m.owner_id = auth.uid()), '[]'::jsonb)
  );
$$;

-- Atomic snapshot saves are sufficient for this personal cookbook. A revision lock
-- rejects stale writes from another tab/device instead of overwriting newer changes.
create function public.save_cookbook(expected_revision integer, recipes jsonb, meals jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare
  current_revision integer;
  current_owner uuid := auth.uid();
begin
  if current_owner is null then raise exception 'Sign in before saving.'; end if;
  if jsonb_typeof(recipes) <> 'array' or jsonb_typeof(meals) <> 'array' then
    raise exception 'Invalid cookbook data.';
  end if;
  insert into public.cookbooks(owner_id) values (current_owner) on conflict do nothing;
  select revision into current_revision from public.cookbooks
    where owner_id = current_owner for update;
  if current_revision <> expected_revision then
    raise exception 'This cookbook changed on another device. Reload before editing.';
  end if;

  delete from public.meal_dishes where owner_id = current_owner;
  delete from public.meals where owner_id = current_owner;
  delete from public.dishes where owner_id = current_owner;
  insert into public.dishes(owner_id, id, content)
    select current_owner, r->>'id', r from jsonb_array_elements(recipes) r;
  insert into public.meals(owner_id, id, date, type, note)
    select current_owner, m->>'id', (m->>'date')::date, m->>'type', coalesce(m->>'note', '')
    from jsonb_array_elements(meals) m;
  insert into public.meal_dishes(owner_id, meal_id, dish_id, position)
    select current_owner, m->>'id', d.value, (d.ordinality - 1)::integer
    from jsonb_array_elements(meals) m
    cross join lateral jsonb_array_elements_text(m->'dishes') with ordinality d(value, ordinality);
  update public.cookbooks set revision = current_revision + 1 where owner_id = current_owner;
  return current_revision + 1;
end;
$$;

revoke all on public.cookbooks, public.dishes, public.meals, public.meal_dishes from anon;
grant select, insert, update, delete on public.cookbooks, public.dishes, public.meals, public.meal_dishes to authenticated;
revoke execute on function public.load_cookbook() from public, anon;
revoke execute on function public.save_cookbook(integer, jsonb, jsonb) from public, anon;
grant execute on function public.load_cookbook() to authenticated;
grant execute on function public.save_cookbook(integer, jsonb, jsonb) to authenticated;
commit;
