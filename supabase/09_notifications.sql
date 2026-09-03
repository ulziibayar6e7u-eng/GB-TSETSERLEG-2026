-- ==========================================
-- 09: МЭДЭГДЛИЙН СИСТЕМ
-- Supabase → SQL Editor → RUN
-- ==========================================

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_role text,          -- 'erhlegch', 'arga_zuich' (олон хэрэглэгчид)
  recipient_employee_id uuid references employees(id) on delete cascade, -- эсвэл нэг хүнд
  actor_employee_id uuid references employees(id) on delete set null,
  category text not null,       -- 'observation', 'plan', 'assessment', 'attendance'
  title text not null,
  message text,
  link text,                    -- жш: /ajigllt?id=xxx
  seen boolean default false,
  seen_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_notif_recipient_role on notifications(recipient_role, seen) where seen = false;
create index if not exists idx_notif_recipient_emp  on notifications(recipient_employee_id, seen) where seen = false;
create index if not exists idx_notif_created        on notifications(created_at desc);

alter table notifications enable row level security;
drop policy if exists "public all notifications" on notifications;
create policy "public all notifications" on notifications for all using (true) with check (true);

-- ── Автомат trigger: ажиглалт нэмэгдэхэд leadership-т мэдэгдэл ──
create or replace function public.notify_on_observation()
returns trigger
language plpgsql
as $$
declare
  child_name text;
  actor_name text;
begin
  select last_name || '.' || first_name into child_name from children where id = new.child_id;
  select last_name || '.' || first_name into actor_name from employees where id = new.observer_id;

  insert into notifications (recipient_role, actor_employee_id, category, title, message, link)
  values
    ('erhlegch',   new.observer_id, 'observation', 'Шинэ ажиглалт бүртгэгдлээ',
     coalesce(actor_name, 'Ажилтан') || ' → ' || coalesce(child_name, 'хүүхэд') || ' ажигласан',
     '/ajigllt'),
    ('arga_zuich', new.observer_id, 'observation', 'Шинэ ажиглалт бүртгэгдлээ',
     coalesce(actor_name, 'Ажилтан') || ' → ' || coalesce(child_name, 'хүүхэд') || ' ажигласан',
     '/ajigllt');
  return new;
end;
$$;

drop trigger if exists trg_notify_observation on observations;
create trigger trg_notify_observation
after insert on observations
for each row execute function public.notify_on_observation();

-- ── Trigger: төлөвлөгөө хянуулахаар илгээсэн ──
create or replace function public.notify_on_plan_submit()
returns trigger
language plpgsql
as $$
declare
  actor_name text;
begin
  if new.status = 'submitted' and (old.status is null or old.status <> 'submitted') then
    select last_name || '.' || first_name into actor_name from employees where id = new.author_id;
    insert into notifications (recipient_role, actor_employee_id, category, title, message, link)
    values ('arga_zuich', new.author_id, 'plan',
            'Төлөвлөгөө хянах хүсэлт',
            coalesce(actor_name, 'Багш') || ': "' || new.title || '"',
            '/tulvluguu');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_plan_submit on plans;
create trigger trg_notify_plan_submit
after insert or update on plans
for each row execute function public.notify_on_plan_submit();

-- ── Trigger: төлөвлөгөө батлагдсан/буцаагдсан → зохиогчид ──
create or replace function public.notify_on_plan_review()
returns trigger
language plpgsql
as $$
declare
  reviewer_name text;
  status_label text;
begin
  if new.status in ('approved', 'returned') and (old.status is null or old.status <> new.status) then
    select last_name || '.' || first_name into reviewer_name from employees where id = new.reviewer_id;
    status_label := case when new.status = 'approved' then 'батлагдлаа' else 'буцаагдлаа' end;
    if new.author_id is not null then
      insert into notifications (recipient_employee_id, actor_employee_id, category, title, message, link)
      values (new.author_id, new.reviewer_id, 'plan',
              'Таны төлөвлөгөө ' || status_label,
              '"' || new.title || '" — ' || coalesce(reviewer_name, 'арга зүйч'),
              '/tulvluguu');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_plan_review on plans;
create trigger trg_notify_plan_review
after update on plans
for each row execute function public.notify_on_plan_review();
