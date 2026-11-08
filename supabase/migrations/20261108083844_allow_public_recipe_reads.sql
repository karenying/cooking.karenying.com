begin;
-- Public reading was explicitly approved. Import/review metadata remains private.
grant select (id, name, description, category, cuisine, cuisine_inferred,
  original_source, image, preparation_minutes, servings, favorite, ingredients, steps, note)
  on public.recipes to anon, authenticated;
create policy recipes_public_read on public.recipes
  for select to anon, authenticated using (true);
-- The existing deny policy and absent write grants continue to block all client writes.
comment on table public.recipes is 'Dish catalogue: public read access to recipe-content columns only. Client writes and migration metadata remain restricted pending OAuth/allowlist integration.';
commit;
