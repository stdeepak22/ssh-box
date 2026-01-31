import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import { encrypt } from '@ssh-box/common/dist/crypto';
import { getBaseUrl, getToken } from '../config';

export async function setMasterPassword() {
    const token = getToken();
    if (!token) {
        console.error(chalk.red('Not logged in. Please run "ssh-box login" first.'));
        return;
    }

    const { password, confirmPassword } = await inquirer.prompt([
        { type: 'password', name: 'password', message: 'Enter new Master Password:', mask: '*' },
        { type: 'password', name: 'confirmPassword', message: 'Confirm Master Password:', mask: '*' }
    ]);

    if (password !== confirmPassword) {
        console.error(chalk.red('Passwords do not match.'));
        return;
    }

    const spinner = ora('Setting master password...').start();
    try {
        const baseUrl = getBaseUrl();

        // Zero-Knowledge: Encrypt a static string locally
        const encryptedData = await encrypt('verified', password);
        const [salt, iv, authTag, ciphertext] = encryptedData.split(':');

        const res = await fetch(`${baseUrl}/auth/set-master`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                verifier: { salt, iv, authTag, ciphertext }
            })
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to set master password');
        }

        spinner.succeed(chalk.green('Master password verifier set successfully! (Zero-Knowledge)'));
    } catch (error: any) {
        spinner.fail(chalk.red(`Failed to set master password: ${error.message}`));
    }
}
