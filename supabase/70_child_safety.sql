-- ==========================================
-- 70: Хүүхэд хамгааллын цэс
-- ==========================================
-- Бодлого/журмын баримт бичиг
create table if not exists safety_docs (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('camera','hand_to_hand','policy','ethics')),
  title text not null,
  description text,
  file_url text,
  media_urls jsonb default '[]'::jsonb,
  author_id uuid references employees(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_sd_cat on safety_docs(category);

-- Цаг үетэй холбоотой хийгдсэн ажлууд
create table if not exists safety_activities (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  title text not null,
  description text,
  file_url text,
  media_urls jsonb default '[]'::jsonb,
  author_id uuid references employees(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_sa_date on safety_activities(date desc);

alter table safety_docs enable row level security;
alter table safety_activities enable row level security;
drop policy if exists "public all safety_docs" on safety_docs;
drop policy if exists "public all safety_activities" on safety_activities;
create policy "public all safety_docs" on safety_docs for all using (true) with check (true);
create policy "public all safety_activities" on safety_activities for all using (true) with check (true);
