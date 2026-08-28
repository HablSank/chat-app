import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, LogOut, Settings, Users, User, Download, Archive, ArrowLeft, MessageSquarePlus, CheckSquare, Trash2, Check, X, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { usePWAInstall } from '../hooks/usePWAInstall'
import { useAutoUpdate } from '../hooks/useAutoUpdate'
import { decryptMessage } from '../utils/crypto'
import { getApiUrl } from '../config/api'
import ChatItem from './ChatItem'
import ProfileSettings from './ProfileSettings'
import SettingsModal from './SettingsModal'
import CreateGroupModal from './CreateGroupModal'
import NewChatModal from './NewChatModal'
import PWAInstallBanner from './PWAInstallBanner'
import PWAInstallGuideModal from './PWAInstallGuideModal'
import AppUpdateBanner from './AppUpdateBanner'

export default function Sidebar({ selectedId, onSelect, refreshTrigger }) {
  const { user, token, logout, isProfileOpen, setIsProfileOpen } = useAuth()
  const { t } = useLanguage()
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall()
  const { updateAvailable, reloadApp, setUpdateAvailable } = useAutoUpdate()
  const [query, setQuery] = useState('')
  const [conversations, setConversations] = useState([])
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
  const [isNewChatOpen, setIsNewChatOpen] = useState(false)
  const [showInstallGuide, setShowInstallGuide] = useState(false)

  const handleOpenSettings = useCallback(() => setIsSettingsOpen(true), [])
  const handleCloseSettings = useCallback(() => setIsSettingsOpen(false), [])
  const handleOpenProfile = useCallback(() => setIsProfileOpen?.(true), [setIsProfileOpen])
  const handleCloseProfile = useCallback(() => setIsProfileOpen?.(false), [setIsProfileOpen])
  const handleOpenCreateGroup = useCallback(() => setIsCreateGroupOpen(true), [])
  const handleCloseCreateGroup = useCallback(() => setIsCreateGroupOpen(false), [])
  const handleOpenNewChat = useCallback(() => setIsNewChatOpen(true), [])
  const handleCloseNewChat = useCallback(() => setIsNewChatOpen(false), [])

  // Phase 15.22-FIX: Pin and Archive states from MongoDB with real-time sync
  const [isViewingArchive, setIsViewingArchive] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)
  const toastTimerRef = useRef(null)
  const searchInputRef = useRef(null)

  // Phase 15.42: WhatsApp Multi-Select Batch Actions State
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedChatIds, setSelectedChatIds] = useState([])
  const [isBatchProcessing, setIsBatchProcessing] = useState(false)

  const currentUserId = (user?.id || user?._id || '').toString()

  const triggerToast = (msg) => {
    setToastMessage(msg)
    setShowToast(true)
    clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setShowToast(false), 2400)
  }

  // Toggle selection for a single chat item
  const handleToggleCheckChat = (contact) => {
    const convId = (contact.conversationId || contact.id || '').toString()
    if (!convId) return
    setSelectedChatIds((prev) =>
      prev.includes(convId) ? prev.filter((id) => id !== convId) : [...prev, convId]
    )
  }

  // Select all or deselect all
  const handleToggleSelectAll = (allList) => {
    const allIds = allList.map((c) => (c.conversationId || c._id || '').toString()).filter(Boolean)
    if (selectedChatIds.length === allIds.length) {
      setSelectedChatIds([])
    } else {
      setSelectedChatIds(allIds)
    }
  }

  // Batch Archive / Unarchive
  const handleBatchArchive = async () => {
    if (selectedChatIds.length === 0 || isBatchProcessing) return
    setIsBatchProcessing(true)
    const shouldArchive = !isViewingArchive

    try {
      const res = await fetch(getApiUrl('/api/conversations/batch-archive'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationIds: selectedChatIds,
          archive: shouldArchive,
        }),
      })

      if (res.ok) {
        setConversations((prev) =>
          prev.map((c) => {
            const cid = c._id.toString()
            if (!selectedChatIds.includes(cid)) return c
            let archivedBy = Array.isArray(c.archivedBy) ? [...c.archivedBy] : []
            if (shouldArchive) {
              if (!archivedBy.some((id) => (id?._id?.toString() || id?.toString()) === currentUserId)) {
                archivedBy.push(currentUserId)
              }
            } else {
              archivedBy = archivedBy.filter((id) => (id?._id?.toString() || id?.toString()) !== currentUserId)
            }
            return { ...c, archivedBy }
          })
        )
        triggerToast(shouldArchive ? t('batchArchiveSuccess') : t('unarchiveSelected'))
        setSelectedChatIds([])
        setIsSelectMode(false)
      }
    } catch (err) {
      console.error('Batch archive failed:', err)
    } finally {
      setIsBatchProcessing(false)
    }
  }

  // Batch Delete
  const handleBatchDelete = async () => {
    if (selectedChatIds.length === 0 || isBatchProcessing) return
    setIsBatchProcessing(true)

    try {
      const res = await fetch(getApiUrl('/api/conversations/batch-delete'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationIds: selectedChatIds,
        }),
      })

      if (res.ok) {
        setConversations((prev) => prev.filter((c) => !selectedChatIds.includes(c._id.toString())))
        triggerToast(t('batchDeleteSuccess'))
        setSelectedChatIds([])
        setIsSelectMode(false)
      }
    } catch (err) {
      console.error('Batch delete failed:', err)
    } finally {
      setIsBatchProcessing(false)
    }
  }

  // Cross-device synced toggle pin
  const handleTogglePin = async (contact) => {
    const convId = (contact.conversationId || contact.id || '').toString()
    if (!convId || !currentUserId) return

    if (contact.isArchived || isViewingArchive) {
      triggerToast('⚠️ Chat yang diarsipkan tidak dapat disematkan')
      return
    }

    try {
      const res = await fetch(getApiUrl(`/api/conversations/${convId}/pin`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json()
      if (res.ok) {
        let decryptedText = data.lastMessage?.text || ''
        if (data.lastMessage?.text) {
          decryptedText = await decryptMessage(data.lastMessage.text, data._id)
        }
        const updatedObj = {
          ...data,
          lastMessage: data.lastMessage ? { ...data.lastMessage, text: decryptedText } : null,
        }
        setConversations(prev => prev.map(c => c._id.toString() === data._id.toString() ? updatedObj : c))

        const isNowPinned = Array.isArray(data.pinnedBy) && data.pinnedBy.some(p => (p?._id?.toString() || p?.toString()) === currentUserId)
        triggerToast(isNowPinned ? '📌 Chat disematkan ke atas' : '📌 Sematan chat dilepas')
      } else {
        triggerToast(`⚠️ ${data.message || 'Gagal mengubah sematan chat'}`)
      }
    } catch (err) {
      console.error('Failed to toggle pin:', err)
    }
  }

  // Cross-device synced toggle archive
  const handleToggleArchive = async (contact) => {
    const convId = (contact.conversationId || contact.id || '').toString()
    if (!convId || !currentUserId) return

    try {
      const res = await fetch(getApiUrl(`/api/conversations/${convId}/archive`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json()
      if (res.ok) {
        let decryptedText = data.lastMessage?.text || ''
        if (data.lastMessage?.text) {
          decryptedText = await decryptMessage(data.lastMessage.text, data._id)
        }
        const updatedObj = {
          ...data,
          lastMessage: data.lastMessage ? { ...data.lastMessage, text: decryptedText } : null,
        }
        setConversations(prev => prev.map(c => c._id.toString() === data._id.toString() ? updatedObj : c))

        const isNowArchived = Array.isArray(data.archivedBy) && data.archivedBy.some(p => (p?._id?.toString() || p?.toString()) === currentUserId)
        triggerToast(isNowArchived ? '📦 Chat berhasil diarsipkan' : '📦 Chat dipindahkan dari arsip')
      } else {
        triggerToast(`⚠️ ${data.message || 'Gagal mengubah arsip chat'}`)
      }
    } catch (err) {
      console.error('Failed to toggle archive:', err)
    }
  }

  const handleInstallPWA = async () => {
    if (isIOS) {
      setShowInstallGuide(true)
    } else {
      const res = await promptInstall()
      if (!res.triggered) {
        setShowInstallGuide(true)
      }
    }
  }

  // Auto-trigger profile edit modal for first-time signups
  useEffect(() => {
    if (sessionStorage.getItem('ping_first_time_signup') === 'true') {
      sessionStorage.removeItem('ping_first_time_signup')
      setIsProfileOpen?.(true)
    }
  }, [setIsProfileOpen])

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

  const handleSelectConversation = (conv) => {
    if (conv.isGroup) {
      const isPending = (conv.pendingMembers || []).some(p => (p._id?.toString() || p.toString()) === currentUserId) || !!conv.isPendingInvite || conv.status === 'pending'
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
        members: conv.members || conv.participants || [],
        pendingMembers: conv.pendingMembers || [],
        status: isPending ? 'pending' : 'accepted',
        isPendingInvite: isPending,
        conversationId: conv._id,
        customTheme: conv.customTheme,
      })
      setQuery('')
      return
    }

    const otherParticipant = conv.participants.find(p => (p._id?.toString() || p.toString()) !== currentUserId)
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
      initiator: conv.initiator,
      customTheme: conv.customTheme,
    })
    setQuery('')
  }

  const handleSelectUser = async (searchUser) => {
    const targetUserId = (searchUser?._id || searchUser?.id || '').toString()

    // 1. Check if conversation already exists in loaded sidebar conversations
    const existingConv = conversations.find(c =>
      !c.isGroup && c.participants?.some(p => (p._id?.toString() || p.toString()) === targetUserId)
    )

    if (existingConv) {
      handleSelectConversation(existingConv)
      return
    }

    // 2. Check MongoDB for existing conversation or pending request
    try {
      const res = await fetch(getApiUrl(`/api/conversations/find/${targetUserId}`), {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.conversation) {
          handleSelectConversation(data.conversation)
          return
        }
      }
    } catch (err) {
      console.warn('Find conversation error:', err)
    }

    // 3. Fallback: completely new chat
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
      status: 'pending',
      initiator: user?.id || user?._id
    })
    setQuery('')
  }

  const handleGroupCreated = (newGroup) => {
    setConversations(prev => [newGroup, ...prev.filter(c => c._id !== newGroup._id)])
    handleSelectConversation(newGroup)
  }

  // Split and organize conversations into Active (with Pinned on top) vs Archived using MongoDB state
  const { displayActiveConversations, archivedConversations } = useMemo(() => {
    const archived = []
    const activePinned = []
    const activeUnpinned = []

    conversations.forEach((conv) => {
      const isPinned = Array.isArray(conv.pinnedBy) && conv.pinnedBy.some(p => (p?._id?.toString() || p?.toString()) === currentUserId)
      const isArchived = Array.isArray(conv.archivedBy) && conv.archivedBy.some(p => (p?._id?.toString() || p?.toString()) === currentUserId)

      if (isArchived) {
        archived.push(conv)
      } else if (isPinned) {
        activePinned.push(conv)
      } else {
        activeUnpinned.push(conv)
      }
    })

    return {
      displayActiveConversations: [...activePinned, ...activeUnpinned],
      archivedConversations: archived,
    }
  }, [conversations, currentUserId])

  // Filter conversations locally based on active query with complete null-safety
  const searchFilteredConversations = useMemo(() => {
    const q = (query || '').trim().toLowerCase().replace(/^@/, '')
    if (!q) return []
    const sourceList = Array.isArray(isViewingArchive ? archivedConversations : displayActiveConversations)
      ? (isViewingArchive ? archivedConversations : displayActiveConversations)
      : []
    return sourceList.filter((conv) => {
      if (!conv) return false
      if (conv.isGroup) {
        return (conv.groupName || '').toLowerCase().includes(q)
      }
      const other = Array.isArray(conv.participants)
        ? conv.participants.find(
            (p) => (p?._id?.toString() || p?.toString()) !== currentUserId
          )
        : null
      const nameMatch = other?.displayName ? other.displayName.toLowerCase().includes(q) : false
      const usernameMatch = other?.username ? other.username.toLowerCase().includes(q) : false
      const otherNameMatch = other?.name ? other.name.toLowerCase().includes(q) : false
      const lastMsgMatch = conv.lastMessage?.text ? conv.lastMessage.text.toLowerCase().includes(q) : false
      const sysMsgMatch = conv.lastMessage?.systemText ? conv.lastMessage.systemText.toLowerCase().includes(q) : false
      return nameMatch || usernameMatch || otherNameMatch || lastMsgMatch || sysMsgMatch
    })
  }, [query, isViewingArchive, archivedConversations, displayActiveConversations, currentUserId])

  const renderConversationItem = (conv) => {
    const convId = (conv.conversationId || conv._id || '').toString()
    const isPinned = Array.isArray(conv.pinnedBy) && conv.pinnedBy.some(p => (p?._id?.toString() || p?.toString()) === currentUserId)
    const isArchived = Array.isArray(conv.archivedBy) && conv.archivedBy.some(p => (p?._id?.toString() || p?.toString()) === currentUserId)
    const isChecked = selectedChatIds.includes(convId)

    if (conv.isGroup) {
      const isPending = (conv.pendingMembers || []).some(p => (p._id?.toString() || p.toString()) === currentUserId) || !!conv.isPendingInvite || conv.status === 'pending'
      return (
        <div key={conv._id} className="relative">
          <ChatItem
            contact={{
              id: conv._id,
              conversationId: conv._id,
              name: conv.groupName || 'Group Chat',
              avatar: conv.groupAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(conv.groupName || 'group')}`,
              isGroup: true,
              participantsCount: conv.participants?.length || (conv.members?.length || 0),
              status: isPending ? 'pending' : 'accepted',
              isPendingInvite: isPending,
              pendingMembers: conv.pendingMembers || [],
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
            isNew={isPending}
            isPinned={isPinned}
            isArchived={isArchived}
            onTogglePin={handleTogglePin}
            onToggleArchive={handleToggleArchive}
            isSelectMode={isSelectMode}
            isChecked={isChecked}
            onToggleCheck={handleToggleCheckChat}
          />
        </div>
      )
    }

    const other = conv.participants.find(p => (p._id?.toString() || p.toString()) !== currentUserId)
    if (!other) return null
    const isPending = conv.status === 'pending'
    const initiatorId = conv.initiator?._id
      ? conv.initiator._id.toString()
      : (conv.initiator ? conv.initiator.toString() : '')
    const isReceiver = isPending && initiatorId !== currentUserId

    return (
      <div key={conv._id} className="relative">
        <ChatItem
          contact={{
            id: other._id,
            conversationId: conv._id,
            name: other.displayName || other.username,
            avatar: other.avatar,
            presence: other.presence,
            statusEmoji: other.statusEmoji,
            isGroup: false,
            status: conv.status,
            initiator: conv.initiator,
            lastMessage: conv.lastMessage?.messageType === 'group_invite'
              ? `👥 Undangan Grup: ${conv.lastMessage.inviteData?.groupName || 'Grup'}`
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
          isSelected={other._id === selectedId}
          onClick={() => handleSelectConversation(conv)}
          isNew={isReceiver}
          isPinned={isPinned}
          isArchived={isArchived}
          onTogglePin={handleTogglePin}
          onToggleArchive={handleToggleArchive}
          isSelectMode={isSelectMode}
          isChecked={isChecked}
          onToggleCheck={handleToggleCheckChat}
        />
      </div>
    )
  }

  // Set of user IDs of existing direct conversations / friends to exclude from Global New Chat Search
  const existingFriendIds = useMemo(() => {
    const ids = new Set()
    conversations.forEach((conv) => {
      if (!conv.isGroup && Array.isArray(conv.participants)) {
        conv.participants.forEach((p) => {
          const id = (p?._id?.toString() || p?.toString())
          if (id && id !== currentUserId) {
            ids.add(id)
          }
        })
      }
    })
    return ids
  }, [conversations, currentUserId])

  return (
    <>
      <div id="sidebar-container" className="w-full sm:w-80 md:w-96 flex flex-col h-full bg-zinc-900 border-r border-zinc-800 flex-shrink-0 relative select-none transform-gpu">
        {/* Floating Feedback Toast */}
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 450, damping: 28 }}
              className="absolute top-16 left-4 right-4 z-50 bg-zinc-850/95 border border-zinc-700/80 text-zinc-100 text-xs font-semibold px-3.5 py-2 rounded-xl shadow-2xl backdrop-blur-md text-center"
            >
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── User Header ─────────────────────────────── */}
        <div id="sidebar-user-header" className="p-3.5 border-b border-zinc-800 flex items-center justify-between flex-shrink-0 bg-zinc-900">
          <div
            className="flex items-center gap-3 min-w-0 cursor-pointer group"
            onClick={handleOpenProfile}
          >
            <div className="relative flex-shrink-0">
              <img
                src={user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'}
                alt={user?.displayName || user?.username}
                className="w-10 h-10 rounded-full bg-zinc-800 object-cover ring-2 ring-indigo-500/30 group-hover:ring-indigo-500 transition-all"
              />
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-zinc-900 ${
                  user?.presence === 'idle' || user?.presence === 'away'
                    ? 'bg-amber-400'
                    : user?.presence === 'dnd' || user?.presence === 'busy'
                    ? 'bg-red-400'
                    : user?.presence === 'offline'
                    ? 'bg-zinc-500'
                    : 'bg-emerald-400'
                }`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-zinc-100 truncate group-hover:text-indigo-300 transition-colors">
                  {user?.displayName || user?.username}
                </span>
                {user?.statusEmoji && <span className="flex-shrink-0">{user.statusEmoji}</span>}
              </div>
              <p className="text-xs text-zinc-400 truncate font-mono">@{user?.username}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isInstallable && !isInstalled && (
              <button
                type="button"
                id="sidebar-install-pwa-btn"
                onClick={handleInstallPWA}
                className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-full transition-colors cursor-pointer"
                title={t('installApp')}
              >
                <Download size={18} />
              </button>
            )}
            <button
              type="button"
              id="sidebar-create-group-btn"
              onClick={handleOpenCreateGroup}
              className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
              title={t('createGroup')}
            >
              <Users size={18} />
            </button>
            <button
              type="button"
              id="sidebar-profile-btn"
              onClick={handleOpenProfile}
              className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
              title={t('profile')}
            >
              <User size={18} />
            </button>
            <button
              type="button"
              id="sidebar-settings-btn"
              onClick={handleOpenSettings}
              className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
              title={t('settings')}
            >
              <Settings size={18} />
            </button>
            <button
              type="button"
              onClick={logout}
              className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
              title={t('logout')}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* ── Banners: App Version Update & PWA Install ─────── */}
        <AppUpdateBanner
          isVisible={updateAvailable}
          onUpdate={reloadApp}
          onDismiss={() => setUpdateAvailable(false)}
        />
        <PWAInstallBanner />

        {/* ── Search Bar ──────────────────────────────── */}
        <div className="p-3 flex-shrink-0">
          <div id="sidebar-search-container" className="flex items-center gap-2 bg-zinc-800/80 px-3.5 py-2.5 rounded-xl border border-zinc-700/50 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/30 transition-all">
            <Search size={16} className="text-zinc-400 flex-shrink-0" />
            <input
              ref={searchInputRef}
              id="sidebar-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchChatsOrFriends')}
              className="bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none flex-1"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ── Section Label / Archive Header ──────────── */}
        <div className="px-4 pb-2 flex-shrink-0 flex justify-between items-center">
          {isViewingArchive ? (
            <button
              type="button"
              onClick={() => {
                setIsViewingArchive(false)
                setIsSelectMode(false)
                setSelectedChatIds([])
              }}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>{t('archivedChats')}</span>
            </button>
          ) : (
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
              {query ? t('searchPlaceholder') : t('allChats')}
            </p>
          )}

          {/* Select Mode Toggle Button */}
          <div className="flex items-center gap-2">
            {isSelectMode && (
              <button
                type="button"
                onClick={() => handleToggleSelectAll(isViewingArchive ? archivedConversations : displayActiveConversations)}
                className="text-[11px] font-medium text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                {selectedChatIds.length === (isViewingArchive ? archivedConversations : displayActiveConversations).length ? 'Deselect' : 'Semua'}
              </button>
            )}
            <button
              type="button"
              id="sidebar-select-mode-toggle"
              onClick={() => {
                setIsSelectMode((prev) => !prev)
                setSelectedChatIds([])
              }}
              className={`text-xs font-semibold px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                isSelectMode
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {isSelectMode ? t('cancelSelect') : t('selectMode')}
            </button>
          </div>
        </div>

        {/* ── Scrollable List ─────────────────────── */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
          {query ? (
            /* Search Results (Filtered from Active/Archived Conversations) */
            searchFilteredConversations.length > 0 ? (
              searchFilteredConversations.map((conv) => renderConversationItem(conv))
            ) : (
              <div className="text-center py-10 px-4">
                <p className="text-sm text-zinc-400 font-medium">{t('noChats')}</p>
                <button
                  type="button"
                  onClick={() => setIsNewChatOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md cursor-pointer transition-all"
                >
                  <MessageSquarePlus size={14} />
                  <span>{t('globalUserSearch')}</span>
                </button>
              </div>
            )
          ) : isViewingArchive ? (
            /* Archived Conversations View */
            archivedConversations.length > 0 ? (
              archivedConversations.map((conv) => renderConversationItem(conv))
            ) : (
              <div className="text-center py-10 px-4">
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 mx-auto mb-2">
                  <Archive size={20} />
                </div>
                <p className="text-sm font-semibold text-zinc-300">{t('noArchivedChats')}</p>
              </div>
            )
          ) : (
            /* Active Conversations List */
            <>
              {/* Archive Folder Row if there are archived chats */}
              {archivedConversations.length > 0 && (
                <motion.button
                  id="sidebar-archive-btn"
                  whileHover={{ scale: 1.01 }}
                  onClick={() => {
                    setIsViewingArchive(true)
                    setIsSelectMode(false)
                    setSelectedChatIds([])
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-zinc-300 hover:text-white transition-colors cursor-pointer mb-2 bg-zinc-800/30 border border-zinc-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                      <Archive size={15} />
                    </div>
                    <span className="text-sm font-semibold text-zinc-200">{t('archivedChats')}</span>
                  </div>
                  <span className="text-xs font-bold text-indigo-400 bg-indigo-500/15 border border-indigo-500/25 px-2 py-0.5 rounded-full">
                    {archivedConversations.length}
                  </span>
                </motion.button>
              )}

              {displayActiveConversations.length > 0 ? (
                displayActiveConversations.map((conv) => renderConversationItem(conv))
              ) : (
                <p className="text-sm text-zinc-500 text-center mt-8">
                  {t('startChatting')}
                </p>
              )}
            </>
          )}
        </div>

        {/* ── WhatsApp Floating Batch Action Bar ── */}
        <AnimatePresence>
          {isSelectMode && selectedChatIds.length > 0 && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              className="absolute bottom-4 left-3 right-3 z-40 bg-zinc-900/95 border border-indigo-500/40 rounded-2xl shadow-2xl p-3 flex items-center justify-between backdrop-blur-xl"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 pl-1">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px]">
                  {selectedChatIds.length}
                </span>
                <span>{t('selectedCount')}</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Batch Archive button */}
                <button
                  type="button"
                  id="batch-archive-action-btn"
                  onClick={handleBatchArchive}
                  disabled={isBatchProcessing}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors border border-zinc-700/60 disabled:opacity-50"
                  title={isViewingArchive ? t('unarchiveSelected') : t('archiveSelected')}
                >
                  {isBatchProcessing ? <Loader2 size={13} className="animate-spin" /> : <Archive size={13} />}
                  <span>{isViewingArchive ? t('unarchiveSelected') : t('archiveSelected')}</span>
                </button>

                {/* Batch Delete button */}
                <button
                  type="button"
                  id="batch-delete-action-btn"
                  onClick={handleBatchDelete}
                  disabled={isBatchProcessing}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-md shadow-rose-600/30 disabled:opacity-50"
                  title={t('deleteSelected')}
                >
                  {isBatchProcessing ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  <span>{t('deleteSelected')}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Mobile Floating Action Button (FAB) for New Chat ── */}
        {!isSelectMode && (
          <motion.button
            type="button"
            id="mobile-new-chat-fab"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleOpenNewChat}
            className="fixed bottom-6 right-6 z-40 sm:hidden bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-2xl flex items-center justify-center cursor-pointer shadow-indigo-600/40"
            title={t('createNewChat')}
            aria-label="New Chat"
          >
            <MessageSquarePlus size={22} />
          </motion.button>
        )}
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={handleCloseSettings} />
      <ProfileSettings isOpen={isProfileOpen} onClose={handleCloseProfile} />
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={handleCloseCreateGroup}
        onGroupCreated={handleGroupCreated}
      />
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={handleCloseNewChat}
        onSelectUser={handleSelectUser}
        existingUserIds={existingFriendIds}
      />
      <PWAInstallGuideModal isOpen={showInstallGuide} onClose={() => setShowInstallGuide(false)} isIOS={isIOS} />
    </>
  )
}
