import { AuthStorageService, GetAllSecretsResponse, AddSecretResponse, RemoveSecretResponse, RestoreSecretResponse, SecretDetail } from "../types.js";
import { ShouldBeAuthenticated, ShouldBeAuthenticatedResult } from "./decorators/authenticated.js";
import { EncryptionParts, UnlockedVaultNeeded, UnlockVaultNeededResult, VaultService } from "@ssh-box/zero-vault";

export class SecretHelper {
    // used in decorator
    private _authStorageService?: AuthStorageService
    constructor(authStorageService: AuthStorageService) {
        this._authStorageService = authStorageService;
    }

    async #postToDB(name: string, parts: EncryptionParts) {
        const { getBaseUrl, getToken } = this._authStorageService!;
        try {
            const res = await fetch(`${getBaseUrl()}/secrets`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    ...parts,
                })
            });


            if (!res.ok) {
                return { success: false, error: 'Failed to save your secret.' };
            }
            return {
                success: true,
            }
        } catch (error: any) {
            return { success: false, error: error?.message || `Something went wrong, and couldn't add secret, try again later.` };
        }
    }

    async #getAllSecrets(): Promise<GetAllSecretsResponse> {
        const { getBaseUrl, getToken } = this._authStorageService!;
        try {
            const res = await fetch(`${getBaseUrl()}/secrets`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            if (!res.ok) {
                return {
                    success: false,
                    error: `Couldn't fetch secrets.`
                }
            }
            const secrets = await res.json();
            return {
                success: true,
                data: secrets as SecretDetail[]
            }
        } catch (error: any) {
            return {
                success: false,
                error: error?.message || `Something weng wrong, and couldn't fetch all your secret, try again after sometime.`
            }
        }
    }

    async #getSecretByName(
        name: string,
        version?: string
    ) {
        const { getBaseUrl, getToken } = this._authStorageService!;
        try {
            let url = `${getBaseUrl()}/secrets/${name}`;
            if (version) {
                url = `${url}?version=${version}`;
            }

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            if (!res.ok) {
                return {
                    success: false,
                    error: `Couldn't fetch given secret.`
                }
            }
            const secret: EncryptionParts = await res.json();

            return {
                success: true,
                secret
            }
        } catch (error: any) {
            return {
                success: false,
                error: error?.message || `Something weng wrong, and couldn't fetch given secret, try again after sometime.`
            }
        }
    }

    async #deleteSecretFromDB(name: string): Promise<RemoveSecretResponse> {
        const { getBaseUrl, getToken } = this._authStorageService!;
        try {
            const res = await fetch(`${getBaseUrl()}/secrets/${name}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${getToken()}` }
            });

            if (!res.ok) {
                return { success: false, error: 'Failed to delete your secret.' };
            }
            return {
                success: true,
            }
        } catch (error: any) {
            return { success: false, error: error?.message || `Something went wrong, and couldn't delete secret, try again later.` };
        }
    }

    @ShouldBeAuthenticated()
    @UnlockedVaultNeeded()
    async addSecret(
        secretName: string,
        secretValue: string,
        authDecoratorValue?: ShouldBeAuthenticatedResult,
        unlockDecoratorValue?: UnlockVaultNeededResult,
    ): Promise<AddSecretResponse> {

        let content = secretValue;
        if (!content) {
            return { success: false, error: 'Secret value is not provided, please make sure to provide secret name, and value' };
        }

        try {
            const encryptedData = await VaultService.saveSecret(content);
            return this.#postToDB(secretName, encryptedData)
        } catch (error: any) {
            return {
                success: false,
                error: `Failed to add secret: ${error.message}`
            }
        }
    }

    @ShouldBeAuthenticated()
    @UnlockedVaultNeeded()
    async getSecretList(
        authDecoratorValue?: ShouldBeAuthenticatedResult,
        unlockDecoratorValue?: UnlockVaultNeededResult,
    ) {
        return this.#getAllSecrets();
    }

    @ShouldBeAuthenticated()
    @UnlockedVaultNeeded()
    async getSecretByName(
        name: string,
        version?: string,
        authDecoratorValue?: ShouldBeAuthenticatedResult,
        unlockDecoratorValue?: UnlockVaultNeededResult,
    ) {
        let plainText = undefined;
        const res = await this.#getSecretByName(name, version);
        if (res.success && res.secret) {
            plainText = await VaultService.decryptSecret(res.secret);
        }
        return {
            success: res.success,
            error: res.error,
            data: {
                plainText
            }
        }
    }

    @ShouldBeAuthenticated()
    async removeSecret(
        name: string,
        authDecoratorValue?: ShouldBeAuthenticatedResult,
    ): Promise<RemoveSecretResponse> {
        if (!name) {
            return { success: false, error: 'Secret name is required for deletion.' };
        }

        return await this.#deleteSecretFromDB(name);
    }

    @ShouldBeAuthenticated()
    @UnlockedVaultNeeded()
    async restoreSecret(
        name: string,
        version?: string,
        authDecoratorValue?: ShouldBeAuthenticatedResult,
        unlockDecoratorValue?: UnlockVaultNeededResult,
    ): Promise<RestoreSecretResponse> {
        if (!name) {
            return { success: false, error: 'Secret name is required for restoration.' };
        }

        try {
            // 1. Get the specific version to restore
            const getVersionResult = await this.#getSecretByName(name, version);
            if (!getVersionResult.success || !getVersionResult.secret) {
                return {
                    success: false,
                    error: getVersionResult.error || `Failed to fetch secret version ${version || 'latest'}`
                };
            }

            // 2. Decrypt the secret to verify it can be restored
            const plainText = await VaultService.decryptSecret(getVersionResult.secret);

            // 3. Re-encrypt and save as the latest version
            const encryptedData = await VaultService.saveSecret(plainText);
            const saveResult = await this.#postToDB(name, encryptedData);

            return {
                success: saveResult.success,
                error: saveResult.error
            };

        } catch (error: any) {
            return {
                success: false,
                error: `Failed to restore secret: ${error.message}`
            };
        }
    }
}