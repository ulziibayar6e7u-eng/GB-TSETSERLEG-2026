-- ==========================================
-- 11: 7 ХОНОГИЙН ТӨЛӨВЛӨГӨӨ
-- 8 цагийн хэсэг × 5 өдөр = 40 нүд
-- ==========================================

create table if not exists weekly_plans (
  id uuid primary key default gen_random_uuid(),
  group_id int references groups(id) on delete cascade,
  author_id uuid references employees(id) on delete set null,
  year int not null,
  month int not null check (month between 1 and 12),
  week_num int not null check (week_num between 1 and 5),
  theme text,
  method text,
  new_words jsonb default '[]'::jsonb,
  outcomes jsonb default '[]'::jsonb,
  cells jsonb default '{}'::jsonb, -- { "0": {"0":"...","1":"..."} } — time_slot × day
  status text default 'draft' check (status in ('draft','submitted','approved','returned')),
  approver_id uuid references employees(id) on delete set null,
  approver_note text,
  approver_level text check (approver_level in ('excellent','good','revise')),
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(group_id, year, month, week_num)
);

create index if not exists idx_weekly_plans_group on weekly_plans(group_id);
create index if not exists idx_weekly_plans_author on weekly_plans(author_id);
create index if not exists idx_weekly_plans_status on weekly_plans(status);

-- Загвар (гарын авлагаас автомат бөглөх)
create table if not exists weekly_plan_templates (
  id serial primary key,
  group_code text not null,
  month int not null,
  week_num int not null,
  theme text,
  method text,
  new_words jsonb default '[]'::jsonb,
  outcomes jsonb default '[]'::jsonb,
  cells jsonb default '{}'::jsonb,
  unique(group_code, month, week_num)
);

alter table weekly_plans enable row level security;
alter table weekly_plan_templates enable row level security;
drop policy if exists "public all weekly_plans" on weekly_plans;
drop policy if exists "public all weekly_plan_templates" on weekly_plan_templates;
create policy "public all weekly_plans" on weekly_plans for all using (true) with check (true);
create policy "public all weekly_plan_templates" on weekly_plan_templates for all using (true) with check (true);

-- ── Trigger: 7 хоногийн төлөвлөгөө илгээхэд арга зүйчид мэдэгдэл ──
create or replace function public.notify_on_weekly_submit()
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
      '7 хоногийн төлөвлөгөө батлуулах хүсэлт',
      coalesce(actor_name, 'Багш') || ' · ' || coalesce(group_name, 'бүлэг') ||
        ' · ' || new.year || '/' || new.month || ' · ' || new.week_num || '-р долоо хоног',
      '/tulvluguu/weekly/' || new.id::text);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_weekly_submit on weekly_plans;
create trigger trg_notify_weekly_submit
after insert or update on weekly_plans
for each row execute function public.notify_on_weekly_submit();
