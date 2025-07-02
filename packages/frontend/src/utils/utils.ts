/**
 * Generates a random alphanumeric string of specified length
 *
 * @param length - The length of the string to generate
 * @param lettersOnly - If true, only lowercase letters will be used (no numbers)
 * @returns A random string of the specified length
 */
export const generateRandomString = (
  length: number,
  lettersOnly: boolean = false,
) => {
  let characters = "";
  if (lettersOnly) {
    characters = "abcdefghijklmnopqrstuvwxyz";
  } else {
    characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  }
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
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
  const binary = String.fromCharCode(...new Uint8Array(buffer));
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
