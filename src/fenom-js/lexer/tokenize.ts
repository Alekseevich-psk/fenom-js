import type { TokenPattern, Token } from './../types/token';
import * as Patterns from './patterns';

// Объединяем все паттерны
const ALL_PATTERNS: TokenPattern[] = [
    ...Patterns.EXTENDS_PATTERNS,
    ...Patterns.INCLUDE_PATTERNS,
    ...Patterns.FOREACH_PATTERNS,
    ...Patterns.SWITCH_PATTERNS,
    ...Patterns.OPERATOR_PATTERN,
    ...Patterns.IF_PATTERNS,
    ...Patterns.IGNORE_PATTERN,
    ...Patterns.SET_PATTERNS,
    ...Patterns.MISC_PATTERNS,
    ...Patterns.CYCLE_PATTERNS,
    ...Patterns.FILTER_PATTERNS,
    ...Patterns.MACRO_PATTERNS,
    ...Patterns.OUTPUT_PATTERN,
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
                if (input.length - i >= 8 && input.startsWith('{ignore}', i)) {
                    depth++;
                    i += 8;
                    continue;
                }

                if (input.length - i >= 9 && input.startsWith('{/ignore}', i)) {
                    depth--;
                    i += 9;

                    if (depth === 0) {
                        const content = input.slice(pos + 8, i - 9);
                        tokens.push({ type: 'text', value: content });
                        pos = i;
                        matched = true;
                        break;
                    }

                    continue;
                }

                i++;
            }

            if (!matched) {
                tokens.push({ type: 'text', value: '{ignore}' });
                pos += 8;
            }

            continue;
        }

        if (input[pos] !== '{') {
            const nextBrace = input.indexOf('{', pos);

            if (nextBrace === -1) {
                tokens.push({ type: 'text', value: input.slice(pos) });
                break;
            }

            if (nextBrace > pos) {
                tokens.push({ type: 'text', value: input.slice(pos, nextBrace) });
            }

            pos = nextBrace;
        }

        for (const pattern of ALL_PATTERNS) {
            const substr = input.slice(pos);
            const match = substr.match(pattern.regex);

            if (match) {
                const token: Token = {
                    type: pattern.type,
                    value: match[0] // ← добавляем оригинальный текст токена
                };

                if (pattern.type === 'comment') {
                    pos += match[0].length;
                    matched = true;
                    break;
                }

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

        console.log('[TOKEN] matched:', tokens);
    }

    return tokens;
}