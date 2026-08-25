/**
 * Builds the Flutter student app for the web and drops it into
 * admin-web/public/student/, so the "Vote now" iframe is served by the same
 * dev server / host as the admin site. No separate `flutter run` terminal.
 *
 *   node scripts/build-student-web.mjs              # always rebuild
 *   node scripts/build-student-web.mjs --if-missing # only when not built yet
 *
 * The API base URL comes from API_BASE_URL or VITE_API_URL when set; with
 * neither, the app targets port 5000 on whatever host served the page.
 */
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const adminWeb = resolve(here, '..')
const flutterApp = resolve(adminWeb, '..', 'student-mobile')
const flutterOut = resolve(flutterApp, 'build', 'web')
const target = resolve(adminWeb, 'public', 'student')

const ifMissing = process.argv.includes('--if-missing')
const isWindows = process.platform === 'win32'

if (ifMissing && existsSync(resolve(target, 'index.html'))) {
  console.log('[student-web] already built — skipping (run npm run student:build to refresh)')
  process.exit(0)
}

const apiBaseUrl = process.env.API_BASE_URL || process.env.VITE_API_URL || ''

const args = ['build', 'web', '--release', '--base-href', '/student/']
if (apiBaseUrl) args.push(`--dart-define=API_BASE_URL=${apiBaseUrl}`)

console.log(`[student-web] flutter ${args.join(' ')}`)
const build = spawnSync('flutter', args, {
  cwd: flutterApp,
  stdio: 'inherit',
  shell: isWindows, // flutter is a .bat on Windows
})

if (build.status !== 0) {
  const reason = build.error?.code === 'ENOENT' ? 'Flutter SDK not found on PATH' : 'flutter build web failed'
  if (existsSync(resolve(target, 'index.html'))) {
    console.warn(`[student-web] ${reason} — keeping the previously built portal`)
    process.exit(0)
  }
  console.error(`[student-web] ${reason}, and no previous build exists to fall back on.`)
  process.exit(1)
}

rmSync(target, { recursive: true, force: true })
mkdirSync(target, { recursive: true })
cpSync(flutterOut, target, { recursive: true })

console.log(`[student-web] copied ${flutterOut} -> ${target}`)
