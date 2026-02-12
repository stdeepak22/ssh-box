import { MasterPasswordChangeResponse, AuthStorageService } from "./../types.js";
import { ShouldBeAuthenticated, ShouldBeAuthenticatedResult } from "./decorators/authenticated.js";
import { EncryptionParts, VaultService } from '@ssh-box/zero-vault'

export class MasterPasswordHelper {
    // used in decorator
    private _authStorageService?: AuthStorageService
    constructor(authStorageService: AuthStorageService) {
        this._authStorageService = authStorageService;
    }

    async #getEncryptionPartOfMaster() {
        const {getBaseUrl, getToken} = this._authStorageService!;
        try {
            const res = await fetch(`${getBaseUrl()}/auth/master-verifier`, {
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });
            const parts: EncryptionParts = await res.json();
            return {
                success: true,
                parts,
            }
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async #setEncryptionPartOfMaster(parts: EncryptionParts) {
        const {getBaseUrl, getToken} = this._authStorageService!;
        try {
            const res = await fetch(`${getBaseUrl()}/auth/set-master`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify(parts)
            });
            
            if (!res.ok) {
                return { success: false, error: 'Failed to set master password' };
            }
            return { success: true, parts };
        } catch (error: any) {
            return { success: false, error: error.message || 'Failed to set master password' };
        }
    }

    @ShouldBeAuthenticated()
    async setPassword(
        password: string,
    ): Promise<MasterPasswordChangeResponse> {
        try {
            const { success, error, parts } = await this.#getEncryptionPartOfMaster();
            if (!success) {
                return {
                    success,
                    error,
                }
            }

            const has_mp_parts = parts?.salt || parts?.iv || parts?.ct;
            if (has_mp_parts) {
                return { success: false, error: `Current password is required to change master password.` }
            }

            const encryptedData = await VaultService.configureMasterPassword(password);

            return await this.#setEncryptionPartOfMaster(encryptedData);
        }
        catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    @ShouldBeAuthenticated()
    async updatePassword(
        currentPassword: string,
        newPassword: string,
        decoratorValue?: ShouldBeAuthenticatedResult,
    ): Promise<MasterPasswordChangeResponse> {
        const { baseUrl, token } = decoratorValue!;
        if (!currentPassword) {
            return { success: false, error: `Current password is required to change master password.` }
        }

        try {
            const { success, error, parts } = await this.#getEncryptionPartOfMaster();
            if (!success) {
                return {
                    success,
                    error,
                }
            }

            const has_mp_parts = parts?.salt || parts?.iv || parts?.ct;

            let changedParts: EncryptionParts;
            if (has_mp_parts) {
                const res = await VaultService.updateMasterPassword(parts, currentPassword, newPassword);
                if (!res.success) {
                    return {
                        success: false,
                        error: res.message,
                    }
                }
                changedParts = res.parts!;
            } else {
                changedParts = await VaultService.configureMasterPassword(newPassword);
            }

            return await this.#setEncryptionPartOfMaster(changedParts);
        }
        catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    @ShouldBeAuthenticated()
    async unlockVault(
        password: string,
    ){
        const { success, error, parts } = await this.#getEncryptionPartOfMaster();
        if(success && parts){
            return VaultService.unlockVault(parts, password);
        }
        return false;
    }

    async getUnlockStatus(){
        return VaultService.getUnlockStatus();
    }

    async lockVault(){
        return VaultService.lock();
    }
}   