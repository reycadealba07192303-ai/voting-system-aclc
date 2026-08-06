import { useEffect, useRef } from 'react'

/**
 * Call `fn` immediately (optional) and on an interval while the tab is visible.
 * @param {() => void | Promise<void>} fn
 * @param {number} intervalMs
 * @param {{ enabled?: boolean, runOnMount?: boolean }} options
 */
export default function useAutoSync(fn, intervalMs = 8000, options = {}) {
  const { enabled = true, runOnMount = false } = options
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    if (!enabled) return undefined

    let cancelled = false
    let timer

    const tick = async () => {
      if (cancelled || document.hidden) return
      try {
        await fnRef.current()
      } catch {
        // keep polling even if one request fails
      }
    }

    if (runOnMount) tick()

    timer = setInterval(tick, intervalMs)

    const onVisibility = () => {
      if (!document.hidden) tick()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled, intervalMs, runOnMount])
}
