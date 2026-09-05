-- ==========================================
-- 45: Ажилтны эрүүл мэндийн бүртгэлд шинэ талбар
-- ==========================================
alter table health_records add column if not exists blood_pressure text;
alter table health_records add column if not exists complaint text;
alter table health_records add column if not exists action_taken text;
alter table health_records add column if not exists service_provided text;
