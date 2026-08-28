import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Palette, Image as ImageIcon, Sparkles, Check, RotateCcw, Loader2, Upload, Trash2, Crop } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getApiUrl } from '../config/api'
import ImageCropperModal from './ImageCropperModal'

export const PRESET_THEMES = [
  {
    id: 'default',
    name: 'Default',
    bubbleColor: '#6366f1',
    wallpaperUrl: '',
    gradient: 'from-indigo-600 to-violet-600',
    description: 'Tema indigo modern klasik Ping!',
  },
  {
    id: 'rose',
    name: 'Rose',
    bubbleColor: '#f43f5e',
    wallpaperUrl: 'radial-gradient(circle at 50% 10%, rgba(244,63,94,0.18), transparent 60%), radial-gradient(circle at 50% 90%, rgba(159,18,57,0.15), transparent 60%)',
    gradient: 'from-rose-500 to-pink-600',
    description: 'Nuansa romantis & hangat warna mawar',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    bubbleColor: '#10b981',
    wallpaperUrl: 'radial-gradient(circle at 50% 10%, rgba(16,185,129,0.18), transparent 60%), radial-gradient(circle at 50% 90%, rgba(4,120,87,0.15), transparent 60%)',
    gradient: 'from-emerald-500 to-teal-600',
    description: 'Sentuhan segar & menenangkan hijau zamrud',
  },
  {
    id: 'neon',
    name: 'Neon',
    bubbleColor: '#d946ef',
    wallpaperUrl: 'radial-gradient(circle at 20% 20%, rgba(217,70,239,0.2), transparent 45%), radial-gradient(circle at 80% 80%, rgba(6,182,212,0.2), transparent 45%)',
    gradient: 'from-fuchsia-500 via-purple-600 to-cyan-500',
    description: 'Estetika futuristik neon pink & cyan',
  },
  {
    id: 'sapphire',
    name: 'Sapphire',
    bubbleColor: '#2563eb',
    wallpaperUrl: 'radial-gradient(circle at 50% 10%, rgba(37,99,235,0.18), transparent 60%), radial-gradient(circle at 50% 90%, rgba(30,58,138,0.22), transparent 60%)',
    gradient: 'from-blue-600 to-indigo-900',
    description: 'Elegan, dalam, dan fokus warna sapphire',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    bubbleColor: '#ea580c',
    wallpaperUrl: 'radial-gradient(circle at 50% 10%, rgba(234,88,12,0.18), transparent 60%), radial-gradient(circle at 50% 90%, rgba(194,65,12,0.16), transparent 60%)',
    gradient: 'from-orange-500 to-amber-600',
    description: 'Nuansa hangat senja jingga keemasan',
  },
]

export const BUILTIN_WALLPAPERS = [
  { id: 'none', name: 'Tanpa Wallpaper', value: '' },
  {
    id: 'dots',
    name: 'Minimalist Dots',
    value: 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
    bgSize: '16px 16px',
  },
  {
    id: 'grid',
    name: 'Cyber Grid',
    value: 'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
    bgSize: '24px 24px',
  },
  {
    id: 'aurora',
    name: 'Aurora Glow',
    value: 'radial-gradient(circle at 30% 20%, rgba(99,102,241,0.18), transparent 50%), radial-gradient(circle at 80% 80%, rgba(236,72,153,0.15), transparent 50%)',
  },
  {
    id: 'nebula',
    name: 'Deep Nebula',
    value: 'radial-gradient(circle at 50% 50%, rgba(139,92,246,0.15), transparent 70%), radial-gradient(circle at 10% 90%, rgba(6,182,212,0.15), transparent 60%)',
  },
]

export const COLOR_SWATCHES = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#d946ef', // Fuchsia
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#ef4444', // Red
  '#ea580c', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#2563eb', // Blue
  '#64748b', // Slate
]

export default function ThemeModal({
  isOpen,
  onClose,
  conversationId,
  currentTheme,
  onThemeUpdated,
}) {
  const { token } = useAuth()
  const [selectedPreset, setSelectedPreset] = useState(currentTheme?.presetTheme || 'default')
  const [bubbleColor, setBubbleColor]       = useState(currentTheme?.bubbleColor || '#6366f1')
  const [wallpaperUrl, setWallpaperUrl]     = useState(currentTheme?.wallpaperUrl || '')
  const [isSaving, setIsSaving]             = useState(false)
  const [isUploadingWallpaper, setIsUploadingWallpaper] = useState(false)

  // Cropper states
  const [cropperRawSrc, setCropperRawSrc]   = useState(null)
  const [isCropperOpen, setIsCropperOpen]   = useState(false)
  const fileInputRef                        = useRef(null)

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      const preset = currentTheme?.presetTheme || 'default'
      const color = currentTheme?.bubbleColor || (PRESET_THEMES.find(p => p.id === preset)?.bubbleColor || '#6366f1')
      const wp = currentTheme?.wallpaperUrl || ''
      setSelectedPreset(preset)
      setBubbleColor(color)
      setWallpaperUrl(wp)
    }
  }, [isOpen, currentTheme])

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset.id)
    setBubbleColor(preset.bubbleColor)
    setWallpaperUrl(preset.wallpaperUrl)
  }

  const handleSelectBuiltinWallpaper = (wp) => {
    setWallpaperUrl(wp.value)
    if (selectedPreset !== 'custom') {
      setSelectedPreset('custom')
    }
  }

  // Handle custom wallpaper file select
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setCropperRawSrc(url)
      setIsCropperOpen(true)
    }
    e.target.value = ''
  }

  // Handle cropped image finish
  const handleCropFinished = async (croppedBlob) => {
    if (!croppedBlob || !conversationId) return
    setIsUploadingWallpaper(true)
    try {
      const formData = new FormData()
      formData.append('wallpaper', croppedBlob, 'wallpaper.jpg')

      const res = await fetch(getApiUrl(`/api/conversations/${conversationId}/wallpaper`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })
      const data = await res.json()
      if (res.ok && data.wallpaperUrl) {
        setWallpaperUrl(data.wallpaperUrl)
        setSelectedPreset('custom')
      }
    } catch (err) {
      console.error('Failed to upload custom wallpaper:', err)
    } finally {
      setIsUploadingWallpaper(false)
    }
  }

  const handleSaveTheme = async () => {
    if (!conversationId) return
    setIsSaving(true)

    const payload = {
      presetTheme: selectedPreset,
      bubbleColor,
      wallpaperUrl,
    }

    try {
      const res = await fetch(getApiUrl(`/api/conversations/${conversationId}/theme`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        onThemeUpdated?.(data.customTheme || payload)
        onClose()
      }
    } catch (err) {
      console.error('Failed to update theme:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetToDefault = () => {
    setSelectedPreset('default')
    setBubbleColor('#6366f1')
    setWallpaperUrl('')
  }

  if (!isOpen) return null

  // Compute live wallpaper preview style
  const isCustomImageWp = wallpaperUrl && (wallpaperUrl.startsWith('http://') || wallpaperUrl.startsWith('https://') || wallpaperUrl.startsWith('data:'))
  const previewBgStyle = wallpaperUrl
    ? isCustomImageWp
      ? { backgroundImage: `url(${wallpaperUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { backgroundImage: wallpaperUrl, backgroundSize: BUILTIN_WALLPAPERS.find(w => w.value === wallpaperUrl)?.bgSize || 'auto' }
    : {}

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal Window */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[90vh] bg-zinc-900 border border-zinc-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 relative"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between flex-shrink-0 bg-zinc-900/60 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Palette size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-100">Tema & Wallpaper Chat</h2>
                  <p className="text-xs text-zinc-400">Kustomisasi tampilan ruang chat ini secara real-time</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* 1. Live Interactive Preview */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-indigo-400" />
                  <span>Pratinjau Langsung</span>
                </label>
                <div
                  className="w-full h-36 rounded-2xl border border-zinc-700/60 p-3.5 flex flex-col justify-between overflow-hidden relative shadow-inner bg-zinc-950/80 transition-all duration-300"
                  style={previewBgStyle}
                >
                  {/* Incoming bubble */}
                  <div className="flex items-start gap-2 max-w-[80%]">
                    <div className="w-6 h-6 rounded-full bg-zinc-700 text-[10px] flex items-center justify-center font-bold text-zinc-300 flex-shrink-0 shadow">
                      AI
                    </div>
                    <div className="bg-zinc-800/90 text-zinc-100 text-xs px-3 py-1.5 rounded-2xl rounded-bl-sm border border-zinc-700/40 shadow-sm backdrop-blur-xs">
                      Halo! Wallpaper & tema chat terlihat estetik ✨
                    </div>
                  </div>

                  {/* Outgoing bubble with selected color */}
                  <div className="flex items-end justify-end gap-2 max-w-[80%] self-end">
                    <div
                      className="text-white text-xs px-3 py-1.5 rounded-2xl rounded-br-sm shadow-md font-medium transition-colors duration-200 backdrop-blur-xs"
                      style={{ backgroundColor: bubbleColor }}
                    >
                      Keren banget, warna balon & temanya pas! 🔥
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Preset Themes */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2.5 block">
                  Tema Preset
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {PRESET_THEMES.map((preset) => {
                    const isSelected = selectedPreset === preset.id
                    return (
                      <motion.button
                        key={preset.id}
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                          isSelected
                            ? 'border-indigo-500 bg-zinc-800/90 ring-2 ring-indigo-500/20'
                            : 'border-zinc-800 bg-zinc-850/60 hover:bg-zinc-800/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div
                            className={`w-6 h-6 rounded-full bg-gradient-to-tr ${preset.gradient} shadow-md flex items-center justify-center`}
                          >
                            {isSelected && <Check size={12} className="text-white drop-shadow" />}
                          </div>
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/20"
                            style={{ backgroundColor: preset.bubbleColor }}
                          />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-200 truncate">{preset.name}</p>
                          <p className="text-[10px] text-zinc-400 line-clamp-1">{preset.description}</p>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              {/* 3. Custom Bubble Color Palette */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Warna Balon Pesan (Sent Bubble)
                  </label>
                  <span className="text-[11px] font-mono text-zinc-400 font-semibold uppercase">
                    {bubbleColor}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 p-2.5 bg-zinc-850/60 border border-zinc-800 rounded-2xl">
                  {COLOR_SWATCHES.map((color) => {
                    const isSelected = bubbleColor.toLowerCase() === color.toLowerCase()
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          setBubbleColor(color)
                          setSelectedPreset('custom')
                        }}
                        className={`w-7 h-7 rounded-full transition-transform cursor-pointer relative flex items-center justify-center shadow-md ${
                          isSelected ? 'scale-115 ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {isSelected && <Check size={12} className="text-white drop-shadow" />}
                      </button>
                    )
                  })}

                  {/* Native Color Picker input */}
                  <div className="relative w-7 h-7 rounded-full overflow-hidden border border-zinc-600 cursor-pointer shadow-md hover:scale-105 transition-transform flex items-center justify-center bg-zinc-800">
                    <input
                      type="color"
                      value={bubbleColor}
                      onChange={(e) => {
                        setBubbleColor(e.target.value)
                        setSelectedPreset('custom')
                      }}
                      className="absolute -inset-2 w-12 h-12 opacity-0 cursor-pointer"
                      title="Pilih warna custom"
                    />
                    <Palette size={12} className="text-zinc-300 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* 4. Built-in Background Patterns & Wallpapers */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 block">
                  Pola Wallpaper Bawaan
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {BUILTIN_WALLPAPERS.map((wp) => {
                    const isSelected = wallpaperUrl === wp.value
                    return (
                      <button
                        key={wp.id}
                        type="button"
                        onClick={() => handleSelectBuiltinWallpaper(wp)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border text-left transition-colors cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                            : 'border-zinc-800 bg-zinc-850/50 text-zinc-300 hover:bg-zinc-800/60'
                        }`}
                      >
                        <span className="truncate">{wp.name}</span>
                        {isSelected && <Check size={12} className="text-indigo-400 flex-shrink-0 ml-1" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 5. Custom Wallpaper File Upload with Cropper */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                  <ImageIcon size={13} className="text-indigo-400" />
                  <span>Upload Custom Wallpaper (dengan Crop)</span>
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {isCustomImageWp ? (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-850 border border-zinc-700/60">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700 flex-shrink-0">
                        <img src={wallpaperUrl} alt="Wallpaper" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-200 truncate">Wallpaper Foto Kustom</p>
                        <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <Check size={10} />
                          <span>Siap diterapkan</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer"
                      >
                        Ganti
                      </button>
                      <button
                        type="button"
                        onClick={() => setWallpaperUrl('')}
                        className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                        title="Hapus wallpaper kustom"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingWallpaper}
                    className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl border border-dashed border-zinc-700 hover:border-indigo-500/80 bg-zinc-850/40 hover:bg-zinc-800/60 text-zinc-300 hover:text-indigo-300 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isUploadingWallpaper ? (
                      <Loader2 size={16} className="animate-spin text-indigo-400" />
                    ) : (
                      <Upload size={16} className="text-indigo-400" />
                    )}
                    <span className="text-xs font-semibold">
                      {isUploadingWallpaper ? 'Mengupload wallpaper...' : 'Pilih Foto dari Galeri / File'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/80 flex items-center justify-between flex-shrink-0">
              <button
                type="button"
                onClick={handleResetToDefault}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 px-3 py-2 rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer font-medium"
              >
                <RotateCcw size={13} />
                <span>Reset Default</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveTheme}
                  disabled={isSaving || isUploadingWallpaper}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>Simpan Tema</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Image Cropper for Wallpaper */}
      <ImageCropperModal
        isOpen={isCropperOpen}
        imageSrc={cropperRawSrc}
        cropShape="rect"
        aspect={9 / 16}
        title="Sesuaikan & Potong Wallpaper"
        onClose={() => {
          setIsCropperOpen(false)
          setCropperRawSrc(null)
        }}
        onCropFinished={handleCropFinished}
      />
    </>
  )
}
