import type { ASTNode, TemplateLoader } from '../types/common';
import { tokenize } from '../lexer/tokenize';
import { parse } from '../parser/parser';
import { compileNode } from './compile-node';

export function compile(
    ast: ASTNode[],
    loader: TemplateLoader
): (context: any, filters: any) => Promise<string> {
    const blocks: Record<string, ASTNode[]> = {};
    let parentFile: string | null = null;

    for (const node of ast) {
        if (node.type === 'extends') {
            parentFile = node.file;
        } else if (node.type === 'block') {
            blocks[node.name] = node.body;
        }
    }

    if (parentFile) {
        return async function (context: any, filters: any): Promise<string> {
            try {
                const template = await loader(parentFile);
                const tokens = tokenize(template);
                const parentAst = parse(tokens);

                const parentBlocks: Record<string, ASTNode[]> = {};

                for (const node of parentAst) {
                    if (node.type === 'block') {
                        parentBlocks[node.name] = node.body;
                    }
                }

                const finalBlocks = { ...parentBlocks, ...blocks };

                const blockContent: Record<string, string> = {};
                context.block = async (name: string): Promise<string> => {
                    if (blockContent[name] !== undefined) return blockContent[name];
                    const blockAst = finalBlocks[name];
                    if (!blockAst) {
                        blockContent[name] = '';
                        return '';
                    }
                    let out = '';
                    const localContext = { ...context };
                    for (const node of blockAst) {
                        if (node.type === 'include') {
                            try {
                                const includedTemplate = await loader(node.file);
                                const incTokens = tokenize(includedTemplate);
                                const incAst = parse(incTokens);
                                const newContext = { ...localContext };
                                if (node.params) {
                                    for (const [key, value] of Object.entries(node.params)) {
                                        if (typeof value === 'string' && value.startsWith('$')) {
                                            newContext[key] = localContext[value.slice(1)];
                                        } else {
                                            newContext[key] = value;
                                        }
                                    }
                                }
                                for (const child of incAst) {
                                    compileNode(child, code => (out += code), newContext, filters);
                                }
                            } catch {
                                out += `[Include error: ${node.file}]`;
                            }
                        } else {
                            compileNode(node, code => (out += code), localContext, filters);
                        }
                    }
                    blockContent[name] = out;
                    return out;
                };

                let result = '';
                for (const node of parentAst) {
                    if (node.type === 'block') {
                        result += await context.block(node.name);
                    } else if (node.type === 'include') {
                        try {
                            const includedTemplate = await loader(node.file);
                            const incTokens = tokenize(includedTemplate);
                            const incAst = parse(incTokens);
                            const newContext = { ...context };
                            if (node.params) {
                                for (const [key, value] of Object.entries(node.params)) {
                                    if (typeof value === 'string' && value.startsWith('$')) {
                                        newContext[key] = context[value.slice(1)];
                                    } else {
                                        newContext[key] = value;
                                    }
                                }
                            }
                            for (const child of incAst) {
                                compileNode(child, code => (result += code), newContext, filters);
                            }
                        } catch {
                            result += `[Include error: ${node.file}]`;
                        }
                    } else {
                        compileNode(node, code => (result += code), context, filters);
                    }
                }

                return result;
            } catch (err: any) {
                return `[Render error: ${err.message}]`;
            }
        };
    } else {
        return async function (context: any, filters: any): Promise<string> {
            let result = '';
            for (const node of ast) {
                if (node.type === 'include') {
                    try {
                        const includedTemplate = await loader(node.file);
                        const incTokens = tokenize(includedTemplate);
                        const incAst = parse(incTokens);
                        const newContext = { ...context };
                        if (node.params) {
                            for (const [key, value] of Object.entries(node.params)) {
                                if (typeof value === 'string' && value.startsWith('$')) {
                                    newContext[key] = context[value.slice(1)];
                                } else {
                                    newContext[key] = value;
                                }
                            }
                        }
                        for (const child of incAst) {
                            compileNode(child, code => (result += code), newContext, filters);
                        }
                    } catch {
                        result += `[Include error: ${node.file}]`;
                    }
                } else {
                    compileNode(node, code => (result += code), context, filters);
                }
            }
            return result;
        };
    }
}
