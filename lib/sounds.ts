import { getSoundPreference, setSoundPreference } from './storage'

let soundEnabled = true

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled
  setSoundPreference(enabled)
}

export function isSoundEnabled(): boolean {
  soundEnabled = getSoundPreference()
  return soundEnabled
}

export function playSuccessSound() {
  if (!soundEnabled) return
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    oscillator.frequency.value = 880
    oscillator.type = 'sine'
    gainNode.gain.value = 0.3
    
    oscillator.start()
    setTimeout(() => {
      oscillator.frequency.value = 1320
    }, 100)
    
    setTimeout(() => {
      oscillator.stop()
      ctx.close()
    }, 400)
  } catch (error) {
    console.error('Error playing success sound:', error)
  }
}

export function playFailureSound() {
  if (!soundEnabled) return
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    oscillator.frequency.value = 220
    oscillator.type = 'sawtooth'
    gainNode.gain.value = 0.3
    
    oscillator.start()
    setTimeout(() => {
      oscillator.frequency.value = 180
    }, 100)
    
    setTimeout(() => {
      oscillator.stop()
      ctx.close()
    }, 300)
  } catch (error) {
    console.error('Error playing failure sound:', error)
  }
}
