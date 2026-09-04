-- ==========================================
-- 41: Цэвэрлэгээнд Агааржуулалт ангилал нэмэх
-- ==========================================
alter table cleaning_schedules drop constraint if exists cleaning_schedules_category_check;
alter table cleaning_schedules add constraint cleaning_schedules_category_check
  check (category in ('daily','deep','disinfection','ventilation','kitchen','sanitary','general','other'));
