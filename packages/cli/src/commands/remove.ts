import inquirer from 'inquirer';
import ora from 'ora';
import { getHelpr } from '../utils/shared-instance';

export async function removeSecret(name?: string) {
    let secretName = name;

    // Prompt for name if not provided
    if (!secretName) {
        const answer = await inquirer.prompt([{
            type: 'input',
            name: 'name',
            message: 'Secret name to remove:',
            validate: (input) => input.length > 0 || 'Name is required'
        }]);
        secretName = answer.name;
    }

    // Confirm deletion before making any API calls
    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to delete "${secretName}" and all its versions?`,
            default: false
        }
    ]);

    if (!confirm) {
        console.log('Action cancelled.');
        return;
    }

    const spinner = ora(`Deleting "${secretName}"...`).start();

    try {
        const helper = getHelpr();
        if (!helper) {
            spinner.fail('Helper not initialized. Please restart the CLI.');
            return;
        }

        // Direct deletion - let server handle existence check
        const deleteResult = await helper.removeSecret?.(secretName!);
        if (!deleteResult) {
            spinner.fail('Helper method not available.');
            return;
        }

        if (deleteResult.success) {
            spinner.succeed(`Secret "${secretName}" deleted successfully.`);
        } else {
            spinner.fail(`Failed to delete secret: ${deleteResult.error || 'Unknown error'}`);
        }

    } catch (error: any) {
        spinner.fail(`Failed to delete secret: ${error.message || 'Unknown error'}`);
    }
}
