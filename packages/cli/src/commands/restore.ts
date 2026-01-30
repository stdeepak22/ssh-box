import inquirer from 'inquirer';
import { decrypt } from '@ssh-box/common/dist/crypto';
import { getBaseUrl, getToken } from '../config';
import ora from 'ora';
import { parseNameAndVersion, resolveVersion } from '../utils/version';

export async function restoreSecret(nameWithVersion: string, options: { ver?: string }) {
    const { name, versionStr } = parseNameAndVersion(nameWithVersion);
    const targetVersionStr = versionStr || options.ver;

    const token = getToken();
    if (!token) {
        console.error('Not logged in.');
        return;
    }

    const spinner = ora('Fetching secret info...').start();
    await performRestore(name, targetVersionStr || null, token, spinner);
}

export async function performRestore(name: string, versionStr: string | null, token: string, spinner?: any) {
    const s = spinner || ora('Restoring...').start();
    try {
        const baseUrl = getBaseUrl();
        // 1. Find the secret by name to get its ID and version history
        if (!spinner) s.text = 'Fetching secret info...';
        const res = await fetch(`${baseUrl}/secrets`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const secrets = await res.json();

        const secret = secrets.find((s: any) => s.name === name);

        if (!secret) {
            s.fail(`Secret "${name}" not found.`);
            return;
        }

        const targetVersion = resolveVersion(versionStr || '', secret.allVersions || [secret.version]);
        if (targetVersion === null) {
            s.fail(`Version "${versionStr}" not found for "${name}"`);
            return;
        }

        const id = secret.id;
        s.text = `Fetching version ${targetVersion}...`;

        // 2. Fetch the specific version's encrypted data
        const resOfVerSecret = await fetch(`${baseUrl}/secrets/${id}?version=${targetVersion}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const verSecret = await resOfVerSecret.json();

        s.stop();

        // 3. Verify Master Password
        const { password } = await inquirer.prompt([
            { type: 'password', name: 'password', message: `Enter Master Encryption Password to verify version ${targetVersion}:`, mask: '*' }
        ]);

        s.start('Verifying password...');

        const authTag = verSecret.metadata?.authTag;
        if (!authTag) {
            throw new Error('Auth tag missing from secret metadata');
        }

        const encryptedString = [
            verSecret.salt,
            verSecret.iv,
            authTag,
            verSecret.ciphertext
        ].join(':');

        try {
            await decrypt(encryptedString, password);
        } catch (e: any) {
            if (e.message.includes('operation-specific reason') || e.name === 'OperationError') {
                s.fail('Verification failed. Wrong password?');
            } else {
                s.fail(`Verification failed: ${e.message}`);
            }
            return;
        }

        s.stop();

        // 4. Confirm Restoration
        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: `Password verified. Do you want to restore version ${targetVersion} of "${name}" as the latest?`,
                default: false
            }
        ]);

        if (!confirm) {
            console.log('Action cancelled.');
            return;
        }

        s.start(`Restoring version ${targetVersion} as latest...`);

        // 5. Post this data back as a new version
        await fetch(`${baseUrl}/secrets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                name: verSecret.name,
                ciphertext: verSecret.ciphertext,
                salt: verSecret.salt,
                iv: verSecret.iv,
                metadata: verSecret.metadata
            })
        });

        s.succeed(`Version ${targetVersion} of "${name}" has been restored as the latest version.`);

    } catch (error: any) {
        s.fail(`Failed to restore secret: ${error.response?.data?.error || error.message}`);
    }
}
