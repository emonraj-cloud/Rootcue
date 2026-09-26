import crypto from 'crypto'

// ------------------------------------------------------------
// Token encryption for integrations.
//
// The previous implementation was
//     Buffer.from(token).toString('base64')
// stored in a column named `access_token_encrypted`. Base64 is an encoding,
// not encryption: anyone with a database dump or read-only SQL access decoded
// every OAuth token in one line. The column name made it look protected.
//
// This is AES-256-GCM with a random IV per value. GCM is authenticated, so a
// tampered ciphertext fails to decrypt rather than silently returning garbage.
// ------------------------------------------------------------

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const VERSION = 'v1'

// Prefixed onto every ciphertext so a value written by the old base64 scheme
// is recognisable and never mistaken for something that failed to decrypt.
const PREFIX = `${VERSION}:`

function deriveKey() {
  // A dedicated key is preferred. Falling back to a hash of JWT_SECRET keeps
  // an existing deployment working without a migration step, and is still
  // vastly better than the previous base64.
  const source =
    process.env.INTEGRATION_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'dev-only-insecure-integration-key'

  if (!process.env.INTEGRATION_ENCRYPTION_KEY && !process.env.JWT_SECRET) {
    console.warn(
      'No INTEGRATION_ENCRYPTION_KEY or JWT_SECRET set. Integration tokens are encrypted with a fixed development key. Set INTEGRATION_ENCRYPTION_KEY before deploying.'
    )
  }

  return crypto.scryptSync(source, 'techpilot.integrations.v1', 32)
}

let cachedKey = null
function key() {
  if (!cachedKey) cachedKey = deriveKey()
  return cachedKey
}

export function encryptSecret(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === '') return null

  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key(), iv)
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${PREFIX}${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`
}

export function decryptSecret(stored) {
  if (!stored || typeof stored !== 'string') return null

  // Written by the old scheme. There is no way to tell base64 apart from
  // ciphertext by inspection, so treat it as undecryptable and let the caller
  // re-authenticate. Returning it silently would defeat the point.
  if (!stored.startsWith(PREFIX)) {
    return null
  }

  try {
    // "v1:<iv>.<tag>.<data>" splits into 4 parts, so the indexes are 0..3.
    const [, ivB64, tagB64, dataB64] = stored.split(/[:.]/)
    if (!ivB64 || !tagB64 || !dataB64) return null
    const decipher = crypto.createDecipheriv(ALGORITHM, key(), Buffer.from(ivB64, 'base64'))
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final()
    ]).toString('utf8')
  } catch (err) {
    // Wrong key or tampered data.
    return null
  }
}

export function isEncrypted(stored) {
  return typeof stored === 'string' && stored.startsWith(PREFIX)
}
