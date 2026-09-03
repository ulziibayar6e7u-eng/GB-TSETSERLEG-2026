-- ==========================================
-- 10: ХӨГЖМИЙН ТУСГАЙ ШАЛГУУР ҮЗҮҮЛЭЛТ
-- Хуучин Хөгжим системээс шилжсэн
-- ==========================================

create table if not exists music_criteria (
  id serial primary key,
  level int not null,             -- 1..4 (насны түвшин)
  category text not null,         -- 'Мэдрэх', 'Илэрхийлэх', 'Бүтээх' болон дэд ангилал
  criterion_num int not null,     -- 1, 2, 3...
  text text,
  active boolean default true,
  unique(level, category, criterion_num)
);

create table if not exists music_criteria_checks (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references children(id) on delete cascade,
  level int not null,
  category text not null,
  criterion_num int not null,
  status text check (status in ('yes','no','partial')),
  note text,
  checked_by uuid references employees(id) on delete set null,
  updated_at timestamptz default now(),
  unique(child_id, level, category, criterion_num)
);

create index if not exists idx_mcc_child on music_criteria_checks(child_id);

-- Хөгжмийн ажиглалт/үнэлгээ (хуучин assessments)
create table if not exists music_assessments (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references children(id) on delete cascade,
  section text,          -- start, progress, end
  subsection text,       -- observ, talk, null
  date date default current_date,
  title text,
  text text,
  media jsonb default '[]'::jsonb,
  observer_id uuid references employees(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_ma_child on music_assessments(child_id);

alter table music_criteria         enable row level security;
alter table music_criteria_checks  enable row level security;
alter table music_assessments      enable row level security;

drop policy if exists "public all music_criteria" on music_criteria;
drop policy if exists "public all music_criteria_checks" on music_criteria_checks;
drop policy if exists "public all music_assessments" on music_assessments;

create policy "public all music_criteria"        on music_criteria        for all using (true) with check (true);
create policy "public all music_criteria_checks" on music_criteria_checks for all using (true) with check (true);
create policy "public all music_assessments"     on music_assessments     for all using (true) with check (true);
