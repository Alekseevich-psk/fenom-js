import { warnFilter } from './../compiler/functions';

export const filters = {
    // ——— Строковые фильтры ————————————————————————

    /**
     * Преобразует строку в верхний регистр
     */
    upper: (s: any) => String(s).toUpperCase(),

    /**
     * Преобразует строку в нижний регистр
     */
    lower: (s: any) => String(s).toLowerCase(),

    /**
     * Делает первую букву строки заглавной, остальные — строчными
     * 'аННА' → 'Анна'
     */
    capitalize: (s: any) => {
        const str = String(s).trim();
        if (str.length === 0) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    /**
     * Аналог capitalize (для совместимости)
     */
    ucfirst: (s: any) => filters.capitalize(s),

    /**
     * Делает первую букву каждого слова заглавной
     * 'hello world' → 'Hello World'
     */
    ucwords: (s: any) => {
        const str = String(s).trim();
        return str.replace(/\b\w/g, (match) => match.toUpperCase());
    },

    /**
     * Делает первую букву строки строчной
     * 'Hello' → 'hello'
     */
    lcfirst: (s: any) => {
        const str = String(s).trim();
        if (str.length === 0) return '';
        return str.charAt(0).toLowerCase() + str.slice(1);
    },

    /**
     * Удаляет пробелы с краёв строки
     */
    trim: (s: any) => String(s).trim(),

    /**
     * Удаляет пробелы слева
     */
    ltrim: (s: any) => String(s).replace(/^\s+/, ''),

    /**
     * Удаляет пробелы справа
     */
    rtrim: (s: any) => String(s).replace(/\s+$/, ''),

    /**
     * Преобразует \n → <br>
     */
    nl2br: (s: any) => String(s).replace(/\n/g, '<br>'),

    /**
     * Заменяет подстроку
     * {$str|replace:'old':'new'}
     */
    replace: (s: any, search: string, replace: string) => {
        const str = String(s);
        return str.split(String(search)).join(String(replace));
    },

    /**
     * Обрезает строку
     * {$str|substr:0:5}
     */
    substr: warnFilter('substr', 'string', (s: any, start: number, length?: number) => {
        const str = String(s);
        return length === undefined ? str.slice(start) : str.slice(start, start + length);
    }),

    /**
     * Кодирует строку в URL
     */
    urlencode: (s: any) => encodeURIComponent(String(s)),

    /**
     * Декодирует URL
     */
    urldecode: (s: any) => decodeURIComponent(String(s)),

    /**
     * Экранирует HTML-символы
     */
    escape: warnFilter('escape', 'string', (s: any) => {
        const str = String(s);
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }),

    /**
     * Синоним escape
     */
    e: (s: any) => filters.escape(s),

    // ——— Работа с массивами ——————————————————————

    /**
     * Первый элемент массива/объекта
     */
    first: warnFilter('first', 'array', (arr: any) => {
        if (Array.isArray(arr)) return arr[0];
        if (arr && typeof arr === 'object') return Object.values(arr)[0];
        return '';
    }),

    /**
     * Последний элемент массива/объекта
     */
    last: warnFilter('last', 'array', (arr: any) => {
        if (Array.isArray(arr)) return arr[arr.length - 1];
        if (arr && typeof arr === 'object') {
            const values = Object.values(arr);
            return values[values.length - 1];
        }
        return '';
    }),

    /**
     * Объединяет массив в строку
     * {$arr|join:', '}
     */
    join: warnFilter('join', 'array', (arr: any, separator: string = ',') => {
        if (Array.isArray(arr)) return arr.join(separator);
        if (arr && typeof arr === 'object') return Object.values(arr).join(separator);
        return String(arr);
    }),

    /**
     * Переворачивает массив или строку
     */
    reverse: warnFilter('reverse', 'array', (arr: any) => {
        if (Array.isArray(arr)) return [...arr].reverse();
        if (typeof arr === 'string') return arr.split('').reverse().join('');
        return arr;
    }),

    /**
     * Сортирует массив по значениям
     */
    sort: warnFilter('sort', 'array', (arr: any) => {
        if (Array.isArray(arr)) return [...arr].sort();
        return arr;
    }),

    /**
     * Сортирует массив по ключам
     */
    ksort: warnFilter('ksort', 'object', (obj: any) => {
        if (obj && typeof obj === 'object') {
            const sorted: any = {};
            Object.keys(obj).sort().forEach(key => {
                sorted[key] = obj[key];
            });
            return sorted;
        }
        return obj;
    }),

    /**
     * Возвращает только уникальные значения
     */
    unique: warnFilter('unique', 'array', (arr: any) => {
        if (Array.isArray(arr)) return [...new Set(arr)];
        return arr;
    }),

    /**
     * Перемешивает массив
     */
    shuffle: warnFilter('shuffle', 'array', (arr: any) => {
        if (!Array.isArray(arr)) return arr;
        const newArr = [...arr];
        for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
        }
        return newArr;
    }),

    /**
     * Возвращает срез массива/строки
     * {$arr|slice:0:2}
     */
    slice: (arr: any, start: number, length?: number) => {
        if (Array.isArray(arr) || typeof arr === 'string') {
            return length === undefined ? arr.slice(start) : arr.slice(start, start + length);
        }
        return arr;
    },

    /**
     * Объединяет два массива
     * {$arr1|merge:$arr2}
     */
    merge: (arr1: any, arr2: any) => {
        if (Array.isArray(arr1) && Array.isArray(arr2)) {
            return [...arr1, ...arr2];
        }
        return arr1;
    },

    /**
     * Разбивает массив на группы
     * {$items|batch:3}
     */
    batch: (arr: any, size: number) => {
        if (!Array.isArray(arr)) return arr;
        const result = [];
        for (let i = 0; i < arr.length; i += size) {
            result.push(arr.slice(i, i + size));
        }
        return result;
    },

    /**
     * Возвращает ключи массива/объекта
     */
    keys: (obj: any) => (obj && typeof obj === 'object' ? Object.keys(obj) : []),

    /**
     * Возвращает значения массива/объекта
     */
    values: (obj: any) => (obj && typeof obj === 'object' ? Object.values(obj) : []),

    /**
     * Длина строки или количество элементов
     */
    length: (arr: any) => {
        if (Array.isArray(arr)) return arr.length;
        if (arr && typeof arr === 'object') return Object.keys(arr).length;
        return String(arr).length;
    },

    // ——— Форматирование и числа ——————————————————

    /**
     * Форматирует число
     * {$price|number_format:2:'.':','}
     */
    number_format: (num: any, decimals: number = 0, decPoint: string = '.', thousandsSep: string = ',') => {
        const n = Number(num);
        if (isNaN(n)) return '';
        return n.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
            useGrouping: true
        }).replace(/,/g, thousandsSep).replace(/\./g, decPoint);
    },

    /**
     * Абсолютное значение
     */
    abs: (n: any) => Math.abs(Number(n) || 0),

    /**
     * Округляет число
     */
    round: (n: any, precision: number = 0) => {
        const factor = 10 ** precision;
        return Math.round((Number(n) || 0) * factor) / factor;
    },

    // ——— JSON ————————————————————————————————

    /**
     * Кодирует в JSON
     */
    json_encode: (data: any) => JSON.stringify(data),

    /**
     * Декодирует из JSON
     */
    json_decode: (str: any) => {
        try {
            return JSON.parse(String(str));
        } catch {
            return null;
        }
    },

    // ——— Дата ————————————————————————————————

    /**
     * Форматирует timestamp
     * Формат: d.m.Y H:i:s
     */
    date: (timestamp: any, format: string = 'd.m.Y') => {
        const n = Number(timestamp);
        const d = new Date(isNaN(n) ? timestamp : n * 1000);
        if (isNaN(d.getTime())) {
            console.warn(`[Fenom] filter 'date' received invalid timestamp: ${timestamp}`);
            return '';
        }

        const pad = (n: number) => n.toString().padStart(2, '0');
        return format
            .replace(/d/g, pad(d.getDate()))
            .replace(/m/g, pad(d.getMonth() + 1))
            .replace(/Y/g, d.getFullYear().toString())
            .replace(/H/g, pad(d.getHours()))
            .replace(/i/g, pad(d.getMinutes()))
            .replace(/s/g, pad(d.getSeconds()));
    },

    // ——— Прочее ——————————————————————————————

    /**
     * Возвращает значение по умолчанию, если пусто
     */
    default: (s: any, def: string) => {
        return (s == null || s === '' || (typeof s === 'object' && Object.keys(s).length === 0))
            ? def
            : s;
    },

    /**
     * Вывод без изменений
     */
    raw: (s: any) => s,

    /**
     * Отладка: вывод структуры
     */
    var_dump: (data: any) => {
        return `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    },

    /**
     * Отладка: красивый вывод
     */
    print_r: (data: any) => {
        return `<pre>${data instanceof Object ? JSON.stringify(data, null, 2) : String(data)}</pre>`;
    }
};
