import { useEffect } from 'react'
import { STUDENT_PORTAL_URL } from '../constants/app'

/**
 * Sends the browser into the Flutter student app as a full page.
 * An iframe of CanvasKit often paints blank (especially in Brave).
 */
export default function StudentPortal() {
  useEffect(() => {
    window.location.replace(STUDENT_PORTAL_URL)
  }, [])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1d248f, #2333b4 50%, #161d73)',
        color: '#fff',
        fontFamily: 'Manrope, Inter, sans-serif',
        fontWeight: 800,
        letterSpacing: '0.04em',
      }}
    >
      Opening student portal…
    </div>
  )
}
