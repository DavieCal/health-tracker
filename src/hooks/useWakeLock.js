import { useEffect } from 'react'

// Keeps the screen on while the calling component is mounted (Screen Wake Lock API).
// The browser drops the lock whenever the page is hidden, so re-acquire on return.
// No-op where unsupported.
export default function useWakeLock() {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return
    let lock = null
    let active = true

    const acquire = async () => {
      if (!active || document.visibilityState !== 'visible') return
      try {
        lock = await navigator.wakeLock.request('screen')
        if (!active) lock.release().catch(() => {})
      } catch {
        // denied (e.g. battery saver) — nothing to do
      }
    }
    const onVisible = () => { if (document.visibilityState === 'visible') acquire() }

    acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release().catch(() => {})
    }
  }, [])
}
