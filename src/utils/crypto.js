import DOMPurify from 'dompurify'

// ── Client-Side Encryption Utility (Web Crypto API - AES-GCM) ─────────────────
const APP_SALT = 'ping_e2ee_secret_salt_v1'

// In-memory cache of decrypted messages to eliminate any UI flashing
const decryptionCache = new Map()

/**
 * Returns cached decrypted plaintext if available synchronously
 * @param {string} text
 * @param {string} conversationId
 * @returns {string|null}
 */
export function getCachedDecryptedMessage(text, conversationId) {
  if (!text || typeof text !== 'string') return text
  if (!text.startsWith('enc:v1:')) return text
  const key = `${conversationId || 'default_room'}:${text}`
  return decryptionCache.get(key) || null
}

/**
 * Manually populates decryption cache (used for optimistic plaintext updates)
 * @param {string} encryptedText
 * @param {string} plainText
 * @param {string} conversationId
 */
export function cacheDecryptedMessage(encryptedText, plainText, conversationId) {
  if (!encryptedText || !plainText) return
  const key = `${conversationId || 'default_room'}:${encryptedText}`
  decryptionCache.set(key, plainText)
}

/**
 * Derives a 256-bit CryptoKey from conversationId and APP_SALT
 * @param {string} conversationId
 * @returns {Promise<CryptoKey>}
 */
async function deriveKey(conversationId = 'default_room') {
  const encoder = new TextEncoder()
  const keyMaterial = encoder.encode(`${conversationId}:${APP_SALT}`)
  
  // Hash the room key material to 256 bits (32 bytes)
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyMaterial)
  
  return crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Converts ArrayBuffer to Base64
 */
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Converts Base64 to ArrayBuffer
 */
function base64ToBuffer(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Encrypts plaintext string using AES-GCM
 * Output format: `enc:v1:<base64-iv>:<base64-ciphertext>`
 * @param {string} plaintext
 * @param {string} conversationId
 * @returns {Promise<string>}
 */
export async function encryptMessage(plaintext, conversationId) {
  if (!plaintext || typeof plaintext !== 'string') return plaintext
  
  try {
    const key = await deriveKey(conversationId)
    const encoder = new TextEncoder()
    const data = encoder.encode(plaintext)
    
    // Generate 12-byte IV for AES-GCM
    const iv = crypto.getRandomValues(new Uint8Array(12))
    
    const ciphertextBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    )
    
    const ivBase64 = bufferToBase64(iv)
    const cipherBase64 = bufferToBase64(ciphertextBuffer)
    const encrypted = `enc:v1:${ivBase64}:${cipherBase64}`

    // Synchronously populate cache so any instant lookup returns plaintext immediately
    const cacheKey = `${conversationId || 'default_room'}:${encrypted}`
    decryptionCache.set(cacheKey, plaintext)
    
    return encrypted
  } catch (err) {
    console.error('Encryption failed, falling back to plaintext:', err)
    return plaintext
  }
}

/**
 * Decrypts an encrypted message string (`enc:v1:<iv>:<ciphertext>`)
 * If not encrypted or decryption fails, returns original text gracefully.
 * @param {string} text
 * @param {string} conversationId
 * @returns {Promise<string>}
 */
export async function decryptMessage(text, conversationId) {
  if (!text || typeof text !== 'string') return text
  if (!text.startsWith('enc:v1:')) return text // Backward compatibility for plaintext

  const primaryKeyId = conversationId || 'default_room'
  const cacheKey = `${primaryKeyId}:${text}`
  if (decryptionCache.has(cacheKey)) {
    return decryptionCache.get(cacheKey)
  }

  try {
    const parts = text.split(':')
    if (parts.length !== 4) return text
    
    const ivBase64 = parts[2]
    const cipherBase64 = parts[3]
    
    const iv = new Uint8Array(base64ToBuffer(ivBase64))
    const ciphertextBuffer = base64ToBuffer(cipherBase64)
    
    // Try with primary conversation key
    const key = await deriveKey(primaryKeyId)
    
    let decryptedBuffer
    try {
      decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertextBuffer
      )
    } catch (firstErr) {
      // If primary key failed and it wasn't 'default_room', try fallback to 'default_room'
      if (primaryKeyId !== 'default_room') {
        const fallbackKey = await deriveKey('default_room')
        decryptedBuffer = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          fallbackKey,
          ciphertextBuffer
        )
      } else {
        throw firstErr
      }
    }
    
    const decoder = new TextDecoder()
    const decrypted = decoder.decode(decryptedBuffer)
    decryptionCache.set(cacheKey, decrypted)
    return decrypted
  } catch (err) {
    console.warn('Decryption failed, displaying raw text:', err)
    return text
  }
}

/**
 * Sanitizes user input / rich content strings against XSS attacks using DOMPurify
 * @param {string} dirtyString
 * @returns {string}
 */
export function sanitizeText(dirtyString) {
  if (!dirtyString || typeof dirtyString !== 'string') return dirtyString || ''
  if (typeof window === 'undefined') return dirtyString
  return DOMPurify.sanitize(dirtyString, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'code', 'pre', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  })
}
