const CACHE_NAME = 'ping-cache-v1'

// Immediate lifecycle takeover
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Listen for skip waiting message from app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// ── Web Push Event Listener ─────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {}
  try {
    if (event.data) {
      data = event.data.json()
    }
  } catch (e) {
    data = { title: 'Ping!', body: event.data ? event.data.text() : 'Pesan baru diterima' }
  }

  const convId = data.conversationId || data.data?.conversationId || ''
  const title = data.title || 'Ping! Message'
  const options = {
    body: data.body || 'Anda memiliki pesan baru',
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/ping.png',
    tag: convId ? `conv-${convId}` : 'ping-message-' + Date.now(),
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || (convId ? `/#/chat/${convId}` : '/'),
      conversationId: convId,
      messageId: data.messageId || data.data?.messageId || '',
    },
    actions: [
      { action: 'open', title: 'Buka Chat' },
      { action: 'mark_read', title: 'Tandai Dibaca' }
    ]
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// ── Notification Click Listener ─────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const action = event.action
  const convId = event.notification.data?.conversationId
  const targetUrl = event.notification.data?.url || '/'

  // If user clicked "Tandai Dibaca" (mark_read action button)
  if (action === 'mark_read' && convId) {
    event.waitUntil(
      fetch(`/api/messages/read/${convId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).catch((err) => {
        console.warn('Failed to mark message as read from push action:', err)
      })
    )
    return
  }

  // If user clicked "Buka Chat" or tapped the notification body directly
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && targetUrl) {
            client.navigate(targetUrl)
          }
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})

// Network-first strategy for navigation and HTML to ensure immediate version updates
self.addEventListener('fetch', (event) => {
  const request = event.request

  // Ignore non-http(s) schemes (e.g. chrome-extension://)
  if (!request.url.startsWith('http')) return

  // Ignore non-GET requests, socket.io, and backend REST APIs
  if (request.method !== 'GET' || request.url.includes('/api/') || request.url.includes('/socket.io/')) {
    return
  }

  // Navigation / HTML requests: Network first, fallback to cache
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          return response
        })
        .catch(() => {
          return caches.match(request) || caches.match('/')
        })
    )
    return
  }

  // Static assets: cache-first with network fallback and background cache update
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache)
            })
          }
          return networkResponse
        })
        .catch(() => cachedResponse)

      return cachedResponse || fetchPromise
    })
  )
})
