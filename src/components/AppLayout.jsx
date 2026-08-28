import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import ChatRoom from './ChatRoom'
import { useSocket } from '../hooks/useSocket'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { encryptMessage } from '../utils/crypto'
import { playSendSound, playReceiveSound } from '../utils/sound'
import { getApiUrl } from '../config/api'

// ── Empty-state illustration when no chat is selected (Mobile & Desktop) ──
function NoChatSelected() {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col items-center justify-center h-full w-full gap-4 text-center select-none p-6">
      {/* Decorative rings with logo */}
      <div className="relative flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28">
        <div className="absolute inset-0 rounded-full border-2 border-zinc-800 animate-ping opacity-30" />
        <div className="absolute inset-2 rounded-full border-2 border-zinc-700" />
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-indigo-500/20 flex items-center justify-center">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-indigo-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
            />
          </svg>
        </div>
      </div>
      <div>
        <p className="text-zinc-200 font-bold text-lg sm:text-xl">{t('allChats')}</p>
        <p className="text-sm text-zinc-500 mt-1 max-w-[220px] leading-relaxed">
          {t('startChatting')}
        </p>
      </div>
    </div>
  )
}

// ─── AppLayout ────────────────────────────────────────────────────────────────
export default function AppLayout() {
  const { user, token } = useAuth()
  const [selectedContact, setSelectedContact] = useState(null)
  const [isMobile, setIsMobile]               = useState(false)
  
  // chatMessages: { conversationId: [Message] }
  const [chatMessages, setChatMessages]       = useState({})
  
  // typingUsers: { conversationId: { userId: boolean } }
  const [typingUsers, setTypingUsers]         = useState({})

  // Force Sidebar to re-fetch when new conversations appear
  const [refreshSidebar, setRefreshSidebar] = useState(0)

  // In-app Toast notification for messages from other conversations
  const [inAppToast, setInAppToast] = useState(null)
  const inAppToastTimerRef = useRef(null)

  const selectedContactRef = useRef(selectedContact)
  useEffect(() => {
    selectedContactRef.current = selectedContact
  }, [selectedContact])

  // ── Socket event handlers ────────────────────────────────────────────────────
  const handleIncomingMessage = useCallback((payload) => {
    const isFromOther = (payload.sender?._id || payload.sender) !== user?.id
    if (isFromOther) {
      playReceiveSound()

      // If this message is NOT from the active open chat room, trigger notifications
      if (selectedContactRef.current?.conversationId !== payload.conversationId) {
        const senderName = payload.sender?.displayName || payload.sender?.username || 'Pesan Baru'
        const preview = payload.messageType === 'group_invite'
          ? 'Mengundang Anda ke grup'
          : (payload.audioUrl ? '🎵 Pesan Suara' : (payload.imageUrls?.length ? '📷 Foto' : (payload.text || 'Pesan Baru')))

        // 1. Desktop Notification (if permitted and window is unfocused)
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(senderName, {
              body: preview,
              icon: payload.sender?.avatar || '/logo.png',
              badge: '/logo.png',
            })
          } catch (e) {
            console.log('Notification dispatch skipped:', e)
          }
        }

        // 2. In-App Toast Banner
        setInAppToast({
          id: payload._id,
          conversationId: payload.conversationId,
          senderName,
          senderAvatar: payload.sender?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${senderName}`,
          preview,
        })
        clearTimeout(inAppToastTimerRef.current)
        inAppToastTimerRef.current = setTimeout(() => setInAppToast(null), 4000)
      }
    }

    // If this message belongs to our active newly selected contact, update conversationId immediately
    setSelectedContact((prev) => {
      if (prev && !prev.conversationId && payload.conversationId) {
        const senderId = payload.sender?._id || payload.sender
        if (senderId === prev.id || senderId === user?.id) {
          return {
            ...prev,
            conversationId: payload.conversationId,
            status: prev.status === 'new' ? 'pending' : prev.status,
          }
        }
      }
      return prev
    })

    setChatMessages((prev) => {
      const thread = prev[payload.conversationId] ?? []
      if (thread.some((m) => m._id === payload._id)) return prev

      // If message is from self, replace any temporary uploading message in the thread
      const isFromSelf = (payload.sender?._id || payload.sender) === user?.id
      if (isFromSelf) {
        const uploadIdx = thread.findIndex((m) => m.isUploading)
        if (uploadIdx !== -1) {
          const nextThread = [...thread]
          nextThread[uploadIdx] = payload
          return {
            ...prev,
            [payload.conversationId]: nextThread,
          }
        }
      }

      return {
        ...prev,
        [payload.conversationId]: [...thread, payload],
      }
    })
    setRefreshSidebar(prev => prev + 1)

    // If currently chatting in this conversation, mark as read in real-time
    if (selectedContactRef.current?.conversationId === payload.conversationId && isFromOther) {
      sendMarkReadRef.current?.(payload.conversationId, user.id)
    }
  }, [user])

  const handleTyping = useCallback(({ from, username, avatar, conversationId }) => {
    if (!from || from === user?.id) return
    setTypingUsers((prev) => ({
      ...prev,
      [conversationId]: {
        ...prev[conversationId],
        [from]: { userId: from, username, avatar }
      }
    }))
  }, [user?.id])

  const handleStopTyping = useCallback(({ from, conversationId }) => {
    setTypingUsers((prev) => {
      if (!prev[conversationId]) return prev
      const updated = { ...prev[conversationId] }
      delete updated[from]
      return {
        ...prev,
        [conversationId]: updated
      }
    })
  }, [])

  const handleNewConversation = useCallback((conv) => {
    setRefreshSidebar(prev => prev + 1)
    
    // If we are currently talking to this person (new chat started), update our selectedContact with the new ID
    setSelectedContact(prev => {
      if (prev && !prev.conversationId) {
        const otherParticipant = conv.participants.find(p => p._id !== user.id)
        if (otherParticipant && otherParticipant._id === prev.id) {
          return {
            ...prev,
            conversationId: conv._id,
            status: conv.status,
            initiator: conv.initiator
          }
        }
      }
      return prev
    })
  }, [user])

  const handleRequestAction = useCallback(({ conversationId, status, conversation }) => {
    setRefreshSidebar(prev => prev + 1)
    setSelectedContact(prev => {
      if (prev && prev.conversationId === conversationId) {
        if (status === 'rejected') return null
        const currentUserId = (user?.id || user?._id || '').toString()
        const otherParticipant = conversation?.participants?.find(p => (p._id?.toString() || p.toString()) !== currentUserId)
        return {
          ...prev,
          status,
          ...(otherParticipant ? {
            name: otherParticipant.displayName || otherParticipant.username,
            avatar: otherParticipant.avatar,
            presence: otherParticipant.presence,
            statusEmoji: otherParticipant.statusEmoji,
          } : {})
        }
      }
      return prev
    })
  }, [user])

  const handleReactionUpdate = useCallback(({ messageId, reactions }) => {
    setChatMessages(prev => {
      const updated = {}
      for (const [convId, msgs] of Object.entries(prev)) {
        updated[convId] = msgs.map(m => m._id === messageId ? { ...m, reactions } : m)
      }
      return updated
    })
  }, [])

  const handleMessagesRead = useCallback(({ conversationId, readerId }) => {
    setChatMessages(prev => {
      if (!prev[conversationId]) return prev
      return {
        ...prev,
        [conversationId]: prev[conversationId].map(m => {
          const senderId = m.sender?._id || m.sender
          if (senderId !== readerId) {
            return { ...m, status: 'read' }
          }
          return m
        })
      }
    })
    setRefreshSidebar(prev => prev + 1)
  }, [])

  const handleMessagesDelivered = useCallback(({ conversationId, messageIds }) => {
    setChatMessages(prev => {
      if (!prev[conversationId]) return prev
      return {
        ...prev,
        [conversationId]: prev[conversationId].map(m => {
          if (messageIds.includes(m._id)) {
            return { ...m, status: 'delivered' }
          }
          return m
        })
      }
    })
    // Optionally trigger sidebar update if it displays delivery status
  }, [])

  const handlePresenceUpdate = useCallback(({ userId, presence, statusEmoji, isOnline, lastSeen }) => {
    setSelectedContact(prev => {
      if (prev && prev.id === userId) {
        return {
          ...prev,
          presence: presence || prev.presence,
          statusEmoji: statusEmoji !== undefined ? statusEmoji : prev.statusEmoji,
          isOnline: isOnline !== undefined ? isOnline : prev.isOnline,
          lastSeen: lastSeen !== undefined ? lastSeen : prev.lastSeen,
        }
      }
      return prev
    })
    // Trigger sidebar re-fetch to reflect new presence/emoji
    setRefreshSidebar(prev => prev + 1)
  }, [])

  const handleMessageEdited = useCallback(({ messageId, conversationId, text, isEdited, status }) => {
    setChatMessages(prev => {
      if (!prev[conversationId]) return prev
      return {
        ...prev,
        [conversationId]: prev[conversationId].map(m =>
          m._id === messageId ? { ...m, text, isEdited, status: status || 'delivered' } : m
        )
      }
    })
    setRefreshSidebar(prev => prev + 1)
  }, [])

  const handleMessageDeleted = useCallback(({ messageId, conversationId, _isDeleted }) => {
    setChatMessages(prev => {
      if (!prev[conversationId]) return prev
      return {
        ...prev,
        [conversationId]: prev[conversationId].map(m =>
          m._id === messageId
            ? { ...m, isDeleted: true, status: null, text: '', imageUrl: '', imageUrls: [], audioUrl: '' }
            : m
        )
      }
    })
    setRefreshSidebar(prev => prev + 1)
  }, [])

  const handleMessagePinned = useCallback(({ messageId, conversationId, isPinned }) => {
    setChatMessages(prev => {
      if (!prev[conversationId]) return prev
      return {
        ...prev,
        [conversationId]: prev[conversationId].map(m => m._id === messageId ? { ...m, isPinned } : m)
      }
    })
  }, [])

  const handleGroupCreated = useCallback(() => {
    setRefreshSidebar(prev => prev + 1)
  }, [])

  const handleGroupUpdated = useCallback((updatedGroup) => {
    setRefreshSidebar(prev => prev + 1)
    setSelectedContact(prev => {
      if (prev && prev.conversationId === updatedGroup._id) {
        return {
          ...prev,
          name: updatedGroup.groupName || prev.name,
          avatar: updatedGroup.groupAvatar || prev.avatar,
          groupName: updatedGroup.groupName,
          groupAvatar: updatedGroup.groupAvatar,
          groupAdmin: updatedGroup.groupAdmin,
          groupAdmins: updatedGroup.groupAdmins || (updatedGroup.groupAdmin ? [updatedGroup.groupAdmin] : []),
          participants: updatedGroup.participants,
        }
      }
      return prev
    })
  }, [])

  const handleConversationUpdated = useCallback((updatedConv) => {
    setRefreshSidebar(prev => prev + 1)
    if (updatedConv?._id) {
      setSelectedContact(prev => {
        if (prev && (prev.conversationId === updatedConv._id || prev.id === updatedConv._id)) {
          return {
            ...prev,
            customTheme: updatedConv.customTheme,
            ...(updatedConv.isGroup ? {
              name: updatedConv.groupName || prev.name,
              avatar: updatedConv.groupAvatar || prev.avatar,
              groupName: updatedConv.groupName,
              groupAvatar: updatedConv.groupAvatar,
              participants: updatedConv.participants,
              members: updatedConv.members,
            } : {})
          }
        }
        return prev
      })
    }
  }, [])

  // ── Connect to Socket.IO ──────────────────────────────────────────────────────
  const { sendMessage, sendTyping, sendStopTyping, joinPrivateRoom, sendReaction, sendMarkRead } = useSocket({
    onMessage:         handleIncomingMessage,
    onTyping:          handleTyping,
    onStopTyping:      handleStopTyping,
    onNewConversation: handleNewConversation,
    onRequestAction:   handleRequestAction,
    onReactionUpdate:  handleReactionUpdate,
    onMessagesRead:    handleMessagesRead,
    onMessagesDelivered: handleMessagesDelivered,
    onPresenceUpdate:  handlePresenceUpdate,
    onMessageEdited:   handleMessageEdited,
    onMessageDeleted:  handleMessageDeleted,
    onMessagePinned:   handleMessagePinned,
    onGroupCreated:    handleGroupCreated,
    onGroupUpdated:    handleGroupUpdated,
    onConversationUpdated: handleConversationUpdated,
  })

  const sendMarkReadRef = useRef(sendMarkRead)
  useEffect(() => {
    sendMarkReadRef.current = sendMarkRead
  }, [sendMarkRead])

  // Detect mobile breakpoint
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const update = (e) => setIsMobile(e.matches)
    update(mq)
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Handle mobile browser/hardware back button (History API)
  useEffect(() => {
    const handlePopState = () => {
      // When popstate fires (native back button / swipe back gesture)
      if (selectedContactRef.current) {
        setSelectedContact(null)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleSelectContact = (contact) => {
    setSelectedContact(contact)
    if (contact.conversationId) {
      joinPrivateRoom(contact.conversationId)
      if (user?.id) {
        sendMarkRead(contact.conversationId, user.id)
      }
    }

    // On mobile screens, push a state so hardware back button returns to chat list
    if (window.innerWidth < 768) {
      window.history.pushState({ chatOpen: true, contactId: contact.id }, '')
    }
  }

  // Fetch messages when conversation changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedContact?.conversationId) return
      
      try {
        const res = await fetch(getApiUrl(`/api/messages/${selectedContact.conversationId}`), {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (res.ok) {
          setChatMessages(prev => ({
            ...prev,
            [selectedContact.conversationId]: data
          }))
          if (user?.id) {
            sendMarkRead(selectedContact.conversationId, user.id)
          }
          setRefreshSidebar(prev => prev + 1)
        }
      } catch (err) {
        console.error('Failed to fetch messages', err)
      }
    }
    
    fetchMessages()
  }, [selectedContact?.conversationId, token, user?.id, sendMarkRead])

  // Fallback: If contact is opened without conversationId, check backend to see if a conversation already exists
  useEffect(() => {
    if (selectedContact && !selectedContact.conversationId && !selectedContact.isGroup && selectedContact.id && token) {
      fetch(getApiUrl(`/api/conversations/find/${selectedContact.id}`), {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data?.conversation) {
            const conv = data.conversation
            setSelectedContact(prev => {
              if (prev && prev.id === selectedContact.id && !prev.conversationId) {
                return {
                  ...prev,
                  conversationId: conv._id,
                  status: conv.status,
                  initiator: conv.initiator,
                }
              }
              return prev
            })
            joinPrivateRoom(conv._id)
          }
        })
        .catch(err => console.warn('Lookup existing conversation error:', err))
    }
  }, [selectedContact?.id, selectedContact?.conversationId, selectedContact?.isGroup, token, joinPrivateRoom])

  const handleBack = () => {
    if (window.history.state?.chatOpen) {
      window.history.back()
    } else {
      setSelectedContact(null)
    }
  }

  const handleSendMessage = async (payload) => {
    const text          = payload?.text          || ''
    const imageUrls     = payload?.imageUrls?.length
      ? payload.imageUrls
      : payload?.imageUrl
      ? [payload.imageUrl]
      : []
    const audioUrl      = payload?.audioUrl      || ''
    const audioDuration = payload?.audioDuration || 0
    const replyTo       = payload?.replyTo       || null

    if (!selectedContact || (!text.trim() && imageUrls.length === 0 && !audioUrl) || !user) return

    // Optimistic temporary rendering for media sending
    if (payload?.isOptimistic) {
      const convId = selectedContact.conversationId || 'default_room'
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
      const optimisticMsg = {
        _id: tempId,
        conversationId: convId,
        sender: {
          _id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar,
        },
        text: text.trim(),
        imageUrls,
        imageUrl: imageUrls[0] || null,
        audioUrl,
        audioDuration,
        replyTo: replyTo ? { _id: replyTo } : null,
        reactions: [],
        status: 'sending',
        isUploading: true,
        isOwn: true,
        createdAt: new Date().toISOString(),
      }

      setChatMessages((prev) => {
        const thread = prev[convId] ?? []
        return {
          ...prev,
          [convId]: [...thread, optimisticMsg],
        }
      })
      return
    }

    // Encrypt text before sending over network / storing in DB
    const plainText = text.trim()
    const convId = selectedContact.conversationId || 'default_room'
    const encryptedText = plainText
      ? await encryptMessage(plainText, convId)
      : ''

    // Optimistically render sent message immediately with plainText (0ms lag, no cipher flash)
    if (selectedContact.conversationId) {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
      const optimisticMsg = {
        _id: tempId,
        conversationId: convId,
        sender: {
          _id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar,
        },
        text: encryptedText,
        plainText: plainText,
        imageUrls,
        imageUrl: imageUrls[0] || null,
        audioUrl,
        audioDuration,
        replyTo: replyTo ? { _id: replyTo } : null,
        reactions: [],
        status: 'sending',
        isOwn: true,
        createdAt: new Date().toISOString(),
        isEphemeral: payload.isEphemeral,
      }

      setChatMessages((prev) => {
        const thread = prev[convId] ?? []
        return {
          ...prev,
          [convId]: [...thread, optimisticMsg],
        }
      })
    }

    sendMessage({
      from:          user.id,
      to:            selectedContact.isGroup ? null : selectedContact.id,
      conversationId: selectedContact.conversationId || null,
      text:          encryptedText,
      imageUrls,
      audioUrl,
      audioDuration,
      replyTo,
      isEphemeral:   payload.isEphemeral,
    })

    playSendSound()
  }

  const handleEditMessage = async (messageId, newPlainText) => {
    if (!selectedContact?.conversationId || !newPlainText.trim()) return
    const encryptedText = await encryptMessage(newPlainText.trim(), selectedContact.conversationId)
    try {
      await fetch(getApiUrl(`/api/messages/${messageId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text: encryptedText })
      })
    } catch (err) {
      console.error('Failed to edit message', err)
    }
  }

  const handleDeleteMessage = async (messageId) => {
    try {
      await fetch(getApiUrl(`/api/messages/${messageId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (err) {
      console.error('Failed to delete message', err)
    }
  }

  const handlePinMessage = async (messageId) => {
    try {
      await fetch(getApiUrl(`/api/messages/${messageId}/pin`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (err) {
      console.error('Failed to pin message', err)
    }
  }

  const handleReact = (messageId, emoji) => {
    if (!selectedContact?.conversationId || !user) return
    sendReaction(messageId, emoji, user.id, selectedContact.conversationId)
  }


  const handleAcceptRequest = async () => {
    if (!selectedContact?.conversationId) return
    try {
      const endpoint = selectedContact.isGroup
        ? `/api/conversations/${selectedContact.conversationId}/accept-group`
        : `/api/conversations/accept/${selectedContact.conversationId}`

      const res = await fetch(getApiUrl(endpoint), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        const currentUserId = (user?.id || user?._id || '').toString()
        const otherParticipant = (data.participants || []).find(p => (p._id?.toString() || p.toString()) !== currentUserId)

        setSelectedContact(prev => ({
          ...prev,
          status: 'accepted',
          isPendingInvite: false,
          ...(selectedContact.isGroup ? {
            participants: data.participants || [],
            pendingMembers: data.pendingMembers || [],
            members: data.members || data.participants || [],
          } : (otherParticipant ? {
            name: otherParticipant.displayName || otherParticipant.username,
            avatar: otherParticipant.avatar,
            presence: otherParticipant.presence,
            statusEmoji: otherParticipant.statusEmoji,
          } : {}))
        }))
        joinPrivateRoom(selectedContact.conversationId)
        setRefreshSidebar(prev => prev + 1)
      }
    } catch (err) {
      console.error('Accept Request Error:', err)
    }
  }

  const handleRejectRequest = async () => {
    if (!selectedContact?.conversationId) return
    try {
      const endpoint = selectedContact.isGroup
        ? `/api/conversations/${selectedContact.conversationId}/reject-group`
        : `/api/conversations/reject/${selectedContact.conversationId}`

      const res = await fetch(getApiUrl(endpoint), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setSelectedContact(null)
        setRefreshSidebar(prev => prev + 1)
      }
    } catch (err) {
      console.error('Reject Request Error:', err)
    }
  }

  const handleGroupLeft = useCallback((convId) => {
    setRefreshSidebar(prev => prev + 1)
    setSelectedContact(prev => {
      if (prev && prev.conversationId === convId) {
        return null
      }
      return prev
    })
  }, [])

  const handleJoinGroup = useCallback((joinedGroup) => {
    if (!joinedGroup) return
    const convId = (joinedGroup._id || joinedGroup.id || '').toString()
    setRefreshSidebar(prev => prev + 1)
    if (convId) joinPrivateRoom(convId)
    setSelectedContact({
      id: convId,
      conversationId: convId,
      name: joinedGroup.groupName || 'Grup',
      avatar: joinedGroup.groupAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(joinedGroup.groupName || 'Grup')}`,
      isGroup: true,
      groupAdmin: joinedGroup.groupAdmin,
      groupAdmins: joinedGroup.groupAdmins,
      participants: joinedGroup.participants || [],
      members: joinedGroup.members || joinedGroup.participants || [],
      status: 'accepted',
      isPendingInvite: false,
    })
  }, [joinPrivateRoom])

  const handleTypingStart = () => { 
    if (selectedContact?.conversationId) sendTyping(selectedContact.conversationId) 
  }
  const handleTypingStop  = () => { 
    if (selectedContact?.conversationId) sendStopTyping(selectedContact.conversationId) 
  }

  const activeThread = selectedContact?.conversationId ? (chatMessages[selectedContact.conversationId] ?? []) : []
  const activeTypingUsers = Object.values(
    typingUsers[selectedContact?.conversationId] || {}
  )
  const isContactTyping = activeTypingUsers.length > 0

  if (isMobile) {
    return (
      <div className="h-full w-full overflow-hidden bg-zinc-900">
        <AnimatePresence mode="wait">
          {selectedContact ? (
            <ChatRoom
              key={selectedContact.id}
              contact={selectedContact}
              messages={activeThread}
              onSendMessage={handleSendMessage}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onPinMessage={handlePinMessage}
              onTypingStart={handleTypingStart}
              onTypingStop={handleTypingStop}
              isTyping={isContactTyping}
              typingUsers={activeTypingUsers}
              onBack={handleBack}
              isMobile={true}
              onAccept={handleAcceptRequest}
              onReject={handleRejectRequest}
              onReact={handleReact}
              onGroupUpdated={handleGroupUpdated}
              onGroupLeft={handleGroupLeft}
              onJoinGroup={handleJoinGroup}
              currentUser={user}
            />
          ) : (
            <div key="sidebar" className="h-full">
              <Sidebar
                selectedId={selectedContact?.id}
                onSelect={handleSelectContact}
                refreshTrigger={refreshSidebar}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Floating In-App Toast Banner (Mobile) */}
        <AnimatePresence>
          {inAppToast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed top-4 left-4 right-4 z-50 bg-zinc-900/95 border border-zinc-700/80 rounded-2xl shadow-2xl backdrop-blur-md p-3 flex items-center gap-3 cursor-pointer hover:border-indigo-500/50 transition-colors"
              onClick={() => {
                const targetConvId = inAppToast.conversationId
                setInAppToast(null)
                if (targetConvId) {
                  setSelectedContact({
                    id: targetConvId,
                    conversationId: targetConvId,
                    name: inAppToast.senderName,
                    avatar: inAppToast.senderAvatar,
                    status: 'accepted',
                  })
                  joinPrivateRoom(targetConvId)
                }
              }}
            >
              <img
                src={inAppToast.senderAvatar}
                alt={inAppToast.senderName}
                className="w-10 h-10 rounded-full object-cover bg-zinc-800 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-zinc-100 truncate">{inAppToast.senderName}</p>
                <p className="text-xs text-zinc-400 truncate">{inAppToast.preview}</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setInAppToast(null)
                }}
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-zinc-900">
      <div className="w-80 md:w-80 lg:w-96 flex-shrink-0 h-full">
        <Sidebar
          selectedId={selectedContact?.id}
          onSelect={handleSelectContact}
          refreshTrigger={refreshSidebar}
        />
      </div>

      <div className="flex-1 min-w-0 max-w-full h-full overflow-hidden">
        <AnimatePresence mode="wait">
          {selectedContact ? (
            <ChatRoom
              key={selectedContact.id}
              contact={selectedContact}
              messages={activeThread}
              onSendMessage={handleSendMessage}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onPinMessage={handlePinMessage}
              onTypingStart={handleTypingStart}
              onTypingStop={handleTypingStop}
              isTyping={isContactTyping}
              typingUsers={activeTypingUsers}
              onBack={handleBack}
              isMobile={false}
              onAccept={handleAcceptRequest}
              onReject={handleRejectRequest}
              onReact={handleReact}
              onGroupUpdated={handleGroupUpdated}
              onGroupLeft={handleGroupLeft}
              onJoinGroup={handleJoinGroup}
              currentUser={user}
            />
          ) : (
            <NoChatSelected key="empty" />
          )}
        </AnimatePresence>
      </div>

      {/* Floating In-App Toast Banner */}
      <AnimatePresence>
        {inAppToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed top-4 right-4 sm:right-6 z-50 max-w-sm w-[90%] bg-zinc-900/95 border border-zinc-700/80 rounded-2xl shadow-2xl backdrop-blur-md p-3 flex items-center gap-3 cursor-pointer hover:border-indigo-500/50 transition-colors"
            onClick={() => {
              const targetConvId = inAppToast.conversationId
              setInAppToast(null)
              if (targetConvId) {
                setSelectedContact({
                  id: targetConvId,
                  conversationId: targetConvId,
                  name: inAppToast.senderName,
                  avatar: inAppToast.senderAvatar,
                  status: 'accepted',
                })
                joinPrivateRoom(targetConvId)
              }
            }}
          >
            <img
              src={inAppToast.senderAvatar}
              alt={inAppToast.senderName}
              className="w-10 h-10 rounded-full object-cover bg-zinc-800 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-zinc-100 truncate">{inAppToast.senderName}</p>
              <p className="text-xs text-zinc-400 truncate">{inAppToast.preview}</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setInAppToast(null)
              }}
              className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
