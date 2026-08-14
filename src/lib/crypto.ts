import CryptoJS from 'crypto-js';

// Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Convert Base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string) {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  const publicKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privateKey = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  return {
    publicKey: arrayBufferToBase64(publicKey),
    privateKey: arrayBufferToBase64(privateKey)
  };
}

export async function encryptMessage(publicKeyBase64: string, message: string) {
  const pubKeyBuffer = base64ToArrayBuffer(publicKeyBase64);
  const publicKey = await window.crypto.subtle.importKey(
    "spki",
    pubKeyBuffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );

  const encodedMessage = new TextEncoder().encode(message);
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    encodedMessage
  );

  return arrayBufferToBase64(encrypted);
}

export async function decryptMessage(privateKeyBase64: string, encryptedBase64: string) {
  try {
    const privKeyBuffer = base64ToArrayBuffer(privateKeyBase64);
    const privateKey = await window.crypto.subtle.importKey(
      "pkcs8",
      privKeyBuffer,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["decrypt"]
    );

    const encryptedBuffer = base64ToArrayBuffer(encryptedBase64);
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      encryptedBuffer
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error("Failed to decrypt", error);
    return "[Encrypted Message - Key Missing/Invalid]";
  }
}

export function wrapPrivateKey(privateKey: string, pin: string) {
  return CryptoJS.AES.encrypt(privateKey, pin).toString();
}

export function unwrapPrivateKey(encryptedPrivateKey: string, pin: string) {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedPrivateKey, pin);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText;
  } catch (error) {
    return null;
  }
}
