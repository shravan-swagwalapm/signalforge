-- ============================================
-- SignalForge Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- Profiles table
-- ============================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  linkedin_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ============================================
-- Run attempts table
-- ============================================
create table if not exists public.run_attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  theme text not null,
  status text not null check (status in ('success', 'failure')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.run_attempts enable row level security;

-- Policies
create policy "Users can view own run attempts"
  on public.run_attempts for select
  using (auth.uid() = user_id);

create policy "Users can insert own run attempts"
  on public.run_attempts for insert
  with check (auth.uid() = user_id);

-- Index for efficient monthly count queries
create index if not exists idx_run_attempts_user_month 
  on public.run_attempts(user_id, created_at);

-- ============================================
-- Subscriptions table (for future paywall)
-- ============================================
create table if not exists public.subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null default 'none' check (status in ('none', 'active', 'past_due', 'cancelled')),
  pg_customer_id text,
  pg_subscription_id text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.subscriptions enable row level security;

-- Policies
create policy "Users can view own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- ============================================
-- Function: Auto-create profile on signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  
  insert into public.subscriptions (user_id, status)
  values (new.id, 'none');
  
  return new;
end;
$$;

-- Trigger: Create profile on auth signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- Function: Count successful runs this month
-- ============================================
create or replace function public.get_successful_runs_this_month(p_user_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
  run_count integer;
begin
  select count(*)
  into run_count
  from public.run_attempts
  where user_id = p_user_id
    and status = 'success'
    and created_at >= date_trunc('month', now() at time zone 'utc');
  
  return run_count;
end;
$$;
