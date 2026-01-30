import inquirer from 'inquirer';
import { decrypt } from '@ssh-box/common/dist/crypto';
import { getBaseUrl, getToken } from '../config';
import ora from 'ora';
import { performRestore } from './restore';
import { parseNameAndVersion, resolveVersion } from '../utils/version';

export async function getSecret(nameWithVersion: string, options: { ver?: string }) {
    const { name, versionStr } = parseNameAndVersion(nameWithVersion);
    const targetVersionStr = versionStr || options.ver;

    const token = getToken();
    if (!token) {
        console.error('Not logged in.');
        return;
    }

    const spinner = ora('Fetching...').start();
    try {
        const baseUrl = getBaseUrl();
        // Fetch all keys to find by name and get version history
        const res = await fetch(`${baseUrl}/secrets`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
            throw new Error('Failed to fetch secrets');
        }
        const secrets = await res.json();

        // secrets is array of { ...item, id: secret_id_base, allVersions: [3, 2, 1] }
        const secret = secrets.find((s: any) => s.name === name);

        if (!secret) {
            spinner.fail('Secret not found');
            return;
        }

        let targetVersion: number | null = null;
        if (targetVersionStr) {
            targetVersion = resolveVersion(targetVersionStr, secret.allVersions || [secret.version]);
            if (targetVersion === null) {
                spinner.fail(`Version "${targetVersionStr}" not found for "${name}"`);
                return;
            }
        }

        let targetSecret = secret;

        // If version specified and is not the latest version we already have
        if (targetVersion && targetVersion !== secret.version) {
            spinner.text = `Fetching version ${targetVersion}...`;
            const id = secret.id;

            try {
                const res = await fetch(`${baseUrl}/secrets/${id}?version=${targetVersion}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const verSecret = await res.json();
                targetSecret = verSecret;
            } catch (e: any) {
                if (e.response && e.response.status === 404) {
                    spinner.fail(`Version ${targetVersion} not found`);
                    return;
                }
                throw e;
            }
        }

        spinner.stop();

        const { password } = await inquirer.prompt([
            { type: 'password', name: 'password', message: 'Enter Master Encryption Password:', mask: '*' }
        ]);

        spinner.start('Decrypting...');

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

        let decrypted;
        try {
            decrypted = await decrypt(encryptedString, password);
        } catch (e: any) {
            // Web Crypto throws a generic error for wrong password in GCM
            if (e.message.includes('operation-specific reason') || e.name === 'OperationError') {
                spinner.fail('Decryption failed. Wrong password?');
            } else {
                spinner.fail(`Decryption failed: ${e.message}`);
            }
            return;
        }

        spinner.stop();
        console.log('\n--- Decrypted Secret ---');
        console.log(decrypted);
        console.log('------------------------\n');

        // 4. Interactive Restore Prompt - Only if NOT already the latest
        const latestVersion = secret.version;
        if (targetSecret.version < latestVersion) {
            const { restore } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'restore',
                    message: `Would you like to restore version ${targetSecret.version} of "${name}" as the latest?`,
                    default: false
                }
            ]);

            if (restore) {
                await performRestore(name, targetSecret.version.toString(), token);
            }
        }

    } catch (error: any) {
        if (error.response?.status === 403) {
            spinner.fail('Authentication expired or invalid. Please run "ssh-box login" again.');
        } else {
            spinner.fail(`Failed: ${error.response?.data?.error || error.message}`);
        }
    }
}
