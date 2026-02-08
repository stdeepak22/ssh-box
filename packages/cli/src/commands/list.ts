import ora from 'ora';
import { helper } from '../utils/shared-instance';
import { SecretDetail } from '@ssh-box/common_helper';

export async function listSecrets() {

    const spinner = ora('Fetching secrets...').start();
    try {
        const res = await helper.getSecretList();

        if(!res?.success){
            spinner.fail(res?.error);
            return;
        }

        let msg = "No secrets found."
        const secrets = res.data!;
        const secCount = secrets.length;
        if (secCount > 0) {
            msg = `${secCount} ${secCount > 1?'secrets' : 'secret'} found.`
        }
        spinner.succeed(msg);

        console.log('\n--- Your Secrets (SSH Box) ---');
        console.table(secrets.map((s: SecretDetail) => ({
            Name: s.name,
            Version: s.version,
            History: s.history,
            'Created': s.createdAt ? new Date(s.createdAt).toLocaleString() : '-',
            'Modified': s.updatedAt ?  new Date(s.updatedAt).toLocaleString() : '-',
        })));
        console.log('------------------------------\n');

    } catch (error: any) {
        if (spinner.isSpinning){
            spinner.stop();
        }
        console.error(`Failed to list secrets: ${error.message}`);
    }
}
