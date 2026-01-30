import { getBaseUrl, getToken } from '../config';
import ora from 'ora';

export async function listSecrets() {
    const token = getToken();
    if (!token) {
        console.error('Not logged in. Please use the "login" command.');
        return;
    }

    const spinner = ora('Fetching secrets...').start();
    try {
        const baseUrl = getBaseUrl();
        const res = await fetch(`${baseUrl}/secrets`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const secrets = await res.json();

        spinner.stop();

        if (!secrets || secrets.length === 0) {
            console.log('No secrets found.');
            return;
        }

        console.log('\n--- Your Secrets (SSH Box) ---');
        console.table(secrets.map((s: any) => ({
            Name: s.name,
            Version: s.version,
            History: s.allVersions && s.allVersions.length > 0 ? s.allVersions.join(', ') : s.version,
            'Last Modified': new Date(s.created_at).toLocaleString()
        })));
        console.log('------------------------------\n');

    } catch (error: any) {
        if (spinner.isSpinning) spinner.stop();
        console.error(`Failed to list secrets: ${error.response?.data?.error || error.message}`);
    }
}
