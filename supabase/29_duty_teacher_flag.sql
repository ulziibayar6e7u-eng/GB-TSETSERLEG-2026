-- ==========================================
-- 29: Жижүүр багшийн жагсаалт
-- ==========================================
alter table employees add column if not exists is_duty_teacher boolean default false;

-- Одоо байгаа бүх багш нарыг анхны байдлаар жижүүр багш болгоно (арга зүйч засаж болно)
update employees set is_duty_teacher = true where role = 'bagsh' and is_duty_teacher is not true;
