'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMe } from '@/lib/useMe'

export default function MinyTuslahPage() {
  const { me, loading } = useMe()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (me) router.replace(`/tuslah/${me.id}?tab=dadal`)
    else router.replace('/login')
  }, [me, loading, router])

  return <div className="p-8 text-slate-500">Ачааллаж байна...</div>
}
