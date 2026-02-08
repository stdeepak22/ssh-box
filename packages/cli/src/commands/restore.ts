import inquirer from 'inquirer';
import ora from 'ora';
import { getHelpr } from '../utils/shared-instance';

export async function restoreSecret(nameWithVersion: string, options: { ver?: string }) {
    if (!nameWithVersion) {
        console.error('Error: Secret name is required.');
        return;
    }

    // Extract version from the name string if provided (e.g., "mysecret:-1" for previous version)
    // or use the option parameter
    const name = nameWithVersion.split(':').shift() || nameWithVersion;
    const versionFromName = nameWithVersion.includes(':') ? nameWithVersion.split(':').pop() : undefined;
    const targetVersion = versionFromName || options.ver;

    const versionText = targetVersion ? `version ${targetVersion}` : 'latest version';
    
    // 1. Confirm restoration before making any API calls
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

        // 2. Direct restoration - let server handle existence check and version resolution
        const restoreResult = await helper.restoreSecret?.(name, targetVersion);
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
