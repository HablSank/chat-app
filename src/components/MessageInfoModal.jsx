import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Info, X, CheckCheck, Clock, Loader2, Image as ImageIcon, Mic } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { decryptMessage } from '../utils/crypto'
import { getApiUrl } from '../config/api'

export default function MessageInfoModal({ isOpen, onClose, message, conversationId }) {
  const { token, user: currentUser } = useAuth()
  const [messageInfo, setMessageInfo] = useState(null)
  const [decryptedText, setDecryptedText] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isOpen || !message?._id) return

    const fetchInfo = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(getApiUrl(`/api/messages/${message._id}/info`), {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (res.ok) {
          setMessageInfo(data)
          if (data.message?.text) {
            const dec = await decryptMessage(data.message.text, conversationId || data.message.conversationId)
            setDecryptedText(dec)
          } else {
            setDecryptedText('')
          }
        }
      } catch (err) {
        console.error('Failed to fetch message info:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchInfo()
  }, [isOpen, message?._id, token, conversationId])

  const msg = messageInfo?.message || message
  const conversation = messageInfo?.conversation

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return 'Just now'
    const date = new Date(dateStr)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  // Filter out the sender themselves from receipt lists
  const readByList = (msg?.readBy || []).filter((r) => {
    const rUserId = r.user?._id?.toString() || r.user?.toString()
    return rUserId !== currentUser?.id?.toString()
  })

  const deliveredToList = (msg?.deliveredTo || []).filter((d) => {
    const dUserId = d.user?._id?.toString() || d.user?.toString()
    // Don't show in delivered if already in readBy
    const isInRead = readByList.some((r) => (r.user?._id?.toString() || r.user?.toString()) === dUserId)
    return dUserId !== currentUser?.id?.toString() && !isInRead
  })

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/90 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Info size={18} className="text-indigo-400" />
                <h2 className="text-base font-semibold text-zinc-100">Message Info</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-zinc-500 gap-2">
                <Loader2 size={20} className="animate-spin text-indigo-400" />
                <span className="text-xs font-medium">Loading details...</span>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Message Snippet Card */}
                <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl">
                  {decryptedText && (
                    <p className="text-sm text-zinc-100 font-medium break-words leading-relaxed mb-2">
                      {decryptedText}
                    </p>
                  )}
                  {msg?.imageUrls?.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-indigo-300 font-medium mb-1">
                      <ImageIcon size={14} />
                      <span>{msg.imageUrls.length} Shared photo(s)</span>
                    </div>
                  )}
                  {msg?.audioUrl && (
                    <div className="flex items-center gap-2 text-xs text-indigo-300 font-medium mb-1">
                      <Mic size={14} />
                      <span>Voice Note ({msg.audioDuration ? `${msg.audioDuration}s` : 'Audio'})</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono mt-1">
                    <Clock size={11} />
                    <span>Sent at {formatTimestamp(msg?.createdAt)}</span>
                  </div>
                </div>

                {/* Read By List */}
                <div>
                  <div className="flex items-center gap-2 mb-2.5 px-1">
                    <span className="text-indigo-400 text-xs font-bold">✓✓</span>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                      Read By ({readByList.length})
                    </h3>
                  </div>

                  {readByList.length > 0 ? (
                    <div className="space-y-1.5">
                      {readByList.map((item, idx) => (
                        <div
                          key={item.user?._id || idx}
                          className="flex items-center justify-between p-2.5 bg-zinc-950/40 border border-zinc-800/60 rounded-xl"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={item.user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
                              alt={item.user?.username}
                              className="w-7 h-7 rounded-full bg-zinc-800 object-cover"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-zinc-200 truncate">
                                {item.user?.displayName || item.user?.username || 'Member'}
                              </p>
                              <p className="text-[10px] text-zinc-500 truncate">
                                @{item.user?.username || 'user'}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] text-indigo-300/80 font-mono flex-shrink-0 ml-2">
                            {formatTimestamp(item.readAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 px-1 italic">No one has read this message yet.</p>
                  )}
                </div>

                {/* Delivered To List */}
                <div>
                  <div className="flex items-center gap-2 mb-2.5 px-1">
                    <span className="text-zinc-400 text-xs font-medium">✓✓</span>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Delivered To ({deliveredToList.length})
                    </h3>
                  </div>

                  {deliveredToList.length > 0 ? (
                    <div className="space-y-1.5">
                      {deliveredToList.map((item, idx) => (
                        <div
                          key={item.user?._id || idx}
                          className="flex items-center justify-between p-2.5 bg-zinc-950/40 border border-zinc-800/60 rounded-xl"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={item.user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
                              alt={item.user?.username}
                              className="w-7 h-7 rounded-full bg-zinc-800 object-cover"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-zinc-200 truncate">
                                {item.user?.displayName || item.user?.username || 'Member'}
                              </p>
                              <p className="text-[10px] text-zinc-500 truncate">
                                @{item.user?.username || 'user'}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] text-zinc-400 font-mono flex-shrink-0 ml-2">
                            {formatTimestamp(item.deliveredAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 px-1 italic">
                      {readByList.length > 0
                        ? 'All delivered recipients have already read this message.'
                        : 'Not delivered to other members yet.'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
