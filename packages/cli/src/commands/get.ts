import ora from 'ora';
import { parseNameAndVersion} from '../utils/version';
import { helper } from '../utils/shared-instance';

export async function getSecret(nameWithVersion: string, options: { ver?: string }) {
    const { name, versionStr } = parseNameAndVersion(nameWithVersion);
    const targetVersionStr = versionStr || options.ver;

    const spinner = ora('Fetching...').start();
    try {

        const res = await helper.getSpecificSecret(name, targetVersionStr);

        if (!res?.success) {
            spinner.fail('Secret not found');
            return;
        }

        spinner.stop();
        console.log('\n--- Decrypted Secret ---');
        console.log(res.data.plainText);
        console.log('------------------------\n');
    } catch (error: any) {
        spinner.fail(error.message || `Couldn't get specified secret, try again later.`);
    }
}
