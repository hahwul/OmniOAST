import { defineStore } from "pinia";

import { arrayBufferToBase64, base64ToArrayBuffer } from "@/utils/utils";

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  return base64ToArrayBuffer(base64);
}

function arrayBufferToPem(buf: ArrayBuffer, label: string): string {
  const base64 = arrayBufferToBase64(buf);
  const wrapped = base64.match(/.{1,64}/g)?.join("\n") || base64;
  return `-----BEGIN ${label}-----\n${wrapped}\n-----END ${label}-----`;
}

// ─── Pure JavaScript AES Block Cipher (encrypt only) ───────────────────
// Avoids Web Crypto dependency for AES operations to ensure consistent
// behavior across all JavaScript environments (Node.js, browsers, Caido).

/* prettier-ignore */
const SBOX = new Uint8Array([
  0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
  0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
  0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
  0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
  0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
  0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
  0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
  0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
  0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
  0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
  0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
  0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
  0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
  0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
  0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
  0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16,
]);

/* prettier-ignore */
const RCON = new Uint8Array([
  0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36,
]);

// Precomputed GF(2^8) multiply-by-2 and multiply-by-3 tables
const MUL2 = new Uint8Array(256);
const MUL3 = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  MUL2[i] = ((i << 1) ^ (i & 0x80 ? 0x1b : 0)) & 0xff;
  MUL3[i] = MUL2[i] ^ i;
}

/** Expand AES key into round key words (4 bytes each). */
function aesKeyExpansion(key: Uint8Array): Uint8Array[] {
  const Nk = key.length >> 2; // 4 (AES-128), 6 (AES-192), or 8 (AES-256)
  const Nr = Nk + 6;
  const totalWords = 4 * (Nr + 1);
  const w: Uint8Array[] = new Array(totalWords);

  for (let i = 0; i < Nk; i++) {
    w[i] = key.slice(i * 4, i * 4 + 4);
  }

  for (let i = Nk; i < totalWords; i++) {
    const prev = w[i - 1];
    const temp = new Uint8Array(4);

    if (i % Nk === 0) {
      // RotWord + SubWord + Rcon
      temp[0] = SBOX[prev[1]] ^ RCON[i / Nk - 1];
      temp[1] = SBOX[prev[2]];
      temp[2] = SBOX[prev[3]];
      temp[3] = SBOX[prev[0]];
    } else if (Nk > 6 && i % Nk === 4) {
      // SubWord only (AES-256)
      temp[0] = SBOX[prev[0]];
      temp[1] = SBOX[prev[1]];
      temp[2] = SBOX[prev[2]];
      temp[3] = SBOX[prev[3]];
    } else {
      temp[0] = prev[0];
      temp[1] = prev[1];
      temp[2] = prev[2];
      temp[3] = prev[3];
    }

    const back = w[i - Nk];
    w[i] = new Uint8Array([
      back[0] ^ temp[0],
      back[1] ^ temp[1],
      back[2] ^ temp[2],
      back[3] ^ temp[3],
    ]);
  }
  return w;
}

/**
 * AES block encrypt (single 16-byte block).
 * State layout: column-major — state[row + 4*col] = input[row + 4*col].
 */
function aesEncryptBlock(roundKeys: Uint8Array[], block: Uint8Array): Uint8Array {
  const Nr = roundKeys.length / 4 - 1;
  const s = new Uint8Array(16);

  // Load state and AddRoundKey(0)
  for (let c = 0; c < 4; c++) {
    const k = roundKeys[c];
    s[c * 4] = block[c * 4] ^ k[0];
    s[c * 4 + 1] = block[c * 4 + 1] ^ k[1];
    s[c * 4 + 2] = block[c * 4 + 2] ^ k[2];
    s[c * 4 + 3] = block[c * 4 + 3] ^ k[3];
  }

  for (let round = 1; round <= Nr; round++) {
    // SubBytes
    for (let i = 0; i < 16; i++) s[i] = SBOX[s[i]];

    // ShiftRows (on column-major: row r shifts left by r across columns)
    // Row 1: indices 1, 5, 9, 13
    let t = s[1];
    s[1] = s[5];
    s[5] = s[9];
    s[9] = s[13];
    s[13] = t;
    // Row 2: indices 2, 6, 10, 14
    t = s[2];
    s[2] = s[10];
    s[10] = t;
    t = s[6];
    s[6] = s[14];
    s[14] = t;
    // Row 3: indices 3, 7, 11, 15
    t = s[15];
    s[15] = s[11];
    s[11] = s[7];
    s[7] = s[3];
    s[3] = t;

    // MixColumns (skip for last round)
    if (round < Nr) {
      for (let c = 0; c < 4; c++) {
        const i = c * 4;
        const a0 = s[i],
          a1 = s[i + 1],
          a2 = s[i + 2],
          a3 = s[i + 3];
        s[i] = MUL2[a0] ^ MUL3[a1] ^ a2 ^ a3;
        s[i + 1] = a0 ^ MUL2[a1] ^ MUL3[a2] ^ a3;
        s[i + 2] = a0 ^ a1 ^ MUL2[a2] ^ MUL3[a3];
        s[i + 3] = MUL3[a0] ^ a1 ^ a2 ^ MUL2[a3];
      }
    }

    // AddRoundKey
    for (let c = 0; c < 4; c++) {
      const k = roundKeys[round * 4 + c];
      s[c * 4] ^= k[0];
      s[c * 4 + 1] ^= k[1];
      s[c * 4 + 2] ^= k[2];
      s[c * 4 + 3] ^= k[3];
    }
  }

  return s;
}

// ─── AES-CTR Decryption ─────────────────────────────────────────────────
// interactsh server uses AES-CTR (cipher.NewCTR in Go), not AES-CFB.

/** Increment a 16-byte big-endian counter in place. */
function incrementCounter(counter: Uint8Array): void {
  for (let i = 15; i >= 0; i--) {
    counter[i] = (counter[i] + 1) & 0xff;
    if (counter[i] !== 0) break; // no carry → done
  }
}

/**
 * AES-CTR decryption using pure JavaScript AES.
 * No Web Crypto dependency — works identically in all JS environments.
 */
function decryptAesCtr(
  aesKeyBytes: Uint8Array,
  iv: Uint8Array,
  ciphertext: Uint8Array,
): Uint8Array {
  const blockSize = 16;
  const roundKeys = aesKeyExpansion(aesKeyBytes);

  const plaintext = new Uint8Array(ciphertext.length);
  const counter = new Uint8Array(iv); // copy — counter starts at IV

  for (let offset = 0; offset < ciphertext.length; offset += blockSize) {
    const blockLen = Math.min(blockSize, ciphertext.length - offset);
    const keystream = aesEncryptBlock(roundKeys, counter);

    for (let j = 0; j < blockLen; j++) {
      plaintext[offset + j] = ciphertext[offset + j] ^ keystream[j];
    }

    incrementCounter(counter);
  }

  return plaintext;
}

// Export for testing
export { aesKeyExpansion, aesEncryptBlock, decryptAesCtr };

// ─── Crypto Service (Pinia Store) ──────────────────────────────────────

export const useCryptoService = defineStore("services.crypto", () => {
  let privKey: CryptoKey | undefined = undefined;
  let pubKey: CryptoKey | undefined = undefined;
  let initialized = false;

  async function ensureKeys(): Promise<void> {
    if (initialized && privKey && pubKey) return;
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: { name: "SHA-256" },
      },
      true,
      ["encrypt", "decrypt"],
    );
    pubKey = keyPair.publicKey;
    privKey = keyPair.privateKey;
    initialized = true;
  }

  async function setKeyPairFromPEM(
    privateKeyPem: string,
    publicKeyPem?: string,
  ) {
    const algo = { name: "RSA-OAEP", hash: "SHA-256" } as const;
    const pkcs8 = pemToArrayBuffer(privateKeyPem);
    privKey = await window.crypto.subtle.importKey("pkcs8", pkcs8, algo, true, [
      "decrypt",
    ]);
    if (publicKeyPem) {
      const spki = pemToArrayBuffer(publicKeyPem);
      pubKey = await window.crypto.subtle.importKey("spki", spki, algo, true, [
        "encrypt",
      ]);
    } else {
      if (!pubKey) await ensureKeys();
    }
    initialized = true;
  }

  function getPrivateKey(): CryptoKey | undefined {
    return privKey;
  }

  function getPublicKey(): CryptoKey | undefined {
    return pubKey;
  }

  async function exportPublicKeyPEM(): Promise<string> {
    if (!pubKey) await ensureKeys();
    const exported = await window.crypto.subtle.exportKey(
      "spki",
      pubKey as CryptoKey,
    );
    return arrayBufferToPem(exported, "PUBLIC KEY");
  }

  async function exportPrivateKeyPEM(): Promise<string> {
    if (!privKey) await ensureKeys();
    const exported = await window.crypto.subtle.exportKey(
      "pkcs8",
      privKey as CryptoKey,
    );
    return arrayBufferToPem(exported, "PRIVATE KEY");
  }

  // Encode public key as base64-encoded PEM for interactsh server compatibility
  async function encodePublicKey(): Promise<string> {
    return btoa(await exportPublicKeyPEM());
  }

  async function decryptRSA(encodedKey: string): Promise<ArrayBuffer> {
    if (!privKey) throw new Error("Private key not initialized");

    const encryptedData = base64ToArrayBuffer(encodedKey);
    return await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privKey,
      encryptedData,
    );
  }

  /**
   * Decrypts an interactsh interaction message.
   * 1. RSA-OAEP decrypt the AES key (Web Crypto — RSA works fine)
   * 2. Base64-decode the message → IV (16 bytes) + ciphertext
   * 3. AES-CFB decrypt using pure JS AES (no Web Crypto for AES)
   * 4. Decode plaintext bytes as UTF-8
   */
  async function decryptMessage(
    key: string,
    secureMessage: string,
  ): Promise<string> {
    if (!privKey) throw new Error("Private key is not initialized");

    // 1. RSA-OAEP decrypt the AES key
    const decodedKey = base64ToArrayBuffer(key);
    const aesKeyBytes = new Uint8Array(
      await window.crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privKey,
        decodedKey,
      ),
    );

    // 2. Base64-decode the secure message
    const messageBytes = new Uint8Array(base64ToArrayBuffer(secureMessage));

    // 3. Extract IV (first 16 bytes) and ciphertext (rest)
    const iv = messageBytes.slice(0, 16);
    const ciphertext = messageBytes.slice(16);

    // 4. AES-CTR decrypt (pure JS — matches Go's cipher.NewCTR)
    const plaintext = decryptAesCtr(aesKeyBytes, iv, ciphertext);

    // 5. Decode as UTF-8
    return new TextDecoder().decode(plaintext);
  }

  return {
    getPrivateKey,
    getPublicKey,
    exportPublicKeyPEM,
    exportPrivateKeyPEM,
    setKeyPairFromPEM,
    encodePublicKey,
    decryptRSA,
    decryptMessage,
  };
});
