-- ==========================================
-- 18: ЗАР МЭДЭЭ
-- ==========================================

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references employees(id) on delete set null,
  title text not null,
  content text,
  category text default 'general', -- general, meeting, event, notice
  file_url text,
  extra_links jsonb default '[]'::jsonb,
  pinned boolean default false,
  audience text default 'staff', -- 'staff' (бүх ажилтан), 'parents' (эцэг эх+ажилтан)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_ann_created on announcements(created_at desc);

alter table announcements enable row level security;
drop policy if exists "public all announcements" on announcements;
create policy "public all announcements" on announcements for all using (true) with check (true);
