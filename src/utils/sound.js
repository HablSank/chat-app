// ── Audio Sound Effects Utility ────────────────────────────────────────────────
let sendAudio = null
let receiveAudio = null

export const playSendSound = () => {
  try {
    if (!sendAudio) {
      sendAudio = new Audio('/send.mp3')
    }
    sendAudio.currentTime = 0
    sendAudio.play().catch(e => {
      // Browser autoplay policy might prevent playback without user interaction
      console.log('Audio autoplay prevented:', e)
    })
  } catch (err) {
    console.error('Send sound error:', err)
  }
}

export const playReceiveSound = () => {
  try {
    if (!receiveAudio) {
      receiveAudio = new Audio('/receive.mp3')
    }
    receiveAudio.currentTime = 0
    receiveAudio.play().catch(e => {
      console.log('Audio autoplay prevented:', e)
    })
  } catch (err) {
    console.error('Receive sound error:', err)
  }
}
