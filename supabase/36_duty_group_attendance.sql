-- ==========================================
-- 36: Жижүүрийн бүлгийн ирц + өдрийн дэглэм ангилал
-- ==========================================
create table if not exists duty_group_attendance (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  group_id int references groups(id) on delete cascade,
  duty_teacher_id uuid references employees(id) on delete set null,
  present int not null default 0,
  absent int default 0,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(date, group_id)
);
create index if not exists idx_dga_date on duty_group_attendance(date desc);
create index if not exists idx_dga_group on duty_group_attendance(group_id);

alter table duty_group_attendance enable row level security;
drop policy if exists "public all duty_group_attendance" on duty_group_attendance;
create policy "public all duty_group_attendance" on duty_group_attendance for all using (true) with check (true);

-- duty_reports-т 'regime' ангилал нэмэх
alter table duty_reports drop constraint if exists duty_reports_category_check;
alter table duty_reports add constraint duty_reports_category_check
  check (category in ('general','training','regime','event','incident','child_protection','other'));
