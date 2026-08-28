import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import { Timer, Play, Pause, Reply, Pin, PinOff, Pencil, Trash2, Ban, Info, Loader2, Users, Check, CheckCheck, Lock, X, Copy, Download } from 'lucide-react'
import Lightbox from './Lightbox'
import MessageInfoModal from './MessageInfoModal'
import { decryptMessage, getCachedDecryptedMessage } from '../utils/crypto'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { getApiUrl } from '../config/api'

const bubbleVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 350, damping: 28 },
  },
}

function isValidHttpUrl(string) {
  try {
    const url = new URL(string)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch (_) {
    return false
  }
}

// ── Audio Duration Formatter ──────────────────────────────────────────────────
function formatTime(secs) {
  if (!secs || isNaN(secs) || !isFinite(secs) || secs < 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

function renderClickableText(text, isOwn) {
  if (!text) return null

  // URL extraction regex
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)

  return parts.map((part, i) => {
    if (isValidHttpUrl(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`underline break-all font-medium transition-opacity hover:opacity-80 ${
            isOwn ? 'text-white underline-offset-2' : 'text-indigo-400 hover:text-indigo-300 underline-offset-2'
          }`}
        >
          {part}
        </a>
      )
    }

    return <span key={i}>{part}</span>
  })
}

// ── Read Receipt Checkmarks ───────────────────────────────────────────────────
function ReadReceipt({ status, isGroup, readBy = [], deliveredTo = [], totalParticipants }) {
  if (status === 'sending') {
    return <Loader2 size={11} className="animate-spin text-zinc-500 select-none flex items-center" title="Mengirim..." />
  }

  if (isGroup) {
    const recipientCount = Math.max(1, (totalParticipants || 2) - 1)
    const readCount = Array.isArray(readBy) ? readBy.length : 0
    const deliveredCount = Array.isArray(deliveredTo) ? deliveredTo.length : 0

    if (readCount >= recipientCount || status === 'read') {
      return (
        <span className="text-indigo-400 select-none flex items-center" title="Dibaca oleh semua anggota">
          <CheckCheck size={13} strokeWidth={2.5} />
        </span>
      )
    }
    if (deliveredCount > 0 || readCount > 0 || status === 'delivered') {
      return (
        <span className="text-zinc-400 select-none flex items-center" title="Terkirim ke penerima">
          <CheckCheck size={13} strokeWidth={2.5} />
        </span>
      )
    }
    return (
      <span className="text-zinc-500 select-none flex items-center" title="Terkirim ke server">
        <Check size={13} strokeWidth={2.5} />
      </span>
    )
  }

  // 1-on-1 Chats
  if (status === 'read') {
    return (
      <span className="text-indigo-400 select-none flex items-center" title="Dibaca">
        <CheckCheck size={13} strokeWidth={2.5} />
      </span>
    )
  }
  if (status === 'delivered') {
    return (
      <span className="text-zinc-400 select-none flex items-center" title="Terkirim ke penerima">
        <CheckCheck size={13} strokeWidth={2.5} />
      </span>
    )
  }
  return (
    <span className="text-zinc-500 select-none flex items-center" title="Terkirim ke server">
      <Check size={13} strokeWidth={2.5} />
    </span>
  )
}

// ── Audio Player Component ───────────────────────────────────────────────────
function AudioPlayer({ audioUrl, isOwn, audioDuration }) {
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(audioDuration || 0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

  const togglePlay = (e) => {
    e.stopPropagation()
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      document.querySelectorAll('audio').forEach((el) => {
        if (el !== audio) el.pause()
      })
      audio.play().catch(() => {})
      setIsPlaying(true)
    }
  }

  const handlePlay = () => setIsPlaying(true)
  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current && (!duration || isNaN(duration))) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleSeek = (e) => {
    e.stopPropagation()
    const val = parseFloat(e.target.value)
    setCurrentTime(val)
    if (audioRef.current) {
      audioRef.current.currentTime = val
    }
  }

  const toggleSpeed = (e) => {
    e.stopPropagation()
    const speeds = [1, 1.5, 2]
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length
    const nextSpeed = speeds[nextIdx]
    setPlaybackSpeed(nextSpeed)
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed
    }
  }

  const effectiveDuration = duration || audioDuration || 0

  const progress = effectiveDuration > 0
    ? Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100))
    : 0

  const trackBg = isOwn
    ? `linear-gradient(to right, #ffffff ${progress}%, rgba(0, 0, 0, 0.35) ${progress}%)`
    : `linear-gradient(to right, #6366f1 ${progress}%, #3f3f46 ${progress}%)`

  return (
    <div className="flex items-center gap-2.5 py-1 px-1 min-w-[220px] sm:min-w-[270px]" onClick={e => e.stopPropagation()}>
      <audio
        ref={audioRef}
        src={audioUrl}
        onPlay={handlePlay}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 shadow-md cursor-pointer ${
          isOwn ? 'bg-white text-indigo-600 hover:bg-zinc-100' : 'bg-indigo-500 text-white hover:bg-indigo-600'
        }`}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>

      <div className="flex-1 flex flex-col justify-center min-w-0">
        <input
          type="range"
          min="0"
          max={effectiveDuration || 100}
          step="0.05"
          value={currentTime}
          onChange={handleSeek}
          style={{ background: trackBg }}
          className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${
            isOwn ? 'accent-white' : 'accent-indigo-400'
          }`}
        />
        <div className="flex justify-between items-center text-[10px] mt-1 font-mono opacity-80 select-none">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(effectiveDuration)}</span>
        </div>
      </div>

      {/* Voice speedup button */}
      <motion.button
        type="button"
        onClick={toggleSpeed}
        whileTap={{ scale: 0.9 }}
        className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md font-mono flex-shrink-0 transition-colors ${
          isOwn ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
        }`}
      >
        {playbackSpeed}x
      </motion.button>
    </div>
  )
}

// ── Blob-based Image Download Helper ──────────────────────────────────────────
export const downloadImage = async (imageUrl, fileName) => {
  try {
    const response = await fetch(imageUrl)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName || 'ping-attachment.jpg'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  } catch (err) {
    console.warn('Blob download fallback:', err)
    const a = document.createElement('a')
    a.href = imageUrl
    a.download = fileName || 'ping-attachment.jpg'
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
}

// ── Image Grid (1–4 images) ───────────────────────────────────────────────────
function ImageGrid({ urls, onOpenLightbox, isOwn, isEphemeral, isUploading }) {
  const count = urls.length

  if (count === 1) {
    return (
      <div
        className={`group relative overflow-hidden rounded-2xl cursor-pointer ${isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'} ${isEphemeral ? (isOwn ? 'border-2 border-dashed border-white/70 p-0.5' : 'border-2 border-dashed border-zinc-500 p-0.5') : ''}`}
        onClick={(e) => {
          e.stopPropagation()
          if (!isUploading) onOpenLightbox(urls[0])
        }}
      >
        <img
          src={urls[0]}
          alt="Shared image"
          className={`max-w-xs max-h-72 w-full object-cover transition-all duration-300 ${isUploading ? 'opacity-60 blur-[0.5px]' : 'hover:opacity-90'}`}
        />
        {!isUploading && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              downloadImage(urls[0], 'ping-image.jpg')
            }}
            className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all shadow-md cursor-pointer opacity-0 group-hover:opacity-100 flex items-center justify-center"
            title="Unduh Gambar"
          >
            <Download size={13} />
          </button>
        )}
        {isUploading && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center gap-1.5 text-white select-none">
            <Loader2 size={24} className="animate-spin text-indigo-400" />
            <span className="text-[11px] font-medium text-zinc-200">Mengirim...</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`relative grid gap-1 rounded-2xl overflow-hidden cursor-pointer ${
        count === 2 ? 'grid-cols-2' : 'grid-cols-2'
      } ${isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'} ${isEphemeral ? (isOwn ? 'border-2 border-dashed border-white/70 p-0.5' : 'border-2 border-dashed border-zinc-500 p-0.5') : ''}`}
      style={{ maxWidth: 280 }}
    >
      {urls.slice(0, 4).map((url, i) => (
        <div
          key={url + i}
          className={`group relative overflow-hidden ${
            count === 3 && i === 2 ? 'col-span-2' : ''
          }`}
          onClick={(e) => {
            e.stopPropagation()
            if (!isUploading) onOpenLightbox(url)
          }}
        >
          <img
            src={url}
            alt={`Attachment ${i + 1}`}
            className={`w-full h-32 object-cover transition-all duration-300 ${isUploading ? 'opacity-60 blur-[0.5px]' : 'hover:opacity-90'}`}
          />
          {!isUploading && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                downloadImage(url, `ping-image-${i + 1}.jpg`)
              }}
              className="absolute bottom-1.5 right-1.5 p-1 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all shadow-md cursor-pointer opacity-0 group-hover:opacity-100 flex items-center justify-center"
              title="Unduh Gambar"
            >
              <Download size={11} />
            </button>
          )}
        </div>
      ))}
      {isUploading && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center gap-1 text-white select-none">
          <Loader2 size={20} className="animate-spin text-indigo-400" />
          <span className="text-[10px] font-medium text-zinc-200">Mengirim...</span>
        </div>
      )}
    </div>
  )
}

// ── Delete Choice Modal (Delete for Me vs Delete for Everyone) ─────────────────
export function DeleteChoiceModal({ isOpen, onClose, isOwn, onDeleteForMe, onDeleteForEveryone }) {
  const { t } = useLanguage()
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-4 text-center z-[101]"
        >
          <div className="w-10 h-10 rounded-2xl bg-red-500/15 text-red-400 flex items-center justify-center mx-auto">
            <Trash2 size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100">{t('deletePrompt')}</h3>
            <p className="text-xs text-zinc-400 mt-1">{t('deletePromptDesc')}</p>
          </div>

          <div className="space-y-2 pt-1">
            {isOwn && (
              <button
                type="button"
                onClick={() => {
                  onDeleteForEveryone()
                  onClose()
                }}
                className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer"
              >
                {t('deleteForEveryone')}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onDeleteForMe()
                onClose()
              }}
              className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              {t('deleteForMe')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 px-4 text-zinc-400 hover:text-zinc-200 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              {t('cancel')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ── Reaction Bubbles ──────────────────────────────────────────────────────────
function ReactionBubbles({ reactions, onReact }) {
  if (!reactions || reactions.length === 0) return null

  const grouped = reactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1
    return acc
  }, {})

  return (
    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
      {Object.entries(grouped).map(([emoji, count]) => (
        <motion.button
          key={emoji}
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={(e) => {
            e.stopPropagation()
            onReact?.(emoji)
          }}
          className="flex items-center gap-1 bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700 rounded-full px-2 py-0.5 text-xs leading-none shadow-sm transition-colors cursor-pointer"
        >
          <span>{emoji}</span>
          {count > 1 && <span className="text-zinc-400 text-[10px] font-semibold">{count}</span>}
        </motion.button>
      ))}
    </div>
  )
}

// ── WhatsApp-Style Group Invite Card ──────────────────────────────────────────
function GroupInviteCard({ inviteData, text, isOwn, onJoinGroup, isPendingConversation, token }) {
  const [isJoining, setIsJoining] = useState(false)
  const [hasJoined, setHasJoined] = useState(false)
  const [isDeclined, setIsDeclined] = useState(false)

  const groupId = inviteData?.groupId?._id || inviteData?.groupId
  const groupName = inviteData?.groupName || 'Group'
  const groupAvatar = inviteData?.groupAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(groupName)}`

  const isLocked = !isOwn && !!isPendingConversation

  const handleJoin = async (e) => {
    e.stopPropagation()
    if (isLocked || isDeclined) return
    if (!groupId) return
    setIsJoining(true)
    try {
      const res = await fetch(getApiUrl(`/api/conversations/${groupId}/join`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json()
      if (res.ok) {
        setHasJoined(true)
        onJoinGroup?.(data)
      } else {
        console.error('Failed to join group:', data.message)
      }
    } catch (err) {
      console.error('Error joining group:', err)
    } finally {
      setIsJoining(false)
    }
  }

  const handleDecline = (e) => {
    e.stopPropagation()
    if (isLocked) return
    setIsDeclined(true)
  }

  return (
    <div
      onClick={!isDeclined && !isLocked ? handleJoin : undefined}
      className={`group-invite-card p-3.5 rounded-2xl border transition-all select-none ${
        isLocked
          ? 'cursor-not-allowed opacity-90'
          : isDeclined
          ? 'cursor-default opacity-85'
          : 'cursor-pointer'
      } ${
        isOwn
          ? 'bg-indigo-950/60 border-indigo-500/30 text-white shadow-lg shadow-indigo-950/40 hover:bg-indigo-950/80'
          : 'bg-zinc-900/90 border-zinc-700/60 text-zinc-100 shadow-xl hover:bg-zinc-850'
      } min-w-[250px] max-w-sm`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-shrink-0">
          <img
            src={groupAvatar}
            alt={groupName}
            className="w-12 h-12 rounded-2xl bg-zinc-800 object-cover ring-2 ring-indigo-500/40 shadow-md"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Undangan Grup</p>
          <p className="text-sm font-bold text-zinc-100 truncate">{groupName}</p>
          <p className="text-xs text-zinc-400 truncate">
            {inviteData?.groupMembersCount ? `${inviteData.groupMembersCount} anggota` : 'Grup Komunitas'}
          </p>
        </div>
      </div>

      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2">
        <span className="text-[11px] text-zinc-400">
          {hasJoined ? '✅ Anda telah bergabung' : isDeclined ? '❌ Undangan ditolak' : isLocked ? '⚠️ Konfirmasi chat dulu' : 'Ketuk untuk bergabung'}
        </span>

        <div className="flex items-center gap-1.5">
          {!hasJoined && !isDeclined && (
            <>
              {!isLocked && (
                <button
                  type="button"
                  onClick={handleDecline}
                  className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                >
                  Tolak
                </button>
              )}
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                disabled={isJoining || isLocked}
                onClick={handleJoin}
                className={`px-3 py-1 text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1 ${
                  isLocked
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                } disabled:opacity-50`}
              >
                {isJoining ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Bergabung...</span>
                  </>
                ) : isLocked ? (
                  <>
                    <Lock size={12} className="opacity-70" />
                    <span>Gabung Grup</span>
                  </>
                ) : (
                  <>
                    <Users size={13} />
                    <span>Gabung Grup</span>
                  </>
                )}
              </motion.button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main MessageBubble ────────────────────────────────────────────────────────
export default function MessageBubble({
  message,
  onReact,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onJoinGroup,
  conversationId,
  isGroup,
  isPendingConversation = false,
  totalParticipants,
  _isSearchResult = false,
  isCurrentMatch = false,
  customTheme = null,
  isSelected = false,
  onSelectMessage,
}) {
  const { token } = useAuth()
  const {
    _id,
    text,
    messageType,
    inviteData,
    timestamp,
    isOwn,
    imageUrl,
    imageUrls,
    audioUrl,
    audioDuration,
    replyTo,
    reactions,
    status,
    isUploading,
    readBy,
    deliveredTo,
    isEphemeral,
    expiresAt,
    isEdited,
    isDeleted,
    isPinned,
    isSystem,
    systemText,
  } = message

  const [showMessageInfo, setShowMessageInfo]   = useState(false)
  const [lightboxSrc, setLightboxSrc]           = useState(null)
  const [decryptedText, setDecryptedText]       = useState(() => {
    if (message.plainText) return message.plainText
    if (isSystem) return systemText || text || ''
    const cached = getCachedDecryptedMessage(text, conversationId)
    return cached !== null ? cached : (text?.startsWith('enc:v1:') ? '' : text || '')
  })
  const [decryptedReplyText, setDecryptedReplyText] = useState(() => {
    if (replyTo?.plainText) return replyTo.plainText
    const cached = getCachedDecryptedMessage(replyTo?.text, conversationId)
    return cached !== null ? cached : (replyTo?.text?.startsWith('enc:v1:') ? '' : replyTo?.text || '')
  })
  const [isFlashing, setIsFlashing]             = useState(false)
  const [dragX, setDragX]                       = useState(0)

  const timerRef = useRef(null)
  const isLongPressRef = useRef(false)

  const handleReplyAction = () => {
    if (isDeleted) return
    onReply?.({
      _id,
      text: decryptedText,
      plainText: decryptedText,
      sender: message.sender,
      imageUrl,
      imageUrls,
      audioUrl,
    })
  }

  // Trigger temporary background line flash when focused from search
  useEffect(() => {
    if (isCurrentMatch) {
      setIsFlashing(true)
      const timer = setTimeout(() => {
        setIsFlashing(false)
      }, 1500)
      return () => clearTimeout(timer)
    } else {
      setIsFlashing(false)
    }
  }, [isCurrentMatch])

  // Merge legacy imageUrl into imageUrls for display
  const allImages = (() => {
    const urls = imageUrls?.length ? imageUrls : imageUrl ? [imageUrl] : []
    return urls
  })()

  // Decrypt ciphertext on load or update
  useEffect(() => {
    let isMounted = true
    if (message.plainText) {
      setDecryptedText(message.plainText)
      return
    }
    if (isSystem) {
      setDecryptedText(systemText || text || '')
      return
    }
    if (!text) {
      setDecryptedText('')
      return
    }
    if (!text.startsWith('enc:v1:')) {
      setDecryptedText(text)
      return
    }

    const cached = getCachedDecryptedMessage(text, conversationId)
    if (cached !== null) {
      setDecryptedText(cached)
      return
    }

    decryptMessage(text, conversationId)
      .then((decrypted) => {
        if (isMounted) setDecryptedText(decrypted)
      })
      .catch((err) => {
        console.warn('Decryption error in MessageBubble:', err)
        if (isMounted) setDecryptedText(text)
      })

    return () => {
      isMounted = false
    }
  }, [text, conversationId, message.plainText, isSystem, systemText])

  useEffect(() => {
    let isMounted = true
    if (replyTo?.plainText) {
      setDecryptedReplyText(replyTo.plainText)
      return
    }
    if (!replyTo?.text) {
      setDecryptedReplyText('')
      return
    }
    if (!replyTo.text.startsWith('enc:v1:')) {
      setDecryptedReplyText(replyTo.text)
      return
    }
    const cached = getCachedDecryptedMessage(replyTo.text, conversationId)
    if (cached !== null) {
      setDecryptedReplyText(cached)
      return
    }
    decryptMessage(replyTo.text, conversationId)
      .then((decrypted) => {
        if (isMounted) setDecryptedReplyText(decrypted)
      })
      .catch((err) => {
        console.warn('Reply decryption error in MessageBubble:', err)
        if (isMounted) setDecryptedReplyText(replyTo.text)
      })
    return () => {
      isMounted = false
    }
  }, [replyTo?.text, conversationId, replyTo?.plainText])

  const handleTouchStart = () => {
    isLongPressRef.current = false
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true
      onSelectMessage?.({
        ...message,
        plainText: decryptedText,
      })
    }, 450)
  }

  const handleTouchEnd = () => {
    clearTimeout(timerRef.current)
  }

  const handleTouchMove = () => {
    clearTimeout(timerRef.current)
  }

  const handleContextMenu = (e) => {
    e.preventDefault()
    e.stopPropagation()
    onSelectMessage?.({
      ...message,
      plainText: decryptedText,
    })
  }

  // System message banner rendering
  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="px-3.5 py-1 bg-zinc-800/80 border border-zinc-700/60 rounded-full text-zinc-300 text-xs font-medium max-w-sm text-center shadow-sm">
          {decryptedText || systemText || text}
        </div>
      </div>
    )
  }

  return (
    <>
      {lightboxSrc && (
        <Lightbox
          src={lightboxSrc}
          onClose={() => setLightboxSrc(null)}
        />
      )}

      {showMessageInfo && (
        <MessageInfoModal
          message={message}
          decryptedText={decryptedText}
          isGroup={isGroup}
          totalParticipants={totalParticipants}
          onClose={() => setShowMessageInfo(false)}
        />
      )}

      <motion.div
        id={`msg-${_id}`}
        layout
        variants={bubbleVariants}
        initial="hidden"
        animate="visible"
        onClick={() => {
          onSelectMessage?.({
            ...message,
            plainText: decryptedText,
          })
        }}
        className={`relative flex w-full ${isOwn ? 'justify-end' : 'justify-start'} py-1 px-2 rounded-xl transition-colors duration-200 cursor-pointer ${
          isSelected
            ? 'bg-indigo-950/40 border-l-2 border-indigo-500'
            : isFlashing
            ? 'bg-indigo-500/20'
            : 'hover:bg-zinc-800/20'
        }`}
      >
        {/* Swipe-to-reply icon behind bubble */}
        {!isDeleted && (
          <div
            style={{
              opacity: dragX > 10 ? Math.min(1, (dragX - 10) / 35) : 0,
              transform: `translateY(-50%) scale(${dragX > 10 ? Math.min(1.15, 0.7 + dragX / 70) : 0.7})`,
            }}
            className={`absolute ${isOwn ? 'right-auto left-4' : 'left-2'} top-1/2 flex items-center justify-center w-7 h-7 rounded-full bg-indigo-500/25 text-indigo-300 pointer-events-none z-0 transition-opacity`}
          >
            <Reply size={14} />
          </div>
        )}

        <motion.div
          drag={!isDeleted ? 'x' : false}
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: 0.04, right: 0.35 }}
          onDrag={(e, info) => {
            if (info.offset.x > 0) {
              setDragX(info.offset.x)
            } else {
              setDragX(0)
            }
          }}
          onDragEnd={(e, info) => {
            setDragX(0)
            if (info.offset.x > 45 && !isDeleted) {
              handleReplyAction()
              if (navigator.vibrate) {
                try { navigator.vibrate(25) } catch {}
              }
            }
          }}
          className={`relative flex flex-col max-w-[75%] sm:max-w-[70%] gap-1 select-none touch-manipulation z-10 ${
            isOwn ? 'items-end' : 'items-start'
          }`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          onContextMenu={handleContextMenu}
        >
          {/* Group Chat Sender Info */}
          {isGroup && !isOwn && !isDeleted && message.sender && (
            <div className="flex items-center gap-1.5 mb-0.5 ml-1">
              <img
                src={message.sender.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'}
                alt={message.sender.username || 'User'}
                className="w-4 h-4 rounded-full bg-zinc-700 object-cover"
              />
              <span className="text-[11px] font-semibold text-indigo-300">
                {message.sender.displayName || message.sender.username || 'User'}
              </span>
            </div>
          )}

          {/* Deleted Message Tombstone UI */}
          {isDeleted ? (
            <div
              className={`
                px-3.5 py-2 text-xs italic rounded-2xl flex items-center gap-2 border select-none
                ${isOwn
                  ? 'bg-indigo-950/40 border-indigo-500/20 text-indigo-200/70 rounded-br-sm'
                  : 'bg-zinc-800/50 border-zinc-700/40 text-zinc-400 rounded-bl-sm'}
              `}
            >
              <Ban size={13} className="opacity-70 flex-shrink-0" />
              <span>This message was deleted</span>
            </div>
          ) : (
            <>
              {/* Quoted Message (Reply Preview Box) */}
              {replyTo && (
                <div
                  className={`
                    mb-0.5 px-3 py-1.5 rounded-xl text-xs max-w-full overflow-hidden border-l-2 select-text
                    ${isOwn
                      ? 'bg-indigo-600/40 border-indigo-300 text-indigo-100'
                      : 'bg-zinc-800/80 border-indigo-400 text-zinc-300'
                    }
                  `}
                >
                  <p className="font-semibold text-[11px] text-indigo-300 truncate">
                    {replyTo.sender?.username || 'User'}
                  </p>
                  <p className="truncate text-[11px] opacity-80">
                    {replyTo.audioUrl ? '🎵 Voice Note' : replyTo.imageUrls?.length || replyTo.imageUrl ? '📷 Photo' : (decryptedReplyText || 'Message')}
                  </p>
                </div>
              )}

              {/* Image grid */}
              {allImages.length > 0 && (
                <ImageGrid
                  urls={allImages}
                  isOwn={isOwn}
                  isEphemeral={isEphemeral}
                  isUploading={isUploading || status === 'sending'}
                  onOpenLightbox={(src) => setLightboxSrc(src)}
                />
              )}

              {/* Audio player */}
              {audioUrl && (
                <div
                  style={isOwn && customTheme?.bubbleColor ? { backgroundColor: customTheme.bubbleColor } : {}}
                  className={`
                    p-2 rounded-2xl
                    ${isOwn
                      ? `${!customTheme?.bubbleColor ? 'bg-indigo-500/90' : ''} text-white rounded-br-sm shadow-md`
                      : 'bg-zinc-800 text-zinc-100 rounded-bl-sm border border-zinc-700/50 shadow-md'}
                    ${isEphemeral ? (isOwn ? 'border-2 border-dashed border-white/70' : 'border-2 border-dashed border-zinc-500') : ''}
                  `}
                >
                  <AudioPlayer audioUrl={audioUrl} isOwn={isOwn} audioDuration={audioDuration} />
                </div>
              )}

              {/* Group Invite Card or Text bubble */}
              {messageType === 'group_invite' || inviteData?.groupId ? (
                <GroupInviteCard
                  inviteData={inviteData}
                  text={decryptedText || text}
                  isOwn={isOwn}
                  onJoinGroup={onJoinGroup}
                  isPendingConversation={isPendingConversation}
                  token={token}
                />
              ) : (
                decryptedText && (
                  <div
                    style={isOwn && customTheme?.bubbleColor ? { backgroundColor: customTheme.bubbleColor } : {}}
                    className={`
                      px-4 py-2.5 text-sm leading-relaxed break-words select-text
                      ${isOwn
                        ? `${!customTheme?.bubbleColor ? 'bg-indigo-500/90' : ''} text-white rounded-2xl rounded-br-sm shadow-sm`
                        : 'bg-zinc-800 text-zinc-100 rounded-2xl rounded-bl-sm'}
                      ${isEphemeral ? (isOwn ? 'border-2 border-dashed border-white/70 shadow-sm' : 'border-2 border-dashed border-zinc-500 shadow-sm') : ''}
                    `}
                  >
                    {renderClickableText(decryptedText, isOwn)}
                  </div>
                )
              )}

              {/* Reaction bubbles */}
              <ReactionBubbles
                reactions={reactions}
                onReact={(emoji) => onReact?.(_id, emoji)}
              />
            </>
          )}

          {/* Timestamp + Read receipt + Pinned / Edited badges */}
          <div className="flex items-center gap-1 px-1 mt-0.5">
            {isPinned && !isDeleted && (
              <Pin size={10} className="text-indigo-400 rotate-45" title="Pinned message" />
            )}
            {isEphemeral && <Timer size={10} className="text-zinc-500" title="Vanish Mode Message" />}
            <span className="text-xs text-zinc-500">
              {timestamp} {isEphemeral && expiresAt && `• Expires at ${expiresAt}`}
            </span>
            {isEdited && !isDeleted && (
              <span className="text-[10px] text-zinc-500 italic">(edited)</span>
            )}
            {isOwn && !isDeleted && (
              <ReadReceipt
                status={status}
                isGroup={isGroup}
                readBy={readBy}
                deliveredTo={deliveredTo}
                totalParticipants={totalParticipants}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </>
  )
}
