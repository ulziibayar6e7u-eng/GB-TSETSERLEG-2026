-- ==========================================
-- 63: Олон зураг/бичлэг дэмжлэг
-- ==========================================
alter table staff_daily_logs   add column if not exists media_urls jsonb default '[]'::jsonb;
alter table cleaning_log       add column if not exists media_urls jsonb default '[]'::jsonb;
alter table health_records     add column if not exists media_urls jsonb default '[]'::jsonb;
alter table observations       add column if not exists media_urls jsonb default '[]'::jsonb;
