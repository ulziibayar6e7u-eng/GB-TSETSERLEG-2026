-- ==========================================
-- 27: АРГА ЗҮЙЧИЙН ҮЙЛ АЖИЛЛАГАА
-- ==========================================
create table if not exists argazuich_activities (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  category text not null check (category in ('negdel','hicheel_suusan','zuvluguu')),
  date date not null default current_date,
  title text,
  description text,
  file_url text,
  extra_links jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_az_emp on argazuich_activities(employee_id);
create index if not exists idx_az_cat on argazuich_activities(category);
create index if not exists idx_az_date on argazuich_activities(date desc);

alter table argazuich_activities enable row level security;
drop policy if exists "public all argazuich_activities" on argazuich_activities;
create policy "public all argazuich_activities" on argazuich_activities for all using (true) with check (true);
