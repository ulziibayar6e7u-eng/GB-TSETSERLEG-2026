-- ==========================================
-- 65: Файл дахь зөвлөмж, тэмдэглэл
-- ==========================================
create table if not exists file_notes (
  id uuid primary key default gen_random_uuid(),
  file_url text not null,
  note text not null,
  author_id uuid references employees(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists idx_fn_url on file_notes(file_url);
alter table file_notes enable row level security;
drop policy if exists "public all file_notes" on file_notes;
create policy "public all file_notes" on file_notes for all using (true) with check (true);
