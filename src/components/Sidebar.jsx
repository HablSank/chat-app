import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, LogOut, MessageSquare, Settings, Users, Edit, Download } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { usePWAInstall } from '../hooks/usePWAInstall'
import { decryptMessage } from '../utils/crypto'
import { getApiUrl } from '../config/api'
import ChatItem from './ChatItem'
import ProfileSettings from './ProfileSettings'
import CreateGroupModal from './CreateGroupModal'
import PWAInstallBanner from './PWAInstallBanner'
import IOSInstallGuideModal from './IOSInstallGuideModal'

export default function Sidebar({ selectedId, onSelect, refreshTrigger }) {
  const { user, token, logout } = useAuth()
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall()
  const [query, setQuery] = useState('')
  const [conversations, setConversations] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const searchInputRef = useRef(null)

  const handleInstallPWA = async () => {
    if (isIOS) {
      setShowIOSGuide(true)
    } else {
      const res = await promptInstall()
      if (res.isIOS) {
        setShowIOSGuide(true)
      }
    }
  }

  // Auto-trigger profile edit modal for first-time signups
  useEffect(() => {
    if (sessionStorage.getItem('ping_first_time_signup') === 'true') {
      sessionStorage.removeItem('ping_first_time_signup')
      setIsSettingsOpen(true)
    }
  }, [])

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await fetch(getApiUrl('/api/conversations'), {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (res.ok) {
          const decryptedData = await Promise.all(
            data.map(async (conv) => {
              if (conv.lastMessage?.text) {
                const decrypted = await decryptMessage(conv.lastMessage.text, conv._id)
                return {
                  ...conv,
                  lastMessage: {
                    ...conv.lastMessage,
                    text: decrypted,
                  }
                }
              }
              return conv
            })
          )
          setConversations(decryptedData)
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
        const res = await fetch(getApiUrl(`/api/users/search?q=${encodeURIComponent(query)}`), {
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
    if (conv.isGroup) {
      onSelect({
        id: conv._id,
        name: conv.groupName || 'Group Chat',
        username: conv.groupName || 'Group Chat',
        avatar: conv.groupAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(conv.groupName || 'group')}`,
        isGroup: true,
        groupName: conv.groupName,
        groupAvatar: conv.groupAvatar,
        groupAdmin: conv.groupAdmin,
        groupAdmins: conv.groupAdmins || (conv.groupAdmin ? [conv.groupAdmin] : []),
        participants: conv.participants || [],
        conversationId: conv._id,
        status: 'accepted',
        initiator: conv.initiator,
      })
      setQuery('')
      return
    }

    const otherParticipant = conv.participants.find(p => p._id !== user.id)
    if (!otherParticipant) return
    onSelect({
      id: otherParticipant._id,
      name: otherParticipant.displayName || otherParticipant.username,
      username: otherParticipant.username,
      avatar: otherParticipant.avatar,
      presence: otherParticipant.presence,
      isOnline: otherParticipant.isOnline,
      lastSeen: otherParticipant.lastSeen,
      statusEmoji: otherParticipant.statusEmoji,
      isGroup: false,
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
      isOnline: searchUser.isOnline,
      lastSeen: searchUser.lastSeen,
      statusEmoji: searchUser.statusEmoji,
      isGroup: false,
      conversationId: null,
      status: 'new'
    })
    setQuery('')
  }

  const handleGroupCreated = (newGroup) => {
    setConversations(prev => [newGroup, ...prev.filter(c => c._id !== newGroup._id)])
    handleSelectConversation(newGroup)
  }

  return (
    <>
      <ProfileSettings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onGroupCreated={handleGroupCreated}
      />
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
                user?.presence === 'away' || user?.presence === 'idle' || user?.status === 'away' || user?.status === 'idle'
                  ? 'bg-amber-400'
                  : user?.presence === 'busy' || user?.presence === 'dnd' || user?.status === 'busy' || user?.status === 'dnd'
                  ? 'bg-rose-500'
                  : user?.presence === 'offline' || user?.status === 'offline'
                  ? 'bg-zinc-400'
                  : 'bg-emerald-400'
              }`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-100 leading-tight truncate flex items-center gap-1.5">
                {user?.displayName || user?.username || 'User'}
                {user?.statusEmoji && <span>{user?.statusEmoji}</span>}
              </p>
              <p className={`text-xs font-medium ${
                user?.presence === 'away' || user?.presence === 'idle' || user?.status === 'away' || user?.status === 'idle'
                  ? 'text-amber-400'
                  : user?.presence === 'busy' || user?.presence === 'dnd' || user?.status === 'busy' || user?.status === 'dnd'
                  ? 'text-rose-500'
                  : user?.presence === 'offline' || user?.status === 'offline'
                  ? 'text-zinc-400'
                  : 'text-emerald-400'
              }`}>
                {user?.presence === 'away' || user?.presence === 'idle' || user?.status === 'away' || user?.status === 'idle'
                  ? 'Away'
                  : user?.presence === 'busy' || user?.presence === 'dnd' || user?.status === 'busy' || user?.status === 'dnd'
                  ? 'Busy'
                  : user?.presence === 'offline' || user?.status === 'offline'
                  ? 'Offline'
                  : 'Online'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Install PWA button (Hidden when running standalone) */}
            {!isInstalled && isInstallable && (
              <motion.button
                id="sidebar-install-pwa-btn"
                onClick={handleInstallPWA}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-8 h-8 flex items-center justify-center rounded-full text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 transition-colors cursor-pointer"
                title="Install Ping! App"
              >
                <Download size={16} />
              </motion.button>
            )}
            {/* Create Group button */}
            <motion.button
              id="sidebar-create-group-btn"
              onClick={() => setIsCreateGroupOpen(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-indigo-300 hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Create New Group"
            >
              <Users size={16} />
            </motion.button>
            {/* Settings button */}
            <motion.button
              id="sidebar-settings-btn"
              onClick={() => setIsSettingsOpen(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
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
              className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
              title="New chat"
            >
              <Edit size={16} />
            </motion.button>
            {/* Logout button */}
            <motion.button
              onClick={logout}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut size={16} />
            </motion.button>
          </div>
        </div>

        {/* ── PWA Install Prompt Banner ───────────────── */}
        <PWAInstallBanner />

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
                    isGroup: false,
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
                if (conv.isGroup) {
                  return (
                    <div key={conv._id} className="relative">
                      <ChatItem
                        contact={{
                          id: conv._id,
                          name: conv.groupName || 'Group Chat',
                          avatar: conv.groupAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(conv.groupName || 'group')}`,
                          isGroup: true,
                          participantsCount: conv.participants?.length || 0,
                          lastMessage: conv.lastMessage?.isSystem
                            ? conv.lastMessage.systemText
                            : conv.lastMessage?.audioUrl
                            ? '🎵 Voice note'
                            : conv.lastMessage?.imageUrls?.length > 0 || conv.lastMessage?.imageUrl
                            ? '📷 Shared an image'
                            : conv.lastMessage?.text || '',
                          timestamp: conv.lastMessage?.createdAt
                            ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '',
                          unreadCount: conv.unreadCount || 0,
                        }}
                        isSelected={conv._id === selectedId}
                        onClick={() => handleSelectConversation(conv)}
                      />
                    </div>
                  )
                }

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
                        isGroup: false,
                        lastMessage: conv.lastMessage?.audioUrl
                          ? '🎵 Voice note'
                          : conv.lastMessage?.imageUrls?.length > 0 || conv.lastMessage?.imageUrl
                          ? '📷 Shared an image'
                          : conv.lastMessage?.text || '',
                        timestamp: conv.lastMessage?.createdAt
                          ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '',
                        unreadCount: conv.unreadCount || 0,
                      }}
                      isSelected={other._id === selectedId}
                      onClick={() => handleSelectConversation(conv)}
                      isNew={isReceiver}
                    />
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-zinc-500 text-center mt-8">
                Search for users or create a group to start chatting
              </p>
            )
          )}
        </div>
      </div>
      <IOSInstallGuideModal isOpen={showIOSGuide} onClose={() => setShowIOSGuide(false)} />
    </>
  )
}
