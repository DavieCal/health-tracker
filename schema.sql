-- Run this in the Supabase SQL editor to create all tables.

create extension if not exists "pgcrypto";

create table if not exists sleep_logs (
  id uuid primary key default gen_random_uuid(),
  toronto_date text not null,
  bedtime timestamptz not null,
  wake_time timestamptz,
  quality int check (quality between 1 and 5),
  hours_slept numeric(4,2),
  notes text,
  created_at timestamptz default now()
);

create table if not exists beer_logs (
  id uuid primary key default gen_random_uuid(),
  toronto_date text not null,
  pints numeric(4,2) not null,
  is_last_of_night boolean default false,
  notes text,
  created_at timestamptz default now()
);

create table if not exists beer_goals (
  id uuid primary key default gen_random_uuid(),
  week_start text not null unique,
  target_pints int not null,
  alcohol_free_days text[] default '{}',
  created_at timestamptz default now()
);

create table if not exists caffeine_logs (
  id uuid primary key default gen_random_uuid(),
  toronto_date text not null,
  amount numeric(6,2),
  unit text,
  source text,
  estimated_mg numeric(6,2),
  created_at timestamptz default now()
);

create table if not exists energy_logs (
  id uuid primary key default gen_random_uuid(),
  toronto_date text not null,
  score int not null check (score between 1 and 5),
  notes text,
  created_at timestamptz default now()
);

create table if not exists vitamin_logs (
  id uuid primary key default gen_random_uuid(),
  toronto_date text not null,
  dose text not null,
  created_at timestamptz default now()
);

create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  toronto_date text not null,
  workout_type text not null,
  completed boolean default true,
  notes text,
  created_at timestamptz default now()
);

create table if not exists workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid references workouts(id) on delete cascade,
  exercise text not null,
  set_number int,
  reps int,
  weight_kg numeric(6,2),
  time_sec int,
  created_at timestamptz default now()
);

create table if not exists weight_logs (
  id uuid primary key default gen_random_uuid(),
  toronto_date text not null,
  weight_kg numeric(5,2) not null,
  notes text,
  created_at timestamptz default now()
);

create table if not exists mood_logs (
  id uuid primary key default gen_random_uuid(),
  toronto_date text not null,
  score int not null check (score between 1 and 5),
  notes text,
  created_at timestamptz default now()
);

create table if not exists health_daily (
  id uuid primary key default gen_random_uuid(),
  toronto_date text not null unique,
  steps int,
  active_minutes int,
  calories_out int,
  resting_heart_rate int,
  hrv numeric(5,2),
  created_at timestamptz default now()
);

create table if not exists illness_episodes (
  id uuid primary key default gen_random_uuid(),
  start_date timestamptz not null,
  end_date timestamptz,
  description text,
  days_lasted int,
  created_at timestamptz default now()
);

create table if not exists mobility_logs (
  id uuid primary key default gen_random_uuid(),
  toronto_date text not null,
  mode text not null check (mode in ('quick', 'full')),
  duration_min int,
  steps_done int,
  steps_total int,
  notes text,
  created_at timestamptz default now()
);
alter table mobility_logs disable row level security;

-- ─── Beer plan (2026-11) ──────────────────────────────────────────────────────
-- Work samples: kind = 'sample' (≤ ½ pt keeps the day dry)
alter table beer_logs add column if not exists kind text not null default 'beer';
alter table beer_logs drop constraint if exists beer_logs_kind_check;
alter table beer_logs add constraint beer_logs_kind_check check (kind in ('beer', 'sample'));

-- Per-day plan keyed by getDay() (0 = Sun); week_start = 'template' row holds the default plan
alter table beer_goals add column if not exists day_plan jsonb;

-- Morning commitment
create table if not exists beer_intentions (
  id uuid primary key default gen_random_uuid(),
  toronto_date text not null unique,
  plan_type text not null check (plan_type in ('dry', 'sample', 'cap', 'open')),
  cap numeric(4,2),
  note text,
  created_at timestamptz default now()
);
alter table beer_intentions disable row level security;

-- Dry weeks and vacations (end_date null = open-ended)
create table if not exists plan_periods (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('dry', 'vacation')),
  start_date text not null,
  end_date text,
  label text,
  created_at timestamptz default now()
);
alter table plan_periods disable row level security;
