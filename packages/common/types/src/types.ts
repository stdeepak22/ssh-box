
export interface AuthResponse {
    token: string;
    user: {
        id: string;
        email: string;
    };
}

export interface EncryptionParts {
    iv?: string,
    ct?: string,
    salt?: string,
}