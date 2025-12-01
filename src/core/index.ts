import { parse } from './parser/parser';
import { compile } from './compiler/compiler';
import { tokenize } from "./lexer/tokenize";
import { filters } from "./filters/filters";


export function render(template: string, context: Record<string, any>): string {
    try {
        const tokens = tokenize(template);
        const ast = parse(tokens);
        const compiled = compile(ast); // → функция
        return compiled(context, filters); // вызываем с context и filters
    } catch (err) {
        console.error('Template error:', err);
        return `<span style="color:red">[Ошибка шаблона: ${(err as Error).message}]</span>`;
    }
}