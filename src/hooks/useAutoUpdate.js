import { useState, useEffect, useCallback } from 'react'

export function useAutoUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [registration, setRegistration]       = useState(null)

  const reloadApp = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
    // Perform clean reload
    window.location.reload()
  }, [registration])

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js')
        setRegistration(reg)

        // If a worker is already waiting to activate
        if (reg.waiting) {
          setUpdateAvailable(true)
        }

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true)
              }
            })
          }
        })

        // Check for updates periodically (every 10 minutes)
        const interval = setInterval(() => {
          reg.update().catch(() => {})
        }, 10 * 60 * 1000)

        // Also check when tab becomes active again
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            reg.update().catch(() => {})
          }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
          clearInterval(interval)
          document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
      } catch (error) {
        console.warn('Service Worker registration error:', error)
      }
    }

    registerSW()
  }, [])

  return { updateAvailable, reloadApp, setUpdateAvailable }
}
