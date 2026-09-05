-- ==========================================
-- 43: Эмчийн цэвэрлэгээний хяналт
-- ==========================================
alter table cleaning_schedules add column if not exists doctor_status text check (doctor_status in ('ok','warning','critical'));
alter table cleaning_schedules add column if not exists doctor_note text;
alter table cleaning_schedules add column if not exists doctor_reviewer_id uuid references employees(id) on delete set null;
alter table cleaning_schedules add column if not exists doctor_reviewed_at timestamptz;

create index if not exists idx_clean_doctor_status on cleaning_schedules(doctor_status);

-- Хяналтын шалгуур ангилалыг өргөтгөх
alter table doctor_inspections drop constraint if exists doctor_inspections_category_check;
alter table doctor_inspections add constraint doctor_inspections_category_check
  check (category in ('daily_clean','deep_clean','disinfection','ventilation','kitchen','food_prod','food_quality','serving','toilet_room','cleaning','other'));
