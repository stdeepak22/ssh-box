import ora from 'ora';
import { input } from '@inquirer/prompts';
import { helper } from '../utils/shared-instance';

export async function getSecret(nameWithVersion?: string) {
    let name = nameWithVersion;
    let version: string | undefined;

    // Parse if provided as "name:version" format
    if (name && name.includes(':')) {
        const parts = name.split(':');
        name = parts[0];
        version = parts[1];
    }

    // Prompt for name if not provided
    if (!name) {
        name = await input({ 
            message: 'Secret name to retrieve:',
            validate: (input) => input.length > 0 || 'Name is required'
        });
    }

    const spinner = ora('Fetching...').start();
    try {
        const res = await helper.getSpecificSecret(name!, version);

        if (!res?.success) {
            spinner.fail('Secret not found');
            return;
        }

        spinner.stop();
        console.log('\n--- Decrypted Secret ---');
        console.log(res.data.plainText);
        console.log('------------------------\n');
    } catch (error: any) {
        spinner.fail(error.message || `Couldn't get specified secret, try again later.`);
    }
}