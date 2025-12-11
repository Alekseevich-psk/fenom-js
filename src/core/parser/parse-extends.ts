import type { Token } from './../types/token';
import type { ASTNode } from './../types/common';

export function parseExtends(tokens: Token[], index: number): { node: ASTNode; nextIndex: number; } {
    const token = tokens[index];

    if (token.type !== 'extends') {
        throw new Error(`Ожидался токен 'extends', получен: ${token.type}`);
    }

    // Следующий токен должен быть строкой — путь к шаблону
    const nextToken = tokens[index + 1];

    if (!nextToken || nextToken.type !== 'string') {
        throw new Error(`После 'extends' ожидается строковый литерал, получен: ${nextToken?.type}`);
    }

    const node: ASTNode = {
        type: 'extends',
        value: nextToken.value, // например: 'file:layouts/base.tpl' или 'base.tpl'
    };

    // Пропускаем два токена: extends + string
    return {
        node,
        nextIndex: index + 2,
    };
}