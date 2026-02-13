import { Command } from 'commander';
import chalk from 'chalk';
import { register, login, logout, whoami, unlockVault, lockVault, isVaultUnlocked } from './commands/auth';
import { addSecret } from './commands/add';
import { getSecret } from './commands/get';
import { listSecrets } from './commands/list';
import { removeSecret } from './commands/remove';
import { restoreSecret } from './commands/restore';
import { setMasterPassword } from './commands/master';
import { ping_pong } from './commands/ping';

const program = new Command();

program
    .name('ssh-box')
    .description(`${chalk.cyan('🔐 SSH Box')}\n${chalk.gray('Secure SSH Key & Secret Management CLI')}`)
    .version('1.0.0')
    .configureOutput({
        outputError: (str, write) => write(chalk.red(str))
    })
    .exitOverride();

// Vault Commands
program
    .command('ping')
    .description(`${chalk.gray('Check server connectivity and authentication status')}`)
    .action(ping_pong);

program
    .command('unlock')
    .description(`${chalk.gray('Unlock 🔓 the vault to access secrets')}`)
    .action(unlockVault);

program
    .command('lock')
    .alias('l')
    .description(`${chalk.gray('Lock 🔒 the vault immediately')}`)
    .action(lockVault);

program
    .command('vault')
    .description(`${chalk.gray('Check if vault is locked or unlocked')}`)
    .action(isVaultUnlocked);

// Auth Commands
program
    .command('register')
    .description(`${chalk.gray('Create a new SSH Box account')}`)
    .action(register);

program
    .command('login')
    .alias('signin')
    .description(`${chalk.gray('Sign in to your existing account')}`)
    .action(login);

program
    .command('logout')
    .alias('signout')
    .description(`${chalk.gray('Sign out from your current session')}`)
    .action(logout);

program
    .command('whoami')
    .alias('me')
    .alias('status')
    .description(`${chalk.gray('Show currently logged in user')}`)
    .action(whoami);

// Secret Commands
program
    .command('add')
    .alias('create')
    .description(`${chalk.gray('Add a new secret to your vault')}`)
    .argument('<name>', 'Name of the secret')
    .argument('[value]', 'Value of the secret (optional)')
    .option('-f, --file <path>', 'Read secret value from file')
    .addHelpText('after', `
${chalk.yellow('Examples:')}
  ${chalk.cyan('ssh-box > add')} ${chalk.gray('my-api-key "sk-123456"')}
  ${chalk.cyan('ssh-box > add')} ${chalk.gray('private-key -f ~/.ssh/id_rsa')}
  ${chalk.cyan('ssh-box > add')} ${chalk.gray('mysecret')} ${chalk.gray('(will prompt for value)')}
`)
    .action(addSecret);

program
    .command('get')
    .alias('show')
    .alias('view')
    .description(`${chalk.gray('Retrieve and decrypt a secret')}`)
    .argument('<name>', 'Name of the secret to retrieve')
    .option('-v, --ver <version>', 'Specific version to retrieve (e.g., -1, -2)')
    .addHelpText('after', `
${chalk.yellow('Examples:')}
  ${chalk.cyan('ssh-box > get')} ${chalk.gray('my-api-key')}
  ${chalk.cyan('ssh-box > get')} ${chalk.gray('my-api-key --ver -1')} ${chalk.gray('(get previous version)')}
`)
    .action(getSecret);

program
    .command('clear')
    .alias('cls')
    .description(`${chalk.gray('Clear the terminal screen')}`)
    .action(() => {
        console.clear();
    });

program
    .command('list')
    .alias('ls')
    .alias('show-all')
    .description(`${chalk.gray('List all secrets in your vault')}`)
    .addHelpText('after', `
${chalk.yellow('Output:')} Name, Version, Total Versions, Created, Modified
`)
    .action(listSecrets);

program
    .command('remove')
    .alias('rm')
    .alias('delete')
    .alias('del')
    .description(`${chalk.gray('Permanently delete a secret')}`)
    .argument('<name>', 'Name of the secret to delete')
    .addHelpText('after', `
${chalk.yellow('⚠️  Warning:')} This action cannot be undone!
`)
    .action(removeSecret);

program
    .command('restore')
    .alias('rollback')
    .description(`${chalk.gray('Restore a previous version as the latest')}`)
    .argument('<name>', 'Name of the secret to restore')
    .option('-v, --ver <ver>', 'Version number (-1 = previous, -2 = 2 versions ago, etc.)')
    .addHelpText('after', `
${chalk.yellow('Examples:')}
  ${chalk.cyan('ssh-box > restore')} ${chalk.gray('mysecret')} ${chalk.gray('(restore latest)')}
  ${chalk.cyan('ssh-box > restore')} ${chalk.gray('mysecret --ver -1')} ${chalk.gray('(restore previous)')}
  ${chalk.cyan('ssh-box > restore')} ${chalk.gray('mysecret --ver -2')} ${chalk.gray('(restore 2 versions ago)')}
`)
    .action(restoreSecret);

program
    .command('set-master')
    .alias('master-password')
    .alias('mp')
    .description(`${chalk.gray('Set or update your master password')}`)
    .addHelpText('after', `
${chalk.yellow('Note:')} Master password encrypts all your secrets. Don't forget it!
`)
    .action(setMasterPassword);

// Custom help
program.on('--help', () => {
    console.log('');
    console.log(chalk.cyan('🔐 SSH Box - Secure Secret Management'));
    console.log(chalk.gray('Run without arguments for interactive menu mode'));
    console.log('');
});

export { program };