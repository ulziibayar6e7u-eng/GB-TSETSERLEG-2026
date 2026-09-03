-- ═══════════════════════════════════════════════════════════════
-- ЗАСВАР 2: announcements + бусад хүснэгтэд дутуу баганууд нэмэх
-- Supabase → SQL Editor → энэ бүгдийг Run
-- ═══════════════════════════════════════════════════════════════

-- Announcements
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS kind TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS event_date DATE;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS text TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS media JSONB DEFAULT '[]'::jsonb;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]'::jsonb;

-- Messages (эцэг эх, багш чат)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS child_id BIGINT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_type TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Children нэмэлт багана
ALTER TABLE children ADD COLUMN IF NOT EXISTS birth_year INTEGER;
ALTER TABLE children ADD COLUMN IF NOT EXISTS avatar TEXT;

-- Lessons нэмэлт багана
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS lesson_date DATE;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS media JSONB DEFAULT '[]'::jsonb;

-- Assessments нэмэлт багана
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS group_id TEXT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS rating INTEGER;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS criterion_num INTEGER;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Activities нэмэлт багана
ALTER TABLE activities ADD COLUMN IF NOT EXISTS group_id TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS text TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS media JSONB DEFAULT '[]'::jsonb;

-- Diary нэмэлт багана
ALTER TABLE diary ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE diary ADD COLUMN IF NOT EXISTS media JSONB DEFAULT '[]'::jsonb;

-- Homework нэмэлт багана
ALTER TABLE homework ADD COLUMN IF NOT EXISTS group_id TEXT;
ALTER TABLE homework ADD COLUMN IF NOT EXISTS assigned_date DATE;
ALTER TABLE homework ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Parent_feedback нэмэлт багана
ALTER TABLE parent_feedback ADD COLUMN IF NOT EXISTS child_id BIGINT;
ALTER TABLE parent_feedback ADD COLUMN IF NOT EXISTS category TEXT;

-- Calendar_events нэмэлт
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS kind TEXT;

-- Achievements нэмэлт
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS type TEXT;

-- assess хүснэгт үүсгэх (director-dashboard ашигладаг)
CREATE TABLE IF NOT EXISTS assess (
  id BIGSERIAL PRIMARY KEY,
  child_id BIGINT,
  group_id TEXT,
  category TEXT,
  criterion_num INTEGER,
  level TEXT,
  rating INTEGER,
  score INTEGER,
  note TEXT,
  date DATE,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE assess ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON assess;
CREATE POLICY "allow_all" ON assess FOR ALL USING (true) WITH CHECK (true);

-- ✅ Шалгах
SELECT '✅ Бүх дутуу багана нэмэгдсэн!' AS status;
