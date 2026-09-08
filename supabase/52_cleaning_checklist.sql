-- ==========================================
-- 52: Туслах багшийн цэвэрлэгээ хяналтын хуудас (7 хоног/өдөр тутам)
-- ==========================================
create table if not exists cleaning_checklist (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('weekly','daily')),
  period_start date not null,
  group_id int references groups(id) on delete cascade,
  author_id uuid references employees(id) on delete set null,
  items jsonb not null default '{}'::jsonb,
  doctor_note text,
  doctor_id uuid references employees(id) on delete set null,
  reviewed_at timestamptz,
  status text not null default 'draft' check (status in ('draft','submitted','approved','returned')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(kind, period_start, group_id)
);
create index if not exists idx_ccl_period on cleaning_checklist(kind, period_start);
create index if not exists idx_ccl_group on cleaning_checklist(group_id);
alter table cleaning_checklist enable row level security;
drop policy if exists "public all cleaning_checklist" on cleaning_checklist;
create policy "public all cleaning_checklist" on cleaning_checklist for all using (true) with check (true);
