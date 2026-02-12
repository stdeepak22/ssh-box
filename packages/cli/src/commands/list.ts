import ora from 'ora';
import { getRelativeTime, helper } from '../utils/shared-instance';
import { SecretDetail } from '@ssh-box/common_helper';
import Table from 'cli-table';


var table = new Table({
    head: ['Name', 'Version', 'Total Versions', 'Created', 'Updated']
});

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

        const rows = secrets.map((s: SecretDetail) => [
            s.name,
            s.version,
            (s.totalVersions || 1).toString(),
            s.createdAt ? getRelativeTime(new Date(s.createdAt).getTime()) || '': '-',
            s.updatedAt ?  getRelativeTime(new Date(s.updatedAt).getTime()) || '' : '-',
        ]);

        table.length = 0;
        table.push(...rows);
        
        console.log(table.toString());

    } catch (error: any) {
        if (spinner.isSpinning){
            spinner.stop();
        }
        spinner.fail(error.message);
    }
}
