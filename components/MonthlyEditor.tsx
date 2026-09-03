'use client'

export type MonthlyData = {
  theme: string
  method: string
  goals: string
  week_themes: { week: number; theme: string }[]
  outcomes: { code: string; type: string; text: string }[]
  activities: { title: string; description: string; date?: string }[]
  content: string
}

export const EMPTY_MONTHLY: MonthlyData = {
  theme: '',
  method: '',
  goals: '',
  week_themes: [{week:1,theme:''},{week:2,theme:''},{week:3,theme:''},{week:4,theme:''}],
  outcomes: [],
  activities: [],
  content: '',
}

export default function MonthlyEditor({
  value,
  onChange,
  readOnly = false,
}: {
  value: MonthlyData
  onChange?: (v: MonthlyData) => void
  readOnly?: boolean
}) {
  function updateWeek(idx: number, theme: string) {
    if (!onChange) return
    const next = [...value.week_themes]
    next[idx] = { ...next[idx], theme }
    onChange({ ...value, week_themes: next })
  }

  function addActivity() {
    if (!onChange) return
    onChange({ ...value, activities: [...value.activities, { title: '', description: '' }] })
  }

  function updateActivity(idx: number, field: 'title' | 'description' | 'date', val: string) {
    if (!onChange) return
    const next = [...value.activities]
    next[idx] = { ...next[idx], [field]: val }
    onChange({ ...value, activities: next })
  }

  function removeActivity(idx: number) {
    if (!onChange) return
    const next = [...value.activities]
    next.splice(idx, 1)
    onChange({ ...value, activities: next })
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Сарын сэдэв</label>
          <input
            value={value.theme}
            onChange={(e) => onChange?.({ ...value, theme: e.target.value })}
            disabled={readOnly}
            placeholder="Жш: Хөгжилтэй найзууд"
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
          <label className="block text-sm font-medium text-slate-700 mb-1">Зорилго</label>
          <textarea
            rows={3}
            value={value.goals}
            onChange={(e) => onChange?.({ ...value, goals: e.target.value })}
            disabled={readOnly}
            placeholder="Хүүхдийн юуг нь хөгжүүлэх, ямар үр дүнд хүрэх"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="text-sm font-semibold text-slate-800 mb-3">📅 Долоо хоногийн сэдэв</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {value.week_themes.map((wt, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-14 h-10 flex items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-700 flex-shrink-0">
                {wt.week}-р 7 хоног
              </div>
              <input
                value={wt.theme}
                onChange={(e) => updateWeek(i, e.target.value)}
                disabled={readOnly}
                placeholder="Сэдэв"
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-slate-800">🎯 Онцлох үйл ажиллагаа</div>
          {!readOnly && (
            <button type="button" onClick={addActivity} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              + Нэмэх
            </button>
          )}
        </div>
        {value.activities.length === 0 ? (
          <div className="text-sm text-slate-400 italic">Байхгүй</div>
        ) : (
          <div className="space-y-2">
            {value.activities.map((a, i) => (
              <div key={i} className="border border-slate-200 rounded-lg p-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
                  <input
                    value={a.title}
                    onChange={(e) => updateActivity(i, 'title', e.target.value)}
                    disabled={readOnly}
                    placeholder="Гарчиг"
                    className="md:col-span-3 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                  />
                  <input
                    type="date"
                    value={a.date || ''}
                    onChange={(e) => updateActivity(i, 'date', e.target.value)}
                    disabled={readOnly}
                    className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                  />
                </div>
                <textarea
                  rows={2}
                  value={a.description}
                  onChange={(e) => updateActivity(i, 'description', e.target.value)}
                  disabled={readOnly}
                  placeholder="Товч тайлбар"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                />
                {!readOnly && (
                  <div className="mt-2 text-right">
                    <button type="button" onClick={() => removeActivity(i)} className="text-red-600 hover:text-red-800 text-xs">
                      Устгах
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <label className="block text-sm font-medium text-slate-700 mb-1">Нэмэлт тайлбар</label>
        <textarea
          rows={4}
          value={value.content}
          onChange={(e) => onChange?.({ ...value, content: e.target.value })}
          disabled={readOnly}
          placeholder="Санамж, тэмдэглэл, шаардлагатай хэрэглэгдэхүүн"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
        />
      </div>
    </div>
  )
}
