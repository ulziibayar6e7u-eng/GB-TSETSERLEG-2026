'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMe } from '@/lib/useMe'
import { detectRole, ROLE_META } from '@/lib/staffRoles'

export default function BusadHub() {
  const { me, loading } = useMe()
  const router = useRouter()

  useEffect(() => {
    if (loading || !me) return
    if (me.role === 'busad') {
      const r = detectRole(me.positions?.name)
      router.replace(ROLE_META[r].path)
    }
  }, [me, loading, router])

  if (loading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>

  const canSeeAll = me && (me.is_admin || me.role === 'erhlegch' || me.role === 'arga_zuich')
  if (!canSeeAll) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>

  const roles: (keyof typeof ROLE_META)[] = ['emch', 'togooch', 'nyarav', 'nyagtlan', 'uilchleg', 'haruul']
  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">👤 Бусад ажилтан</h1>
          <p className="text-sm text-slate-500 mt-1">Нярав, нягтлан, эмч, тогооч, үйлчлэгч, харуулын ажлын хэсгүүд</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {roles.map((r) => {
            const meta = ROLE_META[r]
            return (
              <Link key={r} href={meta.path} className={`rounded-2xl p-6 text-white bg-gradient-to-br ${meta.color} hover:shadow-lg hover:-translate-y-0.5 transition-all`}>
                <div className="text-5xl mb-3">{meta.icon}</div>
                <div className="text-xl font-bold">{meta.label}</div>
                <div className="text-sm opacity-90 mt-2">Дэлгэрэнгүй үзэх →</div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
