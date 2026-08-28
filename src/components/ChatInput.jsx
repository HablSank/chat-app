import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Paperclip, Send, X, Loader2, ImageIcon, Mic, Trash2, CornerUpLeft, Volume2, Pencil, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getApiUrl } from '../config/api'
import { compressImage } from '../utils/imageCompressor'
import GiphyPicker from './GiphyPicker'

export default function ChatInput({
  onSend,
  onTypingStart,
  onTypingStop,
  isVanishMode,
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  onSaveEdit,
}) {
  const { token } = useAuth()
  const [value, setValue]             = useState('')
  const [imageFiles, setImageFiles]   = useState([]) // up to 4
  const [previews, setPreviews]       = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [isGiphyOpen, setIsGiphyOpen] = useState(false)

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [isUploadingAudio, setIsUploadingAudio] = useState(false)

  const typingTimerRef    = useRef(null)
  const fileInputRef      = useRef(null)
  const messageInputRef   = useRef(null)
  const mediaRecorderRef  = useRef(null)
  const audioChunksRef    = useRef([])
  const recordIntervalRef = useRef(null)
  const streamRef         = useRef(null)

  useEffect(() => () => {
    clearTimeout(typingTimerRef.current)
    clearInterval(recordIntervalRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
  }, [])

  const adjustHeight = () => {
    const el = messageInputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
  }

  // Adjust height whenever value changes
  useEffect(() => {
    adjustHeight()
  }, [value])

  // Auto-focus input box when a message is selected for reply
  useEffect(() => {
    if (replyingTo && messageInputRef.current) {
      messageInputRef.current.focus()
    }
  }, [replyingTo])

  // Populate and focus input when editing a message
  useEffect(() => {
    if (editingMessage) {
      setValue(editingMessage.text || '')
      if (messageInputRef.current) {
        messageInputRef.current.focus()
      }
    }
  }, [editingMessage])

  const handleChange = (e) => {
    const newVal = e.target.value
    setValue(newVal)
    adjustHeight()
    if (newVal.trim()) {
      onTypingStart?.()
      clearTimeout(typingTimerRef.current)
      typingTimerRef.current = setTimeout(() => onTypingStop?.(), 2000)
    } else {
      clearTimeout(typingTimerRef.current)
      onTypingStop?.()
    }
  }

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files).slice(0, 4 - imageFiles.length)
    if (files.length === 0) return
    setImageFiles(prev => [...prev, ...files].slice(0, 4))
    const newPreviews = files.map(f => URL.createObjectURL(f))
    setPreviews(prev => [...prev, ...newPreviews].slice(0, 4))
    e.target.value = ''
  }

  const removeImage = (idx) => {
    setImageFiles(prev => prev.filter((_, i) => i !== idx))
    setPreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const clearImages = () => {
    setImageFiles([])
    setPreviews([])
  }

  // ── Voice Recording Functions ──────────────────────────────────────────────
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert('Microphone access is not supported by your browser.')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.start(200)
      setIsRecording(true)
      setRecordSeconds(0)

      recordIntervalRef.current = setInterval(() => {
        setRecordSeconds(prev => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Error accessing microphone:', err)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    clearInterval(recordIntervalRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    setIsRecording(false)
    setRecordSeconds(0)
    audioChunksRef.current = []
  }

  const stopAndSendRecording = async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return

    clearInterval(recordIntervalRef.current)
    const duration = recordSeconds

    mediaRecorderRef.current.onstop = async () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }

      if (audioChunksRef.current.length === 0) {
        setIsRecording(false)
        return
      }

      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      audioChunksRef.current = []
      setIsRecording(false)
      setRecordSeconds(0)

      setIsUploadingAudio(true)
      try {
        const formData = new FormData()
        formData.append('audio', audioBlob, 'voicenote.webm')

        const res = await fetch(getApiUrl('/api/messages/audio'), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message)

        onSend?.({
          text: '',
          audioUrl: data.audioUrl,
          audioDuration: duration,
          replyTo: replyingTo?._id || null,
        })
        onCancelReply?.()
      } catch (err) {
        console.error('Audio upload failed:', err)
        alert('Failed to send voice note.')
      } finally {
        setIsUploadingAudio(false)
      }
    }

    mediaRecorderRef.current.stop()
  }

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // ── Submit Text / Images / Edit ────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed && imageFiles.length === 0) return

    clearTimeout(typingTimerRef.current)
    onTypingStop?.()

    // Handle Edit Mode
    if (editingMessage) {
      if (trimmed) {
        onSaveEdit?.(editingMessage._id, trimmed)
        setValue('')
      }
      return
    }

    if (imageFiles.length > 0) {
      const filesToUpload = [...imageFiles]
      const textToSend    = trimmed
      const replyTarget   = replyingTo?._id || null
      const localImageUrls = filesToUpload.map(f => URL.createObjectURL(f))

      // 1. Instantly render optimistic photo message in chat feed (0ms delay)
      onSend?.({
        text: textToSend,
        imageUrls: localImageUrls,
        imageUrl: localImageUrls[0] || null,
        replyTo: replyTarget,
        isOptimistic: true,
        isUploading: true,
      })

      // 2. Instant optimistic reset: clear inputs immediately in 0ms!
      clearImages()
      setValue('')
      onCancelReply?.()

      // 3. Asynchronous background upload & socket dispatch
      ;(async () => {
        try {
          const compressedFiles = await Promise.all(
            filesToUpload.map(f => compressImage(f, { maxWidth: 1200, maxHeight: 1200, quality: 0.8 }))
          )
          const formData = new FormData()
          compressedFiles.forEach(f => formData.append('images', f))

          const res = await fetch(getApiUrl('/api/messages/media'), {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.message || 'Media upload failed')

          onSend?.({
            text: textToSend,
            imageUrls: data.imageUrls,
            replyTo: replyTarget,
          })
        } catch (err) {
          console.error('Optimistic media upload failed:', err)
        }
      })()
    } else {
      onSend?.({
        text: trimmed,
        replyTo: replyingTo?._id || null,
      })
      setValue('')
      onCancelReply?.()
    }
  }

  const handleSelectGif = (gifUrl) => {
    setIsGiphyOpen(false)
    onSend?.({
      text: '',
      imageUrl: gifUrl,
      imageUrls: [gifUrl],
      replyTo: replyingTo?._id || null,
    })
    onCancelReply?.()
  }

  const handleFocus = (e) => {
    setTimeout(() => {
      e.target?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
    }, 120)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const isMobileScreen = typeof window !== 'undefined' && (window.innerWidth < 768 || 'ontouchstart' in window || navigator.maxTouchPoints > 0)
      if (isMobileScreen) {
        // On mobile: Enter inserts newline, do NOT submit
        return
      }
      if (!e.shiftKey) {
        e.preventDefault()
        handleSubmit(e)
      }
    }
  }

  return (
    <div className="relative flex-shrink-0 border-t border-zinc-800 bg-zinc-900 px-4 py-3">
      {/* GIPHY Picker Popover */}
      <GiphyPicker
        isOpen={isGiphyOpen}
        onClose={() => setIsGiphyOpen(false)}
        onSelectGif={handleSelectGif}
      />

      {/* Editing Message Banner */}
      <AnimatePresence>
        {editingMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 10, height: 0 }}
            className="mb-2 bg-amber-500/10 border-l-4 border-amber-500 rounded-r-2xl px-3 py-2 flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2 overflow-hidden mr-2">
              <Pencil size={14} className="text-amber-400 flex-shrink-0" />
              <div className="truncate">
                <p className="font-semibold text-amber-300">Editing Message</p>
                <p className="text-zinc-400 truncate text-[11px]">{editingMessage.text}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onCancelEdit?.()
                setValue('')
              }}
              className="w-6 h-6 rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply Preview Bar */}
      <AnimatePresence>
        {replyingTo && !editingMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 10, height: 0 }}
            className="mb-2 bg-zinc-800/90 border-l-4 border-indigo-500 rounded-r-2xl px-3 py-2 flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2 overflow-hidden mr-2">
              <CornerUpLeft size={14} className="text-indigo-400 flex-shrink-0" />
              <div className="truncate">
                <p className="font-semibold text-indigo-300">
                  Replying to {replyingTo.sender?.username || 'User'}
                </p>
                <p className="text-zinc-400 truncate text-[11px]">
                  {replyingTo.audioUrl ? '🎵 Voice Note' : replyingTo.imageUrls?.length || replyingTo.imageUrl ? '📷 Photo' : replyingTo.text || 'Message'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancelReply}
              className="w-6 h-6 rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Multi-image preview strip */}
      <AnimatePresence>
        {previews.length > 0 && !editingMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2 flex items-center gap-2 flex-wrap overflow-hidden"
          >
            {previews.map((src, idx) => (
              <div key={idx} className="relative">
                <img
                  src={src}
                  alt={`Preview ${idx + 1}`}
                  className="h-20 w-20 rounded-xl object-cover border border-zinc-700"
                />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-900 border border-zinc-600 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-colors"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            {imageFiles.length < 4 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-20 w-20 rounded-xl border-2 border-dashed border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors"
              >
                <ImageIcon size={20} />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input or Voice Recording Row */}
      {isRecording ? (
        <div className="flex items-center justify-between bg-zinc-800/90 border border-indigo-500/30 rounded-2xl px-4 py-2">
          {/* Recording indicator & timer */}
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="text-sm font-semibold text-zinc-100 font-mono tracking-wider">
              {formatTimer(recordSeconds)}
            </span>
            <span className="text-xs text-zinc-400 ml-1 hidden sm:inline">Recording audio...</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              onClick={cancelRecording}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-8 h-8 rounded-full bg-zinc-700/80 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
              title="Cancel recording"
            >
              <Trash2 size={16} />
            </motion.button>
            <motion.button
              type="button"
              onClick={stopAndSendRecording}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={isUploadingAudio}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isUploadingAudio ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  <Send size={13} />
                  <span>Send</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          autoComplete="off"
          data-form-type="other"
          className="flex items-center gap-2 sm:gap-3"
        >
          {/* Hidden file input — multiple */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />

          {/* Attachment button */}
          {!editingMessage && (
            <motion.button
              type="button"
              id="chat-attach-btn"
              onClick={() => fileInputRef.current?.click()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={imageFiles.length >= 4}
              className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-colors cursor-pointer
                ${imageFiles.length > 0
                  ? 'text-indigo-400 bg-indigo-500/10'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              title="Attach Images"
            >
              {imageFiles.length > 0 ? <ImageIcon size={18} /> : <Paperclip size={18} />}
            </motion.button>
          )}

          {/* GIPHY button */}
          {!editingMessage && (
            <motion.button
              type="button"
              id="chat-gif-btn"
              onClick={() => setIsGiphyOpen(prev => !prev)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex-shrink-0 px-2 h-8 flex items-center justify-center rounded-xl font-extrabold text-[11px] tracking-wider transition-colors cursor-pointer ${
                isGiphyOpen
                  ? 'text-indigo-300 bg-indigo-500/20 border border-indigo-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-700/60'
              }`}
              title="Search & Send GIFs via GIPHY"
            >
              GIF
            </motion.button>
          )}

          {/* Auto-expanding Textarea */}
          <textarea
            ref={messageInputRef}
            id="chat-message-input"
            rows={1}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            autoCapitalize="sentences"
            data-form-type="other"
            placeholder={
              editingMessage
                ? 'Edit message…'
                : imageFiles.length > 0
                ? (isVanishMode ? 'Caption pesan sementara…' : 'Add a caption…')
                : (isVanishMode ? 'Pesan sementara (24 jam)...' : 'Type a message…')
            }
            className={`
              flex-1 text-sm placeholder-zinc-500 rounded-2xl px-4 py-2.5 outline-none resize-none max-h-32 min-h-[42px] leading-relaxed transition-all overflow-y-auto
              ${editingMessage
                ? 'bg-amber-950/20 text-amber-100 border border-amber-500/40 focus:border-amber-400'
                : isVanishMode
                ? 'bg-zinc-900/90 text-indigo-100 border border-indigo-500/40 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20'
                : 'bg-zinc-800 text-zinc-100 border border-transparent focus:border-zinc-600'
              }
            `}
          />

          {/* Microphone button (when text is empty and no images and not editing) */}
          {!editingMessage && !value.trim() && imageFiles.length === 0 ? (
            <motion.button
              type="button"
              id="chat-voice-btn"
              onClick={startRecording}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Record Voice Note"
            >
              <Mic size={18} />
            </motion.button>
          ) : (
            /* Send / Save Edit button */
            <motion.button
              type="submit"
              id="chat-send-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={(!value.trim() && imageFiles.length === 0) || isUploading}
              className={`
                flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-white shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-opacity cursor-pointer
                ${editingMessage
                  ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                  : 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20'
                }
              `}
              title={editingMessage ? 'Save changes' : 'Send'}
            >
              {isUploading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : editingMessage ? (
                <Check size={16} />
              ) : (
                <Send size={16} />
              )}
            </motion.button>
          )}
        </form>
      )}
    </div>
  )
}

