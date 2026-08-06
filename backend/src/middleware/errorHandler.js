const isProd = process.env.NODE_ENV === 'production'

function errorHandler(err, req, res, next) {
  // Always log the full error server-side
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}:`, err)

  const status = err.status || err.statusCode || 500

  // In production: never leak internal messages to the client
  const message = isProd && status === 500
    ? 'Something went wrong. Please try again.'
    : err.message || 'Internal server error'

  res.status(status).json({ message })
}

module.exports = errorHandler
