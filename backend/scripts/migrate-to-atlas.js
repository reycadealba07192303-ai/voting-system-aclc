/**
 * One-off: copy all collections from local MongoDB → Atlas.
 * Usage (from backend/):
 *   node scripts/migrate-to-atlas.js
 * Reads LOCAL_URI / ATLAS_URI from env, or defaults below for local source.
 */
require('dotenv').config()
const dns = require('dns')
// Some Windows/router DNS setups fail Node's SRV lookup (querySrv ESERVFAIL)
dns.setServers(['8.8.8.8', '1.1.1.1'])
const { MongoClient } = require('mongodb')

const LOCAL_URI = process.env.LOCAL_URI || 'mongodb://localhost:27017'
const LOCAL_DB = process.env.LOCAL_DB || 'ssg_election'
const ATLAS_URI = process.env.ATLAS_URI
const ATLAS_DB = process.env.ATLAS_DB || 'ssg_election'

if (!ATLAS_URI) {
  console.error('Set ATLAS_URI env var (mongodb+srv://...)')
  process.exit(1)
}

async function copyCollection(src, dest, name) {
  const docs = await src.collection(name).find({}).toArray()
  if (!docs.length) {
    console.log(`  ${name}: 0 docs (skip)`)
    return 0
  }
  await dest.collection(name).deleteMany({})
  // insertMany fails on empty; strip nothing needed — keep _id
  const result = await dest.collection(name).insertMany(docs, { ordered: false })
  console.log(`  ${name}: ${result.insertedCount} docs`)
  return result.insertedCount
}

async function main() {
  const local = new MongoClient(LOCAL_URI)
  const atlas = new MongoClient(ATLAS_URI)

  console.log(`Source: ${LOCAL_URI} / ${LOCAL_DB}`)
  console.log(`Target: Atlas / ${ATLAS_DB}`)

  await local.connect()
  await atlas.connect()

  const src = local.db(LOCAL_DB)
  const dest = atlas.db(ATLAS_DB)

  const collections = (await src.listCollections().toArray()).map((c) => c.name)
  console.log(`Collections: ${collections.join(', ') || '(none)'}`)

  let total = 0
  for (const name of collections) {
    if (name.startsWith('system.')) continue
    total += await copyCollection(src, dest, name)
  }

  // Recreate indexes from source (best-effort)
  for (const name of collections) {
    if (name.startsWith('system.')) continue
    const indexes = await src.collection(name).indexes()
    for (const idx of indexes) {
      if (idx.name === '_id_') continue
      const { key, name: indexName, v, ns, ...opts } = idx
      try {
        await dest.collection(name).createIndex(key, { ...opts, name: indexName })
      } catch (e) {
        console.warn(`  index ${name}.${indexName}: ${e.message}`)
      }
    }
  }

  console.log(`Done. Migrated ~${total} documents to ${ATLAS_DB}.`)
  await local.close()
  await atlas.close()
}

main().catch((e) => {
  console.error('Migration failed:', e.message)
  if (/whitelist|IP|ENOTFOUND|authentication/i.test(e.message)) {
    console.error('\nTip: In Atlas → Network Access, allow your current IP (or 0.0.0.0/0 for testing).')
    console.error('Also check username/password and that the DB user has read/write.')
  }
  process.exit(1)
})
