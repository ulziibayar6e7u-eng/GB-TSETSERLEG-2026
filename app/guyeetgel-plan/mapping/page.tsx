'use client'

type Mapping = {
  section: string
  items: Array<{
    num: string
    title: string
    source: string
    sourceIcon: string
    sourceColor: string
    menu: string
    auto: boolean
    note?: string
  }>
}

const AUTO = (menu: string, source: string, icon: string, color: string, note?: string) =>
  ({ source, sourceIcon: icon, sourceColor: color, menu, auto: true, note })
const MANUAL = (note: string) =>
  ({ source: 'Гараар бичих', sourceIcon: '✍️', sourceColor: 'bg-amber-100 text-amber-800', menu: 'Төлөвлөгөө биелэлт → Засах', auto: false, note })

const DATA: Mapping[] = [
  {
    section: '1. ХИЧЭЭЛ, СУРГАЛТЫН АЖИЛ',
    items: [
      { num: '1.1', title: 'Жилийн хичээлийн төлөвлөгөө боловсруулах', ...AUTO('Хэрэглэгдэхүүн, хөтөлбөр', 'teacher_materials', '📎', 'bg-blue-100 text-blue-800') },
      { num: '1.2', title: '7 хоногийн ээлжит сургалтын төлөвлөгөө (36 удаа)', ...AUTO('Хэрэглэгдэхүүн, хөтөлбөр', 'teacher_materials', '📎', 'bg-blue-100 text-blue-800') },
      { num: '1.3', title: 'Өдөр тутмын хичээлийн бэлтгэл (120 удаа)', ...AUTO('Сургалт, үйл ажиллагаа', 'plans', '📸', 'bg-cyan-100 text-cyan-800') },
      { num: '1.4', title: 'Нээлттэй хичээл үзэх (сард 1-2)', ...MANUAL('Багш өөрөө "хийсэн" гэж тэмдэглэнэ') },
      { num: '1.5', title: 'Хүүхдийн сурах арга хөгжүүлэх үйл ажиллагаа', ...AUTO('Сургалт, үйл ажиллагаа', 'plans', '📸', 'bg-cyan-100 text-cyan-800') },
      { num: '1.6', title: 'Хичээлийн бэлтгэлийг цаг тухайд нь 100% хийх', ...MANUAL('Жилийн эцэст өөрөө үнэлнэ') },
      { num: '1.7', title: 'Орчин үеийн технологи ашиглан хичээл заах', ...AUTO('Сургалт, үйл ажиллагаа', 'plans', '📸', 'bg-cyan-100 text-cyan-800') },
      { num: '1.8', title: 'Хүүхдийн насны онцлогт тохирсон хэрэглэгдэхүүн', ...AUTO('Хэрэглэгдэхүүн, хөтөлбөр', 'teacher_materials', '📎', 'bg-blue-100 text-blue-800') },
      { num: '1.9', title: 'Хичээлийн явцад хүүхэд бүрийн оролцоог хангах', ...MANUAL('Эрхлэгч/арга зүйч үнэлнэ') },
      { num: '1.10', title: 'Хүүхэд бүрийн ахиц ажиглан бүртгэх (100 удаа)', ...AUTO('Ажиглалт', 'observations', '🎯', 'bg-emerald-100 text-emerald-800') },
      { num: '1.11', title: 'Үнэлгээний үр дүнг эцэг эх, арга зүйчдэд тайлагнах', ...MANUAL('Эцэг эхийн хуралд бэлтгэх, өөрөө тэмдэглэнэ') },
      { num: '1.12', title: 'Жилийн эцсийн 95%-с дээш үнэлгээ', ...AUTO('Ажиглалт', 'observations', '🎯', 'bg-emerald-100 text-emerald-800', '95%-с дээш хүүхэд үнэлэгдсэн эсэх автомат бодогдоно') },
    ],
  },
  {
    section: '2. БАГШ ХӨГЖИЛ',
    items: [
      { num: '2.1', title: 'Цахим сургалтанд хамрагдах (4 удаа)', ...MANUAL('Багш өөрөө тэмдэглэнэ') },
      { num: '2.2', title: 'Багш нарын зөвлөгөөнд оролцох (10 удаа)', ...AUTO('Олон нийтийн үйл ажиллагаа', 'public_event_attendance', '🎪', 'bg-fuchsia-100 text-fuchsia-800', 'Ирсэн бол тоологддог') },
      { num: '2.3', title: 'Нээлттэй хичээл үзэж, туршлага судлах (4)', ...MANUAL('Багш өөрөө тэмдэглэнэ') },
      { num: '2.4', title: 'Өөрөө нээлттэй хичээл явуулах (2)', ...MANUAL('Багш өөрөө тэмдэглэнэ') },
      { num: '2.5', title: 'Мэргэжлийн ном унших (10)', ...MANUAL('Багш өөрөө тэмдэглэнэ') },
      { num: '2.6', title: 'Онол-практикийн чуулган, семинар (2)', ...MANUAL('Багш өөрөө тэмдэглэнэ') },
      { num: '2.7', title: 'Арга зүйн нэгдлийн ажилд оролцох (10)', ...AUTO('Заах аргын нэгдэл', 'teach_method', '🧭', 'bg-indigo-100 text-indigo-800') },
      { num: '2.8', title: 'Ажил амьдралын тэнцвэрт байдлыг хангах', ...MANUAL('Жилийн эцэст өөрөө үнэлнэ') },
      { num: '2.9', title: 'Эрүүл мэндийн шалгалтад хамрагдах (2)', ...AUTO('Эмчийн хяналт', 'health_records', '🩺', 'bg-rose-100 text-rose-800') },
      { num: '2.10', title: 'Багшлахуйн ур чадварт өөрийн үнэлгээ (2)', ...MANUAL('Багш өөрөө тэмдэглэнэ') },
    ],
  },
  {
    section: '3. СУРГАЛТЫН ХӨТӨЛБӨР, АРГА ЗҮЙ, СУДАЛГАА',
    items: [
      { num: '3.1', title: '7 хоногийн төлөвлөгөөг арга зүйчээр батлуулах', ...AUTO('Хэрэглэгдэхүүн, хөтөлбөр', 'teacher_materials', '📎', 'bg-blue-100 text-blue-800', 'status=approved бол тооллогддог') },
      { num: '3.2', title: 'Сургалтын хэрэглэгдэхүүн баяжилт (20)', ...AUTO('Хэрэглэгдэхүүн, хөтөлбөр', 'teacher_materials', '📎', 'bg-blue-100 text-blue-800') },
      { num: '3.3', title: 'Нэмэлт хөтөлбөр, арга хэмжээний төлөвлөгөө (4)', ...AUTO('Хэрэглэгдэхүүн, хөтөлбөр', 'teacher_materials', '📎', 'bg-blue-100 text-blue-800') },
      { num: '3.4', title: 'Сарын арга хэмжээний төлөвлөгөө (9)', ...AUTO('Хэрэглэгдэхүүн, хөтөлбөр', 'teacher_materials', '📎', 'bg-blue-100 text-blue-800') },
      { num: '3.5', title: 'Хүүхдийн гарын авлага, дасгал (10)', ...AUTO('Хэрэглэгдэхүүн, хөтөлбөр', 'teacher_materials', '📎', 'bg-blue-100 text-blue-800') },
      { num: '3.6', title: '85%-с дээш хүүхэд үйл ажиллагаанд оролцсон', ...AUTO('Ирц', 'attendance', '⏰', 'bg-purple-100 text-purple-800') },
      { num: '3.7', title: 'Шинэ дуу зааж өгөх (20) — хөгжмийн багш', ...AUTO('Хөгжмийн үйл ажиллагаа', 'music_activity', '🎵', 'bg-pink-100 text-pink-800') },
      { num: '3.8', title: 'Сонсох хөгжмийн үйл ажиллагаа (15)', ...AUTO('Хөгжмийн үйл ажиллагаа', 'music_activity', '🎵', 'bg-pink-100 text-pink-800') },
      { num: '3.9', title: 'Хэмнэлийн үйл ажиллагаа (15)', ...AUTO('Хөгжмийн үйл ажиллагаа', 'music_activity', '🎵', 'bg-pink-100 text-pink-800') },
      { num: '3.10', title: 'Дүрд тоглох үйл ажиллагаа (10)', ...AUTO('Хөгжмийн үйл ажиллагаа', 'music_activity', '🎵', 'bg-pink-100 text-pink-800') },
      { num: '3.11', title: 'Хөгжимт хөдөлгөөн (15)', ...AUTO('Хөгжмийн үйл ажиллагаа', 'music_activity', '🎵', 'bg-pink-100 text-pink-800') },
      { num: '3.12', title: 'Дугуйлангийн үйл ажиллагаа (24)', ...AUTO('Дугуйлан', 'club_activities', '🎨', 'bg-pink-100 text-pink-800') },
      { num: '3.13', title: 'Жилийн эцсийн судалгаа боловсруулах', ...MANUAL('Багш өөрөө тэмдэглэнэ') },
      { num: '3.14', title: 'Багш нарт зориулсан арга зүйн зөвлөгөө (4)', ...AUTO('Заах аргын нэгдэл', 'teach_method', '🧭', 'bg-indigo-100 text-indigo-800') },
      { num: '3.15', title: 'Хүүхдийн хөгжлийн судалгаа (2)', ...AUTO('Ажиглалт', 'observations', '🎯', 'bg-emerald-100 text-emerald-800') },
      { num: '3.16', title: 'Хичээлийн ээлж, зохион байгуулалт', ...MANUAL('Жижүүр багшийн хуваарьтай холбоотой') },
    ],
  },
  {
    section: '4. ЭЦЭГ ЭХ, НИЙГЭМ, ХАМТ ОЛОНТОЙ ХАРИЛЦАА',
    items: [
      { num: '4.1', title: 'Эцэг эхтэй уулзалт (4)', ...MANUAL('Өөрөө тэмдэглэнэ (эцэг эхийн чат системд холбогдвол автомат)') },
      { num: '4.2', title: 'Эцэг эхийн сургалт (2)', ...MANUAL('Өөрөө тэмдэглэнэ') },
      { num: '4.3', title: 'Эцэг эхтэй харилцах 80%+ идэвхтэй', ...MANUAL('Өөрөө үнэлнэ') },
      { num: '4.4', title: 'Хамт олны үйл ажиллагаа (10)', ...AUTO('Олон нийтийн үйл ажиллагаа', 'public_event_attendance', '🎪', 'bg-fuchsia-100 text-fuchsia-800') },
      { num: '4.5', title: 'Нийгэмд тустай ажил (2)', ...AUTO('Санаачилсан ажил', 'sanaachilgaa', '💡', 'bg-amber-100 text-amber-800') },
    ],
  },
  {
    section: '5. ЖЕНДЕР, ХҮНИЙ ЭРХ, ХҮҮХЭД ХАМГААЛАЛ, ЭРҮҮЛ АХУЙ',
    items: [
      { num: '5.1', title: 'Хүүхэд хамгааллын бодлого мөрдөх', ...AUTO('Хүүхэд хамгаалал', 'safety_activities', '🛡', 'bg-slate-100 text-slate-800') },
      { num: '5.2', title: 'Жендерийн тэгш байдлыг хангах', ...MANUAL('Байгууллагын бодлого — өөрөө үнэлнэ') },
      { num: '5.3', title: 'Хүний эрхийг хүндэтгэх орчин', ...MANUAL('Өөрөө үнэлнэ') },
      { num: '5.4', title: 'Эрүүл ахуйн шаардлагыг хангах', ...AUTO('Цэвэрлэгээ хяналт', 'cleaning_checklist', '🧹', 'bg-teal-100 text-teal-800') },
      { num: '5.5', title: 'Аюулгүй ажиллагааны зааварчилгаа (4)', ...AUTO('Хүүхэд хамгаалал', 'safety_activities', '🛡', 'bg-slate-100 text-slate-800') },
    ],
  },
]

export default function MappingPage() {
  const totalAuto = DATA.reduce((s, g) => s + g.items.filter(i => i.auto).length, 0)
  const totalManual = DATA.reduce((s, g) => s + g.items.filter(i => !i.auto).length, 0)
  const total = totalAuto + totalManual

  return (
    <div className="p-6 lg:p-8 print:p-2">
      <style jsx global>{`@media print { nav, aside, .no-print { display: none !important; } @page { size: A4 landscape; margin: 1cm; } }`}</style>

      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3 no-print">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">🗺️ Мэдээллийн эх үүсвэрийн зураглал</h1>
            <p className="text-sm text-slate-500 mt-1">Гүйцэтгэлийн төлөвлөгөөний 48 зорилт — аль цэснээс татагддаг</p>
          </div>
          <div className="flex gap-2">
            <a href="/guyeetgel-plan" className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm">← Төлөвлөгөө биелэлт</a>
            <button onClick={() => window.print()} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold">🖨️ Хэвлэх</button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="text-3xl font-bold text-slate-800">{total}</div><div className="text-xs text-slate-500 mt-1">Нийт зорилт</div></div>
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4"><div className="text-3xl font-bold text-emerald-700">{totalAuto}</div><div className="text-xs text-emerald-700 mt-1">🤖 Автомат татагддаг ({Math.round(totalAuto/total*100)}%)</div></div>
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4"><div className="text-3xl font-bold text-amber-700">{totalManual}</div><div className="text-xs text-amber-700 mt-1">✍️ Гараар бичдэг ({Math.round(totalManual/total*100)}%)</div></div>
        </div>

        <div className="space-y-6">
          {DATA.map((g, gi) => (
            <div key={gi} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-800 text-white p-3 font-bold text-sm">{g.section}</div>
              <div className="divide-y divide-slate-100">
                {g.items.map(it => (
                  <div key={it.num} className="p-3 flex gap-3 items-start hover:bg-slate-50">
                    <div className="w-12 text-xs font-mono text-slate-500 flex-shrink-0 text-center pt-1">{it.num}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-800">{it.title}</div>
                      {it.note && <div className="text-xs text-slate-500 mt-0.5 italic">{it.note}</div>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${it.sourceColor} font-medium`}>
                        {it.sourceIcon} {it.menu}
                      </span>
                      {it.auto ? <span className="text-xs bg-emerald-600 text-white px-2 py-1 rounded-full">🤖 Авто</span>
                               : <span className="text-xs bg-amber-500 text-white px-2 py-1 rounded-full">✍️ Гараар</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-4">
          <div className="font-semibold text-blue-900 mb-2">💡 Яаж ажилладаг вэ?</div>
          <ol className="text-sm text-blue-900 space-y-1 list-decimal list-inside">
            <li><b>Жилийн эхэнд</b> багш "⚡ Шаблоноос үүсгэх" товч дарна → 48 зорилт автомат орно</li>
            <li>Жилийн турш ажиллах үед систем <b>автомат тоологддог</b> (🤖 Авто тэмдэгтэй зорилтууд)</li>
            <li>Гараар бичих зүйлсийг (✍️) багш шууд "Хийсэн" гэж тэмдэглэдэг</li>
            <li>Хагас жилийн эцэст / жилийн эцэст <b>"📄 Биелэлт" товч</b> дархад албан ёсны хүснэгт бэлэн болно</li>
            <li>Ctrl+P → <b>Save as PDF</b> эсвэл шууд хэвлээд өгөх боломжтой</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
