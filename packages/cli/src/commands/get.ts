import axios from 'axios';
import inquirer from 'inquirer';
import { decrypt } from '@ssh-box/common/dist/crypto';
import { getBaseUrl, getToken } from '../config';
import ora from 'ora';

export async function getSecret(options: { name: string; ver?: string }) {
    const token = getToken();
    if (!token) {
        console.error('Not logged in.');
        return;
    }

    const spinner = ora('Fetching...').start();
    try {
        const baseUrl = getBaseUrl();
        // Fetch all keys to find by name
        const { data: secrets } = await axios.get(`${baseUrl}/secrets`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        // secrets is array of { ...item, id: secret_id_base }
        const secret = secrets.find((s: any) => s.name === options.name);

        if (!secret) {
            spinner.fail('Secret not found');
            return;
        }

        let targetSecret = secret;

        // If version specified, we need to fetch that specific version.
        if (options.ver) {
            // The id in secret list is the BASE id (without #version if I split it, or with key logic)
            // In secrets.ts list logic: id = item.secret_id.split('#')[0]
            const id = secret.id;

            try {
                const { data: verSecret } = await axios.get(`${baseUrl}/secrets/${id}?version=${options.ver}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                targetSecret = verSecret;
            } catch (e: any) {
                if (e.response && e.response.status === 404) {
                    spinner.fail(`Version ${options.ver} not found`);
                    return;
                }
                throw e;
            }
        }

        spinner.stop();

        const { password } = await inquirer.prompt([
            { type: 'password', name: 'password', message: 'Enter Master Encryption Password:', mask: '*' }
        ]);

        const spinner2 = ora('Decrypting...').start();

        const authTag = targetSecret.metadata?.authTag;
        if (!authTag) {
            throw new Error('Auth tag missing from secret metadata');
        }

        const encryptedString = [
            targetSecret.salt,
            targetSecret.iv,
            authTag,
            targetSecret.ciphertext // The ciphertext field
        ].join(':');

        const decrypted = await decrypt(encryptedString, password);
        spinner2.stop();

        console.log(decrypted);

    } catch (error: any) {
        if (spinner.isSpinning) spinner.stop();
        console.error(`Failed: ${error.response?.data?.error || error.message}`);
    }
}
