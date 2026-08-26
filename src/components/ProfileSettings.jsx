import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, Loader2, CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const panelVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 380, damping: 30 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.2 },
  },
}

export default function ProfileSettings({ isOpen, onClose }) {
  const { user, token, updateUser } = useAuth()

  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [presence, setPresence] = useState(user?.presence || 'online')
  const [statusEmoji, setStatusEmoji] = useState(user?.statusEmoji || '')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [error, setError] = useState('')

  const fileInputRef = useRef(null)

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    setIsSaved(false)

    try {
      const formData = new FormData()
      formData.append('displayName', displayName)
      formData.append('bio', bio)
      if (avatarFile) {
        formData.append('avatar', avatarFile)
      }

      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to update profile')

      const presenceRes = await fetch('/api/users/presence', {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ presence, statusEmoji }),
      })
      const presenceData = await presenceRes.json()
      if (!presenceRes.ok) throw new Error(presenceData.message || 'Failed to update presence')

      // Update the AuthContext so changes reflect everywhere immediately
      updateUser({
        displayName: data.displayName,
        bio: data.bio,
        avatar: data.avatar,
        presence: presenceData.presence,
        statusEmoji: presenceData.statusEmoji
      })

      setIsSaved(true)
      setAvatarFile(null)

      setTimeout(() => {
        setIsSaved(false)
        onClose()
      }, 1200)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70]">
          {/* Backdrop */}
          <motion.div
            key="overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto pointer-events-none">
            <motion.div
              key="panel"
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm sm:max-w-md mx-4 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden relative my-auto pointer-events-auto"
            >
              {/* Header Banner */}
              <div className="h-28 sm:h-32 bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-zinc-900 relative border-b border-zinc-800/40">
                <div className="absolute top-4 left-6">
                  <h2 className="text-base font-semibold text-zinc-100 drop-shadow-sm">Edit Profile</h2>
                  <p className="text-xs text-zinc-400">Customize your public presence</p>
                </div>
                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-900/80 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors border border-zinc-700/50 backdrop-blur-sm"
                >
                  <X size={15} />
                </motion.button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="px-6 pb-6 pt-0 space-y-4">
                {/* Avatar Upload with Cutout Effect */}
                <div className="flex items-end justify-between -mt-12 mb-3">
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-800 border-4 border-zinc-900 shadow-xl group-hover:border-indigo-500/80 transition-all duration-200">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Avatar preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-400 text-3xl font-bold bg-zinc-800">
                          {(user?.displayName || user?.username || '?')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    {/* Camera overlay icon */}
                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-4 border-transparent">
                      <Camera size={22} className="text-white drop-shadow" />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors pb-2"
                  >
                    Change photo
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>

                {/* Username (read-only) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Username</label>
                  <div className="w-full px-3.5 py-2 rounded-xl bg-zinc-800/40 text-sm text-zinc-500 cursor-not-allowed border border-zinc-800 select-none">
                    @{user?.username}
                  </div>
                </div>

                {/* Display Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={user?.username}
                    maxLength={40}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-800 border border-zinc-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all"
                  />
                </div>

                {/* Bio */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Bio</label>
                    <span className="text-[10px] text-zinc-500">{bio.length}/150</span>
                  </div>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell people a little about yourself..."
                    maxLength={150}
                    rows={3}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-800 border border-zinc-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all resize-none"
                  />
                </div>

                {/* Presence & Emoji Status */}
                <div className="flex gap-3">
                  <div className="flex-1 space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Status</label>
                    <select
                      value={presence}
                      onChange={(e) => setPresence(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-zinc-800 border border-zinc-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-sm text-zinc-100 outline-none transition-all appearance-none"
                    >
                      <option value="online">🟢 Online</option>
                      <option value="idle">🟡 Idle</option>
                      <option value="dnd">🔴 Do Not Disturb</option>
                    </select>
                  </div>
                  <div className="w-20 space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Emoji</label>
                    <input
                      type="text"
                      value={statusEmoji}
                      onChange={(e) => setStatusEmoji(e.target.value)}
                      placeholder="✨"
                      maxLength={2}
                      className="w-full px-3.5 py-2 rounded-xl bg-zinc-800 border border-zinc-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-sm text-center text-zinc-100 placeholder-zinc-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Error message */}
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl"
                  >
                    {error}
                  </motion.p>
                )}

                {/* Submit button */}
                <motion.button
                  type="submit"
                  disabled={isLoading || isSaved}
                  whileHover={{ scale: isLoading || isSaved ? 1 : 1.01 }}
                  whileTap={{ scale: isLoading || isSaved ? 1 : 0.99 }}
                  className={`
                    w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors mt-2
                    ${isSaved
                      ? 'bg-emerald-500 text-white'
                      : 'bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20'
                    }
                  `}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Saving changes...</span>
                    </>
                  ) : isSaved ? (
                    <>
                      <CheckCircle size={16} />
                      <span>Saved!</span>
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </motion.button>
              </form>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}
