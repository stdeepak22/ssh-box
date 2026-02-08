import { AccountRegistrationResponse, LoginResponse, AuthStorageService } from "./../types.js";

export class AuthHelper {
    private _authStorageService?: AuthStorageService
    constructor(authStorageService: AuthStorageService) {
        this._authStorageService = authStorageService;
    }

    async #registerNewAccount(
        email: string,
        password: string,
    ) {
        const baseUrl = this._authStorageService!.getBaseUrl();
        try {
            const res = await fetch(`${baseUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            if (!res.ok) {
                return { success: false, error: 'Failed to register new account.' };
            }
            return {
                success: true,
            }
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async #loginWithCredentials(
        email: string,
        password: string,
    ): Promise<LoginResponse> {
        const baseUrl = this._authStorageService!.getBaseUrl();
        try {
            const res = await fetch(`${baseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            if (!res.ok) {
                return { success: false, error: 'Login failed, check your credentials.' };
            }
            const data = await res.json();
            return { success: true, data };
        } catch (error: any) {
            return { success: false, error: error.message || 'Something went wrong, and couldn\'t login.' };
        }
    }

    #basicCheck(
        email: string,
        password: string,
    ){
        if(!email) {
            throw new Error('Email is required.');
        }
        if(!password) {
            throw new Error('Password is required.');
        }
        if(!this._authStorageService) {
            throw new Error('Something wring, AuthStorageService is not initialized.');
        }
    }

    
    async login(
        email: string,
        password: string,
    ): Promise<LoginResponse> {
        this.#basicCheck(email, password);
        return this.#loginWithCredentials(
            email,
            password
        )
    } 

    async registerNewAccount(
        email: string,
        password: string,
    ): Promise<AccountRegistrationResponse> {
        this.#basicCheck(email, password);
        return this.#registerNewAccount(email, password);
    }    
}   