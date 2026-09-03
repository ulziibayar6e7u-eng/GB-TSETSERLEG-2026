-- ═══════════════════════════════════════════════════════════════
-- ЗАСВАР 3: Хөгжмийн багшийн систем-с sync хийх баганууд нэмэх
-- ═══════════════════════════════════════════════════════════════

-- Activities: source тэмдэглэгээ
ALTER TABLE activities ADD COLUMN IF NOT EXISTS _source TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS _teacher TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]'::jsonb;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS activity_date DATE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS note TEXT;

-- Assessments
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS _source TEXT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS _teacher TEXT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS section TEXT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS subsection TEXT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS text TEXT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS media JSONB DEFAULT '[]'::jsonb;

-- Music criteria checks
ALTER TABLE music_criteria_checks ADD COLUMN IF NOT EXISTS _source TEXT;
ALTER TABLE music_criteria_checks ADD COLUMN IF NOT EXISTS _teacher TEXT;

SELECT '✅ Sync баганууд нэмэгдсэн!' AS status;
