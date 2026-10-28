-- ==========================================
-- 72: Багшийн гүйцэтгэлийн төлөвлөгөө (автомат биелэлттэй)
-- ==========================================
create table if not exists performance_plan (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  school_year int not null,                   -- 2026 (2026-2027 оны хичээлийн жил)
  category text not null,                     -- 'observation', 'activity', 'club', 'material', 'music', 'other'
  title text not null,                        -- "Сард 10 ажиглалт хийх"
  target_count int,                           -- 10
  target_date date,                           -- 2027-06-30 (сайн дуртай эцсийн огноо)
  period_type text default 'year' check (period_type in ('year','semester','month','custom')),
  period_month int,                           -- 9-12, 1-6 (period_type='month' үед)
  auto_rule text,                             -- 'observations', 'music_activity', 'plans', 'club_activities', 'teacher_materials', null (гараар)
  manual_done boolean default false,          -- гараар "хийсэн" гэж тэмдэглэх
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_pp_emp on performance_plan(employee_id);
create index if not exists idx_pp_year on performance_plan(school_year);

alter table performance_plan enable row level security;
drop policy if exists "public all performance_plan" on performance_plan;
create policy "public all performance_plan" on performance_plan for all using (true) with check (true);
