import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import { Timer, Play, Pause, Reply, Pin, PinOff, Pencil, Trash2, Ban, Info, Loader2 } from 'lucide-react'
import Lightbox from './Lightbox'
import MessageInfoModal from './MessageInfoModal'
import { decryptMessage } from '../utils/crypto'

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

// ── Read Receipt Checkmarks ───────────────────────────────────────────────────
function ReadReceipt({ status, isGroup, readBy = [], deliveredTo = [], totalParticipants }) {
  if (status === 'sending') {
    return <Loader2 size={10} className="animate-spin text-zinc-400 select-none flex items-center" title="Mengirim..." />
  }

  if (isGroup) {
    const recipientCount = Math.max(1, (totalParticipants || 2) - 1)
    const readCount = Array.isArray(readBy) ? readBy.length : 0
    const deliveredCount = Array.isArray(deliveredTo) ? deliveredTo.length : 0

    // Double blue checks when all other members have read the message
    if (readCount >= recipientCount || status === 'read') {
      return (
        <span className="text-indigo-400 text-[10px] font-bold leading-none select-none flex items-center" title="Read by all members">
          ✓✓
        </span>
      )
    }
    // Double grey checks when at least 1 member received or read it
    if (deliveredCount > 0 || readCount > 0 || status === 'delivered') {
      return (
        <span className="text-zinc-400 text-[10px] leading-none select-none flex items-center" title="Delivered">
          ✓✓
        </span>
      )
    }
    // Single grey check for sent
    return (
      <span className="text-zinc-500 text-[10px] leading-none select-none flex items-center" title="Sent">
        ✓
      </span>
    )
  }

  if (status === 'read') {
    return <span className="text-indigo-400 text-[10px] font-bold leading-none select-none flex items-center" title="Read">✓✓</span>
  }
  if (status === 'delivered') {
    return <span className="text-zinc-400 text-[10px] leading-none select-none flex items-center" title="Delivered">✓✓</span>
  }
  return <span className="text-zinc-500 text-[10px] leading-none select-none flex items-center" title="Sent">✓</span>
}

// ── Audio Player Component ─────────────────────────────────────────────────────
function AudioPlayer({ audioUrl, isOwn, audioDuration }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

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
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const effectiveDuration = (isFinite(duration) && duration > 0)
    ? duration
    : (isFinite(audioDuration) && audioDuration > 0 ? Number(audioDuration) : 0)

  const handleSeek = (e) => {
    e.stopPropagation()
    const newTime = parseFloat(e.target.value)
    if (audioRef.current && isFinite(newTime)) {
      audioRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }

  const formatTime = (sec) => {
    if (isNaN(sec) || !isFinite(sec) || sec <= 0) return '0:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const progress = effectiveDuration > 0
    ? Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100))
    : 0

  const trackBg = isOwn
    ? `linear-gradient(to right, #ffffff ${progress}%, rgba(0, 0, 0, 0.35) ${progress}%)`
    : `linear-gradient(to right, #6366f1 ${progress}%, #3f3f46 ${progress}%)`

  return (
    <div className="flex items-center gap-3 py-1 px-1 min-w-[210px] sm:min-w-[250px]" onClick={e => e.stopPropagation()}>
      <audio
        ref={audioRef}
        src={audioUrl}
        onPlay={() => setIsPlaying(true)}
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

      <div className="flex-1 flex flex-col justify-center">
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
    </div>
  )
}

// ── Image Grid (1–4 images) ───────────────────────────────────────────────────
function ImageGrid({ urls, onOpenLightbox, isOwn, isEphemeral, isUploading }) {
  const count = urls.length

  if (count === 1) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl cursor-pointer ${isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'} ${isEphemeral ? (isOwn ? 'border-2 border-dashed border-white/70 p-0.5' : 'border-2 border-dashed border-zinc-500 p-0.5') : ''}`}
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
          className={`relative overflow-hidden ${
            count === 3 && i === 2 ? 'col-span-2' : ''
          }`}
          onClick={(e) => {
            e.stopPropagation()
            if (!isUploading) onOpenLightbox(url)
          }}
        >
          <img
            src={url}
            alt={`Image ${i + 1}`}
            className={`w-full h-36 object-cover transition-all duration-300 ${isUploading ? 'opacity-60' : 'hover:opacity-90'}`}
          />
          {/* "+N more" overlay on the 4th tile */}
          {i === 3 && urls.length > 4 && !isUploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white font-bold text-xl">+{urls.length - 4}</span>
            </div>
          )}
        </div>
      ))}
      {isUploading && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center gap-1.5 text-white select-none">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
          <span className="text-[11px] font-medium text-zinc-200">Mengirim...</span>
        </div>
      )}
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

// ── Main MessageBubble ────────────────────────────────────────────────────────
export default function MessageBubble({
  message,
  onReact,
  onReply,
  onEdit,
  onDelete,
  onPin,
  conversationId,
  isGroup,
  totalParticipants,
  isSearchResult = false,
  isCurrentMatch = false,
}) {
  const {
    _id,
    text,
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

  const [showPicker, setShowPicker]             = useState(false)
  const [showMessageInfo, setShowMessageInfo]   = useState(false)
  const [lightboxSrc, setLightboxSrc]           = useState(null)
  const [decryptedText, setDecryptedText]       = useState(text || '')
  const [decryptedReplyText, setDecryptedReplyText] = useState(replyTo?.text || '')
  const [isFlashing, setIsFlashing]             = useState(false)
  const [dragX, setDragX]                       = useState(0)

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
    if (text && !isSystem) {
      decryptMessage(text, conversationId).then((res) => {
        if (isMounted) setDecryptedText(res)
      })
    } else {
      setDecryptedText('')
    }
    return () => { isMounted = false }
  }, [text, conversationId, isSystem])

  // Decrypt replyTo text if present
  useEffect(() => {
    let isMounted = true
    if (replyTo?.text) {
      decryptMessage(replyTo.text, conversationId).then((res) => {
        if (isMounted) setDecryptedReplyText(res)
      })
    } else {
      setDecryptedReplyText('')
    }
    return () => { isMounted = false }
  }, [replyTo?.text, conversationId])

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  // ── Long-press implementation for Mobile UX ──
  const handleTouchStart = () => {
    isLongPressRef.current = false
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true
      setShowPicker(true)
      if (navigator.vibrate) {
        try { navigator.vibrate(30) } catch {}
      }
    }, 500)
  }

  const handleTouchEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const handleTouchMove = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const handleContextMenu = (e) => {
    e.preventDefault()
    setShowPicker(prev => !prev)
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
        className={`relative flex w-full ${isOwn ? 'justify-end' : 'justify-start'} py-0.5 transition-colors duration-700 ${
          isFlashing ? 'bg-indigo-500/20 rounded-xl' : 'bg-transparent'
        }`}
        onMouseLeave={() => setShowPicker(false)}
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
          onMouseEnter={() => setShowPicker(true)}
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

          {/* Action & Emoji Picker on hover or long-press */}
          <AnimatePresence>
            {showPicker && !isDeleted && (
              <ActionPicker
                isOwn={isOwn}
                isPinned={isPinned}
                isDeleted={isDeleted}
                canEdit={canEdit}
                onReact={(emoji) => {
                  onReact?.(_id, emoji)
                  setShowPicker(false)
                }}
                onReply={() => {
                  handleReplyAction()
                  setShowPicker(false)
                }}
                onInfo={() => {
                  setShowMessageInfo(true)
                  setShowPicker(false)
                }}
                onEdit={() => {
                  onEdit?.({
                    _id,
                    text: decryptedText,
                  })
                  setShowPicker(false)
                }}
                onDelete={() => {
                  onDelete?.(_id)
                  setShowPicker(false)
                }}
                onPin={() => {
                  onPin?.(_id)
                  setShowPicker(false)
                }}
              />
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
                />
              )}

              {/* Audio player */}
              {audioUrl && (
                <div
                  className={`
                    p-2 rounded-2xl
                    ${isOwn
                      ? 'bg-indigo-500/90 text-white rounded-br-sm shadow-md'
                      : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'}
                    ${isEphemeral ? (isOwn ? 'border-2 border-dashed border-white/70 shadow-sm' : 'border-2 border-dashed border-zinc-500 shadow-sm') : ''}
                  `}
                >
                  <AudioPlayer audioUrl={audioUrl} isOwn={isOwn} audioDuration={audioDuration} />
                </div>
              )}

              {/* Text bubble */}
              {decryptedText && (
                <div
                  className={`
                    px-4 py-2.5 text-sm leading-relaxed break-words select-text
                    ${isOwn
                      ? 'bg-indigo-500/90 text-white rounded-2xl rounded-br-sm'
                      : 'bg-zinc-800 text-zinc-100 rounded-2xl rounded-bl-sm'}
                    ${isEphemeral ? (isOwn ? 'border-2 border-dashed border-white/70 shadow-sm' : 'border-2 border-dashed border-zinc-500 shadow-sm') : ''}
                  `}
                >
                  {decryptedText}
                </div>
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

