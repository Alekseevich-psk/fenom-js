export function parseFor(tokens, index) {
    const forToken = tokens[index];
    const node = {
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
                }
                else {
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
            }
            else {
                node.elseBody.push(token);
            }
            i++;
            continue;
        }
        // Обработка {foreachelse}
        if (token.type === 'foreachelse') {
            inElseBranch = true;
            i++;
            continue;
        }
        // Обработка break / continue
        if (['break', 'continue'].includes(token.type)) {
            if (inElseBranch) {
                node.elseBody.push(token);
            }
            else {
                node.body.push(token);
            }
            i++;
            continue;
        }
        // Простые токены
        if (!inElseBranch) {
            node.body.push(token);
        }
        else {
            node.elseBody.push(token);
        }
        i++;
    }
    throw new Error('Unclosed for loop: expected {/for}');
}
