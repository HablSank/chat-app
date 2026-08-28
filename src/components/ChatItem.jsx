import { motion } from 'framer-motion'
import { Users } from 'lucide-react'

export default function ChatItem({ contact, isSelected, onClick, isNew }) {
  if (!contact) return null

  const {
    id = '',
    name = 'Chat',
    avatar = 'https://api.dicebear.com/7.x/shapes/svg?seed=user',
    lastMessage = '',
    timestamp = '',
    unreadCount = 0,
    presence = 'offline',
    isOnline = false,
    statusEmoji = '',
    isGroup = false,
    participantsCount = 0,
    status = 'accepted',
  } = contact || {}

  const isAccepted = isGroup || status === 'accepted'
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
            className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-indigo-600 border-2 border-zinc-900 flex items-center justify-center text-white"
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
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded-md font-medium">
                  Group
                </span>
                {status === 'pending' && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-md font-medium">
                    Invite
                  </span>
                )}
              </div>
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
