import fs from 'fs';
import path from 'path';
import axios from 'axios';
import inquirer from 'inquirer';
import { encrypt } from '@ssh-box/common/dist/crypto';
import { getToken, getBaseUrl } from '../config';
import ora from 'ora';

export async function addSecret(options: { file: string; name: string }) {
    const token = getToken();
    if (!token) {
        console.error('Not logged in. Run "ssh-box login" first.');
        return;
    }

    const filePath = path.resolve(options.file);
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }

    const content = fs.readFileSync(filePath, 'utf8');

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

        await axios.post(`${baseUrl}/secrets`, {
            name: options.name,
            ciphertext,
            salt,
            iv,
            metadata: { authTag }
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        spinner.succeed('Secret added successfully!');
    } catch (error: any) {
        spinner.fail(`Failed to add secret: ${error.response?.data?.error || error.message}`);
    }
}
