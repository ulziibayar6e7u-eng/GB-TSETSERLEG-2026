-- ==========================================
-- 30: Жижүүрийн тайланд "Хүүхэд хамгаалал" ангилал нэмэх
-- ==========================================
alter table duty_reports drop constraint if exists duty_reports_category_check;
alter table duty_reports add constraint duty_reports_category_check
  check (category in ('general','training','event','incident','child_protection','other'));
