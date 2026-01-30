import type { TemplateLoader } from '../types/common';
import { join } from 'path';
import { readFile } from 'fs/promises';

export function createAsyncLoader(root: string): TemplateLoader {
    return async function loader(file: string) {
        const fullPath = join(root, file);
        if (!fullPath.endsWith('.tpl')) {
            throw new Error(`Template path must end with .tpl: ${file}`);
        }
        try {
            const content = await readFile(fullPath, 'utf-8');
            return content;
        } catch (err: any) {
            if (err.code === 'ENOENT') {
                throw new Error(`Template not found: ${fullPath}`);
            }
            throw err;
        }
    };
}
