-- ==========================================
-- 57: Хөгжмийн сургалт, үйл ажиллагаа
-- ==========================================
create table if not exists music_activity (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  group_id int references groups(id) on delete cascade,
  category text not null check (category in ('new_song','music_movement','listen_music','role_play','rhythm')),
  title text not null,
  note text,
  author_id uuid references employees(id) on delete set null,
  file_url text,
  media_urls jsonb default '[]'::jsonb,
  extra_links jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_ma_date on music_activity(date desc);
create index if not exists idx_ma_group on music_activity(group_id);
create index if not exists idx_ma_cat on music_activity(category);
alter table music_activity enable row level security;
drop policy if exists "public all music_activity" on music_activity;
create policy "public all music_activity" on music_activity for all using (true) with check (true);
