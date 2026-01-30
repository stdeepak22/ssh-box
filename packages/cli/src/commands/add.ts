import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { encrypt } from '@ssh-box/common/dist/crypto';
import { getToken, getBaseUrl } from '../config';
import ora from 'ora';

export async function addSecret(name: string, value: string | undefined, options: { file?: string }) {
    const token = getToken();
    if (!token) {
        console.error('Not logged in. Run "ssh-box login" first.');
        return;
    }

    let content = value;

    if (!content && options.file) {
        const filePath = path.resolve(options.file);
        if (!fs.existsSync(filePath)) {
            console.error(`File not found: ${filePath}`);
            return;
        }
        content = fs.readFileSync(filePath, 'utf8');
    }

    if (!content) {
        console.error('Error: You must provide either a secret value as an argument or a file path via -f');
        return;
    }

    const { password } = await inquirer.prompt([
        { type: 'password', name: 'password', message: 'Enter Master Encryption Password:', mask: '*' }
    ]);

    const spinner = ora('Encrypting...').start();
    try {
        const encryptedData = await encrypt(content, password);
        spinner.text = 'Uploading...';

        const baseUrl = getBaseUrl();
        // Format: salt:iv:authTag:ciphertext
        const [salt, iv, authTag, ciphertext] = encryptedData.split(':');

        await fetch(`${baseUrl}/secrets`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                ciphertext,
                salt,
                iv,
                metadata: { authTag }
            })
        });

        spinner.succeed('Secret added successfully!');
    } catch (error: any) {
        spinner.fail(`Failed to add secret: ${error.response?.data?.error || error.message}`);
    }
}
