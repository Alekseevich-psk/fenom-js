import type { TemplateLoader } from './../types/common';

import { join } from 'path';
import { readFile } from 'fs/promises';

export function createAsyncLoader(root: string): TemplateLoader {
    return async function loader(file: string): Promise<string> {
        const fullPath = join(root, file);
        console.log('🔍 Пытаемся загрузить:', fullPath); // ←
        try {
            const content = await readFile(fullPath, 'utf-8');
            console.log('✅ Успешно загружено:', file); // ←
            return content;
        } catch (err: any) {
            console.log('❌ Ошибка загрузки:', file, err.message); // ←
            if (err.code === 'ENOENT') {
                throw new Error(`Template not found: ${fullPath}`);
            }
            throw err;
        }
    };
}