import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, RotateCw, X, ArrowUpCircle } from 'lucide-react'

export default function AppUpdateBanner({ isVisible, onUpdate, onDismiss }) {
  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        id="app-update-banner"
        className="mx-3 mt-2 mb-1 p-3 rounded-2xl bg-gradient-to-r from-emerald-900/60 via-emerald-950/80 to-zinc-900 border border-emerald-500/30 shadow-lg shadow-emerald-950/40 relative overflow-hidden flex-shrink-0"
      >
        {/* Glow effect */}
        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-start justify-between gap-2.5 relative z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/30 border border-emerald-400/30 flex items-center justify-center text-emerald-300 flex-shrink-0 shadow-inner">
              <ArrowUpCircle size={18} className="animate-bounce" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-zinc-100 flex items-center gap-1">
                  Pembaruan Tersedia
                  <Sparkles size={12} className="text-emerald-400" />
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-tight truncate mt-0.5">
                Versi baru Ping! siap dipasang
              </p>
            </div>
          </div>

          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg hover:bg-zinc-800/60 transition-colors cursor-pointer"
              title="Tutup"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-emerald-500/15 relative z-10">
          <button
            onClick={onUpdate}
            className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCw size={13} />
            <span>Perbarui Sekarang</span>
          </button>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="py-1.5 px-3 text-zinc-400 hover:text-zinc-200 text-xs font-medium rounded-xl hover:bg-zinc-800/80 transition-colors cursor-pointer"
            >
              Nanti
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
