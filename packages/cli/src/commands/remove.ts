import inquirer from 'inquirer';
import ora from 'ora';
import { getHelpr } from '../utils/shared-instance';

export async function removeSecret(name: string) {
    if (!name) {
        console.error('Error: Secret name is required.');
        return;
    }

    // 1. Confirm deletion before making any API calls
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

    const spinner = ora(`Deleting "${name}"...`).start();
    
    try {
        const helper = getHelpr();
        if (!helper) {
            spinner.fail('Helper not initialized. Please restart the CLI.');
            return;
        }

        // 2. Direct deletion - let server handle existence check
        const deleteResult = await helper.removeSecret?.(name);
        if (!deleteResult) {
            spinner.fail('Helper method not available.');
            return;
        }

        if (deleteResult.success) {
            spinner.succeed(`Secret "${name}" deleted successfully.`);
        } else {
            spinner.fail(`Failed to delete secret: ${deleteResult.error || 'Unknown error'}`);
        }

    } catch (error: any) {
        spinner.fail(`Failed to delete secret: ${error.message || 'Unknown error'}`);
    }
}
