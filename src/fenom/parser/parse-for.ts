import type { Token } from '@/core/types/token';

export function parseFor(tokens: Token[], index: number): { node: any; nextIndex: number; } {
    const forToken = tokens[index];
    const node: any = {
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

    while (i < tokens.length) {
        const token = tokens[i];

        if (token.type === 'for') {
            depth++;
        }

        if (token.type === 'endfor') {
            if (depth > 0) {
                depth--;
                if (!inElseBranch) {
                    node.body.push(token);
                } else {
                    node.elseBody.push(token);
                }
                i++;
                continue;
            }

            // Завершаем цикл
            return {
                node,
                nextIndex: i + 1
            };
        }

        if (depth > 0) {
            if (!inElseBranch) {
                node.body.push(token);
            } else {
                node.elseBody.push(token);
            }
            i++;
            continue;
        }

        // Обработка {foreachelse}
        if (token.type === 'foreachelse') {
            if (depth === 0) {
                inElseBranch = true;
                i++;
                continue;
            }
            // Если внутри вложенного цикла — просто пропускаем
            node.body.push(token); // ❌ или нет?
            i++;
            continue;
        }

        // Обработка break / continue
        if (['break', 'continue'].includes(token.type)) {
            if (inElseBranch) {
                node.elseBody.push(token);
            } else {
                node.body.push(token);
            }
            i++;
            continue;
        }

        // Простые токены
        if (!inElseBranch) {
            node.body.push(token);
        } else {
            node.elseBody.push(token);
        }

        i++;
    }

    throw new Error('Unclosed for loop: expected {/for}');
}
