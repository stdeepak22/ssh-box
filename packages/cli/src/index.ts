#!/usr/bin/env node
import ora from 'ora';
import { program } from './cmd-binding';
import inquirer from 'inquirer';
import chalk from 'chalk';
import boxen from 'boxen';
import { AuthConfigStorage } from './config';
import { parseArgsStringToArgv } from 'string-argv';
import { setAuthStorageService, setHelpr } from './utils/shared-instance';
import { Helper } from '@ssh-box/common_helper';
import dotenv from 'dotenv';

// Register autocomplete prompt
const autocomplete = require('inquirer-autocomplete-prompt');
inquirer.registerPrompt('autocomplete', autocomplete);

dotenv.config({ quiet: true });

const s = ora();

// ASCII Art Logo
const logo = `
╔═══════════════════════════════════════╗
║     🔐 SSH BOX - Secret Manager       ║
║     Secure. Simple. Command-line.     ║
╚═══════════════════════════════════════╝
`;

// Command categories for the menu
const commandCategories = {
  '🔐 Vault': [
    { name: 'unlock', desc: 'Unlock your vault', cmd: 'unlock' },
    { name: 'lock', desc: 'Lock your vault', cmd: 'lock' },
    { name: 'status', desc: 'Check vault status', cmd: 'vault' },
  ],
  '👤 Authentication': [
    { name: 'login', desc: 'Sign in to your account', cmd: 'login' },
    { name: 'register', desc: 'Create new account', cmd: 'register' },
    { name: 'logout', desc: 'Sign out', cmd: 'logout' },
    { name: 'whoami', desc: 'Show current user', cmd: 'whoami' },
  ],
  '📁 Secrets': [
    { name: 'list', desc: 'List all secrets', cmd: 'list' },
    { name: 'add', desc: 'Add a new secret', cmd: 'add' },
    { name: 'get', desc: 'Get a secret', cmd: 'get' },
    { name: 'remove', desc: 'Remove a secret', cmd: 'remove' },
    { name: 'restore', desc: 'Restore secret version', cmd: 'restore' },
  ],
  '⚙️  Settings': [
    { name: 'set-master', desc: 'Set master password', cmd: 'set-master' },
    { name: 'ping', desc: 'Check server status', cmd: 'ping' },
    { name: 'clear', desc: 'Clear screen', cmd: 'clear' },
  ],
};

// Flat list of all commands for autocomplete
const allCommands = Object.values(commandCategories).flat().map(cmd => ({
  name: `${chalk.cyan(cmd.name.padEnd(12))} ${chalk.gray(cmd.desc)}`,
  value: cmd.cmd,
  short: cmd.name
}));

// Autocomplete search function
function searchCommands(input: string) {
  // Return empty array when no input (don't show full list initially)
  if (!input || input.trim() === '') {
    return [];
  }
  
  const searchTerm = input.toLowerCase().trim();
  const matches = allCommands.filter(cmd => 
    cmd.value.toLowerCase().includes(searchTerm) ||
    cmd.short.toLowerCase().includes(searchTerm)
  );
  
  // Also add help and exit options
  return [
    ...matches,
    { name: chalk.gray('help'), value: 'help', short: 'help' },
    { name: chalk.gray('exit'), value: 'exit', short: 'exit' }
  ];
}

function showHelp() {
  console.log(boxen(logo, { padding: 1, borderStyle: 'round', borderColor: 'cyan' }));
  
  console.log(chalk.bold('\n📖 Quick Start:\n'));
  console.log(chalk.gray('  Interactive mode:') + '  Just press ' + chalk.cyan('Enter') + ' without typing');
  console.log(chalk.gray('  Direct commands:') + '   Type ' + chalk.cyan('add mysecret myvalue') + ' or ' + chalk.cyan('list'));
  console.log(chalk.gray('  Help:') + '             Type ' + chalk.cyan('help') + ' or ' + chalk.cyan('--help'));
  console.log(chalk.gray('  Exit:') + '             Type ' + chalk.cyan('exit') + ' or ' + chalk.cyan('quit\n'));

  console.log(chalk.bold('🎯 Available Commands:\n'));
  
  Object.entries(commandCategories).forEach(([category, commands]) => {
    console.log(chalk.yellow(`  ${category}`));
    commands.forEach(cmd => {
      const paddedName = cmd.name.padEnd(12);
      console.log(`    ${chalk.cyan(paddedName)} ${chalk.gray(cmd.desc)}`);
    });
    console.log();
  });

  console.log(chalk.gray('💡 Tip: Type any command name to see usage examples\n'));
}

async function showInteractiveMenu() {
  // First, let user pick a category
  const { selectedCategory } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedCategory',
      message: chalk.cyan('Select category:'),
      choices: [
        ...Object.keys(commandCategories).map(cat => ({
          name: cat,
          value: cat
        })),
        new inquirer.Separator(),
        { name: chalk.gray('help'), value: 'help', short: 'help' },
        { name: chalk.gray('exit'), value: 'exit', short: 'exit' }
      ]
    }
  ]);

  if (selectedCategory === 'help' || selectedCategory === 'exit') {
    return selectedCategory;
  }

  // Then, show commands in that category
  const commands = commandCategories[selectedCategory as keyof typeof commandCategories];
  const { selectedCommand } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedCommand',
      message: chalk.cyan(`${selectedCategory} - Select command:`),
      choices: [
        ...commands.map(cmd => ({
          name: `${chalk.cyan(cmd.name.padEnd(12))} ${chalk.gray(cmd.desc)}`,
          value: cmd.cmd,
          short: cmd.name
        })),
        new inquirer.Separator(),
        { name: chalk.gray('⬅  Back'), value: 'back', short: 'back' }
      ]
    }
  ]);

  if (selectedCommand === 'back') {
    return showInteractiveMenu(); // Go back to category selection
  }

  return selectedCommand;
}

async function getCommandWithArgs(command: string): Promise<string | null> {
  switch (command) {
    case 'add':
      const { name: addName, value: addValue } = await inquirer.prompt([
        { type: 'input', name: 'name', message: 'Secret name:', validate: (v) => v.length > 0 || 'Name is required' },
        { type: 'input', name: 'value', message: 'Secret value (or press Enter to input):' }
      ]);
      if (!addValue) {
        const { secretValue } = await inquirer.prompt([
          { type: 'password', name: 'secretValue', message: 'Enter secret value:', mask: '•' }
        ]);
        return `add ${addName} "${secretValue}"`;
      }
      return `add ${addName} "${addValue}"`;

    case 'get':
      const { name: getName } = await inquirer.prompt([
        { type: 'input', name: 'name', message: 'Secret name to retrieve:', validate: (v) => v.length > 0 || 'Name is required' }
      ]);
      return `get ${getName}`;

    case 'remove':
      const { name: removeName } = await inquirer.prompt([
        { type: 'input', name: 'name', message: 'Secret name to remove:', validate: (v) => v.length > 0 || 'Name is required' }
      ]);
      return `remove ${removeName}`;

    case 'restore':
      const { name: restoreName, version } = await inquirer.prompt([
        { type: 'input', name: 'name', message: 'Secret name to restore:', validate: (v) => v.length > 0 || 'Name is required' },
        { type: 'input', name: 'version', message: 'Version (e.g., -1 for previous):', default: '-1' }
      ]);
      return `restore ${restoreName} --ver ${version}`;

    default:
      return command;
  }
}

async function startShell() {
  const auth = new AuthConfigStorage('http://localhost:3000');
  setAuthStorageService(auth);
  setHelpr(Helper.getInstance(auth));

  console.log(boxen(logo, { padding: 1, borderStyle: 'round', borderColor: 'cyan' }));
  
  s.start(chalk.gray('Initializing SSH Box...'));
  await new Promise((resolve) => setTimeout(resolve, 500));
  s.succeed(chalk.green('Ready!'));

  console.log(chalk.gray('\n💡 Tip: Type ') + chalk.cyan('help') + chalk.gray(' for commands or press ') + chalk.cyan('Enter') + chalk.gray(' for menu\n'));

  while (true) {
    try {
      // First prompt with autocomplete
      const { user_input } = await inquirer.prompt([
        {
          type: 'autocomplete',
          name: 'user_input',
          message: chalk.cyan('ssh-box'),
          searchText: 'Searching',
          prefix: '',
          source: (_answers: any, input: string | undefined) => {
            return Promise.resolve(searchCommands(input || ''));
          },
          pageSize: 10,
          emptyText: ' ',
          suggestOnly: true
        }
      ]);

      let input = user_input.trim();

      // If user pressed Enter without typing (empty input), show category menu
      if (!input) {
        // Empty input - show interactive menu
        let selectedCmd = await showInteractiveMenu();
        
        while (selectedCmd === 'back') {
          selectedCmd = await showInteractiveMenu();
        }
        
        if (selectedCmd === 'exit') break;
        if (selectedCmd === 'help') {
          showHelp();
          continue;
        }
        
        const cmdWithArgs = await getCommandWithArgs(selectedCmd);
        if (cmdWithArgs) {
          const args = parseArgsStringToArgv(cmdWithArgs);
          await program.parseAsync(args, { from: 'user' });
        }
        continue;
      }

      if (input === 'exit' || input === 'quit') {
        console.log(chalk.green('\n👋 Goodbye!\n'));
        break;
      }

      if (input === 'help' || input === '--help' || input === '-h') {
        showHelp();
        continue;
      }

      const args = parseArgsStringToArgv(input);
      await program.parseAsync(args, { from: 'user' });
      
    } catch (e) {
      // Silent error handling - commander shows errors
    }
  }
  
  process.exit(0);
}

startShell();