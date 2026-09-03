-- ═══════════════════════════════════════════════════════════
-- ТАНАЙ SUPABASE-С ӨӨР БАГШИЙН ӨМНӨХ ӨГӨГДЛИЙГ ЦЭВЭРЛЭХ
-- ═══════════════════════════════════════════════════════════
-- ⚠️ АНХААР: Энэ нь БҮХ мэдээллийг устгана!
-- Танай өөрийнх мэдээллийг эхлээд Нөөцлөх товчоор татаж авна уу.
-- ═══════════════════════════════════════════════════════════

-- 1) Эхлээд юу байгааг харах (устгахгүй, зөвхөн харах)
select 'children' as tbl, count(*) from children
union all select 'plans', count(*) from plans
union all select 'assessments', count(*) from assessments
union all select 'attendance', count(*) from attendance
union all select 'homework', count(*) from homework;

-- 2) БҮХ мэдээллийг устгах (BAGSH-ийн + танайх — тиймээс нөөцлөх ёстой!)
-- Хэрэв БҮГДИЙГ устгах бол дараах мөрүүдийн өмнөх -- тэмдгийг арилга

-- truncate table children cascade;
-- truncate table plans cascade;
-- truncate table assessments cascade;
-- truncate table attendance cascade;
-- truncate table homework cascade;
-- truncate table messages cascade;
-- truncate table achievements cascade;
-- truncate table criteria_checks cascade;
-- truncate table music_criteria_checks cascade;
-- truncate table events cascade;
-- truncate table lessons cascade;
-- truncate table announcements cascade;
-- truncate table methodist_notes cascade;
-- truncate table tasks cascade;
-- truncate table diary cascade;
-- truncate table calendar_events cascade;
-- truncate table parent_feedback cascade;
-- truncate table activities cascade;

-- 3) Багана нэмэх — ирээдүйд хэн үүсгэсэн хянах
alter table children add column if not exists owner_email text;
alter table plans add column if not exists owner_email text;
alter table assessments add column if not exists owner_email text;
