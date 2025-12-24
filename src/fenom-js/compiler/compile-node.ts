import type { ASTNode } from '../types/common';
import { parseValue, transformExpression, getFromContext } from './functions';

export function compileNode(
    node: ASTNode,
    addLine: (code: string) => void,
    context: any,
    filters: any
): void {
    switch (node.type) {
        case 'text':
            addLine(node.value);
            break;

        case 'output': {
            const path = transformExpression(node.name);
            let result = getFromContext(path, context);
            if (result === undefined) result = '';

            for (const filter of node.filters) {
                const [name, ...args] = filter.split(':').map(s => s.trim());
                const filterFn = filters[name];
                if (typeof filterFn === 'function') {
                    const filterArgs = args.map(arg => {
                        if (/^["'].*["']$/.test(arg)) {
                            return arg.slice(1, -1);
                        } else if (!isNaN(+arg)) {
                            return +arg;
                        } else if (arg.startsWith('$')) {
                            return getFromContext(arg.slice(1), context) ?? '';
                        }
                        return arg;
                    });

                    try {
                        result = filterFn(result, ...filterArgs);
                    } catch (e) {
                        result = '';
                    }
                }
            }

            addLine(String(result));
            break;
        }

        case 'set':
            context[node.variable] = parseValue(node.value);
            break;

        case 'var':
            if (context[node.variable] === undefined) {
                context[node.variable] = parseValue(node.value);
            }
            break;

        case 'add':
            context[node.variable] = (context[node.variable] || 0) + 1;
            break;

        case 'if': {
            // Обработка основного условия
            const path = transformExpression(node.condition);
            const cond = !!getFromContext(path, context);

            if (cond) {
                for (const child of node.body) {
                    compileNode(child, addLine, context, filters);
                }
            } else if (node.elseIfs?.length) {
                let executed = false;
                for (const elseIf of node.elseIfs) {
                    const elseIfPath = transformExpression(elseIf.condition);
                    const elseIfCond = !!getFromContext(elseIfPath, context);
                    if (elseIfCond) {
                        for (const child of elseIf.body) {
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
