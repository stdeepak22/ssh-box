import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import { ConfigSchemaProps } from '../config';
import { authStorage, helper } from '../utils/shared-instance';

export async function setMasterPassword() {

    let currentPassword = undefined;
    let changePassword = authStorage.getHasMp();
    if (changePassword) {
        console.log(chalk.cyan('Master password is configured, please provide it to proceed further.'));
        ({ currentPassword } = await inquirer.prompt([
            { type: 'password', name: 'currentPassword', message: 'Enter current Master Password:', mask: '*' },
        ]))
    }

    const { password, confirmPassword } = await inquirer.prompt([
        { type: 'password', name: 'password', message: 'Enter new Master Password:', mask: '*' },
        { type: 'password', name: 'confirmPassword', message: 'Confirm Master Password:', mask: '*' }
    ]);

    if (password !== confirmPassword) {
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
        const res = changePassword
            ? await helper.changePassword(currentPassword, password)
            : await helper.setPassword(password);

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
