'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

type Note = {
  id: string; file_url: string; note: string; created_at: string
  employees?: { last_name: string; first_name: string }|null
}

export default function FileViewer({ url, onClose }: { url: string; onClose: () => void }) {
  const supabase = useMemo(() => createClient(), [])
  const { me } = useMe()
  const [notes, setNotes] = useState<Note[]>([])
  const [text, setText] = useState('')
  const [showNotes, setShowNotes] = useState(true)
  const [saving, setSaving] = useState(false)

  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || ''
  const isOffice = ['doc','docx','ppt','pptx','xls','xlsx'].includes(ext)
  const isImage  = ['png','jpg','jpeg','gif','webp','svg'].includes(ext)
  const isVideo  = ['mp4','webm','mov'].includes(ext)
  const viewerSrc = isOffice ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}` : url

  const canWrite = !!(me && (me.is_admin || me.role === 'erhlegch' || me.role === 'arga_zuich'))

  async function load() {
    const { data } = await supabase.from('file_notes').select('*, employees:author_id(last_name, first_name)').eq('file_url', url).order('created_at', { ascending: false })
    setNotes((data as any) || [])
  }
  useEffect(() => { load() }, [url])

  async function save() {
    if (!text.trim() || !me) return
    setSaving(true)
    await supabase.from('file_notes').insert({ file_url: url, note: text.trim(), author_id: me.id })
    setSaving(false); setText(''); load()
  }
  async function remove(id: string) {
    if (!confirm('Устгах уу?')) return
    await supabase.from('file_notes').delete().eq('id', id); load()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex flex-col" style={{zIndex: 99999}} onContextMenu={(e) => e.preventDefault()}>
      <div className="bg-white px-4 py-3 flex items-center justify-between gap-3 border-b-2 border-red-500">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">👁</span>
          <span className="text-sm text-slate-700 truncate">Зөвхөн харах горим</span>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setShowNotes(!showNotes)} className="text-sm bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-lg font-semibold shadow">💬 Зөвлөмж ({notes.length})</button>
          <button onClick={onClose} className="text-sm bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold shadow">← Буцах</button>
        </div>
      </div>
      <button onClick={onClose} className="fixed top-3 right-3 bg-red-600 hover:bg-red-700 text-white w-12 h-12 rounded-full font-bold text-xl shadow-lg" style={{zIndex: 100000}} title="Хаах">✕</button>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 bg-slate-900 flex items-center justify-center overflow-auto select-none">
          {isImage ? (
            <img src={url} alt="" className="max-w-full max-h-full object-contain pointer-events-none" draggable={false} />
          ) : isVideo ? (
            <video src={url} controls controlsList="nodownload" className="max-w-full max-h-full" onContextMenu={(e) => e.preventDefault()} />
          ) : (
            <iframe src={viewerSrc} className="w-full h-full border-0 bg-white" />
          )}
        </div>
        {showNotes && (
          <div className="w-80 bg-white border-l border-slate-200 flex flex-col">
            <div className="p-3 border-b border-slate-200 bg-amber-50">
              <div className="font-semibold text-amber-900 text-sm">💬 Зөвлөмж, тэмдэглэл</div>
              <div className="text-xs text-amber-700 mt-0.5">Файлд хамаарах санал шүүмжлэл</div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {notes.length === 0 && <div className="text-xs text-slate-400 text-center py-8">Зөвлөмж алга</div>}
              {notes.map(n => (
                <div key={n.id} className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                  <div className="text-xs text-slate-500 flex justify-between mb-1">
                    <span>✍️ {n.employees ? `${n.employees.last_name}.${n.employees.first_name}` : 'Тодорхойгүй'}</span>
                    <span>{new Date(n.created_at).toLocaleDateString('mn-MN')}</span>
                  </div>
                  <div className="text-sm text-slate-800 whitespace-pre-wrap">{n.note}</div>
                  {me && n.employees && (
                    <button onClick={()=>remove(n.id)} className="text-xs text-red-500 hover:text-red-700 mt-1">Устгах</button>
                  )}
                </div>
              ))}
            </div>
            {canWrite && (
              <div className="p-3 border-t border-slate-200 bg-slate-50">
                <textarea value={text} onChange={(e)=>setText(e.target.value)} rows={3} placeholder="Зөвлөмж, тэмдэглэл бичих..." className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-2" />
                <button onClick={save} disabled={saving || !text.trim()} className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white rounded-lg py-2 text-sm font-semibold">💾 Хадгалах</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
