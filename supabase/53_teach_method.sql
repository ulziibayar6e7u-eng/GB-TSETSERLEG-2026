-- ==========================================
-- 53: Заах аргын нэгдлийн ажил
-- ==========================================
-- kind: 'activity' (үйл ажиллагаа/удирдамж), 'support' (сургалтын дэмжлэг),
--       'reading' (чанга уншлага), 'walk' (зугаалгын цаг)
create table if not exists teach_method (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('activity','support','reading','walk')),
  date date not null default current_date,
  title text not null,
  note text,
  author_id uuid references employees(id) on delete set null,
  target_teacher_id uuid references employees(id) on delete set null,  -- support: багш
  subject_code text,                                                     -- support: судлагдахуун
  group_id int references groups(id) on delete set null,                 -- reading/walk
  file_url text,
  media_urls jsonb default '[]'::jsonb,
  extra_links jsonb default '[]'::jsonb,
  is_pinned boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_tm_kind_date on teach_method(kind, date desc);
create index if not exists idx_tm_group on teach_method(group_id);
create index if not exists idx_tm_teacher on teach_method(target_teacher_id);

alter table teach_method enable row level security;
drop policy if exists "public all teach_method" on teach_method;
create policy "public all teach_method" on teach_method for all using (true) with check (true);
