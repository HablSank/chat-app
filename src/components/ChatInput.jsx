import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Paperclip, Send, X, Loader2, ImageIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function ChatInput({ onSend, onTypingStart, onTypingStop, isVanishMode }) {
  const { token } = useAuth()
  const [value, setValue]           = useState('')
  const [imageFiles, setImageFiles] = useState([])    // up to 4
  const [previews, setPreviews]     = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const typingTimerRef               = useRef(null)
  const fileInputRef                 = useRef(null)

  useEffect(() => () => clearTimeout(typingTimerRef.current), [])

  const handleChange = (e) => {
    const newVal = e.target.value
    setValue(newVal)
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed && imageFiles.length === 0) return

    clearTimeout(typingTimerRef.current)
    onTypingStop?.()

    if (imageFiles.length > 0) {
      setIsUploading(true)
      try {
        const formData = new FormData()
        imageFiles.forEach(f => formData.append('images', f))
        const res = await fetch('/api/messages/media', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message)
        onSend?.({ text: trimmed, imageUrls: data.imageUrls })
        clearImages()
        setValue('')
      } catch (err) {
        console.error('Image upload failed:', err)
      } finally {
        setIsUploading(false)
      }
    } else {
      onSend?.({ text: trimmed })
      setValue('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="flex-shrink-0 border-t border-zinc-800 bg-zinc-900 px-4 py-3">
      {/* Multi-image preview strip */}
      <AnimatePresence>
        {previews.length > 0 && (
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

      <form onSubmit={handleSubmit} className="flex items-center gap-3">
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
        <motion.button
          type="button"
          id="chat-attach-btn"
          onClick={() => fileInputRef.current?.click()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={imageFiles.length >= 4}
          className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-colors
            ${imageFiles.length > 0
              ? 'text-indigo-400 bg-indigo-500/10'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {imageFiles.length > 0 ? <ImageIcon size={18} /> : <Paperclip size={18} />}
        </motion.button>

        {/* Text input */}
        <input
          id="chat-message-input"
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={
            imageFiles.length > 0
              ? (isVanishMode ? 'Caption pesan sementara…' : 'Add a caption…')
              : (isVanishMode ? 'Pesan sementara (24 jam)...' : 'Type a message…')
          }
          className={`
            flex-1 text-sm placeholder-zinc-500 rounded-2xl px-4 py-2.5 outline-none transition-all
            ${isVanishMode
              ? 'bg-zinc-900/90 text-indigo-100 border border-indigo-500/40 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20'
              : 'bg-zinc-800 text-zinc-100 border border-transparent focus:border-zinc-600'
            }
          `}
        />

        {/* Send button */}
        <motion.button
          type="submit"
          id="chat-send-btn"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={(!value.trim() && imageFiles.length === 0) || isUploading}
          className="
            flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full
            bg-indigo-500 text-white shadow-lg shadow-indigo-500/20
            disabled:opacity-40 disabled:cursor-not-allowed transition-opacity
          "
        >
          {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </motion.button>
      </form>
    </div>
  )
}
