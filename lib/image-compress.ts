/**
 * Client-side image compression — reduces file size before upload.
 * - Resizes to max 1600x1600 (keeps aspect ratio)
 * - Converts to JPEG at 0.78 quality
 * - Typical: 3-5MB phone photo → 150-350KB
 * - Non-images (PDF, Office, video) returned as-is
 */
export async function compressImage(file: File, maxDim = 1600, quality = 0.78): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, w, h)

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
    )
    if (!blob || blob.size >= file.size) return file

    const newName = file.name.replace(/\.(png|jpe?g|webp|heic|heif|bmp|tiff?)$/i, '.jpg')
    return new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    return file
  }
}

export async function compressImages(files: File[], maxDim = 1600, quality = 0.78): Promise<File[]> {
  return Promise.all(files.map((f) => compressImage(f, maxDim, quality)))
}
