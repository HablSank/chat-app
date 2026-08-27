import { useState, useEffect } from 'react'

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstallable, setIsInstallable]   = useState(false)
  const [isInstalled, setIsInstalled]       = useState(false)
  const [isIOS, setIsIOS]                   = useState(false)

  useEffect(() => {
    // Check if running in standalone mode (installed PWA)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')

    if (isStandalone) {
      setIsInstalled(true)
      return
    }

    // Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !window.MSStream
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios|android/.test(userAgent)
    if (isIOSDevice) {
      setIsIOS(true)
      if (isSafari) {
        setIsInstallable(true)
      }
    }

    // Capture standard PWA install prompt (Chrome, Edge, Android, etc.)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setIsInstalled(true)
        setIsInstallable(false)
      }
      setDeferredPrompt(null)
      return { success: outcome === 'accepted' }
    }
    return { success: false, isIOS }
  }

  return { isInstallable, isInstalled, isIOS, promptInstall }
}
