require('dotenv').config()
const mongoose = require('mongoose')
const { preferPublicDns } = require('./src/utils/preferPublicDns')
const app = require('./src/app')

preferPublicDns()

const PORT = process.env.PORT || 5000
const MONGO_URI = process.env.MONGO_URI

// Reject query filters that inject Mongo operators ($gt, $ne, etc.)
mongoose.set('sanitizeFilter', true)

function redactUri(uri = '') {
  return String(uri).replace(/\/\/([^:@/]+):([^@/]+)@/, '//$1:***@')
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB:', redactUri(MONGO_URI))
    // 0.0.0.0 so phones on the same Wi‑Fi can reach this PC (not only localhost)
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`)
      console.log(`Also reachable on your LAN IP (for mobile), port ${PORT}`)
    })
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message)
    process.exit(1)
  })
