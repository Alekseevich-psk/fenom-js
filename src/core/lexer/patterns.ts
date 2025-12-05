// Тип для паттерна
import type { TokenPattern } from "@/core/types/token";

// --- ГРУППА: Переменные и присвоение ---
export const SET_PATTERNS: TokenPattern[] = [
    // 1. {set $var = {...} или [...]}
    {
        type: 'set',
        regex: /^\{set\s+\$(\w+)\s*=\s*(\{[\s\S]*\}|\[[\s\S]*\])\}/,
        process(match) {
            const variable = match[1];
            const value = match[2]; // [1,2,3] или {a:1}
            return { variable, value };
        }
    },

    // 2. {set $var = 'string'}
    {
        type: 'set',
        regex: /^\{set\s+\$(\w+)\s*=\s*(['"])(.*?)\2\}/,
        process(match) {
            const variable = match[1];
            const value = match[3];
            return { variable, value };
        }
    },

    // 3. {set $var = true / 123 / $other}
    {
        type: 'set',
        regex: /^\{set\s+\$(\w+)\s*=\s*([^\s}].*?)\}/,
        process(match) {
            const variable = match[1];
            const value = match[2];
            return { variable, value };
        }
    },
    {
        type: 'add',
        regex: /^\{add\s+\$(\w+)\s*\+\+\}/,
        process(match) {
            return { variable: match[1] };
        }
    },
    {
        type: 'var',
        regex: /^\{var\s+\$(\w+)\s*=\s*(['"])(.*?)\2\}/,
        process(match) {
            return { variable: match[1], value: match[3] };
        }
    }
];

// --- ГРУППА: Условия ---
export const IF_PATTERNS: TokenPattern[] = [
    {
        type: 'if',
        regex: /^\{if\s+(.+?)\}/,
        process(match) {
            return { condition: match[1].trim() };
        }
    },
    {
        type: 'elseif',
        regex: /^\{elseif\s+(.+?)\}/,
        process(match) {
            return { condition: match[1].trim() };
        }
    },
    {
        type: 'else',
        regex: /^\{else\}/
    },
    {
        type: 'endif',
        regex: /^\{\/if\}/
    }
];

// --- ГРУППА: Циклы ---
export const FOREACH_PATTERNS: TokenPattern[] = [
    {
        type: 'for',
        regex: /^\{(for|foreach)(?:\s+(\$(\w+),\s*)?\$(\w+)\s+in\s+\$(\w+)(?:\s*\|\s*reverse)?)?\}/,
        process(match) {
            const key = match[3] ? match[3] : null;
            const item = match[4] || match[2];
            const collection = '$' + (match[5] || match[4]);
            const isReversed = match[0].includes('| reverse');
            return { key, item, collection, reverse: isReversed };
        }
    },
    {
        type: 'foreachelse',
        regex: /^\{foreachelse\}/
    },
    {
        type: 'endfor',
        regex: /^\{\/(?:for|foreach)\}/
    },
    {
        type: 'break',
        regex: /^\{break\}/
    },
    {
        type: 'continue',
        regex: /^\{continue\}/
    }
];

// --- ГРУППА: Switch ---
export const SWITCH_PATTERNS: TokenPattern[] = [
    {
        type: 'switch',
        regex: /^\{switch\s+(.+?)\}/,
        process(match) {
            return { value: match[1].trim() };
        }
    },
    {
        type: 'case',
        regex: /^\{case\s+(.+?)\}/,
        process(match) {
            return { value: match[1].trim() };
        }
    },
    {
        type: 'default',
        regex: /^\{default\}/
    },
    {
        type: 'endswitch',
        regex: /^\{\/switch\}/
    }
];

// --- ГРУППА: Cycle ---
export const CYCLE_PATTERNS: TokenPattern[] = [
    {
        type: 'cycle',
        regex: /^\{cycle\s+(.+?)\}/,
        process(match) {
            return { values: match[1] }; // например: "'red','blue'"
        }
    }
];

// --- ГРУППА: Включение шаблонов ---
export const INCLUDE_PATTERNS: TokenPattern[] = [
    {
        type: 'include',
        regex: /^\{include\s+(['"])(.*?)\1\}/,
        process(match) {
            return { file: match[2] };
        }
    },
    {
        type: 'insert',
        regex: /^\{insert\s+(['"])(.*?)\1\}/,
        process(match) {
            return { file: match[2] };
        }
    }
];

// --- ГРУППА: Наследование ---
export const EXTENDS_PATTERNS: TokenPattern[] = [
    {
        type: 'extends',
        regex: /^\{extends\s+(['"])(.*?)\1\}/,
        process(match) {
            return { file: match[2] };
        }
    },
    {
        type: 'block',
        regex: /^\{block\s+(['"])(.*?)\1\}/,
        process(match) {
            return { name: match[2] };
        }
    },
    {
        type: 'endblock',
        regex: /^\{\/block\}/
    },
    {
        type: 'parent',
        regex: /^\{parent\}/
    },
    {
        type: 'paste',
        regex: /^\{paste\s+(['"])(.*?)\1\}/,
        process(match) {
            return { name: match[2] };
        }
    },
    {
        type: 'use',
        regex: /^\{use\s+(['"])(.*?)\1\}/,
        process(match) {
            return { file: match[2] };
        }
    }
];

// --- ГРУППА: Фильтры и экранирование ---
export const FILTER_PATTERNS: TokenPattern[] = [
    {
        type: 'filter',
        regex: /^\{filter\s+(.+?)\}/,
        process(match) {
            return { filter: match[1].trim() };
        }
    },
    {
        type: 'endfilter',
        regex: /^\{\/filter\}/
    },
    {
        type: 'raw',
        regex: /^\{raw\}/
    },
    {
        type: 'endraw',
        regex: /^\{\/raw\}/
    },
    {
        type: 'autoescape',
        regex: /^\{autoescape\}/
    },
    {
        type: 'endautoescape',
        regex: /^\{\/autoescape\}/
    }
];

// --- ГРУППА: Макросы и импорт ---
export const MACRO_PATTERNS: TokenPattern[] = [
    {
        type: 'macro',
        regex: /^\{macro\s+(\w+)(?:\s*\((.*?)\))?\}/,
        process(match) {
            const args = match[2] ? match[2].split(',').map(s => s.trim()) : [];
            return { name: match[1], args };
        }
    },
    {
        type: 'endmacro',
        regex: /^\{\/macro\}/
    },
    {
        type: 'import',
        regex: /^\{import\s+(['"])(.*?)\1\s+as\s+(\w+)\}/,
        process(match) {
            return { file: match[2], alias: match[3] };
        }
    }
];

// --- ГРУППА: Прочее ---
export const MISC_PATTERNS: TokenPattern[] = [
    {
        type: 'ignore',
        regex: /^\{ignore\}/
    },
    {
        type: 'endignore',
        regex: /^\{\/ignore\}/
    },
    {
        type: 'unset',
        regex: /^\{unset\s+\$(\w+)\}/,
        process(match) {
            return { variable: match[1] };
        }
    },
    {
        type: 'comment',
        regex: /^\{\*.*?\*\}/
    }
];

// --- ГРУППА: Вывод переменных с модификаторами ---
export const OUTPUT_PATTERN: TokenPattern[] = [
    {
        type: 'output',
        regex: /^\{\$(\w+(?:\.\w+)*)\s*(?:\|\s*([^}]+?))?\}/,
        process(match) {
            const name = '$' + match[1];
            const filters = match[2]
                ? match[2].split('|').map(f => f.trim())
                : [];
            return { name, filters };
        }
    }
];
