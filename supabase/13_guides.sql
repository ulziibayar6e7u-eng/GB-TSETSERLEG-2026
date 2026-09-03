-- ==========================================
-- 13: ГАРЫН АВЛАГА (Багшийн)
-- ==========================================

create table if not exists curriculum_guides (
  id serial primary key,
  age_group text not null,  -- 'baga', 'dund', 'ahlah', 'beltgel'
  month int,                -- 1..12, null = intro/general
  section_title text,
  content text,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_guides_group_month on curriculum_guides(age_group, month);

alter table curriculum_guides enable row level security;
drop policy if exists "public all curriculum_guides" on curriculum_guides;
create policy "public all curriculum_guides" on curriculum_guides for all using (true) with check (true);
