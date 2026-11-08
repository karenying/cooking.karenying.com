begin;
create table public.calendar_days (
 id text primary key, date date not null unique, day_kind text not null,
 source_color text not null, note text not null default '', source_record jsonb not null
);
create table public.calendar_meals (
 id text primary key, source_day_id text not null references public.calendar_days(id),
 date date not null, type text not null check(type in ('Lunch','Dinner')),
 setting text not null check(setting in ('home','out','figma')),
 dishes text[] not null default '{}', note text not null default '', content jsonb,
 original_text text not null, first_time_marked boolean not null default false
);
create index calendar_meals_date_idx on public.calendar_meals(date);
create index calendar_meals_day_idx on public.calendar_meals(source_day_id);
create table public.away_events (
 id text primary key, title text not null, start_date date not null, end_date date not null,
 note text not null default '', source_record jsonb not null,
 check(start_date<=end_date)
);
create index away_events_dates_idx on public.away_events(start_date,end_date);
alter table public.calendar_days enable row level security;
alter table public.calendar_meals enable row level security;
alter table public.away_events enable row level security;
revoke all on public.calendar_days,public.calendar_meals,public.away_events from public,anon,authenticated;
grant select,insert,update,delete on public.calendar_days,public.calendar_meals,public.away_events to service_role;
-- Client read grants/policies are applied only after the complete import verifies.
commit;
