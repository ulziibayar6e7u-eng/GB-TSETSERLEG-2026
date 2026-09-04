-- ==========================================
-- 39: Жижүүрийн 7 хоногийн тайлан
-- ==========================================
alter table duty_reports add column if not exists week_start date;

-- Долоо хоногийн эхлэлийг тохируулах (Даваа гараг)
create index if not exists idx_dutyrep_week on duty_reports(week_start desc);
