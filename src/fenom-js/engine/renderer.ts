import type { TemplateLoader } from '../types/common';
import { tokenize } from '../lexer/tokenize';
import { parse } from '../parser/parser';
import { compile } from '../compiler/compiler';
import { minifyHTML } from '../compiler/functions';
import { createAsyncLoader } from './loader';
import { filters } from '../filters/filters';

export async function FenomJs(
    template: string,
    context: Record<string, any> = {},
    options?: {
        root?: string;
        loader?: TemplateLoader;
        minify?: boolean;
    }
): Promise<string> {
    const { root = './src/', loader, minify = false } = options || {};

    const defaultLoader = loader || createAsyncLoader(root);
    // console.log('defaultLoader', defaultLoader);
    
    try {
        const tokens = tokenize(template);
        // console.log('tokens', tokens);
        
        const ast = parse(tokens);
        // console.log('ast', ast);
        
        const compiled = compile(ast, defaultLoader);
        // console.log('compiled', compiled);
        
        const html = await compiled(context, filters);
        // console.log('html', html);
        
        return minify ? minifyHTML(html) : html;
    } catch (err) {
        console.error('Template error:', err);
        return `<span style='color:red'>[Ошибка шаблона: ${(err as Error).message}]</span>`;
    }
}

// Re-export filters
export { filters } from '../filters/filters';
