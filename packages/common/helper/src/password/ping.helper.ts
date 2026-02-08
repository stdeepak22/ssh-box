import { AuthStorageService, PingPongResponse } from "../types.js";

export class PingPongHelper {
    private _authStorageService?: AuthStorageService;
    constructor(authStorageService: AuthStorageService) {
        this._authStorageService = authStorageService;
    }

        async #requestPong(): Promise<PingPongResponse> {
            const {getBaseUrl, getToken} = this._authStorageService!;
            try {
                const res = await fetch(`${getBaseUrl()}/ping`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getToken()}`
                    }
                });
    
                if (!res.ok) {
                    return { success: false, error: 'PING request Failed' };
                }
                const data = await res.json();
                return { success: true, data };
            } catch (error: any) {
                return { success: false, error: error.message || 'Something went wrong, and couldn\'t reach to PING request.' };
            }
        }

    ping = async () => {
        return await this.#requestPong();
    }
}