import ora from 'ora';
import { helper } from '../utils/shared-instance';

export async function ping_pong() {
    const spinner = ora('Pinging server...').start();
    try {
        const res = await helper.ping();
        if(!res?.success)
        {
            spinner.fail(res?.error);
            return;
        }
        spinner.succeed(res.data);
    } catch (error: any) {
        spinner.fail(`Failed: ${error.response?.data?.error || error.message}`);
    }
}
