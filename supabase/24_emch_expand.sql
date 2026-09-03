-- ==========================================
-- 24: ЭМЧИЙН ХЭСЭГ өргөтгөл
-- Ажилтан + хүүхдийн эрүүл мэнд, эмчийн хяналт
-- ==========================================

-- health_records — subject_type/subject_id
alter table health_records add column if not exists subject_type text default 'child' check (subject_type in ('child','staff'));
alter table health_records add column if not exists staff_id uuid references employees(id) on delete cascade;
alter table health_records alter column child_id drop not null;

-- Эмчийн хяналт (гал тогоо, цэвэрлэгээ, хоолны амт, ариутгал)
create table if not exists doctor_inspections (
  id uuid primary key default gen_random_uuid(),
  date date default current_date,
  category text not null check (category in ('kitchen','cleaning','food_quality','disinfection','serving','other')),
  target text, -- Хаана, юуг шалгасан (жш "Гал тогоо", "Бэлтгэл бүлгийн ариун цэвэр")
  status text default 'ok' check (status in ('ok','warning','critical')),
  description text,
  recommendations text,
  photo_url text,
  extra_links jsonb default '[]'::jsonb,
  inspector_id uuid references employees(id) on delete set null,
  reviewer_id uuid references employees(id) on delete set null,
  reviewer_note text,
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_insp_date on doctor_inspections(date desc);
create index if not exists idx_insp_status on doctor_inspections(status);

alter table doctor_inspections enable row level security;
drop policy if exists "public all doctor_inspections" on doctor_inspections;
create policy "public all doctor_inspections" on doctor_inspections for all using (true) with check (true);

-- Trigger: warning/critical хяналт → эрхлэгч рүү мэдэгдэл
create or replace function public.notify_on_inspection()
returns trigger language plpgsql as $$
declare
  actor_name text;
  cat_label text;
begin
  if new.status in ('warning','critical') then
    select last_name || '.' || first_name into actor_name from employees where id = new.inspector_id;
    cat_label := case new.category
      when 'kitchen' then '🍳 Гал тогоо'
      when 'cleaning' then '🧹 Цэвэрлэгээ'
      when 'food_quality' then '🍽 Хоолны чанар'
      when 'disinfection' then '🧴 Ариутгал'
      when 'serving' then '👔 Үйлчилгээ'
      else '📋 Хяналт' end;
    insert into notifications (recipient_role, actor_employee_id, category, title, message, link)
    values ('erhlegch', new.inspector_id, 'observation',
      (case when new.status = 'critical' then '🔴 ОНЦГОЙ: ' else '⚠️ Анхаарал: ' end) || cat_label,
      coalesce(actor_name, 'Эмч') || ' · ' || coalesce(new.target, '') || ' · ' || coalesce(new.description, ''),
      '/busad/emch');
  end if;
  return new;
end; $$;

drop trigger if exists trg_notify_inspection on doctor_inspections;
create trigger trg_notify_inspection
after insert or update on doctor_inspections
for each row execute function public.notify_on_inspection();
