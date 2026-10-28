'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

type Plan = {
  id: string; employee_id: string; school_year: number; category: string
  title: string; target_count: number|null; target_date: string|null
  auto_rule: string|null; manual_done: boolean; note: string|null
  criteria: string|null; base_level: string|null; achieved_text: string|null
  budget: number|null; chapter_num: string|null; item_num: number|null
  employees?: { last_name: string; first_name: string; positions?: { name: string }|null }|null
}

const CHAPTER_TITLES: Record<string, string> = {
  '1': '1. ХИЧЭЭЛ, СУРГАЛТЫН АЖИЛ',
  '1.1': '1.1. Хичээлийн төлөвлөлт, бэлтгэл',
  '1.2': '1.2. Хичээл заах',
  '1.3': '1.3. Үнэлгээ',
  '2': '2. БАГШ ХӨГЖИЛ',
  '2.1': '2.1. Багш өөрийгөө хөгжүүлэх',
  '2.2': '2.2. Ажил амьдралын зохицол',
  '3': '3. СУРГАЛТЫН ХӨТӨЛБӨР, АРГА ЗҮЙ, СУДАЛГАА',
  '3.1': '3.1. Хичээлийн хөтөлбөр, төлөвлөгөө',
  '3.2': '3.2. Сургалтын арга зүй',
  '3.3': '3.3. Судалгаа, хөгжүүлэлт',
  '4': '4. ЭЦЭГ ЭХ, НИЙГЭМ, ХАМТ ОЛОНТОЙ ХАРИЛЦАА',
  '4.1': '4.1. Эцэг эх, хамт олон',
  '4.2': '4.2. Нийгэм',
  '5': '5. ЖЕНДЕР, ХҮНИЙ ЭРХ, ХҮҮХЭД ХАМГААЛАЛ, ЭРҮҮЛ АХУЙ',
  '5.1': '5.1. Жендер, хүний эрх, Хүүхэд хамгаалал',
  '5.2': '5.2. Эрүүл ахуй',
}

const CAT_TO_CHAPTER: Record<string, string> = {
  activity: '1', observation: '1', training: '2', material: '3', club: '3', music: '3', other: '4',
}

export default function PerformanceReportPageWrapper() {
  return <Suspense fallback={<div className="p-8 text-slate-500">Ачааллаж байна...</div>}><PerformanceReportPage /></Suspense>
}

function PerformanceReportPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me } = useMe()
  const sp = useSearchParams()
  const now = new Date()
  const [schoolYear, setSchoolYear] = useState(Number(sp.get('year')) || (now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1))
  const [period, setPeriod] = useState<'half'|'year'>((sp.get('period') as any) || 'half')
  const [targetEmpId, setTargetEmpId] = useState(sp.get('emp') || '')
  const [plans, setPlans] = useState<Plan[]>([])
  const [actual, setActual] = useState<Record<string, number>>({})

  useEffect(() => { if (me && !targetEmpId) setTargetEmpId(me.id) }, [me, targetEmpId])

  async function load() {
    if (!targetEmpId) return
    const { data } = await supabase.from('performance_plan').select('*, employees:employee_id(last_name, first_name, positions(name))').eq('employee_id', targetEmpId).eq('school_year', schoolYear).order('item_num', { nullsFirst: false })
    setPlans((data as any) || [])
    const start = `${schoolYear}-09-01`
    const end = period === 'half' ? `${schoolYear + 1}-01-15` : `${schoolYear + 1}-06-30`
    const [obs, mus, pl, cl, tm] = await Promise.all([
      supabase.from('observations').select('id', { count: 'exact', head: true }).eq('observer_id', targetEmpId).gte('date', start).lte('date', end),
      supabase.from('music_activity').select('id', { count: 'exact', head: true }).eq('author_id', targetEmpId).gte('date', start).lte('date', end),
      supabase.from('plans').select('id', { count: 'exact', head: true }).eq('author_id', targetEmpId).gte('period', start).lte('period', end),
      supabase.from('club_activities').select('id', { count: 'exact', head: true }).eq('author_id', targetEmpId).gte('date', start).lte('date', end),
      supabase.from('teacher_materials').select('id', { count: 'exact', head: true }).eq('author_id', targetEmpId).gte('created_at', `${start}T00:00:00`).lte('created_at', `${end}T23:59:59`),
    ])
    setActual({ observations: obs.count||0, music_activity: mus.count||0, plans: pl.count||0, club_activities: cl.count||0, teacher_materials: tm.count||0 })
  }
  useEffect(() => { if (targetEmpId) load() }, [targetEmpId, schoolYear, period])

  function getProgress(p: Plan) {
    const done = p.auto_rule ? (actual[p.auto_rule] || 0) : (p.manual_done ? (p.target_count || 1) : 0)
    const target = p.target_count || 1
    return Math.min(100, Math.round((done / target) * 100))
  }

  function autoAchieved(p: Plan): string {
    if (p.achieved_text) return p.achieved_text
    if (p.auto_rule) {
      const count = actual[p.auto_rule] || 0
      return `Системээс автомат тооллуур: ${count} удаа гүйцэтгэсэн`
    }
    return ''
  }

  if (!me) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>

  const emp = plans[0]?.employees
  const grouped: Record<string, Plan[]> = {}
  plans.forEach(p => {
    const section = p.chapter_num || CAT_TO_CHAPTER[p.category] || '4'
    if (!grouped[section]) grouped[section] = []
    grouped[section].push(p)
  })

  const avg = plans.length > 0 ? Math.round(plans.reduce((s, p) => s + getProgress(p), 0) / plans.length) : 0

  return (
    <div className="p-6 lg:p-8 print:p-2 bg-white">
      <style jsx global>{`
        @media print {
          aside, nav, .no-print { display: none !important; }
          @page { size: A4 landscape; margin: 1cm; }
          body { background: white !important; }
          .report-table { font-size: 10px; }
          .report-table th, .report-table td { padding: 3px 5px !important; }
        }
      `}</style>

      <div className="flex gap-2 mb-4 print:hidden items-center flex-wrap">
        <select value={schoolYear} onChange={(e) => setSchoolYear(Number(e.target.value))} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
          {[now.getFullYear()-2, now.getFullYear()-1, now.getFullYear()].map(y => (<option key={y} value={y}>{y}-{y+1} хичээлийн жил</option>))}
        </select>
        <select value={period} onChange={(e) => setPeriod(e.target.value as any)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="half">Эхний хагас жил (9-р сар — 1-р сар)</option>
          <option value="year">Жилийн эцсийн (9-6 сар)</option>
        </select>
        <button onClick={() => window.print()} className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold">🖨️ Хэвлэх / PDF татах</button>
        <a href="/guyeetgel-plan" className="text-sm text-slate-600 hover:text-slate-800">← Буцах</a>
      </div>

      <div className="text-center mb-4">
        <h1 className="text-base font-bold">БАЯНХОНГОР АЙМГИЙН ГУРВАНБУЛАГ СУМЫН ЦЭЦЭРЛЭГИЙН</h1>
        <h2 className="text-base font-bold">{emp?.positions?.name?.toUpperCase() || 'БАГШ'} {emp ? `${emp.last_name}.${emp.first_name}`.toUpperCase() : ''}-ЫН</h2>
        <h3 className="text-sm font-bold mt-1">{schoolYear + 1} ОНЫ ГҮЙЦЭТГЭЛИЙН ТӨЛӨВЛӨГӨӨНИЙ {period === 'half' ? 'ЭХНИЙ ХАГАС ЖИЛИЙН' : 'ЖИЛИЙН ЭЦСИЙН'} БИЕЛЭЛТ</h3>
        <div className="text-xs mt-1">{period === 'half' ? `${schoolYear + 1} оны 01 дүгээр сарын` : `${schoolYear + 1} оны 06 дугаар сарын`} байдлаар · Пионер толгой</div>
        <div className="text-xs mt-1">Нийт биелэлт: <b>{avg}%</b></div>
      </div>

      {plans.length === 0 ? (
        <div className="p-12 text-center text-slate-500">
          <div className="text-5xl mb-3">📊</div>
          <div>Төлөвлөгөө оруулаагүй байна</div>
          <a href="/guyeetgel-plan" className="text-blue-600 mt-3 inline-block">← Төлөвлөгөө үүсгэх</a>
        </div>
      ) : (
        <table className="report-table w-full border-collapse border border-slate-800 text-xs">
          <thead>
            <tr className="bg-slate-100 font-bold">
              <th className="border border-slate-800 p-1 w-8">№</th>
              <th className="border border-slate-800 p-1 w-16">Арга хэмжээ</th>
              <th className="border border-slate-800 p-1">Стратеги төлөвлөгөө, зорилт</th>
              <th className="border border-slate-800 p-1 w-16">Төсөв /төг/</th>
              <th className="border border-slate-800 p-1">Шалгуур үзүүлэлт</th>
              <th className="border border-slate-800 p-1">Суурь түвшин</th>
              <th className="border border-slate-800 p-1">Хүрсэн түвшин</th>
              <th className="border border-slate-800 p-1 w-16">Гүйцэтгэлийн %</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(grouped).sort().map(section => {
              const title = CHAPTER_TITLES[section] || `${section}. Бүлэг`
              return (
                <>
                  <tr key={`h-${section}`} className="bg-slate-50 font-semibold">
                    <td colSpan={8} className="border border-slate-800 p-1 text-center">{title}</td>
                  </tr>
                  {grouped[section].map((p, i) => {
                    const pct = getProgress(p)
                    return (
                      <tr key={p.id}>
                        <td className="border border-slate-800 p-1 text-center">{p.item_num || i+1}</td>
                        <td className="border border-slate-800 p-1 text-center">Арга хэмжээ {p.item_num || i+1}</td>
                        <td className="border border-slate-800 p-1">{p.title}</td>
                        <td className="border border-slate-800 p-1 text-right">{p.budget ? p.budget.toLocaleString() : '-'}</td>
                        <td className="border border-slate-800 p-1">{p.criteria || `Жилд ${p.target_count || '-'} удаа гүйцэтгэх`}</td>
                        <td className="border border-slate-800 p-1">{p.base_level || '-'}</td>
                        <td className="border border-slate-800 p-1">{autoAchieved(p)}</td>
                        <td className="border border-slate-800 p-1 text-center font-bold">{pct}%</td>
                      </tr>
                    )
                  })}
                </>
              )
            })}
            <tr className="bg-slate-100 font-bold">
              <td colSpan={7} className="border border-slate-800 p-2 text-right">НИЙТ ДУНДАЖ ГҮЙЦЭТГЭЛ:</td>
              <td className="border border-slate-800 p-2 text-center text-base">{avg}%</td>
            </tr>
          </tbody>
        </table>
      )}

      <div className="mt-6 text-sm">
        <div className="flex justify-between">
          <div>
            <div>Тайлан гаргасан: {emp ? `${emp.last_name}.${emp.first_name}` : ''}</div>
            <div className="mt-6">Гарын үсэг: ________________</div>
          </div>
          <div>
            <div>Батлав: Эрхлэгч</div>
            <div className="mt-6">Гарын үсэг: ________________</div>
          </div>
        </div>
      </div>
    </div>
  )
}
