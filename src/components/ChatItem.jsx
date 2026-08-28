import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Pin, PinOff, Archive, ArchiveRestore, MoreVertical, Check } from 'lucide-react'

export default function ChatItem({
  contact,
  isSelected,
  onClick,
  isNew,
  isPinned = false,
  isArchived = false,
  onTogglePin,
  onToggleArchive,
  // Phase 15.42: Multi-select Mode props
  isSelectMode = false,
  isChecked = false,
  onToggleCheck,
}) {
  const { name, avatar, lastMessage, timestamp, unreadCount, presence, isOnline, statusEmoji, isGroup, participantsCount, status, isPendingInvite } = contact

  const isPendingGroup = isGroup && (status === 'pending' || !!isPendingInvite || isNew)
  const isAccepted = (!isGroup && status === 'accepted') || (isGroup && !isPendingGroup)
  const effectivePresence = presence || (isOnline ? 'online' : 'offline')

  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const longPressTimer = useRef(null)
  const menuRef = useRef(null)

  const getPresenceColor = (p) => {
    switch (p) {
      case 'online': return 'bg-emerald-400'
      case 'idle':
      case 'away': return 'bg-yellow-400'
      case 'dnd':
      case 'busy': return 'bg-red-400'
      default: return 'bg-zinc-500'
    }
  }

  // Close context menu on click outside
  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('pointerdown', handleClickOutside)
    return () => window.removeEventListener('pointerdown', handleClickOutside)
  }, [menuOpen])

  const handleContextMenu = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuPos({
      x: Math.min(e.clientX || rect.right - 140, window.innerWidth - 170),
      y: Math.min(e.clientY || rect.bottom, window.innerHeight - 120),
    })
    setMenuOpen(true)
  }

  const handleTouchStart = (e) => {
    clearTimeout(longPressTimer.current)
    const touch = e.touches[0]
    longPressTimer.current = setTimeout(() => {
      if (touch) {
        setMenuPos({
          x: Math.min(touch.clientX, window.innerWidth - 170),
          y: Math.min(touch.clientY, window.innerHeight - 120),
        })
        setMenuOpen(true)
      }
    }, 500)
  }

  const handleTouchEnd = () => {
    clearTimeout(longPressTimer.current)
  }

  const handleActionClick = (e, action) => {
    e.stopPropagation()
    setMenuOpen(false)
    action?.(contact)
  }

  return (
    <div className="relative group select-none">
      <motion.button
        onClick={(e) => {
          if (isSelectMode) {
            e.stopPropagation()
            onToggleCheck?.(contact)
          } else {
            onClick?.(e)
          }
        }}
        onContextMenu={!isSelectMode ? handleContextMenu : undefined}
        onTouchStart={!isSelectMode ? handleTouchStart : undefined}
        onTouchEnd={!isSelectMode ? handleTouchEnd : undefined}
        onTouchMove={!isSelectMode ? handleTouchEnd : undefined}
        id={`chat-item-${contact.id}`}
        whileHover={{ backgroundColor: 'rgba(39,39,42,0.6)' }} // zinc-800/60
        transition={{ duration: 0.15 }}
        className={`
          w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl
          transition-colors cursor-pointer relative
          ${isSelected && !isSelectMode ? 'bg-zinc-800' : isChecked ? 'bg-indigo-950/40 border border-indigo-500/30' : 'bg-transparent'}
        `}
      >
        {/* WhatsApp Multi-Select Circular Checkbox */}
        {isSelectMode && (
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
              isChecked
                ? 'bg-indigo-600 border-2 border-indigo-400 text-white'
                : 'border-2 border-zinc-600 hover:border-zinc-400'
            }`}
          >
            {isChecked && <Check size={12} strokeWidth={3} />}
          </div>
        )}

        {/* Avatar with online dot or group badge */}
        <div className="relative flex-shrink-0">
          <img
            src={avatar}
            alt={name}
            className="w-11 h-11 rounded-full bg-zinc-700 object-cover"
          />
          {isGroup ? (
            <span
              title={`${participantsCount || 0} members`}
              className={`absolute bottom-0 right-0 w-4 h-4 rounded-full ${isPendingGroup ? 'bg-amber-500' : 'bg-indigo-600'} border-2 border-zinc-900 flex items-center justify-center text-white`}
            >
              <Users size={9} />
            </span>
          ) : isAccepted && (
            effectivePresence && effectivePresence !== 'offline' && (
              <span
                aria-label={effectivePresence}
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-zinc-900 ${getPresenceColor(effectivePresence)}`}
              />
            )
          )}
        </div>

        {/* Main Content & Right Column */}
        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-sm font-semibold text-zinc-100 truncate">
                {name}
              </span>
              {isGroup && (
                isPendingGroup ? (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-md font-medium flex-shrink-0">
                    Undangan
                  </span>
                ) : (
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded-md font-medium flex-shrink-0">
                    Group
                  </span>
                )
              )}
              {isAccepted && statusEmoji && <span className="flex-shrink-0">{statusEmoji}</span>}
            </div>
            <p className="text-xs text-zinc-400 truncate">{lastMessage}</p>
          </div>

          {/* Right Metadata Column: timestamp, pin icon, badges, 3-dots */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <div className="flex items-center gap-1">
              {isPinned && (
                <Pin
                  size={12}
                  className="text-indigo-400 transform rotate-45"
                  fill="currentColor"
                  title="Disematkan"
                />
              )}
              {timestamp && (
                <span className="text-[11px] text-zinc-500 font-medium">
                  {timestamp}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {isPendingGroup ? (
                <span className="bg-amber-500 text-zinc-950 text-[10px] font-bold px-1.5 py-0.2 rounded-full shadow-sm shadow-amber-500/30">
                  UNDANGAN
                </span>
              ) : isNew ? (
                <span className="bg-indigo-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shadow-sm shadow-indigo-500/30">
                  NEW
                </span>
              ) : null}
              {unreadCount > 0 && !isSelected && (
                <span className="min-w-[18px] h-4 px-1 flex items-center justify-center rounded-full bg-indigo-500 text-white text-[10px] font-bold shadow-sm shadow-indigo-500/30">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
              {/* Quick menu button on hover */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleContextMenu(e)
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-opacity cursor-pointer hidden sm:block"
                title="Opsi Chat"
              >
                <MoreVertical size={13} />
              </button>
            </div>
          </div>
        </div>
      </motion.button>

      {/* Floating Action Menu for Pin / Archive */}
      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-50 pointer-events-auto">
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              transition={{ type: 'spring', stiffness: 450, damping: 28 }}
              style={{
                top: `${menuPos.y}px`,
                left: `${menuPos.x}px`,
              }}
              className="chat-context-menu fixed bg-zinc-900/95 border border-zinc-700/80 rounded-2xl shadow-2xl p-1.5 min-w-[170px] backdrop-blur-xl z-50 text-xs font-medium space-y-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              {!isArchived && (
                <button
                  type="button"
                  onClick={(e) => handleActionClick(e, onTogglePin)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-200 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer text-left"
                >
                  {isPinned ? (
                    <>
                      <PinOff size={14} className="text-zinc-400" />
                      <span>Lepas Sematan</span>
                    </>
                  ) : (
                    <>
                      <Pin size={14} className="text-indigo-400" />
                      <span>Sematkan Chat</span>
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={(e) => handleActionClick(e, onToggleArchive)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-200 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer text-left"
              >
                {isArchived ? (
                  <>
                    <ArchiveRestore size={14} className="text-emerald-400" />
                    <span>Buka Arsip</span>
                  </>
                ) : (
                  <>
                    <Archive size={14} className="text-amber-400" />
                    <span>Arsipkan Chat</span>
                  </>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
