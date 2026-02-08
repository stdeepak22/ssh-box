interface ServerRequest {
    success: boolean;
    error?: string;
}


export interface PingPongResponse extends ServerRequest {
    data?: string
}

export interface LoginResponse extends ServerRequest {
    data?: {
        email: string,
        token: string,
        has_mp: boolean,
    }
}

export interface SecretDetail {
    name: string,
    version: string,
    history?: string,
    createdAt?: string,
    updatedAt?: string,
}

export interface GetAllSecretsResponse extends ServerRequest {
    data?: SecretDetail[]
}

export interface AccountRegistrationResponse extends ServerRequest {
}

export interface MasterPasswordChangeResponse extends ServerRequest {
}

export interface AddSecretResponse extends ServerRequest {

}

export declare abstract class AuthStorageService {
    abstract getBaseUrl(): string;
    abstract getToken(): string | undefined;
}
