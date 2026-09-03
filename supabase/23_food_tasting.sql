-- ==========================================
-- 23: ХООЛНЫ ЦЭС насны төрлөөр + Хоолны амталгаа
-- ==========================================

-- weekly_menus дээр нас нэмэх
alter table weekly_menus add column if not exists age_group text default 'all' check (age_group in ('2_3','4_5','other','all'));
alter table weekly_menus drop constraint if exists weekly_menus_year_week_num_key;
create unique index if not exists uq_weekly_menus_year_week_age on weekly_menus(year, week_num, age_group);

-- Хоолны амталгаа
create table if not exists food_tastings (
  id uuid primary key default gen_random_uuid(),
  date date default current_date,
  meal_name text not null,
  meal_type text, -- breakfast/lunch/snack/dinner
  age_group text default 'all' check (age_group in ('2_3','4_5','other','all')),
  photo_url text,
  note text,
  feedbacks jsonb default '[]'::jsonb, -- [{by_id, by_name, by_role, rating (1-5), comment, at}]
  author_id uuid references employees(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_food_tastings_date on food_tastings(date desc);

alter table food_tastings enable row level security;
drop policy if exists "public all food_tastings" on food_tastings;
create policy "public all food_tastings" on food_tastings for all using (true) with check (true);
