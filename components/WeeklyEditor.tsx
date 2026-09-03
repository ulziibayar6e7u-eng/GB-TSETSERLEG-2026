'use client'

export type PlanData = {
  theme: string
  method: string
  new_words: string[]
  outcomes: { code: string; type: string; text: string }[]
  cells: Record<string, Record<string, string>>
}

export const EMPTY_PLAN: PlanData = {
  theme: '',
  method: '',
  new_words: [],
  outcomes: [],
  cells: {},
}

const TIME_SLOTS = [
  { code: 0, label: 'Өглөөний хүлээн авалт', duration: '30 мин', color: '#fef3c7' },
  { code: 1, label: 'Өглөөний дасгал',        duration: '20 мин', color: '#fce7f3' },
  { code: 2, label: 'Тойргийн цаг',           duration: '15 мин', color: '#dbeafe' },
  { code: 3, label: 'Чиглүүлэгтэй тоглоом',   duration: '30 мин', color: '#dcfce7' },
  { code: 4, label: 'Зугаалгын цаг',          duration: '30 мин', color: '#e0f2fe' },
  { code: 5, label: 'Номын цаг',              duration: '15 мин', color: '#f3e8ff' },
  { code: 6, label: 'Төвийн цаг',             duration: '40 мин', color: '#fef3c7' },
  { code: 7, label: 'Хөгжөөн баясгах ажил',   duration: '30 мин', color: '#ffedd5' },
]

const DAYS = ['Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан']

export default function WeeklyEditor({
  value,
  onChange,
  readOnly = false,
}: {
  value: PlanData
  onChange?: (v: PlanData) => void
  readOnly?: boolean
}) {
  function updateCell(slot: number, day: number, text: string) {
    if (!onChange) return
    const next = { ...value, cells: { ...(value.cells || {}) } }
    const slotKey = String(slot)
    next.cells[slotKey] = { ...(next.cells[slotKey] || {}), [String(day)]: text }
    onChange(next)
  }

  function addWord(w: string) {
    if (!onChange) return
    const trimmed = w.trim()
    if (!trimmed) return
    onChange({ ...value, new_words: [...(value.new_words || []), trimmed] })
  }

  function removeWord(idx: number) {
    if (!onChange) return
    const next = [...(value.new_words || [])]
    next.splice(idx, 1)
    onChange({ ...value, new_words: next })
  }

  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Сэдэв</label>
          <input
            value={value.theme}
            onChange={(e) => onChange?.({ ...value, theme: e.target.value })}
            disabled={readOnly}
            placeholder="Жш: Хөгжилтэй найзууд · Би-Миний найзууд"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Заах арга зүй</label>
          <input
            value={value.method}
            onChange={(e) => onChange?.({ ...value, method: e.target.value })}
            disabled={readOnly}
            placeholder="Жш: Тоглоомд суурилсан арга зүй"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Шинэ үг</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(value.new_words || []).map((w, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-sm px-2 py-1 rounded-lg">
                {w}
                {!readOnly && (
                  <button type="button" onClick={() => removeWord(i)} className="hover:text-red-600">✕</button>
                )}
              </span>
            ))}
            {(value.new_words || []).length === 0 && <span className="text-sm text-slate-400">Байхгүй</span>}
          </div>
          {!readOnly && (
            <input
              placeholder="Enter дарж нэмнэ"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addWord(e.currentTarget.value)
                  e.currentTarget.value = ''
                }
              }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>

        {(value.outcomes || []).length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Хөгжлийн үзүүлэлт ({value.outcomes.length})</label>
            <div className="space-y-1">
              {value.outcomes.map((o, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded flex-shrink-0">{o.code}</span>
                  <span className={`text-xs px-2 py-1 rounded flex-shrink-0 ${o.type === 'new' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                    {o.type === 'new' ? 'Шинэ' : 'Уялд.'}
                  </span>
                  <span className="text-slate-700">{o.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left text-xs font-semibold text-slate-600 uppercase p-3 border-b border-slate-200 w-40 sticky left-0 bg-slate-50 z-10">
                  Цагийн хэсэг
                </th>
                {DAYS.map((d, i) => (
                  <th key={i} className="text-left text-xs font-semibold text-slate-600 uppercase p-3 border-b border-l border-slate-200 min-w-[200px]">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((slot) => (
                <tr key={slot.code}>
                  <td
                    className="p-3 align-top border-b border-slate-200 sticky left-0 bg-white z-10"
                    style={{ background: slot.color }}
                  >
                    <div className="font-semibold text-sm text-slate-800">{slot.label}</div>
                    <div className="text-xs text-slate-500">{slot.duration}</div>
                  </td>
                  {DAYS.map((_, day) => {
                    const val = value.cells?.[String(slot.code)]?.[String(day)] || ''
                    return (
                      <td key={day} className="p-1 align-top border-b border-l border-slate-100">
                        <textarea
                          value={val}
                          onChange={(e) => updateCell(slot.code, day, e.target.value)}
                          disabled={readOnly}
                          rows={3}
                          className="w-full text-sm p-2 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 border border-transparent hover:border-slate-200"
                          placeholder="—"
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
