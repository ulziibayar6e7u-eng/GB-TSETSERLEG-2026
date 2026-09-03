-- ==========================================
-- 22: БУСАД АЖИЛТНЫ МОДУЛИУД
-- Эмч, Тогооч, Нярав, Нягтлан, Үйлчлэгч, Харуул
-- ==========================================

-- ── 1. ЭМЧ: Эрүүл мэндийн үзлэг, өвчлөл, вакцин ──
create table if not exists health_records (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references children(id) on delete cascade,
  date date default current_date,
  record_type text not null check (record_type in ('checkup','illness','vaccine','injury','note')),
  height_cm numeric(5,1),
  weight_kg numeric(5,1),
  temperature numeric(4,1),
  diagnosis text,
  treatment text,
  vaccine_name text,
  next_date date,
  note text,
  file_url text,
  created_by uuid references employees(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists idx_health_child on health_records(child_id);
create index if not exists idx_health_date on health_records(date desc);

-- ── 2. ТОГООЧ: 7 хоногийн хоолны цэс ──
create table if not exists weekly_menus (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  week_num int not null,
  monday_date date,
  meals jsonb default '{}'::jsonb, -- { "0": {breakfast, lunch, snack, dinner}, ..., "4": {...} }
  notes text,
  author_id uuid references employees(id) on delete set null,
  file_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(year, week_num)
);

-- ── 3. НЯРАВ: Нөөц, худалдан авалт ──
create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  unit text default 'ш',
  quantity numeric default 0,
  min_quantity numeric default 0,
  location text,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references inventory_items(id) on delete cascade,
  movement_type text not null check (movement_type in ('purchase','distribute','adjust','writeoff')),
  quantity numeric not null,
  date date default current_date,
  recipient text,   -- Хэн авсан
  price numeric,
  supplier text,
  note text,
  file_url text,    -- Баримт
  author_id uuid references employees(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists idx_inv_mov_item on inventory_movements(item_id);
create index if not exists idx_inv_mov_date on inventory_movements(date desc);

-- ── 4. НЯГТЛАН: Санхүүгийн бүртгэл ──
create table if not exists financial_records (
  id uuid primary key default gen_random_uuid(),
  date date default current_date,
  category text not null, -- 'income','expense','salary','budget'
  subcategory text,
  amount numeric not null,
  description text,
  file_url text,
  author_id uuid references employees(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists idx_fin_date on financial_records(date desc);

-- ── 5. БУСАД: Өдрийн ажлын тайлан (үйлчлэгч, харуул гэх мэт бүгд) ──
create table if not exists staff_daily_logs (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references employees(id) on delete cascade,
  date date default current_date,
  shift text, -- 'morning','day','evening','night'
  title text,
  description text,
  file_url text,
  extra_links jsonb default '[]'::jsonb,
  reviewer_id uuid references employees(id) on delete set null,
  reviewer_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_log_author on staff_daily_logs(author_id);
create index if not exists idx_log_date on staff_daily_logs(date desc);

-- ── RLS ──
alter table health_records         enable row level security;
alter table weekly_menus            enable row level security;
alter table inventory_items         enable row level security;
alter table inventory_movements     enable row level security;
alter table financial_records       enable row level security;
alter table staff_daily_logs        enable row level security;

drop policy if exists "public all health_records"     on health_records;
drop policy if exists "public all weekly_menus"        on weekly_menus;
drop policy if exists "public all inventory_items"     on inventory_items;
drop policy if exists "public all inventory_movements" on inventory_movements;
drop policy if exists "public all financial_records"   on financial_records;
drop policy if exists "public all staff_daily_logs"    on staff_daily_logs;

create policy "public all health_records"     on health_records     for all using (true) with check (true);
create policy "public all weekly_menus"       on weekly_menus       for all using (true) with check (true);
create policy "public all inventory_items"    on inventory_items    for all using (true) with check (true);
create policy "public all inventory_movements" on inventory_movements for all using (true) with check (true);
create policy "public all financial_records"  on financial_records  for all using (true) with check (true);
create policy "public all staff_daily_logs"   on staff_daily_logs   for all using (true) with check (true);
