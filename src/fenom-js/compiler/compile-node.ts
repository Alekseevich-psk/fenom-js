import type { ASTNode } from '../types/common';
import { parseValue, transformExpression, getFromContext, applyFilters } from './functions';
import { parseExpression } from '../parser/parse-expression';
import { evaluate } from '../compiler/evaluate';

export function compileNode(
    node: ASTNode,
    addLine: (code: string) => void,
    context: any,
    filters: any
): void {
    switch (node.type) {
        case 'ignore_block':
            addLine(node.content || '');
            break;

        case 'comment':
            // Ничего не делаем — полностью игнорируем
            break;

        case 'text':
            addLine(node.value);
            break;

        case 'output': {
            if (/[+\-*/%<>!=&|?:]/.test(node.name)) {
                try {
                    const ast = parseExpression(node.name);
                    let result = evaluate(ast, context, filters);
                    result = applyFilters(result, node.filters, context, filters);
                    addLine(String(result));
                } catch (e) {
                    console.warn(`Eval error: ${node.name}`, e);
                    addLine('');
                }
            } else {
                const path = transformExpression(node.name);
                let result = getFromContext(path, context) ?? '';
                result = applyFilters(result, node.filters, context, filters);
                addLine(String(result));
            }
            break;
        }

        case 'set': {
            const { variable, value } = node;

            // Выражение с операторами
            if (/[+\-*/%~]/.test(value)) {
                try {
                    const ast = parseExpression(value);
                    context[variable] = evaluate(ast, context, filters);
                } catch (e) {
                    context[variable] = '';
                }
            }
            // Простая переменная: $other
            else if (value.startsWith('$')) {
                const path = value.slice(1);
                context[variable] = getFromContext(path, context) ?? '';
            }
            // Простое значение
            else {
                context[variable] = parseValue(value);
            }
            break;
        }

        case 'var':
            if (context[node.variable] === undefined) {
                context[node.variable] = parseValue(node.value);
            }
            break;

        case 'add':
            context[node.variable] = (context[node.variable] || 0) + 1;
            break;

        case 'if': {
            let cond = false;
            try {
                const ast = parseExpression(node.condition);
                cond = !!evaluate(ast, context, filters);
            } catch (e) {
                console.warn(`Condition error: ${node.condition}`, e);
                cond = false;
            }

            if (cond) {
                for (const child of node.body) {
                    compileNode(child, addLine, context, filters);
                }
            } else if (node.elseIfs?.length) {
                let executed = false;
                for (const elseIf of node.elseIfs) {
                    let elseIfCond = false;
                    try {
                        const ast = parseExpression(elseIf.condition);
                        elseIfCond = !!evaluate(ast, context, filters);
                    } catch (e) {
                        console.warn(`Condition error: ${elseIf.condition}`, e);
                        elseIfCond = false;
                    }

                    if (elseIfCond) {
                        for (const child of elseIf.body) {
                            console.log('child', child);
                            
                            compileNode(child, addLine, context, filters);
                        }
                        executed = true;
                        break;
                    }
                }
                if (!executed && node.elseBody?.length) {
                    for (const child of node.elseBody) {
                        compileNode(child, addLine, context, filters);
                    }
                }
            } else if (node.elseBody?.length) {
                for (const child of node.elseBody) {
                    compileNode(child, addLine, context, filters);
                }
            }
            break;
        }



        case 'for': {
            const collection = getFromContext(node.collection.slice(1), context);
            if (Array.isArray(collection) && collection.length > 0) {
                const reverse = node.reverse ?? false;
                const indices = reverse ? [...collection].reverse().keys() : collection.keys();
                for (const i of indices) {
                    const itemValue = collection[i];
                    context[node.item] = itemValue;
                    if (node.key) context[node.key] = i;
                    for (const child of node.body) {
                        compileNode(child, addLine, context, filters);
                    }
                }
            } else if (node.elseBody?.length) {
                for (const child of node.elseBody) {
                    compileNode(child, addLine, context, filters);
                }
            }
            break;
        }

        case 'switch': {
            const value = context[node.value.slice(1)];
            let matched = false;
            for (const c of node.cases) {
                if (c.value === value) {
                    for (const child of c.body) {
                        compileNode(child, addLine, context, filters);
                    }
                    matched = true;
                    break;
                }
            }
            if (!matched && node.defaultBody?.length) {
                for (const child of node.defaultBody) {
                    compileNode(child, addLine, context, filters);
                }
            }
            break;
        }

        case 'operator': {
            const { variable, operator, value } = node;
            const rawValue = getFromContext(variable, context);
            const currentValue = typeof rawValue === 'number' ? rawValue : +rawValue || 0;

            let numericValue: number;
            if (/^[\d.]+$/.test(value)) {
                numericValue = parseFloat(value);
            } else {
                const val = getFromContext(value, context);
                numericValue = typeof val === 'number' ? val : +val || 0;
            }

            let result: number;

            switch (operator) {
                case '++':
                    result = currentValue;
                    context[variable] = currentValue + 1;
                    break;
                case '--':
                    result = currentValue;
                    context[variable] = currentValue - 1;
                    break;
                case '+=':
                    result = currentValue;
                    context[variable] = currentValue + numericValue;
                    break;
                case '-=':
                    result = currentValue;
                    context[variable] = currentValue - numericValue;
                    break;
                case '*=':
                    result = currentValue;
                    context[variable] = currentValue * numericValue;
                    break;
                case '/=':
                    result = currentValue;
                    context[variable] = currentValue / numericValue;
                    break;
                case '%=':
                    result = currentValue;
                    context[variable] = currentValue % numericValue;
                    break;
                default:
                    console.warn(`Unknown operator: ${operator}`);
                    result = 0;
            }

            addLine(String(result));
            break;
        }

        case 'block': {
            // Только вставка: {block "main"}
            // Определения обрабатываются в compile
            addLine(`{block "${node.name}"}`);
            break;
        }

        case 'extends':
        case 'include':
            // Обрабатываются в compile
            break;

        default:
            console.warn(`Unknown node type: ${node.type}`);
    }
}
