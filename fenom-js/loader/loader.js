import { join } from 'path';
import { readFileSync } from 'fs';
export function createLoader(root) {
    return function loader(file) {
        const fullPath = join(root, file);
        if (!fullPath.endsWith('.tpl')) {
            throw new Error(`Template path must end with .tpl: ${file}`);
        }
        if (!readFileSync(fullPath, 'utf-8')) {
            throw new Error(`Template not found: ${fullPath}`);
        }
        return readFileSync(fullPath, 'utf-8');
    };
}
