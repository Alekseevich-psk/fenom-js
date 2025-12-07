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

    if (!isNaN(Number(value)) && !value.includes(' ')) {
        return value;
    }

    // Массив или объект
    if (
        (value.startsWith('[') && value.endsWith(']')) ||
        (value.startsWith('{') && value.endsWith('}'))
    ) {
        return value;
    }

    // Переменная: $var → context.var
    if (value.startsWith('$')) {
        return transformExpression(value); // → context.var
    }

    // Строка
    return JSON.stringify(value);
};

export const transformExpression = (expr: string): string => {
    expr = expr.replace(/(\$[a-zA-Z_]\w*(?:\.\w+)*)\s*[\?:!]\s*:/g, '$1 ? $1 : ');
    return expr.replace(/\$([a-zA-Z_]\w*(?:\.\w+)*)/g, 'context.$1');
};

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