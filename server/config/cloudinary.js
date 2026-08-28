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

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_AUDIO_MIMES = [
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg',
  'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/mp4', 'video/webm', 'video/mp4'
]
const FORBIDDEN_EXTENSIONS = /\.(exe|js|html|htm|php|sh|bat|cmd|vbs|jar|apk)$/i

const imageFileFilter = (req, file, cb) => {
  if (FORBIDDEN_EXTENSIONS.test(file.originalname)) {
    return cb(new Error('Forbidden file type'), false)
  }
  if (ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Only JPG, PNG, WEBP, and GIF images are allowed'), false)
  }
}

const audioFileFilter = (req, file, cb) => {
  if (FORBIDDEN_EXTENSIONS.test(file.originalname)) {
    return cb(new Error('Forbidden file type'), false)
  }
  if (ALLOWED_AUDIO_MIMES.includes(file.mimetype) || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/webm')) {
    cb(null, true)
  } else {
    cb(new Error('Only valid audio formats (MP3, WAV, WEBM, OGG, M4A) are allowed'), false)
  }
}

// Storage for user avatars with EXIF stripping
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'chat-app-avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face', flags: 'strip_profile' }
    ],
  },
})

// Storage for chat media with EXIF stripping
const mediaStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'chat-app-media',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ flags: 'strip_profile' }],
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

export const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: imageFileFilter,
})

export const uploadMedia = multer({
  storage: mediaStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: imageFileFilter,
})

export const uploadMediaMulti = multer({
  storage: mediaStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: imageFileFilter,
})

export const uploadAudio = multer({
  storage: audioStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: audioFileFilter,
})

export const upload = uploadAvatar // fallback export

export default cloudinary

