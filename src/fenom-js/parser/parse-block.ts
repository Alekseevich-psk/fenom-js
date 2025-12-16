import type { Token } from './../types/token';
import type { ASTNode } from './../types/common';

export function parseBlock(tokens: Token[], index: number): { node: ASTNode; nextIndex: number } {
    const token = tokens[index];
    if (token.type !== 'block') {
        throw new Error(`Ожидался 'block', получен: ${token.type}`);
    }

    const blockName = token.name;
    let depth = 1;
    let i = index + 1;

    while (i < tokens.length) {
        const t = tokens[i];
        if (t.type === 'block') depth++;
        else if (t.type === 'endblock') {
            depth--;
            if (depth === 0) break;
        }
        i++;
    }

    if (depth !== 0) {
        throw new Error(`Блок '${blockName}' не закрыт`);
    }

    const bodyTokens = tokens.slice(index + 1, i);
    const body: ASTNode[] = []; // будет заполнено через parse

    // ← parse будет вызван снаружи
    const node: ASTNode = {
        type: 'block',
        name: blockName,
        body: [], // временно
    };

    return {
        node: { ...node, body },
        nextIndex: i + 1,
    };
}