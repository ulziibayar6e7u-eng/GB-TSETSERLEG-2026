'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe, canSeeAllChildren } from '@/lib/useMe'

type Employee = {
  id: string
  last_name: string
  first_name: string
  role: string
  is_admin: boolean
  positions?: { name: string }
}

type TeacherStats = {
  employee: Employee
  primaryGroup?: { id: number; code: string; name: string; icon: string; color: string }
  primaryClub?: { id: number; name: string; icon: string; color: string }
  childrenCount: number
  todayObsCount: number
  monthObsCount: number
  activePlansCount: number
  pendingPlansCount: number
  lastActivity?: string
}

export default function BagshListPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const [teachers, setTeachers] = useState<TeacherStats[]>([])
  const [argaZuichList, setArgaZuichList] = useState<{ id: string; last_name: string; first_name: string; positions?: { name: string }; counts: { negdel: number; hicheel_suusan: number; zuvluguu: number } }[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'bagsh' | 'bagsh_tuslah' | 'busad'>('bagsh')

  useEffect(() => {
    if (!me) return
    if (!canSeeAllChildren(me.role, me.is_admin)) {
      setLoading(false)
      return
    }
    ;(async () => {
      const today = new Date().toISOString().split('T')[0]
      const monthStart = new Date().toISOString().slice(0, 7) + '-01'

      const { data: emps } = await supabase
        .from('employees')
        .select('id, last_name, first_name, role, is_admin, positions(name)')
        .in('role', ['bagsh', 'bagsh_tuslah'])
        .order('first_name')

      const [gtRes, clubRes, plansRes, obsRes] = await Promise.all([
        supabase.from('group_teachers').select('employee_id, role_in_group, groups(id, code, name, icon, color)'),
        supabase.from('clubs').select('id, name, icon, color, teacher_id'),
        supabase.from('plans').select('id, author_id, status, created_at'),
        supabase.from('observations').select('id, observer_id, date, created_at'),
      ])

      const gts = (gtRes.data as unknown as {employee_id: string; role_in_group: string; groups: {id:number;code:string;name:string;icon:string;color:string}}[]) || []
      const clubs = (clubRes.data as {id:number; name:string; icon:string; color:string; teacher_id:string|null}[]) || []
      const plans = (plansRes.data as {id:string; author_id:string|null; status:string; created_at:string}[]) || []
      const obs = (obsRes.data as {id:string; observer_id:string|null; date:string; created_at:string}[]) || []

      const stats: TeacherStats[] = ((emps as unknown as Employee[]) || []).map((emp) => {
        const primaryGroupRow = gts.find((g) => g.employee_id === emp.id && g.role_in_group === 'bagsh') ||
                                 gts.find((g) => g.employee_id === emp.id)
        const primaryClub = clubs.find((c) => c.teacher_id === emp.id)
        const myObs = obs.filter((o) => o.observer_id === emp.id)
        const myPlans = plans.filter((p) => p.author_id === emp.id)
        return {
          employee: emp,
          primaryGroup: primaryGroupRow?.groups,
          primaryClub: primaryClub ? { id: primaryClub.id, name: primaryClub.name, icon: primaryClub.icon, color: primaryClub.color } : undefined,
          childrenCount: 0,
          todayObsCount: myObs.filter((o) => o.date === today).length,
          monthObsCount: myObs.filter((o) => o.date >= monthStart).length,
          activePlansCount: myPlans.filter((p) => p.status === 'approved' || p.status === 'submitted').length,
          pendingPlansCount: myPlans.filter((p) => p.status === 'submitted').length,
          lastActivity: myObs.sort((a, b) => (b.created_at > a.created_at ? 1 : -1))[0]?.date,
        }
      })

      const groupIds = stats.map((s) => s.primaryGroup?.id).filter(Boolean) as number[]
      if (groupIds.length > 0) {
        const { data: kids } = await supabase.from('children').select('group_id').in('group_id', groupIds)
        const counts = new Map<number, number>()
        ;(kids as {group_id: number|null}[] || []).forEach((k) => {
          if (k.group_id) counts.set(k.group_id, (counts.get(k.group_id) || 0) + 1)
        })
        stats.forEach((s) => {
          if (s.primaryGroup?.id) s.childrenCount = counts.get(s.primaryGroup.id) || 0
        })
      }

      setTeachers(stats)

      const { data: azEmps } = await supabase
        .from('employees')
        .select('id, last_name, first_name, positions(name)')
        .eq('role', 'arga_zuich')
        .order('first_name')
      const { data: azActs } = await supabase
        .from('argazuich_activities')
        .select('employee_id, category')
      const azActRows = (azActs as { employee_id: string; category: 'negdel'|'hicheel_suusan'|'zuvluguu' }[]) || []
      const azList = ((azEmps as unknown as { id: string; last_name: string; first_name: string; positions?: { name: string } }[]) || []).map((e) => {
        const c = { negdel: 0, hicheel_suusan: 0, zuvluguu: 0 }
        azActRows.filter((r) => r.employee_id === e.id).forEach((r) => { c[r.category]++ })
        return { ...e, counts: c }
      })
      setArgaZuichList(azList)

      setLoading(false)
    })()
  }, [me, supabase])

  if (meLoading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>
  if (!me) return null

  const canView = canSeeAllChildren(me.role, me.is_admin)
  if (!canView) {
    return (
      <div className="p-8 text-slate-500">
        Энэ хуудсыг зөвхөн эрхлэгч, арга зүйч харах эрхтэй.
      </div>
    )
  }

  const filtered = teachers.filter((t) => t.employee.role === tab)
  const counts = {
    bagsh: teachers.filter((t) => t.employee.role === 'bagsh').length,
    bagsh_tuslah: teachers.filter((t) => t.employee.role === 'bagsh_tuslah').length,
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Багш нарын хяналт</h1>
            <p className="text-sm text-slate-500 mt-1">
              Багш бүрийн өдөр тутмын үйл ажиллагаа, гүйцэтгэлийг харах
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTab('bagsh')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                tab === 'bagsh' ? 'bg-blue-600 text-white shadow' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              👩‍🏫 Багш нар <span className={`text-xs px-1.5 py-0.5 rounded ${tab === 'bagsh' ? 'bg-white/20' : 'bg-slate-200'}`}>{counts.bagsh}</span>
            </button>
            <button
              onClick={() => setTab('bagsh_tuslah')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                tab === 'bagsh_tuslah' ? 'bg-blue-600 text-white shadow' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              🧑‍🤝‍🧑 Багшийн туслах <span className={`text-xs px-1.5 py-0.5 rounded ${tab === 'bagsh_tuslah' ? 'bg-white/20' : 'bg-slate-200'}`}>{counts.bagsh_tuslah}</span>
            </button>
          </div>
        </div>

        {argaZuichList.length > 0 && (
          <div className="mb-6">
            <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">🎓 Арга зүйч</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {argaZuichList.map((az) => (
                <Link key={az.id} href={`/argazuich/${az.id}`} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition">
                  <div className="p-5 text-white bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-lg font-bold">{az.first_name[0]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate">{az.last_name}.{az.first_name}</div>
                        <div className="text-xs opacity-90 truncate">{az.positions?.name || 'Арга зүйч'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 grid grid-cols-3 gap-2">
                    <div className="bg-indigo-50 rounded-lg p-2 text-center border border-indigo-200">
                      <div className="text-lg font-bold text-indigo-700">{az.counts.negdel}</div>
                      <div className="text-[10px] text-indigo-600 leading-tight">🤝 Заах аргын нэгдэл</div>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-2 text-center border border-emerald-200">
                      <div className="text-lg font-bold text-emerald-700">{az.counts.hicheel_suusan}</div>
                      <div className="text-[10px] text-emerald-600 leading-tight">👀 Хичээлд суусан</div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-2 text-center border border-amber-200">
                      <div className="text-lg font-bold text-amber-700">{az.counts.zuvluguu}</div>
                      <div className="text-[10px] text-amber-600 leading-tight">💬 Зөвлөгөө</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            Багш олдсонгүй
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((t) => {
              const bg = t.primaryClub?.color || t.primaryGroup?.color || '#64748b'
              const workspace = t.primaryClub || t.primaryGroup
              return (
                <div key={t.employee.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition">
                  <div className="p-5 text-white" style={{ background: `linear-gradient(135deg, ${bg}, ${bg}dd)` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-lg font-bold">
                        {t.employee.first_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate">{t.employee.last_name}.{t.employee.first_name}</div>
                        <div className="text-xs opacity-90 truncate">{t.employee.positions?.name}</div>
                      </div>
                    </div>
                    {workspace && (
                      <div className="mt-3 flex items-center gap-2 text-sm bg-white/10 rounded-lg px-2 py-1 backdrop-blur">
                        <span>{workspace.icon}</span>
                        <span className="truncate">{workspace.name}</span>
                        {t.childrenCount > 0 && (
                          <span className="ml-auto text-xs opacity-80">{t.childrenCount} хүүхэд</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-3">
                    {t.employee.role === 'bagsh' ? (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <Link href={`/ajigllt?observer=${t.employee.id}`} className="bg-emerald-50 hover:bg-emerald-100 rounded-lg p-3 text-center border border-emerald-200">
                            <div className="text-lg font-bold text-emerald-700">{t.monthObsCount}</div>
                            <div className="text-xs text-emerald-600">🎯 Ажиглалт (сар)</div>
                          </Link>
                          <Link href={`/tulvluguu?author=${t.employee.id}`} className="bg-blue-50 hover:bg-blue-100 rounded-lg p-3 text-center border border-blue-200">
                            <div className="text-lg font-bold text-blue-700">{t.pendingPlansCount}</div>
                            <div className="text-xs text-blue-600">📅 Төлөвлөгөө</div>
                          </Link>
                        </div>
                        <div className="text-xs text-slate-500">
                          Өнөөдрийн ажиглалт: <b>{t.todayObsCount}</b> · Сүүлд: {t.lastActivity || 'Байхгүй'}
                        </div>
                      </>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        <Link href={`/tuslah/${t.employee.id}?tab=dadal`} className="bg-emerald-50 hover:bg-emerald-100 rounded-lg p-3 border border-emerald-200 flex items-center gap-2">
                          <span className="text-xl">🌱</span>
                          <div className="flex-1 text-sm text-emerald-700 font-medium">Дадал хэвшил олгож буй байдал</div>
                        </Link>
                        <Link href={`/tuslah/${t.employee.id}?tab=ahits`} className="bg-blue-50 hover:bg-blue-100 rounded-lg p-3 border border-blue-200 flex items-center gap-2">
                          <span className="text-xl">📈</span>
                          <div className="flex-1 text-sm text-blue-700 font-medium">Хүүхдийн ахиц, судалгаа</div>
                        </Link>
                        <Link href={`/tuslah/${t.employee.id}?tab=sanaachlaga`} className="bg-amber-50 hover:bg-amber-100 rounded-lg p-3 border border-amber-200 flex items-center gap-2">
                          <span className="text-xl">💡</span>
                          <div className="flex-1 text-sm text-amber-700 font-medium">Санаачилсан ажил, арга хэмжээ</div>
                        </Link>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <Link
                        href={`/bagsh/${t.employee.id}`}
                        className="flex-1 text-center text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg"
                      >
                        Дэлгэрэнгүй харах
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
