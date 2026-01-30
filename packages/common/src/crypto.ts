const SALT_LEN = 16;
const IV_LEN = 12; // GCM standard
const ITERATIONS = 100000;
const DIGEST = 'SHA-256';

// Helper: Convert ArrayBuffer to Hex String
function buf2hex(buffer: ArrayBuffer): string {
    return [...new Uint8Array(buffer)]
        .map(x => x.toString(16).padStart(2, '0'))
        .join('');
}

// Helper: Convert Hex String to Uint8Array
function hex2buf(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

// Derive a key from password and salt
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt as any,
            iterations: ITERATIONS,
            hash: DIGEST
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

export async function encrypt(text: string, password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
    const key = await deriveKey(password, salt);
    const enc = new TextEncoder();

    const ciphertextBuffer = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv as any // Bylass ArrayBufferLike mismatch
        },
        key,
        enc.encode(text)
    );

    // In Web Crypto, the auth tag is appended to the ciphertext for AES-GCM
    // But my previous implementation (Node) separated them "salt:iv:tag:ciphertext"
    // Node's cipher.final() returns ciphertext only, cipher.getAuthTag() returns tag.
    // Web Crypto encrypt() returns [Ciphertext + Tag] concatenated.
    // I need to split the tag manually if I want to maintain the exact format, 
    // OR I can change the format to "salt:iv:ciphertextWithTag".
    // 
    // Wait, let's look at the previous format: "salt:iv:authTag:encrypted"
    // If I change the format, existing data (if any) would break. 
    // But this is MVP/dev, so breakage is acceptable, BUT I should try to match.
    // AES-GCM tag length is usually 128 bits (16 bytes).

    // Web Crypto standard for AES-GCM is to append the tag at the end of ciphertext.
    const ciphertextWithTag = new Uint8Array(ciphertextBuffer);
    const tagLength = 16;
    const ciphertext = ciphertextWithTag.slice(0, ciphertextWithTag.length - tagLength);
    const authTag = ciphertextWithTag.slice(ciphertextWithTag.length - tagLength);

    return [
        buf2hex(salt.buffer),
        buf2hex(iv.buffer),
        buf2hex(authTag.buffer),
        buf2hex(ciphertext.buffer)
    ].join(':');
}

export async function decrypt(encryptedText: string, password: string): Promise<string> {
    const parts = encryptedText.split(':');
    if (parts.length !== 4) {
        throw new Error('Invalid encrypted string format');
    }
    const [saltHex, ivHex, authTagHex, encryptedHex] = parts;

    const salt = hex2buf(saltHex);
    const iv = hex2buf(ivHex);
    const authTag = hex2buf(authTagHex);
    const ciphertext = hex2buf(encryptedHex);
    const key = await deriveKey(password, salt);

    // Reconstruct [Ciphertext + Tag] for Web Crypto
    const ciphertextWithTag = new Uint8Array(ciphertext.length + authTag.length);
    ciphertextWithTag.set(ciphertext);
    ciphertextWithTag.set(authTag, ciphertext.length);

    const decryptedBuffer = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv as any
        },
        key,
        ciphertextWithTag
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
}
