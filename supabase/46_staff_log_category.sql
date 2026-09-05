-- ==========================================
-- 46: Ажилтны өдрийн тайланд ангилал нэмэх
-- ==========================================
alter table staff_daily_logs add column if not exists category text;
alter table staff_daily_logs add column if not exists checklist jsonb default '[]'::jsonb;
create index if not exists idx_sdl_category on staff_daily_logs(category);
