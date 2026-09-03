'use client'

import { useEffect, useRef, useState } from 'react'
import { useMe } from '@/lib/useMe'

type Message = { role: 'user' | 'assistant'; content: string }

export default function AiAssistant() {
  const { me } = useMe()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open, loading])

  useEffect(() => {
    if (messages.length === 0 && me) {
      setMessages([
        {
          role: 'assistant',
          content: `Сайн байна уу, ${me.first_name}! 👋\n\nБи таны AI туслах байна. СӨБ-ийн ажил, төлөвлөгөө, хүүхдийн хөгжил, ажилтны үйл ажиллагаатай холбоотой ямар ч асуултад тусалж чадна. Юугаар туслах вэ?`,
        },
      ])
    }
  }, [me, messages.length])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    try {
      const r = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.filter((m) => m.role === 'user' || m.role === 'assistant').slice(-20),
        }),
      })
      const data = await r.json()
      if (r.ok) {
        setMessages([...newMessages, { role: 'assistant', content: data.reply || 'Хариулт олдсонгүй' }])
      } else {
        setMessages([...newMessages, { role: 'assistant', content: '⚠️ Алдаа: ' + (data.error || 'үл мэдэгдэх') }])
      }
    } catch (e) {
      setMessages([...newMessages, { role: 'assistant', content: '⚠️ Сүлжээний алдаа: ' + (e as Error).message }])
    } finally {
      setLoading(false)
    }
  }

  if (!me) return null

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-2xl hover:shadow-purple-500/50 hover:scale-110 transition-all flex items-center justify-center group"
          aria-label="AI туслах"
        >
          <span className="text-2xl">🤖</span>
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
          <div className="absolute right-full mr-3 whitespace-nowrap bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition pointer-events-none">
            AI туслах
          </div>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-[380px] max-w-[calc(100vw-24px)] h-[560px] max-h-[calc(100vh-48px)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-xl">
                🤖
              </div>
              <div>
                <div className="font-bold">AI туслах</div>
                <div className="text-xs opacity-90 flex items-center gap-1">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  Идэвхтэй
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              {messages.length > 1 && (
                <button
                  onClick={() => setMessages([])}
                  title="Ярианы түүх цэвэрлэх"
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm"
                >
                  🗑
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-50 to-white">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${
                  m.role === 'user'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                    : 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
                }`}>
                  {m.role === 'user' ? me.first_name[0] : '🤖'}
                </div>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center text-sm">🤖</div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-3 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Quick prompts */}
          {messages.length <= 1 && (
            <div className="px-4 py-2 border-t border-slate-100 bg-white flex gap-2 flex-wrap">
              {[
                'Долоо хоногийн төлөвлөгөө хэрхэн бичих вэ?',
                'Хүүхдийн ажиглалт хийхэд юуг анхаарах вэ?',
                'Эцэг эхтэй харилцах зөвлөгөө',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); setTimeout(send, 50) }}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-slate-200 bg-white">
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                placeholder="Асуулт бичих... (Enter илгээх · Shift+Enter шинэ мөр)"
                rows={1}
                disabled={loading}
                className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none max-h-32"
                style={{ minHeight: 40 }}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-white hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition flex items-center justify-center flex-shrink-0"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  '➤'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
