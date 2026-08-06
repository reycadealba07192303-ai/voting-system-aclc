const express    = require('express')
const cors       = require('cors')
const helmet     = require('helmet')
const rateLimit  = require('express-rate-limit')
const mongoSanitize = require('express-mongo-sanitize')
const path       = require('path')
const errorHandler = require('./middleware/errorHandler')

const app = express()

// ── Security headers (OWASP basics) ──────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow image serving from /uploads
}))

// ── CORS — only allow the admin web and mobile origin ────────────────────────
const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ||
  'http://localhost:5173,http://localhost:5174'
).split(',').map((o) => o.trim()).filter(Boolean)

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (Postman, mobile apps, same-origin)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true)
    cb(new Error(`CORS: origin ${origin} not allowed`))
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

// ── Rate limiting ─────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts. Please try again in 5 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const voteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many vote requests. Please wait before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { message: 'Too many requests. Slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api/', generalLimiter)
app.use('/api/auth', loginLimiter)
app.use('/api/votes', voteLimiter)

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
