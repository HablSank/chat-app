import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import { Timer, Play, Pause, Reply, Pin, PinOff, Pencil, Trash2, Ban, Info, Loader2, Users, Check, CheckCheck, Lock, X, Copy, Download } from 'lucide-react'
import Lightbox from './Lightbox'
import MessageInfoModal from './MessageInfoModal'
import { decryptMessage, getCachedDecryptedMessage } from '../utils/crypto'
import { useAuth } from '../context/AuthContext'
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

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😭', '🔥']

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

    // Markdown basic bold/italic inline parsing
    let content = part
    return <span key={i}>{content}</span>
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

    // Double blue checks when all other members have read the message
    if (readCount >= recipientCount || status === 'read') {
      return (
        <span className="text-indigo-400 select-none flex items-center" title="Dibaca oleh semua anggota">
          <CheckCheck size={13} strokeWidth={2.5} />
        </span>
      )
    }
    // Double grey checks when delivered
    if (deliveredCount > 0 || readCount > 0 || status === 'delivered') {
      return (
        <span className="text-zinc-400 select-none flex items-center" title="Terkirim ke penerima">
          <CheckCheck size={13} strokeWidth={2.5} />
        </span>
      )
    }
    // Single grey check for sent
    return (
      <span className="text-zinc-500 select-none flex items-center" title="Terkirim ke server">
        <Check size={12} strokeWidth={2.5} />
      </span>
    )
  }

  if (status === 'read') {
    return (
      <span className="text-indigo-400 select-none flex items-center" title="Dibaca">
        <CheckCheck size={13} strokeWidth={2.5} />
      </span>
    )
  }
  if (status === 'delivered') {
    return (
      <span className="text-zinc-400 select-none flex items-center" title="Terkirim">
        <CheckCheck size={13} strokeWidth={2.5} />
      </span>
    )
  }
  return (
    <span className="text-zinc-500 select-none flex items-center" title="Terkirim ke server">
      <Check size={12} strokeWidth={2.5} />
    </span>
  )
}

// ── Audio Player Component ─────────────────────────────────────────────────────
function AudioPlayer({ audioUrl, isOwn, audioDuration }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

  const initialDuration = (isFinite(audioDuration) && !isNaN(audioDuration) && audioDuration > 0)
    ? Number(audioDuration)
    : 0
  const [duration, setDuration] = useState(initialDuration)
  const audioRef = useRef(null)

  const togglePlay = (e) => {
    e.stopPropagation()
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(err => console.error('Audio play failed:', err))
    }
  }

  const toggleSpeed = (e) => {
    e.stopPropagation()
    const nextSpeed = playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1
    setPlaybackSpeed(nextSpeed)
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed
    }
  }

  const handlePlay = () => {
    setIsPlaying(true)
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const d = audioRef.current.duration
      if (isFinite(d) && !isNaN(d) && d > 0) {
        setDuration(d)
      } else if (initialDuration > 0) {
        setDuration(initialDuration)
      }
      audioRef.current.playbackRate = playbackSpeed
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const effectiveDuration = (isFinite(duration) && duration > 0)
    ? duration
    : (isFinite(initialDuration) && initialDuration > 0 ? initialDuration : 0)

  const handleSeek = (e) => {
    e.stopPropagation()
    const newTime = parseFloat(e.target.value)
    if (audioRef.current && isFinite(newTime)) {
      audioRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }

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

      {/* Voice speedup button (1x / 1.5x / 2x) */}
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
const downloadImage = async (imageUrl, fileName) => {
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
function ImageGrid({
  urls,
  onOpenLightbox,
  isOwn,
  isEphemeral,
  isUploading,
  timestamp,
  status,
  isGroup,
  readBy,
  deliveredTo,
  totalParticipants,
  isSelectionActive,
  onSelectMessage,
  message,
}) {
  const count = urls.length

  const handleImageClick = (e, url) => {
    e.stopPropagation()
    if (isSelectionActive) {
      onSelectMessage?.(message)
      return
    }
    if (!isUploading) onOpenLightbox(url)
  }

  if (count === 1) {
    return (
      <div
        className={`group relative overflow-hidden rounded-2xl cursor-pointer ${isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'} ${isEphemeral ? (isOwn ? 'border-2 border-dashed border-white/70 p-0.5' : 'border-2 border-dashed border-zinc-500 p-0.5') : ''}`}
        onClick={(e) => handleImageClick(e, urls[0])}
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
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all shadow-md cursor-pointer opacity-0 group-hover:opacity-100 flex items-center justify-center"
            title="Unduh Gambar"
          >
            <Download size={13} />
          </button>
        )}

        {/* WhatsApp-style dark overlay pill for media timestamp & ticks */}
        {!isUploading && timestamp && (
          <div className="absolute bottom-1.5 right-1.5 bg-black/50 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm select-none pointer-events-none">
            <span>{timestamp}</span>
            {isOwn && (
              <ReadReceipt
                status={status}
                isGroup={isGroup}
                readBy={readBy}
                deliveredTo={deliveredTo}
                totalParticipants={totalParticipants}
              />
            )}
          </div>
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

  // 2 images → side by side, 3+ → 2-column grid (last item spans if odd)
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
          onClick={(e) => handleImageClick(e, url)}
        >
          <img
            src={url}
            alt={`Image ${i + 1}`}
            className={`w-full h-36 object-cover transition-all duration-300 ${isUploading ? 'opacity-60' : 'hover:opacity-90'}`}
          />
          {!isUploading && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                downloadImage(url, `ping-image-${i + 1}.jpg`)
              }}
              className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all shadow-md cursor-pointer opacity-0 group-hover:opacity-100 flex items-center justify-center"
              title="Unduh Gambar"
            >
              <Download size={12} />
            </button>
          )}

          {/* WhatsApp-style dark overlay pill on the last visible image */}
          {!isUploading && timestamp && (i === Math.min(count - 1, 3)) && (
            <div className="absolute bottom-1.5 right-1.5 bg-black/50 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm select-none pointer-events-none">
              <span>{timestamp}</span>
              {isOwn && (
                <ReadReceipt
                  status={status}
                  isGroup={isGroup}
                  readBy={readBy}
                  deliveredTo={deliveredTo}
                  totalParticipants={totalParticipants}
                />
              )}
            </div>
          )}

          {/* "+N more" overlay on the 4th tile */}
          {i === 3 && urls.length > 4 && !isUploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white font-bold text-xl">+{urls.length - 4}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Emoji Reaction & Action Picker ─────────────────────────────────────────────
function ActionPicker({
  onReact,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onInfo,
  onCopy,
  hasText,
  isOwn,
  isPinned,
  isDeleted,
  canEdit,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: 4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      onClick={(e) => e.stopPropagation()}
      className={`absolute ${isOwn ? 'right-0' : 'left-0'} -top-11 z-30
        flex items-center gap-1 bg-zinc-800/95 border border-zinc-700/90 backdrop-blur-md rounded-full px-2 py-1 shadow-2xl`}
    >
      {!isDeleted && QUICK_EMOJIS.map((emoji) => (
        <motion.button
          key={emoji}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onReact(emoji)
          }}
          whileHover={{ scale: 1.3 }}
          whileTap={{ scale: 0.9 }}
          className="text-lg leading-none p-1 rounded-full hover:bg-zinc-700/60 transition-colors cursor-pointer"
        >
          {emoji}
        </motion.button>
      ))}

      {!isDeleted && <div className="w-[1px] h-4 bg-zinc-700 mx-0.5" />}

      {/* Reply Action button */}
      {!isDeleted && (
        <motion.button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onReply()
          }}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          className="text-zinc-400 hover:text-indigo-300 p-1.5 rounded-full hover:bg-zinc-700/60 transition-colors cursor-pointer"
          title="Reply"
        >
          <Reply size={15} />
        </motion.button>
      )}

      {/* Copy Text button */}
      {!isDeleted && hasText && (
        <motion.button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onCopy?.()
          }}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          className="text-zinc-400 hover:text-indigo-300 p-1.5 rounded-full hover:bg-zinc-700/60 transition-colors cursor-pointer"
          title="Salin Teks"
        >
          <Copy size={14} />
        </motion.button>
      )}

      {/* Pin / Unpin button */}
      {!isDeleted && (
        <motion.button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onPin()
          }}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          className={`p-1.5 rounded-full hover:bg-zinc-700/60 transition-colors cursor-pointer ${
            isPinned ? 'text-indigo-400 hover:text-indigo-300' : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title={isPinned ? 'Unpin message' : 'Pin message'}
        >
          {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
        </motion.button>
      )}

      {/* Message Info button (for own messages) */}
      {isOwn && !isDeleted && (
        <motion.button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onInfo?.()
          }}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          className="text-zinc-400 hover:text-indigo-300 p-1.5 rounded-full hover:bg-zinc-700/60 transition-colors cursor-pointer"
          title="Message info"
        >
          <Info size={14} />
        </motion.button>
      )}

      {/* Edit button (for sender only and if text exists) */}
      {isOwn && canEdit && !isDeleted && (
        <motion.button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          className="text-zinc-400 hover:text-amber-300 p-1.5 rounded-full hover:bg-zinc-700/60 transition-colors cursor-pointer"
          title="Edit message"
        >
          <Pencil size={14} />
        </motion.button>
      )}

      {/* Delete for everyone button (for sender only) */}
      {isOwn && !isDeleted && (
        <motion.button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          className="text-zinc-400 hover:text-red-400 p-1.5 rounded-full hover:bg-red-500/10 transition-colors cursor-pointer"
          title="Delete for everyone"
        >
          <Trash2 size={14} />
        </motion.button>
      )}
    </motion.div>
  )
}

// ── Reaction Bubbles ──────────────────────────────────────────────────────────
function ReactionBubbles({ reactions, onReact }) {
  if (!reactions || reactions.length === 0) return null

  // Group by emoji
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
function GroupInviteCard({ messageId, inviteData, text, isOwn, onJoinGroup, isPendingConversation, token }) {
  const { t } = useLanguage()
  const [isJoining, setIsJoining] = useState(false)
  const initialStatus = inviteData?.inviteStatus || 'pending'
  const [inviteStatus, setInviteStatus] = useState(initialStatus)

  // Sync state if inviteData changes
  useEffect(() => {
    if (inviteData?.inviteStatus) {
      setInviteStatus(inviteData.inviteStatus)
    }
  }, [inviteData?.inviteStatus])

  const groupId = inviteData?.groupId?._id || inviteData?.groupId
  const groupName = inviteData?.groupName || 'Group'
  const groupAvatar = inviteData?.groupAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(groupName)}`

  // Phase 15.21: Lock [Gabung Grup] button for recipient when 1-on-1 conversation is pending message request
  const isLocked = !isOwn && !!isPendingConversation
  const isDeclined = inviteStatus === 'declined'
  const hasJoined = inviteStatus === 'accepted'

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
        setInviteStatus('accepted')
        onJoinGroup?.(data)

        // Persist accepted status to message in DB
        if (messageId) {
          fetch(getApiUrl(`/api/messages/${messageId}/invite-status`), {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ inviteStatus: 'accepted' }),
          }).catch((err) => console.error('Failed to persist accepted invite status:', err))
        }
      } else {
        console.error('Failed to join group:', data.message)
      }
    } catch (err) {
      console.error('Error joining group:', err)
    } finally {
      setIsJoining(false)
    }
  }

  const handleDecline = async (e) => {
    e.stopPropagation()
    if (isLocked) return
    setInviteStatus('declined')

    // Persist declined status to message in DB
    if (messageId) {
      try {
        await fetch(getApiUrl(`/api/messages/${messageId}/invite-status`), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ inviteStatus: 'declined' }),
        })
      } catch (err) {
        console.error('Failed to persist declined invite status:', err)
      }
    }
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
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-indigo-600 border-2 border-zinc-900 flex items-center justify-center text-white text-[10px]">
            <Users size={10} />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/15 px-1.5 py-0.5 rounded-md border border-indigo-500/20">
              {t('groupInviteBadge')}
            </span>
          </div>
          <h4 className="text-sm font-bold text-zinc-100 truncate">{groupName}</h4>
          <p className="text-[11px] text-zinc-400 truncate">
            {text || t('groupInviteDefaultDesc')}
          </p>
        </div>
      </div>

      <div className="pt-2.5 border-t border-zinc-800/80 flex items-center justify-between gap-2">
        <div className="text-[11px] font-medium min-w-0 truncate">
          {isOwn ? (
            <span className="text-zinc-400">{t('groupInviteSent')}</span>
          ) : isDeclined ? (
            <span className="text-rose-400">{t('groupInviteDeclined')}</span>
          ) : isLocked ? (
            <span className="text-amber-400/90">{t('groupInviteAcceptRequired')}</span>
          ) : hasJoined ? (
            <span className="text-emerald-400">{t('groupInviteJoined')}</span>
          ) : (
            <span className="text-zinc-400">{t('groupInviteTapToJoin')}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isOwn ? (
            <motion.button
              type="button"
              onClick={handleJoin}
              disabled={isJoining}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-500/30 cursor-pointer disabled:opacity-50"
            >
              {isJoining ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Memuat...</span>
                </>
              ) : (
                <>
                  <Users size={13} />
                  <span>{t('groupInviteJoin')}</span>
                </>
              )}
            </motion.button>
          ) : isDeclined ? (
            <span className="px-2.5 py-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg">
              {t('groupInviteDeclinedTag')}
            </span>
          ) : hasJoined ? (
            <motion.button
              type="button"
              onClick={handleJoin}
              disabled={isJoining}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
            >
              <Check size={13} />
              <span>{t('groupInviteOpen')}</span>
            </motion.button>
          ) : (
            <>
              <motion.button
                type="button"
                onClick={handleDecline}
                disabled={isJoining || isLocked}
                whileHover={!isLocked ? { scale: 1.03 } : {}}
                whileTap={!isLocked ? { scale: 0.97 } : {}}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                  isLocked
                    ? 'bg-zinc-800/60 text-zinc-500 cursor-not-allowed opacity-50 border border-zinc-700/30'
                    : 'bg-zinc-800 hover:bg-rose-500/20 text-zinc-300 hover:text-rose-300 border border-zinc-700/60 cursor-pointer'
                } disabled:opacity-50`}
                title={t('groupInviteDecline')}
              >
                <X size={12} />
                <span>{t('groupInviteDecline')}</span>
              </motion.button>

              <motion.button
                type="button"
                onClick={handleJoin}
                disabled={isJoining || isLocked}
                whileHover={!isLocked ? { scale: 1.03 } : {}}
                whileTap={!isLocked ? { scale: 0.97 } : {}}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md ${
                  isLocked
                    ? 'bg-zinc-700/60 text-zinc-400 cursor-not-allowed opacity-75 border border-zinc-600/30 shadow-none'
                    : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/30 cursor-pointer'
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
  // Phase 15.42 & 15.44: WhatsApp Selection Mode & Quick Reactions
  onSelectMessage,
  isSelected = false,
  isSelectionActive = false,
  isSingleSelected = false,
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
  const [showCopiedToast, setShowCopiedToast]   = useState(false)

  const timerRef = useRef(null)
  const isLongPressRef = useRef(false)

  const handleReplyAction = () => {
    if (isDeleted) return
    onReply?.({
      _id,
      text: decryptedText,
      sender: message.sender,
      imageUrl,
      imageUrls,
      audioUrl,
    })
  }

  const handleCopyText = async () => {
    const textToCopy = decryptedText || message.plainText || message.text || ''
    if (!textToCopy) return
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = textToCopy
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setShowCopiedToast(true)
      setTimeout(() => setShowCopiedToast(false), 2000)
    } catch (err) {
      console.error('Failed to copy text', err)
    }
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
    if (text && !isSystem) {
      decryptMessage(text, conversationId).then((res) => {
        if (isMounted) setDecryptedText(res)
      })
    } else {
      setDecryptedText(isSystem ? (systemText || text || '') : '')
    }
    return () => { isMounted = false }
  }, [text, message.plainText, conversationId, isSystem, systemText])

  // Decrypt replyTo text if present
  useEffect(() => {
    let isMounted = true
    if (replyTo?.plainText) {
      setDecryptedReplyText(replyTo.plainText)
      return
    }
    if (replyTo?.text) {
      decryptMessage(replyTo.text, conversationId).then((res) => {
        if (isMounted) setDecryptedReplyText(res)
      })
    } else {
      setDecryptedReplyText('')
    }
    return () => { isMounted = false }
  }, [replyTo?.text, replyTo?.plainText, conversationId])

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const touchStartPosRef = useRef({ x: 0, y: 0 })

  // ── Long-press / Selection for WhatsApp-Style Top Header Bar (~350ms with scroll cancel) ──
  const handleTouchStart = (e) => {
    isLongPressRef.current = false
    if (e.touches && e.touches[0]) {
      touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true
      onSelectMessage?.(message)
      if (navigator.vibrate) {
        try { navigator.vibrate(30) } catch {}
      }
    }, 350)
  }

  const handleTouchEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const handleTouchMove = (e) => {
    if (timerRef.current && e.touches && e.touches[0]) {
      const diffX = Math.abs(e.touches[0].clientX - touchStartPosRef.current.x)
      const diffY = Math.abs(e.touches[0].clientY - touchStartPosRef.current.y)
      if (diffX > 10 || diffY > 10) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }

  const handleContextMenu = (e) => {
    e.preventDefault()
    if (!isDeleted) {
      onSelectMessage?.(message)
    }
  }

  const canEdit = !isDeleted && !!decryptedText && !audioUrl && allImages.length === 0

  if (isSystem) {
    return (
      <motion.div
        id={`msg-${_id}`}
        layout
        variants={bubbleVariants}
        initial="hidden"
        animate="visible"
        className={`relative flex w-full justify-center my-2 select-none py-1 transition-colors duration-700 ${
          isFlashing ? 'bg-indigo-500/20 rounded-xl' : 'bg-transparent'
        }`}
      >
        <div className="bg-zinc-800/80 border border-zinc-700/60 backdrop-blur-md text-zinc-300 text-xs font-medium px-4 py-1.5 rounded-full shadow-sm max-w-[85%] text-center">
          {systemText || text}
        </div>
      </motion.div>
    )
  }

  const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

  const handleContainerClick = (e) => {
    if (isSelectionActive) {
      e.stopPropagation()
      onSelectMessage?.(message)
    }
  }

  return (
    <>
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      <MessageInfoModal
        isOpen={showMessageInfo}
        onClose={() => setShowMessageInfo(false)}
        message={message}
        conversationId={conversationId}
      />

      <motion.div
        id={`msg-${_id}`}
        layout
        variants={bubbleVariants}
        initial="hidden"
        animate="visible"
        onClick={handleContainerClick}
        className={`relative flex w-full ${isOwn ? 'justify-end' : 'justify-start'} py-0.5 transition-colors duration-200 ${
          isSelected ? 'bg-indigo-600/15 rounded-xl' : isFlashing ? 'bg-indigo-500/20 rounded-xl' : 'bg-transparent'
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
          drag={!isDeleted && !isSelectionActive ? 'x' : false}
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
          {/* Contextual Quick Reactions Bar when EXACTLY 1 message is selected */}
          <AnimatePresence>
            {isSelected && isSingleSelected && !isDeleted && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                className={`absolute -top-10 ${isOwn ? 'right-0' : 'left-0'} z-30 flex items-center gap-1 bg-zinc-900/95 border border-zinc-700/80 px-2 py-1 rounded-full shadow-2xl backdrop-blur-md`}
                onClick={(e) => e.stopPropagation()}
              >
                {QUICK_EMOJIS.map((emoji) => (
                  <motion.button
                    key={emoji}
                    type="button"
                    whileHover={{ scale: 1.25 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      onReact?.(_id, emoji)
                      onSelectMessage?.(message) // dismiss selection after reacting
                    }}
                    className="w-7 h-7 flex items-center justify-center text-sm rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    {emoji}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
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

          {/* Copied Feedback Toast */}
          <AnimatePresence>
            {showCopiedToast && (
              <motion.div
                initial={{ opacity: 0, y: 5, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.9 }}
                className="absolute -top-8 left-1/2 -translate-x-1/2 z-40 bg-zinc-800/95 border border-zinc-700 text-zinc-100 text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-lg pointer-events-none whitespace-nowrap"
              >
                📋 Teks disalin
              </motion.div>
            )}
          </AnimatePresence>

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
                  timestamp={timestamp}
                  status={status}
                  isGroup={isGroup}
                  readBy={readBy}
                  deliveredTo={deliveredTo}
                  totalParticipants={totalParticipants}
                  isSelectionActive={isSelectionActive}
                  onSelectMessage={onSelectMessage}
                  message={message}
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
                  <div className="flex items-center justify-end gap-1 px-1 mt-1 text-[10px] opacity-75">
                    <span>{timestamp}</span>
                    {isOwn && (
                      <ReadReceipt
                        status={status}
                        isGroup={isGroup}
                        readBy={readBy}
                        deliveredTo={deliveredTo}
                        totalParticipants={totalParticipants}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Group Invite Card or Text bubble */}
              {messageType === 'group_invite' || inviteData?.groupId ? (
                <GroupInviteCard
                  messageId={_id}
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
                      px-3.5 py-2 text-sm leading-relaxed break-words select-text relative
                      ${isOwn
                        ? `${!customTheme?.bubbleColor ? 'bg-indigo-500/90' : ''} text-white rounded-2xl rounded-br-sm shadow-sm`
                        : 'bg-zinc-800 text-zinc-100 rounded-2xl rounded-bl-sm'}
                      ${isEphemeral ? (isOwn ? 'border-2 border-dashed border-white/70 shadow-sm' : 'border-2 border-dashed border-zinc-500 shadow-sm') : ''}
                    `}
                  >
                    <span>{renderClickableText(decryptedText, isOwn)}</span>
                    {/* Embedded WhatsApp-style bottom-right timestamp & ticks */}
                    <span className="inline-flex items-center gap-1 float-end pl-2 pt-1 mt-0.5 select-none text-[10px] opacity-75 align-bottom">
                      {isPinned && !isDeleted && (
                        <Pin size={9} className="text-indigo-300 rotate-45" title="Pinned" />
                      )}
                      {isEphemeral && <Timer size={9} className="text-zinc-300" title="Vanish Mode" />}
                      <span>{timestamp}</span>
                      {isEdited && !isDeleted && (
                        <span className="italic text-[9px]">(edited)</span>
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
                    </span>
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
        </motion.div>
      </motion.div>
    </>
  )
}
