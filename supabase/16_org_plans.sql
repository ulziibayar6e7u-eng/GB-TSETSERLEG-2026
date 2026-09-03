-- ==========================================
-- 16: БАЙГУУЛЛАГЫН ТӨЛӨВЛӨГӨӨ
-- 6 төрөл × 5 slot (Төлөвлөгөө / Хагас жил биелэлт / Жилийн эцэс биелэлт /
--                   Хагас жил тайлан / Жилийн эцэс тайлан)
-- ==========================================

create table if not exists org_plan_documents (
  id uuid primary key default gen_random_uuid(),
  plan_type text not null,        -- 'teacher_performance', 'staff_activity', 'work_group', 'seasonal', 'training', 'finance'
  phase text not null check (phase in ('plan', 'half_realization', 'year_realization', 'half_report', 'year_report')),
  period text not null,           -- '2026-2027'
  author_id uuid references employees(id) on delete set null,
  title text,
  description text,
  file_url text,
  extra_links jsonb default '[]'::jsonb,
  status text default 'draft' check (status in ('draft','submitted','approved','returned')),
  reviewer_id uuid references employees(id) on delete set null,
  reviewer_note text,
  annotations jsonb default '[]'::jsonb, -- [{text, at, by, color}]
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_opd_type_phase on org_plan_documents(plan_type, phase);
create index if not exists idx_opd_author on org_plan_documents(author_id);
create index if not exists idx_opd_status on org_plan_documents(status);

alter table org_plan_documents enable row level security;
drop policy if exists "public all org_plan_documents" on org_plan_documents;
create policy "public all org_plan_documents" on org_plan_documents for all using (true) with check (true);

-- Storage bucket for plan documents
insert into storage.buckets (id, name, public)
values ('org-plans', 'org-plans', true)
on conflict (id) do update set public = true;

drop policy if exists "org plans public read"   on storage.objects;
drop policy if exists "org plans public write"  on storage.objects;
drop policy if exists "org plans public update" on storage.objects;
drop policy if exists "org plans public delete" on storage.objects;

create policy "org plans public read"   on storage.objects for select using (bucket_id = 'org-plans');
create policy "org plans public write"  on storage.objects for insert with check (bucket_id = 'org-plans');
create policy "org plans public update" on storage.objects for update using (bucket_id = 'org-plans');
create policy "org plans public delete" on storage.objects for delete using (bucket_id = 'org-plans');

-- Trigger: submit → erhlegch мэдэгдэл
create or replace function public.notify_on_org_plan_submit()
returns trigger language plpgsql as $$
declare actor_name text; type_label text;
begin
  if new.status = 'submitted' and (old.status is null or old.status <> 'submitted') then
    select last_name || '.' || first_name into actor_name from employees where id = new.author_id;
    type_label := case new.plan_type
      when 'teacher_performance' then 'Багшийн гүйцэтгэлийн'
      when 'staff_activity'      then 'Албан хаагчдын'
      when 'work_group'          then 'Ажлын хэсгийн'
      when 'seasonal'            then 'Цаг үетэй'
      when 'training'            then 'Сургалт хөгжлийн'
      when 'finance'             then 'Санхүү, аж ахуйн'
      else new.plan_type end;
    insert into notifications (recipient_role, actor_employee_id, category, title, message, link)
    values
      ('erhlegch', new.author_id, 'plan',
        type_label || ' төлөвлөгөө батлуулах хүсэлт',
        coalesce(actor_name, 'Ажилтан') || ' · ' || (case new.phase
          when 'plan' then 'Төлөвлөгөө'
          when 'half_realization' then 'Хагас жилийн биелэлт'
          when 'year_realization' then 'Жилийн эцсийн биелэлт'
          when 'half_report' then 'Хагас жилийн тайлан'
          when 'year_report' then 'Жилийн эцсийн тайлан'
          else new.phase end) || ' · ' || new.period,
        '/batlamj'),
      ('arga_zuich', new.author_id, 'plan',
        type_label || ' төлөвлөгөө батлуулах хүсэлт',
        coalesce(actor_name, 'Ажилтан') || ' · ' || (case new.phase
          when 'plan' then 'Төлөвлөгөө'
          when 'half_realization' then 'Хагас жилийн биелэлт'
          when 'year_realization' then 'Жилийн эцсийн биелэлт'
          when 'half_report' then 'Хагас жилийн тайлан'
          when 'year_report' then 'Жилийн эцсийн тайлан'
          else new.phase end) || ' · ' || new.period,
        '/batlamj');
  end if;
  return new;
end; $$;

drop trigger if exists trg_notify_org_plan on org_plan_documents;
create trigger trg_notify_org_plan
after insert or update on org_plan_documents
for each row execute function public.notify_on_org_plan_submit();
