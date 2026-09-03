-- ==========================================
-- 21: ДУГУЙЛАНГИЙН ҮЙЛ АЖИЛЛАГАА + БАТЛАМЖ
-- ==========================================

-- clubs хүснэгтэд статус, батламжийн талбарууд
alter table clubs add column if not exists status text default 'draft' check (status in ('draft','submitted','approved','returned'));
alter table clubs add column if not exists approver_id uuid references employees(id) on delete set null;
alter table clubs add column if not exists approver_note text;
alter table clubs add column if not exists reviewed_at timestamptz;

-- Дугуйлангийн үйл ажиллагаа (тайлагнах бүртгэл)
create table if not exists club_activities (
  id uuid primary key default gen_random_uuid(),
  club_id int references clubs(id) on delete cascade,
  author_id uuid references employees(id) on delete set null,
  date date default current_date,
  title text,
  description text,
  file_url text,
  extra_links jsonb default '[]'::jsonb,
  participants_count int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_club_act_club on club_activities(club_id);
create index if not exists idx_club_act_date on club_activities(date desc);

alter table club_activities enable row level security;
drop policy if exists "public all club_activities" on club_activities;
create policy "public all club_activities" on club_activities for all using (true) with check (true);

-- Trigger: дугуйлан батлуулах илгээхэд арга зүйчид мэдэгдэл
create or replace function public.notify_on_club_submit()
returns trigger language plpgsql as $$
declare
  actor_name text;
  teacher_name text;
begin
  if new.status = 'submitted' and (old.status is null or old.status <> 'submitted') then
    select last_name || '.' || first_name into actor_name from employees where auth_user_id = auth.uid();
    select last_name || '.' || first_name into teacher_name from employees where id = new.teacher_id;
    insert into notifications (recipient_role, actor_employee_id, category, title, message, link)
    values ('arga_zuich', new.teacher_id, 'plan',
      'Дугуйлан батлуулах хүсэлт',
      coalesce(teacher_name, 'Багш') || ' · ' || new.name,
      '/dugilan/' || new.id::text);
  end if;
  return new;
end; $$;

drop trigger if exists trg_notify_club_submit on clubs;
create trigger trg_notify_club_submit
after insert or update on clubs
for each row execute function public.notify_on_club_submit();

-- Trigger: шинэ үйл ажиллагаа нэмэхэд арга зүйч, эрхлэгчид мэдэгдэл
create or replace function public.notify_on_club_activity()
returns trigger language plpgsql as $$
declare
  actor_name text;
  club_name text;
begin
  select last_name || '.' || first_name into actor_name from employees where id = new.author_id;
  select name into club_name from clubs where id = new.club_id;
  insert into notifications (recipient_role, actor_employee_id, category, title, message, link) values
    ('arga_zuich', new.author_id, 'observation',
      'Дугуйлангийн үйл ажиллагаа',
      coalesce(actor_name, 'Багш') || ' · ' || coalesce(club_name, 'Дугуйлан') || ' · ' || coalesce(new.title, ''),
      '/dugilan/' || new.club_id::text),
    ('erhlegch', new.author_id, 'observation',
      'Дугуйлангийн үйл ажиллагаа',
      coalesce(actor_name, 'Багш') || ' · ' || coalesce(club_name, 'Дугуйлан') || ' · ' || coalesce(new.title, ''),
      '/dugilan/' || new.club_id::text);
  return new;
end; $$;

drop trigger if exists trg_notify_club_activity on club_activities;
create trigger trg_notify_club_activity
after insert on club_activities
for each row execute function public.notify_on_club_activity();
