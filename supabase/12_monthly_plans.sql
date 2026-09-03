-- ==========================================
-- 12: САРЫН ТӨЛӨВЛӨГӨӨ
-- ==========================================

create table if not exists monthly_plans (
  id uuid primary key default gen_random_uuid(),
  group_id int references groups(id) on delete cascade,
  author_id uuid references employees(id) on delete set null,
  year int not null,
  month int not null check (month between 1 and 12),
  theme text,
  method text,
  goals text,
  week_themes jsonb default '[]'::jsonb, -- [{week:1, theme:"..."}]
  outcomes jsonb default '[]'::jsonb,
  activities jsonb default '[]'::jsonb, -- [{title, description, date?}]
  content text,
  status text default 'draft' check (status in ('draft','submitted','approved','returned')),
  approver_id uuid references employees(id) on delete set null,
  approver_note text,
  approver_level text check (approver_level in ('excellent','good','revise')),
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(group_id, year, month)
);

create index if not exists idx_monthly_plans_group on monthly_plans(group_id);
create index if not exists idx_monthly_plans_author on monthly_plans(author_id);

alter table monthly_plans enable row level security;
drop policy if exists "public all monthly_plans" on monthly_plans;
create policy "public all monthly_plans" on monthly_plans for all using (true) with check (true);

create or replace function public.notify_on_monthly_submit()
returns trigger
language plpgsql
as $$
declare
  actor_name text;
  group_name text;
begin
  if new.status = 'submitted' and (old.status is null or old.status <> 'submitted') then
    select last_name || '.' || first_name into actor_name from employees where id = new.author_id;
    select name into group_name from groups where id = new.group_id;
    insert into notifications (recipient_role, actor_employee_id, category, title, message, link)
    values ('arga_zuich', new.author_id, 'plan',
      'Сарын төлөвлөгөө батлуулах хүсэлт',
      coalesce(actor_name, 'Багш') || ' · ' || coalesce(group_name, '') || ' · ' || new.year || '/' || new.month,
      '/tulvluguu/monthly/' || new.id::text);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_monthly_submit on monthly_plans;
create trigger trg_notify_monthly_submit
after insert or update on monthly_plans
for each row execute function public.notify_on_monthly_submit();
