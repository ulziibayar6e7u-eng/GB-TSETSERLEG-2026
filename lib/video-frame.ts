// Браузер дээр бичлэгийн дундаас нэг кадрыг зураг (JPEG data URL) болгон авна. Амжилтгүй бол null.
// Бичлэг сервер рүү явахгүй, зөвхөн жижиг кадр явна.
export function videoFrame(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const v = document.createElement('video')
    let done = false
    const finish = (r: string | null) => { if (!done) { done = true; v.removeAttribute('src'); v.load(); resolve(r) } }
    const timer = setTimeout(() => finish(null), 20000)
    v.muted = true
    v.preload = 'auto'
    v.crossOrigin = 'anonymous'
    v.playsInline = true
    v.onerror = () => { clearTimeout(timer); finish(null) }
    v.onloadedmetadata = () => {
      const d = isFinite(v.duration) ? v.duration : 0
      v.currentTime = d > 0 ? Math.min(d / 2, d - 0.1 > 0 ? d - 0.1 : 0) : 0
    }
    v.onseeked = () => {
      try {
        const w0 = v.videoWidth, h0 = v.videoHeight
        if (!w0 || !h0) { clearTimeout(timer); return finish(null) }
        const s = Math.min(1, 640 / Math.max(w0, h0))
        const c = document.createElement('canvas')
        c.width = Math.round(w0 * s); c.height = Math.round(h0 * s)
        c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height)
        clearTimeout(timer)
        finish(c.toDataURL('image/jpeg', 0.7))
      } catch { clearTimeout(timer); finish(null) }
    }
    v.src = url
  })
}
