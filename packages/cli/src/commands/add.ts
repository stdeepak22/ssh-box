import ora from 'ora';
import inquirer from 'inquirer';
import { helper } from '../utils/shared-instance';

export async function addSecret(name?: string, value?: string) {
    let secretName = name;
    let content = value;

    // Prompt for name if not provided
    if (!secretName) {
        const answer = await inquirer.prompt([{
            type: 'input',
            name: 'name',
            message: 'Secret name:',
            validate: (input) => input.length > 0 || 'Name is required'
        }]);
        secretName = answer.name;
    }

    // Prompt for value if not provided
    if (!content) {
        const answer = await inquirer.prompt([{
            type: 'password',
            name: 'value',
            message: 'Secret value:',
            mask: '•',
            validate: (input) => input.length > 0 || 'Value is required'
        }]);
        content = answer.value;
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
