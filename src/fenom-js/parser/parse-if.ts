// parseIf.ts
import type { Token } from './../types/token';
import { parse } from './../parser/parser'; 

export function parseIf(tokens: Token[], index: number): { node: any; nextIndex: number } {
    const ifToken = tokens[index];
    const node: any = {
        type: 'if',
        condition: ifToken.condition,
        body: [],
        elseIfs: [],
        elseBody: []
    };

    let i = index + 1;
    let depth = 0;

    // Собираем токены для каждой ветки
    const bodyTokens: Token[] = [];
    const elseIfs: { condition: string; tokens: Token[] }[] = [];
    const elseTokens: Token[] = [];

    let currentElseIf: { condition: string; tokens: Token[] } | null = null;
    let inElseBranch = false;

    while (i < tokens.length) {
        const token = tokens[i];

        if (token.type === 'if') {
            depth++;
        }

        if (token.type === 'endif') {
            if (depth === 0) {
                // Завершаем текущий if
                break;
            }
            depth--;
        }

        if (depth > 0) {
            // Внутри вложенного if — просто добавляем
            if (!currentElseIf && !inElseBranch) {
                bodyTokens.push(token);
            } else if (currentElseIf) {
                currentElseIf.tokens.push(token);
            } else if (inElseBranch) {
                elseTokens.push(token);
            }
            i++;
            continue;
        }

        // Обработка веток
        if (token.type === 'elseif') {
            if (!currentElseIf && !inElseBranch) {
                currentElseIf = {
                    condition: token.condition,
                    tokens: []
                };
                elseIfs.push(currentElseIf);
            } else if (currentElseIf) {
                currentElseIf.tokens.push(token);
            } else if (inElseBranch) {
                elseTokens.push(token);
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
            break;
        }

        // Собираем токены
        if (!currentElseIf && !inElseBranch) {
            bodyTokens.push(token);
        } else if (currentElseIf) {
            currentElseIf.tokens.push(token);
        } else if (inElseBranch) {
            elseTokens.push(token);
        }

        i++;
    }

    // 🔥 ПАРСИМ собранные токены → в AST
    node.body = parse(bodyTokens);

    node.elseIfs = elseIfs.map(elif => ({
        condition: elif.condition,
        body: parse(elif.tokens)
    }));

    node.elseBody = parse(elseTokens);

    // Возвращаем следующий индекс после {/if}
    return {
        node,
        nextIndex: i + 1 // пропускаем {/if}
    };
}
