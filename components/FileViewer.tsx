'use client'

export default function FileViewer({ url, onClose }: { url: string; onClose: () => void }) {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || ''
  const isOffice = ['doc','docx','ppt','pptx','xls','xlsx'].includes(ext)
  const isImage  = ['png','jpg','jpeg','gif','webp','svg'].includes(ext)
  const isVideo  = ['mp4','webm','mov'].includes(ext)
  const viewerSrc = isOffice
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
    : url
  return (
    <div className="fixed inset-0 bg-black/70 flex flex-col" style={{zIndex: 99999}} onContextMenu={(e) => e.preventDefault()}>
      <div className="bg-white px-4 py-3 flex items-center justify-between gap-3 border-b-2 border-red-500">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">👁</span>
          <span className="text-sm text-slate-700 truncate">Зөвхөн харах горим</span>
        </div>
        <button onClick={onClose} className="text-sm bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold shadow">← Буцах</button>
      </div>
      <button onClick={onClose} className="fixed top-3 right-3 bg-red-600 hover:bg-red-700 text-white w-12 h-12 rounded-full font-bold text-xl shadow-lg" style={{zIndex: 100000}} title="Хаах">✕</button>
      <div className="flex-1 bg-slate-900 flex items-center justify-center overflow-auto select-none">
        {isImage ? (
          <img src={url} alt="" className="max-w-full max-h-full object-contain pointer-events-none" draggable={false} />
        ) : isVideo ? (
          <video src={url} controls controlsList="nodownload" className="max-w-full max-h-full" onContextMenu={(e) => e.preventDefault()} />
        ) : (
          <iframe src={viewerSrc} className="w-full h-full border-0 bg-white" />
        )}
      </div>
    </div>
  )
}
