import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import multer from 'multer'
import dotenv from 'dotenv'

// Ensure env variables are loaded immediately even when imported as ES module
dotenv.config()

const cloudName = process.env.CLOUDINARY_CLOUD_NAME
const apiKey    = process.env.CLOUDINARY_API_KEY
const apiSecret = process.env.CLOUDINARY_API_SECRET

if (!cloudName || !apiKey || !apiSecret) {
  console.warn('⚠️ [Cloudinary Warning] Missing Cloudinary credentials in .env:')
  if (!cloudName) console.warn('  - CLOUDINARY_CLOUD_NAME is missing')
  if (!apiKey)    console.warn('  - CLOUDINARY_API_KEY is missing')
  if (!apiSecret) console.warn('  - CLOUDINARY_API_SECRET is missing')
} else {
  console.log('✅ [Cloudinary] Configured successfully for cloud:', cloudName)
}

// Configure Cloudinary SDK
cloudinary.config({
  cloud_name: cloudName,
  api_key:    apiKey,
  api_secret: apiSecret,
})

// Storage for user avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'chat-app-avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
  },
})

// Storage for chat media (no face-crop)
const mediaStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'chat-app-media',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  },
})

export const uploadAvatar = multer({ storage: avatarStorage })
export const uploadMedia = multer({ storage: mediaStorage })
export const uploadMediaMulti = multer({ storage: mediaStorage })
export const upload = uploadAvatar // fallback export

export default cloudinary
