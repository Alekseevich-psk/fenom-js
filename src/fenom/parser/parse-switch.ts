import type { Token } from '@/core/types/token';

export function parseSwitch(tokens: Token[], index: number): { node: any; nextIndex: number; } {
    const switchToken = tokens[index];
    const node: any = {
        type: 'switch',
        value: switchToken.value,
        cases: [],
        defaultBody: []
    };

    let i = index + 1;
    let depth = 0;
    let currentCase: any = null;
    let hasDefault = false;

    while (i < tokens.length) {
        const token = tokens[i];

        if (token.type === 'switch') {
            depth++;
        }

        if (token.type === 'endswitch') {
            if (depth > 0) {
                depth--;
                if (currentCase) {
                    currentCase.body.push(token);
                }
                i++;
                continue;
            }

            return {
                node,
                nextIndex: i + 1
            };
        }

        if (depth > 0) {
            if (currentCase) {
                currentCase.body.push(token);
            }
            i++;
            continue;
        }

        if (token.type === 'case') {
            currentCase = {
                value: token.value,
                body: []
            };
            node.cases.push(currentCase);
            i++;
            continue;
        }

        if (token.type === 'default') {
            if (hasDefault) {
                throw new Error('Duplicate {default} in switch');
            }
            hasDefault = true;
            currentCase = null; // после этого идёт defaultBody
            i++;
            continue;
        }

        // Добавляем токены в нужное место
        if (currentCase) {
            currentCase.body.push(token);
        } else if (hasDefault) {
            node.defaultBody.push(token);
        } else {
            // Пока нет default — все токены до него относятся к последнему case
            if (node.cases.length > 0) {
                node.cases[node.cases.length - 1].body.push(token);
            }
        }

        i++;
    }

    throw new Error('Unclosed switch: expected {/switch}');
}
