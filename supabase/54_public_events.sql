-- ==========================================
-- 54: Олон нийтийн үйл ажиллагаа
-- ==========================================
create table if not exists public_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_date date not null default current_date,
  event_time text,
  location text,
  created_by uuid references employees(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists idx_pe_date on public_events(event_date desc);

create table if not exists public_event_attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public_events(id) on delete cascade,
  employee_id uuid references employees(id) on delete cascade,
  status text not null default 'present' check (status in ('present','absent','late')),
  checked_in_at timestamptz default now(),
  note text,
  unique(event_id, employee_id)
);
create index if not exists idx_pea_event on public_event_attendance(event_id);
create index if not exists idx_pea_emp on public_event_attendance(employee_id);

alter table public_events enable row level security;
alter table public_event_attendance enable row level security;
drop policy if exists "public all public_events" on public_events;
drop policy if exists "public all public_event_attendance" on public_event_attendance;
create policy "public all public_events" on public_events for all using (true) with check (true);
create policy "public all public_event_attendance" on public_event_attendance for all using (true) with check (true);
