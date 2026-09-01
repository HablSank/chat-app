import { getApiUrl } from '../config/api'

/**
 * Convert base64 VAPID public key to Uint8Array for pushManager
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Subscribe current browser client to Web Push notifications
 */
export async function registerPushSubscription(token) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, reason: 'unsupported' }
  }

  try {
    // 1. Get VAPID public key (from env or server)
    let vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!vapidPublicKey) {
      const keyRes = await fetch(getApiUrl('/api/push/vapid-key'))
      const keyData = await keyRes.json()
      vapidPublicKey = keyData.publicKey
    }
    if (!vapidPublicKey) throw new Error('VAPID public key not found')

    // 2. Ensure service worker is ready
    const registration = await navigator.serviceWorker.ready
    if (!registration) throw new Error('Service Worker registration not ready')

    // 3. Subscribe with PushManager
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey)
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      })
    }

    // 4. Send subscription to server (/api/users/push-subscribe and /api/push/subscribe)
    const subRes = await fetch(getApiUrl('/api/users/push-subscribe'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    })

    if (!subRes.ok) throw new Error('Failed to save subscription on server')

    return { success: true, subscription }
  } catch (err) {
    console.error('Push Subscription Error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Unsubscribe current browser client from Web Push notifications
 */
export async function unregisterPushSubscription(token) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return { success: false }
  }

  try {
    const registration = await navigator.serviceWorker.ready
    if (registration) {
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
      }
    }

    await fetch(getApiUrl('/api/push/unsubscribe'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    return { success: true }
  } catch (err) {
    console.error('Push Unsubscribe Error:', err)
    return { success: false, error: err.message }
  }
}
