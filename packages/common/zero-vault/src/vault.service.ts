import { VaultManager } from "./vault.manager.js";
import { SessionManager } from "./session.manager.js";
import { EncryptionParts, ReWrapDEKWithNew } from "./types.js";
import { UnlockedVaultNeeded, UnlockVaultNeededResult } from "./decorators/unlocked.vault.needed.js";

export class VaultService {    
    static async getUnlockStatus() {
        return SessionManager.getUnlockStatus();
    }

    /**
     * UNLOCK: Takes the bundle from your DB and the user's password.
     * Caches the key internally for 30s.
     */
    static async unlockVault(bundle: EncryptionParts, password: string): Promise<boolean> {
        try {
            const cryptoKey = await VaultManager.unwrapDEK(bundle, password);
            SessionManager.setKey(cryptoKey);
            return true;
        } catch (error) {
            return false;
        }
    }

    static async lock() {
        return SessionManager.lock();
    }

    /**
     * Allows to subscribe to the lock event
     */
    static onLock(callback: () => void) {
        return SessionManager.onLock(callback);
    }

    /**
     * GET SECRET: Retrieves and decrypts data.
     * Automatically resets the 30s session timer on use.
     */
    @UnlockedVaultNeeded()
    static async decryptSecret(parts: EncryptionParts, decorRes?: UnlockVaultNeededResult): Promise<string> {
        return await VaultManager.decryptSecret(decorRes!.key, parts);
    }

    /**
     * SAVE SECRET: Encrypts new data using the session's key.
     */
    @UnlockedVaultNeeded()
    static async saveSecret(plaintext: string, decorRes?: UnlockVaultNeededResult) {
        return await VaultManager.encryptSecret(decorRes!.key, plaintext);
    }

    /**
     * CHANGE PASSWORD: Validates old pass and updates the DB bundle.
     */
    static async updateMasterPassword(bundle: EncryptionParts, oldPass: string, newPass: string): Promise<ReWrapDEKWithNew> {
        const res = await VaultManager.changePassword(bundle, oldPass, newPass);
        if (res.success) {
            await this.unlockVault(res.parts!, newPass);
        }
        return res;
    }

    static async configureMasterPassword(password: string): Promise<EncryptionParts> {
        return await VaultManager.wrapDEK(password);
    }

}