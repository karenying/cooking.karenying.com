begin;

create table public.recipe_imports (
  id text primary key,
  source_url text not null,
  checksum_sha256 text not null check (length(checksum_sha256) = 64),
  record_count integer not null check (record_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now()
);

-- This catalogue is independent of sign-in while OAuth/allowlist decisions are deferred.
-- Public client access stays denied; a later migration can attach cookbook ownership.
create table public.recipes (
  id text primary key,
  name text not null check (length(btrim(name)) > 0),
  description text not null default '',
  category text not null,
  cuisine text not null,
  cuisine_inferred boolean not null default false,
  original_source text check (original_source is null or original_source ~ '^https?://'),
  image text not null default '',
  preparation_minutes integer not null default 0 check (preparation_minutes >= 0),
  servings text not null default '',
  favorite boolean not null default false,
  ingredients jsonb not null default '[]'::jsonb check (jsonb_typeof(ingredients) = 'array'),
  steps jsonb not null default '[]'::jsonb check (jsonb_typeof(steps) = 'array'),
  note text not null default '',
  source_provenance jsonb not null default '[]'::jsonb check (jsonb_typeof(source_provenance) = 'array'),
  review_notes jsonb not null default '[]'::jsonb check (jsonb_typeof(review_notes) = 'array'),
  approval_basis text not null default 'chat' check (approval_basis in ('chat', 'individual')),
  import_batch_id text references public.recipe_imports(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recipes_import_batch_idx on public.recipes(import_batch_id);
create index recipes_category_cuisine_idx on public.recipes(category, cuisine);

alter table public.recipes enable row level security;
alter table public.recipe_imports enable row level security;
revoke all on public.recipes, public.recipe_imports from public, anon, authenticated;
-- Explicit deny policies document the intentional closed state until app authorization exists.
create policy recipes_closed_until_authorization on public.recipes
  for all to anon, authenticated using (false) with check (false);
create policy imports_closed_until_authorization on public.recipe_imports
  for all to anon, authenticated using (false) with check (false);
grant select, insert, update, delete on public.recipes, public.recipe_imports to service_role;

comment on table public.recipes is 'Personal dish catalogue; ingredients/steps may be empty. Client access is intentionally closed pending OAuth and authorization.';
comment on column public.recipes.original_source is 'Primary website or source-sheet tab URL; maps to Recipe.originalSource.';
comment on column public.recipes.source_provenance is 'Source links, extracted text, and attachment hashes. Original attachment bytes are retained locally pending private Storage migration.';
comment on column public.recipes.review_notes is 'Original extraction questions/resolutions; chat approval does not fabricate answers.';
commit;
