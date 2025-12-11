import type { TokenPattern, Token } from '@/core/types/token';
import * as Patterns from './patterns';

// Объединяем все паттерны
const ALL_PATTERNS: TokenPattern[] = [
    ...Patterns.OPERATOR_PATTERN,
    ...Patterns.IGNORE_PATTERN,
    ...Patterns.EXTENDS_PATTERNS,
    ...Patterns.INCLUDE_PATTERNS,
    ...Patterns.OUTPUT_PATTERN,
    ...Patterns.SET_PATTERNS,
    ...Patterns.IF_PATTERNS,
    ...Patterns.FOREACH_PATTERNS,
    ...Patterns.SWITCH_PATTERNS,
    ...Patterns.CYCLE_PATTERNS,
    ...Patterns.FILTER_PATTERNS,
    ...Patterns.MACRO_PATTERNS,
    ...Patterns.MISC_PATTERNS
];

export function tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let pos = 0;

    while (pos < input.length) {
        let matched = false;

        if (input.slice(pos).startsWith('{ignore}')) {
            let depth = 1;
            let i = pos + 8; // длина '{ignore}'

            while (i < input.length) {
                if (input.slice(i).startsWith('{ignore}')) {
                    depth++;
                    i += 8;
                } else if (input.slice(i).startsWith('{/ignore}')) {
                    depth--;
                    i += 9;
                    if (depth === 0) {
                        // Нашли конец
                        const content = input.slice(pos + 8, i - 9); // только содержимое
                        tokens.push({ type: 'text', value: content });
                        pos = i; // ставим после {/ignore}
                        matched = true;
                        break;
                    }
                } else {
                    i++;
                }
            }

            // Если не нашли закрывающий тег
            if (!matched) {
                tokens.push({ type: 'text', value: '{ignore}' });
                pos += 8;
            }
            continue;
        }

        if (input[pos] !== '{') {
            const next = input.indexOf('{', pos);
            if (next === -1) {
                tokens.push({ type: 'text', value: input.slice(pos) });
                break;
            } else {
                if (next > pos) {
                    tokens.push({ type: 'text', value: input.slice(pos, next) });
                }
                pos = next;
            }
        }

        for (const pattern of ALL_PATTERNS) {
            const substr = input.slice(pos);
            const match = substr.match(pattern.regex);

            if (match) {
                const token: Token = { type: pattern.type };

                if (pattern.process) {
                    Object.assign(token, pattern.process(match));
                }

                tokens.push(token);
                pos += match[0].length;
                matched = true;
                break;
            }
        }

        if (!matched) {
            const context = input.slice(pos, pos + 30).replace(/\n/g, '↵');
            console.warn(`Skip unknown tag at ${pos}: "${context}"`);
            pos++;
        }
    }

    return tokens;
}