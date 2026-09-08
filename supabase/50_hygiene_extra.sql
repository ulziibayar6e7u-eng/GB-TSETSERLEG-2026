-- ==========================================
-- 50: Шүд угаалтын нэмэлт шалгуур
-- ==========================================
alter table hygiene_log add column if not exists wash_duration text;
alter table hygiene_log add column if not exists sequence_quality text;
