'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Position = { id: number; name: string; category: string }
type Employee = {
  id: string
  last_name: string
  first_name: string
  position_id: number | null
  role: string
  phone: string | null
  email: string | null
  is_admin: boolean
  status: string
  auth_user_id: string | null
  positions?: Position
}

const ROLES = [
  { value: 'erhlegch', label: 'Эрхлэгч' },
  { value: 'arga_zuich', label: 'Арга зүйч' },
  { value: 'bagsh', label: 'Багш' },
  { value: 'bagsh_tuslah', label: 'Багшийн туслах' },
  { value: 'busad', label: 'Бусад' },
]

const ROLE_COLORS: Record<string, string> = {
  erhlegch: 'bg-purple-100 text-purple-700',
  arga_zuich: 'bg-blue-100 text-blue-700',
  bagsh: 'bg-emerald-100 text-emerald-700',
  bagsh_tuslah: 'bg-teal-100 text-teal-700',
  busad: 'bg-slate-100 text-slate-700',
}

export default function AjiltanPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [authFor, setAuthFor] = useState<Employee | null>(null)
  const [authForm, setAuthForm] = useState({ email: '', password: '' })
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [form, setForm] = useState({
    last_name: '',
    first_name: '',
    position_id: '',
    role: 'busad',
    phone: '',
    email: '',
    is_admin: false,
  })

  async function loadData() {
    setLoading(true)
    const { data: emps } = await supabase
      .from('employees')
      .select('*, positions(*), auth_user_id')
      .order('created_at', { ascending: true })
    const { data: pos } = await supabase.from('positions').select('*').order('id')
    setEmployees(emps || [])
    setPositions(pos || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  function openAdd() {
    setEditing(null)
    setForm({
      last_name: '',
      first_name: '',
      position_id: '',
      role: 'busad',
      phone: '',
      email: '',
      is_admin: false,
    })
    setShowForm(true)
  }

  function openEdit(emp: Employee) {
    setEditing(emp)
    setForm({
      last_name: emp.last_name,
      first_name: emp.first_name,
      position_id: emp.position_id?.toString() || '',
      role: emp.role,
      phone: emp.phone || '',
      email: emp.email || '',
      is_admin: emp.is_admin,
    })
    setShowForm(true)
  }

  async function saveForm(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      last_name: form.last_name.trim(),
      first_name: form.first_name.trim(),
      position_id: form.position_id ? parseInt(form.position_id) : null,
      role: form.role,
      phone: form.phone || null,
      email: form.email || null,
      is_admin: form.is_admin,
    }
    if (editing) {
      await supabase.from('employees').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('employees').insert(payload)
    }
    setShowForm(false)
    loadData()
  }

  async function removeEmployee(id: string, name: string) {
    if (!confirm(`"${name}" ажилтныг устгах уу?`)) return
    await supabase.from('employees').delete().eq('id', id)
    loadData()
  }

  function openAuth(emp: Employee) {
    setAuthFor(emp)
    setAuthForm({
      email: emp.email || `${emp.first_name.toLowerCase()}@school.local`,
      password: '',
    })
    setAuthError('')
  }

  async function saveAuth(e: React.FormEvent) {
    e.preventDefault()
    if (!authFor) return
    setAuthLoading(true)
    setAuthError('')
    const res = await fetch('/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: authFor.id,
        email: authForm.email,
        password: authForm.password,
      }),
    })
    const data = await res.json()
    setAuthLoading(false)
    if (!res.ok) {
      setAuthError(data.error || 'Алдаа гарлаа')
      return
    }
    alert(`✅ Нэвтрэх эрх үүсгэгдлээ\n\nИмэйл: ${authForm.email}\nНууц үг: ${authForm.password}\n\nАжилтанд дамжуулна уу.`)
    setAuthFor(null)
    loadData()
  }

  const filtered = employees.filter((e) => {
    const fullName = `${e.last_name}.${e.first_name}`.toLowerCase()
    const matchSearch = search === '' || fullName.includes(search.toLowerCase())
    const matchRole = roleFilter === '' || e.role === roleFilter
    return matchSearch && matchRole
  })

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Ажилтны удирдлага</h1>
              <p className="text-sm text-slate-500 mt-1">
                Нийт <span className="font-semibold text-blue-600">{employees.length}</span> ажилтан
              </p>
            </div>
            <button
              onClick={openAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm transition flex items-center gap-2"
            >
              <span className="text-lg">+</span> Шинэ ажилтан
            </button>
          </div>

          <div className="mt-5 flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="Хайх (нэрээр)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Бүх эрх</option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500">Ажилтан олдсонгүй</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="px-4 py-3">№</th>
                    <th className="px-4 py-3">Нэр</th>
                    <th className="px-4 py-3">Албан тушаал</th>
                    <th className="px-4 py-3">Эрх</th>
                    <th className="px-4 py-3">Утас</th>
                    <th className="px-4 py-3">Имэйл</th>
                    <th className="px-4 py-3 text-right">Үйлдэл</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((emp, i) => (
                    <tr key={emp.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 text-sm text-slate-500">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                            {emp.first_name[0]}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">
                              {emp.last_name}.{emp.first_name}
                            </div>
                            {emp.is_admin && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                                Админ
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {emp.positions?.name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLORS[emp.role] || 'bg-slate-100 text-slate-700'}`}>
                          {ROLES.find((r) => r.value === emp.role)?.label || emp.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{emp.phone || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{emp.email || '-'}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {emp.auth_user_id ? (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded mr-3">
                            ✓ Нэвтрэх эрхтэй
                          </span>
                        ) : (
                          <button
                            onClick={() => openAuth(emp)}
                            className="text-emerald-600 hover:text-emerald-800 text-sm font-medium mr-3"
                          >
                            🔑 Эрх үүсгэх
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(emp)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium mr-3"
                        >
                          Засах
                        </button>
                        <button
                          onClick={() => removeEmployee(emp.id, `${emp.last_name}.${emp.first_name}`)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Устгах
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {authFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">
                🔑 Нэвтрэх эрх үүсгэх
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {authFor.last_name}.{authFor.first_name} — {authFor.positions?.name}
              </p>
            </div>
            <form onSubmit={saveAuth} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Имэйл</label>
                <input
                  type="email"
                  required
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Нууц үг</label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  placeholder="Хамгийн багадаа 6 тэмдэгт"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() =>
                    setAuthForm({
                      ...authForm,
                      password: Math.random().toString(36).slice(2, 10),
                    })
                  }
                  className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                >
                  🎲 Санамсаргүй үүсгэх
                </button>
              </div>
              {authError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                  {authError}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAuthFor(null)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Болих
                </button>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg font-medium"
                >
                  {authLoading ? 'Үүсгэж байна...' : 'Үүсгэх'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-semibold text-slate-800">
                {editing ? 'Ажилтан засах' : 'Шинэ ажилтан нэмэх'}
              </h2>
            </div>
            <form onSubmit={saveForm} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Эцгийн нэр (эхний үсэг)
                  </label>
                  <input
                    required
                    maxLength={3}
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ө"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Өөрийн нэр</label>
                  <input
                    required
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Өлзийбаяр"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Албан тушаал</label>
                <select
                  value={form.position_id}
                  onChange={(e) => setForm({ ...form, position_id: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Сонгох --</option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Системийн эрх</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Утас</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="99112233"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Имэйл</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="name@example.com"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_admin}
                  onChange={(e) => setForm({ ...form, is_admin: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">Системийн админ эрхтэй</span>
              </label>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Болих
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  {editing ? 'Хадгалах' : 'Нэмэх'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
