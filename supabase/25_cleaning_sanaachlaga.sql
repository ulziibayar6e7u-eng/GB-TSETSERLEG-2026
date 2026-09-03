-- ==========================================
-- 25: Их цэвэрлэгээний хуваарь + Санаачилсан ажил
-- ==========================================

-- Их цэвэрлэгээний хуваарь (үйлчлэгч, гал тогооны туслах)
create table if not exists cleaning_schedules (
  id uuid primary key default gen_random_uuid(),
  date date default current_date,
  category text default 'general' check (category in ('general','deep','kitchen','disinfection','sanitary','other')),
  location text,             -- Хаана
  description text,           -- Юу цэвэрлэсэн
  status text default 'planned' check (status in ('planned','done','postponed')),
  photo_url text,
  extra_links jsonb default '[]'::jsonb,
  assignee_id uuid references employees(id) on delete set null,
  completed_at timestamptz,
  reviewer_id uuid references employees(id) on delete set null,
  reviewer_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_clean_date on cleaning_schedules(date desc);
create index if not exists idx_clean_assignee on cleaning_schedules(assignee_id);

alter table cleaning_schedules enable row level security;
drop policy if exists "public all cleaning_schedules" on cleaning_schedules;
create policy "public all cleaning_schedules" on cleaning_schedules for all using (true) with check (true);

-- Санаачилсан ажил (бүх ажилтанд)
create table if not exists initiative_works (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references employees(id) on delete cascade,
  date date default current_date,
  title text not null,
  description text,
  impact text,               -- Гарсан үр дүн
  photo_url text,
  extra_links jsonb default '[]'::jsonb,
  reviewer_id uuid references employees(id) on delete set null,
  reviewer_note text,
  rating int check (rating >= 0 and rating <= 100),
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_init_author on initiative_works(author_id);
create index if not exists idx_init_date on initiative_works(date desc);

alter table initiative_works enable row level security;
drop policy if exists "public all initiative_works" on initiative_works;
create policy "public all initiative_works" on initiative_works for all using (true) with check (true);

-- Trigger: санаачилсан ажил нэмэхэд эрхлэгч, арга зүйчид мэдэгдэл
create or replace function public.notify_on_initiative()
returns trigger language plpgsql as $$
declare actor_name text;
begin
  select last_name || '.' || first_name into actor_name from employees where id = new.author_id;
  insert into notifications (recipient_role, actor_employee_id, category, title, message, link) values
    ('erhlegch',   new.author_id, 'observation', '💡 Санаачилсан ажил', coalesce(actor_name, 'Ажилтан') || ' · ' || coalesce(new.title, ''), '/sanaachlaga'),
    ('arga_zuich', new.author_id, 'observation', '💡 Санаачилсан ажил', coalesce(actor_name, 'Ажилтан') || ' · ' || coalesce(new.title, ''), '/sanaachlaga');
  return new;
end; $$;

drop trigger if exists trg_notify_initiative on initiative_works;
create trigger trg_notify_initiative
after insert on initiative_works
for each row execute function public.notify_on_initiative();
