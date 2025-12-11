import { contextPath, parseValue, transformExpression } from './functions';
import { tokenize } from '../lexer/tokenize';
import { parse } from '../parser/parser';
export function compile(ast, loader) {
    const blocks = {};
    let parentFile = null;
    const lines = [];
    // Извлекаем extends и блоки
    for (const node of ast) {
        if (node.type === 'extends') {
            parentFile = node.file; // например, "layouts/base.tpl"
            continue;
        }
        if (node.type === 'block') {
            blocks[node.name] = node.body;
        }
    }
    const filteredAst = ast.filter(node => node.type !== 'extends' && node.type !== 'block_open' && node.type !== 'block_close');
    function compileNode(node) {
        if (['extends', 'block_open', 'block_close'].includes(node.type)) {
            return; // обрабатываются отдельно
        }
        switch (node.type) {
            case 'include': {
                try {
                    const includedTemplate = loader(node.file);
                    const tokens = tokenize(includedTemplate);
                    const ast = parse(tokens);
                    console.log('ast', ast);
                    ast.forEach(compileNode);
                }
                catch (err) {
                    lines.push(`out += '[Include error: ${node.file}]';`);
                }
                break;
            }
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
            case 'block': {
                const blockContent = blocks[node.name] || node.body;
                if (Array.isArray(blockContent)) {
                    blockContent.forEach(compileNode);
                }
                else {
                    console.warn(`Block "${node.name}" has no body and no override`);
                }
                break;
            }
            default:
                console.warn(`Unknown node type: ${node.type}`);
        }
    }
    if (parentFile && ast.some((node, i) => node.type === 'extends' && i !== 0)) {
        console.warn('{extends} должен быть первым тегом в шаблоне');
    }
    if (parentFile) {
        const parentTemplate = loader(parentFile);
        const tokens = tokenize(parentTemplate);
        const parentAst = parse(tokens);
        parentAst.forEach(compileNode); // ← родительский шаблон
    }
    else {
        filteredAst.forEach(compileNode); // ← текущий шаблон
    }
    const fnBody = `
        let out = '';
        ${lines.join('\n')}
        return out;
    `;
    return new Function('context', 'filters', fnBody);
}
