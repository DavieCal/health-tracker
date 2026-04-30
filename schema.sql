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

create table if not exists illness_episodes (
  id uuid primary key default gen_random_uuid(),
  start_date timestamptz not null,
  end_date timestamptz,
  description text,
  days_lasted int,
  created_at timestamptz default now()
);
