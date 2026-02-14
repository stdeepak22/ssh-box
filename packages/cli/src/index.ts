#!/usr/bin/env node
import ora from 'ora';
import { program } from './cmd-binding';
import { search, input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import boxen from 'boxen';
import { AuthConfigStorage } from './config';
import { parseArgsStringToArgv } from 'string-argv';
import { setAuthStorageService, setHelpr } from './utils/shared-instance';
import { Helper } from '@ssh-box/common_helper';
import dotenv from 'dotenv';

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

const help_exit = [
  { name: chalk.gray('help'), value: 'help' },
  { name: chalk.gray('exit'), value: 'exit' }
]

// Flat list of all commands for autocomplete
const allCommands = Object.values(commandCategories).flat().map(cmd => ({
  name: `${chalk.cyan(cmd.name.padEnd(12))} ${chalk.gray(cmd.desc)}`,
  value: cmd.cmd,
  value_lower: cmd.cmd.toLowerCase().trim(),
}));

// help and exit
help_exit.forEach(c=>{
  allCommands.push({
    ...c,
    value_lower: c.value.toLowerCase().trim() })  
})

// Search function for commands
function searchCommands(input: string) {
  // If empty input, show menu option
  if (!input || input.trim() === '') {
    return [
      { name: chalk.yellow('Menu'), value: '__MENU__' },
      ...help_exit
    ];
  }
  
  const searchTerm = input.toLowerCase().trim();
  const matches: any[] = [];
  
  const remainingToSearch: any[] = [];
  allCommands.forEach(cmd => {
      const isMatch = cmd.value_lower.startsWith(searchTerm)
      if(isMatch){
        matches.push(cmd);
      } else {
        remainingToSearch.push(cmd)
      }
});

  remainingToSearch.forEach(cmd => {
      if(cmd.value_lower.includes(searchTerm)) {
        matches.push(cmd);
      }
    }
  );
  
  // Add user's input as first option so they can submit what they typed
  const userInputOption = { name: chalk.cyan(`> ${input}`), value: input };

  // Also add help and exit options
  return [
    // userInputOption,
    ...matches,
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
  const selectedCategory = await select({
    message: chalk.cyan('Select category:'),
    choices: [
      ...Object.keys(commandCategories).map(cat => ({
        name: cat,
        value: cat
      })),
      { name: chalk.gray('⏴ Back'), value: 'back' },
      { name: chalk.gray('help'), value: 'help' },
      { name: chalk.gray('exit'), value: 'exit' }
    ]
  });

  if (selectedCategory === 'help' || selectedCategory === 'exit' || selectedCategory === 'back') {
    return selectedCategory;
  }

  // Then, show commands in that category
  const commands = commandCategories[selectedCategory as keyof typeof commandCategories];
  const selectedCommand = await select({
    message: chalk.cyan(`${selectedCategory} - Select command:`),
    choices: [
      ...commands.map(cmd => ({
        name: `${chalk.cyan(cmd.name.padEnd(12))} ${chalk.gray(cmd.desc)}`,
        value: cmd.cmd
      })),
      { name: chalk.gray('⏴ Back'), value: 'back' }
    ]
  });

  if (selectedCommand === 'back') {
    return showInteractiveMenu();
  }

  return selectedCommand;
}

async function getCommandWithArgs(command: string): Promise<string | null> {
  switch (command) {
    case 'add':
      const addName = await input({ message: 'Secret name:' });
      const addValue = await input({ message: 'Secret value (or press Enter to input):' });
      if (!addValue) {
        // Use password input for secret value
        return `add ${addName}`;
      }
      return `add ${addName} "${addValue}"`;

    case 'get':
      const getName = await input({ message: 'Secret name to retrieve:' });
      return `get ${getName}`;

    case 'remove':
      const removeName = await input({ message: 'Secret name to remove:' });
      return `remove ${removeName}`;

    case 'restore':
      const restoreName = await input({ message: 'Secret name to restore:' });
      const version = await input({ message: 'Version (e.g., -1 for previous):', default: '-1' });
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
      // Use search prompt with autocomplete
      const userInput: string = await search({
        message: chalk.cyan('ssh-box'),
        source: (term) => {
          return Promise.resolve(searchCommands(term || ''));
        }
      });

      console.log("Deepak::", userInput);

      let input = userInput.trim();

      // If user pressed Enter without typing or selected menu, show category menu
      if (!input || input === '__MENU__') {
        let selectedCmd = await showInteractiveMenu();
        
        // while (selectedCmd === 'back') {
        //   selectedCmd = await showInteractiveMenu();
        // }
        
        if (selectedCmd === 'exit') break;
        if (selectedCmd === 'help') {
          showHelp();
          continue;
        }
        if (selectedCmd === 'back') {
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
