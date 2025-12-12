import fs from 'node:fs';
import path from 'node:path';

export const contextPath = (expr: string): string => {
    // Пока: просто поддержим ?: и !: одинаково
    expr = expr.replace(/(\$[a-zA-Z_]\w*(?:\.\w+)*)\s*[\?:!]\s*:/g, '$1 ? $1 : ');
    return expr.replace(/\$([a-zA-Z_]\w*(?:\.\w+)*)/g, 'context.$1');
};

export const parseValue = (value: string): string => {
    value = value.trim();

    if (value === 'true') return 'true';
    if (value === 'false') return 'false';
    if (value === 'null') return 'null';
    if (value === 'undefined') return 'undefined';

    // Число
    if (!isNaN(Number(value)) && !value.includes(' ')) {
        return value;
    }

    // Массив или объект
    if (
        (value.startsWith('[') && value.endsWith(']')) ||
        (value.startsWith('{') && value.endsWith('}'))
    ) {
        // Заменяем все $var → context.var
        return value.replace(/\$(\w+)/g, 'context.$1');
    }

    // Выражение: $count + 1, $a * $b, 5 - $x и т.д.
    if (value.includes('$')) {
        return value.replace(/\$(\w+)/g, 'context.$1');
    }

    // Строка (все остальные случаи)
    return JSON.stringify(value);
};

export function transformExpression(exp: string): string {
    // Если начинается с $ → убираем и добавляем context.
    if (exp.startsWith('$')) {
        return `context.${exp.slice(1)}`;
    }
    // Если это просто имя переменной — тоже context.var
    return `context.${exp}`;
}

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

export function warnFilter<T extends (...args: any[]) => any>(
    name: string,
    expected: 'array' | 'string' | 'object' | 'number',
    fn: T
): T {
    return ((input: any, ...args: any[]) => {
        const type = typeof input;
        const isArray = Array.isArray(input);
        const isString = type === 'string';
        const isObject = input && typeof input === 'object' && !isArray;

        let matches = false;
        if (expected === 'array') matches = isArray;
        if (expected === 'string') matches = isString;
        if (expected === 'object') matches = isObject;
        if (expected === 'number') matches = !isNaN(Number(input));

        if (!matches && input !== undefined && input !== null) {
            const typeName = isArray ? 'array' : isString ? 'string' : isObject ? 'object' : type;
            console.warn(`[Fenom] filter '${name}' expects ${expected}, got ${typeName}`);
        }

        return fn(input, ...args);
    }) as T;
}