export function contextPath(path: string): string {
    if (path.startsWith('$')) {
        return `context.${path.slice(1)}`;
    }
    return isNaN(+path) ? `'${path}'` : path;
}

export function parseValue(value: string): any {
    // Убираем пробелы
    value = value.trim();

    // Булевы
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (value === 'undefined') return undefined;

    // Число
    if (!isNaN(+value) && !value.includes(' ')) {
        return +value;
    }

    // Строка в кавычках
    if (/^["'](.*)["']$/.test(value)) {
        return value.slice(1, -1);
    }

    // Массив: ['a', 'b'] → только простые
    if (value.startsWith('[') && value.endsWith(']')) {
        try {
            const items = value.slice(1, -1).split(',').map(s => s.trim());
            return items.map(parseValue);
        } catch { }
    }

    // Объект: {a:1} → упрощённо
    if (value.startsWith('{') && value.endsWith('}')) {
        try {
            return JSON.parse(value
                .replace(/(\w+):/g, '"$1":')
                .replace(/'/g, '"')
            );
        } catch { }
    }

    // Переменная? Нет — возвращаем как строку
    // ❌ Не разрешаем $ здесь — это делает parseExpression
    return value;
}

export function transformExpression(exp: string): string {
    return exp.startsWith('$') ? exp.slice(1) : exp;
}

function transformConcatenation(expr: string): string {
    const parts: string[] = [];
    let current = '';
    let inString = false;
    let depth = 0; // для скобок

    for (let char of expr) {
        if ((char === '"' || char === "'") && depth === 0) {
            inString = !inString;
        }
        if (char === '(' && !inString) depth++;
        if (char === ')' && !inString) depth--;

        if (char === '~' && !inString && depth === 0) {
            if (current.trim()) {
                parts.push(current.trim());
                current = '';
            }
        } else {
            current += char;
        }
    }

    if (current.trim()) {
        parts.push(current.trim());
    }

    if (parts.length === 0) return '""';
    if (parts.length === 1) return transformExpression(parts[0]);

    return parts.map(part => transformExpression(part)).join(' + ');
}

export function isVariable(str: string): boolean {
    return /^\$(\w+)(\.\w+)*$/.test(str.trim());
}

export function warnFilter(name: string, type: string, fn: (...args: any[]) => any) {
    return (...args: any[]) => {
        console.warn(`[Fenom] filter '${name}' is deprecated or should be used with ${type}`);
        return fn(...args);
    };
}

export function transformCondition(cond: string): string {
    return cond
        .replace(/\$(\w+)/g, 'context.$1')
        .replace(/&&/g, '&&')
        .replace(/\|\|/g, '||');
}

export function minifyHTML(html: string): string {
    return html
        .replace(/>\s+</g, '><')           // > < → ><
        .replace(/\s{2,}/g, ' ')           // множественные пробелы
        .replace(/(<!--.*?-->)\s+/g, '$1') // пробелы после комментариев
        .trim();
}

export function getFromContext(path: string, context: any): any {

    const keys = path.split('.').map(k => k.trim());
    let value: any = context;

    for (const key of keys) {
        if (value == null || typeof value !== 'object') {
            return undefined;
        }
        value = value[key];
    }

    return value;
}

export function applyFilters(value: any, filterList: string[], context: any, filters: any): any {
    let result = value;
    for (const filter of filterList) {
        const [name, ...args] = filter.split(':').map(s => s.trim());
        const filterFn = filters[name];
        if (typeof filterFn === 'function') {
            const argValues = args.map(arg => {
                if (/^["'].*["']$/.test(arg)) return arg.slice(1, -1);
                if (!isNaN(+arg)) return +arg;
                if (arg.startsWith('$')) return getFromContext(arg.slice(1), context) ?? '';
                return arg;
            });
            try {
                result = filterFn(result, ...argValues);
            } catch (e) {
                result = '';
            }
        }
    }
    return result;
}