import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import { helper, authStorage } from '../utils/shared-instance';

export async function register() {
    const { email, password } = await inquirer.prompt([
        { type: 'input', name: 'email', message: '\tEmail:' },
        { type: 'password', name: 'password', message: '\tPassword:' }
    ]);

    const spinner = ora('Registering...').start();
    try {
        const res = await helper.registerNewAccount(email, password);
        if(!res?.success)
        {
            spinner.fail(res?.error);
            return;
        }
        spinner.succeed('Registration successful, please proceed to login.')
    } catch (error: any) {
        spinner.fail(`Registration failed: ${error.response?.data?.error || error.message}`);
    }
}

export async function login() {
    const isLoggedIn = authStorage.isLoggedIn();
    if (isLoggedIn) {
        const email = authStorage.getEmail()
        console.log(chalk.green(`Already logged in! (Email: ${email})`));
        return;
    }

    const { email, password } = await inquirer.prompt([
        { type: 'input', name: 'email', message: 'Email:' },
        { type: 'password', name: 'password', message: 'Password:' }
    ]);

    const spinner = ora('Logging in...').start();
    try {
        const res = await helper.login(email, password);
        if(res?.success){
            authStorage.setConfigProps(res.data!);
            spinner.succeed(chalk.green('Logged in successfully!'));
            return;
        }
        spinner.fail(res?.error);
    } catch (error: any) {
        spinner.fail(error||`Login failed: check your credentials.`);
    }
}

export async function logout() {
    authStorage.clearConfig();
    console.log(chalk.green('Logged out successfully!'));
}

export async function whoami() {
    const isLoggedIn = authStorage.isLoggedIn();
    if (!isLoggedIn) {
        console.log(chalk.red('Not logged in'));
        return;
    }
    const {email, has_mp } = authStorage.getFullConfig();
    let about = `Master password: `;
    if (has_mp) {
        about += `✅`;
        about = chalk.green(about);
    } else {
        about += `❌ (run 'set-master' to set)`;
        about = chalk.red(about);
    }
    console.log(
        chalk.green(`Logged in as ${email}.`),
        about
    );
}

export async function unlockVault() {
    if (!authStorage.getHasMp()) {
        ora('Master Password not set. Please set it using "set-master" command.').fail();
        return;
    }
    const { password } = await inquirer.prompt([
        { type: 'password', name: 'password', message: 'Enter Master Password to unlock:', mask: '*' }
    ]);
    const hasUnlocked = await helper.unlockVault(password);
    if (hasUnlocked) {
        ora('Master Password verified.').succeed();
        return;
    }
    ora('Invalid master password.').fail();
}
