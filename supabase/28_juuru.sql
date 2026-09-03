-- ==========================================
-- 28: ЖИЖҮҮР БАГШ
-- ==========================================
create table if not exists duty_schedules (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  teacher_id uuid references employees(id) on delete cascade,
  assigned_by uuid references employees(id) on delete set null,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(date, teacher_id)
);
create index if not exists idx_duty_date on duty_schedules(date desc);
create index if not exists idx_duty_teacher on duty_schedules(teacher_id);

create table if not exists duty_reports (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  teacher_id uuid references employees(id) on delete cascade,
  category text not null default 'general' check (category in ('general','training','event','incident','other')),
  title text,
  description text,
  file_url text,
  extra_links jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_dutyrep_date on duty_reports(date desc);
create index if not exists idx_dutyrep_teacher on duty_reports(teacher_id);

alter table duty_schedules enable row level security;
alter table duty_reports   enable row level security;
drop policy if exists "public all duty_schedules" on duty_schedules;
drop policy if exists "public all duty_reports"   on duty_reports;
create policy "public all duty_schedules" on duty_schedules for all using (true) with check (true);
create policy "public all duty_reports"   on duty_reports   for all using (true) with check (true);

-- Trigger: тайлан оруулах → эрхлэгчид мэдэгдэл
create or replace function public.notify_on_duty_report()
returns trigger language plpgsql as $$
declare actor_name text;
begin
  select last_name || '.' || first_name into actor_name from employees where id = new.teacher_id;
  insert into notifications (recipient_role, actor_employee_id, category, title, message, link)
  values ('erhlegch', new.teacher_id, 'plan',
    '🛎 Жижүүрийн тайлан',
    coalesce(actor_name, 'Жижүүр багш') || ' · ' || new.date || coalesce(' · ' || new.title, ''),
    '/juuru');
  return new;
end; $$;

drop trigger if exists trg_notify_duty_report on duty_reports;
create trigger trg_notify_duty_report
after insert on duty_reports
for each row execute function public.notify_on_duty_report();
