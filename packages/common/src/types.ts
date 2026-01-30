export interface User {
    email: string;
    id: string; // UUID
    passwordHash?: string; // Only on server
    createdAt: string;
}

export interface Secret {
    id: string; // UUID
    userId: string;
    name: string;
    version: number;
    ciphertext: string;
    salt: string;
    iv: string;
    metadata: any;
    createdAt: string;
    updatedAt: string;
}

export interface AuthResponse {
    token: string;
    user: {
        id: string;
        email: string;
    };
}
