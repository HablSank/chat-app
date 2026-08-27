import { motion } from 'framer-motion'
import { Users, Lock } from 'lucide-react'

export default function ChatItem({ contact, isSelected, onClick, isNew }) {
  const { name, avatar, lastMessage, timestamp, unreadCount, presence, isOnline, statusEmoji, isGroup, participantsCount, status } = contact

  const isAccepted = isGroup || status === 'accepted'
  const displayAvatar = isAccepted ? avatar : 'https://api.dicebear.com/7.x/shapes/svg?seed=locked'
  const effectivePresence = presence || (isOnline ? 'online' : 'offline')

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

  return (
    <motion.button
      onClick={onClick}
      id={`chat-item-${contact.id}`}
      whileHover={{ backgroundColor: 'rgba(39,39,42,0.6)' }} // zinc-800/60
      transition={{ duration: 0.15 }}
      className={`
        w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl
        transition-colors cursor-pointer
        ${isSelected ? 'bg-zinc-800' : 'bg-transparent'}
      `}
    >
      {/* Avatar with online dot, group badge, or privacy lock */}
      <div className="relative flex-shrink-0">
        <img
          src={displayAvatar}
          alt={name}
          className="w-11 h-11 rounded-full bg-zinc-700 object-cover"
        />
        {isGroup ? (
          <span
            title={`${participantsCount || 0} members`}
            className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-indigo-600 border-2 border-zinc-900 flex items-center justify-center text-white"
          >
            <Users size={9} />
          </span>
        ) : !isAccepted ? (
          <span
            title="Privacy Locked"
            className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-zinc-800 border-2 border-zinc-900 flex items-center justify-center text-zinc-400 shadow-sm"
          >
            <Lock size={8} />
          </span>
        ) : (
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
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded-md font-medium flex-shrink-0">
                Group
              </span>
            )}
            {isAccepted && statusEmoji && <span className="flex-shrink-0">{statusEmoji}</span>}
          </div>
          <p className="text-xs text-zinc-400 truncate">{lastMessage}</p>
        </div>

        {/* Right Metadata Column: vertically stacked timestamp and badges */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {timestamp && (
            <span className="text-[11px] text-zinc-500 font-medium">
              {timestamp}
            </span>
          )}
          <div className="flex items-center gap-1">
            {isNew && (
              <span className="bg-indigo-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shadow-sm shadow-indigo-500/30">
                NEW
              </span>
            )}
            {unreadCount > 0 && !isSelected && (
              <span className="min-w-[18px] h-4 px-1 flex items-center justify-center rounded-full bg-indigo-500 text-white text-[10px] font-bold shadow-sm shadow-indigo-500/30">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  )
}
