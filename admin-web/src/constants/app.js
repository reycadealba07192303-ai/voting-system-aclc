/**
 * Student mobile app (Flutter) release info used by the public landing page.
 *
 * Override per environment in admin-web/.env:
 *   VITE_APP_DOWNLOAD_URL=https://vote.aclc.edu.ph/downloads/ssg-vote.apk
 *   VITE_APP_VERSION=1.0.0
 *   VITE_APP_SIZE=24 MB
 *
 * With no override the QR points at /downloads/ssg-vote.apk on whatever host
 * serves this site — drop the release APK in admin-web/public/downloads/.
 *
 * Student voting UI is the Flutter web app (not a React copy). It is built into
 * public/student/ by `npm run student:build`, so it is served by this same host
 * — no separate `flutter run` terminal. Point elsewhere only if you host the
 * portal separately:
 *   VITE_STUDENT_APP_URL=http://localhost:8080/#/
 */
const env = import.meta.env

const fallbackUrl = '/downloads/ssg-vote.apk'

/** Absolute URL so a phone camera can resolve the QR target. */
function resolveDownloadUrl() {
  const configured = env.VITE_APP_DOWNLOAD_URL
  if (configured) return configured
  if (typeof window === 'undefined') return fallbackUrl
  return new URL(fallbackUrl, window.location.origin).href
}

export const MOBILE_APP = {
  name: 'SSG Vote',
  platform: 'Android · APK',
  version: env.VITE_APP_VERSION || '1.0.0',
  size: env.VITE_APP_SIZE || '24 MB',
  minOs: 'Android 8.0+',
  downloadUrl: resolveDownloadUrl(),
}

/**
 * Flutter web student app, starting at splash. Built by `npm run student:build`.
 * Ask for index.html explicitly: a bare `/student/` can be swallowed by an SPA
 * fallback and answered with the admin app's HTML instead of the portal's.
 */
export const STUDENT_PORTAL_URL = env.VITE_STUDENT_APP_URL || '/student/index.html#/'
