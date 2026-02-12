#!/usr/bin/env node
import ora from 'ora';
import { program } from './cmd-binding';
import inquirer from 'inquirer';
import { AuthConfigStorage } from './config';
import { parseArgsStringToArgv } from 'string-argv';
import { setAuthStorageService, setHelpr } from './utils/shared-instance';
import { Helper } from '@ssh-box/common_helper';
import dotenv from 'dotenv'
const s = ora();
dotenv.config({quiet:true});

async function startShell() {
    const auth = new AuthConfigStorage('http://localhost:3000');
    setAuthStorageService(auth);
    setHelpr(Helper.getInstance(auth));

    s.start('Loading ssh-box...');
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000));
    s.stop();


    while (true) {
        try {
            const { user_input } = await inquirer.prompt([
                { type: 'input', name: 'user_input', message: 'ssh-box > ' }
            ]);
            const input = user_input.trim();
            if (!input) {
                continue;
            }
            if (input === 'exit' || input === 'quit') {
                break;
            }
            const args = parseArgsStringToArgv(input)
            await program.parseAsync(args, { from: 'user' });
        } catch (e) {
            // ignore
        }
    }
    process.exit(0);
}

startShell();