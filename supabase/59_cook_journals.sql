-- ==========================================
-- 59: Тогоочийн 5 бүртгэлийн журнал
-- ==========================================

-- 1) Хүүхдийн хоолны хэмжээний бүртгэл (Portion size log)
create table if not exists cook_portion (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  group_id int references groups(id) on delete cascade,
  meal_slot text,           -- "1-р хоол", "2-р хоол", "3-р хоол", "4-р цайны цаг"
  portion_g int,            -- +70, +75 гэх мэт (үндсэн хэмжээ)
  extra_g int,              -- нэмэлт
  note text,
  author_id uuid references employees(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists idx_cp_date on cook_portion(date desc);

-- 2) Дээжийн бүртгэл
create table if not exists cook_sample (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  meal_name text not null,
  sample_taken_time text,
  sample_size text,
  keep_temp text,
  fridge_status text,
  taken_out_time text,
  disposal_note text,
  author_id uuid references employees(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists idx_cs_date on cook_sample(date desc);

-- 3) Хоол амтлуулсан бүртгэл
create table if not exists cook_taste (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  group_id int references groups(id) on delete set null,
  child_name text,
  child_age text,
  taster_id uuid references employees(id) on delete set null,
  comment text,
  author_id uuid references employees(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists idx_ct_date on cook_taste(date desc);

-- 4) Өдөр тутмын хүүхдийн тоо бүртгэл
create table if not exists cook_child_count (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  group_id int references groups(id) on delete cascade,
  count int not null default 0,
  author_id uuid references employees(id) on delete set null,
  created_at timestamptz default now(),
  unique(date, group_id)
);
create index if not exists idx_ccc_date on cook_child_count(date desc);

-- 5) Аяга таваг ариутгах график
create table if not exists cook_sanitation (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  group_id int references groups(id) on delete cascade,
  time_slot text not null,   -- "5:11", "5:14" гэх мэт эсвэл "Өглөө/Өдөр/Орой"
  done boolean default true,
  note text,
  author_id uuid references employees(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists idx_csan_date on cook_sanitation(date desc);

alter table cook_portion enable row level security;
alter table cook_sample enable row level security;
alter table cook_taste enable row level security;
alter table cook_child_count enable row level security;
alter table cook_sanitation enable row level security;
drop policy if exists "public all cook_portion" on cook_portion;
drop policy if exists "public all cook_sample" on cook_sample;
drop policy if exists "public all cook_taste" on cook_taste;
drop policy if exists "public all cook_child_count" on cook_child_count;
drop policy if exists "public all cook_sanitation" on cook_sanitation;
create policy "public all cook_portion" on cook_portion for all using (true) with check (true);
create policy "public all cook_sample" on cook_sample for all using (true) with check (true);
create policy "public all cook_taste" on cook_taste for all using (true) with check (true);
create policy "public all cook_child_count" on cook_child_count for all using (true) with check (true);
create policy "public all cook_sanitation" on cook_sanitation for all using (true) with check (true);
