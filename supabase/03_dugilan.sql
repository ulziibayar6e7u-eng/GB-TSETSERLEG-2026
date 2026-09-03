-- ==========================================
-- 03: ДУГУЙЛАН БҮТЭЦ
-- Supabase → SQL Editor → RUN
-- ==========================================

-- 1. Group төрөл нэмэх (age_group | alternative | club)
alter table groups add column if not exists type text default 'age_group';

update groups set type = 'age_group'  where code in ('baga','dund','ahlah','beltgel');
update groups set type = 'alternative' where code = 'huvilbart';
update groups set type = 'club'        where code = 'hogjim';

-- Хөгжмийн бүлэг → Хөгжмийн дугуйлан
update groups
   set name = 'Хөгжмийн дугуйлан', age_group = 'бүх нас'
 where code = 'hogjim';

-- 2. Хүүхэд ↔ Дугуйлан (олон дугуйланд явж болно)
create table if not exists child_clubs (
  id serial primary key,
  child_id uuid references children(id) on delete cascade,
  club_id int references groups(id) on delete cascade,
  joined_date date default current_date,
  status text default 'active',
  unique(child_id, club_id)
);

alter table child_clubs enable row level security;
drop policy if exists "public all child_clubs" on child_clubs;
create policy "public all child_clubs" on child_clubs for all using (true) with check (true);

-- 3. Хөгжмийн дугуйланд бүх хүүхдийг автоматаар бүртгэх (одоохондоо бүх хүүхэд хөгжимд хамрагдана)
insert into child_clubs (child_id, club_id)
select c.id, g.id
from children c
cross join groups g
where g.code = 'hogjim'
on conflict do nothing;
