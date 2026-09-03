'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

function LoginInner() {
  const router = useRouter()
  const params = useSearchParams()
  const redirect = params.get('redirect') || '/'
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Имэйл эсвэл нууц үг буруу байна')
      setLoading(false)
      return
    }
    router.replace(redirect)
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg mx-auto mb-4">
            Г
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Гурванбулаг Цэцэрлэг</h1>
          <p className="text-sm text-slate-500 mt-1">Нэгдсэн удирдлагын систем</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Нэвтрэх</h2>
          <p className="text-sm text-slate-500 mb-6">Өөрийн эрхээр нэвтэрнэ үү</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Имэйл</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Нууц үг</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-2.5 rounded-lg font-medium shadow-sm"
            >
              {loading ? 'Нэвтэрч байна...' : 'Нэвтрэх'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
            <a
              href="/hogjim/index.html"
              target="_blank"
              rel="noopener"
              className="block w-full text-center bg-pink-50 hover:bg-pink-100 text-pink-700 py-2.5 rounded-lg font-medium text-sm border border-pink-200"
            >
              👨‍👩‍👧 Эцэг эх кодоор нэвтрэх →
            </a>
            <div className="text-xs text-slate-500 text-center">
              Нэвтрэх мэдээллээ мартсан бол админд хандана уу
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-slate-400 mt-6">
          © 2026 Гурванбулаг сумын Хүүхдийн цэцэрлэг
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">Ачааллаж байна...</div>}>
      <LoginInner />
    </Suspense>
  )
}
