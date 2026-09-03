-- ==========================================
-- 02: БҮЛЭГ, ХҮҮХЭД, ЭЦЭГ ЭХ
-- Supabase → SQL Editor → RUN
-- ==========================================

create table if not exists groups (
  id serial primary key,
  code text unique not null,
  name text not null,
  nickname text,
  age_group text,
  color text default '#3b82f6',
  icon text default '🏫',
  created_at timestamptz default now()
);

insert into groups (code, name, nickname, age_group, color, icon) values
  ('baga',     'Бага бүлэг',       'Нархан',    '2-3 нас', '#ec4899', '👶'),
  ('dund',     'Дунд бүлэг',       'Багачууд',  '3-4 нас', '#f59e0b', '🧒'),
  ('ahlah',    'Ахлах бүлэг',      'Дэгдээхий', '4-5 нас', '#eab308', '🐣'),
  ('beltgel',  'Бэлтгэл бүлэг',    'Бүжинхэн',  '5-6 нас', '#8b5cf6', '🐰'),
  ('huvilbart','Хувилбарт сургалт', null,       'холимог', '#06b6d4', '🎨'),
  ('hogjim',   'Хөгжмийн бүлэг',    null,       'бүх нас', '#7c3aed', '🎵')
on conflict (code) do nothing;

create table if not exists group_teachers (
  id serial primary key,
  group_id int references groups(id) on delete cascade,
  employee_id uuid references employees(id) on delete cascade,
  role_in_group text default 'bagsh',
  created_at timestamptz default now(),
  unique(group_id, employee_id, role_in_group)
);

insert into group_teachers (group_id, employee_id, role_in_group)
select g.id, e.id, case when e.role='bagsh' then 'bagsh' else 'bagsh_tuslah' end
from employees e, groups g
where (e.first_name='Тунгалаг' and g.code='beltgel')
   or (e.first_name='Сайнзаяа' and g.code='beltgel')
   or (e.first_name='Отгонзаяа' and g.code='ahlah')
   or (e.first_name='Элбэгзаяа' and g.code='ahlah')
   or (e.first_name='Эрдэнэцэцэг' and g.code='dund')
   or (e.first_name='Уранчимэг' and g.code='dund')
   or (e.first_name='Баяржаргал' and g.code='baga')
   or (e.first_name='Амарбаясгалан' and g.code='baga')
   or (e.first_name='Билэгсайхан' and g.code='huvilbart')
   or (e.first_name='Өлзийбаяр' and g.code='hogjim')
on conflict do nothing;

create table if not exists children (
  id uuid primary key default gen_random_uuid(),
  registration_no text unique,
  last_name text not null,
  first_name text not null,
  birth_date date,
  gender text,
  group_id int references groups(id) on delete set null,
  enrolled_date date default current_date,
  photo_url text,
  notes text,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists parents (
  id uuid primary key default gen_random_uuid(),
  last_name text not null,
  first_name text not null,
  phone text,
  email text,
  relation text,
  register_no text,
  created_at timestamptz default now()
);

create table if not exists child_parents (
  id serial primary key,
  child_id uuid references children(id) on delete cascade,
  parent_id uuid references parents(id) on delete cascade,
  is_primary boolean default false,
  unique(child_id, parent_id)
);

alter table groups enable row level security;
alter table group_teachers enable row level security;
alter table children enable row level security;
alter table parents enable row level security;
alter table child_parents enable row level security;

drop policy if exists "public all groups" on groups;
drop policy if exists "public all group_teachers" on group_teachers;
drop policy if exists "public all children" on children;
drop policy if exists "public all parents" on parents;
drop policy if exists "public all child_parents" on child_parents;

create policy "public all groups"          on groups          for all using (true) with check (true);
create policy "public all group_teachers"  on group_teachers  for all using (true) with check (true);
create policy "public all children"        on children        for all using (true) with check (true);
create policy "public all parents"         on parents         for all using (true) with check (true);
create policy "public all child_parents"   on child_parents   for all using (true) with check (true);
