import { contextPath, parseValue, transformExpression } from './functions';
export function compile(ast) {
    const lines = [];
    function compileNode(node) {
        switch (node.type) {
            case 'text':
                lines.push(`out += ${JSON.stringify(node.value)};`);
                break;
            case 'output':
                const value = transformExpression(node.name);
                let result = `(${value})`;
                node.filters.forEach((filter) => {
                    // Если есть аргументы: upper, escape, length, replace:'a':'b'
                    const [name, ...args] = filter.split(':').map(s => s.trim());
                    if (args.length === 0) {
                        result = `filters.${name}(${result})`;
                    }
                    else {
                        const argList = args.map(arg => {
                            // Если аргумент в кавычках — оставляем как есть, иначе → возможно, переменная
                            if (arg.startsWith("'") && arg.endsWith("'"))
                                return arg;
                            if (arg.startsWith('"') && arg.endsWith('"'))
                                return arg;
                            return transformExpression('$' + arg); // переменная
                        }).join(', ');
                        result = `filters.${name}(${result}, ${argList})`;
                    }
                });
                lines.push(`out += ${result} ?? '';`);
                break;
            case 'set':
                // {set $name = 'Анна'} → context.name = 'Анна';
                lines.push(`context.${node.variable} = ${parseValue(node.value)};`);
                break;
            case 'var':
                // {var $title = 'Главная'} → if (context.title === undefined) context.title = 'Главная';
                lines.push(`if (context.${node.variable} === undefined) context.${node.variable} = ${parseValue(node.value)};`);
                break;
            case 'add':
                // {add $counter++} → context.counter = (context.counter || 0) + 1;
                lines.push(`context.${node.variable} = (context.${node.variable} || 0) + 1;`);
                break;
            case 'if':
                lines.push(`if (${contextPath(node.condition)}) {`);
                node.body.forEach(compileNode);
                if (node.elseIfs && node.elseIfs.length > 0) {
                    node.elseIfs.forEach((elseIf) => {
                        lines.push(`} else if (${contextPath(elseIf.condition)}) {`);
                        elseIf.body.forEach(compileNode);
                    });
                }
                if (node.elseBody && node.elseBody.length > 0) {
                    lines.push(`} else {`);
                    node.elseBody.forEach(compileNode);
                }
                lines.push(`}`);
                break;
            case 'for': {
                const key = node.key ? `context.${node.key} = ` : '';
                const item = `context.${node.item}`;
                const collection = contextPath(node.collection);
                const indexVar = `i_${node.item}`;
                // Защита от undefined, null, не-массива
                lines.push(`if (${collection} && Array.isArray(${collection}) && ${collection}.length > 0) {`);
                if (node.reverse) {
                    lines.push(`for (let ${indexVar} = ${collection}.length - 1; ${indexVar} >= 0; ${indexVar}--) {`);
                }
                else {
                    lines.push(`for (let ${indexVar} = 0; ${indexVar} < ${collection}.length; ${indexVar}++) {`);
                }
                // Присваиваем индекс (для key)
                if (key) {
                    lines.push(`${key} ${indexVar};`);
                }
                // Присваиваем элемент (item)
                lines.push(`${item} = ${collection}[${indexVar}];`);
                // Тело цикла
                node.body.forEach(compileNode);
                // Закрываем for и if
                lines.push(`}`);
                lines.push(`}`); // конец if (массив существует и не пуст)
                // {foreachelse} — выполняется, если массив пуст или не существует
                if (node.elseBody && node.elseBody.length > 0) {
                    lines.push(`else {`);
                    node.elseBody.forEach(compileNode);
                    lines.push(`}`);
                }
                break;
            }
            case 'switch':
                lines.push(`switch (${contextPath(node.value)}) {`);
                node.cases.forEach((c) => {
                    lines.push(`case ${c.value}: {`);
                    c.body.forEach(compileNode);
                    lines.push(`break; }`);
                });
                if (node.defaultBody && node.defaultBody.length > 0) {
                    lines.push(`default: {`);
                    node.defaultBody.forEach(compileNode);
                    lines.push(`break; }`);
                }
                lines.push(`}`);
                break;
            default:
                console.warn(`Unknown node type: ${node.type}`);
        }
    }
    ast.forEach(compileNode);
    const fnBody = `
            let out = '';
            ${lines.join('\n')}
            return out;
            `;
    return new Function('context', 'filters', fnBody);
}
