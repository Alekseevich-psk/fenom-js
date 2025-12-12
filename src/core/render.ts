import { parse } from './parser/parser';
import { compile } from './compiler/compiler';
import { tokenize } from "./lexer/tokenize";
import { filters } from "./filters/filters";
import { createLoader } from './loader/loader';


export function render(
    template: string,
    context: Record<string, any>,
    root: string
): string {
    const loader = createLoader(root);
    try {
        const tokens = tokenize(template);
        console.log('Tokens:', tokens);
        const ast = parse(tokens);
        // console.log('ast:', ast);
        const compiled = compile(ast, loader);
        // console.log(filters);
        return compiled(context, filters);
    } catch (err) {
        console.error('Template error:', err);
        return `<span style="color:red">[Ошибка шаблона: ${(err as Error).message}]</span>`;
    }
}