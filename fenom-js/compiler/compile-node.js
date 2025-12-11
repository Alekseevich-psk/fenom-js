// src/core/compiler/compile-node.ts
import { contextPath, parseValue, transformExpression } from './functions';
export function compileNode(node, lines) {
    switch (node.type) {
        case 'text':
            lines.push(`out += ${JSON.stringify(node.value)};`);
            break;
        case 'output':
            const value = transformExpression(node.name);
            let result = `(${value})`;
            node.filters.forEach((filter) => {
                const [name, ...args] = filter.split(':').map(s => s.trim());
                if (args.length === 0) {
                    result = `filters.${name}(${result})`;
                }
                else {
                    const argList = args.map(arg => {
                        if (/^['"].*['"]$/.test(arg))
                            return arg;
                        return transformExpression('$' + arg);
                    }).join(', ');
                    result = `filters.${name}(${result}, ${argList})`;
                }
            });
            lines.push(`out += ${result} ?? '';`);
            break;
        case 'set':
            lines.push(`context.${node.variable} = ${parseValue(node.value)};`);
            break;
        case 'var':
            lines.push(`if (context.${node.variable} === undefined) context.${node.variable} = ${parseValue(node.value)};`);
            break;
        case 'add':
            lines.push(`context.${node.variable} = (context.${node.variable} || 0) + 1;`);
            break;
        case 'if':
            lines.push(`if (${contextPath(node.condition)}) {`);
            node.body.forEach(n => compileNode(n, lines));
            if (node.elseIfs?.length) {
                node.elseIfs.forEach((elseIf) => {
                    lines.push(`} else if (${contextPath(elseIf.condition)}) {`);
                    elseIf.body.forEach((n) => compileNode(n, lines));
                });
            }
            if (node.elseBody?.length) {
                lines.push(`} else {`);
                node.elseBody.forEach(n => compileNode(n, lines));
                lines.push(`}`);
            }
            lines.push(`}`);
            break;
        case 'for': {
            const key = node.key ? `context.${node.key} = ` : '';
            const item = `context.${node.item}`;
            const collection = contextPath(node.collection);
            const indexVar = `i_${node.item}`;
            lines.push(`if (${collection} && Array.isArray(${collection}) && ${collection}.length > 0) {`);
            if (node.reverse) {
                lines.push(`for (let ${indexVar} = ${collection}.length - 1; ${indexVar} >= 0; ${indexVar}--) {`);
            }
            else {
                lines.push(`for (let ${indexVar} = 0; ${indexVar} < ${collection}.length; ${indexVar}++) {`);
            }
            if (key)
                lines.push(`${key} ${indexVar};`);
            lines.push(`${item} = ${collection}[${indexVar}];`);
            node.body.forEach(n => compileNode(n, lines));
            lines.push(`}`);
            lines.push(`}`);
            if (node.elseBody?.length) {
                lines.push(`else {`);
                node.elseBody.forEach(n => compileNode(n, lines));
                lines.push(`}`);
            }
            break;
        }
        case 'switch':
            lines.push(`switch (${contextPath(node.value)}) {`);
            node.cases.forEach((c) => {
                lines.push(`case ${c.value}: {`);
                c.body.forEach((n) => compileNode(n, lines));
                lines.push(`break; }`);
            });
            if (node.defaultBody?.length) {
                lines.push(`default: {`);
                node.defaultBody.forEach(n => compileNode(n, lines));
                lines.push(`break; }`);
            }
            lines.push(`}`);
            break;
        case 'extends':
            break;
        case 'block':
            if (node.body && node.body.length > 0) {
                // Это определение — не рендерим
                return;
            }
            // Это вставка: {block "main"}
            lines.push(`out += await context.block('${node.name}');`);
            break;
        default:
            if (node.type !== 'extends' && node.type !== 'block') {
                console.warn(`Unknown node type: ${node.type}`);
            }
    }
}
