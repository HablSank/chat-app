import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Phone, Video, Clock } from 'lucide-react'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
import TypingIndicator from './TypingIndicator'
import FriendProfile from './FriendProfile'

const slideInVariants = {
  hidden: { x: '100%', opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 380, damping: 35 },
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: { type: 'spring', stiffness: 380, damping: 35 },
  },
}

// ── Notification Toast ────────────────────────────────────────────────────────
function Toast({ message, visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="absolute top-16 left-1/2 -translate-x-1/2 z-30
            bg-zinc-800/95 border border-zinc-700/80 text-zinc-100 text-xs font-medium
            px-4 py-1.5 rounded-full shadow-2xl backdrop-blur-md pointer-events-none text-center
            whitespace-nowrap max-w-[90vw]"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function ChatRoom({
  contact,
  messages,
  onSendMessage,
  onTypingStart,
  onTypingStop,
  isTyping,
  onBack,
  isMobile,
  onAccept,
  onReject,
  onReact,
  currentUser,
}) {
  const scrollRef          = useRef(null)
  const [toastMessage, setToastMessage]     = useState('🚀 Feature coming soon!')
  const [showToast, setShowToast]           = useState(false)
  const [showFriendProfile, setShowFriendProfile] = useState(false)
  const [isVanishMode, setIsVanishMode]     = useState(false)
  const toastTimerRef      = useRef(null)

  const isPending  = contact.status === 'pending'
  const isReceiver = isPending && contact.initiator !== currentUser.id

  // Auto-scroll on new messages, contact switch, or when typing indicator appears
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [messages.length, contact.id, isTyping])

  const triggerToast = (msg = '🚀 Feature coming soon!') => {
    setToastMessage(msg)
    setShowToast(true)
    clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setShowToast(false), 2400)
  }

  const handleToggleVanish = () => {
    const nextMode = !isVanishMode
    setIsVanishMode(nextMode)
    triggerToast(
      nextMode
        ? 'Vanish Mode Aktif (24 Jam)'
        : 'Vanish Mode Dimatikan'
    )
  }

  return (
    <>
      <FriendProfile
        isOpen={showFriendProfile}
        onClose={() => setShowFriendProfile(false)}
        userId={contact.id}
      />

      <motion.div
        key={contact.id}
        variants={isMobile ? slideInVariants : undefined}
        initial={isMobile ? 'hidden' : false}
        animate={isMobile ? 'visible' : false}
        exit={isMobile ? 'exit' : undefined}
        className={`relative flex flex-col h-full transition-all duration-700 ${
          isVanishMode ? 'bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-950 to-zinc-950' : 'bg-zinc-900'
        }`}
      >
        {/* Toast */}
        <Toast message={toastMessage} visible={showToast} />

        {/* ── Sticky Top Header ───────────────────────── */}
        <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur-sm sticky top-0 z-10">
          {/* Back button — mobile only */}
          {isMobile && (
            <motion.button
              id="chatroom-back-btn"
              onClick={onBack}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors mr-1"
            >
              <ArrowLeft size={18} />
            </motion.button>
          )}

          {/* Friend avatar + info — click to open profile */}
          <button
            type="button"
            id="chatroom-friend-profile-btn"
            onClick={(e) => {
              e.stopPropagation()
              setShowFriendProfile(true)
            }}
            className="flex items-center gap-3 flex-1 min-w-0 text-left group cursor-pointer"
          >
            <div className="relative flex-shrink-0">
              <img
                src={contact.avatar}
                alt={contact.name}
                className="w-9 h-9 rounded-full bg-zinc-700 object-cover group-hover:opacity-80 transition-opacity"
              />
              {contact.isOnline && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-zinc-900" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-100 truncate group-hover:text-indigo-300 transition-colors">
                {contact.name}
              </p>
              <p className={`text-xs ${
                contact.presence === 'idle' ? 'text-yellow-400' :
                contact.presence === 'dnd' ? 'text-red-400' :
                contact.presence === 'online' ? 'text-emerald-400' : 'text-zinc-500'
              }`}>
                {contact.presence === 'idle' ? 'Away' :
                 contact.presence === 'dnd' ? 'Do Not Disturb' :
                 contact.presence === 'online' ? 'Online' : 'Offline'}
              </p>
            </div>
          </button>

          {/* Action buttons — "Coming Soon" toast on click */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <motion.button
              id="chatroom-vanish-btn"
              onClick={handleToggleVanish}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                isVanishMode 
                  ? 'text-white bg-indigo-500 shadow-lg shadow-indigo-500/20' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
              title="Vanish Mode (Pesan Sementara)"
            >
              <Clock size={16} />
            </motion.button>
            <motion.button
              id="chatroom-phone-btn"
              onClick={() => triggerToast('🚀 Feature coming soon!')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title="Voice call (coming soon)"
            >
              <Phone size={16} />
            </motion.button>
            <motion.button
              id="chatroom-video-btn"
              onClick={() => triggerToast('🚀 Feature coming soon!')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title="Video call (coming soon)"
            >
              <Video size={16} />
            </motion.button>
          </div>
        </div>

        {/* ── Scrollable Message Thread ────────────────── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
        >
          {messages.length > 0 ? (
            messages.map((msg) => {
              const isOwn = msg.sender._id === currentUser.id
              const displayMsg = {
                _id:       msg._id,
                text:      msg.text,
                imageUrl:  msg.imageUrl,
                imageUrls: msg.imageUrls,
                reactions: msg.reactions,
                status:    msg.status,
                isEphemeral: msg.isEphemeral,
                expiresAt: msg.expiresAt ? new Date(msg.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
                timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isOwn,
              }
              return <MessageBubble key={msg._id} message={displayMsg} onReact={onReact} />
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-800">
                <img
                  src={contact.avatar}
                  alt={contact.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-zinc-300 font-semibold">{contact.name}</p>
                <p className="text-sm text-zinc-500 mt-1">
                  Send a message to start the conversation 👋
                </p>
              </div>
            </div>
          )}

          {/* ── Typing Indicator ──────────────────────── */}
          <AnimatePresence>
            {isTyping && <TypingIndicator key="typing-indicator" />}
          </AnimatePresence>
        </div>

        {/* ── Fixed Bottom Input or Banner ───────────────────────── */}
        {isReceiver ? (
          <div className="flex-shrink-0 p-4 border-t border-zinc-800 bg-zinc-900">
            <div className="bg-zinc-800/80 rounded-2xl p-4 text-center">
              <p className="text-sm text-zinc-300 font-medium mb-3">
                {contact.name} wants to connect with you.
              </p>
              <div className="flex items-center justify-center gap-3">
                <motion.button
                  onClick={onReject}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-2 rounded-xl bg-zinc-700 hover:bg-red-500/80 text-zinc-200 text-sm font-semibold transition-colors"
                >
                  Reject
                </motion.button>
                <motion.button
                  onClick={onAccept}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors"
                >
                  Accept
                </motion.button>
              </div>
            </div>
          </div>
        ) : (
          <ChatInput
            onSend={(payload) => onSendMessage({ ...payload, isEphemeral: isVanishMode })}
            onTypingStart={onTypingStart}
            onTypingStop={onTypingStop}
            isVanishMode={isVanishMode}
          />
        )}
      </motion.div>
    </>
  )
}
