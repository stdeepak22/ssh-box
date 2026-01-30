#!/usr/bin/env node
import { Command } from 'commander';
import { register, login } from './commands/auth';
import { addSecret } from './commands/add';
import { getSecret } from './commands/get';

const program = new Command();

program
    .name('ssh-box')
    .description('SSH Box - Secure SSH Key Management')
    .version('1.0.0');

program
    .command('register')
    .description('Register a new account')
    .action(register);

program
    .command('login')
    .description('Login to your account')
    .action(login);

program
    .command('add')
    .description('Add a new secret')
    .requiredOption('-f, --file <path>', 'Path to file to encrypt')
    .requiredOption('-n, --name <name>', 'Name of the secret')
    .action(addSecret);

program
    .command('get')
    .description('Retrieve a secret')
    .requiredOption('-n, --name <name>', 'Name of the secret')
    .option('-v, --ver <version>', 'Version to retrieve')
    .action(getSecret);

program.parse(process.argv);
