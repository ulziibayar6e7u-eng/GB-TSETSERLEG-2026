-- ==========================================
-- 35: teacher_materials-т 'weekly' ангилал нэмэх
-- ==========================================
alter table teacher_materials drop constraint if exists teacher_materials_category_check;
alter table teacher_materials add constraint teacher_materials_category_check
  check (category in ('weekly','material','program','event','other'));
