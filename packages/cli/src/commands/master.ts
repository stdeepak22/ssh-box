import { password, confirm } from '@inquirer/prompts';
import ora from 'ora';
import chalk from 'chalk';
import { ConfigSchemaProps } from '../config';
import { authStorage, helper } from '../utils/shared-instance';

export async function setMasterPassword() {

    let currentPassword: string | undefined = undefined;
    let changePassword = authStorage.getHasMp();
    if (changePassword) {
        console.log(chalk.cyan('Master password is configured, please provide it to proceed further.'));
        currentPassword = await password({ 
            message: 'Enter current Master Password:', 
            mask: '*',
            validate: (input) => input.length > 0 || 'Current password is required'
        });
    }

    const newPassword = await password({ 
        message: 'Enter new Master Password:', 
        mask: '*',
        validate: (input) => input.length > 0 || 'New password is required'
    });
    
    const confirmPassword = await password({ 
        message: 'Confirm Master Password:', 
        mask: '*',
        validate: (input) => input.length > 0 || 'Password confirmation is required'
    });

    if (newPassword !== confirmPassword) {
        console.error(chalk.red('Passwords do not match.'));
        return;
    }

    const spinner = ora(
        changePassword
        ? 'Changing the master password...'
        : 'Setting master password...'
    ).start();
    try {
        
        // Zero-Knowledge: Encrypt a static string locally
        const res = changePassword && currentPassword
            ? await helper.changePassword(currentPassword, newPassword)
            : await helper.setPassword(newPassword);

        if(!res?.success){
            spinner.fail(res?.error || 'Failed to set master password');
            return;
        }

        authStorage.setConfigProps({
            [ConfigSchemaProps.has_mp]: true
        })

        spinner.succeed(chalk.green('Master password has been set successfully! (Zero-Knowledge)'));
    } catch (error: any) {
        spinner.fail(chalk.red(`Failed to set master password: ${error.message}`));
    }
}