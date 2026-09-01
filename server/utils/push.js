import webpush from 'web-push'
import dotenv from 'dotenv'

dotenv.config()

export const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BAb4s_G8G_ROxdd4Na0nOQI7uHp26FPYWU6TVTeE8LH7QESsFdsAY2A662A5ECB8IuZqbI9S0--i1Po0_ZPD88A'
export const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'kQK_SMKR-r_AWEWnwH-9LlcXhgJE30SUkPJHVNMtMes'
export const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@ping.app'

try {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  )
} catch (err) {
  console.warn('VAPID Configuration warning:', err)
}

/**
 * Send Web Push Notification to a subscription object
 * @param {Object} subscription - Browser PushSubscription JSON
 * @param {Object} payload - { title, body, icon, badge, url, data }
 */
export async function sendWebPush(subscription, payload) {
  if (!subscription || !subscription.endpoint) return null

  try {
    const stringifiedPayload = JSON.stringify({
      title: payload.title || 'Ping! Message',
      body: payload.body || 'You have a new message',
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/ping.png',
      conversationId: payload.conversationId || payload.data?.conversationId || '',
      messageId: payload.messageId || payload.data?.messageId || '',
      url: payload.url || '/',
      data: payload.data || {},
    })

    return await webpush.sendNotification(subscription, stringifiedPayload)
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      console.log('Push subscription expired or unsubscribed:', subscription.endpoint)
      return { expired: true }
    }
    console.error('Error sending Web Push notification:', err)
    return null
  }
}
