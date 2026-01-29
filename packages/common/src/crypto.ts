import * as crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const SALT_LEN = 16;
const IV_LEN = 12; // GCM standard
const KEY_LEN = 32;
const ITERATIONS = 100000;
const DIGEST = 'sha256';

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        crypto.pbkdf2(password, salt, ITERATIONS, KEY_LEN, DIGEST, (err, derivedKey) => {
            if (err) reject(err);
            else resolve(derivedKey);
        });
    });
}

export async function encrypt(text: string, password: string): Promise<string> {
    const salt = crypto.randomBytes(SALT_LEN);
    const iv = crypto.randomBytes(IV_LEN);
    const key = await deriveKey(password, salt);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    // Format: salt:iv:authTag:encrypted
    return [
        salt.toString('hex'),
        iv.toString('hex'),
        authTag,
        encrypted
    ].join(':');
}

export async function decrypt(encryptedText: string, password: string): Promise<string> {
    const parts = encryptedText.split(':');
    if (parts.length !== 4) {
        throw new Error('Invalid encrypted string format');
    }
    const [saltHex, ivHex, authTagHex, encryptedHex] = parts;

    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = await deriveKey(password, salt);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
