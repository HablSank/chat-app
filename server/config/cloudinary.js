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

const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'gif',
  'pdf', 'doc', 'docx', 'txt',
  'mp3', 'wav', 'webm', 'ogg', 'm4a', 'aac', 'mp4'
])

const BLOCKED_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'php', 'js', 'html', 'htm', 'jar', 'vbs', 'scr', 'msi', 'com', 'pif'
])

const fileFilter = (req, file, cb) => {
  const originalName = file.originalname || ''
  const ext = originalName.split('.').pop()?.toLowerCase() || ''

  if (BLOCKED_EXTENSIONS.has(ext)) {
    return cb(new Error(`File extension .${ext} is strictly prohibited for security reasons.`))
  }

  if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new Error(`Unsupported file type .${ext}. Only safe media and document formats are permitted.`))
  }

  cb(null, true)
}

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
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'doc', 'docx', 'txt'],
  },
})

// Storage for audio messages / voice notes
const audioStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'chat-app-audio',
    resource_type: 'auto',
    allowed_formats: ['mp3', 'wav', 'webm', 'ogg', 'm4a', 'aac', 'mp4'],
  },
})

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
})

export const uploadMedia = multer({
  storage: mediaStorage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
})

export const uploadMediaMulti = multer({
  storage: mediaStorage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
})

export const uploadAudio = multer({
  storage: audioStorage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
})

export const upload = uploadAvatar // fallback export

export default cloudinary

