-- ==========================================
-- 07: БАГШИЙН МОДУЛИУД
-- Ирц, Ажиглалт, Хөгжлийн үнэлгээ, Төлөвлөгөө
-- Supabase → SQL Editor → RUN
-- ==========================================

-- ── 1. ХҮҮХДИЙН ИРЦ ──
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references children(id) on delete cascade,
  date date not null default current_date,
  status text not null check (status in ('irsen', 'iree_gui', 'chuluutei', 'uvchtei')),
  note text,
  marked_by uuid references employees(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(child_id, date)
);

create index if not exists idx_attendance_date on attendance(date);
create index if not exists idx_attendance_child on attendance(child_id);

-- ── 2. АЖИЛТНЫ ИРЦ ──
create table if not exists staff_attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  date date not null default current_date,
  status text not null check (status in ('irsen', 'hotsorson', 'chuluutei', 'uvchtei', 'tomilolt', 'tasalsan')),
  note text,
  marked_by uuid references employees(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(employee_id, date)
);

-- ── 3. ХӨГЖЛИЙН ЧИГЛЭЛҮҮД ──
create table if not exists development_areas (
  id serial primary key,
  code text unique not null,
  name text not null,
  icon text,
  color text,
  sort_order int default 0
);

insert into development_areas (code, name, icon, color, sort_order) values
  ('cognitive',   'Танин мэдэхүй',              '🧠', '#8b5cf6', 1),
  ('language',    'Хэл яриа',                    '🗣',  '#3b82f6', 2),
  ('social',      'Нийгэмшихүй, сэтгэл хөдлөл',  '❤️', '#ec4899', 3),
  ('physical',    'Бие бялдар',                  '🏃', '#10b981', 4),
  ('art',         'Урлаг, бүтээлч байдал',       '🎨', '#f59e0b', 5),
  ('music',       'Хөгжим',                      '🎵', '#a855f7', 6),
  ('self_care',   'Өөртөө үйлчлэх чадвар',       '🧩', '#06b6d4', 7)
on conflict (code) do nothing;

-- ── 4. ӨДӨР ТУТМЫН АЖИГЛАЛТ ──
create table if not exists observations (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references children(id) on delete cascade,
  observer_id uuid references employees(id) on delete set null,
  date date not null default current_date,
  activity text,
  observation text not null,
  area_code text references development_areas(code),
  level text check (level in ('demjleg', 'hogjij', 'nasandaa', 'ahisan')),
  photo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- level:
-- demjleg  = Дэмжлэг шаардлагатай
-- hogjij   = Хөгжиж байгаа
-- nasandaa = Насандаа тохирсон
-- ahisan   = Ахисан түвшин

create index if not exists idx_observations_child on observations(child_id);
create index if not exists idx_observations_date on observations(date);
create index if not exists idx_observations_observer on observations(observer_id);

-- ── 4b. ХӨГЖЛИЙН СУУРЬ ҮЗҮҮЛЭЛТҮҮД (СӨБ хөтөлбөрийн дагуу) ──
-- Өмнөх СӨБ_БҮЛГИЙН_БАГШ системээс шилжүүлнэ (outcomes-data.js)
create table if not exists outcomes (
  id serial primary key,
  age_group text not null,      -- 'baga', 'dund', 'ahlah', 'beltgel'
  area_code text not null,      -- 'urlag', 'bno', 'aa_uhaan', 'hodolgoon', 'hel_yaria', 'tanin_medehui', etc
  code text not null,           -- 'ЗУ2.2б', 'БНО2.1а' etc
  text text not null,           -- Бүтэн шалгуурын текст
  sort_order int default 0,
  active boolean default true,
  unique(age_group, code)
);

create index if not exists idx_outcomes_age_area on outcomes(age_group, area_code);

-- ── 4c. ХҮҮХЭД БҮРИЙН ШАЛГУУР ТЭМДЭГЛЭЛ ──
create table if not exists outcome_checks (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references children(id) on delete cascade,
  outcome_id int references outcomes(id) on delete cascade,
  status text default 'not_checked' check (status in ('not_checked', 'in_progress', 'achieved', 'need_support')),
  checked_by uuid references employees(id) on delete set null,
  note text,
  checked_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(child_id, outcome_id)
);

create index if not exists idx_outcome_checks_child on outcome_checks(child_id);

-- ── 5. ХӨГЖЛИЙН НЭГТГЭСЭН ҮНЭЛГЭЭ ──
create table if not exists development_assessments (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references children(id) on delete cascade,
  area_code text references development_areas(code),
  period text, -- '2026-Q1', '2026-08' etc
  score int check (score >= 0 and score <= 100),
  level text check (level in ('demjleg', 'hogjij', 'nasandaa', 'ahisan')),
  note text,
  assessed_by uuid references employees(id) on delete set null,
  assessed_at date default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_assessments_child on development_assessments(child_id);
create index if not exists idx_assessments_area on development_assessments(area_code);

-- ── 6. ТӨЛӨВЛӨГӨӨ ──
create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  group_id int references groups(id) on delete set null,
  club_id int references clubs(id) on delete set null,
  author_id uuid references employees(id) on delete set null,
  plan_type text check (plan_type in ('daily', 'weekly', 'monthly')),
  period_start date not null,
  period_end date,
  title text not null,
  content text,
  status text default 'draft' check (status in ('draft', 'submitted', 'returned', 'approved')),
  reviewer_id uuid references employees(id) on delete set null,
  reviewer_note text,
  reviewed_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_plans_group on plans(group_id);
create index if not exists idx_plans_author on plans(author_id);
create index if not exists idx_plans_status on plans(status);

-- ── 7. ӨДӨР ТУТМЫН ҮЙЛ АЖИЛЛАГАА (Багш өдөр бүр бүртгэнэ) ──
create table if not exists daily_activities (
  id uuid primary key default gen_random_uuid(),
  group_id int references groups(id) on delete set null,
  club_id int references clubs(id) on delete set null,
  author_id uuid references employees(id) on delete set null,
  date date not null default current_date,
  activity_type text, -- 'huguim', 'tanin_medehui', 'hel_yaria', etc
  topic text,
  description text,
  participants_count int,
  observed_count int,
  photo_url text,
  note text,
  created_at timestamptz default now()
);

-- ── RLS (одоохондоо нээлттэй, дараа хатууруулна) ──
alter table attendance             enable row level security;
alter table staff_attendance       enable row level security;
alter table development_areas      enable row level security;
alter table outcomes               enable row level security;
alter table outcome_checks         enable row level security;
alter table observations           enable row level security;
alter table development_assessments enable row level security;
alter table plans                  enable row level security;
alter table daily_activities       enable row level security;

drop policy if exists "public all attendance"             on attendance;
drop policy if exists "public all staff_attendance"       on staff_attendance;
drop policy if exists "public read development_areas"     on development_areas;
drop policy if exists "public all outcomes"               on outcomes;
drop policy if exists "public all outcome_checks"         on outcome_checks;
drop policy if exists "public all observations"           on observations;
drop policy if exists "public all development_assessments" on development_assessments;
drop policy if exists "public all plans"                  on plans;
drop policy if exists "public all daily_activities"       on daily_activities;

create policy "public all attendance"              on attendance              for all using (true) with check (true);
create policy "public all staff_attendance"        on staff_attendance        for all using (true) with check (true);
create policy "public read development_areas"      on development_areas       for select using (true);
create policy "public all outcomes"                on outcomes                for all using (true) with check (true);
create policy "public all outcome_checks"          on outcome_checks          for all using (true) with check (true);
create policy "public all observations"            on observations            for all using (true) with check (true);
create policy "public all development_assessments" on development_assessments for all using (true) with check (true);
create policy "public all plans"                   on plans                   for all using (true) with check (true);
create policy "public all daily_activities"        on daily_activities        for all using (true) with check (true);
