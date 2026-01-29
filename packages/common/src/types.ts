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
    encryptedData: string; // "salt:iv:ciphertext"
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
