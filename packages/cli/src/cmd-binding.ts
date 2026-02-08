import { Command } from 'commander';
import { register, login, logout, whoami, unlockVault } from './commands/auth';
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
    .description('SSH Box - Secure SSH Key Management')
    .version('1.0.0')
    .exitOverride();

program
    .command('ping')
    .description('to check if connection with server is available, and its authenticated or not.')
    .action(ping_pong);

    program
    .command('unlock-vault')
    .description('unlock the vault.')
    .action(unlockVault);

program
    .command('register')
    .description('Register a new account')
    .action(register);

program
    .command('login')
    .description('Login to your account')
    .action(login);

program
    .command('logout')
    .description('Logout from your account')
    .action(logout);

program
    .command('whoami')
    .alias('me')
    .alias('status')
    .description('Show current logged in user')
    .action(whoami);

program
    .command('add')
    .description('Add a new secret')
    .argument('<name>', 'Name of the secret')
    .argument('[value]', 'Value of the secret')
    .option('-f, --file <path>', 'Path to file to encrypt')
    .action(addSecret);

program
    .command('get <name>')
    .description('Retrieve a secret')
    .option('-v, --ver <version>', 'Version to retrieve')
    .action(getSecret);

program
    .command('clear')
    .description('Clear console')
    .action(() => {
        console.clear();
    });

program
    .command('list')
    .alias('ls')
    .description('List all secrets')
    .action(listSecrets);

program
    .command('remove <name>')
    .alias('rm')
    .description('Delete a secret')
    .action(removeSecret);

program
    .command('restore <name>')
    // .alias('rollback')
    .description('Restore a specific version of a secret as latest\nver is -1 to -n\n-1: previous version\n-2: prev-prev version\n...')
    .option('-v, --ver <ver>', 'Version of the secret (-1 to -n)')
    .action(restoreSecret);

program
    .command('set-master')
    .description('Set or update your account-wide Master Password')
    .action(setMasterPassword);


export { program }
