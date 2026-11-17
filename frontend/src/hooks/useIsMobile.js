import { useState, useEffect } from 'react'

/**
 * Returns true when viewport width is below the Tailwind `md` breakpoint (< 768px).
 */
export default function useIsMobile(breakpointPx = 768) {
  const getMatches = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(`(max-width: ${breakpointPx - 1}px)`).matches
      : false

  const [isMobile, setIsMobile] = useState(getMatches)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`)
    const onChange = (e) => setIsMobile(e.matches)
    setIsMobile(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [breakpointPx])

  return isMobile
}
