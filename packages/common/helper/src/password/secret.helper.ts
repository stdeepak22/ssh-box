import { AuthStorageService, GetAllSecretsResponse, AddSecretResponse, SecretDetail } from "../types.js";
import { ShouldBeAuthenticated, ShouldBeAuthenticatedResult } from "./decorators/authenticated.js";
import { EncryptionParts, UnlockedVaultNeeded, UnlockVaultNeededResult, VaultService } from "@ssh-box/zero-vault";

export class SecretHelper {
    // used in decorator
    private _authStorageService?: AuthStorageService
    constructor(authStorageService: AuthStorageService) {
        this._authStorageService = authStorageService;
    }

    async #postToDB(detail: ShouldBeAuthenticatedResult, name: string, parts: EncryptionParts) {
        try {
            const {baseUrl, token} = detail;
            const res = await fetch(`${baseUrl}/secrets`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
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

    async #getAllSecrets(detail: ShouldBeAuthenticatedResult): Promise<GetAllSecretsResponse> {
        try {
            const {baseUrl, token} = detail;
            const res = await fetch(`${baseUrl}/secrets`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if(!res.ok){
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
        detail: ShouldBeAuthenticatedResult,
        name: string,
        version?: string
    ) {
        try {
            const {baseUrl, token} = detail;
            let url = `${baseUrl}/secrets/${name}`;
            if(version)
            {
                url=`${url}?version=${version}`;
            }

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if(!res.ok){
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
            return {success: false, error:'Secret value is not provided, please make sure to provide secret name, and value'};
        }

        try {
            const encryptedData = await VaultService.saveSecret(content);
            return this.#postToDB(authDecoratorValue!, secretName, encryptedData)
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
        return this.#getAllSecrets(authDecoratorValue!);
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
        const res = await this.#getSecretByName(authDecoratorValue!, name, version);
        if(res.success && res.secret) {
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
}