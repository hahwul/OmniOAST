/**
 * Generates a random alphanumeric string of specified length
 *
 * Uses Web Crypto's getRandomValues for unpredictability — the output is used
 * as interactsh correlation IDs and secret keys, which authenticate callback
 * polling. Math.random would let an attacker who can observe timing predict
 * those values and intercept another user's interactions.
 *
 * @param length - The length of the string to generate
 * @param lettersOnly - If true, only lowercase letters will be used (no numbers)
 * @returns A random string of the specified length
 */
export const generateRandomString = (
  length: number,
  lettersOnly: boolean = false,
) => {
  if (length <= 0) return "";
  const characters = lettersOnly
    ? "abcdefghijklmnopqrstuvwxyz"
    : "abcdefghijklmnopqrstuvwxyz0123456789";
  const charsLen = characters.length;
  // Use rejection sampling to avoid modulo bias. Threshold is the largest
  // multiple of charsLen that fits in a byte; values >= threshold are rejected.
  const threshold = 256 - (256 % charsLen);
  let result = "";
  // Generous initial pool (2x); refill if rejection sampling exhausts it.
  const bufSize = Math.max(length * 2, 32);
  const buf = new Uint8Array(bufSize);
  let bufIdx = bufSize;
  while (result.length < length) {
    if (bufIdx >= bufSize) {
      crypto.getRandomValues(buf);
      bufIdx = 0;
    }
    const byte = buf[bufIdx++]!;
    if (byte >= threshold) continue;
    result += characters.charAt(byte % charsLen);
  }
  return result;
};

/**
 * Converts an ArrayBuffer to a Base64 encoded string
 *
 * @param buffer - The ArrayBuffer to convert
 * @returns Base64 encoded string representation of the buffer
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  // Chunked to avoid blowing the engine call stack on large buffers — the
  // spread form `String.fromCharCode(...uint8)` overflows around 125k args
  // in V8, which a decrypted interaction payload could plausibly hit.
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32k
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

/**
 * Converts a Base64 encoded string back to an ArrayBuffer
 *
 * @param base64 - The Base64 string to convert
 * @returns ArrayBuffer representation of the Base64 string
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
