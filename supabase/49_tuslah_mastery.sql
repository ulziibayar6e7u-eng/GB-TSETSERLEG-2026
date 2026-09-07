-- ==========================================
-- 49: Дадал хэвшлийн эзэмшилтийн түвшин
-- ==========================================
alter table tuslah_records add column if not exists mastery_level text check (mastery_level in ('not_yet','in_progress','achieved'));
create index if not exists idx_tuslah_mastery on tuslah_records(mastery_level);
