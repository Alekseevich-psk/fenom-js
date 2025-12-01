import type { Token } from '@/types/token';

export function parseIf(tokens: Token[], index: number): { node: any; nextIndex: number; } {
    const ifToken = tokens[index];
    const node: any = {
        type: 'if',
        condition: ifToken.condition,
        body: [],
        elseIfs: [],
        elseBody: []
    };

    let i = index + 1;
    let depth = 0; // для вложенности
    let currentElseIf: any = null;
    let inElseBranch = false;

    while (i < tokens.length) {
        const token = tokens[i];

        // Вложенные if — увеличиваем глубину
        if (token.type === 'if') {
            depth++;
        }

        if (depth > 0) {
            // Внутри вложенного блока — просто добавляем
            if (!currentElseIf && !inElseBranch) {
                node.body.push(token);
            } else if (currentElseIf) {
                currentElseIf.body.push(token);
            } else if (inElseBranch) {
                node.elseBody.push(token);
            }

            if (token.type === 'endif') {
                depth--;
            }
            i++;
            continue;
        }

        // Обработка основного уровня
        if (token.type === 'elseif') {
            if (!currentElseIf && !inElseBranch) {
                currentElseIf = {
                    condition: token.condition,
                    body: []
                };
                node.elseIfs.push(currentElseIf);
            } else if (currentElseIf) {
                currentElseIf.body.push(token);
            } else if (inElseBranch) {
                node.elseBody.push(token);
            }
            i++;
            continue;
        }

        if (token.type === 'else') {
            inElseBranch = true;
            i++;
            continue;
        }

        if (token.type === 'endif') {
            // Завершаем if
            return {
                node,
                nextIndex: i + 1
            };
        }

        // Добавляем токен в нужную ветку
        if (!currentElseIf && !inElseBranch) {
            node.body.push(token);
        } else if (currentElseIf) {
            currentElseIf.body.push(token);
        } else if (inElseBranch) {
            node.elseBody.push(token);
        }

        i++;
    }

    throw new Error('Unclosed if statement: expected {/if}');
}