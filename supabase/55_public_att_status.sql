-- ==========================================
-- 55: Ирц төлөв → present/leave/skipped
-- ==========================================
alter table public_event_attendance drop constraint if exists public_event_attendance_status_check;
alter table public_event_attendance add constraint public_event_attendance_status_check
  check (status in ('present','leave','skipped'));
-- хуучин 'absent' → 'skipped', 'late' → 'present' болгож шилжүүлэх (шаардлагатай бол)
update public_event_attendance set status = 'skipped' where status = 'absent';
update public_event_attendance set status = 'present' where status = 'late';
