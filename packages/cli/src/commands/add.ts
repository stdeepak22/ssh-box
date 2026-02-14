import ora from 'ora';
import { input, password } from '@inquirer/prompts';
import { helper } from '../utils/shared-instance';

export async function addSecret(name?: string, value?: string) {
    let secretName = name;
    let content = value;

    // Prompt for name if not provided
    if (!secretName) {
        secretName = await input({ 
            message: 'Secret name:',
            validate: (input) => input.length > 0 || 'Name is required'
        });
    }

    // Prompt for value if not provided
    if (!content) {
        content = await password({ 
            message: 'Secret value:',
            mask: '•',
            validate: (input) => input.length > 0 || 'Value is required'
        });
    }

    if (!secretName || !content) {
        console.error('Error: Both name and value are required');
        return;
    }

    const spinner = ora('Encrypting...').start();

    try {
        spinner.text = 'Uploading...';
        const res = await helper.saveSecret(secretName, content);
        if (res?.success) {
            spinner.succeed('Secret added successfully!');
        } else {
            spinner.fail(res?.error || 'Failed to add secret.');
        }
    } catch (error: any) {
        spinner.fail(`Failed to add secret: ${error.message}`);
    }
}