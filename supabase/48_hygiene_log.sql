-- ==========================================
-- 48: Хүүхдийн ариун цэврийн журнал
-- ==========================================
create table if not exists hygiene_log (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  routine text not null check (routine in ('rinse','wash','brush')),
  group_id int references groups(id) on delete set null,
  author_id uuid references employees(id) on delete set null,
  children_count int,
  morning_time text,
  day_time text,
  evening_time text,
  monitor_name text,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(date, routine, group_id)
);
create index if not exists idx_hlog_date on hygiene_log(date desc);
create index if not exists idx_hlog_routine on hygiene_log(routine);

alter table hygiene_log enable row level security;
drop policy if exists "public all hygiene_log" on hygiene_log;
create policy "public all hygiene_log" on hygiene_log for all using (true) with check (true);
