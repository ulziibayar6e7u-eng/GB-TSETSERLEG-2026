-- ==========================================
-- 26: ЧӨЛӨӨ АВАХ ХҮСЭЛТ
-- ==========================================
create table if not exists leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  leave_type text not null check (leave_type in ('paid','unpaid')),
  reason text,
  start_date date not null,
  end_date date not null,
  days_count int,
  file_url text,
  extra_links jsonb default '[]'::jsonb,
  status text default 'submitted' check (status in ('submitted','approved','rejected','cancelled')),
  approver_id uuid references employees(id) on delete set null,
  approver_note text,
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_leave_emp on leave_requests(employee_id);
create index if not exists idx_leave_status on leave_requests(status);
create index if not exists idx_leave_start on leave_requests(start_date desc);

alter table leave_requests enable row level security;
drop policy if exists "public all leave_requests" on leave_requests;
create policy "public all leave_requests" on leave_requests for all using (true) with check (true);

-- Trigger: илгээх → эрхлэгчид мэдэгдэл
create or replace function public.notify_on_leave_submit()
returns trigger language plpgsql as $$
declare actor_name text; days int;
begin
  if new.status = 'submitted' and (old.status is null or old.status <> 'submitted') then
    select last_name || '.' || first_name into actor_name from employees where id = new.employee_id;
    days := (new.end_date - new.start_date) + 1;
    insert into notifications (recipient_role, actor_employee_id, category, title, message, link)
    values ('erhlegch', new.employee_id, 'plan',
      '📅 Чөлөөний хүсэлт',
      coalesce(actor_name, 'Ажилтан') || ' · ' || (case new.leave_type when 'paid' then 'Цалинтай' else 'Цалингүй' end) || ' · ' || days || ' хоног (' || new.start_date || ' — ' || new.end_date || ')',
      '/chuluu');
  end if;
  return new;
end; $$;

drop trigger if exists trg_notify_leave_submit on leave_requests;
create trigger trg_notify_leave_submit
after insert or update on leave_requests
for each row execute function public.notify_on_leave_submit();

-- Trigger: батлагдах/татгалзах → ажилтанд мэдэгдэл
create or replace function public.notify_on_leave_review()
returns trigger language plpgsql as $$
declare reviewer_name text;
begin
  if new.status in ('approved','rejected') and (old.status is null or old.status <> new.status) then
    select last_name || '.' || first_name into reviewer_name from employees where id = new.approver_id;
    insert into notifications (recipient_employee_id, actor_employee_id, category, title, message, link)
    values (new.employee_id, new.approver_id, 'plan',
      (case when new.status = 'approved' then '✅ Чөлөө батлагдлаа' else '❌ Чөлөө татгалзлаа' end),
      coalesce(reviewer_name, 'Эрхлэгч') || ' · ' || new.start_date || ' — ' || new.end_date,
      '/chuluu');
  end if;
  return new;
end; $$;

drop trigger if exists trg_notify_leave_review on leave_requests;
create trigger trg_notify_leave_review
after update on leave_requests
for each row execute function public.notify_on_leave_review();
