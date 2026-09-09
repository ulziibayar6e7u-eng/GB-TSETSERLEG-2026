-- ==========================================
-- 56: "Ангид үлдсэн" төлөв нэмэх
-- ==========================================
alter table public_event_attendance drop constraint if exists public_event_attendance_status_check;
alter table public_event_attendance add constraint public_event_attendance_status_check
  check (status in ('present','leave','skipped','onduty'));
