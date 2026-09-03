// ═══════════════════════════════════════════════════════════
// ХӨГЖИМ ӨЛЗИЙ — Судалгааны sync модуль
// ═══════════════════════════════════════════════════════════
// Өдөр бүр 1 удаа автомат ажиллаж, анонимжуулсан data-г
// төв судалгааны Supabase руу илгээнэ.
// НЭР, ЗУРАГ, ХАЯГ илгээхгүй — зөвхөн тоо, ID
// ═══════════════════════════════════════════════════════════

const RESEARCH_URL = "https://research-supabase-url.supabase.co"; // ← Танай төв
const RESEARCH_KEY = "sb_publishable_RESEARCH_KEY_HERE";           // ← Танай key

(function() {
  // Багш зөвшөөрөл өгсөн эсэхийг шалга
  const consentGiven = localStorage.getItem('research_consent') === 'true';
  if (!consentGiven) return;

  // Өнөөдөр sync хийсэн эсэх (өдөрт 1 удаа)
  const today = new Date().toISOString().slice(0, 10);
  const lastSync = localStorage.getItem('research_last_sync');
  if (lastSync === today) return;

  // Sync ажиллуулах
  setTimeout(runResearchSync, 5000); // 5 сек хүлээгээд эхлэнэ
})();

async function runResearchSync() {
  try {
    if (typeof supabase === 'undefined') {
      console.warn('Supabase client not loaded');
      return;
    }

    // Хэрэглэгчийн өөрийн Supabase (файлын дээд талд SUPABASE_URL байгаа)
    const localDB = supabase.createClient(
      window.SUPABASE_URL || SUPABASE_URL,
      window.SUPABASE_KEY || SUPABASE_KEY
    );

    // Судалгааны төв Supabase
    const researchDB = supabase.createClient(RESEARCH_URL, RESEARCH_KEY);

    // Багшийн ID (нэрээс хэшлэсэн)
    const teacherName = window.TEACHER_NAME || 'unknown';
    const teacherHash = await hashString('teacher:' + teacherName);
    const region = localStorage.getItem('teacher_region') || 'unknown';

    // 1. Багшийг бүртгэх/шинэчлэх
    await researchDB.from('research_teachers').upsert({
      teacher_hash: teacherHash,
      region: region,
      last_sync_at: new Date().toISOString()
    });

    // 2. Хүүхдүүдийн анонимжуулсан data
    const { data: children } = await localDB.from('children').select('*');
    if (children && children.length > 0) {
      const childRows = await Promise.all(children.map(async (c) => ({
        child_hash: await hashString('child:' + c.id),
        teacher_hash: teacherHash,
        age: c.birth_year ? new Date().getFullYear() - parseInt(c.birth_year) : null,
        gender: null,
        group_level: parseInt(c.group_id) || null,
        last_updated: new Date().toISOString()
      })));
      await researchDB.from('research_children').upsert(childRows);

      // Багшийн нийт хүүхдийн тоо шинэчлэх
      await researchDB.from('research_teachers').update({
        total_children: children.length
      }).eq('teacher_hash', teacherHash);
    }

    // 3. Үнэлгээний data
    const { data: assessments } = await localDB.from('assessments').select('*').limit(500);
    if (assessments && assessments.length > 0) {
      const assessRows = await Promise.all(assessments.map(async (a) => ({
        child_hash: await hashString('child:' + a.child_id),
        teacher_hash: teacherHash,
        section: a.section,
        subsection: a.subsection,
        assessment_date: a.date,
        synced_at: new Date().toISOString()
      })));
      await researchDB.from('research_assessments').upsert(assessRows);
    }

    // 4. Хөгжмийн шалгуур
    const { data: musicChecks } = await localDB.from('music_criteria_checks').select('*').limit(1000);
    if (musicChecks && musicChecks.length > 0) {
      const musicRows = await Promise.all(musicChecks.map(async (m) => ({
        child_hash: await hashString('child:' + m.child_id),
        teacher_hash: teacherHash,
        level: m.level,
        category: m.category,
        criterion_num: m.criterion_num,
        status: m.status,
        updated_at: m.updated_at
      })));
      await researchDB.from('research_music_scores').upsert(musicRows);
    }

    // 5. Ирц сүүлийн 30 хоногийн статистик
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const { data: attendance } = await localDB.from('attendance')
      .select('*')
      .gte('date', monthAgo.toISOString().slice(0, 10));
    if (attendance && attendance.length > 0) {
      const now = new Date();
      const stats = {
        teacher_hash: teacherHash,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        total_days: attendance.length,
        present_count: attendance.filter(a => a.status === 'present').length,
        absent_count: attendance.filter(a => a.status === 'absent').length,
        sick_count: attendance.filter(a => a.status === 'sick').length,
        synced_at: new Date().toISOString()
      };
      await researchDB.from('research_attendance_stats').upsert(stats, {
        onConflict: 'teacher_hash,month,year'
      });
    }

    // Sync амжилттай гэж бүртгэх
    await researchDB.from('research_sync_log').insert({
      teacher_hash: teacherHash,
      sync_type: 'daily_auto',
      records_synced: (children?.length || 0) + (assessments?.length || 0),
      success: true
    });

    // Localstorage-т өнөөдрийн огноог хадгална
    localStorage.setItem('research_last_sync', new Date().toISOString().slice(0, 10));
    console.log('✅ Research sync completed');

  } catch (err) {
    console.error('Research sync failed:', err);
  }
}

// SHA-256 hash (нэрийг ID болгож хувиргах)
async function hashString(str) {
  const buffer = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}
