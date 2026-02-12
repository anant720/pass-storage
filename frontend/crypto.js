/**
 * LiquidPass – Client-Side E2E Encryption Utility
 *
 * Uses the Web Crypto API (built-in, zero dependencies):
 *   • Key Derivation : PBKDF2, 600 000 iterations, SHA-256
 *   • Encryption     : AES-256-GCM, random 12-byte IV per field
 *   • Storage format : Base64( IV‖ciphertext‖authTag )
 *
 * The encryption key is derived from the user's master password + username
 * (as salt) and is NEVER stored or transmitted.
 */

const PBKDF2_ITERATIONS = 600_000;
const IV_BYTES = 12; // recommended for AES-GCM

// ─── helpers ─────────────────────────────────────────────────────────

function bufToBase64(buf) {
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToBuf(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

// ─── key derivation ──────────────────────────────────────────────────

/**
 * Derive a 256-bit AES-GCM CryptoKey from the user's master password.
 * The salt is the UTF-8 encoding of the username (unique per user).
 */
export async function deriveKey(password, username) {
    const enc = new TextEncoder();

    // Import raw password as key material
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    // Derive AES-GCM key
    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: enc.encode(username),
            iterations: PBKDF2_ITERATIONS,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false, // non-extractable – stays in memory only
        ["encrypt", "decrypt"]
    );
}

// ─── field-level encrypt / decrypt ───────────────────────────────────

/**
 * Encrypt a single plaintext string.
 * Returns a Base64 string containing ( IV ‖ ciphertext+authTag ).
 */
export async function encryptField(key, plaintext) {
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));

    const cipherBuf = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        enc.encode(plaintext)
    );

    // Concatenate IV + ciphertext into one buffer
    const combined = new Uint8Array(iv.byteLength + cipherBuf.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(cipherBuf), iv.byteLength);

    return bufToBase64(combined.buffer);
}

/**
 * Decrypt a Base64 string previously produced by encryptField.
 * Throws on wrong key / tampered data (AES-GCM authentication).
 */
export async function decryptField(key, ciphertextB64) {
    const combined = new Uint8Array(base64ToBuf(ciphertextB64));
    const iv = combined.slice(0, IV_BYTES);
    const ciphertext = combined.slice(IV_BYTES);

    const plainBuf = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        ciphertext
    );

    return new TextDecoder().decode(plainBuf);
}

// ─── item-level wrappers ─────────────────────────────────────────────

/**
 * Encrypt all user-visible fields of a vault item.
 */
export async function encryptItem(key, item) {
    const [site, username, password] = await Promise.all([
        encryptField(key, item.site),
        encryptField(key, item.username),
        encryptField(key, item.password),
    ]);
    return { site, username, password };
}

/**
 * Decrypt a vault item. If decryption fails (legacy plaintext data),
 * returns the item as-is and sets `._wasPlaintext = true` so the caller
 * can re-encrypt and save.
 */
export async function decryptItem(key, item) {
    try {
        const [site, username, password] = await Promise.all([
            decryptField(key, item.site),
            decryptField(key, item.username),
            decryptField(key, item.password),
        ]);
        return { ...item, site, username, password };
    } catch {
        // Field wasn't valid Base64+AES-GCM → legacy plaintext
        return { ...item, _wasPlaintext: true };
    }
}
