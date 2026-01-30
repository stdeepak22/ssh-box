import inquirer from 'inquirer';
import { getBaseUrl, getToken } from '../config';
import ora from 'ora';

export async function removeSecret(name: string) {
    const token = getToken();
    if (!token) {
        console.error('Not logged in. Please use the "login" command.');
        return;
    }

    const spinner = ora('Checking secret...').start();
    try {
        const baseUrl = getBaseUrl();
        // 1. Find the secret by name to get its ID
        const res = await fetch(`${baseUrl}/secrets`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const secrets = await res.json();

        const secret = secrets.find((s: any) => s.name === name);

        if (!secret) {
            spinner.fail(`Secret "${name}" not found.`);
            return;
        }

        spinner.stop();

        // 2. Confirm deletion
        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: `Are you sure you want to delete "${name}" and all its versions?`,
                default: false
            }
        ]);

        if (!confirm) {
            console.log('Action cancelled.');
            return;
        }

        spinner.start(`Deleting "${name}"...`);

        // 3. Perform deletion
        await fetch(`${baseUrl}/secrets/${secret.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });

        spinner.succeed(`Secret "${name}" deleted successfully.`);

    } catch (error: any) {
        spinner.fail(`Failed to delete secret: ${error.response?.data?.error || error.message}`);
    }
}
