-- ==========================================
-- 58: Няравын хөгжүүлэлт — нийлүүлэгч + хүлээн авагч
-- ==========================================
alter table inventory_movements add column if not exists recipient_type text;  -- 'cook','staff','group','other'
alter table inventory_movements add column if not exists recipient_id uuid;    -- employees.id or groups.id
alter table inventory_items add column if not exists purpose text; -- 'food','cleaning','office','staff_kit'

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text,
  phone text,
  address text,
  note text,
  created_at timestamptz default now()
);
alter table suppliers enable row level security;
drop policy if exists "public all suppliers" on suppliers;
create policy "public all suppliers" on suppliers for all using (true) with check (true);
