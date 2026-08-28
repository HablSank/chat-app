/**
 * Image and File Security Utilities
 * - EXIF Metadata Stripping via HTML5 Canvas
 * - File format and size validation
 */

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5 MB
const MAX_AUDIO_SIZE = 10 * 1024 * 1024 // 10 MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const FORBIDDEN_EXTENSIONS = /\.(exe|js|html|htm|php|sh|bat|cmd|vbs|jar|apk)$/i

export function validateFile(file, isAudio = false) {
  if (!file) return { valid: false, error: 'No file provided' }

  if (FORBIDDEN_EXTENSIONS.test(file.name)) {
    return { valid: false, error: `Format file "${file.name}" tidak diizinkan demi keamanan.` }
  }

  const maxSize = isAudio ? MAX_AUDIO_SIZE : MAX_IMAGE_SIZE
  const maxMb = isAudio ? 10 : 5
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Ukuran file "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimum ${maxMb} MB.`,
    }
  }

  if (!isAudio && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Format gambar "${file.name}" tidak didukung. Harap gunakan JPG, PNG, WEBP, atau GIF.`,
    }
  }

  return { valid: true }
}

/**
 * Strips EXIF metadata (GPS location, camera details, timestamps) from an image file
 * by re-drawing it onto an HTML5 Canvas element.
 */
export async function stripExifFromImage(file) {
  if (!file || !file.type.startsWith('image/') || file.type === 'image/gif') {
    return file // GIFs or non-images don't need canvas redraw
  }

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || img.width
        canvas.height = img.naturalHeight || img.height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }
            const cleanFile = new File([blob], file.name, {
              type: outputType,
              lastModified: Date.now(),
            })
            resolve(cleanFile)
          },
          outputType,
          0.95
        )
      }
      img.onerror = () => resolve(file)
      img.src = e.target.result
    }
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}
