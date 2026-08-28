import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, ZoomIn, ZoomOut, RotateCw, Loader2, Crop } from 'lucide-react'
import { getCroppedImg } from '../utils/cropImage'
import { useLanguage } from '../context/LanguageContext'

export default function ImageCropperModal({
  isOpen,
  imageSrc,
  cropShape = 'round', // 'round' or 'rect'
  aspect = 1,          // 1 for 1:1, 9/16 for mobile wallpaper, etc.
  title,
  onClose,
  onCropFinished,
}) {
  const { t } = useLanguage()
  const [crop, setCrop]                 = useState({ x: 0, y: 0 })
  const [zoom, setZoom]                 = useState(1)
  const [rotation, setRotation]         = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const modalTitle = title || t('cropImageTitle')

  const onCropChange = (newCrop) => {
    setCrop(newCrop)
  }

  const onZoomChange = (newZoom) => {
    setZoom(newZoom)
  }

  const onCropAreaChange = useCallback((croppedArea, pixels) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const handleApplyCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return
    setIsProcessing(true)
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, 'image/jpeg', 0.88)
      onCropFinished?.(croppedBlob)
      onClose()
    } catch (err) {
      console.error('Error cropping image:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen || !imageSrc) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-zinc-900 border border-zinc-750 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 relative"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between flex-shrink-0 bg-zinc-900/90">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Crop size={17} />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-zinc-100">{modalTitle}</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Cropper Workspace */}
          <div className="relative w-full h-72 sm:h-80 bg-zinc-950 overflow-hidden select-none">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              cropShape={cropShape}
              showGrid={true}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={onCropAreaChange}
              style={{
                containerStyle: {
                  background: '#09090b',
                },
                cropAreaStyle: {
                  border: '2px solid rgba(99, 102, 241, 0.9)',
                  boxShadow: '0 0 0 9999em rgba(0, 0, 0, 0.75)',
                },
              }}
            />
          </div>

          {/* Zoom & Rotation Controls */}
          <div className="px-5 py-3.5 bg-zinc-850/70 border-t border-zinc-800 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <ZoomOut size={16} className="text-zinc-400 flex-shrink-0" />
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <ZoomIn size={16} className="text-zinc-400 flex-shrink-0" />
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 py-1 px-2 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <RotateCw size={13} />
                <span>{t('rotate90')}</span>
              </button>
              <span className="text-[11px] font-mono text-zinc-500">
                {t('zoomLabel')}: {zoom.toFixed(1)}x
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex items-center justify-end gap-2.5 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleApplyCrop}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              <span>{t('applyCrop')}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
