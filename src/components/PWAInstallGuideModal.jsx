import { motion, AnimatePresence } from 'framer-motion'
import { X, Share, PlusSquare, MoreVertical, Download, Smartphone } from 'lucide-react'

export default function PWAInstallGuideModal({ isOpen, onClose, isIOS = false }) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-800 p-5 text-center relative shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200 p-1.5 rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
            {isIOS ? <Share size={24} /> : <Download size={24} />}
          </div>

          <h3 className="text-base font-bold text-zinc-100 mb-1">
            {isIOS ? 'Install Ping! di iPhone / iPad' : 'Install Aplikasi Ping!'}
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            {isIOS
              ? 'Ikuti 2 langkah mudah berikut di Safari:'
              : 'Ikuti 2 langkah mudah berikut di browser Chrome / Android:'}
          </p>

          <div className="space-y-2.5 text-left text-xs bg-zinc-800/60 p-3.5 rounded-2xl border border-zinc-700/50 mb-5">
            {isIOS ? (
              <>
                <div className="flex items-start gap-2.5 text-zinc-200 leading-relaxed">
                  <span className="w-5 h-5 rounded-full bg-indigo-600/40 text-indigo-300 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                    1
                  </span>
                  <span>
                    Tekan tombol <strong>Share</strong> (
                    <Share size={12} className="inline mx-0.5 text-indigo-400" />) di bilah navigasi Safari.
                  </span>
                </div>
                <div className="flex items-start gap-2.5 text-zinc-200 leading-relaxed">
                  <span className="w-5 h-5 rounded-full bg-indigo-600/40 text-indigo-300 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                    2
                  </span>
                  <span>
                    Gulir ke bawah dan pilih <strong>'Tambah ke Layar Utama'</strong> (
                    <PlusSquare size={12} className="inline mx-0.5 text-indigo-400" /> Add to Home Screen).
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-2.5 text-zinc-200 leading-relaxed">
                  <span className="w-5 h-5 rounded-full bg-indigo-600/40 text-indigo-300 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                    1
                  </span>
                  <span>
                    Tekan ikon menu <strong>titik tiga (⋮)</strong> di pojok kanan atas Chrome.
                  </span>
                </div>
                <div className="flex items-start gap-2.5 text-zinc-200 leading-relaxed">
                  <span className="w-5 h-5 rounded-full bg-indigo-600/40 text-indigo-300 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                    2
                  </span>
                  <span>
                    Pilih <strong>'Install aplikasi'</strong> atau <strong>'Tambah ke Layar Utama'</strong> (Add to Home screen).
                  </span>
                </div>
              </>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            Mengerti
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
