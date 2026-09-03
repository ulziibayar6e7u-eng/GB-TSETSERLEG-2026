'use client'

import { useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`

export type Stroke = { page: number; pts: [number, number][]; color: string; width: number }

function PagePanel({
  pageNumber,
  drawMode,
  strokes,
  onNewStroke,
  pageWidth,
}: {
  pageNumber: number
  drawMode: boolean
  strokes: Stroke[]
  onNewStroke: (s: Stroke) => void
  pageWidth: number
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const currentPts = useRef<[number, number][]>([])
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)

  function redraw() {
    const c = overlayRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, c.width, c.height)
    for (const s of strokes.filter((s) => s.page === pageNumber)) {
      if (s.pts.length < 2) continue
      ctx.beginPath()
      ctx.strokeStyle = s.color
      ctx.lineWidth = s.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.moveTo(s.pts[0][0], s.pts[0][1])
      for (let i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i][0], s.pts[i][1])
      ctx.stroke()
    }
  }

  useEffect(() => { redraw() }, [strokes, size, pageNumber])

  // Attach ResizeObserver to PDF canvas so overlay auto-sizes
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    let obs: ResizeObserver | null = null
    const attach = () => {
      const pageCanvas = wrap.querySelector('canvas.react-pdf__Page__canvas') as HTMLCanvasElement | null
      if (!pageCanvas) { setTimeout(attach, 100); return }
      const apply = () => {
        const w = pageCanvas.clientWidth
        const h = pageCanvas.clientHeight
        if (w > 0 && h > 0) setSize({ w, h })
      }
      apply()
      obs = new ResizeObserver(apply)
      obs.observe(pageCanvas)
    }
    attach()
    return () => { obs?.disconnect() }
  }, [pageWidth])

  function onDown(e: React.PointerEvent) {
    if (!drawMode) return
    const c = overlayRef.current
    if (!c) return
    try { (e.target as Element).setPointerCapture(e.pointerId) } catch {}
    drawing.current = true
    const rect = c.getBoundingClientRect()
    currentPts.current = [[e.clientX - rect.left, e.clientY - rect.top]]
  }
  function onMove(e: React.PointerEvent) {
    if (!drawMode || !drawing.current) return
    const c = overlayRef.current
    if (!c) return
    const rect = c.getBoundingClientRect()
    currentPts.current.push([e.clientX - rect.left, e.clientY - rect.top])
    const ctx = c.getContext('2d')
    if (!ctx) return
    const pts = currentPts.current
    if (pts.length < 2) return
    ctx.beginPath()
    ctx.strokeStyle = '#dc2626'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.moveTo(pts[pts.length - 2][0], pts[pts.length - 2][1])
    ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1])
    ctx.stroke()
  }
  function onUp() {
    if (!drawing.current) return
    drawing.current = false
    if (currentPts.current.length < 2) return
    onNewStroke({ page: pageNumber, pts: [...currentPts.current], color: '#dc2626', width: 3 })
    currentPts.current = []
  }

  return (
    <div ref={wrapRef} className="relative mb-4 mx-auto shadow-lg bg-white" style={{ width: 'fit-content' }}>
      <Page pageNumber={pageNumber} width={pageWidth} renderTextLayer={false} renderAnnotationLayer={false} />
      {size && (
        <canvas
          ref={overlayRef}
          width={size.w}
          height={size.h}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="absolute top-0 left-0"
          style={{
            width: size.w,
            height: size.h,
            cursor: drawMode ? 'crosshair' : 'default',
            pointerEvents: drawMode ? 'auto' : 'none',
            touchAction: 'none',
            zIndex: 10,
          }}
        />
      )}
      {drawMode && (
        <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded shadow pointer-events-none" style={{ zIndex: 20 }}>
          🖊 Хуудас {pageNumber}
        </div>
      )}
    </div>
  )
}

export default function PdfAnnotator({
  url,
  drawMode,
  initialStrokes,
  onStrokesChange,
}: {
  url: string
  drawMode: boolean
  initialStrokes: Stroke[]
  onStrokesChange: (strokes: Stroke[]) => void
}) {
  const [numPages, setNumPages] = useState(0)
  const [strokes, setStrokes] = useState<Stroke[]>(initialStrokes || [])
  const containerRef = useRef<HTMLDivElement>(null)
  const [pageWidth, setPageWidth] = useState(800)

  useEffect(() => setStrokes(initialStrokes || []), [initialStrokes])

  useEffect(() => {
    const cont = containerRef.current
    if (!cont) return
    const measure = () => setPageWidth(Math.min(1000, Math.max(400, cont.clientWidth - 40)))
    measure()
    const obs = new ResizeObserver(measure)
    obs.observe(cont)
    return () => obs.disconnect()
  }, [])

  function addStroke(s: Stroke) {
    const updated = [...strokes, s]
    setStrokes(updated)
    onStrokesChange(updated)
  }

  return (
    <div ref={containerRef} className="h-full overflow-auto bg-slate-300 p-4">
      <Document
        file={url}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        loading={<div className="text-center p-8 text-slate-500">PDF ачааллаж байна...</div>}
        error={<div className="text-center p-8 text-red-600">PDF ачаалагдсангүй.</div>}
      >
        {Array.from(new Array(numPages), (_, i) => i + 1).map((page) => (
          <PagePanel
            key={page}
            pageNumber={page}
            drawMode={drawMode}
            strokes={strokes}
            onNewStroke={addStroke}
            pageWidth={pageWidth}
          />
        ))}
      </Document>
    </div>
  )
}
