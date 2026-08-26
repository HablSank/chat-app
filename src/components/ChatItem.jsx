import { motion } from 'framer-motion'

export default function ChatItem({ contact, isSelected, onClick }) {
  const { name, avatar, lastMessage, timestamp, unreadCount, presence, statusEmoji } = contact

  const getPresenceColor = (p) => {
    switch (p) {
      case 'online': return 'bg-emerald-400'
      case 'idle': return 'bg-yellow-400'
      case 'dnd': return 'bg-red-400'
      default: return 'bg-zinc-500' // fallback offline or unknown
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
      {/* Avatar with online dot */}
      <div className="relative flex-shrink-0">
        <img
          src={avatar}
          alt={name}
          className="w-11 h-11 rounded-full bg-zinc-700 object-cover"
        />
        {presence && presence !== 'offline' && (
          <span
            aria-label={presence}
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-zinc-900 ${getPresenceColor(presence)}`}
          />
        )}
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-sm font-semibold text-zinc-100 truncate flex items-center gap-1.5">
            {name}
            {statusEmoji && <span>{statusEmoji}</span>}
          </span>
          <span className="text-xs text-zinc-500 flex-shrink-0 ml-2">
            {timestamp}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-400 truncate pr-2">{lastMessage}</p>
          {unreadCount > 0 && !isSelected && (
            <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-indigo-500 text-white text-xs font-bold shadow-sm shadow-indigo-500/30">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  )
}
