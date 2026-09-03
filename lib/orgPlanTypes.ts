export const PLAN_TYPES: Record<string, { icon: string; label: string; desc: string; color: string }> = {
  teacher_performance: { icon: '👩‍🏫', label: 'Багшийн гүйцэтгэлийн төлөвлөгөө', desc: 'Багш нарын жилийн, улирлын гүйцэтгэлийн төлөвлөгөө', color: 'from-blue-500 to-cyan-600' },
  staff_activity:      { icon: '👷', label: 'Албан хаагчдын үйл ажиллагааны төлөвлөгөө', desc: 'Нярав, тогооч, үйлчлэгч гэх мэт албан хаагчдын төлөвлөгөө', color: 'from-emerald-500 to-teal-600' },
  work_group:          { icon: '👥', label: 'Ажлын хэсгийн төлөвлөгөө', desc: 'Хүүхэд хамгаалал, чанарын үнэлгээ, ёс зүйн зөвлөл', color: 'from-purple-500 to-fuchsia-600' },
  seasonal:            { icon: '📆', label: 'Цаг үетэй холбоотой төлөвлөгөө', desc: 'Улирлын арга хэмжээ, баяр, олон нийтийн ажил', color: 'from-amber-500 to-orange-600' },
  training:            { icon: '📚', label: 'Сургалт хөгжлийн төлөвлөгөө', desc: 'Багш нарын мэргэжил дээшлүүлэх, сургалтын хөтөлбөр', color: 'from-pink-500 to-rose-600' },
  finance:             { icon: '💰', label: 'Санхүү, аж ахуйн төлөвлөгөө', desc: 'Худалдан авалт, засвар үйлчилгээ, төсөв', color: 'from-slate-500 to-slate-700' },
}

export const PHASES = [
  { key: 'plan',             label: 'Төлөвлөгөө',              icon: '📝', color: 'bg-blue-100 text-blue-700' },
  { key: 'half_realization', label: 'Хагас жилийн биелэлт',    icon: '📈', color: 'bg-amber-100 text-amber-700' },
  { key: 'year_realization', label: 'Жилийн эцсийн биелэлт',   icon: '🏁', color: 'bg-emerald-100 text-emerald-700' },
  { key: 'half_report',      label: 'Хагас жилийн тайлан',     icon: '📄', color: 'bg-purple-100 text-purple-700' },
  { key: 'year_report',      label: 'Жилийн эцсийн тайлан',    icon: '📊', color: 'bg-red-100 text-red-700' },
] as const

export type PhaseKey = typeof PHASES[number]['key']
