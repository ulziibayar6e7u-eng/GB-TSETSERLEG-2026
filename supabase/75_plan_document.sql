-- ==========================================
-- 75: Төлөвлөгөөний эх файл (Word/PDF оруулах)
-- ==========================================
create table if not exists plan_document (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  school_year int not null,
  file_url text,
  file_name text,
  note text,
  uploaded_at timestamptz default now(),
  unique(employee_id, school_year)
);
alter table plan_document enable row level security;
drop policy if exists "public all plan_document" on plan_document;
create policy "public all plan_document" on plan_document for all using (true) with check (true);
