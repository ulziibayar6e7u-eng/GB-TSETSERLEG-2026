-- ==========================================
-- 51: Хүүхэд бүрийн ариун цэврийн бүртгэл
-- ==========================================
create table if not exists hygiene_child_log (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  routine text not null check (routine in ('rinse','wash','brush')),
  group_id int references groups(id) on delete cascade,
  child_id uuid references children(id) on delete cascade,
  author_id uuid references employees(id) on delete set null,
  status text check (status in ('done','partial','not_done','absent')),
  wash_duration text,
  sequence_quality text,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(date, routine, child_id)
);
create index if not exists idx_hcl_date on hygiene_child_log(date);
create index if not exists idx_hcl_child on hygiene_child_log(child_id);
create index if not exists idx_hcl_month on hygiene_child_log(routine, group_id, date);

alter table hygiene_child_log enable row level security;
drop policy if exists "public all hygiene_child_log" on hygiene_child_log;
create policy "public all hygiene_child_log" on hygiene_child_log for all using (true) with check (true);
