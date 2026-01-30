import inquirer from 'inquirer';
import { getConfig, getBaseUrl } from '../config';
import ora from 'ora';
import chalk from 'chalk';

export async function register() {
    const { email, password } = await inquirer.prompt([
        { type: 'input', name: 'email', message: 'Email:' },
        { type: 'password', name: 'password', message: 'Password:' }
    ]);

    const spinner = ora('Registering...').start();
    try {
        const baseUrl = getBaseUrl();
        await fetch(`${baseUrl}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        spinner.succeed('Registered successfully! You can now login.');
    } catch (error: any) {
        spinner.fail(`Registration failed: ${error.response?.data?.error || error.message}`);
    }
}

export async function login() {
    const { email, password } = await inquirer.prompt([
        { type: 'input', name: 'email', message: 'Email:' },
        { type: 'password', name: 'password', message: 'Password:' }
    ]);

    const spinner = ora('Logging in...').start();
    try {
        const baseUrl = getBaseUrl();
        const res = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        const config = getConfig();
        config.set('token', data.token);
        config.set('email', data.email);

        spinner.succeed(chalk.green('Logged in successfully!'));
    } catch (error: any) {
        spinner.fail(`Login failed: ${error.response?.data?.error || error.message}`);
    }
}
