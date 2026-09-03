'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Group = {
  id: number
  code: string
  name: string
  nickname: string | null
  age_group: string | null
  color: string
  icon: string
}

type Employee = {
  id: string
  last_name: string
  first_name: string
  role: string
  positions?: { name: string }
}

type GroupTeacher = {
  id: number
  group_id: number
  employee_id: string
  role_in_group: string
  employees?: Employee
}

export default function BulegPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [teachers, setTeachers] = useState<GroupTeacher[]>([])
  const [groupCounts, setGroupCounts] = useState<Map<number, number>>(new Map())
  const [totalChildren, setTotalChildren] = useState(0)
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Group | null>(null)
  const [addEmpId, setAddEmpId] = useState('')
  const [addRole, setAddRole] = useState('bagsh')

  async function loadAll() {
    setLoading(true)
    const [g, t, e, c] = await Promise.all([
      supabase.from('groups').select('*').order('id'),
      supabase.from('group_teachers').select('*, employees(id, last_name, first_name, role, positions(name))'),
      supabase.from('employees').select('id, last_name, first_name, role, positions(name)').order('first_name'),
      supabase.from('children').select('group_id'),
    ])
    setGroups(g.data || [])
    setTeachers((t.data as GroupTeacher[]) || [])
    setAllEmployees((e.data as unknown as Employee[]) || [])
    const counts = new Map<number, number>()
    ;(c.data || []).forEach((row: { group_id: number | null }) => {
      if (row.group_id) counts.set(row.group_id, (counts.get(row.group_id) || 0) + 1)
    })
    setGroupCounts(counts)
    setTotalChildren((c.data || []).length)
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    const onFocus = () => loadAll()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const teachersOf = (gid: number) => teachers.filter((t) => t.group_id === gid)
  const countOf = (g: Group) => {
    if (g.code === 'hogjim') return totalChildren
    return groupCounts.get(g.id) || 0
  }

  async function addTeacher() {
    if (!selected || !addEmpId) return
    await supabase.from('group_teachers').insert({
      group_id: selected.id,
      employee_id: addEmpId,
      role_in_group: addRole,
    })
    setAddEmpId('')
    loadAll()
  }

  async function removeTeacher(id: number) {
    if (!confirm('Багшийг бүлгээс хасах уу?')) return
    await supabase.from('group_teachers').delete().eq('id', id)
    loadAll()
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Бүлгийн удирдлага</h1>
            <p className="text-sm text-slate-500 mt-1">
              Нийт <span className="font-semibold text-blue-600">{groups.length}</span> бүлэг
            </p>
          </div>
          <button
            onClick={loadAll}
            className="text-sm bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg font-medium"
          >
            🔄 Шинэчлэх
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {groups.map((g) => {
              const gTeachers = teachersOf(g.id)
              const bagshList = gTeachers.filter((t) => t.role_in_group === 'bagsh')
              const tuslahList = gTeachers.filter((t) => t.role_in_group === 'bagsh_tuslah')
              return (
                <div
                  key={g.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition"
                >
                  <div
                    className="p-5 text-white"
                    style={{ background: `linear-gradient(135deg, ${g.color}, ${g.color}dd)` }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-3xl mb-2">{g.icon}</div>
                        <h3 className="text-lg font-bold">{g.name}</h3>
                        {g.nickname && <div className="text-sm opacity-90">"{g.nickname}"</div>}
                        <div className="text-xs opacity-80 mt-1">{g.age_group}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{countOf(g)}</div>
                        <div className="text-xs opacity-80">хүүхэд</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                        Багш ({bagshList.length})
                      </div>
                      {bagshList.length === 0 ? (
                        <div className="text-sm text-slate-400 italic">Хараахан хуваарилаагүй</div>
                      ) : (
                        <div className="space-y-1">
                          {bagshList.map((t) => (
                            <div
                              key={t.id}
                              className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-1.5"
                            >
                              <span className="text-slate-700">
                                {t.employees?.last_name}.{t.employees?.first_name}
                              </span>
                              <button
                                onClick={() => removeTeacher(t.id)}
                                className="text-red-500 hover:text-red-700 text-xs"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                        Багшийн туслах ({tuslahList.length})
                      </div>
                      {tuslahList.length === 0 ? (
                        <div className="text-sm text-slate-400 italic">Байхгүй</div>
                      ) : (
                        <div className="space-y-1">
                          {tuslahList.map((t) => (
                            <div
                              key={t.id}
                              className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-1.5"
                            >
                              <span className="text-slate-700">
                                {t.employees?.last_name}.{t.employees?.first_name}
                              </span>
                              <button
                                onClick={() => removeTeacher(t.id)}
                                className="text-red-500 hover:text-red-700 text-xs"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => setSelected(g)}
                        className="flex-1 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 rounded-lg"
                      >
                        + Багш нэмэх
                      </button>
                      <Link
                        href={`/huuhed?group=${g.id}`}
                        className="flex-1 text-center text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg"
                      >
                        Хүүхдүүд
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">
                {selected.name} — Багш нэмэх
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ажилтан</label>
                <select
                  value={addEmpId}
                  onChange={(e) => setAddEmpId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Сонгох --</option>
                  {allEmployees
                    .filter((e) => e.role === 'bagsh' || e.role === 'bagsh_tuslah')
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.last_name}.{e.first_name} — {e.positions?.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Үүрэг</label>
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="bagsh">Багш</option>
                  <option value="bagsh_tuslah">Багшийн туслах</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setSelected(null)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Болих
                </button>
                <button
                  onClick={() => {
                    addTeacher()
                    setSelected(null)
                  }}
                  disabled={!addEmpId}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg font-medium"
                >
                  Нэмэх
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
