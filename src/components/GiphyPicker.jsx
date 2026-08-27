import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Loader2, Sparkles, AlertCircle } from 'lucide-react'

const CATEGORIES = [
  'Trending',
  'Reactions',
  'Happy',
  'Sad',
  'Love',
  'Memes',
  'Dance',
  'Applause',
  'Gaming',
]

export default function GiphyPicker({ isOpen, onClose, onSelectGif }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Trending')
  const [gifs, setGifs] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const pickerRef = useRef(null)
  const searchInputRef = useRef(null)

  const apiKey = import.meta.env.VITE_GIPHY_API_KEY

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose?.()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  // Fetch GIFs based on search query or selected category
  useEffect(() => {
    if (!isOpen) return

    if (!apiKey) {
      setError('Giphy API key is not configured.')
      return
    }

    let isMounted = true
    const controller = new AbortController()

    const fetchGifs = async () => {
      setIsLoading(true)
      setError('')

      try {
        let url = ''
        const trimmedQuery = searchQuery.trim()

        if (trimmedQuery) {
          url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(
            trimmedQuery
          )}&limit=30&rating=g`
        } else if (selectedCategory && selectedCategory !== 'Trending') {
          url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(
            selectedCategory
          )}&limit=30&rating=g`
        } else {
          url = `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=30&rating=g`
        }

        const res = await fetch(url, { signal: controller.signal })
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.message || 'Failed to load GIFs from Giphy')
        }

        if (isMounted) {
          setGifs(data.data || [])
        }
      } catch (err) {
        if (err.name !== 'AbortError' && isMounted) {
          console.error('Giphy Fetch Error:', err)
          setError(err.message || 'Failed to load GIFs. Please try again.')
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    const timer = setTimeout(() => {
      fetchGifs()
    }, searchQuery ? 350 : 0)

    return () => {
      isMounted = false
      controller.abort()
      clearTimeout(timer)
    }
  }, [isOpen, searchQuery, selectedCategory, apiKey])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        ref={pickerRef}
        initial={{ opacity: 0, y: 15, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 15, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 450, damping: 30 }}
        className="absolute bottom-full left-4 right-4 sm:left-auto sm:right-16 mb-3 sm:w-96 h-[420px] bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-3 border-b border-zinc-800/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-indigo-400">
            <Sparkles size={16} />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
              GIPHY
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Search Input */}
        <div className="px-3 pt-2.5 pb-1.5 flex-shrink-0">
          <div className="relative flex items-center">
            <Search
              size={14}
              className="absolute left-3 text-zinc-500 pointer-events-none"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                if (e.target.value.trim()) setSelectedCategory('')
              }}
              placeholder="Search all the GIFs..."
              className="w-full bg-zinc-950/70 border border-zinc-800 rounded-2xl pl-9 pr-8 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-zinc-500 hover:text-zinc-300"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
          {CATEGORIES.map((cat) => {
            const isActive = !searchQuery && selectedCategory === cat
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat)
                  setSearchQuery('')
                }}
                className={`px-3 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/80'
                }`}
              >
                {cat}
              </button>
            )
          })}
        </div>

        {/* GIF Grid Area */}
        <div className="flex-1 overflow-y-auto p-3">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-2">
              <Loader2 size={24} className="animate-spin text-indigo-400" />
              <span className="text-xs">Fetching GIFs...</span>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-2 p-4 text-center">
              <AlertCircle size={24} className="text-amber-400" />
              <span className="text-xs">{error}</span>
            </div>
          ) : gifs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs">
              No GIFs found. Try searching for something else!
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {gifs.map((gif) => {
                const gifUrl =
                  gif.images?.fixed_height?.url ||
                  gif.images?.original?.url ||
                  gif.images?.fixed_height_small?.url

                const previewUrl =
                  gif.images?.fixed_height_small?.url ||
                  gif.images?.fixed_height?.url ||
                  gifUrl

                if (!gifUrl) return null

                return (
                  <motion.button
                    key={gif.id}
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      onSelectGif?.(gifUrl)
                      onClose?.()
                    }}
                    className="relative rounded-2xl overflow-hidden bg-zinc-950 aspect-video group cursor-pointer border border-transparent hover:border-indigo-500/40 transition-all shadow-sm"
                  >
                    <img
                      src={previewUrl}
                      alt={gif.title || 'GIF'}
                      className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                      loading="lazy"
                    />
                  </motion.button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer Attribution */}
        <div className="px-3 py-1.5 bg-zinc-950/40 border-t border-zinc-800/60 flex items-center justify-center">
          <span className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
            Powered by GIPHY
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
