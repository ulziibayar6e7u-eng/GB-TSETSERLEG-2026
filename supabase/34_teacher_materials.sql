-- ==========================================
-- 34: Багшийн хэрэглэгдэхүүн / нэмэлт хөтөлбөр
-- ==========================================
create table if not exists teacher_materials (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references employees(id) on delete cascade,
  group_id int references groups(id) on delete set null,
  category text not null check (category in ('material','program','event','other')),
  title text not null,
  description text,
  file_url text,
  extra_links jsonb default '[]'::jsonb,
  status text default 'draft' check (status in ('draft','submitted','approved','returned')),
  reviewer_id uuid references employees(id) on delete set null,
  reviewer_note text,
  reviewed_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_tm_author on teacher_materials(author_id);
create index if not exists idx_tm_status on teacher_materials(status);

alter table teacher_materials enable row level security;
drop policy if exists "public all teacher_materials" on teacher_materials;
create policy "public all teacher_materials" on teacher_materials for all using (true) with check (true);

-- Илгээхэд арга зүйчид мэдэгдэл
create or replace function public.notify_on_material_submit()
returns trigger language plpgsql as $$
declare actor_name text; cat_name text;
begin
  if new.status = 'submitted' and (old.status is null or old.status <> 'submitted') then
    select last_name || '.' || first_name into actor_name from employees where id = new.author_id;
    cat_name := case new.category
      when 'material' then '📎 Хэрэглэгдэхүүн'
      when 'program' then '📘 Нэмэлт хөтөлбөр'
      when 'event' then '🎉 Арга хэмжээ'
      else '📝 Бусад' end;
    insert into notifications (recipient_role, actor_employee_id, category, title, message, link)
    values ('arga_zuich', new.author_id, 'plan',
      '📤 Батлуулах хүсэлт',
      coalesce(actor_name, 'Багш') || ' · ' || cat_name || ' · ' || new.title,
      '/batlamj');
  end if;
  return new;
end; $$;

drop trigger if exists trg_notify_material_submit on teacher_materials;
create trigger trg_notify_material_submit
after insert or update on teacher_materials
for each row execute function public.notify_on_material_submit();

-- Хянасны дараа зохиогчид мэдэгдэл
create or replace function public.notify_on_material_review()
returns trigger language plpgsql as $$
begin
  if new.status in ('approved','returned') and (old.status is null or old.status <> new.status) then
    insert into notifications (recipient_employee_id, actor_employee_id, category, title, message, link)
    values (new.author_id, new.reviewer_id, 'plan',
      (case when new.status = 'approved' then '✅ Батлагдлаа' else '↩️ Буцаагдлаа' end),
      new.title || (case when new.reviewer_note is not null then ' · ' || new.reviewer_note else '' end),
      '/heregleg');
  end if;
  return new;
end; $$;

drop trigger if exists trg_notify_material_review on teacher_materials;
create trigger trg_notify_material_review
after update on teacher_materials
for each row execute function public.notify_on_material_review();
