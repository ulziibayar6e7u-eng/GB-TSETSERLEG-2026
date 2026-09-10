-- ==========================================
-- 64: Эмчийн хяналт — тогооч + үйлчлэгч + гал тогоо
-- ==========================================
do $$
begin
  if to_regclass('public.cook_sample') is not null then
    alter table cook_sample add column if not exists doctor_status text check (doctor_status in ('ok','warning','critical'));
    alter table cook_sample add column if not exists doctor_note text;
    alter table cook_sample add column if not exists doctor_id uuid references employees(id) on delete set null;
    alter table cook_sample add column if not exists reviewed_at timestamptz;
  end if;
  if to_regclass('public.cook_taste') is not null then
    alter table cook_taste add column if not exists doctor_status text check (doctor_status in ('ok','warning','critical'));
    alter table cook_taste add column if not exists doctor_note text;
    alter table cook_taste add column if not exists doctor_id uuid references employees(id) on delete set null;
    alter table cook_taste add column if not exists reviewed_at timestamptz;
  end if;
  if to_regclass('public.cook_sanitation') is not null then
    alter table cook_sanitation add column if not exists doctor_status text check (doctor_status in ('ok','warning','critical'));
    alter table cook_sanitation add column if not exists doctor_note text;
    alter table cook_sanitation add column if not exists doctor_id uuid references employees(id) on delete set null;
    alter table cook_sanitation add column if not exists reviewed_at timestamptz;
  end if;
  if to_regclass('public.staff_daily_logs') is not null then
    alter table staff_daily_logs add column if not exists doctor_status text check (doctor_status in ('ok','warning','critical'));
    alter table staff_daily_logs add column if not exists doctor_note text;
    alter table staff_daily_logs add column if not exists doctor_id uuid references employees(id) on delete set null;
    alter table staff_daily_logs add column if not exists reviewed_at timestamptz;
  end if;
end $$;
