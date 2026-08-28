import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Users,
  MoreVertical,
  Search,
  Image as ImageIcon,
  Clock,
  Phone,
  Video,
  Trash2,
  Sparkles,
  Shield,
  Info,
  Lock,
  Palette,
} from 'lucide-react'

export default function ChatHeader({
  contact,
  isMobile,
  onBack,
  onOpenProfile,
  onOpenGroupInfo,
  onOpenTheme,
  groupMemberNames,
  formatLastSeen,
  isSearchOpen,
  onToggleSearch,
  isMediaSidebarOpen,
  onToggleMediaSidebar,
  isVanishMode,
  onToggleVanishMode,
  onVoiceCall,
  onVideoCall,
  onClearChat,
  onDeleteChat,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const isAccepted = contact.isGroup || contact.status === 'accepted'

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false)
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  const handleMenuItemClick = (action) => {
    setIsMenuOpen(false)
    action?.()
  }

  return (
    <div className="h-16 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between flex-shrink-0 z-30">
      {/* Left: Back button (Mobile only) + Contact / Group Info */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
        {isMobile && (
          <button
            onClick={onBack}
            className="text-zinc-400 hover:text-zinc-200 p-1.5 -ml-1 rounded-full hover:bg-zinc-800 transition-colors flex-shrink-0 cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
        )}

        <button
          type="button"
          id="chatroom-friend-profile-btn"
          onClick={() => {
            if (contact.isGroup) {
              onOpenGroupInfo?.()
            } else {
              onOpenProfile?.()
            }
          }}
          className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0 text-left group cursor-pointer"
        >
          <div className="relative flex-shrink-0">
            <img
              src={contact.avatar}
              alt={contact.name}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-700 object-cover group-hover:opacity-90 transition-opacity"
            />
            {contact.isGroup ? (
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-indigo-600 border-2 border-zinc-900 flex items-center justify-center text-white">
                <Users size={8} />
              </span>
            ) : isAccepted && (
              (contact.isOnline || (contact.presence && contact.presence !== 'offline')) && (
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 ${
                    contact.presence === 'idle' || contact.presence === 'away'
                      ? 'bg-amber-400'
                      : contact.presence === 'dnd' || contact.presence === 'busy'
                      ? 'bg-red-400'
                      : 'bg-emerald-400 animate-pulse'
                  }`}
                  title={
                    contact.presence === 'idle' || contact.presence === 'away'
                      ? 'Away'
                      : contact.presence === 'dnd' || contact.presence === 'busy'
                      ? 'Busy'
                      : 'Online'
                  }
                />
              )
            )}
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-sm sm:text-base font-semibold text-zinc-100 truncate group-hover:text-indigo-300 transition-colors">
                {contact.name}
              </p>
              {contact.isGroup && (
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-md font-medium flex-shrink-0">
                  Group
                </span>
              )}
            </div>

            {/* Status / Last seen line — Truncated & readable */}
            {contact.isGroup ? (
              <p className="text-xs text-zinc-400 truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                {groupMemberNames}
              </p>
            ) : !isAccepted ? (
              <div className="flex items-center gap-1 text-xs truncate text-amber-400/90 font-medium">
                <Lock size={10} className="flex-shrink-0" />
                <span className="truncate">Menunggu Persetujuan</span>
              </div>
            ) : (contact.isOnline || (contact.presence && contact.presence !== 'offline')) && (contact.presence === 'idle' || contact.presence === 'away') ? (
              <div className="flex items-center gap-1.5 text-xs truncate">
                <span className="flex items-center gap-1 text-amber-400 font-medium truncate">
                  <span className="truncate">Away</span>
                  {contact.statusEmoji && <span className="flex-shrink-0">{contact.statusEmoji}</span>}
                </span>
              </div>
            ) : (contact.isOnline || (contact.presence && contact.presence !== 'offline')) && (contact.presence === 'dnd' || contact.presence === 'busy') ? (
              <div className="flex items-center gap-1.5 text-xs truncate">
                <span className="flex items-center gap-1 text-red-400 font-medium truncate">
                  <span className="truncate">Busy</span>
                  {contact.statusEmoji && <span className="flex-shrink-0">{contact.statusEmoji}</span>}
                </span>
              </div>
            ) : (contact.isOnline || (contact.presence && contact.presence !== 'offline')) ? (
              <div className="flex items-center gap-1.5 text-xs truncate">
                <span className="flex items-center gap-1 text-emerald-400 font-medium truncate">
                  <span className="truncate">Online</span>
                  {contact.statusEmoji && <span className="flex-shrink-0">{contact.statusEmoji}</span>}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs truncate">
                <span className="text-zinc-400 truncate">
                  {formatLastSeen ? formatLastSeen(contact.lastSeen) : 'Offline'}
                  {contact.statusEmoji && <span className="ml-1">{contact.statusEmoji}</span>}
                </span>
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Right: Quick Action (Search on desktop) + Single 3-Dot Dropdown Menu */}
      <div className="flex items-center gap-1 flex-shrink-0 relative" ref={menuRef}>
        {/* Search quick button (Desktop only) */}
        <motion.button
          id="chatroom-desktop-search-btn"
          type="button"
          onClick={onToggleSearch}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`hidden sm:flex w-8 h-8 items-center justify-center rounded-full transition-colors cursor-pointer ${
            isSearchOpen
              ? 'text-indigo-400 bg-indigo-500/20 border border-indigo-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="Cari Pesan"
        >
          <Search size={16} />
        </motion.button>

        {/* 3-Dot Menu Button */}
        <motion.button
          id="chatroom-menu-btn"
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
            isMenuOpen
              ? 'text-indigo-400 bg-zinc-800'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="Menu Opsi"
        >
          <MoreVertical size={18} />
        </motion.button>

        {/* ── Dropdown Menu ────────────────────────────────────────── */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ type: 'spring', stiffness: 450, damping: 28 }}
              className="absolute right-0 top-10 w-56 sm:w-60 bg-zinc-900/95 border border-zinc-700/80 rounded-2xl shadow-2xl backdrop-blur-xl py-1.5 z-50 overflow-hidden"
            >
              {/* 1. Search */}
              <button
                type="button"
                onClick={() => handleMenuItemClick(onToggleSearch)}
                className="w-full px-3.5 py-2.5 flex items-center gap-3 text-xs sm:text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors cursor-pointer text-left"
              >
                <Search size={16} className="text-indigo-400 flex-shrink-0" />
                <span className="flex-1 font-medium">Cari Pesan</span>
              </button>

              {/* 2. Media Files */}
              <button
                type="button"
                onClick={() => handleMenuItemClick(onToggleMediaSidebar)}
                className="w-full px-3.5 py-2.5 flex items-center gap-3 text-xs sm:text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors cursor-pointer text-left"
              >
                <ImageIcon size={16} className="text-emerald-400 flex-shrink-0" />
                <span className="flex-1 font-medium">Berkas Media</span>
              </button>

              {/* 3. Vanish Mode */}
              <button
                type="button"
                onClick={() => handleMenuItemClick(onToggleVanishMode)}
                className="w-full px-3.5 py-2.5 flex items-center gap-3 text-xs sm:text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors cursor-pointer text-left"
              >
                <Clock size={16} className="text-amber-400 flex-shrink-0" />
                <span className="flex-1 font-medium">Pesan Sementara</span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    isVanishMode
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {isVanishMode ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* 4. Custom Theme & Wallpaper */}
              <button
                type="button"
                id="chatheader-theme-btn"
                onClick={() => handleMenuItemClick(onOpenTheme)}
                className="w-full px-3.5 py-2.5 flex items-center gap-3 text-xs sm:text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors cursor-pointer text-left"
              >
                <Palette size={16} className="text-pink-400 flex-shrink-0" />
                <span className="flex-1 font-medium">Tema & Wallpaper Chat</span>
              </button>

              {/* 5. Voice Call */}
              <button
                type="button"
                onClick={() => handleMenuItemClick(onVoiceCall)}
                className="w-full px-3.5 py-2.5 flex items-center gap-3 text-xs sm:text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors cursor-pointer text-left"
              >
                <Phone size={16} className="text-sky-400 flex-shrink-0" />
                <span className="flex-1 font-medium">Panggilan Suara</span>
              </button>

              {/* 6. Video Call */}
              <button
                type="button"
                onClick={() => handleMenuItemClick(onVideoCall)}
                className="w-full px-3.5 py-2.5 flex items-center gap-3 text-xs sm:text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors cursor-pointer text-left"
              >
                <Video size={16} className="text-violet-400 flex-shrink-0" />
                <span className="flex-1 font-medium">Panggilan Video</span>
              </button>

              {/* 7. Info / Profile Details */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false)
                  if (contact.isGroup) {
                    onOpenGroupInfo?.()
                  } else {
                    onOpenProfile?.()
                  }
                }}
                className="w-full px-3.5 py-2.5 flex items-center gap-3 text-xs sm:text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors cursor-pointer text-left"
              >
                <Info size={16} className="text-zinc-400 flex-shrink-0" />
                <span className="flex-1 font-medium">
                  {contact.isGroup ? 'Info Grup' : 'Info Kontak'}
                </span>
              </button>

              <div className="h-px bg-zinc-800 my-1 mx-2" />

              {/* 7. Clear Chat */}
              <button
                type="button"
                onClick={() => handleMenuItemClick(onClearChat)}
                className="w-full px-3.5 py-2.5 flex items-center gap-3 text-xs sm:text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer text-left"
              >
                <Trash2 size={16} className="flex-shrink-0" />
                <span className="flex-1 font-medium">Bersihkan Chat</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
