-- ==========================================
-- 62: Чанга уншлагын гарын авлагын линкүүд
-- ==========================================
create table if not exists reading_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  sort_order int default 0,
  created_by uuid references employees(id) on delete set null,
  created_at timestamptz default now()
);
alter table reading_resources enable row level security;
drop policy if exists "public all reading_resources" on reading_resources;
create policy "public all reading_resources" on reading_resources for all using (true) with check (true);
