/**
 * Client-Side Canvas Image Compression Utility
 * Resizes images to maxWidth/maxHeight and compresses to JPEG/WebP.
 * Prevents large payload timeouts on tunnels (Serveo / Cloudflare).
 *
 * @param {File|Blob} file - The image file to compress
 * @param {object} options
 * @param {number} [options.maxWidth=500] - Max width in px
 * @param {number} [options.maxHeight=500] - Max height in px
 * @param {number} [options.quality=0.7] - Quality 0.1 to 1.0
 * @param {string} [options.mimeType='image/jpeg'] - Target MIME type
 * @returns {Promise<File>}
 */
export function compressImage(file, { maxWidth = 500, maxHeight = 500, quality = 0.7, mimeType = 'image/jpeg' } = {}) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      return resolve(file)
    }

    // Skip GIFs to preserve animation
    if (file.type === 'image/gif') {
      return resolve(file)
    }

    const reader = new FileReader()
    reader.readAsDataURL(file)

    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target.result

      img.onload = () => {
        let width = img.width
        let height = img.height

        // Calculate scaled dimensions keeping aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const fileName = file.name ? file.name.replace(/\.[^/.]+$/, '.jpg') : 'compressed.jpg'
              const compressedFile = new File([blob], fileName, {
                type: mimeType,
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            } else {
              resolve(file)
            }
          },
          mimeType,
          quality
        )
      }

      img.onerror = (err) => reject(err)
    }

    reader.onerror = (err) => reject(err)
  })
}
