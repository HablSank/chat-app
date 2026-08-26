import { useState, useEffect, useCallback, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import ChatRoom from './ChatRoom'
import { useSocket } from '../hooks/useSocket'
import { useAuth } from '../context/AuthContext'

// ── Empty-state illustration for desktop when no chat is selected ─────────────
function NoChatSelected() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 h-full gap-4 text-center select-none">
      {/* Decorative rings */}
      <div className="relative flex items-center justify-center w-24 h-24">
        <div className="absolute inset-0 rounded-full border-2 border-zinc-800 animate-ping opacity-30" />
        <div className="absolute inset-2 rounded-full border-2 border-zinc-700" />
        <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
          <svg
            width="24"
            height="24"
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
        <p className="text-zinc-300 font-semibold text-lg">Your Messages</p>
        <p className="text-sm text-zinc-500 mt-1 max-w-[200px]">
          Select a conversation from the sidebar to get started
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

  const selectedContactRef = useRef(selectedContact)
  useEffect(() => {
    selectedContactRef.current = selectedContact
  }, [selectedContact])

  // ── Socket event handlers ────────────────────────────────────────────────────
  const handleIncomingMessage = useCallback((payload) => {
    setChatMessages((prev) => {
      const thread = prev[payload.conversationId] ?? []
      if (thread.some((m) => m._id === payload._id)) return prev
      return {
        ...prev,
        [payload.conversationId]: [...thread, payload],
      }
    })
    setRefreshSidebar(prev => prev + 1)

    // If currently chatting in this conversation, mark as read in real-time
    if (selectedContactRef.current?.conversationId === payload.conversationId && payload.sender?._id !== user?.id) {
      sendMarkReadRef.current?.(payload.conversationId, user.id)
    }
  }, [user])

  const handleTyping = useCallback(({ from, conversationId }) => {
    setTypingUsers((prev) => ({
      ...prev,
      [conversationId]: { ...prev[conversationId], [from]: true }
    }))
  }, [])

  const handleStopTyping = useCallback(({ from, conversationId }) => {
    setTypingUsers((prev) => ({
      ...prev,
      [conversationId]: { ...prev[conversationId], [from]: false }
    }))
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

  const handleRequestAction = useCallback(({ conversationId, status }) => {
    setRefreshSidebar(prev => prev + 1)
    setSelectedContact(prev => {
      if (prev && prev.conversationId === conversationId) {
        return { ...prev, status }
      }
      return prev
    })
  }, [])

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

  const handlePresenceUpdate = useCallback(({ userId, presence, statusEmoji }) => {
    setSelectedContact(prev => {
      if (prev && prev.id === userId) {
        return { ...prev, presence, statusEmoji }
      }
      return prev
    })
    // Trigger sidebar re-fetch to reflect new presence/emoji
    setRefreshSidebar(prev => prev + 1)
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

  const handleSelectContact = (contact) => {
    setSelectedContact(contact)
    if (contact.conversationId) {
      joinPrivateRoom(contact.conversationId)
      if (user?.id) {
        sendMarkRead(contact.conversationId, user.id)
      }
    }
  }

  // Fetch messages when conversation changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedContact?.conversationId) return
      
      try {
        const res = await fetch(`/api/messages/${selectedContact.conversationId}`, {
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

  const handleBack = () => setSelectedContact(null)

  const handleSendMessage = (payload) => {
    const text      = payload?.text      || ''
    const imageUrls = payload?.imageUrls || []
    if (!selectedContact || (!text.trim() && imageUrls.length === 0) || !user) return
    sendMessage({
      from:      user.id,
      to:        selectedContact.id,
      text:      text.trim(),
      imageUrls,
      isEphemeral: payload.isEphemeral,
    })
  }

  const handleReact = (messageId, emoji) => {
    if (!selectedContact?.conversationId || !user) return
    sendReaction(messageId, emoji, user.id, selectedContact.conversationId)
  }


  const handleAcceptRequest = async () => {
    try {
      const res = await fetch(`/api/conversations/accept/${selectedContact.conversationId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setSelectedContact(prev => ({ ...prev, status: 'accepted' }))
        setRefreshSidebar(prev => prev + 1)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleRejectRequest = async () => {
    try {
      const res = await fetch(`/api/conversations/reject/${selectedContact.conversationId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setSelectedContact(null)
        setRefreshSidebar(prev => prev + 1)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleTypingStart = () => { 
    if (selectedContact?.conversationId) sendTyping(selectedContact.conversationId) 
  }
  const handleTypingStop  = () => { 
    if (selectedContact?.conversationId) sendStopTyping(selectedContact.conversationId) 
  }

  const activeThread = selectedContact?.conversationId ? (chatMessages[selectedContact.conversationId] ?? []) : []
  const isContactTyping = Boolean(selectedContact?.conversationId && typingUsers[selectedContact.conversationId]?.[selectedContact.id])

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
              onTypingStart={handleTypingStart}
              onTypingStop={handleTypingStop}
              isTyping={isContactTyping}
              onBack={handleBack}
              isMobile={true}
              onAccept={handleAcceptRequest}
              onReject={handleRejectRequest}
              onReact={handleReact}
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
      </div>
    )
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-zinc-900">
      <div className="w-80 flex-shrink-0 h-full">
        <Sidebar
          selectedId={selectedContact?.id}
          onSelect={handleSelectContact}
          refreshTrigger={refreshSidebar}
        />
      </div>

      <div className="flex-1 h-full overflow-hidden">
        <AnimatePresence mode="wait">
          {selectedContact ? (
            <ChatRoom
              key={selectedContact.id}
              contact={selectedContact}
              messages={activeThread}
              onSendMessage={handleSendMessage}
              onTypingStart={handleTypingStart}
              onTypingStop={handleTypingStop}
              isTyping={isContactTyping}
              onBack={handleBack}
              isMobile={false}
              onAccept={handleAcceptRequest}
              onReject={handleRejectRequest}
              onReact={handleReact}
              currentUser={user}
            />
          ) : (
            <NoChatSelected key="empty" />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
