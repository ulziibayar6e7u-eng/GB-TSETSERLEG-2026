'use client'

export default function FileViewer({ url, onClose }: { url: string; onClose: () => void }) {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || ''
  const isOffice = ['doc','docx','ppt','pptx','xls','xlsx'].includes(ext)
  const isImage  = ['png','jpg','jpeg','gif','webp','svg'].includes(ext)
  const isVideo  = ['mp4','webm','mov'].includes(ext)
  const viewerSrc = isOffice
    ? `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}`
    : url
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex flex-col" onContextMenu={(e) => e.preventDefault()}>
      <div className="bg-white px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">👁</span>
          <span className="text-sm text-slate-700 truncate">Зөвхөн харах горим</span>
        </div>
        <button onClick={onClose} className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg">✕ Хаах</button>
      </div>
      <div className="flex-1 bg-slate-900 flex items-center justify-center overflow-auto select-none">
        {isImage ? (
          <img src={url} alt="" className="max-w-full max-h-full object-contain pointer-events-none" draggable={false} />
        ) : isVideo ? (
          <video src={url} controls controlsList="nodownload" className="max-w-full max-h-full" onContextMenu={(e) => e.preventDefault()} />
        ) : (
          <iframe src={viewerSrc} className="w-full h-full border-0 bg-white" sandbox="allow-scripts allow-same-origin" />
        )}
      </div>
    </div>
  )
}
