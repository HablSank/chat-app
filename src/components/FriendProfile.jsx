import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Lock, Palette } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getApiUrl } from '../config/api'
import Lightbox from './Lightbox'

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
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.18 } },
}

export default function FriendProfile({ isOpen, onClose, userId, onOpenTheme }) {
  const { token } = useAuth()
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState(null)

  useEffect(() => {
    if (!isOpen || !userId) return
    let isMounted = true

    const fetchProfile = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(getApiUrl(`/api/users/${userId}`), {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (res.ok && isMounted) setProfile(data)
      } catch (err) {
        console.error('Failed to fetch profile', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    fetchProfile()

    return () => {
      isMounted = false
    }
  }, [isOpen, userId, token])

  if (!isOpen) return null

  const isLocked = profile?.isLocked

  return (
    <>
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

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
                {/* Header Gradient Banner */}
                <div className="h-28 sm:h-32 bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-zinc-900 relative border-b border-zinc-800/40">
                  <div className="absolute top-4 left-6">
                    <h2 className="text-base font-semibold text-zinc-100 drop-shadow-sm">User Profile</h2>
                    <p className="text-xs text-zinc-400">View user details</p>
                  </div>
                  <motion.button
                    type="button"
                    onClick={onClose}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-900/80 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors border border-zinc-700/50 backdrop-blur-sm"
                  >
                    <X size={15} />
                  </motion.button>
                </div>

                {/* Avatar & Profile Details */}
                <div className="px-6 pb-6 pt-0">
                  {/* Avatar with Cutout Effect */}
                  <div className="-mt-12 mb-4 flex items-end justify-between">
                    <div
                      className="w-24 h-24 rounded-full overflow-hidden bg-zinc-800 border-4 border-zinc-900 shadow-xl relative cursor-pointer group"
                      onClick={() => {
                        if (profile?.avatar) setLightboxSrc(profile.avatar)
                      }}
                      title={profile?.avatar ? 'Click to view full photo' : ''}
                    >
                      {isLoading ? (
                        <div className="w-full h-full bg-zinc-800 animate-pulse" />
                      ) : profile?.avatar ? (
                        <img
                          src={profile.avatar}
                          alt={profile.username}
                          className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-zinc-400 bg-zinc-800">
                          {(profile?.displayName || profile?.username || '?')[0].toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Online/Offline or Locked Badge */}
                    <div className="flex items-center gap-1.5 bg-zinc-800/60 px-3 py-1 rounded-full border border-zinc-700/50">
                      {isLocked ? (
                        <>
                          <Lock size={12} className="text-amber-400" />
                          <span className="text-xs font-medium text-amber-400">
                            Menunggu Persetujuan
                          </span>
                        </>
                      ) : (
                        <>
                          <span className={`w-2 h-2 rounded-full ${profile?.isOnline ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-zinc-500'}`} />
                          <span className={`text-xs font-medium ${profile?.isOnline ? 'text-emerald-400' : 'text-zinc-400'}`}>
                            {profile?.isOnline ? 'Online' : 'Offline'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="space-y-3 py-2">
                      <div className="h-5 w-40 bg-zinc-800 rounded-lg animate-pulse" />
                      <div className="h-4 w-24 bg-zinc-800 rounded-lg animate-pulse" />
                      <div className="h-12 w-full bg-zinc-800 rounded-lg animate-pulse mt-2" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-lg font-bold text-zinc-100 leading-tight">
                          {profile?.displayName || profile?.username}
                        </h3>
                        <p className="text-xs text-zinc-500 font-medium">@{profile?.username}</p>
                      </div>

                      <div className="bg-zinc-800/40 rounded-2xl p-3.5 border border-zinc-800/80">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">About</p>
                        <p className={`text-sm leading-relaxed break-words ${isLocked ? 'text-zinc-400 italic' : 'text-zinc-300'}`}>
                          {profile?.bio || (isLocked ? 'Profil dan bio disembunyikan sampai permintaan pesan diterima.' : 'Hey there! I am using Chat App.')}
                        </p>
                      </div>

                      {onOpenTheme && !isLocked && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose()
                            onOpenTheme()
                          }}
                          className="w-full flex items-center justify-between p-3 rounded-2xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-200 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <Palette size={16} className="text-pink-400" />
                            <span className="text-xs font-semibold">Tema & Wallpaper Chat</span>
                          </div>
                          <span className="text-[10px] font-medium text-indigo-400">Atur Tema</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
