const express    = require('express')
const cors       = require('cors')
const helmet     = require('helmet')
const mongoSanitize = require('express-mongo-sanitize')
const path       = require('path')
const errorHandler = require('./middleware/errorHandler')

const app = express()

// ── Security headers (OWASP basics) ──────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow image serving from /uploads
}))

// ── CORS — only allow the admin web and mobile origin ────────────────────────
const IS_PROD = process.env.NODE_ENV === 'production'

const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ||
  // 5173/5174 = admin-web (Vite), 8080 = student portal (Flutter web)
  'http://localhost:5173,http://localhost:5174,http://localhost:8080,http://127.0.0.1:5173,http://127.0.0.1:8080'
).split(',').map((o) => o.trim()).filter(Boolean)

// Outside production, also accept localhost and the same apps served over the
// LAN, so testing on a phone does not need a redeploy every time the machine's
// IP changes — and a stale ALLOWED_ORIGINS does not break local development.
const LAN_ORIGIN =
  /^https?:\/\/(?:localhost|(?:10\.|127\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)[\d.]+)(?::\d+)?$/

function isAllowedOrigin(origin) {
  if (ALLOWED_ORIGINS.includes(origin)) return true
  return !IS_PROD && LAN_ORIGIN.test(origin)
}

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (Postman, mobile apps, same-origin)
    if (!origin || isAllowedOrigin(origin)) return cb(null, true)
    // Deny without throwing: the browser still gets a clean CORS rejection
    // instead of a 500 that hides the real reason on the preflight.
    console.warn(`CORS: blocked origin ${origin}`)
    cb(null, false)
  },
  credentials: true,
}))

// ── Body parsing — cap at 2 MB to block large-payload attacks ────────────────
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true, limit: '2mb' }))

// ── Strip NoSQL operator keys (Express 5–safe: do not reassign req.query) ─────
app.use((req, _res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body)
  if (req.params) mongoSanitize.sanitize(req.params)
  if (req.headers) mongoSanitize.sanitize(req.headers)

  // Express 5 makes req.query a read-only getter; sanitize a copy and redefine it.
  const cleanQuery = mongoSanitize.sanitize({ ...req.query })
  Object.defineProperty(req, 'query', {
    value: cleanQuery,
    writable: false,
    configurable: true,
    enumerable: true,
  })
  next()
})

// ── Static file serving ───────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',                               require('./routes/auth.routes'))
app.use('/api/elections',                          require('./routes/election.routes'))
app.use('/api/elections/:electionId/positions',    require('./routes/position.routes'))
app.use('/api/elections/:electionId/candidates',   require('./routes/candidate.routes'))
app.use('/api/elections/:electionId/results',      require('./routes/results.routes'))
app.use('/api/students',                           require('./routes/student.routes'))
app.use('/api/votes',                              require('./routes/vote.routes'))
app.use('/api/mobile',                             require('./routes/mobile.routes'))
app.use('/api/dashboard',                          require('./routes/dashboard.routes'))
app.use('/api/audit-logs',                         require('./routes/auditLog.routes'))

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

app.use(errorHandler)

module.exports = app
