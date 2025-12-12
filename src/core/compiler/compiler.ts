import type { ASTNode, TemplateLoader } from '@/core/types/common';
import { contextPath, parseValue, transformExpression } from './functions';
import { tokenize } from '../lexer/tokenize';
import { parse } from '../parser/parser';
import { transformCondition } from './../compiler/functions';

export function compile(ast: ASTNode[], loader: TemplateLoader): (context: any, filters: any) => string {
    const blocks: Record<string, ASTNode[]> = {};
    let parentFile: string | null = null;
    const lines: string[] = [];

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

    const filteredAst = ast.filter(
        node => node.type !== 'extends' && node.type !== 'block_open' && node.type !== 'block_close'
    );

    function compileNode(node: ASTNode) {
        if (['extends', 'block_open', 'block_close'].includes(node.type)) {
            return; // обрабатываются отдельно
        }

        if (['endfor'].includes(node.type)) {
            return; // игнорирую
        }

        switch (node.type) {

            case 'operator': {
                const { variable, operator, value } = node;

                // Преобразуем значение: если начинается с $ → context.var
                const getValue = (val: string) => {
                    if (val.startsWith('$')) {
                        return `context.${val.slice(1)}`;
                    }
                    return isNaN(+val) ? `'${val}'` : +val; // число или строка
                };

                switch (operator) {
                    case '++':
                        lines.push(`context.${variable} = (context.${variable} || 0) + 1;`);
                        lines.push(`out += context.${variable} - 1;`); // пост-инкремент
                        break;
                    case '--':
                        lines.push(`context.${variable} = (context.${variable} || 0) - 1;`);
                        lines.push(`out += context.${variable} + 1;`); // пост-декремент
                        break;
                    case '+=':
                        lines.push(`context.${variable} = (context.${variable} || 0) + ${getValue(value)};`);
                        lines.push(`out += context.${variable};`);
                        break;
                    case '-=':
                        lines.push(`context.${variable} = (context.${variable} || 0) - ${getValue(value)};`);
                        lines.push(`out += context.${variable};`);
                        break;
                    case '*=':
                        lines.push(`context.${variable} = (context.${variable} || 0) * ${getValue(value)};`);
                        lines.push(`out += context.${variable};`);
                        break;
                    case '/=':
                        lines.push(`context.${variable} = (context.${variable} || 0) / ${getValue(value)};`);
                        lines.push(`out += context.${variable};`);
                        break;
                    case '%=':
                        lines.push(`context.${variable} = (context.${variable} || 0) % ${getValue(value)};`);
                        lines.push(`out += context.${variable};`);
                        break;
                }
                break;
            }

            case 'ignore_block':
                // Выводим содержимое как обычный текст
                lines.push(`out += ${JSON.stringify(node.content)};`);
                break;

            case 'include': {
                try {
                    const includedTemplate = loader(node.file);
                    const tokens = tokenize(includedTemplate);
                    const ast = parse(tokens);

                    if (node.params) {
                        for (const [key, value] of Object.entries(node.params)) {
                            // Проверяем, что value — строка
                            if (typeof value === 'string') {
                                if (value.startsWith('$')) {
                                    const varName = value.slice(1);
                                    lines.push(`context.${key} = context.${varName};`);
                                } else {
                                    lines.push(`context.${key} = ${JSON.stringify(value)};`);
                                }
                            } else {
                                // Если не строка — преобразуем в JSON (например, число, boolean)
                                lines.push(`context.${key} = ${JSON.stringify(value)};`);
                            }
                        }
                    }

                    ast.forEach(compileNode);
                } catch (err) {
                    lines.push(`out += '[Include error: ${node.file}]';`);
                }
                break;
            }

            case 'text':
                lines.push(`out += ${JSON.stringify(node.value)};`);
                break;

            case 'output': {
                const value = transformExpression(node.name);
                let result = value;

                // Применяем фильтры
                for (const filter of node.filters) {
                    const parts = filter.split(':').map(s => s.trim());
                    const name = parts[0];
                    const args = parts.slice(1).map((arg: string) => { // ← добавлен :string
                        if (/^['"].*['"]$/.test(arg)) {
                            return arg; // строка в кавычках — оставляем как есть
                        }
                        return transformExpression('$' + arg); // переменная — обрабатываем
                    });

                    const argList = args.length > 0 ? ', ' + args.join(', ') : '';
                    result = `filters["${name}"](${result}${argList})`;
                }

                if (node.filters.length === 0) {
                    const safeValue = `(typeof ${value} === 'object' || ${value} === null ? '' : ${value})`;
                    lines.push(`out += ${safeValue};`);
                } else {
                    lines.push(`out += ${result};`);
                }

                break;
            }

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

            case 'if': {
                const condition = transformCondition(node.condition);
                lines.push(`if (${condition}) {`);
                node.body.forEach(compileNode);
                lines.push('}');

                // else if
                node.elseIfs.forEach(elseIf => {
                    const cond = transformCondition(elseIf.condition);
                    lines.push(`else if (${cond}) {`);
                    elseIf.body.forEach(compileNode);
                    lines.push('}');
                });

                if (node.elseBody.length > 0) {
                    lines.push('else {');
                    node.elseBody.forEach(compileNode);
                    lines.push('}');
                }
                break;
            }

            case 'for': {
                const collection = transformExpression(node.collection); // → context.arr
                const itemVar = `context.${node.item}`;                // → context.value
                const keyVar = node.key ? `context.${node.key}` : null;
                const indexVar = `i_${node.item}`;

                // Проверка: массив существует и не пуст
                lines.push(`if (${collection} && Array.isArray(${collection}) && ${collection}.length > 0) {`);

                // Цикл
                if (node.reverse) {
                    lines.push(`for (let ${indexVar} = ${collection}.length - 1; ${indexVar} >= 0; ${indexVar}--) {`);
                } else {
                    lines.push(`for (let ${indexVar} = 0; ${indexVar} < ${collection}.length; ${indexVar}++) {`);
                }

                // Присваиваем индекс (если есть key)
                if (keyVar) {
                    lines.push(`${keyVar} = ${indexVar};`);
                }

                // Присваиваем элемент: context.value = context.arr[i]
                lines.push(`${itemVar} = ${collection}[${indexVar}];`);

                // Компилируем тело
                node.body.forEach(compileNode);

                // Закрываем цикл
                lines.push(`}`);
                lines.push(`}`);

                // {foreachelse}
                if (node.elseBody && node.elseBody.length > 0) {
                    lines.push(`else {`);
                    node.elseBody.forEach(compileNode);
                    lines.push(`}`);
                }

                break;
            }

            case 'switch':
                lines.push(`switch (${contextPath(node.value)}) {`);
                node.cases.forEach((c: any) => {
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
                } else {
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
    } else {
        filteredAst.forEach(compileNode); // ← текущий шаблон
    }

    const fnBody = `
        let out = '';
        ${lines.join('\n')}
        return out;
    `;

    return new Function('context', 'filters', fnBody) as (context: any, filters: any) => string;
}