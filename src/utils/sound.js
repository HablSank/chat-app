// ── Audio Sound Effects Utility ────────────────────────────────────────────────
let sendAudio = null
let receiveAudio = null

export const playSendSound = () => {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('ping_sound_muted') === 'true') {
      return
    }
    if (!sendAudio) {
      sendAudio = new Audio('/send.mp3')
    }
    sendAudio.currentTime = 0
    sendAudio.play().catch(e => {
      console.log('Audio autoplay prevented:', e)
    })
  } catch (err) {
    console.error('Send sound error:', err)
  }
}

export const playReceiveSound = () => {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('ping_sound_muted') === 'true') {
      return
    }
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
