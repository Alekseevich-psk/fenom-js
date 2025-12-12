import { warnFilter } from './../compiler/functions';

export const filters = {
    // Безопасные — не требуют массива
    upper: (s: any) => String(s).toUpperCase(),
    lower: (s: any) => String(s).toLowerCase(),

    // first — должен применяться к массиву/объекту
    first: warnFilter('first', 'array', (arr: any) => {
        if (Array.isArray(arr)) return arr[0];
        if (arr && typeof arr === 'object') return Object.values(arr)[0];
        return '';
    }),

    last: warnFilter('last', 'array', (arr: any) => {
        if (Array.isArray(arr)) return arr[arr.length - 1];
        if (arr && typeof arr === 'object') {
            const values = Object.values(arr);
            return values[values.length - 1];
        }
        return '';
    }),

    join: warnFilter('join', 'array', (arr: any, separator: string = ',') => {
        if (Array.isArray(arr)) return arr.join(separator);
        if (arr && typeof arr === 'object') return Object.values(arr).join(separator);
        return String(arr);
    }),

    reverse: warnFilter('reverse', 'array', (arr: any) => {
        if (Array.isArray(arr)) return [...arr].reverse();
        if (typeof arr === 'string') return arr.split('').reverse().join('');
        return arr;
    }),

    sort: warnFilter('sort', 'array', (arr: any) => {
        if (Array.isArray(arr)) return [...arr].sort();
        return arr;
    }),

    // length — можно и к строке, и к массиву
    length: (arr: any) => {
        if (Array.isArray(arr)) return arr.length;
        if (arr && typeof arr === 'object') return Object.keys(arr).length;
        return String(arr).length;
    },

    // substr — только для строк
    substr: warnFilter('substr', 'string', (s: any, start: number, length?: number) => {
        const str = String(s);
        return length === undefined ? str.slice(start) : str.slice(start, start + length);
    }),

    // date — ожидает число или строку даты
    date: (timestamp: any, format: string = 'd.m.Y') => {
        const n = Number(timestamp);
        const d = new Date(isNaN(n) ? timestamp : n * 1000);
        if (isNaN(d.getTime())) {
            console.warn(`[Fenom] filter 'date' received invalid timestamp: ${timestamp}`);
            return '';
        }
        // ... форматирование
        return format
            .replace(/d/g, d.getDate().toString().padStart(2, '0'))
            .replace(/m/g, (d.getMonth() + 1).toString().padStart(2, '0'))
            .replace(/Y/g, d.getFullYear().toString());
    },

    // default — можно к чему угодно
    default: (s: any, def: string) => (s == null || s === '' || (typeof s === 'object' && Object.keys(s).length === 0)) ? def : s,

    // raw — без изменений
    raw: (s: any) => s,

    // escape — только строки
    escape: warnFilter('escape', 'string', (s: any) => {
        const str = String(s);
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }),
};
