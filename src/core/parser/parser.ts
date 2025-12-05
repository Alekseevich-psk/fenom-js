import type { Token } from '@/core/types/token';
import type { ASTNode } from '@/core/types/common';

import { parseIf } from './parse-if';
import { parseFor } from './parse-for';
import { parseSwitch } from './parse-switch';

export function parse(tokens: Token[]): ASTNode[] {
    const ast: ASTNode[] = [];
    let i = 0;

    while (i < tokens.length) {
        const token = tokens[i];

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

        // Простые токены — добавляем как есть
        ast.push({ ...token });
        i++;
    }

    return ast;
};