import { useState, useRef } from 'react'
import { motion } from 'framer-motion'

export default function InAppToast({ toast, onOpen, onClose, className = '' }) {
  const [touchDelta, setTouchDelta] = useState({ x: 0, y: 0 })
  const [isSwiping, setIsSwiping] = useState(false)
  const touchStartRef = useRef({ x: 0, y: 0 })

  if (!toast) return null

  const handleTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      }
      setIsSwiping(true)
    }
  }

  const handleTouchMove = (e) => {
    if (!isSwiping || !e.touches || !e.touches[0]) return
    const currentX = e.touches[0].clientX
    const currentY = e.touches[0].clientY
    const deltaX = currentX - touchStartRef.current.x
    const deltaY = currentY - touchStartRef.current.y

    // Only allow positive horizontal movement (right swipe) or negative vertical movement (up swipe)
    const clampedX = Math.max(0, deltaX)
    const clampedY = Math.min(0, deltaY)

    setTouchDelta({ x: clampedX, y: clampedY })
  }

  const handleTouchEnd = () => {
    if (!isSwiping) return
    setIsSwiping(false)

    // Trigger dismiss if swiped right (> 80px) or swiped up (< -50px)
    if (touchDelta.x > 80 || touchDelta.y < -50) {
      onClose?.()
    } else {
      // Spring back to center
      setTouchDelta({ x: 0, y: 0 })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: isSwiping ? `translate3d(${touchDelta.x}px, ${touchDelta.y}px, 0)` : undefined,
        transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        opacity: isSwiping ? Math.max(0.2, 1 - (touchDelta.x / 200) - (Math.abs(touchDelta.y) / 120)) : 1,
      }}
      className={`fixed z-50 bg-zinc-900/95 border border-zinc-700/80 rounded-2xl shadow-2xl backdrop-blur-md p-3 flex items-center gap-3 cursor-pointer hover:border-indigo-500/50 transition-colors select-none touch-manipulation ${className}`}
      onClick={onOpen}
    >
      <img
        src={toast.senderAvatar}
        alt={toast.senderName}
        className="w-10 h-10 rounded-full object-cover bg-zinc-800 flex-shrink-0 pointer-events-none"
      />
      <div className="flex-1 min-w-0 pointer-events-none">
        <p className="text-xs font-bold text-zinc-100 truncate">{toast.senderName}</p>
        <p className="text-xs text-zinc-400 truncate">{toast.preview}</p>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onClose?.()
        }}
        className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg flex-shrink-0 cursor-pointer"
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </motion.div>
  )
}
