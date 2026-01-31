import { decrypt } from '@ssh-box/common/dist/crypto';
import { getBaseUrl, getToken } from '../config';

export async function verifyMasterPassword(password: string): Promise<{ success: boolean; status?: number; error?: string }> {
    const token = getToken();
    const baseUrl = getBaseUrl();

    if (!token) {
        return { success: false, error: 'Not logged in' };
    }

    try {
        const res = await fetch(`${baseUrl}/auth/master-verifier`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) {
            return { success: false, status: res.status, error: 'Failed to fetch verifier' };
        }

        const verifier = await res.json();
        // verifier = { salt, iv, authTag, ciphertext }

        const encryptedString = [
            verifier.salt,
            verifier.iv,
            verifier.authTag,
            verifier.ciphertext
        ].join(':');

        try {
            const decrypted = await decrypt(encryptedString, password);
            if (decrypted === 'verified') {
                return { success: true };
            }
            return { success: false, error: 'Invalid master password' };
        } catch (e) {
            return { success: false, error: 'Invalid master password' };
        }
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
