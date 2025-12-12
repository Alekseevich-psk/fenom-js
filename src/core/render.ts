import type { TemplateLoader } from './../core/types/common';

import { parse } from './parser/parser';
import { compile } from './compiler/compiler';
import { tokenize } from "./lexer/tokenize";
import { filters } from "./filters/filters";
import { minifyHTML } from './compiler/functions';

export function render(
    template: string,
    context: Record<string, any>,
    options: {
        root: string;
        loader?: TemplateLoader;
        minify: boolean;
    }
): string {
    const { root, loader, minify } = options || {};
    const defaultLoader = loader || (() => root);
    
    try {
        const tokens = tokenize(template);
        const ast = parse(tokens);
        const compiled = compile(ast, defaultLoader);
        const html = compiled(context, filters);
        
        return minify
            ? minifyHTML(html)
            : html;
    } catch (err) {
        console.error('Template error:', err);
        return `<span style="color:red">[Ошибка шаблона: ${(err as Error).message}]</span>`;
    }
}