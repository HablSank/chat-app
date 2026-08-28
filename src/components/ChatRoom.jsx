import { useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Phone, Video, Clock, Pin, PinOff, Image as ImageIcon, Users, Search, ChevronUp, ChevronDown, X } from 'lucide-react'
import MessageBubble, { DeleteChoiceModal, downloadImage } from './MessageBubble'
import ChatInput from './ChatInput'
import TypingIndicator from './TypingIndicator'
import FriendProfile from './FriendProfile'
import MediaSidebar from './MediaSidebar'
import GroupInfoModal from './GroupInfoModal'
import ChatHeader from './ChatHeader'
import ThemeModal, { BUILTIN_WALLPAPERS } from './ThemeModal'
import { decryptMessage } from '../utils/crypto'

import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'

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

function formatLastSeen(lastSeenDate, t, language = 'id') {
  if (!lastSeenDate) return t('offlineStatus')
  const date = new Date(lastSeenDate)
  if (isNaN(date.getTime())) return t('offlineStatus')

  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (isToday) {
    return `${t('lastSeenTodayAt')} ${timeStr}`
  } else if (isYesterday) {
    return `${t('lastSeenYesterdayAt')} ${timeStr}`
  } else {
    const dateStr = date.toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', { day: 'numeric', month: 'short' })
    return `${t('lastSeenDateAt')} ${dateStr} ${timeStr}`
  }
}

function getDateSeparatorLabel(dateString, t, language = 'id') {
  if (!dateString) return null
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return null

  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return t('today')
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) {
    return t('yesterday')
  }

  return d.toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

// ── Pinned Message Top Banner ──────────────────────────────────────────────────
function PinnedMessageBanner({ message, decryptedText, onScrollTo, onUnpin }) {
  const { t } = useLanguage()
  const preview = message.audioUrl
    ? '🎵 Pesan Suara'
    : message.imageUrls?.length || message.imageUrl
    ? '📷 Foto'
    : decryptedText || message.plainText || message.text || 'Pesan tersemat'

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={onScrollTo}
      className="pinned-banner px-4 py-2 bg-zinc-900/95 border-b border-indigo-500/20 backdrop-blur-md flex items-center justify-between gap-3 cursor-pointer hover:bg-zinc-850 transition-colors z-20"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
          <Pin size={12} className="rotate-45" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
            {t('pinnedMessage')}
          </p>
          <p className="text-xs text-zinc-300 truncate max-w-xs sm:max-w-md">
            {preview}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onUnpin(message._id)
        }}
        className="p-1 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer flex-shrink-0"
        title="Lepas Sematan"
      >
        <PinOff size={14} />
      </button>
    </motion.div>
  )
}

export default function ChatRoom({
  contact,
  messages,
  onSendMessage,
  onTypingStart,
  onTypingStop,
  onEditMessage,
  onDeleteMessage,
  onPinMessage,
  isTyping,
  typingUsers = [],
  onBack,
  isMobile,
  onAccept,
  onReject,
  onReact,
  onGroupUpdated,
  onGroupLeft,
  onJoinGroup,
  currentUser,
}) {
  const { t, language } = useLanguage()
  const { theme } = useTheme()
  const scrollRef          = useRef(null)
  const toastTimerRef      = useRef(null)
  const [toastMessage, setToastMessage]     = useState('🚀 Feature coming soon!')
  const [showToast, setShowToast]           = useState(false)
  const [showFriendProfile, setShowFriendProfile] = useState(false)
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false)
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false)
  const [localTheme, setLocalTheme]         = useState(contact?.customTheme || null)
  const [isVanishMode, setIsVanishMode]     = useState(false)
  const [isMediaSidebarOpen, setIsMediaSidebarOpen] = useState(false)
  const [replyingTo, setReplyingTo]         = useState(null)
  const [editingMessage, setEditingMessage] = useState(null)
  const [isSearchOpen, setIsSearchOpen]     = useState(false)
  const [searchQuery, setSearchQuery]       = useState('')
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0)
  const [decryptedMap, setDecryptedMap]     = useState({})

  // Phase 15.41: WhatsApp-style selection state
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Keep localTheme in sync with contact customTheme
  useEffect(() => {
    setLocalTheme(contact?.customTheme || null)
  }, [contact?.customTheme, contact?.conversationId])

  // Compute room-specific wallpaper background style
  const activeWallpaper = localTheme?.wallpaperUrl || ''
  const wallpaperStyle = useMemo(() => {
    if (!activeWallpaper) return {}
    if (activeWallpaper.startsWith('http://') || activeWallpaper.startsWith('https://') || activeWallpaper.startsWith('data:')) {
      return {
        backgroundImage: `url(${activeWallpaper})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    }
    const isLight = theme === 'light'
    let styleVal = activeWallpaper
    if (activeWallpaper.includes('radial-gradient') && activeWallpaper.includes('1px')) {
      styleVal = isLight
        ? 'radial-gradient(rgba(100, 116, 139, 0.28) 1.2px, transparent 1.2px)'
        : 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)'
    } else if (activeWallpaper.includes('linear-gradient') && activeWallpaper.includes('1px')) {
      styleVal = isLight
        ? 'linear-gradient(to right, rgba(100, 116, 139, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(100, 116, 139, 0.2) 1px, transparent 1px)'
        : 'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)'
    }
    const builtin = BUILTIN_WALLPAPERS.find(w => w.value === activeWallpaper)
    return {
      backgroundImage: styleVal,
      backgroundSize: builtin?.bgSize || 'auto',
    }
  }, [activeWallpaper, theme])

  const safeMessages = Array.isArray(messages) ? messages : []
  const safeParticipants = Array.isArray(contact?.participants) ? contact.participants : []
  const currentUserId = (currentUser?.id || currentUser?._id || '').toString()
  const safePendingMembers = (contact?.pendingMembers || []).map(p => (p?._id?.toString() || p?.toString()))
  const isPending  = contact?.status === 'pending' || !!contact?.isPendingInvite || (contact?.isGroup && safePendingMembers.includes(currentUserId))
  const isGroupInvite = !!contact?.isGroup && (isPending || safePendingMembers.includes(currentUserId))
  const initiatorId = contact?.initiator?._id
    ? contact.initiator._id.toString()
    : (contact?.initiator ? contact.initiator.toString() : '')
  const isInitiator = !contact?.isGroup && isPending && (initiatorId === currentUserId || contact?.status === 'new' || !contact?.conversationId)
  const isReceiver = !contact?.isGroup && isPending && !isInitiator && !!initiatorId && initiatorId !== currentUserId

  const pinnedMessages = safeMessages.filter(m => m?.isPinned && !m?.isDeleted)

  // Decrypt messages in background to enable client-side E2EE search
  useEffect(() => {
    let isMounted = true
    const decryptAll = async () => {
      const map = {}
      for (const msg of safeMessages) {
        if (!msg) continue
        if (msg.text && !msg.isSystem) {
          map[msg._id] = await decryptMessage(msg.text, contact?.conversationId)
        } else if (msg.systemText) {
          map[msg._id] = msg.systemText
        }
      }
      if (isMounted) setDecryptedMap(map)
    }
    decryptAll()
    return () => { isMounted = false }
  }, [safeMessages, contact?.conversationId])

  const triggerToast = (msg) => {
    setToastMessage(msg)
    setShowToast(true)
    clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setShowToast(false), 2400)
  }

  const handleToggleVanish = () => {
    setIsVanishMode(prev => {
      const next = !prev
      triggerToast(next ? '👻 Pesan Sementara (Vanish Mode) diaktifkan' : '👻 Pesan Sementara dimatikan')
      return next
    })
  }

  // Filter matched messages for search
  const matchedMessageIds = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return safeMessages
      .filter((msg) => {
        if (!msg || msg.isDeleted) return false
        const plain = decryptedMap[msg._id] || msg.plainText || msg.text || ''
        return plain.toLowerCase().includes(q)
      })
      .map((m) => m._id)
  }, [safeMessages, searchQuery, decryptedMap])

  // Auto-scroll to active match
  useEffect(() => {
    if (matchedMessageIds.length > 0) {
      const targetId = matchedMessageIds[currentMatchIdx]
      if (targetId) {
        const el = document.getElementById(`msg-${targetId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    }
  }, [currentMatchIdx, matchedMessageIds])

  // ── Instant Zero-Animation Bottom Positioning on Room Load ─────────────────
  const activeRoomId = contact?.conversationId || contact?.id
  const prevRoomIdRef = useRef(null)
  const initialScrollDoneRef = useRef(false)
  const prevMsgLengthRef = useRef(safeMessages.length)
  const messagesEndRef = useRef(null)

  useLayoutEffect(() => {
    if (!activeRoomId) return
    const isSwitched = prevRoomIdRef.current !== activeRoomId
    if (isSwitched) {
      prevRoomIdRef.current = activeRoomId
      initialScrollDoneRef.current = false
      setReplyingTo(null)
      setEditingMessage(null)
      setSelectedMessage(null)
    }

    if (!initialScrollDoneRef.current || isSwitched) {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
      initialScrollDoneRef.current = true
    }
  }, [activeRoomId, safeMessages.length])

  // Incremental auto-scroll on new incoming messages only if user is already near bottom (<= 180px)
  useEffect(() => {
    if (isSearchOpen || !scrollRef.current) return
    const container = scrollRef.current

    if (safeMessages.length > prevMsgLengthRef.current && prevRoomIdRef.current === activeRoomId) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= 180
      if (isNearBottom) {
        container.scrollTop = container.scrollHeight
      }
    }
    prevMsgLengthRef.current = safeMessages.length
  }, [safeMessages.length, isSearchOpen, activeRoomId])

  // Keep message list scrolled to latest when mobile virtual keyboard opens/resizes viewport
  useEffect(() => {
    const handleViewportResize = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    }
    if (typeof window !== 'undefined' && window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize)
      window.visualViewport.addEventListener('scroll', handleViewportResize)
    }
    return () => {
      if (typeof window !== 'undefined' && window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize)
        window.visualViewport.removeEventListener('scroll', handleViewportResize)
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      clearTimeout(toastTimerRef.current)
    }
  }, [])

  // ── WhatsApp Selection Header Actions ──────────────────────────────────────
  const handleCopySelected = async () => {
    if (!selectedMessage) return
    const textToCopy = selectedMessage.plainText || selectedMessage.text || ''
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
      triggerToast('📋 Teks disalin')
      setSelectedMessage(null)
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }

  const handleDownloadSelected = async () => {
    if (!selectedMessage) return
    const url = selectedMessage.imageUrls?.[0] || selectedMessage.imageUrl
    if (!url) return
    downloadImage(url, 'ping-attachment.jpg')
    setSelectedMessage(null)
  }

  const handlePinSelected = () => {
    if (!selectedMessage) return
    onPinMessage?.(selectedMessage._id)
    setSelectedMessage(null)
  }

  const handleEditSelected = () => {
    if (!selectedMessage) return
    setEditingMessage(selectedMessage)
    setSelectedMessage(null)
  }

  const handleReplySelected = () => {
    if (!selectedMessage) return
    setReplyingTo(selectedMessage)
    setSelectedMessage(null)
  }

  const groupMemberNames = contact?.isGroup
    ? (contact?.participants || contact?.members || [])
        .map((p) => p.displayName || p.username)
        .filter(Boolean)
        .join(', ')
    : ''

  return (
    <>
      <motion.div
        key={contact?.id || 'empty-room'}
        variants={isMobile ? slideInVariants : {}}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="flex-1 flex flex-col h-full bg-zinc-950 overflow-hidden relative"
      >
        {/* ── Toast Notification Banner ─────────────────────────────────── */}
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-zinc-900/95 border border-zinc-700/80 text-zinc-100 text-xs font-semibold shadow-2xl backdrop-blur-md pointer-events-none flex items-center gap-2 max-w-[88vw] text-center"
            >
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Friend Profile Modal (1-on-1 Contact) ───────────────────── */}
        <FriendProfile
          isOpen={showFriendProfile}
          onClose={() => setShowFriendProfile(false)}
          contact={contact}
          currentUserId={currentUserId}
          onBlock={() => triggerToast('🚫 Pengguna diblokir')}
          onDeleteChat={() => triggerToast('🗑️ Riwayat chat dihapus')}
        />

        {/* ── Group Info Modal (Group Details & Member Management) ────────── */}
        {contact?.isGroup && (
          <GroupInfoModal
            isOpen={isGroupInfoOpen}
            onClose={() => setIsGroupInfoOpen(false)}
            group={contact}
            currentUserId={currentUserId}
            onGroupUpdated={onGroupUpdated}
            onGroupLeft={onGroupLeft}
          />
        )}

        {/* ── Media Files Sidebar ────────────────────────────────────────── */}
        <MediaSidebar
          isOpen={isMediaSidebarOpen}
          onClose={() => setIsMediaSidebarOpen(false)}
          messages={messages}
        />

        {/* ── Chat Header (Switches dynamically to WhatsApp Selection Bar) ── */}
        <ChatHeader
          contact={contact}
          isMobile={isMobile}
          onBack={onBack}
          onOpenProfile={() => setShowFriendProfile(true)}
          onOpenGroupInfo={() => setIsGroupInfoOpen(true)}
          onOpenTheme={() => setIsThemeModalOpen(true)}
          groupMemberNames={groupMemberNames}
          formatLastSeen={(date) => formatLastSeen(date, t, language)}
          isSearchOpen={isSearchOpen}
          onToggleSearch={() => setIsSearchOpen((prev) => !prev)}
          isMediaSidebarOpen={isMediaSidebarOpen}
          onToggleMediaSidebar={() => setIsMediaSidebarOpen((prev) => !prev)}
          isVanishMode={isVanishMode}
          onToggleVanishMode={handleToggleVanish}
          onVoiceCall={() => triggerToast('🚀 Panggilan Suara segera hadir!')}
          onVideoCall={() => triggerToast('🚀 Panggilan Video segera hadir!')}
          onClearChat={() => triggerToast('🧹 Fitur Bersihkan Chat segera hadir!')}
          selectedMessage={selectedMessage}
          onClearSelection={() => setSelectedMessage(null)}
          onReplySelected={handleReplySelected}
          onDeleteSelected={() => setShowDeleteModal(true)}
          onCopySelected={handleCopySelected}
          onDownloadSelected={handleDownloadSelected}
          onPinSelected={handlePinSelected}
          onEditSelected={handleEditSelected}
          currentUserId={currentUserId}
        />

        {/* ── Client-Side E2EE Message Search Bar ──────────────────────── */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-2 flex items-center gap-2 text-xs shadow-inner"
            >
              <Search size={14} className="text-zinc-500 flex-shrink-0" />
              <input
                id="chat-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentMatchIdx(0)
                }}
                placeholder="Search decrypted messages in chat..."
                className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-zinc-500 outline-none"
                autoFocus
              />

              {/* Match counter & Navigation */}
              {searchQuery.trim() && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {matchedMessageIds.length > 0
                      ? `${currentMatchIdx + 1} of ${matchedMessageIds.length}`
                      : '0 matches'}
                  </span>

                  <button
                    type="button"
                    disabled={matchedMessageIds.length === 0}
                    onClick={() =>
                      setCurrentMatchIdx((prev) =>
                        prev > 0 ? prev - 1 : matchedMessageIds.length - 1
                      )
                    }
                    className="w-6 h-6 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    title="Previous match"
                  >
                    <ChevronUp size={14} />
                  </button>

                  <button
                    type="button"
                    disabled={matchedMessageIds.length === 0}
                    onClick={() =>
                      setCurrentMatchIdx((prev) =>
                        prev < matchedMessageIds.length - 1 ? prev + 1 : 0
                      )
                    }
                    className="w-6 h-6 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    title="Next match"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen(false)
                  setSearchQuery('')
                  setCurrentMatchIdx(0)
                }}
                className="w-6 h-6 rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex items-center justify-center cursor-pointer transition-colors"
                title="Close search"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Pinned Message Banner ──────────────────────── */}
        <AnimatePresence>
          {pinnedMessages.length > 0 && (
            <PinnedMessageBanner
              key={pinnedMessages[pinnedMessages.length - 1]._id}
              message={pinnedMessages[pinnedMessages.length - 1]}
              decryptedText={decryptedMap[pinnedMessages[pinnedMessages.length - 1]._id]}
              onScrollTo={() => {
                const latestPinned = pinnedMessages[pinnedMessages.length - 1]
                if (latestPinned) {
                  const el = document.getElementById(`msg-${latestPinned._id}`)
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
              }}
              onUnpin={(id) => onPinMessage?.(id)}
            />
          )}
        </AnimatePresence>

        {/* ── Scrollable Message Thread ────────────────── */}
        <div
          ref={scrollRef}
          style={{ ...wallpaperStyle, overflowAnchor: 'auto' }}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
        >
          {safeMessages.length > 0 ? (
            safeMessages.map((msg, index) => {
              if (!msg) return null
              const msgDateStr = msg.createdAt ? new Date(msg.createdAt).toDateString() : ''
              const prevDateStr = index > 0 && safeMessages[index - 1]?.createdAt ? new Date(safeMessages[index - 1].createdAt).toDateString() : null
              const isNewDay = index === 0 || msgDateStr !== prevDateStr
              const dateLabel = getDateSeparatorLabel(msg.createdAt, t, language)

              const isOwn = (msg.sender?._id || msg.sender) === (currentUser?.id || currentUser?._id)
              const displayMsg = {
                _id:       msg._id,
                text:      msg.text,
                plainText: msg.plainText || null,
                messageType: msg.messageType || 'text',
                inviteData: msg.inviteData || null,
                imageUrl:  msg.imageUrl,
                imageUrls: msg.imageUrls,
                audioUrl:  msg.audioUrl,
                audioDuration: msg.audioDuration,
                replyTo:   msg.replyTo,
                sender:    msg.sender,
                reactions: msg.reactions,
                status:    msg.status,
                isUploading: msg.isUploading || msg.status === 'sending',
                readBy:    msg.readBy || [],
                deliveredTo: msg.deliveredTo || [],
                isEdited:  msg.isEdited,
                isDeleted: msg.isDeleted,
                isPinned:  msg.isPinned,
                isSystem:  msg.isSystem,
                systemText: msg.systemText,
                isEphemeral: msg.isEphemeral,
                expiresAt: msg.expiresAt ? new Date(msg.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
                timestamp: msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
                isOwn,
              }
              const isSearchResult = matchedMessageIds.includes(msg._id)
              const isCurrentMatch = isSearchResult && matchedMessageIds[currentMatchIdx] === msg._id

              return (
                <div key={msg._id || index} className="space-y-2">
                  {isNewDay && dateLabel && (
                    <div className="flex justify-center my-3 select-none sticky top-2 z-10">
                      <span className="date-separator-pill bg-zinc-800/90 border border-zinc-700/60 backdrop-blur-md text-zinc-400 text-[11px] font-semibold px-3.5 py-1 rounded-full shadow-md">
                        {dateLabel}
                      </span>
                    </div>
                  )}
                  <MessageBubble
                    message={displayMsg}
                    onReact={onReact}
                    onReply={(targetMsg) => setReplyingTo(targetMsg)}
                    onEdit={(targetMsg) => setEditingMessage(targetMsg)}
                    onDelete={(targetMsgId, deleteForEveryone) => onDeleteMessage?.(targetMsgId, deleteForEveryone)}
                    onPin={(targetMsgId) => onPinMessage?.(targetMsgId)}
                    onJoinGroup={onJoinGroup}
                    conversationId={contact?.conversationId}
                    isGroup={contact?.isGroup}
                    isPendingConversation={!contact?.isGroup && isPending}
                    totalParticipants={safeParticipants.length || 2}
                    isSearchResult={isSearchResult}
                    isCurrentMatch={isCurrentMatch}
                    customTheme={localTheme}
                    isSelected={selectedMessage?._id === msg._id}
                    onSelectMessage={(selected) => {
                      setSelectedMessage(prev => prev?._id === selected?._id ? null : selected)
                    }}
                  />
                </div>
              )
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-800">
                <img
                  src={contact?.avatar || 'https://api.dicebear.com/7.x/shapes/svg?seed=avatar'}
                  alt={contact?.name || 'Chat'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-zinc-300 font-semibold">{contact?.name || 'Chat'}</p>
                <p className="text-sm text-zinc-500 mt-1">
                  Send a message to start the conversation 👋
                </p>
              </div>
            </div>
          )}

          {/* ── Typing Indicator ──────────────────────── */}
          <AnimatePresence>
            {isTyping && (
              <TypingIndicator
                key="typing-indicator"
                typingUsers={typingUsers}
                isGroup={contact?.isGroup}
              />
            )}
          </AnimatePresence>

          {/* Bottom Anchor for Instant Scroll */}
          <div ref={messagesEndRef} className="h-px w-full" />
        </div>

        {/* ── Fixed Bottom Input or Banner ───────────────────────── */}
        {isGroupInvite ? (
          <div className="flex-shrink-0 p-4 border-t border-zinc-800 bg-zinc-900">
            <div className="bg-zinc-800/90 rounded-2xl p-4 text-center border border-zinc-700/50 shadow-xl max-w-lg mx-auto">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto mb-2.5 shadow-inner">
                <Users size={20} />
              </div>
              <p className="text-sm text-zinc-100 font-semibold mb-1">
                Undangan Bergabung ke Grup
              </p>
              <p className="text-xs text-zinc-400 mb-3.5">
                Anda diundang untuk bergabung ke grup <strong>"{contact?.name || 'Group'}"</strong>. Terima undangan untuk membaca pesan dan mulai mengobrol.
              </p>
              <div className="flex items-center justify-center gap-3">
                <motion.button
                  onClick={onReject}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-2 rounded-xl bg-zinc-700 hover:bg-rose-500/80 text-zinc-200 text-sm font-semibold transition-colors cursor-pointer"
                >
                  Tolak
                </motion.button>
                <motion.button
                  onClick={onAccept}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors cursor-pointer shadow-lg shadow-indigo-500/30"
                >
                  Gabung Grup
                </motion.button>
              </div>
            </div>
          </div>
        ) : isReceiver ? (
          <div className="flex-shrink-0 p-4 border-t border-zinc-800 bg-zinc-900">
            <div className="bg-zinc-800/90 rounded-2xl p-4 text-center border border-zinc-700/50 shadow-xl max-w-lg mx-auto">
              <p className="text-sm text-zinc-100 font-semibold mb-1">
                {contact?.name} {t('wantsToMessage')}
              </p>
              <p className="text-xs text-zinc-400 mb-3">
                {t('acceptPrompt')}
              </p>
              <div className="flex items-center justify-center gap-3">
                <motion.button
                  onClick={onReject}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-2 rounded-xl bg-zinc-700 hover:bg-rose-500/80 text-zinc-200 text-sm font-semibold transition-colors cursor-pointer"
                >
                  {t('reject')}
                </motion.button>
                <motion.button
                  onClick={onAccept}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors cursor-pointer shadow-lg shadow-indigo-500/30"
                >
                  {t('accept')}
                </motion.button>
              </div>
            </div>
          </div>
        ) : (isInitiator && safeMessages.length > 0) ? (
          <div className="flex-shrink-0 p-4 border-t border-zinc-800 bg-zinc-900">
            <div className="bg-zinc-800/90 rounded-2xl p-4 text-center border border-zinc-700/50 shadow-xl max-w-lg mx-auto">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-2">
                <Clock size={16} />
              </div>
              <p className="text-sm text-zinc-100 font-semibold mb-1">
                {t('messageRequestSent')}
              </p>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                {t('awaitingApproval')}
              </p>
            </div>
          </div>
        ) : (
          <ChatInput
            onSend={(payload) => {
              onSendMessage({ ...payload, isEphemeral: isVanishMode })
              setReplyingTo(null)
            }}
            onTypingStart={onTypingStart}
            onTypingStop={onTypingStop}
            isVanishMode={isVanishMode}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            editingMessage={editingMessage}
            onCancelEdit={() => setEditingMessage(null)}
            onSaveEdit={(id, text) => {
              onEditMessage?.(id, text)
              setEditingMessage(null)
            }}
          />
        )}
      </motion.div>

      {/* ── Delete Choice Modal for Selected Message ── */}
      {selectedMessage && (
        <DeleteChoiceModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false)
            setSelectedMessage(null)
          }}
          isOwn={(selectedMessage.sender?._id || selectedMessage.sender) === (currentUser?.id || currentUser?._id)}
          onDeleteForMe={() => {
            onDeleteMessage?.(selectedMessage._id, false)
            setShowDeleteModal(false)
            setSelectedMessage(null)
          }}
          onDeleteForEveryone={() => {
            onDeleteMessage?.(selectedMessage._id, true)
            setShowDeleteModal(false)
            setSelectedMessage(null)
          }}
        />
      )}

      {/* ── Theme & Wallpaper Customization Modal ─────────────────── */}
      <ThemeModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        conversationId={contact?.conversationId}
        currentTheme={localTheme}
        onThemeUpdated={(newTheme) => {
          setLocalTheme(newTheme)
          triggerToast('✨ Tema & wallpaper chat diperbarui!')
        }}
      />
    </>
  )
}
