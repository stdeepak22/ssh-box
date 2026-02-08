import fs from 'fs';
import path from 'path';
import ora from 'ora';
import { helper } from '../utils/shared-instance';



export async function addSecret(name: string, value: string | undefined, options: { file?: string }) {
    
    let content = value;

    if (!content && options.file) {
        const filePath = path.resolve(options.file);
        if (!fs.existsSync(filePath)) {
            console.error(`File not found: ${filePath}`);
            return;
        }
        content = fs.readFileSync(filePath, 'utf8');
    }

    if (!content) {
        console.error('Error: You must provide either a secret value as an argument or a file path via -f');
        return;
    }

    const spinner = ora('Encrypting...').start();

    try {
        spinner.text = 'Uploading...';        
        const res = await helper.saveSecret(name, content);
        if(res?.success){
            spinner.succeed('Secret added successfully!');
        } else {
            spinner.fail(res?.error || 'Failed to add secret.');
        }
    } catch (error: any) {
        spinner.fail(`Failed to add secret: ${error.message}`);
    }
}
