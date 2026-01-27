import type { Token } from './../types/token';
import type { ASTNode } from './../types/common';

import { parse } from './parser';

export function parseFor(tokens: Token[], index: number): { node: ASTNode; nextIndex: number; } {
    const forToken = tokens[index];
    const node: ASTNode = {
        type: 'for',
        key: forToken.key || null,
        item: forToken.item,
        collection: forToken.collection,
        reverse: Boolean(forToken.reverse),
        body: [],
        elseBody: []
    };

    let i = index + 1;
    let depth = 0;
    let inElseBranch = false;

    const bodyTokens: Token[] = [];
    const elseTokens: Token[] = [];

    while (i < tokens.length) {
        const token = tokens[i];

        if (token.type === 'for' || token.type === 'foreach') {
            depth++;
        }

        if (token.type === 'endfor' || token.type === 'endforeach') {
            if (depth > 0) {
                depth--;
            } else {
                // Выход: нашли конец текущего цикла
                break;
            }
        }

        if (token.type === 'foreachelse') {
            if (depth === 0) {
                inElseBranch = true;
                i++;
                continue;
            }
        }

        // Собираем в нужный буфер
        if (!inElseBranch) {
            bodyTokens.push(token);
        } else {
            elseTokens.push(token);
        }

        i++;
    }

    if (i >= tokens.length) {
        throw new Error('Unclosed for loop: expected {/for}');
    }

    // 🔥 Рекурсивно парсим тела
    node.body = parse(bodyTokens);
    node.elseBody = parse(elseTokens);

    return {
        node,
        nextIndex: i + 1 // пропускаем {/for}
    };
}
