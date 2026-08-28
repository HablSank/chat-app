import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Laptop,
  Bell,
  Volume2,
  VolumeX,
  Eye,
  Lock,
  Download,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Languages,
  ShieldCheck,
  Palette,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { usePWAInstall } from '../hooks/usePWAInstall'
import { useAutoUpdate } from '../hooks/useAutoUpdate'
import { getApiUrl } from '../config/api'

export default function SettingsModal({ isOpen, onClose, onOpenThemeModal }) {
  const { token, user, updateUserPresence } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall()
  const { updateAvailable, reloadApp } = useAutoUpdate()

  const [activeTab, setActiveTab]             = useState('system') // 'system' | 'sound' | 'privacy' | 'security'
  const [soundMuted, setSoundMuted]           = useState(() => localStorage.getItem('ping_sound_muted') === 'true')
  const [notificationsAllowed, setNotificationsAllowed] = useState(false)

  // System update state
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [updateStatusMsg, setUpdateStatusMsg]   = useState('')

  // Security password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMsg, setPasswordMsg]         = useState({ type: '', text: '' })

  // Presence toggle state
  const [isOnlineVisible, setIsOnlineVisible] = useState(user?.presence !== 'offline')

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationsAllowed(Notification.permission === 'granted')
    }
  }, [isOpen])

  // Reset messages on modal open / close
  useEffect(() => {
    if (!isOpen) {
      setUpdateStatusMsg('')
      setPasswordMsg({ type: '', text: '' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }, [isOpen])

  const handleToggleSound = () => {
    const nextVal = !soundMuted
    setSoundMuted(nextVal)
    localStorage.setItem('ping_sound_muted', nextVal ? 'true' : 'false')
  }

  const handleTestSound = () => {
    const audio = new Audio('/send.mp3')
    audio.play().catch(() => {})
  }

  const handleToggleNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Browser Anda tidak mendukung push notifications.')
      return
    }

    if (Notification.permission === 'granted') {
      alert('Notifikasi desktop sudah aktif di browser ini.')
      return
    }

    const permission = await Notification.requestPermission()
    setNotificationsAllowed(permission === 'granted')
  }

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true)
    setUpdateStatusMsg('')

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration()
        if (reg) {
          await reg.update()
        }
      } catch (err) {
        console.warn('Update check failed:', err)
      }
    }

    setTimeout(() => {
      setIsCheckingUpdate(false)
      if (updateAvailable) {
        setUpdateStatusMsg(t('updateFound'))
      } else {
        setUpdateStatusMsg(t('upToDate'))
      }
    }, 1200)
  }

  const handleToggleOnlinePresence = async () => {
    const nextPresence = isOnlineVisible ? 'offline' : 'online'
    setIsOnlineVisible(!isOnlineVisible)

    try {
      await fetch(getApiUrl('/api/users/presence'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ presence: nextPresence }),
      })
      updateUserPresence?.(nextPresence)
    } catch (err) {
      console.error('Failed to update presence:', err)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordMsg({ type: '', text: '' })

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: t('passwordTooShort') })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: t('passwordMismatch') })
      return
    }

    setPasswordLoading(true)

    try {
      const res = await fetch(getApiUrl('/api/auth/change-password'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Gagal mengganti kata sandi')

      setPasswordMsg({ type: 'success', text: t('passwordUpdatedSuccess') })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.message || 'Gagal mengganti kata sandi' })
    } finally {
      setPasswordLoading(false)
    }
  }

  if (!isOpen) return null

  const tabs = [
    { id: 'system', label: t('tabSystem'), icon: Laptop },
    { id: 'sound', label: t('tabNotifications'), icon: Bell },
    { id: 'privacy', label: t('tabPrivacy'), icon: Eye },
    { id: 'security', label: t('tabSecurity'), icon: Lock },
  ]

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[85vh] z-10"
        >
          {/* Sidebar Tabs */}
          <div className="w-full md:w-56 bg-zinc-950/60 border-b md:border-b-0 md:border-r border-zinc-800/80 p-4 flex flex-col justify-between flex-shrink-0">
            <div>
              <div className="flex items-center justify-between mb-4 md:mb-6 px-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Sparkles size={16} />
                  </div>
                  <h2 className="text-sm font-bold text-zinc-100">{t('settingsTitle')}</h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="md:hidden text-zinc-400 hover:text-zinc-200 p-1 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Navigation Tabs */}
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
                      }`}
                    >
                      <Icon size={16} className={isActive ? 'text-indigo-400' : 'text-zinc-500'} />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>

            <div className="hidden md:block pt-4 border-t border-zinc-800/80 px-2 text-[11px] text-zinc-500 font-mono">
              Ping! v1.2.0 • 2026
            </div>
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-zinc-900">
            {/* Desktop Close Header */}
            <div className="hidden md:flex items-center justify-end px-6 pt-4 pb-2">
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* ── TAB 1: SYSTEM & APP ─────────────────────────────── */}
              {activeTab === 'system' && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100 mb-1">{t('appMaintenance')}</h3>
                    <p className="text-xs text-zinc-400 mb-4">{t('pwaInstallDesc')}</p>

                    {/* Version & Update Card */}
                    <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between gap-4">
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-1.5">
                          {t('currentVersion')}
                        </span>
                        <p className="text-sm font-bold text-zinc-100">Ping! Web v1.2.0</p>
                      </div>

                      {updateAvailable ? (
                        <button
                          type="button"
                          onClick={reloadApp}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                        >
                          <RotateCw size={13} className="animate-spin" />
                          <span>{t('checkUpdates')}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleCheckUpdate}
                          disabled={isCheckingUpdate}
                          className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                        >
                          {isCheckingUpdate ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <RotateCw size={13} />
                          )}
                          <span>{isCheckingUpdate ? t('checkingUpdates') : t('checkUpdates')}</span>
                        </button>
                      )}
                    </div>

                    {updateStatusMsg && (
                      <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1.5 ml-1">
                        <CheckCircle2 size={14} />
                        <span>{updateStatusMsg}</span>
                      </p>
                    )}
                  </div>

                  {/* PWA Install Button (if available) */}
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100 mb-1">{t('pwaInstallTitle')}</h3>
                    <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium text-zinc-300">
                          {isInstalled ? t('appInstalled') : t('pwaInstallTitle')}
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          {isInstalled ? 'Ping! aktif sebagai standalone PWA.' : 'Buka langsung dari desktop/layar utama.'}
                        </p>
                      </div>

                      {!isInstalled && isInstallable ? (
                        <button
                          type="button"
                          onClick={promptInstall}
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                        >
                          <Download size={13} />
                          <span>{t('installNow')}</span>
                        </button>
                      ) : (
                        <span className="px-3 py-1.5 bg-zinc-800/60 text-zinc-400 rounded-xl text-xs font-medium flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-emerald-400" />
                          <span>{t('appInstalled')}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Language Selector */}
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100 mb-1 flex items-center gap-2">
                      <Languages size={15} className="text-indigo-400" />
                      <span>{t('selectLanguage')}</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <button
                        type="button"
                        onClick={() => setLanguage('id')}
                        className={`p-3 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                          language === 'id'
                            ? 'bg-indigo-600/15 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-600/10'
                            : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        <span className="text-lg">🇮🇩</span>
                        <div className="text-left">
                          <p className="text-xs font-bold text-zinc-100">{t('indonesian')}</p>
                          <p className="text-[10px] text-zinc-500">Bahasa Baku (ID)</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLanguage('en')}
                        className={`p-3 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                          language === 'en'
                            ? 'bg-indigo-600/15 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-600/10'
                            : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        <span className="text-lg">🇬🇧</span>
                        <div className="text-left">
                          <p className="text-xs font-bold text-zinc-100">{t('english')}</p>
                          <p className="text-[10px] text-zinc-500">English (US)</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── TAB 2: SOUND & NOTIFICATIONS ───────────────────── */}
              {activeTab === 'sound' && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-5"
                >
                  <h3 className="text-sm font-bold text-zinc-100">{t('soundSettings')}</h3>

                  {/* Sound FX Toggle */}
                  <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
                        {soundMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-100">{t('chatSoundFx')}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{t('chatSoundFxDesc')}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTestSound}
                        className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 rounded-lg cursor-pointer"
                      >
                        {t('testSound')}
                      </button>
                      <button
                        type="button"
                        onClick={handleToggleSound}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                          !soundMuted ? 'bg-indigo-600' : 'bg-zinc-700'
                        }`}
                      >
                        <span
                          className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                            !soundMuted ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Desktop Push Notifications */}
                  <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
                        <Bell size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-100">{t('desktopNotifications')}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{t('desktopNotificationsDesc')}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleNotifications}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                        notificationsAllowed
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                      }`}
                    >
                      {notificationsAllowed ? t('notificationsEnabled') : t('enableNotifications')}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── TAB 3: PRIVACY & THEME ─────────────────────────── */}
              {activeTab === 'privacy' && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-5"
                >
                  <h3 className="text-sm font-bold text-zinc-100">{t('privacySettings')}</h3>

                  {/* Online Presence Toggle */}
                  <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                        <Eye size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-100">{t('showOnlineStatus')}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{t('showOnlineStatusDesc')}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleOnlinePresence}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                        isOnlineVisible ? 'bg-emerald-600' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                          isOnlineVisible ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Chat Theme & Wallpaper Selector */}
                  <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 flex-shrink-0">
                        <Palette size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-100">{t('chatAppearance')}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{t('appearanceDesc')}</p>
                      </div>
                    </div>

                    {onOpenThemeModal && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose()
                          onOpenThemeModal()
                        }}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                      >
                        {t('customizeTheme')}
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── TAB 4: SECURITY ────────────────────────────────── */}
              {activeTab === 'security' && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-5"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-indigo-400" />
                    <h3 className="text-sm font-bold text-zinc-100">{t('changePasswordTitle')}</h3>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1 ml-1">
                        {t('currentPassword')}
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-indigo-500 transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1 ml-1">
                        {t('newPassword')}
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-indigo-500 transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1 ml-1">
                        {t('confirmPassword')}
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-indigo-500 transition-all"
                        required
                      />
                    </div>

                    {passwordMsg.text && (
                      <div
                        className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                          passwordMsg.type === 'error'
                            ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {passwordMsg.type === 'error' ? (
                          <AlertCircle size={15} />
                        ) : (
                          <CheckCircle2 size={15} />
                        )}
                        <span>{passwordMsg.text}</span>
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={passwordLoading || !currentPassword || !newPassword}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                      >
                        {passwordLoading ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>{t('updatingPassword')}</span>
                          </>
                        ) : (
                          <span>{t('updatePasswordBtn')}</span>
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
