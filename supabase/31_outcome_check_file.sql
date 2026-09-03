-- ==========================================
-- 31: outcome_checks-т нотлох баримт нэмэх
-- ==========================================
alter table outcome_checks add column if not exists file_url text;
alter table outcome_checks add column if not exists extra_links jsonb default '[]'::jsonb;
