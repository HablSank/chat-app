import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Download, X, Sparkles } from 'lucide-react'
import { usePWAInstall } from '../hooks/usePWAInstall'
import IOSInstallGuideModal from './IOSInstallGuideModal'

export default function PWAInstallBanner() {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall()
  const [isDismissed, setIsDismissed] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  useEffect(() => {
    const dismissed = sessionStorage.getItem('ping_pwa_dismissed')
    if (dismissed) {
      setIsDismissed(true)
    }
  }, [])

  const handleDismiss = () => {
    setIsDismissed(true)
    sessionStorage.setItem('ping_pwa_dismissed', 'true')
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true)
    } else {
      const res = await promptInstall()
      if (res.isIOS) {
        setShowIOSGuide(true)
      }
    }
  }

  if (isInstalled || isDismissed || !isInstallable) {
    return null
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="mx-3 mt-2 mb-1 p-3 rounded-2xl bg-gradient-to-r from-indigo-900/60 via-indigo-950/80 to-zinc-900 border border-indigo-500/30 shadow-lg shadow-indigo-950/40 relative overflow-hidden flex-shrink-0"
      >
        {/* Glow effect */}
        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-start justify-between gap-2.5 relative z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300 flex-shrink-0 shadow-inner">
              <Download size={18} className="animate-bounce" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-zinc-100 flex items-center gap-1">
                  Install Ping! App
                  <Sparkles size={12} className="text-indigo-400" />
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-tight truncate mt-0.5">
                Full-screen & tanpa URL bar browser
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg hover:bg-zinc-800/60 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X size={14} />
          </button>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-indigo-500/15 relative z-10">
          <button
            onClick={handleInstallClick}
            className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download size={13} />
            <span>Install</span>
          </button>
          <button
            onClick={handleDismiss}
            className="py-1.5 px-3 text-zinc-400 hover:text-zinc-200 text-xs font-medium rounded-xl hover:bg-zinc-800/80 transition-colors cursor-pointer"
          >
            Nanti
          </button>
        </div>
      </motion.div>

      {/* iOS Manual Instructions Modal */}
      <IOSInstallGuideModal isOpen={showIOSGuide} onClose={() => setShowIOSGuide(false)} />
    </>
  )
}
