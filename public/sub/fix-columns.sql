-- ═══════════════════════════════════════════════════════════════
-- ЗАСВАР: methodist_notes хүснэгтэд дутуу баганууд нэмэх
-- Supabase → SQL Editor → энэ бүгдийг Run
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE methodist_notes ADD COLUMN IF NOT EXISTS text TEXT;
ALTER TABLE methodist_notes ADD COLUMN IF NOT EXISTS from_role TEXT;
ALTER TABLE methodist_notes ADD COLUMN IF NOT EXISTS from_name TEXT;
ALTER TABLE methodist_notes ADD COLUMN IF NOT EXISTS to_name TEXT;
ALTER TABLE methodist_notes ADD COLUMN IF NOT EXISTS status TEXT;

-- ✅ Шалгах
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'methodist_notes'
ORDER BY ordinal_position;
