-- Initial schema for Remix CRUD App
-- Creates profiles, tasks, and task_comments tables with RLS

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Enums ───────────────────────────────────────────────────────────────────
create type if not exists task_status as enum ('todo', 'in_progress', 'done');
create type if not exists task_priority as enum ('low', 'medium', 'high');

-- ─── Profiles ────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- Allow reading other profiles (for assignee display)
create policy "profiles_select_authenticated" on profiles
  for select using (auth.role() = 'authenticated');

-- ─── Tasks ───────────────────────────────────────────────────────────────────
create table if not exists tasks (
  id           uuid primary key default uuid_generate_v4(),
  title        text not null check (char_length(title) > 0),
  description  text,
  status       task_status not null default 'todo',
  priority     task_priority not null default 'medium',
  assignee_id  uuid references profiles(id) on delete set null,
  due_date     date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists tasks_status_idx    on tasks(status);
create index if not exists tasks_priority_idx  on tasks(priority);
create index if not exists tasks_assignee_idx  on tasks(assignee_id);
create index if not exists tasks_created_idx   on tasks(created_at desc);

alter table tasks enable row level security;

-- Authenticated users can CRUD all tasks (team-level access)
create policy "tasks_select_authenticated" on tasks
  for select using (auth.role() = 'authenticated');

create policy "tasks_insert_authenticated" on tasks
  for insert with check (auth.role() = 'authenticated');

create policy "tasks_update_authenticated" on tasks
  for update using (auth.role() = 'authenticated');

create policy "tasks_delete_authenticated" on tasks
  for delete using (auth.role() = 'authenticated');

-- ─── Task Comments ────────────────────────────────────────────────────────────
create table if not exists task_comments (
  id         uuid primary key default uuid_generate_v4(),
  task_id    uuid not null references tasks(id) on delete cascade,
  author_id  uuid not null references profiles(id) on delete cascade,
  content    text not null check (char_length(content) > 0),
  created_at timestamptz not null default now()
);

create index if not exists task_comments_task_idx   on task_comments(task_id);
create index if not exists task_comments_author_idx on task_comments(author_id);

alter table task_comments enable row level security;

create policy "comments_select_authenticated" on task_comments
  for select using (auth.role() = 'authenticated');

create policy "comments_insert_own" on task_comments
  for insert with check (auth.uid() = author_id);

create policy "comments_delete_own" on task_comments
  for delete using (auth.uid() = author_id);

-- ─── Auto-update updated_at ───────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_updated_at
  before update on tasks
  for each row execute procedure set_updated_at();

create trigger profiles_updated_at
  before update on profiles
  for each row execute procedure set_updated_at();

-- ─── Auto-create profile on signup ───────────────────────────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
