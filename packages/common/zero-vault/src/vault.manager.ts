const ITERATIONS = 600000;
const AES_ALGO = "AES-GCM";


import { EncryptionParts, ReWrapDEKWithNew } from "./types.js";


const toBase64 = (buf: ArrayBuffer | Uint8Array): string => {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    return btoa(String.fromCharCode(...bytes));
};

const fromBase64 = (str: string) => Uint8Array.from(atob(str), c => c.charCodeAt(0));



export class VaultManager {

    //#region Private Methods

    /**
     * Derives the master key from the password and salt
     */
    static async #deriveMasterKey(password: string, salt: Uint8Array) {
        const baseKey = await crypto.subtle.importKey(
            "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]
        );
        return crypto.subtle.deriveKey(
            { name: "PBKDF2", salt: salt as BufferSource, iterations: ITERATIONS, hash: "SHA-256" },
            baseKey, { name: AES_ALGO, length: 256 }, false, ["encrypt", "decrypt"]
        );
    }

    /**
     * Gets raw bytes back for DEK
     */
    static async #unwrapToRaw(wrappedBundle: EncryptionParts, password: string): Promise<Uint8Array> {
        const { ct, salt, iv } = wrappedBundle;
        if (!salt || !ct || !iv) {
            throw new Error("All fields are required - {ct, salt, iv}");
        }
        const masterKey = await this.#deriveMasterKey(password, fromBase64(salt));

        const dekBuffer = await crypto.subtle.decrypt(
            { name: AES_ALGO, iv: fromBase64(iv) },
            masterKey,
            fromBase64(ct)
        );

        return new Uint8Array(dekBuffer);
    }

    /**
     * Generates a random 256-bit buffer.
     * will be used once for newly created account.
     */
    static #generateDEK() {
        return crypto.getRandomValues(new Uint8Array(32));
    }
    //#endregion



    /**
     * PROTECT THE DEK: Encrypts the 256-bit buffer using Master Password
     * Store the returned 'wrapped' object in 'account' table
     */
    static async wrapDEK(masterPassword: string, dek?: Uint8Array): Promise<EncryptionParts> {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const masterKey = await this.#deriveMasterKey(masterPassword, salt);

        // no DEK:mean creating new account and need that wrapped DEK.
        if (!dek) {
            dek = this.#generateDEK();
        }

        const encryptedDEK = await crypto.subtle.encrypt(
            { name: AES_ALGO, iv }, masterKey, dek as BufferSource
        );

        return {
            ct: toBase64(encryptedDEK),
            salt: toBase64(salt),
            iv: toBase64(iv)
        };
    }

    /**
     * UNLOCK THE DEK: Returns a live CryptoKey ready for use.
     * we will cache this to keep vault unlocked for XX seconds.
     */
    static async unwrapDEK(wrappedBundle: EncryptionParts, masterPassword: string) {
        const { ct, salt, iv } = wrappedBundle;
        if (!salt || !ct || !iv) {
            throw new Error("All fields are required - {ct, salt, iv}");
        }
        const masterKey = await this.#deriveMasterKey(masterPassword, fromBase64(salt));

        const dekBuffer = await crypto.subtle.decrypt(
            { name: AES_ALGO, iv: fromBase64(iv) }, masterKey, fromBase64(ct)
        );

        // Import it immediately so the SessionManager can cache this for XX seconds
        const key = await crypto.subtle.importKey(
            "raw",
            dekBuffer,
            AES_ALGO,
            false,
            ["encrypt", "decrypt"]
        );
        return key;
    }

    /**
     * PUBLIC METHOD: Rotates the master password
     */
    static async changePassword(
        wrappedBundle: EncryptionParts,
        oldPassword: string,
        newPassword: string
    ): Promise<ReWrapDEKWithNew> {
        let rawDEK: Uint8Array;
        try {
            rawDEK = await this.#unwrapToRaw(wrappedBundle, oldPassword);
        } catch (error) {
            return {
                success: false,
                message: "Invalid password"
            };
        }

        const parts = await this.wrapDEK(newPassword, rawDEK);
        return {
            success: true,
            parts
        };
    }

    /**
     * ENCRYPT SECRET: Uses the DEK buffer to encrypt a secret
     * Store the returned object in 'secret' table
     */
    static async encryptSecret(key: CryptoKey, plaintext: string): Promise<EncryptionParts> {
        const iv = crypto.getRandomValues(new Uint8Array(12));

        const encrypted = await crypto.subtle.encrypt(
            { name: AES_ALGO, iv },
            key,
            new TextEncoder().encode(plaintext)
        );

        return {
            ct: toBase64(encrypted),
            iv: toBase64(iv)
        };
    }

    /**
     * DECRYPT SECRET: Uses the DEK buffer to decrypt
     */
    static async decryptSecret(
        key: CryptoKey,
        parts: EncryptionParts
    ): Promise<string> {
        const { ct, iv } = parts;
        if (!ct || !iv) {
            throw new Error("All fields are required - {ct, iv}");
        }

        // Decrypt using the IV and the ciphertext
        const decrypted = await crypto.subtle.decrypt(
            { name: AES_ALGO, iv: fromBase64(iv) },
            key,
            fromBase64(ct)
        );

        return new TextDecoder().decode(decrypted);
    }
}