-- ═══════════════════════════════════════════════════════════
-- ХӨГЖИМ ӨЛЗИЙ — СУДАЛГААНЫ ТӨВ МЭДЭЭЛЛИЙН САНГИЙН SCHEMA
-- ═══════════════════════════════════════════════════════════
-- Ө.Улзийбаяр багшийн судалгааны ажилд зориулав
-- Хувийн мэдээлэл БАЙХГҮЙ — зөвхөн анонимжуулсан статистик
-- ═══════════════════════════════════════════════════════════

-- 1. Багшийн бүртгэл (нэр биш, зөвхөн ID)
create table if not exists research_teachers (
  teacher_hash text primary key,
  region text,
  school_type text default 'kindergarten',
  years_experience int,
  registered_at timestamptz default now(),
  last_sync_at timestamptz,
  total_children int default 0,
  consent_given boolean default true,
  consent_date timestamptz default now()
);

-- 2. Хүүхдийн анонимжуулсан бүртгэл
create table if not exists research_children (
  child_hash text primary key,
  teacher_hash text references research_teachers(teacher_hash) on delete cascade,
  age int,
  gender text,
  group_level int,
  registered_at timestamptz default now(),
  last_updated timestamptz default now()
);

-- 3. Үнэлгээний тоо мэдээ
create table if not exists research_assessments (
  id uuid primary key default gen_random_uuid(),
  child_hash text references research_children(child_hash) on delete cascade,
  teacher_hash text references research_teachers(teacher_hash) on delete cascade,
  section text not null,
  subsection text,
  score int,
  assessment_date date,
  synced_at timestamptz default now()
);

-- 4. Хөгжмийн шалгуурын статистик
create table if not exists research_music_scores (
  id uuid primary key default gen_random_uuid(),
  child_hash text references research_children(child_hash) on delete cascade,
  teacher_hash text references research_teachers(teacher_hash) on delete cascade,
  level int,
  category text,
  criterion_num int,
  status text,
  updated_at timestamptz default now()
);

-- 5. Хөгжмийн шалгуурын хураангуй (багш тус бүрээр)
create table if not exists research_criteria_summary (
  id uuid primary key default gen_random_uuid(),
  child_hash text references research_children(child_hash) on delete cascade,
  teacher_hash text references research_teachers(teacher_hash) on delete cascade,
  level int,
  criterion_num int,
  checked boolean,
  checked_at timestamptz,
  synced_at timestamptz default now()
);

-- 6. Ирц статистик (нэр биш, зөвхөн бэрхшээл)
create table if not exists research_attendance_stats (
  id uuid primary key default gen_random_uuid(),
  teacher_hash text references research_teachers(teacher_hash) on delete cascade,
  month int,
  year int,
  total_days int,
  present_count int,
  absent_count int,
  sick_count int,
  synced_at timestamptz default now(),
  unique(teacher_hash, month, year)
);

-- 7. Дуу ашиглалтын статистик
create table if not exists research_song_usage (
  id uuid primary key default gen_random_uuid(),
  teacher_hash text references research_teachers(teacher_hash) on delete cascade,
  song_title text,
  song_kind text,
  song_level int,
  usage_count int default 1,
  last_used date,
  synced_at timestamptz default now()
);

-- 8. Sync лог (ямар багш хэзээ sync хийсэн)
create table if not exists research_sync_log (
  id uuid primary key default gen_random_uuid(),
  teacher_hash text references research_teachers(teacher_hash) on delete cascade,
  sync_type text,
  records_synced int,
  success boolean default true,
  error_message text,
  created_at timestamptz default now()
);

-- 9. Судалгааны асуултууд (та үүсгэнэ)
create table if not exists research_questions (
  id uuid primary key default gen_random_uuid(),
  question_text text not null,
  question_type text default 'text', -- text, choice, rating, yesno
  choices jsonb default '[]'::jsonb, -- ["сонголт1","сонголт2"]
  required boolean default false,
  active boolean default true,
  category text,
  order_num int default 0,
  created_at timestamptz default now()
);

-- 10. Багш нарын хариулт
create table if not exists research_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references research_questions(id) on delete cascade,
  teacher_hash text references research_teachers(teacher_hash) on delete cascade,
  answer_text text,
  answer_choice text,
  answer_rating int,
  answer_bool boolean,
  answered_at timestamptz default now(),
  unique(question_id, teacher_hash)
);

-- Жишээ асуултууд (дараа устгаж болно)
insert into research_questions (question_text, question_type, choices, category, required, order_num) values
('Та цэцэрлэгт хэдэн жил ажилласан бэ?', 'choice', '["1-3 жил","4-7 жил","8-15 жил","15+ жил"]'::jsonb, 'ерөнхий', true, 1),
('Танай цэцэрлэгт хөгжмийн танхим тусад нь байдаг уу?', 'yesno', '[]'::jsonb, 'орчин', true, 2),
('Хамгийн хэрэглэдэг хөгжмийн зэмсэг тань юу вэ?', 'text', '[]'::jsonb, 'багаж', false, 3),
('Та сарын хэдэн удаа шинэ дуу заадаг вэ?', 'choice', '["1-2","3-5","6-10","10+"]'::jsonb, 'арга зүй', false, 4),
('Хөгжмийн системийн ашиглалт таны ажлыг хөнгөвчилсөн гэж үзэж байна уу?', 'rating', '[]'::jsonb, 'сэтгэгдэл', false, 5)
on conflict do nothing;

-- Индекс — асуулгыг хурдасгах
create index if not exists idx_res_children_teacher on research_children(teacher_hash);
create index if not exists idx_res_assess_child on research_assessments(child_hash);
create index if not exists idx_res_assess_date on research_assessments(assessment_date);
create index if not exists idx_res_music_level on research_music_scores(level);
create index if not exists idx_res_music_cat on research_music_scores(category);

-- RLS бодлого
alter table research_teachers enable row level security;
alter table research_children enable row level security;
alter table research_assessments enable row level security;
alter table research_music_scores enable row level security;
alter table research_criteria_summary enable row level security;
alter table research_attendance_stats enable row level security;
alter table research_song_usage enable row level security;
alter table research_sync_log enable row level security;
alter table research_questions enable row level security;
alter table research_answers enable row level security;

do $$ begin
  create policy "p_all_rt" on research_teachers for all using (true) with check (true);
  create policy "p_all_rc" on research_children for all using (true) with check (true);
  create policy "p_all_ra" on research_assessments for all using (true) with check (true);
  create policy "p_all_rms" on research_music_scores for all using (true) with check (true);
  create policy "p_all_rcs" on research_criteria_summary for all using (true) with check (true);
  create policy "p_all_ras" on research_attendance_stats for all using (true) with check (true);
  create policy "p_all_rsu" on research_song_usage for all using (true) with check (true);
  create policy "p_all_rsl" on research_sync_log for all using (true) with check (true);
  create policy "p_all_rq" on research_questions for all using (true) with check (true);
  create policy "p_all_ran" on research_answers for all using (true) with check (true);
exception when duplicate_object then null; end $$;
