-- ==========================================
-- 73: Гүйцэтгэлийн төлөвлөгөөнд албан ёсны баганууд нэмэх
-- ==========================================
alter table performance_plan add column if not exists criteria text;        -- Шалгуур үзүүлэлт
alter table performance_plan add column if not exists base_level text;      -- Суурь түвшин
alter table performance_plan add column if not exists achieved_text text;   -- Хүрсэн түвшин (гараар бичих тайлбар)
alter table performance_plan add column if not exists budget numeric;       -- Төсөв (төг)
alter table performance_plan add column if not exists chapter_num text;     -- "1.1", "1.2" гэх мэт бүлэг
alter table performance_plan add column if not exists item_num int;         -- Арга хэмжээний дугаар
