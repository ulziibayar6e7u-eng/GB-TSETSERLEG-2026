-- ==========================================
-- 14: TASK MANAGER (СӨБ task-manager.html-т хэрэгтэй)
-- ==========================================
create table if not exists methodist_notes (
  id bigserial primary key,
  from_role text,
  from_name text,
  target_role text,
  target_name text,
  title text,
  text text,
  file_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_mn_title on methodist_notes(title);
create index if not exists idx_mn_target_name on methodist_notes(target_name);
create index if not exists idx_mn_from_name on methodist_notes(from_name);
alter table methodist_notes enable row level security;
drop policy if exists "public all methodist_notes" on methodist_notes;
create policy "public all methodist_notes" on methodist_notes for all using (true) with check (true);

-- staff table (compatibility with old system)
create table if not exists staff (
  id bigserial primary key,
  name text,
  role text,
  dept text,
  phone text,
  email text,
  photo_url text,
  created_at timestamptz default now()
);
alter table staff enable row level security;
drop policy if exists "public all staff" on staff;
create policy "public all staff" on staff for all using (true) with check (true);
