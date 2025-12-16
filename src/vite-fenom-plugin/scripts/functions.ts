import fs from 'node:fs';
import path from 'node:path';

/**
 * Рекурсивно читает все .json файлы в папке и строит вложенный объект
 * по структуре папок и имён файлов.
 *
 * Пример:
 *   /data/user.json              → { user: { ... } }
 *   /data/api/profile.json       → { api: { profile: { ... } } }
 *   /data/api/stats/count.json   → { api: { stats: { count: { ... } } } }
 */
export function collectJsonDataMerged(dir: string): Record<string, any> {
    const result: Record<string, any> = {};

    if (!fs.existsSync(dir)) {
        console.warn(`[collectJsonDataMerged] Папка не найдена: ${dir}`);
        return result;
    }

    function walk(currentPath: string) {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);

            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (entry.isFile() && /\.json$/i.test(entry.name)) {
                try {
                    const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));

                    // Объединяем напрямую все ключи
                    Object.assign(result, content);
                } catch (err) {
                    console.error(`[collectJsonDataMerged] Ошибка парсинга JSON: ${fullPath}`, err);
                }
            }
        }
    }

    walk(dir);
    return result;
}