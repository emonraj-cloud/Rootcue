import { jest } from '@jest/globals'

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-token-vault'

const { encryptSecret, decryptSecret, isEncrypted } = await import('../src/services/tokenVault.js')

describe('tokenVault', () => {
  it('round trips a token', () => {
    const secret = 'xoxb-SUPER-SECRET-TOKEN-12345'
    expect(decryptSecret(encryptSecret(secret))).toBe(secret)
  })

  it('round trips unicode and empty-ish values', () => {
    for (const v of ['a', 'ünïcödé ✅ 🔐', 'x'.repeat(5000), '  spaces  ']) {
      expect(decryptSecret(encryptSecret(v))).toBe(v)
    }
  })

  it('does not store the plaintext', () => {
    const secret = 'xoxb-SUPER-SECRET-TOKEN-12345'
    const stored = encryptSecret(secret)
    expect(stored).not.toContain(secret)
    expect(stored).not.toContain(Buffer.from(secret).toString('base64'))
  })

  // This is the bug that was actually present: the "v1:iv.tag.data" split was
  // destructured with two leading holes, so the IV slot held the auth tag and
  // every legitimate value failed to decrypt.
  it('uses the right fields from the stored format', () => {
    const stored = encryptSecret('hello')
    const [, ivB64, tagB64, dataB64] = stored.split(/[:.]/)
    expect(ivB64).toBeTruthy()
    expect(tagB64).toBeTruthy()
    expect(dataB64).toBeTruthy()
    expect(Buffer.from(ivB64, 'base64')).toHaveLength(12)
  })

  it('produces different ciphertext for the same input (random IV)', () => {
    expect(encryptSecret('same')).not.toBe(encryptSecret('same'))
  })

  it('rejects a tampered ciphertext instead of returning garbage', () => {
    const stored = encryptSecret('hello')
    expect(decryptSecret(stored.slice(0, -4) + 'AAAA')).toBeNull()
    const parts = stored.split(/[:.]/)
    expect(decryptSecret(`v1:${Buffer.alloc(12).toString('base64')}.${parts[2]}.${parts[3]}`)).toBeNull()
    expect(decryptSecret(`v1:${parts[1]}.${parts[2]}.AAAA`)).toBeNull()
  })

  it('does not treat a legacy base64 value as ciphertext', () => {
    // The old scheme stored base64 in a column named access_token_encrypted.
    expect(decryptSecret(Buffer.from('legacy-token').toString('base64'))).toBeNull()
    expect(isEncrypted(Buffer.from('legacy-token').toString('base64'))).toBe(false)
    expect(isEncrypted(encryptSecret('x'))).toBe(true)
  })

  it('handles empty input safely', () => {
    expect(encryptSecret('')).toBeNull()
    expect(encryptSecret(null)).toBeNull()
    expect(encryptSecret(undefined)).toBeNull()
    expect(decryptSecret('')).toBeNull()
    expect(decryptSecret(null)).toBeNull()
    expect(decryptSecret(undefined)).toBeNull()
  })

  it('returns null for a value encrypted under a different key', async () => {
    const stored = encryptSecret('secret')
    const previous = process.env.JWT_SECRET
    process.env.JWT_SECRET = 'a-different-secret'
    jest.resetModules()
    const other = await import(`../src/services/tokenVault.js?other=${Date.now()}`)
    expect(other.decryptSecret(stored)).toBeNull()
    process.env.JWT_SECRET = previous
  })
})
