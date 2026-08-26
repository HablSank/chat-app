import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Search, Edit, LogOut, Settings } from 'lucide-react'
import ChatItem from './ChatItem'
import { useAuth } from '../context/AuthContext'
import ProfileSettings from './ProfileSettings'

export default function Sidebar({ selectedId, onSelect, refreshTrigger }) {
  const { user, token, logout } = useAuth()
  const [query, setQuery] = useState('')
  const [conversations, setConversations] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const searchInputRef = useRef(null)

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await fetch('/api/conversations', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (res.ok) {
          setConversations(data)
        }
      } catch (err) {
        console.error('Failed to fetch conversations', err)
      }
    }
    if (token) {
      fetchConversations()
    }
  }, [token, refreshTrigger])

  // Search users
  useEffect(() => {
    const searchUsers = async () => {
      if (!query.trim()) {
        setSearchResults([])
        setIsSearching(false)
        return
      }
      setIsSearching(true)
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (res.ok) {
          setSearchResults(data)
        }
      } catch (err) {
        console.error('Search failed', err)
      } finally {
        setIsSearching(false)
      }
    }

    const timer = setTimeout(() => {
      searchUsers()
    }, 300)

    return () => clearTimeout(timer)
  }, [query, token])

  const handleSelectConversation = (conv) => {
    const otherParticipant = conv.participants.find(p => p._id !== user.id)
    if (!otherParticipant) return
    onSelect({
      id: otherParticipant._id,
      name: otherParticipant.displayName || otherParticipant.username,
      username: otherParticipant.username,
      avatar: otherParticipant.avatar,
      presence: otherParticipant.presence,
      statusEmoji: otherParticipant.statusEmoji,
      conversationId: conv._id,
      status: conv.status,
      initiator: conv.initiator
    })
    setQuery('')
  }

  const handleSelectUser = (searchUser) => {
    onSelect({
      id: searchUser._id,
      name: searchUser.displayName || searchUser.username,
      username: searchUser.username,
      avatar: searchUser.avatar,
      presence: searchUser.presence,
      statusEmoji: searchUser.statusEmoji,
      conversationId: null,
      status: 'new'
    })
    setQuery('')
  }

  return (
    <>
      <ProfileSettings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800">
        {/* ── Profile Header ──────────────────────────── */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex-shrink-0 cursor-pointer" onClick={() => setIsSettingsOpen(true)}>
              <img
                src={user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'}
                alt={user?.username || 'User'}
                className="w-10 h-10 rounded-full bg-zinc-700 object-cover ring-1 ring-zinc-700 hover:ring-indigo-500 transition-all"
              />
              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 ${
                user?.presence === 'online' ? 'bg-emerald-400' : 
                user?.presence === 'idle' ? 'bg-yellow-400' : 
                user?.presence === 'dnd' ? 'bg-red-400' : 'bg-emerald-400'
              }`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-100 leading-tight truncate flex items-center gap-1.5">
                {user?.displayName || user?.username || 'User'}
                {user?.statusEmoji && <span>{user?.statusEmoji}</span>}
              </p>
              <p className={`text-xs ${
                user?.presence === 'idle' ? 'text-yellow-400' : 
                user?.presence === 'dnd' ? 'text-red-400' : 'text-emerald-400'
              }`}>
                {user?.presence === 'idle' ? 'Away' : user?.presence === 'dnd' ? 'Do Not Disturb' : 'Active now'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Settings button */}
            <motion.button
              id="sidebar-settings-btn"
              onClick={() => setIsSettingsOpen(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title="Profile Settings"
            >
              <Settings size={16} />
            </motion.button>
            {/* New chat / compose button -> focuses search */}
            <motion.button
              id="sidebar-compose-btn"
              onClick={() => searchInputRef.current?.focus()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title="New chat"
            >
              <Edit size={16} />
            </motion.button>
            {/* Logout button */}
            <motion.button
              onClick={logout}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </motion.button>
          </div>
        </div>

        {/* ── Search Bar ──────────────────────────────── */}
        <div className="px-4 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2 bg-zinc-800 rounded-2xl px-3 py-2 border border-transparent focus-within:border-zinc-700 transition-colors">
            <Search size={15} className="text-zinc-500 flex-shrink-0" />
            <input
              ref={searchInputRef}
              id="sidebar-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users..."
              className="bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none flex-1"
            />
          </div>
        </div>

        {/* ── Section Label ───────────────────────────── */}
        <div className="px-4 pb-2 flex-shrink-0 flex justify-between items-center">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
            {query ? 'Search Results' : 'Messages'}
          </p>
        </div>

        {/* ── Scrollable List ─────────────────────── */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
          {query ? (
            /* Search Results */
            isSearching ? (
              <p className="text-sm text-zinc-500 text-center mt-4">Searching...</p>
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
                  }}
                  isSelected={u._id === selectedId}
                  onClick={() => handleSelectUser(u)}
                />
              ))
            ) : (
              <p className="text-sm text-zinc-500 text-center mt-8">No users found</p>
            )
          ) : (
            /* Conversations */
            conversations.length > 0 ? (
              conversations.map((conv) => {
                const other = conv.participants.find(p => p._id !== user.id)
                if (!other) return null
                const isPending = conv.status === 'pending'
                const isReceiver = isPending && conv.initiator !== user.id

                return (
                  <div key={conv._id} className="relative">
                    <ChatItem
                      contact={{
                        id: other._id,
                        name: other.displayName || other.username,
                        avatar: other.avatar,
                        presence: other.presence,
                        statusEmoji: other.statusEmoji,
                        lastMessage: conv.lastMessage?.imageUrls?.length > 0 || conv.lastMessage?.imageUrl
                          ? '📷 Shared an image'
                          : conv.lastMessage?.text || '',
                        timestamp: conv.lastMessage?.createdAt
                          ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '',
                        unreadCount: conv.unreadCount || 0,
                      }}
                      isSelected={other._id === selectedId}
                      onClick={() => handleSelectConversation(conv)}
                    />
                    {isReceiver && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        NEW
                      </span>
                    )}
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-zinc-500 text-center mt-8">
                Search for users to start a chat
              </p>
            )
          )}
        </div>
      </div>
    </>
  )
}
