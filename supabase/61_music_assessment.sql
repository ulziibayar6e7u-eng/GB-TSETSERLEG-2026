-- ==========================================
-- 61: Хөгжмийн багшийн хүүхэд үнэлэлт
-- ==========================================
create table if not exists music_assessment (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references children(id) on delete cascade,
  date date not null default current_date,
  category text check (category in ('new_song','music_movement','listen_music','role_play','rhythm')),
  level text check (level in ('achieved','in_progress','not_yet')),
  note text,
  author_id uuid references employees(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_ma_child on music_assessment(child_id);
create index if not exists idx_ma_date on music_assessment(date desc);
alter table music_assessment enable row level security;
drop policy if exists "public all music_assessment" on music_assessment;
create policy "public all music_assessment" on music_assessment for all using (true) with check (true);
