-- ==========================================
-- 05: ДУГУЙЛАН (Багш бүр өөрийн)
-- Supabase → SQL Editor → RUN
-- ==========================================

-- Хуучин child_clubs (groups руу зааж байсныг) устгах
drop table if exists child_clubs cascade;

-- Дугуйлангийн үндсэн хүснэгт
create table if not exists clubs (
  id serial primary key,
  name text not null,
  icon text default '🎨',
  color text default '#7c3aed',
  teacher_id uuid references employees(id) on delete set null,
  description text,
  created_at timestamptz default now()
);

-- Хүүхэд ↔ Дугуйлан
create table if not exists child_clubs (
  id serial primary key,
  child_id uuid references children(id) on delete cascade,
  club_id int references clubs(id) on delete cascade,
  joined_date date default current_date,
  status text default 'active',
  unique(child_id, club_id)
);

alter table clubs enable row level security;
alter table child_clubs enable row level security;

drop policy if exists "public all clubs" on clubs;
drop policy if exists "public all child_clubs" on child_clubs;

create policy "public all clubs"       on clubs       for all using (true) with check (true);
create policy "public all child_clubs" on child_clubs for all using (true) with check (true);

-- Жишээ: Өлзий багшийн Хөгжмийн дугуйлан үүсгээд бүх хүүхдийг оруулах
insert into clubs (name, icon, color, teacher_id, description)
select 'Хөгжмийн дугуйлан', '🎵', '#7c3aed', e.id, 'Хөгжмийн авьяас, чадвар хөгжүүлэх'
from employees e
where e.first_name = 'Өлзийбаяр'
on conflict do nothing;

insert into child_clubs (child_id, club_id)
select c.id, k.id
from children c
cross join clubs k
where k.name = 'Хөгжмийн дугуйлан'
on conflict do nothing;
