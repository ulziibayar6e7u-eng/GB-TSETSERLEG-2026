-- ==========================================
-- 42: Цэвэрлэгээний ангиллыг шинэчлэх
-- ==========================================
alter table cleaning_schedules drop constraint if exists cleaning_schedules_category_check;
alter table cleaning_schedules add constraint cleaning_schedules_category_check
  check (category in ('deep','daily','disinfection','ventilation','toys','chairs','toilet_room','other','kitchen','sanitary','general'));
