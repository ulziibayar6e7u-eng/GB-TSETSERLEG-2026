-- ==========================================
-- 17: БАГШИЙН ТУСЛАХЫН БҮРТГЭЛҮҮД
-- ==========================================

create table if not exists tuslah_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  category text not null check (category in ('dadal', 'ahits', 'sanaachlaga')),
  title text,
  description text,
  child_id uuid references children(id) on delete set null,
  date date default current_date,
  file_url text,
  extra_links jsonb default '[]'::jsonb,
  reviewer_id uuid references employees(id) on delete set null,
  reviewer_note text,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_tuslah_emp on tuslah_records(employee_id);
create index if not exists idx_tuslah_cat on tuslah_records(category);

alter table tuslah_records enable row level security;
drop policy if exists "public all tuslah_records" on tuslah_records;
create policy "public all tuslah_records" on tuslah_records for all using (true) with check (true);

-- Trigger: тэуслах бүртгэл нэмэхэд арга зүйч, эрхлэгчид мэдэгдэл
create or replace function public.notify_on_tuslah_insert()
returns trigger language plpgsql as $$
declare
  actor_name text;
  cat_label text;
begin
  select last_name || '.' || first_name into actor_name from employees where id = new.employee_id;
  cat_label := case new.category
    when 'dadal'       then '🌱 Дадал хэвшил'
    when 'ahits'       then '📈 Хүүхдийн ахиц'
    when 'sanaachlaga' then '💡 Санаачилсан ажил'
    else new.category end;
  insert into notifications (recipient_role, actor_employee_id, category, title, message, link) values
    ('arga_zuich', new.employee_id, 'observation',
      'Багшийн туслахын шинэ бүртгэл',
      coalesce(actor_name, 'Туслах') || ' · ' || cat_label || ' · ' || coalesce(new.title, ''),
      '/tuslah/' || new.employee_id::text || '?tab=' || new.category),
    ('erhlegch', new.employee_id, 'observation',
      'Багшийн туслахын шинэ бүртгэл',
      coalesce(actor_name, 'Туслах') || ' · ' || cat_label || ' · ' || coalesce(new.title, ''),
      '/tuslah/' || new.employee_id::text || '?tab=' || new.category);
  return new;
end; $$;

drop trigger if exists trg_notify_tuslah_insert on tuslah_records;
create trigger trg_notify_tuslah_insert
after insert on tuslah_records
for each row execute function public.notify_on_tuslah_insert();
