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
 *
 * On Vercel/CI (no Flutter SDK), the script writes a lightweight placeholder
 * so `vite build` still succeeds. Rebuild locally with `npm run student:build`
 * when you need the real portal in a deploy artifact.
 */
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const adminWeb = resolve(here, '..')
const flutterApp = resolve(adminWeb, '..', 'student-mobile')
const flutterOut = resolve(flutterApp, 'build', 'web')
const target = resolve(adminWeb, 'public', 'student')
const targetIndex = resolve(target, 'index.html')

const ifMissing = process.argv.includes('--if-missing')
const isWindows = process.platform === 'win32'
const onCi = Boolean(process.env.VERCEL || process.env.CI)

function writePlaceholder(reason) {
  mkdirSync(target, { recursive: true })
  writeFileSync(
    targetIndex,
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Student portal</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: Manrope, Inter, system-ui, sans-serif;
        background: linear-gradient(135deg, #1d248f, #2333b4 50%, #161d73);
        color: #fff;
        text-align: center;
        padding: 24px;
      }
      h1 { font-size: 1.25rem; margin: 0 0 8px; }
      p { margin: 0; opacity: 0.85; line-height: 1.45; max-width: 28rem; }
    </style>
  </head>
  <body>
    <div>
      <h1>Student portal build skipped</h1>
      <p>${reason}. Run <code>npm run student:build</code> locally, then redeploy with the built <code>public/student</code> assets if you need the full Flutter portal here.</p>
    </div>
  </body>
</html>
`
  )
  console.warn(`[student-web] ${reason} — wrote placeholder at public/student/`)
}

if (ifMissing && existsSync(targetIndex)) {
  console.log('[student-web] already built — skipping (run npm run student:build to refresh)')
  process.exit(0)
}

// Vercel/CI has no Flutter SDK — don't fail the admin deploy.
if (onCi) {
  if (existsSync(targetIndex)) {
    console.log('[student-web] CI/Vercel — using existing public/student build')
    process.exit(0)
  }
  writePlaceholder('Flutter is not available on this host')
  process.exit(0)
}

if (!existsSync(flutterApp)) {
  console.error('[student-web] student-mobile folder not found')
  process.exit(1)
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
  const reason =
    build.error?.code === 'ENOENT'
      ? 'Flutter SDK not found on PATH'
      : 'flutter build web failed'
  if (existsSync(targetIndex)) {
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
