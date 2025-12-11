import { parseIf } from './parse-if';
import { parseFor } from './parse-for';
import { parseSwitch } from './parse-switch';
// parser/parser.ts
export function parse(tokens) {
    const ast = [];
    let i = 0;
    while (i < tokens.length) {
        const token = tokens[i];
        // --- Обработка block ---
        if (token.type === 'block_open') {
            const blockName = token.name;
            i++; // пропускаем {block ...}
            const blockTokens = [];
            let depth = 0;
            while (i < tokens.length) {
                const current = tokens[i];
                if (current.type === 'block_open') {
                    depth++;
                }
                if (current.type === 'block_close') {
                    if (depth === 0)
                        break;
                    depth--;
                }
                blockTokens.push(current);
                i++;
            }
            const body = parse(blockTokens); // ← рекурсивно парсим содержимое
            ast.push({
                type: 'block',
                name: blockName,
                body,
            });
            i++; // пропускаем {/block}
            continue;
        }
        // --- Обработка extends ---
        if (token.type === 'extends') {
            ast.push({ ...token });
            i++;
            continue;
        }
        // --- Обработка include ---
        if (token.type === 'include') {
            ast.push({ ...token });
            i++;
            continue;
        }
        // --- Остальные теги ---
        if (['set', 'var', 'add'].includes(token.type)) {
            ast.push({ ...token });
            i++;
            continue;
        }
        if (token.type === 'if') {
            const { node, nextIndex } = parseIf(tokens, i);
            ast.push(node);
            i = nextIndex;
            continue;
        }
        if (token.type === 'for' || token.type === 'foreach') {
            const { node, nextIndex } = parseFor(tokens, i);
            ast.push(node);
            i = nextIndex;
            continue;
        }
        if (token.type === 'switch') {
            const { node, nextIndex } = parseSwitch(tokens, i);
            ast.push(node);
            i = nextIndex;
            continue;
        }
        // Простые токены
        ast.push({ ...token });
        i++;
    }
    return ast;
}
