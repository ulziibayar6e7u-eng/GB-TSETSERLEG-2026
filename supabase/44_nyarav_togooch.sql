-- ==========================================
-- 44: Нярав + Тогооч цэсийн өргөтгөл
-- ==========================================

-- Нярав: хугацаа дуусах бүтээгдэхүүн + ангилал
alter table inventory_items add column if not exists expiry_date date;
alter table inventory_items add column if not exists supplier text;
create index if not exists idx_inv_expiry on inventory_items(expiry_date);

-- Тогооч: өдөр тутмын хоол бэлтгэлийн журнал
create table if not exists daily_meals (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  meal_type text check (meal_type in ('breakfast','lunch','snack','dinner')),
  meal_name text not null,
  age_group text default 'all' check (age_group in ('2_3','4_5','other','all')),
  servings int,
  ingredients text,
  process_note text,
  hygiene_check boolean default false,
  photo_url text,
  author_id uuid references employees(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_dmeal_date on daily_meals(date desc);

alter table daily_meals enable row level security;
drop policy if exists "public all daily_meals" on daily_meals;
create policy "public all daily_meals" on daily_meals for all using (true) with check (true);
