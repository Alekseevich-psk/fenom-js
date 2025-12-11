import * as Patterns from './patterns';
// Объединяем все паттерны
const ALL_PATTERNS = [
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
export function tokenize(input) {
    const tokens = [];
    let pos = 0;
    while (pos < input.length) {
        if (input[pos] !== '{') {
            const next = input.indexOf('{', pos);
            if (next === -1) {
                tokens.push({ type: 'text', value: input.slice(pos) });
                break;
            }
            else {
                if (next > pos) {
                    tokens.push({ type: 'text', value: input.slice(pos, next) });
                }
                pos = next;
            }
        }
        let matched = false;
        for (const pattern of ALL_PATTERNS) {
            const substr = input.slice(pos);
            const match = substr.match(pattern.regex);
            if (match) {
                const token = { type: pattern.type };
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
