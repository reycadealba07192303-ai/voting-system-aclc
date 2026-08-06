require('dotenv').config()
const mongoose = require('mongoose')
const app = require('./src/app')

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
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
    })
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message)
    process.exit(1)
  })
