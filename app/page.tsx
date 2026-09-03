'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe, canSeeAllChildren } from '@/lib/useMe'

type Stats = {
  employees: number
  groups: number
  children: number
  todayIrsen: number
  todayAll: number
  todayObs: number
  plansPending: number
  myChildren: number
  myPlansPending: number
}

const ROLE_LABEL: Record<string, string> = {
  erhlegch: 'Эрхлэгч',
  arga_zuich: 'Арга зүйч',
  bagsh: 'Багш',
  bagsh_tuslah: 'Багшийн туслах',
  busad: 'Ажилтан',
}

export default function Home() {
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const [stats, setStats] = useState<Stats>({
    employees: 0,
    groups: 0,
    children: 0,
    todayIrsen: 0,
    todayAll: 0,
    todayObs: 0,
    plansPending: 0,
    myChildren: 0,
    myPlansPending: 0,
  })

  useEffect(() => {
    ;(async () => {
      const today = new Date().toISOString().split('T')[0]
      const [emps, grps, kids, todayAtt, obs, plansSub] = await Promise.all([
        supabase.from('employees').select('id', { count: 'exact', head: true }),
        supabase.from('groups').select('id', { count: 'exact', head: true }),
        supabase.from('children').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('attendance').select('status').eq('date', today),
        supabase.from('observations').select('id', { count: 'exact', head: true }).eq('date', today),
        supabase.from('plans').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
      ])
      const atts = (todayAtt.data as { status: string }[]) || []
      const irsen = atts.filter((a) => a.status === 'irsen').length
      setStats((s) => ({
        ...s,
        employees: emps.count || 0,
        groups: grps.count || 0,
        children: kids.count || 0,
        todayAll: atts.length,
        todayIrsen: irsen,
        todayObs: obs.count || 0,
        plansPending: plansSub.count || 0,
      }))

      if (me && !canSeeAllChildren(me.role, me.is_admin)) {
        const myGroupIds = me.groups.map((g) => g.id)
        if (myGroupIds.length > 0) {
          const { count } = await supabase
            .from('children')
            .select('id', { count: 'exact', head: true })
            .in('group_id', myGroupIds)
          setStats((s) => ({ ...s, myChildren: count || 0 }))
        }
        const { count: myPending } = await supabase
          .from('plans')
          .select('id', { count: 'exact', head: true })
          .eq('author_id', me.id)
          .in('status', ['returned'])
        setStats((s) => ({ ...s, myPlansPending: myPending || 0 }))
      }
    })()
  }, [me, supabase])

  if (meLoading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>

  const isAdminOrLeader = me && (me.is_admin || me.role === 'erhlegch' || me.role === 'arga_zuich')
  const irtsPct = stats.todayAll > 0 ? Math.round((stats.todayIrsen / stats.todayAll) * 100) : 0

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">
            Гурванбулаг сумын Хүүхдийн цэцэрлэг
          </h1>
          <p className="text-slate-500 mt-1">
            Нэгдсэн удирдлагын самбар
            {me && (
              <span className="text-slate-400 text-sm ml-2">
                · {me.last_name}.{me.first_name} ({me.positions?.name || ROLE_LABEL[me.role || 'busad']})
              </span>
            )}
          </p>
        </div>

        {isAdminOrLeader ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard href="/ajiltan" icon="👥" label="Ажилтан" value={stats.employees} color="from-blue-500 to-blue-600" />
              <StatCard href="/buleg" icon="🏫" label="Бүлэг" value={stats.groups} color="from-emerald-500 to-emerald-600" />
              <StatCard href="/huuhed" icon="👧" label="Хүүхэд" value={stats.children} color="from-amber-500 to-amber-600" />
              <StatCard href="/irts" icon="⏰" label={`Өнөөдрийн ирц`} value={`${irtsPct}%`} sub={`${stats.todayIrsen}/${stats.todayAll}`} color="from-purple-500 to-purple-600" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <AlertCard href="/tulvluguu" icon="📅" label="Хянагдах төлөвлөгөө" value={stats.plansPending} color="bg-blue-50 border-blue-200 text-blue-700" />
              <AlertCard href="/ajigllt" icon="🎯" label="Өнөөдрийн ажиглалт" value={stats.todayObs} color="bg-emerald-50 border-emerald-200 text-emerald-700" />
              <AlertCard href="/hamgaalal" icon="🛡" label="Хүүхэд хамгааллын анхаарал" value={0} color="bg-red-50 border-red-200 text-red-700" />
            </div>
          </>
        ) : (me?.role === 'bagsh' || me?.role === 'bagsh_tuslah') ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard href="/huuhed" icon="👧" label="Миний хүүхдүүд" value={stats.myChildren} color="from-blue-500 to-blue-600" />
              <StatCard href="/irts" icon="⏰" label="Өнөөдрийн ирц" value={`${irtsPct}%`} sub={`${stats.todayIrsen}/${stats.todayAll}`} color="from-emerald-500 to-emerald-600" />
              <StatCard href="/ajigllt" icon="🎯" label="Өнөөдрийн ажиглалт" value={stats.todayObs} color="from-amber-500 to-amber-600" />
              <StatCard href="/tulvluguu" icon="📅" label="Засах төлөвлөгөө" value={stats.myPlansPending} color="from-purple-500 to-purple-600" />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <StatCard href="/uureg" icon="📌" label="Үүрэг даалгавар" value={0} color="from-red-500 to-red-600" />
              <StatCard href="/sanaachlaga" icon="💡" label="Санаачилсан ажил" value={0} color="from-amber-500 to-amber-600" />
              <StatCard href="/tulvluguu-bail" icon="📆" label="Байгууллагын төлөвлөгөө" value={0} color="from-blue-500 to-blue-600" />
            </div>
          </>
        )}

        {isAdminOrLeader && <DutyAttendanceSummary />}
        {isAdminOrLeader && <GroupAttendanceSummary />}
        {isAdminOrLeader && <RecentFeed />}
      </div>
    </div>
  )
}

function DutyAttendanceSummary() {
  const supabase = useMemo(() => createClient(), [])
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [rows, setRows] = useState<{ id: number; name: string; icon: string; color: string; present: number; absent: number; note: string | null; duty?: string }[]>([])
  const [dutyName, setDutyName] = useState<string>('')

  useEffect(() => {
    (async () => {
      const [g, dga, duty] = await Promise.all([
        supabase.from('groups').select('id, code, name, icon, color').not('code', 'in', '(hogjim,huvilbart)').order('id'),
        supabase.from('duty_group_attendance').select('*, employees:duty_teacher_id(last_name, first_name)').eq('date', date),
        supabase.from('duty_schedules').select('employees:teacher_id(last_name, first_name)').eq('date', date).maybeSingle(),
      ])
      const groups = (g.data as { id: number; name: string; icon: string; color: string }[]) || []
      const dgaList = (dga.data as unknown as { group_id: number; present: number; absent: number | null; note: string | null; employees?: { last_name: string; first_name: string } }[]) || []
      const out = groups.map((gr) => {
        const rec = dgaList.find((r) => r.group_id === gr.id)
        return { ...gr, present: rec?.present || 0, absent: rec?.absent || 0, note: rec?.note || null }
      })
      setRows(out)
      const dt = (duty.data as unknown as { employees?: { last_name: string; first_name: string } } | null)
      setDutyName(dt?.employees ? `${dt.employees.last_name}.${dt.employees.first_name}` : '')
    })()
  }, [date, supabase])

  const totals = rows.reduce((s, r) => ({ present: s.present + r.present, absent: s.absent + r.absent }), { present: 0, absent: 0 })
  const total = totals.present + totals.absent
  const pct = total > 0 ? Math.round((totals.present / total) * 100) : 0

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-8">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-semibold text-slate-800">🛎 Жижүүрийн бүлгийн ирц</h2>
          <p className="text-xs text-slate-500 mt-0.5">Жижүүр багшийн оруулсан хурдан тоолол{dutyName && ` · Өнөөдрийн жижүүр: ${dutyName}`}</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm" />
          <div className="text-sm">
            <span className="text-slate-500">Нийт: </span>
            <span className="font-bold text-emerald-700">{totals.present}</span>
            <span className="text-slate-400">/{total}</span>
            <span className="ml-2 text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-semibold">{pct}%</span>
          </div>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="p-6 text-center text-slate-500 text-sm">Бүлэг байхгүй</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {rows.map((r) => (
            <div key={r.id} className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0" style={{ background: r.color + '22' }}>{r.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800 truncate">{r.name}</div>
                <div className="text-xs text-slate-500">
                  <span className="text-emerald-700 font-semibold">{r.present}</span> ирсэн ·
                  <span className="text-red-700 font-semibold ml-1">{r.absent}</span> ирээгүй
                </div>
                {r.note && <div className="text-[11px] text-slate-400 truncate mt-0.5">{r.note}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function GroupAttendanceSummary() {
  const supabase = useMemo(() => createClient(), [])
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [rows, setRows] = useState<{ id: number; name: string; icon: string; color: string; total: number; irsen: number; iree_gui: number; chuluutei: number; uvchtei: number; markedBy?: string; lastMarkedAt?: string }[]>([])

  useEffect(() => {
    (async () => {
      const [g, kids, att] = await Promise.all([
        supabase.from('groups').select('id, code, name, icon, color').not('code', 'in', '(hogjim,huvilbart)').order('id'),
        supabase.from('children').select('id, group_id').eq('status', 'active'),
        supabase.from('attendance').select('child_id, status, updated_at, employees:marked_by(last_name, first_name)').eq('date', date),
      ])
      const groups = (g.data as { id: number; name: string; icon: string; color: string }[]) || []
      const kidsList = (kids.data as { id: string; group_id: number | null }[]) || []
      const attList = (att.data as unknown as { child_id: string; status: string; updated_at: string; employees?: { last_name: string; first_name: string } }[]) || []

      const kidGroup = new Map<string, number | null>()
      kidsList.forEach((k) => kidGroup.set(k.id, k.group_id))
      const totals = new Map<number, number>()
      kidsList.forEach((k) => { if (k.group_id) totals.set(k.group_id, (totals.get(k.group_id) || 0) + 1) })

      const out = groups.map((gr) => {
        const total = totals.get(gr.id) || 0
        let irsen = 0, iree_gui = 0, chuluutei = 0, uvchtei = 0
        let last = ''
        let by = ''
        attList.forEach((a) => {
          if (kidGroup.get(a.child_id) !== gr.id) return
          if (a.status === 'irsen') irsen++
          else if (a.status === 'iree_gui') iree_gui++
          else if (a.status === 'chuluutei') chuluutei++
          else if (a.status === 'uvchtei') uvchtei++
          if (a.updated_at > last) { last = a.updated_at; by = a.employees ? `${a.employees.last_name}.${a.employees.first_name}` : '' }
        })
        return { ...gr, total, irsen, iree_gui, chuluutei, uvchtei, markedBy: by, lastMarkedAt: last }
      })
      setRows(out)
    })()
  }, [date, supabase])

  const totals = rows.reduce((s, r) => ({ total: s.total + r.total, irsen: s.irsen + r.irsen, iree_gui: s.iree_gui + r.iree_gui, chuluutei: s.chuluutei + r.chuluutei, uvchtei: s.uvchtei + r.uvchtei }), { total: 0, irsen: 0, iree_gui: 0, chuluutei: 0, uvchtei: 0 })
  const pct = totals.total > 0 ? Math.round((totals.irsen / totals.total) * 100) : 0

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-8">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-semibold text-slate-800">⏰ Хүүхдийн ирц (бүлгээр)</h2>
          <p className="text-xs text-slate-500 mt-0.5">Бүлгийн багш нарын оруулсан ирц нэгтгэгдэн харагдана</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm" />
          <div className="text-sm">
            <span className="text-slate-500">Нийт: </span>
            <span className="font-bold text-emerald-700">{totals.irsen}</span>
            <span className="text-slate-400">/{totals.total}</span>
            <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">{pct}%</span>
          </div>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="p-6 text-center text-slate-500 text-sm">Бүлэг байхгүй</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {rows.map((r) => {
            const marked = r.irsen + r.iree_gui + r.chuluutei + r.uvchtei
            const notMarked = Math.max(0, r.total - marked)
            const rPct = r.total > 0 ? Math.round((r.irsen / r.total) * 100) : 0
            return (
              <div key={r.id} className="p-4 flex items-center gap-3 hover:bg-slate-50">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0" style={{ background: r.color + '22' }}>{r.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800 truncate">{r.name}</div>
                  <div className="text-xs text-slate-500">
                    <span className="text-emerald-700 font-semibold">{r.irsen}</span> ирсэн ·
                    <span className="text-red-700 font-semibold ml-1">{r.iree_gui}</span> ирээгүй ·
                    <span className="text-amber-700 font-semibold ml-1">{r.chuluutei}</span> чөлөө ·
                    <span className="text-purple-700 font-semibold ml-1">{r.uvchtei}</span> өвчтэй
                    {notMarked > 0 && <span className="text-slate-400 ml-1">· {notMarked} тэмдэглээгүй</span>}
                  </div>
                  {r.markedBy && <div className="text-[11px] text-slate-400 mt-0.5">Сүүлд: {r.markedBy}</div>}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-bold text-slate-800">{r.irsen}<span className="text-slate-400 font-normal">/{r.total}</span></div>
                  <div className="text-xs text-emerald-700 font-semibold">{rPct}%</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function RecentFeed() {
  const supabase = useMemo(() => createClient(), [])
  const [items, setItems] = useState<{ id: string; icon: string; title: string; sub: string; time: string; link: string; color: string }[]>([])
  useEffect(() => {
    ;(async () => {
      const [obs] = await Promise.all([
        supabase
          .from('observations')
          .select('id, date, activity, observation, children(last_name, first_name), employees(last_name, first_name)')
          .order('created_at', { ascending: false })
          .limit(15),
      ])
      const list: { id: string; icon: string; title: string; sub: string; time: string; link: string; color: string }[] = []
      ;((obs.data as unknown as {id: string; date: string; activity?: string; observation: string; children?: {last_name: string; first_name: string}; employees?: {last_name: string; first_name: string}}[]) || []).forEach((o) => {
        list.push({
          id: 'o-' + o.id,
          icon: '🎯',
          title: `${o.employees ? o.employees.last_name + '.' + o.employees.first_name : 'Ажилтан'} → ${o.children ? o.children.last_name + '.' + o.children.first_name : ''}`,
          sub: (o.activity ? `${o.activity} · ` : '') + (o.observation || '').slice(0, 80),
          time: o.date,
          link: '/ajigllt',
          color: 'from-emerald-500 to-teal-500',
        })
      })
      list.sort((a, b) => (b.time > a.time ? 1 : -1))
      setItems(list.slice(0, 15))
    })()
  }, [supabase])

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-8">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Сүүлийн үйл ажиллагаа</h2>
        <span className="text-xs text-slate-500">Бүх багш</span>
      </div>
      {items.length === 0 ? (
        <div className="p-6 text-center text-slate-500 text-sm">Хараахан үйл ажиллагаа бүртгэгдээгүй</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((r) => (
            <Link key={r.id} href={r.link} className="flex items-start gap-3 p-4 hover:bg-slate-50 transition">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${r.color} flex items-center justify-center text-white text-lg flex-shrink-0`}>
                {r.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800 truncate">{r.title}</div>
                <div className="text-sm text-slate-500 truncate">{r.sub}</div>
              </div>
              <div className="text-xs text-slate-400 flex-shrink-0">{r.time}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ href, icon, label, value, sub, color }: { href: string; icon: string; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <Link
      href={href}
      className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition group"
    >
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-xl shadow-sm mb-3`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      <div className="text-sm text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </Link>
  )
}

function AlertCard({ href, icon, label, value, color }: { href: string; icon: string; label: string; value: number; color: string }) {
  return (
    <Link
      href={href}
      className={`rounded-2xl border p-5 hover:shadow-md transition ${color}`}
    >
      <div className="flex items-center gap-3">
        <div className="text-3xl">{icon}</div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm">{label}</div>
        </div>
      </div>
    </Link>
  )
}

function QuickLink({ href, icon, label, desc }: { href: string; icon: string; label: string; desc: string }) {
  return (
    <Link
      href={href}
      className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-sm transition group"
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl">{icon}</div>
        <div>
          <div className="font-semibold text-slate-800 group-hover:text-blue-600 transition">{label}</div>
          <div className="text-sm text-slate-500 mt-0.5">{desc}</div>
        </div>
      </div>
    </Link>
  )
}
