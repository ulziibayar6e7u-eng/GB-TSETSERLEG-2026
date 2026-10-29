-- ==========================================
-- 74: Төлөвлөгөөний төрөл — Гүйцэтгэл vs Үйл ажиллагаа
-- ==========================================
alter table performance_plan add column if not exists plan_type text default 'performance' check (plan_type in ('performance', 'activity'));
update performance_plan set plan_type = 'performance' where plan_type is null;
