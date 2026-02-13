import inquirer from 'inquirer';
import ora from 'ora';
import { getHelpr } from '../utils/shared-instance';

export async function restoreSecret(nameWithVersion?: string) {
    let name = nameWithVersion;
    let targetVersion: string | undefined;

    // Extract version from the name string if provided (e.g., "mysecret:-1" for previous version)
    if (name && name.includes(':')) {
        const parts = name.split(':');
        name = parts[0];
        targetVersion = parts[1];
    }

    // Prompt for name if not provided
    if (!name) {
        const answer = await inquirer.prompt([{
            type: 'input',
            name: 'name',
            message: 'Secret name to restore:',
            validate: (input) => input.length > 0 || 'Name is required'
        }]);
        name = answer.name;
    }

    // Prompt for version if not provided
    if (!targetVersion) {
        const answer = await inquirer.prompt([{
            type: 'input',
            name: 'version',
            message: 'Version to restore (e.g., -1 for previous, -2 for 2 versions ago):',
            default: '-1',
            validate: (input) => input.length > 0 || 'Version is required'
        }]);
        targetVersion = answer.version;
    }

    const versionText = `version ${targetVersion}`;

    // Confirm restoration before making any API calls
    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to restore ${versionText} of "${name}" as the latest?`,
            default: false
        }
    ]);

    if (!confirm) {
        console.log('Action cancelled.');
        return;
    }

    const spinner = ora(`Restoring ${versionText} of "${name}"...`).start();

    try {
        const helper = getHelpr();
        if (!helper) {
            spinner.fail('Helper not initialized. Please restart the CLI.');
            return;
        }

        // Direct restoration - let server handle existence check and version resolution
        const restoreResult = await helper.restoreSecret?.(name!, targetVersion);
        if (!restoreResult) {
            spinner.fail('Helper method not available.');
            return;
        }

        if (restoreResult.success) {
            spinner.succeed(`Successfully restored ${versionText} of "${name}" as the latest version.`);
        } else {
            spinner.fail(`Failed to restore secret: ${restoreResult.error || 'Unknown error'}`);
        }

    } catch (error: any) {
        spinner.fail(`Failed to restore secret: ${error.message || 'Unknown error'}`);
    }
}
