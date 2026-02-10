import type { ASTNode, TemplateLoader } from '../types/common';
import { tokenize } from '../lexer/tokenize';
import { parse } from '../parser/parser';
import { compileAST } from './compile-ast';

export function compile(
    ast: ASTNode[],
    loader?: TemplateLoader
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
            
            if (!loader) {
                throw new Error(`Template uses {extends '${parentFile}'}, but no loader provided`);
            }

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
                    blockContent[name] = await compileAST(blockAst, loader, context, filters);
                    return blockContent[name];
                };

                return await compileAST(parentAst, loader, context, filters);
            } catch (err: any) {
                return `[Render error: ${err.message}]`;
            }
        };
    } else {
        return async function (context: any, filters: any): Promise<string> {
            return await compileAST(ast, loader, context, filters);
        };
    }
}