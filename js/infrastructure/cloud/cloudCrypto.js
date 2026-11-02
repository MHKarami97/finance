/**
 * WebCrypto utilities for zero-knowledge client-side encryption, hashing, and deterministic serialization.
 */
export function bufferToHex(buffer) {
  var bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export function hexToBuffer(hex) {
  var clean = hex.trim();
  var bytes = new Uint8Array(clean.length / 2);
  for (var i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function getRandomBytes(length) {
  return crypto.getRandomValues(new Uint8Array(length));
}

export function newSaltHex() {
  return bufferToHex(getRandomBytes(16));
}

export async function hashSha256(data) {
  var encoder = new TextEncoder();
  var buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return bufferToHex(buffer);
}

export async function deriveKey(passphrase, saltHex, iterations) {
  var enc = new TextEncoder();
  var keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  var salt = hexToBuffer(saltHex);
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, // extractable: false so key cannot be leaked or extracted
    ['encrypt', 'decrypt'],
  );
}

export async function encryptWithKey(plainText, key) {
  var iv = getRandomBytes(12);
  var data = new TextEncoder().encode(plainText);
  var cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    data,
  );
  return { ciphertext: bufferToHex(cipher), iv: bufferToHex(iv) };
}

export async function decryptWithKey(ciphertextHex, ivHex, key) {
  var plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: hexToBuffer(ivHex), tagLength: 128 },
    key,
    hexToBuffer(ciphertextHex),
  );
  return new TextDecoder().decode(plain);
}

// Deterministic JSON (sorted keys) so equal data always yields an equal hash across devices.
export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return '[' + value.map((item) => stableStringify(item)).join(',') + ']';
  var record = value;
  var parts = [];
  for (var key of Object.keys(record).sort()) {
    if (record[key] === undefined) continue;
    parts.push(JSON.stringify(key) + ':' + stableStringify(record[key]));
  }
  return '{' + parts.join(',') + '}';
}
