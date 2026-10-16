/**
 * lib/encryption.ts
 * [5] Encriptar datos sensibles con AES-GCM 256-bit (Web Crypto API)
 * ENCRYPTION_SECRET debe ser 64 chars hex (32 bytes) en las env vars
 */

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256

async function getEncryptionKey(): Promise<CryptoKey> {
  const secret = process.env.ENCRYPTION_SECRET
  if (!secret) throw new Error('ENCRYPTION_SECRET no configurado')
  const keyBytes = new Uint8Array(secret.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)))
  if (keyBytes.length !== 32) throw new Error('ENCRYPTION_SECRET debe ser 64 chars hex')
  return crypto.subtle.importKey('raw', keyBytes, { name: ALGORITHM, length: KEY_LENGTH }, false, ['encrypt', 'decrypt'])
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await getEncryptionKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, new TextEncoder().encode(plaintext))
  return `${Buffer.from(iv).toString('base64url')}:${Buffer.from(ciphertext).toString('base64url')}`
}

export async function decrypt(encryptedData: string): Promise<string> {
  const [ivBase64, ciphertextBase64] = encryptedData.split(':')
  if (!ivBase64 || !ciphertextBase64) throw new Error('Formato inválido')
  const key = await getEncryptionKey()
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: Buffer.from(ivBase64, 'base64url') },
    key,
    Buffer.from(ciphertextBase64, 'base64url')
  )
  return new TextDecoder().decode(decrypted)
}

export async function encryptIfPresent(value: string | null | undefined): Promise<string | null> {
  if (!value) return null
  return encrypt(value)
}

export async function decryptIfPresent(value: string | null | undefined): Promise<string | null> {
  if (!value) return null
  try { return await decrypt(value) } catch { return value }
}

/** Genera una clave ENCRYPTION_SECRET de 32 bytes aleatorios */
export function generateEncryptionKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}
