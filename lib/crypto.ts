import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env.FILE_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("FILE_ENCRYPTION_KEY is not set");
  }
  // Accepts a 64-char hex string (32 bytes) — generate one with:
  // node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  return Buffer.from(secret, "hex");
}

/**
 * Encrypts a file buffer with AES-256-GCM.
 * Output layout: [12-byte IV][16-byte auth tag][ciphertext]
 * This is what actually gets uploaded to Supabase Storage — the raw
 * question paper never touches disk or the network unencrypted.
 */
export function encryptBuffer(plain: Buffer): Buffer {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]);
}

export function decryptBuffer(encrypted: Buffer): Buffer {
  const iv = encrypted.subarray(0, 12);
  const authTag = encrypted.subarray(12, 28);
  const ciphertext = encrypted.subarray(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * SHA-256 hash of a buffer, returned as a 0x-prefixed hex string so it can
 * be passed directly to the smart contract as a bytes32 value.
 */
export function sha256Hex(data: Buffer): string {
  return "0x" + crypto.createHash("sha256").update(data).digest("hex");
}
