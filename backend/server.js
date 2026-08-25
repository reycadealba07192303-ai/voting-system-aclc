require('dotenv').config()
const mongoose = require('mongoose')
const os = require('os')
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

function getLanIpv4List() {
  const nets = os.networkInterfaces()
  const ips = []
  for (const key of Object.keys(nets)) {
    for (const item of nets[key] || []) {
      if (item.family === 'IPv4' && !item.internal) ips.push(item.address)
    }
  }
  return [...new Set(ips)]
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB:', redactUri(MONGO_URI))
    // 0.0.0.0 so phones on the same Wi‑Fi can reach this PC (not only localhost)
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`)
      const lanIps = getLanIpv4List()
      if (lanIps.length) {
        lanIps.forEach((ip) => {
          console.log(`Mobile API URL: http://${ip}:${PORT}/api`)
        })
      } else {
        console.log(`No LAN IPv4 detected. Connect to Wi‑Fi/LAN to test on phone.`)
      }
    })
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message)
    process.exit(1)
  })
