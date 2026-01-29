import type { Token } from '../types/token';
import type { ASTNode } from '../types/common';

import { parse } from './parser';

export function parseFor(tokens: Token[], index: number): { node: ASTNode; nextIndex: number; } {
    const token = tokens[index];

    let node: ASTNode;

    // 🔥 Обработка for_range
    if (token.type === 'for_range') {
        node = {
            type: 'for_range',
            start: token.start,
            end: token.end,
            item: token.item,
            reverse: Boolean(token.reverse),
            body: [],
            elseBody: []
        };
    }
    // Обычный for / foreach
    else if (token.type === 'for' || token.type === 'foreach') {
        node = {
            type: 'for',
            collection: token.collection,
            item: token.item,
            key: token.key || null,
            reverse: Boolean(token.reverse),
            body: [],
            elseBody: []
        };
    }
    // Неизвестный токен
    else {
        throw new Error(`Invalid for token at ${index}: ${token.type}`);
    }

    let i = index + 1;
    let depth = 0;
    let inElseBranch = false;

    const bodyTokens: Token[] = [];
    const elseTokens: Token[] = [];

    while (i < tokens.length) {
        const currentToken = tokens[i];

        // Увеличиваем глубину для вложенных блоков
        if (currentToken.type === 'for' || currentToken.type === 'foreach' || currentToken.type === 'for_range') {
            depth++;
        }

        // Закрывающие теги
        if (currentToken.type === 'endfor' || currentToken.type === 'endforeach') {
            if (depth > 0) {
                depth--;
            } else {
                break; // выходим — нашли конец текущего цикла
            }
        }

        // Поддержка {foreachelse}
        if (currentToken.type === 'foreachelse') {
            if (depth === 0) {
                inElseBranch = true;
                i++;
                continue;
            }
        }

        // Собираем токены в нужную ветку
        if (!inElseBranch) {
            bodyTokens.push(currentToken);
        } else {
            elseTokens.push(currentToken);
        }

        i++;
    }

    if (i >= tokens.length) {
        throw new Error('Unclosed for loop: expected {/for}');
    }

    // Рекурсивно парсим
    node.body = parse(bodyTokens);
    if (elseTokens.length > 0) {
        node.elseBody = parse(elseTokens);
    }

    return {
        node,
        nextIndex: i + 1 // пропускаем {/for}
    };
}