import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import { Timer } from 'lucide-react'
import Lightbox from './Lightbox'

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
function ReadReceipt({ status }) {
  if (!status || status === 'sent') {
    return <span className="text-zinc-500 text-[10px] leading-none" title="Sent">✓</span>
  }
  if (status === 'delivered') {
    return <span className="text-zinc-400 text-[10px] leading-none" title="Delivered">✓✓</span>
  }
  return <span className="text-indigo-400 text-[10px] font-bold leading-none" title="Read">✓✓</span>
}

// ── Image Grid (1–4 images) ───────────────────────────────────────────────────
function ImageGrid({ urls, onOpenLightbox, isOwn, isEphemeral }) {
  const count = urls.length

  if (count === 1) {
    return (
      <div
        className={`overflow-hidden rounded-2xl cursor-pointer ${isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'} ${isEphemeral ? (isOwn ? 'border-2 border-dashed border-white/70 p-0.5' : 'border-2 border-dashed border-zinc-500 p-0.5') : ''}`}
        onClick={(e) => {
          e.stopPropagation()
          onOpenLightbox(urls[0])
        }}
      >
        <img
          src={urls[0]}
          alt="Shared image"
          className="max-w-xs max-h-72 w-full object-cover hover:opacity-90 transition-opacity"
        />
      </div>
    )
  }

  // 2 images → side by side, 3+ → 2-column grid (last item spans if odd)
  return (
    <div
      className={`grid gap-1 rounded-2xl overflow-hidden cursor-pointer ${
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
            onOpenLightbox(url)
          }}
        >
          <img
            src={url}
            alt={`Image ${i + 1}`}
            className="w-full h-36 object-cover hover:opacity-90 transition-opacity"
          />
          {/* "+N more" overlay on the 4th tile */}
          {i === 3 && urls.length > 4 && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white font-bold text-xl">+{urls.length - 4}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Emoji Reaction Picker ─────────────────────────────────────────────────────
function EmojiPicker({ onReact, isOwn }) {
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
      {QUICK_EMOJIS.map((emoji) => (
        <motion.button
          key={emoji}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onReact(emoji)
          }}
          whileHover={{ scale: 1.3 }}
          whileTap={{ scale: 0.9 }}
          className="text-lg leading-none p-1 rounded-full hover:bg-zinc-700/60 transition-colors"
        >
          {emoji}
        </motion.button>
      ))}
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
export default function MessageBubble({ message, onReact }) {
  const { text, timestamp, isOwn, imageUrl, imageUrls, reactions, status, isEphemeral, expiresAt } = message
  const [showPicker, setShowPicker]   = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState(null)
  
  const timerRef = useRef(null)
  const isLongPressRef = useRef(false)

  // Merge legacy imageUrl into imageUrls for display
  const allImages = (() => {
    const urls = imageUrls?.length ? imageUrls : imageUrl ? [imageUrl] : []
    return urls
  })()

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

  return (
    <>
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      <motion.div
        layout
        variants={bubbleVariants}
        initial="hidden"
        animate="visible"
        className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}
        onMouseLeave={() => setShowPicker(false)}
      >
        <div
          className={`relative flex flex-col max-w-[70%] gap-1 select-none touch-manipulation ${isOwn ? 'items-end' : 'items-start'}`}
          onMouseEnter={() => setShowPicker(true)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          onContextMenu={handleContextMenu}
        >
          {/* Emoji Picker on hover or long-press */}
          <AnimatePresence>
            {showPicker && (
              <EmojiPicker
                isOwn={isOwn}
                onReact={(emoji) => {
                  onReact?.(message._id, emoji)
                  setShowPicker(false)
                }}
              />
            )}
          </AnimatePresence>

          {/* Image grid */}
          {allImages.length > 0 && (
            <ImageGrid
              urls={allImages}
              isOwn={isOwn}
              isEphemeral={isEphemeral}
              onOpenLightbox={(src) => setLightboxSrc(src)}
            />
          )}

          {/* Text bubble */}
          {text && (
            <div
              className={`
                px-4 py-2.5 text-sm leading-relaxed break-words select-text
                ${isOwn
                  ? 'bg-indigo-500/90 text-white rounded-2xl rounded-br-sm'
                  : 'bg-zinc-800 text-zinc-100 rounded-2xl rounded-bl-sm'}
                ${isEphemeral ? (isOwn ? 'border-2 border-dashed border-white/70 shadow-sm' : 'border-2 border-dashed border-zinc-500 shadow-sm') : ''}
              `}
            >
              {text}
            </div>
          )}

          {/* Reaction bubbles */}
          <ReactionBubbles
            reactions={reactions}
            onReact={(emoji) => onReact?.(message._id, emoji)}
          />

          {/* Timestamp + Read receipt */}
          <div className="flex items-center gap-1 px-1 mt-0.5">
            {isEphemeral && <Timer size={10} className="text-zinc-500" title="Vanish Mode Message" />}
            <span className="text-xs text-zinc-500">
              {timestamp} {isEphemeral && expiresAt && `• Expires at ${expiresAt}`}
            </span>
            {isOwn && <ReadReceipt status={status} />}
          </div>
        </div>
      </motion.div>
    </>
  )
}
