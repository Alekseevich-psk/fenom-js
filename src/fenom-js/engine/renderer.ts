import type { TemplateLoader } from '../types/common';
import { tokenize } from '../lexer/tokenize';
import { parse } from '../parser/parser';
import { compile } from '../compiler/compiler';
import { minifyHTML } from '../compiler/functions';
import { filters } from '../filters/filters';

export async function FenomJs(
    template: string,
    options?: {
        context?: Record<string, any>;
        loader?: TemplateLoader;
        minify?: boolean;
        debug?: boolean;
    }
): Promise<string> {
    const {
        context = {},
        loader,
        minify = false,
        debug = false
    } = options || {};

    try {
        const tokens = tokenize(template);
        if (debug) console.log('tokens', tokens);

        const ast = parse(tokens);
        if (debug) console.log('ast', ast);

        const compiled = compile(ast, loader);
        const html = await compiled(context, filters);
        return minify ? minifyHTML(html) : html;
    } catch (err) {
        console.error('Template error:', err);
        return `<span style="color:red">[Ошибка шаблона: ${(err as Error).message}]</span>`;
    }
}

// Re-export filters
export { filters } from '../filters/filters';
