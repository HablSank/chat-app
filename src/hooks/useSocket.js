import { useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'
import { SOCKET_URL } from '../config/api'

/**
 * Manages a singleton Socket.IO connection for the app lifetime.
 *
 * Callbacks are stored in refs so the socket event listeners never go stale
 * even when the parent component re-renders with new closure values.
 *
 * @param {object} handlers
 * @param {function} handlers.onMessage      - called with a chat:private_message payload
 * @param {function} handlers.onTyping       - called with { from, conversationId } when contact starts typing
 * @param {function} handlers.onStopTyping   - called with { from, conversationId } when contact stops typing
 * @param {function} handlers.onNewConversation - called when a new conversation is created
 * @param {function} handlers.onRequestAction - called when a request is accepted or rejected
 * @param {function} handlers.onReactionUpdate - called when a message reaction changes
 * @param {function} handlers.onMessagesRead   - called when messages are marked read
 * @param {function} handlers.onMessagesDelivered - called when messages are delivered
 * @param {function} handlers.onPresenceUpdate    - called when a user presence changes
 *
 * @returns {{ sendMessage, sendTyping, sendStopTyping, joinPrivateRoom, sendReaction, sendMarkRead }}
 */
export function useSocket({
  onMessage,
  onTyping,
  onStopTyping,
  onNewConversation,
  onRequestAction,
  onReactionUpdate,
  onMessagesRead,
  onMessagesDelivered,
  onPresenceUpdate,
  onMessageEdited,
  onMessageDeleted,
  onMessagePinned,
  onGroupCreated,
  onGroupUpdated,
  onConversationUpdated,
}) {
  const { user } = useAuth()
  const socketRef          = useRef(null)
  const onMessageRef       = useRef(onMessage)
  const onTypingRef        = useRef(onTyping)
  const onStopTypingRef    = useRef(onStopTyping)
  const onNewConvRef       = useRef(onNewConversation)
  const onRequestActRef    = useRef(onRequestAction)
  const onReactionRef      = useRef(onReactionUpdate)
  const onMessagesReadRef  = useRef(onMessagesRead)
  const onMessagesDeliveredRef = useRef(onMessagesDelivered)
  const onPresenceUpdateRef = useRef(onPresenceUpdate)
  const onMessageEditedRef  = useRef(onMessageEdited)
  const onMessageDeletedRef = useRef(onMessageDeleted)
  const onMessagePinnedRef  = useRef(onMessagePinned)
  const onGroupCreatedRef   = useRef(onGroupCreated)
  const onGroupUpdatedRef   = useRef(onGroupUpdated)
  const onConversationUpdatedRef = useRef(onConversationUpdated)

  // Sync refs each render
  useEffect(() => { onMessageRef.current      = onMessage        }, [onMessage])
  useEffect(() => { onTypingRef.current       = onTyping         }, [onTyping])
  useEffect(() => { onStopTypingRef.current   = onStopTyping     }, [onStopTyping])
  useEffect(() => { onNewConvRef.current      = onNewConversation }, [onNewConversation])
  useEffect(() => { onRequestActRef.current   = onRequestAction  }, [onRequestAction])
  useEffect(() => { onReactionRef.current     = onReactionUpdate }, [onReactionUpdate])
  useEffect(() => { onMessagesReadRef.current = onMessagesRead   }, [onMessagesRead])
  useEffect(() => { onMessagesDeliveredRef.current = onMessagesDelivered }, [onMessagesDelivered])
  useEffect(() => { onPresenceUpdateRef.current = onPresenceUpdate }, [onPresenceUpdate])
  useEffect(() => { onMessageEditedRef.current  = onMessageEdited  }, [onMessageEdited])
  useEffect(() => { onMessageDeletedRef.current = onMessageDeleted }, [onMessageDeleted])
  useEffect(() => { onMessagePinnedRef.current  = onMessagePinned  }, [onMessagePinned])
  useEffect(() => { onGroupCreatedRef.current   = onGroupCreated   }, [onGroupCreated])
  useEffect(() => { onGroupUpdatedRef.current   = onGroupUpdated   }, [onGroupUpdated])
  useEffect(() => { onConversationUpdatedRef.current = onConversationUpdated }, [onConversationUpdated])

  // Create the socket once on mount, tear down on unmount
  useEffect(() => {
    if (!user) return

    const socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })
    socketRef.current = socket

    const emitJoin = () => {
      if (socket.connected && user?.id) {
        socket.emit('user:join', user.id)
      }
    }

    socket.on('connect', () => {
      console.log('[socket] connected:', socket.id)
      emitJoin()
    })

    socket.io?.on('reconnect', () => {
      console.log('[socket] reconnected')
      emitJoin()
    })

    socket.on('connect_error', (err) => {
      console.error('[socket] connection error:', err.message)
    })

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!socket.connected) {
          socket.connect()
        } else {
          emitJoin()
        }
      }
    }

    const handleOnline = () => {
      if (!socket.connected) {
        socket.connect()
      } else {
        emitJoin()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)

    socket.on('chat:private_message', (payload) => onMessageRef.current?.(payload))
    socket.on('user:typing',          (data)    => onTypingRef.current?.(data))
    socket.on('user:stop_typing',     (data)    => onStopTypingRef.current?.(data))
    socket.on('conversation:new',     (data)    => onNewConvRef.current?.(data))
    socket.on('chat:request_action',  (data)    => onRequestActRef.current?.(data))
    socket.on('chat:reaction_update', (data)    => onReactionRef.current?.(data))
    socket.on('chat:messages_read',   (data)    => onMessagesReadRef.current?.(data))
    socket.on('chat:messages_delivered',(data)  => onMessagesDeliveredRef.current?.(data))
    socket.on('user:presence_update', (data)    => onPresenceUpdateRef.current?.(data))
    socket.on('user:online',          (data)    => onPresenceUpdateRef.current?.({
      userId: data.userId,
      isOnline: true,
      presence: data.presence || 'online',
      statusEmoji: data.statusEmoji,
      lastSeen: data.lastSeen,
    }))
    socket.on('user:offline',         (data)    => onPresenceUpdateRef.current?.({
      userId: data.userId,
      isOnline: false,
      presence: 'offline',
      lastSeen: data.lastSeen,
    }))
    socket.on('chat:message_edited',  (data)    => onMessageEditedRef.current?.(data))
    socket.on('chat:message_deleted', (data)    => onMessageDeletedRef.current?.(data))
    socket.on('chat:message_pinned',  (data)    => onMessagePinnedRef.current?.(data))
    socket.on('group:created',        (data)    => onGroupCreatedRef.current?.(data))
    socket.on('group_invite_sent',    (data)    => {
      onNewConvRef.current?.(data)
      onGroupCreatedRef.current?.(data)
    })
    socket.on('group:updated',        (data)    => onGroupUpdatedRef.current?.(data))
    socket.on('conversation:updated', (data)    => onConversationUpdatedRef.current?.(data))

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      socket.disconnect()
    }
  }, [user]) // Reconnect if user changes

  /** Join a private room */
  const joinPrivateRoom = useCallback((conversationId) => {
    socketRef.current?.emit('join_private_room', conversationId)
  }, [])

  /** Emit a private message event to the server */
  const sendMessage = useCallback((payload) => {
    socketRef.current?.emit('chat:private_message', payload)
  }, [])

  /** Emit an emoji reaction */
  const sendReaction = useCallback((messageId, emoji, userId, conversationId) => {
    socketRef.current?.emit('chat:react_message', { messageId, emoji, userId, conversationId })
  }, [])

  /** Mark all messages in a conversation as read */
  const sendMarkRead = useCallback((conversationId, readerId) => {
    socketRef.current?.emit('chat:mark_read', { conversationId, readerId })
  }, [])

  /** Tell the server the current user started typing to a specific conversation */
  const sendTyping = useCallback((conversationId) => {
    if (!user) return
    socketRef.current?.emit('user:typing', {
      from: user.id,
      username: user.displayName || user.username,
      avatar: user.avatar,
      conversationId,
    })
  }, [user])

  /** Tell the server the current user stopped typing */
  const sendStopTyping = useCallback((conversationId) => {
    if (!user) return
    socketRef.current?.emit('user:stop_typing', {
      from: user.id,
      username: user.displayName || user.username,
      avatar: user.avatar,
      conversationId,
    })
  }, [user])

  return { sendMessage, sendTyping, sendStopTyping, joinPrivateRoom, sendReaction, sendMarkRead }
}
