import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, UserPlus, Sparkles, MessageSquarePlus } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { getApiUrl } from '../config/api'
import ChatItem from './ChatItem'

export default function NewChatModal({ isOpen, onClose, onSelectUser }) {
  const { t } = useLanguage()
  const { token, user: currentUser } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setSearchResults([])
      return
    }

    const trimmed = searchQuery.trim().replace(/^@/, '')
    const search = async () => {
      setIsSearching(true)
      try {
        const url = trimmed
          ? `/api/users/search?q=${encodeURIComponent(trimmed)}`
          : '/api/users/search'
        const res = await fetch(getApiUrl(url), {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (res.ok) {
          const filtered = data.filter((u) => u._id !== (currentUser?.id || currentUser?._id))
          setSearchResults(filtered)
        }
      } catch (err) {
        console.error('Failed to search users in NewChatModal:', err)
      } finally {
        setIsSearching(false)
      }
    }

    const timer = setTimeout(search, trimmed ? 250 : 0)
    return () => clearTimeout(timer)
  }, [searchQuery, isOpen, token, currentUser])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          id="new-chat-modal"
          className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/90 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <MessageSquarePlus size={18} />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-zinc-100">{t('createNewChat')}</h2>
                <p className="text-[11px] text-zinc-400">{t('globalUserSearch')}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Search Box */}
          <div className="p-4 border-b border-zinc-800/80 bg-zinc-950/40 flex-shrink-0">
            <div className="flex items-center gap-2 bg-zinc-850 px-3.5 py-2.5 rounded-xl border border-zinc-700/60 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/30 transition-all">
              <Search size={16} className="text-zinc-400 flex-shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchMembersPlaceholder')}
                className="bg-transparent text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 outline-none flex-1"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* User Results List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {isSearching ? (
              <div className="flex flex-col items-center justify-center py-10 text-zinc-400 gap-2">
                <Sparkles size={20} className="animate-spin text-indigo-400" />
                <span className="text-xs">{t('checkingUpdates')}</span>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((u) => (
                <ChatItem
                  key={u._id}
                  contact={{
                    id: u._id,
                    name: u.displayName || u.username,
                    avatar: u.avatar,
                    presence: u.presence,
                    statusEmoji: u.statusEmoji,
                    isGroup: false,
                    status: u.isLocked ? 'new' : 'accepted',
                  }}
                  isSelected={false}
                  onClick={() => {
                    onSelectUser(u)
                    onClose()
                  }}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
                <UserPlus size={28} className="text-zinc-600 mb-2" />
                <p className="text-xs font-medium">{t('noUsersFoundPrompt')}</p>
                <p className="text-[11px] text-zinc-600 mt-1 max-w-xs">{t('searchEmptyPrompt')}</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
