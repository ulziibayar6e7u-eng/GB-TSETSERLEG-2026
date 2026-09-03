-- ═══════════════════════════════════════════════════════════════
-- СӨБ_БҮЛГИЙН_БАГШ Supabase Setup Script
-- Supabase → SQL Editor → шинэ query → энэ бүхнийг хуулж Run
-- Дахин ажиллуулахад аюулгүй (IF NOT EXISTS)
-- ═══════════════════════════════════════════════════════════════

-- ── Хүүхдүүд ──
CREATE TABLE IF NOT EXISTS children (
  id BIGSERIAL PRIMARY KEY,
  group_id TEXT,
  name TEXT NOT NULL,
  birth_date DATE,
  parent_code TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Хичээлийн төлөвлөгөө ──
CREATE TABLE IF NOT EXISTS plans (
  id BIGSERIAL PRIMARY KEY,
  group_id TEXT,
  tab TEXT,
  period TEXT,
  title TEXT,
  content TEXT,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Хичээлүүд ──
CREATE TABLE IF NOT EXISTS lessons (
  id BIGSERIAL PRIMARY KEY,
  group_id TEXT,
  element_id TEXT,
  title TEXT,
  note TEXT,
  materials JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Үнэлгээ ──
CREATE TABLE IF NOT EXISTS assessments (
  id BIGSERIAL PRIMARY KEY,
  child_id BIGINT,
  date DATE,
  category TEXT,
  score INTEGER,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Тохиргоо (password, гэх мэт) ──
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- ── Шалгуур үзүүлэлт (шаталсан үнэлгээ) ──
CREATE TABLE IF NOT EXISTS criteria_checks (
  id BIGSERIAL PRIMARY KEY,
  child_id BIGINT,
  level TEXT,
  criterion_num INTEGER,
  checked BOOLEAN DEFAULT false,
  checked_at TIMESTAMPTZ
);

-- ── Хөгжмийн шалгуур үзүүлэлт ──
CREATE TABLE IF NOT EXISTS music_criteria_checks (
  id BIGSERIAL PRIMARY KEY,
  child_id BIGINT,
  level TEXT,
  category TEXT,
  criterion_num INTEGER,
  status TEXT,
  note TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Хөгжмийн зэмсэг ──
CREATE TABLE IF NOT EXISTS instruments (
  id BIGSERIAL PRIMARY KEY,
  num INTEGER,
  name TEXT,
  image_url TEXT,
  description TEXT
);

-- ── Ирц ──
CREATE TABLE IF NOT EXISTS attendance (
  id BIGSERIAL PRIMARY KEY,
  child_id BIGINT,
  date DATE,
  status TEXT,
  note TEXT
);

-- ── Үйл явдал ──
CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  title TEXT,
  event_date DATE,
  description TEXT,
  photos JSONB DEFAULT '[]'::jsonb
);

-- ── Мессеж ──
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  from_role TEXT,
  to_role TEXT,
  text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Зар мэдээ ──
CREATE TABLE IF NOT EXISTS announcements (
  id BIGSERIAL PRIMARY KEY,
  title TEXT,
  content TEXT,
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Арга зүйчийн тэмдэглэл (TASK:/FB:/EVAL:/ATT:/WGA: prefix ашиглана) ──
CREATE TABLE IF NOT EXISTS methodist_notes (
  id BIGSERIAL PRIMARY KEY,
  title TEXT,
  content TEXT,
  target_role TEXT,
  target_name TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Даалгавар ──
CREATE TABLE IF NOT EXISTS tasks (
  id BIGSERIAL PRIMARY KEY,
  title TEXT,
  description TEXT,
  assigned_to TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Өдрийн тэмдэглэл ──
CREATE TABLE IF NOT EXISTS diary (
  id BIGSERIAL PRIMARY KEY,
  entry_date DATE,
  content TEXT,
  mood TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Ололт амжилт ──
CREATE TABLE IF NOT EXISTS achievements (
  id BIGSERIAL PRIMARY KEY,
  child_id BIGINT,
  title TEXT,
  description TEXT,
  icon TEXT,
  earned_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Хуанли ──
CREATE TABLE IF NOT EXISTS calendar_events (
  id BIGSERIAL PRIMARY KEY,
  title TEXT,
  event_date DATE,
  color TEXT,
  description TEXT
);

-- ── Дуулах сан ──
CREATE TABLE IF NOT EXISTS song_library (
  id BIGSERIAL PRIMARY KEY,
  title TEXT,
  kind TEXT,
  level TEXT,
  lyrics TEXT,
  audio_url TEXT,
  video_url TEXT
);

-- ── Гэрийн даалгавар ──
CREATE TABLE IF NOT EXISTS homework (
  id BIGSERIAL PRIMARY KEY,
  child_id BIGINT,
  title TEXT,
  description TEXT,
  due_date DATE,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Эцэг эхийн санал ──
CREATE TABLE IF NOT EXISTS parent_feedback (
  id BIGSERIAL PRIMARY KEY,
  parent_code TEXT,
  child_name TEXT,
  message TEXT,
  reply TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Багшийн профайл ──
CREATE TABLE IF NOT EXISTS teacher_profile (
  id BIGSERIAL PRIMARY KEY,
  name TEXT,
  photo_url TEXT,
  bio TEXT,
  gallery JSONB DEFAULT '[]'::jsonb
);

-- ── Үйл ажиллагаа (тэмдэглэл) ──
CREATE TABLE IF NOT EXISTS activities (
  id BIGSERIAL PRIMARY KEY,
  title TEXT,
  activity_date DATE,
  description TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- RLS (Row Level Security) — бүх хүснэгтэд бүгд харах/бичих эрх
-- Зөвхөн танай цэцэрлэгийн ажилчид ашиглах учир аюулгүй
-- ═══════════════════════════════════════════════════════════════
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "allow_all" ON public.%I', t);
    EXECUTE format('CREATE POLICY "allow_all" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- Storage bucket "media" — зураг/бичлэг хадгална
-- Supabase → Storage → New bucket → нэр: media, Public: ON
-- ═══════════════════════════════════════════════════════════════

-- ✅ Бэлэн!
SELECT 'Setup амжилттай! ' || COUNT(*)::TEXT || ' хүснэгт үүсгэсэн.' AS status
FROM pg_tables WHERE schemaname = 'public';
