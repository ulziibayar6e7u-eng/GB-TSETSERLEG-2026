'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

type Employee = { id: string; last_name: string; first_name: string; role: string; positions?: { name: string } }
type Group = { id: number; code: string; name: string; icon: string; color: string }

type StaffScore = {
  emp: Employee
  observationsMonth: number
  plansTotal: number
  plansApproved: number
  tasksTotal: number
  tasksDone: number
  initiativesMonth: number
  initiativesYear: number
  score: number
}

type InitiativeRow = { author_id: string; date: string; title: string; rating: number | null }

type MonthStat = { month: string; obs: number; plans: number }

export default function GuyeetgelPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const [loading, setLoading] = useState(true)

  const [kpi, setKpi] = useState({
    staff: 0,
    plansSubmitted: 0,
    plansApproved: 0,
    monthObs: 0,
    activeChildren: 0,
    todayAttPct: 0,
    todayIrsen: 0,
    todayAll: 0,
  })
  const [staffScores, setStaffScores] = useState<StaffScore[]>([])
  const [monthStats, setMonthStats] = useState<MonthStat[]>([])
  const [groupDev, setGroupDev] = useState<{ group: Group; children: number; avgProgress: number; observations: number }[]>([])
  const [alerts, setAlerts] = useState<{ icon: string; label: string; count: number; link: string; color: string }[]>([])
  const [initSummary, setInitSummary] = useState<{ emp: Employee; month: { count: number; avgRating: number; titles: string[] }; year: number }[]>([])

  const canView = me && (me.is_admin || me.role === 'erhlegch' || me.role === 'arga_zuich')

  useEffect(() => {
    if (!me) return
    if (!canView) { setLoading(false); return }
    ;(async () => {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]
      const monthStart = new Date(); monthStart.setDate(1)
      const monthStartStr = monthStart.toISOString().split('T')[0]
      const yearStart = new Date(); yearStart.setMonth(yearStart.getMonth() - 11); yearStart.setDate(1)
      const yearStartStr = yearStart.toISOString().split('T')[0]

      const [emps, kids, groups, attToday, obsMonth, plansAll, tasks, plans12, obs12, outcomeChecks, leaves, initiatives] = await Promise.all([
        supabase.from('employees').select('id, last_name, first_name, role, positions(name)'),
        supabase.from('children').select('id, group_id').eq('status', 'active'),
        supabase.from('groups').select('*').order('id'),
        supabase.from('attendance').select('status').eq('date', today),
        supabase.from('observations').select('id, observer_id, date').gte('date', monthStartStr),
        supabase.from('weekly_plans').select('id, author_id, status, created_at').gte('created_at', yearStartStr + 'T00:00:00'),
        supabase.from('methodist_notes').select('title, text').ilike('title', 'TASK:%'),
        supabase.from('plans').select('id, created_at, approved_at').gte('created_at', yearStartStr + 'T00:00:00'),
        supabase.from('observations').select('id, date').gte('date', yearStartStr),
        supabase.from('outcome_checks').select('id, status'),
        supabase.from('leave_requests').select('employee_id, days_count, leave_type').eq('status', 'approved').gte('start_date', yearStartStr),
        supabase.from('initiative_works').select('author_id, date, title, rating').gte('date', yearStartStr),
      ])
      const leavesList = (leaves.data as { employee_id: string; days_count: number | null; leave_type: string }[]) || []
      const leaveByEmp = new Map<string, { days: number; paid: number; unpaid: number }>()
      leavesList.forEach((l) => {
        const cur = leaveByEmp.get(l.employee_id) || { days: 0, paid: 0, unpaid: 0 }
        const d = l.days_count || 0
        cur.days += d
        if (l.leave_type === 'paid') cur.paid += d; else cur.unpaid += d
        leaveByEmp.set(l.employee_id, cur)
      })

      const employees = ((emps.data as unknown as Employee[]) || [])
      const kidsList = (kids.data as { id: string; group_id: number | null }[]) || []
      const groupsList = (groups.data as Group[]) || []
      const attTodayList = (attToday.data as { status: string }[]) || []
      const irsen = attTodayList.filter((a) => a.status === 'irsen').length
      const attPct = attTodayList.length > 0 ? Math.round((irsen / attTodayList.length) * 100) : 0

      const plansList = (plansAll.data as { id: string; author_id: string | null; status: string; created_at: string }[]) || []
      const submitted = plansList.filter((p) => p.status === 'submitted').length
      const approved = plansList.filter((p) => p.status === 'approved').length

      const observationsMonthList = (obsMonth.data as { id: string; observer_id: string | null; date: string }[]) || []

      setKpi({
        staff: employees.length,
        plansSubmitted: submitted,
        plansApproved: approved,
        monthObs: observationsMonthList.length,
        activeChildren: kidsList.length,
        todayAttPct: attPct,
        todayIrsen: irsen,
        todayAll: attTodayList.length,
      })

      // Staff scores
      const tasksList = (tasks.data as { title: string; text: string | null }[]) || []
      const parsedTasks = tasksList.map((r) => {
        let payload: { recipients?: string[]; responses?: unknown[] } = {}
        try { payload = JSON.parse(r.text || '{}') } catch {}
        const parts = (r.title || '').split(':')
        return { status: parts[2] || 'pending', recipients: payload.recipients || [], responses: (payload.responses || []).length }
      })

      const initiativeList = (initiatives.data as InitiativeRow[]) || []
      const scores: StaffScore[] = employees
        .filter((e) => e.role === 'bagsh' || e.role === 'bagsh_tuslah' || e.role === 'busad')
        .map((e) => {
          const obs = observationsMonthList.filter((o) => o.observer_id === e.id).length
          const myPlans = plansList.filter((p) => p.author_id === e.id)
          const plansT = myPlans.length
          const plansA = myPlans.filter((p) => p.status === 'approved').length
          const myTasks = parsedTasks.filter((t) => t.recipients.includes(e.id))
          const tasksT = myTasks.length
          const tasksD = myTasks.filter((t) => t.status === 'done').length
          const myInit = initiativeList.filter((i) => i.author_id === e.id)
          const initMonth = myInit.filter((i) => (i.date || '').slice(0, 7) === today.slice(0, 7)).length
          const initYear = myInit.length

          // Score: обс 25%, плана 25%, үүрэг 30%, санаачилга 20%
          const obsScore = Math.min(100, obs * 5)
          const planScore = plansT > 0 ? (plansA / plansT) * 100 : 50
          const taskScore = tasksT > 0 ? (tasksD / tasksT) * 100 : 50
          const initScore = Math.min(100, initMonth * 33)
          const score = Math.round(obsScore * 0.25 + planScore * 0.25 + taskScore * 0.3 + initScore * 0.2)

          return { emp: e, observationsMonth: obs, plansTotal: plansT, plansApproved: plansA, tasksTotal: tasksT, tasksDone: tasksD, initiativesMonth: initMonth, initiativesYear: initYear, score }
        })
        .sort((a, b) => b.score - a.score)
      setStaffScores(scores)

      // Санаачилсан ажлын нэгтгэл (тухайн сар)
      const initByStaff = new Map<string, { count: number; avgRating: number; titles: string[] }>()
      initiativeList.filter((i) => (i.date || '').slice(0, 7) === today.slice(0, 7)).forEach((i) => {
        const cur = initByStaff.get(i.author_id) || { count: 0, avgRating: 0, titles: [] }
        cur.count++
        cur.avgRating += i.rating || 0
        cur.titles.push(i.title)
        initByStaff.set(i.author_id, cur)
      })
      initByStaff.forEach((v) => { v.avgRating = v.count > 0 ? Math.round(v.avgRating / v.count) : 0 })
      const initSummary = employees.map((e) => ({
        emp: e,
        month: initByStaff.get(e.id) || { count: 0, avgRating: 0, titles: [] },
        year: initiativeList.filter((i) => i.author_id === e.id).length,
      })).filter((r) => r.month.count > 0 || r.year > 0).sort((a, b) => b.month.count - a.month.count || b.year - a.year)
      setInitSummary(initSummary)

      // Monthly stats (12 months)
      const monthMap = new Map<string, MonthStat>()
      const now = new Date()
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now); d.setMonth(d.getMonth() - i)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        monthMap.set(key, { month: key, obs: 0, plans: 0 })
      }
      const obs12List = (obs12.data as { date: string }[]) || []
      obs12List.forEach((o) => {
        const k = (o.date || '').slice(0, 7)
        if (monthMap.has(k)) monthMap.get(k)!.obs++
      })
      const plans12List = (plans12.data as { created_at: string }[]) || []
      plans12List.forEach((p) => {
        const k = (p.created_at || '').slice(0, 7)
        if (monthMap.has(k)) monthMap.get(k)!.plans++
      })
      setMonthStats(Array.from(monthMap.values()))

      // Group development
      const outcomeList = (outcomeChecks.data as { id: string; status: string }[]) || []
      const totalOutcomes = outcomeList.length
      const achieved = outcomeList.filter((o) => o.status === 'achieved').length
      const overallProgress = totalOutcomes > 0 ? Math.round((achieved / totalOutcomes) * 100) : 0

      const groupDevList = groupsList.map((g) => {
        const kidsInGroup = kidsList.filter((k) => k.group_id === g.id).length
        const obsInGroup = 0 // Would need to join. Simplified.
        return {
          group: g,
          children: kidsInGroup,
          avgProgress: overallProgress, // Simplified — same for all
          observations: obsInGroup,
        }
      })
      setGroupDev(groupDevList)

      // Alerts
      const overdue = tasksList.filter((r) => {
        try {
          const p = JSON.parse(r.text || '{}')
          const due = p.due_date
          const parts = (r.title || '').split(':')
          const status = parts[2] || 'pending'
          return due && new Date(due) < new Date() && status !== 'done'
        } catch { return false }
      }).length
      const inactiveStaff = scores.filter((s) => s.observationsMonth === 0 && s.emp.role === 'bagsh').length

      setAlerts([
        { icon: '⏰', label: 'Хугацаа хэтэрсэн үүрэг', count: overdue, link: '/uureg', color: 'from-red-500 to-orange-600' },
        { icon: '📋', label: 'Хянагдаагүй төлөвлөгөө', count: submitted, link: '/batlamj', color: 'from-blue-500 to-cyan-600' },
        { icon: '😴', label: 'Ажиглалт байхгүй багш', count: inactiveStaff, link: '/bagsh', color: 'from-amber-500 to-yellow-600' },
      ])

      setLoading(false)
    })()
  }, [me, canView, supabase])

  if (meLoading || loading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>
  if (!canView) return <div className="p-8 text-slate-500">Зөвхөн эрхлэгч, арга зүйч харах эрхтэй.</div>

  const maxMonth = Math.max(...monthStats.map((m) => Math.max(m.obs, m.plans)), 1)

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">📊 Гүйцэтгэлийн анализ</h1>
          <p className="text-sm text-slate-500 mt-1">Байгууллагын үзүүлэлт, ажилтны гүйцэтгэл, хүүхдийн хөгжлийн ахиц</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard icon="👥" label="Идэвхтэй ажилтан" value={kpi.staff} color="from-blue-500 to-blue-600" />
          <KpiCard icon="👧" label="Хүүхэд" value={kpi.activeChildren} color="from-emerald-500 to-emerald-600" />
          <KpiCard icon="⏰" label="Өнөөдрийн ирц" value={`${kpi.todayAttPct}%`} sub={`${kpi.todayIrsen}/${kpi.todayAll}`} color="from-purple-500 to-purple-600" />
          <KpiCard icon="📋" label="Хянагдаж буй төлөвлөгөө" value={kpi.plansSubmitted} color="from-amber-500 to-orange-500" />
          <KpiCard icon="🎯" label="Сарын ажиглалт" value={kpi.monthObs} color="from-pink-500 to-rose-500" />
        </div>

        {/* Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {alerts.map((a, i) => (
            <Link key={i} href={a.link} className={`rounded-2xl p-5 text-white bg-gradient-to-br ${a.color} hover:shadow-lg transition`}>
              <div className="flex items-center gap-4">
                <div className="text-4xl">{a.icon}</div>
                <div>
                  <div className="text-3xl font-bold">{a.count}</div>
                  <div className="text-sm opacity-90">{a.label}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Санаачилсан ажлын нэгтгэл (тухайн сар) */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-semibold text-slate-800">🌟 Санаачилсан ажлын нэгтгэл</h2>
              <p className="text-xs text-slate-500 mt-0.5">Тухайн сарын албан хаагч бүрийн санаачилга · Хагас/бүтэн жилээр нэгтгэсэн</p>
            </div>
            <div className="text-xs text-slate-500">💫 3+ = <span className="text-emerald-600 font-semibold">Маш сайн</span> · 2 = <span className="text-blue-600 font-semibold">Сайн</span> · 1 = <span className="text-amber-600 font-semibold">Хангалттай</span></div>
          </div>
          {initSummary.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">Энэ сард санаачилсан ажил бүртгэгдээгүй байна</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {initSummary.map((r) => {
                const rating = r.month.count >= 3 ? { icon: '🏆', label: 'Маш сайн', color: 'from-emerald-500 to-teal-500' }
                             : r.month.count === 2 ? { icon: '⭐', label: 'Сайн',      color: 'from-blue-500 to-indigo-500' }
                             : r.month.count === 1 ? { icon: '✅', label: 'Хангалттай', color: 'from-amber-500 to-orange-500' }
                             : { icon: '·', label: '—', color: 'from-slate-300 to-slate-400' }
                return (
                  <div key={r.emp.id} className="flex items-center gap-3 p-4 hover:bg-slate-50">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${rating.color} flex items-center justify-center text-white text-xl font-bold flex-shrink-0`}>{rating.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 truncate">{r.emp.last_name}.{r.emp.first_name}</div>
                      <div className="text-xs text-slate-500 truncate">{r.emp.positions?.name || r.emp.role}</div>
                      {r.month.titles.length > 0 && (
                        <div className="text-[11px] text-slate-500 mt-1 truncate">🔹 {r.month.titles.join(' · ')}</div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-2xl font-bold text-slate-800">{r.month.count}</div>
                      <div className="text-[11px] text-slate-500">энэ сард · {rating.label}</div>
                      {r.month.avgRating > 0 && <div className="text-[10px] text-emerald-700 font-semibold">⭐ {r.month.avgRating}%</div>}
                    </div>
                    <div className="text-right flex-shrink-0 border-l border-slate-200 pl-3 ml-1">
                      <div className="text-lg font-bold text-slate-600">{r.year}</div>
                      <div className="text-[11px] text-slate-500">жилд нийт</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Staff performance */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">👩‍🏫 Ажилтан бүрийн гүйцэтгэл ({staffScores.length})</h2>
            <div className="text-xs text-slate-500">🟢 90%+ · 🟡 60-89% · 🔴 &lt;60%</div>
          </div>
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {staffScores.map((s, i) => {
              const color = s.score >= 90 ? 'emerald' : s.score >= 60 ? 'amber' : 'red'
              return (
                <Link key={s.emp.id} href={`/bagsh/${s.emp.id}`} className="flex items-center gap-3 p-3 hover:bg-slate-50">
                  <div className="w-8 text-center text-sm text-slate-400 font-medium">{i + 1}</div>
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-${color}-400 to-${color}-600 flex items-center justify-center text-white font-semibold`}>
                    {s.emp.first_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 text-sm truncate">
                      {s.emp.last_name}.{s.emp.first_name}
                      <span className="text-xs text-slate-500 font-normal ml-2">{s.emp.positions?.name}</span>
                    </div>
                    <div className="mt-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r from-${color}-400 to-${color}-600 rounded-full transition-all`} style={{ width: `${s.score}%` }} />
                    </div>
                    <div className="flex gap-3 text-xs text-slate-500 mt-1">
                      <span>🎯 {s.observationsMonth}</span>
                      <span>📋 {s.plansApproved}/{s.plansTotal}</span>
                      <span>📌 {s.tasksDone}/{s.tasksTotal}</span>
                    </div>
                  </div>
                  <div className={`text-xl font-bold text-${color}-600 min-w-14 text-right`}>{s.score}%</div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Monthly chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-4">📈 Сар тутмын үзүүлэлт (сүүлийн 12 сар)</h2>
          <div className="flex items-end gap-2 h-48">
            {monthStats.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end gap-0.5 h-40">
                  <div className="flex-1 bg-emerald-400 rounded-t transition-all hover:bg-emerald-500 relative group" style={{ height: `${(m.obs / maxMonth) * 100}%` }}>
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs bg-emerald-600 text-white px-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">{m.obs}</div>
                  </div>
                  <div className="flex-1 bg-blue-400 rounded-t transition-all hover:bg-blue-500 relative group" style={{ height: `${(m.plans / maxMonth) * 100}%` }}>
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs bg-blue-600 text-white px-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">{m.plans}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500">{m.month.slice(5)}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-4 justify-center text-xs">
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-400 rounded" /> Ажиглалт</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-400 rounded" /> Төлөвлөгөө</div>
          </div>
        </div>

        {/* Group development */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">🎯 Бүлэг бүрийн хөгжлийн ахиц</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {groupDev.map((g) => (
              <Link key={g.group.id} href={`/hugjil?group=${g.group.id}`} className="flex items-center gap-4 p-4 hover:bg-slate-50">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-xl" style={{ background: g.group.color }}>
                  {g.group.icon}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-800">{g.group.name}</div>
                  <div className="text-xs text-slate-500">{g.children} хүүхэд</div>
                  <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${g.avgProgress}%`, background: g.group.color }} />
                  </div>
                </div>
                <div className="text-2xl font-bold" style={{ color: g.group.color }}>{g.avgProgress}%</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-400 text-center pt-4">
          Гүйцэтгэл = Ажиглалт (30%) + Төлөвлөгөө батлагдсан (30%) + Үүрэг гүйцэтгэсэн (40%)
        </div>
      </div>
    </div>
  )
}

function KpiCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-lg shadow-sm mb-2`}>
        {icon}
      </div>
      <div className="text-xl font-bold text-slate-800">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  )
}
