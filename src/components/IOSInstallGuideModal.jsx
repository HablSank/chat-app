import PWAInstallGuideModal from './PWAInstallGuideModal'

export default function IOSInstallGuideModal({ isOpen, onClose, isIOS = true }) {
  return <PWAInstallGuideModal isOpen={isOpen} onClose={onClose} isIOS={isIOS} />
}
