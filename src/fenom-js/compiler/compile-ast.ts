import type { ASTNode, TemplateLoader } from '../types/common';
import { tokenize } from '../lexer/tokenize';
import { parse } from '../parser/parser';
import { parseExpression } from '../parser/parse-expression';
import { evaluate } from './evaluate';
import { getFromContext, applyFilters, parseValue } from './functions';

export async function compileAST(
    ast: ASTNode[],
    loader?: TemplateLoader,
    context: any = {},
    filters: any = {}
): Promise<string> {
    let result = '';

    for (const node of ast) {
        switch (node.type) {
            case 'text':
                result += node.value;
                break;

            case 'ignore_block':
                result += node.content || '';
                break;

            case 'comment':
                break;

            case 'output': {
                try {
                    const exp = node.name.trim();
                    let evaluated;

                    if (/[+\-*/%<>!=&|?:~]/.test(exp)) {
                        const ast = parseExpression(exp);
                        evaluated = evaluate(ast, context, filters);
                    } else {
                        evaluated = getFromContext(exp, context) ?? '';
                    }

                    const filtered = applyFilters(evaluated, node.filters, context, filters);
                    result += String(filtered);
                } catch (e) {
                    console.warn(`Eval error: ${node.name}`, e);
                    result += '';
                }
                break;
            }

            case 'set': {
                try {
                    const valueStr = node.value.trim();
                    if (/[+\-*/%~]/.test(valueStr)) {
                        const ast = parseExpression(valueStr);
                        context[node.variable] = evaluate(ast, context, filters);
                    } else if (valueStr.startsWith('$')) {
                        context[node.variable] = getFromContext(valueStr, context) ?? '';
                    } else {
                        context[node.variable] = parseValue(valueStr);
                    }
                } catch (e) {
                    context[node.variable] = '';
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
                }

                const body = cond
                    ? node.body
                    : (node.elseIfs?.find((elseIf: any) => {
                        try {
                            const ast = parseExpression(elseIf.condition);
                            return !!evaluate(ast, context, filters);
                        } catch {
                            return false;
                        }
                    })?.body || node.elseBody || []);

                result += await compileAST(body, loader, context, filters);
                break;
            }

            case 'for_range': {
                const { start, end, item, reverse, body, elseBody } = node;

                const range = [];
                for (let i = start; i <= end; i++) {
                    range.push(i);
                }

                if (reverse) range.reverse();

                let innerResult = '';

                if (range.length === 0 && elseBody) {
                    innerResult += await compileAST(elseBody, loader, context, filters);
                } else {
                    for (const value of range) {
                        const newContext = { ...context };
                        newContext[item] = value;

                        newContext.loop = {
                            index: value - start + 1,
                            first: value === (reverse ? end : start),
                            last: value === (reverse ? start : end),
                            key: value - start
                        };

                        innerResult += await compileAST(body, loader, newContext, filters);
                    }
                }

                result += innerResult;
                break;
            }

            case 'for': {
                const collectionPath = node.collection.startsWith('$') ? node.collection.slice(1) : node.collection;
                const collection = getFromContext(collectionPath, context);

                let items: Array<[any, any]> = [];

                if (Array.isArray(collection)) {
                    items = Array.from(collection.entries());
                } else if (collection && typeof collection === 'object') {
                    items = Object.entries(collection);
                }

                if (node.reverse) items = items.reverse();

                if (items.length === 0 && node.elseBody) {
                    result += await compileAST(node.elseBody, loader, context, filters);
                } else {
                    for (const [index, itemValue] of items) {
                        const newContext = { ...context };
                        newContext[node.item] = itemValue;
                        if (node.key) newContext[node.key] = index;

                        newContext.loop = {
                            index: index + 1,
                            first: index === 0,
                            last: index === items.length - 1,
                            key: index,
                        };

                        result += await compileAST(node.body, loader, newContext, filters);
                    }
                }
                break;
            }

            case 'block':
                if (typeof context.block === 'function') {
                    result += await context.block(node.name);
                }
                break;

            case 'include': {
                if (!loader) {
                    console.warn(`{include '${node.file}'} ignored: no loader`);
                    break;
                }
                try {
                    const includedTemplate = await loader(node.file);
                    const tokens = tokenize(includedTemplate);
                    const includedAST = parse(tokens);
                    const html = await compileAST(includedAST, loader, { ...context, ...node.params }, filters);
                    result += html;
                } catch (err) {
                    result += `<span style="color:red">[Include error: ${(err as Error).message}]</span>`;
                }
                break;
            }

            case 'extends':
                break;

            default:
                console.warn(`Unknown node type: ${node.type}`);
        }
    }

    return result;
}