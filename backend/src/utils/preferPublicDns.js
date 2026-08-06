/**
 * Some Windows/router DNS setups fail Node SRV lookup for mongodb+srv.
 * Call early from server.js before mongoose.connect.
 */
const dns = require('dns')

function preferPublicDns() {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1'])
  } catch {
    // ignore
  }
}

module.exports = { preferPublicDns }
