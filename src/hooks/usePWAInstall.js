import { useState, useEffect } from 'react'

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled]       = useState(false)
  const [isIOS, setIsIOS]                   = useState(false)

  useEffect(() => {
    // Check if running in standalone mode (installed PWA)
    const checkStandalone = () => {
      const isStandalone =
        (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) ||
        (typeof window !== 'undefined' && window.navigator?.standalone === true) ||
        (typeof document !== 'undefined' && document.referrer?.includes('android-app://'))
      
      setIsInstalled(!!isStandalone)
      return !!isStandalone
    }

    if (checkStandalone()) {
      return
    }

    // Detect iOS
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent.toLowerCase() : ''
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !window.MSStream
    setIsIOS(isIOSDevice)

    // Capture standard PWA install prompt (Chrome, Edge, Android, etc.)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
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
      try {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
          setIsInstalled(true)
        }
        setDeferredPrompt(null)
        return { success: outcome === 'accepted', triggered: true, isIOS }
      } catch (err) {
        console.warn('Install prompt error:', err)
      }
    }
    // No native prompt available: caller should show manual guide modal
    return { success: false, triggered: false, isIOS }
  }

  // Always true in web browsers when NOT in standalone mode
  const isInstallable = !isInstalled

  return {
    isInstallable,
    isInstalled,
    isIOS,
    hasNativePrompt: !!deferredPrompt,
    promptInstall,
  }
}
