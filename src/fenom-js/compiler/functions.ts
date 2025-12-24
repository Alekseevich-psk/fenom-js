export function contextPath(path: string): string {
    if (path.startsWith('$')) {
        return `context.${path.slice(1)}`;
    }
    return isNaN(+path) ? `'${path}'` : path;
}

export function parseValue(value: string): string {
    if (value.startsWith('$')) {
        return contextPath(value);
    }
    if (/^['"].*['"]$/.test(value)) {
        return value;
    }
    return isNaN(+value) ? `'${value}'` : value;
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