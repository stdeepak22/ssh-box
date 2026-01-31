
export interface User {
    pk: string; // USER#${email}
    sk: string; // CRED
    passwordHash?: string; // Only on server
    createdAt: string;
}

export interface SecretMetadata {
    pk: string; // USER#${email}
    sk: string; // SM#KEY99
    cv: number;
    v: number[];
    createdAt: string;
    updatedAt: string;
}

export interface Secret {
    pk: string; // USER#${email}
    sk: string; // K#KEY99#12121
    name: string;
    v: number;
    text: string;
    salt: string;
    iv: string;
    meta: any;
    createdAt: string;
}

export interface AuthResponse {
    token: string;
    user: {
        id: string;
        email: string;
    };
}
