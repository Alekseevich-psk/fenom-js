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
        regex: /^\{set\s+\$(\w+)\s*=\s*([^}]+?)\s*\}/,
        process: (match) => ({
            variable: match[1],
            value: match[2].trim() // может быть: 1, $a + 1, $count * 2
        })
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
    // Поддержка: {for $arr as $item} и {foreach $arr as $item}
    {
        type: 'for',
        regex: /^\{(for|foreach)\s*\$(\w+(?:\.\w+)?)\s+as\s*\$(\w+)(?:\s*\|\s*reverse)?\s*\}/,
        process: (match) => ({
            collection: `$${match[2]}`, // ✅ match[2] = 'arr'
            item: match[3],             // ✅ match[3] = 'value'
            key: null,
            reverse: match[0].includes('| reverse')
        })
    },
    // {for $arr as $key => $item}, {foreach $arr as $key => $item}
    {
        type: 'for',
        regex: /^\{(for|foreach)\s*\$(\w+(?:\.\w+)?)\s+as\s*\$(\w+)\s*=>\s*\$(\w+)(?:\s*\|\s*reverse)?\s*\}/,
        process: (match) => ({
            collection: `$${match[2]}`, // ✅
            key: match[3],
            item: match[4],
            reverse: match[0].includes('| reverse')
        })
    },
    // {/for}, {/foreach}
    {
        type: 'endfor',
        regex: /^\{\/(?:for|foreach)\}/
    },
    {
        type: 'break',
        regex: /^\{break\}/i
    },
    {
        type: 'continue',
        regex: /^\{continue\}/i
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
        // Поддерживает: {include 'file:...' key="value" key='value' key=$var key=word}
        regex: /^\{include\s+['"]file:([^'"]+)['"](?:\s+((?:\s*\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s}]+))+))?\s*\}/,
        process: (match) => {
            const file = match[1];
            const paramsPart = match[2]; // 'title="Тест" user=$currentUser'

            const params: Record<string, string> = {};

            if (paramsPart) {
                // Извлекаем все `ключ=значение` через регулярку
                const paramRegex = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s}]+))/g;
                let paramMatch;
                while ((paramMatch = paramRegex.exec(paramsPart)) !== null) {
                    const key = paramMatch[1];
                    const value = paramMatch[2] || paramMatch[3] || paramMatch[4] || '';
                    params[key] = value;
                }
            }

            return { file, params };
        }
    }
];

// --- ГРУППА: Наследование ---
export const EXTENDS_PATTERNS: TokenPattern[] = [
    // {extends 'file:...'}
    {
        type: 'extends',
        regex: /^\{extends\s+['"]file:([^'"]+)['"]\s*\}/,
        process: (match) => ({ file: match[1] }),
    },

    // {block "name"} → открывается
    {
        type: 'block_open',
        regex: /^\{block\s+(['"])(.*?)\1\s*\}/,
        process(match) {
            return { name: match[2] };
        }
    },

    // {/block} → закрывается
    {
        type: 'block_close',
        regex: /^\{\/block\}/,
    },

    // {parent} — вставляет родительский контент блока
    {
        type: 'parent',
        regex: /^\{parent\}/
    },

    // {paste "blockName"} — вставка другого блока (Fenom-фича)
    {
        type: 'paste',
        regex: /^\{paste\s+(['"])(.*?)\1\}/,
        process(match) {
            return { name: match[2] };
        }
    },

    // {use 'file:...'} — импорт макросов
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

// --- ГРУППА: Игнор ---
export const IGNORE_PATTERN: TokenPattern[] = [
    {
        type: 'ignore_block',
        regex: /^\{ignore\}([\s\S]*?)\{\/ignore\}/,
        process: (match) => ({
            content: match[1]  // содержимое между {ignore} и {/ignore}
        })
    }
];

// --- ГРУППА: Прочее ---
export const MISC_PATTERNS: TokenPattern[] = [
    {
        type: 'unset',
        regex: /^\{unset\s+\$(\w+)\}/,
        process(match) {
            return { variable: match[1] };
        }
    },
    {
        type: 'comment',
        regex: /^\{\*\s*([\s\S]*?)\s*\*\}/,
        // не нужно process — мы просто пропустим этот блок
    }
];

// --- ГРУППА: Вывод переменных с модификаторами ---
export const OUTPUT_PATTERN: TokenPattern[] = [
    // 1. {output name="title"}
    {
        type: 'output',
        regex: /^\{output\s+name\s*=\s*(['"])(.*?)\1\s*\}/,
        process: (match) => ({
            name: match[2],
            filters: []
        })
    },

    // 2. {output "$title"} или {output $title}
    {
        type: 'output',
        regex: /^\{output\s+(['"])(.*?)\1\s*\}/,
        process: (match) => ({
            name: match[2],
            filters: []
        })
    },
    {
        type: 'output',
        regex: /^\{output\s+([^\s}]+)\s*\}/,
        process: (match) => ({
            name: match[1],
            filters: []
        })
    },

    // 3. Выражения: {output $user.age + 18}
    {
        type: 'output',
        regex: /^\{output\s+(\$?[^}]+)\}/,
        process: (match) => ({
            name: match[1].trim(),
            filters: []
        })
    },

    // 🔥 4. ОСНОВНОЙ случай: {$var}, {$var|filter}, {$var|filter:"arg"}
    {
        type: 'output',
        regex: /^\{\$(.+?)\}/, // ← нежадный — ловит всё внутри
        process: (match) => {
            const content = match[1].trim();
            const parts = content.split('|').map(s => s.trim());
            const variable = parts[0];
            const filters = parts.slice(1);
            return {
                name: `$${variable}`, // → '$arr'
                filters             // → ['length']
            };
        }
    }
];
// Поддержка ++, --, +=, -=, *= и т.д.
export const OPERATOR_PATTERN: TokenPattern[] = [
    {
        type: 'operator',
        regex: /^\{\$(\w+)\s*(\+\+|--|\+=|-=|\*=|\/=|\%=)\s*([^}]+)?\}/,
        process: (match) => {
            const variable = match[1];
            const operator = match[2];
            const value = match[3]?.trim() || '1'; // для +=5 → 5, для ++ → 1

            return { variable, operator, value };
        }
    }
];