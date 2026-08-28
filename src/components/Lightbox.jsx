import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ZoomIn } from 'lucide-react'

export default function Lightbox({ src, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Mobile Hardware Back Button Support via history pushState / popstate
  useEffect(() => {
    if (!src) return

    window.history.pushState({ modalOpen: true, modalType: 'lightbox' }, '')

    const handlePopState = (e) => {
      onClose?.()
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [src, onClose])

  return (
    <AnimatePresence>
      {src && (
        <>
          {/* Backdrop */}
          <motion.div
            key="lb-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md cursor-zoom-out"
          />

          {/* Image */}
          <motion.div
            key="lb-image"
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 320, damping: 28 } }}
            exit={{ opacity: 0, scale: 0.88, transition: { duration: 0.18 } }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-6 pointer-events-none"
          >
            <img
              src={src}
              alt="Full size"
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl pointer-events-auto"
              style={{ maxHeight: '90vh', maxWidth: '90vw' }}
              draggable={false}
            />
          </motion.div>

          {/* Controls */}
          <motion.div
            key="lb-controls"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
            exit={{ opacity: 0 }}
            className="fixed top-4 right-4 z-[102] flex items-center gap-2"
          >
            {/* Open in new tab */}
            <motion.a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-900/80 border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 backdrop-blur-sm transition-colors"
              title="Open original"
            >
              <ZoomIn size={16} />
            </motion.a>
            {/* Close */}
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-900/80 border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 backdrop-blur-sm transition-colors"
              title="Close (Esc)"
            >
              <X size={16} />
            </motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
