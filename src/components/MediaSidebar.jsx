import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Image as ImageIcon, Mic, Play, Pause, FolderOpen, Calendar } from 'lucide-react'
import Lightbox from './Lightbox'

function MiniAudioPlayer({ audioUrl, duration, sender, timestamp }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [loadedDuration, setLoadedDuration] = useState(duration || 0)
  const audioRef = useRef(null)

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(err => console.error('Audio playback failed:', err))
    }
  }

  const formatTime = (sec) => {
    if (!isFinite(sec) || isNaN(sec) || sec <= 0) return '0:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const effectiveDuration = (isFinite(loadedDuration) && loadedDuration > 0)
    ? loadedDuration
    : (isFinite(duration) && duration > 0 ? Number(duration) : 0)

  const progress = effectiveDuration > 0
    ? Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100))
    : 0

  return (
    <div className="p-3 bg-zinc-800/60 border border-zinc-700/50 rounded-2xl flex flex-col gap-2 transition-all hover:bg-zinc-800">
      <audio
        ref={audioRef}
        src={audioUrl}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => {
          if (audioRef.current && isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
            setLoadedDuration(audioRef.current.duration)
          }
        }}
        onEnded={() => {
          setIsPlaying(false)
          setCurrentTime(0)
        }}
      />
      
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-zinc-200 truncate">
          {sender?.username || 'User'}
        </span>
        <span className="text-zinc-500 text-[10px]">{timestamp}</span>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={togglePlay}
          className="w-8 h-8 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center transition-transform active:scale-95 flex-shrink-0 cursor-pointer shadow-md shadow-indigo-500/20"
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
        </button>

        <div className="flex-1">
          <div className="w-full bg-zinc-700 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-400 h-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-zinc-400 mt-1 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(effectiveDuration)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MediaSidebar({ isOpen, onClose, messages = [] }) {
  const [activeTab, setActiveTab] = useState('photos') // 'photos' | 'voice'
  const [lightboxSrc, setLightboxSrc] = useState(null)

  // Extract all photos
  const photos = messages
    .filter((m) => !m.isDeleted && (m.imageUrls?.length > 0 || m.imageUrl))
    .flatMap((m) => {
      const urls = m.imageUrls?.length ? m.imageUrls : m.imageUrl ? [m.imageUrl] : []
      return urls.map((url, i) => ({
        url,
        id: `${m._id}-${i}`,
        timestamp: m.timestamp || (m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''),
        sender: m.sender,
      }))
    })

  // Extract all voice notes
  const voiceNotes = messages
    .filter((m) => !m.isDeleted && m.audioUrl)
    .map((m) => ({
      id: m._id,
      audioUrl: m.audioUrl,
      audioDuration: m.audioDuration,
      timestamp: m.timestamp || (m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''),
      sender: m.sender,
    }))

  return (
    <>
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 32 }}
            className="absolute top-0 right-0 bottom-0 w-full sm:w-80 md:w-96 bg-zinc-900/95 border-l border-zinc-800 backdrop-blur-xl z-30 flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 flex-shrink-0">
              <div className="flex items-center gap-2">
                <FolderOpen size={18} className="text-indigo-400" />
                <h3 className="text-sm font-semibold text-zinc-100">Shared Media</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 p-2 border-b border-zinc-800 bg-zinc-950/40 flex-shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('photos')}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'photos'
                    ? 'bg-zinc-800 text-indigo-300 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
              >
                <ImageIcon size={14} />
                <span>Photos ({photos.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('voice')}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'voice'
                    ? 'bg-zinc-800 text-indigo-300 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
              >
                <Mic size={14} />
                <span>Voice Notes ({voiceNotes.length})</span>
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'photos' ? (
                photos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setLightboxSrc(item.url)}
                        className="group relative aspect-square rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700/60 cursor-pointer"
                      >
                        <img
                          src={item.url}
                          alt="Shared media"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                          <span className="text-[10px] text-white/90 font-mono truncate">
                            {item.timestamp}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 gap-2 text-zinc-500">
                    <ImageIcon size={36} className="opacity-40" />
                    <p className="text-sm font-medium text-zinc-400">No photos yet</p>
                    <p className="text-xs">Photos sent in this chat will appear here.</p>
                  </div>
                )
              ) : (
                voiceNotes.length > 0 ? (
                  <div className="space-y-2.5">
                    {voiceNotes.map((vn) => (
                      <MiniAudioPlayer
                        key={vn.id}
                        audioUrl={vn.audioUrl}
                        duration={vn.audioDuration}
                        sender={vn.sender}
                        timestamp={vn.timestamp}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 gap-2 text-zinc-500">
                    <Mic size={36} className="opacity-40" />
                    <p className="text-sm font-medium text-zinc-400">No voice notes yet</p>
                    <p className="text-xs">Voice notes sent in this chat will appear here.</p>
                  </div>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
